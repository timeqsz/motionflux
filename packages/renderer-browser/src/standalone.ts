import { mountScene } from './index.js';
import { loopTiming, loopElapsed } from '../../core/src/playback.js';
import { breakdownSize, drawBreakdown, type BreakdownPlan } from './breakdown.js';
declare global { interface Window { motionFlux?: { renderFrame(frame: number, background?: boolean): void; scene: unknown } } }
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
    if (!encoded) throw new Error(`Missing embedded font ${asset.src}`);
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
  // Frame capture passes background false to keep the alpha channel; the player always shows the canvas colour.
  const renderFrame = (next: number, background = true) => {
    frame = next; mounted.renderFrame(next, background); slider.value = String(next);
    if (composite && breakdown) drawBreakdown(composite, canvas, breakdown, next);
    status.textContent = `Frame ${next.toFixed(0)} / ${slider.max} · ${(next / fps).toFixed(2)}s`;
  };
  const renderLoop = (displayFrame?: number) => {
    const state = mounted.renderLoop(elapsed); frame = displayFrame ?? state.frame; slider.value = String(frame);
    if (composite && breakdown) drawBreakdown(composite, canvas, breakdown, state.frame);
    status.textContent = `Frame ${frame.toFixed(0)} / ${slider.max} · ${(frame / fps).toFixed(2)}s`;
  };
  const tick = (now: number) => {
    if (!playing) return;
    if (!document.hidden && last) elapsed += Math.min(now - last, 100) / 1000 * fps;
    last = now;
    if (playback.loop) renderLoop();
    else renderFrame(Math.min(mounted.scene.spec.durationFrames - 1, elapsed));
    if (!playback.loop && frame >= mounted.scene.spec.durationFrames - 1) { playing = false; button.textContent = '播放'; }
    else animation = requestAnimationFrame(tick);
  };
  button.onclick = () => {
    playing = !playing;
    button.textContent = playing ? '暂停' : '播放';
    if (playing) {
      if (playback.loop) elapsed = loopElapsed(timing, frame, elapsed);
      else { if (frame >= mounted.scene.spec.durationFrames - 1) frame = 0; elapsed = frame; }
      last = 0; animation = requestAnimationFrame(tick);
    }
    else cancelAnimationFrame(animation);
  };
  slider.oninput = () => {
    playing = false; cancelAnimationFrame(animation); button.textContent = '播放';
    if (playback.loop) { const next = Number(slider.value); elapsed = loopElapsed(timing, next, elapsed); renderLoop(next); }
    else renderFrame(Number(slider.value));
  };
  window.motionFlux = { renderFrame, scene: mounted.scene.spec };
  window.addEventListener('pagehide', () => { cancelAnimationFrame(animation); mounted.destroy(); });
  renderFrame(0);
}
main().catch((error: unknown) => { document.getElementById('status')!.textContent = String(error); });
