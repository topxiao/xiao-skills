# Stage 4: TDD + 分阶段审查 → `superpowers:subagent-driven-development`

## 上下文

```
使用 superpowers:subagent-driven-development 执行计划。

计划文件: docs/superpowers/plans/YYYY-MM-DD-<change-name>.md

渐进式执行流程：
1. 仅读取 Plan 文件的目录/任务列表部分，了解任务总数
2. 逐任务执行：
   - 仅读取该任务的 step 部分（不读取其他任务内容）
   - Plan 已包含精确文件路径（来自 Stage 3 的 locate），直接 Read 源码
   - 执行过程中对照 openspec/changes/<change-name>/specs/ 验证实现
   - 如需定位 Plan 中未覆盖的代码，按需调用 xiaockg locate/search
   - 完成后将 Plan 文件中 `### Task N: title` 标记为 `### [x] Task N: title`
3. 全部完成后做最终全量代码审查
```

## 完成

汇报 Plan 文件 Task 完成状态（N/N completed）。用户确认 → Stage 5。
