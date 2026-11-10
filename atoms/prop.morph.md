# 变形 Morph · `prop.morph`

轮廓按弧长对齐后逐点过渡到目标形状，不会扭成一团。

- **族**：属性（变什么）
- **角色**：属性动画：同一对象上写同一属性的片段轮流生效
- **作用对象**：图形（折线轮廓）
- **改写**：layers（重画后的图形）
- **脚本**：[`prop.morph.mjs`](prop.morph.mjs)，独立文件，不依赖别的脚本；画到画布上另需 [`draw.mjs`](draw.mjs)

## 参数

| 参数 | 含义 | 单位 | 范围 | 默认 |
|---|---|---|---|---|
| `target` | 目标形状 | 选项 | `circle`（圆形）、`triangle`（三角形）、`square`（方形）、`star`（星形） | `star` |
| `amount` | 变形程度 | 比例 | 0 – 1 | 1 |

没写的参数取默认值；越界或写错名字会抛出带说明的错误。

## 在自己的代码里用

每一帧调用一次，传入当前帧号，拿回这一帧的结果。同样的输入永远得到同样的输出，可以任意跳帧、倒着取。

```js
import propMorph from './atoms/prop.morph.mjs';
import { drawAtom } from './atoms/draw.mjs';

const out = propMorph({
  frame,                       // 宿主时间线上的当前帧，可以是小数
  startFrame: 0,               // 这个原子从第几帧开始
  durationFrames: 54,          // 持续多少帧
  fps: 30,
  subject: { points: /* 48 个点，见 assets/examples/prop.morph.scene.json */, closed: true, strokeWidth: 5 },
  params: {target: "star", amount: 1},
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
{"id":"my-clip","target":"节点 ID","recipe":"prop.morph","startFrame":0,"durationFrames":54,"fillAfter":"hold","params":{"target":"star","amount":1}}
```

完整的最小场景：`assets/examples/prop.morph.scene.json`。

## 直接出一条素材

```sh
node scripts/motion.mjs scaffold prop.morph --out work/prop.morph.scene.json --width 1920 --height 1080 --duration 76
node scripts/motion.mjs render work/prop.morph.scene.json --out work/prop.morph.mov --transparent
```
