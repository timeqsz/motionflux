import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const loadCapture = async () => {
  const { outputFiles } = await build({
    entryPoints: ['packages/cli/src/capture.ts'],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node22',
    write: false,
  });
  return import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].contents).toString('base64')}`);
};

test('atoms/studio.mjs ships as a zero-import standalone module with documentation and deterministic textures', async () => {
  const source = await readFile('atoms/studio.mjs', 'utf8');
  assert.doesNotMatch(source, /^\s*import\s|\brequire\(/mu, 'atoms/studio.mjs must stand alone with no external imports');

  const doc = await readFile('atoms/studio.md', 'utf8');
  for (const symbol of ['createStudioRig', 'createStudioMaterials', 'projectedBounds', 'drawSmokedGlass', 'mountHost', '--quality cinema']) {
    assert.ok(doc.includes(symbol), `atoms/studio.md documents ${symbol}`);
  }

  const studio = await import(new URL('../atoms/studio.mjs', import.meta.url).href);
  assert.equal(typeof studio.THREE.Scene, 'function');
  assert.equal(typeof studio.RoundedBoxGeometry, 'function');
  assert.equal(studio.createPhysicalStudio, studio.createStudioRig);

  const a1 = studio.createBrushedMetalData(77, 32);
  const a2 = studio.createBrushedMetalData(77, 32);
  const b1 = studio.createBrushedMetalData(78, 32);
  assert.deepEqual(a1, a2, 'Brushed metal map must be 100% deterministic for the same seed');
  assert.notDeepEqual(a1, b1, 'Different seeds must produce distinct brushed patterns');

  const c1 = studio.createBeadBlastedData(202, 32);
  const c2 = studio.createBeadBlastedData(202, 32);
  assert.deepEqual(c1, c2, 'Bead-blasted map must be 100% deterministic for the same seed');

  const materials = studio.createStudioMaterials({ seed: 101, textureSize: 64, accentColor: 0xd9381e });
  assert.ok(
    materials.obsidian &&
      materials.titanium &&
      materials.brushedSteel &&
      materials.roseGold &&
      materials.brass &&
      materials.bluedSteel &&
      materials.rubyJewel &&
      materials.arGlass &&
      materials.chrome &&
      materials.opticalGlass &&
      materials.vermilionLacquer,
  );
  assert.equal(materials.titanium.clearcoat, 0, 'Bare brushed titanium must not use plastic clearcoat varnish');
  assert.ok(materials.titanium.anisotropy > 0.5, 'Brushed titanium uses physical anisotropy');
  assert.ok(materials.titanium.normalMap, 'Brushed titanium includes tangent-space Sobel normalMap');
  materials.dispose();

  const gear = studio.createInvoluteGearGeometry({ teeth: 48, pitchRadius: 0.48, spokes: 5, thickness: 0.04 });
  assert.ok(gear.attributes.position.count > 300, 'Involute spoked gear produces rich bevelled geometry');
  gear.dispose();

  const esc = studio.createEscapeWheelGeometry({ teeth: 15, outerRadius: 0.25 });
  assert.ok(esc.attributes.position.count > 100, 'Escape wheel produces club-tooth geometry');
  esc.dispose();

  const spring = studio.createSpiralSpringGeometry({ turns: 5.5, innerRadius: 0.04, outerRadius: 0.14 });
  assert.ok(spring.attributes.position.count > 400 && spring.attributes.normal, 'Spiral hairspring produces ribbon geometry with normals');
  spring.dispose();

  const knurl = studio.createKnurledCylinderGeometry({ radius: 0.2, height: 0.24, grooves: 64 });
  assert.ok(knurl.attributes.position.count > 200, 'Knurled cylinder produces micro-fluted geometry');
  knurl.dispose();

  const blade = studio.createIrisBladeGeometry({ innerRadius: 0.12, outerRadius: 0.36 });
  assert.ok(blade.attributes.position.count > 60, 'Iris blade produces crescent aperture leaf');
  blade.dispose();

  const lens = studio.createOpticalLensGeometry({ radius: 0.42, edgeThickness: 0.08, frontSag: 0.09, backSag: -0.03 });
  assert.ok(lens.attributes.position.count > 200, 'Optical lens produces spherical meniscus lathe geometry');
  lens.dispose();
});

test('projectedBounds projects bevelled 3D meshes into canvas pixels and culls hidden or behind-camera objects', async () => {
  const { THREE, RoundedBoxGeometry, projectedBounds, unionBoxes, intersectBox } = await import(
    new URL('../atoms/studio.mjs', import.meta.url).href
  );

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1920 / 1080, 0.1, 100);
  camera.position.set(0, 0, 5);
  camera.lookAt(0, 0, 0);

  const geo = new RoundedBoxGeometry(1, 1, 1, 3, 0.1);
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial());
  scene.add(mesh);
  scene.updateMatrixWorld(true);
  camera.updateMatrixWorld(true);

  const box = projectedBounds(mesh, camera, 1920, 1080);
  assert.ok(box && box[2] > 200 && box[3] > 200, 'Centered mesh projects to a non-empty central box');
  assert.ok(Math.abs(box[0] + box[2] / 2 - 960) < 1, 'Horizontally centered at 960 px');
  assert.ok(Math.abs(box[1] + box[3] / 2 - 540) < 1, 'Vertically centered at 540 px');

  mesh.visible = false;
  assert.equal(projectedBounds(mesh, camera, 1920, 1080), null, 'Hidden meshes report null bounds');

  mesh.visible = true;
  mesh.position.set(0, 0, 9);
  scene.updateMatrixWorld(true);
  assert.equal(projectedBounds(mesh, camera, 1920, 1080), null, 'Meshes behind the camera report null bounds');

  assert.deepEqual(intersectBox([0, 0, 100, 100], [50, 40, 100, 100]), [50, 40, 50, 60]);
  assert.equal(intersectBox([0, 0, 20, 20], [50, 50, 20, 20]), null);
  assert.deepEqual(unionBoxes(null, [10, 20, 30, 40], [0, 30, 25, 50]), [0, 20, 40, 60]);

  geo.dispose();
  mesh.material.dispose();
});

test('cinema encoding preset configures CRF 15 slow H.264 / CRF 16 VP9 and validates CLI flags early', async () => {
  const { gpuLaunchFlags, videoEncoderArgs } = await loadCapture();

  const flags = gpuLaunchFlags();
  assert.ok(flags.includes('--enable-webgl') && flags.includes('--enable-unsafe-webgpu'));
  if (process.platform === 'darwin') assert.ok(flags.includes('--use-angle=metal'));

  assert.deepEqual(videoEncoderArgs('mp4', false), ['-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart']);
  assert.deepEqual(videoEncoderArgs('mp4', false, { quality: 'cinema' }), [
    '-c:v',
    'libx264',
    '-preset',
    'slow',
    '-crf',
    '15',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
  ]);
  assert.deepEqual(videoEncoderArgs('mp4', false, { quality: 'cinema', crf: 12 }), [
    '-c:v',
    'libx264',
    '-preset',
    'slow',
    '-crf',
    '12',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
  ]);
  assert.deepEqual(videoEncoderArgs('webm', true, { quality: 'cinema' }), [
    '-c:v',
    'libvpx-vp9',
    '-pix_fmt',
    'yuva420p',
    '-b:v',
    '0',
    '-crf',
    '16',
  ]);
  assert.deepEqual(videoEncoderArgs('mov', false, { quality: 'cinema' }), [
    '-c:v',
    'prores_ks',
    '-profile:v',
    '4444',
    '-pix_fmt',
    'yuv444p10le',
  ]);

  assert.throws(() => videoEncoderArgs('mp4', false, { quality: 'ultra' }), /--quality must be standard or cinema/);
  assert.throws(() => videoEncoderArgs('mp4', false, { crf: 60 }), /--crf must be a whole number from 0 to 51/);
  assert.throws(() => videoEncoderArgs('mp4', false, { crf: 14.5 }), /--crf must be a whole number from 0 to 51/);
  assert.throws(() => videoEncoderArgs('mov', false, { crf: 15 }), /--crf applies to \.mp4 and \.webm/);

  // CLI rejects invalid --quality / --crf on both Stage HTML and MotionSpec projects before launching any browser.
  const temp = await mkdtemp(join(tmpdir(), 'motionflux-quality-cli-'));
  try {
    const stageHtml = join(temp, 'stage.html');
    await writeFile(stageHtml, '<!doctype html><div data-mf-stage></div>');
    const runFail = (...args) => {
      try {
        execFileSync(process.execPath, ['scripts/motion.mjs', ...args], { encoding: 'utf8' });
        assert.fail('Expected command to fail');
      } catch (err) {
        return JSON.parse(err.stdout);
      }
    };
    const badQuality = runFail('render', stageHtml, '--out', join(temp, 'out.mp4'), '--quality', 'draft');
    assert.equal(badQuality.ok, false);
    assert.match(badQuality.error.message, /--quality must be standard or cinema/);

    const badMovCrf = runFail('render', 'assets/examples/prop.move.scene.json', '--out', join(temp, 'out.mov'), '--crf', '15');
    assert.equal(badMovCrf.ok, false);
    assert.match(badMovCrf.error.message, /--crf applies to \.mp4 and \.webm/);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});
