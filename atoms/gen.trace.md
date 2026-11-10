# 轨迹 Trace · `gen.trace`

画出对象（和每个副本）原点刚刚走过的路线，越旧越淡。

- **族**：生成（凭空产生）
- **角色**：场景连线：在场景坐标里画线
- **作用对象**：文字、图形（折线轮廓）
- **改写**：layers（连线）
- **脚本**：[`gen.trace.mjs`](gen.trace.mjs)，独立文件，不依赖别的脚本；画到画布上另需 [`draw.mjs`](draw.mjs)

## 参数

| 参数 | 含义 | 单位 | 范围 | 默认 |
|---|---|---|---|---|
| `lengthFrames` | 轨迹长度 | 帧 | 1 – 240 | 30 |
| `widthPx` | 线宽 | px | 0.5 – 40 | 3 |

没写的参数取默认值；越界或写错名字会抛出带说明的错误。

## 在自己的代码里用

每一帧调用一次，传入当前帧号，拿回这一帧的结果。同样的输入永远得到同样的输出，可以任意跳帧、倒着取。

```js
import genTrace from './atoms/gen.trace.mjs';
import { drawAtom } from './atoms/draw.mjs';

const out = genTrace({
  frame,                       // 宿主时间线上的当前帧，可以是小数
  startFrame: 0,               // 这个原子从第几帧开始
  durationFrames: 240,          // 持续多少帧
  fps: 30,
  items: history,              // 对象原点最近走过的位置，从旧到新
  params: {lengthFrames: 36, widthPx: 3},
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
{"id":"my-clip","target":"节点 ID","recipe":"gen.trace","startFrame":0,"durationFrames":240,"fillAfter":"hold","params":{"lengthFrames":36,"widthPx":3}}
```

示例场景里它和这些原子一起用在同一对象上：`loop.swing`、`loop.swing`。
完整的最小场景：`assets/examples/gen.trace.scene.json`。

## 直接出一条素材

```sh
node scripts/motion.mjs scaffold gen.trace --out work/gen.trace.scene.json --width 1920 --height 1080 --duration 240
node scripts/motion.mjs render work/gen.trace.scene.json --out work/gen.trace.mov --transparent
```
