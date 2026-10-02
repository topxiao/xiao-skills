---
name: xiao-flow
description: "分阶段开发工作流编排器，协调 OpenSpec 与 Superpowers 完成需求到归档的全流程。用户显式调用 /xiao-flow 或要求按 XIAO 流程开发时激活。"
license: MIT
compatibility: Requires Node.js, Git, OpenSpec CLI, and the mode-specific OpenSpec/Superpowers skills listed below
metadata:
  author: "XIAO"
  version: "3.4.1"
  generatedBy: "xiao-flow"
---

**XIAOFlow** 是 OpenSpec + Superpowers 的阶段编排器。它负责阶段边界、恢复、漂移检测和安全约束，不重新实现被调用 Skill 的专业逻辑。

> 全局原则中的编排约束优先于被调用 Skill 的默认阶段跳转。仅在恢复、状态冲突或漂移时读取 `references/state-and-recovery.md`；正常新 change 按当前 Stage 文件执行。

## 全局原则

- 先读取当前目录及目标文件作用域内的 `CLAUDE.md`、`AGENTS.md` 和项目规则，再进行任何写操作。
- 状态文件只是恢复线索；通过 `scripts/state.mjs` 原子更新，并用实际文件、OpenSpec 状态和 Git 状态验证。不要手工改写 JSON 绕过合法转换。
- Stage 6 之前不 commit，包括实现子代理。不要自动 stash、reset、删除 worktree，或覆盖用户修改过的计划。
- 只处理当前 change 的文件。启动前已存在的未提交修改属于用户，默认不纳入提交。
- 每个 Stage 达成退出条件后才更新状态，再按当前模式决定是否等待用户确认。
- 被调用 Skill 完成后必须返回 XIAOFlow，不得自行跳转到下一阶段或触发 commit。XIAOFlow 负责提供完整输入、检查退出条件并决定下一阶段。
- 不并行分派实现任务；并行只允许用于互不修改文件的只读调查或调试取证。
- `superpowers:subagent-driven-development` 的 Standard/Fast 进度只记录在 plan 专属 SDD ledger，不修改 Plan Task、Plan 步骤或 `currentTask`；Mini 才使用 `currentTask`。Stage 5 依据 ledger 将完成状态单向投影到 `tasks.md`。
- `superpowers:verification-before-completion` 只接受本次运行的新鲜命令输出，不用推断或历史结果代替。

## 前置检查

按顺序执行，任一依赖缺失都在写文件前停止并报告：

1. 确定 Git 仓库根目录，读取项目规则。
2. 检查 `node`、`git`、`openspec` CLI。
3. 初选模式：明确是单个低风险任务时选 `mini`；预计为 2–3 个同模块低风险任务时选 `fast`；其余或风险不明时选 `standard`。Stage 2 按实际 task 数和风险复核；边界模糊或需要升级时再读 `references/guide.md`。
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

用户确认 change-name 后，Stage 1 先创建 OpenSpec scaffold，再通过 `node <skill-root>/scripts/state.mjs init ... --stage 1 --design <resolvedOutputPath>` 在 `.xiao-flow/<change-name>.json` 创建状态文件。目录只保存每个 change 的本地编排状态，文件名必须与 change-name 完全一致；init 时自动追加 `.gitignore`（覆盖 `.xiao-flow/` 和 `.superpowers/`），不保存密钥、文件内容或完整日志。

`superpowers:subagent-driven-development` 在 Stage 4 执行期间会在 `.superpowers/sdd/` 下生成 brief、report、review diff 和 progress 等工作文件。该目录是运行时临时产物，不应纳入版本控制；Stage 6 归档完成后应清理。

使用 `/xiao-flow 继续 <change-name>` 恢复。优先读取状态文件并验证对应 Stage 的退出条件；状态缺失、过期或冲突时，按 `references/state-and-recovery.md` 的文件证据恢复到最早未完成阶段。不要仅凭 Plan 中是否存在 `[x]` 决定重写计划。

## 阶段路由

每次只读取当前 Stage 文件；切换后再读取下一 Stage：

| 阶段 | 按需读取 | 阶段职责 |
|------|----------|----------|
| 1 | `stages/stage-1.md` | 需求与 canonical design |
| 2 | `stages/stage-2.md` | OpenSpec 工件 |
| 3 | `stages/stage-3.md` | Standard/Fast 计划；Mini 跳过 |
| 4 | `stages/stage-4.md` | TDD 实现 |
| 5 | `stages/stage-5.md` | 验证 |
| 6 | `stages/stage-6.md` | 归档与可选 commit |

## 参考

- 恢复、状态冲突或漂移：`references/state-and-recovery.md`
- 模式边界不明、升级或跨阶段异常：`references/guide.md`
- 状态命令：`node <skill-root>/scripts/state.mjs help`；阶段边界优先使用 `checkpoint` 批量命令
- 维护验证：`node scripts/validate.mjs` 和 `node --test scripts/state.test.mjs`
- `scripts/` 下的文件是 CLI 工具，通过 `node` 命令执行，不要读取源码来理解其行为。
