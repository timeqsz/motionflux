import type { Vec2 } from './types.js';
export const clamp = (value: number, min = 0, max = 1): number => Math.max(min, Math.min(max, value));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const smooth = (t: number): number => { const u = clamp(t); return u * u * (3 - 2 * u); };
export function hashId(seed: number, id: string): number {
  let value = seed >>> 0;
  for (let i = 0; i < id.length; i++) value = Math.imul(value ^ id.charCodeAt(i), 16777619) >>> 0;
  return value;
}
function sample(seed: number, index: number): number {
  let value = (seed ^ Math.imul(index, 0x9e3779b1)) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
  return ((value ^ (value >>> 15)) >>> 0) / 4294967295 * 2 - 1;
}
export function noise(seed: number, time: number): number {
  const index = Math.floor(time);
  return lerp(sample(seed, index), sample(seed, index + 1), smooth(time - index));
}
export function trimPolyline(points: readonly Vec2[], fraction: number): Vec2[] {
  if (fraction <= 0 || points.length < 2) return [];
  const lengths = points.slice(1).map((point, i) => Math.hypot(point[0] - points[i]![0], point[1] - points[i]![1]));
  const total = lengths.reduce((sum, length) => sum + length, 0);
  if (total === 0) return []; // A zero-length path never draws a dot accidentally.
  if (fraction >= 1) return points.map((point) => [...point]);
  let remaining = total * clamp(fraction);
  const result: Vec2[] = [[...points[0]!]];
  for (let i = 0; i < lengths.length; i++) {
    const length = lengths[i]!;
    if (length === 0) continue;
    const previous = points[i]!;
    const next = points[i + 1]!;
    if (remaining >= length) { result.push([...next]); remaining -= length; }
    else { result.push([lerp(previous[0], next[0], remaining / length), lerp(previous[1], next[1], remaining / length)]); break; }
    if (remaining <= 0) break;
  }
  return result;
}
export const TAU = Math.PI * 2;
export const fract = (value: number): number => value - Math.floor(value);
/** 0 → 1 → 0 across the unit interval. */
export const ping = (t: number): number => 1 - Math.abs(1 - 2 * clamp(t));
/** Uniform hash in [0, 1) from a seed and up to three integer coordinates. */
export function rand(seed: number, a = 0, b = 0, c = 0): number {
  let value = (seed ^ Math.imul(a | 0, 0x9e3779b1) ^ Math.imul(b | 0, 0x85ebca6b) ^ Math.imul(c | 0, 0xc2b2ae35)) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
  return ((value ^ (value >>> 15)) >>> 0) / 4294967296;
}
/** Smooth value noise in [0, 1] over three axes; the third is normally evolution. */
export function noise3(seed: number, x: number, y: number, z: number): number {
  const xi = Math.floor(x); const yi = Math.floor(y); const zi = Math.floor(z);
  const u = smooth(x - xi); const v = smooth(y - yi); const w = smooth(z - zi);
  const plane = (k: number) => lerp(
    lerp(rand(seed, xi, yi, k), rand(seed, xi + 1, yi, k), u),
    lerp(rand(seed, xi, yi + 1, k), rand(seed, xi + 1, yi + 1, k), u), v);
  return lerp(plane(zi), plane(zi + 1), w);
}
/** Fractal sum of noise3 octaves, normalized to [0, 1]. */
export function fbm(seed: number, x: number, y: number, z: number, octaves = 4): number {
  let sum = 0; let weight = 0; let amplitude = 1; let frequency = 1;
  for (let i = 0; i < octaves; i++) {
    sum += amplitude * noise3(seed + i * 101, x * frequency, y * frequency, z * frequency);
    weight += amplitude; amplitude *= 0.5; frequency *= 2;
  }
  return sum / weight;
}
/** CSS-style cubic Bézier easing: solves x(u) = t by bisection, then returns y(u). x1 and x2 must lie in [0, 1]. */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number, t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const axis = (a: number, b: number, u: number) => 3 * a * u * (1 - u) ** 2 + 3 * b * u * u * (1 - u) + u ** 3;
  let low = 0; let high = 1;
  for (let i = 0; i < 32; i++) { const middle = (low + high) / 2; if (axis(x1, x2, middle) < t) low = middle; else high = middle; }
  return axis(y1, y2, (low + high) / 2);
}
/** Mix two #RRGGBB colours in linear light, so the midpoint of two saturated colours does not turn muddy. */
export function mixColor(from: string, to: string, t: number): string {
  const linear = (hex: string, i: number) => { const v = parseInt(hex.slice(i, i + 2), 16) / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const encode = (v: number) => Math.round(clamp(v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055) * 255).toString(16).padStart(2, '0');
  const u = clamp(t);
  return `#${[1, 3, 5].map((i) => encode(lerp(linear(from, i), linear(to, i), u))).join('')}`;
}
