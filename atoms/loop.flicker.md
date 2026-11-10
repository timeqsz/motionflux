# 闪烁 Flicker · `loop.flicker`

亮度在亮和暗之间随机跳变，像接触不良的灯。

- **族**：循环（一直动）
- **角色**：持续循环：叠加在其他动作之上
- **作用对象**：文字、图形（折线轮廓）
- **改写**：opacity（不透明度）
- **脚本**：[`loop.flicker.mjs`](loop.flicker.mjs)，独立文件，不依赖别的脚本

## 参数

| 参数 | 含义 | 单位 | 范围 | 默认 |
|---|---|---|---|---|
| `rateHz` | 跳变频率 | Hz | 0.5 – 30 | 10 |
| `low` | 暗时透明度 | 比例 | 0 – 1 | 0.15 |
| `chance` | 变暗概率 | 比例 | 0 – 1 | 0.35 |

没写的参数取默认值；越界或写错名字会抛出带说明的错误。

## 在自己的代码里用

每一帧调用一次，传入当前帧号，拿回这一帧的结果。同样的输入永远得到同样的输出，可以任意跳帧、倒着取。

```js
import loopFlicker from './atoms/loop.flicker.mjs';

const out = loopFlicker({
  frame,                       // 宿主时间线上的当前帧，可以是小数
  startFrame: 0,               // 这个原子从第几帧开始
  durationFrames: 240,          // 持续多少帧
  fps: 30,
  params: {rateHz: 8, low: 0.15, chance: 0.35},
  seed: 42,                    // 固定随机结果；换一个数就换一组
});

// 这个原子只算属性，不画东西。把结果用到任何元素上——画布图形、DOM 节点、视频图层都行：
//   不透明度 out.opacity（0–1）
```

返回值：

- `out.progress`：原子进行到哪了，0–1。开始前为 0（保持起始状态），结束后为 1（保持终值）。
- `out.opacity` 随时间变化；其余属性保持初值（position [0, 0]、rotation 0、scale 1、opacity 1）。

通用约定（时间、随机种子、多个原子叠加）见 [README.md](README.md)。

## 在场景 JSON 里用

```json
{"id":"my-clip","target":"节点 ID","recipe":"loop.flicker","startFrame":0,"durationFrames":240,"fillAfter":"hold","params":{"rateHz":8,"low":0.15,"chance":0.35}}
```

完整的最小场景：`assets/examples/loop.flicker.scene.json`。

## 直接出一条素材

```sh
node scripts/motion.mjs scaffold loop.flicker --out work/loop.flicker.scene.json --width 1920 --height 1080 --duration 240
node scripts/motion.mjs render work/loop.flicker.scene.json --out work/loop.flicker.mov --transparent
```
