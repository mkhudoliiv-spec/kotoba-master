#!/usr/bin/env node
/**
 * Downloads brush-shaped stroke-order data (Japanese standard) from AnimCJK and writes
 *   public/data/strokes-kanji.json — every kanji in public/data/kanji.json
 *   public/data/strokes-kana.json  — all hiragana + katakana (177 chars)
 * plus the AnimCJK licence texts into public/licenses/animcjk/.
 *
 * Source: AnimCJK (https://github.com/parsimonhi/animCJK), pinned to COMMIT below.
 *   graphicsJa.txt / graphicsJaKana.txt — one JSON per line: { character, strokes, medians }
 *   (makemeahanzi format, y axis flipped: y = 900 − y_svg). Converted here to plain SVG coords.
 * Licences: kanji strokes — Arphic Public License; kana — LGPL-3.0 (or APL).
 *
 * Output: { source, license, commit, viewBox, chars: { "週": { s: [outline d, …], m: [[[x,y],…], …] } } }
 *   s — stroke outlines (filled shapes) in order, 1024×1024 viewBox
 *   m — median of each stroke (the brush's path), used to animate / check drawing
 *   f — "kanjivg" when AnimCJK lacks the char and KanjiVG centrelines (109×109) were used instead
 *
 * The raw files are big (graphicsJa.txt ≈ 23 MB, over jsDelivr's 20 MB limit), so they are
 * fetched from raw.githubusercontent.com at the pinned commit and only the needed chars are kept.
 *
 * Usage: npm run fetch:strokes
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const COMMIT = 'c63765b150cbd567c71d05cf4a4f8d00b57045c9';
const RAW = `https://raw.githubusercontent.com/parsimonhi/animCJK/${COMMIT}/`;
const KANJI_JSON = new URL('../public/data/kanji.json', import.meta.url);
const KANJIVG_JSON = new URL('../public/data/kanji-strokes.json', import.meta.url);
const OUT_KANJI = new URL('../public/data/strokes-kanji.json', import.meta.url);
const OUT_KANA = new URL('../public/data/strokes-kana.json', import.meta.url);
const LICENSE_DIR = new URL('../public/licenses/animcjk/', import.meta.url);

const LICENSES = {
  'COPYING.txt': 'licenses/COPYING.txt',
  'ARPHICPL.txt': 'licenses/APL/english/ARPHICPL.TXT',
  'LGPL.txt': 'licenses/LGPL.txt',
};

async function get(path) {
  const res = await fetch(RAW + path);
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.text();
}

async function loadGraphics(path) {
  const text = await get(path);
  const map = new Map();
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    const o = JSON.parse(line);
    map.set(o.character, o);
  }
  return map;
}

// "M451,735Q441,742 …" (y up, baseline 900) → "M451 165Q441 158 …" (SVG y down)
const flipPath = d => d.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (_, x, y) => `${x} ${900 - Number(y)}`);
const flipPoint = ([x, y]) => [x, 900 - y];

const convert = g => ({ s: g.strokes.map(flipPath), m: g.medians.map(m => m.map(flipPoint)) });

function header(license) {
  return {
    source: 'AnimCJK — https://github.com/parsimonhi/animCJK',
    license,
    commit: COMMIT,
    viewBox: '0 0 1024 1024',
  };
}

console.log(`AnimCJK @ ${COMMIT.slice(0, 7)} — downloading…`);
const [ja, kana] = await Promise.all([loadGraphics('graphicsJa.txt'), loadGraphics('graphicsJaKana.txt')]);

// Kanji
const { kanji } = JSON.parse(await readFile(KANJI_JSON, 'utf8'));
let kanjivg = {};
try { kanjivg = JSON.parse(await readFile(KANJIVG_JSON, 'utf8')).kanji; } catch { /* no fallback data */ }

const kanjiOut = {};
const fallback = [];
const missing = [];
const mismatched = [];
for (const k of kanji) {
  const g = ja.get(k.kanji);
  if (g) {
    kanjiOut[k.kanji] = convert(g);
    if (g.strokes.length !== k.strokes) mismatched.push(`${k.kanji} (kanji.json ${k.strokes}, AnimCJK ${g.strokes.length})`);
  } else if (kanjivg[k.kanji]) {
    kanjiOut[k.kanji] = { f: 'kanjivg', s: kanjivg[k.kanji].s };
    fallback.push(k.kanji);
  } else {
    missing.push(k.kanji);
  }
}

// Kana: everything AnimCJK has (hiragana + katakana)
const kanaOut = {};
for (const [ch, g] of [...kana].sort(([a], [b]) => a.codePointAt(0) - b.codePointAt(0))) kanaOut[ch] = convert(g);

await writeFile(OUT_KANJI, JSON.stringify({
  ...header('Arphic Public License (see licenses/animcjk/); KanjiVG fallback entries: CC BY-SA 3.0, © Ulrich Apel'),
  chars: kanjiOut,
}) + '\n');
await writeFile(OUT_KANA, JSON.stringify({
  ...header('LGPL-3.0 or Arphic Public License (see licenses/animcjk/)'),
  chars: kanaOut,
}) + '\n');

await mkdir(LICENSE_DIR, { recursive: true });
for (const [name, path] of Object.entries(LICENSES)) {
  await writeFile(new URL(name, LICENSE_DIR), await get(path));
}

console.log(`✓ ${Object.keys(kanjiOut).length}/${kanji.length} kanji → public/data/strokes-kanji.json`);
console.log(`✓ ${Object.keys(kanaOut).length} kana → public/data/strokes-kana.json`);
console.log(`✓ licences → public/licenses/animcjk/`);
if (fallback.length) console.log(`↺ KanjiVG fallback: ${fallback.join(' ')}`);
if (missing.length) console.log(`✗ No stroke data: ${missing.join(' ')}`);
if (mismatched.length) console.log(`Stroke count differs: ${mismatched.join(', ')}`);
