import { clamp, fract, rand, smooth } from '../math.js';
import { bounds, place, polygon } from '../geometry.js';
import { base, emit, shape, strokeOf, type Recipe, type RecipeContext } from './context.js';
import type { Shape, Vec2 } from '../types.js';

/** Things that appear from nothing. Every trajectory is a closed form of time, so any frame can be evaluated directly. */
export const genParticles: Recipe = (c) => {
  const secondsPerFrame = c.scene.fps.denominator / c.scene.fps.numerator; const life = c.n('lifeFrames'); const shapes: Shape[] = [];
  for (let i = 0; i < c.n('count'); i++) {
    // Each particle is reborn every lifetime with its own phase, so `count` particles are always in flight once the
    // first ones are born; every rebirth draws a new direction and speed.
    const since = c.elapsed - rand(c.seed, i, 0) * life;
    if (since < 0) continue;
    const cycle = Math.floor(since / life); const age = since - cycle * life;
    const time = age * secondsPerFrame; const spent = age / life;
    const angle = (-90 + (rand(c.seed, i, cycle, 1) - 0.5) * c.n('spreadDeg')) * Math.PI / 180; const speed = c.n('speedPx') * (0.35 + 0.65 * rand(c.seed, i, cycle, 2));
    shapes.push(shape(c, [polygon(c.n('sizePx') * (1 - spent) * (0.6 + 0.4 * rand(c.seed, i, cycle, 3)), 8, 0,
      speed * Math.cos(angle) * time, speed * Math.sin(angle) * time + c.n('gravityPx') * time * time / 2)], { closed: true, fill: true, opacity: 1 - spent }));
  }
  emit(c, shapes);
};
export const genShatter: Recipe = (c) => {
  // Shards are the outline seen through jittered triangles; each shard and its triangle move together.
  // The explosion runs on clip time, not on a timing curve, so it starts with full force.
  const outline = base(c);
  if (c.progress <= 0) { emit(c, [shape(c, [outline])]); return; }
  const count = c.n('pieces'); const box = bounds([outline]); const pad = strokeOf(c);
  const corner = (i: number, j: number): Vec2 => {
    const jitter = i === 0 || j === 0 || i === count || j === count ? 0 : 0.6;
    return [box.minX - pad + (i + (rand(c.seed, i, j, 0) - 0.5) * jitter) / count * (box.width + 2 * pad),
      box.minY - pad + (j + (rand(c.seed, i, j, 1) - 0.5) * jitter) / count * (box.height + 2 * pad)];
  };
  const far = Math.hypot(box.width, box.height) / 2 + pad || 1; const shapes: Shape[] = [];
  for (let i = 0; i < count; i++) for (let j = 0; j < count; j++) {
    [[corner(i, j), corner(i + 1, j), corner(i + 1, j + 1)], [corner(i, j), corner(i + 1, j + 1), corner(i, j + 1)]].forEach((triangle, half) => {
      const centre: Vec2 = [(triangle[0]![0] + triangle[1]![0] + triangle[2]![0]) / 3, (triangle[0]![1] + triangle[1]![1] + triangle[2]![1]) / 3];
      const away: Vec2 = [centre[0] - box.cx, centre[1] - box.cy]; const distance = Math.hypot(...away);
      const local = clamp((c.progress - c.n('delayRatio') * distance / far) / (1 - c.n('delayRatio')));
      const id = (i * count + j) * 2 + half; const push = c.n('forcePx') * (1 - (1 - local) ** 2) * (0.6 + 0.8 * rand(c.seed, id, 2));
      const pose = { x: (distance ? away[0] / distance : 0) * push, y: (distance ? away[1] / distance : -1) * push + c.n('gravityPx') * local * local,
        rotation: c.n('spinDeg') * local * (rand(c.seed, id, 3) - 0.5) * 2, ox: centre[0], oy: centre[1] };
      const opacity = 1 - smooth((local - 0.55) / 0.45);
      if (opacity > 0) shapes.push(shape(c, [place(outline, pose)], { opacity, clip: [place(triangle, pose)] }));
    });
  }
  emit(c, shapes);
};
export const genRipple: Recipe = (c) => {
  // Rings are the subject's own outline grown about its origin; the line keeps its width as it grows.
  const outline = base(c); const rings = c.n('rings'); const shapes: Shape[] = [];
  for (let k = 0; k < rings; k++) {
    const age = fract(c.seconds / c.n('periodS') + k / rings);
    shapes.push(shape(c, [place(outline, { scaleX: 1 + (c.n('growth') - 1) * (1 - (1 - age) ** 2) })], { fill: false, opacity: (1 - age) ** 1.5 }));
  }
  emit(c, [...shapes, shape(c, [outline])]);
};

/** A stroked polyline in scene space, faded from its oldest end to its newest in a few steps. */
function fading(c: RecipeContext, points: Vec2[], width: number): Shape[] {
  const steps = Math.min(8, points.length - 1); const shapes: Shape[] = [];
  for (let k = 0; k < steps; k++) {
    const from = Math.floor(k * (points.length - 1) / steps); const to = Math.floor((k + 1) * (points.length - 1) / steps);
    shapes.push({ paths: [points.slice(from, to + 1)], closed: false, fill: false, strokeWidth: width, opacity: (k + 1) / steps });
  }
  return shapes;
}
export const genTrace: Recipe = (c) => {
  const samples = Math.max(2, Math.min(120, Math.ceil(c.n('lengthFrames')) + 1));
  emit(c, c.history(c.n('lengthFrames'), samples).flatMap((track) => track.length > 1 ? fading(c, track, c.n('widthPx')) : []));
};
export const genLink: Recipe = (c) => {
  const points = c.history(0, 1).map((track) => track.at(-1)!); const width = c.n('widthPx'); const shapes: Shape[] = [];
  if (c.s('mode') === 'chain') { if (points.length > 1) shapes.push({ paths: [points], closed: false, fill: false, strokeWidth: width, opacity: 1 }); }
  else {
    // Closer pairs draw stronger; a pair fades out completely as it reaches the distance limit.
    const limit = c.n('maxDistancePx');
    for (let i = 0; i < points.length; i++) for (let j = i + 1; j < points.length; j++) {
      const distance = Math.hypot(points[i]![0] - points[j]![0], points[i]![1] - points[j]![1]);
      if (distance < limit) shapes.push({ paths: [[points[i]!, points[j]!]], closed: false, fill: false, strokeWidth: width, opacity: 1 - distance / limit });
    }
  }
  emit(c, shapes);
};

export const generate = { 'gen.particles': genParticles, 'gen.shatter': genShatter, 'gen.ripple': genRipple, 'gen.trace': genTrace, 'gen.link': genLink } satisfies Record<string, Recipe>;
