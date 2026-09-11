# XIAOFlow 参考指南

> 按需加载。模式在前置检查时确定并写入状态文件；恢复时沿用原模式，除非用户明确更改。

## 模式

模式只允许从短路径向更严格路径升级，不允许在已经生成工件后降级。

| 模式 | 适用边界 | 阶段序列 | 执行方式 |
|------|----------|----------|----------|
| Standard | 跨模块、新功能、架构调整或风险不明确 | 1 → 2 → 3 → 4 → 5 → 6 | 完整 Plan + SDD |
| Fast | 2–3 个低风险 OpenSpec task、单一模块 | 1 → 2 → 3 → 4 → 5 → 6 | 精简 Plan + SDD，减少确认轮次 |
| Mini | 1 个低风险、可独立验证的 OpenSpec task | 1 → 2 → 4 → 5 → 6 | 无独立 Plan，inline TDD |

Standard 在 Stage 1、2、3、4 分别汇报并等待确认。Fast 获 Stage 1 确认后连续执行 2–3，获 Stage 3 确认后连续执行 4–5。Mini 不调用 brainstorming，Stage 1 由 XIAOFlow 内联调查生成精简设计输入（问题、范围、非目标、预计文件和验证方式），Stage 2 后直接进入 Stage 4 inline TDD。

### 升级规则

- Mini 发现 2–3 个低风险 task、仍为单一模块 → `mini → fast`，补做 Stage 3。
- Mini 或 Fast 发现超过 3 个 task、跨模块、风险不明确 → 升级 Standard。
- 涉及数据库 schema/迁移、认证授权、安全边界、公开 API、CI/CD、基础设施或生产发布 → Standard。
- 无法明确变更文件或自动化验证方式 → Standard。

使用 `node <skill-root>/scripts/state.mjs mode <state-file> <fast|standard>` 持久化升级。升级保留已有工件，但会回到需要补齐的最早阶段。模式升级不替代敏感操作授权。

## 异常处理

阶段特定的偏差和回退规则见各 Stage 文件。以下为跨阶段通用异常：

| 情况 | 处理 |
|------|------|
| Git、OpenSpec CLI 或必需 Skill 缺失 | 写文件前停止，列出缺失项和检测证据 |
| 状态文件与实际文件冲突 | 用 `state.mjs check` 定位漂移，再用 `state.mjs stage` 回退到最早未满足退出条件的 Stage |
| 多个活跃 change | 列出候选 change-name，询问用户选择 |
| Stage 1 需求过大 | 建议拆分独立 change，未经用户选择不擅自拆分 |
| 发现外部并发修改 | 报告文件和重叠范围；可隔离则继续，否则等待用户处理 |

