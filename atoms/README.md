# 动效原子脚本

这个目录里是动效本身：每个原子一份独立脚本，加一份用法说明。它们不依赖本 Skill 的命令行工具，也不依赖场景 JSON——把文件拷到任何 JavaScript 工程里就能用，由你的代码决定画什么、什么时候画、画到哪里。

| 文件 | 内容 |
|---|---|
| `<原子 ID>.mjs` | 一个原子的全部代码。ES 模块，**没有任何 import**，可以单独拷走。 |
| `<原子 ID>.md` | 这个原子的参数表、调用示例、返回值说明。 |
| `draw.mjs` | 把任意原子的返回值画到 Canvas 2D 上，像素滤镜也在这里。独立文件，无依赖。 |
| `index.mjs` | 一次导入全部原子：`import { atoms, drawAtom } from './index.mjs'`，再用 `atoms['prop.move']` 取。 |
| `example.html` | 能直接跑的最小例子：阵列 × 错开 × 位移 × 弹簧，四个原子拼成一组依次弹入；可播放、暂停和拖帧。 |

要哪个原子，先看 [../assets/catalog.md](../assets/catalog.md) 的清单，再读对应的 `<ID>.md`。

## 八族，各答一个问题

| 族 | 回答 | 原子返回什么 |
|---|---|---|
| 属性 `prop.*` | 变什么 | 位置、角度、缩放、透明度、颜色、模糊、轮廓、可见范围 |
| 节奏 `timing.*` | 怎么变 | 一条曲线 `value`：0 开始、1 结束，中间可以冲过头、先后退或一格格跳 |
| 循环 `loop.*` | 一直动 | 叠加在其他动作上的持续位移、旋转、缩放或闪烁 |
| 编排 `choreo.*` | 谁先谁后 | 副本 `copies`：每个画在哪、比原对象晚几帧 |
| 转场 `transition.*` | 出现消失 | 可见区域 `pieces`、翻转 `stretch` 或溶解滤镜 |
| 文字 `text.*` | 字的动法 | 每行文字，以及逐字的偏移和透明度 `glyphs` |
| 质感 `feel.*` | 叠在上面 | 像素滤镜 `filters`（辉光、颗粒、故障、色散、运动模糊），或身后的残影副本 |
| 生成 `gen.*` | 凭空产生 | 新画出来的图形 `layers`：粒子、碎片、波纹、轨迹、连线 |

一个完整的动作通常从几族里各取一个：**位移 × 弹簧 × 错开 ＋ 拖影**就是一组依次弹入、带残影的列表。

## 调用约定

每个脚本默认导出一个函数。**每一帧调用一次**，告诉它现在是第几帧，它返回这一帧的结果。函数是纯的：不读时钟、不记状态，同样的输入永远得到同样的输出，所以可以跳帧、倒放、分片并行渲染。

```js
import move from './prop.move.mjs';

const out = move({ frame: 12, durationFrames: 30, params: { fromPx: -160, toPx: 0 } });
// out = { progress, position: [dx, dy], rotation, scale, stretch, opacity }
```

| 输入 | 含义 | 默认 |
|---|---|---|
| `frame` | 宿主时间线上的当前帧，可以是小数 | 必填 |
| `durationFrames` | 这个原子持续多少帧 | 必填 |
| `startFrame` | 从宿主时间线的第几帧开始 | 0 |
| `fps` | 帧率。参数里凡是以 Hz、秒为单位的都靠它换算 | 30 |
| `params` | 原子的参数，只写要改的 | 各参数的默认值 |
| `subject` | 作用对象。图形：`{ points, closed, fill, strokeWidth }`；文字：`{ text, lineHeight }`；只算属性的原子不需要 | — |
| `ease` | 属性原子用的时间曲线，通常来自一个节奏原子（见下） | 两头慢中间快 |
| `items` | 编排的先后原子要排序的各个位置；连线要连的点；轨迹走过的路线；运动模糊的上一帧和这一帧位置 | — |
| `seed` | 固定所有随机和噪声 | 0 |
| `id` | 多个对象共用一个 seed 时，用不同的 id 让它们随机得不一样 | `"subject"` |

`frame` 早于 `startFrame` 时返回起始状态，晚于结束时返回终值。也就是说，让一个元素“第 40 帧才入场”，只要 `startFrame: 40` 并且每帧照常调用——入场前它自然处在入场动作的起点（比如透明或缩到 0）。

脚本的 `meta` 导出（也挂在函数的 `.meta` 上）是这个原子的机器可读描述：`id`、名称、说明、角色、能作用的对象、改写的属性、每个参数的单位、范围和默认值。

## 返回值

| 字段 | 含义 |
|---|---|
| `progress` | 进行到哪了，0–1 |
| `position` | 位置**偏移** `[dx, dy]`，px，加到元素自己的位置上 |
| `rotation` | 旋转角度，度，顺时针，绕元素原点 |
| `scale` | 等比缩放倍率，绕元素原点 |
| `stretch` | 在 `scale` 之后再乘的横向、纵向缩放；翻转时其中一个经过 0，负值表示镜像 |
| `opacity` | 不透明度，0–1 |
| `color` | 改颜色的原子才有：这一帧的颜色 |
| `layers` | 作用对象是图形时：这一帧要画的内容（见下） |
| `lines` | 作用对象是文字时：每行的 `text`、纵向偏移 `y`、`opacity`，逐字原子还有 `glyphs` |
| `pieces` | 转场与裁切：只画这些区域。区域按对象自身包围盒的比例描述；空数组表示什么都不画 |
| `filters` | 要对画出来的像素做的处理，顺序执行 |
| `value` | 节奏原子：曲线在这一帧的值 |
| `copies` | 编排原子：每个副本的 `offset`、`rotation`、`scale`、`flip`、`delay`、`opacity`、`slot` 和 `ghost` |

一个原子只改它声明要改的那几项，其余保持初值（偏移 0、旋转 0、缩放 1、拉伸 [1, 1]、不透明度 1），所以结果总是可以直接套用。

`layers` 是一组图层，每层的 `shapes` 是若干形状：`paths`（折线点列，相对元素原点，px）、`closed`、`fill`、`strokeWidth`、`opacity`，以及可选的裁剪多边形 `clip`。

## 画出来

用 Canvas 2D 时交给 `draw.mjs`：

```js
import ripple from './gen.ripple.mjs';
import { drawAtom } from './draw.mjs';

const ring = Array.from({ length: 48 }, (_, i) => [40 * Math.cos(i / 48 * Math.PI * 2), 40 * Math.sin(i / 48 * Math.PI * 2)]);
const out = ripple({ frame, durationFrames: 120, subject: { points: ring, closed: true, strokeWidth: 4 } });
drawAtom(ctx, out, { x: 640, y: 360, color: '#ffd166' });
```

`drawAtom(ctx, out, { x, y, color, font, pixelScale })` 只往画布上**添加**内容，不清屏也不画背景：先画你自己的底，再一个个画元素，后画的在上面。文字需要传 `font`（如 `'96px system-ui'`），字体由宿主负责加载。`pixelScale` 用于整体缩小或放大绘制（比如半分辨率预览）。`draw.mjs` 还导出 `drawSubject`，可以直接画合并好的结果（见下）。

不用 Canvas 也可以：只算属性的原子返回的就是几个数，直接用到 DOM 元素、视频图层、Three.js 对象上都行。`layers` 里只是折线和填充，画成 SVG 或交给别的渲染器也不难；`pieces` 和 `filters` 要自己实现对应处理，或者沿用 `draw.mjs`。

## 把原子拼起来

脚本彼此独立，组合由你的代码决定。场景 JSON 和命令行工具按同样的规则组合，见 [场景编排](../references/composition.md)。

**节奏交给属性**：节奏原子不画东西，只给曲线。把它包成函数传给属性原子的 `ease`：

```js
import move from './prop.move.mjs';
import spring from './timing.spring.mjs';

const curve = (t) => spring({ frame: t, durationFrames: 1 }).value;
const out = move({ frame, durationFrames: 30, params: { fromPx: -200, toPx: 0 }, ease: curve });
```

**编排给出副本**：布局原子（阵列、环形、网格、镜像、跟随、拖影）返回 `copies`；先后原子（错开、扩散、乱序）给每个位置一个延迟。对每个副本用 `frame - copy.delay` 去求其他原子，再平移 `copy.offset`、旋转 `copy.rotation`、缩放 `copy.scale`、乘 `copy.opacity`；`copy.flip` 为 -1 的方向位移取反、图形镜像。`ghost > 0` 的是残影或跟随者，先画。完整例子见 [example.html](example.html)。

**同时生效**（改的是不同属性，或者是循环、质感）：分别调用，把结果合起来——`position` 相加，`rotation` 相加，`scale`、`opacity` 和 `stretch` 相乘，`filters` 依次拼接。

```js
const shape = rotate({ frame, durationFrames: 90, subject, params: { fromDeg: 0, toDeg: 360 } });
const breath = breathe({ frame, durationFrames: 90 });
const glowing = glow({ frame, durationFrames: 90 });
drawAtom(ctx, { ...shape, scale: shape.scale * breath.scale, filters: glowing.filters }, { x, y, color });
```

**先后接力**（入场 → 强调 → 退场）：同一属性的几个原子各给 `startFrame` 和 `durationFrames`，每帧用“已经开始的里面最晚的那个”的结果；还没有任何一个开始时，用最早那个（它会返回自己的起始状态）。

```js
const steps = [
  { atom: scale, startFrame: 0, durationFrames: 20, params: { from: 0, to: 1 } },
  { atom: scale, startFrame: 110, durationFrames: 20, params: { from: 1, to: 0 } },
];
const current = steps.findLast((step) => frame >= step.startFrame) ?? steps[0];
const out = current.atom({ frame, ...current });
```

接力处不会自动对齐：后一个从它自己的起始值开始，所以让它等于前一个的终值。重画图形的原子（变形、碎裂、粒子、波纹）同一时刻一个元素只用一个。

## 随机与可复现

带随机或噪声的原子（漂浮、闪烁、乱序、溶解、解码、颗粒、故障、粒子、碎裂）只由 `seed`、`id` 和时间决定结果，不调用 `Math.random`。同一条视频里想让两个元素随机得不一样，给不同的 `id`；想整体换一种随机，换 `seed`。

## 运行环境

- 脚本是标准 ES 模块。算属性和图形的部分在浏览器和 Node.js 里都能跑；`draw.mjs` 需要 Canvas 2D（浏览器，或提供 `OffscreenCanvas` 的环境）。
- 浏览器不允许从 `file://` 直接加载模块：用本地服务器打开页面，或者把脚本打包、内联进页面。
- 这些脚本由 MotionFlux 的同一份源码生成，和本 Skill 的命令行工具、场景 JSON 用的是同一套实现，结果一致。优先调参数；需要扩展实现时保留原包并在宿主项目修改。

## 组合画面检查

对齐、蒙版与前后层级属于宿主构图，原子不会自动修正。开始组合前读 [时间与画面检查](../references/quality.md)，尤其检查基线、共享枢轴、绘制顺序与首尾接缝。
