# Stage 2: 规范生成 → `openspec-propose`

## 调用上下文

```
使用 openspec-propose 技能继续当前 XiaoFlow change："<change-name>"。

该 change 已由 Stage 1 执行 `openspec new change` scaffold；用户已确认 change-name，并审阅过 OpenSpec canonical design：
<状态文件中的 designPath>

这是本轮流程刻意建立的活跃 change，不是名称碰撞。跳过 `openspec new change`，也不要再次询问“继续还是新建”；直接运行 `openspec status --change "<change-name>" --json` 并从当前 artifact 状态续做。

调用 Skill 前运行 `state.mjs check <state-file> planning`，确认 Stage 1 已批准的 design 未漂移。

`design.md` 是 Stage 1 已批准的 canonical design。OpenSpec 按输出文件存在与否判定 artifact 完成，design 会显示为 `done`；遵循 Skill 的依赖顺序，只创建状态为 `ready` 的其余 artifact。不要覆盖、重写或另存 design.md；如 proposal/specs/tasks 必须导致 design 有实质变化，先向用户展示差异并取得确认。

读取 status 中的 `artifactPaths` 和 `actionContext`，按 `openspec-propose` 的 artifact instructions 创建 proposal、specs、tasks 等剩余工件。将 Stage 1 已批准设计作为需求来源，保持意图、约束和验收条件完整，不自行扩展范围。

如果设计文档中缺少生成 OpenSpec 工件所需的关键技术细节（如接口约定、数据结构、技术选型），应主动澄清这些具体信息。

完成后返回 XiaoFlow，不运行 /opsx:apply，不 commit。
```

## 产出

`openspec/changes/<change-name>/` 下：proposal.md, design.md, specs/, tasks.md；其中 design.md 是 Stage 1 已批准原件。

## 完整性检查

1. 运行 `openspec status --change "<change-name>" --json`，确认 proposal、design、specs、tasks 全部完成，且 `designPath` 仍是 Stage 1 已批准文件。
2. 核对 Stage 1 的需求、约束和验收条件在 OpenSpec 工件中均可追踪。
3. 再运行 `state.mjs check <state-file> planning`。planning 快照此时仍只包含 designPath；若 propose 意外改写了 Stage 1 设计，运行 `state.mjs stage <state-file> 1`，展示差异并暂停，请用户复核。用户接受修改后，更新设计基线并重新核对依赖该设计的 OpenSpec 工件；不接受则先恢复已批准设计。
4. 运行 `openspec validate --type change "<change-name>"` 验证工件格式。工件不完整时留在 Stage 2，使用 `openspec-propose` 补齐；不要只手工修改单个文件后直接进入下一阶段。

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

审查通过后，对 proposal、canonical design、tasks 和每个 spec 的精确路径生成完整 `planning` 快照，替换 Stage 1 的 design-only 基线。OpenSpec 从此是唯一规范源。

退出条件满足后：

- `standard`：运行 `state.mjs checkpoint <state> planning 3 <proposal> <design> <tasks> <spec...>`，等待用户确认后进入 Stage 3。
- `fast`：运行同一 `checkpoint planning`，根据 Stage 1 授权直接进入 Stage 3。
- `mini`：运行 `checkpoint <state> planning 4 <proposal> <design> <tasks> <spec>`，跳过 Stage 3，进入 inline TDD。
