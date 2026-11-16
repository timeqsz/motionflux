import { object, string, number, integer, type Schema } from './schema.js';
import { assertScene, validateData } from './validate.js';
import type { AnimationTrack, AnimatedProperty, ImageAsset, MotionSpec, SceneNode, Vec2 } from './types.js';

const color = string(7, '^#[0-9a-fA-F]{6}$');
const id = string(64, '^[a-zA-Z][a-zA-Z0-9_-]*$');
export const brandSchema = object({
  name: string(80),
  palette: object({ background: color, ink: color, muted: color, accent: color }),
  typography: object({ headlineRatio: number(.06, .18), bodyRatio: number(.018, .045) }),
  motion: object({ enterSeconds: number(.2, 2), travelSeconds: number(.3, 2),
    minReadSeconds: number(.8, 5), readUnitsPerSecond: number(3, 20), endHoldSeconds: number(.8, 4) }),
});
export interface BrandRules {
  name: string;
  palette: { background: string; ink: string; muted: string; accent: string };
  typography: { headlineRatio: number; bodyRatio: number };
  motion: { enterSeconds: number; travelSeconds: number; minReadSeconds: number; readUnitsPerSecond: number; endHoldSeconds: number };
}
export interface PatternBrief {
  briefVersion: '0.1'; pattern: 'title-yields-to-product';
  canvas: { width: number; height: number }; fps: number; durationSeconds: number;
  copy: { headline: string; detail: string; closing: string };
  product: { src: string; sha256: string; license: string };
  brand: BrandRules;
}
export const briefSchema = object({
  briefVersion: { const: '0.1' }, pattern: { const: 'title-yields-to-product' },
  canvas: object({ width: integer(320, 1920), height: integer(320, 1920) }),
  fps: integer(24, 60), durationSeconds: number(4, 30),
  copy: object({ headline: string(160), detail: string(240), closing: string(100) }),
  product: object({ src: string(300), sha256: string(64, '^[0-9a-f]{64}$'), license: string(500) }),
  brand: brandSchema,
});
function requireSchema(value: unknown, schema: Schema): void {
  const issues = validateData(value, schema);
  if (issues.length) throw new Error(`AUTHORING_INVALID: ${issues.map(issue => `${issue.path}: ${issue.message}`).join('; ')}`);
}
export function readBrief(value: unknown): PatternBrief {
  requireSchema(value, briefSchema);
  const brief = value as PatternBrief;
  const aspect = brief.canvas.width / brief.canvas.height;
  if (aspect < .5 || aspect > 2) throw new Error('PATTERN_FIT: This pattern supports aspect ratios from 1:2 to 2:1.');
  for (const [field, content] of Object.entries(brief.copy)) {
    if (/\r|\t/u.test(content) || content.split('\n').some(line => !line.trim()) || content.split('\n').length > 3)
      throw new Error(`COPY_LAYOUT: ${field} needs one to three nonempty lines, using explicit LF breaks.`);
  }
  if (!/\.(png|jpe?g|webp)$/iu.test(brief.product.src)) throw new Error('PRODUCT_FORMAT: Use a static PNG, JPEG or WebP image.');
  return structuredClone(brief);
}

export interface Control {
  id: string; label: string; collection: 'nodes' | 'animations' | 'assets' | 'scene';
  target: string; field: string; kind: 'text' | 'color' | 'number' | 'vector' | 'keyframes' | 'asset';
  unit: string; note: string;
}
export interface AuthoringRecord {
  authoringVersion: '0.1'; pattern: { id: string; version: string };
  origin: 'original'; brand: BrandRules; assetLicense: string;
  decisions: string[]; controls: Control[];
}
const controlSchema = object({ id, label: string(100), collection: { enum: ['nodes', 'animations', 'assets', 'scene'] },
  target: string(100), field: string(100), kind: { enum: ['text', 'color', 'number', 'vector', 'keyframes', 'asset'] },
  unit: string(100), note: string(500) });
export const authoringSchema = object({ authoringVersion: { const: '0.1' }, pattern: object({ id, version: string(32) }),
  origin: { const: 'original' }, brand: brandSchema, assetLicense: string(500),
  decisions: { type: 'array', items: string(1000), maxItems: 30 },
  controls: { type: 'array', items: controlSchema, minItems: 1, maxItems: 100 } });

/** A control resolves a saved field by stable ID. It never carries another copy of its value. */
export function inspectControls(value: unknown, scene: MotionSpec) {
  requireSchema(value, authoringSchema); assertScene(scene);
  const record = value as AuthoringRecord;
  const ids = new Set<string>();
  const controls = record.controls.map(control => {
    if (ids.has(control.id)) throw new Error(`CONTROL_DUPLICATE: ${control.id}`);
    ids.add(control.id);
    let entity: unknown;
    if (control.collection === 'scene') entity = control.target === 'canvas' ? scene.canvas : undefined;
    else if (control.collection === 'assets') entity = scene.assets[control.target];
    else entity = (scene[control.collection] ?? []).find(item => item.id === control.target);
    if (!entity || typeof entity !== 'object') throw new Error(`CONTROL_TARGET: ${control.id} refers to missing ${control.target}.`);
    // Only direct saved fields are addressable; no expressions or arbitrary object paths.
    const fields: Record<Control['collection'], string[]> = {
      scene: ['background'], nodes: ['text', 'color', 'fontSize', 'lineHeight', 'position', 'pivot', 'scale', 'width', 'height', 'asset'],
      animations: ['keyframes'], assets: ['src'],
    };
    if (!fields[control.collection].includes(control.field) || !Object.hasOwn(entity, control.field))
      throw new Error(`CONTROL_FIELD: ${control.id} refers to unsupported ${control.field}.`);
    const saved = (entity as Record<string, unknown>)[control.field];
    const valid = control.kind === 'keyframes' ? control.collection === 'animations' && control.field === 'keyframes'
      : control.kind === 'vector' ? Array.isArray(saved) && saved.length === 2 && saved.every(n => typeof n === 'number')
      : control.kind === 'number' ? typeof saved === 'number'
      : control.kind === 'color' ? typeof saved === 'string' && /^#[0-9a-f]{6}$/iu.test(saved)
      : typeof saved === 'string';
    if (!valid) throw new Error(`CONTROL_TYPE: ${control.id} has the wrong saved value type.`);
    const tracks = control.collection === 'nodes' ? (scene.animations ?? []).filter(track => track.target === control.target &&
      (track.property === control.field || track.property.startsWith(`${control.field}.`))).map(track => track.id) : [];
    return { ...control, value: structuredClone(saved), animatedBy: tracks };
  });
  return { record, controls, bindingsVerified: true, visualReview: 'not-performed' as const };
}

// These estimates size an initial composition. Real font measurement remains part of visual review.
const widthUnits = (text: string) => [...text].reduce((sum, char) => sum + (/\s/u.test(char) ? .3 : /[\u0000-\u024f]/u.test(char) ? .6 : 1), 0);
const readingUnits = (text: string) => [...text.replace(/\s/gu, '')].reduce((sum, char) => sum + (/[\u0000-\u024f]/u.test(char) ? .5 : 1), 0);
export function composePattern(input: unknown, product: ImageAsset): { scene: MotionSpec; authoring: AuthoringRecord } {
  const brief = readBrief(input);
  const { width: w, height: h } = brief.canvas; const portrait = h > w;
  const { palette, typography, motion } = brief.brand;
  const fps = brief.fps; const frame = (seconds: number) => Math.round(seconds * fps);
  const enter = motion.enterSeconds;
  const read = Math.max(motion.minReadSeconds, readingUnits(brief.copy.headline) / motion.readUnitsPerSecond);
  const yieldAt = enter + read; const productAt = yieldAt + motion.travelSeconds;
  const detailAt = productAt + .35;
  const detailRead = Math.max(motion.minReadSeconds, readingUnits(brief.copy.detail) / motion.readUnitsPerSecond);
  const closingAt = detailAt + enter + detailRead;
  const closingRead = Math.max(motion.endHoldSeconds, readingUnits(brief.copy.closing) / motion.readUnitsPerSecond);
  const minimum = closingAt + enter + closingRead;
  const durationFrames = frame(brief.durationSeconds);
  if (durationFrames - 1 < frame(minimum)) throw new Error(`READING_TIME: Content needs at least ${(Math.ceil((minimum + 1 / fps) * 10) / 10).toFixed(1)} seconds. Increase duration or shorten copy; reading time is not compressed.`);
  const margin = w * .065;
  const headlineWidth = w * .87;
  const maxUnits = Math.max(...brief.copy.headline.split('\n').map(widthUnits));
  const headlineSize = Math.min(w * typography.headlineRatio, headlineWidth / maxUnits);
  if (headlineSize < w * .045) throw new Error('COPY_LAYOUT: Headline is too wide. Add an explicit line break or shorten it.');
  const titleScale = portrait ? .70 : .53;
  const titleY = h * .42; const finalTitleY = h * (portrait ? .18 : .29);
  const productWidth = portrait ? w * .82 : w * .49;
  const productHeight = portrait ? h * .43 : h * .72;
  const productPosition: Vec2 = [portrait ? w * .5 : w * .73, h * (portrait ? .54 : .53)];
  const body = w * typography.bodyRatio * (portrait ? 1.23 : 1);
  const nodes: SceneNode[] = [];
  const animations: AnimationTrack[] = [];
  const text = (id: string, content: string, position: Vec2, size: number, color: string, parent?: string) => {
    nodes.push({ id, type: 'text', text: content, position, fontSize: size, lineHeight: size * 1.15, color, font: 'system', ...(parent ? { parent } : {}) });
  };
  const track = (id: string, target: string, property: AnimatedProperty, keys: [number, number][]) => {
    animations.push({ id, target, property, keyframes: keys.map(([seconds, value]) => ({ frame: frame(seconds), value, easing: [0.22, 1, 0.36, 1] })) });
  };
  const reveal = (target: string, start: number, y: number) => {
    track(`${target}-opacity`, target, 'opacity', start === 0 ? [[0, 0], [enter, 1]] : [[0, 0], [start, 0], [start + enter, 1]]);
    track(`${target}-arrive`, target, 'position.y', [[start, y + h * .035], [start + enter, y]]);
  };
  text('brand', brief.brand.name, [margin, h * .095], body, palette.ink);
  nodes.push({ id: 'headline-group', type: 'group', position: [margin, titleY], color: palette.ink });
  text('headline', brief.copy.headline, [0, 0], headlineSize, palette.ink, 'headline-group');
  track('headline-opacity', 'headline-group', 'opacity', [[0, 0], [enter, 1]]);
  track('headline-y', 'headline-group', 'position.y', [[0, titleY + h * .08], [enter, titleY], [yieldAt, titleY], [productAt, finalTitleY]]);
  track('headline-scale', 'headline-group', 'scale', [[0, 1], [yieldAt, 1], [productAt, titleScale]]);
  nodes.push({ id: 'product', type: 'image', asset: 'product-image', color: '#ffffff', position: productPosition,
    pivot: [productWidth / 2, productHeight / 2], width: productWidth, height: productHeight, fit: 'contain' });
  track('product-opacity', 'product', 'opacity', [[0, 0], [yieldAt + .12, 0], [productAt, 1]]);
  track('product-scale', 'product', 'scale', [[yieldAt, .78], [productAt, 1]]);
  track('product-y', 'product', 'position.y', [[yieldAt, productPosition[1] + h * .12], [productAt, productPosition[1]]]);
  const detailY = portrait ? h * .82 : h * .61;
  nodes.push({ id: 'detail-group', type: 'group', color: palette.ink, position: [margin, detailY] });
  // A short rule introduces the product's stated benefit; no fabricated interface or product specifications.
  nodes.push({ id: 'detail-rule', type: 'path', parent: 'detail-group', position: [0, -body * 1.6], color: palette.accent,
    points: [[0, 0], [w * .08, 0]], strokeWidth: Math.max(2, w * .003) });
  const detailWidth = w * (portrait ? .86 : .40);
  const detailSize = Math.min(body, detailWidth / Math.max(...brief.copy.detail.split('\n').map(widthUnits)));
  if (detailSize < w * .015) throw new Error('COPY_LAYOUT: Detail copy needs shorter lines.');
  text('detail', brief.copy.detail, [0, 0], detailSize, palette.muted, 'detail-group');
  reveal('detail-group', detailAt, detailY);
  const closingSize = Math.min(body * .85, w * .86 / Math.max(...brief.copy.closing.split('\n').map(widthUnits)));
  text('closing', brief.copy.closing, [margin, h * .94 - (brief.copy.closing.split('\n').length - 1) * closingSize * 1.15], closingSize, palette.ink);
  track('closing-opacity', 'closing', 'opacity', [[0, 0], [closingAt, 0], [closingAt + enter, 1]]);
  const scene: MotionSpec = { specVersion: '0.2', seed: 17, canvas: { ...brief.canvas, background: palette.background },
    fps: { numerator: fps, denominator: 1 }, durationFrames, assets: { 'product-image': product }, nodes, clips: [], animations };
  assertScene(scene);
  const controls: Control[] = [
    ...['brand', 'headline', 'detail', 'closing'].map(target => ({ id: `${target}-copy`, label: `${target} 文案`, collection: 'nodes' as const, target, field: 'text', kind: 'text' as const, unit: 'LF 分行文本', note: '改长文本后检查字号、布局和停稳阅读时间。' })),
    { id: 'background', label: '背景色', collection: 'scene', target: 'canvas', field: 'background', kind: 'color', unit: '#RRGGBB', note: '品牌规则只作创作参考；当前场景中的保存值生效。' },
    { id: 'headline-color', label: '标题颜色', collection: 'nodes', target: 'headline', field: 'color', kind: 'color', unit: '#RRGGBB', note: '保持与背景的可读对比。' },
    { id: 'headline-size', label: '标题字号', collection: 'nodes', target: 'headline', field: 'fontSize', kind: 'number', unit: 'px', note: '同时检查 lineHeight；屏幕字号还受到父组缩放影响。' },
    { id: 'product-source', label: '产品图片', collection: 'assets', target: 'product-image', field: 'src', kind: 'asset', unit: '本地相对路径', note: '更换图片后更新 sha256，检查 contain、枢轴和图像留白。' },
    ...animations.map(animation => ({ id: animation.id, label: animation.id, collection: 'animations' as const, target: animation.id, field: 'keyframes', kind: 'keyframes' as const, unit: '场景帧 / 属性原单位', note: '修改明确的关键帧；不通过改 fps 调速。移动阶段时同步检查关联动作及尾部停留。' })),
  ];
  const authoring: AuthoringRecord = { authoringVersion: '0.1', pattern: { id: brief.pattern, version: '0.1.0' }, origin: 'original',
    brand: structuredClone(brief.brand), assetLicense: brief.product.license, controls,
    decisions: [
      '原创编排示例，无外部参考观察记录。品牌快照用于理解设计，不会覆盖场景保存值。',
      `${portrait ? '纵向' : '横向'}布局：标题先完成阅读，再让出产品空间；产品落定后引入细节，最后出现收尾文案。`,
      `初始规划（秒）：标题停稳 ${enter.toFixed(2)}，让位 ${yieldAt.toFixed(2)}，产品落定 ${productAt.toFixed(2)}，细节 ${detailAt.toFixed(2)}，收尾 ${closingAt.toFixed(2)}。后续以场景关键帧为准。`,
      '字号使用估算初排，实际字形宽度、重叠、节奏与编码后播放尚需检查；没有自动排版或自动视觉验收。',
    ] };
  inspectControls(authoring, scene);
  return { scene, authoring };
}
