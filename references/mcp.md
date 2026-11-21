# 内置零依赖 MCP 服务 · `motion.mjs mcp`

MotionFlux 直接在随包单文件 CLI（`scripts/motion.mjs`）内集成符合 **Model Context Protocol（MCP）** 规范的 `stdio` 服务器——**无需 `npm install`、无需外部 SDK、无需配置任何第三方 API Key**，解压 `motionflux/` 目录即可接入 Claude Desktop、Cursor、Antigravity、Windsurf、Cline 或 Codex。

---

## 1. 客户端一行接入配置

将 `<PATH_TO_MOTIONFLUX>` 替换为本地解压后的 `motionflux` 目录绝对路径：

```json
{
  "mcpServers": {
    "motionflux": {
      "command": "node",
      "args": ["<PATH_TO_MOTIONFLUX>/scripts/motion.mjs", "mcp"]
    }
  }
}
```

协议兼容性：自动识别并回包 **换行分隔 JSON-RPC 2.0（MCP `2024-11-05` / `2025-03-26` 标准 `stdio`）** 与 **`Content-Length` 头帧封装**，零配置适配各版本宿主。

---

## 2. 暴露的 10 个核心工具（Tools）

| 工具名 | 作用 |
|---|---|
| `motionflux_doctor` | 一键全量探测 Node 22+、Chrome/Edge、硬件 WebGL2/WebGPU、FFmpeg 与系统包管理器（[install.md](install.md)） |
| `motionflux_setup` | 默认安全预览（`apply: false`）或显式自动安装（`apply: true`）缺失的浏览器 / FFmpeg |
| `motionflux_templates` | 列出内置商业模板（`default`、`saas-launch`、`hardware-3d`、`data-story`） |
| `motionflux_search_atoms` | 按关键词检索 53 个纯函数二维动效原子 |
| `motionflux_init` | 按模板与画幅比例（`aspect: 16:9 | 9:16 | 1:1 | 4:5`）初始化 Stage + `Motion.md` 工程 |
| `motionflux_plan` | 解析校验 `Motion.md`（文件路径或内联 `markdown`），输出精确帧区间与 `COPY_TOO_DENSE` 阅读速率诊断（[motion-md.md](motion-md.md)） |
| `motionflux_compile` | 将 `Motion.md` 编译为完整 HTML/CSS/SVG/3D Stage 工程（自动适配横屏 `16:9`、竖屏 `9:16` 与方屏 `1:1`） |
| `motionflux_audit` | 在真实 Chrome 中执行智能防穿帮审计 2.0（越界/溢出/重叠/WCAG 对比度 + 精确 `selector` 与 `fix` 建议；传 `contactSheetOut` 时同步内联返回 `image/png` 联版图供多模态模型直接看片） |
| `motionflux_render` | 导出 `--quality cinema` 母带级 MP4 / ProRes 4444 MOV / VP9 WebM，自动合成 48kHz 程序化音效与外挂音轨 |
| `motionflux_inspect_video` | 调用本地 `ffprobe` + FFmpeg `scdet` 自动检测参考视频切镜时间点、生成原片联版图并输出 `breakdown.template.json` |

---

## 3. 暴露的规范资源（Resources）

MCP 客户端可按需读取随包规范文档，不占初始上下文：

- `motionflux://docs/skill` → [SKILL.md](../SKILL.md)
- `motionflux://docs/stage` → Stage 运行时协议
- `motionflux://docs/motion-md` → [motion-md.md](motion-md.md)
- `motionflux://docs/physical-3d` → [physical-3d.md](physical-3d.md)
- `motionflux://docs/studio` → 物理 3D 机械光学套件说明
- `motionflux://docs/install` → [install.md](install.md)
- `motionflux://docs/catalog` → 53 个二维原子清单
