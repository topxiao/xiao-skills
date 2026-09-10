# xiao-skills

XIAO 团队的 Claude Code Skills 合集。

## Skills

| Skill | 说明 |
|-------|------|
| [xiao-flow](skills/xiao-flow/) | 分阶段开发工作流，编排 OpenSpec + Superpowers，支持状态恢复、Mini 短路径、漂移检测和范围化提交。 |

## 安装

```bash
# 从 GitHub 安装到当前项目
npx skills add topxiao/xiao-skills

# 全局安装
npx skills add topxiao/xiao-skills --global

# 仅安装 xiao-flow
npx skills add topxiao/xiao-skills@xiao-flow
```

手动安装：

```bash
git clone https://github.com/topxiao/xiao-skills.git
cp -r xiao-skills/skills/xiao-flow ~/.claude/skills/
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

### 维护验证

```bash
node skills/xiao-flow/scripts/validate.mjs
```

## License

MIT
