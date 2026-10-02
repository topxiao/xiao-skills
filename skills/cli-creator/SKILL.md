---
name: cli-creator
description: 快速创建 CLI 项目脚手架。当用户要求创建命令行工具、CLI 应用、xxx-cli 时触发。支持 Python (Click) 和 Node (Commander) 两种技术栈。可新建项目或在已有 CLI 项目中追加子命令。自动生成项目结构、核心代码（AI 根据描述生成实现）、安装脚本和测试。
license: MIT
compatibility: Skill 本身只需宿主能读 Markdown；生成的 CLI 要求 Python >=3.9 或 Node >=18，测试依赖 pytest / node:test
metadata:
  author: "Xiao"
  version: "1.0.0"
  generatedBy: "cli-creator"
---

# cli-creator

快速创建 CLI 项目脚手架。支持 Python (Click) 和 Node (Commander)，可新建项目或追加子命令。

## 触发场景

- 用户要求"创建 xxx-cli"、"写一个 CLI 工具"、"新建命令行项目"、"scaffold a cli" → 新建模式
- 用户要求"给 xxx-cli 加一个 xxx 命令"且当前目录已有 CLI 项目 → 追加模式

## 流程

### Step 1: 模式检测

检查当前工作目录：
- 存在 `pyproject.toml` 或 `package.json` 且包含 CLI 入口配置（`[project.scripts]` 或 `bin` 字段）→ **追加模式**，跳到 Step 4
- 否则 → **新建模式**，继续 Step 2

### Step 2: 需求整理（新建模式）

**先推导，后补问**：从用户描述直接推导出完整方案，一次性展示让用户确认或修正，不逐项盘问。

方案需覆盖：

1. **CLI 名称** — 小写+连字符（如 `my-tool`）
2. **语言** — Python / Node，从上下文推断；推断不出时和用户确认
3. **版本号** — 默认 `1.0.0`
4. **输出目录** — 默认 `./{cli-name}`
5. **子命令清单** — 对每个子命令列出：
   - 命令名、位置参数（名称+说明）、选项（`--flag` + 默认值 + 帮助文本）
   - **业务逻辑描述**：用自然语言写清这个命令做什么（这是生成实现代码的唯一依据）

用户描述里推不出来的关键信息（通常是业务逻辑细节）才向用户提问，其余项给默认值让用户批量修正。

### Step 3: 生成项目结构（新建模式）

根据语言选择，读取对应模板：
- Python → `references/project-structure-python.md`
- Node → `references/project-structure-node.md`

按模板创建目录结构和所有文件（含 install.sh / uninstall.sh，模板见 `references/install-scripts.md`）。

### Step 4: 生成代码

对每个子命令：

1. **生成命令文件** — 根据 Step 2 收集的参数、选项生成命令注册代码
2. **生成核心逻辑** — AI 根据业务逻辑描述直接生成完整实现代码
3. **生成测试** — 根据命令行为生成测试用例（正常路径 + 参数校验 + 错误路径）

追加模式时：
1. 分析现有入口文件，了解命令注册方式
2. 生成新的 command 文件和 core 文件
3. 修改入口文件注册新命令
4. 生成测试文件

### Step 5: 用户确认

**必须用户确认后才写入文件。**

1. 展示完整方案：项目结构树 + 每个生成文件的关键代码
2. 用户确认 → 全部写入；用户指出修改点 → 调整后重新确认
3. 用户可要求跳过某个文件，跳过的不生成

一次确认覆盖全部文件，不逐文件询问。

### Step 6: 验证与交付

**写入后必须实际运行测试，不许只生成不验证。**

1. 安装并运行测试，失败则修复后重跑，直到全绿：
   - Python：`python3 -m pip install -e ".[dev]"` + `python3 -m pytest`（`.[dev]` 才包含 pytest；Windows 无 `python3` 时用 `python`）
   - Node：`npm install` + `npm test`
2. 冒烟检查入口：`{cli_name_dash} --help` 能列出所有子命令
3. 交付时附上**真实的测试运行输出**，并给出：
   - 安装命令（`bash install.sh`；Windows 手动：`python3 -m pip install -e .` 或 `npm install && npm link`）
   - 运行示例
   - 下一步建议

## 代码生成规则

### Python (Click)

- 入口文件用 `@click.group()` 定义命令组
- 每个子命令一个文件，用 `@click.command()` + 参数/选项装饰器
- 业务逻辑抽离到 `core/` 目录，命令文件只做参数解析和调用
- 使用 `click.echo()` 输出，不用 `print()`
- **函数 docstring 就是 `--help` 文案**，不要写成注释
- core 异常经 `commands/common.py` 的 `cli_errors` 装饰器转换为 exit code 1；common.py 总是创建，共享选项在 2+ 个子命令复用时才添加
- 测试用 `pytest` + `click.testing.CliRunner`
- 读取 `references/code-templates-python.md` 获取代码模板

### Node (Commander)

- 入口文件用 `program` 定义，`require("./commands/x")(program)` 注册子命令
- 每个子命令一个文件，统一导出 `registerCommand(program)`，用 `.command().argument().option()` 链式定义
- 业务逻辑抽离到 `core/` 目录
- core 异常经 `commands/common.js` 的 `withCliErrors` 包裹 action；common.js 总是创建，共享选项在 2+ 个子命令复用时才添加
- `package.json` 的 `bin` 字段配置 CLI 命令名，`engines` 要求 Node >=18
- 测试用 Node 内置 `node:test` + `assert`
- 读取 `references/code-templates-node.md` 获取代码模板

## 约束

- 不负责 `npm publish` 或 PyPI 发布
- 不负责 CI/CD 配置
- 不做未确认的文件写入
- 不交付未运行过测试的代码
- 一个 skill 调用只处理一个 CLI 项目
- 追加模式要求项目遵循 `commands/` 目录分离的约定，不符合时提示用户

## References

| 文件 | 何时读取 |
|------|-------------|
| `references/project-structure-python.md` | 生成 Python CLI 项目结构 |
| `references/project-structure-node.md` | 生成 Node CLI 项目结构 |
| `references/code-templates-python.md` | 写 Python CLI 代码（入口、命令、common、core、测试） |
| `references/code-templates-node.md` | 写 Node CLI 代码（入口、命令、common、core、测试） |
| `references/install-scripts.md` | 生成 install.sh 和 uninstall.sh |
