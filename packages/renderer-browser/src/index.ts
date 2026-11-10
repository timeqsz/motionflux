import { compileScene, loopTiming, loopFrame, loopBlend, type LoopTiming, type CompiledScene, type EvaluatedFrame, type FontAsset, type TextNode } from '../../core/src/index.js';
import { drawSubject } from './draw.js';
export { drawSubject, drawAtom } from './draw.js';
export const RENDERER_VERSION = 'canvas2d-v0.4.0';
/** The same font selection is used for measuring previews and drawing exported scenes. */
export function textFont(scene: CompiledScene, node: TextNode): string {
  return `${node.fontSize}px ${node.font === 'system'
    ? 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
    : node.font === 'mono' ? '"SF Mono", ui-monospace, Menlo, Consolas, "PingFang SC", monospace'
    : `"mf_${scene.spec.assets[node.font]!.sha256}"`}`;
}
export async function verifyFontBytes(asset: FontAsset, bytes: ArrayBuffer): Promise<void> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  if (hash !== asset.sha256) throw new Error(`ASSET_HASH: ${asset.src} does not match its locked SHA-256.`);
}
/**
 * Draw one evaluated frame. `scale` is canvas pixels per scene pixel: a preview may render the same scene smaller,
 * and filter radii follow so the picture keeps its proportions. With `background` false the canvas colour is left out
 * and the frame keeps its alpha, so it can be laid over other footage.
 */
export function drawFrame(context: CanvasRenderingContext2D, scene: CompiledScene, frame: number, scale = 1, background = true): EvaluatedFrame {
  const state = scene.evaluate(frame);
  drawState(context, scene, state, scale, background);
  return state;
}
function drawState(context: CanvasRenderingContext2D, scene: CompiledScene, state: EvaluatedFrame, scale: number, background: boolean): void {
  const { width, height } = scene.spec.canvas;
  context.save();
  context.setTransform(scale, 0, 0, scale, 0, 0);
  context.globalAlpha = 1;
  context.globalCompositeOperation = 'source-over';
  if (background) { context.fillStyle = scene.spec.canvas.background; context.fillRect(0, 0, width, height); } else context.clearRect(0, 0, width, height);
  for (const node of state.nodes) drawSceneNode(context, scene, node, scale);
  context.restore();
}
/** Paint one evaluated node, allowing a host to interleave its own licensed artwork in painter order. */
export function drawSceneNode(context: CanvasRenderingContext2D, scene: CompiledScene, node: EvaluatedFrame['nodes'][number], scale = 1): void {
  if (node.type === 'overlay') drawSubject(context, { position: [0, 0], rotation: 0, scale: 1, opacity: 1, color: node.color, layers: node.layers }, scale);
  else drawSubject(context, node.type === 'text' ? { ...node, font: textFont(scene, node) } : node, scale);
}
const loopPlans = new WeakMap<CompiledScene, LoopTiming>();
const restartCanvases = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>();
/** Forward-only browsing: ongoing signals keep their clock; finite effects finish before a short dissolve. */
export function drawLoopFrame(context: CanvasRenderingContext2D, scene: CompiledScene, elapsed: number, scale = 1): EvaluatedFrame {
  let timing = loopPlans.get(scene);
  if (!timing) { timing = loopTiming(scene.spec); loopPlans.set(scene, timing); }
  const frame = loopFrame(timing, elapsed);
  const state = timing.mode === 'continuous'
    ? scene.evaluate(timing.start + elapsed, { continuous: true })
    : scene.evaluate(frame);
  drawState(context, scene, state, scale, true);
  const mix = loopBlend(timing, elapsed);
  if (mix > 0) {
    // Mix complete rendered pictures, including the background, so coincident shapes do not dim halfway.
    let target = restartCanvases.get(context.canvas);
    if (!target) { target = context.canvas.ownerDocument.createElement('canvas'); restartCanvases.set(context.canvas, target); }
    if (target.width !== context.canvas.width) target.width = context.canvas.width;
    if (target.height !== context.canvas.height) target.height = context.canvas.height;
    drawFrame(target.getContext('2d')!, scene, timing.start, scale);
    context.save(); context.setTransform(1, 0, 0, 1, 0, 0);
    context.globalAlpha = mix; context.globalCompositeOperation = 'source-over';
    context.drawImage(target, 0, 0); context.restore();
  }
  return { ...state, frame, timeSeconds: frame * scene.spec.fps.denominator / scene.spec.fps.numerator };
}
export interface MountedScene {
  scene: CompiledScene;
  renderFrame(frame: number, background?: boolean): EvaluatedFrame;
  renderLoop(elapsed: number): EvaluatedFrame;
  destroy(): void;
}
export async function mountScene(canvas: HTMLCanvasElement, input: unknown, resolveAsset: (asset: FontAsset) => Promise<ArrayBuffer>): Promise<MountedScene> {
  const scene = compileScene(input);
  const loaded: FontFace[] = [];
  try {
    for (const asset of Object.values(scene.spec.assets)) {
      const bytes = await resolveAsset(asset);
      await verifyFontBytes(asset, bytes);
      const face = await new FontFace(`mf_${asset.sha256}`, bytes).load();
      document.fonts.add(face);
      loaded.push(face);
    }
    canvas.width = scene.spec.canvas.width;
    canvas.height = scene.spec.canvas.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('CANVAS_UNAVAILABLE: Canvas 2D is required.');
    let destroyed = false;
    return {
      scene,
      renderFrame(frame, background = true) {
        if (destroyed) throw new Error('Renderer has been destroyed.');
        return drawFrame(context, scene, frame, 1, background);
      },
      renderLoop(elapsed) {
        if (destroyed) throw new Error('Renderer has been destroyed.');
        return drawLoopFrame(context, scene, elapsed);
      },
      destroy() { if (!destroyed) { loaded.forEach((face) => document.fonts.delete(face)); destroyed = true; } },
    };
  } catch (error) { loaded.forEach((face) => document.fonts.delete(face)); throw error; }
}
