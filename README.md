# MD Editor Plus — Pre-built VSIX

> **v0.4.2** · built from `65c1530` · 2026-05-18 09:08 UTC

Auto-built distribution branch. Install the extension on any VSCode-based IDE.

## Quick Install (recommended)

Detects all VSCode IDEs on your system and lets you choose which ones to install to.

### macOS / Linux

```bash
curl -fsSL https://github.com/dewdad/md-editor-plus/raw/dist/install.sh | bash
```

Install to **all** detected IDEs without prompting:

```bash
curl -fsSL https://github.com/dewdad/md-editor-plus/raw/dist/install.sh | bash -s -- --all
```

### Windows (PowerShell)

```powershell
irm https://github.com/dewdad/md-editor-plus/raw/dist/install.ps1 | iex
```

Install to **all** detected IDEs without prompting:

```powershell
& ([scriptblock]::Create((irm https://github.com/dewdad/md-editor-plus/raw/dist/install.ps1))) -All
```

### Windows (Git Bash / WSL)

```bash
curl -fsSL https://github.com/dewdad/md-editor-plus/raw/dist/install.sh | bash
```

## Supported IDEs

The installer automatically detects:

| IDE | CLI |
|-----|-----|
| Visual Studio Code | `code` |
| VS Code Insiders | `code-insiders` |
| VSCodium | `codium` |
| Cursor | `cursor` |
| Windsurf | `windsurf` |
| Positron | `positron` |
| Code - OSS | `code-oss` |

## Manual Install

If you prefer to install manually:

```bash
# Download
curl -LO https://github.com/dewdad/md-editor-plus/raw/dist/md-editor-plus-latest.vsix

# Install (replace 'code' with your IDE's CLI)
code --install-extension md-editor-plus-latest.vsix
```
