# XIAOFlow 状态与恢复

## 存储与运行时

状态文件固定为：

```text
.xiao-flow/<change-name>.json
```

- 确认 change-name 并由 Stage 1 创建 OpenSpec scaffold 后、调用 brainstorming 前创建；一个 change 对应一个同名 JSON，`nextStage: 1` 支持在设计未完成时恢复。
- 状态文件是本地控制记录，init 时自动追加到 `.gitignore`；项目规则要求版本化时另行处理。
- 完成后保留，不自动删除或改名。
- 只记录状态、时间、路径、简短标识和 hash；不要写入密钥、文件内容、完整日志或客户数据。
- 使用 `node <skill-root>/scripts/state.mjs ...` 读写。脚本在同目录写临时文件并原子替换，禁止直接编辑 JSON 绕过校验。

## Schema v2

```json
{
  "schemaVersion": 2,
  "changeName": "...", "mode": "standard|fast|mini", "status": "active|archived|completed",
  "nextStage": 1, "projectRoot": "...", "baseCommit": "<hash|UNBORN>",
  "initialDirtyPaths": [], "initialDirtySnapshot": null,
  "designPath": "...", "planPath": null, "currentTask": null, "completedTasks": [],
  "verifiedAt": null, "snapshots": { "planning": null, "plan": null, "verification": null },
  "archivePath": null, "pendingAction": null, "commitHash": null
}
```

字段规则：`mode` 只能按 `mini → fast → standard` 升级。`status` 归档但 commit 未成功时保持 `archived`。`initialDirtySnapshot` 保存启动前脏文件 hash。`designPath` 取自 Stage 1 的 OpenSpec design artifact `resolvedOutputPath`（默认 `openspec/changes/<change-name>/design.md`）；Standard/Fast 的 `planPath` 固定为 `openspec/changes/<change-name>/implementation-plan.md`，一经确定便跨日期复用（Mini 的 `planPath` 为 `null`）。状态文件本身不进入任何 snapshot。

## 快照和漂移

| 快照 | 生成时机 | 文件范围 | 漂移路由 |
|------|----------|----------|----------|
| `planning` | Stage 1 获批后先记录 `designPath`；Stage 2 完成后扩展为全量快照 | Stage 1：canonical design；Stage 2：proposal、design、specs、tasks | design 基线漂移回 Stage 1 复核；完整规划快照漂移回 Stage 2；Standard/Fast 随后重做 Stage 3 |
| `plan` | Stage 3 完成 | `planPath` | 回 Stage 3 |
| `verification` | Stage 5 通过 | 当前 change 的代码、测试、配置、OpenSpec 工件和 `implementation-plan.md`（若存在） | 回 Stage 5 |

`planning` 对 OpenSpec `tasks.md` 的 checkbox 做归一化，因此 Stage 5 的单向完成投影不会被误判为范围漂移。Plan 不做进度归一化：Task 标题、步骤、路径和映射在执行期间保持稳定，任何变化都回 Stage 3 复核。

快照操作：旧命令可用 `state.mjs snapshot <state-file> <slot> <path...>` 生成，`state.mjs check <state-file> <slot>` 检查。阶段边界优先使用批量命令：`state.mjs checkpoint <state-file> planning <target-stage> <path...>`、`checkpoint ... plan <target-stage> <plan-path>`、`checkpoint ... verification <target-stage> <path...>`，一次完成快照、校验和阶段转换；Mini 唯一任务使用 `checkpoint-task <state-file> <task-id>`。路径必须位于 `projectRoot` 下。文件删除记录为 `DELETED`；新增文件只有显式加入快照后才受保护，所以 Stage 5 必须先构造完整路径集合。

## 合法转换

```text
standard/fast: Stage 1 → 2 → 3 → 4 → 5 → 6 → archived → completed
mini:          Stage 1 → 2 ─────→ 4 → 5 → 6 → archived → completed
```

完整命令用法见 `node <skill-root>/scripts/state.mjs help`，各 Stage 文件包含具体调用。脚本禁止向前跨阶段；允许按证据回退，并自动清除目标阶段之后的快照、验证和归档字段。

## 状态更新时机

| 事件 | 操作 |
|------|------|
| Stage 1 准备 | 执行 `openspec new change`，读取 design instructions，`init --stage 1 --design <resolvedOutputPath>` |
| Stage 1 设计获批 | 保存 design-only `planning` 基线，`stage <state-file> 2` |
| Stage 2 完成 | 检查 design-only 基线，验证工件后用 `checkpoint planning` 扩展完整快照；Standard/Fast 转 3，Mini 转 4 |
| Stage 3 完成 | `checkpoint plan` 记录 `planPath`、保存快照并转 4 |
| Stage 4 执行中 | Standard/Fast 由 SDD ledger 记录 `Task N: complete`；Mini 使用 `task` 和 `checkpoint-task` |
| Stage 4 完成 | Standard/Fast 依据 ledger 检查完成；Mini 清空 `currentTask`，转 5 |
| Stage 5 通过 | `checkpoint verification` 保存快照、写入 verifiedAt 并转 6 |
| Stage 6 归档 | 调用 `archive <state> <archivePath> <archive-only|commit>` |
| 无需 commit | 调用 `complete <state>` |
| commit 成功 | 调用 `complete <state> <commitHash>` |

状态文件无法解析或 schema 不受支持时，脚本会拒绝写入。不要覆盖原文件；先报告错误，再按实际工件恢复，由用户决定是否重建控制记录。

## 恢复流程

### 1. 确定 change-name

1. 使用用户明确提供的 change-name。
2. 否则选择唯一一个 `active` 或 `archived` 状态文件。
3. 否则选择 `openspec/changes/` 下唯一活跃目录，排除 `archive`、隐藏目录和非目录项。
4. 多个候选时列出名称并询问用户，不按时间或排序猜测。

### 2. 有状态文件

先运行 `state.mjs show`，再按状态处理：

- `archived + pendingAction: commit`：不重新归档，只恢复 scoped commit。
- `completed`：验证归档路径存在且活跃 change 不存在，然后停止。
- `active`：检查前一阶段退出条件和适用快照。

Active 状态检查：

- Stage 1：scaffold 与状态文件存在；若 designPath 未生成或用户尚未批准，恢复 brainstorming/inline design。
- Stage 2：`designPath` 等于 status/instructions 返回的 canonical design 输出路径且存在；检查 design-only planning 基线。OpenSpec status 将 design 标为 `done`，propose 只补齐其他 `ready` artifacts；返回后再次检查基线，确认原件未被改写。
- Stage 3：OpenSpec 工件完整且 `planning` 当前；仅 Standard/Fast 使用。
- Stage 4：`planning` 当前；Standard/Fast 还要求 `planPath` 等于 `openspec/changes/<change-name>/implementation-plan.md`、文件有效且 `plan` 快照当前。SDD ledger 存在时，按其 plan 身份和 `Task N: complete` 从第一个未完成 Task 恢复；Mini 要求恰好一个 OpenSpec task。
- Stage 5：前置快照当前，且 Standard/Fast 的每个 Plan Task 都在 SDD ledger 完成；Mini 的 completedTasks 完成。
- Stage 6：`verifiedAt` 和当前 `verification` 快照存在。

出现漂移或退出条件不成立时，用 `state.mjs stage` 回退到最早未满足阶段，并说明证据。Stage 2 的 design-only 基线漂移回 Stage 1；Stage 2 完成并保存全量 planning 快照后，漂移回 Stage 2。

### 3. 无状态文件的兼容恢复

默认按 Standard 恢复，除非用户明确指定其他模式：

1. 归档目录存在且活跃 change 不存在 → 报告已完成，不补建状态文件。
2. 只有 OpenSpec scaffold/metadata 且没有 canonical design artifact → Stage 1。
3. OpenSpec canonical design 存在但其他工件不完整 → Stage 2。
4. OpenSpec 工件完整且 `openspec/changes/<name>/implementation-plan.md` 有效（仅 Standard/Fast）：
   - SDD ledger 缺失或任一 Plan Task 没有 `Task N: complete` → Stage 4，包括新 Plan 尚无 complete 记录的正常情况。
   - 所有 Plan Task 都有 complete 记录 → Stage 5。
5. OpenSpec 工件完整但不存在有效 `implementation-plan.md` → Stage 3（仅 Standard/Fast）；Mini 恢复到 Stage 4。
6. 均不存在 → Stage 1。

确定恢复点后使用 `init --stage <N> [--plan <path>]` 补建状态，再为已有工件生成对应快照。无法可靠确定 Git 基线时传入 `--base NULL --dirty-unknown true`，在状态中保存 `null`，并在 Stage 5/6 要求人工确认范围。
