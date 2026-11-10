# 镜像 Mirror · `choreo.mirror`

在对称位置放一个镜像副本，它的动作也左右或上下相反。

- **族**：编排（谁先谁后）
- **角色**：复制排布：把一个对象变成多个副本
- **作用对象**：文字、图形（折线轮廓）
- **改写**：copies（副本）
- **脚本**：[`choreo.mirror.mjs`](choreo.mirror.mjs)，独立文件，不依赖别的脚本

## 参数

| 参数 | 含义 | 单位 | 范围 | 默认 |
|---|---|---|---|---|
| `axis` | 对称轴 | 选项 | `x`（左右对称）、`y`（上下对称）、`both`（四向对称） | `x` |
| `distancePx` | 两侧间距 | px | 0 – 2000 | 200 |

没写的参数取默认值；越界或写错名字会抛出带说明的错误。

## 在自己的代码里用

每一帧调用一次，传入当前帧号，拿回这一帧的结果。同样的输入永远得到同样的输出，可以任意跳帧、倒着取。

```js
import choreoMirror from './atoms/choreo.mirror.mjs';

const out = choreoMirror({
  frame,                       // 宿主时间线上的当前帧，可以是小数
  startFrame: 0,               // 这个原子从第几帧开始
  durationFrames: 80,          // 持续多少帧
  fps: 30,
  params: {axis: "x", distancePx: 60},
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
{"id":"my-clip","target":"节点 ID","recipe":"choreo.mirror","startFrame":0,"durationFrames":80,"fillAfter":"hold","params":{"axis":"x","distancePx":60}}
```

示例场景里它和这些原子一起用在同一对象上：`prop.move`、`prop.rotate`。
完整的最小场景：`assets/examples/choreo.mirror.scene.json`。

## 直接出一条素材

```sh
node scripts/motion.mjs scaffold choreo.mirror --out work/choreo.mirror.scene.json --width 1920 --height 1080 --duration 80
node scripts/motion.mjs render work/choreo.mirror.scene.json --out work/choreo.mirror.mov --transparent
```
