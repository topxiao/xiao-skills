# TBCFlow 编排规则

> 始终生效，不可被任何 Skill 内部指令覆盖。冲突时以本规则为准。

## 覆盖规则

> 以下 "Step N" 均指**原始技能的内部步骤编号**，不是 tbcflow 的 Stage 编号。

### brainstorming  (原始技能内部 9 步)

- 完成后**进入 Stage 2 (openspec-propose)**，不进入 writing-plans
  > 覆盖原 Step 9 "Transition to implementation → 调用 writing-plans" 的出口重定向
- Step 6 的 **commit 被覆盖**，仅保存文件
  > 覆盖原 Step 6 "Write design doc → commit"，将 commit 统一到 Stage 6

### opsx:propose  (openspec-propose 技能)

- 接收 Stage 1 设计文档作为输入，**不主动询问开放式问题**
- **允许在关键信息缺失时澄清具体细节**（如技术选型、接口约定、数据结构）
- 完成后**不要建议运行 /opsx:apply**，下一步是 writing-plans
  > 覆盖原出口 "Run /opsx:apply to start working on the tasks"

### writing-plans  (原始技能内部 5 步)

- 输入来源是 **OpenSpec 的 design.md + specs/**，不读取 brainstorming 设计文档
  > 覆盖原输入源，改为读取 Stage 2 产出的 OpenSpec 工件
- **不反向更新 tasks.md**
- **Execution Handoff 被覆盖**，不提供选择，直接进入 Stage 4
  > 覆盖原 Step 5 "提供 subagent-driven / inline 两选项"

### subagent-driven  (原始技能内部 12 步)

- 进度追踪只更新 **Plan 文件** Task checkbox，**不更新 tasks.md**
- **绝对禁止 commit**——包括 implementer 子代理
  > 覆盖原 implementer-prompt 中 "Commit your work"，将 commit 统一到 Stage 6
- Step 12 "finishing-a-development-branch" **被覆盖**，Stage 4 后进入 Stage 5
  > 覆盖原 Step 12 的出口，改为进入验证阶段

## 禁止事项

- 不要跳过任何 Stage
- 不要替 Skill 做它的工作
- 不要在验证通过前 commit 任何文件
- 不要并行分派实现 SubAgent，dispatching-parallel-agents 仅用于调试场景
