#Requires -Version 5.1
<#
.SYNOPSIS
    MD Editor Plus — Windows installer with IDE selection
.DESCRIPTION
    Detects all VSCode-based IDEs on Windows and installs the latest VSIX.
.EXAMPLE
    # Interactive (prompts for IDE selection)
    irm https://github.com/dewdad/md-editor-plus/raw/dist/install.ps1 | iex

    # Install to all detected IDEs
    & ([scriptblock]::Create((irm https://github.com/dewdad/md-editor-plus/raw/dist/install.ps1))) -All
#>
param(
    [switch]$All,
    [switch]$Help
)

$ErrorActionPreference = 'Stop'

$Repo = "dewdad/md-editor-plus"
$Branch = "dist"
$VsixName = "md-editor-plus-latest.vsix"
$DownloadUrl = "https://github.com/$Repo/raw/$Branch/$VsixName"

# --- IDE Registry ---
$KnownIDEs = @(
    @{
        Cli  = "code"
        Name = "Visual Studio Code"
        Paths = @(
            "$env:LOCALAPPDATA\Programs\Microsoft VS Code\bin\code.cmd"
            "$env:ProgramFiles\Microsoft VS Code\bin\code.cmd"
            "${env:ProgramFiles(x86)}\Microsoft VS Code\bin\code.cmd"
        )
    }
    @{
        Cli  = "code-insiders"
        Name = "Visual Studio Code Insiders"
        Paths = @(
            "$env:LOCALAPPDATA\Programs\Microsoft VS Code Insiders\bin\code-insiders.cmd"
            "$env:ProgramFiles\Microsoft VS Code Insiders\bin\code-insiders.cmd"
        )
    }
    @{
        Cli  = "codium"
        Name = "VSCodium"
        Paths = @(
            "$env:LOCALAPPDATA\Programs\VSCodium\bin\codium.cmd"
            "$env:ProgramFiles\VSCodium\bin\codium.cmd"
        )
    }
    @{
        Cli  = "cursor"
        Name = "Cursor"
        Paths = @(
            "$env:LOCALAPPDATA\Programs\cursor\resources\app\bin\cursor.cmd"
            "$env:LOCALAPPDATA\cursor\cursor.cmd"
        )
    }
    @{
        Cli  = "windsurf"
        Name = "Windsurf"
        Paths = @(
            "$env:LOCALAPPDATA\Programs\windsurf\resources\app\bin\windsurf.cmd"
            "$env:LOCALAPPDATA\Programs\Windsurf\bin\windsurf.cmd"
        )
    }
    @{
        Cli  = "positron"
        Name = "Positron"
        Paths = @(
            "$env:LOCALAPPDATA\Programs\Positron\bin\positron.cmd"
            "$env:ProgramFiles\Positron\bin\positron.cmd"
        )
    }
    @{
        Cli  = "code-oss"
        Name = "Code - OSS"
        Paths = @(
            "$env:LOCALAPPDATA\Programs\code-oss\bin\code-oss.cmd"
        )
    }
)

# --- Helpers ---
function Write-Info  { param($Msg) Write-Host "  > " -NoNewline -ForegroundColor Cyan; Write-Host $Msg }
function Write-Ok    { param($Msg) Write-Host "  + " -NoNewline -ForegroundColor Green; Write-Host $Msg }
function Write-Warn  { param($Msg) Write-Host "  ! " -NoNewline -ForegroundColor Yellow; Write-Host $Msg }
function Write-Fail  { param($Msg) Write-Host "  x " -NoNewline -ForegroundColor Red; Write-Host $Msg }

# --- Detection ---
function Find-IDEs {
    Write-Info "Scanning for VSCode-based IDEs..."
    Write-Host ""

    $found = @()

    foreach ($ide in $KnownIDEs) {
        $resolvedPath = $null

        # Check PATH first
        $inPath = Get-Command $ide.Cli -ErrorAction SilentlyContinue
        if ($inPath) {
            $resolvedPath = $inPath.Source
        }

        # Check known install locations
        if (-not $resolvedPath) {
            foreach ($p in $ide.Paths) {
                if (Test-Path -LiteralPath $p) {
                    $resolvedPath = $p
                    break
                }
            }
        }

        if ($resolvedPath) {
            $found += @{
                Cli  = $ide.Cli
                Name = $ide.Name
                Path = $resolvedPath
            }
        }
    }

    if ($found.Count -eq 0) {
        Write-Fail "No VSCode-based IDEs found on this system."
        Write-Host ""
        Write-Host "  Looked for: code, code-insiders, codium, cursor, windsurf, positron, code-oss"
        Write-Host "  Make sure at least one is installed."
        exit 1
    }

    return $found
}

# --- Selection ---
function Select-IDEs {
    param(
        [array]$Found,
        [bool]$InstallAll
    )

    if ($InstallAll) {
        return $Found
    }

    if ($Found.Count -eq 1) {
        Write-Host "  Found " -NoNewline
        Write-Host $Found[0].Name -NoNewline -ForegroundColor White
        Write-Host " at $($Found[0].Path)"
        Write-Host ""
        return $Found
    }

    Write-Host "  Found $($Found.Count) IDEs:" -ForegroundColor White
    Write-Host ""

    for ($i = 0; $i -lt $Found.Count; $i++) {
        $num = $i + 1
        $name = $Found[$i].Name.PadRight(30)
        Write-Host "    $num) " -NoNewline -ForegroundColor White
        Write-Host "$name  $($Found[$i].Path)"
    }

    Write-Host ""
    Write-Host "    a) " -NoNewline -ForegroundColor White
    Write-Host "All of the above"
    Write-Host ""

    $selection = Read-Host "  Select IDEs (comma-separated numbers, or 'a' for all)"

    if ($selection -eq 'a' -or $selection -eq 'A') {
        return $Found
    }

    $selected = @()
    $choices = $selection -split ',' | ForEach-Object { $_.Trim() }

    foreach ($choice in $choices) {
        if ($choice -match '^\d+$') {
            $idx = [int]$choice - 1
            if ($idx -ge 0 -and $idx -lt $Found.Count) {
                $selected += $Found[$idx]
            } else {
                Write-Warn "Ignoring invalid selection: $choice"
            }
        }
    }

    if ($selected.Count -eq 0) {
        Write-Fail "No IDEs selected. Exiting."
        exit 1
    }

    return $selected
}

# --- Download ---
function Get-Vsix {
    param([string]$Destination)

    Write-Info "Downloading latest VSIX from $Repo@$Branch..."

    try {
        $ProgressPreference = 'SilentlyContinue'
        Invoke-WebRequest -Uri $DownloadUrl -OutFile $Destination -UseBasicParsing
    } catch {
        Write-Fail "Download failed: $_"
        exit 1
    }

    if (-not (Test-Path -LiteralPath $Destination) -or (Get-Item $Destination).Length -eq 0) {
        Write-Fail "Download failed or file is empty."
        exit 1
    }

    $size = [math]::Round((Get-Item $Destination).Length / 1KB, 1)
    Write-Ok "Downloaded ${size}KB"
}

# --- Install ---
function Install-ToIDEs {
    param(
        [array]$IDEs,
        [string]$VsixPath
    )

    Write-Host ""
    $success = 0
    $failed = 0

    foreach ($ide in $IDEs) {
        Write-Host "  Installing to " -NoNewline
        Write-Host $ide.Name -NoNewline -ForegroundColor White
        Write-Host "... " -NoNewline

        try {
            $proc = Start-Process -FilePath $ide.Path -ArgumentList "--install-extension", "`"$VsixPath`"", "--force" -Wait -PassThru -NoNewWindow -RedirectStandardOutput "NUL" -RedirectStandardError "NUL"
            if ($proc.ExitCode -eq 0) {
                Write-Host "done" -ForegroundColor Green
                $success++
            } else {
                Write-Host "failed (exit code $($proc.ExitCode))" -ForegroundColor Red
                $failed++
            }
        } catch {
            Write-Host "failed ($_)" -ForegroundColor Red
            $failed++
        }
    }

    Write-Host ""
    if ($success -gt 0) { Write-Ok "Installed to $success IDE(s)." }
    if ($failed -gt 0) { Write-Warn "$failed installation(s) failed. Try with the IDE closed." }
}

# --- Main ---
function Main {
    if ($Help) {
        Write-Host "Usage: install.ps1 [-All] [-Help]"
        Write-Host "  -All     Install to all detected IDEs without prompting"
        Write-Host "  -Help    Show this help"
        return
    }

    Write-Host ""
    Write-Host "  MD Editor Plus — Installer" -ForegroundColor White
    Write-Host ""

    $found = Find-IDEs
    $selected = Select-IDEs -Found $found -InstallAll $All.IsPresent

    $tmpFile = Join-Path $env:TEMP "md-editor-plus-$([guid]::NewGuid().ToString('N').Substring(0,8)).vsix"

    try {
        Get-Vsix -Destination $tmpFile
        Install-ToIDEs -IDEs $selected -VsixPath $tmpFile
    } finally {
        if (Test-Path -LiteralPath $tmpFile) {
            Remove-Item -LiteralPath $tmpFile -Force
        }
    }
}

Main
