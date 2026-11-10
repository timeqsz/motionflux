# 安装与环境

网站「下载 Skill」提供完整 ZIP，解压后只有一个 `motion-atoms/` 目录，里面直接是 `SKILL.md`、`atoms/`、`scripts/`、`references/`、`assets/` 和 `manifest.json`。

将整个 `motion-atoms/` 放进宿主支持的 skills 目录，避免多套一层同名目录。Codex 可使用个人目录 `~/.codex/skills/motion-atoms/`，或项目目录 `.agents/skills/motion-atoms/`；其他客户端按其本地 Skill 导入方式操作。已有同名版本时先保留旧目录，再整体替换，避免新旧模块混装。不需要复制源码仓库，不需要 npm install。

包内默认使用系统字体，不需要下载字库；固定字形的制作任务按 [字体与版本](motion-spec.md#字体与版本) 自备字体。

安装后让 Agent 读取 `$motion-atoms` 并完成一个具体任务，例如「用条片滑入和逐行揭示做一个五秒赛事标题」。可先从包目录验证：

```sh
node scripts/motion.mjs doctor --backend js
node scripts/motion.mjs describe transition.slices
node scripts/motion.mjs validate assets/examples/showcase.scene.json
node scripts/motion.mjs preview assets/examples/showcase.scene.json --out work/showcase.html
```

- Node.js 22+ 用于 CLI；原子是独立 ESM，支持现代浏览器。
- 绘制需要 Canvas 2D。仅求值不要求浏览器。
- `frames` 需要本机 Chrome、Chromium 或 Edge；`render` 另需 FFmpeg / ffprobe。用 `doctor --backend browser`、`doctor --backend ffmpeg` 分别检查；`--browser <路径>` 或 `MOTIONFLUX_BROWSER_PATH` 可指定浏览器。
- `atoms/example.html` 需通过本地 HTTP 服务打开，不能直接从 file:// 导入 ESM。宿主已有开发服务器时使用它；CLI `preview` 输出的内嵌 HTML 可直接打开。
- 包内不包含浏览器、FFmpeg、node_modules、宣传视频或开发者机器配置。`manifest.json` 中的 SHA-256 覆盖随包文件；网站下载地址使用包内容哈希，更新后不会继续指向旧包。
