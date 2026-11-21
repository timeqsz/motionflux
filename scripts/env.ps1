# MotionFlux Windows 运行环境自检与一键安装引导脚本 (PowerShell)
# 用法：
#   powershell -ExecutionPolicy Bypass -File scripts/env.ps1 check
#   powershell -ExecutionPolicy Bypass -File scripts/env.ps1 plan
#   powershell -ExecutionPolicy Bypass -File scripts/env.ps1 install [all|node|browser|ffmpeg]

param(
  [string]$Action = "check",
  [string]$Target = "all"
)

$ErrorActionPreference = "Stop"
$MotionCli = Join-Path $PSScriptRoot "motion.mjs"

function Get-NodeMajor {
  $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
  if (-not $nodeCmd) { return 0 }
  try {
    $v = & node -p "Number(process.versions.node.split('.')[0])" 2>$null
    return [int]$v
  } catch {
    return 0
  }
}

function Install-Node22 {
  if ((Get-NodeMajor) -ge 22) { return }
  if (Get-Command winget -ErrorAction SilentlyContinue) {
    & winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements
  } elseif (Get-Command scoop -ErrorAction SilentlyContinue) {
    & scoop install nodejs-lts
  } elseif (Get-Command choco -ErrorAction SilentlyContinue) {
    & choco install nodejs-lts -y
  } else {
    Write-Output '{"ok":false,"error":{"code":"NODE_INSTALLER_MISSING","message":"Node.js >= 22 is missing and neither winget, scoop nor choco was found."}}'
    exit 1
  }
}

$Major = Get-NodeMajor

switch ($Action) {
  "check" {
    if ($Major -ge 22) {
      & node $MotionCli doctor
      exit $LASTEXITCODE
    }
    $hasFf = [bool](Get-Command ffmpeg -ErrorAction SilentlyContinue)
    $out = @{
      ok = $true
      result = @{
        backend = "bootstrap"
        available = $false
        node = @{ available = $false; detectedMajor = $Major; required = ">=22"; installCommand = "winget install --id OpenJS.NodeJS.LTS -e" }
        ffmpeg = @{ available = $hasFf }
        hint = "Run: powershell -ExecutionPolicy Bypass -File scripts/env.ps1 install"
      }
    }
    $out | ConvertTo-Json -Depth 5
  }
  "plan" {
    if ($Major -ge 22) {
      if ($Target -eq "node") {
        Write-Output '{"ok":true,"result":{"applied":false,"alreadyReady":true,"target":"node"}}'
      } else {
        & node $MotionCli setup --target $Target
        exit $LASTEXITCODE
      }
    } else {
      Write-Output '{"ok":true,"result":{"applied":false,"alreadyReady":false,"missing":["node"],"bootstrapCommand":"winget install --id OpenJS.NodeJS.LTS -e"}}'
    }
  }
  "install" {
    Install-Node22
    if ($Target -eq "node") {
      & node $MotionCli doctor --backend js
    } else {
      & node $MotionCli setup --target $Target --apply
    }
    exit $LASTEXITCODE
  }
  default {
    Write-Output '{"ok":false,"error":{"code":"USAGE","message":"Usage: env.ps1 [check|plan|install] [all|node|browser|ffmpeg]"}}'
    exit 1
  }
}
