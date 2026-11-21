# 结构化导演分镜脚本 · `Motion.md`（`motion-md-1`）

`Motion.md` 是面向 AI Agent 与人类导演的可执行分镜契约：用一份结构化 Markdown 同时锁定**镜头帧预算、重叠转场、物理 3D 机位、程序化音效节拍点与文案阅读密度**，可直接通过 CLI 校验、编译为 Stage 工程（[stage/README.md](../stage/README.md)），或一步审计并渲染为母带视频。

---

## 1. 标准工作流

```sh
# 1. 从内置商业模板生成（同时生成 Motion.md 与 index.html）
node scripts/motion.mjs templates
node scripts/motion.mjs init work/launch --template saas-launch
node scripts/motion.mjs init work/chrono --template hardware-3d
node scripts/motion.mjs init work/report --template data-story

# 2. 校验分镜预算、音效与文案阅读速率（COPY_TOO_DENSE 预警）
node scripts/motion.mjs plan work/chrono/Motion.md --out work/chrono/stage.plan.json

# 3. 将手写或修改后的 Motion.md 编译为完整可定制 Stage 工程
node scripts/motion.mjs compile work/chrono/Motion.md --out work/chrono-stage

# 4. 也可直接对 Motion.md 跑防穿帮审计与母带级导出
node scripts/motion.mjs audit work/chrono/Motion.md --contact work/chrono/contact.png
node scripts/motion.mjs render work/chrono/Motion.md --out work/chrono/master.mp4 --quality cinema --audit
```

---

## 2. `Motion.md` 语法参考

```markdown
---
title: Chrono Calibre MF-01
width: 1920
height: 1080
fps: 60
accent: #38bdf8
theme: obsidian
quality: cinema
---

## Scene calibre: Precision Calibre
- duration: 2.4s
- layout: studio-3d
- rig: watch
- camera: orbit(-26deg -> 20deg, elevation: 22deg, distance: 2.3)
- sfx: sub-hit@0f, tick@36f, tick@72f, tick@108f
- badge: CALIBRE MF-01
- eyebrow: GRADE-5 TITANIUM · 20° INVOLUTE GEARING
- headline: Deterministic Physical Motion
- subhead: Physically accurate metal anisotropy, ruby bearings, and zero-varnish PBR lighting.
- metrics: 28,800 vph | Beat Lock, 0.00 px | Clipping

## Scene metrics: Verified Pipeline
- duration: 2.0s
- layout: metrics
- transition: wipe-left 18f
- sfx: whoosh@0f, pop-soft@12f, chime@32f
- eyebrow: PRODUCTION BENCHMARK
- headline: Zero-Defect Delivery
- metrics: 60 FPS | Master Lock, 100% | Local & Offline, CRF 15 | Cinema Slow
```

### 全局 Frontmatter 字段

| 字段 | 含义 | 默认值 |
|---|---|---|
| `title` | 影片标题 | `MotionFlux Production` |
| `width` / `height` | 舞台像素尺寸（160–3840） | `1920` / `1080` |
| `aspect` | 画幅比例预设：`16:9`（1920×1080）、`9:16`（1080×1920 竖屏自适应上下构图）、`1:1`（1080×1080）、`4:5`（1080×1350）；也可由 CLI `--aspect` 覆盖同一份 `Motion.md` 一稿多投 | `16:9` |
| `fps` | 帧率（商业宣传片推荐 `60`） | `60` |
| `accent` | 主题强调色（`#RRGGBB`） | `#38bdf8` |
| `theme` | 配色基调：`obsidian`（深邃黑曜）、`slate`（冷石板蓝灰）、`ivory`（明亮象牙白） | `obsidian` |
| `quality` | 默认渲染画质预设：`cinema` 或 `standard` | `cinema` |
| `bgm` / `bgmGain` | 可选本地背景音乐相对路径与音量（如 `./bgm.mp3`） | — |

### 分镜（`## Scene <id>: <标题>`）指令

| 指令 | 适用值与说明 |
|---|---|
| `duration` / `frames` | 该镜头时长，支持秒（`2.4s`）或帧（`144f`），编译器自动累加精确 `[startFrame, endFrame]` |
| `layout` | `hero`（居中主视觉）、`split`（左文右窗）、`terminal`（命令行窗口）、`metrics`（大字指标卡）、`feature-grid`（编号特性网格）、`studio-3d`（物理 3D 舞台 + 左栏瑞士网格 HUD）、`closing`（收尾定版） |
| `rig` | 当 `layout: studio-3d` 时选用内置物理 3D 机械装置（详见 [studio.md](../atoms/studio.md) 与 [physical-3d.md](physical-3d.md)）：`watch`（渐开线啮合轮系+红宝石轴承+烤蓝游丝）、`hardware`（CNC 喷砂机身+72 槽滚花旋钮+阻尼键帽）、`optics`（11 叶弧形机械光圈+增透镀膜弯月透镜） |
| `transition` | 与上一镜头的无缝重叠转场：`cut`、`crossfade 18f`、`wipe-left 18f`、`wipe-up 16f`、`slide-left 18f`、`zoom-through 20f` |
| `camera` | 三维/舞台运镜：`orbit(-24deg -> 22deg, elevation: 20deg, distance: 2.3)`、`push-in(0.95 -> 1.04)`、`static` |
| `sfx` | 相对本镜头起点的程序化音效节拍点，如 `sub-hit@0f, whoosh-soft@0.2s, pop-soft@16f(gain=0.5,pitch=1.1)` |
| `badge` / `eyebrow` / `headline` / `subhead` | 徽章、眉题、主标题与副标题文案（`plan` 自动核算每秒阅读负荷，超载报 `COPY_TOO_DENSE`） |
| `metrics` | 逗号分隔的 `数值 | 标签` 列表，自动开启 `tabular-nums` 等宽数字排版 |
| `item` / `items` | 分号分隔的 `小标题 | 说明` 卡片或要点行 |
| `code` | 单行命令或使用围栏代码块写入多行终端演示内容 |

---

## 3. 何时直接改 `Motion.md`，何时下沉改 `index.html`

- **快速成片、标准宣传片、多镜节奏对表**：直接编写或修改 `Motion.md`，通过 `plan` 校验阅读节奏后 `render Motion.md --quality cinema --audit` 一步出片，或 `compile` 生成基准工程。
- **深度定制独特 UI 交互、复杂 SVG 矢量路径或专有产品三维模型**：先用 `init --template <id>` 或 `compile Motion.md --out work/<dir>` 生成干净底座，再在 `work/<dir>/index.html` 中自由编写任意 DOM / CSS / SVG / Three.js 逻辑。
