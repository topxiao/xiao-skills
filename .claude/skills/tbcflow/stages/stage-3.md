# Stage 3: 计划拆分 → `superpowers:writing-plans`

## tbcckg 辅助

> 新项目时跳过本节，直接进入上下文部分。

生成计划时用 tbcckg 评估变更影响、获取精确文件路径：

```
逐 capability 生成计划时，对涉及的实体调用：
- impact → qualifiedName="要修改的实体QN" direction="upstream" maxDepth=3
  — 评估变更影响范围，在 step 中标注受影响的上下游
- locate → qualifiedName="实体QN" project="项目名"
  — 获取精确文件路径（relativePath），impact 不含此字段
```

## 上下文

```
使用 superpowers:writing-plans 创建实施计划。

工件位置: openspec/changes/<change-name>/

渐进式生成流程：
1. ls openspec/changes/<change-name>/specs/ — 获取 capability 列表
2. 仅读取 openspec/changes/<change-name>/design.md — 理解架构决策
3. 逐 capability 生成计划（每次只处理一个）：
   - 仅读取该 capability 的 openspec/changes/<change-name>/specs/<capability>/spec.md
   - 用 tbcckg impact 评估影响范围，locate 获取精确文件路径
   - 基于需求生成实施 steps（核心代码、精确路径）
   - 追加写入计划文件
4. 全部完成后读取计划文件做整体一致性检查

<tbcckg 影响分析结果（如有）>

保存到: docs/superpowers/plans/YYYY-MM-DD-<change-name>.md
若该文件已存在（不完整计划或中断恢复），直接覆盖重写。

约束：
- 每个 step 必须包含核心代码，不能有 TODO/TBD/占位符
- 遵循 TDD：先写测试再写实现
- Plan 覆盖 specs/ 下所有 capability 的需求，不自创或遗漏
```

## Plan 格式要求

每个 Task 标题使用固定格式，用于进度追踪：

```markdown
### Task N: <title>

**Capability**: <对应的 capability 名>
```

## 产出

- 实施计划：`docs/superpowers/plans/YYYY-MM-DD-<change-name>.md`

## 完成

汇报计划路径、Task 数。用户确认 → Stage 4。
