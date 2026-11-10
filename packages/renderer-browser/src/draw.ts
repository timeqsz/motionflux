import { applyFilter, filterReach } from '../../core/src/raster.js';
import type { AtomOutput } from '../../core/src/atom.js';
import type { Filter, Layer, Line, Piece, Region, Shape, Vec2 } from '../../core/src/types.js';

type Context = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
/** Everything needed to paint one subject: an evaluated node, one copy of it, or an atom's output. */
export interface Subject {
  position: Vec2; rotation: number; scale: number; stretch?: Vec2; opacity: number; color: string;
  layers?: readonly Layer[]; lines?: readonly Line[]; pieces?: readonly Piece[]; filters?: readonly Filter[];
  /** CSS font for text subjects; it must already be loaded. */
  font?: string;
}
interface Box { minX: number; minY: number; width: number; height: number }
const red = [255, 51, 85]; const cyan = [34, 211, 238];

function trace(context: Context, paths: readonly (readonly (readonly [number, number])[])[], closed: boolean): void {
  context.beginPath();
  for (const path of paths) {
    if (path.length < 2) continue;
    context.moveTo(path[0]![0], path[0]![1]);
    for (let i = 1; i < path.length; i++) context.lineTo(path[i]![0], path[i]![1]);
    if (closed) context.closePath();
  }
}
function drawShapes(context: Context, shapes: readonly Shape[], alpha: number): void {
  for (const shape of shapes) {
    context.save();
    if (shape.clip) { trace(context, shape.clip, true); context.clip(); }
    context.globalAlpha = alpha * shape.opacity;
    trace(context, shape.paths, shape.closed);
    if (shape.fill) context.fill(); else { context.lineWidth = shape.strokeWidth; context.stroke(); }
    context.restore();
  }
}
/** Each character sits where the whole line would put it, then moves by its own offset. */
function drawLines(context: Context, lines: readonly Line[], alpha: number): void {
  for (const line of lines) {
    if (!line.glyphs) { context.globalAlpha = alpha * line.opacity; context.fillText(line.text, 0, line.y); continue; }
    let prefix = '';
    [...line.text].forEach((character, i) => {
      const glyph = line.glyphs![i] ?? { dx: 0, dy: 0, opacity: 1, scale: 1 };
      const x = context.measureText(prefix).width; prefix += character;
      if (glyph.opacity <= 0 || glyph.scale <= 0) return;
      context.save(); context.globalAlpha = alpha * line.opacity * glyph.opacity;
      context.translate(x + glyph.dx, line.y + glyph.dy); context.scale(glyph.scale, glyph.scale); context.fillText(character, 0, 0);
      context.restore();
    });
  }
}
/** The subject's own bounding box in its local pixels; regions are measured against it. */
function measure(context: Context, subject: Subject): Box {
  let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
  for (const layer of subject.layers ?? []) for (const shape of layer.shapes) {
    const pad = shape.fill ? 0 : shape.strokeWidth / 2;
    for (const path of shape.paths) for (const [x, y] of path) { minX = Math.min(minX, x - pad); maxX = Math.max(maxX, x + pad); minY = Math.min(minY, y - pad); maxY = Math.max(maxY, y + pad); }
  }
  for (const line of subject.lines ?? []) {
    if (!line.text) continue;
    const metrics = context.measureText(line.text);
    minX = Math.min(minX, -metrics.actualBoundingBoxLeft); maxX = Math.max(maxX, metrics.actualBoundingBoxRight);
    minY = Math.min(minY, line.y - metrics.actualBoundingBoxAscent); maxY = Math.max(maxY, line.y + metrics.actualBoundingBoxDescent);
  }
  if (minX === Infinity) return { minX: 0, minY: 0, width: 0, height: 0 };
  return { minX, minY, width: maxX - minX, height: maxY - minY };
}
/** A region as a polygon in the subject's local pixels. Half-planes and bands reach far past the box. */
function polygonOf(region: Region, box: Box): Vec2[] {
  const { minX, minY, width, height } = box; const cx = minX + width / 2; const cy = minY + height / 2;
  if (region.kind === 'box') return [[minX, minY], [minX + width, minY], [minX + width, minY + height], [minX, minY + height]];
  if (region.kind === 'inset') {
    const l = minX + region.left * width; const r = minX + width * (1 - region.right); const t = minY + region.top * height; const b = minY + height * (1 - region.bottom);
    return r > l && b > t ? [[l, t], [r, t], [r, b], [l, b]] : [];
  }
  if (region.kind === 'circle') {
    const x = minX + region.cx * width; const y = minY + region.cy * height;
    const far = Math.max(...[[minX, minY], [minX + width, minY], [minX, minY + height], [minX + width, minY + height]].map(([px, py]) => Math.hypot(px! - x, py! - y)));
    const radius = region.r * (far + 1);
    return Array.from({ length: 72 }, (_, i): Vec2 => [x + radius * Math.cos(i / 72 * Math.PI * 2), y + radius * Math.sin(i / 72 * Math.PI * 2)]);
  }
  // Positions along the direction run from the box's back edge (0) to its front edge (1).
  const angle = region.angle * Math.PI / 180; const d: Vec2 = [Math.cos(angle), Math.sin(angle)]; const n: Vec2 = [-d[1], d[0]];
  const half = (Math.abs(width * d[0]) + Math.abs(height * d[1])) / 2; const far = Math.hypot(width, height) + 10;
  const at = (ratio: number): Vec2 => [cx + d[0] * (ratio * 2 - 1) * half, cy + d[1] * (ratio * 2 - 1) * half];
  const [from, to] = region.kind === 'half' ? [-far / Math.max(half, 1e-6), region.at] : [region.from, region.to];
  const a = at(from); const b = at(to);
  return [[a[0] + n[0] * far, a[1] + n[1] * far], [b[0] + n[0] * far, b[1] + n[1] * far], [b[0] - n[0] * far, b[1] - n[1] * far], [a[0] - n[0] * far, a[1] - n[1] * far]];
}
/** Paint the subject in local pixels at a relative alpha, through its pieces. */
function body(context: Context, subject: Subject, alpha: number): void {
  const paint = (strength: number) => {
    for (const layer of subject.layers ?? []) drawShapes(context, layer.shapes, strength);
    if (subject.lines) drawLines(context, subject.lines, strength);
  };
  if (!subject.pieces) { paint(alpha); return; }
  const box = measure(context, subject);
  for (const piece of subject.pieces) {
    context.save();
    context.beginPath();
    for (const region of piece.regions) { const polygon = polygonOf(region, box); if (polygon.length) { context.moveTo(...polygon[0]!); polygon.slice(1).forEach((point) => context.lineTo(...point)); context.closePath(); } }
    context.clip();
    context.translate(piece.offset[0] + (piece.shift?.[0] ?? 0) * box.width, piece.offset[1] + (piece.shift?.[1] ?? 0) * box.height);
    paint(alpha * piece.opacity);
    context.restore();
  }
}
// One reusable buffer per canvas size keeps filtered subjects from allocating every frame.
const buffers = new Map<string, { canvas: OffscreenCanvas | HTMLCanvasElement; context: Context }>();
function buffer(width: number, height: number) {
  const key = `${width}x${height}`; let entry = buffers.get(key);
  if (!entry) {
    const canvas = typeof OffscreenCanvas === 'undefined' ? Object.assign(document.createElement('canvas'), { width, height }) : new OffscreenCanvas(width, height);
    entry = { canvas, context: canvas.getContext('2d', { willReadFrequently: true }) as Context };
    buffers.set(key, entry);
  }
  return entry;
}
const rgb = (color: string) => [1, 3, 5].map((start) => parseInt(color.slice(start, start + 2), 16));
/**
 * Paint one subject. The context's transform must be a plain scale of `pixelScale` canvas pixels per scene pixel;
 * filter radii follow it. Unfiltered subjects draw straight onto the context. Filtered ones are drawn alone as
 * coverage, processed, then inked and composited at the subject's opacity.
 */
export function drawSubject(context: Context, subject: Subject, pixelScale = 1): void {
  const stretch = subject.stretch ?? [1, 1];
  if (Math.abs(subject.scale * stretch[0] * stretch[1]) < 1e-9 || subject.opacity <= 0) return;
  const place = (target: Context) => {
    target.translate(...subject.position); target.rotate(subject.rotation * Math.PI / 180);
    target.scale(subject.scale * stretch[0], subject.scale * stretch[1]);
    target.lineCap = 'round'; target.lineJoin = 'round'; target.textBaseline = 'alphabetic'; target.textAlign = 'left';
    if (subject.font) target.font = subject.font;
  };
  const filters = [...(subject.layers ?? []).flatMap((layer) => layer.filters), ...(subject.filters ?? [])];
  if (!filters.length) {
    context.save(); place(context); context.fillStyle = subject.color; context.strokeStyle = subject.color;
    body(context, subject, subject.opacity); context.restore(); return;
  }
  const pixelWidth = context.canvas.width; const pixelHeight = context.canvas.height;
  const { canvas, context: scratch } = buffer(pixelWidth, pixelHeight);
  scratch.save();
  scratch.setTransform(1, 0, 0, 1, 0, 0); scratch.globalCompositeOperation = 'source-over'; scratch.globalAlpha = 1; scratch.clearRect(0, 0, pixelWidth, pixelHeight);
  scratch.setTransform(pixelScale, 0, 0, pixelScale, 0, 0); place(scratch);
  // Only coverage is kept from this pass. Drawing in white keeps it exact; the ink is applied afterwards.
  scratch.fillStyle = '#ffffff'; scratch.strokeStyle = '#ffffff'; body(scratch, subject, 1);
  scratch.restore();
  const image = scratch.getImageData(0, 0, pixelWidth, pixelHeight); const pixels = image.data;
  // A subject usually covers a small part of the canvas. Filter only the window that holds its coverage plus the room
  // the filters can spread into; the rest of the canvas stays empty either way.
  let left = pixelWidth; let right = -1; let top = pixelHeight; let bottom = -1;
  for (let y = 0, i = 3; y < pixelHeight; y++) for (let x = 0; x < pixelWidth; x++, i += 4) if (pixels[i]) { if (x < left) left = x; if (x > right) right = x; if (y < top) top = y; bottom = y; }
  if (right < 0) return;
  const reach = filters.reduce((sum, filter) => sum + filterReach(filter, pixelScale), 0);
  const x = Math.max(0, left - reach); const y = Math.max(0, top - reach);
  const width = Math.min(pixelWidth, right + reach + 1) - x; const height = Math.min(pixelHeight, bottom + reach + 1) - y;
  let coverage = new Uint8ClampedArray(width * height);
  for (let row = 0, i = 0; row < height; row++) for (let at = ((y + row) * pixelWidth + x) * 4 + 3, end = at + width * 4; at < end; at += 4, i++) coverage[i] = pixels[at]!;
  for (const filter of filters) coverage = applyFilter({ data: coverage, width, height, x, y }, filter, pixelScale);
  const ink = rgb(subject.color);
  // Chromatic split: a red copy behind on one side, a cyan copy on the other, the ink on top.
  const split = [...filters].reverse().find((filter) => filter.type === 'split');
  const ox = split ? Math.round(Math.cos(split.angle * Math.PI / 180) * split.radius * pixelScale) : 0;
  const oy = split ? Math.round(Math.sin(split.angle * Math.PI / 180) * split.radius * pixelScale) : 0;
  const sample = (column: number, row: number) => column < 0 || row < 0 || column >= width || row >= height ? 0 : coverage[row * width + column]! / 255;
  for (let row = 0, i = 0; row < height; row++) for (let at = ((y + row) * pixelWidth + x) * 4, end = at + width * 4; at < end; at += 4, i++) {
    if (!split) { pixels[at] = ink[0]!; pixels[at + 1] = ink[1]!; pixels[at + 2] = ink[2]!; pixels[at + 3] = coverage[i]!; continue; }
    const column = i % width; let alpha = 0; const color = [0, 0, 0];
    for (const [tint, weight] of [[red, sample(column + ox, row + oy)], [cyan, sample(column - ox, row - oy)], [ink, sample(column, row)]] as const) {
      for (let channel = 0; channel < 3; channel++) color[channel] = tint[channel]! * weight + color[channel]! * (1 - weight);
      alpha = weight + alpha * (1 - weight);
    }
    for (let channel = 0; channel < 3; channel++) pixels[at + channel] = alpha ? color[channel]! / alpha : 0;
    pixels[at + 3] = alpha * 255;
  }
  scratch.putImageData(image, 0, 0, x, y, width, height);
  context.save(); context.setTransform(1, 0, 0, 1, 0, 0); context.globalAlpha = subject.opacity; context.drawImage(canvas, x, y, width, height, x, y, width, height); context.restore();
}
export interface DrawOptions {
  /** Where the subject's origin sits on the canvas, in pixels. Default 0, 0. */
  x?: number; y?: number;
  /** Opaque #RRGGBB ink, unless the atom returned its own colour. Default white. */
  color?: string;
  /** For text output: a CSS font such as `96px "Noto Sans SC"`. The font must already be loaded. */
  font?: string;
  /** Canvas pixels per scene pixel, when the context is scaled to draw a smaller or larger picture. Default 1. */
  pixelScale?: number;
}
/**
 * Draw what an atom returned for one frame onto a Canvas 2D context. It adds to whatever is already on the canvas
 * and never clears it, so a host can draw its own background first and several subjects one after another.
 * Layout atoms return copies instead of a picture; draw the subject once per copy.
 */
export function drawAtom(context: Context, output: AtomOutput, options: DrawOptions = {}): void {
  const pixelScale = options.pixelScale ?? 1;
  context.save(); context.setTransform(pixelScale, 0, 0, pixelScale, 0, 0);
  drawSubject(context, { ...output, position: [(options.x ?? 0) + output.position[0], (options.y ?? 0) + output.position[1]],
    color: output.color ?? options.color ?? '#ffffff', ...(options.font ? { font: options.font } : {}) }, pixelScale);
  context.restore();
}
