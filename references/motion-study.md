# Motion Study：从拉片证据到制作对象

这份记录聚焦动效中的主体、动作、节奏与实现选择，不做泛化视频摘要。分析可以独立交付；不强迫用户先生成场景。纯描述创作也无需虚构参考视频。

读取 `assets/examples/composition.study.json` 查看完整结构。该文件是原创设计记录，未观看的部分保持 unknown；不能把示例描述直接当成真实观察。

- `studyVersion: "0.1"`；`source.video/from/to` 标记原始参考及其秒数范围。source.video 是来源描述/路径，不会被 study 命令下载或执行。
- `subjects` 记录承载动效的对象，给每个对象稳定 ID 与描述；`events` 用稳定事件 ID、subject、from/to 描述动作。同一段文字先移动、再缩放仍是同一个 subject，可以关联多个事件；多个对象使用相同动效时各有 subject ID。
- 事件 from/to 和 evidence.at **全部是原片秒数**。不是截取后秒数，也不是输出帧。事件需在参考范围内，证据需在事件范围内。
- `status`：observed 是可直接看到的事实；inferred 是依据画面推断的动作机制；unknown 是当前不足以判断。observed/inferred 都必须有带时间戳的 evidence；证据 note 写明观察，不从成片断言原工程、插件或精确数值。
- 可选 `implementation`：targets 指向制作对象；clips/animations 指向具体动作；method 为 direct / approximate / custom；note 说明迁移了什么原则、哪些地方近似，以及原创改编。绑定的动画必须实际作用于 targets。不能因为名称相似就标成 direct。

对象追踪遵循 [视频拆解的追踪约定](video-breakdown.md#追踪承载动效的对象)。一个对象可以有不连续的可见区间，拆成多个事件并保留同一 subject；身份关联只有推断依据时，在事件描述与 evidence.note 中注明。无法确认的间隔可记录 unknown 或在说明中交代，不能虚构遮挡期间的位置与证据。近似时段仍须遵守源范围与时间单位，证据时间对应实际查看的画面；允许分析误差不等于忽略数据结构或绑定错误。

```sh
# 独立分析：校验记录，不要求制作场景。
node scripts/motion.mjs study work/reference.study.json --out work/study-report.json
# 有制作目标：同时验证绑定，报告原片秒、片段局部秒及实际输出帧/秒。
node scripts/motion.mjs study work/reference.study.json --scene work/scene.json --out work/study-report.json
```

也可把记录放进 0.2 场景的 `study` 字段。deliver 会保存 study.json 和 study-report.json，并随 scene 版本保留。报告 `bindingsVerified` 只表示引用通过校验；`visualComparison` 初始为 not-performed。改了动作时，保持事件与对象 ID，检查映射是否仍表达原意，再观看输出比较节奏与关系。

原片加时间轴的现有 `breakdown` 格式继续使用，见[视频动效拆解](video-breakdown.md)。本阶段 study 是带证据和制作绑定的数据模型与报告，不自动识别视频，不自动把 study 转成旧 breakdown 面板；需要动图时按已观看的证据另写 breakdown tracks。三维旋转、二维透视变形或相机运动不能确定时保留 inferred/unknown，允许多个候选机制。
