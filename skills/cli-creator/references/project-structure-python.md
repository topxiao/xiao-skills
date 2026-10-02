# Python CLI Project Structure

## Directory Layout

```text
{cli-name}/
|-- pyproject.toml
|-- {cli_name}/
|   |-- __init__.py
|   |-- cli.py              # Entry + click.group
|   |-- commands/
|   |   |-- __init__.py
|   |   |-- common.py       # Error handling decorator + shared options
|   |   +-- {command}.py    # One file per subcommand
|   +-- core/
|       |-- __init__.py
|       +-- {module}.py     # Business logic
|-- tests/
|   |-- __init__.py
|   +-- test_{command}.py   # One test file per command
|-- install.sh
|-- uninstall.sh
+-- README.md
```

## File Descriptions

### pyproject.toml

`[project.scripts]` configures CLI entry command name. `[tool.setuptools.packages.find]` explicitly includes only the `{cli_name}` package (keeps `tests/` out).

### cli.py (Entry Point)

- Use `@click.group()` to define command group
- Import and register all subcommands
- Add `--version` global option
- Docstrings serve as `--help` output

### commands/{command}.py (Subcommand File)

- Use `@click.command()` to define
- `@click.argument()` for positional args, `@click.option()` for options
- `@cli_errors` converts core exceptions to exit code 1
- Call business logic from `core/`, no direct business logic

### commands/common.py

- Always created: `cli_errors` decorator converts core exceptions to exit code 1
- Shared options are added here only when 2+ subcommands reuse them

### core/{module}.py (Business Logic)

- Pure Python functions, no Click dependency
- Callable by command files and tests
- Generate complete implementation from user description

### tests/test_{command}.py

- Use `pytest` + `click.testing.CliRunner`
- Each command: happy path + validation + error case

### README.md

- Sections: 简介、安装（`bash install.sh` 或手动 `python3 -m pip install -e .`）、每个子命令的使用示例、运行测试（`pip install -e ".[dev]"` 后 `pytest`）
