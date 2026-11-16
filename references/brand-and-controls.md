# 品牌规则与可编辑参数

当前内容决定信息与阅读时间，模式决定动作关系，品牌规则约束表达。用户本次明确要求优先；速度偏快不意味着截断动作或跳过阅读。

## 品牌输入

见 [横屏 brief](../assets/patterns/title-yields-to-product/speaker-landscape.brief.json) 和 [brief schema](../assets/patterns/brief.schema.json)。以下字段由生成器实际读取：

| 字段 | 含义 |
|---|---|
| name | 画面品牌名 |
| palette | background、ink、muted、accent，均为不透明 #RRGGBB |
| typography | headlineRatio、bodyRatio 是相对画幅宽度的初始字号比例；仍需测量实际字形 |
| motion.enterSeconds / travelSeconds | 入场与让位阶段秒数 |
| motion.minReadSeconds | 完全停稳后的最少阅读秒数 |
| motion.readUnitsPerSecond | 长度估算速率：非拉丁字符 1 单位、拉丁字符 0.5 单位、空白不计；不是阅读能力测量 |
| motion.endHoldSeconds | 收尾出现完成后的最少停留秒数；文案估算阅读更长时采用阅读时长 |

输入显式保存，不暗中合并旧工程。更复杂偏好记在项目说明中交给 Agent，不给 JSON 增加未经实现的字段。

## 保存值与参数绑定

scene.json 是画面、资源、参数与时间的唯一执行依据。authoring.json 保存模式版本、品牌意图、素材声明和 controls，不复制当前参数值。用户修改场景颜色后不会被初始品牌快照覆盖。

control 用 collection、target、field 绑定稳定对象，kind、unit、note 解释修改方法。支持已声明的节点直接字段、关键帧轨道、图片资源路径和背景；不执行表达式或任意属性路径。见 [authoring schema](../assets/patterns/authoring.schema.json)。

```sh
node scripts/motion.mjs controls work/v1/authoring.json --scene work/v1/scene.json
```

命令读回当前保存值，animatedBy 标明控制对应属性的轨道；保存值不是播放帧的计算值。被关键帧驱动的属性应修改轨道，不能只修改被覆盖的静态值。自定义模块只开放已声明参数，不把任意代码自动转换成图层。

本阶段没有参数面板或自动写回命令。Agent 直接修改场景：

1. 读取当前场景与 controls，按意图定位对象或轨道，保留无关参数与稳定 ID。compose 只用于新建，不能重建替换手动调整。
2. 改文字时检查换行、fontSize、lineHeight 和停留；换图片时更新 src、sha256 并检查 pivot、contain 和素材留白。
3. 调速修改相关轨道，检查阶段承接和结尾停留，不通过改 fps 调速。
4. 校验场景、绑定和真实画面，再交付新目录：

```sh
node scripts/motion.mjs deliver work/v1/scene.json --authoring work/v1/authoring.json --previous work/baseline/scene.json --out work/v2
```

新增或删除对象需同步更新 controls，失效绑定报错，不根据相似名称重绑。bindingsVerified 只证明引用及保存值类型；视觉和播放证据另行记录。
