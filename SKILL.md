---
name: motionflux
description: 用 HTML/CSS/SVG/WebGL/WebGPU 确定性舞台底座与物理 3D 机械光学套件制作高质量动效与视频（含环境自检安装、DOM 防穿帮审计、程序化音效与 53 个零依赖动效原子），或拆解参考视频动作时间线。
---

# MotionFlux

MotionFlux 负责三件事：**做高质感动效与实物级 3D 视频**、**提供可复用的纯函数动效原子**、**拆解参考视频动作时间线**。

- 用户要“做视频 / 做宣传片 / 做硬件实物短片 / 按参考重建”：使用 **HTML/CSS/SVG/WebGL/Three.js Stage 底座**（[stage/README.md](stage/README.md)）与物理棚拍套件（[atoms/studio.md](atoms/studio.md)），通过 `audit` 自动防穿帮后用 `--quality cinema` 导出母带级视频。
- 用户只要“给现有代码加一个具体动作”（如弹簧位移、逐字解码、粒子波纹）：从[原子清单](assets/catalog.md)按需拷贝独立 `.mjs` 原子接入宿主。
- 用户要“拆参考视频 / 问这里是怎么动的”：按时间码交付证据化拆解和「原片＋同步分轨」时间轴，不默认生成新片。

## 0. 环境自检与自动安装（首次运行或缺依赖必跑）

不要假设机器已装齐浏览器、GPU 驱动或 FFmpeg；先自检、缺项即装（详见 [references/install.md](references/install.md)）：

```sh
# 1. 一键全量自检（Node 22+、Chrome/Edge、FFmpeg、可用包管理器）
node scripts/motion.mjs doctor
# 实物三维项目额外核验硬件 WebGL2 / WebGPU 上下文：
node scripts/motion.mjs doctor --backend webgl2
node scripts/motion.mjs doctor --backend webgpu

# 2. 先预览缺失依赖安装计划（Dry-Run），确认后加 --apply 自动安装并复核
node scripts/motion.mjs setup
node scripts/motion.mjs setup --apply
```

若目标裸机连 Node.js 22+ 都未安装，先运行随包引导脚本 `sh scripts/env.sh check` / `sh scripts/env.sh install`（Windows 用 `powershell -ExecutionPolicy Bypass -File scripts/env.ps1 check`）。

## 1. 用 Stage 底座制作动效与视频（默认推荐）

不要再用扁平二维色块或纯线稿硬凑商业视频。直接在浏览器完整渲染引擎（HTML + CSS Flexbox/Grid + 现代排版 + SVG + `<img>`/`<video>` + WebGL2/WebGPU/Three.js）上构建，由 `stage/runtime.mjs` 统一接管确定性时间轴：

1. **初始化工程**：
   ```sh
   node scripts/motion.mjs init work/<project> --width 1920 --height 1080 --fps 60 --duration 300
   ```
2. **编写舞台、三维物理器物与分镜**：
   - 在 `index.html` 中用 `[data-mf-scene="<id>"]` 划分镜头，用 `createStage({ width, height, fps, durationFrames, scenes, audio, onFrame })` 声明时间轴与音效。
   - **涉及实物类视频（机械腕表、工业硬件、光学镜头、消费电子等）**：**必须使用 WebGL2 / WebGPU / Three.js 构建真实三维场景**，直接引入 `/__motionflux/atoms/studio.mjs`（[atoms/studio.md](atoms/studio.md)）挂载到舞台 `<canvas data-mf-allow-bleed>`，严格遵守物理材质（裸金属 `clearcoat: 0` + 切线法线贴图 + 物理 `anisotropy`、柔光渐变+吸光黑旗、增透镀膜 `arGlass`、径向消隐 `createStudioBackdrop`）与真实机械装配关系（渐开线齿轮节圆啮合、轴承夹板支撑、60+ 槽滚花、弧形叠片光圈），详见 [references/physical-3d.md](references/physical-3d.md)。
   - 运动控制优先使用 `stage/runtime.mjs` 导出的 `spring` / `remap` / `easeOutExpo` / `stagger`、CSS/WAAPI 动画，或按需 `import` `/__motionflux/atoms/<ID>.mjs` 纯函数（如 `text.decode`、`gen.particles`、`choreo.ring`）。
   - 给需要防止裁切/重叠的主元素标上稳定 `data-mf-id`，全屏背景或三维底图画布标 `data-mf-allow-bleed`。
   - 关键转场与机械落点在 `audio` 中声明程序化音效（`whoosh`、`whoosh-soft`、`pop`、`pop-soft`、`tick`、`click`、`sub-hit`、`riser`、`chime`、`shutter`）或本地 BGM/配音路径，声画因果逐帧对齐。
3. **自动防穿帮审计（交付前必跑）**：
   ```sh
   node scripts/motion.mjs audit work/<project>/index.html --contact work/<project>/contact.png --out work/<project>/audit.json
   ```
   - `audit` 在真实 Chrome 中检查越界裁切（`CLIPPED_OUTSIDE_STAGE`）、文字溢出（`TEXT_OVERFLOW`）、元素意外重叠（`ELEMENT_OVERLAP`）、坏图/字体失败与安全区侵入，并生成带帧号标注的 `contact.png`。
   - **有 error 必须先修完再交付**，并实际查看 `contact.png` 核对曝光层次、构图边距与视觉节奏。
4. **母带级渲染与成片抽检**：
   ```sh
   node scripts/motion.mjs render work/<project>/index.html --out work/<project>/output.mp4 --quality cinema --audit
   ```
   - 正式商业成片默认开启 `--quality cinema`（H.264 `-preset slow -crf 15` / VP9 `-crf 16` + `256k` 音频）；需要透明通道贴片时导出 `.mov`（ProRes 4444）或 `.webm` 并加 `--transparent`；导出后从 `.mp4` 解码抽帧复核画质与暗部色带。

## 2. 单独使用 53 个动效原子

当宿主已有自己的渲染循环（React / Canvas / Three.js / 游戏引擎）时，无需引入整个 Stage：

1. 在[原子清单](assets/catalog.md)按属性或效果找 ID，再读对应的 `atoms/<ID>.md`。
2. 拷贝所需 `atoms/<ID>.mjs`（零依赖纯函数），每帧传入 `frame` 和 `durationFrames` 获取这一帧的数值/几何。接口约定见[原子接口](atoms/README.md)。

## 3. 拆参考视频

1. **看片段**：用宿主的播放器或抽帧工具查看指定范围，沿用原片时间码；不拿文案猜动作。
2. **按对象记变化**：同一对象从入场到落定沿用同一名称，区分观察（observed）、推断（inferred）与未知（unknown），不虚构曲线或插件。
3. **画在原片下方**：按原子分轨，一次连续动作是一块，同轨重复不合并、重叠时错层；块内不塞文字，同一原子全片同色。游标跟随原片，只有生效的块提亮。
4. **交付可看拆解**：默认输出每段「原片＋同步分轨」动图/视频及可编辑动作数据；核对一次重叠、一次落定和一次切段。
