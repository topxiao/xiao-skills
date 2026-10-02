# Python CLI Code Templates

Placeholders: `{cli_name}`（包名，下划线）, `{cli_name_dash}`（命令名，连字符）, `{description}`, `{version}`（默认 1.0.0）, `{command}`, `{command_desc}`, `{module}`, `{function}`

## pyproject.toml

```toml
[build-system]
requires = ["setuptools>=68.0"]
build-backend = "setuptools.build_meta"

[project]
name = "{cli_name_dash}"
version = "{version}"
description = "{description}"
requires-python = ">=3.9"
dependencies = ["click>=8.0"]

[project.scripts]
{cli_name_dash} = "{cli_name}.cli:cli"

[project.optional-dependencies]
dev = ["pytest>=7.0", "pytest-cov"]

[tool.setuptools.packages.find]
include = ["{cli_name}*"]
```

## cli.py (Entry Point)

```python
import click

from {cli_name}.commands.{command} import {command}
# 多个子命令时：每行一个 import，并在下方逐个 add_command


@click.group()
@click.version_option(version="{version}", prog_name="{cli_name_dash}")
def cli():
    """{description}"""


cli.add_command({command})

if __name__ == "__main__":
    cli()
```

## commands/{command}.py (Subcommand)

```python
import click

from {cli_name}.commands.common import cli_errors
from {cli_name}.core.{module} import {function}


@click.command()
@click.argument("arg_name")
@click.option("--option-name", default="value", help="Option help")
@cli_errors
def {command}(arg_name, option_name):
    """{command_desc}"""
    result = {function}(arg_name, option_name)
    click.echo(result)
```

Rules: 函数 docstring 就是 `--help` 文案（不要写成注释）。每个参数一个 `@click.argument()`，每个选项一个 `@click.option()`。`@cli_errors` 放最内层（紧贴函数）。只调用 core，不写业务逻辑。

## commands/common.py (Shared Options & Error Handling)

每个项目都创建此文件——`cli_errors` 是错误处理约定的载体。**共享选项**在第二个子命令需要相同选项时才添加。

```python
"""子命令共享的选项与错误处理。"""

import functools

import click


def cli_errors(fn):
    """core 层异常 → ClickException：exit code 1，错误信息进 stderr。"""

    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        try:
            return fn(*args, **kwargs)
        except Exception as e:
            raise click.ClickException(str(e))

    return wrapper


# 共享选项定义为模块级变量，子命令直接叠加装饰器。
# 第二个参数是形参名：避免与内置名冲突（如 --format 不用 format 接收）。
format_option = click.option(
    "--format", "fmt",
    type=click.Choice(["text", "json"]), default="text",
    help="输出格式（默认 text）",
)
```

Rules: `cli_errors` 默认兜底 `Exception`；core 层定义了领域异常类型时，替换成具体类型。共享选项只在复用次数 ≥2 时添加。

## core/{module}.py (Business Logic)

Pure Python functions, no Click import. 完整实现用户描述的业务逻辑，包含输入校验和错误处理（抛异常，由命令层转换）。返回结果，不直接输出。

## tests/test_{command}.py

```python
from click.testing import CliRunner

from {cli_name}.commands.{command} import {command}
from {cli_name}.core.{module} import {function}


def test_{command}_happy_path():
    # 断言针对业务行为（具体返回值/输出内容），不能只断言 not None
    assert {function}("valid_input") == "expected_result"

    runner = CliRunner()
    result = runner.invoke({command}, ["valid_input"])
    assert result.exit_code == 0
    assert "expected" in result.output


def test_{command}_validation():
    runner = CliRunner()
    result = runner.invoke({command}, [])
    assert result.exit_code != 0


def test_{command}_error():
    runner = CliRunner()
    result = runner.invoke({command}, ["bad_input"])
    assert result.exit_code == 1
    assert "Error" in result.output
```

Rules: 每个命令 3+ 用例（happy path / 参数校验 / core 错误），按实际命令行为调整，删掉不适用的。core 直测 + CLI 经 CliRunner 测。
