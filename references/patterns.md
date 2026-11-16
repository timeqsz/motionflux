# 编排模式：检索、改编与沉淀

模式记录用途、动作承接和改编方法；原子负责局部执行。当前包含一个原创产品介绍模式和横／竖两份独立内容示例，不是外部品牌视频的复刻库。

## 制作时按需读取

```sh
node scripts/motion.mjs patterns 产品 标题
```

按 [索引](../assets/patterns/index.json) 的用途、主体、画幅和能力要求筛选，再读取相关 PATTERN.md 和示例。命令是全部短关键词匹配，不是语义搜索或自动审美判断；避免直接输入整句需求。实际文案可能需要比索引下限更长的时长。

已有模式：[标题让位于产品](../assets/patterns/title-yields-to-product/PATTERN.md)。判断适用后说明焦点、转移原因、阅读阶段和结尾状态。按当前素材重新安排，不为套模式补造卖点。无适用模式时继续自主编排；单个动作、局部修订和仅分析任务不必检索。

## 可运行起点

复制并修改 brief：产品图片路径与 SHA-256、文案显式换行、尺寸、时长和品牌规则。图片路径相对 brief。

```sh
node scripts/motion.mjs compose assets/patterns/title-yields-to-product/speaker-landscape.brief.json --out work/speaker-v1
node scripts/motion.mjs controls work/speaker-v1/authoring.json --scene work/speaker-v1/scene.json
node scripts/motion.mjs render work/speaker-v1/scene.json --out work/speaker-v1/video.mp4
```

`compose` 是当前模式的确定性初稿生成器，不调用模型、不识别图片、不执行任意模板代码。它在新目录交付场景、图片、离线预览、编排上下文和检查报告；已有目录会拒绝覆盖。当前仅此模式提供生成器，其他编排由 Agent 写场景。

时长不足报 READING_TIME 并给出建议最短时长，不压缩阅读。字号是估算初排，不代表实际字形测量；显式 LF 换行，不宣称自动排版。完整构图在结尾保持，无统一倒放，无音轨。

后续以 scene.json 为编辑依据；authoring.json 保留模式、初始品牌意图和参数绑定。它的阶段说明是初始规划，修订后以实际关键帧为准。详见 [品牌与编辑约定](brand-and-controls.md)。

## 模式格式与入库

每条记录包含用途与前提、阶段与动作关系、必须保持的关系、可变参数、长文案／换画幅的调整方法、实现能力与缺口、原创可运行示例和可编辑参数。

原创模式注明 original；由参考提炼时保留 Study、源时间码与 observed/inferred/unknown，分别记录实现是 direct/approximate/custom，不把设计意图伪装成观察。

用户要求沉淀时，先写入当前项目的模式目录，再按任务授权更新共享库。普通交付保留项目上下文，不自动把用户品牌、素材或个别偏好写成全局规则。

候选模式完成原创实现和至少一次有意义的改编检查后，可标记 validated-example。记录具体版本、场景哈希、内容／画幅变体、实际观看帧和播放范围；状态只覆盖这些样例与环境。结构通过不能替代视觉检查，未观看的版本保持 candidate。

参考分析仍使用 [视频拆解](video-breakdown.md) 和 [Motion Study](motion-study.md)。本阶段没有自动识别视频或自动把 Study 变成模式的命令。
