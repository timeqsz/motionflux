import { mountScene } from '../../packages/renderer-browser/src/index.ts';
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const eq = (a,b,label) => assert(JSON.stringify(a) === JSON.stringify(b), `${label}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`);
const bytes = Uint8Array.from(atob(document.getElementById('image-bytes').textContent),c=>c.charCodeAt(0)).buffer;
const imageHash = document.getElementById('image-hash').textContent;
const canvas = document.querySelector('canvas');
const pixel = (x,y) => [...canvas.getContext('2d').getImageData(x,y,1,1).data];
const base = nodes => ({ specVersion:'0.2',seed:1,canvas:{width:100,height:100,background:'#000000'},fps:{numerator:30,denominator:1},durationFrames:60,assets:{},clips:[],nodes });
const path = (id,position,parent) => ({ id,type:'path',position,parent,color:'#ff0000',points:[[0,0],[30,0],[30,30],[0,30]],closed:true,fill:true,strokeWidth:1 });
async function run() {
  const group = {id:'group',type:'group',position:[0,0],color:'#ffffff',opacity:.5};
  let mounted = await mountScene(canvas,base([group,path('a',[10,10],'group'),path('b',[20,20],'group')]),async()=>bytes);
  await mounted.renderAt(0,false);
  assert(Math.abs(pixel(12,12)[3]-128)<=1,'group fade single coverage');
  eq(pixel(25,25),pixel(12,12),'overlap must receive group opacity once');
  await mounted.destroy();

  const image = {id:'picture',type:'image',position:[10,10],color:'#00ff00',asset:'picture',width:40,height:40,fit:'contain'};
  const spec = {...base([image]),assets:{picture:{type:'image',src:'assets/picture.png',sha256:imageHash}}};
  mounted = await mountScene(canvas,spec,async()=>bytes);
  await mounted.renderAt(0,false);
  eq(pixel(15,12),[0,0,0,0],'contain preserves letterbox alpha');
  eq(pixel(15,25),[255,0,0,255],'image keeps red, not node ink');
  assert(pixel(45,25)[2] > 250 && Math.abs(pixel(45,25)[3]-128)<=1,'image keeps blue alpha');
  await mounted.destroy();
  let failed = false;
  try { await mountScene(canvas,{...spec,assets:{picture:{...spec.assets.picture,sha256:'0'.repeat(64)}}},async()=>bytes); }
  catch(error) { failed = String(error).includes('ASSET_HASH'); }
  assert(failed,'hash mismatch must fail preparation');

  mounted = await mountScene(canvas,base([{id:'curve',type:'vector',position:[10,10],color:'#00ff00',strokeWidth:4,fill:false,
    commands:[{op:'M',to:[0,30]},{op:'Q',control:[30,-30],to:[60,30]}]}]),async()=>bytes);
  await mounted.renderAt(0,false); assert(pixel(40,10)[1]>250,'quadratic curve draws at its midpoint'); await mounted.destroy();

  const encoded = new TextEncoder().encode('test-module').buffer;
  const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256',encoded))].map(b=>b.toString(16).padStart(2,'0')).join('');
  let active = 0; let disposed = 0; const calls = []; let rejectFrame = -1;
  const loader = async()=>({create:()=>{
    const output = document.createElement('canvas'); output.width=100; output.height=100;
    return {canvas:output,async renderFrame({frame,params}) {
      assert(++active === 1,'frames may not draw concurrently'); calls.push([frame,params.amount]);
      try { await new Promise(resolve=>setTimeout(resolve,5)); if(frame===rejectFrame) throw new Error('intentional frame failure');
        const ctx=output.getContext('2d'); ctx.fillStyle=`rgb(${frame},0,0)`; ctx.fillRect(0,0,100,100);
      } finally { active--; }
    },destroy(){disposed++; assert(active===0,'destroy waits for outstanding rendering');}};
  }});
  const moduleSpec = {...base([{id:'module',type:'custom',module:'code',position:[0,0],color:'#ffffff',width:100,height:100,params:{amount:0}}]),
    assets:{code:{type:'module',src:'assets/test.mjs',sha256:digest}},
    animations:[{id:'amount',target:'module',property:'params.amount',keyframes:[{frame:0,value:0},{frame:20,value:1}]}]};
  mounted = await mountScene(canvas,moduleSpec,async()=>encoded,{loadModule:loader});
  await Promise.all([mounted.renderAt(10),mounted.renderAt(2),mounted.renderAt(10)]);
  eq(calls,[[10,.5],[2,.1],[10,.5]],'explicit custom frame and parameter time, queue order');
  eq(pixel(50,50),[10,0,0,255],'renderAt resolves after composition');
  rejectFrame=12; let rejected=false;
  try {await mounted.renderAt(12);} catch(error){rejected=String(error).includes('intentional');}
  assert(rejected,'module render failures propagate');
  await mounted.renderAt(10); eq(pixel(50,50),[10,0,0,255],'a rejected request does not poison later requests');
  const last=mounted.renderAt(3); await mounted.destroy(); await last; await mounted.destroy();
  eq(disposed,1,'each module releases once');
  let dead=false; try{await mounted.renderAt(0);}catch{dead=true;} assert(dead,'destroyed runtimes reject frames');

  let created=0; let cleaned=0;
  const partial={...moduleSpec,nodes:[moduleSpec.nodes[0],{...moduleSpec.nodes[0],id:'second'}]};
  try { await mountScene(canvas,partial,async()=>encoded,{loadModule:async()=>({create(){
    if(++created===2)throw new Error('second failed');
    return {canvas:document.createElement('canvas'),renderFrame(){},destroy(){cleaned++;}};
  }})}); } catch(error){assert(String(error).includes('second failed'),'preserve preparation error');}
  eq(cleaned,1,'failed preparation disposes earlier modules');
  canvas.getContext('2d').fillStyle='#00ff00'; canvas.getContext('2d').fillRect(0,0,100,100);
}
window.motionFlux={scene:{},renderFrame:run};
