# Stage 5: 验证 → `superpowers:verification-before-completion`

## OpenSpec task 同步

Standard/Fast 的 Plan 和 Mini 的 `completedTasks` 是执行进度，OpenSpec `tasks.md` 是规范任务源。同步时保留 OpenSpec 原文、顺序和层级：

```
1. 先检查 planning 快照；Standard/Fast 还要检查 plan 快照。漂移时先回退，不同步 checkbox。
2. Standard/Fast 读取 planPath，按每个 Plan Task 的 **OpenSpec Task** 字段建立映射。
3. 一个 OpenSpec task 可关联多个 Plan Task；只有关联 Plan Task 全部为 [x] 时，才把原 checkbox 改为 [x]。
4. Mini 只把 completedTasks 中已完成的唯一 task ID 对应 checkbox 改为 [x]。
5. 不新增、删除、改写或重排 OpenSpec task 文本。
```

Standard/Fast 存在零映射、Plan Task 缺少映射或未知 task ID 时停止同步并回 Stage 3。存在未完成实现任务时报告具体项并回 Stage 4。

## 验证

```
使用 superpowers:verification-before-completion 验证以下声明：

验证项：
1. 执行进度与 tasks.md 完成 — Standard/Fast 的 Plan Task、Mini 的 completedTasks 与 OpenSpec checkbox 一致。
2. specs 场景满足 — 逐 capability 对每个验收场景给出实现或测试证据。
3. proposal/design 一致 — 实现没有遗漏目标、违反设计决策或扩大范围。
4. 自动化验证通过 — 运行项目规则、Plan 和仓库配置要求的测试、lint、typecheck、build；不存在的检查说明原因。
5. 变更质量通过 — 检查 scoped diff、未跟踪文件、调试残留、密钥风险和 `git diff --check`。
6. Git 边界清楚：
   - baseCommit 是有效 commit hash 时运行 `git log --oneline <baseCommit>..HEAD`。
   - baseCommit 为 UNBORN 时确认流程期间没有生成首个 commit；为 null 时报告基线未知并要求人工确认范围。
   - 有输出表示 Stage 6 前出现 commit，报告精确 commit 范围，不推断数量、不自动 reset。
   - initialDirtyPaths 为非空数组时运行 `state.mjs check-initial` 辅助识别变化；为空数组表示启动时无脏文件；为 null 时报告快照未知并要求人工确认范围。

规范位置: openspec/changes/<change-name>/
```

只接受本轮命令产生的新鲜证据。汇报时列出每条验证命令、结果和覆盖的 capability；不要用“应该通过”代替执行结果。

## 路由

- 规范工件错误或范围变化 → Stage 2；Standard/Fast 随后进入 Stage 3，Mini 重新判断短路径资格。
- Plan 映射不完整 → Stage 3；Mini 不满足单 task 边界时升级模式。
- 实现或测试失败 → Stage 4。
- 全部通过 → 从 scoped diff、实现文件清单和 OpenSpec 工件构造当前 change 的精确路径集合。排除状态 JSON，包含代码、测试、配置、OpenSpec 工件以及 Standard/Fast 的 Plan；使用 `state.mjs snapshot ... verification` 保存快照，再调用 `state.mjs verified` 和 `state.mjs stage ... 6`。

验证通过后任一 verification 路径再次变化时，`state.mjs check` 会失败；使用 `state.mjs stage ... 5` 自动失效验证证据并重新执行 Stage 5。
