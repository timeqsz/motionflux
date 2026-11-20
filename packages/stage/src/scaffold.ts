import { cp, mkdir, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

export interface InitStageOptions {
  outDir: string;
  width?: number;
  height?: number;
  fps?: number;
  durationFrames?: number;
  title?: string;
  runtimeSourcePath?: string;
}

export async function initStageProject(options: InitStageOptions): Promise<{
  directory: string;
  entry: string;
  runtime: string;
  width: number;
  height: number;
  fps: number;
  durationFrames: number;
}> {
  const width = Math.round(options.width ?? 1920);
  const height = Math.round(options.height ?? 1080);
  const fps = Math.round(options.fps ?? 30);
  const durationFrames = Math.round(options.durationFrames ?? 150);
  const title = options.title ?? 'MotionFlux Stage';

  if (!(width >= 160 && width <= 3840 && height >= 160 && height <= 3840)) {
    throw new Error('USAGE: --width and --height must be 160–3840 px.');
  }
  if (!(fps >= 1 && fps <= 120)) {
    throw new Error('USAGE: --fps must be 1–120.');
  }
  if (!(durationFrames >= 1 && durationFrames <= 36000)) {
    throw new Error('USAGE: --duration must be 1–36000 frames.');
  }

  const outDir = resolve(options.outDir);
  const existing = await stat(join(outDir, 'index.html')).catch(() => undefined);
  if (existing) {
    throw new Error(`TARGET_EXISTS: ${join(outDir, 'index.html')} already exists. Choose a new directory.`);
  }

  await mkdir(outDir, { recursive: true });
  const runtimeTarget = join(outDir, 'runtime.mjs');
  if (options.runtimeSourcePath) {
    await cp(options.runtimeSourcePath, runtimeTarget);
  }

  const mid = Math.round(durationFrames * 0.55);
  const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title.replace(/</gu, '&lt;')}</title>
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", sans-serif; }
    #stage {
      background: radial-gradient(120% 100% at 50% 0%, #161b26 0%, #090b10 100%);
      color: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .grid-bg {
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
      background-size: 64px 64px;
      mask-image: radial-gradient(circle at 50% 50%, black 30%, transparent 80%);
    }
    .scene {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 8%;
      gap: 24px;
      opacity: 0;
      pointer-events: none;
    }
    .scene[data-mf-active="true"] {
      opacity: 1;
      pointer-events: auto;
    }
    .eyebrow {
      font-size: 20px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: #60a5fa;
      font-weight: 600;
    }
    h1 {
      margin: 0;
      font-size: clamp(56px, 5vw, 96px);
      line-height: 1.08;
      letter-spacing: -0.03em;
      text-align: center;
      font-weight: 700;
    }
    .sub {
      margin: 0;
      font-size: 28px;
      line-height: 1.45;
      color: #94a3b8;
      max-width: 780px;
      text-align: center;
    }
    .card {
      width: min(820px, 82%);
      padding: 40px 44px;
      border-radius: 24px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.12);
      backdrop-filter: blur(18px);
      box-shadow: 0 32px 80px rgba(0, 0, 0, 0.45);
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .card-title { margin: 0; font-size: 40px; font-weight: 650; }
    .card-body { margin: 0; font-size: 24px; color: #cbd5e1; line-height: 1.5; }
  </style>
</head>
<body>
  <div id="stage" data-mf-stage>
    <div class="grid-bg" data-mf-allow-bleed data-mf-role="background"></div>

    <section class="scene" data-mf-scene="intro">
      <div class="eyebrow" data-mf-id="eyebrow">MOTIONFLUX STAGE</div>
      <h1 id="hero-title" data-mf-id="hero-title">${title.replace(/</gu, '&lt;')}</h1>
      <p id="hero-sub" class="sub" data-mf-id="hero-sub">HTML / CSS / SVG / WebGL 确定性视频底座</p>
    </section>

    <section class="scene" data-mf-scene="detail">
      <div id="detail-card" class="card" data-mf-id="detail-card" data-mf-no-overlap>
        <h2 class="card-title">现代排版 · 物理曲线 · 自动防穿帮</h2>
        <p class="card-body">在浏览器里直接预览、逐帧拖动、执行 DOM 几何审计，并导出带程序化音效的 MP4。</p>
      </div>
    </section>
  </div>

  <script type="module">
    import { createStage, clamp, lerp, remap, spring } from '${options.runtimeSourcePath ? './runtime.mjs' : '/__motionflux/stage/runtime.mjs'}';

    const heroTitle = document.getElementById('hero-title');
    const heroSub = document.getElementById('hero-sub');
    const detailCard = document.getElementById('detail-card');

    createStage({
      width: ${width},
      height: ${height},
      fps: ${fps},
      durationFrames: ${durationFrames},
      scenes: [
        { id: 'intro', label: '开场', startFrame: 0, endFrame: ${mid} },
        { id: 'detail', label: '内容', startFrame: ${mid}, endFrame: ${durationFrames} },
      ],
      audio: [
        { atFrame: 4, sfx: 'whoosh-soft', gain: 0.45 },
        { atFrame: 12, sfx: 'pop-soft', gain: 0.5 },
        { atFrame: ${mid}, sfx: 'whoosh', gain: 0.55 },
        { atFrame: ${mid + 8}, sfx: 'chime', gain: 0.4 },
      ],
      onFrame({ frame, fps, scene, localTime }) {
        if (scene?.id === 'intro') {
          const s1 = spring(localTime, { stiffness: 170, damping: 18 });
          const s2 = spring(Math.max(0, localTime - 0.14), { stiffness: 160, damping: 19 });
          heroTitle.style.opacity = String(clamp(s1 * 1.4));
          heroTitle.style.transform = \`translate3d(0, \${lerp(42, 0, s1).toFixed(2)}px, 0) scale(\${lerp(0.96, 1, s1).toFixed(4)})\`;
          heroSub.style.opacity = String(clamp(s2 * 1.4));
          heroSub.style.transform = \`translate3d(0, \${lerp(28, 0, s2).toFixed(2)}px, 0)\`;
        } else if (scene?.id === 'detail') {
          const s = spring(localTime, { stiffness: 190, damping: 20 });
          const fadeOut = remap(frame, ${durationFrames - 12}, ${durationFrames - 1}, 1, 0.92);
          detailCard.style.opacity = String(clamp(s * 1.35) * fadeOut);
          detailCard.style.transform = \`translate3d(0, \${lerp(48, 0, s).toFixed(2)}px, 0) scale(\${lerp(0.94, 1, s).toFixed(4)})\`;
        }
      },
    });
  </script>
</body>
</html>
`;

  const entry = join(outDir, 'index.html');
  await writeFile(entry, html);

  return {
    directory: outDir,
    entry,
    runtime: options.runtimeSourcePath ? runtimeTarget : '/__motionflux/stage/runtime.mjs',
    width,
    height,
    fps,
    durationFrames,
  };
}
