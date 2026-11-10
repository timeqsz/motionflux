# 扩散 Cascade · `choreo.cascade`

离起点越远的副本开始得越晚，动作像水波一样从一点传开。

- **族**：编排（谁先谁后）
- **角色**：先后延迟：让副本依次开始
- **作用对象**：文字、图形（折线轮廓）
- **改写**：copies[].delay（延迟）
- **脚本**：[`choreo.cascade.mjs`](choreo.cascade.mjs)，独立文件，不依赖别的脚本

## 参数

| 参数 | 含义 | 单位 | 范围 | 默认 |
|---|---|---|---|---|
| `framesPer100Px` | 每 100px 延迟 | 帧 | 0 – 60 | 6 |
| `originX` | 起点 X | px | -2000 – 2000 | 0 |
| `originY` | 起点 Y | px | -2000 – 2000 | 0 |

没写的参数取默认值；越界或写错名字会抛出带说明的错误。

## 在自己的代码里用

每一帧调用一次，传入当前帧号，拿回这一帧的结果。同样的输入永远得到同样的输出，可以任意跳帧、倒着取。

```js
import choreoCascade from './atoms/choreo.cascade.mjs';

const out = choreoCascade({
  frame,                       // 宿主时间线上的当前帧，可以是小数
  startFrame: 0,               // 这个原子从第几帧开始
  durationFrames: 84,          // 持续多少帧
  fps: 30,
  items: [[-100, 0], [0, 0], [100, 0]],   // 要排先后的几个对象的位置
  params: {framesPer100Px: 6, originX: 0, originY: 0},
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
{"id":"my-clip","target":"节点 ID","recipe":"choreo.cascade","startFrame":0,"durationFrames":84,"fillAfter":"hold","params":{"framesPer100Px":6,"originX":0,"originY":0}}
```

示例场景里它和这些原子一起用在同一对象上：`choreo.grid`、`timing.overshoot`、`prop.scale`。
完整的最小场景：`assets/examples/choreo.cascade.scene.json`。

## 直接出一条素材

```sh
node scripts/motion.mjs scaffold choreo.cascade --out work/choreo.cascade.scene.json --width 1920 --height 1080 --duration 84
node scripts/motion.mjs render work/choreo.cascade.scene.json --out work/choreo.cascade.mov --transparent
```
