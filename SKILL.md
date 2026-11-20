---
name: motionflux
description: 用 HTML/CSS/SVG/WebGL 确定性舞台底座制作高质量动效与视频（含自动 DOM 防穿帮审计与程序化音效），使用 53 个零依赖动效原子，或拆解参考视频中的动作、节奏与衔接。
---

# MotionFlux

MotionFlux 负责三件事：**做高质感动效/视频**、**提供可复用的纯函数动效原子**、**拆解参考视频动作时间线**。

- 用户要“做视频 / 做动效片 / 按参考重建”：使用 **HTML/CSS/SVG/WebGL Stage 底座**（[stage/README.md](stage/README.md)），用现代排版、真实素材、物理曲线和程序化音效构建，并通过 `audit` 自动防穿帮后导出预览或视频。
- 用户只要“给现有代码加一个具体动作”（如弹簧位移、逐字解码、粒子波纹）：从[原子清单](assets/catalog.md)按需拷贝独立 `.mjs` 原子接入宿主。
- 用户要“拆参考视频 / 问这里是怎么动的”：按时间码交付证据化拆解和「原片＋同步分轨」时间轴，不默认生成新片。

## 1. 用 Stage 底座制作动效与视频（默认推荐）

不要再用 Canvas 2D 手画纯线稿去硬凑商业视频。直接在浏览器完整渲染引擎（HTML + CSS Flexbox/Grid + 现代排版 + SVG + `<img>`/`<video>` + WebGL/Three.js）上构建，由 `stage/runtime.mjs` 统一接管确定性时间轴：

1. **初始化工程**：
   ```sh
   node scripts/motion.mjs init work/<project> --width 1920 --height 1080 --fps 30 --duration 180
   ```
2. **编写舞台与分镜**：
   - 在 `index.html` 中用 `[data-mf-scene="<id>"]` 划分镜头，用 `createStage({ width, height, fps, durationFrames, scenes, audio, onFrame })` 声明时间轴与音效。
   - 运动控制优先使用 `stage/runtime.mjs` 导出的 `spring` / `remap` / `easeOutExpo` / `stagger`、CSS/WAAPI 动画，或按需 `import` 53 个 `atoms/<ID>.mjs` 纯函数（如 `text.decode`、`gen.particles`、`choreo.ring`）。
   - 给需要防止裁切/重叠的主元素标上稳定 `data-mf-id`，装饰背景标 `data-mf-allow-bleed`。
   - 关键转场与落点在 `audio` 中声明程序化音效（`whoosh`、`whoosh-soft`、`pop`、`pop-soft`、`tick`、`click`、`sub-hit`、`riser`、`chime`、`shutter`）或本地 BGM/配音路径。
3. **自动防穿帮审计（交付前必跑）**：
   ```sh
   node scripts/motion.mjs audit work/<project>/index.html --contact work/<project>/contact.png --out work/<project>/audit.json
   ```
   - `audit` 在真实 Chrome 中检查越界裁切（`CLIPPED_OUTSIDE_STAGE`）、文字溢出（`TEXT_OVERFLOW`）、元素意外重叠（`ELEMENT_OVERLAP`）、坏图/字体失败与安全区侵入，并生成带帧号标注的 `contact.png`。
   - **有 error 必须先修完再交付**，并实际查看 `contact.png` 核对构图、层级和视觉节奏。
4. **渲染交付**：
   ```sh
   node scripts/motion.mjs render work/<project>/index.html --out work/<project>/output.mp4 --audit
   ```
   - 需要透明通道贴片时导出 `.mov` 或 `.webm` 并加 `--transparent`；只需抽帧时用 `frames`；交互式浏览器预览用 `serve`。

## 2. 单独使用 53 个动效原子

当宿主已有自己的渲染循环（React / Canvas / Three.js / 游戏引擎）时，无需引入整个 Stage：

1. 在[原子清单](assets/catalog.md)按属性或效果找 ID，再读对应的 `atoms/<ID>.md`。
2. 拷贝所需 `atoms/<ID>.mjs`（零依赖纯函数），每帧传入 `frame` 和 `durationFrames` 获取这一帧的数值/几何。接口约定见[原子接口](atoms/README.md)。

## 3. 拆参考视频

1. **看片段**：用宿主的播放器或抽帧工具查看指定范围，沿用原片时间码；不拿文案猜动作。
2. **按对象记变化**：同一对象从入场到落定沿用同一名称，区分观察（observed）、推断（inferred）与未知（unknown），不虚构曲线或插件。
3. **画在原片下方**：按原子分轨，一次连续动作是一块，同轨重复不合并、重叠时错层；块内不塞文字，同一原子全片同色。游标跟随原片，只有生效的块提亮。
4. **交付可看拆解**：默认输出每段「原片＋同步分轨」动图/视频及可编辑动作数据；核对一次重叠、一次落定和一次切段。
