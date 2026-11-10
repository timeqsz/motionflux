// 变形 Morph · prop.morph
// 轮廓按弧长对齐后逐点过渡到目标形状，不会扭成一团。
// MotionFlux 动效原子，独立脚本，没有任何依赖。用法见同目录的 prop.morph.md。
//   import atom from './prop.morph.mjs';
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

// packages/core/src/geometry.ts
var polygon = (radius, sides, rotationDeg = -90, cx = 0, cy = 0) => Array.from({ length: sides }, (_, i) => {
  const angle = rotationDeg * Math.PI / 180 + i / sides * TAU;
  return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
});
var circle = (radius, cx = 0, cy = 0, segments = 48) => polygon(radius, segments, 0, cx, cy);
function bounds(paths) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const path of paths) for (const [x, y] of path) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  if (minX === Infinity) minX = minY = maxX = maxY = 0;
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}
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
function resample(path, closed, count) {
  const points = ring(path, closed);
  const cumulative = lengths(points);
  const total = cumulative.at(-1) ?? 0;
  if (points.length < 2 || total === 0) return path.map((point) => [...point]);
  return Array.from({ length: count }, (_, i) => locate(points, cumulative, (closed ? i / count : i / Math.max(1, count - 1)) * total).point);
}

// packages/core/src/recipes/context.ts
var pathNode = (c) => c.node;
var base = (c) => pathNode(c).points.map((point) => [point[0], point[1]]);
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

// packages/core/src/recipes/prop.ts
var polystar = (sides, radius, inner, rotationDeg = 0) => Array.from({ length: sides * 2 }, (_, i) => {
  const r = i % 2 ? radius * inner * Math.cos(Math.PI / sides) : radius;
  const angle = (rotationDeg - 90) * Math.PI / 180 + i * Math.PI / sides;
  return [r * Math.cos(angle), r * Math.sin(angle)];
});
var signedArea = (points) => points.reduce((sum, [x, y], i) => {
  const next = points[(i + 1) % points.length];
  return sum + x * next[1] - next[0] * y;
}, 0);
var propMorph = (c) => {
  const outline = base(c);
  const box = bounds([outline]);
  const radius = Math.max(box.width, box.height) / 2;
  const samples = 96;
  const source = resample(outline, true, samples);
  const goal = {
    circle: circle(radius, box.cx, box.cy),
    triangle: polygon(radius * 1.15, 3, -90, box.cx, box.cy),
    square: polygon(radius * 1.2, 4, -45, box.cx, box.cy),
    star: polystar(5, radius * 1.15, 0.45).map(([x, y]) => [x + box.cx, y + box.cy])
  }[c.s("target")];
  let target = resample(goal, true, samples);
  if (Math.sign(signedArea(source)) !== Math.sign(signedArea(target))) target = target.reverse();
  let best = 0;
  let bestCost = Infinity;
  for (let shift = 0; shift < samples; shift++) {
    let cost = 0;
    for (let i = 0; i < samples && cost < bestCost; i++) {
      const a = source[i];
      const b = target[(i + shift) % samples];
      cost += (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
    }
    if (cost < bestCost) {
      bestCost = cost;
      best = shift;
    }
  }
  const amount = c.n("amount") * c.ease(c.progress);
  emit(c, [shape(c, [source.map(([x, y], i) => {
    const to = target[(i + best) % samples];
    return [lerp(x, to[0], amount), lerp(y, to[1], amount)];
  })], { closed: true })]);
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

// prop.morph.ts
var meta = {
  "id": "prop.morph",
  "title": "\u53D8\u5F62",
  "english": "Morph",
  "description": "\u8F6E\u5ED3\u6309\u5F27\u957F\u5BF9\u9F50\u540E\u9010\u70B9\u8FC7\u6E21\u5230\u76EE\u6807\u5F62\u72B6\uFF0C\u4E0D\u4F1A\u626D\u6210\u4E00\u56E2\u3002",
  "role": "property",
  "targets": [
    "path"
  ],
  "writes": [
    "geometry"
  ],
  "params": {
    "target": {
      "type": "string",
      "title": "\u76EE\u6807\u5F62\u72B6",
      "enum": [
        "circle",
        "triangle",
        "square",
        "star"
      ],
      "labels": [
        "\u5706\u5F62",
        "\u4E09\u89D2\u5F62",
        "\u65B9\u5F62",
        "\u661F\u5F62"
      ],
      "default": "star"
    },
    "amount": {
      "type": "number",
      "title": "\u53D8\u5F62\u7A0B\u5EA6",
      "minimum": 0,
      "maximum": 1,
      "default": 1,
      "unit": "ratio"
    }
  }
};
var atom = createAtom(meta, propMorph);
var prop_morph_default = atom;
export {
  prop_morph_default as default,
  meta
};
