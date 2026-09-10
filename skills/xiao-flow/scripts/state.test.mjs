import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(new URL("./state.mjs", import.meta.url));

function fixture(mode = "standard") {
  const root = mkdtempSync(join(tmpdir(), "xiao-flow-state-"));
  const statePath = join(root, ".xiao-flow", "demo.json");
  const designPath = "docs/superpowers/specs/demo-design.md";
  mkdirSync(dirname(join(root, designPath)), { recursive: true });
  writeFileSync(join(root, designPath), "# Design\n", "utf8");
  run([
    "init",
    statePath,
    "--root",
    root,
    "--change",
    "demo",
    "--mode",
    mode,
    "--base",
    "UNBORN",
    "--design",
    designPath,
  ]);
  return {
    root,
    statePath,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

function run(args) {
  return execFileSync(process.execPath, [scriptPath, ...args], {
    encoding: "utf8",
  });
}

function runResult(args) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    encoding: "utf8",
  });
}

function readState(statePath) {
  return JSON.parse(readFileSync(statePath, "utf8"));
}

test("standard flow rejects a forward stage skip", () => {
  const item = fixture();
  try {
    const result = runResult(["stage", item.statePath, "4"]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Illegal forward transition/);
  } finally {
    item.cleanup();
  }
});

test("planning drift is detected", () => {
  const item = fixture();
  try {
    const proposal = "openspec/changes/demo/proposal.md";
    mkdirSync(dirname(join(item.root, proposal)), { recursive: true });
    writeFileSync(join(item.root, proposal), "before\n", "utf8");
    run(["snapshot", item.statePath, "planning", proposal]);
    assert.equal(runResult(["check", item.statePath, "planning"]).status, 0);
    writeFileSync(join(item.root, proposal), "after\n", "utf8");
    const drift = runResult(["check", item.statePath, "planning"]);
    assert.equal(drift.status, 2);
    assert.match(drift.stdout, /proposal\.md/);
  } finally {
    item.cleanup();
  }
});

test("plan progress checkboxes do not invalidate the plan snapshot", () => {
  const item = fixture();
  try {
    const proposal = "openspec/changes/demo/proposal.md";
    const plan = "docs/superpowers/plans/demo.md";
    mkdirSync(dirname(join(item.root, proposal)), { recursive: true });
    mkdirSync(dirname(join(item.root, plan)), { recursive: true });
    writeFileSync(join(item.root, proposal), "proposal\n", "utf8");
    writeFileSync(join(item.root, plan), "### Task 1: Demo\n", "utf8");
    run(["snapshot", item.statePath, "planning", proposal]);
    run(["stage", item.statePath, "3"]);
    run(["plan", item.statePath, plan]);
    run(["snapshot", item.statePath, "plan", plan]);
    run(["stage", item.statePath, "4"]);
    writeFileSync(join(item.root, plan), "### [x] Task 1: Demo\n", "utf8");
    assert.equal(runResult(["check", item.statePath, "plan"]).status, 0);
  } finally {
    item.cleanup();
  }
});

test("OpenSpec task progress does not invalidate the planning snapshot", () => {
  const item = fixture();
  try {
    const taskFile = "openspec/changes/demo/tasks.md";
    mkdirSync(dirname(join(item.root, taskFile)), { recursive: true });
    writeFileSync(join(item.root, taskFile), "- [ ] 1.1 demo\n", "utf8");
    run(["snapshot", item.statePath, "planning", taskFile]);
    writeFileSync(join(item.root, taskFile), "- [x] 1.1 demo\n", "utf8");
    assert.equal(runResult(["check", item.statePath, "planning"]).status, 0);
    writeFileSync(join(item.root, taskFile), "- [x] 1.1 changed scope\n", "utf8");
    assert.equal(runResult(["check", item.statePath, "planning"]).status, 2);
  } finally {
    item.cleanup();
  }
});

test("initial dirty file changes remain visible", () => {
  const root = mkdtempSync(join(tmpdir(), "xiao-flow-dirty-"));
  const statePath = join(root, ".xiao-flow", "demo.json");
  const dirtyPath = "notes.md";
  try {
    writeFileSync(join(root, dirtyPath), "user draft\n", "utf8");
    run([
      "init",
      statePath,
      "--root",
      root,
      "--change",
      "demo",
      "--mode",
      "standard",
      "--base",
      "UNBORN",
      "--dirty",
      dirtyPath,
    ]);
    assert.equal(runResult(["check-initial", statePath]).status, 0);
    writeFileSync(join(root, dirtyPath), "new user draft\n", "utf8");
    assert.equal(runResult(["check-initial", statePath]).status, 2);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("mini flow takes the real 2 to 4 short transition", () => {
  const item = fixture("mini");
  try {
    const taskFile = "openspec/changes/demo/tasks.md";
    mkdirSync(dirname(join(item.root, taskFile)), { recursive: true });
    writeFileSync(join(item.root, taskFile), "- [ ] 1.1 demo\n", "utf8");
    run(["snapshot", item.statePath, "planning", taskFile]);
    run(["stage", item.statePath, "4"]);
    const state = readState(item.statePath);
    assert.equal(state.nextStage, 4);
    assert.equal(state.planPath, null);
  } finally {
    item.cleanup();
  }
});

test("mini can only upgrade and returns to Stage 3 when a plan is required", () => {
  const item = fixture("mini");
  try {
    const taskFile = "openspec/changes/demo/tasks.md";
    mkdirSync(dirname(join(item.root, taskFile)), { recursive: true });
    writeFileSync(join(item.root, taskFile), "- [ ] 1.1 demo\n", "utf8");
    run(["snapshot", item.statePath, "planning", taskFile]);
    run(["stage", item.statePath, "4"]);
    run(["mode", item.statePath, "fast"]);
    const state = readState(item.statePath);
    assert.equal(state.mode, "fast");
    assert.equal(state.nextStage, 3);
    assert.notEqual(runResult(["mode", item.statePath, "mini"]).status, 0);
  } finally {
    item.cleanup();
  }
});

test("archive transition refuses to run while the active change still exists", () => {
  const item = fixture("mini");
  try {
    const taskFile = "openspec/changes/demo/tasks.md";
    const archiveDir = join(item.root, "openspec", "changes", "archive", "demo");
    mkdirSync(dirname(join(item.root, taskFile)), { recursive: true });
    mkdirSync(archiveDir, { recursive: true });
    writeFileSync(join(item.root, taskFile), "- [x] 1.1 demo\n", "utf8");
    run(["snapshot", item.statePath, "planning", taskFile]);
    run(["stage", item.statePath, "4"]);
    run(["task", item.statePath, "1.1"]);
    run(["complete-task", item.statePath, "1.1"]);
    run(["stage", item.statePath, "5"]);
    run(["snapshot", item.statePath, "verification", taskFile]);
    run(["verified", item.statePath]);
    run(["stage", item.statePath, "6"]);
    const result = runResult([
      "archive",
      item.statePath,
      "openspec/changes/archive/demo",
      "archive-only",
    ]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Active change still exists/);
  } finally {
    item.cleanup();
  }
});

test("commit mode remains archived until a commit hash is recorded", () => {
  const item = fixture("mini");
  try {
    const taskFile = "openspec/changes/demo/tasks.md";
    mkdirSync(dirname(join(item.root, taskFile)), { recursive: true });
    writeFileSync(join(item.root, taskFile), "- [x] 1.1 demo\n", "utf8");
    run(["snapshot", item.statePath, "planning", taskFile]);
    run(["stage", item.statePath, "4"]);
    run(["task", item.statePath, "1.1"]);
    run(["complete-task", item.statePath, "1.1"]);
    run(["stage", item.statePath, "5"]);
    run(["snapshot", item.statePath, "verification", taskFile]);
    run(["verified", item.statePath]);
    run(["stage", item.statePath, "6"]);
    const activeDir = join(item.root, "openspec", "changes", "demo");
    const archiveDir = join(item.root, "openspec", "changes", "archive", "demo");
    mkdirSync(dirname(archiveDir), { recursive: true });
    renameSync(activeDir, archiveDir);
    run(["archive", item.statePath, "openspec/changes/archive/demo", "commit"]);
    let state = readState(item.statePath);
    assert.equal(state.status, "archived");
    assert.equal(state.pendingAction, "commit");
    assert.notEqual(runResult(["complete", item.statePath]).status, 0);
    execFileSync("git", ["-C", item.root, "init"], { encoding: "utf8" });
    execFileSync("git", ["-C", item.root, "config", "user.email", "test@example.com"]);
    execFileSync("git", ["-C", item.root, "config", "user.name", "XIAOFlow Test"]);
    execFileSync("git", ["-C", item.root, "add", "openspec/changes/archive/demo/tasks.md"]);
    execFileSync("git", ["-C", item.root, "commit", "-m", "test: archive demo"]);
    const commitHash = execFileSync("git", ["-C", item.root, "rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim();
    run(["complete", item.statePath, commitHash]);
    state = readState(item.statePath);
    assert.equal(state.status, "completed");
    assert.equal(state.commitHash, commitHash);
  } finally {
    item.cleanup();
  }
});

test("rolling back invalidates downstream evidence", () => {
  const item = fixture();
  try {
    const proposal = "openspec/changes/demo/proposal.md";
    const plan = "docs/superpowers/plans/demo.md";
    mkdirSync(dirname(join(item.root, proposal)), { recursive: true });
    mkdirSync(dirname(join(item.root, plan)), { recursive: true });
    writeFileSync(join(item.root, proposal), "proposal\n", "utf8");
    writeFileSync(join(item.root, plan), "### Task 1: Demo\n", "utf8");
    run(["snapshot", item.statePath, "planning", proposal]);
    run(["stage", item.statePath, "3"]);
    run(["plan", item.statePath, plan]);
    run(["snapshot", item.statePath, "plan", plan]);
    run(["stage", item.statePath, "4"]);
    run(["stage", item.statePath, "3"]);
    const state = readState(item.statePath);
    assert.equal(state.nextStage, 3);
    assert.equal(state.snapshots.plan, null);
    assert.equal(state.snapshots.verification, null);
  } finally {
    item.cleanup();
  }
});

test("compatibility recovery can initialize directly at a validated stage", () => {
  const root = mkdtempSync(join(tmpdir(), "xiao-flow-recovery-"));
  const statePath = join(root, ".xiao-flow", "demo.json");
  try {
    run([
      "init",
      statePath,
      "--root",
      root,
      "--change",
      "demo",
      "--mode",
      "standard",
      "--base",
      "UNBORN",
      "--stage",
      "4",
      "--plan",
      "docs/superpowers/plans/demo.md",
    ]);
    const state = readState(statePath);
    assert.equal(state.nextStage, 4);
    assert.equal(state.planPath, "docs/superpowers/plans/demo.md");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
