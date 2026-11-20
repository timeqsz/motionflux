import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const cli = join(root, 'scripts/motion.mjs');
const stagePkg = await import(pathToFileURL(join(root, 'packages/stage/dist/index.js')).href);
const runtime = await import(pathToFileURL(join(root, 'stage/runtime.mjs')).href);

test('stage runtime helpers are pure, deterministic, and converge cleanly', () => {
  assert.equal(runtime.clamp(-2, 0, 1), 0);
  assert.equal(runtime.clamp(3, 0, 1), 1);
  assert.equal(runtime.lerp(10, 20, 0.25), 12.5);
  assert.equal(runtime.remap(15, 10, 20, 100, 200), 150);
  assert.equal(runtime.spring(0), 0);
  assert.equal(runtime.spring(-0.5), 0);
  // Underdamped spring overshoots 1 slightly then settles to 1
  const peak = Math.max(...Array.from({ length: 60 }, (_, i) => runtime.spring(i / 60, { stiffness: 200, damping: 14 })));
  assert.ok(peak > 1.02, `expected overshoot > 1.02, got ${peak}`);
  assert.ok(Math.abs(runtime.spring(2.5, { stiffness: 200, damping: 14 }) - 1) < 0.005);
  assert.equal(runtime.spring(0.35), runtime.spring(0.35));
  assert.equal(runtime.stagger(3, 6, 10), 28);
});

test('procedural SFX synthesizer produces deterministic 48kHz stereo WAV for all kinds', () => {
  const cues = stagePkg.SFX_KINDS.map((sfx, idx) => ({ sfx, atSec: idx * 0.2, gain: 0.6, pan: (idx % 3) - 1 }));
  const a = stagePkg.synthesizeSfxTrack(cues, 2.5, 30);
  const b = stagePkg.synthesizeSfxTrack(cues, 2.5, 30);
  assert.equal(a.proceduralCount, stagePkg.SFX_KINDS.length);
  assert.ok(a.wav.equals(b.wav), 'same cues must synthesize identical WAV bytes');
  assert.equal(a.wav.toString('ascii', 0, 4), 'RIFF');
  assert.equal(a.wav.toString('ascii', 8, 12), 'WAVE');
  assert.equal(a.wav.readUInt16LE(22), 2); // stereo
  assert.equal(a.wav.readUInt32LE(24), 48000); // sample rate
  // Verify non-silent audio payload
  let peakAbs = 0;
  for (let off = 44; off < a.wav.length; off += 2) {
    const v = Math.abs(a.wav.readInt16LE(off));
    if (v > peakAbs) peakAbs = v;
  }
  assert.ok(peakAbs > 1000, `expected audible peak > 1000, got ${peakAbs}`);
  assert.throws(() => stagePkg.synthesizeSfxTrack([{ sfx: 'laser-beam-unknown', atFrame: 0 }], 1, 30), /AUDIO_SFX_UNKNOWN/);
});

test('audio mux plan builds valid FFmpeg filter graph for SFX + external audio files', async () => {
  const work = await mkdtemp(join(tmpdir(), 'motionflux-audio-plan-'));
  try {
    const entry = join(work, 'index.html');
    const bgm = join(work, 'bgm.wav');
    const sfxWav = join(work, 'sfx.wav');
    await writeFile(entry, '<!doctype html>');
    await writeFile(bgm, Buffer.alloc(64));
    await writeFile(sfxWav, Buffer.alloc(64));

    const plan = await stagePkg.buildAudioMuxPlan(
      [
        { atFrame: 10, sfx: 'pop', gain: 0.5 },
        { src: './bgm.wav', atSec: 0.5, gain: 0.3, fadeInSec: 0.4, fadeOutSec: 0.5, loop: true },
      ],
      entry,
      sfxWav,
      4,
      30,
    );
    assert.ok(plan);
    assert.equal(plan.sourceCount, 2);
    assert.ok(plan.inputArgs.includes('-stream_loop'));
    assert.ok(plan.filterComplex.includes('amix=inputs=2'));
    assert.ok(plan.filterComplex.includes('adelay=500|500'));
    assert.ok(plan.filterComplex.includes('afade=t=in'));
    assert.ok(plan.filterComplex.includes('afade=t=out'));

    await assert.rejects(
      () => stagePkg.buildAudioMuxPlan([{ src: './missing.mp3', atSec: 0 }], entry, undefined, 4, 30),
      /AUDIO_MISSING/,
    );
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

test('CLI init and sfx commands scaffold a runnable HTML stage and synthesize WAV', async () => {
  const work = await mkdtemp(join(tmpdir(), 'motionflux-cli-stage-'));
  try {
    const projectDir = join(work, 'demo');
    const initOut = JSON.parse(
      execFileSync(process.execPath, [cli, 'init', projectDir, '--width', '1280', '--height', '720', '--duration', '90'], {
        encoding: 'utf8',
      }),
    );
    assert.equal(initOut.ok, true);
    assert.equal(initOut.result.width, 1280);
    assert.equal(initOut.result.durationFrames, 90);
    assert.ok((await stat(join(projectDir, 'index.html'))).isFile());
    assert.ok((await stat(join(projectDir, 'runtime.mjs'))).isFile());
    const html = await readFile(join(projectDir, 'index.html'), 'utf8');
    assert.match(html, /createStage/);
    assert.match(html, /data-mf-scene="intro"/);

    // Refuses to overwrite existing directory
    assert.throws(() =>
      execFileSync(process.execPath, [cli, 'init', projectDir], { encoding: 'utf8', stdio: 'pipe' }),
    );

    const audioSpec = join(work, 'cues.json');
    const wavOut = join(work, 'track.wav');
    await writeFile(audioSpec, JSON.stringify({ durationSec: 1.5, fps: 30, cues: [{ atFrame: 0, sfx: 'whoosh' }, { atFrame: 15, sfx: 'pop' }] }));
    const sfxRes = JSON.parse(
      execFileSync(process.execPath, [cli, 'sfx', audioSpec, '--out', wavOut], { encoding: 'utf8' }),
    );
    assert.equal(sfxRes.ok, true);
    assert.equal(sfxRes.result.proceduralCount, 2);
    assert.ok((await stat(wavOut)).size > 44);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});
