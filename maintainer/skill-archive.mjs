import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { deflateRawSync } from 'node:zlib';

export async function filesIn(directory, prefix = '') {
  const files = [];
  for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    const name = prefix + entry.name;
    if (entry.isDirectory()) files.push(...await filesIn(join(directory, entry.name), `${name}/`));
    else if (entry.isFile()) files.push(name);
  }
  return files;
}
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const crcTable = Uint32Array.from({ length: 256 }, (_, value) => {
  for (let i = 0; i < 8; i++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
const crc32 = (bytes) => {
  let value = 0xffffffff;
  for (const byte of bytes) value = crcTable[(value ^ byte) & 255] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
};

// Small, deterministic ZIP (deflate, UTF-8 paths, fixed DOS date), without a platform-specific archiver.
// The release contains ordinary files only; no symlinks, absolute paths or host dependencies.
export async function archiveSkill(directory, destination, metadata) {
  const paths = (await filesIn(directory)).filter(name => name !== 'manifest.json');
  const entries = await Promise.all(paths.map(async path => {
    const bytes = await readFile(join(directory, path));
    return { path, bytes, sha256: sha256(bytes) };
  }));
  const manifest = { ...metadata, files: entries.map(({ path, bytes, sha256 }) => ({ path, bytes: bytes.length, sha256 })) };
  const manifestBytes = Buffer.from(JSON.stringify(manifest, null, 2) + '\n');
  await writeFile(join(directory, 'manifest.json'), manifestBytes);
  entries.push({ path: 'manifest.json', bytes: manifestBytes });
  const local = [], central = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(`motion-atoms/${entry.path}`), compressed = deflateRawSync(entry.bytes, { level: 9 });
    const header = Buffer.alloc(30), record = Buffer.alloc(46), checksum = crc32(entry.bytes);
    header.writeUInt32LE(0x04034b50, 0); header.writeUInt16LE(20, 4); header.writeUInt16LE(0x800, 6);
    header.writeUInt16LE(8, 8); header.writeUInt16LE(33, 12); header.writeUInt32LE(checksum, 14);
    header.writeUInt32LE(compressed.length, 18); header.writeUInt32LE(entry.bytes.length, 22); header.writeUInt16LE(name.length, 26);
    record.writeUInt32LE(0x02014b50, 0); record.writeUInt16LE(20, 4); header.copy(record, 6, 4, 30);
    record.writeUInt32LE(offset, 42);
    local.push(header, name, compressed); central.push(record, name);
    offset += header.length + name.length + compressed.length;
  }
  const directoryBytes = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directoryBytes.length, 12); end.writeUInt32LE(offset, 16);
  const zip = Buffer.concat([...local, directoryBytes, end]), checksum = sha256(zip);
  const filename = `motion-atoms.${checksum.slice(0, 12)}.zip`;
  await mkdir(destination, { recursive: true });
  await writeFile(join(destination, filename), zip);
  await writeFile(join(destination, 'skill-download.json'), JSON.stringify({ ...metadata, filename, bytes: zip.length, sha256: checksum }, null, 2) + '\n');
  return filename;
}
