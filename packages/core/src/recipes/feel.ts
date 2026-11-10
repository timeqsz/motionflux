import { filter, type Recipe } from './context.js';
import { ghosts } from './choreo.js';

/**
 * Looks laid over the subject. They read the motion the other recipes produce but never change it,
 * so a trail or a motion blur follows whatever the subject does.
 */
export const feelTrail: Recipe = (c) => {
  const count = c.n('count'); const strength = c.n('strength');
  ghosts(c, count, c.n('gapFrames'), (k) => ({ opacity: strength * (1 - k / (count + 1)), scale: 1 }));
};
export const feelMotionBlur: Recipe = (c) => {
  // Smear along the path travelled while the shutter was open; a 360° shutter spans one whole frame.
  const shutter = c.n('shutterDeg') / 360; const now = c.pastPosition(0); const before = c.pastPosition(shutter);
  const dx = now[0] - before[0]; const dy = now[1] - before[1]; const length = Math.hypot(dx, dy);
  if (length > 0.5) c.state.filters.push(filter('directional', { radius: length, angle: Math.atan2(dy, dx) * 180 / Math.PI }));
};
export const feelGlow: Recipe = (c) => { c.state.filters.push(filter('glow', { radius: c.n('radiusPx'), amount: c.n('strength') })); };
export const feelGrain: Recipe = (c) => {
  c.state.filters.push(filter('grain', { amount: c.n('amount'), scale: c.n('sizePx'), phase: Math.floor(c.seconds * c.n('rateHz')), seed: c.seed }));
};
export const feelGlitch: Recipe = (c) => {
  c.state.filters.push(filter('glitch', { radius: c.n('offsetPx'), scale: c.n('bandPx'), amount: c.n('chance'), phase: Math.floor(c.seconds * c.n('rateHz')), seed: c.seed }));
};
export const feelChroma: Recipe = (c) => { c.state.filters.push(filter('split', { radius: c.n('offsetPx'), angle: c.n('angleDeg') })); };

export const feel = { 'feel.trail': feelTrail, 'feel.motion-blur': feelMotionBlur, 'feel.glow': feelGlow, 'feel.grain': feelGrain, 'feel.glitch': feelGlitch, 'feel.chroma': feelChroma } satisfies Record<string, Recipe>;
