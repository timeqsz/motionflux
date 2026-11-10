# 碎裂 Shatter · `gen.shatter`

把轮廓切成三角碎片，从中心向外依次炸开、旋转、下落并淡出。

- **族**：生成（凭空产生）
- **角色**：属性动画：同一对象上写同一属性的片段轮流生效
- **作用对象**：图形（折线轮廓）
- **改写**：layers（重画后的图形）
- **脚本**：[`gen.shatter.mjs`](gen.shatter.mjs)，独立文件，不依赖别的脚本；画到画布上另需 [`draw.mjs`](draw.mjs)

## 参数

| 参数 | 含义 | 单位 | 范围 | 默认 |
|---|---|---|---|---|
| `pieces` | 切分密度 | 个，整数 | 2 – 16 | 6 |
| `forcePx` | 飞散距离 | px | 0 – 2000 | 180 |
| `spinDeg` | 碎片旋转 | 度 | 0 – 1440 | 240 |
| `gravityPx` | 下落距离 | px | 0 – 2000 | 120 |
| `delayRatio` | 由内向外延迟 | 比例 | 0 – 0.9 | 0.3 |

没写的参数取默认值；越界或写错名字会抛出带说明的错误。

## 在自己的代码里用

每一帧调用一次，传入当前帧号，拿回这一帧的结果。同样的输入永远得到同样的输出，可以任意跳帧、倒着取。

```js
import genShatter from './atoms/gen.shatter.mjs';
import { drawAtom } from './atoms/draw.mjs';

const out = genShatter({
  frame,                       // 宿主时间线上的当前帧，可以是小数
  startFrame: 0,               // 这个原子从第几帧开始
  durationFrames: 60,          // 持续多少帧
  fps: 30,
  subject: { points: [[5.5109105961630896e-15, -90], [77.94228634059948, -45], [77.94228634059948, 44.999999999999986], [5.5109105961630896e-15, 90], [-77.94228634059947, 45.00000000000003], [-77.94228634059948, -45.00000000000001]], closed: true, fill: true, strokeWidth: 5 },
  params: {pieces: 6, forcePx: 180, spinDeg: 240, gravityPx: 120, delayRatio: 0.3},
  seed: 42,                    // 固定随机结果；换一个数就换一组
});

// 画到 Canvas 2D 上：x、y 是图形原点在画布上的位置
drawAtom(ctx, out, { x: 320, y: 200, color: '#1d201d' });
```

返回值：

- `out.progress`：原子进行到哪了，0–1。开始前为 0（保持起始状态），结束后为 1（保持终值）。
- `out.layers`：要画的内容。每层有若干 `shapes`（`paths` 是折线点列，另有 `closed`、`fill`、`strokeWidth`、`opacity`，可能带裁剪多边形 `clip`）。坐标相对图形原点。
`draw.mjs` 会按这个结构画；也可以自己读它，画到 SVG、WebGL 或别的地方。

通用约定（时间、随机种子、多个原子叠加）见 [README.md](README.md)。

## 在场景 JSON 里用

```json
{"id":"my-clip","target":"节点 ID","recipe":"gen.shatter","startFrame":0,"durationFrames":60,"fillAfter":"hold","params":{"pieces":6,"forcePx":180,"spinDeg":240,"gravityPx":120,"delayRatio":0.3}}
```

完整的最小场景：`assets/examples/gen.shatter.scene.json`。

## 直接出一条素材

```sh
node scripts/motion.mjs scaffold gen.shatter --out work/gen.shatter.scene.json --width 1920 --height 1080 --duration 84
node scripts/motion.mjs render work/gen.shatter.scene.json --out work/gen.shatter.mov --transparent
```
