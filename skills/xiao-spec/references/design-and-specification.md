# 设计与需求说明

仅在新建 change 或批准后的设计发生变化时加载。本文件定义 `change.md` 的唯一格式。

## 开始前

1. 读取项目根目录及目标目录作用域内的 `CLAUDE.md`、`AGENTS.md` 和其他项目规则。
2. 检查相关源码、测试、配置和已有文档；不要只凭用户描述推测项目结构。
3. 记录当前 Git `HEAD` 和启动前已有脏文件；Git 不可用时明确标记为未知。
4. 提议 kebab-case change 名称；名称冲突时先询问，不覆盖已有 change。

## `change.md` 模板

新 change 默认放在 `docs/changes/<change-name>/change.md`，遵从项目已有文档约定。

```markdown
---
xiao_spec_version: 4.0.0
mode: standard
phase: design # design|plan|implementation|verification|archive|completed
status: active # active|blocked|archived|completed
base_commit: <hash|NONE|UNKNOWN>
initial_dirty_paths: []
approved_at: null
archive_path: null
---

# <Change title>

## Problem
## Goals
## Scope
## Non-goals
## Constraints
## Design
## Requirements and Scenarios
## Acceptance
## Decisions and Open Questions
```

frontmatter 是人工维护的恢复记录，不是自动状态机。`phase` 和 `status` 只能使用模板列出的值；无法从正文或证据确认的字段标记为未知，不补写假状态。不要记录密码、Token、密钥、客户数据或完整日志。

## 设计调查

- 先写出对用户目标、约束和成功标准的简短理解，请用户纠正误解。
- 方案涉及多个组件时提出 2–3 个可行方案，说明取舍并给出推荐；简单变更只保留必要方案。
- `Scope` 写明确包含的文件/模块和行为；`Non-goals` 写明确不做的内容。
- 每个需求至少包含一个可观察场景，使用“前置条件 / 操作 / 预期结果”描述。
- `Acceptance` 必须能对应到测试、静态检查、人工检查或明确的用户验收动作。

## 审批门

汇报 change 路径、关键决策、范围、非目标和验收场景，等待用户明确批准。批准只允许进入计划阶段；设计变更必须重新展示受影响内容并重新批准。

Mini 可以在同一轮内完成设计和一项计划，但仍必须先得到设计范围与验收标准的确认。

## 阶段字段更新

阶段完成后，在继续工作前更新 `change.md` frontmatter：

| 事件 | `phase` | `status` |
|---|---|---|
| 设计获批，Standard/Fast 进入计划 | `plan` | `active` |
| 设计获批，Mini 进入实现 | `implementation` | `active` |
| 计划获批并开始实现 | `implementation` | `active` |
| 所有任务完成并开始验证 | `verification` | `active` |
| 验证证据完整并开始归档 | `archive` | `active` |
| 归档完成 | `completed` | `completed` |
| 当前阶段无法继续 | 保留当前阶段 | `blocked` |

每次用户批准设计或计划时更新 `approved_at`。阶段字段只反映证据已经达到的阶段，不得提前填写。

## 漂移处理

实现开始后若 `change.md` 的目标、范围、约束、设计或验收场景改变：暂停实现，展示具体差异，判断已有计划和代码受影响范围，要求重新确认。只改变任务 checkbox 不属于设计漂移。
