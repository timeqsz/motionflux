import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { compileScene, validateScene, validateStudy, sampleTrack, studyReport, nodeMatrix, multiply, loopTiming, loopFrame } from '../packages/core/dist/index.js';
import { createExampleScene } from '../dist/lib/examples.mjs';
import { getCapability } from '../packages/catalog/dist/index.js';

const base = () => ({ specVersion: '0.2', seed: 1, canvas: { width: 200, height: 100, background: '#000000' },
  fps: { numerator: 30, denominator: 1 }, durationFrames: 60, assets: {}, clips: [],
  nodes: [{ id: 'group', type: 'group', position: [50,20], color: '#ffffff' },
    { id: 'label', type: 'text', parent: 'group', position: [2,3], color: '#ffffff', font: 'system', text: 'Flux', fontSize: 20, lineHeight: 25 }] });
const animation = (property, keys, target = 'group') => ({ id: property.replace('.', '-'), target, property, keyframes: keys.map(([frame,value,easing]) => ({ frame, value, ...(easing ? { easing } : {}) })) });
const hash = data => createHash('sha256').update(JSON.stringify(data)).digest('hex');
const cli = (...args) => JSON.parse(execFileSync(process.execPath, ['scripts/motion.mjs', ...args], { encoding: 'utf8' })).result;

test('0.4.1 baseline: all 53 existing atoms retain numeric scene outputs at five boundary/subframes', async () => {
  const golden = JSON.parse(await readFile('tests/fixtures/v0.4.1-frames.json', 'utf8'));
  for (const [id, samples] of Object.entries(golden)) {
    const scene = compileScene(createExampleScene(id));
    for (const [frame, expected] of samples) assert.equal(hash(scene.evaluate(frame)), expected, `${id} at ${frame}`);
  }
});
test('keyframes use absolute frames, outgoing hold, colour interpolation and solved Bézier x', () => {
  const track = animation('opacity', [[10,0,'hold'],[20,1],[40,0]]);
  assert.equal(sampleTrack(track,-10),0); assert.equal(sampleTrack(track,19.999),0); assert.equal(sampleTrack(track,20),1);
  assert.equal(sampleTrack(track,30.5),0.475); assert.equal(sampleTrack(track,100),0);
  assert.equal(sampleTrack(animation('color', [[0,'#000000'],[10,'#ffffff']]),5),'#bcbcbc', 'interpolate in linear light, then encode sRGB');
  const cubic = sampleTrack(animation('opacity', [[0,0,[0.42,0,1,1]],[10,1]]),5);
  assert.ok(cubic > .31 && cubic < .32, String(cubic));
});
test('a single keyframe on the end boundary still has a finite preview loop', () => {
  const scene=base(); scene.animations=[animation('opacity',[[60,1]])];
  assert.deepEqual(validateScene(scene),[]); const timing=loopTiming(scene);
  for(const time of [0,1,10,100.5]) assert.ok(Number.isFinite(loopFrame(timing,time)));
});
test('nested transforms preserve pivots, nonuniform scale and explicit group cell offsets', () => {
  const scene = base(); scene.nodes[0].rotation = 90; scene.nodes[0].stretch = [2,1]; scene.nodes[0].pivot = [10,0];
  scene.nodes[0].layout = { type: 'grid', cell: [30,20], gap: [5,10], columns: 1 };
  scene.nodes.push({ ...scene.nodes[1], id: 'second' });
  const group = compileScene(scene).evaluate(0).nodes[0];
  assert.deepEqual(group.children[1].position, [2,33]);
  const matrix = multiply(nodeMatrix(group), nodeMatrix(group.children[0]));
  assert.ok(Math.abs(matrix[4]-47) < 1e-8); assert.ok(Math.abs(matrix[5]-4) < 1e-8);
});
test('saved parameters are immutable and repeated/unsorted/subframe evaluation agrees', () => {
  const scene = base(); scene.animations = [animation('position.x',[[0,0],[60,100]])];
  const before = structuredClone(scene); const compiled = compileScene(scene);
  const middle = compiled.evaluate(24.5); compiled.evaluate(59); compiled.evaluate(-5);
  assert.deepEqual(compiled.evaluate(24.5), middle); assert.deepEqual(scene, before);
  scene.nodes[0].position[0] = 999; assert.deepEqual(compiled.evaluate(24.5), middle);
  assert.throws(() => compiled.evaluate(NaN), /finite/);
});
test('keyframed movement is seen by delayed copies and history-based trails', () => {
  const scene = base(); scene.nodes = [{id:'subject',type:'path',position:[0,50],color:'#ffffff',points:[[0,0],[10,0]],strokeWidth:1}];
  const clip = recipe => ({id:recipe.replace('.','-'),target:'subject',recipe,startFrame:0,durationFrames:60,fillAfter:'hold',
    params:Object.fromEntries(Object.entries(getCapability(recipe).params).map(([key,param])=>[key,param.default]))});
  scene.animations = [animation('position.x',[[0,0],[60,120]],'subject')];
  scene.clips = [clip('choreo.array'),clip('choreo.stagger')];
  const compiled = compileScene(scene); const copies=compiled.copies('subject'); const frames=compiled.evaluate(30).nodes;
  frames.forEach((frame,i)=>assert.equal(frame.position[0],Math.max(0,30-copies[i].delay)*2+copies[i].offset[0]));
  scene.clips = [clip('gen.trace')];
  const trail = compileScene(scene).evaluate(30).nodes.find(node=>node.type==='overlay');
  const xs=trail.layers.flatMap(layer=>layer.shapes.flatMap(shape=>shape.paths.flatMap(path=>path.map(point=>point[0]))));
  assert.ok(Math.max(...xs)>59 && Math.min(...xs)<40,'trail follows the keyframed motion instead of the static origin');
});
test('invalid hierarchy, wrong asset kinds, incompatible recipes and ambiguous property writers are rejected', () => {
  const cases = [
    s => { s.nodes[0].parent = 'group'; },
    s => { s.nodes[1].parent = 'missing'; },
    s => { s.specVersion = '0.1'; },
    s => { s.animations = [animation('opacity',[[0,2]])]; },
    s => { s.animations = [animation('opacity',[[10,0],[10,1]])]; },
    s => { s.animations = [animation('width',[[0,20]])]; },
    s => { s.animations = [animation('opacity',[[0,0]]),animation('opacity',[[5,1]])]; },
    s => { s.animations = [animation('opacity',[[0,0,[2,0,0,1]],[20,1]])]; },
    s => { s.nodes[1].font = 'picture'; s.assets.picture = { type: 'image', src: 'assets/a.png', sha256: '0'.repeat(64) }; },
    s => { s.clips = [{ id: 'move', target: 'group', recipe: 'prop.move', startFrame: 0, durationFrames: 30, fillAfter: 'hold', params: { fromPx: 0, toPx: 100, angleDeg: 0 } }]; s.animations = [animation('position.x',[[0,0],[30,100]])]; },
    s => { s.clips = [{ id: 'draw', target: 'group', recipe: 'prop.draw', startFrame: 0, durationFrames: 30, fillAfter: 'hold', params: { from: 0, to: 1, trailRatio: 0 } }]; },
  ];
  for (const alter of cases) { const scene = base(); alter(scene); assert.ok(validateScene(scene).length, JSON.stringify(scene)); }
});
test('study separates observed evidence, inferred cause, source/local seconds and authored output frames', () => {
  const scene = base(); scene.animations = [animation('opacity',[[0,0],[30,1]])];
  const study = { studyVersion: '0.1', title: 'Test', source: { video: 'reference.mp4', from: 10, to: 14 }, subjects: [{ id: 'subject', description: 'Title' }],
    events: [{ id: 'appear', subject: 'subject', from: 11, to: 12, status: 'observed', description: 'Title fades in', evidence: [{ at: 11.5, note: 'visible halfway' }],
      implementation: { targets: ['group'], clips: [], animations: ['opacity'], method: 'approximate', note: 'Different composition, same motion principle.' } }] };
  assert.deepEqual(validateStudy(study,scene),[]);
  assert.deepEqual(studyReport(study,scene).events[0].localSeconds,[1,2]);
  assert.deepEqual(studyReport(study,scene).events[0].output[0].frames,[0,30]);
  assert.deepEqual(studyReport(study,scene).events[0].output[0].seconds,[0,1]);
  study.events[0].evidence = []; assert.ok(validateStudy(study).length);
  study.events[0].status = 'unknown'; assert.deepEqual(validateStudy(study),[]);
  study.events[0].implementation.targets = ['label']; assert.ok(validateStudy(study,scene).length);
});
test('delivery reopens with locked image bytes, study bindings and stable animation revision IDs', async () => {
  const dir = await mkdtemp(join(tmpdir(),'motionflux-delivery-test-'));
  try {
    const delivered = cli('deliver','assets/examples/composition.scene.json','--out',join(dir,'revision'));
    assert.equal(cli('validate',delivered.scene).valid,true);
    const scene = JSON.parse(await readFile(delivered.scene,'utf8'));
    const report = JSON.parse(await readFile(join(dir,'revision','study-report.json'),'utf8'));
    assert.equal(report.bindingsVerified,true); assert.equal(report.visualComparison,'not-performed');
    assert.deepEqual(compileScene(scene).evaluate(40), compileScene(JSON.parse(await readFile('assets/examples/composition.scene.json','utf8'))).evaluate(40));
    assert.match(await readFile(delivered.preview,'utf8'), /orbit-mark.png/);
    scene.animations[0].keyframes[1].value -= 5;
    const revised = join(dir,'revision','revised.json'); await writeFile(revised,JSON.stringify(scene));
    const next = cli('deliver',revised,'--previous',delivered.scene,'--out',join(dir,'revision2'));
    const revision = JSON.parse(await readFile(next.report,'utf8')).revision;
    assert.equal(revision.changes.length,1);
    assert.equal(revision.changes[0].collection,'animations'); assert.equal(revision.changes[0].id,'hero-arrive');
    assert.throws(() => cli('deliver',delivered.scene,'--out',join(dir,'revision')));
  } finally { await rm(dir,{recursive:true,force:true}); }
});
