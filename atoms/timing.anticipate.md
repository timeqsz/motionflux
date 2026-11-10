# 预备 Anticipate · `timing.anticipate`

先往反方向退一点蓄力，再加速出发、减速到达。

- **族**：节奏（怎么变）
- **角色**：时间曲线：改变同一对象上其他属性动画的快慢
- **作用对象**：文字、图形（折线轮廓）
- **改写**：value（曲线值）
- **脚本**：[`timing.anticipate.mjs`](timing.anticipate.mjs)，独立文件，不依赖别的脚本

## 参数

| 参数 | 含义 | 单位 | 范围 | 默认 |
|---|---|---|---|---|
| `amount` | 后退幅度 | 比例 | 0 – 1 | 0.3 |

没写的参数取默认值；越界或写错名字会抛出带说明的错误。

## 在自己的代码里用

每一帧调用一次，传入当前帧号，拿回这一帧的结果。同样的输入永远得到同样的输出，可以任意跳帧、倒着取。

```js
import timingAnticipate from './atoms/timing.anticipate.mjs';
import move from './atoms/prop.move.mjs';

// 单独用：拿曲线值 out.value（0 → 1，可能冲过 1 或先低于 0），自己乘到任何数值上
const out = timingAnticipate({
  frame,                       // 宿主时间线上的当前帧，可以是小数
  startFrame: 0,               // 这个原子从第几帧开始
  durationFrames: 84,          // 持续多少帧
  fps: 30,
  params: {amount: 0.3},
});

// 交给属性原子：把曲线作为 ease 传进去
const curve = (t) => timingAnticipate({ frame: t, durationFrames: 1, params: {amount: 0.3} }).value;
const moved = move({ frame, durationFrames: 30, params: { fromPx: -100, toPx: 100 }, ease: curve });
```

返回值：

- `out.progress`：原子进行到哪了，0–1。开始前为 0（保持起始状态），结束后为 1（保持终值）。
- `out.value`：曲线在这一帧的值，开始为 0，结束正好为 1。

通用约定（时间、随机种子、多个原子叠加）见 [README.md](README.md)。

## 在场景 JSON 里用

```json
{"id":"my-clip","target":"节点 ID","recipe":"timing.anticipate","startFrame":0,"durationFrames":84,"fillAfter":"hold","params":{"amount":0.3}}
```

示例场景里它和这些原子一起用在同一对象上：`prop.move`。
完整的最小场景：`assets/examples/timing.anticipate.scene.json`。

## 直接出一条素材

```sh
node scripts/motion.mjs scaffold timing.anticipate --out work/timing.anticipate.scene.json --width 1920 --height 1080 --duration 84
node scripts/motion.mjs render work/timing.anticipate.scene.json --out work/timing.anticipate.mov --transparent
```
