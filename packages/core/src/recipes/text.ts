import { clamp, lerp, rand } from '../math.js';
import type { Recipe, RecipeContext } from './context.js';
import type { Glyph, Line } from '../types.js';

/** Glyph states for a line, created on first use. Characters are user-perceived code points, not UTF-16 units. */
function glyphs(line: Line): Glyph[] {
  const count = [...line.text].length;
  line.glyphs ??= [];
  while (line.glyphs.length < count) line.glyphs.push({ dx: 0, dy: 0, opacity: 1, scale: 1 });
  return line.glyphs;
}
const visible = (character: string) => character.trim() !== '';
/** Number of characters that animate, across every line. Spaces take no time. */
const total = (c: RecipeContext) => c.state.lines.reduce((sum, line) => sum + [...line.text].filter(visible).length, 0);

/** Text recipes act on the lines of a text node: per character, per line, or by rewriting the characters. */
export const textChars: Recipe = (c) => {
  // The clip includes the stagger: the last character finishes exactly when the clip does.
  const count = total(c); const step = c.n('stepFrames'); const active = Math.max(1, c.duration - (count - 1) * step);
  let index = 0;
  for (const line of c.state.lines) {
    const states = glyphs(line);
    [...line.text].forEach((character, i) => {
      if (!visible(character)) return;
      const value = c.ease(clamp((c.elapsed - index++ * step) / active));
      states[i]!.opacity *= clamp(value); states[i]!.dy += c.n('distancePx') * (1 - value);
    });
  }
};
export const textLines: Recipe = (c) => {
  const step = c.n('stepFrames'); const active = Math.max(1, c.duration - (c.state.lines.length - 1) * step);
  c.state.lines.forEach((line, i) => {
    const value = c.ease(clamp((c.elapsed - i * step) / active));
    line.opacity *= clamp(value); line.y += c.n('distancePx') * (1 - value);
  });
};
const charsets: Record<string, string> = { symbols: '!<>-_\\/[]{}=+*^?#%&@$', binary: '01' };
export const textDecode: Recipe = (c) => {
  // Characters lock in from first to last; the rest cycle through stand-ins at rateHz.
  const pool = c.s('charset') === 'own' ? [...new Set(c.state.lines.flatMap((line) => [...line.text]).filter(visible))] : [...charsets[c.s('charset')]!];
  const count = total(c); const tick = Math.floor(c.seconds * c.n('rateHz')); const settled = c.ease(c.progress) * count;
  let index = 0;
  for (const line of c.state.lines) line.text = [...line.text].map((character) => {
    if (!visible(character)) return character;
    const i = index++;
    return i < Math.floor(settled + 1e-9) || pool.length < 2 ? character : pool[Math.floor(rand(c.seed, i, tick) * pool.length)]!;
  }).join('');
};
export const textType: Recipe = (c) => {
  // Typing is steady: one character per equal slice of the clip, whatever curve the node's properties use.
  const count = total(c); let left = Math.floor(clamp(c.progress) * count + 1e-9); let cursorLine = 0;
  c.state.lines.forEach((line, i) => {
    const characters = [...line.text]; let keep = 0;
    while (keep < characters.length && (left > 0 || !visible(characters[keep]!))) { if (visible(characters[keep]!)) left--; keep++; }
    if (keep > 0 || i === 0) cursorLine = i;
    line.text = characters.slice(0, keep).join('');
    if (keep < characters.length) left = 0;
  });
  const typing = c.progress < 1; const blink = c.n('blinkHz');
  const on = typing || blink === 0 || Math.floor(c.seconds * blink * 2) % 2 === 0;
  if (c.s('cursor') !== 'none' && on) c.state.lines[cursorLine]!.text += c.s('cursor') === 'block' ? '█' : '|';
};
export const textCount: Recipe = (c) => {
  const value = lerp(c.n('from'), c.n('to'), c.ease(c.progress)); const decimals = c.n('decimals');
  let number = Math.abs(value).toFixed(decimals);
  if (c.s('grouping') === 'comma') number = number.replace(/^\d+/u, (digits) => digits.replace(/\B(?=(\d{3})+$)/gu, ','));
  if (value < 0 && Number(number.replace(/,/gu, '')) !== 0) number = `-${number}`;
  // A # in the text marks where the number goes; otherwise the number is the whole text.
  if (c.state.lines.some((line) => line.text.includes('#'))) for (const line of c.state.lines) line.text = line.text.replace('#', number);
  else c.state.lines.splice(0, c.state.lines.length, { text: number, y: 0, opacity: 1 });
};
export const textTracking: Recipe = (c) => {
  const spacing = lerp(c.n('fromPx'), c.n('toPx'), c.ease(c.progress)); const centred = c.s('anchor') === 'center';
  for (const line of c.state.lines) {
    const states = glyphs(line); const count = [...line.text].length;
    states.forEach((state, i) => { if (i < count) state.dx += spacing * (centred ? i - (count - 1) / 2 : i); });
  }
};

export const text = { 'text.chars': textChars, 'text.lines': textLines, 'text.decode': textDecode, 'text.type': textType, 'text.count': textCount, 'text.tracking': textTracking } satisfies Record<string, Recipe>;
