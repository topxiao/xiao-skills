---
name: xiao-flow
description: "XIAO 开发工作流。一条命令从需求到交付：需求探索 → 规范生成 → 计划拆分 → TDD执行 → 验证 → 归档。编排 OpenSpec 和 Superpowers 两个框架，不重新实现任何逻辑。"
license: MIT
compatibility: Requires openspec CLI + Superpowers skills (pre-installed)
metadata:
  author: "XIAO"
  version: "3.0"
  generatedBy: "xiao-flow"
---

**XIAOFlow** — 开发工作流。编排 OpenSpec + Superpowers，需求到交付一条命令搞定。

> **编排规则**：激活此 skill 后，立即读取 `references/orchestration-rules.md`，其中的覆盖规则始终生效，不可被其他 Skill 内部指令覆盖。

---

## 阶段切换

每个阶段完成后，恢复判定会自动检测文件状态，从正确阶段继续。使用 `/xiao-flow 继续 <change-name>` 即可。

---

## 前置条件检查

触发后**第一件事**检查项目初始化状态：

```bash
ls openspec/          # 检查项目初始化
```

**项目未初始化**时，询问用户：

```
当前项目未初始化 OpenSpec。
是否自动执行 openspec init --tools claude 初始化？(是/手动)
```

用户选"是" → 执行 `openspec init --tools claude && openspec update`，成功后进入 Stage 1。

---

## 恢复判定

中断后按优先级判断恢复点，然后读取对应 Stage 文件执行：

0. **发现变更名**：`ls openspec/changes/` — 扫描活跃变更目录。若用户未提供 `<name>`，据此确定当前变更名。多个活跃变更时询问用户选择。

1. Plan 文件所有 Task 已标记 `[x]` 且无归档 → Stage 5
2. Plan 文件有部分 Task 已标记 `[x]` → Stage 4（从中断处继续，异常处理见 references/guide.md）
3. `docs/superpowers/plans/` 有计划文件但无 Task 标记 `[x]` → Stage 3，重新生成计划（覆盖）
4. `openspec/changes/<name>/` 有工件但无计划 → Stage 3
5. `openspec/changes/<name>/` 有部分工件（`openspec status --json` 检查）
   - 用户有补充信息 → 编辑已有工件后重新执行 Stage 2
   - 无新信息 → 重新执行 Stage 2，openspec 从 CLI 状态续接
6. `docs/superpowers/specs/` 有设计文档但无 OpenSpec 工件 → Stage 2
7. 以上都没有 → Stage 1

---

## 阶段路由

根据恢复判定或当前进度，**仅读取对应 Stage 文件**：

| 阶段 | 文件 | 调用技能 | xiaockg 工具 |
|------|------|---------|------------|
| Stage 1 | `stages/stage-1.md` | `superpowers:brainstorming` | — |
| Stage 2 | `stages/stage-2.md` | `openspec-propose` | — |
| Stage 3 | `stages/stage-3.md` | `superpowers:writing-plans` | `impact`, `locate` |
| Stage 4 | `stages/stage-4.md` | `superpowers:subagent-driven-development` | 按需 `locate`/`search` |
| Stage 5 | `stages/stage-5.md` | `superpowers:verification-before-completion` | `detect_changes` |
| Stage 6 | `stages/stage-6.md` | `openspec-archive-change` | — |

所有 Stage 文件位于 `stages/` 下。**每次只读取当前执行的 Stage 文件**。xiaockg 仅在 Stage 3（影响评估）和 Stage 5（变更验证）强制接入，Stage 4 按需调用，新项目时跳过。

---

## 参考

快速/迷你模式、异常处理、使用示例见 `references/guide.md`。按需读取，不预加载。
