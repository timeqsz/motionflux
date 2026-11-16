import { getCapability } from '../../catalog/src/index.js';
import { mixColor, smooth } from './math.js';
import type { AnimationTrack, FrameNode, Issue, Keyframe, Matrix2D, MotionSpec, SceneNode, Vec2 } from './types.js';

/** Existing geometry/text recipes keep their original contracts. New objects share only these transform recipes. */
export function supportsNode(recipe: string, node: SceneNode): boolean {
  const entry = getCapability(recipe)!;
  if (node.type === 'text' || node.type === 'path') return entry.targets.includes(node.type);
  return entry.role === 'timing' || entry.role === 'loop'
    || ['prop.move', 'prop.rotate', 'prop.scale', 'prop.opacity'].includes(recipe)
    || (node.type === 'vector' && recipe === 'prop.color');
}
export function animationIssues(scene: MotionSpec): Issue[] {
  const issues: Issue[] = []; const ids = new Set(scene.clips.map(clip => clip.id)); const properties = new Set<string>();
  const add = (path: string, message: string) => issues.push({ path, code: 'ANIMATION', message });
  (scene.animations ?? []).forEach((track, i) => {
    const path = `$.animations[${i}]`; const node = scene.nodes.find(node => node.id === track.target);
    if (ids.has(track.id)) add(`${path}.id`, 'Animation and clip IDs must be unique.');
    ids.add(track.id);
    if (!node) { add(`${path}.target`, 'Reference an existing object.'); return; }
    const property = track.property; const domain = property.split('.')[0]!;
    const supported = ['position', 'rotation', 'scale', 'opacity', 'stretch'].includes(domain)
      || (domain === 'color' && ['text', 'path', 'vector'].includes(node.type))
      || (domain === 'fontSize' && node.type === 'text')
      || (domain === 'strokeWidth' && ['path', 'vector'].includes(node.type))
      || (['width', 'height'].includes(domain) && ['image', 'custom'].includes(node.type))
      || (domain === 'params' && node.type === 'custom' && Object.hasOwn(node.params, property.slice(7)));
    if (!supported) add(`${path}.property`, `${property} is not editable on ${node.type}.`);
    const key = `${track.target}:${property}`;
    if (properties.has(key)) add(path, 'Use one track per target property.');
    properties.add(key);
    if (scene.clips.some(clip => clip.target === track.target && getCapability(clip.recipe)!.writes.includes(domain)))
      add(path, `A clip already writes ${domain}; choose a keyframe track or a recipe for this property.`);
    const limits: Record<string, [number, number]> = { opacity: [0, 1], scale: [0, 100], position: [-32768, 32768], stretch: [-100, 100],
      rotation: [-360000, 360000], fontSize: [1, 512], strokeWidth: [0.1, 100], width: [1, 4096], height: [1, 4096], params: [-1000000, 1000000] };
    track.keyframes.forEach((keyframe, k) => {
      const at = `${path}.keyframes[${k}]`;
      if (keyframe.frame > scene.durationFrames || (k > 0 && keyframe.frame <= track.keyframes[k - 1]!.frame)) add(at, 'Frames must increase strictly and fit inside the scene.');
      if (domain === 'color') { if (typeof keyframe.value !== 'string') add(at, 'Color keyframes require #RRGGBB values.'); }
      else {
        const [min, max] = limits[domain] ?? [-1000000, 1000000];
        if (typeof keyframe.value !== 'number' || keyframe.value < min || keyframe.value > max) add(at, `${property} requires numeric values in ${min}…${max}.`);
      }
      if (Array.isArray(keyframe.easing) && keyframe.easing.some((n, axis) => n < 0 || n > 1))
        add(`${at}.easing`, 'Cubic Bézier control coordinates must be in 0…1; use explicit keyframes for overshoot.');
    });
  });
  return issues;
}
const bezier = (t: number, a: number, b: number) => 3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t ** 2 * b + t ** 3;
function ease(t: number, easing: Keyframe['easing']): number {
  if (easing === 'hold') return 0;
  if (easing === 'smooth') return smooth(t);
  if (!Array.isArray(easing)) return t;
  let lo = 0; let hi = 1;
  for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (bezier(m, easing[0], easing[2]) < t) lo = m; else hi = m; }
  return bezier((lo + hi) / 2, easing[1], easing[3]);
}
export function sampleTrack(track: AnimationTrack, frame: number): number | string {
  const keys = track.keyframes;
  if (frame <= keys[0]!.frame) return keys[0]!.value;
  const next = keys.findIndex(key => key.frame > frame);
  if (next < 0) return keys.at(-1)!.value;
  const a = keys[next - 1]!; const b = keys[next]!; const t = ease((frame - a.frame) / (b.frame - a.frame), a.easing);
  return typeof a.value === 'string' ? mixColor(a.value, b.value as string, t) : a.value + ((b.value as number) - a.value) * t;
}
/** Apply authored absolute values to a fresh evaluated node, never to the saved spec. */
export function sampleNode(source: SceneNode, tracks: readonly AnimationTrack[], frame: number): SceneNode {
  if (!tracks.length) return source;
  const node = { ...source };
  for (const track of tracks) {
    const value = sampleTrack(track, frame); const property = track.property;
    if (property.startsWith('position.') || property.startsWith('stretch.')) {
      const field = property.startsWith('position.') ? 'position' : 'stretch';
      node[field] = [...node[field] ?? [1, 1]]; node[field][property.endsWith('.x') ? 0 : 1] = value as number;
    } else if (property.startsWith('params.') && node.type === 'custom') node.params = { ...node.params, [property.slice(7)]: value as number };
    else if (property === 'fontSize' && node.type === 'text') node.fontSize = value as number;
    else if (property === 'strokeWidth' && (node.type === 'path' || node.type === 'vector')) {
      node.strokeWidth = value as number;
    } else if ((property === 'width' || property === 'height') && (node.type === 'image' || node.type === 'custom')) node[property] = value as number;
    else if (property === 'color') node.color = value as string;
    else if (property === 'rotation' || property === 'scale' || property === 'opacity') node[property] = value as number;
  }
  return node;
}
export const identity: Matrix2D = [1, 0, 0, 1, 0, 0];
export function multiply(a: Matrix2D, b: Matrix2D): Matrix2D {
  return [a[0]*b[0]+a[2]*b[1], a[1]*b[0]+a[3]*b[1], a[0]*b[2]+a[2]*b[3], a[1]*b[2]+a[3]*b[3], a[0]*b[4]+a[2]*b[5]+a[4], a[1]*b[4]+a[3]*b[5]+a[5]];
}
export function nodeMatrix(node: Exclude<FrameNode, { type: 'overlay' }>): Matrix2D {
  const r = node.rotation * Math.PI / 180; const sx = node.scale * node.stretch[0]; const sy = node.scale * node.stretch[1];
  const a = Math.cos(r)*sx; const b = Math.sin(r)*sx; const c = -Math.sin(r)*sy; const d = Math.cos(r)*sy;
  const [x, y] = node.pivot ?? [0, 0];
  return [a, b, c, d, node.position[0]-a*x-c*y, node.position[1]-b*x-d*y];
}
export function layoutOffset(node: SceneNode, index: number): Vec2 {
  if (node.type !== 'group' || !node.layout) return [0, 0];
  const { type, cell, gap, columns } = node.layout;
  return [(type === 'column' ? 0 : type === 'row' ? index : index % columns) * (cell[0] + gap[0]),
    (type === 'row' ? 0 : type === 'column' ? index : Math.floor(index / columns)) * (cell[1] + gap[1])];
}
