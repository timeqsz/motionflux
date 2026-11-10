import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { getCapability } from '../packages/catalog/dist/index.js';
const { outputFiles } = await build({ entryPoints: ['packages/cli/src/breakdown.ts'], bundle: true, platform: 'node', format: 'esm', target: 'node22', write: false });
const { breakdownPlan, readVideoBreakdown, videoBreakdownPlan } = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].contents).toString('base64')}`);

test('one atom track retains independent names and intervals for overlapping subjects and repeated actions', () => {
  const input = readVideoBreakdown({ source: { video: 'source.mp4', from: 10, to: 15 }, tracks: [
    { atom: 'prop.move', name: '第一行标题·上移', spans: [[10, 11]] },
    { atom: 'prop.move', name: '第二行标题·上移', spans: [[10.5, 11.5]] },
    { atom: 'prop.opacity', name: '标题·淡入', spans: [[10, 10.5]] },
    { atom: 'prop.move', name: '光标·移动', spans: [[12, 12.5], [13, 13.5]] },
  ] });
  const plan = videoBreakdownPlan(input, { width: 640, fps: 20, frames: 100 });
  assert.equal(plan.tracks.length, 2);
  const moves = plan.tracks.find(track => track.name === '位移');
  assert.equal(moves.blocks.length, 4);
  assert.deepEqual(moves.blocks.map(({ from, to }) => [from, to]), [[0, 20], [10, 30], [40, 50], [60, 70]]);
  assert.equal(moves.blocks[0].name, '第一行标题·上移');
  assert.equal(moves.blocks[1].name, '第二行标题·上移');
  assert.notEqual(moves.blocks[2].name, moves.blocks[3].name);
  assert.notEqual(moves.color, plan.tracks.find(track => track.name === '透明').color, 'Different atoms in one family have different colors.');
  const alone = videoBreakdownPlan({ ...input, tracks: [input.tracks[1]] }, { width: 640, fps: 20, frames: 100 });
  assert.equal(alone.tracks[0].color, moves.color);
  assert.throws(() => readVideoBreakdown({ ...input, tracks: [{ ...input.tracks[0], name: '' }] }), /name must be non-empty/);
});
const defaults = id => Object.fromEntries(Object.entries(getCapability(id).params).map(([key, value]) => [key, value.default]));
function scene() {
  return { specVersion: '0.1', seed: 0, canvas: { width: 640, height: 360, background: '#000000' }, fps: { numerator: 30, denominator: 1 }, durationFrames: 60, assets: {},
    nodes: ['title', 'subtitle'].map((id, i) => ({ id, type: 'path', position: [100, 100 + i*100], color: '#ffffff', points: [[-10,-10],[10,-10],[10,10],[-10,10]], closed: true, fill: true, strokeWidth: 1 })),
    clips: [
      { id: 'title-in', target: 'title', recipe: 'prop.move', startFrame: 0, durationFrames: 10, fillAfter: 'hold', params: defaults('prop.move') },
      { id: 'subtitle-in', target: 'subtitle', recipe: 'prop.move', startFrame: 5, durationFrames: 10, fillAfter: 'hold', params: defaults('prop.move') },
      { id: 'title-out', target: 'title', recipe: 'prop.move', startFrame: 30, durationFrames: 10, fillAfter: 'hold', params: defaults('prop.move') },
    ] };
}
test('scene subjects and repeated clips become separate blocks in one atom track', () => {
  const plan = breakdownPlan(scene(), { width: 640 });
  assert.equal(plan.tracks.length, 1);
  const blocks = plan.tracks[0].blocks;
  assert.deepEqual(blocks.map(({ from, to }) => [from, to]), [[0,10],[5,15],[30,40]]);
  assert.equal(new Set(blocks.map(block => block.name)).size, 3);
  assert.ok(blocks[0].name.includes('title-in'));
  assert.ok(blocks[1].name.includes('subtitle'));
});
test('a static arrangement retains separate blocks with an idle gap', () => {
  const spec = scene();
  spec.clips.push({ id: 'array', target: 'title', recipe: 'choreo.array', startFrame: 0, durationFrames: 60, fillAfter: 'hold', params: defaults('choreo.array') });
  const track = breakdownPlan(spec, { width: 640 }).tracks.find(track => track.blocks.some(block => block.name.includes('array')));
  assert.deepEqual(track.blocks.map(({ from, to }) => [from, to]), [[0,10],[30,40]]);
});
test('touching and overlapping intervals never collapse into a continuous combined block', () => {
  const input = readVideoBreakdown({ source: { video: 'source.mp4', from: 0, to: 3 }, tracks: [
    { atom: 'prop.move', name: 'A', spans: [[0,1]] }, { atom: 'prop.move', name: 'B', spans: [[1,2]] }, { atom: 'prop.move', name: 'C', spans: [[.5,1.5]] },
  ] });
  const plan = videoBreakdownPlan(input, { width: 640, fps: 20, frames: 60 });
  assert.equal(plan.tracks.length, 1);
  assert.deepEqual(plan.tracks[0].blocks.map(({ name, from, to }) => [name, from, to]), [['A',0,20],['C',10,30],['B',20,40]]);
});
