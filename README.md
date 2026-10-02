# xiao-skills

XIAO 团队的 Claude Code Skills 合集。

## Skills

| Skill | 说明 |
|-------|------|
| [xiao-flow](skills/xiao-flow/) | 分阶段开发工作流，编排 OpenSpec + Superpowers，支持状态恢复、Mini 短路径、漂移检测和范围化提交。 |
| [xiao-spec](skills/xiao-spec/) | 4.x 纯提示词规格驱动开发工作流，不要求 OpenSpec、Superpowers、Node.js 或自带脚本。 |

## 安装

```bash
# 从 GitHub 安装到当前项目
npx skills add topxiao/xiao-skills

# 全局安装
npx skills add topxiao/xiao-skills --global

# 仅安装 xiao-flow
npx skills add topxiao/xiao-skills@xiao-flow

# 仅安装 xiao-spec 4.x
npx skills add topxiao/xiao-skills@xiao-spec
```

手动安装：

```bash
git clone https://github.com/topxiao/xiao-skills.git
cp -r xiao-skills/skills/xiao-flow ~/.claude/skills/
# 安装纯提示词版 xiao-spec 4.x
cp -r xiao-skills/skills/xiao-spec ~/.claude/skills/
```

## xiao-flow 工作流

### 前置依赖

- Node.js
- [OpenSpec CLI](https://github.com/openspec-dev/openspec)
- [Superpowers skills](https://github.com/anthropics/skills)

### 使用

```
/xiao-flow <需求描述>
/xiao-flow 继续 <change-name>
```

### 6 个阶段

```
Stage 1: 需求探索 (brainstorming)
Stage 2: 规范生成 (openspec-propose)
Stage 3: 计划拆分 (writing-plans)
Stage 4: TDD 执行 (subagent-driven-development)
Stage 5: 验证 (verification-before-completion)
Stage 6: 归档 (openspec-archive-change)
```

### 快速模式

- **Fast**（2–3 个低风险 OpenSpec task）：保留完整 Plan 和 SDD，连续执行相邻阶段以减少确认轮次
- **Mini**（1 个独立低风险 task）：使用 `1 → 2 → 4 → 5 → 6` 短路径，跳过独立 Plan 和实现子代理

状态由 `scripts/state.mjs` 原子更新；planning、plan、verification 三类快照会在恢复和阶段切换时检测工件漂移。

每个 change 的过程与规范文件统一放在 `openspec/changes/<change-name>/`：

```text
design.md                 # brainstorming 书面设计与 OpenSpec canonical 设计（同一份文件）
proposal.md               # OpenSpec 规范源
specs/                    # OpenSpec 规范源
tasks.md                  # OpenSpec 规范任务源
implementation-plan.md    # Standard/Fast 执行计划；Mini 不生成
```

Stage 1 先 scaffold change 并按 OpenSpec design instructions 写入 `design.md`；Stage 2 保留该已批准工件并补齐 proposal、specs、tasks。Stage 2 后以 OpenSpec 标准工件为需求和验收依据，执行计划负责文件级步骤与 TDD 进度。

### 维护验证

```bash
node skills/xiao-flow/scripts/validate.mjs
```

## xiao-spec 4.x

xiao-spec 是独立的纯提示词规格驱动开发工作流，不要求 OpenSpec、Superpowers、Node.js、Git、子代理或自带脚本。

```text
/xiao-spec <需求描述>
/xiao-spec 继续 <change-name>
```

阶段路径：

```text
Standard/Fast：设计 → 计划 → 实现 → 验证 → 归档 → 完成
Mini：         设计 → 实现 → 验证 → 归档 → 完成
```

每个 change 默认使用两份文档：

```text
docs/changes/<change-name>/
  change.md                 # 需求、设计、范围、验收和阶段状态
  implementation-plan.md    # 唯一任务定义与完成状态
```

Git 可用时用于提供更强的范围证据；不可用时仍可执行，但必须说明可信度限制。xiao-spec 不内置评估数据或可执行状态脚本。

## License

MIT
