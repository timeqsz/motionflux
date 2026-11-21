import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const cli = join(root, 'scripts/motion.mjs');
const stagePkg = await import(pathToFileURL(join(root, 'packages/stage/dist/index.js')).href);

test('local stage server serves project files, /__motionflux/ mounts, byte ranges, and blocks traversal', async () => {
  const work = await mkdtemp(join(tmpdir(), 'motionflux-server-'));
  try {
    await writeFile(join(work, 'index.html'), '<h1>Stage OK</h1>');
    await writeFile(join(work, 'data.bin'), Buffer.from('0123456789abcdef'));
    const server = await stagePkg.startStageServer(work, { motionfluxRoot: root });
    try {
      const home = await fetch(`${server.url}/index.html`);
      assert.equal(home.status, 200);
      assert.match(await home.text(), /Stage OK/);

      const rt = await fetch(`${server.url}/__motionflux/stage/runtime.mjs`);
      assert.equal(rt.status, 200);
      assert.match(rt.headers.get('content-type') ?? '', /javascript/);
      assert.match(await rt.text(), /createStage/);

      const atom = await fetch(`${server.url}/__motionflux/atoms/prop.move.mjs`);
      assert.equal(atom.status, 200);

      const studio = await fetch(`${server.url}/__motionflux/atoms/studio.mjs`);
      assert.equal(studio.status, 200);

      const ranged = await fetch(`${server.url}/data.bin`, { headers: { range: 'bytes=4-9' } });
      assert.equal(ranged.status, 206);
      assert.equal(await ranged.text(), '456789');

      const forbidden = await fetch(`${server.url}/__motionflux/package.json`);
      assert.equal(forbidden.status, 403);
    } finally {
      await server.close();
    }
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

test('HTML stage init passes DOM audit and produces contact sheet + deterministic frames in real Chrome', async () => {
  const work = await mkdtemp(join(tmpdir(), 'motionflux-browser-stage-'));
  try {
    const projectDir = join(work, 'clean');
    execFileSync(process.execPath, [cli, 'init', projectDir, '--width', '960', '--height', '540', '--duration', '60'], {
      encoding: 'utf8',
    });

    const contactPath = join(work, 'contact.png');
    const auditOut = JSON.parse(
      execFileSync(
        process.execPath,
        [cli, 'audit', join(projectDir, 'index.html'), '--contact', contactPath],
        { encoding: 'utf8' },
      ),
    );
    assert.equal(auditOut.ok, true);
    assert.equal(auditOut.result.passed, true, `unexpected errors: ${JSON.stringify(auditOut.result.issues)}`);
    assert.equal(auditOut.result.summary.errors, 0);
    assert.ok(auditOut.result.summary.auditedFrames >= 4);
    const sheet = await readFile(contactPath);
    assert.equal(sheet.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'contact sheet must be valid PNG');

    // Out-of-order frame capture proves determinism: frame 20 captured twice has identical PNG bytes
    const framesDir = join(work, 'frames');
    const frameA = join(framesDir, 'a');
    const frameB = join(framesDir, 'b');
    await stagePkg.captureStageFrames(join(projectDir, 'index.html'), {
      outDir: frameA,
      frames: [0, 20, 45],
      motionfluxRoot: root,
    });
    await stagePkg.captureStageFrames(join(projectDir, 'index.html'), {
      outDir: frameB,
      frames: [45, 20, 0],
      motionfluxRoot: root,
    });
    const f0 = await readFile(join(frameA, 'frame-000000.png'));
    const f20a = await readFile(join(frameA, 'frame-000020.png'));
    const f20b = await readFile(join(frameB, 'frame-000020.png'));
    const f45 = await readFile(join(frameA, 'frame-000045.png'));
    assert.ok(f20a.equals(f20b), 'repeated out-of-order seek to frame 20 must produce byte-identical PNG');
    assert.ok(!f0.equals(f45), 'frame 0 and frame 45 must differ across scenes');
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

test('DOM auditor detects clipping, overlap, text overflow, broken image, and CSS/WAAPI deterministic seeking', async () => {
  const work = await mkdtemp(join(tmpdir(), 'motionflux-browser-audit-bugs-'));
  try {
    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; }
    #stage { background: #10141c; color: #fff; font-family: sans-serif; }
    @keyframes slideX {
      from { transform: translateX(0px); }
      to { transform: translateX(200px); }
    }
    .mover {
      position: absolute;
      left: 80px;
      top: 60px;
      font-size: 28px;
      animation: slideX 1s linear both;
    }
    .clipped {
      position: absolute;
      left: 560px;
      top: 120px;
      width: 200px;
      font-size: 26px;
    }
    .overflow-box {
      position: absolute;
      left: 80px;
      top: 160px;
      width: 80px;
      height: 24px;
      overflow: hidden;
      white-space: nowrap;
      font-size: 22px;
    }
    .overlap-a, .overlap-b {
      position: absolute;
      left: 120px;
      top: 240px;
      font-size: 28px;
    }
    .overlap-b {
      left: 130px;
      top: 244px;
    }
    img.broken {
      position: absolute;
      left: 400px;
      top: 240px;
      width: 60px;
      height: 60px;
    }
  </style>
</head>
<body>
  <div id="stage" data-mf-stage>
    <div class="mover" data-mf-id="mover">CSS Animated Title</div>
    <div class="clipped" data-mf-id="clipped">Outside Stage Bounds</div>
    <div class="overflow-box" data-mf-id="overflow">This text definitely overflows its small clipped container</div>
    <div class="overlap-a" data-mf-id="overlap-a">Collision Alpha</div>
    <div class="overlap-b" data-mf-id="overlap-b">Collision Beta</div>
    <img class="broken" src="./does-not-exist.png" alt="broken" />
  </div>
  <script type="module">
    import { createStage } from '/__motionflux/stage/runtime.mjs';
    createStage({ width: 640, height: 360, fps: 30, durationFrames: 30 });
  </script>
</body>
</html>`;
    const entry = join(work, 'bugs.html');
    await writeFile(entry, html);

    const report = await stagePkg.auditStage(entry, {
      frames: [0, 15],
      motionfluxRoot: root,
    });
    assert.equal(report.passed, false);
    const codes = new Set(report.issues.map((i) => i.code));
    assert.ok(codes.has('CLIPPED_OUTSIDE_STAGE'), `expected CLIPPED_OUTSIDE_STAGE, got ${[...codes]}`);
    assert.ok(codes.has('TEXT_OVERFLOW'), `expected TEXT_OVERFLOW, got ${[...codes]}`);
    assert.ok(codes.has('ELEMENT_OVERLAP'), `expected ELEMENT_OVERLAP, got ${[...codes]}`);
    assert.ok(codes.has('BROKEN_IMAGE'), `expected BROKEN_IMAGE, got ${[...codes]}`);

    // Verify CSS @keyframes moved .mover cleanly between frame 0 and frame 15
    const f0Dir = join(work, 'css-frames');
    await stagePkg.captureStageFrames(entry, {
      outDir: f0Dir,
      frames: [0, 15],
      motionfluxRoot: root,
      transparent: true,
    });
    const p0 = await readFile(join(f0Dir, 'frame-000000.png'));
    const p15 = await readFile(join(f0Dir, 'frame-000015.png'));
    assert.ok(!p0.equals(p15), 'CSS @keyframes animation must advance deterministically between frame 0 and frame 15');
    assert.ok((await stat(join(f0Dir, 'frame-000015.png'))).size > 100);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

test('Stage + /__motionflux/atoms/studio.mjs renders 3D PBR CAD scene with HTML overlay, passes audit, and encodes cinema MP4', async () => {
  const work = await mkdtemp(join(tmpdir(), 'motionflux-browser-studio3d-'));
  try {
    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; margin: 0; }
    #stage { background: #07090d; color: #f4f6fb; font-family: system-ui, sans-serif; }
    #studio { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
    .hud { position: absolute; left: 48px; top: 44px; z-index: 2; }
    .hud h1 { font-size: 30px; letter-spacing: 0.08em; }
  </style>
</head>
<body>
  <div id="stage" data-mf-stage>
    <canvas id="studio" width="640" height="360" data-mf-allow-bleed></canvas>
    <div class="hud"><h1 data-mf-id="hud-title">CALIBRE 01</h1></div>
  </div>
  <script type="module">
    import { createStage } from '/__motionflux/stage/runtime.mjs';
    import { THREE, createStudioRig, createStudioBackdrop, createInvoluteGearGeometry } from '/__motionflux/atoms/studio.mjs';

    const canvas = document.getElementById('studio');
    const studio = createStudioRig({ canvas, width: 640, height: 360, shadowBounds: 2.5, seed: 7 });
    studio.scene.add(createStudioBackdrop({ y: -0.6, radius: 7 }).mesh);
    const gear = new THREE.Mesh(
      createInvoluteGearGeometry({ teeth: 48, pitchRadius: 0.55, spokes: 5, thickness: 0.05 }),
      studio.materials.roseGold,
    );
    studio.scene.add(gear);
    await studio.renderer.compileAsync(studio.scene, studio.camera);

    createStage({
      width: 640,
      height: 360,
      fps: 30,
      durationFrames: 12,
      scenes: [{ id: 'main', startFrame: 0, endFrame: 12 }],
      audio: [{ atFrame: 0, sfx: 'tick', gain: 0.4 }],
      onFrame({ frame }) {
        gear.rotation.y = frame * 0.06;
        studio.camera.position.set(0, 1.1, 2.1);
        studio.camera.lookAt(0, 0, 0);
        studio.render({ frame });
      },
    });
  </script>
</body>
</html>`;
    const entry = join(work, 'index.html');
    await writeFile(entry, html);

    const outMp4 = join(work, 'studio.mp4');
    const renderOut = JSON.parse(
      execFileSync(
        process.execPath,
        [cli, 'render', entry, '--out', outMp4, '--quality', 'cinema', '--audit'],
        { encoding: 'utf8' },
      ),
    );
    assert.equal(renderOut.ok, true);
    assert.equal(renderOut.result.quality, 'cinema');
    assert.equal(renderOut.result.verified, true);
    assert.equal(renderOut.result.audit.passed, true, `audit issues: ${JSON.stringify(renderOut.result.audit)}`);
    assert.ok(renderOut.result.bytes > 1000);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});
