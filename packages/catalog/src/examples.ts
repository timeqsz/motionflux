import { defaultParams, getCapability, families, type RecipeId } from './index.js';
import { circle, polygon, rect } from '../../core/src/geometry.js';
import type { Clip, MotionSpec, FontAsset, PathNode, SceneNode, TextNode, Vec2 } from '../../core/src/types.js';

/**
 * Example scenes, one per table element, drawn as annotated diagrams: plain paper, the subject in ink, and guides
 * in the family colour that show what the parameters mean (a start ghost, a track, an arc, a curve). Each scene
 * features exactly one atom as its first clip; atoms that only make sense on something else (a timing curve, an
 * order, a look) ride on a plain carrier clip after it.
 */
export type Theme = 'light' | 'dark';
export const palettes: Record<Theme, { paper: string; ink: string }> = {
  light: { paper: '#fbfbf8', ink: '#1d201d' },
  dark: { paper: '#16181b', ink: '#eef0ea' },
};
/** MotionSpec colours carry no alpha, so guides are an opaque blend of the paper and a colour. */
const blend = (a: string, b: string, t: number): string =>
  `#${[1, 3, 5].map((i) => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t).toString(16).padStart(2, '0')).join('')}`;
const themeOf = (scene: MotionSpec): Theme => scene.canvas.background === palettes.dark.paper ? 'dark' : 'light';
interface Ink { ink: string; accent: string; guide: string; ghost: string }
const inks = (theme: Theme, id: RecipeId): Ink => {
  const { paper, ink } = palettes[theme]; const accent = families[getCapability(id)!.family].color;
  return { ink, accent, guide: blend(paper, accent, 0.55), ghost: blend(paper, ink, 0.16) };
};

const W = 640; const H = 400; const CX = W / 2; const CY = H / 2;
const star = (points: number, outer: number, inner: number): Vec2[] => polygon(outer, points * 2, -90).map(([x, y], i): Vec2 => i % 2 ? [x * inner / outer, y * inner / outer] : [x, y]);
const arc = (radius: number, fromDeg: number, toDeg: number, steps = 48): Vec2[] => Array.from({ length: steps + 1 }, (_, i): Vec2 => {
  const angle = (fromDeg + (toDeg - fromDeg) * i / steps) * Math.PI / 180; return [radius * Math.cos(angle), radius * Math.sin(angle)];
});
const path = (id: string, position: Vec2, color: string, points: Vec2[], options: Partial<PathNode> = {}): PathNode =>
  ({ id, type: 'path', position, color, points, strokeWidth: 2, ...options });
const subjectPath = (points: Vec2[], options: Partial<PathNode> = {}): Partial<PathNode> => ({ points, closed: true, strokeWidth: 5, ...options });

interface Carrier { recipe: RecipeId; params?: Record<string, number | string>; start?: number; duration?: number }
interface Demo {
  /** Outline subject, or text for text atoms. */
  subject?: Partial<PathNode>;
  text?: { text: string; fontSize: number; lineHeight?: number; mono?: boolean; position: Vec2 };
  position?: Vec2;
  /** Featured clip parameters that differ from the catalog defaults. */
  params?: Record<string, number | string>;
  carriers?: Carrier[];
  /** Featured clip start and length, and the scene length. Ongoing scenes use the scene length for every clip. */
  start?: number; duration?: number; frames?: number;
  guides?: (params: Record<string, number | string>, ink: Ink, at: Vec2) => PathNode[];
}
const square = subjectPath(rect(72, 72));
const dot = (radius: number) => subjectPath(circle(radius), { fill: true });
/** A filled picture with a mountain skyline, so a push visibly slides its content while a wipe does not. */
const card = subjectPath([[-130, 80], [-130, -20], [-80, -62], [-46, -30], [6, -80], [62, -14], [92, -40], [130, -6], [130, 80]], { fill: true });
const cardOutline = (_: unknown, ink: Ink, at: Vec2) => [path('guide-frame', at, ink.ghost, rect(260, 160), { closed: true })];
const row = subjectPath(rect(220, 30), { strokeWidth: 4 });
/** Every timing element moves the same square along the same track; only the curve differs, so the motion shows it. */
const timingDemo: Demo = {
  // The track stays inside the part of the sheet a table cell shows, even when a curve overshoots.
  subject: subjectPath(rect(56, 56)), position: [190, 200], frames: 84,
  carriers: [{ recipe: 'prop.move', params: { fromPx: 0, toPx: 260, angleDeg: 0 }, start: 6, duration: 54 }],
  guides: (_, ink) => [path('guide-track', [190, 200], ink.ghost, [[0, 0], [260, 0]])],
};

const demos: Record<RecipeId, Demo> = {
  // 属性
  'prop.move': { subject: square, duration: 54, frames: 76,
    guides: (p, ink, at) => { const a = Number(p.angleDeg) * Math.PI / 180; const along = (d: number): Vec2 => [d * Math.cos(a), d * Math.sin(a)];
      return [path('guide-track', at, ink.guide, [along(Number(p.fromPx)), along(Number(p.toPx))]), path('guide-start', [at[0] + along(Number(p.fromPx))[0], at[1] + along(Number(p.fromPx))[1]], ink.ghost, rect(72, 72), { closed: true, strokeWidth: 3 })]; } },
  'prop.rotate': { subject: subjectPath(rect(120, 120)), duration: 54, frames: 76,
    guides: (p, ink, at) => [path('guide-arc', at, ink.guide, arc(110, Number(p.fromDeg) - 90, Number(p.toDeg) - 90)), path('guide-start', at, ink.ghost, rect(120, 120), { closed: true, strokeWidth: 3 })] },
  'prop.scale': { subject: square, duration: 54, frames: 76,
    guides: (p, ink, at) => [path('guide-from', at, ink.ghost, rect(72 * Number(p.from), 72 * Number(p.from)), { closed: true }), path('guide-to', at, ink.guide, rect(72 * Number(p.to), 72 * Number(p.to)), { closed: true })] },
  'prop.opacity': { subject: subjectPath(rect(140, 140), { fill: true }), duration: 54, frames: 76,
    guides: (_, ink, at) => [path('guide-outline', at, ink.ghost, rect(140, 140), { closed: true, strokeWidth: 3 })] },
  'prop.color': { subject: subjectPath(circle(80), { fill: true }), duration: 54, frames: 76 },
  'prop.blur': { subject: subjectPath(circle(70), { fill: true }), duration: 54, frames: 76,
    guides: (_, ink, at) => [path('guide-outline', at, ink.ghost, circle(70), { closed: true })] },
  'prop.morph': { subject: subjectPath(circle(90)), duration: 54, frames: 76,
    guides: (_, ink, at) => [path('guide-start', at, ink.ghost, circle(90), { closed: true })] },
  'prop.draw': { subject: { points: Array.from({ length: 61 }, (_, i): Vec2 => { const t = i / 60; return [-200 + 400 * t, -70 * Math.sin(t * Math.PI * 3) * (1 - t * 0.4)]; }), strokeWidth: 7 },
    duration: 54, frames: 76,
    guides: (_, ink, at) => [path('guide-path', at, ink.ghost, Array.from({ length: 61 }, (_, i): Vec2 => { const t = i / 60; return [-200 + 400 * t, -70 * Math.sin(t * Math.PI * 3) * (1 - t * 0.4)]; }), { strokeWidth: 3 })] },
  'prop.crop': { subject: card, duration: 54, frames: 76, guides: cardOutline },

  // 节奏：同一个方块沿同一条轨道移动，只有曲线不同
  'timing.ease': timingDemo, 'timing.spring': timingDemo, 'timing.bounce': timingDemo,
  'timing.overshoot': timingDemo, 'timing.anticipate': timingDemo, 'timing.steps': timingDemo,

  // 循环
  'loop.breathe': { subject: subjectPath(circle(80), { fill: true }), params: { amount: 0.18 },
    guides: (p, ink, at) => [path('guide-max', at, ink.guide, circle(80 * (1 + Number(p.amount))), { closed: true }), path('guide-min', at, ink.ghost, circle(80 * (1 - Number(p.amount))), { closed: true })] },
  'loop.swing': { subject: { points: [[0, 0], [0, 150], ...circle(22, 0, 172).slice(12), ...circle(22, 0, 172).slice(0, 13)], strokeWidth: 5 }, position: [CX, 70],
    guides: (p, ink, at) => [path('guide-arc', at, ink.guide, arc(172, 90 - Number(p.amount), 90 + Number(p.amount))), path('guide-rest', at, ink.ghost, [[0, 0], [0, 194]])] },
  'loop.float': { subject: square, params: { amplitudePx: 120 }, guides: (_, ink, at) => [path('guide-cross', at, ink.ghost, [[-20, 0], [20, 0], [0, 0], [0, -20], [0, 20]])] },
  'loop.spin': { subject: { points: arc(70, -90, 180), strokeWidth: 10 }, params: { turnsPerSecond: 0.6 },
    guides: (_, ink, at) => [path('guide-ring', at, ink.ghost, circle(70), { closed: true, strokeWidth: 10 })] },
  'loop.flicker': { subject: subjectPath(star(5, 90, 38), { fill: true }), params: { rateHz: 8 } },
  'loop.wave': { subject: dot(12), carriers: [{ recipe: 'choreo.array', params: { count: 9, gapPx: 56, angleDeg: 0 } }],
    guides: (_, ink, at) => [path('guide-axis', at, ink.ghost, [[-250, 0], [250, 0]])] },

  // 编排
  'choreo.stagger': { subject: row, frames: 80,
    carriers: [{ recipe: 'choreo.array', params: { count: 5, gapPx: 54, angleDeg: 90 } }, { recipe: 'timing.overshoot' },
      { recipe: 'prop.move', params: { fromPx: -440, toPx: 0, angleDeg: 0 }, start: 4, duration: 30 }, { recipe: 'prop.opacity', params: { from: 0, to: 1 }, start: 4, duration: 30 }] },
  'choreo.cascade': { subject: dot(12), frames: 84,
    carriers: [{ recipe: 'choreo.grid', params: { columns: 9, rows: 5, gapPx: 58 } }, { recipe: 'timing.overshoot' },
      { recipe: 'prop.scale', params: { from: 0, to: 1 }, start: 2, duration: 24 }],
    guides: (_, ink, at) => [path('guide-cross', at, ink.guide, [[-24, 0], [24, 0], [0, 0], [0, -24], [0, 24]])] },
  'choreo.follow': { subject: dot(16), params: { count: 7, lagFrames: 6, falloff: 0.11 }, carriers: [{ recipe: 'loop.float', params: { amplitudePx: 260, rotateDeg: 0, frequencyHz: 0.7 } }] },
  'choreo.random': { subject: subjectPath(rect(40, 40), { fill: true }), frames: 84,
    carriers: [{ recipe: 'choreo.grid', params: { columns: 8, rows: 4, gapPx: 62 } }, { recipe: 'timing.overshoot' },
      { recipe: 'prop.scale', params: { from: 0, to: 1 }, start: 2, duration: 22 }, { recipe: 'prop.opacity', params: { from: 0, to: 1 }, start: 2, duration: 22 }] },
  'choreo.array': { subject: subjectPath(rect(46, 46)), carriers: [{ recipe: 'loop.spin', params: { turnsPerSecond: 0.3 } }],
    guides: (p, ink, at) => { const a = Number(p.angleDeg) * Math.PI / 180; const half = (Number(p.count) - 1) / 2 * Number(p.gapPx) + 40;
      return [path('guide-line', at, ink.guide, [[-half * Math.cos(a), -half * Math.sin(a)], [half * Math.cos(a), half * Math.sin(a)]])]; } },
  'choreo.ring': { subject: subjectPath([[-5, -22], [5, -22], [5, 22], [-5, 22]], { fill: true }), params: { count: 12, radiusPx: 110 },
    carriers: [{ recipe: 'choreo.stagger', params: { stepFrames: 3, order: 'forward' } }, { recipe: 'loop.breathe', params: { amount: 0.45, periodS: 1.2 } }],
    guides: (p, ink, at) => [path('guide-ring', at, ink.guide, circle(Number(p.radiusPx)), { closed: true })] },
  'choreo.grid': { subject: dot(9), params: { columns: 9, rows: 5, gapPx: 56 }, carriers: [{ recipe: 'loop.wave', params: { amplitudePx: 14, periodS: 1.6, phaseDeg: 22 } }] },
  'choreo.mirror': { subject: subjectPath([[-30, -26], [34, 0], [-30, 26], [-14, 0]], { fill: true }), params: { axis: 'x', distancePx: 60 }, frames: 80,
    carriers: [{ recipe: 'prop.move', params: { fromPx: 0, toPx: 170, angleDeg: -20 }, start: 6, duration: 54 }, { recipe: 'prop.rotate', params: { fromDeg: 0, toDeg: 90 }, start: 6, duration: 54 }],
    guides: (_, ink, at) => [path('guide-axis', at, ink.guide, [[0, -170], [0, 170]])] },

  // 转场：一张卡片
  'transition.wipe': { subject: card, duration: 48, frames: 72, guides: cardOutline },
  'transition.iris': { subject: card, duration: 48, frames: 72, guides: cardOutline },
  'transition.slices': { subject: card, duration: 54, frames: 78, guides: cardOutline },
  'transition.blinds': { subject: card, duration: 48, frames: 72, guides: cardOutline },
  'transition.flip': { subject: card, duration: 48, frames: 72, carriers: [{ recipe: 'timing.overshoot', params: { tension: 1.2 } }],
    guides: (p, ink, at) => [path('guide-axis', at, ink.guide, p.axis === 'x' ? [[-170, 0], [170, 0]] : [[0, -120], [0, 120]])] },
  'transition.push': { subject: card, duration: 48, frames: 72, guides: cardOutline },
  'transition.dissolve': { subject: card, duration: 54, frames: 78, guides: cardOutline },

  // 文字
  'text.chars': { text: { text: 'MOTION', fontSize: 104, position: [136, 240] }, duration: 40, frames: 70 },
  'text.lines': { text: { text: '让文字\n一行一行出现', fontSize: 58, lineHeight: 80, position: [148, 180] }, duration: 44, frames: 72 },
  'text.decode': { text: { text: 'SYSTEM\nONLINE', fontSize: 64, lineHeight: 82, mono: true, position: [200, 180] }, duration: 54, frames: 80 },
  'text.type': { text: { text: 'Hello,\nmotion.', fontSize: 64, lineHeight: 82, mono: true, position: [200, 180] }, duration: 54, frames: 96 },
  'text.count': { text: { text: '#', fontSize: 120, position: [180, 240] }, duration: 54, frames: 78 },
  'text.tracking': { text: { text: 'TRACKING', fontSize: 72, position: [168, 226] }, duration: 54, frames: 78 },

  // 质感
  'feel.trail': { subject: subjectPath(rect(56, 56), { fill: true }), params: { count: 7, gapFrames: 1.5, strength: 0.6 },
    carriers: [{ recipe: 'loop.swing', params: { axis: 'x', amount: 200, periodS: 1.6 } }, { recipe: 'loop.spin', params: { turnsPerSecond: 0.4 } }] },
  'feel.motion-blur': { subject: subjectPath(rect(56, 56), { fill: true }), params: { shutterDeg: 360 }, carriers: [{ recipe: 'loop.swing', params: { axis: 'x', amount: 210, periodS: 1.4 } }],
    guides: (_, ink, at) => [path('guide-track', at, ink.ghost, [[-240, 0], [240, 0]])] },
  'feel.glow': { subject: subjectPath(star(5, 100, 42), { strokeWidth: 6 }), params: { radiusPx: 12, strength: 1.4 },
    carriers: [{ recipe: 'prop.draw', params: { from: 0, to: 1, trailRatio: 0 }, start: 0, duration: 54 }], frames: 80 },
  'feel.grain': { subject: subjectPath(circle(110), { fill: true }) },
  'feel.glitch': { text: { text: 'GLITCH', fontSize: 108, position: [138, 238] }, params: { offsetPx: 34, chance: 0.4 } },
  'feel.chroma': { text: { text: 'RGB', fontSize: 150, position: [186, 254] }, params: { offsetPx: 8 }, carriers: [{ recipe: 'loop.swing', params: { axis: 'x', amount: 24, periodS: 2 } }] },

  // 生成
  'gen.particles': { subject: { points: [[-1, 0], [1, 0]], strokeWidth: 2 }, position: [CX, 290],
    guides: (_, ink, at) => [path('guide-ground', at, ink.ghost, [[-200, 0], [200, 0]])] },
  'gen.shatter': { subject: subjectPath(polygon(90, 6), { fill: true }), duration: 60, frames: 84, guides: (_, ink, at) => [path('guide-outline', at, ink.ghost, polygon(90, 6), { closed: true })] },
  'gen.ripple': { subject: subjectPath(circle(34), { strokeWidth: 4 }) },
  'gen.trace': { subject: dot(10), params: { lengthFrames: 36 },
    carriers: [{ recipe: 'loop.swing', params: { axis: 'x', amount: 200, periodS: 2.4 } }, { recipe: 'loop.swing', params: { axis: 'y', amount: 120, periodS: 1.6 } }] },
  'gen.link': { subject: dot(7), params: { mode: 'near', maxDistancePx: 130 },
    carriers: [{ recipe: 'choreo.grid', params: { columns: 6, rows: 4, gapPx: 96 } }, { recipe: 'loop.float', params: { amplitudePx: 90, rotateDeg: 0, frequencyHz: 0.4 } }] },
};

/** Each table element is a standalone scene featuring exactly one atom as its first clip. */
export function createExampleScene(id: RecipeId, font?: FontAsset, theme: Theme = 'light'): MotionSpec {
  const entry = getCapability(id)!; const demo = demos[id]; const ink = inks(theme, id); const ongoing = [id, ...(demo.carriers ?? []).map((carrier) => carrier.recipe)].every((recipe) => getCapability(recipe)!.time !== 'finite');
  const frames = demo.frames ?? (ongoing ? 240 : 80);
  const at: Vec2 = demo.text ? demo.text.position : demo.position ?? [CX, CY];
  const params = { ...defaultParams(id), ...demo.params };
  let subject: SceneNode;
  if (demo.text) {
    subject = { id: 'subject', type: 'text', position: demo.text.position, color: ink.ink, text: demo.text.text, font: demo.text.mono ? 'mono' : font ? 'demoFont' : 'system',
      fontSize: demo.text.fontSize, lineHeight: demo.text.lineHeight ?? demo.text.fontSize };
  } else {
    const shape = demo.subject ?? square;
    subject = { id: 'subject', type: 'path', position: at, color: ink.ink, points: shape.points!, strokeWidth: shape.strokeWidth ?? 5,
      ...(shape.closed ? { closed: true } : {}), ...(shape.fill ? { fill: true } : {}) };
  }
  const clip = (clipId: string, recipe: RecipeId, values: Record<string, number | string>, start: number, duration: number): Clip =>
    ({ id: clipId, target: 'subject', recipe, startFrame: start, durationFrames: Math.min(duration, frames - start), fillAfter: 'hold', params: values });
  const featuredStart = demo.start ?? 0; const featuredLength = demo.duration ?? frames;
  // Only finite atoms have a length of their own; the rest span the scene.
  const clips = [clip('effect', id, params, featuredStart, entry.time === 'finite' ? featuredLength : frames - featuredStart)];
  (demo.carriers ?? []).forEach((carrier, i) => {
    const time = getCapability(carrier.recipe)!.time;
    clips.push(clip(`carrier-${i + 1}`, carrier.recipe, { ...defaultParams(carrier.recipe), ...carrier.params }, carrier.start ?? 0, time === 'finite' ? carrier.duration ?? frames : frames));
  });
  const scene: MotionSpec = {
    specVersion: '0.1', seed: 42, canvas: { width: W, height: H, background: palettes[theme].paper },
    fps: { numerator: 30, denominator: 1 }, durationFrames: frames, assets: {},
    nodes: [...(demo.guides?.(params, ink, at) ?? []), subject], clips,
  };
  if (subject.type === 'text' && subject.font === 'demoFont' && font) scene.assets = { demoFont: structuredClone(font) };
  if (id === 'prop.color') { scene.clips[0]!.params.from = ink.ink; scene.clips[0]!.params.to = ink.accent; }
  // A glow in dark ink on light paper reads as a shadow; the family colour shows it as light in both themes.
  if (id === 'feel.glow') subject.color = ink.accent;
  return scene;
}

/** Text demos are framed around their text in the table; outline demos show the middle of the sheet. */
export const previewKind = (id: RecipeId): 'text' | 'geometry' => demos[id].text ? 'text' : 'geometry';
/** Atoms whose picture depends on the scene seed; their detail page offers to change it. */
export const seeded: readonly RecipeId[] = ['loop.float', 'loop.flicker', 'choreo.random', 'transition.dissolve', 'text.decode', 'feel.grain', 'feel.glitch', 'gen.particles', 'gen.shatter', 'gen.link'];

/** Guides are example geometry, regenerated from the featured clip's parameters after an edit. */
export function updateExampleGuides(scene: MotionSpec): void {
  const clip = scene.clips[0]; const subject = scene.nodes.find((node) => node.id === 'subject');
  if (!clip || !subject) return;
  const demo = demos[clip.recipe]; const guides = demo?.guides?.(clip.params, inks(themeOf(scene), clip.recipe), subject.position) ?? [];
  scene.nodes = scene.nodes.filter((node) => !node.id.startsWith('guide-'));
  scene.nodes.splice(scene.nodes.findIndex((node) => node.id === 'subject'), 0, ...guides);
}
