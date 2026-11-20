# MotionFlux

MotionFlux 是一套零依赖、确定性的 **HTML/CSS/SVG/WebGL 动效与视频底座 + 53 个二维动效原子 + 参考视频拆解 Skill**。

- **Stage 底座**（[stage/README.md](stage/README.md)）：用完整浏览器渲染能力（现代排版、CSS/SVG/backdrop-filter、图片/视频、WebGL/Three.js）编写动效，支持确定性逐帧捕获（CDP 全页截图）、交互式预览条、**自动 DOM 几何防穿帮审计（裁切/溢出/重叠/坏资源检测）**，以及**零外部 API Key 的程序化音效与多轨音频混音**。
- **53 个独立原子**（[atoms/README.md](atoms/README.md) · [原子清单](assets/catalog.md)）：零依赖纯函数 `.mjs`，可在 Stage 中直接 `import`，也可单独拷进任何宿主工程。
- **参考视频拆解**：结合宿主看片工具与 `breakdown` 命令，输出「原片＋同步原子分轨」拆解动图/视频。

## 快速使用

需要 Node.js 22+（渲染与审计使用本机已有 Chrome/Chromium/Edge，视频封装需要 FFmpeg）：

```sh
node scripts/motion.mjs init work/demo --width 1920 --height 1080 --fps 30 --duration 150
node scripts/motion.mjs audit work/demo/index.html --contact work/demo/contact.png
node scripts/motion.mjs render work/demo/index.html --out work/demo/demo.mp4 --audit
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

`npm run build` 构建 Stage 运行时（`stage/runtime.mjs`）、CLI（`scripts/motion.mjs`）、53 个独立原子和可安装的 Skill ZIP（`dist/downloads/motionflux.zip`）。

早期动效周期表索引构思参考了 Kazuki Akamine 的 [Motion Periodic Table](https://selected.musabi.ac.jp/y2015/di/s01)。按 [MIT](LICENSE) 分发；第三方说明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
