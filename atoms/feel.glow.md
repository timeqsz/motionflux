# 辉光 Glow · `feel.glow`

把对象自身模糊后叠回去，周围泛出同色的光。

- **族**：质感（叠在上面）
- **角色**：画面质感：叠在画面上，不改变运动
- **作用对象**：文字、图形（折线轮廓）
- **改写**：filters（辉光）
- **脚本**：[`feel.glow.mjs`](feel.glow.mjs)，独立文件，不依赖别的脚本；画到画布上另需 [`draw.mjs`](draw.mjs)

## 参数

| 参数 | 含义 | 单位 | 范围 | 默认 |
|---|---|---|---|---|
| `radiusPx` | 光晕半径 | px | 0 – 80 | 14 |
| `strength` | 强度 | 比例 | 0 – 4 | 1.2 |

没写的参数取默认值；越界或写错名字会抛出带说明的错误。

## 在自己的代码里用

每一帧调用一次，传入当前帧号，拿回这一帧的结果。同样的输入永远得到同样的输出，可以任意跳帧、倒着取。

```js
import feelGlow from './atoms/feel.glow.mjs';
import { drawAtom } from './atoms/draw.mjs';

const out = feelGlow({
  frame,                       // 宿主时间线上的当前帧，可以是小数
  startFrame: 0,               // 这个原子从第几帧开始
  durationFrames: 80,          // 持续多少帧
  fps: 30,
  subject: { points: /* 10 个点，见 assets/examples/feel.glow.scene.json */, closed: true, strokeWidth: 6 },
  params: {radiusPx: 12, strength: 1.4},
});

// 画到 Canvas 2D 上：x、y 是图形原点在画布上的位置
drawAtom(ctx, out, { x: 320, y: 200, color: '#7a5bc7' });
```

返回值：

- `out.progress`：原子进行到哪了，0–1。开始前为 0（保持起始状态），结束后为 1（保持终值）。
- `out.filters`：要对画出来的像素做的处理。自己画时需要实现对应的滤镜；直接用 `draw.mjs` 最省事。
`draw.mjs` 会按这个结构画；也可以自己读它，画到 SVG、WebGL 或别的地方。

通用约定（时间、随机种子、多个原子叠加）见 [README.md](README.md)。

## 在场景 JSON 里用

```json
{"id":"my-clip","target":"节点 ID","recipe":"feel.glow","startFrame":0,"durationFrames":80,"fillAfter":"hold","params":{"radiusPx":12,"strength":1.4}}
```

示例场景里它和这些原子一起用在同一对象上：`prop.draw`。
完整的最小场景：`assets/examples/feel.glow.scene.json`。

## 直接出一条素材

```sh
node scripts/motion.mjs scaffold feel.glow --out work/feel.glow.scene.json --width 1920 --height 1080 --duration 80
node scripts/motion.mjs render work/feel.glow.scene.json --out work/feel.glow.mov --transparent
```
