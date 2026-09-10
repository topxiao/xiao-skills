# XIAOFlow 参考指南

> 按需加载。模式在前置检查时确定并写入状态文件；恢复时沿用原模式，除非用户明确更改。

## 模式

模式只允许从短路径向更严格路径升级，不允许在已经生成工件后降级。

| 模式 | 适用边界 | 阶段序列 | 执行方式 |
|------|----------|----------|----------|
| Standard | 跨模块、新功能、架构调整或风险不明确 | 1 → 2 → 3 → 4 → 5 → 6 | 完整 Plan + SDD |
| Fast | 2–3 个低风险 OpenSpec task、单一模块 | 1 → 2 → 3 → 4 → 5 → 6 | 精简 Plan + SDD，减少确认轮次 |
| Mini | 1 个低风险、可独立验证的 OpenSpec task | 1 → 2 → 4 → 5 → 6 | 无独立 Plan，inline TDD |

### Standard（默认）

Stage 1、2、3、4 分别汇报并等待确认；Stage 5 通过后进入 Stage 6，由用户选择归档方式。

### Fast（加速完整路径）

- Stage 1 使用 `superpowers:brainstorming`，聚焦边界和推荐方案。
- Stage 1 获得确认后连续执行 Stage 2–3；Stage 2 自动完成粒度自审，仅在边界不满足时暂停。
- Stage 3 仍保留 OpenSpec task 映射、代码调查、验证命令和独立 Plan，但压缩解释性文字。
- Stage 3 确认后连续执行 Stage 4–5；验证通过后再询问归档方式。

### Mini（真正短路径）

- 只在用户显式选择或边界完全明确时使用。
- Stage 1 不调用 brainstorming Skill；XIAOFlow 调查相关代码后生成一份精简设计输入，只记录问题、范围、非目标、文件边界和验证方式。
- Stage 2 仍生成完整 OpenSpec 工件，并确认只有一个 task、一个 capability、无高风险边界。
- Stage 2 保存 `planning` 快照后直接转换到 Stage 4，不生成独立 Plan。
- Stage 4 由当前 Agent 根据唯一 OpenSpec task/spec 做 inline TDD；不分派实现子代理。
- Stage 5–6 与其他模式相同。

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

## 使用示例

```text
用户: /xiao-flow mini 给 User 模型添加可选的 displayName 字段

XIAOFlow: [前置检查通过]
          [Stage 1：内联调查，确认精简设计和 change-name]
          [Stage 2：OpenSpec 工件与 planning 快照完成]
          [Stage 4：按唯一 task 完成 inline TDD]
          [Stage 5：验证通过]
          请选择归档方式：归档 + commit / 只归档
```
