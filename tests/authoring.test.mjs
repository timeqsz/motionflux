import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFile, writeFile, mkdtemp, rm, access } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { composePattern, inspectControls, compileScene, validateScene, readBrief } from '../packages/core/dist/index.js';

const directory = 'tests/fixtures/products';
const load = async name => JSON.parse(await readFile(`${directory}/${name}.brief.json`, 'utf8'));
const product = brief => ({ type: 'image', src: 'assets/product.png', sha256: brief.product.sha256 });
const cli = (...args) => JSON.parse(execFileSync(process.execPath, ['scripts/motion.mjs', ...args], { encoding: 'utf8' })).result;
const failure = (...args) => {
  const result = spawnSync(process.execPath, ['scripts/motion.mjs', ...args], { encoding: 'utf8' });
  assert.equal(result.status, 1); return JSON.parse(result.stdout).error;
};

test('pattern retrieval returns relevant purposes and no unrelated fallback', () => {
  assert.equal(cli('patterns', '产品', '标题').patterns[0].id, 'title-yields-to-product');
  assert.equal(cli('patterns', 'PRODUCT').patterns.length, 1);
  assert.deepEqual(cli('patterns', 'skeletal-animation').patterns, []);
});

test('the same pattern adapts subject, language, layout and brand while preserving semantic identity', async () => {
  const a = await load('speaker-landscape'); const b = await load('lamp-portrait');
  const original = structuredClone(a);
  const one = composePattern(a, product(a)); const two = composePattern(b, product(b));
  assert.deepEqual(a, original);
  for (const output of [one, two]) {
    assert.deepEqual(validateScene(output.scene), []);
    assert.equal(inspectControls(output.authoring, output.scene).bindingsVerified, true);
    const engine = compileScene(output.scene); const frame = output.scene.durationFrames - 1;
    const state = engine.evaluate(frame); engine.evaluate(0); engine.evaluate(72.5);
    assert.deepEqual(engine.evaluate(frame), state);
    const detail = state.nodes.find(node => node.id === 'detail-group');
    assert.equal(detail.opacity, 1);
  }
  assert.deepEqual(one.scene.nodes.map(n => n.id), two.scene.nodes.map(n => n.id));
  assert.notDeepEqual(one.scene.nodes.find(n => n.id === 'product').position, two.scene.nodes.find(n => n.id === 'product').position);
  assert.equal(two.scene.canvas.background, b.brand.palette.background);
  assert.equal(two.scene.nodes.find(n => n.id === 'headline').text, b.copy.headline);
  assert.notEqual(one.scene.assets['product-image'].sha256, two.scene.assets['product-image'].sha256);
});

test('reading, handoff and ending intervals survive different frame rates; too-short input fails', async () => {
  const brief = await load('lamp-portrait');
  for (const fps of [24, 30, 60]) {
    brief.fps = fps;
    const { scene } = composePattern(brief, product(brief));
    const keys = id => scene.animations.find(a => a.id === id).keyframes;
    const title = keys('headline-y'); const handoff = keys('product-y'); const detail = keys('detail-group-opacity');
    assert.ok(title[2].frame - title[1].frame >= Math.floor(brief.brand.motion.minReadSeconds * fps));
    assert.ok(detail[1].frame > handoff.at(-1).frame);
    assert.ok(scene.durationFrames - 1 - keys('closing-opacity').at(-1).frame >= Math.floor(brief.brand.motion.endHoldSeconds * fps));
  }
  brief.durationSeconds = 4;
  assert.throws(() => composePattern(brief, product(brief)), /READING_TIME/);
  const longClosing = await load('speaker-landscape');
  longClosing.copy.closing = '留出时间让观众读完最后一段信息。'.repeat(5);
  assert.throws(() => composePattern(longClosing, product(longClosing)), /READING_TIME/);
});

test('invalid brand and unsupported inputs do not silently become a different design', async () => {
  const brief = await load('speaker-landscape');
  for (const alter of [b => b.brand.motion.readUnitsPerSecond = 0, b => b.brand.palette.ink = 'red',
    b => b.copy.headline = 'a\n\nb', b => b.pattern = 'unknown', b => b.brand.motion.overshoot = .2,
    b => b.canvas.height = 1920, b => b.product.src = 'movie.mp4']) {
    const changed = structuredClone(brief); alter(changed);
    if (changed.canvas.height === 1920) changed.canvas.width = 320;
    assert.throws(() => readBrief(changed));
  }
});

test('parameter bindings resolve saved values, identify animated properties and reject stale targets', async () => {
  const brief = await load('speaker-landscape'); const { scene, authoring } = composePattern(brief, product(brief));
  scene.nodes.find(n => n.id === 'headline').text = 'Changed by the user';
  scene.canvas.background = '#ffffff';
  const values = inspectControls(authoring, scene).controls;
  assert.equal(values.find(c => c.id === 'headline-copy').value, 'Changed by the user');
  assert.equal(values.find(c => c.id === 'background').value, '#ffffff');
  assert.equal(authoring.brand.palette.background, brief.brand.palette.background);
  const extra = { id: 'position', label: 'Position', collection: 'nodes', target: 'product', field: 'position', kind: 'vector', unit: 'px', note: 'Inspect actual drivers.' };
  const record = { ...authoring, controls: [...authoring.controls, extra] };
  assert.deepEqual(inspectControls(record, scene).controls.at(-1).animatedBy, ['product-y']);
  assert.throws(() => inspectControls({ ...record, controls: [extra, extra] }, scene), /CONTROL_DUPLICATE/);
  extra.target = 'missing'; assert.throws(() => inspectControls(record, scene), /CONTROL_TARGET/);
});

test('composition and revision deliver portable assets plus controls without resetting saved edits', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'motionflux-authoring-'));
  try {
    const first = cli('compose', `${directory}/speaker-landscape.brief.json`, '--out', join(temp, 'v1'));
    const saved = JSON.parse(await readFile(first.scene, 'utf8'));
    saved.nodes.find(n => n.id === 'headline').text = 'Your own title';
    saved.canvas.background = '#ffffff';
    const revised = join(first.directory, 'revised.json'); await writeFile(revised, JSON.stringify(saved));
    const next = cli('deliver', revised, '--authoring', first.authoring, '--previous', first.scene, '--out', join(temp, 'v2'));
    const report = JSON.parse(await readFile(next.report, 'utf8'));
    assert.equal(report.revision.changes.length, 2);
    assert.equal(report.checks.visualReview, 'not-performed');
    const current = cli('controls', next.authoring, '--scene', next.scene);
    assert.equal(current.controls.find(c => c.id === 'background').value, '#ffffff');
    assert.equal(current.controls.find(c => c.id === 'headline-copy').value, 'Your own title');
    await rm(first.directory, { recursive: true });
    assert.equal(cli('validate', next.scene).valid, true);
    assert.equal(failure('compose', `${directory}/speaker-landscape.brief.json`, '--out', next.directory).code, 'OUTPUT_EXISTS');
    assert.equal(JSON.parse(await readFile(next.scene, 'utf8')).canvas.background, '#ffffff');
    const brief = await load('speaker-landscape');
    brief.product.src = join(process.cwd(), directory, brief.product.src); brief.product.sha256 = '0'.repeat(64);
    const bad = join(temp, 'bad.json'); await writeFile(bad, JSON.stringify(brief));
    assert.equal(failure('compose', bad, '--out', join(temp, 'bad-output')).code, 'ASSET_HASH');
    await assert.rejects(access(join(temp, 'bad-output')));
  } finally { await rm(temp, { recursive: true, force: true }); }
});
