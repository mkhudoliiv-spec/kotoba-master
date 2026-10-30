import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { speakJapanese } from '../utils/helpers';
import { readingKana } from '../hooks/useJlpt';
import { Rich } from './Grammar';

const MAX_DIFFICULTY = 7;

function Readings({ label, list }) {
  return (
    <div className="jk-readings__row">
      <span className="jk-readings__label">{label}:</span>
      {list.length === 0 ? <span className="jk-readings__none">—</span> : (
        <ul className="jk-readings__list">
          {list.map(r => (
            <li key={r}>
              <button className="jk-readings__item font-jp" onClick={() => speakJapanese(readingKana(r).replace(/[()]/g, ''))}
                title="Прослухати">{r}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function JlptKanjiCard({ kanji: k, onClose, onPrev, onNext, onToggleMastered, onToggleStar, onPrint }) {
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

  const stars = '★'.repeat(k.difficulty) + '☆'.repeat(MAX_DIFFICULTY - k.difficulty);
  const firstReading = readingKana(k.kunYomi[0] || k.onYomi[0] || '').replace(/[()]/g, '');

  // Portal: animated (transformed) ancestors would otherwise trap the fixed overlay inside them
  return createPortal(
    <div className="jk-overlay jlpt-theme" onClick={onClose}>
      <article className="jk-card" onClick={e => e.stopPropagation()} role="dialog" aria-label={`Канджі ${k.kanji}`}>
        <header className="jk-card__head">
          <span className="jk-card__title">Картка канджі · JLPT {k.level}</span>
          <div className="jk-card__head-btns">
            <button className="jk-icon-btn" onClick={() => speakJapanese(firstReading)} title="Прослухати">🔊</button>
            <button className={`jk-icon-btn ${k.starred ? 'jk-icon-btn--starred' : ''}`}
              onClick={() => onToggleStar(k.id)} title="В обрані">★</button>
            <button className="jk-icon-btn" onClick={onPrint} title="Друкувати прописи">🖨️</button>
            <button className="jk-icon-btn" onClick={onClose} title="Закрити (Esc)">✕</button>
          </div>
        </header>

        <div className="jk-card__glyph-wrap">
          {onPrev && <button className="jk-nav jk-nav--prev" onClick={onPrev} title="Попередній (←)">‹</button>}
          <div className="jk-card__glyph font-jp">{k.kanji}</div>
          {onNext && <button className="jk-nav jk-nav--next" onClick={onNext} title="Наступний (→)">›</button>}
        </div>
        <div className="jk-card__radicals">
          <span>Рисок: <strong>{k.strokes}</strong></span>
          {k.radicals.length > 0 && <span className="jk-card__dot">•</span>}
          {k.radicals.map(r => (
            <span key={r.char + r.nameUk} className="jk-radical" title={`${r.strokes} рис.`}>
              <span className="font-jp">{r.char}</span> {r.nameUk}
            </span>
          ))}
        </div>

        <section className="jk-split">
          <div className="jk-split__meaning">
            <span className="jk-label">Значення</span>
            <div className="jk-split__meaning-text">{k.meaningUk}</div>
          </div>
          <div className="jk-split__readings jk-readings">
            <span className="jk-label">Читання</span>
            <Readings label="On" list={k.onYomi} />
            <Readings label="Kun" list={k.kunYomi} />
          </div>
        </section>

        <section className="jk-why">
          <h3 className="jk-section-title">Чому так читається і де використовується</h3>
          <div className="jk-why__item jk-why__item--kun">
            <div className="jk-why__name">Kun-yomi <span className="font-jp">訓読み</span> — японське читання</div>
            <p><Rich text={k.readingLogic.kunExplanation} /></p>
          </div>
          <div className="jk-why__item jk-why__item--on">
            <div className="jk-why__name">On-yomi <span className="font-jp">音読み</span> — китайське читання</div>
            <p><Rich text={k.readingLogic.onExplanation} /></p>
          </div>
          {k.readingLogic.exceptions && (
            <div className="jk-why__item jk-why__item--exc">
              <div className="jk-why__name">Винятки та нюанси</div>
              <p><Rich text={k.readingLogic.exceptions} /></p>
            </div>
          )}
        </section>

        <section className="jk-vocab">
          <h3 className="jk-section-title">Vocabulary (Словник вживання)</h3>
          <ul className="jk-vocab__list">
            {k.vocabulary.map(v => (
              <li key={v.word + v.kana} className="jk-vocab__item">
                <span className={`jk-badge jk-badge--${v.type.toLowerCase()}`}>{v.type}</span>
                <button className="jk-vocab__speak" onClick={() => speakJapanese(v.kana)} title="Прослухати">🔊</button>
                <span className="jk-vocab__text">
                  <span className="jk-vocab__word font-jp">{v.word}</span>
                  {' '}<span className="jk-vocab__reading">(<span className="font-jp">{v.kana}</span> - {v.romaji})</span>
                  {' '}= <span className="jk-vocab__meaning">{v.meaningUk}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <footer className="jk-card__foot">
          <span className="jk-card__pos">JLPT {k.level} - {k.index}/{k.totalInLevel}</span>
          <div className="jk-card__foot-right">
            <span className="jk-card__difficulty" title={`${k.difficulty} з ${MAX_DIFFICULTY}`}>
              Складність: <span className="jk-stars">{stars}</span>
            </span>
            <button className={`btn btn--sm ${k.mastered ? 'btn--success' : 'btn--dark'}`}
              onClick={() => onToggleMastered(k.id)}>
              {k.mastered ? '✓ Вивчено' : 'Вивчено'}
            </button>
          </div>
        </footer>
      </article>
    </div>,
    document.body
  );
}
