# 实施计划

仅在设计已批准且 Standard/Fast 需要独立计划时加载。`implementation-plan.md` 是唯一任务定义和任务进度来源。

## 文件格式

计划与 `change.md` 同目录：`docs/changes/<change-name>/implementation-plan.md`。

```markdown
# <Change title> Implementation Plan

**Change:** <relative path to change.md>
**Mode:** standard|fast|mini

## Global Constraints
- <constraint copied from change.md>

### Task 1: <stable task name>

**Depends on:** none
**Files:** <exact files or directories>
**Acceptance:** <linked requirement/scenario>
**Verification:** <exact command or inspection>

- [ ] Write or update the failing test
- [ ] Implement the smallest change
- [ ] Run targeted verification
- [ ] Complete specification and code-quality review
- [ ] Task complete
- [ ] Evidence: <command output and review note>
```

## 拆分规则

- 一个任务只负责一个可审查的行为或一个紧密耦合的内部改动。
- 任务必须说明具体文件、依赖、验收场景和验证方式；“完成开发”不是有效任务。
- 任务之间有依赖时显式写出；不要并行修改同一文件，除非已确认不会冲突。
- 一个需求可以拆成多个任务；任务 ID 必须在本计划内唯一。
- `- [ ] Task complete` / `- [x] Task complete` 是任务完成状态的唯一记录；其他步骤 checkbox 只记录过程，只有测试、规范符合性审查和代码质量审查都完成后，才勾选任务完成项。

## 模式

- **Standard**：完整任务拆分、依赖和风险说明；用户批准计划后实现。
- **Fast**：适用于 2–3 个同模块低风险任务；计划更短、确认更少，但保留每项验证和最终审查。
- **Mini**：只允许一个低风险、可独立验证的任务；在设计确认阶段生成一个任务，跳过独立计划审批，不跳过 TDD、审查和验证。

发现跨模块、高风险、任务数量增加或无法明确验证方式时，暂停并升级模式；保留已经批准的内容，不直接跳过计划。升级后在 `change.md` 更新 `mode`，并重新确认受影响的计划。

## 计划审批

Standard/Fast 汇报任务数量、依赖、变更文件、验证命令和主要风险，等待用户确认后进入实现。计划获批后，修改任务定义、依赖、文件路径或验收映射都属于计划漂移，必须暂停并重新确认。
