# Stage 1: 需求探索与 OpenSpec change 准备

## 输入准备

调用 Skill 前先收集：

- 用户原始需求和补充信息
- 已读取的项目规则及其路径
- 项目类型（新项目 / 已有项目）
- `baseCommit` 和 `initialDirtyPaths`
- 当前模式（`standard` / `fast` / `mini`）
- 从用户需求派生的 kebab-case change-name

已有项目必须先调查与需求相关的源码、测试和现有约定；新项目需要确认目标目录和技术边界。

## Change scaffold 与状态初始化

1. 提议 kebab-case change-name，并在创建工件前让用户确认。
2. 检查 `.xiao-flow/<change-name>.json` 和 OpenSpec 活跃 change。若已有同名状态，仅在用户明确要求继续时恢复；新请求遇到同名状态或 OpenSpec change 时，先报告并让用户选择继续现有 change 或换一个名称，不覆盖。
3. 对新 change 执行 `openspec new change "<change-name>"`，生成 OpenSpec scaffold。命令若报告同名目录已存在则停止，进入上一步的冲突处理，不手工复用未知目录。
4. 读取 `openspec status --change "<change-name>" --json`，找到 artifact 输出为 canonical design 文件的条目；读取 `openspec instructions <design-artifact-id> --change "<change-name>" --json`，将返回的 `template`、`instruction`、`rules` 和 `resolvedOutputPath` 提供给设计阶段。即使 design 当前被标为 blocked，也可使用其模板；先完成设计，再由 Stage 2 生成依赖工件。
5. 用 `node <skill-root>/scripts/state.mjs init` 创建状态，传入 `--stage 1`、mode、实际 design 输出路径、baseCommit 和 initialDirtyPaths。这样中断恢复时能回到 Stage 1。

## 模式路由

- `standard` / `fast`：按下方上下文调用 `superpowers:brainstorming`。
- `mini`：不调用 brainstorming Skill。由 XIAOFlow 完成同样的代码调查，按 OpenSpec design artifact 的模板写入同一个 canonical design 文件，只包含问题、范围、非目标、预计文件和验证方式；不得讨论多个架构方案。

## 调用上下文

```
使用 superpowers:brainstorming 分析以下需求：

<用户需求原始描述>

<补充信息，如有>

<项目规则摘要及路径>

<项目类型及现有代码调查结果>

<当前模式；fast 的精简规则见 references/guide.md>

**OpenSpec canonical artifact：** 将验证后的设计直接写入下方 `resolvedOutputPath`，通常是 `openspec/changes/<change-name>/design.md`。遵循前置读取的 OpenSpec template、instruction 和 rules；该文件同时是 brainstorming 的书面设计与 OpenSpec canonical design。

不要另建 `design-input.md`，也不要写到 Superpowers 默认的 `docs/superpowers/specs/`。

输出并审阅 canonical design 后返回 XIAOFlow，不进入 writing-plans，不 commit。
```

## 产出

- OpenSpec canonical design：前置 instructions 返回的 `resolvedOutputPath`（默认 `openspec/changes/<change-name>/design.md`）
- 已确认的 kebab-case change-name

该 `design.md` 是唯一书面设计文档，不再另存一份 `design-input.md`。Stage 2 完成后，OpenSpec proposal/design/specs/tasks 一起构成唯一规范源。

## 完成

1. 汇报 OpenSpec design 路径、关键决策和 change-name。
2. 用户要求修改时继续迭代同一个 design.md；不得另存副本。
3. 用户确认书面设计后，运行 `state.mjs snapshot <state-file> planning <designPath>` 固化已批准设计，再运行 `state.mjs stage <state-file> 2`。
4. 所有模式进入 Stage 2。Fast 在本次确认后可连续完成 Stage 2–3；Mini 完成 Stage 2 后按短路径进入 Stage 4。
