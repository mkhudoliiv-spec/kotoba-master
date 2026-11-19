import { useEffect, useState } from 'react';
import { fetchDataFile } from './dataFile';

// Brush-shaped stroke order from AnimCJK (Japanese standard), built by scripts/fetch-animcjk.mjs.
// Entry: { s: [outline d, …], m: [[[x, y], …], …] } in a 1024×1024 viewBox,
// or { f: 'kanjivg', s: [centreline d, …] } (109×109) for chars AnimCJK lacks.

const FILES = { kanji: 'strokes-kanji.json', kana: 'strokes-kana.json' };
const cache = {};

// Kana blocks (hiragana, katakana, prolonged sound mark) live in the kana file.
export const isKana = ch => /^[぀-ヿ]$/.test(ch);

/** Loads (once) and returns the { char: entry } map of one set. Failures are not cached. */
export function preloadStrokes(kind) {
  cache[kind] ??= fetchDataFile(FILES[kind])
    .then(d => d.chars)
    .catch(() => { delete cache[kind]; return {}; });
  return cache[kind];
}

/** Stroke entry for one character, or null if there's no data for it. */
export async function fetchStrokes(char) {
  const set = await preloadStrokes(isKana(char) ? 'kana' : 'kanji');
  return set[char] || null;
}

/** React hook: { data, loading } for one character. */
export function useStrokes(char) {
  const [state, setState] = useState({ char: null, data: null });
  useEffect(() => {
    let alive = true;
    fetchStrokes(char).then(data => { if (alive) setState({ char, data }); });
    return () => { alive = false; };
  }, [char]);
  return state.char === char ? { data: state.data, loading: false } : { data: null, loading: true };
}
