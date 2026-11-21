import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { discoverBrowser } from './env.js';

/**
 * Frame capture drives a Chromium-family browser the user already has, over the DevTools protocol, with nothing
 * but Node's own WebSocket. The page is the same standalone HTML the website and `preview` produce, so a captured
 * frame is exactly what that file draws for the same frame number.
 */
export async function findBrowser(explicit?: string): Promise<string | undefined> {
  return discoverBrowser(explicit);
}
export const ffmpegPath = (): string => process.env.MOTIONFLUX_FFMPEG_PATH ?? 'ffmpeg';
/** First line of `<tool> -version`, or undefined when the tool cannot be run. */
export function toolVersion(command: string, flag = '-version'): string | undefined {
  const result = spawnSync(command, [flag], { encoding: 'utf8' });
  return result.status === 0 ? result.stdout.split('\n')[0]!.trim() : undefined;
}

/** Platform-appropriate Chromium flags enabling hardware WebGL2 and WebGPU in headless capture. */
export function gpuLaunchFlags(): string[] {
  if (process.platform === 'darwin') {
    return ['--enable-webgl', '--enable-unsafe-webgpu', '--use-angle=metal', '--ignore-gpu-blocklist'];
  }
  if (process.platform === 'linux') {
    return ['--enable-webgl', '--enable-unsafe-webgpu', '--enable-features=Vulkan', '--ignore-gpu-blocklist'];
  }
  return ['--enable-webgl', '--enable-unsafe-webgpu', '--ignore-gpu-blocklist'];
}

interface Session { profile: string; send(method: string, params?: object, sessionId?: string): Promise<Record<string, unknown>>; close(): Promise<void> }
async function launch(browser: string): Promise<Session> {
  const profile = await mkdtemp(join(tmpdir(), 'motionflux-browser-'));
  const child = spawn(browser, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run',
    '--no-default-browser-check', '--disable-extensions', '--hide-scrollbars', '--mute-audio', ...gpuLaunchFlags(), 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  const cleanup = async () => { child.kill(); await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); };
  try {
    const endpoint = await new Promise<string>((resolveEndpoint, reject) => {
      let log = '';
      const timer = setTimeout(() => reject(new Error(`BROWSER_START: ${browser} did not open a DevTools endpoint within 20 s.`)), 20000);
      child.stderr.on('data', (chunk: Buffer) => { log += chunk; const match = log.match(/DevTools listening on (ws:\/\/\S+)/u); if (match) { clearTimeout(timer); resolveEndpoint(match[1]!); } });
      child.once('error', (error) => { clearTimeout(timer); reject(new Error(`BROWSER_START: ${error.message}`)); });
      child.once('exit', (code) => { clearTimeout(timer); reject(new Error(`BROWSER_START: ${browser} exited with code ${code} before it was ready.`)); });
    });
    const socket = new WebSocket(endpoint);
    await new Promise<void>((opened, reject) => { socket.onopen = () => opened(); socket.onerror = () => reject(new Error('BROWSER_START: Could not connect to the DevTools endpoint.')); });
    const pending = new Map<number, { resolve(value: Record<string, unknown>): void; reject(error: Error): void }>();
    let nextId = 0;
    socket.onmessage = (event) => {
      const message = JSON.parse(String(event.data)) as { id?: number; result?: Record<string, unknown>; error?: { message: string } };
      const waiting = message.id === undefined ? undefined : pending.get(message.id);
      if (!waiting) return;
      pending.delete(message.id!);
      if (message.error) waiting.reject(new Error(`BROWSER_PROTOCOL: ${message.error.message}`)); else waiting.resolve(message.result ?? {});
    };
    socket.onclose = () => { for (const waiting of pending.values()) waiting.reject(new Error('BROWSER_PROTOCOL: The browser closed the connection.')); pending.clear(); };
    return {
      profile,
      send: (method, params = {}, sessionId) => new Promise((resolveCall, reject) => {
        const id = ++nextId; pending.set(id, { resolve: resolveCall, reject });
        socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
      }),
      close: async () => { socket.onclose = null; socket.close(); await cleanup(); },
    };
  } catch (error) { await cleanup(); throw error; }
}
/** Verify that headless Chromium can start and create a working WebGL2 context for Three.js / studio.mjs scenes. */
export async function probeWebGL2(browser: string): Promise<{ available: boolean; glVersion?: string; renderer?: string; reason?: string }> {
  const session = await launch(browser);
  try {
    const { targetId } = await session.send('Target.createTarget', { url: 'about:blank' }) as { targetId: string };
    const { sessionId } = await session.send('Target.attachToTarget', { targetId, flatten: true }) as { sessionId: string };
    const reply = await session.send('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => {
        const c = document.createElement('canvas');
        const gl = c.getContext('webgl2');
        if (!gl) return { available: false, reason: 'WebGL2 context creation returned null.' };
        const dbg = gl.getExtension('WEBGL_debug_renderer_info');
        return {
          available: true,
          glVersion: String(gl.getParameter(gl.VERSION)),
          renderer: String(dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)),
        };
      })()`,
    }, sessionId) as { result?: { value?: { available: boolean; glVersion?: string; renderer?: string; reason?: string } } };
    return reply.result?.value ?? { available: false, reason: 'Empty WebGL2 probe response.' };
  } finally {
    await session.close();
  }
}
/** Verify that headless Chromium can request a hardware/software WebGPU adapter (`navigator.gpu.requestAdapter()`). */
export async function probeWebGPU(browser: string): Promise<{ available: boolean; vendor?: string; architecture?: string; reason?: string }> {
  const session = await launch(browser);
  try {
    const probeHtml = join(session.profile, 'webgpu-probe.html');
    await writeFile(probeHtml, '<!doctype html><title>probe</title>');
    const { targetId } = await session.send('Target.createTarget', { url: pathToFileURL(probeHtml).href }) as { targetId: string };
    const { sessionId } = await session.send('Target.attachToTarget', { targetId, flatten: true }) as { sessionId: string };
    await new Promise((wait) => setTimeout(wait, 120));
    const reply = await session.send('Runtime.evaluate', {
      returnByValue: true,
      awaitPromise: true,
      expression: `(async () => {
        if (typeof navigator === 'undefined' || !('gpu' in navigator) || !navigator.gpu) {
          return { available: false, reason: 'navigator.gpu is not exposed in this browser.' };
        }
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) return { available: false, reason: 'navigator.gpu.requestAdapter() returned null.' };
        const info = adapter.info ?? {};
        return {
          available: true,
          vendor: String(info.vendor || 'unknown'),
          architecture: String(info.architecture || info.device || 'webgpu'),
        };
      })()`,
    }, sessionId) as { result?: { value?: { available: boolean; vendor?: string; architecture?: string; reason?: string } } };
    return reply.result?.value ?? { available: false, reason: 'Empty WebGPU probe response.' };
  } finally {
    await session.close();
  }
}
/**
 * Open a standalone scene file and hand each requested frame to `onFrame` as PNG bytes, in the order given.
 * Frames are rendered by explicit frame number; nothing depends on playback or wall-clock time.
 */
export async function captureFrames(htmlPath: string, frames: readonly number[], browser: string, transparent: boolean, onFrame: (frame: number, png: Buffer) => Promise<void>): Promise<void> {
  const session = await launch(browser);
  try {
    const { targetId } = await session.send('Target.createTarget', { url: pathToFileURL(htmlPath).href }) as { targetId: string };
    const { sessionId } = await session.send('Target.attachToTarget', { targetId, flatten: true }) as { sessionId: string };
    const evaluate = async (expression: string): Promise<unknown> => {
      const reply = await session.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId) as { result: { value?: unknown }; exceptionDetails?: { text: string; exception?: { description?: string } } };
      if (reply.exceptionDetails) throw new Error(`RENDER_FAILED: ${reply.exceptionDetails.exception?.description ?? reply.exceptionDetails.text}`);
      return reply.result.value;
    };
    // The page sets window.motionFlux once fonts are verified and loaded; a failure leaves its message in #status.
    const deadline = Date.now() + 60000;
    for (;;) {
      const state = await evaluate(`window.motionFlux ? 'ready' : (document.getElementById('status')?.textContent ?? '')`) as string;
      if (state === 'ready') break;
      if (/error|ASSET_HASH|Missing/iu.test(state)) throw new Error(`RENDER_FAILED: ${state}`);
      if (Date.now() > deadline) throw new Error('RENDER_FAILED: The scene did not become ready within 60 s.');
      await new Promise((wait) => setTimeout(wait, 50));
    }
    for (const frame of frames) {
      const encoded = await evaluate(`(async () => { await window.motionFlux.renderFrame(${frame}, ${!transparent}); return document.querySelector('canvas').toDataURL('image/png').slice(22); })()`) as string;
      await onFrame(frame, Buffer.from(encoded, 'base64'));
    }
  } finally { await session.close(); }
}
export interface VideoReport { codec: string; pixelFormat: string; alpha: boolean; width: number; height: number; frames: number; durationSeconds: number; frameRate: string }
export type VideoQuality = 'standard' | 'cinema';
export interface EncodeOptions { quality?: string; crf?: number }
/** Container by file extension. Only MOV (ProRes 4444) and WebM (VP9) can carry an alpha channel. */
export const videoFormats = {
  mp4: { alpha: false, evenSize: true, encoder: (_transparent: boolean, quality: VideoQuality = 'standard', crf?: number) =>
    ['-c:v', 'libx264', ...(quality === 'cinema' ? ['-preset', 'slow'] : []), '-crf', String(crf ?? (quality === 'cinema' ? 15 : 18)), '-pix_fmt', 'yuv420p', '-movflags', '+faststart'] },
  mov: { alpha: true, evenSize: false, encoder: (transparent: boolean) => ['-c:v', 'prores_ks', '-profile:v', '4444', '-pix_fmt', transparent ? 'yuva444p10le' : 'yuv444p10le'] },
  webm: { alpha: true, evenSize: true, encoder: (transparent: boolean, quality: VideoQuality = 'standard', crf?: number) =>
    ['-c:v', 'libvpx-vp9', '-pix_fmt', transparent ? 'yuva420p' : 'yuv420p', '-b:v', '0', '-crf', String(crf ?? (quality === 'cinema' ? 16 : 24))] },
  // GIF has 256 colours per frame, so encoding has to build a palette; that quantization is the only processing.
  gif: { alpha: false, evenSize: false, encoder: () => ['-filter_complex', 'split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle', '-loop', '0'] },
} as const;
export type VideoFormat = keyof typeof videoFormats;
/** Validate quality / CRF options before capture starts, and build the exact FFmpeg encoder argument list. */
export function videoEncoderArgs(format: VideoFormat, transparent: boolean, options: EncodeOptions = {}): string[] {
  const quality = options.quality ?? 'standard';
  if (quality !== 'standard' && quality !== 'cinema') throw new Error(`USAGE: --quality must be standard or cinema; got "${quality}".`);
  if (options.crf !== undefined) {
    if (!Number.isInteger(options.crf) || options.crf < 0 || options.crf > 51) throw new Error(`USAGE: --crf must be a whole number from 0 to 51; got ${options.crf}.`);
    if (format !== 'mp4' && format !== 'webm') throw new Error(`USAGE: --crf applies to .mp4 and .webm; .${format} uses its own lossless/palette encoder.`);
  }
  return videoFormats[format].encoder(transparent, quality, options.crf);
}
/** Encode PNG frames, fed through `feed`. The encoder is the optional FFmpeg adapter; apart from GIF's palette, no FFmpeg filter touches the picture. */
export async function encodeVideo(out: string, format: VideoFormat, transparent: boolean, fps: { numerator: number; denominator: number }, feed: (write: (png: Buffer) => Promise<void>) => Promise<void>, options: EncodeOptions = {}): Promise<void> {
  const encoderArgs = videoEncoderArgs(format, transparent, options);
  const child = spawn(ffmpegPath(), ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', `${fps.numerator}/${fps.denominator}`, '-i', '-',
    ...encoderArgs, out], { stdio: ['pipe', 'ignore', 'pipe'] });
  let log = ''; child.stderr.on('data', (chunk: Buffer) => { log += chunk; });
  const finished = new Promise<void>((done, reject) => {
    child.once('error', (error: NodeJS.ErrnoException) => reject(new Error(error.code === 'ENOENT' ? 'FFMPEG_MISSING: ffmpeg was not found. Install it or set MOTIONFLUX_FFMPEG_PATH; use the frames command for a PNG sequence instead.' : `ENCODE_FAILED: ${error.message}`)));
    child.once('close', (code) => code === 0 ? done() : reject(new Error(`ENCODE_FAILED: ffmpeg exited with code ${code}. ${log.trim().split('\n').slice(-3).join(' ')}`)));
  });
  // Encoding can fail while an asynchronous browser frame is still being prepared.
  // Observe that failure immediately; report it through the normal CLI error path after feed has cleaned up.
  let encoderError: Error | undefined;
  void finished.catch((error: Error) => { encoderError = error; });
  child.stdin.on('error', () => { /* A failed encoder closes its input; the exit code carries the reason. */ });
  try {
    await feed((png) => new Promise<void>((written, reject) => {
      if (encoderError) { reject(encoderError); return; }
      child.stdin.write(png, (error) => error ? reject(encoderError ?? new Error(`ENCODE_FAILED: ${error.message}`)) : written());
    }));
  } catch (error) { child.stdin.destroy(); child.kill(); await finished.catch(() => undefined); throw encoderError ?? error; }
  child.stdin.end();
  await finished;
}
/** Read back what was actually written. Returns undefined when ffprobe is not available. */
export function probeVideo(path: string): VideoReport | undefined {
  const probe = (process.env.MOTIONFLUX_FFMPEG_PATH ?? 'ffmpeg').replace(/ffmpeg(\.exe)?$/u, 'ffprobe$1');
  const result = spawnSync(probe, ['-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries',
    'stream=codec_name,pix_fmt,width,height,nb_read_frames,r_frame_rate:stream_tags=alpha_mode:format=duration', '-of', 'json', path], { encoding: 'utf8' });
  if (result.status !== 0) return undefined;
  const data = JSON.parse(result.stdout) as { streams: { codec_name: string; pix_fmt: string; width: number; height: number; nb_read_frames: string; r_frame_rate: string; tags?: { alpha_mode?: string; ALPHA_MODE?: string } }[]; format: { duration: string } };
  const stream = data.streams[0];
  // ProRes 4444 reports an alpha pixel format; VP9 keeps alpha in a side stream and flags it with a tag.
  return stream ? { codec: stream.codec_name, pixelFormat: stream.pix_fmt, alpha: /^(yuva|rgba|bgra|argb|abgr|gbrap|ya)/u.test(stream.pix_fmt) || (stream.tags?.alpha_mode ?? stream.tags?.ALPHA_MODE) === '1', width: stream.width, height: stream.height, frames: Number(stream.nb_read_frames), durationSeconds: Number(data.format.duration), frameRate: stream.r_frame_rate } : undefined;
}
