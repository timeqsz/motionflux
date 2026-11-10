# MotionFlux

让 Agent 按描述组合动效，也能拆解视频里的动作、节奏和转场。

开源动效 Skill：**53 个二维动效原子、8 个分类**，附参数、独立 JavaScript、组合约定和渲染工具。可以交给支持本地 Skill 的 Agent，也可以直接在自己的代码中使用。

[浏览动效周期表](https://sylvanlv.com/motion/) · [下载 Skill](https://github.com/timeqsz/motionflux/releases/latest/download/motionflux.zip) · [使用说明](SKILL.md)

## 安装

下载 Release 中的 `motionflux.zip`，解压后将整个 `motionflux/` 放进客户端支持的 skills 目录。项目内可使用 `.agents/skills/motionflux/`；已有同名版本时先备份，再整体替换。完整安装包不需要 `npm install`。

也可以克隆此仓库，将根目录作为 Skill 目录使用：

```sh
git clone https://github.com/timeqsz/motionflux.git
cd motionflux
node scripts/motion.mjs doctor --backend js
```

CLI 需要 Node.js 22+。导出 PNG 帧需要本机 Chromium 系浏览器；导出视频或拆解动图另需 FFmpeg / ffprobe。浏览器、字体、FFmpeg 和参考视频不随包分发。详见[安装说明](references/install.md)。

## 可以这样用

对 Agent 说：

> 使用 motionflux，让这三行文字依次弹入，带一点过冲，最后一起淡出。交付可编辑场景和 HTML 预览。

> 使用 motionflux，分析这个视频 00:03–00:08 的动效。逐段说明主体、动作、层级、节奏和转场，标出观察与推断，并生成原片加动效时间轴的拆解动图。

视频拆解由 Agent 实际观看、分析并填写时间段；包内 `breakdown` 命令负责原片截取、时间轴绘制和编码，不会自动识别视频。详见[视频拆解](references/video-breakdown.md)。

直接试用工具：

```sh
node scripts/motion.mjs describe text.lines
node scripts/motion.mjs validate assets/examples/showcase.scene.json
node scripts/motion.mjs preview assets/examples/showcase.scene.json --out work/showcase.html
```

需要单个原子时，导入 `atoms/<ID>.mjs`，用自己的时间线逐帧求值；每个脚本都能独立使用，不需要动效运行库。Canvas 绘制与组合示例见 [`atoms/example.html`](atoms/example.html) 和[原子约定](atoms/README.md)。

## 能力范围

属性、节奏、循环、文字、质感、转场、编排、生成，共 8 族。常用组合：**位移 × 弹簧 × 错开 ＋ 拖影**。参数、作用对象和组合限制见[原子清单](assets/catalog.md)。

可生成离线 HTML、MotionSpec JSON、PNG 帧、MP4，以及带透明通道的 MOV / WebM。当前场景引擎支持二维文字与路径；图片、视频、音频、三维和整片剪辑由调用方宿主处理。渲染出的素材视频没有音轨。

## 开发

仓库含可直接安装的发行文件，也包含完整 TypeScript 源码，构建不依赖 MotionFlux 的网站仓库。

```sh
npm ci
npm run typecheck
npm test
npm run verify
```

`packages/` 维护内核、目录、渲染器和 CLI；`SKILL.md`、`references/`、`atoms/README.md`、`atoms/example.html` 直接维护。`atoms/*.mjs`、各原子的用法说明、目录索引和 CLI 由 `npm run build` 生成，请修改对应源码后重新构建。额外场景源文件在 `maintainer/examples/`。

`npm run build` 同时生成带文件校验清单的 `dist/downloads/motionflux.zip`。`npm run verify` 在临时目录中校验安装包文件并运行 CLI 与所有示例。发布前一起提交源码和更新后的发行文件。版本在 `package.json`；`VERSION.json` 记录初始分离时的 MotionFlux 来源提交。

## 参考与致谢

MotionFlux 的早期动效索引构思参考了 Kazuki Akamine（赤嶺一希）的 [Motion Periodic Table](https://selected.musabi.ac.jp/y2015/di/s01)。感谢其对基础动效整理与展示的启发。MotionFlux 是独立项目。

## 许可

[MIT](LICENSE)，可免费商用、修改和分发，保留许可证。外部字体、浏览器、编码器及用户提供的视频素材遵守各自许可，详见[第三方说明](THIRD_PARTY_NOTICES.md)。
