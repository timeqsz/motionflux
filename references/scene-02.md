# MotionSpec 0.2：对象、关键帧与资源

从 `assets/examples/composition.scene.json` 开始。它使用图片、曲线、文字、分组与独立关键帧，附可单独校验的拉片记录。0.1 场景仍按原规则读取；要使用新字段，明确把 `specVersion` 改为 `"0.2"`。未知字段仍报错，不自动猜测迁移。

## 对象

原有 text / path 继续支持。0.2 新增：

| type | 内容字段 | 局部坐标 |
|---|---|---|
| image | `asset`、`width`、`height`、`fit: contain / cover / stretch` | 左上角为 0,0；保留图片 RGB 与 alpha |
| vector | `commands`、`fill`、`strokeWidth` | M/L 的 `to`；Q 的 `control/to`；C 的 `control1/control2/to`；Z 闭合。首命令必须 M |
| group | 可选 `layout` | 子节点的 `parent` 引用 group ID，支持嵌套；不允许成环 |
| custom | `module`、`width`、`height`、数值 `params` | 独立模块的画布作为一个对象合成，见[模块协议](render-modules.md) |

每个对象都有 `id/position/color`。image/group/custom 的 color 是保留的公共字段，不给图像染色。文字仍使用左侧字母基线和显式 LF 换行。vector 不等同于完整 SVG DOM：没有外部链接、脚本、SVG 滤镜或自动路径 morph。

可选公共字段：`parent`、`pivot`（局部 px，默认 0,0）、`rotation`（顺时针度数，默认 0）、`scale`（倍率，默认 1）、`stretch`（横纵倍率，默认 1,1，负值镜像）、`opacity`（0–1，默认 1）。变换为父矩阵 × T(position) × R × S × T(-pivot)，保留非等比缩放与旋转组合产生的剪切，不把矩阵粗略拆回角度。兄弟按 nodes 中的顺序绘制；一个分组整体占据父层的一个位置。分组透明度作用于合成后的整组，重叠子对象不会重复变暗。

基本布局明确写出 `{type: "row" | "column" | "grid", cell: [宽,高], gap: [横间距,纵间距], columns: 列数}`。按直接子节点的顺序附加格位偏移，保留其自身 position。cell 是排布步长，不是裁剪框；不自动测量文字，也不自动适配画幅。

## 开放属性动画

`animations` 与原有 `clips` 并列，ID 在两者之间唯一。例如：

```json
{
  "id": "card-arrive", "target": "card", "property": "position.y",
  "keyframes": [
    { "frame": 0, "value": 320, "easing": [0.22, 0.7, 0.3, 1] },
    { "frame": 24, "value": 180 },
    { "frame": 90, "value": 180 }
  ]
}
```

- 值是该对象的绝对局部属性；不是前一帧增量。关键帧用场景帧，允许小数，严格递增，范围 0…durationFrames。区间外保持首/末值，实际视频仍输出 0…N-1。
- `easing` 属于起点到下一个关键帧的区间，默认 linear；支持 smooth、hold、三次 Bézier `[x1,y1,x2,y2]`。控制点坐标限制 0–1，需过冲时显式增加合法取值的关键帧。不会把 Bézier 参数 t 错当成时间 x。
- 可动属性：position.x/y、rotation、scale、stretch.x/y、opacity；text/path/vector 的 color；text 的 fontSize；path/vector 的 strokeWidth；image/custom 的 width/height；custom 已声明的 `params.<name>`。不执行任意属性路径或表达式。
- 颜色沿用内核的线性光插值，再编码成 sRGB。字体大小不会自动修改显式 lineHeight。
- 每个对象每个属性只有一条关键帧轨道。若同一对象的原子也写相同属性域，校验会拒绝；例如 position.x 不能同时叠 prop.move。其他属性的原子仍可组合。
- 在原有 text/path 上，关键帧先进入对象，再由原子的复制与错开处理；轨迹和运动模糊读取对应历史时刻。新对象当前支持 prop.move/rotate/scale/opacity、timing.*、loop.*；vector 额外支持 prop.color。其他几何、质感、转场原子不会被假称为已支持图片或分组。

## 资源与交付

font 保留原协议。image 是 `{type:"image",src:"assets/name.png",sha256:"…"}`，支持静态 PNG/JPEG/WebP，使用首幅解码图，不作为动态图片播放器。module 路径为 `assets/name.mjs`。所有资源使用本地相对路径、固定哈希和唯一 src；禁止把代码放进 JSON 字符串。图片宽高以场景声明为准，contain 留白、cover 居中裁切。

```sh
node scripts/motion.mjs validate assets/examples/composition.scene.json
node scripts/motion.mjs preview assets/examples/composition.scene.json --out work/composition.html
node scripts/motion.mjs deliver assets/examples/composition.scene.json --out work/composition-v1
node scripts/motion.mjs render assets/examples/composition.scene.json --out work/composition.mp4
```

HTML、交付包和导出使用同一份冻结场景及其资源。CLI validate 校验字节哈希；浏览器再校验、解码、准备模块，等待目标帧完成后截取最终合成画布。`sample` 只验证数值，不执行模块、不证明像素。`deliver` 保存 scene、assets、preview、检查报告；有 study 时一并保存原记录与制作绑定报告。视频、音频、遮罩、混合模式和自动排版不属于本阶段的新增支持。
