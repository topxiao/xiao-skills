# XIAOFlow 编排规则

> 本文件始终生效。不要依赖上游 Skill 的内部步骤编号；它们可能随版本变化。只覆盖输入、输出、阶段出口和安全边界。

## 通用边界

- 被调用 Skill 负责本阶段专业工作，XIAOFlow 负责提供完整输入、检查退出条件并决定下一阶段。
- 无论被调用 Skill 默认建议什么，`standard`/`fast` 均按 Stage 1 → 6 流转；`mini` 使用 1 → 2 → 4 → 5 → 6 短路径。短路径可以跳过独立 Plan，但不能跳过 OpenSpec、TDD、验证或归档。
- Stage 6 前禁止 commit，包括实现子代理。禁止自动 stash、reset、删除 worktree 或丢弃任何修改。
- 不并行分派实现任务；并行只允许用于互不修改文件的只读调查或调试取证。
- 状态与文件冲突时，以项目规则、实际文件、OpenSpec 状态和 Git 证据为准，回退到最早未满足退出条件的 Stage。
- 只通过 `scripts/state.mjs` 更新状态和快照；不要手工改写 JSON 绕过合法转换。

## Skill 覆盖规则

### `superpowers:brainstorming`

- 仅用于 `standard`/`fast`；`mini` 由 XIAOFlow 完成一次内联边界调查并生成精简设计输入。
- 输出 Stage 1 设计文档后返回 XIAOFlow，不直接进入 writing-plans。
- 如果上游流程包含 commit，只保存文档；提交统一留到 Stage 6。

### `openspec-propose`

- `/opsx:propose` 仅视为命令别名，编排中统一使用 Skill 名 `openspec-propose`。
- 以 Stage 1 设计文档作为需求来源；只在缺少关键技术契约时提出具体问题。
- 工件完成后返回 XIAOFlow 做完整性和粒度检查，不运行 `/opsx:apply`。

### `superpowers:writing-plans`

- 仅用于 `standard`/`fast`；`mini` 不生成独立 Plan。
- 输入包括 OpenSpec 的 `proposal.md`、`design.md`、`specs/`、`tasks.md`，以及按 capability 调查到的现有源码和测试。
- 每个 Plan Task 指向一个 OpenSpec task；同一 OpenSpec task 可拆为多个 Plan Task。Stage 3 不修改 `tasks.md`。
- 生成 Plan 后返回 XIAOFlow，不执行上游默认的 implementation handoff。

### `superpowers:subagent-driven-development`

- 仅用于 `standard`/`fast`；`mini` 由当前 Agent 按唯一 OpenSpec task 做 inline TDD。
- 进度只更新 Plan Task 和状态文件中的 `currentTask`，不直接更新 `tasks.md`。
- 每个 Task 通过针对性测试和两阶段审查后才标记 `[x]`。
- 完成全部 Task 后返回 Stage 5，不调用 finishing-a-development-branch，也不 commit。

### `superpowers:verification-before-completion`

- `standard`/`fast` 先按 Plan 映射同步 OpenSpec task；`mini` 按状态文件中的 `completedTasks` 同步唯一 task。
- 验证必须覆盖 OpenSpec specs 中的场景、项目规定命令和当前 change 的 Git 边界。
- 只接受本次运行得到的新鲜命令输出，不用推断或历史结果代替。
- 验证通过后返回 Stage 6；验证失败时按失败类型回到 Stage 2、3 或 4。

### `openspec-archive-change`

- 仅在 Stage 5 通过且用户选择归档方式后调用。
- 归档完成后返回 XIAOFlow 做路径验证和可选的 scoped commit。
