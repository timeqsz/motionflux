# 粒子 Particles · `gen.particles`

从原点持续喷出粒子，受重力下落并逐渐变小消失；每个粒子的轨迹都可直接按时间求值。

- **族**：生成（凭空产生）
- **角色**：属性动画：同一对象上写同一属性的片段轮流生效
- **作用对象**：图形（折线轮廓）。它自己生成图形，不读取轮廓，只用位置、颜色和线宽
- **改写**：layers（重画后的图形）
- **脚本**：[`gen.particles.mjs`](gen.particles.mjs)，独立文件，不依赖别的脚本；画到画布上另需 [`draw.mjs`](draw.mjs)

## 参数

| 参数 | 含义 | 单位 | 范围 | 默认 |
|---|---|---|---|---|
| `count` | 同时在飞 | 个，整数 | 1 – 300 | 48 |
| `speedPx` | 速度 | px/秒 | 0 – 2000 | 260 |
| `spreadDeg` | 扩散角 | 度 | 0 – 360 | 80 |
| `gravityPx` | 重力 | px/秒² | -2000 – 4000 | 420 |
| `lifeFrames` | 寿命 | 帧，整数 | 2 – 600 | 40 |
| `sizePx` | 大小 | px | 0.5 – 60 | 7 |

没写的参数取默认值；越界或写错名字会抛出带说明的错误。

## 在自己的代码里用

每一帧调用一次，传入当前帧号，拿回这一帧的结果。同样的输入永远得到同样的输出，可以任意跳帧、倒着取。

```js
import genParticles from './atoms/gen.particles.mjs';
import { drawAtom } from './atoms/draw.mjs';

const out = genParticles({
  frame,                       // 宿主时间线上的当前帧，可以是小数
  startFrame: 0,               // 这个原子从第几帧开始
  durationFrames: 240,          // 持续多少帧
  fps: 30,
  subject: { strokeWidth: 2 },
  params: {count: 48, speedPx: 260, spreadDeg: 80, gravityPx: 420, lifeFrames: 40, sizePx: 7},
  seed: 42,                    // 固定随机结果；换一个数就换一组
});

// 画到 Canvas 2D 上：x、y 是图形原点在画布上的位置
drawAtom(ctx, out, { x: 320, y: 290, color: '#1d201d' });
```

返回值：

- `out.progress`：原子进行到哪了，0–1。开始前为 0（保持起始状态），结束后为 1（保持终值）。
- `out.layers`：要画的内容。每层有若干 `shapes`（`paths` 是折线点列，另有 `closed`、`fill`、`strokeWidth`、`opacity`，可能带裁剪多边形 `clip`）。坐标相对图形原点。
`draw.mjs` 会按这个结构画；也可以自己读它，画到 SVG、WebGL 或别的地方。

通用约定（时间、随机种子、多个原子叠加）见 [README.md](README.md)。

## 在场景 JSON 里用

```json
{"id":"my-clip","target":"节点 ID","recipe":"gen.particles","startFrame":0,"durationFrames":240,"fillAfter":"hold","params":{"count":48,"speedPx":260,"spreadDeg":80,"gravityPx":420,"lifeFrames":40,"sizePx":7}}
```

完整的最小场景：`assets/examples/gen.particles.scene.json`。

## 直接出一条素材

```sh
node scripts/motion.mjs scaffold gen.particles --out work/gen.particles.scene.json --width 1920 --height 1080 --duration 240
node scripts/motion.mjs render work/gen.particles.scene.json --out work/gen.particles.mov --transparent
```
