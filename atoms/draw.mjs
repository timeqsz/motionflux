// MotionFlux 动效原子的 Canvas 2D 绘制脚本，独立文件，没有任何依赖。
//   import { drawAtom } from './draw.mjs';
//   drawAtom(ctx, out, { x, y, color });   // out 是任意一个原子的返回值
// 像素滤镜（模糊、辉光、溶解、故障、色散等）也在这里实现。

// packages/core/src/math.ts
var TAU = Math.PI * 2;
function rand(seed, a = 0, b = 0, c = 0) {
  let value = (seed ^ Math.imul(a | 0, 2654435761) ^ Math.imul(b | 0, 2246822507) ^ Math.imul(c | 0, 3266489909)) >>> 0;
  value = Math.imul(value ^ value >>> 16, 569420461);
  value = Math.imul(value ^ value >>> 15, 1935289751);
  return ((value ^ value >>> 15) >>> 0) / 4294967296;
}

// packages/core/src/raster.ts
function box(src, width, height, radius, horizontal) {
  if (radius < 1) return src;
  const out = new Uint8ClampedArray(src.length);
  const lines = horizontal ? height : width;
  const length = horizontal ? width : height;
  const stride = horizontal ? 1 : width;
  const window = radius * 2 + 1;
  for (let line = 0; line < lines; line++) {
    const start = horizontal ? line * width : line;
    let sum = 0;
    for (let i = 0; i <= Math.min(radius, length - 1); i++) sum += src[start + i * stride];
    for (let i = 0; i < length; i++) {
      out[start + i * stride] = sum / window;
      const enter = i + radius + 1;
      const leave = i - radius;
      if (enter < length) sum += src[start + enter * stride];
      if (leave >= 0) sum -= src[start + leave * stride];
    }
  }
  return out;
}
function blur(src, width, height, radius) {
  let out = src;
  for (let pass = 0; pass < 3; pass++) {
    out = box(out, width, height, Math.round(radius), true);
    out = box(out, width, height, Math.round(radius), false);
  }
  return out === src ? src.slice() : out;
}
function filterReach(filter, pixelScale = 1) {
  const radius = filter.radius * pixelScale;
  switch (filter.type) {
    case "blur":
    case "glow":
      return 3 * Math.round(radius);
    case "directional":
      return Math.ceil(radius / 2) + 1;
    case "glitch":
    case "split":
      return Math.ceil(radius);
    case "grain":
    case "dissolve":
      return 0;
  }
}
function applyFilter(mask, filter, pixelScale = 1) {
  const { data: src, width, height } = mask;
  const k = pixelScale;
  const radius = filter.radius * k;
  const left = mask.x ?? 0;
  const top = mask.y ?? 0;
  switch (filter.type) {
    case "blur":
      return blur(src, width, height, radius);
    case "glow": {
      const soft = blur(src, width, height, radius);
      for (let i = 0; i < soft.length; i++) soft[i] = src[i] + soft[i] * filter.amount;
      return soft;
    }
    case "directional": {
      const steps = Math.max(1, Math.ceil(radius));
      const angle = filter.angle * Math.PI / 180;
      const dx = Math.cos(angle) * radius / steps;
      const dy = Math.sin(angle) * radius / steps;
      const out = new Uint8ClampedArray(src.length);
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        let sum = 0;
        for (let s = 0; s <= steps; s++) {
          const sx = Math.round(x + (s - steps / 2) * dx);
          const sy = Math.round(y + (s - steps / 2) * dy);
          if (sx >= 0 && sy >= 0 && sx < width && sy < height) sum += src[sy * width + sx];
        }
        out[y * width + x] = sum / (steps + 1);
      }
      return out;
    }
    case "grain": {
      const out = new Uint8ClampedArray(src.length);
      const cell = Math.max(1, filter.scale * k);
      for (let i = 0; i < src.length; i++) if (src[i]) out[i] = src[i] * (1 - filter.amount * rand(filter.seed, Math.floor((i % width + left) / cell), Math.floor((Math.floor(i / width) + top) / cell), filter.phase));
      return out;
    }
    case "dissolve": {
      const out = new Uint8ClampedArray(src.length);
      const cell = Math.max(1, filter.scale * k);
      for (let i = 0; i < src.length; i++) if (src[i] && rand(filter.seed, Math.floor((i % width + left) / cell), Math.floor((Math.floor(i / width) + top) / cell), 7) < filter.amount) out[i] = src[i];
      return out;
    }
    case "glitch": {
      const out = new Uint8ClampedArray(src.length);
      const band = Math.max(1, filter.scale * k);
      for (let y = 0; y < height; y++) {
        const index = Math.floor((y + top) / band);
        const shift = rand(filter.seed, index, filter.phase, 1) < filter.amount ? Math.round((rand(filter.seed, index, filter.phase, 2) - 0.5) * 2 * radius) : 0;
        for (let x = 0; x < width; x++) {
          const from = x - shift;
          out[y * width + x] = from >= 0 && from < width ? src[y * width + from] : 0;
        }
      }
      return out;
    }
    case "split":
      return src.slice();
  }
}

// packages/renderer-browser/src/draw.ts
var red = [255, 51, 85];
var cyan = [34, 211, 238];
function trace(context, paths, closed) {
  context.beginPath();
  for (const path of paths) {
    if (path.length < 2) continue;
    context.moveTo(path[0][0], path[0][1]);
    for (let i = 1; i < path.length; i++) context.lineTo(path[i][0], path[i][1]);
    if (closed) context.closePath();
  }
}
function drawShapes(context, shapes, alpha) {
  for (const shape of shapes) {
    context.save();
    if (shape.clip) {
      trace(context, shape.clip, true);
      context.clip();
    }
    context.globalAlpha = alpha * shape.opacity;
    trace(context, shape.paths, shape.closed);
    if (shape.fill) context.fill();
    else {
      context.lineWidth = shape.strokeWidth;
      context.stroke();
    }
    context.restore();
  }
}
function drawLines(context, lines, alpha) {
  for (const line of lines) {
    if (!line.glyphs) {
      context.globalAlpha = alpha * line.opacity;
      context.fillText(line.text, 0, line.y);
      continue;
    }
    let prefix = "";
    [...line.text].forEach((character, i) => {
      const glyph = line.glyphs[i] ?? { dx: 0, dy: 0, opacity: 1, scale: 1 };
      const x = context.measureText(prefix).width;
      prefix += character;
      if (glyph.opacity <= 0 || glyph.scale <= 0) return;
      context.save();
      context.globalAlpha = alpha * line.opacity * glyph.opacity;
      context.translate(x + glyph.dx, line.y + glyph.dy);
      context.scale(glyph.scale, glyph.scale);
      context.fillText(character, 0, 0);
      context.restore();
    });
  }
}
function measure(context, subject) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const layer of subject.layers ?? []) for (const shape of layer.shapes) {
    const pad = shape.fill ? 0 : shape.strokeWidth / 2;
    for (const path of shape.paths) for (const [x, y] of path) {
      minX = Math.min(minX, x - pad);
      maxX = Math.max(maxX, x + pad);
      minY = Math.min(minY, y - pad);
      maxY = Math.max(maxY, y + pad);
    }
  }
  for (const line of subject.lines ?? []) {
    if (!line.text) continue;
    const metrics = context.measureText(line.text);
    minX = Math.min(minX, -metrics.actualBoundingBoxLeft);
    maxX = Math.max(maxX, metrics.actualBoundingBoxRight);
    minY = Math.min(minY, line.y - metrics.actualBoundingBoxAscent);
    maxY = Math.max(maxY, line.y + metrics.actualBoundingBoxDescent);
  }
  if (minX === Infinity) return { minX: 0, minY: 0, width: 0, height: 0 };
  return { minX, minY, width: maxX - minX, height: maxY - minY };
}
function polygonOf(region, box2) {
  const { minX, minY, width, height } = box2;
  const cx = minX + width / 2;
  const cy = minY + height / 2;
  if (region.kind === "box") return [[minX, minY], [minX + width, minY], [minX + width, minY + height], [minX, minY + height]];
  if (region.kind === "inset") {
    const l = minX + region.left * width;
    const r = minX + width * (1 - region.right);
    const t = minY + region.top * height;
    const b2 = minY + height * (1 - region.bottom);
    return r > l && b2 > t ? [[l, t], [r, t], [r, b2], [l, b2]] : [];
  }
  if (region.kind === "circle") {
    const x = minX + region.cx * width;
    const y = minY + region.cy * height;
    const far2 = Math.max(...[[minX, minY], [minX + width, minY], [minX, minY + height], [minX + width, minY + height]].map(([px, py]) => Math.hypot(px - x, py - y)));
    const radius = region.r * (far2 + 1);
    return Array.from({ length: 72 }, (_, i) => [x + radius * Math.cos(i / 72 * Math.PI * 2), y + radius * Math.sin(i / 72 * Math.PI * 2)]);
  }
  const angle = region.angle * Math.PI / 180;
  const d = [Math.cos(angle), Math.sin(angle)];
  const n = [-d[1], d[0]];
  const half = (Math.abs(width * d[0]) + Math.abs(height * d[1])) / 2;
  const far = Math.hypot(width, height) + 10;
  const at = (ratio) => [cx + d[0] * (ratio * 2 - 1) * half, cy + d[1] * (ratio * 2 - 1) * half];
  const [from, to] = region.kind === "half" ? [-far / Math.max(half, 1e-6), region.at] : [region.from, region.to];
  const a = at(from);
  const b = at(to);
  return [[a[0] + n[0] * far, a[1] + n[1] * far], [b[0] + n[0] * far, b[1] + n[1] * far], [b[0] - n[0] * far, b[1] - n[1] * far], [a[0] - n[0] * far, a[1] - n[1] * far]];
}
function body(context, subject, alpha) {
  const paint = (strength) => {
    for (const layer of subject.layers ?? []) drawShapes(context, layer.shapes, strength);
    if (subject.lines) drawLines(context, subject.lines, strength);
  };
  if (!subject.pieces) {
    paint(alpha);
    return;
  }
  const box2 = measure(context, subject);
  for (const piece of subject.pieces) {
    context.save();
    context.beginPath();
    for (const region of piece.regions) {
      const polygon = polygonOf(region, box2);
      if (polygon.length) {
        context.moveTo(...polygon[0]);
        polygon.slice(1).forEach((point) => context.lineTo(...point));
        context.closePath();
      }
    }
    context.clip();
    context.translate(piece.offset[0] + (piece.shift?.[0] ?? 0) * box2.width, piece.offset[1] + (piece.shift?.[1] ?? 0) * box2.height);
    paint(alpha * piece.opacity);
    context.restore();
  }
}
var buffers = /* @__PURE__ */ new Map();
function buffer(width, height) {
  const key = `${width}x${height}`;
  let entry = buffers.get(key);
  if (!entry) {
    const canvas = typeof OffscreenCanvas === "undefined" ? Object.assign(document.createElement("canvas"), { width, height }) : new OffscreenCanvas(width, height);
    entry = { canvas, context: canvas.getContext("2d", { willReadFrequently: true }) };
    buffers.set(key, entry);
  }
  return entry;
}
var rgb = (color) => [1, 3, 5].map((start) => parseInt(color.slice(start, start + 2), 16));
function drawSubject(context, subject, pixelScale = 1) {
  const stretch = subject.stretch ?? [1, 1];
  if (Math.abs(subject.scale * stretch[0] * stretch[1]) < 1e-9 || subject.opacity <= 0) return;
  const place = (target) => {
    target.translate(...subject.position);
    target.rotate(subject.rotation * Math.PI / 180);
    target.scale(subject.scale * stretch[0], subject.scale * stretch[1]);
    target.lineCap = "round";
    target.lineJoin = "round";
    target.textBaseline = "alphabetic";
    target.textAlign = "left";
    if (subject.font) target.font = subject.font;
  };
  const filters = [...(subject.layers ?? []).flatMap((layer) => layer.filters), ...subject.filters ?? []];
  if (!filters.length) {
    context.save();
    place(context);
    context.fillStyle = subject.color;
    context.strokeStyle = subject.color;
    body(context, subject, subject.opacity);
    context.restore();
    return;
  }
  const pixelWidth = context.canvas.width;
  const pixelHeight = context.canvas.height;
  const { canvas, context: scratch } = buffer(pixelWidth, pixelHeight);
  scratch.save();
  scratch.setTransform(1, 0, 0, 1, 0, 0);
  scratch.globalCompositeOperation = "source-over";
  scratch.globalAlpha = 1;
  scratch.clearRect(0, 0, pixelWidth, pixelHeight);
  scratch.setTransform(pixelScale, 0, 0, pixelScale, 0, 0);
  place(scratch);
  scratch.fillStyle = "#ffffff";
  scratch.strokeStyle = "#ffffff";
  body(scratch, subject, 1);
  scratch.restore();
  const image = scratch.getImageData(0, 0, pixelWidth, pixelHeight);
  const pixels = image.data;
  let left = pixelWidth;
  let right = -1;
  let top = pixelHeight;
  let bottom = -1;
  for (let y2 = 0, i = 3; y2 < pixelHeight; y2++) for (let x2 = 0; x2 < pixelWidth; x2++, i += 4) if (pixels[i]) {
    if (x2 < left) left = x2;
    if (x2 > right) right = x2;
    if (y2 < top) top = y2;
    bottom = y2;
  }
  if (right < 0) return;
  const reach = filters.reduce((sum, filter) => sum + filterReach(filter, pixelScale), 0);
  const x = Math.max(0, left - reach);
  const y = Math.max(0, top - reach);
  const width = Math.min(pixelWidth, right + reach + 1) - x;
  const height = Math.min(pixelHeight, bottom + reach + 1) - y;
  let coverage = new Uint8ClampedArray(width * height);
  for (let row = 0, i = 0; row < height; row++) for (let at = ((y + row) * pixelWidth + x) * 4 + 3, end = at + width * 4; at < end; at += 4, i++) coverage[i] = pixels[at];
  for (const filter of filters) coverage = applyFilter({ data: coverage, width, height, x, y }, filter, pixelScale);
  const ink = rgb(subject.color);
  const split = [...filters].reverse().find((filter) => filter.type === "split");
  const ox = split ? Math.round(Math.cos(split.angle * Math.PI / 180) * split.radius * pixelScale) : 0;
  const oy = split ? Math.round(Math.sin(split.angle * Math.PI / 180) * split.radius * pixelScale) : 0;
  const sample = (column, row) => column < 0 || row < 0 || column >= width || row >= height ? 0 : coverage[row * width + column] / 255;
  for (let row = 0, i = 0; row < height; row++) for (let at = ((y + row) * pixelWidth + x) * 4, end = at + width * 4; at < end; at += 4, i++) {
    if (!split) {
      pixels[at] = ink[0];
      pixels[at + 1] = ink[1];
      pixels[at + 2] = ink[2];
      pixels[at + 3] = coverage[i];
      continue;
    }
    const column = i % width;
    let alpha = 0;
    const color = [0, 0, 0];
    for (const [tint, weight] of [[red, sample(column + ox, row + oy)], [cyan, sample(column - ox, row - oy)], [ink, sample(column, row)]]) {
      for (let channel = 0; channel < 3; channel++) color[channel] = tint[channel] * weight + color[channel] * (1 - weight);
      alpha = weight + alpha * (1 - weight);
    }
    for (let channel = 0; channel < 3; channel++) pixels[at + channel] = alpha ? color[channel] / alpha : 0;
    pixels[at + 3] = alpha * 255;
  }
  scratch.putImageData(image, 0, 0, x, y, width, height);
  context.save();
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.globalAlpha = subject.opacity;
  context.drawImage(canvas, x, y, width, height, x, y, width, height);
  context.restore();
}
function drawAtom(context, output, options = {}) {
  const pixelScale = options.pixelScale ?? 1;
  context.save();
  context.setTransform(pixelScale, 0, 0, pixelScale, 0, 0);
  drawSubject(context, {
    ...output,
    position: [(options.x ?? 0) + output.position[0], (options.y ?? 0) + output.position[1]],
    color: output.color ?? options.color ?? "#ffffff",
    ...options.font ? { font: options.font } : {}
  }, pixelScale);
  context.restore();
}
export {
  drawAtom,
  drawSubject
};
