# 透明 Opacity · `prop.opacity`

整体透明度从起始值过渡到结束值，用来显现和隐去。

- **族**：属性（变什么）
- **角色**：属性动画：同一对象上写同一属性的片段轮流生效
- **作用对象**：文字、图形（折线轮廓）
- **改写**：opacity（不透明度）
- **脚本**：[`prop.opacity.mjs`](prop.opacity.mjs)，独立文件，不依赖别的脚本

## 参数

| 参数 | 含义 | 单位 | 范围 | 默认 |
|---|---|---|---|---|
| `from` | 起始透明度 | 比例 | 0 – 1 | 0 |
| `to` | 结束透明度 | 比例 | 0 – 1 | 1 |

没写的参数取默认值；越界或写错名字会抛出带说明的错误。

## 在自己的代码里用

每一帧调用一次，传入当前帧号，拿回这一帧的结果。同样的输入永远得到同样的输出，可以任意跳帧、倒着取。

```js
import propOpacity from './atoms/prop.opacity.mjs';

const out = propOpacity({
  frame,                       // 宿主时间线上的当前帧，可以是小数
  startFrame: 0,               // 这个原子从第几帧开始
  durationFrames: 54,          // 持续多少帧
  fps: 30,
  params: {from: 0, to: 1},
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
{"id":"my-clip","target":"节点 ID","recipe":"prop.opacity","startFrame":0,"durationFrames":54,"fillAfter":"hold","params":{"from":0,"to":1}}
```

完整的最小场景：`assets/examples/prop.opacity.scene.json`。

## 直接出一条素材

```sh
node scripts/motion.mjs scaffold prop.opacity --out work/prop.opacity.scene.json --width 1920 --height 1080 --duration 76
node scripts/motion.mjs render work/prop.opacity.scene.json --out work/prop.opacity.mov --transparent
```
