#!/usr/bin/env node
import { readFile, writeFile, mkdir, mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { capabilities, getCapability, searchCapabilities } from '../../catalog/src/index.js';
import { createExampleScene, previewKind } from '../../catalog/src/examples.js';
import { compileScene, assertScene, SceneValidationError, ENGINE_VERSION, type MotionSpec } from '../../core/src/index.js';
import { createStandaloneHtml, versionLock } from '../../core/src/export.js';
import { captureFrames, encodeVideo, ffmpegPath, findBrowser, probeVideo, toolVersion, videoFormats, type VideoFormat } from './capture.js';
import { writeDelivery } from './delivery.js';
import { breakdownPlan, readVideoBreakdown, videoBreakdownPlan } from './breakdown.js';
import { breakdownSize, panelHeight } from '../../renderer-browser/src/breakdown.js';
import { spawn, spawnSync } from 'node:child_process';

const resourceRoot = join(dirname(fileURLToPath(import.meta.url)), 'resources');
async function readScene(path: string | undefined): Promise<MotionSpec> {
  if (!path) throw new Error('USAGE: Supply a scene JSON path.');
  const scene: unknown = JSON.parse(await readFile(resolve(path), 'utf8'));
  assertScene(scene);
  return scene;
}
async function assetBytes(scene: MotionSpec, scenePath: string): Promise<Record<string, string>> {
  const encoded: Record<string, string> = {};
  for (const asset of Object.values(scene.assets)) {
    const data = await readFile(resolve(dirname(scenePath), asset.src));
    if (createHash('sha256').update(data).digest('hex') !== asset.sha256) throw new Error(`ASSET_HASH: ${asset.src} differs from the scene lock.`);
    encoded[asset.src] = data.toString('base64');
  }
  return encoded;
}
async function save(path: string, data: string): Promise<void> {
  await mkdir(dirname(resolve(path)), { recursive: true });
  await writeFile(resolve(path), data);
}
/** "0,30,60" or "0-90" or a mix; whole frames inside the scene, in the order given. */
function parseFrames(list: string | undefined, total: number): number[] {
  if (list === undefined) return Array.from({ length: total }, (_, i) => i);
  const frames = list.split(',').flatMap((part) => {
    const range = part.trim().match(/^(\d+)(?:-(\d+))?$/u);
    if (!range) throw new Error(`USAGE: --frames expects whole frame numbers such as 0,30,60 or 0-90; got "${part}".`);
    const from = Number(range[1]); const to = Number(range[2] ?? range[1]);
    if (to < from) throw new Error(`USAGE: --frames range ${part} runs backwards.`);
    return Array.from({ length: to - from + 1 }, (_, i) => from + i);
  });
  const outside = frames.find((frame) => frame >= total);
  if (outside !== undefined) throw new Error(`USAGE: frame ${outside} is outside the scene; valid frames are 0–${total - 1}.`);
  return frames;
}
interface Options { out?: string; previous?: string; frame?: number; backend?: string; frames?: string; browser?: string; transparent?: boolean;
  width?: number; height?: number; duration?: number; fps?: number; text?: string; color?: string; background?: string; title?: string }
const numeric = ['frame', 'width', 'height', 'duration', 'fps'] as const;
const textual = ['out', 'previous', 'backend', 'frames', 'browser', 'text', 'color', 'background', 'title'] as const;
function parseArgs(args: string[]): { command: string; positional: string[] } & Options {
  const command = args.shift() ?? 'help';
  const positional: string[] = [];
  const options: Options = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!; const key = arg.slice(2);
    if (arg === '--json') continue;
    if (arg === '--transparent') { options.transparent = true; continue; }
    const isNumber = (numeric as readonly string[]).includes(key);
    if (arg.startsWith('--') && (isNumber || (textual as readonly string[]).includes(key))) {
      const value = args[++i];
      if (value === undefined || value.startsWith('--')) throw new Error(`USAGE: ${arg} requires a value.`);
      if (isNumber) { const parsed = Number(value); if (!Number.isFinite(parsed)) throw new Error(`USAGE: ${arg} requires a finite number.`); options[key as typeof numeric[number]] = parsed; }
      else options[key as typeof textual[number]] = value;
    } else if (arg.startsWith('--')) throw new Error(`USAGE: Unknown option ${arg}.`);
    else positional.push(arg);
  }
  const supported: Record<string, string[]> = { help: [], search: [], describe: [], validate: [], sample: ['frame'], preview: ['out'], 'export-html': ['out'], deliver: ['out', 'previous'],
    scaffold: ['out', 'width', 'height', 'duration', 'fps', 'text', 'color', 'background'], frames: ['out', 'frames', 'browser', 'transparent'], render: ['out', 'browser', 'transparent'], breakdown: ['out', 'browser', 'title', 'width', 'fps'], doctor: ['backend', 'browser'] };
  if (!supported[command]) throw new Error(`UNSUPPORTED_COMMAND: ${command}. Use help to see implemented commands.`);
  for (const key of Object.keys(options)) if (!supported[command]!.includes(key)) throw new Error(`USAGE: --${key} is not supported by ${command}.`);
  if (command !== 'search' && positional.length > (['help', 'doctor'].includes(command) ? 0 : 1)) throw new Error('USAGE: Too many positional arguments.');
  return { command, positional, ...options };
}
/**
 * A ready-to-edit scene with one atom on one subject, fitted to the requested canvas and length. It is the catalog's
 * own example for that atom, scaled: pixel parameters follow the canvas, frame parameters follow the duration.
 */
async function scaffold(id: string | undefined, options: Options): Promise<unknown> {
  const capability = getCapability(id ?? '');
  if (!capability) throw new Error(`UNKNOWN_CAPABILITY: ${id ?? '(missing id)'}. Use search.`);
  if (!options.out) throw new Error('USAGE: Supply --out <scene.json>.');
  if (options.text !== undefined && previewKind(capability.id) !== 'text') throw new Error(`USAGE: --text only applies to atoms whose example animates text; ${capability.id} does not.`);
  for (const key of ['color', 'background'] as const) if (options[key] !== undefined && !/^#[0-9a-fA-F]{6}$/u.test(options[key])) throw new Error(`USAGE: --${key} expects an opaque #RRGGBB colour.`);
  const scene = createExampleScene(capability.id);
  const width = options.width ?? 1280; const height = options.height ?? 720; const fps = options.fps ?? 30;
  const duration = options.duration ?? Math.round(scene.durationFrames * fps / 30);
  const space = Math.min(width / scene.canvas.width, height / scene.canvas.height); const time = duration / scene.durationFrames;
  const round = (value: number) => Math.round(value * 100) / 100;
  for (const node of scene.nodes) {
    node.position = [round((node.position[0] - scene.canvas.width / 2) * space + width / 2), round((node.position[1] - scene.canvas.height / 2) * space + height / 2)];
    if (node.type === 'path') { node.points = node.points.map(([x, y]) => [round(x * space), round(y * space)]); node.strokeWidth = Math.max(0.1, round(node.strokeWidth * space)); }
    else {
      node.fontSize = round(node.fontSize * space); node.lineHeight = round(node.lineHeight * space);
      if (options.text !== undefined && node.id === 'subject') {
        // Centre the block: position is the first line's left baseline, and a CJK glyph is about one em wide.
        node.text = options.text.replaceAll('\\n', '\n'); const lines = node.text.split('\n');
        const widest = Math.max(...lines.map((line) => [...line].reduce((sum, character) => sum + (character.codePointAt(0)! > 0x2e7f ? 1 : 0.55), 0)));
        node.position = [round(width / 2 - widest * node.fontSize / 2), round(height / 2 + node.fontSize * 0.35 - (lines.length - 1) * node.lineHeight / 2)];
      }
    }
    if (options.color && node.id === 'subject') node.color = options.color;
  }
  for (const clip of scene.clips) {
    clip.startFrame = Math.round(clip.startFrame * time); clip.durationFrames = Math.max(1, Math.min(duration - clip.startFrame, Math.round(clip.durationFrames * time)));
    for (const [key, parameter] of Object.entries(getCapability(clip.recipe)!.params)) {
      if (parameter.type !== 'number') continue;
      const factor = parameter.unit.startsWith('px') ? space : parameter.unit === 'frame' ? time : 1;
      const scaled = Math.min(parameter.maximum, Math.max(parameter.minimum, Number(clip.params[key]) * factor));
      clip.params[key] = parameter.integer ? Math.round(scaled) : round(scaled);
    }
  }
  scene.canvas = { width, height, background: options.background ?? scene.canvas.background }; scene.fps = { numerator: fps, denominator: 1 }; scene.durationFrames = duration;
  // Guides were scaled with the other nodes above, so they still match the scaled parameters.
  assertScene(scene);
  const out = resolve(options.out);
  await save(out, `${JSON.stringify(scene, null, 2)}\n`);
  return { path: out, atom: capability.id, title: capability.title, canvas: scene.canvas, fps: scene.fps, durationFrames: duration, subject: scene.nodes.find((node) => node.id === 'subject'),
    clip: scene.clips[0], staticNodes: scene.nodes.filter((node) => node.id !== 'subject').map((node) => node.id), fontCopied: Object.keys(scene.assets).length > 0 };
}
/**
 * The scene with a timeline of its atoms underneath, as GIF or video. Frames are sampled at the output rate from the
 * scene's own frames (fractional frames are evaluated exactly); GIF delays are whole centiseconds, so its rate must
 * divide 100.
 */
async function renderBreakdown(scene: MotionSpec, html: string, plan: ReturnType<typeof breakdownPlan>, args: Options): Promise<unknown> {
  const format = extname(args.out!).slice(1).toLowerCase() as VideoFormat;
  if (!['gif', 'mp4', 'webm'].includes(format)) throw new Error('USAGE: breakdown writes .gif, .mp4 or .webm.');
  const sceneFps = scene.fps.numerator / scene.fps.denominator; const fps = args.fps ?? (format === 'gif' ? 25 : sceneFps);
  if (!(fps >= 1 && fps <= 60)) throw new Error('USAGE: --fps must be 1–60.');
  if (format === 'gif' && !Number.isInteger(100 / fps)) throw new Error('USAGE: GIF frame delays are whole hundredths of a second; use --fps 10, 20, 25 or 50.');
  if (!toolVersion(ffmpegPath())) throw new Error('FFMPEG_MISSING: ffmpeg was not found. Install it or set MOTIONFLUX_FFMPEG_PATH.');
  const browser = await findBrowser(args.browser);
  if (!browser) throw new Error('BROWSER_MISSING: breakdown draws in a Chrome, Chromium or Edge you already have. None was found; pass --browser <path> or set MOTIONFLUX_BROWSER_PATH.');
  const seconds = scene.durationFrames / sceneFps; const count = Math.max(1, Math.floor(seconds * fps + 1e-9));
  const frames = Array.from({ length: count }, (_, k) => k * sceneFps / fps);
  const size = breakdownSize(plan, scene.canvas);
  const work = await mkdtemp(join(tmpdir(), 'motionflux-breakdown-')); const page = join(work, 'breakdown.html'); const out = resolve(args.out!);
  try {
    await writeFile(page, html); await mkdir(dirname(out), { recursive: true });
    await encodeVideo(out, format, false, { numerator: fps, denominator: 1 }, (write) => captureFrames(page, frames, browser, false, (_frame, png) => write(png)));
  } finally { await rm(work, { recursive: true, force: true }); }
  const written = probeVideo(out); const expectedSeconds = count / fps;
  return { path: out, type: format === 'gif' ? 'image/gif' : `video/${format}`, bytes: (await stat(out)).size, fps,
    expected: { frames: count, durationSeconds: expectedSeconds, width: size.width, height: size.height }, written: written ?? 'ffprobe not available; the file was not read back',
    verified: Boolean(written && written.frames === count && written.width === size.width && written.height === size.height && Math.abs(written.durationSeconds - expectedSeconds) <= 1 / fps + 0.01),
    tracks: plan.tracks.map((track) => ({ atom: track.symbol, name: track.name,
      seconds: track.blocks.map(({ from, to }) => [Math.round(from / sceneFps * 100) / 100, Math.round(to / sceneFps * 100) / 100]),
      blocks: track.blocks.map(({ name, from, to }) => ({ name, seconds: [Math.round(from / sceneFps * 100) / 100, Math.round(to / sceneFps * 100) / 100] })) })),
    audio: false, videoDelivered: true, browser, lock: versionLock(scene) };
}
/**
 * A clip cut from the source video with the atom timeline stacked under it. The browser draws only the timeline;
 * FFmpeg trims and scales the source, stacks the two and encodes. The source picture is not otherwise altered.
 */
async function renderVideoBreakdown(file: string, args: Options): Promise<unknown> {
  const breakdown = readVideoBreakdown(JSON.parse(await readFile(file, 'utf8')));
  if (args.title) breakdown.title = args.title;
  const format = extname(args.out ?? '').slice(1).toLowerCase() as VideoFormat;
  if (!args.out || !['gif', 'mp4', 'webm'].includes(format)) throw new Error('USAGE: breakdown writes --out <file>.gif, .mp4 or .webm.');
  const fps = args.fps ?? (format === 'gif' ? 25 : 30);
  if (!(fps >= 1 && fps <= 60)) throw new Error('USAGE: --fps must be 1–60.');
  if (format === 'gif' && !Number.isInteger(100 / fps)) throw new Error('USAGE: GIF frame delays are whole hundredths of a second; use --fps 10, 20, 25 or 50.');
  if (!toolVersion(ffmpegPath())) throw new Error('FFMPEG_MISSING: ffmpeg was not found. Install it or set MOTIONFLUX_FFMPEG_PATH.');
  const video = resolve(dirname(file), breakdown.source.video);
  await stat(video).catch(() => { throw new Error(`SOURCE_MISSING: ${video} does not exist. source.video is relative to the breakdown file.`); });
  const probe = ffmpegPath().replace(/ffmpeg(\.exe)?$/u, 'ffprobe$1');
  const probed = spawnSync(probe, ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height:format=duration', '-of', 'json', video], { encoding: 'utf8' });
  if (probed.status !== 0) throw new Error(`SOURCE_UNREADABLE: ffprobe could not read ${video}.`);
  const meta = JSON.parse(probed.stdout) as { streams: { width: number; height: number }[]; format: { duration: string } };
  const source = meta.streams[0]; const length = Number(meta.format.duration);
  if (!source) throw new Error(`SOURCE_UNREADABLE: ${video} has no video stream.`);
  if (breakdown.source.to > length + 0.05) throw new Error(`USAGE: source.to ${breakdown.source.to} s is past the end of the video (${length.toFixed(2)} s).`);
  const even = (value: number) => Math.round(value / 2) * 2;
  // Footage has far more colours than a scene, so a GIF of it defaults narrower to stay a few megabytes.
  const width = even(args.width ?? Math.min(format === 'gif' ? 640 : 960, source.width));
  if (width < 160 || width > 3840) throw new Error('USAGE: --width must be 160–3840 px.');
  const pictureHeight = even(source.height * width / source.width);
  const seconds = breakdown.source.to - breakdown.source.from; const count = Math.max(1, Math.floor(seconds * fps + 1e-9));
  const plan = videoBreakdownPlan(breakdown, { width, fps, frames: count });
  const panel = panelHeight(plan) + (panelHeight(plan) % 2);
  const browser = await findBrowser(args.browser);
  if (!browser) throw new Error('BROWSER_MISSING: breakdown draws the timeline in a Chrome, Chromium or Edge you already have. None was found; pass --browser <path> or set MOTIONFLUX_BROWSER_PATH.');
  const work = await mkdtemp(join(tmpdir(), 'motionflux-breakdown-')); const out = resolve(args.out);
  try {
    const script = await readFile(join(resourceRoot, 'breakdown-panel.js'), 'utf8');
    const page = join(work, 'panel.html');
    await writeFile(page, `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#0f1114"><canvas></canvas><script id="plan-data" type="application/json">${JSON.stringify(plan).replace(/</gu, '\\u003c')}</script><script>${script.replace(/<\/script/giu, '<\\/script')}</script>`);
    await mkdir(join(work, 'panel'));
    await captureFrames(page, Array.from({ length: count }, (_, i) => i), browser, false, (frame, png) => writeFile(join(work, 'panel', `${String(frame).padStart(6, '0')}.png`), png));
    await mkdir(dirname(out), { recursive: true });
    const stack = `[0:v]fps=${fps},scale=${width}:${pictureHeight}:flags=lanczos,setsar=1[clip];[clip][1:v]vstack=inputs=2`;
    const encode = format === 'gif' ? ['-filter_complex', `${stack},split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle`, '-loop', '0']
      : format === 'mp4' ? ['-filter_complex', `${stack},format=yuv420p`, '-c:v', 'libx264', '-crf', '18', '-movflags', '+faststart']
      : ['-filter_complex', `${stack},format=yuv420p`, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '28'];
    const result = await new Promise<{ code: number | null; log: string }>((done) => {
      const child = spawn(ffmpegPath(), ['-y', '-v', 'error', '-ss', String(breakdown.source.from), '-t', String(seconds), '-i', video,
        '-framerate', String(fps), '-i', join(work, 'panel', '%06d.png'), ...encode, '-an', '-frames:v', String(count), out], { stdio: ['ignore', 'ignore', 'pipe'] });
      let log = ''; child.stderr.on('data', (chunk: Buffer) => { log += chunk; }); child.once('close', (code) => done({ code, log }));
    });
    if (result.code !== 0) throw new Error(`ENCODE_FAILED: ffmpeg exited with code ${result.code}. ${result.log.trim().split('\n').slice(-3).join(' ')}`);
  } finally { await rm(work, { recursive: true, force: true }); }
  const written = probeVideo(out); const height = pictureHeight + panel;
  return { path: out, type: format === 'gif' ? 'image/gif' : `video/${format}`, bytes: (await stat(out)).size, fps,
    source: { video, from: breakdown.source.from, to: breakdown.source.to, width: source.width, height: source.height },
    expected: { frames: count, durationSeconds: count / fps, width, height }, written: written ?? 'ffprobe not available; the file was not read back',
    verified: Boolean(written && written.frames === count && written.width === width && written.height === height && Math.abs(written.durationSeconds - count / fps) <= 1 / fps + 0.01),
    tracks: plan.tracks.map((track) => ({ atom: track.symbol, name: track.name,
      seconds: track.blocks.map(({ from, to }) => [Math.round((breakdown.source.from + from / fps) * 100) / 100, Math.round((breakdown.source.from + to / fps) * 100) / 100]),
      blocks: track.blocks.map(({ name, from, to }) => ({ name, seconds: [Math.round((breakdown.source.from + from / fps) * 100) / 100, Math.round((breakdown.source.from + to / fps) * 100) / 100] })) })),
    audio: false, videoDelivered: true, browser };
}
async function main(): Promise<unknown> {
  const args = parseArgs(process.argv.slice(2));
  const path = args.positional[0];
  switch (args.command) {
    case 'help': return { version: ENGINE_VERSION, commands: [
      'search <query> --json', 'describe <id> --json', 'scaffold <id> --out scene.json [--width --height --duration --fps --text --color --background]', 'validate <scene.json>',
      'sample <scene.json> --frame 30', 'preview <scene.json> --out preview.html', 'deliver <scene.json> --out <new-directory> [--previous <scene.json>]',
      'export-html <scene.json> --out scene.html', 'frames <scene.json> --out <dir> [--frames 0,30,60] [--transparent]', 'render <scene.json> --out clip.mp4|.mov|.webm [--transparent]',
      'breakdown <scene.json | breakdown.json> --out breakdown.gif|.mp4|.webm [--title "…"] [--width 960] [--fps 25]  (breakdown.json cuts a source video and adds the atom timeline)',
      'doctor --backend js|browser|ffmpeg',
    ], delivery: 'HTML preview, PNG frames, and video without audio: H.264 MP4 (opaque), ProRes 4444 MOV or VP9 WebM (either can carry alpha with --transparent). breakdown adds a timeline of the atoms under the picture and also writes GIF. frames, render and breakdown need a Chromium-family browser; render and breakdown also need ffmpeg.' };
    case 'search': return { capabilities: searchCapabilities(args.positional.join(' ')) };
    case 'scaffold': return scaffold(path, args);
    case 'describe': {
      const capability = getCapability(path ?? '');
      if (!capability) throw new Error(`UNKNOWN_CAPABILITY: ${path ?? '(missing id)'}. Use search.`);
      return capability;
    }
    case 'doctor': {
      const backend = args.backend ?? 'js';
      if (backend === 'browser') {
        const browser = await findBrowser(args.browser);
        return browser ? { backend, available: true, path: browser, version: toolVersion(browser, '--version') ?? 'unknown' }
          : { backend, available: false, reason: 'No Chrome, Chromium or Edge was found. Install one, or pass --browser <path> or set MOTIONFLUX_BROWSER_PATH.' };
      }
      if (backend === 'ffmpeg') {
        const version = toolVersion(ffmpegPath());
        return version ? { backend, available: true, version, probe: toolVersion(ffmpegPath().replace(/ffmpeg(\.exe)?$/u, 'ffprobe$1')) !== undefined }
          : { backend, available: false, reason: 'ffmpeg was not found on PATH. Install it or set MOTIONFLUX_FFMPEG_PATH. The frames command still works without it.' };
      }
      if (backend !== 'js') return { backend, available: false, reason: 'Adapter not implemented; no optional host tools were required or invoked.' };
      return { backend, available: Number(process.versions.node.split('.')[0]) >= 22, node: process.version, version: ENGINE_VERSION,
        capabilities: capabilities.length, browser: 'Open generated HTML in a browser with Canvas 2D, FontFace and Web Crypto support.' };
    }
    default: {
      if (args.command === 'breakdown' && path) {
        const raw: unknown = JSON.parse(await readFile(resolve(path), 'utf8'));
        if (raw && typeof raw === 'object' && 'source' in raw) return renderVideoBreakdown(resolve(path), args);
      }
      const scene = await readScene(path);
      if (args.command === 'sample') return { state: compileScene(scene).evaluate(args.frame ?? 0), lock: versionLock(scene) };
      const assets = await assetBytes(scene, resolve(path!));
      if (args.command === 'validate') return { valid: true, assetsVerified: Object.keys(assets).length, lock: versionLock(scene) };
      if (!args.out) throw new Error('USAGE: Supply --out <output path>.');
      const [runtime, license] = await Promise.all([readFile(join(resourceRoot, 'standalone.js'), 'utf8'), readFile(join(resourceRoot, 'OFL.txt'), 'utf8')]);
      const plan = args.command === 'breakdown' ? breakdownPlan(scene, { width: Math.round(args.width ?? Math.min(960, scene.canvas.width)), ...(args.title ? { title: args.title } : {}) }) : undefined;
      if (plan && (plan.width < 160 || plan.width > 3840)) throw new Error('USAGE: --width must be 160–3840 px.');
      const html = createStandaloneHtml(scene, runtime, assets, args.command === 'deliver' ? '' : license, plan ? { breakdown: plan } : {});
      if (args.command === 'deliver') {
        const previous = args.previous ? await readScene(args.previous) : undefined;
        return writeDelivery({ scene, ...(previous ? { previous } : {}), assets, html, out: args.out });
      }
      if (args.command === 'breakdown') return renderBreakdown(scene, html, plan!, args);
      if (args.command === 'frames' || args.command === 'render') {
        const size = { width: scene.canvas.width, height: scene.canvas.height };
        const transparent = Boolean(args.transparent); const format = extname(args.out).slice(1).toLowerCase() as VideoFormat;
        if (args.command === 'render') {
          if (!(format in videoFormats) || format === 'gif') throw new Error('USAGE: render picks the format from --out: .mp4 (H.264), .mov (ProRes 4444) or .webm (VP9). GIF is written by breakdown.');
          if (transparent && !videoFormats[format].alpha) throw new Error('ALPHA_UNSUPPORTED: H.264 MP4 cannot carry transparency. Use .mov or .webm with --transparent, or the frames command for PNGs.');
          if (videoFormats[format].evenSize && (size.width % 2 || size.height % 2)) throw new Error(`VIDEO_SIZE: .${format} needs even dimensions; the canvas is ${size.width}×${size.height}.`);
          if (!toolVersion(ffmpegPath())) throw new Error('FFMPEG_MISSING: ffmpeg was not found. Install it or set MOTIONFLUX_FFMPEG_PATH; use the frames command for a PNG sequence instead.');
        }
        const browser = await findBrowser(args.browser);
        if (!browser) throw new Error('BROWSER_MISSING: frames and render draw in a Chrome, Chromium or Edge you already have. None was found; pass --browser <path> or set MOTIONFLUX_BROWSER_PATH.');
        const work = await mkdtemp(join(tmpdir(), 'motionflux-render-')); const page = join(work, 'scene.html');
        try {
          await writeFile(page, html);
          const out = resolve(args.out);
          if (args.command === 'frames') {
            const frames = parseFrames(args.frames, scene.durationFrames); const files: string[] = [];
            await mkdir(out, { recursive: true });
            await captureFrames(page, frames, browser, transparent, async (frame, png) => { const file = join(out, `frame-${String(frame).padStart(6, '0')}.png`); await writeFile(file, png); files.push(file); });
            return { directory: out, type: 'png-sequence', pattern: 'frame-%06d.png', frames: files.length, files: files.length <= 24 ? files : [files[0], '…', files.at(-1)], ...size, fps: scene.fps, alpha: transparent, videoDelivered: false, browser, lock: versionLock(scene) };
          }
          await mkdir(dirname(out), { recursive: true });
          const all = parseFrames(undefined, scene.durationFrames);
          await encodeVideo(out, format, transparent, scene.fps, (write) => captureFrames(page, all, browser, transparent, (_frame, png) => write(png)));
          // Report what the file actually contains, not what was asked for.
          const written = probeVideo(out); const expectedSeconds = all.length * scene.fps.denominator / scene.fps.numerator;
          return { path: out, type: `video/${format === 'mov' ? 'quicktime' : format}`, bytes: (await stat(out)).size, expected: { frames: all.length, durationSeconds: expectedSeconds, ...size, alpha: transparent }, written: written ?? 'ffprobe not available; the file was not read back',
            verified: Boolean(written && written.frames === all.length && written.width === size.width && written.height === size.height && Math.abs(written.durationSeconds - expectedSeconds) < 0.05 && written.alpha === transparent),
            audio: false, videoDelivered: true, browser, lock: versionLock(scene) };
        } finally { await rm(work, { recursive: true, force: true }); }
      }
      await save(args.out, html);
      return { path: resolve(args.out), type: 'standalone-html', embeddedAssets: Object.keys(assets).length, videoDelivered: false, lock: versionLock(scene) };
    }
  }
}
main().then((result) => process.stdout.write(`${JSON.stringify({ ok: true, result }, null, 2)}\n`)).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  const code = error instanceof SceneValidationError ? error.code
    : error && typeof error === 'object' && 'code' in error ? String(error.code) : message.match(/^([A-Z_]+):/u)?.[1] ?? 'COMMAND_FAILED';
  process.stdout.write(`${JSON.stringify({ ok: false, error: { code, message, ...(error instanceof SceneValidationError ? { issues: error.issues } : {}) } }, null, 2)}\n`);
  process.exitCode = 1;
});
