#!/usr/bin/env node
/**
 * Builds public/data/jlpt-n5.json: the next batch of JLPT N5 kanji (those not yet in jlpt.json),
 * with Ukrainian meanings, example words and reading tips.
 *
 * Sources (downloaded into a temp folder, removed when the script finishes):
 *   kanji  — davidluzgouveia/kanji-data (kanji.json: strokes, jlpt_new, freq, readings)
 *   words  — jamsinclair/open-anki-jlpt-decks (src/n5.csv, src/n4.csv) — example words
 *
 * The sources only have English. Ukrainian text comes from scripts/jlpt-n5-uk.json:
 *   kanji.<char>  — meaning, exceptions (reading tip), add (extra example words),
 *                   onYomi / kunYomi (replace noisy source readings)
 *   words.<expr>  — translation of a source example word; untranslated words are left out
 *   types.<expr>  — On/Kun override where the compound-word guess is wrong (今日, 友達, …)
 *
 * Usage:
 *   node scripts/build-jlpt-n5.mjs                  # 40 kanji, writes public/data/jlpt-n5.json
 *   node scripts/build-jlpt-n5.mjs --count 30
 *   node scripts/build-jlpt-n5.mjs --source-dir DIR # offline: kanji.json, n5.csv, n4.csv in DIR
 */
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseCsv, toRomaji, cleanExpr, difficultyFromStrokes, uniqueReadings, guessType, buildReadingLogic,
} from './fetch-jlpt-data.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const JLPT_FILE = path.join(ROOT, 'public/data/jlpt.json');
const OUT_FILE = path.join(ROOT, 'public/data/jlpt-n5.json');
const UK_FILE = path.join(ROOT, 'scripts/jlpt-n5-uk.json');

const SOURCES = {
  'kanji.json': 'https://raw.githubusercontent.com/davidluzgouveia/kanji-data/master/kanji.json',
  'n5.csv': 'https://raw.githubusercontent.com/jamsinclair/open-anki-jlpt-decks/main/src/n5.csv',
  'n4.csv': 'https://raw.githubusercontent.com/jamsinclair/open-anki-jlpt-decks/main/src/n4.csv',
};
const VOCAB_PER_KANJI = 6;

function parseArgs(argv) {
  const opts = { count: 40 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--count') opts.count = Number(argv[++i]);
    else if (argv[i] === '--source-dir') opts.sourceDir = argv[++i];
    else throw new Error(`Unknown option: ${argv[i]}`);
  }
  if (!(opts.count > 0)) throw new Error('--count must be a positive number');
  return opts;
}

async function download(dir) {
  for (const [name, url] of Object.entries(SOURCES)) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
    await writeFile(path.join(dir, name), await res.text(), 'utf8');
    console.log(`  ✓ ${name}`);
  }
}

/** Source example words, N5 first: { expr, reading }; drops multi-reading rows and fixes "～する" readings */
function loadWordPool(dir) {
  return Promise.all(['n5.csv', 'n4.csv'].map(f => readFile(path.join(dir, f), 'utf8')))
    .then(texts => texts.flatMap(parseCsv))
    .then(rows => rows
      .map(r => {
        const expr = cleanExpr(r.expression);
        let reading = cleanExpr(r.reading);
        if (reading.endsWith('する') && !expr.endsWith('する')) reading = reading.slice(0, -2);
        return { expr, reading };
      })
      .filter(w => w.expr && w.reading && !/[;；]/.test(w.expr + w.reading)));
}

function buildVocabulary(char, src, entry, pool, uk, missing) {
  const onReadings = (src.readings_on || []).map(r => r.replace(/[-.]/g, ''));
  const added = (entry.add || []).map(([word, kana, meaningUk, type]) => ({ word, kana, meaningUk, type }));
  const skipped = [];
  const fromSource = pool
    .filter(w => w.expr.includes(char))
    .flatMap(w => {
      const meaningUk = uk.words[w.expr];
      if (!meaningUk) { skipped.push(`${w.expr} (${w.reading})`); return []; }
      return [{ word: w.expr, kana: w.reading, meaningUk, type: uk.types[w.expr] || guessType(w.expr, w.reading, onReadings) }];
    });
  const seen = new Set();
  const vocabulary = [...added, ...fromSource]
    .filter(v => !seen.has(v.word) && seen.add(v.word))
    .slice(0, VOCAB_PER_KANJI)
    .map(({ word, kana, meaningUk, type }) => ({ word, kana, romaji: toRomaji(kana), meaningUk, type }));
  // Only worth reporting when a translation would have added an example
  if (vocabulary.length < VOCAB_PER_KANJI) skipped.forEach(w => missing.add(w));
  return vocabulary;
}

async function build(dir, opts) {
  const jlpt = JSON.parse(await readFile(JLPT_FILE, 'utf8'));
  const uk = JSON.parse(await readFile(UK_FILE, 'utf8'));
  const src = JSON.parse(await readFile(path.join(dir, 'kanji.json'), 'utf8'));
  const pool = await loadWordPool(dir);

  const level = jlpt.levels.find(l => l.id === 'N5');
  const curated = jlpt.kanji.filter(k => k.level === 'N5');
  const known = new Set(jlpt.kanji.map(k => k.kanji));
  const startIndex = Math.max(0, ...curated.map(k => k.index));

  // N5 kanji missing from jlpt.json, most frequent first
  const picked = Object.entries(src)
    .filter(([c, k]) => k.jlpt_new === 5 && !known.has(c))
    .sort(([, a], [, b]) => (a.freq ?? 9999) - (b.freq ?? 9999))
    .slice(0, opts.count);
  const total = Math.max(level.totalKanji, curated.length + picked.length);

  const untranslated = picked.filter(([c]) => !uk.kanji[c]?.meaning).map(([c]) => c);
  if (untranslated.length) throw new Error(`Немає перекладу в ${path.relative(ROOT, UK_FILE)} для: ${untranslated.join(' ')}`);

  const missing = new Set();
  const kanji = picked.map(([char, k], i) => {
    const entry = uk.kanji[char];
    const vocabulary = buildVocabulary(char, k, entry, pool, uk, missing);
    return {
      id: `jlpt_k_${char.codePointAt(0).toString(16)}`,
      kanji: char,
      level: 'N5',
      index: startIndex + i + 1,
      totalInLevel: total,
      strokes: k.strokes,
      difficulty: difficultyFromStrokes(k.strokes),
      meaningUk: entry.meaning,
      onYomi: entry.onYomi ?? uniqueReadings(k.readings_on || []),
      kunYomi: entry.kunYomi ?? uniqueReadings(k.readings_kun || []),
      radicals: [],
      readingLogic: { ...buildReadingLogic(char, vocabulary), exceptions: entry.exceptions || '' },
      vocabulary,
      source: 'kanji-data',
    };
  });

  const out = { levels: [{ ...level, totalKanji: total }], kanji, words: [] };
  await writeFile(OUT_FILE, JSON.stringify(out, null, 2) + '\n', 'utf8');

  console.log(`Записано ${path.relative(ROOT, OUT_FILE)}: ${kanji.length} канджі (№${startIndex + 1}–${startIndex + kanji.length}), ` +
    `${kanji.reduce((n, k) => n + k.vocabulary.length, 0)} прикладів слів`);
  console.log(kanji.map(k => k.kanji).join(''));
  if (missing.size) console.log(`Пропущено слів без перекладу (${missing.size}): ${[...missing].join(', ')}`);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.sourceDir) return build(path.resolve(opts.sourceDir), opts);

  const dir = await mkdtemp(path.join(os.tmpdir(), 'jlpt-n5-'));
  try {
    console.log(`Завантаження джерел у ${dir}…`);
    await download(dir);
    await build(dir, opts);
  } finally {
    await rm(dir, { recursive: true, force: true });
    console.log('Тимчасові файли видалено.');
  }
}

main().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});
