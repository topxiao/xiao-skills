---
name: xiao-spec
description: "自包含的纯提示词规格驱动开发工作流。用户显式调用 /xiao-spec，或要求需求澄清、规格整理、实施计划、TDD 实现、验证、恢复或归档时使用。"
license: MIT
compatibility: Requires a host that can read Markdown and access project files; Git and subagent tools are optional
metadata:
  author: "XIAO"
  version: "4.1.0"
  generatedBy: "xiao-spec"
---

# XIAO-Spec 4.x

XIAO-Spec 是独立的提示词工作流，负责把需求推进到设计、计划、实现、验证和归档。它内置需求澄清、结构化验收、任务计划、TDD、系统化调试、双重审查和新鲜验证；任何外部框架、Node.js、Git、子代理和可执行脚本都不是运行前置条件。

## 全局不变量

- 任何写操作前先读取适用的 `CLAUDE.md`、`AGENTS.md` 和项目规则。
- 阶段按顺序推进；未经用户批准不得跳过设计或计划门。
- 需求与设计唯一写入 `change.md`；任务定义与进度唯一写入 `implementation-plan.md`。
- 启动前已有修改属于用户，不覆盖、不 stash、不 reset、不自动清理、不擅自暂存。
- 不把密码、Token、密钥、客户数据或完整日志写入 change、计划或验证证据。
- 测试、审查和验证必须使用本轮证据；不能用旧日志、推测或 checkbox 代替。
- 发现需求/计划漂移、范围不明、失败证据或授权缺失时暂停并报告。
- 归档、移动、重命名和 commit 前取得用户授权。

## 阶段与模式

```text
Standard/Fast：设计 → 计划 → 实现 → 验证 → 归档 → 完成
Mini：         设计 → 实现 → 验证 → 归档 → 完成
```

| 模式 | 适用范围 | 主要差异 |
|---|---|---|
| Standard | 跨模块、高风险、架构调整或边界不明 | 完整设计、计划、TDD、两轮审查和确认门 |
| Fast | 2–3 个同模块低风险任务 | 减少暂停，不降低测试、审查和验证要求 |
| Mini | 一个低风险、可独立验证的任务 | 设计获批后写入单任务计划文件，跳过独立计划审批 |

无法明确文件或验证方式、涉及数据库迁移、权限/安全、公开 API、CI/CD、基础设施或发布时，使用 Standard。实现中发现任务增多或风险升级，只能向更严格模式升级。

## 前置路由

1. 确认需求、项目根目录、change-name 和模式；名称冲突时先询问。
2. 澄清后发现无需任何代码或文档变更（纯问答、信息查询等）时，直接给出结论并结束，不创建 change 目录。
3. 读取项目规则、相关代码/测试，并记录 Git 基线与启动前脏文件；Git 不可用时标记未知。
4. 新建或恢复 change：默认目录为 `docs/changes/<change-name>/`，遵从项目已有约定。
5. 新建任务进入设计；已有 `change.md`/计划按恢复规则判断阶段。

## 按需加载

只读取当前阶段主参考，不一次性加载全部文件：

| 情况 | 读取 |
|---|---|
| 设计/需求澄清 | `references/design-and-specification.md` |
| Standard/Fast 计划或 Mini 内联任务 | `references/planning.md` |
| 任务实现 | `references/implementation.md` |
| 测试失败、调试或任务审查 | `references/debugging-and-review.md` |
| 阶段切换、恢复、漂移、验证、归档 | `references/verification-and-recovery.md` |

## 阶段退出条件

- **设计**：`change.md` 完整，范围、非目标和验收场景已获用户确认。
- **计划**：Standard/Fast 的 `implementation-plan.md` 已批准；Mini 有且只有一个可验证任务。
- **实现**：所有任务都有 `- [x] Task complete`，并有测试、需求符合性审查和代码质量审查证据。
- **验证**：计划命令本轮运行，验收场景覆盖，失败/未运行项明确，变更范围已复核。
- **归档**：长期规格按需同步，归档位置和最终状态已记录；移动或 commit 按用户选择执行。

阶段完成后先汇报证据，再进入下一阶段。恢复时从最早缺少退出证据的阶段继续；无法确定时询问，不猜测。带未解决失败的 change 只能停在 `blocked` 或按用户要求取消，不得标记完成。
