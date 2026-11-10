# 从描述到原子

先拆成「哪个主体、变什么、怎么变、谁先谁后、叠什么质感」，再到 [原子清单](../assets/catalog.md) 确认 `targets`、`writes` 和参数。名字是检索入口，不保证与其他工具的同名效果相同。

`search` 只做关键词匹配，先把整句需求拆成“文字”“弹簧”等短关键词，再由 Agent 判断适用性。零结果不等于做不了，也不要把关键词命中当作语义理解。用户无需知道原子名；交付遵循 [生成与修改闭环](workflow.md)。

| 常见说法 | 拆法 |
|---|---|
| 列表依次弹入 | `prop.move` ＋ `prop.opacity`（变什么）× `timing.overshoot` 或 `timing.spring`（怎么变）× `choreo.array` ＋ `choreo.stagger`（谁先谁后） |
| 标题一个字一个字浮现 | `text.chars`；要散开再收拢加 `text.tracking`；一行一行用 `text.lines` |
| 一组图标从中间往外冒 | `choreo.grid` 或 `choreo.ring` × `choreo.cascade` × `prop.scale`，节奏用 `timing.overshoot` |
| Logo 被一笔画出来，带光 | `prop.draw` × `timing.ease` ＋ `feel.glow` |
| 弹一下、柔和回弹 | 属性动画本身照常写，再加 `timing.spring`（来回晃几下）、`timing.overshoot`（只冲过一次）或 `timing.bounce`（落地弹几下） |
| 呼吸、待机、加载中 | `loop.breathe`、`loop.spin`、`loop.swing`、`loop.float`；一排此起彼伏用 `choreo.array` × `loop.wave` |
| 切换画面 | `transition.*` 设 `mode: in` 或 `out`；两个对象一出一进就是转场，推走用两个 `transition.push` |
| 炫、有冲击力 | 先把动作本身做对，再按需叠 `feel.trail`、`feel.motion-blur`、`feel.chroma`、`feel.glitch`；不要用质感掩盖没有设计的运动 |

修改现有结果时保留主体、构图与无关参数，只改对应控制量。例如「依次出现得更慢」增大 `choreo.stagger` 的 `stepFrames` 并给场景留出时间，「回弹更轻」降低 `timing.spring` 的晃动次数或提高阻尼；「整体慢一点」需要连同错开和时间轴一起调整，不能只提高帧率。

组合前检查角色：属性动画写同一属性时只能前后接力；节奏、循环、编排、质感都是叠加的，可以同时用。节奏原子只影响在它时间范围内开始的属性动画。重画图形的原子（变形、碎裂、粒子、波纹）同一时刻一个对象只用一个。

交付前说明实际选用的原子及职责，用 `validate` 和代表帧检查结果；校验通过不代表画面合格。不要为了展示覆盖率加入需求无关的效果。
