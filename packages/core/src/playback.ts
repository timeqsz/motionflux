import { getCapability } from '../../catalog/src/index.js';
import type { MotionSpec } from './types.js';

/**
 * A scene may keep running past its clips only when nothing in it has an authored start and end: every clip is
 * ongoing (loops, emitters, grain) or does not depend on time (layouts, timing curves, glow), and at least one moves.
 * Finite transitions must retain their authored start and end instead of extrapolating them.
 */
export function canContinueScene(scene: MotionSpec): boolean {
  const kinds = scene.clips.map((clip) => getCapability(clip.recipe)!.time);
  return kinds.includes('ongoing') && !kinds.includes('finite');
}

export interface LoopTiming {
  start: number;
  end: number;
  mode: 'continuous' | 'restart';
  /** A short dissolve AFTER a finite animation has reached its complete end state. */
  transitionFrames: number;
  period: number;
}

/** Presentation-only timing; raw frame evaluation and authored clips keep their original semantics. */
export function loopTiming(scene: MotionSpec): LoopTiming {
  const start = scene.clips.length ? Math.min(...scene.clips.map((clip) => clip.startFrame)) : 0;
  // Delayed copies finish after their clips do, so a finite scene plays to its own end, not just its last clip's.
  const end = scene.durationFrames;
  const mode = canContinueScene(scene) ? 'continuous' : 'restart';
  const transitionFrames = mode === 'continuous' ? 0 : Math.min((end - start) * .2, scene.fps.numerator / scene.fps.denominator * .2);
  return { start, end, mode, transitionFrames, period: end - start + transitionFrames };
}
const wrap = (value: number, period: number) => ((value % period) + period) % period;

/** The visible timeline always advances, reaches its declared end, then starts the next cycle. */
export function loopFrame(timing: LoopTiming, elapsed: number): number {
  return timing.start + Math.min(wrap(elapsed, timing.period), timing.end - timing.start);
}

/** Dissolve only after completion. Never rewind the clip or cut off its final frames. */
export function loopBlend(timing: LoopTiming, elapsed: number): number {
  if (!timing.transitionFrames) return 0;
  const t = Math.max(0, (wrap(elapsed, timing.period) - (timing.end - timing.start)) / timing.transitionFrames);
  return t * t * (3 - 2 * t);
}

/** Seek within the current cycle; pausing during a dissolve preserves its exact position. */
export function loopElapsed(timing: LoopTiming, frame: number, previous = 0): number {
  if (Math.abs(loopFrame(timing, previous) - frame) < 1e-7) return previous;
  if (timing.mode === 'continuous' && frame === timing.end && previous > 0 && Math.abs(wrap(previous, timing.period)) < 1e-7) return previous;
  return Math.floor(Math.max(0, previous) / timing.period) * timing.period + Math.max(0, Math.min(timing.end - timing.start, frame - timing.start));
}
