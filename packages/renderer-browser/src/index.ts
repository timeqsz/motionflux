import { compileScene, identity, multiply, nodeMatrix, loopTiming, loopFrame, loopBlend, type Matrix2D, type LoopTiming, type CompiledScene, type EvaluatedFrame, type Asset, type FontAsset, type TextNode } from '../../core/src/index.js';
import { drawSubject } from './draw.js';
import { importRenderModule, prepareFrame, verifyAssetBytes, type PreparedResources, type RenderModule } from './resources.js';
export * from './resources.js';
export { drawSubject, drawAtom } from './draw.js';
export const RENDERER_VERSION = 'canvas2d-v0.5.0';
/** The same font selection is used for measuring previews and drawing exported scenes. */
export function textFont(scene: CompiledScene, node: TextNode): string {
  return `${node.fontSize}px ${node.font === 'system'
    ? 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
    : node.font === 'mono' ? '"SF Mono", ui-monospace, Menlo, Consolas, "PingFang SC", monospace'
    : `"mf_${scene.spec.assets[node.font]!.sha256}"`}`;
}
export async function verifyFontBytes(asset: FontAsset, bytes: ArrayBuffer): Promise<void> {
  return verifyAssetBytes(asset, bytes);
}
/**
 * Draw one evaluated frame. `scale` is canvas pixels per scene pixel: a preview may render the same scene smaller,
 * and filter radii follow so the picture keeps its proportions. With `background` false the canvas colour is left out
 * and the frame keeps its alpha, so it can be laid over other footage.
 */
export function drawFrame(context: CanvasRenderingContext2D, scene: CompiledScene, frame: number, scale = 1, background = true, resources?: PreparedResources): EvaluatedFrame {
  const state = scene.evaluate(frame);
  drawState(context, scene, state, scale, background, resources);
  return state;
}
function drawState(context: CanvasRenderingContext2D, scene: CompiledScene, state: EvaluatedFrame, scale: number, background: boolean, resources?: PreparedResources): void {
  const { width, height } = scene.spec.canvas;
  context.save();
  context.setTransform(scale, 0, 0, scale, 0, 0);
  context.globalAlpha = 1;
  context.globalCompositeOperation = 'source-over';
  try {
    if (background) { context.fillStyle = scene.spec.canvas.background; context.fillRect(0, 0, width, height); } else context.clearRect(0, 0, width, height);
    for (const node of state.nodes) drawSceneNode(context, scene, node, scale, resources);
  } finally { context.restore(); }
}
/** Paint one evaluated node, allowing a host to interleave its own licensed artwork in painter order. */
export function drawSceneNode(context: CanvasRenderingContext2D, scene: CompiledScene, node: EvaluatedFrame['nodes'][number], scale = 1, resources?: PreparedResources, parent = identity): void {
  if (node.type === 'overlay') {
    const matrix = multiply(parent, [1, 0, 0, 1, ...(node.offset ?? [0, 0])] as Matrix2D);
    drawSubject(context, { position: [0, 0], rotation: 0, scale: 1, opacity: 1, color: node.color, layers: node.layers, matrix }, scale); return;
  }
  const matrix = multiply(parent, nodeMatrix(node));
  if (node.type === 'group') {
    // Composite the whole group once: overlapping children must not become darker during a group fade.
    let target = resources?.groups.get(node.id);
    if (!target) { target = context.canvas.ownerDocument.createElement('canvas'); resources?.groups.set(node.id, target); }
    target.width = context.canvas.width; target.height = context.canvas.height;
    const ctx = target.getContext('2d')!; ctx.setTransform(scale, 0, 0, scale, 0, 0);
    for (const child of node.children) drawSceneNode(ctx, scene, child, scale, resources, matrix);
    context.save(); context.setTransform(1, 0, 0, 1, 0, 0); context.globalAlpha = node.opacity;
    context.drawImage(target, 0, 0); context.restore(); return;
  }
  if (node.type === 'text' || node.type === 'path') {
    drawSubject(context, node.type === 'text' ? { ...node, font: textFont(scene, node), matrix } : { ...node, matrix }, scale); return;
  }
  context.save();
  try {
    context.transform(...matrix); context.globalAlpha = node.opacity;
    if (node.type === 'vector') {
      context.beginPath();
      for (const command of node.commands) {
        if (command.op === 'M') context.moveTo(...command.to);
        else if (command.op === 'L') context.lineTo(...command.to);
        else if (command.op === 'Q') context.quadraticCurveTo(...command.control, ...command.to);
        else if (command.op === 'C') context.bezierCurveTo(...command.control1, ...command.control2, ...command.to);
        else context.closePath();
      }
      context.fillStyle = node.color; context.strokeStyle = node.color; context.lineWidth = node.strokeWidth;
      context.lineJoin = 'round'; context.lineCap = 'round';
      if (node.fill) context.fill(); else context.stroke();
    } else {
      const source = node.type === 'image' ? resources?.images.get(node.asset) : resources?.modules.get(node.id)?.canvas;
      if (!source) throw new Error(`ASSET_NOT_PREPARED: ${node.id}. Use mountScene and await renderAt.`);
      const fit = node.type === 'image' ? node.fit : 'stretch';
      const ratio = fit === 'contain' ? Math.min(node.width / source.width, node.height / source.height) : Math.max(node.width / source.width, node.height / source.height);
      const width = fit === 'stretch' ? node.width : source.width * ratio; const height = fit === 'stretch' ? node.height : source.height * ratio;
      context.beginPath(); context.rect(0, 0, node.width, node.height); context.clip();
      context.drawImage(source, (node.width - width) / 2, (node.height - height) / 2, width, height);
    }
  } finally { context.restore(); }
}
const loopPlans = new WeakMap<CompiledScene, LoopTiming>();
const restartCanvases = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>();
/** Forward-only browsing: ongoing signals keep their clock; finite effects finish before a short dissolve. */
export function drawLoopFrame(context: CanvasRenderingContext2D, scene: CompiledScene, elapsed: number, scale = 1, resources?: PreparedResources): EvaluatedFrame {
  let timing = loopPlans.get(scene);
  if (!timing) { timing = loopTiming(scene.spec); loopPlans.set(scene, timing); }
  const frame = loopFrame(timing, elapsed);
  const state = timing.mode === 'continuous'
    ? scene.evaluate(timing.start + elapsed, { continuous: true })
    : scene.evaluate(frame);
  drawState(context, scene, state, scale, true, resources);
  const mix = loopBlend(timing, elapsed);
  if (mix > 0) {
    // Mix complete rendered pictures, including the background, so coincident shapes do not dim halfway.
    let target = restartCanvases.get(context.canvas);
    if (!target) { target = context.canvas.ownerDocument.createElement('canvas'); restartCanvases.set(context.canvas, target); }
    if (target.width !== context.canvas.width) target.width = context.canvas.width;
    if (target.height !== context.canvas.height) target.height = context.canvas.height;
    drawFrame(target.getContext('2d')!, scene, timing.start, scale, true, resources);
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
  /** Shared preview/export barrier; completes only after all resources have drawn the requested frame. */
  renderAt(frame: number, background?: boolean): Promise<EvaluatedFrame>;
  renderLoopAt(elapsed: number): Promise<EvaluatedFrame>;
  destroy(): Promise<void>;
}
export async function mountScene(canvas: HTMLCanvasElement, input: unknown, resolveAsset: (asset: Asset) => Promise<ArrayBuffer>,
  options: { loadModule?: typeof importRenderModule } = {}): Promise<MountedScene> {
  const scene = compileScene(input);
  const loaded: FontFace[] = [];
  const resources: PreparedResources = { images: new Map(), modules: new Map(), groups: new Map() };
  const modules = new Map<string, RenderModule>();
  const cleanup = async () => {
    const results = await Promise.allSettled([...resources.modules.values()].map(instance => Promise.resolve().then(() => instance.destroy())));
    resources.images.forEach(image => image.close()); loaded.forEach(face => document.fonts.delete(face));
    resources.groups.forEach(canvas => { canvas.width = canvas.height = 0; });
    resources.modules.clear(); resources.images.clear(); resources.groups.clear();
    const failure = results.find(result => result.status === 'rejected');
    if (failure?.status === 'rejected') throw failure.reason;
  };
  try {
    for (const [id, asset] of Object.entries(scene.spec.assets)) {
      const bytes = await resolveAsset(asset);
      await verifyAssetBytes(asset, bytes);
      if (asset.type === 'font') {
        const face = await new FontFace(`mf_${asset.sha256}`, bytes).load();
        document.fonts.add(face); loaded.push(face);
      } else if (asset.type === 'image') resources.images.set(id, await createImageBitmap(new Blob([bytes])));
      else modules.set(id, await (options.loadModule ?? importRenderModule)(asset, bytes));
    }
    for (const node of scene.spec.nodes) if (node.type === 'custom') {
      const instance = await modules.get(node.module)!.create({ width: node.width, height: node.height, seed: scene.spec.seed });
      if (!instance || typeof instance.renderFrame !== 'function' || typeof instance.destroy !== 'function' || !instance.canvas) {
        if (typeof instance?.destroy === 'function') await instance.destroy();
        throw new Error(`MODULE_CONTRACT: ${node.id} must return canvas, renderFrame and destroy.`);
      }
      resources.modules.set(node.id, instance);
    }
    canvas.width = scene.spec.canvas.width;
    canvas.height = scene.spec.canvas.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('CANVAS_UNAVAILABLE: Canvas 2D is required.');
    let destroyed = false;
    let tail: Promise<unknown> = Promise.resolve(); let queued = 0;
    let destruction: Promise<void> | undefined;
    const enqueue = (run: () => Promise<EvaluatedFrame>) => {
      if (destroyed) return Promise.reject(new Error('Renderer has been destroyed.'));
      queued++;
      const result = tail.then(run).finally(() => { queued--; });
      tail = result.catch(() => {}); return result;
    };
    const checkSync = () => {
      if (destroyed) throw new Error('Renderer has been destroyed.');
      if (resources.modules.size || queued) throw new Error('ASYNC_FRAME_REQUIRED: Await renderAt or renderLoopAt.');
    };
    const draw = async (state: EvaluatedFrame, background: boolean, ctx = context) => {
      await prepareFrame(state, scene, resources); drawState(ctx, scene, state, 1, background, resources); return state;
    };
    return {
      scene,
      renderFrame(frame, background = true) {
        checkSync(); return drawFrame(context, scene, frame, 1, background, resources);
      },
      renderLoop(elapsed) {
        checkSync(); return drawLoopFrame(context, scene, elapsed, 1, resources);
      },
      renderAt(frame, background = true) { return enqueue(() => draw(scene.evaluate(frame), background)); },
      renderLoopAt(elapsed) { return enqueue(async () => {
        if (!Number.isFinite(elapsed) || elapsed < 0) throw new RangeError('Elapsed frames must be finite and non-negative.');
        const timing = loopTiming(scene.spec); const frame = loopFrame(timing, elapsed);
        const state = scene.evaluate(timing.mode === 'continuous' ? timing.start + elapsed : frame, { continuous: timing.mode === 'continuous' });
        await draw(state, true);
        const mix = loopBlend(timing, elapsed);
        if (mix > 0) {
          const target = canvas.ownerDocument.createElement('canvas'); target.width = canvas.width; target.height = canvas.height;
          await draw(scene.evaluate(timing.start), true, target.getContext('2d')!);
          context.save(); context.setTransform(1, 0, 0, 1, 0, 0); context.globalAlpha = mix;
          context.drawImage(target, 0, 0); context.restore();
        }
        return { ...state, frame, timeSeconds: frame * scene.spec.fps.denominator / scene.spec.fps.numerator };
      }); },
      destroy() { destroyed = true; return destruction ??= tail.then(cleanup); },
    };
  } catch (error) { await cleanup().catch(() => {}); throw error; }
}
