import { hashId, noise, rand, TAU } from '../math.js';
import type { Recipe } from './context.js';

/**
 * Ongoing motion, layered over whatever the properties are doing. Every value is a closed form of time with
 * zero offset at the start, so any frame can be evaluated directly and the subject begins where it was placed.
 */
export const loopBreathe: Recipe = (c) => { c.state.scale *= 1 + c.n('amount') * Math.sin(TAU * c.seconds / c.n('periodS')); };
export const loopSwing: Recipe = (c) => {
  const value = c.n('amount') * Math.sin(TAU * c.seconds / c.n('periodS')); const axis = c.s('axis');
  if (axis === 'rotate') c.state.rotation += value; else c.state.position[axis === 'x' ? 0 : 1] += value;
};
export const loopFloat: Recipe = (c) => {
  const time = c.seconds * c.n('frequencyHz');
  // Subtract the origin so the clip begins exactly at the declared position. Each copy drifts on its own.
  for (const axis of [0, 1] as const) {
    const seed = hashId(c.scene.seed, `${c.node.id}:${c.clip.id}:${c.copy.slot}:${axis}`);
    c.state.position[axis] += (noise(seed, time) - noise(seed, 0)) * c.n('amplitudePx') / 2;
  }
  const seed = hashId(c.scene.seed, `${c.node.id}:${c.clip.id}:${c.copy.slot}:r`);
  c.state.rotation += (noise(seed, time * 0.8) - noise(seed, 0)) * c.n('rotateDeg') / 2;
};
export const loopSpin: Recipe = (c) => { c.state.rotation += 360 * c.n('turnsPerSecond') * c.seconds; };
export const loopFlicker: Recipe = (c) => {
  // Held random states; step 0 is always lit so the clip starts as placed.
  const step = Math.floor(c.seconds * c.n('rateHz'));
  if (step > 0 && rand(c.seed, step, c.copy.slot) < c.n('chance')) c.state.opacity *= c.n('low');
};
export const loopWave: Recipe = (c) => {
  // The crest travels from the first copy to the last; a lone subject just bobs. Copies start at their places
  // on the wave rather than all at rest, so the row reads as one wave from the first frame.
  c.state.position[1] -= c.n('amplitudePx') * Math.sin(TAU * c.seconds / c.n('periodS') - c.copy.slot * c.n('phaseDeg') * Math.PI / 180);
};

export const loop = { 'loop.breathe': loopBreathe, 'loop.swing': loopSwing, 'loop.float': loopFloat, 'loop.spin': loopSpin, 'loop.flicker': loopFlicker, 'loop.wave': loopWave } satisfies Record<string, Recipe>;
