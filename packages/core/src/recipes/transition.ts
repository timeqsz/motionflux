import { clamp } from '../math.js';
import { filter, shown, staggered, type Recipe } from './context.js';
import type { Piece, Region } from '../types.js';

/**
 * Transitions show or hide the subject through regions of its own bounding box, so they work the same on text
 * and outlines. `in` runs from hidden to shown; `out` plays the same picture from shown to hidden.
 * An empty piece list draws nothing; no pieces at all draws the whole subject.
 */
const through = (regions: Region[], extra: Partial<Piece> = {}): Piece => ({ regions, offset: [0, 0], opacity: 1, ...extra });
export const transitionWipe: Recipe = (c) => {
  const value = shown(c);
  c.state.pieces = value >= 1 ? undefined : value <= 0 ? [] : [through([{ kind: 'half', angle: c.n('angleDeg'), at: value }])];
};
export const transitionIris: Recipe = (c) => {
  const value = shown(c);
  c.state.pieces = value >= 1 ? undefined : value <= 0 ? [] : [through([{ kind: 'circle', cx: c.n('centerX'), cy: c.n('centerY'), r: value }])];
};
export const transitionSlices: Recipe = (c) => {
  // Strips slide along the slicing direction, neighbours from opposite sides, each fading as it travels.
  const count = c.n('count'); const out = c.s('mode') === 'out'; const pieces: Piece[] = [];
  for (let j = 0; j < count; j++) {
    const eased = c.ease(staggered(c.progress, j, count, c.n('staggerRatio')));
    const value = out ? 1 - eased : eased; const travel = (out ? eased : 1 - eased) * c.n('distancePx') * (j % 2 ? 1 : -1) * (out ? -1 : 1);
    if (value > 0.001) pieces.push(through([{ kind: 'band', angle: 90, from: j / count, to: (j + 1) / count }], { offset: [travel, 0], opacity: clamp(value) }));
  }
  c.state.pieces = pieces;
};
export const transitionBlinds: Recipe = (c) => {
  const open = clamp(shown(c)); const count = c.n('count'); const angle = c.n('angleDeg') + 90;
  c.state.pieces = open >= 1 ? undefined : open <= 0 ? [] : [through(Array.from({ length: count }, (_, j): Region =>
    ({ kind: 'band', angle, from: (j + 0.5 - open / 2) / count, to: (j + 0.5 + open / 2) / count })))];
};
export const transitionFlip: Recipe = (c) => {
  // Shown means facing the viewer; the turn ends there however many half-turns pass on the way.
  const turn = (1 - shown(c)) * c.n('turns') * Math.PI * 2;
  c.state.stretch[c.s('axis') === 'y' ? 0 : 1] *= Math.cos(turn);
};
export const transitionPush: Recipe = (c) => {
  // Content travels one box length through its own box: in from behind the direction, out ahead of it.
  const eased = c.ease(c.progress); const angle = c.n('angleDeg') * Math.PI / 180; const along = c.s('mode') === 'out' ? eased : eased - 1;
  // Adding 0 turns a negative zero into a plain one, so a straight push has no stray sign on its other axis.
  c.state.pieces = along === 0 ? undefined : [{ regions: [{ kind: 'box' }], offset: [0, 0], shift: [Math.cos(angle) * along + 0, Math.sin(angle) * along + 0], opacity: 1 }];
};
export const transitionDissolve: Recipe = (c) => {
  const value = shown(c);
  if (value <= 0) c.state.pieces = [];
  else if (value < 1) c.state.filters.push(filter('dissolve', { amount: value, scale: c.n('grainPx'), seed: c.seed }));
};

export const transition = { 'transition.wipe': transitionWipe, 'transition.iris': transitionIris, 'transition.slices': transitionSlices, 'transition.blinds': transitionBlinds,
  'transition.flip': transitionFlip, 'transition.push': transitionPush, 'transition.dissolve': transitionDissolve } satisfies Record<string, Recipe>;
