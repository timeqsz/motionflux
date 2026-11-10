import { cubicBezier } from '../math.js';
import type { Curve, Recipe } from './context.js';

/**
 * Timing curves. Each maps progress 0…1 to a value that starts at 0 and ends exactly at 1; in between it may
 * overshoot, dip below 0 or hold. The curve applies to property clips on the same node that start within the
 * timing clip's span, so one node can enter on a spring and leave on an ease.
 */
const finish = (curve: Curve): Curve => (t) => t <= 0 ? 0 : t >= 1 ? 1 : curve(t);
export const timingEase: Recipe = (c) => {
  const power = c.n('power'); const mode = c.s('mode');
  c.setCurve(finish(mode === 'in' ? (t) => t ** power : mode === 'out' ? (t) => 1 - (1 - t) ** power
    : (t) => t < 0.5 ? 2 ** (power - 1) * t ** power : 1 - (2 - 2 * t) ** power / 2));
};
export const timingSpring: Recipe = (c) => {
  // The (1 − t)² envelope lands the oscillation exactly on 1 at the end of the clip.
  const oscillations = c.n('oscillations'); const damping = c.n('damping');
  c.setCurve(finish((t) => 1 - (1 - t) ** 2 * Math.exp(-damping * t) * Math.cos(t * oscillations * Math.PI * 2)));
};
export const timingBounce: Recipe = (c) => {
  // A fall, then bounces whose heights shrink by `decay`. Each arc lasts as long as a real throw to that height.
  const heights = Array.from({ length: c.n('bounces') }, (_, k) => c.n('decay') ** (k + 1));
  const total = 1 + heights.reduce((sum, height) => sum + 2 * Math.sqrt(height), 0);
  c.setCurve(finish((t) => {
    let time = t * total;
    if (time < 1) return time * time;
    time -= 1;
    for (const height of heights) {
      const half = Math.sqrt(height);
      if (time < 2 * half) return 1 - height + (time - half) ** 2;
      time -= 2 * half;
    }
    return 1;
  }));
};
export const timingOvershoot: Recipe = (c) => {
  const tension = c.n('tension');
  c.setCurve(finish((t) => 1 + (tension + 1) * (t - 1) ** 3 + tension * (t - 1) ** 2));
};
export const timingAnticipate: Recipe = (c) => {
  const amount = c.n('amount');
  c.setCurve(finish((t) => cubicBezier(0.45, -2.2 * amount, 0.25, 1, t)));
};
export const timingSteps: Recipe = (c) => {
  const steps = c.n('steps');
  c.setCurve(finish((t) => Math.floor(t * steps) / steps));
};

export const timing = { 'timing.ease': timingEase, 'timing.spring': timingSpring, 'timing.bounce': timingBounce, 'timing.overshoot': timingOvershoot,
  'timing.anticipate': timingAnticipate, 'timing.steps': timingSteps } satisfies Record<string, Recipe>;
