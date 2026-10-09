import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { speakJapanese, getDisplayJp, hasKanjiDistinction, shuffle } from '../utils/helpers';
import { buildDeck, getSrsCounts } from '../utils/srs';
import { useTranslation } from '../utils/i18n';

const DIRECTIONS = ['jp', 'uk', 'mix'];

function hashStr(s) {
  let h = 0;
  const str = String(s);
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function readStored(key, allowed, fallback) {
  const v = localStorage.getItem(key);
  return allowed.includes(v) ? v : fallback;
}

export default function Flashcards({ words, isKanjiMode, onToggleStar, onReview, showToast }) {
  const [studyMode, setStudyMode] = useState(() => readStored('kotoba_study_mode', ['all', 'smart', 'hard'], 'all'));
  const [deck, setDeck] = useState(() => buildDeck(words, readStored('kotoba_study_mode', ['all', 'smart', 'hard'], 'all')));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [direction, setDirection] = useState(() => readStored('kotoba_card_direction', DIRECTIONS, 'jp'));
  const touchRef = useRef({ startX: 0, startY: 0 });
  const t = useTranslation();

  const prevWordsRef = useRef(words);
  const counts = useMemo(() => getSrsCounts(words), [words]);

  useEffect(() => {
    const prevIds = prevWordsRef.current.map(w => w.id).sort().join(',');
    const newIds = words.map(w => w.id).sort().join(',');
    
    if (prevIds !== newIds) {
      setDeck(buildDeck(words, studyMode));
      setIndex(0);
      setFlipped(false);
    } else {
      setDeck(prevDeck => prevDeck.map(w => words.find(newW => newW.id === w.id) || w));
    }
    prevWordsRef.current = words;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words]);

  const total = deck.length;
  const item = total > 0 ? deck[Math.min(index, total - 1)] : null;

  const flip = useCallback(() => setFlipped(f => !f), []);

  const navigate = useCallback((delta) => {
    setFlipped(false);
    setIndex(prev => (prev + delta + total) % total);
  }, [total]);

  const changeStudyMode = (m) => {
    localStorage.setItem('kotoba_study_mode', m);
    setStudyMode(m);
    setDeck(buildDeck(words, m));
    setIndex(0);
    setFlipped(false);
  };

  const cycleDirection = () => {
    const next = DIRECTIONS[(DIRECTIONS.indexOf(direction) + 1) % DIRECTIONS.length];
    localStorage.setItem('kotoba_card_direction', next);
    setDirection(next);
  };

  const handleShuffle = () => {
    setDeck(shuffle(deck));
    setIndex(0);
    setFlipped(false);
    showToast(t('shuffledToast'));
  };

  // "Know" / "Don't know": records SRS result. In smart/hard sessions the deck acts as a queue:
  // known cards leave it, unknown cards come back a few cards later.
  const answer = (known) => {
    if (!item) return;
    onReview(item.id, known);
    if (studyMode === 'all') { navigate(1); return; }
    const cur = Math.min(index, total - 1);
    setFlipped(false);
    setDeck(prev => {
      const pos = prev.findIndex(w => w.id === item.id);
      if (pos === -1) return prev;
      const rest = prev.filter((_, i) => i !== pos);
      if (!known) rest.splice(Math.min(pos + 3, rest.length), 0, item);
      return rest;
    });
    const newLen = known ? total - 1 : total;
    setIndex(cur >= newLen ? 0 : cur);
  };
  const answerRef = useRef(answer);
  answerRef.current = answer;

  // Keyboard
  useEffect(() => {
    const handler = (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
      if (e.code === 'Space') { e.preventDefault(); flip(); }
      else if (e.code === 'ArrowRight') { e.preventDefault(); navigate(1); }
      else if (e.code === 'ArrowLeft') { e.preventDefault(); navigate(-1); }
      else if (e.code === 'KeyK') { e.preventDefault(); item && speakJapanese(item.kana); }
      else if (e.code === 'Digit1') { e.preventDefault(); answerRef.current(false); }
      else if (e.code === 'Digit2') { e.preventDefault(); answerRef.current(true); }
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

  const studyTabs = (
    <div className="study-tabs">
      <button className={`study-tab ${studyMode === 'all' ? 'study-tab--active' : ''}`}
        onClick={() => changeStudyMode('all')}>{t('studyAll')}</button>
      <button className={`study-tab ${studyMode === 'smart' ? 'study-tab--active' : ''}`}
        onClick={() => changeStudyMode('smart')}>{t('studySmart', counts.smart)}</button>
      <button className={`study-tab ${studyMode === 'hard' ? 'study-tab--active' : ''}`}
        onClick={() => changeStudyMode('hard')}>{t('studyHard', counts.hard)}</button>
    </div>
  );

  if (!item) {
    let title = t('emptyFilterTitle');
    let sub = t('emptyFilterSub');
    if (words.length > 0 && studyMode === 'smart') { title = t('smartDoneTitle'); sub = t('smartDoneSub'); }
    if (words.length > 0 && studyMode === 'hard') { title = t('hardDoneTitle'); sub = t('hardDoneSub'); }
    return (
      <div className="flashcards">
        {studyTabs}
        <div className="card-empty">
          <p className="card-empty__title">{title}</p>
          <p className="card-empty__sub">{sub}</p>
        </div>
      </div>
    );
  }

  const frontIsJp = direction === 'mix'
    ? (hashStr(item.id) + (item.srs?.reviews || 0)) % 2 === 0
    : direction === 'jp';
  const dirLabel = direction === 'jp' ? t('jpFirst') : direction === 'uk' ? t('ukFirst') : t('mixFirst');

  const displayJp = getDisplayJp(item, isKanjiMode);
  const kanjiDiff = hasKanjiDistinction(item, isKanjiMode);
  const pct = Math.round(((Math.min(index, total - 1) + 1) / total) * 100);

  return (
    <div className="flashcards">
      {studyTabs}

      {/* Top bar */}
      <div className="flashcards__topbar">
        <span>{t('wordCounter', Math.min(index, total - 1) + 1, total)}</span>
        <div className="flashcards__actions">
          <button onClick={cycleDirection} className="flashcards__action-btn">
            ⇄ {dirLabel}
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
        <button onClick={() => answer(false)}
          className="btn btn--warn" title="1">
          {t('repeatAgain')}
        </button>

        <div className="flashcard-controls__nav">
          <button onClick={() => navigate(-1)} className="btn btn--nav" title={t('prev')}>←</button>
          <button onClick={flip} className="btn btn--dark">{t('flip')}</button>
          <button onClick={() => navigate(1)} className="btn btn--nav" title={t('next')}>→</button>
        </div>

        <button onClick={() => answer(true)}
          className="btn btn--success" title="2">
          {t('iKnowThis')}
        </button>
      </div>

      <p className="flashcard-keyboard-hint">
        {t('kbHint')} <kbd>←</kbd> <kbd>→</kbd> {t('kbArrows')}, <kbd>{t('spacebar')}</kbd> {t('kbFlip')}, <kbd>1</kbd> / <kbd>2</kbd> — {t('repeatAgain')} / {t('iKnowThis')}
      </p>
      <p className="flashcard-srs-info">{t('srsInfo')}</p>
    </div>
  );
}
