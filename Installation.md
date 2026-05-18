# Installation

## Quick Install (recommended)

The installer script detects all VSCode-based IDEs on your system and lets you choose which ones to install to.

### macOS / Linux

```bash
curl -fsSL https://github.com/dewdad/md-editor-plus/raw/dist/install.sh | bash
```

Install to all detected IDEs without prompting:

```bash
curl -fsSL https://github.com/dewdad/md-editor-plus/raw/dist/install.sh | bash -s -- --all
```

### Windows (PowerShell)

```powershell
irm https://github.com/dewdad/md-editor-plus/raw/dist/install.ps1 | iex
```

Install to all detected IDEs without prompting:

```powershell
& ([scriptblock]::Create((irm https://github.com/dewdad/md-editor-plus/raw/dist/install.ps1))) -All
```

### Windows (Git Bash / WSL)

```bash
curl -fsSL https://github.com/dewdad/md-editor-plus/raw/dist/install.sh | bash
```

## Supported IDEs

The installer automatically detects and supports:

| IDE | CLI command |
|-----|-------------|
| Visual Studio Code | `code` |
| VS Code Insiders | `code-insiders` |
| VSCodium | `codium` |
| Cursor | `cursor` |
| Windsurf | `windsurf` |
| Positron | `positron` |
| Code - OSS | `code-oss` |

## Manual Install

If you prefer to download and install manually:

```bash
# Download the latest VSIX
curl -LO https://github.com/dewdad/md-editor-plus/raw/dist/md-editor-plus-latest.vsix

# Install (replace 'code' with your IDE's CLI command)
code --install-extension md-editor-plus-latest.vsix
```

### Per-IDE examples

```bash
# VS Code
code --install-extension md-editor-plus-latest.vsix

# VS Code Insiders
code-insiders --install-extension md-editor-plus-latest.vsix

# VSCodium
codium --install-extension md-editor-plus-latest.vsix

# Cursor
cursor --install-extension md-editor-plus-latest.vsix

# Windsurf
windsurf --install-extension md-editor-plus-latest.vsix
```

## From VS Code Marketplace

MD Editor Plus is also available on the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=AviranRevach.md-editor-plus). Search for "MD Editor Plus" in the Extensions panel or run:

```
ext install AviranRevach.md-editor-plus
```

## Updating

Re-run the install command at any time to get the latest version. The `dist` branch is automatically updated on every push to `main`.
