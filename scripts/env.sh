#!/bin/sh
# MotionFlux 跨平台运行环境自检与一键安装引导脚本（macOS / Linux）
# 在未安装 Node.js 22+ 的裸机上亦可直接运行：
#   sh scripts/env.sh check                 # 检查 Node.js 22+ / Chromium / FFmpeg 状态（JSON）
#   sh scripts/env.sh plan                  # 预览缺失依赖的安装计划（不改动系统）
#   sh scripts/env.sh install [all|node|browser|ffmpeg]  # 安装缺失运行环境并自动复核

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
MOTION_CLI="$SCRIPT_DIR/motion.mjs"
ACTION="${1:-check}"
TARGET="${2:-all}"

has_cmd() {
  command -v "$1" >/dev/null 2>&1
}

node_major() {
  if ! has_cmd node; then
    echo 0
    return
  fi
  node -p "Number(process.versions.node.split('.')[0])" 2>/dev/null || echo 0
}

run_privileged() {
  if [ "$(id -u)" -eq 0 ]; then
    "$@"
  elif has_cmd sudo; then
    sudo -n "$@"
  else
    echo "ERROR: Root privileges required to run: $*" >&2
    return 1
  fi
}

node_install_hint() {
  if has_cmd fnm; then
    echo "fnm install 22 && fnm default 22"
  elif has_cmd brew; then
    echo "brew install node@22 && brew link --overwrite --force node@22"
  elif has_cmd apt-get; then
    echo "sudo apt-get update && sudo apt-get install -y nodejs npm"
  elif has_cmd dnf; then
    echo "sudo dnf install -y nodejs"
  elif has_cmd pacman; then
    echo "sudo pacman -S --noconfirm nodejs npm"
  elif has_cmd apk; then
    echo "sudo apk add nodejs npm"
  else
    echo "Install Node.js >= 22 from https://nodejs.org/"
  fi
}

install_node22() {
  MAJOR=$(node_major)
  if [ "$MAJOR" -ge 22 ]; then
    return 0
  fi
  if has_cmd fnm; then
    fnm install 22
    eval "$(fnm env)"
    fnm use 22
  elif has_cmd brew; then
    brew install node
  elif has_cmd apt-get; then
    run_privileged apt-get update
    run_privileged apt-get install -y nodejs npm
  elif has_cmd dnf; then
    run_privileged dnf install -y nodejs
  elif has_cmd pacman; then
    run_privileged pacman -S --noconfirm nodejs npm
  elif has_cmd apk; then
    run_privileged apk add nodejs npm
  else
    echo '{"ok":false,"error":{"code":"NODE_INSTALLER_MISSING","message":"Node.js >= 22 is missing and no supported package manager (fnm, brew, apt-get, dnf, pacman, apk) was found."}}'
    exit 1
  fi
  MAJOR=$(node_major)
  if [ "$MAJOR" -lt 22 ]; then
    echo "{\"ok\":false,\"error\":{\"code\":\"NODE_VERSION_TOO_OLD\",\"message\":\"Installed Node.js major version is $MAJOR; Node.js >= 22 is required. Use fnm or brew to install Node 22+.\"}}"
    exit 1
  fi
}

MAJOR=$(node_major)

case "$ACTION" in
  check)
    if [ "$MAJOR" -ge 22 ]; then
      exec node "$MOTION_CLI" doctor
    fi
    HAS_FF="false"
    has_cmd ffmpeg && HAS_FF="true"
    HAS_BR="false"
    for b in "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" "/Applications/Chromium.app/Contents/MacOS/Chromium" google-chrome google-chrome-stable chromium chromium-browser microsoft-edge; do
      if [ -x "$b" ] || has_cmd "$b"; then HAS_BR="true"; break; fi
    done
    HINT=$(node_install_hint)
    printf '{\n  "ok": true,\n  "result": {\n    "backend": "bootstrap",\n    "available": false,\n    "node": { "available": false, "detectedMajor": %s, "required": ">=22", "installCommand": "%s" },\n    "browser": { "available": %s },\n    "ffmpeg": { "available": %s },\n    "missing": ["node"%s%s],\n    "hint": "Run sh scripts/env.sh install to install Node.js 22+ and missing runtime tools."\n  }\n}\n' \
      "$MAJOR" "$HINT" "$HAS_BR" "$HAS_FF" \
      "$( [ "$HAS_BR" = "false" ] && printf ', "browser"' || printf '' )" \
      "$( [ "$HAS_FF" = "false" ] && printf ', "ffmpeg"' || printf '' )"
    ;;
  plan)
    if [ "$MAJOR" -ge 22 ]; then
      if [ "$TARGET" = "node" ]; then
        printf '{"ok":true,"result":{"applied":false,"alreadyReady":true,"target":"node","node":"%s"}}\n' "$(node -v)"
      else
        exec node "$MOTION_CLI" setup --target "$TARGET"
      fi
    else
      HINT=$(node_install_hint)
      printf '{\n  "ok": true,\n  "result": {\n    "applied": false,\n    "alreadyReady": false,\n    "missing": ["node"],\n    "bootstrapCommand": "%s",\n    "next": "After Node.js >= 22 is installed, sh scripts/env.sh install will run node scripts/motion.mjs setup --apply."\n  }\n}\n' "$HINT"
    fi
    ;;
  install)
    install_node22
    if [ "$TARGET" = "node" ]; then
      exec node "$MOTION_CLI" doctor --backend js
    fi
    exec node "$MOTION_CLI" setup --target "$TARGET" --apply
    ;;
  *)
    echo '{"ok":false,"error":{"code":"USAGE","message":"Usage: sh scripts/env.sh [check|plan|install] [all|node|browser|ffmpeg]"}}'
    exit 1
    ;;
esac
