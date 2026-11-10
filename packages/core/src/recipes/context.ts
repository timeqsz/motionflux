import type { Clip, Filter, FilterType, Layer, Line, MotionSpec, PathNode, Piece, SceneNode, Shape, Vec2 } from '../types.js';
import type { Path } from '../geometry.js';
/** Mutable per-copy state for one evaluated frame. Recipes write only what their catalog entry declares. */
export interface NodeState {
  /** Offset from the node position, before the copy's own placement. */
  position: Vec2; rotation: number; scale: number; opacity: number; stretch: Vec2; color: string;
  /** Visible arc-length window of the outline. */
  trimStart: number; trim: number;
  lines: Line[]; layers?: Layer[]; pieces?: Piece[] | undefined; filters: Filter[];
}
/** One drawn instance of a node. Layout recipes make more; order recipes delay them. */
export interface Copy {
  /** Position in the layout and how many there are; trailing ghosts share their leader's slot. */
  slot: number; slots: number;
  offset: Vec2; rotation: number; scale: number;
  /** -1 mirrors motion and drawing on that axis. */
  flip: Vec2;
  /** Frames this copy runs behind the scene clock. */
  delay: number; opacity: number;
  /** 0 for a real copy; trailing ghosts count up from 1 and are drawn first. */
  ghost: number;
}
export type Curve = (t: number) => number;
export interface RecipeContext {
  scene: MotionSpec; node: SceneNode; clip: Clip; state: NodeState;
  /** Frames since the clip started, clamped for raw evaluation; unbounded only for explicit continuous previews. */
  elapsed: number;
  /** Frames since the clip started, not clamped: negative before it and beyond `duration` after it. */
  local: number;
  /** elapsed / duration, 0…1 for raw frames; can exceed 1 for ongoing previews. */
  progress: number;
  /** elapsed in seconds at the scene frame rate. */
  seconds: number;
  /** Clip length in frames. */
  duration: number;
  /** Stable hash of scene seed, node ID and clip ID. */
  seed: number;
  n(key: string): number; s(key: string): string;
  /** The timing curve in effect for this clip: a timing recipe's, or a smooth ease in and out. */
  ease: Curve;
  /** The copy being evaluated. */
  copy: Copy;
  /** All copies of the node. Layout recipes replace them; order recipes set their delays. */
  copies: Copy[];
  /** Timing recipes hand their curve over here. */
  setCurve(curve: Curve): void;
  /** Where this copy's origin was `frames` ago, in scene px, ignoring feel recipes. */
  pastPosition(frames: number): Vec2;
  /** Overlay recipes: for every real copy, its origin over the last `frames` frames, oldest first, in scene px. */
  history(frames: number, samples: number): Vec2[][];
}
export type Recipe = (c: RecipeContext) => void;
// Geometry recipes only target path nodes; validation enforces it before evaluation.
const pathNode = (c: RecipeContext) => c.node as PathNode;
/** A fresh copy of the node outline in node-local pixels. */
export const base = (c: RecipeContext): Path => pathNode(c).points.map((point): Vec2 => [point[0], point[1]]);
export const isClosed = (c: RecipeContext): boolean => Boolean(pathNode(c).closed);
export const strokeOf = (c: RecipeContext): number => pathNode(c).strokeWidth;
export function shape(c: RecipeContext, paths: Path[], options: Partial<Shape> = {}): Shape {
  const node = pathNode(c);
  const result: Shape = { paths, closed: options.closed ?? Boolean(node.closed), fill: options.fill ?? Boolean(node.fill),
    strokeWidth: options.strokeWidth ?? node.strokeWidth, opacity: options.opacity ?? 1 };
  if (options.clip) result.clip = options.clip;
  return result;
}
/** Replace the node's default outline with a layer of shapes. */
export function emit(c: RecipeContext, shapes: Shape[], filters: Filter[] = [], blend: Layer['blend'] = 'normal'): void {
  (c.state.layers ??= []).push({ shapes, filters, blend });
}
export const filter = (type: FilterType, values: Partial<Omit<Filter, 'type'>>): Filter => ({ type, radius: 0, amount: 0, scale: 1, angle: 0, phase: 0, seed: 0, ...values });
/** Progress of item `index` of `count` when starts are spread across `stagger` of the clip. */
export const staggered = (progress: number, index: number, count: number, stagger: number): number =>
  count > 1 ? Math.min(1, Math.max(0, (progress - stagger * index / (count - 1)) / (1 - stagger))) : progress;
/** Transitions run 0 → 1 to appear; `out` runs the same picture backwards so in and out mirror each other. */
export const shown = (c: RecipeContext): number => { const value = c.ease(c.progress); return c.s('mode') === 'out' ? 1 - value : value; };
/** One copy at the node's own place. */
export const single = (): Copy => ({ slot: 0, slots: 1, offset: [0, 0], rotation: 0, scale: 1, flip: [1, 1], delay: 0, opacity: 1, ghost: 0 });
