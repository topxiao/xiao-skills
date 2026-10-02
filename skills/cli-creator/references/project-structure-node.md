# Node CLI Project Structure

## Directory Layout

```text
{cli-name}/
|-- package.json
|-- src/
|   |-- cli.js              # Entry + commander program
|   |-- commands/
|   |   |-- common.js       # Error handling wrapper + shared options
|   |   +-- {command}.js    # One file per subcommand
|   +-- core/
|       +-- {module}.js     # Business logic
|-- tests/
|   +-- {command}.test.js   # One test file per command
|-- install.sh
|-- uninstall.sh
+-- README.md
```

## File Descriptions

### package.json

`bin` field configures CLI command name, pointing to `./src/cli.js`. `engines` must be >=18 (commander ^11 and `node:test` requirement).

### cli.js (Entry Point)

- Shebang line `#!/usr/bin/env node`
- Use `commander` program
- `require("./commands/x")(program)` registers each subcommand
- Add `.version()` and `.description()`

### commands/{command}.js (Subcommand File)

- Export a single `registerCommand(program)` function
- Use `.command().argument().option()` chain
- Wrap action with `withCliErrors` for exit code 1 on core errors
- Call business logic from `core/`, no direct business logic

### commands/common.js

- Always created: `withCliErrors` wrapper converts core exceptions to exit code 1
- Shared option helpers are added here only when 2+ subcommands reuse them

### core/{module}.js (Business Logic)

- Pure JavaScript functions, no Commander dependency
- Callable by command files and tests
- Generate complete implementation from user description

### tests/{command}.test.js

- Use `node:test` + `assert`
- Each command: happy path + validation + CLI registration smoke test

### README.md

- Sections: 简介、安装（`bash install.sh` 或手动 `npm install && npm link`）、每个子命令的使用示例、运行测试
