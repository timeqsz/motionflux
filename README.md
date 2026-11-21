# MotionFlux

MotionFlux 是一套零依赖、确定性的 **`Motion.md` 导演分镜编译器 + HTML/CSS/SVG/WebGL/WebGPU 动效舞台底座 + 物理 3D 机械光学套件 + 53 个二维动效原子 + 参考视频拆解 Skill**。

- **`Motion.md` 导演分镜、多画幅自适应与商业模板**（[references/motion-md.md](references/motion-md.md)）：用结构化 Markdown 定义帧预算、无缝镜头转场（`crossfade` / `wipe-left` / `slide-left` / `zoom-through`）、3D 机位、程序化音效节拍与阅读负荷预算；原生支持 `--aspect 16:9 | 9:16 | 1:1 | 4:5` 横竖屏自适应重构，内置 `saas-launch`、`hardware-3d`、`data-story` 商业模板。
- **零依赖内置 MCP 服务**（[references/mcp.md](references/mcp.md)）：`node scripts/motion.mjs mcp` 一行命令将环境自检、模板生成、`Motion.md` 编译、Chrome 视觉审计（带多模态联版图回传）、母带渲染与参考片切镜探测暴露为标准 MCP 工具。
- **Stage 底座与智能审计 2.0**（[stage/README.md](stage/README.md)）：用完整浏览器渲染能力（现代排版、CSS/SVG/`backdrop-filter`、图片/视频、WebGL2/WebGPU/Three.js）编写动效，支持确定性逐帧捕获（CDP 全页截图）、交互式预览条、**WCAG 对比度 + DOM 几何防穿帮审计（附精确 CSS `selector` 与 `fix` 修复建议）**，以及**零外部 API Key 的程序化音效与多轨音频混音**。
- **物理 3D 摄影棚与精密机械光学套件**（[atoms/studio.md](atoms/studio.md) · [references/physical-3d.md](references/physical-3d.md)）：单文件自包含 `atoms/studio.mjs`（内置 Three.js 0.180），提供余弦柔光渐变+吸光黑旗 PMREM 环境、16 种切线法线/各向异性金属与增透镀膜玻璃材质、真渐开线齿轮/擒纵轮/阿基米德游丝/滚花旋钮/弧形光圈叶片 CAD 生成器，以及 4x MSAA 电影镜头光学后处理。
- **运行环境自检与自动安装**（[references/install.md](references/install.md)）：内置 `doctor`（Node 22+、浏览器、WebGL2、WebGPU、FFmpeg 全量诊断）、`setup [--apply]`（默认 Dry-Run 预览，免 `sudo` 用户态优先安装）与裸机引导脚本 `scripts/env.sh` / `scripts/env.ps1`。
- **53 个独立二维原子**（[atoms/README.md](atoms/README.md) · [原子清单](assets/catalog.md)）：零依赖纯函数 `.mjs`，可在 Stage 中直接 `import`，也可单独拷进任何宿主工程。
- **参考视频拆解**：结合宿主看片工具与 `breakdown` 命令，输出「原片＋同步原子分轨」拆解动图/视频。

## 快速使用

```sh
# 1. 环境自检与按需安装
node scripts/motion.mjs doctor
node scripts/motion.mjs setup

# 2. 初始化、审计、母带级渲染与本地预览
node scripts/motion.mjs init work/demo --width 1920 --height 1080 --fps 60 --duration 180
node scripts/motion.mjs audit work/demo/index.html --contact work/demo/contact.png
node scripts/motion.mjs render work/demo/index.html --out work/demo/demo.mp4 --quality cinema --audit
node scripts/motion.mjs serve work/demo/index.html --port 4178
```

## 开发与验证

```sh
npm ci
npm run typecheck
npm test
npm run verify
npm run test:browser
```

`npm run build` 构建 Stage 运行时（`stage/runtime.mjs`）、物理 3D 套件（`atoms/studio.mjs`）、CLI（`scripts/motion.mjs`）、53 个独立原子和可安装的 Skill ZIP（`dist/downloads/motionflux.zip`）。

早期动效周期表索引构思参考了 Kazuki Akamine 的 [Motion Periodic Table](https://selected.musabi.ac.jp/y2015/di/s01)。按 [MIT](LICENSE) 分发；第三方说明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
