import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

test('an encoder failure during async frame preparation is a caught error and feed can clean up',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'motionflux-encoder-test-')); const previous=process.env.MOTIONFLUX_FFMPEG_PATH;
  try {
    const executable=join(dir,'ffmpeg');
    await writeFile(executable,`#!${process.execPath}\nprocess.stderr.write('Unknown encoder test-codec\\n'); process.exit(1);\n`,{mode:0o755});
    await build({entryPoints:['packages/cli/src/capture.ts'],outfile:join(dir,'capture.mjs'),bundle:true,platform:'node',format:'esm'});
    const {encodeVideo}=await import(pathToFileURL(join(dir,'capture.mjs'))); process.env.MOTIONFLUX_FFMPEG_PATH=executable;
    let cleaned=false;
    await assert.rejects(encodeVideo(join(dir,'out.mp4'),'mp4',false,{numerator:30,denominator:1},async write=>{
      try {await new Promise(resolve=>setTimeout(resolve,100)); await write(Buffer.from('frame'));} finally {cleaned=true;}
    }),/ENCODE_FAILED.*Unknown encoder test-codec/);
    assert.equal(cleaned,true);
  } finally {
    if(previous===undefined)delete process.env.MOTIONFLUX_FFMPEG_PATH;else process.env.MOTIONFLUX_FFMPEG_PATH=previous;
    await rm(dir,{recursive:true,force:true});
  }
});
