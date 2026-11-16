import { mountScene } from './index.js';
import { loopTiming, loopElapsed } from '../../core/src/playback.js';
import { breakdownSize, drawBreakdown, type BreakdownPlan } from './breakdown.js';
declare global { interface Window { motionFlux?: { renderFrame(frame: number, background?: boolean): Promise<void>; scene: unknown } } }
async function main(): Promise<void> {
  const input = JSON.parse(document.getElementById('scene-data')!.textContent!);
  const assets = JSON.parse(document.getElementById('asset-data')!.textContent!) as Record<string, string>;
  // Previously exported documents have no playback metadata and keep their one-shot player.
  const playback = JSON.parse(document.getElementById('playback-data')?.textContent || '{}') as { loop?: boolean; breakdown?: BreakdownPlan };
  const canvas = document.querySelector('canvas')!;
  // A breakdown shows a composite: the scene renders off screen and the visible, captured canvas adds the timeline.
  const breakdown = playback.breakdown; const composite = breakdown ? document.createElement('canvas') : undefined;
  if (composite) { canvas.before(composite); canvas.hidden = true; composite.setAttribute('aria-label', '动效与原子时间轴'); }
  const status = document.getElementById('status')!;
  const mounted = await mountScene(canvas, input, async (asset) => {
    const encoded = assets[asset.src];
    if (!encoded) throw new Error(`Missing embedded asset ${asset.src}`);
    return Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0)).buffer;
  });
  if (composite && breakdown) { const size = breakdownSize(breakdown, mounted.scene.spec.canvas); composite.width = size.width; composite.height = size.height; }
  const slider = document.querySelector('input')!;
  const button = document.querySelector('button')!;
  const timing = loopTiming(mounted.scene.spec);
  slider.min = String(playback.loop ? timing.start : 0);
  slider.max = String(playback.loop ? timing.end : mounted.scene.spec.durationFrames - 1);
  const fps = mounted.scene.spec.fps.numerator / mounted.scene.spec.fps.denominator;
  let frame = 0;
  let playing = false;
  let elapsed = 0;
  let last = 0;
  let animation = 0;
  let generation = 0;
  const stop = () => { playing = false; generation++; cancelAnimationFrame(animation); button.textContent = '播放'; };
  const fail = (error: unknown) => { stop(); status.textContent = String(error); };
  // Frame capture passes background false to keep the alpha channel; the player always shows the canvas colour.
  const renderFrame = async (next: number, background = true) => {
    await mounted.renderAt(next, background); frame = next; slider.value = String(next);
    if (composite && breakdown) drawBreakdown(composite, canvas, breakdown, next);
    status.textContent = `Frame ${next.toFixed(0)} / ${slider.max} · ${(next / fps).toFixed(2)}s`;
  };
  const renderLoop = async (displayFrame?: number) => {
    const state = await mounted.renderLoopAt(elapsed); frame = displayFrame ?? state.frame; slider.value = String(frame);
    if (composite && breakdown) drawBreakdown(composite, canvas, breakdown, state.frame);
    status.textContent = `Frame ${frame.toFixed(0)} / ${slider.max} · ${(frame / fps).toFixed(2)}s`;
  };
  const tick = async (now: number) => {
    if (!playing) return;
    const request = generation;
    if (!document.hidden && last) elapsed += Math.min(now - last, 100) / 1000 * fps;
    last = now;
    if (playback.loop) await renderLoop();
    else await renderFrame(Math.min(mounted.scene.spec.durationFrames - 1, elapsed));
    if (!playing || request !== generation) return;
    if (!playback.loop && frame >= mounted.scene.spec.durationFrames - 1) { playing = false; button.textContent = '播放'; }
    else animation = requestAnimationFrame(now => { void tick(now).catch(fail); });
  };
  button.onclick = () => {
    playing = !playing;
    generation++;
    button.textContent = playing ? '暂停' : '播放';
    if (playing) {
      if (playback.loop) elapsed = loopElapsed(timing, frame, elapsed);
      else { if (frame >= mounted.scene.spec.durationFrames - 1) frame = 0; elapsed = frame; }
      last = 0; animation = requestAnimationFrame(now => { void tick(now).catch(fail); });
    }
    else cancelAnimationFrame(animation);
  };
  slider.oninput = () => {
    stop();
    if (playback.loop) { const next = Number(slider.value); elapsed = loopElapsed(timing, next, elapsed); void renderLoop(next).catch(fail); }
    else void renderFrame(Number(slider.value)).catch(fail);
  };
  window.addEventListener('pagehide', () => { stop(); void mounted.destroy().catch(fail); });
  await renderFrame(0);
  window.motionFlux = { renderFrame: async (next, background = true) => { stop(); await renderFrame(next, background); }, scene: mounted.scene.spec };
}
main().catch((error: unknown) => { document.getElementById('status')!.textContent = String(error); });
