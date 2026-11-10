# 解码 Decode · `text.decode`

字符先随机乱跳，再从左到右依次定格成正文。

- **族**：文字（字的动法）
- **角色**：属性动画：同一对象上写同一属性的片段轮流生效
- **作用对象**：文字
- **改写**：lines[].text（每行文字）
- **脚本**：[`text.decode.mjs`](text.decode.mjs)，独立文件，不依赖别的脚本；画到画布上另需 [`draw.mjs`](draw.mjs)

## 参数

| 参数 | 含义 | 单位 | 范围 | 默认 |
|---|---|---|---|---|
| `rateHz` | 乱跳频率 | Hz | 1 – 60 | 20 |
| `charset` | 乱码字符 | 选项 | `own`（用正文的字）、`symbols`（符号）、`binary`（0 和 1） | `symbols` |

没写的参数取默认值；越界或写错名字会抛出带说明的错误。

## 在自己的代码里用

每一帧调用一次，传入当前帧号，拿回这一帧的结果。同样的输入永远得到同样的输出，可以任意跳帧、倒着取。

```js
import textDecode from './atoms/text.decode.mjs';
import { drawAtom } from './atoms/draw.mjs';

const out = textDecode({
  frame,                       // 宿主时间线上的当前帧，可以是小数
  startFrame: 0,               // 这个原子从第几帧开始
  durationFrames: 54,          // 持续多少帧
  fps: 30,
  subject: { text: "SYSTEM\nONLINE", lineHeight: 82 },
  params: {rateHz: 20, charset: "symbols"},
  seed: 42,                    // 固定随机结果；换一个数就换一组
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
{"id":"my-clip","target":"节点 ID","recipe":"text.decode","startFrame":0,"durationFrames":54,"fillAfter":"hold","params":{"rateHz":20,"charset":"symbols"}}
```

完整的最小场景：`assets/examples/text.decode.scene.json`。

## 直接出一条素材

```sh
node scripts/motion.mjs scaffold text.decode --out work/text.decode.scene.json --width 1920 --height 1080 --duration 80 --text "你的文字"
node scripts/motion.mjs render work/text.decode.scene.json --out work/text.decode.mov --transparent
```
