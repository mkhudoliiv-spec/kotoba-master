import { useSyncExternalStore } from 'react';

// Display font for big "showcase" Japanese glyphs (kanji cards, flashcards, quiz).
// Applied via <html data-jp-style="..."> → CSS var --font-jp-display (see index.css).
export const GLYPH_STYLES = [
  { id: 'brush', icon: '筆', label: 'Пензель', title: 'Рукописний пензель (Yuji Syuku)' },
  { id: 'school', icon: '教', label: 'Пропис', title: 'Шкільний пропис (Klee One / 教科書体)' },
  { id: 'pen', icon: '✎︎', label: 'Ручка', title: 'Рукописна ручка (Zen Kurenaido)' },
  { id: 'print', icon: '印', label: 'Друк', title: 'Друкарський шрифт (Noto Sans JP)' },
];

const STORAGE_KEY = 'kotoba_glyph_style';
const DEFAULT_STYLE = 'brush';
const IDS = GLYPH_STYLES.map(s => s.id);

function readStored() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return IDS.includes(v) ? v : DEFAULT_STYLE;
  } catch {
    return DEFAULT_STYLE;
  }
}

let current = readStored();
const listeners = new Set();

function apply(style) {
  if (typeof document !== 'undefined') document.documentElement.dataset.jpStyle = style;
}
apply(current);

export function setGlyphStyle(style) {
  if (!IDS.includes(style) || style === current) return;
  current = style;
  apply(style);
  try { localStorage.setItem(STORAGE_KEY, style); } catch { /* storage unavailable */ }
  listeners.forEach(l => l());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useGlyphStyle() {
  const style = useSyncExternalStore(subscribe, () => current);
  return [style, setGlyphStyle];
}
