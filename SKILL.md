---
name: motionflux
description: 以动效对象为单位创作、修改和验证动效，支持文字、图片、曲线、分组、关键帧与独立 Three.js 模块。也能拉片追踪对象及其动作、节奏、层级与转场，保留观察证据并关联制作对象，说明近似与未知。聚焦动效，不替代整片剪辑或通用视频摘要。
---

# MotionFlux

让 Agent 按描述制作动效，也能从参考视频中拆出可复用的动作与组合。Agent 负责观察、理解用途和编排，包内原子、校验器与渲染工具负责执行；用户不必先挑效果或记住原子名。发行包包含 53 个二维原子、MotionSpec 0.2 场景、独立模块接口和可检索的原创编排模式。模式提供用途与动作关系，实际作品仍需内容适配与画面验收。使用相对路径访问随包资源，不依赖网站在线、源码仓库或 npm 安装。首次安装见 [安装与环境](references/install.md)；`manifest.json` 记录本包版本、文件与校验值。

## 按任务读，不要一次加载全部目录

| 任务 | 先读 | 再取用 |
|---|---|---|
| 按描述生成，或继续修改现有效果 | [生成与修改闭环](references/workflow.md) | [意图映射](references/intent.md) |
| 产品介绍等多主体组合 | [模式检索与改编](references/patterns.md) | patterns 检索用途，读取匹配模式和示例；已有作品局部修改直接读当前场景 |
| 品牌运动风格与可编辑参数 | [品牌与编辑约定](references/brand-and-controls.md) | controls 读取场景保存值；deliver --authoring 保留模式、品牌上下文和参数绑定 |
| 用户要求将拉片或作品沉淀为经验 | [模式检索与改编](references/patterns.md) 的入库流程 | 复用 Study，原创实现与改编检查后记录验证范围 |
| 拆解参考视频，或分析某个动作怎样实现 | [视频动效拆解](references/video-breakdown.md) | 按观察结果查原子清单与用法，以 `breakdown` 截取原片；按动效类型分轨，轨道间清晰分隔，同轨多个无文字动作块独立高亮 |
| 二维文字、图形、属性动画 | [二维清单](assets/catalog.md)，只筛需要的族 | `atoms/<ID>.md` 与同名 `.mjs`；[输入输出约定](atoms/README.md) |
| 图片、曲线、父子分组、直接编辑属性动画 | [MotionSpec 0.2](references/scene-02.md) | `assets/examples/composition.scene.json` |
| 拉片证据与制作动作关联 | [Motion Study](references/motion-study.md) | `study` 校验源时间、证据和对象绑定；仅分析时无需场景 |
| 自定义画面或 Three.js | [渲染模块](references/render-modules.md) | `assets/examples/three-orbit.scene.json`；参数进 JSON，代码在独立模块 |
| 导出二维素材文件 | [场景编排](references/composition.md) | `scripts/motion.mjs`；精确字段见 [MotionSpec](references/motion-spec.md) |
| 修复卡顿、偏移、遮挡、不可读 | [时间与画面检查](references/quality.md) | 修复实际问题，再检查受影响的帧与播放 |

制作时先明确宿主、画幅、帧率、目标主体及交付物；拆解时先确认可观看的视频、范围与分析目的，保留源时间码。沿用用户已有决定。动效名称、参数和行为以包内说明为准。

**元素指承载动效的对象**：例如整体移动的一段文字、产品图片或一组卡片。制作默认先确定对象及稳定 ID，再编排各对象的动作和关系；同一对象可以使用多个动效原子或关键帧，同一种动效也可以作用于多个对象。按实际需要独立运动或修改的粒度建模，详见 [对象制作约定](references/workflow.md#按动效对象组织作品)。分析参考视频时尽量追踪同一对象的连续变化，允许身份、时间和轨迹近似并记录依据，不以百分之百追踪成功作为交付前提；详见 [对象追踪](references/video-breakdown.md#追踪承载动效的对象)。

组合创作先按用途和主体筛选少量模式，再确定当前作品的动作关系与实现。检索无适用结果时沿用基础编排；单个原子、局部修订和仅拉片无需额外走模式流程。品牌规则用于新增设计，场景保存值是修订依据。

分析与制作可独立进行。需要从参考制作时，迁移动作原则与节奏关系，重新设计主体、版式和镜头，不复制参考作品或竞品的实现。

交付用户要求的结果，不止推荐候选原子；已有结果的修改保留源文件，核对实际变更。二维 `deliver` 可打包独立预览、可编辑场景、资源与检查报告；报告不会把数值校验冒充视觉验收。超出已实现能力时说明缺口，再用调用方的宿主实现，不能把相近效果包装成已经满足需求。

## 制作核心

- **先有用途，再选动作。** 组合展示一个明确的产品、事件或状态变化；每个原子都要解释得出作用。参考真实 PV 的主体、节奏和衔接，实际观看后提炼方法，不照搬画面，不用无关图标、假控件或装饰运动凑数量。网站短篇约 5 秒、2–3 种原子；这不是所有视频的时长和数量限制。
- **编排变化，不给海报挂特效。** 先排好主次，再写清入场、变化、落定和离场；动作之间有因果或视觉承接，关键变化一眼可见。各组采用适合主体的进出方式，文字停稳后留足阅读时间；删掉无用边角小字。
- **运动必须完整、连贯。** 不提前截断、不统一反向播放；接镜兼顾位置、方向、速度和亮度。有限动作与连续循环分别设计，循环检查真实首尾，不能用补帧或提高标称帧率掩盖停顿。
- **主体作为整体。** 图像、字标、徽记共用正确的坐标和枢轴；真实遮罩与绘制顺序决定遮挡。入退场检查整组文字和细节，不能只让底板离开；在实际画幅与显示尺寸检查对齐、清晰度和裁切。
- **素材服务于动作。** 选择匹配用途、许可可追溯的免费商用素材，按许可处理署名和源文件分发；别用同一素材铺满不同案例。控制素材加载体积；网站与宣传片引用同一场景时同步素材和运动。
- **以实际输出验收。** 网页检查真实播放和目标尺寸；制作视频时先分镜，再逐帧渲染、合成视频，抽查编码后的入场／稳态／退场／接缝并完整播放。没看过的部分不声称检查通过；可播放结果与检查范围一起交付。具体技术检查见 [时间与画面检查](references/quality.md)。

## 二维：嵌入宿主渲染

只复制需要的 `.mjs`；需要绘制时再复制 `atoms/draw.mjs`。原子按显式帧求值，不自带播放器。宿主掌握绘制顺序、坐标与时间。八族各答一个问题：属性（变什么）、节奏（怎么变）、循环（一直动）、编排（谁先谁后）、转场（出现消失）、文字（字的动法）、质感（叠在上面）、生成（凭空产生）。

```js
import move from './atoms/prop.move.mjs';
import spring from './atoms/timing.spring.mjs';
import breathe from './atoms/loop.breathe.mjs';
import { drawAtom } from './atoms/draw.mjs';

const subject = { points: [[-50,-50],[50,-50],[50,50],[-50,50]], closed: true, fill: true };
const curve = (t) => spring({ frame: t, durationFrames: 1 }).value;   // 节奏：只给曲线
function renderFrame(ctx, frame) {
  const shape = move({ frame, durationFrames: 30, subject, params: { fromPx: -200, toPx: 0 }, ease: curve });
  const breath = breathe({ frame, startFrame: 30, durationFrames: 90 });   // 循环：叠在上面
  drawAtom(ctx, { ...shape, scale: shape.scale * breath.scale }, { x: 320, y: 200, color: '#f4f1ea' });
}
```

- 独立函数的 `params` 可只传改动项；**MotionSpec clips 必须写全参数**。不要混用这两种约定。
- 同时组合先看角色与 `writes`：位移、角度相加，缩放、透明度、拉伸相乘，滤镜依次拼接；编排原子返回 `copies`，宿主按副本的偏移和延迟各画一次。一个主体的轮廓输出不能靠对象展开叠加两个 `layers`。
- MotionSpec 里写同一属性的属性动画不能时间重叠，可前后接力；前段终值与后段起值要相接。节奏、循环、编排和质感是叠加的。文件导出不会自动沿用网站的循环播放策略。
- 图形坐标相对主体原点；文字位置为首行左侧基线。设备字体（`system`、`mono`）可直接使用，精确跨机字形才需固定字体资产。
- 可运行最小例子：[atoms/example.html](atoms/example.html)，阵列 × 错开 × 位移 × 弹簧。

## 二维：交付素材文件

以下命令在解压后的 `motionflux/` 内运行；输出写入自己的工作目录。导出前按需检测本机浏览器／FFmpeg，不在基础检索时要求这些工具。

```sh
node scripts/motion.mjs describe transition.slices
node scripts/motion.mjs scaffold transition.slices --out work/slices.scene.json --width 1920 --height 1080 --fps 30 --duration 60
node scripts/motion.mjs validate work/slices.scene.json
node scripts/motion.mjs frames work/slices.scene.json --out work/check --frames 0,20,40,59 --transparent
node scripts/motion.mjs render work/slices.scene.json --out work/slices.mov --transparent
```

多原子场景可直接用，例如：

```sh
node scripts/motion.mjs preview assets/examples/showcase.scene.json --out work/showcase.html
node scripts/motion.mjs breakdown assets/examples/showcase.scene.json --out work/showcase-breakdown.gif --title "片头 · 原子拆解"
```

`preview` 是 HTML，不是视频。`render` 可输出 MP4（不透明）、MOV / WebM（可透明）；`frames` 输出 PNG；`breakdown` 在画面下方加一条条原子时间轴，输出 GIF、MP4 或 WebM：输入场景时说明自己做的动效，输入拆解文件时截取参考视频片段做拆解（见 [视频动效拆解](references/video-breakdown.md)）。`verified: true` 只证明尺寸、帧数、时长等文件检查，**不证明构图、节奏或遮挡正确**。交付前按 [画面检查](references/quality.md) 看编码结果与实际播放，并说明实际检查范围。返回文件路径、场景路径、帧率、时长和透明通道；这些素材没有音轨。

## 能力边界

- 视频拆解由 Agent 使用宿主的播放、抽帧和听音工具观察完成；包内 CLI 没有视频识别命令，`breakdown` 按 Agent 写好的拆解文件截取原片片段，并在下方画出原子时间轴。可以分析超出本包的动作，但必须区分直接可用、部分近似和宿主另做，不能从成片断言原工程、插件或精确参数；截取的原片只用于分析，不当作素材再发布。
- MotionSpec 0.2 支持 text/path/vector/image/group/custom 和关键帧；0.1 保留原规则。图片、分组、自定义节点只支持文档列明的变换原子；不把文字/折线几何、质感和转场能力外推到所有对象。暂未提供视频帧节点、音轨、混合模式、对象遮罩和自动排版。
- 转场与质感可用于文字和图形；文字的包围盒按渲染时的实际字形测量。循环与节拍都不读取音频。
- 默认示例与 scaffold 使用系统字体，包内不携带字库。需要跨机一致时由宿主提供获许可的固定字体，声明路径与哈希并检查字形。
- Three.js 可通过独立模块参与统一时间轴、二维合成与逐帧导出，附可运行示例；尚无原生三维对象、glTF/骨骼动画与材质编辑器。需要这些时明确范围并扩写模块或原生后端，不把模块示例宣称为完整三维制作系统。
- 整片制作继续使用调用方的分镜、声音、剪辑与交付流程；本 Skill 不强制使用某个宿主、视觉风格或统一转场。

## 参考与致谢

本包所属 MotionFlux 项目的早期动效索引构思参考了 Kazuki Akamine（赤嶺一希）的 [Motion Periodic Table](https://selected.musabi.ac.jp/y2015/di/s01)。感谢其对基础动效整理与展示的启发。MotionFlux 为独立项目。
