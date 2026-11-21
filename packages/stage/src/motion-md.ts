import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { SFX_KINDS } from './audio.js';
import { TRANSITION_KINDS } from './runtime.js';
import type { AudioCue, ProceduralSfxCue, SceneTransition, SfxKind, StageScene, TransitionKind } from './types.js';

export type MotionSceneLayout =
  | 'hero'
  | 'split'
  | 'metrics'
  | 'feature-grid'
  | 'terminal'
  | 'studio-3d'
  | 'closing';

export type StudioRigPreset = 'watch' | 'hardware' | 'optics';

export type MotionTheme = 'obsidian' | 'slate' | 'ivory';

export const MOTION_LAYOUTS: readonly MotionSceneLayout[] = [
  'hero',
  'split',
  'metrics',
  'feature-grid',
  'terminal',
  'studio-3d',
  'closing',
] as const;

export interface CameraSpec {
  raw: string;
  mode: 'orbit' | 'push-in' | 'pan' | 'static';
  fromAzimuthDeg: number;
  toAzimuthDeg: number;
  elevationDeg: number;
  distance: number;
  zoomFrom: number;
  zoomTo: number;
}

export interface MetricItem {
  value: string;
  label: string;
}

export interface FeatureItem {
  title: string;
  detail: string;
}

export interface MotionMdScene extends StageScene {
  durationFrames: number;
  durationSec: number;
  layout: MotionSceneLayout;
  rig?: StudioRigPreset;
  cameraSpec: CameraSpec;
  eyebrow?: string;
  headline: string;
  subhead?: string;
  badge?: string;
  metrics: MetricItem[];
  items: FeatureItem[];
  code?: string;
  readingLoadPerSec: number;
}

export interface MotionMdDiagnostic {
  severity: 'error' | 'warning';
  code: string;
  sceneId?: string;
  message: string;
}

export interface MotionMdDocument {
  specVersion: 'motion-md-1';
  title: string;
  width: number;
  height: number;
  fps: number;
  durationFrames: number;
  durationSeconds: number;
  accent: string;
  theme: MotionTheme;
  quality: 'standard' | 'cinema';
  usesStudio3D: boolean;
  scenes: MotionMdScene[];
  audio: AudioCue[];
  diagnostics: MotionMdDiagnostic[];
}

export class MotionMdValidationError extends Error {
  readonly code = 'MOTION_MD_INVALID';
  readonly diagnostics: MotionMdDiagnostic[];

  constructor(diagnostics: MotionMdDiagnostic[]) {
    super(`MOTION_MD_INVALID: ${diagnostics.map((d) => d.message).join(' | ')}`);
    this.diagnostics = diagnostics;
  }
}

function slugify(text: string, fallback: string): string {
  const s = text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5_-]+/gu, '-')
    .replace(/^-+|-+$/gu, '');
  return s || fallback;
}

function parseDurationToFrames(raw: string, fps: number): number | null {
  const trimmed = raw.trim();
  const secMatch = trimmed.match(/^([\d.]+)\s*s(?:ec)?$/iu);
  if (secMatch) {
    const sec = Number(secMatch[1]);
    return Number.isFinite(sec) && sec > 0 ? Math.max(1, Math.round(sec * fps)) : null;
  }
  const frameMatch = trimmed.match(/^(\d+)\s*f(?:rames?)?$/iu);
  if (frameMatch) {
    const f = Number(frameMatch[1]);
    return Number.isFinite(f) && f > 0 ? f : null;
  }
  const plain = Number(trimmed);
  if (Number.isFinite(plain) && plain > 0) {
    return Number.isInteger(plain) && plain >= 10 ? plain : Math.max(1, Math.round(plain * fps));
  }
  return null;
}

export function parseCameraDirective(raw: string | undefined): CameraSpec {
  const base: CameraSpec = {
    raw: raw?.trim() ?? 'static',
    mode: 'orbit',
    fromAzimuthDeg: -22,
    toAzimuthDeg: 22,
    elevationDeg: 20,
    distance: 2.35,
    zoomFrom: 0.97,
    zoomTo: 1.02,
  };
  if (!raw) return base;
  const text = raw.trim();
  if (/^static$/iu.test(text)) {
    return { ...base, mode: 'static', fromAzimuthDeg: 0, toAzimuthDeg: 0, zoomFrom: 1, zoomTo: 1 };
  }
  if (/^push-in/iu.test(text)) {
    const nums = [...text.matchAll(/(-?[\d.]+)/gu)].map((m) => Number(m[1]));
    return {
      ...base,
      mode: 'push-in',
      zoomFrom: nums[0] ?? 0.95,
      zoomTo: nums[1] ?? 1.04,
      distance: nums[2] ?? 2.15,
    };
  }
  if (/^pan/iu.test(text)) {
    const nums = [...text.matchAll(/(-?[\d.]+)/gu)].map((m) => Number(m[1]));
    return {
      ...base,
      mode: 'pan',
      fromAzimuthDeg: nums[0] ?? -14,
      toAzimuthDeg: nums[1] ?? 14,
    };
  }
  const arrow = text.match(/(-?[\d.]+)\s*(?:deg)?\s*->\s*(-?[\d.]+)\s*(?:deg)?/iu);
  const elev = text.match(/elevation\s*[:=]\s*(-?[\d.]+)/iu);
  const dist = text.match(/distance\s*[:=]\s*([\d.]+)/iu);
  return {
    ...base,
    mode: 'orbit',
    fromAzimuthDeg: arrow ? Number(arrow[1]) : base.fromAzimuthDeg,
    toAzimuthDeg: arrow ? Number(arrow[2]) : base.toAzimuthDeg,
    elevationDeg: elev ? Number(elev[1]) : base.elevationDeg,
    distance: dist ? Number(dist[1]) : base.distance,
  };
}

function estimateReadingUnits(texts: Array<string | undefined>): number {
  let cjk = 0;
  let latinWords = 0;
  for (const part of texts) {
    if (!part) continue;
    const cjkMatches = part.match(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/gu);
    cjk += cjkMatches ? cjkMatches.length : 0;
    const stripped = part.replace(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/gu, ' ');
    const words = stripped.trim().split(/\s+/u).filter(Boolean);
    latinWords += words.length;
  }
  return cjk + latinWords * 2.2;
}

/**
 * Parse and validate a structured `Motion.md` director script into frame-exact Stage scenes,
 * procedural/file audio cues, camera choreography, and pacing diagnostics.
 */
export function parseMotionMd(markdown: string): MotionMdDocument {
  const diagnostics: MotionMdDiagnostic[] = [];
  const normalized = markdown.replace(/\r\n/gu, '\n');
  let body = normalized;
  const meta: Record<string, string> = {};

  const fm = normalized.match(/^---\n([\s\S]*?)\n---\n?/u);
  if (fm) {
    body = normalized.slice(fm[0].length);
    for (const line of fm[1]!.split('\n')) {
      const m = line.match(/^\s*([a-zA-Z0-9_-]+)\s*:\s*(.+?)\s*$/u);
      if (m) meta[m[1]!.toLowerCase()] = m[2]!.replace(/^['"]|['"]$/gu, '');
    }
  }

  const lines = body.split('\n');
  interface RawSceneBlock {
    heading: string;
    lines: string[];
  }
  const blocks: RawSceneBlock[] = [];
  let current: RawSceneBlock | undefined;

  for (const line of lines) {
    const h2 = line.match(/^##\s+(.+?)\s*$/u);
    if (h2) {
      current = { heading: h2[1]!, lines: [] };
      blocks.push(current);
      continue;
    }
    if (!current) {
      const topMeta = line.match(/^\s*-\s*([a-zA-Z0-9_-]+)\s*:\s*(.+?)\s*$/u);
      if (topMeta) {
        meta[topMeta[1]!.toLowerCase()] = topMeta[2]!.replace(/^['"]|['"]$/gu, '');
      }
      continue;
    }
    current.lines.push(line);
  }

  const title = meta.title || 'MotionFlux Production';
  const width = Math.round(Number(meta.width ?? 1920));
  const height = Math.round(Number(meta.height ?? 1080));
  const fps = Math.round(Number(meta.fps ?? 60));
  const accent = /^#[0-9a-fA-F]{6}$/u.test(meta.accent ?? '') ? meta.accent! : '#38bdf8';
  const rawTheme = (meta.theme ?? 'obsidian').toLowerCase();
  const theme: MotionTheme =
    rawTheme === 'slate' || rawTheme === 'ivory' || rawTheme === 'obsidian' ? rawTheme : 'obsidian';
  const quality: 'standard' | 'cinema' = meta.quality === 'standard' ? 'standard' : 'cinema';

  if (!(width >= 160 && width <= 3840 && height >= 160 && height <= 3840)) {
    diagnostics.push({
      severity: 'error',
      code: 'CANVAS_DIMENSIONS',
      message: `Stage width/height must be between 160 and 3840 px; got ${width}×${height}.`,
    });
  }
  if (!(fps >= 1 && fps <= 120)) {
    diagnostics.push({
      severity: 'error',
      code: 'INVALID_FPS',
      message: `fps must be between 1 and 120; got ${fps}.`,
    });
  }
  if (blocks.length === 0) {
    diagnostics.push({
      severity: 'error',
      code: 'NO_SCENES',
      message: 'Motion.md must contain at least one `## Scene <id>: <label>` section.',
    });
  }

  const audio: AudioCue[] = [];
  if (meta.bgm) {
    audio.push({
      src: meta.bgm,
      atFrame: 0,
      gain: Number.isFinite(Number(meta.bgmgain)) ? Number(meta.bgmgain) : 0.25,
      fadeInSec: 0.4,
      fadeOutSec: 0.9,
      loop: true,
    });
  }

  const seenIds = new Set<string>();
  const scenes: MotionMdScene[] = [];
  let cursorFrame = 0;

  for (let idx = 0; idx < blocks.length; idx++) {
    const block = blocks[idx]!;
    const strippedHeading = block.heading.replace(/^scene\s+/iu, '').trim();
    const colonIdx = strippedHeading.indexOf(':');
    const rawId = colonIdx >= 0 ? strippedHeading.slice(0, colonIdx).trim() : strippedHeading;
    const label = colonIdx >= 0 ? strippedHeading.slice(colonIdx + 1).trim() : strippedHeading;
    const sceneId = slugify(rawId, `scene-${idx + 1}`);
    if (seenIds.has(sceneId)) {
      diagnostics.push({
        severity: 'error',
        code: 'DUPLICATE_SCENE_ID',
        sceneId,
        message: `Duplicate scene id "${sceneId}". Each ## Scene heading must have a unique id.`,
      });
    }
    seenIds.add(sceneId);

    const props = new Map<string, string[]>();
    let inFence = false;
    const fenceLines: string[] = [];
    const freeParagraphs: string[] = [];

    for (const rawLine of block.lines) {
      if (rawLine.trim().startsWith('```')) {
        inFence = !inFence;
        continue;
      }
      if (inFence) {
        fenceLines.push(rawLine);
        continue;
      }
      const kv = rawLine.match(/^\s*-\s*([a-zA-Z0-9_-]+)\s*:\s*(.+?)\s*$/u);
      if (kv) {
        const key = kv[1]!.toLowerCase();
        const list = props.get(key) ?? [];
        list.push(kv[2]!.trim());
        props.set(key, list);
      } else if (rawLine.trim().length > 0 && !rawLine.trim().startsWith('>')) {
        freeParagraphs.push(rawLine.trim());
      }
    }

    const getOne = (k: string): string | undefined => props.get(k)?.[0];
    const durRaw = getOne('duration') ?? getOne('frames') ?? '2.5s';
    const durFrames = parseDurationToFrames(durRaw, fps);
    if (!durFrames) {
      diagnostics.push({
        severity: 'error',
        code: 'INVALID_DURATION',
        sceneId,
        message: `Scene "${sceneId}" has invalid duration "${durRaw}". Use e.g. 2.5s or 150f.`,
      });
    }
    const durationFrames = durFrames ?? Math.round(2.5 * fps);
    const startFrame = cursorFrame;
    const endFrame = startFrame + durationFrames;
    cursorFrame = endFrame;

    const rawLayout = (getOne('layout') ?? 'hero').toLowerCase() as MotionSceneLayout;
    if (!MOTION_LAYOUTS.includes(rawLayout)) {
      diagnostics.push({
        severity: 'error',
        code: 'INVALID_LAYOUT',
        sceneId,
        message: `Scene "${sceneId}" has unknown layout "${rawLayout}". Valid layouts: ${MOTION_LAYOUTS.join(', ')}.`,
      });
    }
    const layout: MotionSceneLayout = MOTION_LAYOUTS.includes(rawLayout) ? rawLayout : 'hero';

    const rawRig = getOne('rig')?.toLowerCase();
    let rig: StudioRigPreset | undefined;
    if (rawRig !== undefined) {
      if (rawRig === 'watch' || rawRig === 'hardware' || rawRig === 'optics') {
        rig = rawRig;
      } else {
        diagnostics.push({
          severity: 'error',
          code: 'INVALID_RIG',
          sceneId,
          message: `Scene "${sceneId}" has unknown 3D rig "${rawRig}". Valid rigs: watch, hardware, optics.`,
        });
      }
    } else if (layout === 'studio-3d') {
      rig = 'watch';
    }

    let transitionIn: SceneTransition | undefined;
    const transRaw = getOne('transition');
    if (transRaw && transRaw.toLowerCase() !== 'cut' && transRaw.toLowerCase() !== 'none') {
      const parts = transRaw.trim().split(/\s+/u);
      const kind = parts[0]!.toLowerCase() as TransitionKind;
      const tFrames = parts[1] ? parseDurationToFrames(parts[1], fps) : Math.round(fps * 0.3);
      if (!TRANSITION_KINDS.includes(kind)) {
        diagnostics.push({
          severity: 'error',
          code: 'INVALID_TRANSITION',
          sceneId,
          message: `Scene "${sceneId}" has unknown transition "${kind}". Valid: ${TRANSITION_KINDS.join(', ')}.`,
        });
      } else if (!tFrames || tFrames >= durationFrames) {
        diagnostics.push({
          severity: 'error',
          code: 'TRANSITION_TOO_LONG',
          sceneId,
          message: `Scene "${sceneId}" transition duration (${tFrames ?? 0}f) must be shorter than scene duration (${durationFrames}f).`,
        });
      } else if (idx > 0) {
        transitionIn = { kind, durationFrames: tFrames };
      }
    }

    const sfxRaw = props.get('sfx')?.join(', ');
    if (sfxRaw && sfxRaw.toLowerCase() !== 'none') {
      const entries = sfxRaw.split(/,(?![^()]*\))/u).map((s) => s.trim()).filter(Boolean);
      for (const item of entries) {
        const m = item.match(/^([a-z-]+)(?:@([\d.]+[fs]?))?(?:\(([^)]+)\))?$/iu);
        if (!m) {
          diagnostics.push({
            severity: 'error',
            code: 'INVALID_SFX_SYNTAX',
            sceneId,
            message: `Scene "${sceneId}" could not parse sfx cue "${item}". Expected e.g. whoosh-soft@6f or sub-hit@0.2s.`,
          });
          continue;
        }
        const kind = m[1]!.toLowerCase() as SfxKind;
        if (!SFX_KINDS.includes(kind)) {
          diagnostics.push({
            severity: 'error',
            code: 'UNKNOWN_SFX',
            sceneId,
            message: `Scene "${sceneId}" references unknown sfx "${kind}". Valid: ${SFX_KINDS.join(', ')}.`,
          });
          continue;
        }
        const offsetFrames = m[2]
          ? (m[2] === '0' || m[2] === '0f' || m[2] === '0s' ? 0 : (parseDurationToFrames(m[2], fps) ?? 0))
          : 0;
        const cue: ProceduralSfxCue = {
          sfx: kind,
          atFrame: startFrame + Math.max(0, offsetFrames),
        };
        if (m[3]) {
          for (const kvPair of m[3].split(';').flatMap((p) => p.split(','))) {
            const [k, v] = kvPair.split('=').map((x) => x.trim());
            const num = Number(v);
            if (k === 'gain' && Number.isFinite(num)) cue.gain = num;
            if (k === 'pitch' && Number.isFinite(num)) cue.pitch = num;
            if (k === 'pan' && Number.isFinite(num)) cue.pan = num;
          }
        }
        audio.push(cue);
      }
    }

    const metrics: MetricItem[] = [];
    for (const mLine of props.get('metrics') ?? []) {
      for (const chunk of mLine.split(/;|,(?!\d{3}\b)/u).map((c) => c.trim()).filter(Boolean)) {
        const [val, lbl] = chunk.split('|').map((s) => s.trim());
        if (val) metrics.push({ value: val, label: lbl || 'Metric' });
      }
    }

    const items: FeatureItem[] = [];
    for (const bLine of [...(props.get('item') ?? []), ...(props.get('items') ?? []), ...(props.get('bullets') ?? [])]) {
      for (const chunk of bLine.split(';').map((c) => c.trim()).filter(Boolean)) {
        const [t, d] = chunk.split('|').map((s) => s.trim());
        if (t) items.push({ title: t, detail: d || '' });
      }
    }

    const eyebrow = getOne('eyebrow');
    const headline = getOne('headline') ?? label;
    const subhead = getOne('subhead') ?? (freeParagraphs.length > 0 ? freeParagraphs.join(' ') : undefined);
    const badge = getOne('badge');
    const code = fenceLines.length > 0 ? fenceLines.join('\n') : getOne('code');
    const cameraRaw = getOne('camera');
    const cameraSpec = parseCameraDirective(cameraRaw);
    const notes = getOne('notes');

    const durationSec = Math.round((durationFrames / fps) * 1000) / 1000;
    const units = estimateReadingUnits([
      eyebrow,
      headline,
      subhead,
      ...metrics.map((m) => `${m.value} ${m.label}`),
      ...items.map((it) => `${it.title} ${it.detail}`),
    ]);
    const readingLoadPerSec = Math.round((units / Math.max(0.25, durationSec)) * 10) / 10;
    if (readingLoadPerSec > 24) {
      diagnostics.push({
        severity: 'warning',
        code: 'COPY_TOO_DENSE',
        sceneId,
        message: `Scene "${sceneId}" packs ~${readingLoadPerSec} reading units/sec into ${durationSec}s. Consider trimming copy or extending duration to >= ${(units / 18).toFixed(1)}s.`,
      });
    }

    scenes.push({
      id: sceneId,
      label,
      startFrame,
      endFrame,
      durationFrames,
      durationSec,
      layout,
      ...(rig ? { rig } : {}),
      ...(transitionIn ? { transitionIn } : {}),
      ...(cameraRaw ? { camera: cameraRaw } : {}),
      cameraSpec,
      ...(notes ? { notes } : {}),
      ...(eyebrow ? { eyebrow } : {}),
      headline,
      ...(subhead ? { subhead } : {}),
      ...(badge ? { badge } : {}),
      metrics,
      items,
      ...(code ? { code } : {}),
      readingLoadPerSec,
    });
  }

  const errors = diagnostics.filter((d) => d.severity === 'error');
  if (errors.length > 0) {
    throw new MotionMdValidationError(diagnostics);
  }

  const usesStudio3D = scenes.some((s) => s.layout === 'studio-3d' || Boolean(s.rig));
  return {
    specVersion: 'motion-md-1',
    title,
    width,
    height,
    fps,
    durationFrames: cursorFrame,
    durationSeconds: Math.round((cursorFrame / fps) * 1000) / 1000,
    accent,
    theme,
    quality,
    usesStudio3D,
    scenes,
    audio,
    diagnostics,
  };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/gu, '&amp;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;')
    .replace(/"/gu, '&quot;');
}

function renderSceneMarkup(scene: MotionMdScene): string {
  const id = escapeHtml(scene.id);
  const eyebrow = scene.eyebrow
    ? `<div class="mf-eyebrow" data-mf-id="${id}-eyebrow">${escapeHtml(scene.eyebrow)}</div>`
    : '';
  const badge = scene.badge
    ? `<span class="mf-badge" data-mf-id="${id}-badge">${escapeHtml(scene.badge)}</span>`
    : '';
  const subhead = scene.subhead
    ? `<p class="mf-sub" data-mf-id="${id}-sub">${escapeHtml(scene.subhead)}</p>`
    : '';

  if (scene.layout === 'studio-3d') {
    const metricStrip = scene.metrics.length > 0
      ? `<div class="mf-studio-metrics">${scene.metrics
          .slice(0, 3)
          .map(
            (m, i) => `<div class="mf-mini-stat" data-mf-id="${id}-stat-${i}" data-mf-no-overlap>
              <div class="mf-mini-val">${escapeHtml(m.value)}</div>
              <div class="mf-mini-lbl">${escapeHtml(m.label)}</div>
            </div>`,
          )
          .join('')}</div>`
      : '';
    return `
    <section class="mf-scene mf-layout-studio" data-mf-scene="${id}">
      <div class="mf-studio-hud" id="anim-${id}">
        ${badge}
        ${eyebrow}
        <h1 class="mf-h1-left" data-mf-id="${id}-title">${escapeHtml(scene.headline)}</h1>
        ${subhead}
        ${metricStrip}
      </div>
    </section>`;
  }

  if (scene.layout === 'metrics') {
    const cards = (scene.metrics.length > 0
      ? scene.metrics
      : [
          { value: '60 FPS', label: 'Deterministic Lock' },
          { value: '0 Errors', label: 'DOM Geometry Audit' },
          { value: 'CRF 15', label: 'Cinema Master' },
        ]
    )
      .slice(0, 4)
      .map(
        (m, i) => `<div class="mf-metric-card" data-mf-stagger="${i}" data-mf-id="${id}-metric-${i}" data-mf-no-overlap>
          <div class="mf-metric-val">${escapeHtml(m.value)}</div>
          <div class="mf-metric-lbl">${escapeHtml(m.label)}</div>
        </div>`,
      )
      .join('');
    return `
    <section class="mf-scene mf-layout-metrics" data-mf-scene="${id}">
      <div class="mf-header-stack" id="anim-${id}">
        ${eyebrow}
        <h2 class="mf-h2" data-mf-id="${id}-title">${escapeHtml(scene.headline)}</h2>
        ${subhead}
      </div>
      <div class="mf-metrics-grid">${cards}</div>
    </section>`;
  }

  if (scene.layout === 'feature-grid') {
    const cards = (scene.items.length > 0
      ? scene.items
      : [
          { title: 'HTML / CSS / SVG Stage', detail: 'Modern typography, flexbox/grid, and deterministic seeking.' },
          { title: 'Physical 3D Studio', detail: 'Involute CAD mechanics, brushed metals, and AR sapphire optics.' },
          { title: 'Automated Visual Audit', detail: 'WCAG contrast, clipping, overflow, and collision checks.' },
        ]
    )
      .slice(0, 4)
      .map(
        (it, i) => `<div class="mf-feature-card" data-mf-stagger="${i}" data-mf-id="${id}-feat-${i}" data-mf-no-overlap>
          <div class="mf-feat-index">0${i + 1}</div>
          <h3 class="mf-feat-title">${escapeHtml(it.title)}</h3>
          ${it.detail ? `<p class="mf-feat-body">${escapeHtml(it.detail)}</p>` : ''}
        </div>`,
      )
      .join('');
    return `
    <section class="mf-scene mf-layout-features" data-mf-scene="${id}">
      <div class="mf-header-stack" id="anim-${id}">
        ${eyebrow}
        <h2 class="mf-h2" data-mf-id="${id}-title">${escapeHtml(scene.headline)}</h2>
      </div>
      <div class="mf-features-grid">${cards}</div>
    </section>`;
  }

  if (scene.layout === 'terminal' || scene.layout === 'split') {
    const codeText =
      scene.code ??
      `node scripts/motion.mjs doctor\nnode scripts/motion.mjs audit index.html --contact sheet.png\nnode scripts/motion.mjs render index.html --out master.mp4 --quality cinema`;
    const listHtml = scene.items.length > 0
      ? `<div class="mf-bullet-stack">${scene.items
          .slice(0, 3)
          .map(
            (it, i) => `<div class="mf-bullet-row" data-mf-stagger="${i}" data-mf-id="${id}-row-${i}" data-mf-no-overlap>
              <span class="mf-dot"></span>
              <div><strong>${escapeHtml(it.title)}</strong>${it.detail ? ` — ${escapeHtml(it.detail)}` : ''}</div>
            </div>`,
          )
          .join('')}</div>`
      : '';
    return `
    <section class="mf-scene mf-layout-split" data-mf-scene="${id}">
      <div class="mf-split-copy" id="anim-${id}">
        ${badge}
        ${eyebrow}
        <h2 class="mf-h2-left" data-mf-id="${id}-title">${escapeHtml(scene.headline)}</h2>
        ${subhead}
        ${listHtml}
      </div>
      <div class="mf-window-card" data-mf-stagger="1" data-mf-id="${id}-window" data-mf-no-overlap>
        <div class="mf-win-bar">
          <span class="mf-win-dot r"></span><span class="mf-win-dot y"></span><span class="mf-win-dot g"></span>
          <span class="mf-win-title">motionflux — stage-1</span>
        </div>
        <pre class="mf-code"><code>${escapeHtml(codeText)}</code></pre>
      </div>
    </section>`;
  }

  // 'hero' and 'closing'
  return `
    <section class="mf-scene mf-layout-hero" data-mf-scene="${id}">
      <div class="mf-hero-stack" id="anim-${id}">
        ${badge}
        ${eyebrow}
        <h1 class="mf-h1" data-mf-id="${id}-title">${escapeHtml(scene.headline)}</h1>
        ${subhead}
      </div>
    </section>`;
}

export function compileMotionMdToHtml(
  doc: MotionMdDocument,
  options: { runtimeImportPath?: string; studioImportPath?: string } = {},
): string {
  const runtimeImport = options.runtimeImportPath ?? '/__motionflux/stage/runtime.mjs';
  const studioImport = options.studioImportPath ?? '/__motionflux/atoms/studio.mjs';

  const palette =
    doc.theme === 'ivory'
      ? {
          bgTop: '#f8fafc',
          bgBottom: '#e2e8f0',
          fg: '#0f172a',
          muted: '#334155',
          cardBg: 'rgba(255, 255, 255, 0.84)',
          cardBorder: 'rgba(15, 23, 42, 0.12)',
          gridLine: 'rgba(15, 23, 42, 0.05)',
          codeBg: '#0f172a',
          codeFg: '#e2e8f0',
        }
      : doc.theme === 'slate'
        ? {
            bgTop: '#172033',
            bgBottom: '#0b101b',
            fg: '#f8fafc',
            muted: '#cbd5e1',
            cardBg: 'rgba(15, 23, 42, 0.72)',
            cardBorder: 'rgba(148, 163, 184, 0.2)',
            gridLine: 'rgba(255, 255, 255, 0.04)',
            codeBg: 'rgba(9, 13, 22, 0.92)',
            codeFg: '#e2e8f0',
          }
        : {
            bgTop: '#121620',
            bgBottom: '#06080c',
            fg: '#f8fafc',
            muted: '#cbd5e1',
            cardBg: 'rgba(15, 19, 28, 0.76)',
            cardBorder: 'rgba(255, 255, 255, 0.14)',
            gridLine: 'rgba(255, 255, 255, 0.035)',
            codeBg: 'rgba(8, 10, 15, 0.92)',
            codeFg: '#e2e8f0',
          };

  const stageScenesMeta: StageScene[] = doc.scenes.map((s) => ({
    id: s.id,
    ...(s.label !== undefined ? { label: s.label } : {}),
    startFrame: s.startFrame,
    endFrame: s.endFrame,
    ...(s.transitionIn ? { transitionIn: s.transitionIn } : {}),
    ...(s.camera ? { camera: s.camera } : {}),
  }));

  const sceneDriverData = doc.scenes.map((s) => ({
    id: s.id,
    layout: s.layout,
    rig: s.rig ?? null,
    cameraSpec: s.cameraSpec,
  }));

  const studioScriptBlock = doc.usesStudio3D
    ? `
    import {
      THREE,
      RoundedBoxGeometry,
      createStudioRig,
      createStudioBackdrop,
      createInvoluteGearGeometry,
      createSpiralSpringGeometry,
      createKnurledCylinderGeometry,
      createIrisBladeGeometry,
      createOpticalLensGeometry,
    } from '${studioImport}';

    const studioCanvas = document.getElementById('mf-studio-canvas');
    const studio = createStudioRig({
      canvas: studioCanvas,
      width: ${doc.width},
      height: ${doc.height},
      shadowBounds: 2.8,
      seed: 42,
      accentColor: parseInt('${doc.accent.slice(1)}', 16),
    });
    studio.bloomPass.strength = 0.18;
    studio.bloomPass.threshold = 0.94;
    const backdrop = createStudioBackdrop({ y: -0.68, radius: 9.5 });
    studio.scene.add(backdrop.mesh);

    const rigGroups = {
      watch: new THREE.Group(),
      hardware: new THREE.Group(),
      optics: new THREE.Group(),
    };
    studio.scene.add(rigGroups.watch, rigGroups.hardware, rigGroups.optics);

    // 1. Watch Calibre Rig (exact involute gear mesh d = R1 + R2, ruby jewels, titanium bridge & hairspring)
    const basePlate = new THREE.Mesh(new RoundedBoxGeometry(1.58, 0.08, 1.24, 4, 0.025), studio.materials.obsidian);
    basePlate.position.y = -0.12;
    basePlate.receiveShadow = true;
    const mainWheel = new THREE.Mesh(
      createInvoluteGearGeometry({ teeth: 60, pitchRadius: 0.44, spokes: 5, thickness: 0.045 }),
      studio.materials.roseGold,
    );
    mainWheel.position.set(-0.14, 0, 0);
    mainWheel.castShadow = true;
    const pinion = new THREE.Mesh(
      createInvoluteGearGeometry({ teeth: 30, pitchRadius: 0.22, spokes: 0, thickness: 0.058 }),
      studio.materials.brushedSteel,
    );
    pinion.position.set(-0.14 + 0.44 + 0.22, 0.008, 0);
    pinion.castShadow = true;
    const jewelMain = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.068, 32), studio.materials.rubyJewel);
    jewelMain.position.set(-0.14, 0.036, 0);
    const jewelPin = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.068, 32), studio.materials.rubyJewel);
    jewelPin.position.set(0.52, 0.038, 0);
    const screwL = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.095, 24), studio.materials.bluedSteel);
    screwL.position.set(-0.38, 0.06, -0.18);
    const screwR = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.095, 24), studio.materials.bluedSteel);
    screwR.position.set(0.62, 0.06, 0.16);
    const hairspring = new THREE.Mesh(
      createSpiralSpringGeometry({ turns: 5.5, innerRadius: 0.045, outerRadius: 0.19, height: 0.018 }),
      studio.materials.bluedSteel,
    );
    hairspring.position.set(-0.46, 0.055, 0.28);
    const bridge = new THREE.Mesh(new RoundedBoxGeometry(1.12, 0.032, 0.19, 3, 0.01), studio.materials.titanium);
    bridge.position.set(0.12, 0.078, -0.01);
    bridge.rotation.y = -0.32;
    bridge.castShadow = true;
    rigGroups.watch.add(basePlate, mainWheel, pinion, jewelMain, jewelPin, screwL, screwR, hairspring, bridge);
    rigGroups.watch.position.set(0.56, -0.02, 0);
    rigGroups.watch.rotation.set(0.28, -0.22, 0.04);

    // 2. CNC Industrial Hardware Rig (anodized deck, 72-flute knurled encoder & damped keycaps)
    const deck = new THREE.Mesh(new RoundedBoxGeometry(1.56, 0.16, 1.12, 4, 0.04), studio.materials.obsidian);
    deck.position.y = -0.16;
    deck.castShadow = true;
    deck.receiveShadow = true;
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 0.055, 48), studio.materials.roseGold);
    collar.position.set(0.28, -0.05, -0.12);
    const encoder = new THREE.Mesh(
      createKnurledCylinderGeometry({ radius: 0.27, height: 0.25, grooves: 72 }),
      studio.materials.titanium,
    );
    encoder.position.set(0.28, 0.08, -0.12);
    encoder.castShadow = true;
    const keycaps = [0, 1, 2].map((k) => {
      const cap = new THREE.Mesh(
        new RoundedBoxGeometry(0.29, 0.11, 0.29, 4, 0.028),
        k === 0 ? studio.materials.vermilionLacquer : studio.materials.brushedSteel,
      );
      cap.position.set(-0.44 + k * 0.35, -0.03, 0.22);
      cap.castShadow = true;
      rigGroups.hardware.add(cap);
      return cap;
    });
    rigGroups.hardware.add(deck, collar, encoder);
    rigGroups.hardware.position.set(0.56, -0.02, 0);
    rigGroups.hardware.rotation.set(0.24, -0.2, 0);

    // 3. Hollow Machined Cinema Optical Iris & AR Meniscus Lens Rig
    const barrelShape = new THREE.Shape();
    const outerTeeth = 72;
    for (let i = 0; i <= outerTeeth * 2; i++) {
      const a = (i / (outerTeeth * 2)) * Math.PI * 2;
      const r = i % 2 === 0 ? 0.62 : 0.595;
      if (i === 0) barrelShape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else barrelShape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    const boreHole = new THREE.Path();
    boreHole.absarc(0, 0, 0.43, 0, Math.PI * 2, true);
    barrelShape.holes.push(boreHole);
    const barrelGeo = new THREE.ExtrudeGeometry(barrelShape, {
      depth: 0.22,
      bevelEnabled: true,
      bevelThickness: 0.018,
      bevelSize: 0.014,
      bevelSegments: 3,
      curveSegments: 48,
    });
    barrelGeo.center();
    const barrel = new THREE.Mesh(barrelGeo, studio.materials.obsidian);
    const retainingRing = new THREE.Mesh(new THREE.TorusGeometry(0.445, 0.018, 24, 96), studio.materials.roseGold);
    retainingRing.position.z = 0.115;
    const rearMountRing = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.022, 20, 72), studio.materials.brass);
    rearMountRing.position.z = -0.09;
    const sensorChamber = new THREE.Mesh(new THREE.CircleGeometry(0.42, 64), studio.materials.titanium);
    sensorChamber.position.z = -0.11;
    const irisGroup = new THREE.Group();
    irisGroup.position.z = 0.02;
    const bladeCount = 11;
    const irisBlades = Array.from({ length: bladeCount }, (_, b) => {
      const pivot = new THREE.Group();
      const angle = (b / bladeCount) * Math.PI * 2;
      pivot.position.set(Math.cos(angle) * 0.39, Math.sin(angle) * 0.39, b * 0.0022);
      pivot.rotation.z = angle + 0.52;
      const leaf = new THREE.Mesh(
        createIrisBladeGeometry({ innerRadius: 0.13, outerRadius: 0.39, thickness: 0.008 }),
        b % 2 === 0 ? studio.materials.brushedSteel : studio.materials.titanium,
      );
      leaf.position.set(-0.19, 0, 0);
      pivot.add(leaf);
      irisGroup.add(pivot);
      return { pivot, baseAngle: angle };
    });
    const frontLens = new THREE.Mesh(
      createOpticalLensGeometry({ radius: 0.43, edgeThickness: 0.05, frontSag: 0.09, backSag: -0.025 }),
      studio.materials.arGlass,
    );
    frontLens.rotation.x = Math.PI / 2;
    frontLens.position.z = 0.12;
    rigGroups.optics.add(barrel, retainingRing, rearMountRing, sensorChamber, irisGroup, frontLens);
    rigGroups.optics.position.set(0.58, 0.04, 0);
    rigGroups.optics.rotation.set(-0.44, -0.26, 0.06);

    await studio.renderer.compileAsync(studio.scene, studio.camera);

    function updateStudio3D(frame, localProgress, spec, rigName) {
      const activeRig = rigName || 'watch';
      rigGroups.watch.visible = activeRig === 'watch';
      rigGroups.hardware.visible = activeRig === 'hardware';
      rigGroups.optics.visible = activeRig === 'optics';

      if (activeRig === 'watch') {
        const omega = frame * 0.014;
        mainWheel.rotation.y = omega;
        pinion.rotation.y = -omega * (60 / 30) + Math.PI / 30;
        const pulse = 1 + Math.sin(frame * 0.22) * 0.035;
        hairspring.scale.set(pulse, 1, pulse);
      } else if (activeRig === 'hardware') {
        encoder.rotation.y = frame * 0.025;
        keycaps.forEach((cap, idx) => {
          const trigger = Math.max(0, localProgress * 3 - idx * 0.55);
          const press = trigger > 0 && trigger < 1 ? Math.sin(trigger * Math.PI) * 0.055 : 0;
          cap.position.y = -0.03 - press;
        });
      } else if (activeRig === 'optics') {
        const closeAmt = Math.sin(localProgress * Math.PI) * 0.34;
        irisBlades.forEach(({ pivot, baseAngle }) => {
          pivot.rotation.z = baseAngle + 0.42 + closeAmt;
        });
        barrel.rotation.z = frame * 0.006;
      }

      const azDeg = lerp(spec.fromAzimuthDeg, spec.toAzimuthDeg, easeInOutCubic(localProgress));
      const az = (azDeg * Math.PI) / 180;
      const el = ((spec.elevationDeg || 22) * Math.PI) / 180;
      const dist = Math.max(2.6, spec.distance || 2.75);
      studio.camera.position.set(
        Math.sin(az) * Math.cos(el) * dist,
        Math.sin(el) * dist,
        Math.cos(az) * Math.cos(el) * dist,
      );
      studio.camera.lookAt(0, -0.02, 0);
      studio.render({ frame });
    }
    `
    : '';

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(doc.title)}</title>
  <style>
    :root {
      --mf-accent: ${doc.accent};
      --mf-fg: ${palette.fg};
      --mf-muted: ${palette.muted};
      --mf-card-bg: ${palette.cardBg};
      --mf-card-border: ${palette.cardBorder};
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    #stage {
      background: radial-gradient(125% 105% at 55% 10%, ${palette.bgTop} 0%, ${palette.bgBottom} 100%);
      color: var(--mf-fg);
    }
    .mf-grid-bg {
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(${palette.gridLine} 1px, transparent 1px),
        linear-gradient(90deg, ${palette.gridLine} 1px, transparent 1px);
      background-size: 64px 64px;
      mask-image: radial-gradient(circle at 50% 50%, black 35%, transparent 88%);
      pointer-events: none;
    }
    #mf-studio-canvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      display: block;
      pointer-events: none;
    }
    .mf-scene {
      position: absolute;
      inset: 0;
      padding: 6.5% 7.5%;
      display: flex;
      opacity: 0;
      pointer-events: none;
    }
    .mf-scene:not(.mf-layout-studio) {
      background: radial-gradient(125% 105% at 55% 10%, ${palette.bgTop} 0%, ${palette.bgBottom} 100%);
    }
    .mf-scene[data-mf-active="true"] {
      opacity: 1;
      pointer-events: auto;
    }
    .mf-eyebrow {
      font-size: 18px;
      font-weight: 650;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--mf-accent);
    }
    .mf-badge {
      display: inline-flex;
      align-self: flex-start;
      padding: 6px 14px;
      border-radius: 999px;
      font-size: 15px;
      font-weight: 600;
      background: var(--mf-card-bg);
      border: 1px solid var(--mf-card-border);
      color: var(--mf-fg);
    }
    .mf-h1 {
      margin: 0;
      font-size: clamp(54px, 4.8vw, 88px);
      line-height: 1.08;
      letter-spacing: -0.03em;
      font-weight: 750;
      text-align: center;
      max-width: 1180px;
    }
    .mf-h1-left {
      margin: 0;
      font-size: clamp(46px, 3.8vw, 70px);
      line-height: 1.1;
      letter-spacing: -0.025em;
      font-weight: 750;
    }
    .mf-h2 {
      margin: 0;
      font-size: clamp(42px, 3.6vw, 64px);
      line-height: 1.12;
      letter-spacing: -0.025em;
      font-weight: 720;
      text-align: center;
    }
    .mf-h2-left {
      margin: 0;
      font-size: clamp(38px, 3.2vw, 56px);
      line-height: 1.14;
      letter-spacing: -0.02em;
      font-weight: 720;
    }
    .mf-sub {
      margin: 0;
      font-size: 25px;
      line-height: 1.48;
      color: var(--mf-muted);
      max-width: 760px;
    }
    .mf-layout-hero {
      align-items: center;
      justify-content: center;
    }
    .mf-hero-stack {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 22px;
      text-align: center;
    }
    .mf-hero-stack .mf-badge { align-self: center; }
    .mf-layout-studio {
      align-items: center;
      justify-content: flex-start;
    }
    .mf-studio-hud {
      width: 46%;
      padding: 36px 40px;
      border-radius: 24px;
      background: var(--mf-card-bg);
      border: 1px solid var(--mf-card-border);
      backdrop-filter: blur(18px);
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .mf-studio-metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 14px;
      margin-top: 8px;
    }
    .mf-mini-stat {
      padding: 14px 16px;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--mf-card-border);
    }
    .mf-mini-val {
      font-size: 24px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
    .mf-mini-lbl {
      font-size: 15px;
      color: var(--mf-muted);
      margin-top: 4px;
    }
    .mf-layout-metrics, .mf-layout-features {
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 44px;
    }
    .mf-header-stack {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      text-align: center;
    }
    .mf-metrics-grid {
      width: 100%;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 24px;
    }
    .mf-metric-card {
      padding: 36px 32px;
      border-radius: 22px;
      background: var(--mf-card-bg);
      border: 1px solid var(--mf-card-border);
      backdrop-filter: blur(16px);
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .mf-metric-val {
      font-size: 54px;
      font-weight: 760;
      letter-spacing: -0.03em;
      font-variant-numeric: tabular-nums;
      color: var(--mf-fg);
    }
    .mf-metric-lbl {
      font-size: 21px;
      color: var(--mf-muted);
      font-weight: 500;
    }
    .mf-features-grid {
      width: 100%;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 24px;
    }
    .mf-feature-card {
      padding: 32px;
      border-radius: 22px;
      background: var(--mf-card-bg);
      border: 1px solid var(--mf-card-border);
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .mf-feat-index {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 16px;
      font-weight: 700;
      color: var(--mf-accent);
    }
    .mf-feat-title {
      margin: 0;
      font-size: 28px;
      font-weight: 680;
    }
    .mf-feat-body {
      margin: 0;
      font-size: 20px;
      line-height: 1.48;
      color: var(--mf-muted);
    }
    .mf-layout-split {
      align-items: center;
      justify-content: space-between;
      gap: 48px;
    }
    .mf-split-copy {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .mf-bullet-stack {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 6px;
    }
    .mf-bullet-row {
      display: flex;
      align-items: baseline;
      gap: 12px;
      font-size: 20px;
      line-height: 1.45;
      color: var(--mf-muted);
    }
    .mf-bullet-row strong { color: var(--mf-fg); }
    .mf-dot {
      width: 9px;
      height: 9px;
      border-radius: 999px;
      background: var(--mf-accent);
      flex: none;
    }
    .mf-window-card {
      flex: 1.05;
      border-radius: 20px;
      background: ${palette.codeBg};
      border: 1px solid var(--mf-card-border);
      box-shadow: 0 28px 72px rgba(0, 0, 0, 0.45);
      overflow: hidden;
    }
    .mf-win-bar {
      height: 44px;
      padding: 0 18px;
      display: flex;
      align-items: center;
      gap: 8px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .mf-win-dot { width: 11px; height: 11px; border-radius: 999px; }
    .mf-win-dot.r { background: #ef4444; }
    .mf-win-dot.y { background: #f59e0b; }
    .mf-win-dot.g { background: #10b981; }
    .mf-win-title {
      margin-left: 10px;
      font: 500 14px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
      color: #94a3b8;
    }
    .mf-code {
      margin: 0;
      padding: 28px;
      font: 500 19px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace;
      color: ${palette.codeFg};
      white-space: pre-wrap;
      word-break: break-word;
    }
  </style>
</head>
<body>
  <div id="stage" data-mf-stage>
    <div class="mf-grid-bg" data-mf-allow-bleed data-mf-role="background"></div>
    ${doc.usesStudio3D ? `<canvas id="mf-studio-canvas" width="${doc.width}" height="${doc.height}" data-mf-allow-bleed></canvas>` : ''}
    ${doc.scenes.map(renderSceneMarkup).join('\n')}
  </div>

  <script type="module">
    import { createStage, clamp, lerp, easeInOutCubic, spring } from '${runtimeImport}';
    ${studioScriptBlock}

    const sceneDrivers = ${JSON.stringify(sceneDriverData)};
    const driverMap = new Map(sceneDrivers.map((d) => [d.id, d]));

    createStage({
      width: ${doc.width},
      height: ${doc.height},
      fps: ${doc.fps},
      durationFrames: ${doc.durationFrames},
      scenes: ${JSON.stringify(stageScenesMeta, null, 2)},
      audio: ${JSON.stringify(doc.audio, null, 2)},
      onFrame({ frame, scene, localTime, localProgress, stage }) {
        if (!scene) return;
        const driver = driverMap.get(scene.id);
        const headerEl = document.getElementById('anim-' + scene.id);
        if (headerEl) {
          const s = spring(localTime, { stiffness: 175, damping: 19 });
          headerEl.style.opacity = String(clamp(s * 1.35));
          headerEl.style.transform = \`translate3d(0, \${lerp(34, 0, s).toFixed(2)}px, 0)\`;
        }
        const sceneEl = stage.querySelector(\`[data-mf-scene="\${scene.id}"]\`);
        if (sceneEl) {
          const cards = sceneEl.querySelectorAll('[data-mf-stagger]');
          cards.forEach((card) => {
            const idx = Number(card.getAttribute('data-mf-stagger') || '0');
            const cs = spring(Math.max(0, localTime - 0.1 - idx * 0.08), { stiffness: 185, damping: 20 });
            card.style.opacity = String(clamp(cs * 1.4));
            card.style.transform = \`translate3d(0, \${lerp(36, 0, cs).toFixed(2)}px, 0) scale(\${lerp(0.96, 1, cs).toFixed(4)})\`;
          });
        }
        ${
          doc.usesStudio3D
            ? `if (driver && (driver.layout === 'studio-3d' || driver.rig)) {
          studioCanvas.style.opacity = '1';
          updateStudio3D(frame, localProgress, driver.cameraSpec, driver.rig);
        } else if (!stage.querySelector('.mf-layout-studio[data-mf-active="true"]')) {
          studioCanvas.style.opacity = '0';
        }`
            : ''
        }
      },
    });
  </script>
</body>
</html>
`;
}

export async function compileMotionMdProject(
  mdPath: string,
  options: {
    outDir: string;
    runtimeSourcePath?: string;
  },
): Promise<{
  directory: string;
  entry: string;
  motionMd: string;
  planPath: string;
  document: MotionMdDocument;
}> {
  const absMd = resolve(mdPath);
  const raw = await readFile(absMd, 'utf8');
  const doc = parseMotionMd(raw);
  const outDir = resolve(options.outDir);
  await mkdir(outDir, { recursive: true });

  let runtimeImportPath = '/__motionflux/stage/runtime.mjs';
  if (options.runtimeSourcePath) {
    await cp(options.runtimeSourcePath, join(outDir, 'runtime.mjs'));
    runtimeImportPath = './runtime.mjs';
  }

  const targetMd = join(outDir, 'Motion.md');
  if (resolve(absMd) !== resolve(targetMd)) {
    await writeFile(targetMd, raw);
  }
  const planPath = join(outDir, 'stage.plan.json');
  await writeFile(planPath, `${JSON.stringify(doc, null, 2)}\n`);

  const html = compileMotionMdToHtml(doc, { runtimeImportPath });
  const entry = join(outDir, 'index.html');
  await writeFile(entry, html);

  return {
    directory: outDir,
    entry,
    motionMd: targetMd,
    planPath,
    document: doc,
  };
}

export async function saveMotionMdPlan(mdPath: string, outPath?: string): Promise<MotionMdDocument & { planPath?: string }> {
  const raw = await readFile(resolve(mdPath), 'utf8');
  const doc = parseMotionMd(raw);
  if (outPath) {
    const absOut = resolve(outPath);
    await mkdir(dirname(absOut), { recursive: true });
    await writeFile(absOut, `${JSON.stringify(doc, null, 2)}\n`);
    return { ...doc, planPath: absOut };
  }
  return doc;
}
