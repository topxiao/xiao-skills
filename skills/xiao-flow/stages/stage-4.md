# Stage 4: TDD + 分阶段审查

## 开始前

1. 读取状态文件，确认 `status: active`、`nextStage: 4`，并取得 mode、baseCommit 和 initialDirtyPaths。
2. 运行 `state.mjs check ... planning`。Standard/Fast 还必须运行 `state.mjs check ... plan`；任一漂移都按状态规则回退，不能继续实现。
3. Standard/Fast 读取 Plan 的 Task、OpenSpec task 映射和依赖；Mini 确认 OpenSpec 中只有一个 task，并直接读取对应 spec、源码和测试。
4. 对比当前 `git status --short` 与启动快照。发现无法归因于当前 change 的新修改时，先报告并隔离范围，不擅自覆盖、暂存或清理。

## Standard / Fast 调用上下文

```
使用 superpowers:subagent-driven-development 执行计划。

计划文件: <状态文件中的 planPath>

渐进式执行流程：
1. 选择第一个未完成且依赖已满足的 Task，通过 state.mjs task 写入 currentTask。
2. 读取该 Task、依赖 Task 摘要、关联的单个 OpenSpec task/spec，以及列出的现有源码和测试。
3. 按 TDD 执行：新增失败测试 → 确认失败原因正确 → 最小实现 → 针对性测试通过。
4. 完成需求符合性审查和代码质量审查；两者都通过后，才把标题从 `### Task N` 改为 `### [x] Task N`。
5. 更新 currentTask，继续下一个可执行 Task。
6. 全部完成后运行计划定义的整体测试并做全量代码审查。

不得 commit、stash、reset 或清理 worktree。实现子代理收到相同约束。
```

## Mini inline TDD

Mini 不调用 `superpowers:subagent-driven-development`，也不存在独立 Plan：

1. 用唯一 OpenSpec task ID 写入 `currentTask`。
2. 读取对应 spec 场景、目标源码、测试和调用方。
3. 执行 RED → GREEN → REFACTOR，并运行针对性验证。
4. 完成需求符合性和代码质量自审。
5. 通过 `state.mjs complete-task` 记录完成；不得直接改写其他 OpenSpec task。

## 偏差处理

- Plan 路径或步骤不准确：调查代码后修正当前 Plan Task，保留 OpenSpec task 映射并记录原因；用户确认后重新生成 `plan` 快照再继续。
- 发现规范有误或范围变化：停止实现，回 Stage 2 同步 OpenSpec 工件，再执行 Stage 3 更新受影响计划。
- 发现外部并发修改：报告文件和冲突范围；能隔离时继续，无把握时等待用户处理。
- 调试阻塞：优先调用可用的 `superpowers:systematic-debugging`；不可用时按项目工具做系统化诊断。修复后重新执行当前 Task 的测试和审查。

## 完成

- Standard/Fast：确认 Plan 中没有未完成 Task，且每个 `[x]` Task 都有本轮测试和审查证据。
- Mini：确认唯一 OpenSpec task ID 已存在于 `completedTasks`。

清空 `currentTask` 后运行 `state.mjs stage ... 5`，汇报完成状态和整体测试结果。Standard 等待用户确认；Fast/Mini 直接进入 Stage 5。
