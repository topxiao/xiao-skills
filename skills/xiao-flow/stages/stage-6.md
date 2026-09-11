# Stage 6: 归档

## 前置条件检查

1. 确认状态文件为 `status: active`、`nextStage: 6`，且 `verifiedAt` 和 verification 快照有值。
2. 重新读取 `tasks.md` 并运行 `openspec status --json`，确认没有未完成任务或工件。
3. 运行 `state.mjs check <state-file> verification`；任一漂移都运行 `state.mjs stage ... 5` 返回验证。
4. 对比 `baseCommit`、`initialDirtyPaths` 和当前 `git status --short`，列出当前 change 拥有的精确文件范围及既有用户修改。

不要求整个 working tree 干净；要求当前 change 的边界可识别且不会吞入无关修改。

## Step 1: 询问归档方式

```
Stage 5 验证通过。选择归档方式：
1. 归档 + commit — 先归档变更，再 git commit
2. 只归档 — 仅归档变更，不 commit
```

用户确认后按以下顺序执行。

## Step 2: 执行归档

调用 **`openspec-archive-change`** 归档变更：
- delta spec 同步时选择"立即同步"
- 记录工具实际生成的归档路径，通常为 `openspec/changes/archive/YYYY-MM-DD-<name>/`

**归档验证（不可跳过）：**

```bash
ls <archivePath>
ls openspec/changes/<change-name>/
```

若归档目录不存在或源目录未移除 → **归档未完成，不可继续 commit。** 排查原因后重试。

不要清理其他 worktree。若诊断发现本流程创建的残留 worktree，只列出精确路径和关联分支，另行取得用户确认后处理；它不是归档的默认前置动作。

归档验证通过后，运行：

```bash
node <skill-root>/scripts/state.mjs archive <state-file> <archivePath> <archive-only-or-commit>
```

- 选择只归档：随后运行 `state.mjs complete <state-file>`，状态进入 `completed`。
- 选择归档 + commit：状态保持 `archived` 且 `pendingAction: commit`，commit 成功前不得标记 completed。

## Step 2.5: 收纳中间产物

将中间文档移入归档目录，使每个 change 的全部记录集中在 `<archivePath>/`：

1. `designPath` 对应的文件存在 → 移动到 `<archivePath>/design-input.md`，删除原文件。
2. `planPath` 对应的文件存在（Standard/Fast）→ 移动到 `<archivePath>/plan.md`，删除原文件。
3. 移动后若原目录（如 `docs/superpowers/specs/`、`docs/superpowers/plans/`）变空，一并删除空目录。
4. `.superpowers/` 目录存在 → 整个删除。该目录是 SDD skill 的运行时工作区（brief、report、review diff、progress），不属于项目产物。

后续 commit 的精确路径应包含归档目录中的新文件和原路径的删除。

## Step 3: Commit（仅当用户选方案 1）

提交前：

1. 遵循项目提交规则，列出准备暂存的精确路径。
2. 默认排除 `initialDirtyPaths` 和状态 JSON；状态 JSON 是本地控制记录，在 commit 成功后还要写入最终结果。
3. 若当前 change 必须修改 initialDirtyPaths 中同一文件且无法安全拆分，停止并请用户决定如何处理。
4. 使用 `git add -- <精确路径...>`，不要使用 `git add .` 或等价的全量暂存。
5. 运行 `git diff --cached --check` 和 `git diff --cached --stat`，确认 staged diff 仅包含当前 change。
6. 按项目规则执行标准 `git commit`，不依赖额外的提交 Skill。

验证 commit：

```bash
git show --stat --oneline -1
git status -s
```

commit 失败时保留 `archived + pendingAction: commit`，只修复并重试 scoped commit，不重新归档。成功后取得实际 hash，运行 `state.mjs complete <state-file> <commitHash>`。

允许保留无关修改、启动前已有修改和本地状态 JSON；只要求没有遗漏当前 change 的产品文件。

## 完成输出

```
XIAOFlow 完成。
- Change: <change-name>
- 归档: <archivePath>
- Commit: <commit hash>（或：未 commit）
- 保留的既有修改: <initialDirtyPaths 或 none>
```
