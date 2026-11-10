import { ALGORITHM_VERSION, ENGINE_VERSION, assertScene } from './index.js';
import { CATALOG_VERSION } from '../../catalog/src/index.js';
import type { MotionSpec } from './types.js';
export function versionLock(scene: MotionSpec) {
  return { schema: scene.specVersion, engine: ENGINE_VERSION, catalog: CATALOG_VERSION,
    renderer: 'canvas2d-v0.3.0', algorithm: ALGORITHM_VERSION,
    assets: Object.fromEntries(Object.entries(scene.assets).map(([id, asset]) => [id, { src: asset.src, sha256: asset.sha256 }])),
    ...(scene.nodes.some((node) => node.type === 'text' && node.font === 'system') ? { systemFont: 'device sans-serif; appearance varies by operating system' } : {}),
  };
}
// Escape HTML parser delimiters even for JSON and JavaScript inside script elements.
const inlineJson = (value: unknown) => JSON.stringify(value).replace(/</gu, '\\u003c').replace(/\u2028/gu, '\\u2028').replace(/\u2029/gu, '\\u2029');
/** `breakdown` is a timeline plan the runtime draws under the scene; see renderer-browser/src/breakdown.ts. */
export function createStandaloneHtml(input: unknown, runtime: string, assets: Record<string, string>, license: string, playback: { loop?: boolean; breakdown?: unknown } = {}): string {
  assertScene(input);
  for (const asset of Object.values(input.assets)) if (!assets[asset.src]) throw new Error(`Missing embedded asset ${asset.src}`);
  const safeLicense = license.replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;');
  return `<!doctype html>
<html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>MotionFlux · 独立场景</title>
<style>body{margin:0;background:#101411;color:#edf2eb;font:15px system-ui;padding:24px}main{max-width:1100px;margin:auto}canvas{width:100%;height:auto;display:block;border:1px solid #38413b}nav{display:flex;align-items:center;gap:16px;padding:20px 0}input{flex:1}button{padding:9px 24px;cursor:pointer}pre{white-space:pre-wrap;font-size:12px;color:#a9b5aa}summary{cursor:pointer}h1{font-size:20px}</style>
<main><h1>MotionFlux / 独立场景</h1><canvas aria-label="场景画面"></canvas><nav><button>播放</button><input aria-label="帧位置" type="range" min="0" value="0" step="1"><span id="status" role="status">准备预览…</span></nav>
<p>已内嵌当前参数与自有运行代码，可离线打开。${Object.keys(input.assets).length ? '所需固定字体已内嵌。' : '文字使用设备系统字体，无需下载字库。'}${playback.loop ? '播放时连续循环。' : ''}</p>
${safeLicense ? `<details><summary>字体许可与资源说明</summary><pre>${safeLicense}</pre></details>` : ''}</main>
<script id="scene-data" type="application/json">${inlineJson(input)}</script>
<script id="asset-data" type="application/json">${inlineJson(assets)}</script>
<script id="playback-data" type="application/json">${inlineJson(playback)}</script>
<script id="version-lock" type="application/json">${inlineJson(versionLock(input))}</script>
<script>${runtime.replace(/<\/script/giu, '<\\/script')}</script></html>`;
}
