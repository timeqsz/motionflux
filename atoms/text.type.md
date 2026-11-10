# 打字 Typewriter · `text.type`

字一个个打出来，光标跟在后面闪。

- **族**：文字（字的动法）
- **角色**：属性动画：同一对象上写同一属性的片段轮流生效
- **作用对象**：文字
- **改写**：lines[].text（每行文字）
- **脚本**：[`text.type.mjs`](text.type.mjs)，独立文件，不依赖别的脚本；画到画布上另需 [`draw.mjs`](draw.mjs)

## 参数

| 参数 | 含义 | 单位 | 范围 | 默认 |
|---|---|---|---|---|
| `cursor` | 光标 | 选项 | `bar`（竖线）、`block`（方块）、`none`（不显示） | `bar` |
| `blinkHz` | 光标闪烁 | Hz | 0 – 6 | 2 |

没写的参数取默认值；越界或写错名字会抛出带说明的错误。

## 在自己的代码里用

每一帧调用一次，传入当前帧号，拿回这一帧的结果。同样的输入永远得到同样的输出，可以任意跳帧、倒着取。

```js
import textType from './atoms/text.type.mjs';
import { drawAtom } from './atoms/draw.mjs';

const out = textType({
  frame,                       // 宿主时间线上的当前帧，可以是小数
  startFrame: 0,               // 这个原子从第几帧开始
  durationFrames: 54,          // 持续多少帧
  fps: 30,
  subject: { text: "Hello,\nmotion.", lineHeight: 82 },
  params: {cursor: "bar", blinkHz: 2},
});

// 画到 Canvas 2D 上：x、y 是第一行文字左侧基线在画布上的位置
drawAtom(ctx, out, { x: 200, y: 180, color: '#1d201d', font: '64px "你的字体"' });
```

返回值：

- `out.progress`：原子进行到哪了，0–1。开始前为 0（保持起始状态），结束后为 1（保持终值）。
- `out.lines`：每行的 `text`、相对首行基线的纵向偏移 `y`（px）和 `opacity`；逐字原子还有 `glyphs`，每个字的 `dx`、`dy`、`opacity`、`scale`。
`draw.mjs` 会按这个结构画；也可以自己读它，画到 SVG、WebGL 或别的地方。

通用约定（时间、随机种子、多个原子叠加）见 [README.md](README.md)。

## 在场景 JSON 里用

```json
{"id":"my-clip","target":"节点 ID","recipe":"text.type","startFrame":0,"durationFrames":54,"fillAfter":"hold","params":{"cursor":"bar","blinkHz":2}}
```

完整的最小场景：`assets/examples/text.type.scene.json`。

## 直接出一条素材

```sh
node scripts/motion.mjs scaffold text.type --out work/text.type.scene.json --width 1920 --height 1080 --duration 96 --text "你的文字"
node scripts/motion.mjs render work/text.type.scene.json --out work/text.type.mov --transparent
```
