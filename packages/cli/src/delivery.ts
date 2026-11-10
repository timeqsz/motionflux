import { createHash } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { compileScene, type MotionSpec } from '../../core/src/index.js';
import { versionLock } from '../../core/src/export.js';
import { getCapability } from '../../catalog/src/index.js';

interface Change {
  collection: 'scene' | 'nodes' | 'clips' | 'assets';
  id?: string;
  /** Field within the entity; arrays such as position and points remain whole values. */
  field: string;
  before?: unknown;
  after?: unknown;
}
const hash = (data: string | Buffer) => createHash('sha256').update(data).digest('hex');
const sceneHash = (scene: MotionSpec) => hash(JSON.stringify(scene));
const object = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

/** Stable IDs distinguish a changed entity from an insertion elsewhere in the scene. */
function changesBetween(before: MotionSpec, after: MotionSpec): Change[] {
  const changes: Change[] = [];
  function compare(a: unknown, b: unknown, location: Omit<Change, 'before' | 'after'>) {
    if (isDeepStrictEqual(a, b)) return;
    if (object(a) && object(b)) {
      for (const key of [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()) {
        compare(a[key], b[key], { ...location, field: location.field ? `${location.field}.${key}` : key });
      }
    } else changes.push({ ...location, ...(a !== undefined ? { before: a } : {}), ...(b !== undefined ? { after: b } : {}) });
  }
  const { nodes: beforeNodes, clips: beforeClips, assets: beforeAssets, ...beforeSettings } = before;
  const { nodes: afterNodes, clips: afterClips, assets: afterAssets, ...afterSettings } = after;
  compare(beforeSettings, afterSettings, { collection: 'scene', field: '' });
  for (const [collection, a, b] of [['nodes', beforeNodes, afterNodes], ['clips', beforeClips, afterClips]] as const) {
    compare(a.map(item => item.id), b.map(item => item.id), { collection: 'scene', field: `${collection}Order` });
    const oldById = new Map<string, unknown>(a.map(item => [item.id, item]));
    const newById = new Map<string, unknown>(b.map(item => [item.id, item]));
    for (const id of [...new Set([...oldById.keys(), ...newById.keys()])].sort()) {
      compare(oldById.get(id), newById.get(id), { collection, id, field: '' });
    }
  }
  for (const id of [...new Set([...Object.keys(beforeAssets), ...Object.keys(afterAssets)])].sort()) {
    compare(beforeAssets[id], afterAssets[id], { collection: 'assets', id, field: '' });
  }
  return changes;
}

function finite(value: unknown): boolean {
  if (typeof value === 'number') return Number.isFinite(value);
  if (value && typeof value === 'object') return Object.values(value).every(finite);
  return true;
}

/** Checks numeric evaluation at boundaries, never claims to review rendered pixels. */
function sampleChecks(scene: MotionSpec) {
  const last = scene.durationFrames - 1;
  const frames = [...new Set([0, Math.floor(last / 2), last, ...scene.clips.flatMap(clip =>
    [clip.startFrame, clip.startFrame + clip.durationFrames - 1, clip.startFrame + clip.durationFrames].map(frame => Math.min(last, frame)))])].sort((a, b) => a - b);
  const compiled = compileScene(scene);
  const states = frames.map(frame => {
    const state = compiled.evaluate(frame);
    if (!finite(state)) throw new Error('EVALUATION_FAILED: Non-finite values at sampled frames.');
    return hash(JSON.stringify(state));
  });
  for (let i = frames.length - 1; i >= 0; i--) {
    if (states[i] !== hash(JSON.stringify(compiled.evaluate(frames[i]!)))) throw new Error('EVALUATION_FAILED: Frame evaluation depends on call order.');
  }
  return { frames, finite: true, repeatable: true };
}

/** A self-contained, editable revision. Creating a new directory protects earlier deliveries. */
export async function writeDelivery(input: {
  scene: MotionSpec; previous?: MotionSpec; assets: Record<string, string>; html: string; out: string;
}) {
  const { scene, previous, assets, html } = input;
  const samples = sampleChecks(scene);
  const directory = resolve(input.out);
  const files = new Map<string, Buffer>([
    ['scene.json', Buffer.from(`${JSON.stringify(scene, null, 2)}\n`)],
    ['preview.html', Buffer.from(html)],
    ...Object.entries(assets).map(([path, data]): [string, Buffer] => [path, Buffer.from(data, 'base64')]),
  ]);
  const report = {
    format: 'motionflux-delivery/v1',
    sourceSceneHash: sceneHash(scene),
    lock: versionLock(scene),
    canvas: scene.canvas,
    fps: scene.fps,
    durationSeconds: scene.durationFrames * scene.fps.denominator / scene.fps.numerator,
    atoms: [...new Set(scene.clips.map(clip => clip.recipe))].map(id => {
      const atom = getCapability(id)!;
      return { id, version: atom.version, writes: atom.writes };
    }),
    checks: { schema: 'passed', assetsVerified: Object.keys(scene.assets).length, samples,
      visualReview: 'not-performed', browserPlayback: 'not-performed', assetLicenses: 'not-verified' },
    videoDelivered: false,
    ...(previous ? { revision: { previousSceneHash: sceneHash(previous), changes: changesBetween(previous, scene) } } : {}),
    files: [...files].map(([path, data]) => ({ path, bytes: data.length, sha256: hash(data) })),
  };
  await mkdir(dirname(directory), { recursive: true });
  try { await mkdir(directory); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new Error('OUTPUT_EXISTS: Choose a new delivery directory; earlier revisions are never overwritten.');
    throw error;
  }
  try {
    for (const [path, data] of files) {
      const destination = join(directory, path);
      await mkdir(dirname(destination), { recursive: true });
      await writeFile(destination, data);
    }
    await writeFile(join(directory, 'delivery.json'), `${JSON.stringify(report, null, 2)}\n`);
  } catch (error) { await rm(directory, { recursive: true, force: true }); throw error; }
  return { directory, preview: join(directory, 'preview.html'), scene: join(directory, 'scene.json'),
    report: join(directory, 'delivery.json'), files: files.size + 1, changes: report.revision?.changes.length ?? 0,
    videoDelivered: false, visualReview: 'not-performed' };
}
