import { assertScene } from './validate.js';
import { getCapability, type Role } from '../../catalog/src/index.js';
import { clamp, hashId, smooth } from './math.js';
import { slice } from './geometry.js';
import { recipes, type Copy, type Curve, type NodeState, type Recipe, type RecipeContext } from './recipes/index.js';
import { single } from './recipes/context.js';
import { canContinueScene } from './playback.js';
import type { Clip, EvaluatedFrame, MotionSpec, OverlayFrame, PathFrame, SceneNode, TextFrame, Vec2 } from './types.js';
export * from './types.js';
export * from './playback.js';
export * from './validate.js';
export * from './math.js';
export * from './geometry.js';
export { applyFilter, filterReach, type Mask } from './raster.js';
export { createAtom, type Atom, type AtomInput, type AtomMeta, type AtomOutput } from './atom.js';
export { motionSchema } from './schema.js';
export type { Copy } from './recipes/index.js';
export const ENGINE_VERSION = '0.4.0';
export const ALGORITHM_VERSION = 'value-noise-fnv-mix-v1';
export interface CompiledScene {
  readonly spec: MotionSpec;
  /** Continuous evaluation is limited to scenes made only of ongoing and timeless recipes. Raw frame capture stays bounded. */
  evaluate(frame: number, options?: { continuous?: boolean }): EvaluatedFrame;
  /** The copies a node is drawn as and how many frames each runs behind; they do not change over time. */
  copies(nodeId: string): readonly Copy[];
}
interface Plan { clip: Clip; recipe: Recipe; role: Role; rivals: Clip[] }
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
const noCopies: Copy[] = [];
export const freshState = (node: SceneNode): NodeState => ({ position: [0, 0], rotation: 0, scale: 1, opacity: 1, stretch: [1, 1], color: node.color, trimStart: 0, trim: 1, filters: [],
  lines: node.type === 'text' ? node.text.split('\n').map((text, i) => ({ text, y: i * node.lineHeight, opacity: 1 })) : [] });
/** Where a copy's origin sits in the scene for a given state. Mirrored copies move mirrored. */
export function placeOf(node: SceneNode, copy: Copy, state: NodeState): Vec2 {
  const angle = copy.rotation * Math.PI / 180; const x = copy.flip[0] * state.position[0]; const y = copy.flip[1] * state.position[1];
  return [node.position[0] + copy.offset[0] + x * Math.cos(angle) - y * Math.sin(angle), node.position[1] + copy.offset[1] + x * Math.sin(angle) + y * Math.cos(angle)];
}
/** Turn one copy's state into a drawable frame. */
export function finishFrame(node: SceneNode, copy: Copy, index: number, state: NodeState): TextFrame | PathFrame {
  const common = { position: placeOf(node, copy, state), rotation: copy.rotation + copy.flip[0] * copy.flip[1] * state.rotation, scale: copy.scale * state.scale,
    stretch: [state.stretch[0] * copy.flip[0], state.stretch[1] * copy.flip[1]] as Vec2, opacity: clamp(copy.opacity * state.opacity), color: state.color,
    filters: state.filters, copy: index, ...(state.pieces ? { pieces: state.pieces } : {}) };
  if (node.type === 'text') return { ...node, ...common, lines: state.lines };
  const whole = state.trimStart <= 0 && state.trim >= 1;
  const visiblePoints = whole ? node.points.map((point): Vec2 => [...point]) : slice(node.points, Boolean(node.closed), state.trimStart, state.trim);
  // Without a geometry recipe the node draws its own, possibly trimmed, outline.
  const layers = state.layers ?? [{ blend: 'normal' as const, filters: [], shapes: visiblePoints.length >= 2
    ? [{ paths: [visiblePoints], closed: Boolean(node.closed) && whole, fill: Boolean(node.fill) && whole, strokeWidth: node.strokeWidth, opacity: 1 }] : [] }];
  return { ...node, ...common, points: node.points.map((point): Vec2 => [...point]), visiblePoints, layers };
}

export function compileScene(input: unknown): CompiledScene {
  assertScene(input);
  const scene = freeze(structuredClone(input));
  const secondsPerFrame = scene.fps.denominator / scene.fps.numerator;
  // Property clips on one node that write a common property take turns. For each, list the ones it takes turns with.
  const plans = new Map<string, Plan[]>();
  for (const clip of scene.clips) {
    const entry = getCapability(clip.recipe)!;
    const rivals = entry.role !== 'property' ? [] : scene.clips.filter((other) => other !== clip && other.target === clip.target
      && getCapability(other.recipe)!.role === 'property' && getCapability(other.recipe)!.writes.some((property) => entry.writes.includes(property)));
    plans.set(clip.target, [...plans.get(clip.target) ?? [], { clip, recipe: recipes[clip.recipe], role: entry.role, rivals }]);
  }

  const contextFor = (node: SceneNode, continuous: boolean) => (plan: Plan, at: number, state: NodeState, copy: Copy, extra: Partial<RecipeContext> = {}): RecipeContext => {
    const { clip } = plan; const duration = clip.durationFrames;
    const elapsed = continuous ? Math.max(0, at - clip.startFrame) : clamp(at - clip.startFrame, 0, duration);
    return { scene, node, clip, state, elapsed, local: at - clip.startFrame, progress: elapsed / duration, seconds: elapsed * secondsPerFrame, duration,
      seed: hashId(scene.seed, `${node.id}:${clip.id}`), n: (key) => Number(clip.params[key]), s: (key) => String(clip.params[key]),
      ease: smooth, copy, copies: noCopies, setCurve: () => {}, pastPosition: () => placeOf(node, copy, state), history: () => [], ...extra };
  };
  /** Structure first: layouts make copies, then orders delay them. Ghosts are drawn beneath their leaders. */
  function arrange(node: SceneNode, time: number, context: ReturnType<typeof contextFor>): Copy[] {
    const copies = [single()];
    for (const role of ['layout', 'order'] as const) for (const plan of plans.get(node.id) ?? []) if (plan.role === role) plan.recipe(context(plan, time, freshState(node), copies[0]!, { copies }));
    return copies.sort((a, b) => b.ghost - a.ghost);
  }

  function evaluateNode(node: SceneNode, time: number, continuous: boolean): (TextFrame | PathFrame | OverlayFrame)[] {
    const nodePlans = plans.get(node.id) ?? [];
    const context = contextFor(node, continuous);
    const copies = arrange(node, time, context);
    const curves = nodePlans.filter((plan) => plan.role === 'timing').map((plan) => {
      let curve: Curve = smooth;
      plan.recipe(context(plan, time, freshState(node), single(), { setCurve: (next) => { curve = next; } }));
      return { start: plan.clip.startFrame, end: plan.clip.startFrame + plan.clip.durationFrames, curve };
    });
    const ease = (clip: Clip): Curve => curves.find((entry) => clip.startFrame >= entry.start && clip.startFrame < entry.end)?.curve ?? smooth;
    const stateAt = (copy: Copy, at: number, withFeel: boolean): NodeState => {
      const state = freshState(node);
      for (const plan of nodePlans) {
        if (plan.role !== 'property' && plan.role !== 'loop' && !(withFeel && plan.role === 'feel')) continue;
        // Of the clips taking turns, the latest one that has started is in effect; before any starts, the earliest is.
        const started = plan.clip.startFrame <= at;
        if (plan.rivals.some((other) => started ? other.startFrame <= at && other.startFrame > plan.clip.startFrame : other.startFrame < plan.clip.startFrame)) continue;
        plan.recipe(context(plan, at, state, copy, { ease: ease(plan.clip), pastPosition: (frames) => placeOf(node, copy, stateAt(copy, at - frames, false)) }));
      }
      return state;
    };
    const frames: (TextFrame | PathFrame | OverlayFrame)[] = [];
    for (const plan of nodePlans) {
      if (plan.role !== 'overlay') continue;
      const state = freshState(node);
      plan.recipe(context(plan, time, state, single(), { history: (length, samples) => copies.filter((copy) => copy.ghost === 0).map((copy) =>
        Array.from({ length: samples }, (_, i) => placeOf(node, copy, stateAt(copy, time - copy.delay - length * (samples > 1 ? 1 - i / (samples - 1) : 0), false)))) }));
      frames.push({ type: 'overlay', id: `${node.id}:${plan.clip.id}`, color: node.color, layers: state.layers ?? [] });
    }
    copies.forEach((copy, index) => frames.push(finishFrame(node, copy, index, stateAt(copy, time - copy.delay, true))));
    return frames;
  }

  return Object.freeze({
    spec: scene,
    evaluate(frame: number, options?: { continuous?: boolean }): EvaluatedFrame {
      if (!Number.isFinite(frame)) throw new RangeError('Frame must be finite.');
      const continuous = Boolean(options?.continuous);
      if (continuous && !canContinueScene(scene)) throw new RangeError('Continuous time requires a scene made only of ongoing and timeless recipes.');
      // Evaluation permits subframes and clamps outside the scene to its boundary.
      const sampled = continuous ? Math.max(0, frame) : clamp(frame, 0, scene.durationFrames);
      return { frame: sampled, timeSeconds: sampled * scene.fps.denominator / scene.fps.numerator, nodes: scene.nodes.flatMap((node) => evaluateNode(node, sampled, continuous)) };
    },
    copies(nodeId: string): readonly Copy[] {
      const node = scene.nodes.find((item) => item.id === nodeId);
      if (!node) throw new RangeError(`No node ${nodeId}.`);
      return arrange(node, 0, contextFor(node, false)).map((copy) => ({ ...copy, offset: [...copy.offset], flip: [...copy.flip] }));
    },
  });
}
