import { useState, useEffect, useCallback } from 'react';
import { reviewSrs } from '../utils/srs';

// Only user state is stored ({ id, mastered, starred, srs }); the content itself comes from jlpt.json
const STORAGE_KEY = 'kotoba_jlpt_progress';

async function fetchJlptData() {
  const candidatePaths = [
    '/kotoba-master/data/jlpt.json',
    './data/jlpt.json',
    '/data/jlpt.json'
  ];
  for (const path of candidatePaths) {
    try {
      const res = await fetch(path);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // try next candidate path
    }
  }
  throw new Error('Failed to load jlpt.json');
}

function readStoredState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return new Map(stored.map(s => [s.id, s]));
  } catch {
    return new Map();
  }
}

const withState = (item, stateMap) => {
  const s = stateMap.get(item.id);
  return s
    ? { ...item, mastered: !!s.mastered, starred: !!s.starred, srs: s.srs }
    : { ...item, mastered: false, starred: false };
};

/** "おお(きい) - oo(kii)" → "おお(きい)" */
export const readingKana = (reading) => reading.split(' - ')[0].trim();
/** "おお(きい) - oo(kii)" → "oo(kii)" */
export const readingRomaji = (reading) => (reading.split(' - ')[1] || '').trim();

/**
 * Kanji card → item for the shared trainers (Quiz / WriteMode / MatchGame / Flashcards).
 * kana lists every reading separated by "/", so the write-mode check accepts any of them.
 */
export function kanjiToTrainerItem(k) {
  const readings = [...k.kunYomi, ...k.onYomi];
  return {
    id: k.id,
    kanji: k.kanji,
    kana: readings.map(readingKana).join(' / '),
    transcription: readings.map(readingRomaji).join(' · '),
    translation: k.meaningUk.toLowerCase(),
    badge: `JLPT ${k.level} · Канджі`,
    mastered: k.mastered,
    starred: k.starred,
    srs: k.srs,
  };
}

export function useJlpt() {
  const [data, setData] = useState(null);
  const [items, setItems] = useState({ kanji: [], words: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load content: merge JSON with localStorage state
  useEffect(() => {
    fetchJlptData()
      .then(json => {
        const stateMap = readStoredState();
        setData({ levels: json.levels, grammar: json.grammar, rules: json.rules });
        setItems({
          kanji: json.kanji.map(k => withState(k, stateMap)),
          words: json.words.map(w => ({ ...withState(w, stateMap), badge: `JLPT ${w.level} · Слово` })),
        });
      })
      .catch(err => {
        console.error('Failed to load JLPT data:', err);
        setError(err);
      })
      .finally(() => setLoading(false));
  }, []);

  // Persist user state on every change
  useEffect(() => {
    if (loading || error) return;
    const state = [...items.kanji, ...items.words]
      .filter(i => i.mastered || i.starred || i.srs)
      .map(({ id, mastered, starred, srs }) => ({ id, mastered, starred, srs }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [items, loading, error]);

  const update = useCallback((id, fn) => {
    const apply = list => list.map(i => (i.id === id ? fn(i) : i));
    setItems(prev => ({ kanji: apply(prev.kanji), words: apply(prev.words) }));
  }, []);

  const toggleStar = useCallback((id) => {
    update(id, i => ({ ...i, starred: !i.starred }));
  }, [update]);

  // "Вивчено" button: marking as learned counts as a successful review, unmarking as a lapse
  const toggleMastered = useCallback((id) => {
    update(id, i => ({ ...i, mastered: !i.mastered, srs: reviewSrs(i, !i.mastered) }));
  }, [update]);

  // Trainer answer: updates mastered flag and spaced-repetition schedule
  const reviewItem = useCallback((id, known) => {
    update(id, i => ({ ...i, mastered: known, srs: reviewSrs(i, known) }));
  }, [update]);

  return {
    levels: data?.levels || [],
    grammar: data?.grammar || [],
    rules: data?.rules || [],
    kanji: items.kanji,
    words: items.words,
    loading, error,
    toggleStar, toggleMastered, reviewItem,
  };
}
