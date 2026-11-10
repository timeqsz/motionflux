import { clamp, lerp, mixColor } from '../math.js';
import { bounds, circle, polygon, resample, type Path } from '../geometry.js';
import { base, emit, filter, shape, type Recipe } from './context.js';
import type { Region, Vec2 } from '../types.js';

/** Star whose inner vertices sit on the polygon's edges when `inner` is 1. */
export const polystar = (sides: number, radius: number, inner: number, rotationDeg = 0): Path =>
  Array.from({ length: sides * 2 }, (_, i): Vec2 => {
    const r = i % 2 ? radius * inner * Math.cos(Math.PI / sides) : radius; const angle = (rotationDeg - 90) * Math.PI / 180 + i * Math.PI / sides;
    return [r * Math.cos(angle), r * Math.sin(angle)];
  });
const signedArea = (points: Path): number => points.reduce((sum, [x, y], i) => { const next = points[(i + 1) % points.length]!; return sum + x * next[1] - next[0] * y; }, 0);

/**
 * Properties: what changes. Each one runs on the timing curve in effect (`c.ease`), so a spring, bounce or step
 * on the same node changes how it moves without touching these recipes. Values combine with other clips:
 * offsets and angles add, scales and opacities multiply.
 */
export const propMove: Recipe = (c) => {
  const offset = lerp(c.n('fromPx'), c.n('toPx'), c.ease(c.progress)); const angle = c.n('angleDeg') * Math.PI / 180;
  c.state.position[0] += offset * Math.cos(angle); c.state.position[1] += offset * Math.sin(angle);
};
export const propRotate: Recipe = (c) => { c.state.rotation += lerp(c.n('fromDeg'), c.n('toDeg'), c.ease(c.progress)); };
export const propScale: Recipe = (c) => { c.state.scale *= Math.max(0, lerp(c.n('from'), c.n('to'), c.ease(c.progress))); };
// A curve may overshoot; opacity and colour stay within their range.
export const propOpacity: Recipe = (c) => { c.state.opacity *= clamp(lerp(c.n('from'), c.n('to'), c.ease(c.progress))); };
export const propColor: Recipe = (c) => { c.state.color = mixColor(c.s('from'), c.s('to'), c.ease(c.progress)); };
export const propBlur: Recipe = (c) => {
  const radius = Math.max(0, lerp(c.n('fromPx'), c.n('toPx'), c.ease(c.progress)));
  if (radius > 0.05) c.state.filters.push(filter('blur', { radius }));
};
export const propMorph: Recipe = (c) => {
  const outline = base(c); const box = bounds([outline]); const radius = Math.max(box.width, box.height) / 2; const samples = 96;
  const source = resample(outline, true, samples);
  const goal = ({ circle: circle(radius, box.cx, box.cy), triangle: polygon(radius * 1.15, 3, -90, box.cx, box.cy),
    square: polygon(radius * 1.2, 4, -45, box.cx, box.cy), star: polystar(5, radius * 1.15, 0.45).map(([x, y]): Vec2 => [x + box.cx, y + box.cy]) })[c.s('target')]!;
  let target = resample(goal, true, samples);
  // Match winding, then pick the start index with the least total travel so the morph does not twist.
  if (Math.sign(signedArea(source)) !== Math.sign(signedArea(target))) target = target.reverse();
  let best = 0; let bestCost = Infinity;
  for (let shift = 0; shift < samples; shift++) {
    let cost = 0;
    for (let i = 0; i < samples && cost < bestCost; i++) { const a = source[i]!; const b = target[(i + shift) % samples]!; cost += (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2; }
    if (cost < bestCost) { bestCost = cost; best = shift; }
  }
  const amount = c.n('amount') * c.ease(c.progress);
  emit(c, [shape(c, [source.map(([x, y], i): Vec2 => { const to = target[(i + best) % samples]!; return [lerp(x, to[0], amount), lerp(y, to[1], amount)]; })], { closed: true })]);
};
export const propDraw: Recipe = (c) => {
  const end = clamp(lerp(c.n('from'), c.n('to'), c.ease(c.progress)));
  c.state.trim = end;
  c.state.trimStart = c.n('trailRatio') > 0 ? Math.max(0, end - c.n('trailRatio')) : 0;
};
export const propCrop: Recipe = (c) => {
  const visible = clamp(lerp(c.n('from'), c.n('to'), c.ease(c.progress))); const hidden = 1 - visible;
  if (visible >= 1) { c.state.pieces = undefined; return; }
  const inset = { left: 0, top: 0, right: 0, bottom: 0 };
  const origin = c.s('origin');
  if (origin === 'center') { inset.left = inset.right = inset.top = inset.bottom = hidden / 2; }
  else inset[({ left: 'right', right: 'left', top: 'bottom', bottom: 'top' } as const)[origin as 'left']] = hidden;
  const region: Region = { kind: 'inset', ...inset };
  c.state.pieces = visible <= 0 ? [] : [{ regions: [region], offset: [0, 0], opacity: 1 }];
};

export const prop = { 'prop.move': propMove, 'prop.rotate': propRotate, 'prop.scale': propScale, 'prop.opacity': propOpacity, 'prop.color': propColor,
  'prop.blur': propBlur, 'prop.morph': propMorph, 'prop.draw': propDraw, 'prop.crop': propCrop } satisfies Record<string, Recipe>;
