# xiao-skills

XIAO 团队的 Claude Code Skills 合集。

## Skills

| Skill | 说明 |
|-------|------|
| [xiao-flow](skills/xiao-flow/) | 开发工作流，一条命令从需求到交付。编排 OpenSpec + Superpowers。 |

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

- [OpenSpec CLI](https://github.com/openspec-dev/openspec)
- [Superpowers skills](https://github.com/anthropics/skills)

### 使用

```
/xiao-flow <需求描述>
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

- **快速模式**（2-3 个任务）：精简 brainstorming，其余阶段正常
- **迷你模式**（1 个任务）：合并 Stage 1+2+3，直接执行

## License

MIT
