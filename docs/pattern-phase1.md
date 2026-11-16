# MotionFlux 0.6.0：模式与品牌创作第一阶段

2026-11-13。实现范围是在已有 0.5.0 二维／Three.js／Study 基础上加入可复用的动作编排、品牌输入和参数绑定。源码及本机已安装 skill 都已更新为 0.6.0；未提交或推送 Git，也未更改旧 motion-flux 网站工程。

## 完成的行为

- `patterns` 按全部关键词检索用途与动作关系；首个原创模式是「标题让位于产品」，包含适用条件、阶段关系、改编说明和证据状态。
- `compose` 从显式 brief 生成独立交付，应用配色、字号比例、入场／让位／阅读／收尾规则。内容过长导致时间不足时明确报错；横竖布局分别安排。
- `controls` 从稳定 ID 读取场景当前保存值及驱动轨道。`deliver --authoring` 保留上下文；修订直接基于当前场景，已有手动调整不会被初始品牌快照覆盖。
- Skill 路由接入模式检索、品牌规则、修订与经验沉淀。没有匹配模式时允许自主编排，单个动作与局部修改不强制套用模式。
- 两个原创示例改变了主体、语言、文字长度、画幅、色彩及节奏，不只是换背景。

## 验证

类型检查、22 项逻辑／CLI／回归测试、5 项真实 Chrome 测试均通过。保留了 53 个原子的历史数值基线和 Three.js 渲染检查。浏览器启动在命令沙箱内受限，使用沙箱外本机 Chrome 完成实际验证，没有跳过浏览器测试。

安装包独立解压验证通过：210 个文件，58 个原有场景、1 个模式及 2 个模式示例；约 894 KB。校验同时检查模式证据的场景哈希，示例变更后不能继续沿用旧的视觉验证状态。官方 quick_validate.py 通过；其 PyYAML 依赖放在 uv 临时环境中，未加入项目依赖。

两段 H.264 MP4 均为 30 fps、无音轨。ffprobe 实际解码计数分别为 270／360 帧、9／12 秒。检查编码后的每秒抽样拼图、末帧及浏览器播放的开始／中间／结束画面；未见明显裁切或意外重叠。浏览器中从 0 播放到结尾，ended=true、mediaError=null。完整播放期间的视觉观察是抽样，不宣称人工检查了每一帧，也不推断其他设备字体或任意输入同样正确。

详见 [随包验证记录](../assets/patterns/title-yields-to-product/validation.json)。本机产物：

| 示例 | 视频 | 独立预览 | 编码抽帧 |
|---|---|---|---|
| 英文音箱 · 1280×720 · 9 秒 | [video.mp4](../work/phase1/speaker-v1/video.mp4) | [preview.html](../work/phase1/speaker-v1/preview.html) | [contact.png](../work/phase1/speaker-v1/contact.png) |
| 中文台灯 · 720×1080 · 12 秒 | [video.mp4](../work/phase1/lamp-v1/video.mp4) | [preview.html](../work/phase1/lamp-v1/preview.html) | [contact.png](../work/phase1/lamp-v1/contact.png) |

各交付目录的 review.json 记录实际视频哈希、解码结果和播放范围；compose 创建的 delivery.json 保留当时自动检查范围，未把后续人工观察伪装成工具自动验收。

## 本机安装与边界

已安装位置：`/Users/cn-sylvanlv/.codex/skills/motionflux`。全部文件哈希及安装后的 doctor、patterns、compose、controls 通过验证。旧版备份：`/Users/cn-sylvanlv/.codex/skill-backups/motionflux-before-0.6.0-20261113-163610`。

本阶段没有可视化参数面板、自动视频识别、自动 Study 转模式、语义搜索或任意内容自动排版。当前生成器服务于这一项原创模式；其他编排继续由 Agent 使用二维场景或独立模块完成。后续新内容仍需按当前素材、字形和时长检查实际画面。
