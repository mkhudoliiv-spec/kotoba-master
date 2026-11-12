import { useState, useEffect, useCallback } from 'react';
import { reviewSrs } from '../utils/srs';

// Only user state is stored ({ id, mastered, starred, srs }); the content itself comes from kanji.json.
// The key predates the Kanji section (it used to be the JLPT section) — kept so progress survives.
export const KANJI_PROGRESS_KEY = 'kotoba_jlpt_progress';

async function fetchKanjiData() {
  const candidatePaths = [
    '/kotoba-master/data/kanji.json',
    './data/kanji.json',
    '/data/kanji.json'
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
  throw new Error('Failed to load kanji.json');
}

function readStoredState() {
  try {
    const stored = JSON.parse(localStorage.getItem(KANJI_PROGRESS_KEY) || '[]');
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
    badge: 'Канджі',
    mastered: k.mastered,
    starred: k.starred,
    srs: k.srs,
  };
}

export function useKanji() {
  const [data, setData] = useState(null);
  const [kanji, setKanji] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load content: merge JSON with localStorage state
  useEffect(() => {
    fetchKanjiData()
      .then(json => {
        const stateMap = readStoredState();
        // One flat list: numbered by position, no JLPT level split in the UI
        setData({ rules: json.rules });
        const total = json.kanji.length;
        setKanji(json.kanji.map((k, i) => withState({ ...k, index: i + 1, total }, stateMap)));
      })
      .catch(err => {
        console.error('Failed to load kanji data:', err);
        setError(err);
      })
      .finally(() => setLoading(false));
  }, []);

  // Persist user state on every change. Entries that aren't kanji (old JLPT word progress,
  // migrated into the vocabulary by useVocabulary) are kept untouched.
  useEffect(() => {
    if (loading || error) return;
    const ids = new Set(kanji.map(k => k.id));
    const others = [...readStoredState().values()].filter(s => !ids.has(s.id));
    const state = kanji
      .filter(i => i.mastered || i.starred || i.srs)
      .map(({ id, mastered, starred, srs }) => ({ id, mastered, starred, srs }));
    localStorage.setItem(KANJI_PROGRESS_KEY, JSON.stringify([...state, ...others]));
  }, [kanji, loading, error]);

  const update = useCallback((id, fn) => {
    setKanji(prev => prev.map(i => (i.id === id ? fn(i) : i)));
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
    rules: data?.rules || [],
    kanji,
    loading, error,
    toggleStar, toggleMastered, reviewItem,
  };
}
