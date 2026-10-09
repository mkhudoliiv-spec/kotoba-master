import { useState, useEffect } from 'react';

const CANDIDATE_PATHS = [
  '/kotoba-master/data/grammar.json',
  './data/grammar.json',
  '/data/grammar.json'
];

export function useGrammar() {
  const [state, setState] = useState({ data: null, loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const path of CANDIDATE_PATHS) {
        try {
          const res = await fetch(path, { cache: 'no-cache' });
          if (res.ok) {
            const data = await res.json();
            if (!cancelled) setState({ data, loading: false, error: null });
            return;
          }
        } catch {
          // try next candidate path
        }
      }
      if (!cancelled) setState({ data: null, loading: false, error: new Error('Failed to load grammar.json') });
    })();
    return () => { cancelled = true; };
  }, []);

  return state;
}
