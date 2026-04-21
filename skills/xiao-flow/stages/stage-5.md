# Stage 5: 验证 → `superpowers:verification-before-completion`

## 前置同步

验证前，将 Plan 文件的 Task 完成状态同步到 tasks.md：

```
1. 读取 Plan 文件，统计每个 Task 的完成状态（### [x] vs ### Task）
2. 按 **Capability** 字段分组，判断每个 capability 是否所有 Task 都已完成
3. 一次性更新 tasks.md：
   - capability 所有 Task 完成 → `- [x] capability — 描述`
   - capability 存在未完成 Task → `- [ ] capability — 描述（Task N 未完成）`
```

若同步发现未完成的 Task → 报告具体未完成项，退回 Stage 4。

## xiaockg 辅助

> 新项目时跳过本节，直接进入验证部分。

验证阶段用 xiaockg 做文件级变更影响评估，作为最终安全网：

```
detect_changes → changedFiles="变更文件JSON数组" project="项目名" category="分类"
— 评估变更文件的爆炸半径（受影响实体、聚类、执行流）
— 检查 riskLevel：low 可继续，medium/high 需在验证结果中说明
```

## 验证

```
使用 superpowers:verification-before-completion 验证以下声明：

验证项：
1. Plan 文件所有 Task 已完成 — 无未标记的 ### Task N
2. 所有测试通过 — 有自动化测试则运行，无则提示用户手动验证
3. 代码符合 design.md — 对照 openspec/changes/<name>/design.md
4. 代码符合 proposal.md — 对照 openspec/changes/<name>/proposal.md
5. 无 lint/type 错误 — 运行对应检查命令
6. 无提前 commit — git log 检查：
   - 如发现异常 commit，报告列表（hash、message、时间）
   - 询问用户是否 git reset --soft HEAD~N，确认后执行
7. 变更影响可控 — xiaockg detect_changes 风险评估结果

<xiaockg detect_changes 结果>

规范位置: openspec/changes/<change-name>/
```

## 路由

验证通过 → 读取 `stages/stage-6.md`。验证失败 → 报告不成立的声明，回 Stage 4 修复。
