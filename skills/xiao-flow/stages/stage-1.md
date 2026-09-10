# Stage 1: 需求探索

## 输入准备

调用 Skill 前先收集：

- 用户原始需求和补充信息
- 已读取的项目规则及其路径
- 项目类型（新项目 / 已有项目）
- `baseCommit` 和 `initialDirtyPaths`
- 当前模式（`standard` / `fast` / `mini`）

已有项目必须先调查与需求相关的源码、测试和现有约定；新项目需要确认目标目录和技术边界。

## 模式路由

- `standard` / `fast`：按下方上下文调用 `superpowers:brainstorming`。
- `mini`：不调用 brainstorming Skill。由 XIAOFlow 完成同样的代码调查，直接写一份精简设计输入，只包含问题、范围、非目标、预计文件和验证方式；不得讨论多个架构方案。

## 调用上下文

```
使用 superpowers:brainstorming 分析以下需求：

<用户需求原始描述>

<补充信息，如有>

<项目规则摘要及路径>

<项目类型及现有代码调查结果>

<当前模式；fast 的精简规则见 references/guide.md>

输出设计文档后返回 XIAOFlow，不进入 writing-plans，不 commit。
```

## 产出

- 设计输入：`docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`（Mini 使用精简版）
- 建议的 kebab-case change-name

该文档只负责向 Stage 2 传递已确认意图。Stage 2 完成后，OpenSpec proposal/design/specs/tasks 成为唯一规范源，不再反向修改本文件。

## 完成

1. 汇报设计文档路径、关键决策和建议 change-name。
2. 用户要求修改时继续迭代设计，不提前创建 OpenSpec 工件。
3. 用户确认后执行 `state.mjs init` 创建状态文件，传入 mode、designPath、baseCommit 和每个 initialDirtyPath；初始 `nextStage` 为 `2`。
4. 所有模式进入 Stage 2。Fast 在本次确认后可连续完成 Stage 2–3；Mini 完成 Stage 2 后按短路径进入 Stage 4。
