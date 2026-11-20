import { spawn, spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { buildAudioMuxPlan, synthesizeSfxTrack, isProceduralCue } from './audio.js';
import { startStageServer } from './server.js';
import type { FrameAuditResult, StageAuditReport, StageMeta, StageVideoReport } from './types.js';
import { ffmpegPath, findBrowser, toolVersion, videoFormats, type VideoFormat } from '../../cli/src/capture.js';

interface CdpSession {
  send(method: string, params?: object, sessionId?: string): Promise<Record<string, unknown>>;
  close(): Promise<void>;
}

async function launchChrome(browser: string): Promise<CdpSession> {
  const profile = await mkdtemp(join(tmpdir(), 'motionflux-stage-browser-'));
  const child = spawn(
    browser,
    [
      '--headless=new',
      '--remote-debugging-port=0',
      `--user-data-dir=${profile}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--hide-scrollbars',
      '--mute-audio',
      '--autoplay-policy=no-user-gesture-required',
      '--font-render-hinting=none',
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  );

  const cleanup = async () => {
    child.kill();
    await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  };

  try {
    const endpoint = await new Promise<string>((resolveEndpoint, reject) => {
      let log = '';
      const timer = setTimeout(
        () => reject(new Error(`BROWSER_START: ${browser} did not open a DevTools endpoint within 20 s.`)),
        20000,
      );
      child.stderr.on('data', (chunk: Buffer) => {
        log += chunk;
        const match = log.match(/DevTools listening on (ws:\/\/\S+)/u);
        if (match) {
          clearTimeout(timer);
          resolveEndpoint(match[1]!);
        }
      });
      child.once('error', (error) => {
        clearTimeout(timer);
        reject(new Error(`BROWSER_START: ${error.message}`));
      });
      child.once('exit', (code) => {
        clearTimeout(timer);
        reject(new Error(`BROWSER_START: ${browser} exited with code ${code} before it was ready.`));
      });
    });

    const socket = new WebSocket(endpoint);
    await new Promise<void>((opened, reject) => {
      socket.onopen = () => opened();
      socket.onerror = () => reject(new Error('BROWSER_START: Could not connect to the DevTools endpoint.'));
    });

    const pending = new Map<number, { resolve(value: Record<string, unknown>): void; reject(error: Error): void }>();
    let nextId = 0;
    socket.onmessage = (event) => {
      const message = JSON.parse(String(event.data)) as {
        id?: number;
        result?: Record<string, unknown>;
        error?: { message: string };
      };
      const waiting = message.id === undefined ? undefined : pending.get(message.id);
      if (!waiting) return;
      pending.delete(message.id!);
      if (message.error) waiting.reject(new Error(`BROWSER_PROTOCOL: ${message.error.message}`));
      else waiting.resolve(message.result ?? {});
    };
    socket.onclose = () => {
      for (const waiting of pending.values()) {
        waiting.reject(new Error('BROWSER_PROTOCOL: The browser closed the connection.'));
      }
      pending.clear();
    };

    return {
      send: (method, params = {}, sessionId) =>
        new Promise((resolveCall, reject) => {
          const id = ++nextId;
          pending.set(id, { resolve: resolveCall, reject });
          socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
        }),
      close: async () => {
        socket.onclose = null;
        socket.close();
        await cleanup();
      },
    };
  } catch (error) {
    await cleanup();
    throw error;
  }
}

export function selectDefaultAuditFrames(meta: StageMeta): number[] {
  const maxFrame = Math.max(0, meta.durationFrames - 1);
  const picked = new Set<number>();
  if (meta.scenes.length > 0) {
    for (const scene of meta.scenes) {
      const start = Math.max(0, Math.min(maxFrame, Math.round(scene.startFrame)));
      const end = Math.max(start, Math.min(maxFrame, Math.round(scene.endFrame) - 1));
      const span = end - start;
      picked.add(Math.min(maxFrame, start + Math.round(span * 0.25)));
      picked.add(Math.min(maxFrame, start + Math.round(span * 0.6)));
      picked.add(Math.max(start, end - 1));
    }
  } else {
    const count = Math.min(6, meta.durationFrames);
    for (let i = 0; i < count; i++) {
      picked.add(count === 1 ? 0 : Math.round((i / (count - 1)) * maxFrame));
    }
  }
  return [...picked].sort((a, b) => a - b);
}

interface OpenedStagePage {
  meta: StageMeta;
  evaluate: (expression: string) => Promise<unknown>;
  seek: (frame: number, transparent: boolean) => Promise<void>;
  screenshot: (transparent: boolean) => Promise<Buffer>;
  auditFrame: (frame: number) => Promise<FrameAuditResult>;
  close: () => Promise<void>;
}

async function openStagePage(
  entryHtmlPath: string,
  options: { browser: string; motionfluxRoot?: string; scale?: number; transparent?: boolean },
): Promise<OpenedStagePage> {
  const absEntry = resolve(entryHtmlPath);
  const projectDir = dirname(absEntry);
  const entryName = basename(absEntry);
  const server = await startStageServer(projectDir, {
    ...(options.motionfluxRoot ? { motionfluxRoot: options.motionfluxRoot } : {}),
  });
  const cdp = await launchChrome(options.browser);
  const scale = options.scale ?? 1;

  try {
    const targetUrl = `${server.url}/${encodeURIComponent(entryName)}?capture=1`;
    const { targetId } = (await cdp.send('Target.createTarget', { url: targetUrl })) as { targetId: string };
    const { sessionId } = (await cdp.send('Target.attachToTarget', { targetId, flatten: true })) as { sessionId: string };

    const evaluate = async (expression: string): Promise<unknown> => {
      const reply = (await cdp.send(
        'Runtime.evaluate',
        { expression, returnByValue: true, awaitPromise: true },
        sessionId,
      )) as {
        result: { value?: unknown };
        exceptionDetails?: { text: string; exception?: { description?: string } };
      };
      if (reply.exceptionDetails) {
        throw new Error(`STAGE_EVAL_FAILED: ${reply.exceptionDetails.exception?.description ?? reply.exceptionDetails.text}`);
      }
      return reply.result.value;
    };

    const deadline = Date.now() + 60000;
    for (;;) {
      const present = (await evaluate(`Boolean(window.__motionflux && window.__motionflux.version === 'stage-1')`)) as boolean;
      if (present) break;
      if (Date.now() > deadline) {
        throw new Error('STAGE_NOT_READY: Page did not expose window.__motionflux (stage-1) within 60 s.');
      }
      await new Promise((r) => setTimeout(r, 50));
    }

    await evaluate('window.__motionflux.ready');
    const meta = (await evaluate('window.__motionflux.meta')) as StageMeta;

    await cdp.send(
      'Emulation.setDeviceMetricsOverride',
      {
        width: meta.width,
        height: meta.height,
        deviceScaleFactor: scale,
        mobile: false,
      },
      sessionId,
    );

    if (options.transparent) {
      await cdp.send(
        'Emulation.setDefaultBackgroundColorOverride',
        { color: { r: 0, g: 0, b: 0, a: 0 } },
        sessionId,
      );
    }

    const seek = async (frame: number, transparent: boolean) => {
      await evaluate(`window.__motionflux.seek(${frame}, { transparent: ${transparent ? 'true' : 'false'} })`);
    };

    const screenshot = async (transparent: boolean): Promise<Buffer> => {
      const res = (await cdp.send(
        'Page.captureScreenshot',
        {
          format: 'png',
          fromSurface: true,
          captureBeyondViewport: false,
          ...(transparent ? { omitBackground: true } : {}),
        },
        sessionId,
      )) as { data: string };
      return Buffer.from(res.data, 'base64');
    };

    const auditFrame = async (frame: number): Promise<FrameAuditResult> => {
      return (await evaluate(`window.__motionflux.audit(${frame})`)) as FrameAuditResult;
    };

    return {
      meta,
      evaluate,
      seek,
      screenshot,
      auditFrame,
      close: async () => {
        await cdp.close();
        await server.close();
      },
    };
  } catch (error) {
    await cdp.close().catch(() => undefined);
    await server.close().catch(() => undefined);
    throw error;
  }
}

async function renderContactSheetPng(
  browser: string,
  tiles: Array<{ frame: number; timeSec: number; sceneId?: string; errors: number; warnings: number; png: Buffer }>,
  meta: StageMeta,
): Promise<Buffer> {
  if (tiles.length === 0) throw new Error('CONTACT_SHEET_EMPTY: No frames to render.');
  const cols = Math.min(3, tiles.length);
  const rows = Math.ceil(tiles.length / cols);
  const tileW = 420;
  const tileH = Math.round((tileW * meta.height) / meta.width);
  const headerH = 34;
  const pad = 16;
  const gap = 14;
  const sheetW = pad * 2 + cols * tileW + (cols - 1) * gap;
  const sheetH = pad * 2 + rows * (tileH + headerH) + (rows - 1) * gap;

  const cardsHtml = tiles
    .map((tile) => {
      const badgeBg = tile.errors > 0 ? '#dc2626' : tile.warnings > 0 ? '#d97706' : '#059669';
      const badgeText = tile.errors > 0 ? `${tile.errors} err` : tile.warnings > 0 ? `${tile.warnings} warn` : 'OK';
      const sceneTag = tile.sceneId ? ` · ${tile.sceneId}` : '';
      return `<div class="tile">
        <div class="head">
          <span>f${tile.frame} (${tile.timeSec.toFixed(2)}s)${sceneTag}</span>
          <span class="badge" style="background:${badgeBg}">${badgeText}</span>
        </div>
        <img src="data:image/png;base64,${tile.png.toString('base64')}" width="${tileW}" height="${tileH}" />
      </div>`;
    })
    .join('');

  const html = `<!doctype html><meta charset="utf-8"><style>
    html,body{margin:0;padding:0;background:#0b0d12;color:#e5e7eb;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
    .grid{display:grid;grid-template-columns:repeat(${cols},${tileW}px);gap:${gap}px;padding:${pad}px;box-sizing:border-box}
    .tile{background:#141821;border:1px solid rgba(255,255,255,0.12);border-radius:6px;overflow:hidden}
    .head{height:${headerH}px;display:flex;align-items:center;justify-content:space-between;padding:0 10px;font-size:12px;box-sizing:border-box}
    .badge{color:#fff;padding:2px 7px;border-radius:999px;font-size:11px;font-weight:600}
    img{display:block;object-fit:contain;background:#000}
  </style><div class="grid">${cardsHtml}</div>`;

  const cdp = await launchChrome(browser);
  const work = await mkdtemp(join(tmpdir(), 'motionflux-contact-'));
  try {
    const file = join(work, 'sheet.html');
    await writeFile(file, html);
    const server = await startStageServer(work);
    try {
      const { targetId } = (await cdp.send('Target.createTarget', { url: `${server.url}/sheet.html` })) as { targetId: string };
      const { sessionId } = (await cdp.send('Target.attachToTarget', { targetId, flatten: true })) as { sessionId: string };
      await cdp.send(
        'Emulation.setDeviceMetricsOverride',
        { width: sheetW, height: sheetH, deviceScaleFactor: 1, mobile: false },
        sessionId,
      );
      await cdp.send(
        'Runtime.evaluate',
        {
          expression: `Promise.all(Array.from(document.images).map(i => i.complete ? Promise.resolve() : new Promise(r => { i.onload = r; i.onerror = r; })))`,
          awaitPromise: true,
        },
        sessionId,
      );
      const res = (await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true }, sessionId)) as { data: string };
      return Buffer.from(res.data, 'base64');
    } finally {
      await server.close();
    }
  } finally {
    await cdp.close();
    await rm(work, { recursive: true, force: true });
  }
}

export async function auditStage(
  entryHtmlPath: string,
  options: {
    browser?: string;
    motionfluxRoot?: string;
    frames?: number[];
    contactSheetOut?: string;
  } = {},
): Promise<StageAuditReport> {
  const browser = await findBrowser(options.browser);
  if (!browser) {
    throw new Error('BROWSER_MISSING: audit requires Chrome, Chromium or Edge. Pass --browser <path> or set MOTIONFLUX_BROWSER_PATH.');
  }

  const page = await openStagePage(entryHtmlPath, {
    browser,
    ...(options.motionfluxRoot ? { motionfluxRoot: options.motionfluxRoot } : {}),
  });

  try {
    const frames = options.frames && options.frames.length > 0 ? options.frames : selectDefaultAuditFrames(page.meta);
    const results: FrameAuditResult[] = [];
    const tiles: Array<{ frame: number; timeSec: number; sceneId?: string; errors: number; warnings: number; png: Buffer }> = [];

    for (const frame of frames) {
      const res = await page.auditFrame(frame);
      results.push(res);
      if (options.contactSheetOut) {
        const png = await page.screenshot(false);
        tiles.push({
          frame: res.frame,
          timeSec: res.timeSec,
          ...(res.sceneId ? { sceneId: res.sceneId } : {}),
          errors: res.issues.filter((i) => i.severity === 'error').length,
          warnings: res.issues.filter((i) => i.severity === 'warning').length,
          png,
        });
      }
    }

    let contactSheetPath: string | undefined;
    if (options.contactSheetOut && tiles.length > 0) {
      const sheetPng = await renderContactSheetPng(browser, tiles, page.meta);
      contactSheetPath = resolve(options.contactSheetOut);
      await mkdir(dirname(contactSheetPath), { recursive: true });
      await writeFile(contactSheetPath, sheetPng);
    }

    const allIssues = results.flatMap((r) => r.issues);
    const errors = allIssues.filter((i) => i.severity === 'error').length;
    const warnings = allIssues.filter((i) => i.severity === 'warning').length;

    return {
      entry: resolve(entryHtmlPath),
      meta: page.meta,
      passed: errors === 0,
      summary: {
        auditedFrames: results.length,
        errors,
        warnings,
      },
      frames: results,
      issues: allIssues,
      ...(contactSheetPath ? { contactSheet: contactSheetPath } : {}),
      browser,
    };
  } finally {
    await page.close();
  }
}

export async function captureStageFrames(
  entryHtmlPath: string,
  options: {
    outDir: string;
    frames?: number[];
    browser?: string;
    motionfluxRoot?: string;
    transparent?: boolean;
    scale?: number;
  },
): Promise<{
  directory: string;
  type: 'png-sequence';
  pattern: string;
  frames: number;
  files: string[];
  width: number;
  height: number;
  fps: number;
  alpha: boolean;
  browser: string;
}> {
  const browser = await findBrowser(options.browser);
  if (!browser) {
    throw new Error('BROWSER_MISSING: frames requires Chrome, Chromium or Edge. Pass --browser <path> or set MOTIONFLUX_BROWSER_PATH.');
  }
  const transparent = Boolean(options.transparent);
  const scale = options.scale ?? 1;
  const page = await openStagePage(entryHtmlPath, {
    browser,
    ...(options.motionfluxRoot ? { motionfluxRoot: options.motionfluxRoot } : {}),
    transparent,
    scale,
  });

  try {
    const targetFrames = options.frames && options.frames.length > 0
      ? options.frames
      : Array.from({ length: page.meta.durationFrames }, (_, i) => i);
    const outDir = resolve(options.outDir);
    await mkdir(outDir, { recursive: true });
    const files: string[] = [];

    for (const frame of targetFrames) {
      await page.seek(frame, transparent);
      const png = await page.screenshot(transparent);
      const file = join(outDir, `frame-${String(frame).padStart(6, '0')}.png`);
      await writeFile(file, png);
      files.push(file);
    }

    return {
      directory: outDir,
      type: 'png-sequence',
      pattern: 'frame-%06d.png',
      frames: files.length,
      files: files.length <= 24 ? files : [files[0]!, '…', files.at(-1)!],
      width: Math.round(page.meta.width * scale),
      height: Math.round(page.meta.height * scale),
      fps: page.meta.fps,
      alpha: transparent,
      browser,
    };
  } finally {
    await page.close();
  }
}

export function probeStageVideo(path: string): StageVideoReport | undefined {
  const probe = (process.env.MOTIONFLUX_FFMPEG_PATH ?? 'ffmpeg').replace(/ffmpeg(\.exe)?$/u, 'ffprobe$1');
  const result = spawnSync(
    probe,
    [
      '-v', 'error',
      '-count_frames',
      '-show_entries', 'stream=codec_type,codec_name,pix_fmt,width,height,nb_read_frames,r_frame_rate:stream_tags=alpha_mode:format=duration',
      '-of', 'json',
      path,
    ],
    { encoding: 'utf8' },
  );
  if (result.status !== 0) return undefined;
  const data = JSON.parse(result.stdout) as {
    streams: Array<{
      codec_type: string;
      codec_name: string;
      pix_fmt?: string;
      width?: number;
      height?: number;
      nb_read_frames?: string;
      r_frame_rate?: string;
      tags?: { alpha_mode?: string; ALPHA_MODE?: string };
    }>;
    format: { duration: string };
  };
  const video = data.streams.find((s) => s.codec_type === 'video');
  const audio = data.streams.find((s) => s.codec_type === 'audio');
  if (!video) return undefined;
  const pixFmt = video.pix_fmt ?? '';
  return {
    codec: video.codec_name,
    pixelFormat: pixFmt,
    alpha: /^(yuva|rgba|bgra|argb|abgr|gbrap|ya)/u.test(pixFmt) || (video.tags?.alpha_mode ?? video.tags?.ALPHA_MODE) === '1',
    width: video.width ?? 0,
    height: video.height ?? 0,
    frames: Number(video.nb_read_frames ?? 0),
    durationSeconds: Number(data.format.duration ?? 0),
    frameRate: video.r_frame_rate ?? '',
    hasAudio: Boolean(audio),
    ...(audio ? { audioCodec: audio.codec_name } : {}),
  };
}

export async function renderStageVideo(
  entryHtmlPath: string,
  options: {
    outPath: string;
    browser?: string;
    motionfluxRoot?: string;
    transparent?: boolean;
    scale?: number;
    noAudio?: boolean;
    runAudit?: boolean;
  },
): Promise<{
  path: string;
  type: string;
  bytes: number;
  expected: { frames: number; durationSeconds: number; width: number; height: number; alpha: boolean; audio: boolean };
  written: StageVideoReport | string;
  verified: boolean;
  audioSources: number;
  audit?: { passed: boolean; errors: number; warnings: number };
  browser: string;
}> {
  const format = extname(options.outPath).slice(1).toLowerCase() as VideoFormat;
  if (!(format in videoFormats) || format === 'gif') {
    throw new Error('USAGE: render picks the format from --out: .mp4 (H.264), .mov (ProRes 4444) or .webm (VP9).');
  }
  const transparent = Boolean(options.transparent);
  if (transparent && !videoFormats[format].alpha) {
    throw new Error('ALPHA_UNSUPPORTED: H.264 MP4 cannot carry transparency. Use .mov or .webm with --transparent, or frames for PNGs.');
  }
  if (!toolVersion(ffmpegPath())) {
    throw new Error('FFMPEG_MISSING: ffmpeg was not found. Install it or set MOTIONFLUX_FFMPEG_PATH; use frames or audit without it.');
  }
  const browser = await findBrowser(options.browser);
  if (!browser) {
    throw new Error('BROWSER_MISSING: render requires Chrome, Chromium or Edge. Pass --browser <path> or set MOTIONFLUX_BROWSER_PATH.');
  }

  const scale = options.scale ?? 1;
  const page = await openStagePage(entryHtmlPath, {
    browser,
    ...(options.motionfluxRoot ? { motionfluxRoot: options.motionfluxRoot } : {}),
    transparent,
    scale,
  });
  const work = await mkdtemp(join(tmpdir(), 'motionflux-stage-audio-'));

  try {
    const width = Math.round(page.meta.width * scale);
    const height = Math.round(page.meta.height * scale);
    if (videoFormats[format].evenSize && (width % 2 || height % 2)) {
      throw new Error(`VIDEO_SIZE: .${format} needs even dimensions; output size is ${width}×${height}.`);
    }

    let auditSummary: { passed: boolean; errors: number; warnings: number } | undefined;
    if (options.runAudit) {
      const auditFrames = selectDefaultAuditFrames(page.meta);
      let errors = 0;
      let warnings = 0;
      for (const f of auditFrames) {
        const res = await page.auditFrame(f);
        errors += res.issues.filter((i) => i.severity === 'error').length;
        warnings += res.issues.filter((i) => i.severity === 'warning').length;
      }
      auditSummary = { passed: errors === 0, errors, warnings };
    }

    const durationSec = page.meta.durationFrames / page.meta.fps;
    let sfxWavPath: string | undefined;
    const cues = options.noAudio ? [] : page.meta.audio;
    if (cues.some(isProceduralCue)) {
      const { wav } = synthesizeSfxTrack(cues, durationSec, page.meta.fps);
      sfxWavPath = join(work, 'sfx.wav');
      await writeFile(sfxWavPath, wav);
    }
    const audioPlan = cues.length > 0
      ? await buildAudioMuxPlan(cues, entryHtmlPath, sfxWavPath, durationSec, page.meta.fps)
      : undefined;

    const out = resolve(options.outPath);
    await mkdir(dirname(out), { recursive: true });

    const audioCodecArgs = !audioPlan
      ? ['-an']
      : format === 'webm'
        ? ['-c:a', 'libopus', '-b:a', '160k']
        : format === 'mov'
          ? ['-c:a', 'pcm_s16le']
          : ['-c:a', 'aac', '-b:a', '192k'];

    const ffmpegArgs: string[] = [
      '-y',
      '-loglevel', 'error',
      '-f', 'image2pipe',
      '-framerate', String(page.meta.fps),
      '-i', '-',
      ...(audioPlan ? audioPlan.inputArgs : []),
      ...(audioPlan ? ['-filter_complex', audioPlan.filterComplex, '-map', '0:v:0', '-map', audioPlan.audioMap] : []),
      ...videoFormats[format].encoder(transparent),
      ...audioCodecArgs,
      '-shortest',
      out,
    ];

    const child = spawn(ffmpegPath(), ffmpegArgs, { stdio: ['pipe', 'ignore', 'pipe'] });
    let log = '';
    child.stderr.on('data', (chunk: Buffer) => {
      log += chunk;
    });
    const finished = new Promise<void>((done, reject) => {
      child.once('error', (error: NodeJS.ErrnoException) =>
        reject(new Error(error.code === 'ENOENT' ? 'FFMPEG_MISSING: ffmpeg was not found.' : `ENCODE_FAILED: ${error.message}`)),
      );
      child.once('close', (code) =>
        code === 0
          ? done()
          : reject(new Error(`ENCODE_FAILED: ffmpeg exited with code ${code}. ${log.trim().split('\n').slice(-3).join(' ')}`)),
      );
    });

    let encoderError: Error | undefined;
    void finished.catch((err: Error) => {
      encoderError = err;
    });
    child.stdin.on('error', () => {
      /* exit code carries error */
    });

    try {
      for (let frame = 0; frame < page.meta.durationFrames; frame++) {
        await page.seek(frame, transparent);
        const png = await page.screenshot(transparent);
        await new Promise<void>((written, reject) => {
          if (encoderError) {
            reject(encoderError);
            return;
          }
          child.stdin.write(png, (err) => (err ? reject(encoderError ?? new Error(`ENCODE_FAILED: ${err.message}`)) : written()));
        });
      }
    } catch (error) {
      child.kill();
      await finished.catch(() => undefined);
      throw encoderError ?? error;
    }

    child.stdin.end();
    await finished;

    const written = probeStageVideo(out);
    const hasExpectedAudio = Boolean(audioPlan);
    return {
      path: out,
      type: `video/${format === 'mov' ? 'quicktime' : format}`,
      bytes: (await stat(out)).size,
      expected: {
        frames: page.meta.durationFrames,
        durationSeconds: durationSec,
        width,
        height,
        alpha: transparent,
        audio: hasExpectedAudio,
      },
      written: written ?? 'ffprobe not available; the file was not read back',
      verified: Boolean(
        written &&
          written.frames === page.meta.durationFrames &&
          written.width === width &&
          written.height === height &&
          Math.abs(written.durationSeconds - durationSec) < 0.1 &&
          written.alpha === transparent &&
          written.hasAudio === hasExpectedAudio,
      ),
      audioSources: audioPlan?.sourceCount ?? 0,
      ...(auditSummary ? { audit: auditSummary } : {}),
      browser,
    };
  } finally {
    await page.close();
    await rm(work, { recursive: true, force: true });
  }
}
