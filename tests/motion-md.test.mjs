import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const cli = join(root, 'scripts/motion.mjs');

test('stage runtime transition, cameraRig2D, beatPulse, and WCAG contrast helpers are pure and deterministic', async () => {
  const rt = await import(pathToFileURL(join(root, 'stage/runtime.mjs')).href);

  const scenes = [
    { id: 'intro', startFrame: 0, endFrame: 60 },
    { id: 'body', startFrame: 60, endFrame: 120, transitionIn: { kind: 'wipe-left', durationFrames: 15 } },
  ];

  // Frame 50: intro active, body inactive
  assert.equal(rt.evaluateSceneActivity(scenes, 0, 50).phase, 'active');
  assert.equal(rt.evaluateSceneActivity(scenes, 1, 50).phase, 'inactive');

  // Frame 65 (mid-transition): intro exiting at localProgress 1, body entering at progress 5/15
  const s0Mid = rt.evaluateSceneActivity(scenes, 0, 65);
  const s1Mid = rt.evaluateSceneActivity(scenes, 1, 65);
  assert.equal(s0Mid.active, true);
  assert.equal(s0Mid.phase, 'exiting');
  assert.equal(s0Mid.localProgress, 1);
  assert.ok(Math.abs(s0Mid.transitionOutProgress - 5 / 15) < 1e-6);
  assert.equal(s1Mid.active, true);
  assert.equal(s1Mid.phase, 'entering');
  assert.ok(Math.abs(s1Mid.transitionInProgress - 5 / 15) < 1e-6);

  // Frame 80 (post-transition): intro inactive, body active
  assert.equal(rt.evaluateSceneActivity(scenes, 0, 80).active, false);
  assert.equal(rt.evaluateSceneActivity(scenes, 1, 80).phase, 'active');

  const wipeStyle = rt.computeTransitionStyles('wipe-left', 0.5, 'entering');
  assert.match(wipeStyle.clipPath, /^inset\(0 50\.00% 0 0\)$/);

  assert.equal(rt.wcagContrastRatio([255, 255, 255], [0, 0, 0]), 21);
  assert.equal(rt.wcagContrastRatio([20, 24, 32], [16, 20, 28]) < 1.3, true);
  assert.deepEqual(rt.parseCssColor('#38bdf8'), [56, 189, 248, 1]);
  assert.match(rt.cameraRig2D({ panX: 12, zoom: 1.05 }), /translate3d\(12\.00px, 0\.00px, 0\) scale\(1\.0500\)/);
  assert.equal(rt.beatPulse(10, 20), 0);
  assert.equal(rt.beatPulse(20, 20), 1);
});

test('Motion.md parser, validator, copy-density check, templates, plan, and compile work end-to-end', async () => {
  const stagePkg = await import(pathToFileURL(join(root, 'packages/stage/dist/index.js')).href);

  const md = `---
title: Calibre Showcase
width: 1920
height: 1080
fps: 60
accent: #38bdf8
theme: obsidian
quality: cinema
---

## Scene hero: Precision Calibre
- duration: 2.0s
- layout: studio-3d
- rig: watch
- camera: orbit(-24deg -> 18deg, elevation: 20deg, distance: 2.3)
- sfx: sub-hit@0f, tick@30f(gain=0.4,pitch=1.2)
- headline: Engineered Motion
- subhead: Involute gear train and sapphire optics.

## Scene stats: Benchmarks
- duration: 1.5s
- layout: metrics
- transition: wipe-left 18f
- sfx: whoosh@0f, chime@20f
- headline: Verified Output
- metrics: 28,800 vph | Beat Lock, CRF 15 | Cinema
`;

  const doc = stagePkg.parseMotionMd(md);
  assert.equal(doc.specVersion, 'motion-md-1');
  assert.equal(doc.durationFrames, 210);
  assert.equal(doc.usesStudio3D, true);
  assert.equal(doc.scenes.length, 2);
  assert.deepEqual([doc.scenes[0].startFrame, doc.scenes[0].endFrame], [0, 120]);
  assert.deepEqual([doc.scenes[1].startFrame, doc.scenes[1].endFrame], [120, 210]);
  assert.deepEqual(doc.scenes[1].transitionIn, { kind: 'wipe-left', durationFrames: 18 });
  assert.deepEqual(doc.scenes[1].metrics, [
    { value: '28,800 vph', label: 'Beat Lock' },
    { value: 'CRF 15', label: 'Cinema' },
  ]);
  assert.equal(doc.audio.length, 4);
  assert.equal(doc.audio[2].atFrame, 120);
  assert.equal(doc.audio[3].atFrame, 140);

  // Copy pacing warning triggers when cramming excessive text into a tiny scene
  const denseDoc = stagePkg.parseMotionMd(`---
fps: 30
---
## Scene cramped: Cramped Copy
- duration: 0.5s
- headline: This single half-second shot tries to cram way too many technical sentences for any human viewer to read comfortably in time
`);
  assert.ok(denseDoc.diagnostics.some((d) => d.code === 'COPY_TOO_DENSE'));

  // Validation rejects unknown SFX or overlong transitions
  assert.throws(
    () =>
      stagePkg.parseMotionMd(`## Scene a: Intro\n- duration: 1s\n- sfx: laser-beam@0f\n`),
    /UNKNOWN_SFX|laser-beam/,
  );
  assert.throws(
    () =>
      stagePkg.parseMotionMd(`## Scene a: One\n- duration: 1s\n## Scene b: Two\n- duration: 1s\n- transition: wipe-left 2s\n`),
    /shorter than scene duration/,
  );

  // CLI templates, init --template, plan, and compile
  const tplList = JSON.parse(execFileSync(process.execPath, [cli, 'templates'], { encoding: 'utf8' }));
  assert.equal(tplList.ok, true);
  assert.deepEqual(
    tplList.result.templates.map((t) => t.id),
    ['default', 'saas-launch', 'hardware-3d', 'data-story'],
  );

  const work = await mkdtemp(join(tmpdir(), 'motionflux-md-cli-'));
  try {
    for (const tpl of ['saas-launch', 'hardware-3d', 'data-story']) {
      const dir = join(work, tpl);
      const initOut = JSON.parse(execFileSync(process.execPath, [cli, 'init', dir, '--template', tpl], { encoding: 'utf8' }));
      assert.equal(initOut.ok, true);
      assert.equal(initOut.result.template, tpl);
      assert.ok((await stat(join(dir, 'index.html'))).isFile());
      assert.ok((await stat(join(dir, 'Motion.md'))).isFile());
    }

    const mdFile = join(work, 'custom.Motion.md');
    await writeFile(mdFile, md);
    const planFile = join(work, 'plan.json');
    const planOut = JSON.parse(execFileSync(process.execPath, [cli, 'plan', mdFile, '--out', planFile], { encoding: 'utf8' }));
    assert.equal(planOut.ok, true);
    assert.equal(planOut.result.durationFrames, 210);
    assert.ok((await stat(planFile)).isFile());

    const compiledDir = join(work, 'compiled');
    const compOut = JSON.parse(execFileSync(process.execPath, [cli, 'compile', mdFile, '--out', compiledDir], { encoding: 'utf8' }));
    assert.equal(compOut.ok, true);
    const html = await readFile(compOut.result.entry, 'utf8');
    assert.match(html, /createStudioRig/);
    assert.match(html, /wipe-left/);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});
