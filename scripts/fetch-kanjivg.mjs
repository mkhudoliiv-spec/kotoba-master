#!/usr/bin/env node
/**
 * Downloads stroke-order data for every kanji in public/data/kanji.json from KanjiVG
 * and writes public/data/kanji-strokes.json, used by the printable worksheets.
 *
 * Source: KanjiVG (https://kanjivg.tagaini.net), © Ulrich Apel, CC BY-SA 3.0.
 *
 * Output: { source, license, kanji: { "日": { s: ["M31.5,24.5c…", …], n: [[25.25, 32.63], …] } } }
 *   s — stroke paths in order, in a 109×109 viewBox
 *   n — position of each stroke number (from KanjiVG's StrokeNumbers group)
 *
 * Usage: node scripts/fetch-kanjivg.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';

const KANJI_JSON = new URL('../public/data/kanji.json', import.meta.url);
const OUT_JSON = new URL('../public/data/kanji-strokes.json', import.meta.url);
const BASE = 'https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/';

const fileName = (ch) => ch.codePointAt(0).toString(16).padStart(5, '0') + '.svg';

function parse(svg) {
  const strokes = [...svg.matchAll(/<path[^>]*?\sid="kvg:[0-9a-f]+-s(\d+)"[^>]*?\sd="([^"]+)"/g)]
    .map(m => [Number(m[1]), m[2]])
    .sort((a, b) => a[0] - b[0])
    .map(([, d]) => d);
  const numbers = [...svg.matchAll(/<text transform="matrix\(1 0 0 1 ([\d.-]+) ([\d.-]+)\)">(\d+)<\/text>/g)]
    .sort((a, b) => Number(a[3]) - Number(b[3]))
    .map(m => [Number(m[1]), Number(m[2])]);
  return { s: strokes, n: numbers };
}

const { kanji } = JSON.parse(await readFile(KANJI_JSON, 'utf8'));
const out = {};
const mismatched = [];

for (const k of kanji) {
  const res = await fetch(BASE + fileName(k.kanji));
  if (!res.ok) { console.warn(`✗ ${k.kanji}: HTTP ${res.status}`); continue; }
  const data = parse(await res.text());
  if (data.s.length !== k.strokes) mismatched.push(`${k.kanji} (kanji.json ${k.strokes}, KanjiVG ${data.s.length})`);
  out[k.kanji] = data;
}

await writeFile(OUT_JSON, JSON.stringify({
  source: 'KanjiVG — https://kanjivg.tagaini.net',
  license: 'CC BY-SA 3.0, © Ulrich Apel',
  kanji: out,
}) + '\n');

const max = Math.max(...Object.values(out).map(d => d.s.length));
console.log(`✓ ${Object.keys(out).length}/${kanji.length} kanji, max ${max} strokes → public/data/kanji-strokes.json`);
if (mismatched.length) console.log(`Stroke count differs: ${mismatched.join(', ')}`);
