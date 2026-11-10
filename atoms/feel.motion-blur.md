# 运动模糊 Motion Blur · `feel.motion-blur`

按真实速度沿运动方向拉虚，快的时候虚、停下就清楚。

- **族**：质感（叠在上面）
- **角色**：画面质感：叠在画面上，不改变运动
- **作用对象**：文字、图形（折线轮廓）
- **改写**：filters（模糊）
- **脚本**：[`feel.motion-blur.mjs`](feel.motion-blur.mjs)，独立文件，不依赖别的脚本；画到画布上另需 [`draw.mjs`](draw.mjs)

## 参数

| 参数 | 含义 | 单位 | 范围 | 默认 |
|---|---|---|---|---|
| `shutterDeg` | 快门角度 | 度 | 0 – 720 | 180 |

没写的参数取默认值；越界或写错名字会抛出带说明的错误。

## 在自己的代码里用

每一帧调用一次，传入当前帧号，拿回这一帧的结果。同样的输入永远得到同样的输出，可以任意跳帧、倒着取。

```js
import feelMotionBlur from './atoms/feel.motion-blur.mjs';
import { drawAtom } from './atoms/draw.mjs';

const out = feelMotionBlur({
  frame,                       // 宿主时间线上的当前帧，可以是小数
  startFrame: 0,               // 这个原子从第几帧开始
  durationFrames: 240,          // 持续多少帧
  fps: 30,
  items: [previous, current],   // 对象原点上一帧和这一帧的位置
  params: {shutterDeg: 360},
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
{"id":"my-clip","target":"节点 ID","recipe":"feel.motion-blur","startFrame":0,"durationFrames":240,"fillAfter":"hold","params":{"shutterDeg":360}}
```

示例场景里它和这些原子一起用在同一对象上：`loop.swing`。
完整的最小场景：`assets/examples/feel.motion-blur.scene.json`。

## 直接出一条素材

```sh
node scripts/motion.mjs scaffold feel.motion-blur --out work/feel.motion-blur.scene.json --width 1920 --height 1080 --duration 240
node scripts/motion.mjs render work/feel.motion-blur.scene.json --out work/feel.motion-blur.mov --transparent
```
