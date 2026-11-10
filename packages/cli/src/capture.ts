import { spawn, spawnSync } from 'node:child_process';
import { access, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Frame capture drives a Chromium-family browser the user already has, over the DevTools protocol, with nothing
 * but Node's own WebSocket. The page is the same standalone HTML the website and `preview` produce, so a captured
 * frame is exactly what that file draws for the same frame number.
 */
const candidates = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];
export async function findBrowser(explicit?: string): Promise<string | undefined> {
  for (const path of [explicit, process.env.MOTIONFLUX_BROWSER_PATH, ...candidates]) {
    if (path && await access(path).then(() => true, () => false)) return path;
  }
  return undefined;
}
export const ffmpegPath = (): string => process.env.MOTIONFLUX_FFMPEG_PATH ?? 'ffmpeg';
/** First line of `<tool> -version`, or undefined when the tool cannot be run. */
export function toolVersion(command: string, flag = '-version'): string | undefined {
  const result = spawnSync(command, [flag], { encoding: 'utf8' });
  return result.status === 0 ? result.stdout.split('\n')[0]!.trim() : undefined;
}

interface Session { send(method: string, params?: object, sessionId?: string): Promise<Record<string, unknown>>; close(): Promise<void> }
async function launch(browser: string): Promise<Session> {
  const profile = await mkdtemp(join(tmpdir(), 'motionflux-browser-'));
  const child = spawn(browser, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run',
    '--no-default-browser-check', '--disable-extensions', '--hide-scrollbars', '--mute-audio', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
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
      send: (method, params = {}, sessionId) => new Promise((resolveCall, reject) => {
        const id = ++nextId; pending.set(id, { resolve: resolveCall, reject });
        socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
      }),
      close: async () => { socket.onclose = null; socket.close(); await cleanup(); },
    };
  } catch (error) { await cleanup(); throw error; }
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
      const reply = await session.send('Runtime.evaluate', { expression, returnByValue: true }, sessionId) as { result: { value?: unknown }; exceptionDetails?: { text: string; exception?: { description?: string } } };
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
      const encoded = await evaluate(`(() => { window.motionFlux.renderFrame(${frame}, ${!transparent}); return document.querySelector('canvas').toDataURL('image/png').slice(22); })()`) as string;
      await onFrame(frame, Buffer.from(encoded, 'base64'));
    }
  } finally { await session.close(); }
}
export interface VideoReport { codec: string; pixelFormat: string; alpha: boolean; width: number; height: number; frames: number; durationSeconds: number; frameRate: string }
/** Container by file extension. Only MOV (ProRes 4444) and WebM (VP9) can carry an alpha channel. */
export const videoFormats = {
  mp4: { alpha: false, evenSize: true, encoder: () => ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart'] },
  mov: { alpha: true, evenSize: false, encoder: (transparent: boolean) => ['-c:v', 'prores_ks', '-profile:v', '4444', '-pix_fmt', transparent ? 'yuva444p10le' : 'yuv444p10le'] },
  webm: { alpha: true, evenSize: true, encoder: (transparent: boolean) => ['-c:v', 'libvpx-vp9', '-pix_fmt', transparent ? 'yuva420p' : 'yuv420p', '-b:v', '0', '-crf', '24'] },
  // GIF has 256 colours per frame, so encoding has to build a palette; that quantization is the only processing.
  gif: { alpha: false, evenSize: false, encoder: () => ['-filter_complex', 'split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle', '-loop', '0'] },
} as const;
export type VideoFormat = keyof typeof videoFormats;
/** Encode PNG frames, fed through `feed`. The encoder is the optional FFmpeg adapter; apart from GIF's palette, no FFmpeg filter touches the picture. */
export async function encodeVideo(out: string, format: VideoFormat, transparent: boolean, fps: { numerator: number; denominator: number }, feed: (write: (png: Buffer) => Promise<void>) => Promise<void>): Promise<void> {
  const child = spawn(ffmpegPath(), ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', `${fps.numerator}/${fps.denominator}`, '-i', '-',
    ...videoFormats[format].encoder(transparent), out], { stdio: ['pipe', 'ignore', 'pipe'] });
  let log = ''; child.stderr.on('data', (chunk: Buffer) => { log += chunk; });
  const finished = new Promise<void>((done, reject) => {
    child.once('error', (error: NodeJS.ErrnoException) => reject(new Error(error.code === 'ENOENT' ? 'FFMPEG_MISSING: ffmpeg was not found. Install it or set MOTIONFLUX_FFMPEG_PATH; use the frames command for a PNG sequence instead.' : `ENCODE_FAILED: ${error.message}`)));
    child.once('close', (code) => code === 0 ? done() : reject(new Error(`ENCODE_FAILED: ffmpeg exited with code ${code}. ${log.trim().split('\n').slice(-3).join(' ')}`)));
  });
  child.stdin.on('error', () => { /* A failed encoder closes its input; the exit code carries the reason. */ });
  try {
    await feed((png) => new Promise<void>((written, reject) => { child.stdin.write(png, (error) => error ? reject(new Error(`ENCODE_FAILED: ${error.message}`)) : written()); }));
  } catch (error) { child.kill(); await finished.catch(() => undefined); throw error; }
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
