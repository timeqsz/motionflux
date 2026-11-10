import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { capabilities } from '../packages/catalog/dist/index.js';
import { createExampleScene } from '../dist/lib/examples.mjs';
import { compileScene } from '../packages/core/dist/index.js';
const font = undefined;
const load = (id) => import(new URL(`../atoms/${id}.mjs`, import.meta.url).href);

test('every atom ships as a dependency-free script with a usage note, and the script equals the engine', async () => {
  const files = await readdir('atoms');
  for (const entry of capabilities) {
    assert.ok(files.includes(`${entry.id}.mjs`) && files.includes(`${entry.id}.md`), `${entry.id} has a script and a note`);
    const source = await readFile(`atoms/${entry.id}.mjs`, 'utf8');
    assert.doesNotMatch(source, /^\s*import\s|\bimport\(|\brequire\(/mu, `${entry.id}.mjs must stand alone`);
    assert.doesNotMatch(source, /Math\.random|Date\.now|performance\.now/u, `${entry.id}.mjs must not read a clock or unseeded randomness`);
    const { default: atom, meta } = await load(entry.id);
    assert.equal(meta.id, entry.id); assert.equal(atom.meta, meta); assert.deepEqual(Object.keys(meta.params), Object.keys(entry.params));
    const note = await readFile(`atoms/${entry.id}.md`, 'utf8');
    for (const key of Object.keys(entry.params)) assert.ok(note.includes(`\`${key}\``), `${entry.id}.md documents ${key}`);
    assert.ok(note.includes(`from './atoms/${entry.id}.mjs'`));

    // The featured clip alone, with the example's subject, parameters, seed and timing: the standalone script must
    // agree with the scene engine. Timing, layout, order and overlay atoms return other things and are checked below.
    if (!['property', 'loop', 'feel'].includes(entry.role) || entry.id === 'feel.motion-blur') continue;
    const scene = createExampleScene(entry.id, font); scene.clips = [scene.clips[0]]; const compiled = compileScene(scene);
    const node = scene.nodes.find((item) => item.id === 'subject'); const clip = scene.clips[0];
    const subject = node.type === 'text' ? { text: node.text, lineHeight: node.lineHeight, color: node.color } : { points: node.points, closed: node.closed, fill: node.fill, strokeWidth: node.strokeWidth, color: node.color };
    for (const frame of [0, 12.5, 45, 67.5, clip.durationFrames, scene.durationFrames]) {
      const expected = compiled.evaluate(frame).nodes.find((item) => item.id === 'subject');
      const out = atom({ frame, startFrame: clip.startFrame, durationFrames: clip.durationFrames, fps: 30, params: clip.params, subject, seed: scene.seed });
      assert.deepEqual([node.position[0] + out.position[0], node.position[1] + out.position[1]], expected.position, `${entry.id} position at ${frame}`);
      assert.deepEqual([out.rotation, out.scale, out.opacity, out.stretch, out.color ?? node.color], [expected.rotation, expected.scale, expected.opacity, expected.stretch, expected.color], `${entry.id} transform at ${frame}`);
      assert.deepEqual([out.pieces, out.filters ?? []], [expected.pieces, expected.filters], `${entry.id} pieces and filters at ${frame}`);
      if (node.type === 'text') assert.deepEqual(out.lines, expected.lines, `${entry.id} lines at ${frame}`);
      else assert.deepEqual(out.layers, expected.layers, `${entry.id} layers at ${frame}`);
    }
  }
  assert.ok(files.includes('draw.mjs') && files.includes('index.mjs') && files.includes('README.md') && files.includes('example.html'));
  assert.doesNotMatch(await readFile('atoms/draw.mjs', 'utf8'), /^\s*import\s/mu);
});
test('atom scripts take defaults, hold before and after, and reject bad input with a readable message', async () => {
  const { default: move } = await load('prop.move');
  assert.equal(move({ frame: 0, durationFrames: 30 }).position[0], -120);
  assert.equal(move({ frame: 30, durationFrames: 30 }).position[0], 120);
  assert.deepEqual(move({ frame: 5, startFrame: 40, durationFrames: 30 }), move({ frame: 40, startFrame: 40, durationFrames: 30 }), 'Before it starts an atom returns its first state.');
  assert.deepEqual(move({ frame: 500, startFrame: 40, durationFrames: 30 }), move({ frame: 70, startFrame: 40, durationFrames: 30 }), 'After it ends an atom holds its last state.');
  assert.equal(move({ frame: 15, durationFrames: 30 }).progress, 0.5);
  assert.throws(() => move({ frame: 0, durationFrames: 30, params: { toPx: 9999 } }), /toPx must be a number from -2000 to 2000 \(px\); got 9999/u);
  assert.throws(() => move({ frame: 0, durationFrames: 30, params: { distance: 10 } }), /unknown parameter distance\. It takes fromPx, toPx, angleDeg/u);
  assert.throws(() => move({ frame: NaN, durationFrames: 30 }), RangeError);
  assert.throws(() => move({ frame: 0, durationFrames: 0 }), RangeError);
  const turned = move({ frame: 30, durationFrames: 30, params: { fromPx: 0, toPx: 100, angleDeg: 90 } });
  assert.ok(Math.abs(turned.position[0]) < 1e-9); assert.equal(turned.position[1], 100);
  assert.equal(move({ frame: 30, durationFrames: 30, subject: { text: 'hi' } }).lines[0].text, 'hi', 'Property atoms pass text through.');
  // A timing atom hands its curve to a property atom; the pair matches the same two clips in a scene.
  const { default: spring } = await load('timing.spring');
  assert.equal(spring({ frame: 0, durationFrames: 30 }).value, 0); assert.equal(spring({ frame: 30, durationFrames: 30 }).value, 1);
  const curve = (t) => spring({ frame: t, durationFrames: 1 }).value;
  const scene = compileScene({ specVersion: '0.1', seed: 0, canvas: { width: 100, height: 100, background: '#000000' }, fps: { numerator: 30, denominator: 1 }, durationFrames: 30, assets: {},
    nodes: [{ id: 'subject', type: 'path', position: [0, 0], color: '#ffffff', points: [[-1, 0], [1, 0]], strokeWidth: 1 }],
    clips: [{ id: 'curve', target: 'subject', recipe: 'timing.spring', startFrame: 0, durationFrames: 30, fillAfter: 'hold', params: spring.meta.params && Object.fromEntries(Object.entries(spring.meta.params).map(([key, value]) => [key, value.default])) },
      { id: 'effect', target: 'subject', recipe: 'prop.move', startFrame: 0, durationFrames: 30, fillAfter: 'hold', params: { fromPx: -120, toPx: 120, angleDeg: 0 } }] });
  for (const frame of [3, 9, 17]) assert.deepEqual(move({ frame, durationFrames: 30, ease: curve }).position, scene.evaluate(frame).nodes[0].position);
  const { default: decode } = await load('text.decode');
  assert.throws(() => decode({ frame: 0, durationFrames: 30 }), /acts on text; pass subject\.text/u);
  assert.deepEqual(decode({ frame: 30, durationFrames: 30, subject: { text: 'AB\nCD', lineHeight: 40 } }).lines, [{ text: 'AB', y: 0, opacity: 1 }, { text: 'CD', y: 40, opacity: 1 }]);
  const { default: float } = await load('loop.float');
  const a = float({ frame: 20, durationFrames: 60, seed: 1 }); const b = float({ frame: 20, durationFrames: 60, seed: 1, id: 'other' });
  assert.deepEqual(float({ frame: 20, durationFrames: 60, seed: 1 }), a); assert.notDeepEqual(a.position, b.position, 'A different id gives a different random motion under one seed.');
  assert.deepEqual(float({ frame: 40, durationFrames: 120, fps: 60, seed: 1 }).position, a.position, 'Hz parameters follow fps: the same second gives the same value.');
  const { default: ring } = await load('choreo.ring');
  const placed = ring({ frame: 0, durationFrames: 1, params: { count: 4, radiusPx: 10, orient: 'outward' } }).copies;
  assert.deepEqual(placed.map((copy) => copy.offset.map(Math.round)), [[0, -10], [10, 0], [0, 10], [-10, 0]]); assert.deepEqual(placed.map((copy) => Math.round(copy.rotation)), [0, 90, 180, 270]);
  const { default: stagger } = await load('choreo.stagger');
  assert.throws(() => stagger({ frame: 0, durationFrames: 1 }), /pass items/u);
  assert.deepEqual(stagger({ frame: 0, durationFrames: 1, items: [[0, 0], [1, 0], [2, 0]], params: { stepFrames: 4, order: 'reverse' } }).copies.map((copy) => copy.delay), [8, 4, 0]);
  const { default: link } = await load('gen.link');
  assert.equal(link({ frame: 0, durationFrames: 1, items: [[0, 0], [50, 0], [400, 0]] }).layers[0].shapes.length, 1);
  const { atoms, drawAtom } = await import(new URL('../atoms/index.mjs', import.meta.url).href);
  assert.equal(Object.keys(atoms).length, capabilities.length); assert.equal(atoms['timing.spring'].meta.id, 'timing.spring'); assert.equal(typeof drawAtom, 'function');
});
