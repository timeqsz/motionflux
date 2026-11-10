import { rand } from './math.js';
import type { Filter } from './types.js';
/**
 * Single-channel coverage of one subject, 0–255 per canvas pixel. Every filter here is written for this project.
 * A mask may be only a window of the canvas: `x`/`y` say where its first pixel sits, so noise cells and bands
 * stay where they would be on the whole canvas.
 */
export interface Mask { data: Uint8ClampedArray; width: number; height: number; x?: number; y?: number }

function box(src: Uint8ClampedArray, width: number, height: number, radius: number, horizontal: boolean): Uint8ClampedArray {
  if (radius < 1) return src;
  const out = new Uint8ClampedArray(src.length);
  const lines = horizontal ? height : width; const length = horizontal ? width : height;
  const stride = horizontal ? 1 : width; const window = radius * 2 + 1;
  for (let line = 0; line < lines; line++) {
    const start = horizontal ? line * width : line;
    let sum = 0;
    for (let i = 0; i <= Math.min(radius, length - 1); i++) sum += src[start + i * stride]!;
    for (let i = 0; i < length; i++) {
      out[start + i * stride] = sum / window;
      const enter = i + radius + 1; const leave = i - radius;
      if (enter < length) sum += src[start + enter * stride]!;
      if (leave >= 0) sum -= src[start + leave * stride]!;
    }
  }
  return out;
}
/** Three box passes per axis approximate a Gaussian whose sigma is about the given radius. Pixels outside count as empty. */
function blur(src: Uint8ClampedArray, width: number, height: number, radius: number): Uint8ClampedArray {
  let out = src;
  for (let pass = 0; pass < 3; pass++) { out = box(out, width, height, Math.round(radius), true); out = box(out, width, height, Math.round(radius), false); }
  return out === src ? src.slice() : out;
}
/**
 * How far past existing coverage a filter can write, in canvas pixels. A window that leaves this much empty room
 * around the coverage (or stops at the canvas edge) filters to the same pixels as the whole canvas would.
 */
export function filterReach(filter: Filter, pixelScale = 1): number {
  const radius = filter.radius * pixelScale;
  switch (filter.type) {
    case 'blur': case 'glow': return 3 * Math.round(radius);
    case 'directional': return Math.ceil(radius / 2) + 1;
    case 'glitch': case 'split': return Math.ceil(radius);
    case 'grain': case 'dissolve': return 0;
  }
}
/**
 * Apply one coverage filter. `pixelScale` is canvas pixels per scene pixel, so radii and noise cells keep their
 * scene size when a preview renders smaller than the scene. `split` leaves coverage alone; the renderer colours it.
 */
export function applyFilter(mask: Mask, filter: Filter, pixelScale = 1): Uint8ClampedArray {
  const { data: src, width, height } = mask; const k = pixelScale; const radius = filter.radius * k;
  const left = mask.x ?? 0; const top = mask.y ?? 0;
  switch (filter.type) {
    case 'blur': return blur(src, width, height, radius);
    case 'glow': {
      const soft = blur(src, width, height, radius);
      for (let i = 0; i < soft.length; i++) soft[i] = src[i]! + soft[i]! * filter.amount;
      return soft;
    }
    case 'directional': {
      // Average along a line centred on each pixel: what a shutter sees while the subject travels `radius` px.
      const steps = Math.max(1, Math.ceil(radius)); const angle = filter.angle * Math.PI / 180;
      const dx = Math.cos(angle) * radius / steps; const dy = Math.sin(angle) * radius / steps;
      const out = new Uint8ClampedArray(src.length);
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        let sum = 0;
        for (let s = 0; s <= steps; s++) {
          const sx = Math.round(x + (s - steps / 2) * dx); const sy = Math.round(y + (s - steps / 2) * dy);
          if (sx >= 0 && sy >= 0 && sx < width && sy < height) sum += src[sy * width + sx]!;
        }
        out[y * width + x] = sum / (steps + 1);
      }
      return out;
    }
    case 'grain': {
      const out = new Uint8ClampedArray(src.length); const cell = Math.max(1, filter.scale * k);
      for (let i = 0; i < src.length; i++) if (src[i]) out[i] = src[i]! * (1 - filter.amount * rand(filter.seed, Math.floor((i % width + left) / cell), Math.floor((Math.floor(i / width) + top) / cell), filter.phase));
      return out;
    }
    case 'dissolve': {
      // Each grain has a fixed random threshold; it is visible once the amount passes it.
      const out = new Uint8ClampedArray(src.length); const cell = Math.max(1, filter.scale * k);
      for (let i = 0; i < src.length; i++) if (src[i] && rand(filter.seed, Math.floor((i % width + left) / cell), Math.floor((Math.floor(i / width) + top) / cell), 7) < filter.amount) out[i] = src[i]!;
      return out;
    }
    case 'glitch': {
      // Rows fall into bands of `scale` px; on each tick a random share of bands jumps sideways by up to `radius` px.
      const out = new Uint8ClampedArray(src.length); const band = Math.max(1, filter.scale * k);
      for (let y = 0; y < height; y++) {
        const index = Math.floor((y + top) / band);
        const shift = rand(filter.seed, index, filter.phase, 1) < filter.amount ? Math.round((rand(filter.seed, index, filter.phase, 2) - 0.5) * 2 * radius) : 0;
        for (let x = 0; x < width; x++) { const from = x - shift; out[y * width + x] = from >= 0 && from < width ? src[y * width + from]! : 0; }
      }
      return out;
    }
    case 'split': return src.slice();
  }
}
