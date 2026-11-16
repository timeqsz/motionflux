import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { deflateSync } from 'node:zlib';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

// Small original raster artwork, intentionally multicolour to test that images keep their RGB and alpha.
export function png(width, height, pixel) {
  const crc = buffer => {
    let value = 0xffffffff;
    for (const byte of buffer) { value ^= byte; for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ (0xedb88320 & -(value & 1)); }
    return (value ^ 0xffffffff) >>> 0;
  };
  const chunk = (name, body) => {
    const data = Buffer.concat([Buffer.from(name), body]); const result = Buffer.alloc(body.length + 12);
    result.writeUInt32BE(body.length); data.copy(result, 4); result.writeUInt32BE(crc(data), result.length - 4); return result;
  };
  const header = Buffer.alloc(13); header.writeUInt32BE(width); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 6;
  const rows = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) Buffer.from(pixel(x, y)).copy(rows, y * (width * 4 + 1) + 1 + x * 4);
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', header), chunk('IDAT', deflateSync(rows)), chunk('IEND', Buffer.alloc(0))]);
}
export async function writeSceneExamples() {
  const directory = 'assets/examples'; await mkdir(`${directory}/assets`, { recursive: true });
  const artwork = png(320, 320, (x, y) => {
    const ring = Math.abs(Math.hypot(x-160, y-160)-98) < 30;
    const arc = Math.atan2(y-160, x-160); const gradient = (x+y)/640;
    if (ring && arc > -2.6 && arc < 2.6) return [Math.round(110+130*gradient), Math.round(170+55*gradient), 110, 255];
    if (x > 120 && x < 200 && y > 125 && y < 195) return [210, 223, 242, 255];
    return [0,0,0,0];
  });
  await writeFile(`${directory}/assets/orbit-mark.png`, artwork);
  await build({ entryPoints: ['maintainer/modules/three-orbit.mjs'], outfile: `${directory}/assets/three-orbit.mjs`, bundle: true,
    format: 'esm', target: 'es2022', minify: true, legalComments: 'inline',
    banner: { js: `/* Three.js license\n${await readFile('node_modules/three/LICENSE', 'utf8')}*/` } });
  const hash = data => createHash('sha256').update(data).digest('hex');
  const asset = (type, name, bytes) => ({ type, src: `assets/${name}`, sha256: hash(bytes) });
  const text = (id, content, position, fontSize, color = '#f2f4ec', parent) => ({ id, type: 'text', text: content, position, fontSize, lineHeight: fontSize*1.15, color, font: 'system', ...(parent ? { parent } : {}) });
  const track = (id, target, property, frames) => ({ id, target, property, keyframes: frames.map(([frame, value, easing = 'smooth']) => ({ frame, value, easing })) });
  const base = { specVersion: '0.2', seed: 17, canvas: { width: 960, height: 540, background: '#111a20' }, fps: { numerator: 30, denominator: 1 }, durationFrames: 120, clips: [] };
  const scene = { ...base, assets: { mark: asset('image', 'orbit-mark.png', artwork) }, nodes: [
    text('label', 'MOTIONFLUX / FIELD NOTES', [58,62], 15, '#a9c1a3'),
    { id: 'hero', type: 'group', position: [58,155], color: '#ffffff' },
    text('title', 'Give ideas\na direction.', [0,0], 58, '#f2f4ec', 'hero'),
    text('subhead', 'Observe the motion. Shape your own.', [2,137], 18, '#a8b5b9', 'hero'),
    { id: 'art', type: 'image', asset: 'mark', position: [545,100], width: 330, height: 330, fit: 'contain', pivot: [165,165], color: '#ffffff' },
    { id: 'curve', type: 'vector', position: [60,350], color: '#bce391', fill: false, strokeWidth: 3,
      commands: [{ op: 'M', to: [0,45] }, { op: 'C', control1: [80,45], control2: [85,-20], to: [170,0] }, { op: 'Q', control: [245,30], to: [300,0] }] },
    { id: 'steps', type: 'group', position: [58,464], color: '#ffffff', layout: { type: 'row', cell: [210,30], gap: [22,0], columns: 3 } },
    text('observe', '01 / OBSERVE', [0,0], 16, '#c4d6e0', 'steps'),
    text('compose', '02 / COMPOSE', [0,0], 16, '#c4d6e0', 'steps'),
    text('verify', '03 / VERIFY', [0,0], 16, '#c4d6e0', 'steps'),
  ], animations: [
    track('hero-arrive', 'hero', 'position.y', [[0,190], [26,155], [95,155], [119,135]]),
    track('hero-visibility', 'hero', 'opacity', [[0,0],[20,1],[95,1],[119,0]]),
    track('art-x', 'art', 'position.x', [[0,770],[35,710],[119,710]]),
    track('art-y', 'art', 'position.y', [[0,285],[35,265],[90,265],[119,248]]),
    track('art-turn', 'art', 'rotation', [[0,-35],[35,0],[90,12],[119,20]]),
    track('art-opacity', 'art', 'opacity', [[0,0],[30,1],[95,1],[119,0]]),
    track('curve-show', 'curve', 'opacity', [[0,0],[28,0],[46,1],[95,1],[119,0]]),
    track('steps-show', 'steps', 'opacity', [[0,0],[45,0],[66,1],[95,1],[119,0]]),
  ] };
  // This fixture describes our own output, never a claim to have observed somebody else's source video.
  const study = { studyVersion: '0.1', title: '原创示例的动效设计记录（待观看验证）', source: { video: 'composition.mp4', from: 0, to: 4 },
    subjects: [{ id: 'copy', description: '标题与副标题整体' }], events: [{ id: 'arrival', subject: 'copy', from: 0, to: 0.9,
      status: 'unknown', description: '设计意图：标题整体上移并淡入。尚未把设计意图标作已观察事实。', evidence: [],
      implementation: { targets: ['hero'], clips: [], animations: ['hero-arrive','hero-visibility'], method: 'direct', note: '只借用整体入场的运动原则，所有图形与版式为原创。输出动作时间由绑定动画明确记录。' } }] };
  scene.study = study;
  await writeFile(`${directory}/composition.scene.json`, JSON.stringify(scene, null, 2));
  await writeFile(`${directory}/composition.study.json`, JSON.stringify(study, null, 2));
  const three = { ...scene, study: undefined, assets: { orbit: asset('module', 'three-orbit.mjs', await readFile(`${directory}/assets/three-orbit.mjs`)) },
    nodes: scene.nodes.map(node => node.id === 'art' ? { id: 'art', type: 'custom', module: 'orbit', position: [480,70], width: 450, height: 370, color: '#ffffff', params: { turn: 0, tilt: 12, cameraDistance: 7 } }
      : node.id === 'title' ? { ...node, text: 'Move through\na new dimension.', fontSize: 43 } : node),
    animations: [...scene.animations.filter(item => !item.id.startsWith('art-')), track('orbit-turn', 'art', 'params.turn', [[0,-40,'linear'],[119,220,'linear']]),
      track('orbit-camera', 'art', 'params.cameraDistance', [[0,8],[50,6.5],[119,7]]), track('orbit-fade', 'art', 'opacity', [[0,0],[24,1],[95,1],[119,0]])] };
  await writeFile(`${directory}/three-orbit.scene.json`, JSON.stringify(three, null, 2));
}
