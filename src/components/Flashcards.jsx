import { useState, useEffect, useCallback, useRef } from 'react';
import { speakJapanese, getDisplayJp, hasKanjiDistinction, shuffle } from '../utils/helpers';
import { useTranslation } from '../utils/i18n';

export default function Flashcards({ words, isKanjiMode, onToggleStar, onToggleMastered, showToast }) {
  const [deck, setDeck] = useState([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [frontIsJp, setFrontIsJp] = useState(true);
  const touchRef = useRef({ startX: 0, startY: 0 });
  const t = useTranslation();

  const prevWordsRef = useRef(words);

  useEffect(() => {
    const prevIds = prevWordsRef.current.map(w => w.id).sort().join(',');
    const newIds = words.map(w => w.id).sort().join(',');
    
    if (prevIds !== newIds) {
      setDeck(words);
      setIndex(0);
      setFlipped(false);
    } else {
      setDeck(prevDeck => prevDeck.map(w => words.find(newW => newW.id === w.id) || w));
    }
    prevWordsRef.current = words;
  }, [words]);

  const total = deck.length;
  const item = total > 0 ? deck[Math.min(index, total - 1)] : null;

  const flip = useCallback(() => setFlipped(f => !f), []);

  const navigate = useCallback((delta) => {
    setFlipped(false);
    setIndex(prev => (prev + delta + total) % total);
  }, [total]);

  const handleShuffle = () => {
    setDeck(shuffle(words));
    setIndex(0);
    setFlipped(false);
    showToast(t('shuffledToast'));
  };

  // Keyboard
  useEffect(() => {
    const handler = (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
      if (e.code === 'Space') { e.preventDefault(); flip(); }
      else if (e.code === 'ArrowRight') { e.preventDefault(); navigate(1); }
      else if (e.code === 'ArrowLeft') { e.preventDefault(); navigate(-1); }
      else if (e.code === 'KeyK') { e.preventDefault(); item && speakJapanese(item.kana); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [flip, navigate, item]);

  // Touch swipe
  const onTouchStart = (e) => {
    touchRef.current.startX = e.changedTouches[0].screenX;
    touchRef.current.startY = e.changedTouches[0].screenY;
  };
  const onTouchEnd = (e) => {
    const dx = e.changedTouches[0].screenX - touchRef.current.startX;
    const dy = e.changedTouches[0].screenY - touchRef.current.startY;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      dx < 0 ? navigate(1) : navigate(-1);
    }
  };

  if (!item) {
    return (
      <div className="card-empty">
        <p className="card-empty__title">{t('emptyFilterTitle')}</p>
        <p className="card-empty__sub">{t('emptyFilterSub')}</p>
      </div>
    );
  }

  const displayJp = getDisplayJp(item, isKanjiMode);
  const kanjiDiff = hasKanjiDistinction(item, isKanjiMode);
  const pct = Math.round(((index + 1) / total) * 100);
  const lessonTitle = item.lesson === 'custom' ? 'Власне слово' : `Урок ${item.lesson}`;

  return (
    <div className="flashcards">
      {/* Top bar */}
      <div className="flashcards__topbar">
        <span>{t('wordCounter', index + 1, total)}</span>
        <div className="flashcards__actions">
          <button onClick={() => setFrontIsJp(p => !p)} className="flashcards__action-btn">
            ⇄ {frontIsJp ? t('jpFirst') : t('ukFirst')}
          </button>
          <span className="flashcards__dot">•</span>
          <button onClick={handleShuffle} className="flashcards__action-btn">
            ↻ {t('shuffle')}
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="progress-bar">
        <div className="progress-bar__fill" style={{ width: `${pct}%` }} />
      </div>

      {/* Card */}
      <div
        className="flashcard-zone"
        onClick={flip}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className={`flashcard-inner ${flipped ? 'flashcard-inner--flipped' : ''}`}>
          {/* FRONT */}
          <div className="flashcard-face flashcard-face--front">
            <div className="flashcard-face__top">
              <span className="flashcard__badge">{item.lesson === 'custom' ? t('customWord') : t('lessonTitle', item.lesson)}</span>
              <div className="flashcard__top-btns">
                <button onClick={(e) => { e.stopPropagation(); speakJapanese(item.kana); }}
                  className="icon-btn" title={t('pronunciation')}>🔊</button>
                <button onClick={(e) => { e.stopPropagation(); onToggleStar(item.id); }}
                  className={`icon-btn ${item.starred ? 'icon-btn--starred' : ''}`}
                  title={t('addFavorite')}>★</button>
              </div>
            </div>
            <div className="flashcard-face__center">
              <div className="flashcard__main-text font-jp">
                {frontIsJp ? displayJp : item.translation}
              </div>
              <div className="flashcard__sub-text">
                {frontIsJp
                  ? (kanjiDiff ? `[${item.kana}] • ${item.transcription}` : item.transcription)
                  : t('jpEqOnBack')}
              </div>
            </div>
            <div className="flashcard__hint">
              <span className="show-mobile">{t('tapFlip')}</span>
              <span className="show-desktop">{t('clickFlip')} <kbd>{t('spacebar')}</kbd></span>
            </div>
          </div>

          {/* BACK */}
          <div className="flashcard-face flashcard-face--back">
            <div className="flashcard-face__top">
              <span className="flashcard__badge flashcard__badge--back">{t('translation')}</span>
              <button onClick={(e) => { e.stopPropagation(); speakJapanese(item.kana); }}
                className="icon-btn icon-btn--light">🔊</button>
            </div>
            <div className="flashcard-face__center">
              <div className="flashcard__back-main">
                {frontIsJp ? item.translation : displayJp}
              </div>
              <div className="flashcard__back-detail font-jp">
                {frontIsJp ? displayJp : (kanjiDiff ? item.kana : '')}
              </div>
              <div className="flashcard__back-transcription">
                {item.transcription} {item.romaji ? `(${item.romaji})` : ''}
              </div>
            </div>
            <div className="flashcard__hint flashcard__hint--back">
              {t('clickSwipeBack')}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flashcard-controls">
        <button onClick={() => { onToggleMastered(item.id, false); navigate(1); }}
          className="btn btn--warn">
          {t('repeatAgain')}
        </button>

        <div className="flashcard-controls__nav">
          <button onClick={() => navigate(-1)} className="btn btn--nav" title={t('prev')}>←</button>
          <button onClick={flip} className="btn btn--dark">{t('flip')}</button>
          <button onClick={() => navigate(1)} className="btn btn--nav" title={t('next')}>→</button>
        </div>

        <button onClick={() => { onToggleMastered(item.id, true); navigate(1); }}
          className="btn btn--success">
          {t('iKnowThis')}
        </button>
      </div>

      <p className="flashcard-keyboard-hint">
        {t('kbHint')} <kbd>←</kbd> <kbd>→</kbd> {t('kbArrows')}, <kbd>{t('spacebar')}</kbd> {t('kbFlip')}
      </p>
    </div>
  );
}
