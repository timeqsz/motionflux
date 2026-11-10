# 逐字 Per Character · `text.chars`

每个字依次升起并显现；片段时长包含错开的时间。

- **族**：文字（字的动法）
- **角色**：属性动画：同一对象上写同一属性的片段轮流生效
- **作用对象**：文字
- **改写**：lines[].glyphs（逐字偏移与透明度）
- **脚本**：[`text.chars.mjs`](text.chars.mjs)，独立文件，不依赖别的脚本；画到画布上另需 [`draw.mjs`](draw.mjs)

## 参数

| 参数 | 含义 | 单位 | 范围 | 默认 |
|---|---|---|---|---|
| `stepFrames` | 每字间隔 | 帧 | 0 – 30 | 3 |
| `distancePx` | 升起距离 | px | -300 – 300 | 36 |

没写的参数取默认值；越界或写错名字会抛出带说明的错误。

## 在自己的代码里用

每一帧调用一次，传入当前帧号，拿回这一帧的结果。同样的输入永远得到同样的输出，可以任意跳帧、倒着取。

```js
import textChars from './atoms/text.chars.mjs';
import { drawAtom } from './atoms/draw.mjs';

const out = textChars({
  frame,                       // 宿主时间线上的当前帧，可以是小数
  startFrame: 0,               // 这个原子从第几帧开始
  durationFrames: 40,          // 持续多少帧
  fps: 30,
  subject: { text: "MOTION", lineHeight: 104 },
  params: {stepFrames: 3, distancePx: 36},
});

// 画到 Canvas 2D 上：x、y 是第一行文字左侧基线在画布上的位置
drawAtom(ctx, out, { x: 136, y: 240, color: '#1d201d', font: '104px "你的字体"' });
```

返回值：

- `out.progress`：原子进行到哪了，0–1。开始前为 0（保持起始状态），结束后为 1（保持终值）。
- `out.lines`：每行的 `text`、相对首行基线的纵向偏移 `y`（px）和 `opacity`；逐字原子还有 `glyphs`，每个字的 `dx`、`dy`、`opacity`、`scale`。
`draw.mjs` 会按这个结构画；也可以自己读它，画到 SVG、WebGL 或别的地方。

通用约定（时间、随机种子、多个原子叠加）见 [README.md](README.md)。

## 在场景 JSON 里用

```json
{"id":"my-clip","target":"节点 ID","recipe":"text.chars","startFrame":0,"durationFrames":40,"fillAfter":"hold","params":{"stepFrames":3,"distancePx":36}}
```

完整的最小场景：`assets/examples/text.chars.scene.json`。

## 直接出一条素材

```sh
node scripts/motion.mjs scaffold text.chars --out work/text.chars.scene.json --width 1920 --height 1080 --duration 70 --text "你的文字"
node scripts/motion.mjs render work/text.chars.scene.json --out work/text.chars.mov --transparent
```
