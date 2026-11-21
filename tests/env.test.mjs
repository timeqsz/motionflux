import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const loadEnv = async () => {
  const { outputFiles } = await build({
    entryPoints: ['packages/cli/src/env.ts'],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node22',
    write: false,
  });
  return import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].contents).toString('base64')}`);
};

test('buildInstallPlan picks user-space Playwright for browser and system package manager for ffmpeg', async () => {
  const { buildInstallPlan } = await loadEnv();

  const plan = buildInstallPlan(['browser', 'ffmpeg'], ['brew', 'playwright'], 'auto');
  assert.equal(plan.blocked.length, 0);
  if (process.platform !== 'win32') {
    assert.equal(plan.steps[0].component, 'browser');
    assert.equal(plan.steps[0].manager, 'playwright');
    assert.equal(plan.steps[0].command, 'npx -y playwright install chromium');
  }
  assert.equal(plan.steps[1].component, 'ffmpeg');
  assert.equal(plan.steps[1].manager, 'brew');
  assert.equal(plan.steps[1].command, 'brew install ffmpeg');

  const explicitBrew = buildInstallPlan(['browser'], ['brew', 'playwright'], 'brew');
  assert.equal(explicitBrew.steps[0].manager, 'brew');
  assert.match(explicitBrew.steps[0].command, /brew install --cask chromium/);

  const blockedFf = buildInstallPlan(['ffmpeg'], ['playwright'], 'playwright');
  assert.equal(blockedFf.steps.length, 0);
  assert.equal(blockedFf.blocked.length, 1);
  assert.match(blockedFf.blocked[0].reason, /Playwright only installs browsers/);

  assert.throws(() => buildInstallPlan(['browser'], ['brew'], 'unknown-pm'), /--manager must be one of/);
});

test('discoverBrowser locates explicit paths and Playwright cache installations', async () => {
  const { discoverBrowser } = await loadEnv();
  const temp = await mkdtemp(join(tmpdir(), 'motionflux-pw-cache-'));
  const prevPw = process.env.PLAYWRIGHT_BROWSERS_PATH;
  const prevBr = process.env.MOTIONFLUX_BROWSER_PATH;
  try {
    const rel =
      process.platform === 'darwin'
        ? 'chromium-1200/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
        : process.platform === 'win32'
          ? 'chromium-1200/chrome-win64/chrome.exe'
          : 'chromium-1200/chrome-linux64/chrome';
    const fakeBin = join(temp, rel);
    await mkdir(join(fakeBin, '..'), { recursive: true });
    await writeFile(fakeBin, '#!/bin/sh\necho "Chromium 134.0"\n');
    await chmod(fakeBin, 0o755);

    assert.equal(await discoverBrowser(fakeBin), fakeBin);
    assert.equal(await discoverBrowser(join(temp, 'missing-bin')), undefined);

    process.env.MOTIONFLUX_BROWSER_PATH = fakeBin;
    assert.equal(await discoverBrowser(), fakeBin);

    delete process.env.MOTIONFLUX_BROWSER_PATH;
    process.env.PLAYWRIGHT_BROWSERS_PATH = temp;
    const found = await discoverBrowser();
    assert.ok(found, 'discoverBrowser finds an installed browser or the Playwright cache binary');
  } finally {
    if (prevPw === undefined) delete process.env.PLAYWRIGHT_BROWSERS_PATH;
    else process.env.PLAYWRIGHT_BROWSERS_PATH = prevPw;
    if (prevBr === undefined) delete process.env.MOTIONFLUX_BROWSER_PATH;
    else process.env.MOTIONFLUX_BROWSER_PATH = prevBr;
    await rm(temp, { recursive: true, force: true });
  }
});

test('CLI doctor (all), CLI setup (dry-run) and scripts/env.sh report structured environment diagnostics', () => {
  const doctorOut = JSON.parse(execFileSync(process.execPath, ['scripts/motion.mjs', 'doctor'], { encoding: 'utf8' }));
  assert.equal(doctorOut.ok, true);
  assert.equal(doctorOut.result.backend, 'all');
  assert.equal(doctorOut.result.node.available, true);
  assert.equal(typeof doctorOut.result.ready.videoAndBreakdown, 'boolean');
  assert.ok(Array.isArray(doctorOut.result.packageManagers));
  assert.ok(Array.isArray(doctorOut.result.missing));

  const setupPlan = JSON.parse(
    execFileSync(process.execPath, ['scripts/motion.mjs', 'setup', '--browser', '/nonexistent/chrome'], { encoding: 'utf8' }),
  );
  assert.equal(setupPlan.ok, true);
  assert.equal(setupPlan.result.applied, false);
  assert.ok(setupPlan.result.missing.includes('browser'));

  if (process.platform !== 'win32') {
    const shellBin = process.platform === 'darwin' ? '/bin/zsh' : '/bin/sh';
    const shCheck = JSON.parse(execFileSync(shellBin, ['scripts/env.sh', 'check'], { encoding: 'utf8' }));
    assert.equal(shCheck.ok, true);
    assert.equal(shCheck.result.node.available, true);

    const shPlan = JSON.parse(execFileSync(shellBin, ['scripts/env.sh', 'plan'], { encoding: 'utf8' }));
    assert.equal(shPlan.ok, true);
    assert.equal(shPlan.result.applied, false);
  }
});

test('discoverFfmpegSync and virtual Stage resource resolver handle explicit paths and /__motionflux/ mounts', async () => {
  const { discoverFfmpegSync } = await loadEnv();
  assert.equal(discoverFfmpegSync('/custom/bin/ffmpeg'), '/custom/bin/ffmpeg');
  assert.ok(typeof discoverFfmpegSync() === 'string' && discoverFfmpegSync().length > 0);

  const stagePkg = await import(new URL('../packages/stage/dist/index.js', import.meta.url).href);
  const root = new URL('../', import.meta.url).pathname;
  const okRuntime = await stagePkg.resolveStageResource('http://motionflux.stage/__motionflux/stage/runtime.mjs', root, root);
  assert.equal(okRuntime.status, 200);
  assert.match(okRuntime.contentType, /javascript/);

  const okStudio = await stagePkg.resolveStageResource('http://motionflux.stage/__motionflux/atoms/studio.mjs', root, root);
  assert.equal(okStudio.status, 200);

  const blocked = await stagePkg.resolveStageResource('http://motionflux.stage/__motionflux/package.json', root, root);
  assert.equal(blocked.status, 403);
});
