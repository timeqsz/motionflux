import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { png } from './scene-examples.mjs';

// Original fictional product studies: deterministic shaded illustrations, not sourced product photos.
const clamp = x => Math.max(0, Math.min(255, Math.round(x)));
function speakerPixel(x, y) {
  const dx = x - 500, dy = y - 480;
  const qx = Math.max(Math.abs(dx) - 100, 0), qy = Math.max(Math.abs(dy) - 190, 0);
  if (Math.hypot(qx, qy) <= 140) {
    const light = 154 + 50 * Math.cos((dx + 85) / 240) - 25 * (dx / 240) + 8 * Math.sin(y / 150);
    const mesh = y > 265 && y < 735 && Math.abs(dx) < 218;
    const hole = Math.hypot(((x + (Math.floor(y / 12) % 2) * 6) % 12) - 6, y % 12 - 6) < 2.4;
    const shade = mesh && hole ? 48 : 0;
    return [clamp(light - shade), clamp(light + 4 - shade), clamp(light - 4 - shade), 255];
  }
  const shadow = 48 * Math.exp(-((dx / 220) ** 2 + ((y - 835) / 40) ** 2));
  return [32, 30, 24, clamp(shadow)];
}
function lampPixel(x, y) {
  const dx = x - 500;
  const base = (dx / 210) ** 2 + ((y - 820) / 40) ** 2 < 1;
  const stem = Math.abs(dx - 14) < 19 && y > 345 && y < 820;
  const shade = y >= 200 && y < 370 && Math.abs(dx) < 140 + (y - 200) * .65;
  if (base || stem || shade) {
    const light = 175 + 45 * Math.cos((dx + 90) / 210) - dx * .07;
    return [clamp(light), clamp(light * .80), clamp(light * .52), 255];
  }
  const underside = (dx / 252) ** 2 + ((y - 370) / 30) ** 2 < 1;
  if (underside) return [245, 225, 179, 255];
  const shadow = 40 * Math.exp(-((dx / 230) ** 2 + ((y - 855) / 35) ** 2));
  return [37, 30, 22, clamp(shadow)];
}
export async function writePatternExamples({ composePattern, createStandaloneHtml, briefSchema, authoringSchema }) {
  const root = 'assets/patterns/title-yields-to-product';
  await mkdir(`${root}/assets`, { recursive: true });
  const hash = data => createHash('sha256').update(data).digest('hex');
  const illustrations = { speaker: png(1000, 1000, speakerPixel), lamp: png(1000, 1000, lampPixel) };
  for (const [name, bytes] of Object.entries(illustrations)) await writeFile(`${root}/assets/${name}.png`, bytes);
  const motion = { enterSeconds: .6, travelSeconds: .8, minReadSeconds: 1.3, readUnitsPerSecond: 8, endHoldSeconds: 1.2 };
  const examples = [
    { name: 'speaker-landscape', image: 'speaker', briefVersion: '0.1', pattern: 'title-yields-to-product',
      canvas: { width: 1280, height: 720 }, fps: 30, durationSeconds: 9,
      copy: { headline: 'Small form.\nFull sound.', detail: 'A quieter object.\nA room full of music.', closing: 'SONA — Sound, considered.' },
      brand: { name: 'SONA', palette: { background: '#ede9df', ink: '#20251f', muted: '#56604f', accent: '#cd603e' },
        typography: { headlineRatio: .105, bodyRatio: .022 }, motion } },
    { name: 'lamp-portrait', image: 'lamp', briefVersion: '0.1', pattern: 'title-yields-to-product',
      canvas: { width: 720, height: 1080 }, fps: 30, durationSeconds: 12,
      copy: { headline: '给每一次专注，\n留一束温柔的光。', detail: '让桌面安静下来。\n让想法慢慢展开。', closing: '弧光 ARC · 照亮此刻' },
      brand: { name: '弧光 ARC', palette: { background: '#212a28', ink: '#f4ead7', muted: '#b8c4b6', accent: '#dfae64' },
        typography: { headlineRatio: .10, bodyRatio: .029 }, motion: { ...motion, enterSeconds: .7, minReadSeconds: 1.8, readUnitsPerSecond: 6 } } },
  ];
  const runtime = await readFile('scripts/resources/standalone.js', 'utf8');
  for (const { name, image, ...config } of examples) {
    const bytes = illustrations[image];
    const brief = { ...config, product: { src: `assets/${image}.png`, sha256: hash(bytes), license: 'Original fictional product illustration by MotionFlux; MIT. No real product claims.' } };
    const product = { type: 'image', src: brief.product.src, sha256: brief.product.sha256 };
    const { scene, authoring } = composePattern(brief, product);
    for (const [extension, value] of [['brief', brief], ['scene', scene], ['authoring', authoring]])
      await writeFile(`${root}/${name}.${extension}.json`, JSON.stringify(value, null, 2) + '\n');
    await writeFile(`${root}/${name}.html`, createStandaloneHtml(scene, runtime, { [product.src]: bytes.toString('base64') }, ''));
  }
  await writeFile('assets/patterns/brief.schema.json', JSON.stringify(briefSchema, null, 2) + '\n');
  await writeFile('assets/patterns/authoring.schema.json', JSON.stringify(authoringSchema, null, 2) + '\n');
}
