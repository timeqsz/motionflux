import { spawnSync } from 'node:child_process';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { basename, join, relative, resolve } from 'node:path';
import { ffmpegPath, toolVersion } from './capture.js';
import type { VideoBreakdown } from './breakdown.js';

export interface SceneCut {
  timeSec: number;
  score: number;
}

export interface VideoInspectionReport {
  source: string;
  codec: string;
  width: number;
  height: number;
  fps: number;
  durationSeconds: number;
  cuts: SceneCut[];
  shots: Array<{ index: number; fromSec: number; toSec: number; durationSec: number }>;
  contactSheet: string;
  breakdownTemplate: string;
  inspectionJson: string;
}

function parseFrameRate(raw: string | undefined): number {
  if (!raw) return 30;
  const parts = raw.split('/').map(Number);
  if (parts.length === 2 && parts[0]! > 0 && parts[1]! > 0) {
    return Math.round((parts[0]! / parts[1]!) * 1000) / 1000;
  }
  const single = Number(raw);
  return Number.isFinite(single) && single > 0 ? single : 30;
}

export function parseScdetLog(stderrLog: string): SceneCut[] {
  const cuts: SceneCut[] = [];
  for (const line of stderrLog.split('\n')) {
    const m = line.match(/lavfi\.scd\.score:\s*([\d.]+).*?lavfi\.scd\.time:\s*([\d.]+)/u);
    if (m) {
      const score = Math.round(Number(m[1]) * 100) / 100;
      const timeSec = Math.round(Number(m[2]) * 1000) / 1000;
      if (Number.isFinite(timeSec) && timeSec > 0.05) {
        cuts.push({ timeSec, score });
      }
    }
  }
  return cuts;
}

/**
 * Probe a reference video locally via ffprobe + FFmpeg `scdet` scene-cut detection,
 * render a contact sheet for multimodal visual inspection, and scaffold a valid
 * `breakdown.template.json` ready for `motion.mjs breakdown`.
 */
export async function inspectReferenceVideo(
  videoPath: string,
  options: {
    outDir: string;
    tiles?: number;
    threshold?: number;
  },
): Promise<VideoInspectionReport> {
  const absVideo = resolve(videoPath);
  await stat(absVideo).catch(() => {
    throw new Error(`SOURCE_MISSING: Video file does not exist at ${absVideo}.`);
  });

  const ffmpeg = ffmpegPath();
  if (!toolVersion(ffmpeg)) {
    throw new Error('FFMPEG_MISSING: ffmpeg was not found. Run `node scripts/motion.mjs setup --target ffmpeg --apply` or set MOTIONFLUX_FFMPEG_PATH.');
  }
  const ffprobe = ffmpeg.replace(/ffmpeg(\.exe)?$/u, 'ffprobe$1');

  const probed = spawnSync(
    ffprobe,
    [
      '-v',
      'error',
      '-select_streams',
      'v:0',
      '-show_entries',
      'stream=codec_name,width,height,r_frame_rate,avg_frame_rate:format=duration',
      '-of',
      'json',
      absVideo,
    ],
    { encoding: 'utf8' },
  );
  if (probed.status !== 0) {
    throw new Error(`SOURCE_UNREADABLE: ffprobe could not read ${absVideo}.`);
  }
  const meta = JSON.parse(probed.stdout) as {
    streams?: Array<{ codec_name?: string; width?: number; height?: number; avg_frame_rate?: string; r_frame_rate?: string }>;
    format?: { duration?: string };
  };
  const stream = meta.streams?.[0];
  const durationSeconds = Math.round(Number(meta.format?.duration ?? 0) * 1000) / 1000;
  if (!stream || !(durationSeconds > 0)) {
    throw new Error(`SOURCE_UNREADABLE: ${absVideo} has no readable video stream or duration.`);
  }
  const width = stream.width ?? 1920;
  const height = stream.height ?? 1080;
  const fps = parseFrameRate(stream.avg_frame_rate || stream.r_frame_rate);
  const codec = stream.codec_name ?? 'unknown';

  const threshold = options.threshold ?? 12;
  const scdetRun = spawnSync(
    ffmpeg,
    ['-hide_banner', '-i', absVideo, '-vf', `scdet=s=1:t=${threshold}`, '-an', '-f', 'null', '-'],
    { encoding: 'utf8' },
  );
  const cuts = parseScdetLog(`${scdetRun.stdout ?? ''}\n${scdetRun.stderr ?? ''}`);

  const boundaries = [0, ...cuts.map((c) => c.timeSec).filter((t) => t > 0.15 && t < durationSeconds - 0.15), durationSeconds];
  const shots = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    const fromSec = Math.round(boundaries[i]! * 100) / 100;
    const toSec = Math.round(boundaries[i + 1]! * 100) / 100;
    if (toSec > fromSec) {
      shots.push({
        index: shots.length + 1,
        fromSec,
        toSec,
        durationSec: Math.round((toSec - fromSec) * 100) / 100,
      });
    }
  }

  const outDir = resolve(options.outDir);
  await mkdir(outDir, { recursive: true });

  const totalTiles = Math.max(4, Math.min(24, Math.round(options.tiles ?? 9)));
  const cols = 3;
  const rows = Math.ceil(totalTiles / cols);
  const sampleFps = Math.max(0.2, totalTiles / Math.max(0.5, durationSeconds));
  const contactSheet = join(outDir, 'source-sheet.png');
  const sheetRun = spawnSync(
    ffmpeg,
    [
      '-y',
      '-v',
      'error',
      '-i',
      absVideo,
      '-vf',
      `fps=${sampleFps.toFixed(4)},scale=480:-1,tile=${cols}x${rows}`,
      '-update',
      '1',
      '-frames:v',
      '1',
      contactSheet,
    ],
    { encoding: 'utf8' },
  );
  if (sheetRun.status !== 0) {
    throw new Error(`CONTACT_SHEET_FAILED: ffmpeg could not render contact sheet. ${sheetRun.stderr?.trim() ?? ''}`);
  }

  const clipEnd = Math.round(Math.min(durationSeconds, 12) * 100) / 100;
  const relVideo = relative(outDir, absVideo).replace(/\\/gu, '/');
  const firstShotEnd = Math.min(clipEnd, shots[0]?.toSec ?? clipEnd);
  const template: VideoBreakdown = {
    title: `${basename(absVideo)} — Motion Study`,
    source: {
      video: relVideo,
      from: 0,
      to: clipEnd,
    },
    tracks: [
      {
        atom: 'prop.move',
        name: 'primary-subject',
        spans: [[0, Math.max(0.2, Math.round(firstShotEnd * 0.6 * 100) / 100)]],
      },
      {
        atom: 'timing.spring',
        name: 'settle-curve',
        spans: [[0, Math.max(0.2, Math.round(firstShotEnd * 0.6 * 100) / 100)]],
      },
    ],
  };

  const breakdownTemplate = join(outDir, 'breakdown.template.json');
  await writeFile(breakdownTemplate, `${JSON.stringify(template, null, 2)}\n`);

  const inspectionJson = join(outDir, 'inspection.json');
  const report: VideoInspectionReport = {
    source: absVideo,
    codec,
    width,
    height,
    fps,
    durationSeconds,
    cuts,
    shots,
    contactSheet,
    breakdownTemplate,
    inspectionJson,
  };
  await writeFile(inspectionJson, `${JSON.stringify(report, null, 2)}\n`);
  return report;
}
