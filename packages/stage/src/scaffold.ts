import { cp, mkdir, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { compileMotionMdToHtml, parseMotionMd, resolveAspectDimensions } from './motion-md.js';
import type { StageTemplateId } from './types.js';

export interface StageTemplateInfo {
  id: StageTemplateId;
  title: string;
  defaultFps: number;
  defaultDurationFrames: number;
  usesStudio3D: boolean;
  summary: string;
}

export const STAGE_TEMPLATES: readonly StageTemplateInfo[] = [
  {
    id: 'default',
    title: 'Minimal Stage Starter',
    defaultFps: 30,
    defaultDurationFrames: 150,
    usesStudio3D: false,
    summary: 'Two-scene HTML/CSS typography & glass card starter with spring motion and procedural SFX.',
  },
  {
    id: 'saas-launch',
    title: 'SaaS Product Launch Trailer',
    defaultFps: 60,
    defaultDurationFrames: 240,
    usesStudio3D: false,
    summary: 'Three-scene SaaS launch trailer with glass UI window mockup, wipe/zoom transitions, KPI bento, and synced SFX.',
  },
  {
    id: 'hardware-3d',
    title: 'Physical 3D Hardware & Horology Reveal',
    defaultFps: 60,
    defaultDurationFrames: 240,
    usesStudio3D: true,
    summary: 'WebGL2/Three.js PBR studio showcase (atoms/studio.mjs) with meshed involute gears, optical iris rig, and Swiss HUD.',
  },
  {
    id: 'data-story',
    title: 'Executive Data Narrative & Telemetry',
    defaultFps: 60,
    defaultDurationFrames: 240,
    usesStudio3D: false,
    summary: 'High-contrast data storytelling with animated SVG telemetry curve, tabular counters, and slide/crossfade transitions.',
  },
] as const;

export function listStageTemplates(): readonly StageTemplateInfo[] {
  return STAGE_TEMPLATES;
}

export interface InitStageOptions {
  outDir: string;
  template?: string;
  aspect?: string;
  width?: number;
  height?: number;
  fps?: number;
  durationFrames?: number;
  title?: string;
  runtimeSourcePath?: string;
}

function buildMotionMdForTemplate(
  template: StageTemplateId,
  title: string,
  width: number,
  height: number,
  fps: number,
  durationFrames: number,
): string {
  if (template === 'hardware-3d') {
    const f1 = Math.max(2, Math.min(Math.max(2, durationFrames - 2), Math.round(durationFrames * 0.55)));
    const f2 = Math.max(2, durationFrames - f1);
    const trans = Math.max(1, Math.min(Math.max(1, f2 - 1), Math.round(fps * 0.3)));
    return `---
title: ${title}
width: ${width}
height: ${height}
fps: ${fps}
accent: #38bdf8
theme: obsidian
quality: cinema
---

## Scene calibre: Precision Calibre
- duration: ${f1}f
- layout: studio-3d
- rig: watch
- camera: orbit(-16deg -> 16deg, elevation: 24deg, distance: 2.75)
- sfx: sub-hit@0f, tick@${Math.min(f1 - 1, Math.round(f1 * 0.25))}f, tick@${Math.min(f1 - 1, Math.round(f1 * 0.5))}f, tick@${Math.min(f1 - 1, Math.round(f1 * 0.75))}f
- badge: CALIBRE MF-01
- eyebrow: GRADE-5 TITANIUM · 20° INVOLUTE GEARING
- headline: ${title}
- subhead: Physically accurate metal anisotropy, ruby bearings, and zero-varnish PBR lighting.
- metrics: 28,800 vph | Beat Lock, 0.00 px | Clipping

## Scene optics: Sapphire & Aperture
- duration: ${f2}f
- layout: studio-3d
- rig: optics
- transition: crossfade ${trans}f
- camera: orbit(-14deg -> 14deg, elevation: 18deg, distance: 2.7)
- sfx: shutter@0f, whoosh-soft@4f, chime@${Math.max(1, Math.round(f2 * 0.35))}f
- badge: AR SAPPHIRE OPTICS
- eyebrow: 11-BLADE CINEMA IRIS · CRF 15 MASTER
- headline: Engineered to the Sub-Millimeter
- subhead: Multi-coated meniscus glass paired with deterministic 60fps optical post-processing.
- metrics: 60 FPS | Master Lock, CRF 15 | Slow Preset
`;
  }

  if (template === 'saas-launch') {
    const f1 = Math.max(2, Math.round(durationFrames * 0.34));
    const f2 = Math.max(2, Math.round(durationFrames * 0.36));
    const f3 = Math.max(2, durationFrames - f1 - f2);
    const t2 = Math.max(1, Math.min(Math.max(1, f2 - 1), Math.round(fps * 0.28)));
    const t3 = Math.max(1, Math.min(Math.max(1, f3 - 1), Math.round(fps * 0.28)));
    return `---
title: ${title}
width: ${width}
height: ${height}
fps: ${fps}
accent: #60a5fa
theme: slate
quality: cinema
---

## Scene hook: Launch Hook
- duration: ${f1}f
- layout: hero
- sfx: sub-hit@0f, whoosh-soft@4f, pop-soft@${Math.min(f1 - 1, Math.round(f1 * 0.25))}f
- badge: RELEASE 2.0
- eyebrow: DETERMINISTIC PRODUCT VIDEO
- headline: ${title}
- subhead: Ship agency-grade product trailers with real HTML/CSS layout, visual audit, and zero API keys.

## Scene workflow: Live Workflow
- duration: ${f2}f
- layout: split
- transition: wipe-left ${t2}f
- sfx: whoosh@0f, click@${Math.min(f2 - 1, Math.round(f2 * 0.22))}f, pop-soft@${Math.min(f2 - 1, Math.round(f2 * 0.4))}f
- eyebrow: AUTOMATED VISUAL QA
- headline: Zero Clipping. Zero Overlap.
- item: Frame-Exact Seeking | CSS, WAAPI, SVG, video, and WebGL locked to exact frame numbers.
- item: WCAG Contrast Audit | Catches unreadable text, overflow, and collisions before encoding.
- code: node scripts/motion.mjs render Motion.md --out launch.mp4 --quality cinema --audit

## Scene impact: Proven Metrics
- duration: ${f3}f
- layout: metrics
- transition: zoom-through ${t3}f
- sfx: riser@0f, sub-hit@${Math.min(f3 - 1, Math.round(f3 * 0.2))}f, chime@${Math.min(f3 - 1, Math.round(f3 * 0.35))}f
- eyebrow: PRODUCTION BENCHMARK
- headline: Built for High-Velocity Teams
- metrics: 60 FPS | Smooth Master, 100% | Local & Offline, 0 Errors | Audited DOM
`;
  }

  if (template === 'data-story') {
    const f1 = Math.max(2, Math.round(durationFrames * 0.32));
    const f2 = Math.max(2, Math.round(durationFrames * 0.38));
    const f3 = Math.max(2, durationFrames - f1 - f2);
    const t2 = Math.max(1, Math.min(Math.max(1, f2 - 1), Math.round(fps * 0.28)));
    const t3 = Math.max(1, Math.min(Math.max(1, f3 - 1), Math.round(fps * 0.28)));
    return `---
title: ${title}
width: ${width}
height: ${height}
fps: ${fps}
accent: #34d399
theme: obsidian
quality: cinema
---

## Scene thesis: Executive Signal
- duration: ${f1}f
- layout: hero
- sfx: sub-hit@0f, pop-soft@10f
- eyebrow: Q4 TELEMETRY BRIEF
- headline: ${title}
- subhead: Latency dropped 64% while throughput scaled across every regional edge cluster.

## Scene curve: Telemetry Breakdown
- duration: ${f2}f
- layout: metrics
- transition: slide-left ${t2}f
- sfx: whoosh-soft@0f, tick@${Math.min(f2 - 1, Math.round(f2 * 0.2))}f, tick@${Math.min(f2 - 1, Math.round(f2 * 0.4))}f
- eyebrow: KEY INDICATORS
- headline: Compounding Efficiency Gains
- metrics: -64% | P99 Latency, 4.8x | Render Throughput, 99.99% | Frame Fidelity

## Scene summary: Strategic Takeaway
- duration: ${f3}f
- layout: feature-grid
- transition: crossfade ${t3}f
- sfx: whoosh@0f, chime@${Math.min(f3 - 1, Math.round(f3 * 0.3))}f
- eyebrow: ARCHITECTURE DRIVERS
- headline: Three Pillars Behind the Curve
- item: Deterministic Timeline | Eliminates flaky wall-clock jitter.
- item: Pre-Render DOM Audit | Catches layout regressions automatically.
- item: Master Encoding | H.264 CRF 15 slow & ProRes 4444 output.
`;
  }

  const mid = Math.max(1, Math.round(durationFrames * 0.55));
  const rest = Math.max(1, durationFrames - mid);
  return `---
title: ${title}
width: ${width}
height: ${height}
fps: ${fps}
accent: #60a5fa
theme: obsidian
quality: cinema
---

## Scene intro: Opening
- duration: ${mid}f
- layout: hero
- sfx: whoosh-soft@4f, pop-soft@12f
- eyebrow: MOTIONFLUX STAGE
- headline: ${title}
- subhead: HTML / CSS / SVG / WebGL deterministic video stage.

## Scene detail: Highlights
- duration: ${rest}f
- layout: feature-grid
- transition: crossfade ${Math.max(2, Math.min(12, Math.floor(rest * 0.3)))}f
- sfx: whoosh@0f, chime@8f
- eyebrow: STAGE CAPABILITIES
- headline: Modern Layout · Physics · Visual Audit
- item: Browser Engine | Flexbox, Grid, SVG, and Three.js PBR studio.
- item: Visual Audit | Automatic overflow, overlap, and WCAG contrast checks.
`;
}

function buildDataStoryHtml(
  title: string,
  width: number,
  height: number,
  fps: number,
  durationFrames: number,
  runtimeImport: string,
): string {
  const f1 = Math.max(15, Math.round(durationFrames * 0.32));
  const f2 = Math.max(15, Math.round(durationFrames * 0.38));
  const f3 = Math.max(15, durationFrames - f1 - f2);
  const t2 = Math.max(4, Math.min(Math.floor(f2 * 0.3), Math.round(fps * 0.28)));
  const t3 = Math.max(4, Math.min(Math.floor(f3 * 0.3), Math.round(fps * 0.28)));
  const safeTitle = title.replace(/</gu, '&lt;');

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle}</title>
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif; }
    #stage { background: #070b12; color: #f8fafc; }
    .scene {
      position: absolute;
      inset: 0;
      padding: 6.5% 7.5%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      background: radial-gradient(120% 100% at 50% 0%, #111c2d 0%, #070b12 100%);
      opacity: 0;
      pointer-events: none;
    }
    .scene[data-mf-active="true"] { opacity: 1; pointer-events: auto; }
    .eyebrow { font-size: 18px; font-weight: 700; letter-spacing: 0.16em; color: #34d399; text-transform: uppercase; }
    h1 { margin: 16px 0; font-size: clamp(52px, 4.6vw, 84px); line-height: 1.08; letter-spacing: -0.03em; }
    h2 { margin: 10px 0 28px 0; font-size: clamp(38px, 3.3vw, 56px); line-height: 1.12; letter-spacing: -0.02em; }
    .sub { margin: 0; font-size: 25px; line-height: 1.48; color: #cbd5e1; max-width: 820px; }
    .telemetry-layout { display: grid; grid-template-columns: ${height >= width ? '1fr' : '1.25fr 0.85fr'}; gap: 28px; align-items: stretch; }
    .chart-card, .stat-card, .pillar-card {
      background: rgba(15, 23, 42, 0.78);
      border: 1px solid rgba(148, 163, 184, 0.18);
      border-radius: 22px;
      padding: 28px;
    }
    .stat-stack { display: flex; flex-direction: column; gap: 20px; justify-content: space-between; }
    .stat-val { font-size: 46px; font-weight: 760; font-variant-numeric: tabular-nums; color: #f8fafc; }
    .stat-lbl { font-size: 19px; color: #cbd5e1; margin-top: 6px; }
    .pillars { display: grid; grid-template-columns: ${height > width * 1.15 ? '1fr' : 'repeat(3, 1fr)'}; gap: 22px; }
    .pillar-idx { font: 700 16px/1 ui-monospace, monospace; color: #34d399; margin-bottom: 12px; }
    .pillar-title { margin: 0 0 10px 0; font-size: 26px; font-weight: 700; }
    .pillar-desc { margin: 0; font-size: 19px; line-height: 1.48; color: #cbd5e1; }
  </style>
</head>
<body>
  <div id="stage" data-mf-stage>
    <section class="scene" data-mf-scene="thesis">
      <div id="thesis-box">
        <div class="eyebrow" data-mf-id="thesis-eyebrow">Q4 TELEMETRY BRIEF</div>
        <h1 data-mf-id="thesis-title">${safeTitle}</h1>
        <p class="sub" data-mf-id="thesis-sub">P99 latency dropped 64% while deterministic render throughput scaled 4.8x.</p>
      </div>
    </section>

    <section class="scene" data-mf-scene="curve">
      <div class="eyebrow" data-mf-id="curve-eyebrow">KEY INDICATORS</div>
      <h2 data-mf-id="curve-title">Compounding Efficiency Gains</h2>
      <div class="telemetry-layout">
        <div class="chart-card" data-mf-id="chart-card" data-mf-no-overlap>
          <svg viewBox="0 0 640 280" width="100%" height="260" aria-label="Telemetry trend">
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#34d399" stop-opacity="0.42" />
                <stop offset="100%" stop-color="#34d399" stop-opacity="0.0" />
              </linearGradient>
            </defs>
            <line x1="20" y1="240" x2="620" y2="240" stroke="rgba(255,255,255,0.12)" stroke-width="1.5" />
            <line x1="20" y1="140" x2="620" y2="140" stroke="rgba(255,255,255,0.07)" stroke-dasharray="6 6" />
            <path id="trend-area" d="M20,225 C160,215 260,175 390,115 C480,74 555,48 615,34 L615,240 L20,240 Z" fill="url(#areaGrad)" />
            <path id="trend-line" d="M20,225 C160,215 260,175 390,115 C480,74 555,48 615,34" fill="none" stroke="#34d399" stroke-width="5" stroke-linecap="round" />
          </svg>
        </div>
        <div class="stat-stack">
          <div class="stat-card" data-mf-id="stat-latency" data-mf-no-overlap>
            <div id="val-lat" class="stat-val">-64%</div>
            <div class="stat-lbl">P99 Render Latency</div>
          </div>
          <div class="stat-card" data-mf-id="stat-speed" data-mf-no-overlap>
            <div id="val-thr" class="stat-val">4.8x</div>
            <div class="stat-lbl">Cluster Throughput</div>
          </div>
        </div>
      </div>
    </section>

    <section class="scene" data-mf-scene="summary">
      <div class="eyebrow" data-mf-id="sum-eyebrow">ARCHITECTURE DRIVERS</div>
      <h2 data-mf-id="sum-title">Three Pillars Behind the Curve</h2>
      <div class="pillars">
        <div class="pillar-card" id="pil-0" data-mf-id="pillar-0" data-mf-no-overlap>
          <div class="pillar-idx">01</div>
          <h3 class="pillar-title">Deterministic Seek</h3>
          <p class="pillar-desc">Frame-exact CSS, SVG, video, and WebGL synchronization.</p>
        </div>
        <div class="pillar-card" id="pil-1" data-mf-id="pillar-1" data-mf-no-overlap>
          <div class="pillar-idx">02</div>
          <h3 class="pillar-title">Visual Audit 2.0</h3>
          <p class="pillar-desc">Pre-render WCAG contrast, overflow, and collision checks.</p>
        </div>
        <div class="pillar-card" id="pil-2" data-mf-id="pillar-2" data-mf-no-overlap>
          <div class="pillar-idx">03</div>
          <h3 class="pillar-title">Cinema Mastering</h3>
          <p class="pillar-desc">H.264 CRF 15 slow &amp; 48kHz stereo procedural audio.</p>
        </div>
      </div>
    </section>
  </div>

  <script type="module">
    import { createStage, clamp, lerp, easeOutCubic, spring } from '${runtimeImport}';

    const thesisBox = document.getElementById('thesis-box');
    const trendLine = document.getElementById('trend-line');
    const trendArea = document.getElementById('trend-area');
    const valLat = document.getElementById('val-lat');
    const valThr = document.getElementById('val-thr');
    const lineLen = 680;
    trendLine.style.strokeDasharray = String(lineLen);

    createStage({
      width: ${width},
      height: ${height},
      fps: ${fps},
      durationFrames: ${durationFrames},
      scenes: [
        { id: 'thesis', label: 'Thesis', startFrame: 0, endFrame: ${f1} },
        { id: 'curve', label: 'Telemetry', startFrame: ${f1}, endFrame: ${f1 + f2}, transitionIn: { kind: 'slide-left', durationFrames: ${t2} } },
        { id: 'summary', label: 'Takeaway', startFrame: ${f1 + f2}, endFrame: ${durationFrames}, transitionIn: { kind: 'crossfade', durationFrames: ${t3} } },
      ],
      audio: [
        { atFrame: 0, sfx: 'sub-hit', gain: 0.5 },
        { atFrame: 8, sfx: 'pop-soft', gain: 0.45 },
        { atFrame: ${f1}, sfx: 'whoosh-soft', gain: 0.5 },
        { atFrame: ${f1 + Math.min(f2 - 1, 14)}, sfx: 'tick', gain: 0.4 },
        { atFrame: ${f1 + f2}, sfx: 'whoosh', gain: 0.5 },
        { atFrame: ${f1 + f2 + Math.min(f3 - 1, 12)}, sfx: 'chime', gain: 0.45 },
      ],
      onFrame({ scene, localTime, localProgress }) {
        if (scene?.id === 'thesis') {
          const s = spring(localTime, { stiffness: 175, damping: 19 });
          thesisBox.style.opacity = String(clamp(s * 1.35));
          thesisBox.style.transform = \`translate3d(0, \${lerp(36, 0, s).toFixed(2)}px, 0)\`;
        } else if (scene?.id === 'curve') {
          const p = easeOutCubic(clamp(localProgress * 1.45));
          trendLine.style.strokeDashoffset = String(lerp(lineLen, 0, p));
          trendArea.style.opacity = String(p);
          valLat.textContent = \`-\${Math.round(lerp(0, 64, p))}%\`;
          valThr.textContent = \`\${lerp(1.0, 4.8, p).toFixed(1)}x\`;
        } else if (scene?.id === 'summary') {
          [0, 1, 2].forEach((idx) => {
            const el = document.getElementById('pil-' + idx);
            const s = spring(Math.max(0, localTime - idx * 0.09), { stiffness: 185, damping: 20 });
            el.style.opacity = String(clamp(s * 1.4));
            el.style.transform = \`translate3d(0, \${lerp(34, 0, s).toFixed(2)}px, 0)\`;
          });
        }
      },
    });
  </script>
</body>
</html>
`;
}

export async function initStageProject(options: InitStageOptions): Promise<{
  directory: string;
  entry: string;
  motionMd: string;
  template: StageTemplateId;
  runtime: string;
  width: number;
  height: number;
  fps: number;
  durationFrames: number;
}> {
  const rawTemplate = (options.template ?? 'default').toLowerCase() as StageTemplateId;
  const tplMeta = STAGE_TEMPLATES.find((t) => t.id === rawTemplate);
  if (!tplMeta) {
    throw new Error(
      `USAGE: --template must be one of ${STAGE_TEMPLATES.map((t) => t.id).join(', ')}; got "${String(options.template)}".`,
    );
  }

  const { width, height } = resolveAspectDimensions(options.aspect, options.width, options.height);
  const fps = Math.round(options.fps ?? tplMeta.defaultFps);
  const durationFrames = Math.round(options.durationFrames ?? tplMeta.defaultDurationFrames);
  const title = options.title ?? (rawTemplate === 'default' ? 'MotionFlux Stage' : tplMeta.title);

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
  const runtimeImport = options.runtimeSourcePath ? './runtime.mjs' : '/__motionflux/stage/runtime.mjs';

  const mdContent = buildMotionMdForTemplate(rawTemplate, title, width, height, fps, durationFrames);
  const motionMdPath = join(outDir, 'Motion.md');
  await writeFile(motionMdPath, mdContent);

  let html: string;
  if (rawTemplate === 'saas-launch' || rawTemplate === 'hardware-3d') {
    const doc = parseMotionMd(mdContent);
    html = compileMotionMdToHtml(doc, { runtimeImportPath: runtimeImport });
  } else if (rawTemplate === 'data-story') {
    html = buildDataStoryHtml(title, width, height, fps, durationFrames, runtimeImport);
  } else {
    const mid = Math.round(durationFrames * 0.55);
    html = `<!doctype html>
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
    import { createStage, clamp, lerp, remap, spring } from '${runtimeImport}';

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
      onFrame({ frame, scene, localTime }) {
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
  }

  const entry = join(outDir, 'index.html');
  await writeFile(entry, html);

  return {
    directory: outDir,
    entry,
    motionMd: motionMdPath,
    template: rawTemplate,
    runtime: options.runtimeSourcePath ? runtimeTarget : '/__motionflux/stage/runtime.mjs',
    width,
    height,
    fps,
    durationFrames,
  };
}
