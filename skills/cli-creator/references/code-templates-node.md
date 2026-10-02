# Node CLI Code Templates

Placeholders: `{cli_name_dash}`, `{description}`, `{version}`（默认 1.0.0）, `{command}`, `{command_desc}`, `{module}`, `{function}`

## package.json

```json
{
  "name": "{cli_name_dash}",
  "version": "{version}",
  "description": "{description}",
  "bin": {
    "{cli_name_dash}": "./src/cli.js"
  },
  "scripts": {
    "start": "node src/cli.js",
    "test": "node --test"
  },
  "dependencies": {
    "commander": "^11.0.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

Rules: `engines` 不低于 18 —— commander ^11 和 `node:test` 都要求 Node 18+。test 脚本用裸 `node --test`（自动发现 `*.test.js`；带目录参数的写法在 Windows 上不工作）。

## cli.js (Entry Point)

```javascript
#!/usr/bin/env node
const { program } = require("commander");

program
  .name("{cli_name_dash}")
  .description("{description}")
  .version("{version}");

require("./commands/{command}")(program);
// 多个子命令时：每行一个 require 并立即调用，完成注册

program.parse();
```

Rules: 每个命令文件统一导出 `registerCommand`，入口里 require 后立即调用，不需要为每个命令起独立的注册函数名。

## commands/{command}.js (Subcommand)

```javascript
const { {function} } = require("../core/{module}");
const { withCliErrors } = require("./common");

function registerCommand(program) {
  program
    .command("{command}")
    .description("{command_desc}")
    .argument("<arg>", "Argument description")
    .option("--option <value>", "Option description", "default")
    .action(
      withCliErrors((arg, options) => {
        const result = {function}(arg, options);
        console.log(result);
      })
    );
}

module.exports = registerCommand;
```

Rules: 每个参数一个 `.argument()`，每个选项一个 `.option()`。action 用 `withCliErrors` 包裹。只调用 core，不写业务逻辑。

## commands/common.js (Shared Options & Error Handling)

每个项目都创建此文件——`withCliErrors` 是错误处理约定的载体。**共享选项**在第二个子命令需要相同选项时才添加。

```javascript
/** 子命令共享的选项与错误处理。 */

/** core 层异常 → stderr 输出 + exit code 1 */
function withCliErrors(action) {
  return (...args) => {
    try {
      return action(...args);
    } catch (e) {
      console.error(`Error: ${e.message}`);
      process.exitCode = 1;
    }
  };
}

/** 共享选项：返回命令对象，支持链式调用 */
function addFormatOption(cmd) {
  return cmd.option("--format <fmt>", "Output format", "text");
}

module.exports = { withCliErrors, addFormatOption };
```

Rules: `withCliErrors` 默认兜底所有异常；core 层定义了领域错误类型时改为只捕获该类型。共享选项只在复用次数 ≥2 时添加。

## core/{module}.js (Business Logic)

Pure JavaScript functions, no Commander dependency. 完整实现用户描述的业务逻辑，包含输入校验和错误处理（抛 Error，由命令层转换）。返回结果，不直接输出。

## tests/{command}.test.js

```javascript
const assert = require("assert");
const { test } = require("node:test");
const { execFileSync } = require("child_process");
const path = require("path");

const { {function} } = require("../src/core/{module}");

test("{function} happy path", () => {
  // 断言针对业务行为（具体返回值），不能只断言不抛错
  assert.strictEqual({function}("valid_input"), "expected_result");
});

test("{function} validation", () => {
  assert.throws(() => {function}(null), /error/);
});

test("cli registers {command}", () => {
  const out = execFileSync(
    "node",
    [path.join(__dirname, "..", "src", "cli.js"), "--help"],
    { encoding: "utf8" }
  );
  assert.ok(out.includes("{command}"));
});
```

Rules: 每个命令 3+ 用例（happy path / 参数校验 / CLI 注册冒烟），按实际命令行为调整。core 直测 + 入口经 child_process 测。
