import { rand, TAU } from '../math.js';
import type { Copy, Recipe, RecipeContext } from './context.js';
import type { Vec2 } from '../types.js';

/**
 * Choreography. Layout recipes turn every existing copy into several, so layouts nest (a ring of rows);
 * a layout's slots number its copies so order recipes can delay them. Order recipes run after every layout,
 * whatever their position in the clip list, and their delays add up.
 */
function relayout(c: RecipeContext, count: number, place: (copy: Copy, index: number) => Partial<Copy>): void {
  const next: Copy[] = [];
  for (const copy of c.copies) for (let i = 0; i < count; i++)
    next.push({ ...copy, slot: copy.slot * count + i, slots: copy.slots * count, ...place(copy, i) });
  c.copies.splice(0, c.copies.length, ...next);
}
const shift = (copy: Copy, x: number, y: number): Vec2 => [copy.offset[0] + x, copy.offset[1] + y];
/** Copies that run `lag` frames behind each other in the same place. Followers keep their leader's slot. */
export function ghosts(c: RecipeContext, count: number, lag: number, fade: (k: number) => { opacity: number; scale: number }): void {
  const next: Copy[] = [];
  for (const copy of c.copies) {
    next.push(copy);
    for (let k = 1; k <= count; k++) {
      const { opacity, scale } = fade(k);
      next.push({ ...copy, delay: copy.delay + k * lag, opacity: copy.opacity * opacity, scale: copy.scale * scale, ghost: copy.ghost + k });
    }
  }
  c.copies.splice(0, c.copies.length, ...next);
}

export const choreoArray: Recipe = (c) => {
  const count = c.n('count'); const angle = c.n('angleDeg') * Math.PI / 180; const gap = c.n('gapPx');
  relayout(c, count, (copy, i) => { const along = (i - (count - 1) / 2) * gap; return { offset: shift(copy, along * Math.cos(angle), along * Math.sin(angle)) }; });
};
export const choreoRing: Recipe = (c) => {
  const count = c.n('count'); const radius = c.n('radiusPx'); const outward = c.s('orient') === 'outward';
  relayout(c, count, (copy, i) => {
    // The first copy sits at the top; outward copies turn so their own "up" points away from the centre.
    const angle = i / count * TAU - Math.PI / 2;
    return { offset: shift(copy, radius * Math.cos(angle), radius * Math.sin(angle)), rotation: copy.rotation + (outward ? angle * 180 / Math.PI + 90 : 0) };
  });
};
export const choreoGrid: Recipe = (c) => {
  const columns = c.n('columns'); const rows = c.n('rows'); const gap = c.n('gapPx');
  relayout(c, columns * rows, (copy, i) => ({ offset: shift(copy, (i % columns - (columns - 1) / 2) * gap, (Math.floor(i / columns) - (rows - 1) / 2) * gap) }));
};
export const choreoMirror: Recipe = (c) => {
  // The original keeps its motion on one side; each mirror image moves and is drawn reflected.
  const axis = c.s('axis'); const half = c.n('distancePx') / 2;
  const sides: Vec2[] = axis === 'x' ? [[1, 1], [-1, 1]] : axis === 'y' ? [[1, 1], [1, -1]] : [[1, 1], [-1, 1], [1, -1], [-1, -1]];
  relayout(c, sides.length, (copy, i) => {
    const [fx, fy] = sides[i]!;
    const x = axis === 'y' ? copy.offset[0] : fx * (copy.offset[0] - half); const y = axis === 'x' ? copy.offset[1] : fy * (copy.offset[1] - half);
    return { offset: [x, y], flip: [copy.flip[0] * fx, copy.flip[1] * fy], rotation: copy.rotation * fx * fy };
  });
};
export const choreoFollow: Recipe = (c) => {
  const falloff = c.n('falloff');
  ghosts(c, c.n('count'), c.n('lagFrames'), (k) => { const keep = Math.max(0.05, 1 - falloff * k); return { opacity: keep, scale: keep }; });
};

/** Index of a slot in the chosen order: forward, reverse, from the centre out, or from both ends in. */
function rank(slot: number, slots: number, order: string): number {
  const middle = (slots - 1) / 2;
  return order === 'reverse' ? slots - 1 - slot : order === 'center' ? Math.abs(slot - middle) : order === 'edges' ? middle - Math.abs(slot - middle) : slot;
}
export const choreoStagger: Recipe = (c) => { for (const copy of c.copies) copy.delay += rank(copy.slot, copy.slots, c.s('order')) * c.n('stepFrames'); };
export const choreoCascade: Recipe = (c) => {
  for (const copy of c.copies) copy.delay += Math.hypot(copy.offset[0] - c.n('originX'), copy.offset[1] - c.n('originY')) / 100 * c.n('framesPer100Px');
};
export const choreoRandom: Recipe = (c) => { for (const copy of c.copies) copy.delay += rand(c.seed, copy.slot) * c.n('spreadFrames'); };

export const choreo = { 'choreo.array': choreoArray, 'choreo.ring': choreoRing, 'choreo.grid': choreoGrid, 'choreo.mirror': choreoMirror, 'choreo.follow': choreoFollow,
  'choreo.stagger': choreoStagger, 'choreo.cascade': choreoCascade, 'choreo.random': choreoRandom } satisfies Record<string, Recipe>;
