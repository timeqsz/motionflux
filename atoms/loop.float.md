# 漂浮 Float · `loop.float`

用平滑噪声不规则地游移和微微转动，不会有规律的重复感。

- **族**：循环（一直动）
- **角色**：持续循环：叠加在其他动作之上
- **作用对象**：文字、图形（折线轮廓）
- **改写**：position（位置偏移）、rotation（旋转角度）
- **脚本**：[`loop.float.mjs`](loop.float.mjs)，独立文件，不依赖别的脚本

## 参数

| 参数 | 含义 | 单位 | 范围 | 默认 |
|---|---|---|---|---|
| `amplitudePx` | 游移幅度 | px | 0 – 300 | 40 |
| `rotateDeg` | 转动幅度 | 度 | 0 – 180 | 10 |
| `frequencyHz` | 变化频率 | Hz | 0 – 6 | 0.5 |

没写的参数取默认值；越界或写错名字会抛出带说明的错误。

## 在自己的代码里用

每一帧调用一次，传入当前帧号，拿回这一帧的结果。同样的输入永远得到同样的输出，可以任意跳帧、倒着取。

```js
import loopFloat from './atoms/loop.float.mjs';

const out = loopFloat({
  frame,                       // 宿主时间线上的当前帧，可以是小数
  startFrame: 0,               // 这个原子从第几帧开始
  durationFrames: 240,          // 持续多少帧
  fps: 30,
  params: {amplitudePx: 120, rotateDeg: 10, frequencyHz: 0.5},
  seed: 42,                    // 固定随机结果；换一个数就换一组
});

// 这个原子只算属性，不画东西。把结果用到任何元素上——画布图形、DOM 节点、视频图层都行：
//   x = 原位置x + out.position[0];  y = 原位置y + out.position[1]
//   旋转 out.rotation 度（顺时针），绕元素自己的原点
```

返回值：

- `out.progress`：原子进行到哪了，0–1。开始前为 0（保持起始状态），结束后为 1（保持终值）。
- `out.position`、`out.rotation` 随时间变化；其余属性保持初值（position [0, 0]、rotation 0、scale 1、opacity 1）。

通用约定（时间、随机种子、多个原子叠加）见 [README.md](README.md)。

## 在场景 JSON 里用

```json
{"id":"my-clip","target":"节点 ID","recipe":"loop.float","startFrame":0,"durationFrames":240,"fillAfter":"hold","params":{"amplitudePx":120,"rotateDeg":10,"frequencyHz":0.5}}
```

完整的最小场景：`assets/examples/loop.float.scene.json`。

## 直接出一条素材

```sh
node scripts/motion.mjs scaffold loop.float --out work/loop.float.scene.json --width 1920 --height 1080 --duration 240
node scripts/motion.mjs render work/loop.float.scene.json --out work/loop.float.mov --transparent
```
