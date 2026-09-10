# Stage 3: 计划拆分 → `superpowers:writing-plans`

仅 `standard` / `fast` 使用本阶段。Mini 从 Stage 2 直接进入 Stage 4。

## 输入准备

先运行 `state.mjs check <state-file> planning`；发现漂移时回 Stage 2 复核。通过后完整读取：

- `openspec/changes/<change-name>/proposal.md`
- `openspec/changes/<change-name>/design.md`
- `openspec/changes/<change-name>/tasks.md`
- `openspec/changes/<change-name>/specs/` 下的 capability 列表

随后逐 capability 读取对应 spec，并使用 `rg` 或等价代码搜索定位相关源码、测试、配置和调用方。没有读取现有实现前，不声明精确路径或核心代码。

## 调用上下文

```
使用 superpowers:writing-plans 创建实施计划。

工件位置: openspec/changes/<change-name>/

计划输入：proposal.md、design.md、specs/、tasks.md，以及现有代码和测试调查结果。

逐 capability 生成 Task：
1. 每个 Plan Task 只映射一个 OpenSpec task ID；一个 OpenSpec task 可以拆成多个 Plan Task，但必须至少出现一次。
2. 给出经过代码调查确认的 Create/Modify/Test 文件路径。
3. 按 TDD 排列步骤：先写失败测试，再实现，再运行针对性验证。
4. 写明依赖、验证命令和预期结果；仅在接口或关键逻辑不明显时放核心代码片段。
5. 全部完成后检查范围、顺序和映射一致性。

保存到: docs/superpowers/plans/YYYY-MM-DD-<change-name>.md
将实际路径保存到状态文件的 planPath，后续恢复始终复用该路径。

约束：
- 不允许 TODO/TBD/占位符或未经调查的路径
- Plan 覆盖 specs/ 下所有 capability 的需求，不自创或遗漏
- 已存在 Plan 时先判断完整度并从缺失 capability 继续；未经用户确认不得覆盖完整 Plan 或用户编辑内容
- 完成后返回 XIAOFlow，不直接开始实现，不 commit
```

## Plan 格式要求

每个 Task 标题使用固定格式，用于进度追踪：

```markdown
### Task N: <title>

**Capability**: <对应的 capability 名>
**OpenSpec Task**: `<task-id>`
**Depends On**: <Task N / none>

**Files**:
- Create: `<path>`
- Modify: `<path>`
- Test: `<path>`
```

## 产出

- 实施计划：`docs/superpowers/plans/YYYY-MM-DD-<change-name>.md`

## 完成

验证以下退出条件：

- 每个 Plan Task 恰好映射一个已知 OpenSpec task ID
- 所有 OpenSpec task ID 至少映射一次
- 所有 capability 和验收场景均被覆盖
- 没有 TODO/TBD、重复 Task 或未经调查的文件路径
- 测试、实现和验证步骤可执行

通过后运行 `state.mjs plan` 写入 `planPath`，再为 Plan 生成 `plan` 快照；脚本会忽略后续正常的 `[x]` 进度标记，但会检测步骤、路径和映射变化。最后运行 `state.mjs stage ... 4`。

汇报计划路径、Plan Task 数和 OpenSpec task 覆盖数；用户确认后进入 Stage 4。Fast 的这次确认同时授权连续执行 Stage 4–5。
