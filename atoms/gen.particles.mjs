// 粒子 Particles · gen.particles
// 从原点持续喷出粒子，受重力下落并逐渐变小消失；每个粒子的轨迹都可直接按时间求值。
// MotionFlux 动效原子，独立脚本，没有任何依赖。用法见同目录的 gen.particles.md。
//   import atom from './gen.particles.mjs';
//   const out = atom({ frame, durationFrames, params, subject, seed });

// packages/core/src/math.ts
var clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
var lerp = (a, b, t) => a + (b - a) * t;
var smooth = (t) => {
  const u = clamp(t);
  return u * u * (3 - 2 * u);
};
function hashId(seed, id) {
  let value = seed >>> 0;
  for (let i = 0; i < id.length; i++) value = Math.imul(value ^ id.charCodeAt(i), 16777619) >>> 0;
  return value;
}
var TAU = Math.PI * 2;
function rand(seed, a = 0, b = 0, c = 0) {
  let value = (seed ^ Math.imul(a | 0, 2654435761) ^ Math.imul(b | 0, 2246822507) ^ Math.imul(c | 0, 3266489909)) >>> 0;
  value = Math.imul(value ^ value >>> 16, 569420461);
  value = Math.imul(value ^ value >>> 15, 1935289751);
  return ((value ^ value >>> 15) >>> 0) / 4294967296;
}

// packages/core/src/geometry.ts
var polygon = (radius, sides, rotationDeg = -90, cx = 0, cy = 0) => Array.from({ length: sides }, (_, i) => {
  const angle = rotationDeg * Math.PI / 180 + i / sides * TAU;
  return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
});
var ring = (path, closed) => closed && path.length > 1 ? [...path, path[0]] : path;
function lengths(points) {
  const cumulative = [0];
  for (let i = 1; i < points.length; i++) cumulative.push(cumulative[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
  return cumulative;
}
function locate(points, cumulative, distance) {
  let i = 1;
  while (i < points.length - 1 && cumulative[i] < distance) i++;
  const a = points[i - 1];
  const b = points[i];
  const span = cumulative[i] - cumulative[i - 1];
  const t = span > 0 ? clamp((distance - cumulative[i - 1]) / span) : 0;
  return { point: [lerp(a[0], b[0], t), lerp(a[1], b[1], t)], angle: Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI };
}
function slice(path, closed, start, end) {
  const points = ring(path, closed);
  const cumulative = lengths(points);
  const total = cumulative.at(-1) ?? 0;
  if (points.length < 2 || total === 0 || end <= start) return [];
  let from = start;
  let to = end;
  if (closed) {
    const shift = Math.floor(from);
    from -= shift;
    to = Math.min(to - shift, from + 1);
  } else {
    from = clamp(from);
    to = clamp(to);
    if (to <= from) return [];
  }
  const result = [locate(points, cumulative, from * total).point];
  for (let lap = 0; lap <= (closed ? 1 : 0); lap++) for (let i = 1; i < points.length; i++) {
    const distance = cumulative[i] / total + lap;
    if (distance > from && distance < to) result.push([...points[i]]);
  }
  const last = to > 1 ? to - 1 : to;
  result.push(locate(points, cumulative, last * total).point);
  return result;
}

// packages/core/src/recipes/context.ts
var pathNode = (c) => c.node;
function shape(c, paths, options = {}) {
  const node = pathNode(c);
  const result = {
    paths,
    closed: options.closed ?? Boolean(node.closed),
    fill: options.fill ?? Boolean(node.fill),
    strokeWidth: options.strokeWidth ?? node.strokeWidth,
    opacity: options.opacity ?? 1
  };
  if (options.clip) result.clip = options.clip;
  return result;
}
function emit(c, shapes, filters = [], blend = "normal") {
  (c.state.layers ??= []).push({ shapes, filters, blend });
}
var single = () => ({ slot: 0, slots: 1, offset: [0, 0], rotation: 0, scale: 1, flip: [1, 1], delay: 0, opacity: 1, ghost: 0 });

// packages/core/src/recipes/generate.ts
var genParticles = (c) => {
  const secondsPerFrame = c.scene.fps.denominator / c.scene.fps.numerator;
  const life = c.n("lifeFrames");
  const shapes = [];
  for (let i = 0; i < c.n("count"); i++) {
    const since = c.elapsed - rand(c.seed, i, 0) * life;
    if (since < 0) continue;
    const cycle = Math.floor(since / life);
    const age = since - cycle * life;
    const time = age * secondsPerFrame;
    const spent = age / life;
    const angle = (-90 + (rand(c.seed, i, cycle, 1) - 0.5) * c.n("spreadDeg")) * Math.PI / 180;
    const speed = c.n("speedPx") * (0.35 + 0.65 * rand(c.seed, i, cycle, 2));
    shapes.push(shape(c, [polygon(
      c.n("sizePx") * (1 - spent) * (0.6 + 0.4 * rand(c.seed, i, cycle, 3)),
      8,
      0,
      speed * Math.cos(angle) * time,
      speed * Math.sin(angle) * time + c.n("gravityPx") * time * time / 2
    )], { closed: true, fill: true, opacity: 1 - spent }));
  }
  emit(c, shapes);
};

// packages/core/src/atom.ts
function createAtom(meta2, recipe) {
  const evaluate = (input) => {
    if (!Number.isFinite(input.frame)) throw new RangeError(`${meta2.id}: frame must be a finite number.`);
    if (!(input.durationFrames > 0)) throw new RangeError(`${meta2.id}: durationFrames must be greater than 0.`);
    const params = {};
    for (const [key, parameter] of Object.entries(meta2.params)) {
      const value = input.params?.[key] ?? parameter.default;
      if (parameter.type === "number") {
        if (typeof value !== "number" || !Number.isFinite(value) || value < parameter.minimum || value > parameter.maximum || parameter.integer && !Number.isInteger(value))
          throw new RangeError(`${meta2.id}: ${key} must be ${parameter.integer ? "a whole number" : "a number"} from ${parameter.minimum} to ${parameter.maximum} (${parameter.unit}); got ${String(value)}.`);
      } else if (parameter.type === "color") {
        if (typeof value !== "string" || !/^#[0-9a-fA-F]{6}$/u.test(value)) throw new RangeError(`${meta2.id}: ${key} must be a #RRGGBB colour; got ${String(value)}.`);
      } else if (!parameter.enum.includes(String(value))) throw new RangeError(`${meta2.id}: ${key} must be one of ${parameter.enum.join(", ")}; got ${String(value)}.`);
      params[key] = value;
    }
    for (const key of Object.keys(input.params ?? {})) if (!(key in meta2.params)) throw new TypeError(`${meta2.id}: unknown parameter ${key}. It takes ${Object.keys(meta2.params).join(", ")}.`);
    const subject = input.subject ?? {};
    const asText = meta2.targets.includes("text") && (subject.text !== void 0 || !meta2.targets.includes("path"));
    if (asText && subject.text === void 0) throw new TypeError(`${meta2.id}: acts on text; pass subject.text.`);
    const items = input.items ?? [];
    if (meta2.role === "order" && !items.length) throw new TypeError(`${meta2.id}: orders several things; pass items, one position per thing.`);
    const id = input.id ?? "subject";
    const fps = input.fps ?? 30;
    const start = input.startFrame ?? 0;
    const color = subject.color ?? "#ffffff";
    const node = asText ? { id, type: "text", position: [0, 0], color, text: subject.text, font: "font", fontSize: 1, lineHeight: subject.lineHeight ?? 0 } : {
      id,
      type: "path",
      position: [0, 0],
      color,
      points: subject.points ?? [[-1, 0], [1, 0]],
      strokeWidth: subject.strokeWidth ?? 4,
      ...subject.closed ? { closed: true } : {},
      ...subject.fill ? { fill: true } : {}
    };
    const scene = { seed: input.seed ?? 0, fps: { numerator: fps, denominator: 1 } };
    const clip = { id: "effect", target: id, recipe: meta2.id, startFrame: start, durationFrames: input.durationFrames, fillAfter: "hold", params };
    const state = {
      position: [0, 0],
      rotation: 0,
      scale: 1,
      opacity: 1,
      stretch: [1, 1],
      color,
      trimStart: 0,
      trim: 1,
      filters: [],
      lines: node.type === "text" ? node.text.split("\n").map((text, i) => ({ text, y: i * node.lineHeight, opacity: 1 })) : []
    };
    const copies = meta2.role === "order" ? items.map((point, slot) => ({ ...single(), slot, slots: items.length, offset: [point[0], point[1]] })) : [single()];
    let curve = smooth;
    const elapsed = clamp(input.frame - start, 0, input.durationFrames);
    const progress = elapsed / input.durationFrames;
    recipe({
      scene,
      node,
      clip,
      state,
      elapsed,
      local: input.frame - start,
      progress,
      seconds: elapsed / fps,
      duration: input.durationFrames,
      seed: hashId(scene.seed, `${id}:${clip.id}`),
      n: (key) => Number(params[key]),
      s: (key) => String(params[key]),
      ease: input.ease ?? smooth,
      copy: copies[0],
      copies,
      setCurve: (next) => {
        curve = next;
      },
      pastPosition: (frames) => items.length >= 2 ? [lerp(items[1][0], items[0][0], frames), lerp(items[1][1], items[0][1], frames)] : [0, 0],
      // Asked for one sample per copy, the items are the copies' current places; asked for a path, they are that path.
      history: (_, samples) => samples === 1 ? items.map((point) => [point]) : [items]
    });
    const output = { progress, position: state.position, rotation: state.rotation, scale: state.scale, stretch: state.stretch, opacity: state.opacity };
    if (meta2.role === "timing") output.value = curve(progress);
    if (meta2.role === "layout" || meta2.role === "order") output.copies = [...copies].sort((a, b) => b.ghost - a.ghost).map(({ slot, offset, rotation, scale, flip, delay, opacity, ghost }) => ({ slot, offset, rotation, scale, flip, delay, opacity, ghost }));
    if (meta2.writes.includes("color")) output.color = state.color;
    if (state.pieces) output.pieces = state.pieces;
    if (state.filters.length) output.filters = state.filters;
    if (meta2.role === "timing" || meta2.role === "layout" || meta2.role === "order") return output;
    if (node.type === "text") output.lines = state.lines;
    else if (meta2.role === "overlay") output.layers = state.layers ?? [];
    else {
      const whole = state.trimStart <= 0 && state.trim >= 1;
      const visible = whole ? node.points : slice(node.points, Boolean(node.closed), state.trimStart, state.trim);
      output.layers = state.layers ?? [{ blend: "normal", filters: [], shapes: visible.length >= 2 ? [{ paths: [visible], closed: Boolean(node.closed) && whole, fill: Boolean(node.fill) && whole, strokeWidth: node.strokeWidth, opacity: 1 }] : [] }];
    }
    return output;
  };
  return Object.assign(evaluate, { meta: meta2 });
}

// gen.particles.ts
var meta = {
  "id": "gen.particles",
  "title": "\u7C92\u5B50",
  "english": "Particles",
  "description": "\u4ECE\u539F\u70B9\u6301\u7EED\u55B7\u51FA\u7C92\u5B50\uFF0C\u53D7\u91CD\u529B\u4E0B\u843D\u5E76\u9010\u6E10\u53D8\u5C0F\u6D88\u5931\uFF1B\u6BCF\u4E2A\u7C92\u5B50\u7684\u8F68\u8FF9\u90FD\u53EF\u76F4\u63A5\u6309\u65F6\u95F4\u6C42\u503C\u3002",
  "role": "property",
  "targets": [
    "path"
  ],
  "writes": [
    "geometry"
  ],
  "params": {
    "count": {
      "type": "number",
      "title": "\u540C\u65F6\u5728\u98DE",
      "minimum": 1,
      "maximum": 300,
      "default": 48,
      "unit": "count",
      "integer": true
    },
    "speedPx": {
      "type": "number",
      "title": "\u901F\u5EA6",
      "minimum": 0,
      "maximum": 2e3,
      "default": 260,
      "unit": "px/s"
    },
    "spreadDeg": {
      "type": "number",
      "title": "\u6269\u6563\u89D2",
      "minimum": 0,
      "maximum": 360,
      "default": 80,
      "unit": "deg"
    },
    "gravityPx": {
      "type": "number",
      "title": "\u91CD\u529B",
      "minimum": -2e3,
      "maximum": 4e3,
      "default": 420,
      "unit": "px/s\xB2"
    },
    "lifeFrames": {
      "type": "number",
      "title": "\u5BFF\u547D",
      "minimum": 2,
      "maximum": 600,
      "default": 40,
      "unit": "frame",
      "integer": true
    },
    "sizePx": {
      "type": "number",
      "title": "\u5927\u5C0F",
      "minimum": 0.5,
      "maximum": 60,
      "default": 7,
      "unit": "px"
    }
  }
};
var atom = createAtom(meta, genParticles);
var gen_particles_default = atom;
export {
  gen_particles_default as default,
  meta
};
