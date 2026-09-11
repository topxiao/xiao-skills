# Stage 2: 规范生成 → `openspec-propose`

## 调用上下文

```
使用 openspec-propose 技能创建变更 "<change-name>"。

需求已通过 brainstorming 完成，完整设计文档：
docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md

请先读取上述设计文档完整内容，基于其中所有需求要点生成 OpenSpec 工件。
保持需求语义、约束和验收条件完整，不自行扩展范围。

如果设计文档中缺少生成 OpenSpec 工件所需的关键技术细节（如接口约定、数据结构、技术选型），应主动澄清这些具体信息。

完成后返回 XIAOFlow，不运行 /opsx:apply，不 commit。
```

## 产出

`openspec/changes/<change-name>/` 下：proposal.md, design.md, specs/, tasks.md

## 完整性检查

1. 运行 `openspec status --json`，确认 proposal、design、specs、tasks 全部完成。
2. 核对 Stage 1 的需求、约束和验收条件在 OpenSpec 工件中均可追踪。
3. 工件不完整时留在 Stage 2，使用 `openspec-propose` 补齐；不要只手工修改单个文件后直接进入下一阶段。

## 完成

汇报工件列表、Capability 数和 OpenSpec Task 数，并执行任务粒度审查：
- 每个 capability 有可独立验证的行为和验收场景
- tasks.md 中每个 task 有稳定 ID、明确完成条件和所属 capability
- 过大 capability 拆分；无法独立验证的碎片合并
- 依赖顺序在 tasks.md 表达清楚，不强拆耦合任务

- `standard`：展示审查结果并询问“是否需要调整？(确认/调整)”。
- `fast`：自动自审；仍为 2–3 个低风险 task 且单一模块时继续，否则调用 `state.mjs mode ... standard` 并等待确认。
- `mini`：必须恰好一个 task、一个 capability 且无高风险边界。出现 2–3 个低风险 task 时升级 Fast；其他情况升级 Standard。

需要调整时，通过 `openspec-propose` 同步更新所有受影响工件，再重复完整性检查，避免 proposal、design、specs 和 tasks 互相矛盾。

审查通过后，对 proposal、design、tasks 和每个 spec 的精确路径生成 `planning` 快照。Stage 1 设计输入不进入该快照；OpenSpec 从此成为唯一规范源。

退出条件满足后：

- `standard`：运行 `state.mjs stage ... 3`，等待用户确认后进入 Stage 3。
- `fast`：运行 `state.mjs stage ... 3`，根据 Stage 1 授权直接进入 Stage 3。
- `mini`：运行 `state.mjs stage ... 4`，跳过 Stage 3，进入 inline TDD。
