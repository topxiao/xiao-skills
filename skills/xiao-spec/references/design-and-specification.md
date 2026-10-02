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
xiao_spec_version: 1.1.0
mode: standard
phase: design # design|plan|implementation|verification|archive|completed
status: active # active|blocked|cancelled|completed
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

## 章节定义

每个章节写什么，一行一个：

| 章节 | 写什么 |
|---|---|
| Problem | 当前痛点，为什么现在做，一两句话 |
| Goals | 成功后可观察的结果 |
| Scope | 明确包含的文件、模块和行为 |
| Non-goals | 明确不做、防止范围蔓延的内容 |
| Constraints | 技术、兼容性、性能、安全等硬约束 |
| Design | 选定方案与取舍；多方案时记录未选方案及原因 |
| Requirements and Scenarios | 每条需求至少一个可观察场景：前置条件 / 操作 / 预期结果 |
| Acceptance | 验收清单（普通列表，不勾选），逐条对应测试、静态检查、人工检查或用户验收动作；证据写入最终验证报告 |
| Decisions and Open Questions | 已定决策、待定问题及其影响 |

## 排版约定

这两份文档是给人直接读的源文件，不只看渲染效果，避免超长单行：

- 正文与列表项每行不超过约 100 个半角字符（汉字约 50），在标点或空格处折行。
- 列表项续行缩进与首行文字对齐，嵌套层级用缩进表达。
- 内容变长优先拆子列表或子段落，不把多个要点堆进一行。
- 同类型并列内容（多个文件、命令、要点等）超过约 3 项时改为列表：无顺序用无序列表，有先后步骤用有序列表，不用顿号或逗号串成超长行。
- 命令、路径、URL 和代码保持一行，不折行。

## 示例

Mini 规模的填充示例（仅示意正文，frontmatter 见上方模板）：

```markdown
# 导出按钮增加 CSV 格式

## Problem
当前只能导出 JSON，运营需要 CSV 直接进表格工具。

## Goals
- 导出时可选择 CSV，数据内容与 JSON 导出一致

## Scope
- `src/export/` 的格式选择与 CSV 序列化
- 导出相关测试

## Non-goals
- 不支持 xlsx
- 不改导出权限逻辑

## Constraints
- 纯前端实现，不新增依赖

## Design
在现有格式枚举中新增 `csv` 分支，复用现有数据组装逻辑，仅序列化层不同。

## Requirements and Scenarios
- R1 选择 CSV 导出
  - 前置条件：列表已有数据
  - 操作：导出时选择 CSV
  - 预期结果：下载 `.csv`，表头与列顺序和 JSON 字段一致

## Acceptance
- A1 `npm test -- export` 通过，覆盖 R1
- A2 人工导出检查中文内容不乱码

## Decisions and Open Questions
- 已定：逗号分隔，UTF-8 BOM 保证中文兼容
- 待定：无
```

## 设计调查

- 先写出对用户目标、约束和成功标准的简短理解，请用户纠正误解。
- 方案涉及多个组件时提出 2–3 个可行方案，说明取舍并给出推荐；简单变更只保留必要方案。
- 各章节按上方定义填写；不确定的内容放进 Decisions and Open Questions，不编造。

## 审批门

汇报 change 路径、关键决策、范围、非目标和验收场景，等待用户明确批准。批准只允许进入计划阶段；设计变更必须重新展示受影响内容并重新批准。获批后按 `verification-and-recovery.md` 的事件表更新阶段字段，再进入下一阶段。

Mini 可以在同一轮内完成设计和一项计划，但仍必须先得到设计范围与验收标准的确认。

## 漂移处理

实现开始后若 `change.md` 的目标、范围、约束、设计或验收场景改变：暂停实现，展示具体差异，判断已有计划和代码受影响范围，要求重新确认。只改变任务 checkbox 不属于设计漂移。
