# XIAOFlow 状态与恢复

## 存储与运行时

状态文件固定为：

```text
docs/superpowers/xiao-flow/<change-name>.json
```

- Stage 1 结束并确认 change-name 后创建；一个 change 对应一个同名 JSON。
- 状态文件是本地控制记录，默认不纳入产品 commit；项目规则要求版本化时另行处理。
- 完成后保留，不自动删除或改名。
- 只记录状态、时间、路径、简短标识和 hash；不要写入密钥、文件内容、完整日志或客户数据。
- 使用 `node <skill-root>/scripts/state.mjs ...` 读写。脚本在同目录写临时文件并原子替换，禁止直接编辑 JSON 绕过校验。

## Schema v2

```json
{
  "schemaVersion": 2,
  "changeName": "user-auth",
  "mode": "standard",
  "status": "active",
  "nextStage": 2,
  "projectRoot": "<absolute-project-root>",
  "baseCommit": "<git-hash-or-UNBORN>",
  "initialDirtyPaths": [],
  "initialDirtySnapshot": null,
  "designPath": "docs/superpowers/specs/2026-09-10-user-auth-design.md",
  "planPath": null,
  "currentTask": null,
  "completedTasks": [],
  "verifiedAt": null,
  "snapshots": {
    "planning": null,
    "plan": null,
    "verification": null
  },
  "archivePath": null,
  "archiveMode": null,
  "pendingAction": null,
  "commitHash": null,
  "archivedAt": null,
  "completedAt": null
}
```

字段规则：

- `mode`：`standard`、`fast` 或 `mini`；只能按 `mini → fast → standard` 升级。
- `status`：`active`、`archived` 或 `completed`。归档成功但可选 commit 尚未成功时必须保持 `archived`。
- `nextStage`：`active` 时是模式允许的下一阶段；其他状态必须为 `null`。
- `initialDirtySnapshot` 保存启动前脏文件的 hash，帮助识别同路径后续变化；它不能自动拆分同一文件中的不同所有者修改。
- `designPath` 和 `planPath` 一经确定便跨日期复用。Mini 的 `planPath` 为 `null`。
- `completedTasks` 主要供 Mini 记录唯一 OpenSpec task；Standard/Fast 仍以 Plan checkbox 为执行进度。
- 状态文件本身不进入任何 snapshot，避免自引用 hash。

## 快照和漂移

| 快照 | 生成时机 | 文件范围 | 漂移路由 |
|------|----------|----------|----------|
| `planning` | Stage 2 完成 | proposal、design、specs、tasks | 回 Stage 2 复核；Standard/Fast 随后重做 Stage 3 |
| `plan` | Stage 3 完成 | `planPath` | 回 Stage 3 |
| `verification` | Stage 5 通过 | 当前 change 的代码、测试、配置、OpenSpec 工件和 Plan | 回 Stage 5 |

`planning` 对 OpenSpec `tasks.md` 的 checkbox、`plan` 对 `### [x] Task` 进度标记做归一化，因此正常勾选不会被误判为范围漂移；文本、路径、步骤和需求变化仍会触发漂移。

生成和检查示例：

```bash
node <skill-root>/scripts/state.mjs snapshot <state-file> planning <proposal> <design> <tasks> <spec...>
node <skill-root>/scripts/state.mjs snapshot <state-file> plan <planPath>
node <skill-root>/scripts/state.mjs snapshot <state-file> verification <change-owned-path...>
node <skill-root>/scripts/state.mjs check <state-file> planning
node <skill-root>/scripts/state.mjs check <state-file> plan
node <skill-root>/scripts/state.mjs check <state-file> verification
```

快照路径必须位于 `projectRoot` 下。文件删除记录为 `DELETED`；新增文件只有显式加入快照后才受保护，所以 Stage 5 必须先根据 scoped diff、Plan 文件清单和 OpenSpec 工件构造完整路径集合。

## 合法转换

```text
standard/fast: Stage 2 → 3 → 4 → 5 → 6 → archived → completed
mini:          Stage 2 ─────→ 4 → 5 → 6 → archived → completed
```

常用命令：

```bash
node <skill-root>/scripts/state.mjs init <state-file> --change <name> --mode <mode> --base <sha-or-UNBORN> --root <repo-root> --design <path-or-NONE> [--dirty <path>]...
node <skill-root>/scripts/state.mjs stage <state-file> <stage-number>
node <skill-root>/scripts/state.mjs plan <state-file> <planPath>
node <skill-root>/scripts/state.mjs task <state-file> <task-id-or-NONE>
node <skill-root>/scripts/state.mjs complete-task <state-file> <task-id>
node <skill-root>/scripts/state.mjs verified <state-file>
node <skill-root>/scripts/state.mjs mode <state-file> <fast-or-standard>
```

脚本禁止向前跨阶段；允许按证据回退，并自动清除目标阶段之后的快照、验证和归档字段。回退后仍需按 Stage 文件修正实际工件，脚本不会覆盖 Plan 或源码。

## 状态更新时机

| 事件 | 操作 |
|------|------|
| Stage 1 确认 | `init`，默认 `nextStage: 2` |
| Stage 2 完成 | 保存 `planning`；Standard/Fast 转 3，Mini 转 4 |
| Stage 3 完成 | 记录 `planPath`、保存 `plan`、转 4 |
| Stage 4 执行中 | `task`；Mini 完成时调用 `complete-task` |
| Stage 4 完成 | 清空 `currentTask`，转 5 |
| Stage 5 通过 | 保存 `verification`、调用 `verified`、转 6 |
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

- Stage 2：`designPath` 存在；Mini 允许精简设计输入。
- Stage 3：OpenSpec 工件完整且 `planning` 当前；仅 Standard/Fast 使用。
- Stage 4：`planning` 当前；Standard/Fast 还要求有效 `planPath` 和当前 `plan` 快照，Mini 要求恰好一个 OpenSpec task。
- Stage 5：前置快照当前，且执行任务全部完成。
- Stage 6：`verifiedAt` 和当前 `verification` 快照存在。

出现漂移或退出条件不成立时，用 `state.mjs stage` 回退到最早未满足阶段，并说明证据。

### 3. 无状态文件的兼容恢复

默认按 Standard 恢复，除非用户明确指定其他模式：

1. 归档目录存在且活跃 change 不存在 → 报告已完成，不补建状态文件。
2. OpenSpec change 存在但工件不完整 → Stage 2。
3. OpenSpec 工件完整且存在有效 Plan：
   - 存在任一未完成 Task → Stage 4，包括零个 Task 被勾选的正常新 Plan。
   - 所有 Task 已完成 → Stage 5。
4. OpenSpec 工件完整但不存在有效 Plan → Stage 3。
5. 只有 Stage 1 设计文档 → Stage 2。
6. 均不存在 → Stage 1。

确定恢复点后使用 `init --stage <N> [--plan <path>]` 补建状态，再为已有工件生成对应快照。无法可靠确定 Git 基线时传入 `--base NULL --dirty-unknown true`，在状态中保存 `null`，并在 Stage 5/6 要求人工确认范围。
