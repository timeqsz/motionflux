import type { Asset, CompiledScene, CustomFrame, EvaluatedFrame, FrameNode, ModuleAsset } from '../../core/src/index.js';

export interface ModuleFrame {
  frame: number; timeSeconds: number; fps: number; seed: number;
  width: number; height: number; params: Readonly<Record<string, number>>;
}
/** A module owns its canvas and GPU/resources. renderFrame resolves only when that frame is ready to composite. */
export interface RenderModuleInstance {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  renderFrame(frame: ModuleFrame): void | Promise<void>;
  destroy(): void | Promise<void>;
}
export interface RenderModule {
  create(options: { width: number; height: number; seed: number }): RenderModuleInstance | Promise<RenderModuleInstance>;
}
export interface PreparedResources {
  images: Map<string, ImageBitmap>;
  modules: Map<string, RenderModuleInstance>;
  groups: Map<string, HTMLCanvasElement>;
}
export async function verifyAssetBytes(asset: Asset, bytes: ArrayBuffer): Promise<void> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  if (hash !== asset.sha256) throw new Error(`ASSET_HASH: ${asset.src} does not match its locked SHA-256.`);
}
/** Runs a separate trusted ESM file. Imports must already be bundled; it is not a sandbox for untrusted code. */
export async function importRenderModule(_asset: ModuleAsset, bytes: ArrayBuffer): Promise<RenderModule> {
  const url = URL.createObjectURL(new Blob([bytes], { type: 'text/javascript' }));
  try {
    const module: RenderModule = await import(/* @vite-ignore */ url);
    if (typeof module.create !== 'function') throw new Error('MODULE_CONTRACT: Export create({width,height,seed}).');
    return module;
  } finally { URL.revokeObjectURL(url); }
}
export function customFrames(nodes: readonly FrameNode[]): CustomFrame[] {
  return nodes.flatMap(node => node.type === 'group' ? customFrames(node.children) : node.type === 'custom' ? [node] : []);
}
export async function prepareFrame(state: EvaluatedFrame, scene: CompiledScene, resources: PreparedResources): Promise<void> {
  for (const node of customFrames(state.nodes)) {
    const module = resources.modules.get(node.id);
    if (!module) throw new Error(`MODULE_MISSING: ${node.id}`);
    await module.renderFrame({ frame: state.frame, timeSeconds: state.timeSeconds,
      fps: scene.spec.fps.numerator / scene.spec.fps.denominator, seed: scene.spec.seed,
      width: node.width, height: node.height, params: Object.freeze({ ...node.params }) });
    if (!module.canvas.width || !module.canvas.height) throw new Error(`MODULE_FRAME: ${node.id} returned an empty canvas.`);
  }
}
