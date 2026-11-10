# 连线 Link · `gen.link`

用线把副本按顺序或按距离连起来，副本移动时线跟着走。

- **族**：生成（凭空产生）
- **角色**：场景连线：在场景坐标里画线
- **作用对象**：文字、图形（折线轮廓）
- **改写**：layers（连线）
- **脚本**：[`gen.link.mjs`](gen.link.mjs)，独立文件，不依赖别的脚本；画到画布上另需 [`draw.mjs`](draw.mjs)

## 参数

| 参数 | 含义 | 单位 | 范围 | 默认 |
|---|---|---|---|---|
| `mode` | 连法 | 选项 | `chain`（按顺序首尾相连）、`near`（连接距离内的） | `near` |
| `maxDistancePx` | 最远连接距离 | px | 0 – 2000 | 120 |
| `widthPx` | 线宽 | px | 0.5 – 20 | 1.5 |

没写的参数取默认值；越界或写错名字会抛出带说明的错误。

## 在自己的代码里用

每一帧调用一次，传入当前帧号，拿回这一帧的结果。同样的输入永远得到同样的输出，可以任意跳帧、倒着取。

```js
import genLink from './atoms/gen.link.mjs';
import { drawAtom } from './atoms/draw.mjs';

const out = genLink({
  frame,                       // 宿主时间线上的当前帧，可以是小数
  startFrame: 0,               // 这个原子从第几帧开始
  durationFrames: 240,          // 持续多少帧
  fps: 30,
  items: [[-100, 0], [0, 40], [100, 0]],   // 要连起来的点
  params: {mode: "near", maxDistancePx: 130, widthPx: 1.5},
});

// out.layers 和 items 在同一坐标系里，直接画：
drawAtom(ctx, out, { color: '#1d201d' });
```

返回值：

- `out.progress`：原子进行到哪了，0–1。开始前为 0（保持起始状态），结束后为 1（保持终值）。
- `out.layers`：要画的内容。每层有若干 `shapes`（`paths` 是折线点列，另有 `closed`、`fill`、`strokeWidth`、`opacity`，可能带裁剪多边形 `clip`）。坐标相对图形原点。
`draw.mjs` 会按这个结构画；也可以自己读它，画到 SVG、WebGL 或别的地方。

通用约定（时间、随机种子、多个原子叠加）见 [README.md](README.md)。

## 在场景 JSON 里用

```json
{"id":"my-clip","target":"节点 ID","recipe":"gen.link","startFrame":0,"durationFrames":240,"fillAfter":"hold","params":{"mode":"near","maxDistancePx":130,"widthPx":1.5}}
```

示例场景里它和这些原子一起用在同一对象上：`choreo.grid`、`loop.float`。
完整的最小场景：`assets/examples/gen.link.scene.json`。

## 直接出一条素材

```sh
node scripts/motion.mjs scaffold gen.link --out work/gen.link.scene.json --width 1920 --height 1080 --duration 240
node scripts/motion.mjs render work/gen.link.scene.json --out work/gen.link.mov --transparent
```
