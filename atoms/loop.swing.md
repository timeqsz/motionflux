# 摆动 Swing · `loop.swing`

规律地来回：绕原点摆动，或沿水平、竖直方向往复。

- **族**：循环（一直动）
- **角色**：持续循环：叠加在其他动作之上
- **作用对象**：文字、图形（折线轮廓）
- **改写**：rotation（旋转角度）、position（位置偏移）
- **脚本**：[`loop.swing.mjs`](loop.swing.mjs)，独立文件，不依赖别的脚本

## 参数

| 参数 | 含义 | 单位 | 范围 | 默认 |
|---|---|---|---|---|
| `axis` | 摆动方式 | 选项 | `rotate`（绕原点摆）、`x`（左右）、`y`（上下） | `rotate` |
| `amount` | 幅度（度或 px） | 度或 px | 0 – 360 | 24 |
| `periodS` | 周期 | 秒 | 0.2 – 10 | 1.6 |

没写的参数取默认值；越界或写错名字会抛出带说明的错误。

## 在自己的代码里用

每一帧调用一次，传入当前帧号，拿回这一帧的结果。同样的输入永远得到同样的输出，可以任意跳帧、倒着取。

```js
import loopSwing from './atoms/loop.swing.mjs';

const out = loopSwing({
  frame,                       // 宿主时间线上的当前帧，可以是小数
  startFrame: 0,               // 这个原子从第几帧开始
  durationFrames: 240,          // 持续多少帧
  fps: 30,
  params: {axis: "rotate", amount: 24, periodS: 1.6},
});

// 这个原子只算属性，不画东西。把结果用到任何元素上——画布图形、DOM 节点、视频图层都行：
//   旋转 out.rotation 度（顺时针），绕元素自己的原点
//   x = 原位置x + out.position[0];  y = 原位置y + out.position[1]
```

返回值：

- `out.progress`：原子进行到哪了，0–1。开始前为 0（保持起始状态），结束后为 1（保持终值）。
- `out.rotation`、`out.position` 随时间变化；其余属性保持初值（position [0, 0]、rotation 0、scale 1、opacity 1）。

通用约定（时间、随机种子、多个原子叠加）见 [README.md](README.md)。

## 在场景 JSON 里用

```json
{"id":"my-clip","target":"节点 ID","recipe":"loop.swing","startFrame":0,"durationFrames":240,"fillAfter":"hold","params":{"axis":"rotate","amount":24,"periodS":1.6}}
```

完整的最小场景：`assets/examples/loop.swing.scene.json`。

## 直接出一条素材

```sh
node scripts/motion.mjs scaffold loop.swing --out work/loop.swing.scene.json --width 1920 --height 1080 --duration 240
node scripts/motion.mjs render work/loop.swing.scene.json --out work/loop.swing.mov --transparent
```
