import { resolve, dirname } from 'node:path';
import { access } from 'node:fs/promises';
import type { AudioCue, FileAudioCue, ProceduralSfxCue, SfxKind } from './types.js';

export const SFX_KINDS: readonly SfxKind[] = [
  'whoosh',
  'whoosh-soft',
  'pop',
  'pop-soft',
  'tick',
  'click',
  'sub-hit',
  'riser',
  'chime',
  'shutter',
] as const;

export function isProceduralCue(cue: AudioCue): cue is ProceduralSfxCue {
  return 'sfx' in cue && typeof cue.sfx === 'string';
}

export function isFileAudioCue(cue: AudioCue): cue is FileAudioCue {
  return 'src' in cue && typeof cue.src === 'string';
}

export function cueStartSeconds(cue: AudioCue, fps: number): number {
  if (typeof cue.atSec === 'number' && Number.isFinite(cue.atSec)) return Math.max(0, cue.atSec);
  if (typeof cue.atFrame === 'number' && Number.isFinite(cue.atFrame)) return Math.max(0, cue.atFrame / fps);
  return 0;
}

/** Deterministic xorshift32 PRNG in [-1, 1]. */
function createNoise(seed: number): () => number {
  let state = (seed | 0) || 0x12345678;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) / 0x80000000) - 1;
  };
}

/** Simple 2-pole state-variable bandpass/lowpass filter for clean commercial SFX synthesis. */
function renderProceduralCue(cue: ProceduralSfxCue, sampleRate: number): Float32Array {
  const pitch = Math.max(0.25, Math.min(4, cue.pitch ?? 1));
  const noise = createNoise(cue.seed ?? (SFX_KINDS.indexOf(cue.sfx) + 1) * 9973);

  const defaultDur: Record<SfxKind, number> = {
    whoosh: 0.42,
    'whoosh-soft': 0.52,
    pop: 0.14,
    'pop-soft': 0.16,
    tick: 0.045,
    click: 0.06,
    'sub-hit': 0.55,
    riser: 0.9,
    chime: 0.95,
    shutter: 0.15,
  };
  const durationSec = Math.max(0.02, Math.min(6, cue.durationSec ?? defaultDur[cue.sfx]));
  const length = Math.max(1, Math.round(durationSec * sampleRate));
  const out = new Float32Array(length);

  if (cue.sfx === 'whoosh' || cue.sfx === 'whoosh-soft') {
    const soft = cue.sfx === 'whoosh-soft';
    let lp = 0;
    let bp = 0;
    let pink = 0;
    for (let i = 0; i < length; i++) {
      const u = i / length;
      const white = noise();
      pink = 0.86 * pink + 0.14 * white;
      const src = soft ? pink * 1.8 : white * 0.55 + pink * 1.1;
      // Bell-shaped frequency sweep: low -> bright peak -> warm tail
      const sweep = Math.sin(Math.PI * Math.pow(u, 0.78));
      const freq = (soft ? 220 + 1300 * sweep : 280 + 2600 * sweep) * pitch;
      const f = Math.min(0.85, 2 * Math.sin((Math.PI * Math.min(freq, sampleRate * 0.42)) / sampleRate));
      const q = soft ? 0.55 : 0.42;
      const hp = src - lp - q * bp;
      bp += f * hp;
      lp += f * bp;
      const env = Math.pow(Math.sin(Math.PI * u), soft ? 1.5 : 1.15);
      // Subtle low body underneath the air sweep
      const body = Math.sin(2 * Math.PI * (85 + 60 * sweep) * pitch * (i / sampleRate)) * 0.16 * env;
      out[i] = (bp * (soft ? 0.65 : 0.85) + body) * env;
    }
    return out;
  }

  if (cue.sfx === 'pop' || cue.sfx === 'pop-soft') {
    const soft = cue.sfx === 'pop-soft';
    let phase = 0;
    const fStart = (soft ? 240 : 320) * pitch;
    const fPeak = (soft ? 540 : 880) * pitch;
    const fEnd = (soft ? 180 : 210) * pitch;
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const u = i / length;
      const freq = u < 0.18
        ? fStart + (fPeak - fStart) * (u / 0.18)
        : fEnd + (fPeak - fEnd) * Math.exp(-(u - 0.18) * 9);
      phase += (2 * Math.PI * freq) / sampleRate;
      const attack = Math.min(1, t / 0.004);
      const decay = Math.exp(-t * (soft ? 26 : 34));
      const tone = Math.sin(phase) * 0.85 + Math.sin(phase * 2) * (soft ? 0.08 : 0.16);
      const air = noise() * Math.exp(-t * 140) * (soft ? 0.06 : 0.12);
      out[i] = (tone + air) * attack * decay;
    }
    return out;
  }

  if (cue.sfx === 'tick' || cue.sfx === 'click') {
    const isClick = cue.sfx === 'click';
    let phase = 0;
    let lp = 0;
    let bp = 0;
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const freq = (isClick ? 1800 : 2900) * pitch * Math.exp(-t * 45) + 420 * pitch;
      phase += (2 * Math.PI * freq) / sampleRate;
      const raw = noise();
      const f = Math.min(0.85, 2 * Math.sin((Math.PI * Math.min((isClick ? 2400 : 3800) * pitch, sampleRate * 0.42)) / sampleRate));
      const hp = raw - lp - 0.4 * bp;
      bp += f * hp;
      lp += f * bp;
      const env = Math.min(1, t / 0.0012) * Math.exp(-t * (isClick ? 95 : 140));
      out[i] = (Math.sin(phase) * 0.55 + bp * 0.7) * env;
    }
    return out;
  }

  if (cue.sfx === 'sub-hit') {
    let phase = 0;
    let lp = 0;
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const freq = (36 + 98 * Math.exp(-t * 16)) * pitch;
      phase += (2 * Math.PI * freq) / sampleRate;
      const attack = Math.min(1, t / 0.006);
      const subEnv = Math.exp(-t * 5.2);
      const punch = Math.sin(phase) * 0.92 + Math.sin(phase * 2) * 0.14 * Math.exp(-t * 18);
      lp = 0.72 * lp + 0.28 * noise();
      const thumpNoise = lp * Math.exp(-t * 36) * 0.35;
      out[i] = Math.tanh((punch * subEnv + thumpNoise) * 1.15) * attack;
    }
    return out;
  }

  if (cue.sfx === 'riser') {
    let phase1 = 0;
    let phase2 = 0;
    let lp = 0;
    let bp = 0;
    for (let i = 0; i < length; i++) {
      const u = i / length;
      const curve = u * u;
      const f1 = (110 + 440 * curve) * pitch;
      phase1 += (2 * Math.PI * f1) / sampleRate;
      phase2 += (2 * Math.PI * f1 * 1.5) / sampleRate;
      const cut = Math.min(sampleRate * 0.42, (240 + 4200 * curve) * pitch);
      const f = Math.min(0.85, 2 * Math.sin((Math.PI * cut) / sampleRate));
      const hp = noise() - lp - 0.35 * bp;
      bp += f * hp;
      lp += f * bp;
      // Exponential build with clean 18ms anti-click release at peak
      const tailOut = u > 0.96 ? (1 - u) / 0.04 : 1;
      const env = Math.pow(u, 1.8) * tailOut;
      out[i] = (bp * 0.65 + (Math.sin(phase1) * 0.32 + Math.sin(phase2) * 0.18)) * env;
    }
    return out;
  }

  if (cue.sfx === 'chime') {
    // Warm major-9th bell partials (C5, G5, B5, D6)
    const freqs = [523.25, 783.99, 987.77, 1174.66].map((f) => f * pitch);
    const weights = [0.46, 0.28, 0.16, 0.12];
    const decays = [3.6, 4.8, 6.0, 7.2];
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const attack = Math.min(1, t / 0.008);
      let sample = 0;
      for (let k = 0; k < freqs.length; k++) {
        sample += Math.sin(2 * Math.PI * freqs[k]! * t) * weights[k]! * Math.exp(-t * decays[k]!);
      }
      out[i] = sample * attack;
    }
    return out;
  }

  // shutter: crisp dual-click mechanical snap
  let lp = 0;
  let bp = 0;
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const raw = noise();
    const f = Math.min(0.85, 2 * Math.sin((Math.PI * Math.min(3400 * pitch, sampleRate * 0.42)) / sampleRate));
    const hp = raw - lp - 0.35 * bp;
    bp += f * hp;
    lp += f * bp;
    const click1 = Math.exp(-t * 145) * Math.min(1, t / 0.001);
    const t2 = t - 0.042;
    const click2 = t2 >= 0 ? Math.exp(-t2 * 130) * Math.min(1, t2 / 0.001) * 0.72 : 0;
    const body = Math.sin(2 * Math.PI * 190 * pitch * t) * (click1 + click2) * 0.35;
    out[i] = (bp * 0.85 + body) * (click1 + click2);
  }
  return out;
}

/** Encode stereo Float32 arrays into a standard 48kHz 16-bit PCM WAV buffer. */
export function encodeWavStereo(left: Float32Array, right: Float32Array, sampleRate = 48000): Buffer {
  const numSamples = Math.min(left.length, right.length);
  const dataBytes = numSamples * 4;
  const buffer = Buffer.alloc(44 + dataBytes);
  buffer.write('RIFF', 0, 'ascii');
  buffer.writeUInt32LE(36 + dataBytes, 4);
  buffer.write('WAVE', 8, 'ascii');
  buffer.write('fmt ', 12, 'ascii');
  buffer.writeUInt32LE(16, 16); // PCM fmt chunk size
  buffer.writeUInt16LE(1, 20); // PCM format
  buffer.writeUInt16LE(2, 22); // stereo
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 4, 28); // byte rate
  buffer.writeUInt16LE(4, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write('data', 36, 'ascii');
  buffer.writeUInt32LE(dataBytes, 40);
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    // Soft-knee limiter prevents harsh digital clipping when multiple SFX overlap.
    const l = Math.max(-1, Math.min(1, Math.tanh(left[i]!)));
    const r = Math.max(-1, Math.min(1, Math.tanh(right[i]!)));
    buffer.writeInt16LE(Math.round(l * 32767), offset);
    buffer.writeInt16LE(Math.round(r * 32767), offset + 2);
    offset += 4;
  }
  return buffer;
}

export function synthesizeSfxTrack(
  cues: readonly AudioCue[],
  durationSec: number,
  fps: number,
  sampleRate = 48000,
): { wav: Buffer; proceduralCount: number } {
  const procedural = cues.filter(isProceduralCue);
  const totalSamples = Math.max(1, Math.ceil(durationSec * sampleRate));
  const left = new Float32Array(totalSamples);
  const right = new Float32Array(totalSamples);

  for (const cue of procedural) {
    if (!SFX_KINDS.includes(cue.sfx)) {
      throw new Error(`AUDIO_SFX_UNKNOWN: Unknown procedural SFX "${String(cue.sfx)}". Supported: ${SFX_KINDS.join(', ')}.`);
    }
    const startSample = Math.round(cueStartSeconds(cue, fps) * sampleRate);
    if (startSample >= totalSamples) continue;
    const mono = renderProceduralCue(cue, sampleRate);
    const gain = Math.max(0, Math.min(2, cue.gain ?? 0.65));
    const pan = Math.max(-1, Math.min(1, cue.pan ?? 0));
    // Equal-power stereo panning
    const angle = ((pan + 1) * Math.PI) / 4;
    const gainL = Math.cos(angle) * gain;
    const gainR = Math.sin(angle) * gain;
    const end = Math.min(totalSamples, startSample + mono.length);
    for (let i = startSample; i < end; i++) {
      const s = mono[i - startSample]!;
      left[i] = left[i]! + s * gainL;
      right[i] = right[i]! + s * gainR;
    }
  }

  return { wav: encodeWavStereo(left, right, sampleRate), proceduralCount: procedural.length };
}

export interface AudioMuxPlan {
  inputArgs: string[];
  filterComplex: string;
  audioMap: string;
  sourceCount: number;
}

/**
 * Build FFmpeg audio inputs and filter_complex to mix the synthesized SFX WAV (if any)
 * and all declared external audio files into a single stereo track trimmed to video duration.
 * Video input is always assumed to be input index 0.
 */
export async function buildAudioMuxPlan(
  cues: readonly AudioCue[],
  entryHtmlPath: string,
  sfxWavPath: string | undefined,
  durationSec: number,
  fps: number,
): Promise<AudioMuxPlan | undefined> {
  const fileCues = cues.filter(isFileAudioCue);
  const inputArgs: string[] = [];
  const filters: string[] = [];
  const labels: string[] = [];
  let nextInput = 1; // 0 is reserved for the video frame stream

  if (sfxWavPath) {
    inputArgs.push('-i', sfxWavPath);
    filters.push(`[${nextInput}:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,atrim=0:${durationSec.toFixed(4)}[a_sfx]`);
    labels.push('[a_sfx]');
    nextInput++;
  }

  const baseDir = dirname(resolve(entryHtmlPath));
  for (let i = 0; i < fileCues.length; i++) {
    const cue = fileCues[i]!;
    const filePath = resolve(baseDir, cue.src);
    await access(filePath).catch(() => {
      throw new Error(`AUDIO_MISSING: Audio file "${cue.src}" not found at ${filePath}.`);
    });
    if (cue.loop) inputArgs.push('-stream_loop', '-1');
    inputArgs.push('-i', filePath);

    const startSec = cueStartSeconds(cue, fps);
    const delayMs = Math.round(startSec * 1000);
    const gain = Math.max(0, Math.min(4, cue.gain ?? 1));
    const offsetSec = Math.max(0, cue.offsetSec ?? 0);
    const maxRemaining = Math.max(0.01, durationSec - startSec);
    const clipDuration = cue.durationSec !== undefined
      ? Math.max(0.01, Math.min(cue.durationSec, maxRemaining))
      : maxRemaining;

    const chain: string[] = [
      'aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo',
      `atrim=start=${offsetSec.toFixed(4)}:duration=${clipDuration.toFixed(4)}`,
      'asetpts=PTS-STARTPTS',
    ];
    if (cue.fadeInSec && cue.fadeInSec > 0) {
      chain.push(`afade=t=in:st=0:d=${Math.min(cue.fadeInSec, clipDuration).toFixed(4)}`);
    }
    if (cue.fadeOutSec && cue.fadeOutSec > 0) {
      const fadeOut = Math.min(cue.fadeOutSec, clipDuration);
      const st = Math.max(0, clipDuration - fadeOut);
      chain.push(`afade=t=out:st=${st.toFixed(4)}:d=${fadeOut.toFixed(4)}`);
    }
    if (gain !== 1) chain.push(`volume=${gain.toFixed(4)}`);
    if (delayMs > 0) chain.push(`adelay=${delayMs}|${delayMs}`);

    const label = `[a_file_${i}]`;
    filters.push(`[${nextInput}:a]${chain.join(',')}${label}`);
    labels.push(label);
    nextInput++;
  }

  if (labels.length === 0) return undefined;

  if (labels.length === 1) {
    filters.push(`${labels[0]}apad=whole_dur=${durationSec.toFixed(4)},atrim=0:${durationSec.toFixed(4)},alimiter=limit=0.95[a_out]`);
  } else {
    filters.push(`${labels.join('')}amix=inputs=${labels.length}:duration=longest:normalize=0,apad=whole_dur=${durationSec.toFixed(4)},atrim=0:${durationSec.toFixed(4)},alimiter=limit=0.95[a_out]`);
  }

  return {
    inputArgs,
    filterComplex: filters.join(';'),
    audioMap: '[a_out]',
    sourceCount: labels.length,
  };
}
