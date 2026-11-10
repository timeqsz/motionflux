import { getCapability, table } from '../../catalog/src/index.js';
import { compileScene } from '../../core/src/index.js';
import type { MotionSpec } from '../../core/src/types.js';
import type { BreakdownPlan, BreakdownTrack } from '../../renderer-browser/src/breakdown.js';

const order: string[] = table.flatMap(([, ids]) => ids);
// Atom identity owns the color; separate actions using the same atom retain it across passages.
const colors: Record<string, string> = {
  'prop.move': '#67c8ff', 'prop.opacity': '#ffa452', 'timing.spring': '#c7a0ff',
  'choreo.stagger': '#60d9a8', 'text.type': '#ffe06b', 'transition.wipe': '#ff7eaf',
  'prop.scale': '#8f9dff', 'text.count': '#bae568', 'prop.draw': '#ff9587', 'prop.crop': '#95dfdd',
};
const colorOf = (id: string) => colors[id] ?? `hsl(${(order.indexOf(id) * 137.508 % 360).toFixed(3)} 75% 72%)`;
interface Action { atom: string; name: string; from: number; to: number }
/** One atom track contains separate named blocks; overlapping and touching actions never merge. */
function actionTracks(actions: Action[]): BreakdownTrack[] {
  const tracks = new Map<string, BreakdownTrack>();
  for (const action of actions) {
    const entry = getCapability(action.atom)!;
    let track = tracks.get(action.atom);
    if (!track) {
      track = { symbol: entry.symbol, name: entry.title, color: colorOf(entry.id), blocks: [] };
      tracks.set(action.atom, track);
    }
    track.blocks.push({ name: action.name, from: action.from, to: action.to });
  }
  for (const track of tracks.values()) track.blocks.sort((a, b) => a.from - b.from || a.to - b.to);
  return [...tracks].sort(([a, first], [b, second]) => first.blocks[0]!.from - second.blocks[0]!.from || order.indexOf(a) - order.indexOf(b)).map(([, track]) => track);
}
/** One track per atom, with independent subject/action blocks. */
export function breakdownPlan(scene: MotionSpec, options: { width: number; title?: string }): BreakdownPlan {
  const actions: Action[] = [];
  // Delayed copies act after their clip has ended for the first copy, so a span runs until the last copy is done.
  // Layouts and orders do not change over time, so their clip length means nothing; they are shown for as long as
  // the motion they arrange runs on the same node.
  const compiled = compileScene(scene);
  const lag = new Map(scene.nodes.map((node) => [node.id, Math.max(...compiled.copies(node.id).map((copy) => copy.delay))]));
  const moving = (target: string) => scene.clips.filter((clip) => clip.target === target && getCapability(clip.recipe)!.time !== 'static');
  for (const clip of scene.clips) {
    const entry = getCapability(clip.recipe)!; const arranged = ['layout', 'order'].includes(entry.role) ? moving(clip.target) : [];
    // A static arrangement may participate in several separate motions; its idle gaps are not an action.
    for (const action of arranged.length ? arranged : [clip]) {
      const start = action.startFrame; const end = start + action.durationFrames;
      const name = `${clip.target} · ${entry.title} · ${clip.id}${action === clip ? '' : ` / ${action.id}`}`;
      actions.push({ atom: entry.id, name, from: start, to: Math.min(scene.durationFrames, end + lag.get(clip.target)!) });
    }
  }
  return { width: options.width, ...(options.title ? { title: options.title } : {}), durationFrames: scene.durationFrames, fps: scene.fps.numerator / scene.fps.denominator,
    tracks: actionTracks(actions) };
}

/**
 * A breakdown of a source video: which atoms act when, in source seconds. The picture is the source clip itself;
 * only the timeline under it is drawn.
 */
export interface VideoBreakdown {
  title?: string;
  source: { video: string; from: number; to: number };
  tracks: { atom: string; name?: string; spans: [number, number][] }[];
}
export function readVideoBreakdown(value: unknown): VideoBreakdown {
  const fail = (message: string): never => { throw new Error(`INVALID_BREAKDOWN: ${message}`); };
  const data = value as Partial<VideoBreakdown> | null;
  if (!data || typeof data !== 'object' || !data.source || typeof data.source !== 'object') fail('Expected { source: { video, from, to }, tracks: [...] }.');
  const { video, from, to } = data!.source!;
  if (typeof video !== 'string' || !video) fail('source.video must be a path to the video file, relative to the breakdown file.');
  if (!Number.isFinite(from) || !Number.isFinite(to) || from < 0 || to <= from) fail('source.from and source.to are seconds in the source, with from < to.');
  if (to - from > 30) fail('A breakdown covers one passage; keep it to 30 s or less.');
  if (data!.title !== undefined && typeof data!.title !== 'string') fail('title must be text.');
  if (!Array.isArray(data!.tracks) || !data!.tracks.length) fail('tracks must list at least one atom.');
  data!.tracks!.forEach((track, i) => {
    if (!getCapability(String(track?.atom))) fail(`tracks[${i}].atom ${String(track?.atom)} is not an atom; use an ID from the catalog.`);
    if (track.name !== undefined && (typeof track.name !== 'string' || !track.name.trim())) fail(`tracks[${i}].name must be non-empty text describing the subject and action.`);
    if (!Array.isArray(track.spans) || !track.spans.length) fail(`tracks[${i}].spans must list [start, end] pairs in source seconds.`);
    track.spans.forEach((span, j) => {
      if (!Array.isArray(span) || span.length !== 2 || !span.every(Number.isFinite) || span[1] <= span[0]) fail(`tracks[${i}].spans[${j}] must be [start, end] with start < end.`);
      if (span[0] < from - 1e-6 || span[1] > to + 1e-6) fail(`tracks[${i}].spans[${j}] lies outside source.from–source.to.`);
    });
  });
  return data as VideoBreakdown;
}
/** The panel plan for a video breakdown at `fps`, spans converted to output frames from the clip start. */
export function videoBreakdownPlan(breakdown: VideoBreakdown, options: { width: number; fps: number; frames: number }): BreakdownPlan {
  const actions = breakdown.tracks.flatMap((track, trackIndex) => {
    const entry = getCapability(track.atom)!;
    return track.spans.map(([a, b], spanIndex) => {
      const first = (a - breakdown.source.from) * options.fps;
      const name = track.name ?? `${entry.title} · 动作 ${trackIndex + 1}`;
      return { atom: entry.id, name: track.spans.length > 1 ? `${name} · ${spanIndex + 1}` : name,
        from: first, to: (b - breakdown.source.from) * options.fps };
    });
  });
  return { width: options.width, ...(breakdown.title ? { title: breakdown.title } : {}), durationFrames: options.frames, fps: options.fps, sourceStartSeconds: breakdown.source.from,
    tracks: actionTracks(actions) };
}
