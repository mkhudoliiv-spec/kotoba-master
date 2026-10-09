import { useState, useEffect, useCallback } from 'react';
import { reviewSrs } from '../utils/srs';

const STORAGE_KEY = 'kotoba_master_words';

async function fetchVocabularyData() {
  const candidatePaths = [
    '/kotoba-master/data/vocabulary.json',
    './data/vocabulary.json',
    '/data/vocabulary.json'
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
  throw new Error('Failed to load vocabulary.json');
}

export function useVocabulary() {
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load words: merge JSON with localStorage state
  useEffect(() => {
    fetchVocabularyData()
      .then(data => {
        const stored = localStorage.getItem(STORAGE_KEY);
        let storedWords = [];
        if (stored) {
          try {
            storedWords = JSON.parse(stored);
          } catch { /* ignore */ }
        }

        const storedMap = new Map(storedWords.map(w => [w.id, w]));

        const mergedWords = data.map(w => {
          if (storedMap.has(w.id)) {
            const storedWord = storedMap.get(w.id);
            return { ...w, mastered: storedWord.mastered, starred: storedWord.starred, srs: storedWord.srs };
          }
          return { ...w, mastered: false, starred: false };
        });

        const jsonIds = new Set(data.map(w => w.id));
        const customWords = storedWords.filter(w => !jsonIds.has(w.id));

        const finalWords = [...mergedWords, ...customWords];

        setWords(finalWords);
      })
      .catch(err => console.error('Failed to load vocabulary:', err))
      .finally(() => setLoading(false));
  }, []);

  // Persist to localStorage on every change
  useEffect(() => {
    if (!loading && words.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
    }
  }, [words, loading]);

  const addWord = useCallback((word) => {
    setWords(prev => [word, ...prev]);
  }, []);

  const deleteWord = useCallback((id) => {
    setWords(prev => prev.filter(w => w.id !== id));
  }, []);

  const toggleStar = useCallback((id) => {
    setWords(prev => prev.map(w => w.id === id ? { ...w, starred: !w.starred } : w));
  }, []);

  const toggleMastered = useCallback((id, value) => {
    setWords(prev => prev.map(w => w.id === id ? { ...w, mastered: value } : w));
  }, []);

  // Flashcard answer: updates mastered flag and spaced-repetition schedule
  const reviewWord = useCallback((id, known) => {
    setWords(prev => prev.map(w =>
      w.id === id ? { ...w, mastered: known, srs: reviewSrs(w, known) } : w
    ));
  }, []);

  const importWords = useCallback((imported) => {
    setWords(prev => {
      const currentIds = new Set(prev.map(w => w.id));
      const newWords = imported.map(item => {
        if (!item.kana || !item.translation) return null;
        if (currentIds.has(item.id)) {
          item = { ...item, id: 'imported_' + Math.random().toString(36).substr(2, 9) };
        }
        return { mastered: false, starred: false, ...item };
      }).filter(Boolean);
      return [...prev, ...newWords];
    });
  }, []);

  const resetAll = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setLoading(true);
    fetchVocabularyData()
      .then(data => {
        const enriched = data.map(w => ({ ...w, mastered: false, starred: false }));
        setWords(enriched);
      })
      .finally(() => setLoading(false));
  }, []);

  return { words, loading, addWord, deleteWord, toggleStar, toggleMastered, reviewWord, importWords, resetAll };
}
