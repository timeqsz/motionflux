import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, readdir, mkdtemp, mkdir, writeFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';

process.chdir(fileURLToPath(new URL('../', import.meta.url)));
const hash = data => createHash('sha256').update(data).digest('hex');
const zip = await readFile('dist/downloads/motion-atoms.zip');
const metadata = JSON.parse(await readFile('dist/downloads/skill-download.json', 'utf8'));
assert.equal(hash(zip), metadata.sha256);
const entries = new Map();
for (let cursor = 0; zip.readUInt32LE(cursor) === 0x04034b50;) {
  assert.equal(zip.readUInt16LE(cursor + 8), 8);
  const size = zip.readUInt32LE(cursor + 18), length = zip.readUInt16LE(cursor + 26), extra = zip.readUInt16LE(cursor + 28);
  const name = zip.toString('utf8', cursor + 30, cursor + 30 + length);
  assert.ok(name.startsWith('motion-atoms/') && !name.split('/').includes('..'));
  assert.ok(!entries.has(name));
  const start = cursor + 30 + length + extra;
  const data = inflateRawSync(zip.subarray(start, start + size));
  assert.equal(data.length, zip.readUInt32LE(cursor + 22));
  entries.set(name, data);
  cursor = start + size;
}
const manifest = JSON.parse(entries.get('motion-atoms/manifest.json'));
assert.equal(entries.size, manifest.files.length + 1);
assert.ok(zip.length < 6_000_000);
assert.ok(![...entries.keys()].some(name => /(?:node_modules|packages|maintainer)\/|\.(?:ttf|otf|woff2?|mp4|pem)$/i.test(name)));
const temp = await mkdtemp(join(tmpdir(), 'motion-atoms 独立校验 '));
try {
  for (const [name, data] of entries) {
    await mkdir(dirname(join(temp, name)), { recursive: true });
    await writeFile(join(temp, name), data);
  }
  const root = join(temp, 'motion-atoms');
  for (const file of manifest.files) {
    const data = await readFile(join(root, file.path));
    assert.equal(hash(data), file.sha256, file.path);
    assert.equal(data.length, file.bytes);
    assert.equal(hash(await readFile(file.path)), file.sha256, `Root distribution: ${file.path}`);
    if (file.path.endsWith('.md')) for (const [, link] of data.toString().matchAll(/\]\(([^\s)]+)\)/g)) {
      if (/^(?:https?:|#)/.test(link)) continue;
      assert.ok((await stat(join(root, dirname(file.path), link.split('#')[0]))).isFile(), `${file.path}: ${link}`);
    }
  }
  const cli = (...args) => JSON.parse(execFileSync(process.execPath, ['scripts/motion.mjs', ...args], { cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 })).result;
  assert.equal(cli('doctor', '--backend', 'js').available, true);
  const catalog = JSON.parse(await readFile(join(root, 'assets/catalog-index.json'), 'utf8'));
  assert.equal(catalog.length, manifest.atoms2d);
  for (const entry of catalog) assert.equal(cli('describe', entry.id).id, entry.id);
  const examples = (await readdir(join(root, 'assets/examples'))).filter(name => name.endsWith('.scene.json'));
  for (const name of examples) assert.equal(cli('validate', `assets/examples/${name}`).valid, true);
  const scene = join(temp, 'title.scene.json');
  cli('scaffold', 'text.lines', '--out', scene, '--text', '把想法\\n变成动作');
  assert.equal(cli('validate', scene).valid, true);
  cli('preview', scene, '--out', join(temp, 'title.html'));
  assert.ok((await stat(join(temp, 'title.html'))).size < 500_000);
  console.log(JSON.stringify({ verified: true, atoms: catalog.length, examples: examples.length, files: manifest.files.length, zipBytes: zip.length, sha256: metadata.sha256 }));
} finally {
  await rm(temp, { recursive: true, force: true });
}
