# 安装与运行环境自检

## 1. 先自检、缺项即装（标准工作流）

MotionFlux 内置完整的运行环境诊断（`doctor`）与跨平台自动安装（`setup`）能力。首次在机器上使用或遇到浏览器/FFmpeg 缺失报错时，按以下顺序执行：

```sh
# 第一步：一键全量环境自检（检查 Node.js >=22、Chrome/Chromium/Edge、FFmpeg/ffprobe 及可用包管理器）
node scripts/motion.mjs doctor

# 若制作 3D / 实物类视频，进一步核验无头浏览器硬件图形上下文：
node scripts/motion.mjs doctor --backend webgl2
node scripts/motion.mjs doctor --backend webgpu

# 第二步：预览缺失依赖安装计划（Dry-Run，默认绝不修改系统）
node scripts/motion.mjs setup

# 第三步：显式执行自动安装并自动重跑复核（优先使用免 sudo 的 Playwright 用户态浏览器缓存）
node scripts/motion.mjs setup --apply
```

按需指定安装范围或包管理器：
- 仅安装浏览器：`node scripts/motion.mjs setup --target browser --apply`
- 仅安装 FFmpeg：`node scripts/motion.mjs setup --target ffmpeg --apply`
- 指定包管理器：`--manager auto|playwright|brew|apt|dnf|pacman|apk|winget|scoop|choco`

### 裸机引导兜底（连 Node.js 22+ 都未安装时）

随包附带无需 Node.js 即可运行的跨平台引导脚本：

- **macOS / Linux**：
  ```sh
  sh scripts/env.sh check     # 检查 Node 22+ / 浏览器 / FFmpeg
  sh scripts/env.sh plan      # 预览安装命令（Dry-Run）
  sh scripts/env.sh install   # 自动安装 Node 22+ 并委托 motion.mjs setup --apply 补齐剩余依赖
  ```
- **Windows（PowerShell）**：
  ```powershell
  powershell -ExecutionPolicy Bypass -File scripts/env.ps1 check
  powershell -ExecutionPolicy Bypass -File scripts/env.ps1 plan
  powershell -ExecutionPolicy Bypass -File scripts/env.ps1 install
  ```

---

## 2. 安装 Skill 目录

发布包 `motionflux.zip` 解压后只有一个 `motionflux/` 目录，里面直接包含 [SKILL.md](../SKILL.md)、[stage/README.md](../stage/README.md)、[原子清单](../assets/catalog.md)、`atoms/`、`scripts/`、`references/` 和 `manifest.json`。

将整个 `motionflux/` 放进宿主支持的 skills 目录（如 `.agents/skills/motionflux/` 或 `~/.codex/skills/motionflux/`），避免多套一层同名目录。不需要复制源码仓库，也不需要执行 `npm install`。

---

## 3. 环境变量与路径覆盖

`doctor`、`audit`、`frames`、`render` 与 `breakdown` 除了扫描系统标准路径与 `PATH` 外，还会自动扫描 Playwright 用户态浏览器缓存目录（macOS `~/Library/Caches/ms-playwright`、Linux `~/.cache/ms-playwright`、Windows `%LOCALAPPDATA%\ms-playwright`）。也可通过参数或环境变量显式指定：

- 浏览器路径：`--browser /path/to/chrome` 或 `MOTIONFLUX_BROWSER_PATH=/path/to/chrome`
- Playwright 缓存根目录：`PLAYWRIGHT_BROWSERS_PATH=/path/to/ms-playwright`
- FFmpeg 路径：`MOTIONFLUX_FFMPEG_PATH=/path/to/ffmpeg`（同目录的 `ffprobe` 会自动联动识别）
