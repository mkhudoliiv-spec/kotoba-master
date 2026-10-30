#!/usr/bin/env node
/**
 * Pulls an extended JLPT kanji + word base from open GitHub sources and merges it
 * into public/data/jlpt.json in the project's format.
 *
 * Sources:
 *   kanji  — davidluzgouveia/kanji-data (kanji.json: strokes, jlpt_new, readings, meanings)
 *   words  — jamsinclair/open-anki-jlpt-decks (src/n5.csv … n1.csv: expression, reading, meaning)
 *
 * Merge rules:
 *   - Entries already in jlpt.json (matched by id) are never touched — curated cards win.
 *   - Kanji/words already present at any level are skipped (no duplicates across levels).
 *   - The sources only have English meanings. Imported entries get the English text in
 *     meaningUk / translation plus "needsTranslation": true, unless --uk provides a translation.
 *   - Grammar is not imported: there is no open source in a usable format; it stays hand-written.
 *
 * Usage:
 *   node scripts/fetch-jlpt-data.mjs                      # dry run: download, convert, print stats
 *   node scripts/fetch-jlpt-data.mjs --write              # merge into public/data/jlpt.json
 *   node scripts/fetch-jlpt-data.mjs --write --levels N5,N4 --max-kanji 100 --max-words 300
 *   node scripts/fetch-jlpt-data.mjs --write --uk scripts/uk-translations.json
 *   node scripts/fetch-jlpt-data.mjs --source-dir ./downloads   # offline: kanji.json, n5.csv, … in that dir
 *
 * Options:
 *   --levels N5,N4,N3   levels to import (default N5,N4,N3; N2/N1 also work)
 *   --max-kanji N       max new kanji per level (most frequent first; default: all)
 *   --max-words N       max new words per level (default: all)
 *   --kanji-only / --words-only
 *   --uk FILE           JSON map { "男": "чоловік", "会う": "зустрічатися", … } — Ukrainian overrides
 *                       keyed by kanji / word expression
 *   --out FILE          output path (default: the input file, public/data/jlpt.json)
 *   --write             actually write the result (otherwise dry run)
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_FILE = path.join(ROOT, 'public/data/jlpt.json');

const KANJI_URL = 'https://raw.githubusercontent.com/davidluzgouveia/kanji-data/master/kanji.json';
const WORDS_URL = lvl => `https://raw.githubusercontent.com/jamsinclair/open-anki-jlpt-decks/main/src/${lvl}.csv`;

const VOCAB_PER_KANJI = 6;
const READINGS_PER_TYPE = 4;

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const opts = { levels: ['N5', 'N4', 'N3'], maxKanji: Infinity, maxWords: Infinity, kanji: true, words: true, write: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      if (i + 1 >= argv.length) throw new Error(`Missing value for ${a}`);
      return argv[++i];
    };
    if (a === '--levels') opts.levels = next().split(',').map(s => s.trim().toUpperCase());
    else if (a === '--max-kanji') opts.maxKanji = Number(next());
    else if (a === '--max-words') opts.maxWords = Number(next());
    else if (a === '--kanji-only') opts.words = false;
    else if (a === '--words-only') opts.kanji = false;
    else if (a === '--uk') opts.uk = next();
    else if (a === '--out') opts.out = next();
    else if (a === '--source-dir') opts.sourceDir = next();
    else if (a === '--write') opts.write = true;
    else if (a === '--help' || a === '-h') opts.help = true;
    else throw new Error(`Unknown option: ${a}`);
  }
  if (opts.levels.some(l => !/^N[1-5]$/.test(l))) throw new Error(`Bad --levels: ${opts.levels.join(',')}`);
  return opts;
}

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

async function loadSource(url, localName, sourceDir) {
  if (sourceDir) return readFile(path.resolve(sourceDir, localName), 'utf8');
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  return res.text();
}

/** Minimal RFC 4180 CSV parser (quoted fields, "" escapes, commas/newlines in quotes). */
export function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows.filter(r => r.some(Boolean));
  return body.map(r => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}

// ---------------------------------------------------------------------------
// Kana → romaji / Ukrainian transcription (matches the style used in vocabulary.json)
// ---------------------------------------------------------------------------

const toHiragana = s => s.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));

// [romaji, ukrainian]
const KANA = {
  あ: ['a', 'а'], い: ['i', 'і'], う: ['u', 'у'], え: ['e', 'е'], お: ['o', 'о'],
  か: ['ka', 'ка'], き: ['ki', 'кі'], く: ['ku', 'ку'], け: ['ke', 'ке'], こ: ['ko', 'ко'],
  が: ['ga', 'ґа'], ぎ: ['gi', 'ґі'], ぐ: ['gu', 'ґу'], げ: ['ge', 'ґе'], ご: ['go', 'ґо'],
  さ: ['sa', 'са'], し: ['shi', 'ші'], す: ['su', 'су'], せ: ['se', 'се'], そ: ['so', 'со'],
  ざ: ['za', 'дза'], じ: ['ji', 'джі'], ず: ['zu', 'дзу'], ぜ: ['ze', 'дзе'], ぞ: ['zo', 'дзо'],
  た: ['ta', 'та'], ち: ['chi', 'чі'], つ: ['tsu', 'цу'], て: ['te', 'те'], と: ['to', 'то'],
  だ: ['da', 'да'], ぢ: ['ji', 'джі'], づ: ['zu', 'дзу'], で: ['de', 'де'], ど: ['do', 'до'],
  な: ['na', 'на'], に: ['ni', 'ні'], ぬ: ['nu', 'ну'], ね: ['ne', 'не'], の: ['no', 'но'],
  は: ['ha', 'ха'], ひ: ['hi', 'хі'], ふ: ['fu', 'фу'], へ: ['he', 'хе'], ほ: ['ho', 'хо'],
  ば: ['ba', 'ба'], び: ['bi', 'бі'], ぶ: ['bu', 'бу'], べ: ['be', 'бе'], ぼ: ['bo', 'бо'],
  ぱ: ['pa', 'па'], ぴ: ['pi', 'пі'], ぷ: ['pu', 'пу'], ぺ: ['pe', 'пе'], ぽ: ['po', 'по'],
  ま: ['ma', 'ма'], み: ['mi', 'мі'], む: ['mu', 'му'], め: ['me', 'ме'], も: ['mo', 'мо'],
  や: ['ya', 'я'], ゆ: ['yu', 'ю'], よ: ['yo', 'йо'],
  ら: ['ra', 'ра'], り: ['ri', 'рі'], る: ['ru', 'ру'], れ: ['re', 'ре'], ろ: ['ro', 'ро'],
  わ: ['wa', 'ва'], ゐ: ['i', 'і'], ゑ: ['e', 'е'], を: ['o', 'о'], ゔ: ['vu', 'ву'],
  ぁ: ['a', 'а'], ぃ: ['i', 'і'], ぅ: ['u', 'у'], ぇ: ['e', 'е'], ぉ: ['o', 'о'],
};

// Consonant part of i-row kana for palatalised syllables (きゃ, しょ, …): [romaji, ukrainian]
const YOON_BASE = {
  き: ['ky', 'к'], ぎ: ['gy', 'ґ'], し: ['sh', 'ш'], じ: ['j', 'дж'], ち: ['ch', 'ч'], ぢ: ['j', 'дж'],
  に: ['ny', 'н'], ひ: ['hy', 'х'], び: ['by', 'б'], ぴ: ['py', 'п'], み: ['my', 'м'], り: ['ry', 'р'],
};
const YOON_VOWEL = { ゃ: ['a', 'я'], ゅ: ['u', 'ю'], ょ: ['o', 'ьо'] };

// Katakana loan-word combinations (after toHiragana): ふぁ, てぃ, うぃ, …
const EXTENDED = {
  ふぁ: ['fa', 'фа'], ふぃ: ['fi', 'фі'], ふぇ: ['fe', 'фе'], ふぉ: ['fo', 'фо'],
  てぃ: ['ti', 'ті'], でぃ: ['di', 'ді'], とぅ: ['tu', 'ту'], どぅ: ['du', 'ду'],
  うぃ: ['wi', 'ві'], うぇ: ['we', 'ве'], うぉ: ['wo', 'во'],
  しぇ: ['she', 'ше'], じぇ: ['je', 'дже'], ちぇ: ['che', 'че'],
  ゔぁ: ['va', 'ва'], ゔぃ: ['vi', 'ві'], ゔぇ: ['ve', 'ве'], ゔぉ: ['vo', 'во'],
};

const lastVowel = s => (s.match(/[aiueo](?=[^aiueo]*$)/) || [''])[0];

/** Splits kana into syllables: [{ kana, ro, uk }] */
function syllables(kana) {
  const s = toHiragana(kana);
  const out = [];
  for (let i = 0; i < s.length; i++) {
    const two = s.slice(i, i + 2);
    if (EXTENDED[two]) { out.push({ kana: two, ro: EXTENDED[two][0], uk: EXTENDED[two][1] }); i++; continue; }
    if (YOON_BASE[s[i]] && YOON_VOWEL[s[i + 1]]) {
      const [cr, cu] = YOON_BASE[s[i]], [vr, vu] = YOON_VOWEL[s[i + 1]];
      out.push({ kana: two, ro: cr + vr, uk: cu + vu }); i++; continue;
    }
    const c = s[i];
    if (KANA[c]) out.push({ kana: c, ro: KANA[c][0], uk: KANA[c][1] });
    else out.push({ kana: c, ro: c, uk: c }); // ん, っ, ー, punctuation — resolved below
  }
  return out;
}

/** Hepburn with doubled long vowels, as in the project data: がっこう → gakkou, サッカー → sakkaa */
export function toRomaji(kana) {
  const syl = syllables(kana);
  let out = '';
  syl.forEach((x, i) => {
    const next = syl[i + 1];
    if (x.kana === 'ん') out += next && /^[aiueoy]/.test(next.ro) ? "n'" : 'n';
    else if (x.kana === 'っ') out += next && /^[a-z]/.test(next.ro) ? (next.ro.startsWith('ch') ? 't' : next.ro[0]) : "'";
    else if (x.kana === 'ー') out += lastVowel(out);
    else out += x.ro;
  });
  return out;
}

/** Ukrainian transcription: がっこう → ґакко:, せんせい → сенсей, はずかしい → хадзукаші: */
export function toUkrainian(kana) {
  const syl = syllables(kana);
  let out = '';
  syl.forEach((x, i) => {
    const prev = syl[i - 1], next = syl[i + 1];
    const pv = prev ? lastVowel(prev.ro) : '';
    if (x.kana === 'ん') out += 'н';
    else if (x.kana === 'っ') out += next && /^[^аеіоуюяй]/.test(next.uk) ? next.uk[0] : '';
    else if (x.kana === 'ー') out += ':';
    // Long vowels: おう / おお → о:, うう → у:, ああ → а:, ええ → е:, word-final いい → і:
    else if ((x.kana === 'う' && (pv === 'o' || pv === 'u')) || (x.kana === 'お' && pv === 'o')
      || (x.kana === 'あ' && pv === 'a') || (x.kana === 'え' && pv === 'e')
      || (x.kana === 'い' && pv === 'i' && !next)) out += ':';
    // Vowel + い → й: かいしゃ → кайшя, しろい → шірой (but ちゃいろ → чяіро)
    else if (x.kana === 'い' && pv && pv !== 'i' && !/[яю]$/.test(prev.uk) && prev.kana !== 'ん' && prev.kana !== 'っ') out += 'й';
    else out += x.uk;
  });
  return out;
}

// ---------------------------------------------------------------------------
// Conversion
// ---------------------------------------------------------------------------

const KANJI_RE = /[一-鿿々]/;
const kanjiChars = s => [...s].filter(c => KANJI_RE.test(c));
export const cleanExpr = s => s.replace(/[～〜~]/g, '').trim();

export function difficultyFromStrokes(n) {
  return n <= 4 ? 1 : n <= 6 ? 2 : n <= 8 ? 3 : n <= 11 ? 4 : n <= 14 ? 5 : n <= 18 ? 6 : 7;
}

/** "ひと.つ" → "ひと(つ) - hito(tsu)"; on-yomi "だん" → "だん - dan" */
function formatReading(raw) {
  const r = toHiragana(raw.replace(/-/g, ''));
  const [stem, okuri] = r.split('.');
  return okuri
    ? `${stem}(${okuri}) - ${toRomaji(stem)}(${toRomaji(okuri)})`
    : `${stem} - ${toRomaji(stem)}`;
}

export function uniqueReadings(list) {
  const seen = new Set();
  return list
    .filter(r => !r.startsWith('-')) // suffix-only usages (-も.ち) are noise for learners
    .map(formatReading)
    .filter(r => !seen.has(r) && seen.add(r))
    .slice(0, READINGS_PER_TYPE);
}

function shortMeaning(en, max = 3) {
  return en.split(/[,;]\s*/).map(s => s.trim()).filter(Boolean).slice(0, max).join(', ');
}

function inferPos(expr, meaning) {
  if (/^to\s/i.test(meaning)) return 'verb';
  if (kanjiChars(expr).length && /[一-鿿]い$/.test(expr)) return 'i-adj';
  return undefined;
}

/** On/Kun guess for a compound word: kanji alone or with okurigana → kun, kanji compound → on */
export function guessType(word, reading, onReadings) {
  if (kanjiChars(word).length > 1) return 'On';
  // Single kanji read with one of its on-readings and no okurigana (e.g. 本 — ほん)
  return word.length === 1 && onReadings.includes(reading) ? 'On' : 'Kun';
}

export function buildReadingLogic(char, vocab) {
  const ex = type => vocab.filter(v => v.type === type).slice(0, 2).map(v => `${v.word} — ${v.kana} (${v.meaningUk})`);
  const kun = ex('Kun'), on = ex('On');
  return {
    kunExplanation: kun.length
      ? `Kun-yomi — коли ${char} стоїть окремо або з окуріґаною: ${kun.join(', ')}.`
      : `Kun-yomi — коли ${char} стоїть окремо або з окуріґаною (хіраґаною після канджі).`,
    onExplanation: on.length
      ? `On-yomi — переважно у словах з кількох канджі (джюкуґо): ${on.join(', ')}.`
      : `On-yomi — у словах з кількох канджі (джюкуґо).`,
    exceptions: '',
  };
}

function buildKanji(char, src, level, index, total, wordPool, uk) {
  const onReadings = (src.readings_on || []).map(r => toHiragana(r.replace(/[-.]/g, '')));
  const vocabulary = wordPool
    .filter(w => w.expr.includes(char))
    .slice(0, VOCAB_PER_KANJI)
    .map(w => ({
      word: w.expr,
      kana: w.reading,
      romaji: toRomaji(w.reading),
      meaningUk: uk[w.expr] || shortMeaning(w.meaning, 2),
      type: guessType(w.expr, w.reading, onReadings),
    }));
  const meaningUk = uk[char];
  return {
    id: `jlpt_k_${char.codePointAt(0).toString(16)}`,
    kanji: char,
    level,
    index,
    totalInLevel: total,
    strokes: src.strokes,
    difficulty: difficultyFromStrokes(src.strokes),
    meaningUk: meaningUk || shortMeaning((src.meanings || []).join(', ')),
    onYomi: uniqueReadings(src.readings_on || []),
    kunYomi: uniqueReadings(src.readings_kun || []),
    radicals: [],
    readingLogic: buildReadingLogic(char, vocabulary),
    vocabulary,
    ...(meaningUk ? {} : { needsTranslation: true }),
    source: 'kanji-data',
  };
}

function buildWord(w, level, uk) {
  const expr = w.expr, kana = w.reading;
  const translation = uk[expr];
  const pos = inferPos(expr, w.meaning);
  return {
    id: `jlpt_w_${level.toLowerCase()}_${expr}`,
    level,
    kana,
    ...(expr !== kana ? { kanji: expr } : {}),
    romaji: toRomaji(kana),
    transcription: toUkrainian(kana),
    translation: translation || shortMeaning(w.meaning),
    ...(pos ? { pos } : {}),
    ...(translation ? {} : { needsTranslation: true }),
    source: 'open-anki-jlpt-decks',
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log(await readFile(fileURLToPath(import.meta.url), 'utf8').then(t => t.match(/\/\*\*([\s\S]*?)\*\//)[1].replace(/^ \* ?/gm, '')));
    return;
  }

  const data = JSON.parse(await readFile(DATA_FILE, 'utf8'));
  const uk = opts.uk ? JSON.parse(await readFile(path.resolve(opts.uk), 'utf8')) : {};
  const levelNum = l => Number(l.slice(1));

  // Words per level, in source order; a word belongs to the easiest level it appears in
  console.log('Завантаження слів…');
  const wordsByLevel = {};
  const seenExpr = new Set();
  for (const level of ['N5', 'N4', 'N3', 'N2', 'N1']) {
    if (levelNum(level) < Math.min(...opts.levels.map(levelNum))) break;
    const file = `${level.toLowerCase()}.csv`;
    const rows = parseCsv(await loadSource(WORDS_URL(level.toLowerCase()), file, opts.sourceDir));
    wordsByLevel[level] = rows
      .map(r => ({ expr: cleanExpr(r.expression), reading: cleanExpr(r.reading), meaning: r.meaning.trim() }))
      .filter(w => w.expr && w.reading && !/[;；]/.test(w.reading) && !seenExpr.has(w.expr) && seenExpr.add(w.expr));
  }
  // Pool for kanji example words: easiest levels first
  const wordPool = Object.values(wordsByLevel).flat();

  const existingIds = new Set([...data.kanji, ...data.words].map(i => i.id));
  const existingKanji = new Set(data.kanji.map(k => k.kanji));
  const existingWords = new Set(data.words.map(w => w.kanji || w.kana));
  const stats = {};

  if (opts.kanji) {
    console.log('Завантаження канджі…');
    const src = JSON.parse(await loadSource(KANJI_URL, 'kanji.json', opts.sourceDir));
    for (const level of opts.levels) {
      const all = Object.entries(src)
        .filter(([, k]) => k.jlpt_new === levelNum(level))
        .sort(([, a], [, b]) => (a.freq ?? 9999) - (b.freq ?? 9999));
      const levelInfo = data.levels.find(l => l.id === level);
      const curated = data.kanji.filter(k => k.level === level);
      let index = Math.max(0, ...curated.map(k => k.index));
      const fresh = all.filter(([c]) => !existingKanji.has(c)).slice(0, opts.maxKanji);
      const total = Math.max(levelInfo?.totalKanji ?? 0, curated.length + fresh.length);
      for (const [char, k] of fresh) {
        const item = buildKanji(char, k, level, ++index, total, wordPool, uk);
        if (existingIds.has(item.id)) continue;
        data.kanji.push(item);
        existingIds.add(item.id);
        existingKanji.add(char);
      }
      if (levelInfo && total > levelInfo.totalKanji) {
        levelInfo.totalKanji = total;
        data.kanji.filter(k => k.level === level).forEach(k => { k.totalInLevel = total; });
      }
      (stats[level] ??= {}).kanji = fresh.length;
    }
  }

  if (opts.words) {
    for (const level of opts.levels) {
      const fresh = (wordsByLevel[level] || [])
        .filter(w => !existingWords.has(w.expr))
        .slice(0, opts.maxWords);
      let added = 0;
      for (const w of fresh) {
        const item = buildWord(w, level, uk);
        if (existingIds.has(item.id)) continue;
        data.words.push(item);
        existingIds.add(item.id);
        existingWords.add(w.expr);
        added++;
      }
      (stats[level] ??= {}).words = added;
    }
  }

  // Keep levels grouped and kanji ordered by index within a level
  const order = l => levelNum(l) * -1;
  data.kanji.sort((a, b) => order(a.level) - order(b.level) || a.index - b.index);
  data.words.sort((a, b) => order(a.level) - order(b.level));

  console.table(stats);
  const untranslated = [...data.kanji, ...data.words].filter(i => i.needsTranslation).length;
  console.log(`Разом: ${data.kanji.length} канджі, ${data.words.length} слів; без українського перекладу: ${untranslated}`);

  if (!opts.write) {
    console.log('Dry run — нічого не записано. Додайте --write, щоб зберегти.');
    return;
  }
  const out = path.resolve(opts.out || DATA_FILE);
  await writeFile(out, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`Записано: ${path.relative(ROOT, out)}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(err => {
    console.error(err.message || err);
    process.exit(1);
  });
}
