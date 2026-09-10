# XIAOFlow 编排规则

> 本文件始终生效。不要依赖上游 Skill 的内部步骤编号；它们可能随版本变化。只覆盖输入、输出、阶段出口和安全边界。

## 通用边界

- 被调用 Skill 负责本阶段专业工作，XIAOFlow 负责提供完整输入、检查退出条件并决定下一阶段。
- 无论被调用 Skill 默认建议什么，`standard`/`fast` 均按 Stage 1 → 6 流转；`mini` 使用 1 → 2 → 4 → 5 → 6 短路径。短路径可以跳过独立 Plan，但不能跳过 OpenSpec、TDD、验证或归档。
- Stage 6 前禁止 commit，包括实现子代理。禁止自动 stash、reset、删除 worktree 或丢弃任何修改。
- 不并行分派实现任务；并行只允许用于互不修改文件的只读调查或调试取证。
- 状态与文件冲突时，以项目规则、实际文件、OpenSpec 状态和 Git 证据为准，回退到最早未满足退出条件的 Stage。
- 只通过 `scripts/state.mjs` 更新状态和快照；不要手工改写 JSON 绕过合法转换。

## Skill 覆盖摘要

各 Stage 文件包含完整的调用上下文和退出条件。以下仅列出跨阶段的关键覆盖约束：

- 所有被调用 Skill 完成后必须返回 XIAOFlow，不得自行跳转到下一阶段或触发 commit。
- `/opsx:propose` 仅视为命令别名，编排中统一使用 Skill 名 `openspec-propose`；完成后不运行 `/opsx:apply`。
- `superpowers:subagent-driven-development` 的进度只更新 Plan Task 和 `currentTask`，不直接更新 `tasks.md`；每个 Task 通过针对性测试和两阶段审查后才标记 `[x]`。
- `superpowers:verification-before-completion` 只接受本次运行的新鲜命令输出，不用推断或历史结果代替。
- `openspec-archive-change` 仅在 Stage 5 通过且用户选择归档方式后调用。
