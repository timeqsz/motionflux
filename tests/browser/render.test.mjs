import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { png } from '../../maintainer/scene-examples.mjs';
const dir = await mkdtemp(join(tmpdir(),'motionflux-browser-test-'));
await build({entryPoints:['packages/cli/src/capture.ts'],outfile:join(dir,'capture.mjs'),bundle:true,platform:'node',format:'esm'});
const { captureFrames, findBrowser } = await import(pathToFileURL(join(dir,'capture.mjs')));
const browser=await findBrowser(); assert.ok(browser,'A Chromium browser is required for test:browser.');
test.after(async()=>rm(dir,{recursive:true,force:true}));

test('real browser: isolated group alpha, image RGB/alpha/hash, Bézier paths, awaited modules, failures and disposal',async()=>{
  await build({entryPoints:['tests/browser/checks.js'],outfile:join(dir,'checks.js'),bundle:true,format:'iife',platform:'browser'});
  const image=png(20,10,(x)=>x<10?[255,0,0,255]:[0,0,255,128]);
  const hash=createHash('sha256').update(image).digest('hex');
  const html=`<canvas></canvas><div id="status"></div><script id="image-bytes" type="application/json">${image.toString('base64')}</script><script id="image-hash" type="application/json">${hash}</script><script>${await readFile(join(dir,'checks.js'),'utf8')}</script>`;
  await writeFile(join(dir,'checks.html'),html);
  let count=0; await captureFrames(join(dir,'checks.html'),[0],browser,false,async()=>{count++;}); assert.equal(count,1);
});
for(const name of ['composition','three-orbit']) test(`standalone ${name}: offline assets, capture waits for drawing, repeated unordered seeks agree`,async()=>{
  const file=join(dir,`${name}.html`);
  execFileSync(process.execPath,['scripts/motion.mjs','preview',`assets/examples/${name}.scene.json`,'--out',file]);
  const frames=[]; await captureFrames(file,[40,80,20,40],browser,false,async(frame,png)=>{frames.push(png);});
  assert.deepEqual(frames[0],frames[3],'same frame, same pixels within this browser/GPU');
  assert.notDeepEqual(frames[0],frames[1],'animation changes the rendered image');
  assert.ok(frames[0].length>5000,'rendered output is not an empty canvas');
});
for(const name of ['speaker-landscape','lamp-portrait']) test(`pattern ${name}: portable composition renders and unordered seeks agree`,async()=>{
  const delivery=JSON.parse(execFileSync(process.execPath,['scripts/motion.mjs','compose',`assets/patterns/title-yields-to-product/${name}.brief.json`,'--out',join(dir,name)],{encoding:'utf8'})).result;
  const scene=JSON.parse(await readFile(delivery.scene,'utf8'));
  const last=scene.durationFrames-1;
  const frames=[];
  await captureFrames(delivery.preview,[last,25,0,last],browser,false,async(frame,png)=>frames.push(png));
  assert.deepEqual(frames[0],frames[3],'same saved scene produces the same pixels after seeking backwards');
  assert.notDeepEqual(frames[0],frames[1],'the reading stage differs from the complete composition');
  assert.ok(frames[0].length>10000,'product and type produce nonempty output');
});
