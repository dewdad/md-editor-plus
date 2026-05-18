#!/usr/bin/env bash
# MD Editor Plus — Cross-platform VSCode IDE installer
# Usage:
#   curl -fsSL https://github.com/dewdad/md-editor-plus/raw/dist/install.sh | bash
#   curl -fsSL https://github.com/dewdad/md-editor-plus/raw/dist/install.sh | bash -s -- --all
set -euo pipefail

REPO="dewdad/md-editor-plus"
BRANCH="dist"
VSIX_NAME="md-editor-plus-latest.vsix"
DOWNLOAD_URL="https://github.com/${REPO}/raw/${BRANCH}/${VSIX_NAME}"

# --- Colors ---
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

info()  { printf "${CYAN}▸${NC} %s\n" "$*"; }
ok()    { printf "${GREEN}✓${NC} %s\n" "$*"; }
warn()  { printf "${YELLOW}⚠${NC} %s\n" "$*"; }
fail()  { printf "${RED}✗${NC} %s\n" "$*"; }

# --- IDE Registry ---
# Each entry: "cli_name|display_name|extra_paths (colon-separated)"
KNOWN_IDES=(
  "code|Visual Studio Code|"
  "code-insiders|Visual Studio Code Insiders|"
  "codium|VSCodium|"
  "cursor|Cursor|"
  "windsurf|Windsurf|"
  "positron|Positron|"
  "code-oss|Code - OSS|"
  "code-exploration|VS Code Exploration|"
)

# Platform-specific extra search paths
get_extra_paths() {
  local cli="$1"
  case "$(uname -s)" in
    Darwin)
      case "$cli" in
        code)          echo "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" ;;
        code-insiders) echo "/Applications/Visual Studio Code - Insiders.app/Contents/Resources/app/bin/code-insiders" ;;
        codium)        echo "/Applications/VSCodium.app/Contents/Resources/app/bin/codium" ;;
        cursor)        echo "/Applications/Cursor.app/Contents/Resources/app/bin/cursor" ;;
        windsurf)      echo "/Applications/Windsurf.app/Contents/Resources/app/bin/windsurf" ;;
        positron)      echo "/Applications/Positron.app/Contents/Resources/app/bin/positron" ;;
      esac
      ;;
    Linux)
      case "$cli" in
        code)          echo "/snap/bin/code:/usr/share/code/bin/code" ;;
        code-insiders) echo "/snap/bin/code-insiders" ;;
        codium)        echo "/snap/bin/codium:/usr/share/codium/bin/codium" ;;
        cursor)        echo "$HOME/.local/bin/cursor:/opt/cursor/cursor" ;;
        windsurf)      echo "$HOME/.local/bin/windsurf:/opt/windsurf/windsurf" ;;
      esac
      ;;
    MINGW*|MSYS*|CYGWIN*)
      # Git Bash on Windows
      local appdata="${APPDATA:-$HOME/AppData/Roaming}"
      local localappdata="${LOCALAPPDATA:-$HOME/AppData/Local}"
      case "$cli" in
        code)          echo "$localappdata/Programs/Microsoft VS Code/bin/code.cmd" ;;
        code-insiders) echo "$localappdata/Programs/Microsoft VS Code Insiders/bin/code-insiders.cmd" ;;
        codium)        echo "$localappdata/Programs/VSCodium/bin/codium.cmd" ;;
        cursor)        echo "$localappdata/Programs/cursor/resources/app/bin/cursor.cmd:$localappdata/cursor/cursor.cmd" ;;
        windsurf)      echo "$localappdata/Programs/windsurf/resources/app/bin/windsurf.cmd" ;;
      esac
      ;;
  esac
}

# --- Detection ---
declare -a FOUND_IDES=()
declare -a FOUND_PATHS=()
declare -a FOUND_NAMES=()

detect_ides() {
  info "Scanning for VSCode-based IDEs..."
  echo

  for entry in "${KNOWN_IDES[@]}"; do
    IFS='|' read -r cli name _ <<< "$entry"

    # Check PATH first
    local found_path=""
    if command -v "$cli" &>/dev/null; then
      found_path="$(command -v "$cli")"
    fi

    # Check platform-specific paths
    if [[ -z "$found_path" ]]; then
      local extras
      extras="$(get_extra_paths "$cli")"
      if [[ -n "$extras" ]]; then
        IFS=':' read -ra paths <<< "$extras"
        for p in "${paths[@]}"; do
          if [[ -x "$p" ]] || [[ -f "$p" ]]; then
            found_path="$p"
            break
          fi
        done
      fi
    fi

    if [[ -n "$found_path" ]]; then
      FOUND_IDES+=("$cli")
      FOUND_PATHS+=("$found_path")
      FOUND_NAMES+=("$name")
    fi
  done

  if [[ ${#FOUND_IDES[@]} -eq 0 ]]; then
    fail "No VSCode-based IDEs found on this system."
    echo
    echo "Looked for: code, code-insiders, codium, cursor, windsurf, positron, code-oss"
    echo "Make sure at least one is installed and available in PATH or standard locations."
    exit 1
  fi
}

# --- Selection UI ---
select_ides() {
  local install_all="${1:-false}"

  if [[ "$install_all" == "true" ]]; then
    SELECTED=("${!FOUND_IDES[@]}")
    return
  fi

  if [[ ${#FOUND_IDES[@]} -eq 1 ]]; then
    printf "  Found ${BOLD}%s${NC} at %s\n" "${FOUND_NAMES[0]}" "${FOUND_PATHS[0]}"
    echo
    SELECTED=(0)
    return
  fi

  printf "  Found ${BOLD}%d${NC} IDEs:\n" "${#FOUND_IDES[@]}"
  echo
  for i in "${!FOUND_IDES[@]}"; do
    printf "    ${BOLD}%d)${NC} %-30s  %s\n" "$((i + 1))" "${FOUND_NAMES[$i]}" "${FOUND_PATHS[$i]}"
  done
  echo
  printf "    ${BOLD}a)${NC} All of the above\n"
  echo

  # Interactive selection
  if [[ -t 0 ]]; then
    printf "  Select IDEs to install to (comma-separated numbers, or 'a' for all): "
    read -r selection
  else
    # Non-interactive (piped) — install all by default
    warn "Non-interactive mode detected. Installing to all found IDEs."
    selection="a"
  fi

  SELECTED=()
  if [[ "$selection" == "a" || "$selection" == "A" ]]; then
    SELECTED=("${!FOUND_IDES[@]}")
  else
    IFS=',' read -ra choices <<< "$selection"
    for choice in "${choices[@]}"; do
      choice="$(echo "$choice" | tr -d ' ')"
      if [[ "$choice" =~ ^[0-9]+$ ]] && (( choice >= 1 && choice <= ${#FOUND_IDES[@]} )); then
        SELECTED+=("$((choice - 1))")
      else
        warn "Ignoring invalid selection: $choice"
      fi
    done
  fi

  if [[ ${#SELECTED[@]} -eq 0 ]]; then
    fail "No IDEs selected. Exiting."
    exit 1
  fi
}

# --- Download ---
download_vsix() {
  local dest="$1"
  info "Downloading latest VSIX from ${REPO}@${BRANCH}..."

  if command -v curl &>/dev/null; then
    curl -fsSL -o "$dest" "$DOWNLOAD_URL"
  elif command -v wget &>/dev/null; then
    wget -qO "$dest" "$DOWNLOAD_URL"
  else
    fail "Neither curl nor wget found. Cannot download."
    exit 1
  fi

  if [[ ! -f "$dest" ]] || [[ ! -s "$dest" ]]; then
    fail "Download failed or file is empty."
    exit 1
  fi

  ok "Downloaded $(du -h "$dest" | cut -f1) → $dest"
}

# --- Install ---
install_to_ides() {
  local vsix="$1"
  local success=0
  local failed=0

  echo
  for idx in "${SELECTED[@]}"; do
    local cli="${FOUND_IDES[$idx]}"
    local path="${FOUND_PATHS[$idx]}"
    local name="${FOUND_NAMES[$idx]}"

    printf "  Installing to ${BOLD}%s${NC}... " "$name"
    if "$path" --install-extension "$vsix" --force &>/dev/null 2>&1; then
      printf "${GREEN}done${NC}\n"
      ((success++))
    else
      printf "${RED}failed${NC}\n"
      ((failed++))
    fi
  done

  echo
  if [[ $success -gt 0 ]]; then
    ok "Installed to $success IDE(s)."
  fi
  if [[ $failed -gt 0 ]]; then
    warn "$failed installation(s) failed. Try running with the IDE closed, or install manually."
  fi
}

# --- Cleanup ---
cleanup() {
  if [[ -n "${TMPFILE:-}" ]] && [[ -f "$TMPFILE" ]]; then
    rm -f "$TMPFILE"
  fi
}
trap cleanup EXIT

# --- Main ---
main() {
  local install_all=false

  for arg in "$@"; do
    case "$arg" in
      --all|-a) install_all=true ;;
      --help|-h)
        echo "Usage: install.sh [--all]"
        echo "  --all, -a    Install to all detected IDEs without prompting"
        echo "  --help, -h   Show this help"
        exit 0
        ;;
    esac
  done

  echo
  printf "  ${BOLD}MD Editor Plus — Installer${NC}\n"
  echo

  detect_ides
  select_ides "$install_all"

  TMPFILE="$(mktemp -t md-editor-plus-XXXXXX.vsix)"
  download_vsix "$TMPFILE"
  install_to_ides "$TMPFILE"
}

main "$@"
