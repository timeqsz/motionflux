# 圆形展开 Iris · `transition.iris`

从一点开始圆形张开或收拢。

- **族**：转场（出现消失）
- **角色**：属性动画：同一对象上写同一属性的片段轮流生效
- **作用对象**：文字、图形（折线轮廓）
- **改写**：pieces（可见区域）
- **脚本**：[`transition.iris.mjs`](transition.iris.mjs)，独立文件，不依赖别的脚本；画到画布上另需 [`draw.mjs`](draw.mjs)

## 参数

| 参数 | 含义 | 单位 | 范围 | 默认 |
|---|---|---|---|---|
| `mode` | 方向 | 选项 | `in`（出现）、`out`（消失） | `in` |
| `centerX` | 圆心 X（比例） | 比例 | 0 – 1 | 0.5 |
| `centerY` | 圆心 Y（比例） | 比例 | 0 – 1 | 0.5 |

没写的参数取默认值；越界或写错名字会抛出带说明的错误。

## 在自己的代码里用

每一帧调用一次，传入当前帧号，拿回这一帧的结果。同样的输入永远得到同样的输出，可以任意跳帧、倒着取。

```js
import transitionIris from './atoms/transition.iris.mjs';
import { drawAtom } from './atoms/draw.mjs';

const out = transitionIris({
  frame,                       // 宿主时间线上的当前帧，可以是小数
  startFrame: 0,               // 这个原子从第几帧开始
  durationFrames: 48,          // 持续多少帧
  fps: 30,
  subject: { points: /* 9 个点，见 assets/examples/transition.iris.scene.json */, closed: true, fill: true, strokeWidth: 5 },
  params: {mode: "in", centerX: 0.5, centerY: 0.5},
});

// 画到 Canvas 2D 上：x、y 是图形原点在画布上的位置
drawAtom(ctx, out, { x: 320, y: 200, color: '#1d201d' });
```

返回值：

- `out.progress`：原子进行到哪了，0–1。开始前为 0（保持起始状态），结束后为 1（保持终值）。
- `out.pieces`：只画这些区域。区域按对象自身包围盒的比例描述；空数组表示什么都不画，没有这一项表示全部画出。
`draw.mjs` 会按这个结构画；也可以自己读它，画到 SVG、WebGL 或别的地方。

通用约定（时间、随机种子、多个原子叠加）见 [README.md](README.md)。

## 在场景 JSON 里用

```json
{"id":"my-clip","target":"节点 ID","recipe":"transition.iris","startFrame":0,"durationFrames":48,"fillAfter":"hold","params":{"mode":"in","centerX":0.5,"centerY":0.5}}
```

完整的最小场景：`assets/examples/transition.iris.scene.json`。

## 直接出一条素材

```sh
node scripts/motion.mjs scaffold transition.iris --out work/transition.iris.scene.json --width 1920 --height 1080 --duration 72
node scripts/motion.mjs render work/transition.iris.scene.json --out work/transition.iris.mov --transparent
```
