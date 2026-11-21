# MotionFlux Stage 底座协议（`stage-1`）

`stage/runtime.mjs` 是零依赖的浏览器 ES 模块，让任何 **HTML / CSS / SVG / Canvas / WebGL2 / WebGPU（Three.js）** 作品具备确定性逐帧驱动、交互式预览、DOM 几何防穿帮审计与带音效母带视频导出能力。

## 最小接入（2D 排版 + 音效）

```html
<div id="stage" data-mf-stage>
  <section data-mf-scene="intro">
    <h1 id="title" data-mf-id="hero-title">MotionFlux</h1>
  </section>
</div>

<script type="module">
  import { createStage, clamp, lerp, spring } from './runtime.mjs';
  // 也可直接按需引入 53 个纯函数原子（详见 ../assets/catalog.md）：
  // import decode from '/__motionflux/atoms/text.decode.mjs';

  const title = document.getElementById('title');

  createStage({
    width: 1920,
    height: 1080,
    fps: 60,
    durationFrames: 180,
    scenes: [
      { id: 'intro', label: '开场', startFrame: 0, endFrame: 180 },
    ],
    audio: [
      { atFrame: 4, sfx: 'whoosh-soft', gain: 0.45 },
      { atFrame: 18, sfx: 'pop-soft', gain: 0.5 },
    ],
    onFrame({ localTime }) {
      const s = spring(localTime, { stiffness: 180, damping: 18 });
      title.style.opacity = String(clamp(s * 1.4));
      title.style.transform = `translate3d(0, ${lerp(40, 0, s)}px, 0)`;
    },
  });
</script>
```

## 挂载物理 3D 摄影棚与精密机械套件（`studio.mjs`）

制作硬件、钟表、光学镜头等实物视频时，直接在舞台内放一张 `<canvas data-mf-allow-bleed>`，通过 `/__motionflux/atoms/studio.mjs` 挂载物理 PBR 摄影棚与 CAD 机械构件（详见 [studio.md](../atoms/studio.md) 与 [实物 3D 规范](../references/physical-3d.md)），上层继续叠加真实 HTML/CSS/SVG 排版并接受 `audit` 审计：

```html
<div id="stage" data-mf-stage>
  <canvas id="studio-canvas" width="1920" height="1080" data-mf-allow-bleed
    style="position:absolute;inset:0;width:100%;height:100%"></canvas>
  <section data-mf-scene="hero" style="position:relative;z-index:1;padding:72px">
    <h1 data-mf-id="headline">CHRONO CALIBRE</h1>
  </section>
</div>

<script type="module">
  import { createStage } from './runtime.mjs';
  import { THREE, createStudioRig, createStudioBackdrop, createInvoluteGearGeometry } from '/__motionflux/atoms/studio.mjs';

  const canvas = document.getElementById('studio-canvas');
  const studio = createStudioRig({ canvas, width: 1920, height: 1080, shadowBounds: 2.6, seed: 42 });
  studio.scene.add(createStudioBackdrop({ y: -0.65, radius: 9 }).mesh);

  const gear = new THREE.Mesh(
    createInvoluteGearGeometry({ teeth: 60, pitchRadius: 0.6, spokes: 5, thickness: 0.05 }),
    studio.materials.roseGold,
  );
  studio.scene.add(gear);
  await studio.renderer.compileAsync(studio.scene, studio.camera);

  createStage({
    width: 1920,
    height: 1080,
    fps: 60,
    durationFrames: 240,
    scenes: [{ id: 'hero', startFrame: 0, endFrame: 240 }],
    audio: [{ atFrame: 0, sfx: 'sub-hit', gain: 0.5 }],
    onFrame({ frame }) {
      gear.rotation.y = frame * 0.01;
      studio.camera.position.set(0, 1.2, 2.3);
      studio.camera.lookAt(0, 0, 0);
      studio.render({ frame });
    },
  });
</script>
```

## 确定性时间同步与无缝镜头转场

每次 `seek(frame)` 会按顺序同步五层时间，保证浏览器预览与逐帧捕获逐像素一致：

1. **CSS 变量**：自动更新 `--mf-frame`、`--mf-time`、`--mf-progress`、`--mf-scene-frame`、`--mf-scene-progress`。
2. **分镜容器与重叠转场**：`[data-mf-scene="<id>"]` 自动切换 `data-mf-active="true|false"` 与 `data-mf-phase="entering|active|exiting|inactive"`，更新 `--mf-local-frame`、`--mf-local-progress`、`--mf-transition-in`、`--mf-transition-out`。在 `scenes` 中为下一镜头配置 `transitionIn: { kind: 'crossfade' | 'wipe-left' | 'wipe-up' | 'slide-left' | 'zoom-through', durationFrames: 18 }` 时，前序镜头会在切点后自动延长保持终态并叠加平滑退场，消除硬切黑缝（完整导演脚本语法见 [Motion.md 规范](../references/motion-md.md)）。
3. **CSS 动画与 WAAPI**：自动暂停舞台内所有 CSS `@keyframes` 和 `element.animate()` 并精准定位 `currentTime`；加 `data-mf-local-time` 可按所属分镜局部时间从 0 计时。
4. **内嵌视频**：舞台内 `<video>` 自动按 `data-mf-start-frame`、`data-mf-offset-sec`、`data-mf-rate` 精准 seek 并等待 `seeked`。
5. **自定义逐帧钩子**：执行 `await onFrame(ctx)`（另导出 `cameraRig2D` 与 `beatPulse` 运镜/节拍辅助函数），适合驱动 Three.js / WebGL2 / WebGPU、SVG 路径、Canvas 2D 或 MotionFlux 的 53 个 `.mjs` 原子。

## 内置程序化音效（零外部 API Key）

在 `audio` 数组中直接声明即可随视频自动合成 48kHz 立体声轨并混音进 MP4/MOV/WebM：

| `sfx` | 适用场景 | 可选参数 |
|---|---|---|
| `whoosh` / `whoosh-soft` | 转场、卡片滑入、镜头推拉 | `gain`, `pitch`, `durationSec`, `pan` |
| `pop` / `pop-soft` | 弹簧落点、标签弹出、徽章出现 | `gain`, `pitch`, `durationSec`, `pan` |
| `tick` / `click` | 棘轮步进、计数跳动、打字、微动开关点击 | `gain`, `pitch`, `pan` |
| `sub-hit` | 主标题重击、重场切换 | `gain`, `pitch`, `durationSec` |
| `riser` | 揭晓前的蓄力推升 | `gain`, `pitch`, `durationSec` |
| `chime` | 完成提示、Logo 收尾 | `gain`, `pitch`, `durationSec` |
| `shutter` | 光圈合拢、截图定格、快门切换 | `gain`, `pitch` |

## 智能视觉防穿帮审计 2.0（`audit`）

CLI 在真实 Chrome 中检查关键帧并输出结构化 JSON（每条问题附带精确 CSS `selector` 与 `fix` 修复建议）及联版图：

- `CLIPPED_OUTSIDE_STAGE`（error）：可见内容超出舞台边界。装饰/全屏三维背景允许出血时加 `data-mf-allow-bleed` 或 `data-mf-role="background"`。
- `TEXT_OVERFLOW`（error）：文字溢出被裁切容器。
- `ELEMENT_OVERLAP`（error）：同镜头内独立文本块或 `[data-mf-no-overlap]` 元素意外重叠 > 15%（跨镜头转场期间自动豁免进出场叠化）。刻意叠层时加 `data-mf-allow-overlap`。
- `LOW_CONTRAST_TEXT`（error / warning）：文字与合成背景亮度对比度低于 WCAG 2.1 AA 标准（正文 `4.5:1` / 大字 `3.0:1`，极低不可读直接报 `error`；刻意暗纹装饰可标 `data-mf-allow-low-contrast`）。
- `BROKEN_IMAGE` / `BROKEN_VIDEO` / `FONT_LOAD_ERROR`（error）：素材或字体加载失败。
- `SAFE_AREA_WARNING` / `TINY_TEXT` / `BLANK_FRAME`（warning）：安全区侵入、字号过小或空帧提醒。

## CLI 命令

```sh
node scripts/motion.mjs doctor
node scripts/motion.mjs templates
node scripts/motion.mjs init work/demo --template hardware-3d --fps 60 --duration 240
node scripts/motion.mjs plan work/demo/Motion.md
node scripts/motion.mjs compile work/demo/Motion.md --out work/demo-compiled
node scripts/motion.mjs audit work/demo/index.html --contact work/demo/contact.png --out work/demo/audit.json
node scripts/motion.mjs frames work/demo/index.html --out work/demo/frames --frames 0,45,90
node scripts/motion.mjs render work/demo/index.html --out work/demo/out.mp4 --quality cinema --audit
node scripts/motion.mjs serve work/demo/index.html --port 4178
```
