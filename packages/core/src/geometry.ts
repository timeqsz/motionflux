import { clamp, lerp, TAU } from './math.js';
import type { Vec2 } from './types.js';
export type Path = Vec2[];
export const polygon = (radius: number, sides: number, rotationDeg = -90, cx = 0, cy = 0): Path =>
  Array.from({ length: sides }, (_, i): Vec2 => {
    const angle = rotationDeg * Math.PI / 180 + i / sides * TAU;
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
  });
export const circle = (radius: number, cx = 0, cy = 0, segments = 48): Path => polygon(radius, segments, 0, cx, cy);
export const rect = (width: number, height: number, cx = 0, cy = 0): Path =>
  [[cx - width / 2, cy - height / 2], [cx + width / 2, cy - height / 2], [cx + width / 2, cy + height / 2], [cx - width / 2, cy + height / 2]];
export interface Placement { x?: number; y?: number; rotation?: number; scaleX?: number; scaleY?: number; ox?: number; oy?: number }
/** Scale then rotate (degrees, clockwise) about (ox, oy), then translate by (x, y). */
export function place(path: readonly Vec2[], { x = 0, y = 0, rotation = 0, scaleX = 1, scaleY = scaleX, ox = 0, oy = 0 }: Placement): Path {
  const cos = Math.cos(rotation * Math.PI / 180); const sin = Math.sin(rotation * Math.PI / 180);
  return path.map(([px, py]): Vec2 => {
    const dx = (px - ox) * scaleX; const dy = (py - oy) * scaleY;
    return [ox + dx * cos - dy * sin + x, oy + dx * sin + dy * cos + y];
  });
}
export function bounds(paths: readonly (readonly Vec2[])[]) {
  let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
  for (const path of paths) for (const [x, y] of path) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
  if (minX === Infinity) minX = minY = maxX = maxY = 0;
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}
/** Largest distance from the node origin, used to size clips that must cover any rotation. */
export const reach = (path: readonly Vec2[]): number => path.reduce((max, [x, y]) => Math.max(max, Math.hypot(x, y)), 0);
const ring = (path: readonly Vec2[], closed: boolean): readonly Vec2[] => closed && path.length > 1 ? [...path, path[0]!] : path;
function lengths(points: readonly Vec2[]): number[] {
  const cumulative = [0];
  for (let i = 1; i < points.length; i++) cumulative.push(cumulative[i - 1]! + Math.hypot(points[i]![0] - points[i - 1]![0], points[i]![1] - points[i - 1]![1]));
  return cumulative;
}
export const pathLength = (path: readonly Vec2[], closed: boolean): number => lengths(ring(path, closed)).at(-1) ?? 0;
function locate(points: readonly Vec2[], cumulative: number[], distance: number): { point: Vec2; angle: number } {
  let i = 1;
  while (i < points.length - 1 && cumulative[i]! < distance) i++;
  const a = points[i - 1]!; const b = points[i]!; const span = cumulative[i]! - cumulative[i - 1]!;
  const t = span > 0 ? clamp((distance - cumulative[i - 1]!) / span) : 0;
  return { point: [lerp(a[0], b[0], t), lerp(a[1], b[1], t)], angle: Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI };
}
/** Point and tangent angle (degrees) at an arc-length fraction. Closed paths wrap; open paths clamp. */
export function pointAt(path: readonly Vec2[], closed: boolean, fraction: number): { point: Vec2; angle: number } {
  const points = ring(path, closed); const cumulative = lengths(points); const total = cumulative.at(-1) ?? 0;
  if (points.length < 2 || total === 0) return { point: [...(points[0] ?? [0, 0])] as Vec2, angle: 0 };
  const f = closed ? fraction - Math.floor(fraction) : clamp(fraction);
  return locate(points, cumulative, f * total);
}
/** The piece between two arc-length fractions. A closed path accepts any start and a span of at most one lap. */
export function slice(path: readonly Vec2[], closed: boolean, start: number, end: number): Path {
  const points = ring(path, closed); const cumulative = lengths(points); const total = cumulative.at(-1) ?? 0;
  if (points.length < 2 || total === 0 || end <= start) return [];
  let from = start; let to = end;
  if (closed) { const shift = Math.floor(from); from -= shift; to = Math.min(to - shift, from + 1); }
  else { from = clamp(from); to = clamp(to); if (to <= from) return []; }
  const result: Path = [locate(points, cumulative, from * total).point];
  for (let lap = 0; lap <= (closed ? 1 : 0); lap++) for (let i = 1; i < points.length; i++) {
    const distance = (cumulative[i]! / total) + lap;
    if (distance > from && distance < to) result.push([...points[i]!]);
  }
  const last = to > 1 ? to - 1 : to;
  result.push(locate(points, cumulative, last * total).point);
  return result;
}
/** Evenly spaced points by arc length. Closed paths return `count` distinct points. */
export function resample(path: readonly Vec2[], closed: boolean, count: number): Path {
  const points = ring(path, closed); const cumulative = lengths(points); const total = cumulative.at(-1) ?? 0;
  if (points.length < 2 || total === 0) return path.map((point): Vec2 => [...point]);
  return Array.from({ length: count }, (_, i) => locate(points, cumulative, (closed ? i / count : i / Math.max(1, count - 1)) * total).point);
}
/** Insert points so no segment is longer than `step` px; needed before a warp bends straight edges. */
export function densify(path: readonly Vec2[], closed: boolean, step: number): Path {
  const points = ring(path, closed); const result: Path = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!; const b = points[i + 1]!;
    const parts = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    for (let k = 0; k < parts; k++) result.push([lerp(a[0], b[0], k / parts), lerp(a[1], b[1], k / parts)]);
  }
  if (!closed && points.length) result.push([...points.at(-1)!]);
  return result;
}
