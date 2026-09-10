---
name: xiao-flow
description: "分阶段开发工作流编排器，协调 OpenSpec 与 Superpowers 完成需求到归档的全流程。用户显式调用 /xiao-flow 或要求按 XIAO 流程开发时激活。"
license: MIT
compatibility: Requires Node.js, Git, OpenSpec CLI, and the mode-specific OpenSpec/Superpowers skills listed below
metadata:
  author: "XIAO"
  version: "3.2"
  generatedBy: "xiao-flow"
---

**XIAOFlow** 是 OpenSpec + Superpowers 的阶段编排器。它负责阶段边界、恢复、漂移检测和安全约束，不重新实现被调用 Skill 的专业逻辑。

> 激活后立即完整读取 `references/orchestration-rules.md`。首次执行或恢复任务时，再读取 `references/state-and-recovery.md`。两者的编排约束优先于被调用 Skill 的默认阶段跳转。

## 全局原则

- 先读取当前目录及目标文件作用域内的 `CLAUDE.md`、`AGENTS.md` 和项目规则，再进行任何写操作。
- 状态文件只是恢复线索；通过 `scripts/state.mjs` 原子更新，并用实际文件、OpenSpec 状态和 Git 状态验证。
- Stage 6 之前不 commit。不要自动 stash、reset、删除 worktree，或覆盖用户修改过的计划。
- 只处理当前 change 的文件。启动前已存在的未提交修改属于用户，默认不纳入提交。
- 每个 Stage 达成退出条件后才更新状态，再按当前模式决定是否等待用户确认。

## 前置检查

按顺序执行，任一依赖缺失都在写文件前停止并报告：

1. 确定 Git 仓库根目录，读取项目规则。
2. 检查 `node`、`git`、`openspec` CLI。
3. 根据用户请求和风险边界确定 `standard`、`fast` 或 `mini`；默认 `standard`。模式定义和升级规则见 `references/guide.md`。
4. 按模式检查 Skill：
   - 所有模式：
     - `openspec-propose`（命令别名可能显示为 `/opsx:propose`）
     - `superpowers:verification-before-completion`
     - `openspec-archive-change`
   - `standard` / `fast` 额外需要：
     - `superpowers:brainstorming`
     - `superpowers:writing-plans`
     - `superpowers:subagent-driven-development`
   `superpowers:systematic-debugging` 是可选的调试增强；缺失不阻塞正常流程，真正需要调试时改用当前环境可用的系统化诊断方式。
5. 记录启动时的 `baseCommit`（无初始提交时为 `UNBORN`）和 `initialDirtyPaths`；不得改动或擅自暂存这些既有修改。
6. 检查 `openspec/`。未初始化时，先查看当前 CLI 的 `openspec init --help`，再询问用户是否按检测到的工具参数初始化；未经确认不执行初始化。

## 状态与恢复

用户确认 change-name 后，通过 `node <skill-root>/scripts/state.mjs init ...` 在 `.xiao-flow/<change-name>.json` 创建状态文件。目录只保存每个 change 的本地编排状态，文件名必须与 change-name 完全一致；init 时自动追加 `.gitignore`，不保存密钥、文件内容或完整日志。

使用 `/xiao-flow 继续 <change-name>` 恢复。优先读取状态文件并验证对应 Stage 的退出条件；状态缺失、过期或冲突时，按 `references/state-and-recovery.md` 的文件证据恢复到最早未完成阶段。不要仅凭 Plan 中是否存在 `[x]` 决定重写计划。

## 阶段路由

每次只读取当前 Stage 文件；切换后再读取下一 Stage：

| 阶段 | 文件 | Standard / Fast | Mini | 核心退出条件 |
|------|------|-----------------|------|-------------|
| Stage 1 | `stages/stage-1.md` | `superpowers:brainstorming` | 内联边界调查 | 设计输入和 change-name 已确认 |
| Stage 2 | `stages/stage-2.md` | `openspec-propose` | `openspec-propose` | OpenSpec 工件完整且通过粒度审查 |
| Stage 3 | `stages/stage-3.md` | `superpowers:writing-plans` | 跳过 | OpenSpec task 均映射到有效 Plan |
| Stage 4 | `stages/stage-4.md` | `superpowers:subagent-driven-development` | 单任务 inline TDD | 实现任务全部通过测试和审查 |
| Stage 5 | `stages/stage-5.md` | `superpowers:verification-before-completion` | 同左 | 规范、测试、静态检查和 Git 边界均有新鲜证据 |
| Stage 6 | `stages/stage-6.md` | `openspec-archive-change` | 同左 | change 已归档，按用户选择决定是否 commit |

## 参考

- 状态字段和恢复优先级：`references/state-and-recovery.md`
- 模式、异常处理和示例：`references/guide.md`
- 状态命令：`node <skill-root>/scripts/state.mjs help`
- 维护验证：`node scripts/validate.mjs` 和 `node --test scripts/state.test.mjs`
