import { clamp, hashId, lerp, smooth } from './math.js';
import { slice } from './geometry.js';
import { single, type Copy, type Curve, type NodeState, type Recipe } from './recipes/context.js';
import type { Filter, Layer, Line, MotionSpec, PathNode, Piece, TextNode, Vec2 } from './types.js';

/**
 * One atom used on its own, outside a scene: the host supplies the frame and the subject, and gets back plain
 * numbers and shapes to apply or draw however it likes. Inside a scene the same recipe runs through compileScene,
 * so both routes give the same values for the same seed, subject ID and clip timing.
 */
export type AtomParameter =
  | { type: 'number'; title: string; minimum: number; maximum: number; default: number; unit: string; integer?: boolean }
  | { type: 'string'; title: string; enum: readonly string[]; labels?: readonly string[]; default: string }
  | { type: 'color'; title: string; default: string };
export interface AtomMeta {
  id: string; title: string; english: string; description: string;
  role: 'property' | 'timing' | 'loop' | 'layout' | 'order' | 'feel' | 'overlay';
  targets: readonly ('text' | 'path')[]; writes: readonly string[]; params: Record<string, AtomParameter>;
}
export interface AtomInput {
  /** Frame on the host timeline; fractions are allowed. */
  frame: number;
  /** Frames the atom lasts. Before `startFrame` it holds its first state, afterwards its last. */
  durationFrames: number;
  /** Host frame at which the atom starts. Default 0. */
  startFrame?: number;
  /** Frames per second, used by parameters given in Hz or seconds. Default 30. */
  fps?: number;
  /** Any subset of the atom's parameters; the rest take their defaults. */
  params?: Record<string, number | string>;
  /** What the atom acts on. Geometry atoms read the outline; text atoms read the text; property atoms need nothing. */
  subject?: { points?: Vec2[]; closed?: boolean; fill?: boolean; strokeWidth?: number; text?: string; lineHeight?: number; color?: string };
  /** A timing curve for property atoms, for example `(t) => springAtom({ frame: t, durationFrames: 1 }).value`. Default: smooth in and out. */
  ease?: Curve;
  /**
   * Points the atom reads instead of a scene: order atoms (stagger, cascade, shuffle) delay one item per point;
   * link connects them; trace draws them as the path travelled, oldest first; motion blur reads
   * `[where the subject was one frame ago, where it is now]`.
   */
  items?: Vec2[];
  /** Fixes every random and noise value. Default 0. */
  seed?: number;
  /** Tells apart several subjects that share a seed. Default "subject". */
  id?: string;
}
export interface AtomCopy { slot: number; offset: Vec2; rotation: number; scale: number; flip: Vec2; delay: number; opacity: number; ghost: number }
export interface AtomOutput {
  /** 0…1 through the atom at this frame. */
  progress: number;
  /** Offset in pixels to add to the subject's own position. */
  position: Vec2;
  /** Degrees clockwise about the subject's origin. */
  rotation: number;
  /** Uniform scale about the subject's origin. */
  scale: number;
  /** Extra horizontal and vertical scale after `scale`; a flip squeezes one of them through zero. */
  stretch: Vec2;
  /** 0…1. */
  opacity: number;
  /** Ink colour, when the atom changes it. */
  color?: string;
  /** For an outline subject: what to draw, in pixels relative to the subject's origin, before the transform above. */
  layers?: Layer[];
  /** For a text subject: each line's text, vertical offset in pixels, opacity and optional per-character offsets. */
  lines?: Line[];
  /** Draw only these parts of the subject; an empty list draws nothing. Regions are fractions of the subject's box. */
  pieces?: Piece[];
  /** Pixel filters to run over the drawn subject, in order. */
  filters?: Filter[];
  /** Timing atoms: the curve's value at this frame, 0 at the start and exactly 1 at the end. */
  value?: number;
  /** Layout and order atoms: where to draw each copy and how many frames it runs behind. Trailing ghosts first. */
  copies?: AtomCopy[];
}
export type Atom = ((input: AtomInput) => AtomOutput) & { meta: AtomMeta };

export function createAtom(meta: AtomMeta, recipe: Recipe): Atom {
  const evaluate = (input: AtomInput): AtomOutput => {
    if (!Number.isFinite(input.frame)) throw new RangeError(`${meta.id}: frame must be a finite number.`);
    if (!(input.durationFrames > 0)) throw new RangeError(`${meta.id}: durationFrames must be greater than 0.`);
    const params: Record<string, number | string> = {};
    for (const [key, parameter] of Object.entries(meta.params)) {
      const value = input.params?.[key] ?? parameter.default;
      if (parameter.type === 'number') {
        if (typeof value !== 'number' || !Number.isFinite(value) || value < parameter.minimum || value > parameter.maximum || (parameter.integer && !Number.isInteger(value)))
          throw new RangeError(`${meta.id}: ${key} must be ${parameter.integer ? 'a whole number' : 'a number'} from ${parameter.minimum} to ${parameter.maximum} (${parameter.unit}); got ${String(value)}.`);
      } else if (parameter.type === 'color') {
        if (typeof value !== 'string' || !/^#[0-9a-fA-F]{6}$/u.test(value)) throw new RangeError(`${meta.id}: ${key} must be a #RRGGBB colour; got ${String(value)}.`);
      } else if (!parameter.enum.includes(String(value))) throw new RangeError(`${meta.id}: ${key} must be one of ${parameter.enum.join(', ')}; got ${String(value)}.`);
      params[key] = value;
    }
    for (const key of Object.keys(input.params ?? {})) if (!(key in meta.params)) throw new TypeError(`${meta.id}: unknown parameter ${key}. It takes ${Object.keys(meta.params).join(', ')}.`);
    const subject = input.subject ?? {};
    const asText = meta.targets.includes('text') && (subject.text !== undefined || !meta.targets.includes('path'));
    if (asText && subject.text === undefined) throw new TypeError(`${meta.id}: acts on text; pass subject.text.`);
    const items = input.items ?? [];
    if (meta.role === 'order' && !items.length) throw new TypeError(`${meta.id}: orders several things; pass items, one position per thing.`);
    const id = input.id ?? 'subject'; const fps = input.fps ?? 30; const start = input.startFrame ?? 0;
    const color = subject.color ?? '#ffffff';
    const node: TextNode | PathNode = asText
      ? { id, type: 'text', position: [0, 0], color, text: subject.text!, font: 'font', fontSize: 1, lineHeight: subject.lineHeight ?? 0 }
      : { id, type: 'path', position: [0, 0], color, points: subject.points ?? [[-1, 0], [1, 0]], strokeWidth: subject.strokeWidth ?? 4,
        ...(subject.closed ? { closed: true } : {}), ...(subject.fill ? { fill: true } : {}) };
    const scene = { seed: input.seed ?? 0, fps: { numerator: fps, denominator: 1 } } as MotionSpec;
    const clip = { id: 'effect', target: id, recipe: meta.id, startFrame: start, durationFrames: input.durationFrames, fillAfter: 'hold', params } as MotionSpec['clips'][number];
    const state: NodeState = { position: [0, 0], rotation: 0, scale: 1, opacity: 1, stretch: [1, 1], color, trimStart: 0, trim: 1, filters: [],
      lines: node.type === 'text' ? node.text.split('\n').map((text, i) => ({ text, y: i * node.lineHeight, opacity: 1 })) : [] };
    const copies: Copy[] = meta.role === 'order' ? items.map((point, slot): Copy => ({ ...single(), slot, slots: items.length, offset: [point[0], point[1]] })) : [single()];
    let curve: Curve = smooth;
    const elapsed = clamp(input.frame - start, 0, input.durationFrames); const progress = elapsed / input.durationFrames;
    recipe({ scene, node, clip, state, elapsed, local: input.frame - start, progress, seconds: elapsed / fps,
      duration: input.durationFrames, seed: hashId(scene.seed, `${id}:${clip.id}`), n: (key) => Number(params[key]), s: (key) => String(params[key]),
      ease: input.ease ?? smooth, copy: copies[0]!, copies, setCurve: (next) => { curve = next; },
      pastPosition: (frames) => items.length >= 2 ? [lerp(items[1]![0], items[0]![0], frames), lerp(items[1]![1], items[0]![1], frames)] : [0, 0],
      // Asked for one sample per copy, the items are the copies' current places; asked for a path, they are that path.
      history: (_, samples) => samples === 1 ? items.map((point) => [point]) : [items] });
    const output: AtomOutput = { progress, position: state.position, rotation: state.rotation, scale: state.scale, stretch: state.stretch, opacity: state.opacity };
    if (meta.role === 'timing') output.value = curve(progress);
    if (meta.role === 'layout' || meta.role === 'order') output.copies = [...copies].sort((a, b) => b.ghost - a.ghost)
      .map(({ slot, offset, rotation, scale, flip, delay, opacity, ghost }) => ({ slot, offset, rotation, scale, flip, delay, opacity, ghost }));
    if (meta.writes.includes('color')) output.color = state.color;
    if (state.pieces) output.pieces = state.pieces;
    if (state.filters.length) output.filters = state.filters;
    if (meta.role === 'timing' || meta.role === 'layout' || meta.role === 'order') return output;
    if (node.type === 'text') output.lines = state.lines;
    else if (meta.role === 'overlay') output.layers = state.layers ?? [];
    else {
      const whole = state.trimStart <= 0 && state.trim >= 1;
      const visible = whole ? node.points : slice(node.points, Boolean(node.closed), state.trimStart, state.trim);
      output.layers = state.layers ?? [{ blend: 'normal', filters: [], shapes: visible.length >= 2
        ? [{ paths: [visible], closed: Boolean(node.closed) && whole, fill: Boolean(node.fill) && whole, strokeWidth: node.strokeWidth, opacity: 1 }] : [] }];
    }
    return output;
  };
  return Object.assign(evaluate, { meta });
}
