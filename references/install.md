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
- FFmpeg 路径：`MOTIONFLUX_FFMPEG_PATH=/path/to/ffmpeg`（同目录的 `ffprobe` 会自动联动识别）；未设置时会自动扫描 `PATH`、`/opt/homebrew/bin`、`/usr/local/bin`、`/usr/bin` 等常见目录。

---

## 4. 在受限沙箱（AI Agent 终端 / 容器 / CI）中运行

MotionFlux 在 macOS / Linux 上通过**匿名管道**（`--remote-debugging-pipe`）驱动无头 Chrome，不占用任何 TCP 端口；本机 `127.0.0.1` 被禁止连接时，舞台文件改由 CDP `Fetch` 直接从磁盘分发，无需本地 HTTP 服务。

若外层已经存在操作系统级沙箱（例如 macOS Seatbelt、无特权容器），Chrome 自身的进程沙箱会因嵌套而启动失败。此时 `audit` / `frames` / `render` 会**自动回退**到兼容模式，并在结果 JSON 中标注 `"gpu": "software-fallback"`（正常为 `"hardware"`）。回退模式的取舍：

- **渲染后端**：改用 Chrome 内置 SwiftShader 软件 WebGL2，画面与硬件 GPU 一致，但三维场景逐帧渲染明显更慢；正式成片建议在无外层沙箱的普通终端里导出。
- **进程隔离**：回退会以 `--no-sandbox` 启动 Chrome（仍处于外层沙箱之内）。只对你自己或可信来源的舞台 HTML 使用；不要在回退模式下渲染来路不明的网页。
- **大体积视频素材**：无本地 HTTP 服务时，`<video>` 素材会被整体读入内存再交给浏览器，超大素材请在普通终端中渲染。
