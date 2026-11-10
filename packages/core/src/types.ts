import type { RecipeId } from '../../catalog/src/index.js';
export type Vec2 = [number, number];
export interface FontAsset {
  type: 'font'; src: string; sha256: string; family: string; postscriptName: string;
}
interface BaseNode { id: string; position: Vec2; color: string }
export interface TextNode extends BaseNode {
  /** `system` and `mono` use the device's sans-serif or monospace font without an asset; other values reference assets. */
  type: 'text'; text: string; font: string; fontSize: number; lineHeight: number;
}
export interface PathNode extends BaseNode {
  type: 'path'; points: Vec2[]; strokeWidth: number;
  /** Join the last point back to the first. Defaults to an open polyline. */
  closed?: boolean;
  /** Fill the outline with the node color instead of stroking it. Defaults to a stroke. */
  fill?: boolean;
}
export type SceneNode = TextNode | PathNode;
export interface Clip {
  id: string; target: string; recipe: RecipeId; startFrame: number; durationFrames: number;
  fillAfter: 'hold'; params: Record<string, number | string>;
}
export interface MotionSpec {
  specVersion: '0.1'; seed: number;
  canvas: { width: number; height: number; background: string };
  fps: { numerator: number; denominator: number }; durationFrames: number;
  assets: Record<string, FontAsset>; nodes: SceneNode[]; clips: Clip[];
}
export interface Issue { path: string; code: string; message: string }
/** One draw call in node-local pixels. `paths` share a single fill or stroke, so overlaps do not double their opacity. */
export interface Shape {
  paths: Vec2[][]; closed: boolean; fill: boolean; strokeWidth: number; opacity: number;
  /** Union of closed polygons, node-local, that bounds where this shape may draw. */
  clip?: Vec2[][];
}
export type FilterType = 'blur' | 'glow' | 'grain' | 'dissolve' | 'glitch' | 'directional' | 'split';
/**
 * A coverage filter. radius and scale are scene px, amount is a ratio, angle is degrees, phase is unitless evolution.
 * `split` is special: it turns the coverage into a red, an ink and a cyan copy, `radius` px apart along `angle`.
 */
export interface Filter { type: FilterType; radius: number; amount: number; scale: number; angle: number; phase: number; seed: number }
/** Shapes rendered together. `add` sums coverage, which turns equal-weight samples into a true average. */
export interface Layer { shapes: Shape[]; filters: Filter[]; blend: 'normal' | 'add' }
/**
 * A region of a subject, measured against the subject's own bounding box so it works for text as well as outlines.
 * Ratios run 0…1 across the box. `half` and `band` measure along `angle` (degrees, 0 = left to right).
 * A circle's `r` is relative to the distance from its centre to the farthest corner, so 1 always covers the box.
 */
export type Region =
  | { kind: 'box' }
  | { kind: 'half'; angle: number; at: number }
  | { kind: 'band'; angle: number; from: number; to: number }
  | { kind: 'circle'; cx: number; cy: number; r: number }
  | { kind: 'inset'; left: number; top: number; right: number; bottom: number };
/**
 * Draw the subject through the union of `regions`, then move the drawing by `offset` px plus `shift` box sizes
 * (node-local). Regions stay where they are, so a shifted piece slides through its window.
 */
export interface Piece { regions: Region[]; offset: Vec2; shift?: Vec2; opacity: number }
export interface Glyph { dx: number; dy: number; opacity: number; scale: number }
export interface Line { text: string; y: number; opacity: number; glyphs?: Glyph[] }
interface FrameTransform {
  rotation: number; scale: number; opacity: number;
  /** Extra non-uniform scale applied after `scale`; negative values mirror. */
  stretch: Vec2;
  /** Draw only these pieces of the subject; absent means the whole subject. */
  pieces?: Piece[];
  /** Pixel filters over the whole subject, in order. */
  filters: Filter[];
  /** Index of this copy within the node's copies; 0 when the node is not repeated. */
  copy: number;
}
export type TextFrame = TextNode & FrameTransform & { lines: Line[] };
export type PathFrame = PathNode & FrameTransform & { visiblePoints: Vec2[]; layers: Layer[] };
/** Lines in scene coordinates, drawn beneath the node they belong to. */
export interface OverlayFrame { type: 'overlay'; id: string; color: string; layers: Layer[] }
export interface EvaluatedFrame { frame: number; timeSeconds: number; nodes: (TextFrame | PathFrame | OverlayFrame)[] }
