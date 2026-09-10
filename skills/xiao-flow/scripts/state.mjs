import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCHEMA_VERSION = 2;
const MODES = ["standard", "fast", "mini"];
const STATUSES = ["active", "archived", "completed"];
const SNAPSHOT_SLOTS = ["planning", "plan", "verification"];

function fail(message, code = 1) {
  console.error(message);
  process.exit(code);
}

function now() {
  return new Date().toISOString();
}

function readState(statePath) {
  let state;
  try {
    state = JSON.parse(readFileSync(statePath, "utf8"));
  } catch (error) {
    fail(`Cannot read state file ${statePath}: ${error.message}`);
  }
  validateState(state);
  return state;
}

function validateState(state) {
  if (state.schemaVersion !== SCHEMA_VERSION) {
    fail(`Unsupported schemaVersion: ${state.schemaVersion}`);
  }
  if (typeof state.changeName !== "string" || state.changeName.length === 0) {
    fail("State changeName must be a non-empty string");
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(state.changeName)) {
    fail(`State changeName must be kebab-case: ${state.changeName}`);
  }
  if (!MODES.includes(state.mode)) {
    fail(`Unsupported mode: ${state.mode}`);
  }
  if (!STATUSES.includes(state.status)) {
    fail(`Unsupported status: ${state.status}`);
  }
  const sequence = stageSequence(state.mode);
  if (state.status === "active" && !sequence.includes(state.nextStage)) {
    fail(`Active state has invalid nextStage ${state.nextStage} for ${state.mode}`);
  }
  if (state.status !== "active" && state.nextStage !== null) {
    fail(`${state.status} state must have nextStage null`);
  }
  if (!state.snapshots || typeof state.snapshots !== "object") {
    fail("State snapshots object is required");
  }
  for (const slot of SNAPSHOT_SLOTS) {
    if (!(slot in state.snapshots)) {
      fail(`State snapshots.${slot} is required`);
    }
  }
  if (!Array.isArray(state.completedTasks)) {
    fail("State completedTasks must be an array");
  }
}

function writeStateAtomic(statePath, state) {
  validateState(state);
  const target = resolve(statePath);
  const targetDir = dirname(target);
  mkdirSync(targetDir, { recursive: true });
  const temporary = resolve(
    targetDir,
    `.${basename(target)}.${process.pid}.${Date.now()}.tmp`,
  );
  try {
    writeFileSync(temporary, `${JSON.stringify(state, null, 2)}\n`, "utf8");
    JSON.parse(readFileSync(temporary, "utf8"));
    renameSync(temporary, target);
  } catch (error) {
    rmSync(temporary, { force: true });
    fail(`Cannot write state file ${statePath}: ${error.message}`);
  }
}

function stageSequence(mode) {
  return mode === "mini" ? [1, 2, 4, 5, 6] : [1, 2, 3, 4, 5, 6];
}

function projectPath(state, inputPath) {
  const root = resolve(state.projectRoot);
  const absolute = resolve(root, inputPath);
  const rel = relative(root, absolute).replaceAll("\\", "/");
  if (rel === "" || rel === ".") {
    fail("Snapshot paths must name files, not the project root");
  }
  if (rel.startsWith("../") || isAbsolute(rel)) {
    fail(`Path escapes project root: ${inputPath}`);
  }
  return { absolute, relative: rel };
}

function gitBlobHash(buffer) {
  return createHash("sha1")
    .update(`blob ${buffer.length}\0`)
    .update(buffer)
    .digest("hex");
}

function fingerprint(state, inputPath, normalization = "raw") {
  const paths = projectPath(state, inputPath);
  if (!existsSync(paths.absolute)) {
    return { path: paths.relative, hash: "DELETED", normalization };
  }
  let content = readFileSync(paths.absolute);
  if (normalization === "plan-progress") {
    const normalized = content
      .toString("utf8")
      .replace(/^###\s+\[x\]\s+(Task\b.*)$/gim, "### $1")
      .replaceAll("\r\n", "\n");
    content = Buffer.from(normalized, "utf8");
  } else if (normalization === "task-progress") {
    const normalized = content
      .toString("utf8")
      .replace(/^(\s*[-*]\s+)\[[xX]\](\s+)/gm, "$1[ ]$2")
      .replaceAll("\r\n", "\n");
    content = Buffer.from(normalized, "utf8");
  }
  return { path: paths.relative, hash: gitBlobHash(content), normalization };
}

function createSnapshot(state, slot, paths) {
  if (!SNAPSHOT_SLOTS.includes(slot)) {
    fail(`Unknown snapshot slot: ${slot}`);
  }
  if (paths.length === 0) {
    fail("Snapshot requires at least one path");
  }
  const files = {};
  for (const inputPath of [...new Set(paths)].sort()) {
    const normalizedInput = projectPath(state, inputPath).relative;
    const planPath = state.planPath?.replaceAll("\\", "/");
    const normalization =
      slot === "plan" && normalizedInput === planPath
        ? "plan-progress"
        : slot === "planning" && normalizedInput.endsWith("/tasks.md")
          ? "task-progress"
        : "raw";
    const item = fingerprint(state, inputPath, normalization);
    files[item.path] = {
      hash: item.hash,
      normalization: item.normalization,
    };
  }
  return { createdAt: now(), files };
}

function driftForSnapshot(state, snapshot) {
  if (!snapshot || !snapshot.files || Object.keys(snapshot.files).length === 0) {
    return [{ path: null, expected: null, actual: null, reason: "missing-snapshot" }];
  }
  const drift = [];
  for (const [inputPath, expected] of Object.entries(snapshot.files)) {
    const actual = fingerprint(state, inputPath, expected.normalization ?? "raw");
    if (actual.hash !== expected.hash) {
      drift.push({ path: inputPath, expected: expected.hash, actual: actual.hash });
    }
  }
  return drift;
}

function snapshotDrift(state, slot) {
  return driftForSnapshot(state, state.snapshots[slot]);
}

function requireCurrentSnapshot(state, slot) {
  const drift = snapshotDrift(state, slot);
  if (drift.length > 0) {
    fail(`Snapshot ${slot} is missing or stale:\n${JSON.stringify(drift, null, 2)}`);
  }
}

function parseNamedOptions(args) {
  const options = new Map();
  for (let index = 0; index < args.length; index += 1) {
    const name = args[index];
    if (!name.startsWith("--")) {
      fail(`Expected option, received: ${name}`);
    }
    const value = args[index + 1];
    if (value === undefined || value.startsWith("--")) {
      fail(`Missing value for ${name}`);
    }
    const key = name.slice(2);
    const values = options.get(key) ?? [];
    values.push(value);
    options.set(key, values);
    index += 1;
  }
  return options;
}

function oneOption(options, name, fallback) {
  const values = options.get(name);
  if (!values || values.length === 0) return fallback;
  if (values.length > 1) fail(`Option --${name} may only be provided once`);
  return values[0];
}

function invalidateForStage(state, targetStage) {
  if (targetStage <= 2) {
    state.snapshots.planning = null;
    state.snapshots.plan = null;
    state.snapshots.verification = null;
    state.verifiedAt = null;
    state.completedTasks = [];
    state.currentTask = null;
  } else if (targetStage <= 3) {
    state.snapshots.plan = null;
    state.snapshots.verification = null;
    state.verifiedAt = null;
    state.currentTask = null;
  } else if (targetStage <= 4) {
    state.snapshots.verification = null;
    state.verifiedAt = null;
    if (state.mode === "mini") state.completedTasks = [];
    state.currentTask = null;
  } else if (targetStage <= 5) {
    state.snapshots.verification = null;
    state.verifiedAt = null;
  }
  state.archivePath = null;
  state.archiveMode = null;
  state.pendingAction = null;
  state.commitHash = null;
  state.archivedAt = null;
  state.completedAt = null;
}

function commandInit(statePath, args) {
  if (existsSync(statePath)) {
    fail(`State file already exists: ${statePath}`);
  }
  const options = parseNamedOptions(args);
  const mode = oneOption(options, "mode", "standard");
  if (!MODES.includes(mode)) fail(`Unsupported mode: ${mode}`);
  const changeName = oneOption(options, "change");
  const baseCommit = oneOption(options, "base");
  const projectRoot = resolve(oneOption(options, "root", process.cwd()));
  const designValue = oneOption(options, "design", "NONE");
  const planValue = oneOption(options, "plan", "NONE");
  const nextStage = Number(oneOption(options, "stage", "2"));
  const dirtyUnknown = oneOption(options, "dirty-unknown", "false") === "true";
  if (!changeName || !baseCommit) {
    fail("init requires --change and --base");
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(changeName)) {
    fail(`changeName must be kebab-case: ${changeName}`);
  }
  const expectedStatePath = resolve(
    projectRoot,
    "docs",
    "superpowers",
    "xiao-flow",
    `${changeName}.json`,
  );
  if (resolve(statePath) !== expectedStatePath) {
    fail(`State path must be ${expectedStatePath}`);
  }
  if (!stageSequence(mode).includes(nextStage)) {
    fail(`Invalid initial stage ${nextStage} for ${mode}`);
  }
  const dirtyPaths = options.get("dirty") ?? [];
  const seed = {
    schemaVersion: SCHEMA_VERSION,
    changeName,
    mode,
    status: "active",
    nextStage,
    projectRoot,
    baseCommit: baseCommit === "NULL" ? null : baseCommit,
    initialDirtyPaths: dirtyUnknown
      ? null
      : dirtyPaths.map((item) => item.replaceAll("\\", "/")),
    initialDirtySnapshot: null,
    designPath: designValue === "NONE" ? null : designValue.replaceAll("\\", "/"),
    planPath: planValue === "NONE" ? null : planValue.replaceAll("\\", "/"),
    currentTask: null,
    completedTasks: [],
    verifiedAt: null,
    snapshots: { planning: null, plan: null, verification: null },
    archivePath: null,
    archiveMode: null,
    pendingAction: null,
    commitHash: null,
    archivedAt: null,
    completedAt: null,
  };
  if (!dirtyUnknown && dirtyPaths.length > 0) {
    seed.initialDirtySnapshot = createSnapshot(seed, "verification", dirtyPaths);
  }
  writeStateAtomic(statePath, seed);
  console.log(`Initialized ${statePath}`);
}

function commandSnapshot(statePath, slot, paths) {
  const state = readState(statePath);
  if (state.status !== "active") fail("Snapshots may only be updated while active");
  state.snapshots[slot] = createSnapshot(state, slot, paths);
  if (slot === "verification") state.verifiedAt = null;
  writeStateAtomic(statePath, state);
  console.log(`Saved ${slot} snapshot (${paths.length} paths)`);
}

function commandCheck(statePath, slot) {
  const state = readState(statePath);
  if (!SNAPSHOT_SLOTS.includes(slot)) fail(`Unknown snapshot slot: ${slot}`);
  const drift = snapshotDrift(state, slot);
  const result = { slot, current: drift.length === 0, drift };
  console.log(JSON.stringify(result, null, 2));
  if (drift.length > 0) process.exit(2);
}

function commandCheckInitial(statePath) {
  const state = readState(statePath);
  const drift = driftForSnapshot(state, state.initialDirtySnapshot);
  const result = { current: drift.length === 0, drift };
  console.log(JSON.stringify(result, null, 2));
  if (drift.length > 0) process.exit(2);
}

function commandStage(statePath, rawTarget) {
  const state = readState(statePath);
  if (state.status !== "active") fail(`Cannot transition ${state.status} state`);
  const target = Number(rawTarget);
  const sequence = stageSequence(state.mode);
  if (!Number.isInteger(target) || !sequence.includes(target)) {
    fail(`Invalid target stage ${rawTarget} for ${state.mode}`);
  }
  const currentIndex = sequence.indexOf(state.nextStage);
  const targetIndex = sequence.indexOf(target);
  if (targetIndex > currentIndex + 1) {
    fail(`Illegal forward transition ${state.nextStage} -> ${target}`);
  }
  if (targetIndex > currentIndex) {
    if (target >= 3) requireCurrentSnapshot(state, "planning");
    if (target >= 4 && state.mode !== "mini") {
      if (!state.planPath) fail("planPath is required before Stage 4");
      requireCurrentSnapshot(state, "plan");
    }
    if (target >= 5 && state.currentTask !== null) {
      fail("currentTask must be clear before Stage 5");
    }
    if (target === 6) {
      if (!state.verifiedAt) fail("verifiedAt is required before Stage 6");
      requireCurrentSnapshot(state, "verification");
    }
  } else if (targetIndex < currentIndex) {
    invalidateForStage(state, target);
  }
  state.nextStage = target;
  writeStateAtomic(statePath, state);
  console.log(`Transitioned to Stage ${target}`);
}

function commandPlan(statePath, planPath) {
  const state = readState(statePath);
  if (state.status !== "active" || state.mode === "mini") {
    fail("planPath is only valid for active standard/fast changes");
  }
  state.planPath = planPath.replaceAll("\\", "/");
  state.snapshots.plan = null;
  state.snapshots.verification = null;
  state.verifiedAt = null;
  writeStateAtomic(statePath, state);
  console.log(`Recorded planPath ${state.planPath}`);
}

function commandTask(statePath, taskId) {
  const state = readState(statePath);
  if (state.status !== "active" || state.nextStage !== 4) {
    fail("currentTask may only change during Stage 4");
  }
  state.currentTask = taskId === "NONE" ? null : taskId;
  writeStateAtomic(statePath, state);
  console.log(`currentTask=${state.currentTask ?? "null"}`);
}

function commandCompleteTask(statePath, taskId) {
  const state = readState(statePath);
  if (state.status !== "active" || state.nextStage !== 4) {
    fail("Tasks may only complete during Stage 4");
  }
  if (!state.completedTasks.includes(taskId)) state.completedTasks.push(taskId);
  if (state.currentTask === taskId) state.currentTask = null;
  writeStateAtomic(statePath, state);
  console.log(`Completed task ${taskId}`);
}

function commandVerified(statePath) {
  const state = readState(statePath);
  if (state.status !== "active" || state.nextStage !== 5) {
    fail("Verification may only complete during Stage 5");
  }
  requireCurrentSnapshot(state, "verification");
  state.verifiedAt = now();
  writeStateAtomic(statePath, state);
  console.log(`verifiedAt=${state.verifiedAt}`);
}

function commandMode(statePath, targetMode) {
  const state = readState(statePath);
  if (state.status !== "active") fail("Completed modes cannot change");
  const riskRank = { mini: 0, fast: 1, standard: 2 };
  if (!(targetMode in riskRank) || riskRank[targetMode] < riskRank[state.mode]) {
    fail(`Mode may only upgrade: ${state.mode} -> ${targetMode}`);
  }
  if (targetMode === state.mode) {
    console.log(`Mode already ${targetMode}`);
    return;
  }
  state.mode = targetMode;
  if (state.nextStage >= 4 && targetMode !== "mini") {
    state.nextStage = 3;
    invalidateForStage(state, 3);
  }
  writeStateAtomic(statePath, state);
  console.log(`Upgraded mode to ${targetMode}`);
}

function commandArchive(statePath, archivePath, archiveMode) {
  const state = readState(statePath);
  if (state.status !== "active" || state.nextStage !== 6) {
    fail("Archive requires active Stage 6 state");
  }
  if (!["archive-only", "commit"].includes(archiveMode)) {
    fail("Archive mode must be archive-only or commit");
  }
  const archive = projectPath(state, archivePath);
  const activeChange = projectPath(
    state,
    `openspec/changes/${state.changeName}`,
  );
  if (!existsSync(archive.absolute)) {
    fail(`Archive path does not exist: ${archive.relative}`);
  }
  if (existsSync(activeChange.absolute)) {
    fail(`Active change still exists: ${activeChange.relative}`);
  }
  state.status = "archived";
  state.nextStage = null;
  state.archivePath = archivePath.replaceAll("\\", "/");
  state.archiveMode = archiveMode;
  state.pendingAction = archiveMode === "commit" ? "commit" : null;
  state.archivedAt = now();
  writeStateAtomic(statePath, state);
  console.log(`Archived ${state.changeName}; pendingAction=${state.pendingAction ?? "none"}`);
}

function commandComplete(statePath, commitHash) {
  const state = readState(statePath);
  if (state.status !== "archived") fail("Only archived state can complete");
  const archive = projectPath(state, state.archivePath);
  if (!existsSync(archive.absolute)) {
    fail(`Archive path does not exist: ${archive.relative}`);
  }
  if (state.pendingAction === "commit") {
    if (!commitHash || !/^[0-9a-f]{7,64}$/i.test(commitHash)) {
      fail("A commit hash is required to complete commit mode");
    }
    const commitCheck = spawnSync(
      "git",
      ["-C", state.projectRoot, "cat-file", "-e", `${commitHash}^{commit}`],
      { encoding: "utf8" },
    );
    if (commitCheck.status !== 0) {
      fail(`Commit does not exist in project repository: ${commitHash}`);
    }
    const archiveCheck = spawnSync(
      "git",
      [
        "-C",
        state.projectRoot,
        "diff-tree",
        "--root",
        "--no-commit-id",
        "--name-only",
        "-r",
        commitHash,
        "--",
        archive.relative,
      ],
      { encoding: "utf8" },
    );
    if (archiveCheck.status !== 0 || archiveCheck.stdout.trim().length === 0) {
      fail(`Commit ${commitHash} does not contain archive path ${archive.relative}`);
    }
    state.commitHash = commitHash;
  }
  state.pendingAction = null;
  state.status = "completed";
  state.completedAt = now();
  writeStateAtomic(statePath, state);
  console.log(`Completed ${state.changeName}`);
}

function usage() {
  console.log(`Usage:
  state.mjs init <state-file> --change <name> --mode <mode> --base <sha|UNBORN|NULL> [--root <path>] [--stage <number>] [--design <path|NONE>] [--plan <path|NONE>] [--dirty <path>]... [--dirty-unknown true]
  state.mjs snapshot <state-file> <planning|plan|verification> <path>...
  state.mjs check <state-file> <planning|plan|verification>
  state.mjs check-initial <state-file>
  state.mjs stage <state-file> <stage-number>
  state.mjs plan <state-file> <plan-path>
  state.mjs task <state-file> <task-id|NONE>
  state.mjs complete-task <state-file> <task-id>
  state.mjs verified <state-file>
  state.mjs mode <state-file> <fast|standard>
  state.mjs archive <state-file> <archive-path> <archive-only|commit>
  state.mjs complete <state-file> [commit-hash]
  state.mjs show <state-file>`);
}

function main(argv) {
  const [command, statePath, ...args] = argv;
  if (!command || command === "help" || command === "--help") {
    usage();
    return;
  }
  if (!statePath) fail("State file path is required");
  switch (command) {
    case "init":
      commandInit(statePath, args);
      break;
    case "snapshot":
      commandSnapshot(statePath, args[0], args.slice(1));
      break;
    case "check":
      commandCheck(statePath, args[0]);
      break;
    case "check-initial":
      commandCheckInitial(statePath);
      break;
    case "stage":
      commandStage(statePath, args[0]);
      break;
    case "plan":
      commandPlan(statePath, args[0]);
      break;
    case "task":
      commandTask(statePath, args[0]);
      break;
    case "complete-task":
      commandCompleteTask(statePath, args[0]);
      break;
    case "verified":
      commandVerified(statePath);
      break;
    case "mode":
      commandMode(statePath, args[0]);
      break;
    case "archive":
      commandArchive(statePath, args[0], args[1]);
      break;
    case "complete":
      commandComplete(statePath, args[0]);
      break;
    case "show":
      console.log(JSON.stringify(readState(statePath), null, 2));
      break;
    default:
      fail(`Unknown command: ${command}`);
  }
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2));
}

export { createSnapshot, snapshotDrift, stageSequence, validateState };
