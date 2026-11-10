# 网格 Grid · `choreo.grid`

复制成行列整齐的矩阵，以原位置为中心。

- **族**：编排（谁先谁后）
- **角色**：复制排布：把一个对象变成多个副本
- **作用对象**：文字、图形（折线轮廓）
- **改写**：copies（副本）
- **脚本**：[`choreo.grid.mjs`](choreo.grid.mjs)，独立文件，不依赖别的脚本

## 参数

| 参数 | 含义 | 单位 | 范围 | 默认 |
|---|---|---|---|---|
| `columns` | 列数 | 个，整数 | 1 – 24 | 6 |
| `rows` | 行数 | 个，整数 | 1 – 24 | 4 |
| `gapPx` | 间距 | px | 0 – 1000 | 64 |

没写的参数取默认值；越界或写错名字会抛出带说明的错误。

## 在自己的代码里用

每一帧调用一次，传入当前帧号，拿回这一帧的结果。同样的输入永远得到同样的输出，可以任意跳帧、倒着取。

```js
import choreoGrid from './atoms/choreo.grid.mjs';

const out = choreoGrid({
  frame,                       // 宿主时间线上的当前帧，可以是小数
  startFrame: 0,               // 这个原子从第几帧开始
  durationFrames: 240,          // 持续多少帧
  fps: 30,
  params: {columns: 9, rows: 5, gapPx: 56},
});

// out.copies：每个副本画在哪、比原对象晚多少帧。对每个副本：
//   用 frame - copy.delay 去求其他原子，再把结果平移 copy.offset、旋转 copy.rotation、缩放 copy.scale、乘 copy.opacity；
//   copy.flip 为 -1 的方向要镜像（位移取反、图形翻转）。残影（ghost > 0）排在前面，先画。
```

返回值：

- `out.progress`：原子进行到哪了，0–1。开始前为 0（保持起始状态），结束后为 1（保持终值）。
- `out.copies`：每个副本的 `offset`、`rotation`、`scale`、`flip`、`delay`（帧）、`opacity`、`slot`（排布序号）和 `ghost`（0 为本体，残影从 1 起）。

通用约定（时间、随机种子、多个原子叠加）见 [README.md](README.md)。

## 在场景 JSON 里用

```json
{"id":"my-clip","target":"节点 ID","recipe":"choreo.grid","startFrame":0,"durationFrames":240,"fillAfter":"hold","params":{"columns":9,"rows":5,"gapPx":56}}
```

示例场景里它和这些原子一起用在同一对象上：`loop.wave`。
完整的最小场景：`assets/examples/choreo.grid.scene.json`。

## 直接出一条素材

```sh
node scripts/motion.mjs scaffold choreo.grid --out work/choreo.grid.scene.json --width 1920 --height 1080 --duration 240
node scripts/motion.mjs render work/choreo.grid.scene.json --out work/choreo.grid.mov --transparent
```
