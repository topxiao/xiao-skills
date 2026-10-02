# Install and Uninstall Script Templates

Placeholders: `{cli_name_dash}`

以下脚本面向 POSIX bash 环境（Linux / macOS / Windows Git Bash / WSL）。Windows PowerShell 下不跑脚本，直接执行脚本内的等效手动命令。Python 命令用 shim 探测：标准 Windows 安装没有 `python3`，只有 `python`。

## install.sh (Python)

```bash
#!/bin/bash
set -e
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

PY="$(command -v python3 || command -v python)"
echo "Installing {cli_name_dash}..."
"$PY" -m pip install -e .
echo "Done! Run '{cli_name_dash} --help' to get started."
```

## install.sh (Node)

```bash
#!/bin/bash
set -e
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "Installing dependencies..."
npm install
echo "Linking globally..."
npm link
echo "Done! Run '{cli_name_dash} --help' to get started."
```

## uninstall.sh (Python)

```bash
#!/bin/bash
set -e
PY="$(command -v python3 || command -v python)"
"$PY" -m pip uninstall -y {cli_name_dash}
echo "Uninstall complete."
```

## uninstall.sh (Node)

```bash
#!/bin/bash
set -e
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

npm unlink -g {cli_name_dash} 2>/dev/null || true
rm -rf node_modules
echo "Uninstall complete."
```

Rules: uninstall 不删除 `package-lock.json` 和源码——用户可能只想解除全局链接后重新安装。
