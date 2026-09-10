import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const skillRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const requiredFiles = [
  "SKILL.md",
  "references/orchestration-rules.md",
  "references/state-and-recovery.md",
  "references/guide.md",
  ...Array.from({ length: 6 }, (_, index) => `stages/stage-${index + 1}.md`),
  "evals/evals.json",
  "scripts/state.mjs",
  "scripts/state.test.mjs",
  "scripts/validate.mjs",
];

const errors = [];
const contents = new Map();

for (const relativePath of requiredFiles) {
  const absolutePath = join(skillRoot, relativePath);
  if (!existsSync(absolutePath)) {
    errors.push(`Missing required file: ${relativePath}`);
    continue;
  }
  contents.set(relativePath, readFileSync(absolutePath, "utf8"));
}

const skill = contents.get("SKILL.md") ?? "";
if (!/^name:\s*xiao-flow$/m.test(skill)) {
  errors.push("SKILL.md name must remain xiao-flow");
}
if (!/^\s*version:\s*["']3\.2["']$/m.test(skill)) {
  errors.push("SKILL.md metadata.version must be 3.2");
}

const allText = [...contents.entries()]
  .filter(([relativePath]) => relativePath.endsWith(".md"))
  .map(([, content]) => content)
  .join("\n");
const forbiddenPatterns = [
  [/\/xiaoflow\b/i, "non-canonical /xiaoflow command"],
  [/\/xiao-commit\b/i, "undeclared /xiao-commit dependency"],
  [/HEAD~N/i, "unsafe inferred reset range"],
  [/^\s*(?:\$\s*)?git\s+add\s+\.\s*$/im, "unscoped git add . command"],
];

for (const [pattern, label] of forbiddenPatterns) {
  if (pattern.test(allText)) {
    errors.push(`Found forbidden ${label}`);
  }
}

const requiredPatterns = [
  [/references\/state-and-recovery\.md/, "state/recovery reference"],
  [/scripts\/state\.mjs/, "state runtime reference"],
  [/"schemaVersion": 2/, "state schema v2"],
  [/initialDirtyPaths/, "initial dirty path boundary"],
  [/initialDirtySnapshot/, "initial dirty path fingerprint"],
  [/baseCommit/, "Git baseline"],
  [/"verification": null/, "post-verification file fingerprint"],
  [/\*\*OpenSpec Task\*\*/, "OpenSpec task mapping"],
  [/一个 OpenSpec task 可以拆成多个 Plan Task/, "one-to-many task mapping"],
  [/Mini.*1 → 2 → 4 → 5 → 6/, "Mini short path"],
  [/pendingAction/, "pending post-archive action"],
  [/存在任一未完成 Task → Stage 4，包括零个 Task 被勾选/, "zero-checkbox Stage 4 recovery"],
  [/不新增、删除、改写或重排 OpenSpec task 文本/, "tasks.md preservation rule"],
  [/git add -- <精确路径\.\.\.>/, "scoped staging rule"],
];

for (const [pattern, label] of requiredPatterns) {
  if (!pattern.test(allText)) {
    errors.push(`Missing ${label}`);
  }
}

for (const [relativePath, content] of contents.entries()) {
  if (!relativePath.endsWith(".md")) continue;
  const fenceCount = content.match(/^```/gm)?.length ?? 0;
  if (fenceCount % 2 !== 0) {
    errors.push(`Unbalanced code fences in ${relativePath}`);
  }
}

try {
  const evals = JSON.parse(contents.get("evals/evals.json") ?? "{}");
  if (evals.skill_name !== "xiao-flow") {
    errors.push("evals.skill_name must be xiao-flow");
  }
  if (!Array.isArray(evals.evals) || evals.evals.length < 10) {
    errors.push("At least ten workflow evals are required");
  } else {
    const ids = new Set();
    for (const item of evals.evals) {
      if (!Number.isInteger(item.id) || ids.has(item.id)) {
        errors.push(`Invalid or duplicate eval id: ${item.id}`);
      }
      ids.add(item.id);
      if (!item.prompt || !item.expected_output) {
        errors.push(`Eval ${item.id} must include prompt and expected_output`);
      }
      if (!Array.isArray(item.expectations) || item.expectations.length === 0) {
        errors.push(`Eval ${item.id} must include verifiable expectations`);
      }
    }
  }
} catch (error) {
  errors.push(`evals/evals.json is invalid JSON: ${error.message}`);
}

const stateTestPath = join(skillRoot, "scripts/state.test.mjs");
if (existsSync(stateTestPath)) {
  const testRun = spawnSync(process.execPath, ["--test", stateTestPath], {
    cwd: skillRoot,
    encoding: "utf8",
  });
  if (testRun.status !== 0) {
    errors.push(`State runtime tests failed:\n${testRun.stdout}${testRun.stderr}`);
  }
}

if (errors.length > 0) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log(`xiao-flow validation passed (${requiredFiles.length} files checked)`);
