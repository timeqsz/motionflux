import type { Issue, MotionSpec } from './types.js';
import type { Schema } from './schema.js';

/** Source time is always seconds in the original reference, independent of the authored scene clock. */
export interface MotionStudy {
  studyVersion: '0.1'; title: string;
  source: { video: string; from: number; to: number };
  subjects: { id: string; description: string }[];
  events: {
    id: string; subject: string; from: number; to: number;
    status: 'observed' | 'inferred' | 'unknown'; description: string;
    evidence: { at: number; note: string }[];
    implementation?: { targets: string[]; clips: string[]; animations: string[]; method: 'direct' | 'approximate' | 'custom'; note: string };
  }[];
}
const object = (properties: Record<string, Schema>): Schema => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
const text: Schema = { type: 'string', minLength: 1, maxLength: 2000 };
const id: Schema = { type: 'string', pattern: '^[a-zA-Z][a-zA-Z0-9_-]*$', minLength: 1, maxLength: 64 };
const seconds: Schema = { type: 'number', minimum: 0, maximum: 86400 };
const array = (items: Schema, minItems = 0): Schema => ({ type: 'array', items, minItems, maxItems: 1000 });
const event = object({ id, subject: id, from: seconds, to: seconds,
  status: { enum: ['observed', 'inferred', 'unknown'] }, description: text,
  evidence: array(object({ at: seconds, note: text })),
});
export const studySchema: Schema = object({ studyVersion: { const: '0.1' }, title: text,
  source: object({ video: text, from: seconds, to: seconds }),
  subjects: array(object({ id, description: text }), 1),
  events: array({ ...event, properties: { ...event.properties,
    implementation: object({ targets: array(id, 1), clips: array(id), animations: array(id),
      method: { enum: ['direct', 'approximate', 'custom'] }, note: text }),
  } }, 1),
});
/** Called only after structural validation. Unbound studies are valid analysis-only deliverables. */
export function studyIssues(study: MotionStudy, scene?: MotionSpec): Issue[] {
  const issues: Issue[] = [];
  const add = (path: string, message: string) => issues.push({ path, code: 'STUDY', message });
  if (study.source.to <= study.source.from) add('$.source.to', 'Source end must follow source start, in seconds.');
  const subjectIds = new Set<string>();
  study.subjects.forEach((subject, i) => {
    if (subjectIds.has(subject.id)) add(`$.subjects[${i}].id`, 'Subject IDs must be unique.');
    subjectIds.add(subject.id);
  });
  const eventIds = new Set<string>();
  study.events.forEach((event, i) => {
    const at = `$.events[${i}]`;
    if (eventIds.has(event.id)) add(`${at}.id`, 'Event IDs must be unique.');
    eventIds.add(event.id);
    if (!subjectIds.has(event.subject)) add(`${at}.subject`, 'Reference an existing subject.');
    if (event.to <= event.from || event.from < study.source.from || event.to > study.source.to) add(at, 'Event must have positive duration and fit in the source range.');
    if (event.status !== 'unknown' && !event.evidence.length) add(`${at}.evidence`, 'Observations and inferences require timestamped evidence.');
    for (const evidence of event.evidence) if (evidence.at < event.from || evidence.at > event.to) add(`${at}.evidence`, 'Evidence timestamp must lie within this event.');
    if (!scene || !event.implementation) return;
    const binding = event.implementation;
    for (const target of binding.targets) if (!scene.nodes.some(node => node.id === target)) add(`${at}.implementation.targets`, `Missing scene object ${target}.`);
    for (const [field, collection] of [['clips', scene.clips], ['animations', scene.animations ?? []]] as const) for (const id of binding[field]) {
      const item = collection.find(item => item.id === id);
      if (!item) add(`${at}.implementation.${field}`, `Missing ${field} ID ${id}.`);
      else if (!binding.targets.includes(item.target)) add(`${at}.implementation.${field}`, `${id} must animate a bound target.`);
    }
  });
  return issues;
}

/** This is an implementation map, not a claim of visual equivalence to the reference. */
export function studyReport(study: MotionStudy, scene?: MotionSpec) {
  const fps = scene ? scene.fps.numerator / scene.fps.denominator : undefined;
  return { studyVersion: study.studyVersion, title: study.title, source: study.source, bindingsVerified: Boolean(scene),
    events: study.events.map(event => ({ ...event,
      localSeconds: [event.from - study.source.from, event.to - study.source.from],
      output: scene && event.implementation ? [
        ...scene.clips.filter(item => event.implementation!.clips.includes(item.id)).map(item => ({
          id: item.id, target: item.target, frames: [item.startFrame, item.startFrame + item.durationFrames], seconds: [item.startFrame / fps!, (item.startFrame + item.durationFrames) / fps!],
        })),
        ...(scene.animations ?? []).filter(item => event.implementation!.animations.includes(item.id)).map(item => ({
          id: item.id, target: item.target, frames: [item.keyframes[0]!.frame, item.keyframes.at(-1)!.frame],
          seconds: [item.keyframes[0]!.frame / fps!, item.keyframes.at(-1)!.frame / fps!],
        })),
      ] : [],
    })), visualComparison: 'not-performed' };
}
