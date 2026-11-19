import { useEffect, useState } from 'react';
import { speakJapanese } from '../utils/helpers';
import WritingPad from './WritingPad';
import GlyphCompare from './GlyphCompare';

// Writing practice for one kana or a whole row: the characters go one by one, each in the
// 4-cell copybook pad (trace → faint hint → from memory) with the stroke-order animation.

export default function KanaPractice({ items, startIndex = 0, title, onBack }) {
  const [index, setIndex] = useState(startIndex);
  const item = items[index];
  const go = (delta) => setIndex(i => Math.min(items.length - 1, Math.max(0, i + delta)));

  useEffect(() => {
    const onKey = (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
      if (e.key === 'Escape') onBack();
      if (e.key === 'ArrowLeft') setIndex(i => Math.max(0, i - 1));
      if (e.key === 'ArrowRight') setIndex(i => Math.min(items.length - 1, i + 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [items.length, onBack]);

  return (
    <section className="kana-practice">
      <header className="kana-practice__head">
        <button className="btn btn--ghost btn--sm" onClick={onBack}>← До таблиці</button>
        <h3 className="kana-practice__title">✍ Пропис: <span className="font-jp" lang="ja">{title}</span></h3>
        <span className="kana-practice__count">{index + 1} / {items.length}</span>
      </header>

      {items.length > 1 && (
        <nav className="kana-practice__chips" aria-label="Символи рядка">
          {items.map((it, i) => (
            <button key={it.id} className={`kana-practice__chip font-jp ${i === index ? 'kana-practice__chip--active' : ''}`}
              lang="ja" onClick={() => setIndex(i)}>{it.char}</button>
          ))}
        </nav>
      )}

      <div className="kana-practice__info">
        <button className="kana-card__speak" onClick={() => speakJapanese(item.char)} title="Прослухати">
          <span className="kana-practice__glyph font-jp jp-glyph" lang="ja">{item.char}</span>
          <span className="kana-card__romaji">{item.r}</span>
          <span className="kana-card__uk">[{item.uk}]</span>
          <span aria-hidden="true">🔊</span>
        </button>
        {item.hint && <p className="kana-card__hint">🗣 {item.hint}</p>}
      </div>

      <div className="kana-practice__pad">
        <WritingPad key={item.id} text={item.char} />
      </div>

      <GlyphCompare char={item.char} always />

      <footer className="kana-practice__nav">
        <button className="btn btn--ghost" onClick={() => go(-1)} disabled={index === 0}>‹ Попередній</button>
        <button className="btn btn--dark" onClick={() => go(1)} disabled={index === items.length - 1}>Наступний ›</button>
      </footer>
    </section>
  );
}
