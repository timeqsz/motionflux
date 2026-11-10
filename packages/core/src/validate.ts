import { getCapability } from '../../catalog/src/index.js';
import { motionSchema, type Schema } from './schema.js';
import type { Issue, MotionSpec } from './types.js';

function check(value: unknown, schema: Schema, path: string, issues: Issue[]): void {
  const issue = (message: string) => { issues.push({ path, code: 'SCHEMA', message }); };
  if (schema.oneOf) {
    const results = schema.oneOf.map((variant) => { const errors: Issue[] = []; check(value, variant, path, errors); return errors; });
    if (results.filter((errors) => !errors.length).length === 1) return;
    // Prefer the matching discriminant so errors locate an actual field.
    const object = value && typeof value === 'object' ? value as Record<string, unknown> : {};
    const selected = schema.oneOf.findIndex((variant) => Object.entries(variant.properties ?? {}).some(([key, field]) => field.const !== undefined && object[key] === field.const));
    if (selected >= 0) issues.push(...results[selected]!);
    else issue('Unsupported node type or recipe. Use a catalog entry supported by this version.');
    return;
  }
  if (schema.const !== undefined && value !== schema.const) issue(`Expected ${JSON.stringify(schema.const)}.`);
  if (schema.enum && !schema.enum.includes(value as string)) issue(`Choose one of ${schema.enum.join(', ')}.`);
  if (schema.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) { issue('Expected a plain object.'); return; }
    const record = value as Record<string, unknown>;
    for (const key of schema.required ?? []) if (!Object.hasOwn(record, key)) issues.push({ path: `${path}.${key}`, code: 'REQUIRED', message: 'Required field is missing.' });
    for (const [key, child] of Object.entries(record)) {
      const field = Object.hasOwn(schema.properties ?? {}, key) ? schema.properties![key] : undefined;
      if (field) check(child, field, `${path}.${key}`, issues);
      else if (schema.additionalProperties === false) issues.push({ path: `${path}.${key}`, code: 'UNKNOWN_FIELD', message: 'Unsupported field; remove it or use a supported schema version.' });
      else if (typeof schema.additionalProperties === 'object') check(child, schema.additionalProperties, `${path}.${key}`, issues);
    }
  } else if (schema.type === 'array') {
    if (!Array.isArray(value)) { issue('Expected an array.'); return; }
    if (schema.minItems !== undefined && value.length < schema.minItems) issue(`Requires at least ${schema.minItems} items.`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems) { issue(`Allows at most ${schema.maxItems} items.`); return; }
    if (schema.items) value.forEach((child, i) => check(child, schema.items!, `${path}[${i}]`, issues));
  } else if (schema.type === 'string') {
    if (typeof value !== 'string') { issue('Expected a string.'); return; }
    if (schema.minLength !== undefined && value.length < schema.minLength) issue('String must not be empty.');
    if (schema.maxLength !== undefined && value.length > schema.maxLength) issue(`Maximum string length is ${schema.maxLength}.`);
    if (schema.pattern && !new RegExp(schema.pattern, 'u').test(value)) issue('Value does not match the required format.');
  } else if (schema.type === 'boolean') {
    if (typeof value !== 'boolean') issue('Expected true or false.');
  } else if (schema.type === 'number' || schema.type === 'integer') {
    if (typeof value !== 'number' || !Number.isFinite(value)) { issue('Expected a finite number.'); return; }
    if (schema.type === 'integer' && !Number.isInteger(value)) issue('Expected an integer.');
    if (schema.minimum !== undefined && value < schema.minimum) issue(`Minimum is ${schema.minimum}.`);
    if (schema.maximum !== undefined && value > schema.maximum) issue(`Maximum is ${schema.maximum}.`);
  }
}
export function validateScene(value: unknown): Issue[] {
  const issues: Issue[] = [];
  check(value, motionSchema, '$', issues);
  if (issues.length) return issues;
  const scene = value as MotionSpec;
  const add = (path: string, code: string, message: string) => issues.push({ path, code, message });
  const rate = scene.fps.numerator / scene.fps.denominator;
  if (rate < 1 || rate > 120) add('$.fps', 'FPS_RANGE', 'Effective frame rate must be 1–120 fps.');
  const ids = new Set<string>();
  scene.nodes.forEach((node, i) => {
    if (ids.has(node.id)) add(`$.nodes[${i}].id`, 'DUPLICATE_ID', 'Node ID must be unique.');
    ids.add(node.id);
    if (node.type === 'text') {
      if (node.font !== 'system' && node.font !== 'mono' && !Object.hasOwn(scene.assets, node.font)) add(`$.nodes[${i}].font`, 'MISSING_FONT', 'Use system or mono, or declare this font asset and include the matching file.');
      if (node.text.includes('\r') || node.text.includes('\t')) add(`$.nodes[${i}].text`, 'TEXT_LAYOUT', 'Use explicit LF newlines and spaces, not CR or tabs.');
      if (node.text.split('\n').length > 20) add(`$.nodes[${i}].text`, 'TEXT_LAYOUT', 'At most 20 explicit lines are supported.');
    }
  });
  const assetFamilies = new Set<string>();
  for (const [id, asset] of Object.entries(scene.assets)) {
    if (id === 'system' || id === 'mono') add(`$.assets.${id}`, 'ASSET_ID', `${id} is reserved for a device font; choose another asset ID.`);
    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(id)) add(`$.assets.${id}`, 'ASSET_ID', 'Use a stable alphanumeric asset ID.');
    if (assetFamilies.has(asset.family)) add(`$.assets.${id}.family`, 'FONT_FAMILY', 'Each font asset must have a unique family.');
    assetFamilies.add(asset.family);
  }
  const clipIds = new Set<string>();
  const writers = new Map<string, { start: number; end: number }[]>();
  scene.clips.forEach((clip, i) => {
    const path = `$.clips[${i}]`;
    if (clipIds.has(clip.id)) add(`${path}.id`, 'DUPLICATE_ID', 'Clip ID must be unique.');
    clipIds.add(clip.id);
    const node = scene.nodes.find((node) => node.id === clip.target);
    const capability = getCapability(clip.recipe)!;
    if (!node) add(`${path}.target`, 'MISSING_TARGET', 'Reference an existing node ID.');
    else if (!capability.targets.includes(node.type)) add(`${path}.target`, 'TARGET_TYPE', `${clip.recipe} cannot target ${node.type}.`);
    if (clip.startFrame + clip.durationFrames > scene.durationFrames) add(`${path}.durationFrames`, 'CLIP_BOUNDS', 'Clip must fit inside the scene.');
    // Property clips may take turns; while they overlap there is no rule for which one wins. Loops, layouts,
    // timing curves and looks layer instead, so they never conflict.
    if (capability.role === 'property') for (const property of capability.writes) {
      const key = `${clip.target}:${property}`; const span = { start: clip.startFrame, end: clip.startFrame + clip.durationFrames };
      const spans = writers.get(key) ?? [];
      if (spans.some((other) => span.start < other.end && other.start < span.end)) add(path, 'PROPERTY_CONFLICT', `Clips overlap on ${key}. Clips that write the same property must not share any frame; let one end before the next starts.`);
      writers.set(key, [...spans, span]);
    }
    if (node?.type === 'text' && clip.recipe === 'text.lines' && (node.text.split('\n').length - 1) * Number(clip.params.stepFrames) >= clip.durationFrames)
      add(`${path}.params.stepFrames`, 'STAGGER_BOUNDS', 'Leave positive animation time for every line within the clip.');
    if (node?.type === 'text' && clip.recipe === 'text.chars' && ([...node.text].filter((character) => character.trim()).length - 1) * Number(clip.params.stepFrames) >= clip.durationFrames)
      add(`${path}.params.stepFrames`, 'STAGGER_BOUNDS', 'Leave positive animation time for every character within the clip.');
  });
  return issues;
}
export class SceneValidationError extends Error {
  readonly code = 'INVALID_SCENE';
  constructor(public readonly issues: Issue[]) { super(issues.map((issue) => `${issue.path}: ${issue.message}`).join('\n')); }
}
export function assertScene(value: unknown): asserts value is MotionSpec {
  const issues = validateScene(value);
  if (issues.length) throw new SceneValidationError(issues);
}
