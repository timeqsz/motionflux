# 颗粒 Grain · `feel.grain`

胶片似的随机颗粒，按设定频率刷新。

- **族**：质感（叠在上面）
- **角色**：画面质感：叠在画面上，不改变运动
- **作用对象**：文字、图形（折线轮廓）
- **改写**：filters（颗粒）
- **脚本**：[`feel.grain.mjs`](feel.grain.mjs)，独立文件，不依赖别的脚本；画到画布上另需 [`draw.mjs`](draw.mjs)

## 参数

| 参数 | 含义 | 单位 | 范围 | 默认 |
|---|---|---|---|---|
| `amount` | 强度 | 比例 | 0 – 1 | 0.55 |
| `sizePx` | 颗粒大小 | px | 1 – 12 | 2 |
| `rateHz` | 刷新频率 | Hz | 1 – 60 | 12 |

没写的参数取默认值；越界或写错名字会抛出带说明的错误。

## 在自己的代码里用

每一帧调用一次，传入当前帧号，拿回这一帧的结果。同样的输入永远得到同样的输出，可以任意跳帧、倒着取。

```js
import feelGrain from './atoms/feel.grain.mjs';
import { drawAtom } from './atoms/draw.mjs';

const out = feelGrain({
  frame,                       // 宿主时间线上的当前帧，可以是小数
  startFrame: 0,               // 这个原子从第几帧开始
  durationFrames: 240,          // 持续多少帧
  fps: 30,
  subject: { points: /* 48 个点，见 assets/examples/feel.grain.scene.json */, closed: true, fill: true, strokeWidth: 5 },
  params: {amount: 0.55, sizePx: 2, rateHz: 12},
  seed: 42,                    // 固定随机结果；换一个数就换一组
});

// 画到 Canvas 2D 上：x、y 是图形原点在画布上的位置
drawAtom(ctx, out, { x: 320, y: 200, color: '#1d201d' });
```

返回值：

- `out.progress`：原子进行到哪了，0–1。开始前为 0（保持起始状态），结束后为 1（保持终值）。
- `out.filters`：要对画出来的像素做的处理。自己画时需要实现对应的滤镜；直接用 `draw.mjs` 最省事。
`draw.mjs` 会按这个结构画；也可以自己读它，画到 SVG、WebGL 或别的地方。

通用约定（时间、随机种子、多个原子叠加）见 [README.md](README.md)。

## 在场景 JSON 里用

```json
{"id":"my-clip","target":"节点 ID","recipe":"feel.grain","startFrame":0,"durationFrames":240,"fillAfter":"hold","params":{"amount":0.55,"sizePx":2,"rateHz":12}}
```

完整的最小场景：`assets/examples/feel.grain.scene.json`。

## 直接出一条素材

```sh
node scripts/motion.mjs scaffold feel.grain --out work/feel.grain.scene.json --width 1920 --height 1080 --duration 240
node scripts/motion.mjs render work/feel.grain.scene.json --out work/feel.grain.mov --transparent
```
