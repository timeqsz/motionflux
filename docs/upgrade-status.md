> 后续状态：2026-11-13 已升级至 0.6.0，见 [模式与品牌创作第一阶段](pattern-phase1.md)。下文保留 0.5.0 的历史验收记录。

# MotionFlux 0.5.0：第一阶段实现与验收

2026-11-12。本次落实升级方案的 M0/M1，并提前验证 Three.js 模块接入。代码基于新仓库 `timeqsz/motionflux` 的 `e46f1bb`，位于本地 `motionflux/`；旧 `motion-flux/` 网站工程及其中未提交修改没有改动。本次没有推送 GitHub 或发布 Release。

本机 Skill 已更新至 0.5.0，安装后 doctor 和两份新示例的资产校验通过。旧版完整备份至 `/Users/cn-sylvanlv/.codex/skill-backups/motionflux-before-0.5.0-20261112-143639`。验收汇总在 [acceptance.json](../work/acceptance-0.5.0/acceptance.json)。

## 已实现

| 能力 | 实际行为 | 入口 |
|---|---|---|
| 二维对象 | PNG/JPEG/WebP、M/L/Q/C/Z 曲线、父子 group、pivot、显式行/列/网格排布；整组透明度正确合成 | [场景协议](../references/scene-02.md) |
| 可编辑动画 | 独立关键帧、linear/smooth/hold/Bézier、明确单位和范围；与原子写入冲突校验；历史轨迹和错开读取正确时间 | `packages/core/src/animation.ts` |
| 拉片 → 制作 | Motion Study 区分观察/推断/未知，保留主体、原片秒数、证据；绑定制作对象和具体动画，报告局部秒与输出帧 | [拉片协议](../references/motion-study.md) |
| 自定义渲染 | JSON 只保存参数，代码在独立 ESM；初始化、资源哈希、异步目标帧、错误传播和释放协议；预览与导出共用 renderAt | [模块协议](../references/render-modules.md) |
| Three.js 接入 | 官方 Three.js 0.187.0 的独立模块：原创几何、材质、灯光、相机；旋转/倾角/相机距离可编辑，与二维画面合成后导出 | `maintainer/modules/three-orbit.mjs` |
| 可继续修改的交付 | 场景、资源、独立 HTML、study 和绑定报告一起保存；修订按稳定对象/动画 ID 比较 | `deliver` 命令 |
| 旧版保持 | 0.1 场景继续读取，53 个旧原子行为保持；使用新字段时显式采用 0.2 | `tests/fixtures/v0.4.1-frames.json` |

本阶段强化的是创作的对象和时间基础，以及分析到制作的可追溯关系。没有引入 MotionHarness 的实现或模板；Three.js 按其 MIT 许可使用，版权说明随独立模块和安装包保留。两份示例的版式、位图和三维形体均为原创。

## 验证证据

- `npm run typecheck`：通过。
- `npm test`：16 项通过；其中包含 53 个旧原子 × 5 个关键/小数帧，共 265 个旧版数值基线。
- `npm run test:browser`：3 项通过，实际 Chrome 绘制，未跳过。覆盖分组重叠透明度、图片 RGB/alpha、哈希失败、曲线、异步模块串行、错误后的新请求、销毁和初始化失败清理；二维与 Three.js 的 40→80→20→40 乱序取帧中，重复帧 PNG 字节一致。此结论限于本机浏览器/GPU。
- `npm run verify`：安装包哈希、193 个文件、58 份场景示例及解压后独立 CLI 校验通过；安装包约 663 KB。
- Skill 官方 `quick_validate.py`：通过。
- 两个 MP4 均实际逐帧编码并由 ffprobe 读回：H.264、960×540、30/1 fps、120 帧、4 秒、无音轨。见各目录的 `render-report.json`。
- 实际查看编码视频的第 5、20、45、80、100、119 帧，覆盖入场、主要动作、停留和退场。未见文字裁切或层级遮挡错误。两份 contact-sheet 来自最终 MP4，非预览截图。
- 完整人工播放未验收：浏览器工具的 URL 安全策略拒绝打开本地 file:// 视频页。数值校验、逐帧浏览器渲染、编码与关键帧抽查分别记录，不把它们写成完整播放已通过。

导出时发现一套本机 FFmpeg 缺少 libx264，使用另一套已具备编码器的版本完成输出；同时修复编码器提前失败导致未捕获 Promise 拒绝的问题，新增实际失败路径测试。没有更改用户全局 FFmpeg 或 Node 配置。

## 本机可查看的成果

| 示例 | 独立预览 | 实际视频 | 编码后关键帧 |
|---|---|---|---|
| 二维组合 | [preview.html](../work/acceptance-0.5.0/composition/preview.html) | [composition.mp4](../work/acceptance-0.5.0/composition/composition.mp4) | [contact-sheet.png](../work/acceptance-0.5.0/composition/contact-sheet.png) |
| Three.js + 二维 | [preview.html](../work/acceptance-0.5.0/three-orbit/preview.html) | [three-orbit.mp4](../work/acceptance-0.5.0/three-orbit/three-orbit.mp4) | [contact-sheet.png](../work/acceptance-0.5.0/three-orbit/contact-sheet.png) |

`work/` 是本机验收产物，不进入源码提交。可重建示例位于 `assets/examples/`；安装包位于 `dist/downloads/motionflux.zip`。交付目录的原始 `delivery.json` 保留自动检查范围，新增视频的结果单独保存在 render-report，不篡改早先文件清单。

## 后续阶段与明确边界

| 阶段 | 当前状态 | 下一步验收目标 |
|---|---|---|
| M0 基础模型与回归 | 本轮基础完成 | 随新对象保持历史基线和可追溯绑定 |
| M1 二维基础创作链路 | 本轮完成 | 用更多真实业务作品迭代排版与原创建议，不能据此声称已达到竞品成片质量 |
| M2 高级二维 | 待实现 | 对象遮罩、混合模式、GPU 质感、精确视频帧、基础音频、原创组合；至少三类真实二维任务验收 |
| M3 原生三维 | 已验证模块接入；原生后端待实现 | glTF/GLB、可编辑三维节点/材质/灯光/相机、AnimationMixer 绝对时间、资源生命周期与二维混合交付 |
| M4 编辑体验 | 待实现 | 参数/关键帧曲线界面、标记、版本比较和项目保存；不替换原有周期表首页 |

Motion Study 已有结构、校验和绑定报告；自动识别视频、可视化证据编辑、自动对比参考画面仍未实现。现有原片加时间轴的 breakdown 格式继续保留，study 尚未自动转为该面板。自定义模块能承载 Three.js，但不能把一个参数化模块描述成完整原生三维制作系统。
