# MotionFlux Stage 底座协议（`stage-1`）

`stage/runtime.mjs` 是零依赖的浏览器 ES 模块，让任何 **HTML / CSS / SVG / Canvas / WebGL（Three.js）** 作品具备确定性逐帧驱动、交互式预览、DOM 几何防穿帮审计与带音效视频导出能力。

## 最小接入

```html
<div id="stage" data-mf-stage>
  <section data-mf-scene="intro">
    <h1 id="title" data-mf-id="hero-title">MotionFlux</h1>
  </section>
</div>

<script type="module">
  import { createStage, clamp, lerp, spring } from './runtime.mjs';
  // 也可直接按需引入 53 个纯函数原子，例如：
  // import decode from '/__motionflux/atoms/text.decode.mjs';

  const title = document.getElementById('title');

  createStage({
    width: 1920,
    height: 1080,
    fps: 30,
    durationFrames: 150,
    scenes: [
      { id: 'intro', label: '开场', startFrame: 0, endFrame: 150 },
    ],
    audio: [
      { atFrame: 4, sfx: 'whoosh-soft', gain: 0.45 },
      { atFrame: 12, sfx: 'pop-soft', gain: 0.5 },
      // 也支持外部 BGM 或配音：
      // { src: './bgm.mp3', atSec: 0, gain: 0.25, fadeInSec: 0.5, fadeOutSec: 1.0, loop: true }
    ],
    onFrame({ localTime }) {
      const s = spring(localTime, { stiffness: 180, damping: 18 });
      title.style.opacity = String(clamp(s * 1.4));
      title.style.transform = `translate3d(0, ${lerp(40, 0, s)}px, 0)`;
    },
  });
</script>
```

## 确定性时间同步

每次 `seek(frame)` 会按顺序同步五层时间，保证浏览器预览与逐帧捕获逐像素一致：

1. **CSS 变量**：自动更新 `--mf-frame`、`--mf-time`、`--mf-progress`、`--mf-scene-frame`、`--mf-scene-progress`。
2. **分镜容器**：`[data-mf-scene="<id>"]` 自动切换 `data-mf-active="true|false"` 并更新 `--mf-local-frame`、`--mf-local-progress`。
3. **CSS 动画与 WAAPI**：自动暂停舞台内所有 CSS `@keyframes` 和 `element.animate()` 并精准定位 `currentTime`；加 `data-mf-local-time` 可按所属分镜局部时间从 0 计时。
4. **内嵌视频**：舞台内 `<video>` 自动按 `data-mf-start-frame`、`data-mf-offset-sec`、`data-mf-rate` 精准 seek 并等待 `seeked`。
5. **自定义逐帧钩子**：执行 `await onFrame(ctx)`，适合驱动 SVG 路径、Three.js / WebGL、Canvas 2D 或 MotionFlux 的 53 个 `.mjs` 原子。

## 内置程序化音效（零外部 API Key）

在 `audio` 数组中直接声明即可随视频自动合成 48kHz 立体声轨并混音进 MP4/MOV/WebM：

| `sfx` | 适用场景 | 可选参数 |
|---|---|---|
| `whoosh` / `whoosh-soft` | 转场、卡片滑入、镜头推拉 | `gain`, `pitch`, `durationSec`, `pan` |
| `pop` / `pop-soft` | 弹簧落点、标签弹出、徽章出现 | `gain`, `pitch`, `durationSec`, `pan` |
| `tick` / `click` | 计数跳动、打字、UI 按钮点击 | `gain`, `pitch`, `pan` |
| `sub-hit` | 主标题重击、重场切换 | `gain`, `pitch`, `durationSec` |
| `riser` | 揭晓前的蓄力推升 | `gain`, `pitch`, `durationSec` |
| `chime` | 完成提示、Logo 收尾 | `gain`, `pitch`, `durationSec` |
| `shutter` | 截图定格、快门切换 | `gain`, `pitch` |

## DOM 几何防穿帮审计（`audit`）

CLI 在真实 Chrome 中检查关键帧并输出结构化 JSON 与拼图：

- `CLIPPED_OUTSIDE_STAGE`（error）：可见内容超出舞台边界。装饰/背景允许出血时加 `data-mf-allow-bleed` 或 `data-mf-role="background"`。
- `TEXT_OVERFLOW`（error）：文字溢出被裁切容器。
- `ELEMENT_OVERLAP`（error）：独立文本块或 `[data-mf-no-overlap]` 元素意外重叠 > 15%。刻意叠层时加 `data-mf-allow-overlap`。
- `BROKEN_IMAGE` / `BROKEN_VIDEO` / `FONT_LOAD_ERROR`（error）：素材或字体加载失败。
- `SAFE_AREA_WARNING` / `TINY_TEXT` / `BLANK_FRAME`（warning）：安全区侵入、字号过小或空帧提醒。

## CLI 命令

```sh
node scripts/motion.mjs init work/demo --width 1920 --height 1080 --fps 30 --duration 150
node scripts/motion.mjs audit work/demo/index.html --contact work/demo/contact.png --out work/demo/audit.json
node scripts/motion.mjs frames work/demo/index.html --out work/demo/frames --frames 0,45,90
node scripts/motion.mjs render work/demo/index.html --out work/demo/out.mp4 --audit
node scripts/motion.mjs serve work/demo/index.html --port 4178
```
