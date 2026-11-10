# 场景 JSON 怎么写

要自己写或改场景时读这一页。只用一个原子时先跑 `scaffold`，得到一份能通过校验的场景再改，比从零写快。字段的精确边界在 [motion-spec.md](motion-spec.md)，这里讲的是怎么用。

## 场景的样子

```json
{
  "specVersion": "0.1",
  "seed": 7,
  "canvas": { "width": 1280, "height": 720, "background": "#12151a" },
  "fps": { "numerator": 30, "denominator": 1 },
  "durationFrames": 180,
  "assets": {},
  "nodes": [
    { "id": "badge", "type": "path", "position": [250, 360], "color": "#f4f1ea", "strokeWidth": 6,
      "closed": true, "fill": true, "points": [[0, -44], [38.11, -22], [38.11, 22], [0, 44], [-38.11, 22], [-38.11, -22]] },
    { "id": "title", "type": "text", "position": [410, 350], "color": "#f4f1ea",
      "font": "system", "fontSize": 104, "lineHeight": 120, "text": "动效周期表" }
  ],
  "clips": [
    { "id": "badge-pop", "target": "badge", "recipe": "timing.overshoot", "startFrame": 12, "durationFrames": 20,
      "fillAfter": "hold", "params": { "tension": 2.2 } },
    { "id": "badge-in", "target": "badge", "recipe": "prop.scale", "startFrame": 12, "durationFrames": 20,
      "fillAfter": "hold", "params": { "from": 0, "to": 1 } },
    { "id": "title-in", "target": "title", "recipe": "text.lines", "startFrame": 24, "durationFrames": 26,
      "fillAfter": "hold", "params": { "stepFrames": 0, "distancePx": 60 } }
  ]
}
```

- 每个片段的 `params` 要写全该原子的**所有**参数，多一个少一个都会被拒绝。用 `describe <id>` 拿到完整列表和默认值，再改需要的。
- `fillAfter` 目前只有 `"hold"`。未知字段一律报错，不要自己发明字段。
- `seed` 决定所有随机与噪声；同一场景同一帧永远得到同一画面。想换一种随机结果就换种子。

## 坐标和时间

- 原点在画布左上，x 向右、y 向下，单位是像素。`position` 是节点的原点；旋转和缩放都绕这个原点。所以**把形状的点围绕 (0, 0) 来写**，再用 `position` 摆到画面上，旋转和缩放才会绕形状中心。
- 文字的 `position` 是**第一行左侧的基线**，不是左上角也不是中心。使用实际字体测量宽度、ascent 和 descent 后定位；字符数估计只适合草稿，不能据此确认画面对齐。换行只认 `\n`，不会自动折行。文字绕基线左端旋转和缩放，所以对文字用缩放、旋转入场通常不好看，优先用逐字、逐行、淡入、位移和转场。`font` 可写 `"system"`（无衬线）或 `"mono"`（等宽），都用设备字体。
- 时间以帧计。30 fps 下 1 秒 = 30 帧。片段必须落在场景内：`startFrame + durationFrames ≤ durationFrames(场景)`。
- 调用方没给时长时的参考值（30 fps）：入场或退场 12–24 帧，强调 20–40 帧。
- 从 A 到 B 的属性动画默认两头慢中间快。要别的节奏，在同一节点上加一个节奏原子（`timing.*`）：它作用于**在它时间范围内开始**的属性动画，所以入场可以用弹簧、退场用渐快，各管各的。

## 画形状

路径节点的 `points` 是相对节点原点的折线。常用形状（R 为半径）：

| 形状 | 点 |
|---|---|
| 矩形 w×h | `[-w/2,-h/2] [w/2,-h/2] [w/2,h/2] [-w/2,h/2]`，`closed: true` |
| 正 n 边形 | 第 i 点 `[R·cos(−90°+360°·i/n), R·sin(−90°+360°·i/n)]`，`closed: true` |
| 圆 | 同上取 n=48 |
| 星形 | 2n 个点，偶数点半径 R，奇数点半径约 0.45R |
| 直线 | 两个点，不闭合 |
| 曲线 | 沿曲线每 5–10 px 取一个点，不闭合 |

- 实心加 `fill: true`（必须同时 `closed: true`）；否则按 `strokeWidth` 描边。
- 最多 1000 个点。需要很多点时写个小脚本生成 JSON，别手敲。
- **粒子**不看 `points`，自己画内容，只用节点的位置、颜色和线宽。`points` 仍需至少两个点，写 `[[-1,0],[1,0]]` 即可。碎裂、波纹、变形和描线都读取轮廓。

## 同一元素上排多个原子

每个原子有一个角色（清单里的“角色”一列），决定它和同一节点上别的片段怎么相处：

| 角色 | 族 | 和别的片段 |
|---|---|---|
| 属性动画 | 属性、转场、文字、生成（粒子、碎裂、波纹） | 写同一属性的**轮流**生效，不能重叠；写不同属性的同时生效 |
| 时间曲线 | 节奏 | 改变在它时间范围内开始的属性动画的快慢；不写任何属性 |
| 持续循环 | 循环 | 叠加：位移和角度相加，缩放和透明度相乘 |
| 复制排布 | 阵列、环形、网格、镜像、跟随、拖影 | 把节点变成多个副本；多个排布嵌套相乘 |
| 先后延迟 | 错开、扩散、乱序 | 给副本加延迟；多个相加 |
| 画面质感 | 运动模糊、辉光、颗粒、故障、色散 | 叠在画面上，按片段顺序处理像素 |
| 场景连线 | 轨迹、连线 | 在场景坐标里画线，画在节点下面 |

所以一个元素的一生可以这样排：

```
弹出节奏  timing.overshoot        第 12–32 帧   只影响在这段时间里开始的属性动画
缩放入场  prop.scale 0→1          第 12–32 帧   写 scale
呼吸强调  loop.breathe            第 50–140 帧  叠在 scale 上
缩放退场  prop.scale 1→0          第 150–168 帧 写 scale
全程慢转  prop.rotate 0→180       第 12–168 帧  写 rotation（与上面不冲突）
```

- 两段 `prop.scale` 都写 scale，互不重叠，合法；第 32–150 帧保持入场的终值 1，呼吸在这个值上起伏。
- 第 12 帧之前，这个节点的 scale 是第一段的起始值 0，也就是看不见——不需要另外隐藏。
- 衔接处不自动对齐：后一段从它自己的起始值开始。退场从 1 开始，正好接上入场的终值。
- 弹出节奏的范围是第 12–32 帧，只管入场；退场在第 150 帧开始，不在它的范围里，所以仍是默认的两头慢中间快。
- 转场也是属性动画：`transition.iris` 设 `mode: "out"` 就能在最后收拢退场，它写的是 `mask`，与缩放不冲突。

**一组元素**不必复制多个节点：在一个节点上放 `choreo.array`（或网格、环形）就得到一排副本；再放 `choreo.stagger`，每个副本比前一个晚几帧；属性动画、循环和质感对每个副本各自生效，按副本自己的时间计算。`choreo.mirror` 的镜像副本动作也相反。`feel.trail` 和 `choreo.follow` 的残影与跟随者画在本体下面。

写入属性在 `assets/catalog.md` 的“写入”一列：`position`、`rotation`、`scale`、`opacity`、`color`、`stretch`、`blur`、`mask`、`dissolve`、`geometry`（重画轮廓）、`trim`（仅 `prop.draw`）、`text`、`lines`、`chars`。只有属性动画之间会冲突。

## 按意图找原子

调用方只给了一句意图时，从这里找候选，再读清单里的说明确认；更多拆法见 [意图映射](intent.md)。

| 想要 | 可以用 |
|---|---|
| 标题入场 | `text.chars`（逐字）、`text.lines`（逐行）、`text.tracking`（字距收拢）、`text.decode`（科技感）、`text.type`（打字）、`transition.wipe` |
| 数字增长 | `text.count`，文字里写 `#` 标出数字的位置 |
| 图形入场 | `prop.scale` × `timing.overshoot`、`prop.move` × `timing.spring`、`transition.iris`、`transition.blinds`、`prop.draw`（描边画出）、`prop.crop` |
| 强调、吸引注意 | `loop.breathe`、`loop.swing`、`loop.flicker`、`feel.glow`、`gen.ripple` |
| 下划线、指示线 | `prop.draw`；拖尾大于 0 时只留一段在线上跑 |
| 加载、进行中 | `loop.spin`、`choreo.ring` × `choreo.stagger` × `loop.breathe`、`choreo.array` × `loop.wave` |
| 转场、退场 | `transition.*` 的 `mode: "out"`、`gen.shatter`、`prop.blur`、`prop.opacity` |
| 一组元素 | `choreo.array`、`choreo.grid`、`choreo.ring` × `choreo.stagger` / `choreo.cascade` / `choreo.random` |
| 背景氛围 | `gen.particles`、`choreo.grid` × `loop.float` × `gen.link`、`gen.ripple` |
| 速度感 | `feel.motion-blur`、`feel.trail`、`choreo.follow`、`gen.trace` |
| 冲击、故障 | `feel.glitch`、`feel.chroma`、`gen.shatter`、`gen.particles` |

## 循环

循环由宿主时间线负责，不能对任意原子取模或统一倒放。带 `cycles` 或 `turns` 的参数可用整数周期作为起点，但仍需检查完整画面的首尾状态、速度、透明度与相位。有限入场与计数应完整到达终态；噪声和粒子不能仅凭名称认定闭合。具体检查见 [时间与画面检查](quality.md)。

## 常见报错

| `error.code` 或 issue | 原因 | 怎么改 |
|---|---|---|
| `PROPERTY_CONFLICT` | 同一节点上两个写同一属性的属性动画时间重叠 | 错开时间；要同时起作用换成循环或质感原子，不要用复制重叠主体绕过冲突 |
| `TARGET_TYPE` | 把只能用于 path 的原子用在了 text 上，或反过来 | 看清单的"节点"一列；文字要几何效果做不到 |
| `CLIP_BOUNDS` | 片段超出场景时长 | 缩短片段或加长场景 |
| `REQUIRED` / `UNKNOWN_FIELD` | `params` 缺参数或多了参数 | 以 `describe` 为准写全 |
| `SCHEMA`（Minimum/Maximum） | 参数越界 | 看 `describe` 里的范围 |
| `STAGGER_BOUNDS` | 逐字或逐行的错开吃掉了全部时长 | 减小 `stepFrames` 或加长片段 |
| `MISSING_FONT` / `ASSET_HASH` | 字体声明或文件不对 | 不需要固定字形时用 `font: "system"`；否则核对自备字体的文件、声明和 SHA-256 |
| `VIDEO_SIZE` | 画布宽或高是奇数 | 改成偶数 |
| `ALPHA_UNSUPPORTED` | 用 `.mp4` 要透明 | 换 `.mov`、`.webm` 或 `frames` |
| `BROWSER_MISSING` / `FFMPEG_MISSING` | 缺出图或编码工具 | 见 [安装与环境](install.md) |

## 透明素材

场景里的 `canvas.background` 是必填的，但加 `--transparent` 渲染时不会画它，画面只剩元素本身和透明底。所以同一份场景既能出带底色的预览，也能出透明素材。透明时注意两点：元素颜色要在宿主画面上看得清；模糊、辉光、色散这类原子的柔和边缘会带着半透明一起输出，叠加效果取决于下面的画面。

## 检查清单

出片前抽帧看图，逐条确认：

- 第 0 帧：该隐藏的元素是否都还没出现。
- 每个元素入场结束后一帧：位置、大小对不对，有没有出画或互相遮挡；弹簧、过冲冲过头的那几帧也要看。
- 一组副本：最后一个副本的动作结束时场景还没结束，延迟没有把它挤出时间轴。
- 文字：完整、可读、没被别的元素压住；停留时间够读完。
- 相邻片段的衔接帧（前一段末帧和后一段首帧）：有没有跳变。
- 最后一帧：是你想要的收尾画面（全部退场，或定格在完整画面）。
