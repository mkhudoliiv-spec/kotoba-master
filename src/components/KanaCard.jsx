import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { speakJapanese } from '../utils/helpers';
import GlyphStyleSwitch from './GlyphStyleSwitch';
import GlyphCompare from './GlyphCompare';
import StrokeOrder from './StrokeOrder';

/** A short vocabulary word that starts with this kana (prefers numbered lessons and short words). */
function findExample(words, char) {
  const found = words.filter(w => w.kana && w.lesson !== 'custom' && w.kana.startsWith(char) && w.translation);
  if (!found.length) return null;
  return found.find(w => w.kana.length <= 5) || found[0];
}

export default function KanaCard({ entry, script, words, onClose, onPrev, onNext, onSwitchScript, onPractice }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && onPrev) onPrev();
      if (e.key === 'ArrowRight' && onNext) onNext();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose, onPrev, onNext]);

  const example = useMemo(() => findExample(words, entry.char), [words, entry.char]);
  const chars = [...entry.char];
  const scriptName = script === 'kata' ? 'Катакана' : 'Хірагана';
  const pairName = script === 'kata' ? 'хірагана' : 'катакана';

  // Portal: animated (transformed) ancestors would otherwise trap the fixed overlay inside them
  return createPortal(
    <div className="jk-overlay" onClick={onClose}>
      <article className="jk-card kana-card" onClick={e => e.stopPropagation()} role="dialog"
        aria-label={`${scriptName} ${entry.char}`}>
        <header className="jk-card__head">
          <span className="jk-card__title">{scriptName}</span>
          <div className="jk-card__head-btns">
            <button className="jk-icon-btn" onClick={() => speakJapanese(entry.char)} title="Прослухати">🔊</button>
            <button className="jk-icon-btn" onClick={onPractice} title="Пропис">✍</button>
            <button className="jk-icon-btn" onClick={onClose} title="Закрити (Esc)">✕</button>
          </div>
        </header>

        <div className="jk-card__glyph-wrap">
          {onPrev && <button className="jk-nav jk-nav--prev" onClick={onPrev} title="Попередній (←)">‹</button>}
          <div className="jk-card__glyph font-jp jp-glyph" lang="ja">{entry.char}</div>
          {onNext && <button className="jk-nav jk-nav--next" onClick={onNext} title="Наступний (→)">›</button>}
        </div>

        <div className="kana-card__reading">
          <button className="kana-card__speak" onClick={() => speakJapanese(entry.char)} title="Прослухати">
            <span className="kana-card__romaji">{entry.r}</span>
            <span className="kana-card__uk">[{entry.uk}]</span>
            <span aria-hidden="true">🔊</span>
          </button>
          <button className="kana-card__pair" onClick={onSwitchScript} title={`Відкрити в абетці ${pairName}`}>
            {pairName}: <span className="font-jp" lang="ja">{entry.pair}</span> ⇄
          </button>
        </div>

        {entry.hint && <p className="kana-card__hint">🗣 {entry.hint}</p>}

        <div className="jk-card__glyph-switch"><GlyphStyleSwitch /></div>

        {chars.length === 1 ? (
          <StrokeOrder char={entry.char} autoPlay />
        ) : (
          <div className="kana-card__strokes">
            {chars.map((c, i) => <StrokeOrder key={c} char={c} autoPlay stack credit={i === chars.length - 1} />)}
          </div>
        )}

        <GlyphCompare char={entry.char} always />

        {example && (
          <section className="kana-card__example">
            <span className="jk-label">Приклад слова</span>
            <button className="kana-card__example-word" onClick={() => speakJapanese(example.kana)} title="Прослухати">
              <span className="font-jp" lang="ja">{example.kanji || example.kana}</span>
              {example.kanji && <span className="font-jp kana-card__example-kana" lang="ja">{example.kana}</span>}
              <span className="kana-card__example-tr">[{example.transcription}] — {example.translation}</span>
              <span aria-hidden="true">🔊</span>
            </button>
          </section>
        )}

        <footer className="jk-card__foot">
          <span className="jk-card__pos">
            {chars.length > 1 && <>Сполучення: <span className="font-jp">{chars[0]}</span> + маленька <span className="font-jp">{chars[1]}</span></>}
          </span>
          <button className="btn btn--dark btn--sm" onClick={onPractice}>✍ Пропис</button>
        </footer>
      </article>
    </div>,
    document.body
  );
}
