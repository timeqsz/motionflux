# 动效原子清单

由构建从目录生成，共 53 个原子、8 族。每行：ID、名称、可用节点、角色、写入、作用、参数及默认值。点 ID 打开该原子的用法说明；它的脚本是同名的 `atoms/<ID>.mjs`。

一个完整的动作通常从几族里各取一个：**变什么（属性）× 怎么变（节奏）× 谁先谁后（编排）＋ 质感**。

- **角色**决定叠加方式：同一节点上写同一属性的**属性动画**不能在时间上重叠，但可以一个接一个；时间曲线、持续循环、复制排布、先后延迟、画面质感和场景连线都是叠加的。详见 [场景编排](../references/composition.md)。
- 写入 `geometry` 或 `trim` 的原子会重画节点的轮廓，只能用于 path 节点。
- 标 ◆ 的原子要做逐像素处理，画面大、同时用得多时渲染会变慢。

## 属性 · 变什么

| ID | 名称 | 节点 | 角色 | 写入 | 作用 | 参数（默认值） |
|---|---|---|---|---|---|---|
| [`prop.move`](../atoms/prop.move.md) | 位移 Move | text / path | 属性动画 | position | 沿一个方向从起始偏移移到结束偏移；方向 0° 向右、90° 向下。 | fromPx=-120px, toPx=120px, angleDeg=0deg |
| [`prop.rotate`](../atoms/prop.rotate.md) | 旋转 Rotate | text / path | 属性动画 | rotation | 绕对象原点从起始角转到结束角，正角度为顺时针。 | fromDeg=0deg, toDeg=180deg |
| [`prop.scale`](../atoms/prop.scale.md) | 缩放 Scale | text / path | 属性动画 | scale | 绕对象原点等比缩放。 | from=0.4, to=1.2 |
| [`prop.opacity`](../atoms/prop.opacity.md) | 透明 Opacity | text / path | 属性动画 | opacity | 整体透明度从起始值过渡到结束值，用来显现和隐去。 | from=0, to=1 |
| [`prop.color`](../atoms/prop.color.md) | 颜色 Color | text / path | 属性动画 | color | 颜色从起始色过渡到结束色，在线性光下混合，中途不发灰。 | from=#1d201d, to=#d4513f |
| [`prop.blur`](../atoms/prop.blur.md) ◆ | 模糊 Blur | text / path | 属性动画 | blur | 高斯模糊半径从起始值变到结束值，从虚到实或从实到虚。 | fromPx=16px, toPx=0px |
| [`prop.morph`](../atoms/prop.morph.md) | 变形 Morph | path | 属性动画 | geometry | 轮廓按弧长对齐后逐点过渡到目标形状，不会扭成一团。 | target=star, amount=1 |
| [`prop.draw`](../atoms/prop.draw.md) | 描线 Draw | path | 属性动画 | trim | 按真实弧长把路径从起点画到终点；拖尾大于 0 时只留一段在路径上跑。 | from=0, to=1, trailRatio=0 |
| [`prop.crop`](../atoms/prop.crop.md) | 裁切 Crop | text / path | 属性动画 | mask | 可见范围从一侧或中心向外展开，对象本身不动。 | from=0, to=1, origin=center |

## 节奏 · 怎么变

| ID | 名称 | 节点 | 角色 | 写入 | 作用 | 参数（默认值） |
|---|---|---|---|---|---|---|
| [`timing.ease`](../atoms/timing.ease.md) | 缓动 Ease | text / path | 时间曲线 | curve | 加速、减速或两头慢中间快。作用在同一对象、在它范围内开始的属性动画上。 | mode=out, power=3 |
| [`timing.spring`](../atoms/timing.spring.md) | 弹簧 Spring | text / path | 时间曲线 | curve | 像挂在弹簧上，冲过终点后来回晃几下再停稳；片段结束时正好停在终值。 | oscillations=2.5cycle, damping=4 |
| [`timing.bounce`](../atoms/timing.bounce.md) | 回弹 Bounce | text / path | 时间曲线 | curve | 像球落地：到达终点后反弹几次，每次更低。 | bounces=3, decay=0.4 |
| [`timing.overshoot`](../atoms/timing.overshoot.md) | 过冲 Overshoot | text / path | 时间曲线 | curve | 冲过终点一点再收回来，只回一次。 | tension=1.8 |
| [`timing.anticipate`](../atoms/timing.anticipate.md) | 预备 Anticipate | text / path | 时间曲线 | curve | 先往反方向退一点蓄力，再加速出发、减速到达。 | amount=0.3 |
| [`timing.steps`](../atoms/timing.steps.md) | 步进 Steps | text / path | 时间曲线 | curve | 不连续地变化，一格一格跳到终点，像秒针或逐帧动画。 | steps=6 |

## 循环 · 一直动

| ID | 名称 | 节点 | 角色 | 写入 | 作用 | 参数（默认值） |
|---|---|---|---|---|---|---|
| [`loop.breathe`](../atoms/loop.breathe.md) | 呼吸 Breathe | text / path | 持续循环 | scale | 缓慢地放大缩小，像在呼吸。 | amount=0.12, periodS=2s |
| [`loop.swing`](../atoms/loop.swing.md) | 摆动 Swing | text / path | 持续循环 | rotation, position | 规律地来回：绕原点摆动，或沿水平、竖直方向往复。 | axis=rotate, amount=24, periodS=1.6s |
| [`loop.float`](../atoms/loop.float.md) | 漂浮 Float | text / path | 持续循环 | position, rotation | 用平滑噪声不规则地游移和微微转动，不会有规律的重复感。 | amplitudePx=40px, rotateDeg=10deg, frequencyHz=0.5Hz |
| [`loop.spin`](../atoms/loop.spin.md) | 自转 Spin | text / path | 持续循环 | rotation | 匀速持续旋转，负值逆时针。 | turnsPerSecond=0.25turn/s |
| [`loop.flicker`](../atoms/loop.flicker.md) | 闪烁 Flicker | text / path | 持续循环 | opacity | 亮度在亮和暗之间随机跳变，像接触不良的灯。 | rateHz=10Hz, low=0.15, chance=0.35 |
| [`loop.wave`](../atoms/loop.wave.md) | 波动 Wave | text / path | 持续循环 | position | 一排副本依次上下起伏，波峰从一端传到另一端；单个对象则只是上下浮动。 | amplitudePx=24px, periodS=1.4s, phaseDeg=45deg |

## 编排 · 谁先谁后

| ID | 名称 | 节点 | 角色 | 写入 | 作用 | 参数（默认值） |
|---|---|---|---|---|---|---|
| [`choreo.stagger`](../atoms/choreo.stagger.md) | 错开 Stagger | text / path | 先后延迟 | delay | 让副本一个接一个开始，每个比前一个晚固定帧数。 | stepFrames=5frame, order=forward |
| [`choreo.cascade`](../atoms/choreo.cascade.md) | 扩散 Cascade | text / path | 先后延迟 | delay | 离起点越远的副本开始得越晚，动作像水波一样从一点传开。 | framesPer100Px=6frame, originX=0px, originY=0px |
| [`choreo.follow`](../atoms/choreo.follow.md) | 跟随 Follow | text / path | 复制排布 | copies | 复制出几个跟随者，每个比前一个晚几帧走同样的路线，越往后越小越淡。 | count=5, lagFrames=5frame, falloff=0.12 |
| [`choreo.random`](../atoms/choreo.random.md) | 乱序 Shuffle | text / path | 先后延迟 | delay | 给每个副本一个固定种子下的随机延迟，先后没有规律。 | spreadFrames=24frame |
| [`choreo.array`](../atoms/choreo.array.md) | 阵列 Array | text / path | 复制排布 | copies | 沿一条直线等距复制成一排，以原位置为中心。 | count=5, gapPx=80px, angleDeg=0deg |
| [`choreo.ring`](../atoms/choreo.ring.md) | 环形 Ring | text / path | 复制排布 | copies | 围绕原位置复制成一圈；可以让每个副本朝外。 | count=8, radiusPx=120px, orient=outward |
| [`choreo.grid`](../atoms/choreo.grid.md) | 网格 Grid | text / path | 复制排布 | copies | 复制成行列整齐的矩阵，以原位置为中心。 | columns=6, rows=4, gapPx=64px |
| [`choreo.mirror`](../atoms/choreo.mirror.md) | 镜像 Mirror | text / path | 复制排布 | copies | 在对称位置放一个镜像副本，它的动作也左右或上下相反。 | axis=x, distancePx=200px |

## 转场 · 出现消失

| ID | 名称 | 节点 | 角色 | 写入 | 作用 | 参数（默认值） |
|---|---|---|---|---|---|---|
| [`transition.wipe`](../atoms/transition.wipe.md) | 擦除 Wipe | text / path | 属性动画 | mask | 一条直边扫过对象，扫过的部分出现或消失。 | mode=in, angleDeg=0deg |
| [`transition.iris`](../atoms/transition.iris.md) | 圆形展开 Iris | text / path | 属性动画 | mask | 从一点开始圆形张开或收拢。 | mode=in, centerX=0.5, centerY=0.5 |
| [`transition.slices`](../atoms/transition.slices.md) | 分条 Slices | text / path | 属性动画 | mask | 切成几条，相邻条从相反方向错位滑入或滑出。 | mode=in, count=5, distancePx=160px, staggerRatio=0.35 |
| [`transition.blinds`](../atoms/transition.blinds.md) | 百叶 Blinds | text / path | 属性动画 | mask | 像百叶窗，一片片同时打开或合上。 | mode=in, count=8, angleDeg=0deg |
| [`transition.flip`](../atoms/transition.flip.md) | 翻转 Flip | text / path | 属性动画 | stretch | 像卡片一样绕竖轴或横轴翻过来，侧面朝前时最窄。 | mode=in, axis=y, turns=0.25turn |
| [`transition.push`](../atoms/transition.push.md) | 推入 Push | text / path | 属性动画 | mask | 内容在自己的范围里滑进或滑出，范围外不可见；两个对象一进一出就是推走。 | mode=in, angleDeg=0deg |
| [`transition.dissolve`](../atoms/transition.dissolve.md) ◆ | 溶解 Dissolve | text / path | 属性动画 | dissolve | 一颗颗随机颗粒逐渐出现或消失。 | mode=in, grainPx=6px |

## 文字 · 字的动法

| ID | 名称 | 节点 | 角色 | 写入 | 作用 | 参数（默认值） |
|---|---|---|---|---|---|---|
| [`text.chars`](../atoms/text.chars.md) | 逐字 Per Character | text | 属性动画 | chars | 每个字依次升起并显现；片段时长包含错开的时间。 | stepFrames=3frame, distancePx=36px |
| [`text.lines`](../atoms/text.lines.md) | 逐行 Per Line | text | 属性动画 | lines | 按换行一行一行移动并淡入；片段时长包含错开的时间。 | stepFrames=8frame, distancePx=40px |
| [`text.decode`](../atoms/text.decode.md) | 解码 Decode | text | 属性动画 | text | 字符先随机乱跳，再从左到右依次定格成正文。 | rateHz=20Hz, charset=symbols |
| [`text.type`](../atoms/text.type.md) | 打字 Typewriter | text | 属性动画 | text | 字一个个打出来，光标跟在后面闪。 | cursor=bar, blinkHz=2Hz |
| [`text.count`](../atoms/text.count.md) | 计数 Count | text | 属性动画 | text | 数字从起始值滚到目标值；文字中的 # 会被替换成数字。 | from=0, to=2026, decimals=0, grouping=none |
| [`text.tracking`](../atoms/text.tracking.md) | 字距 Tracking | text | 属性动画 | chars | 字与字的间距从散开收拢到正常，或反过来。 | fromPx=60px, toPx=0px, anchor=center |

## 质感 · 叠在上面

| ID | 名称 | 节点 | 角色 | 写入 | 作用 | 参数（默认值） |
|---|---|---|---|---|---|---|
| [`feel.trail`](../atoms/feel.trail.md) | 拖影 Trail | text / path | 复制排布 | copies | 在身后留下几个刚刚经过位置的残影，越旧越淡。 | count=6, gapFrames=1.5frame, strength=0.5 |
| [`feel.motion-blur`](../atoms/feel.motion-blur.md) ◆ | 运动模糊 Motion Blur | text / path | 画面质感 | blur | 按真实速度沿运动方向拉虚，快的时候虚、停下就清楚。 | shutterDeg=180deg |
| [`feel.glow`](../atoms/feel.glow.md) ◆ | 辉光 Glow | text / path | 画面质感 | glow | 把对象自身模糊后叠回去，周围泛出同色的光。 | radiusPx=14px, strength=1.2 |
| [`feel.grain`](../atoms/feel.grain.md) ◆ | 颗粒 Grain | text / path | 画面质感 | grain | 胶片似的随机颗粒，按设定频率刷新。 | amount=0.55, sizePx=2px, rateHz=12Hz |
| [`feel.glitch`](../atoms/feel.glitch.md) ◆ | 故障 Glitch | text / path | 画面质感 | glitch | 随机几条横带突然错位撕裂，再跳回原位。 | offsetPx=28px, bandPx=14px, chance=0.35, rateHz=8Hz |
| [`feel.chroma`](../atoms/feel.chroma.md) ◆ | 色散 Chromatic | text / path | 画面质感 | chroma | 在两侧错开一红一青两层，边缘出现彩色分离。 | offsetPx=6px, angleDeg=0deg |

## 生成 · 凭空产生

| ID | 名称 | 节点 | 角色 | 写入 | 作用 | 参数（默认值） |
|---|---|---|---|---|---|---|
| [`gen.particles`](../atoms/gen.particles.md) | 粒子 Particles | path | 属性动画 | geometry | 从原点持续喷出粒子，受重力下落并逐渐变小消失；每个粒子的轨迹都可直接按时间求值。 | count=48, speedPx=260px/s, spreadDeg=80deg, gravityPx=420px/s², lifeFrames=40frame, sizePx=7px |
| [`gen.shatter`](../atoms/gen.shatter.md) | 碎裂 Shatter | path | 属性动画 | geometry | 把轮廓切成三角碎片，从中心向外依次炸开、旋转、下落并淡出。 | pieces=6, forcePx=180px, spinDeg=240deg, gravityPx=120px, delayRatio=0.3 |
| [`gen.ripple`](../atoms/gen.ripple.md) | 波纹 Ripple | path | 属性动画 | geometry | 对象的轮廓一圈圈向外放大并淡出，像水面荡开。 | rings=3, growth=3.2, periodS=1.8s |
| [`gen.trace`](../atoms/gen.trace.md) | 轨迹 Trace | text / path | 场景连线 | overlay | 画出对象（和每个副本）原点刚刚走过的路线，越旧越淡。 | lengthFrames=30frame, widthPx=3px |
| [`gen.link`](../atoms/gen.link.md) | 连线 Link | text / path | 场景连线 | overlay | 用线把副本按顺序或按距离连起来，副本移动时线跟着走。 | mode=near, maxDistancePx=120px, widthPx=1.5px |
