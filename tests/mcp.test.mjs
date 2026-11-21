import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('../', import.meta.url));
const cli = join(root, 'scripts/motion.mjs');

test('MCP stdio server handles JSONL and Content-Length framing for initialize, tools, and resources', async () => {
  const work = await mkdtemp(join(tmpdir(), 'motionflux-mcp-test-'));
  try {
    // 1. Test standard MCP newline-delimited JSON-RPC over child_process stdio
    const child = spawn(process.execPath, [cli, 'mcp'], { stdio: ['pipe', 'pipe', 'pipe'] });
    const projectDir = join(work, 'mcp-saas');
    const requests = [
      { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test', version: '1.0' } } },
      { jsonrpc: '2.0', method: 'notifications/initialized' },
      { jsonrpc: '2.0', id: 2, method: 'tools/list' },
      { jsonrpc: '2.0', id: 3, method: 'resources/list' },
      { jsonrpc: '2.0', id: 4, method: 'resources/read', params: { uri: 'motionflux://docs/motion-md' } },
      { jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'motionflux_templates', arguments: {} } },
      { jsonrpc: '2.0', id: 6, method: 'tools/call', params: { name: 'motionflux_init', arguments: { outDir: projectDir, template: 'saas-launch', aspect: '9:16' } } },
    ];
    for (const r of requests) {
      child.stdin.write(`${JSON.stringify(r)}\n`);
    }
    child.stdin.end();

    const stdout = await new Promise((resolveOut, rejectOut) => {
      let out = '';
      child.stdout.on('data', (chunk) => { out += chunk; });
      child.once('error', rejectOut);
      child.once('close', (code) => (code === 0 ? resolveOut(out) : rejectOut(new Error(`mcp exited ${code}`))));
    });

    const replies = stdout.trim().split('\n').map((line) => JSON.parse(line));
    assert.equal(replies.length, 6, 'Notification produces no reply; 6 requests produce 6 replies');
    assert.equal(replies[0].result.serverInfo.name, 'motionflux');
    assert.equal(replies[0].result.serverInfo.version, '0.8.0');
    assert.ok(replies[1].result.tools.length >= 10);
    assert.ok(replies[2].result.resources.some((r) => r.uri === 'motionflux://docs/motion-md'));
    assert.match(replies[3].result.contents[0].text, /Motion\.md/);

    const tplPayload = JSON.parse(replies[4].result.content[0].text);
    assert.equal(tplPayload.templates.length, 4);

    const initPayload = JSON.parse(replies[5].result.content[0].text);
    assert.equal(initPayload.width, 1080);
    assert.equal(initPayload.height, 1920);
    assert.ok((await stat(join(projectDir, 'index.html'))).isFile());

    // 2. Test Content-Length header framing compatibility
    const childCl = spawn(process.execPath, [cli, 'mcp'], { stdio: ['pipe', 'pipe', 'pipe'] });
    const pingBody = JSON.stringify({ jsonrpc: '2.0', id: 99, method: 'ping' });
    childCl.stdin.write(`Content-Length: ${Buffer.byteLength(pingBody)}\r\n\r\n${pingBody}`);
    childCl.stdin.end();

    const clStdout = await new Promise((resolveOut, rejectOut) => {
      let out = '';
      childCl.stdout.on('data', (chunk) => { out += chunk; });
      childCl.once('error', rejectOut);
      childCl.once('close', (code) => (code === 0 ? resolveOut(out) : rejectOut(new Error(`mcp exited ${code}`))));
    });
    assert.match(clStdout, /^Content-Length:\s*\d+\r\n\r\n\{"jsonrpc":"2\.0","id":99,"result":\{\}\}$/);

    // 3. Unit test scdet log parser from video-inspect.ts
    const { outputFiles } = await build({
      entryPoints: [join(root, 'packages/cli/src/video-inspect.ts')],
      bundle: true,
      platform: 'node',
      format: 'esm',
      target: 'node22',
      write: false,
    });
    const inspectMod = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].contents).toString('base64')}`);
    const cuts = inspectMod.parseScdetLog(
      '[Parsed_scdet_0 @ 0x1] lavfi.scd.mafd: 28.123, lavfi.scd.score: 31.42, lavfi.scd.time: 2.400\n[Parsed_scdet_0 @ 0x1] lavfi.scd.score: 19.8, lavfi.scd.time: 4.817',
    );
    assert.deepEqual(cuts, [
      { timeSec: 2.4, score: 31.42 },
      { timeSec: 4.817, score: 19.8 },
    ]);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});
