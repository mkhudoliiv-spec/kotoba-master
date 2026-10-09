import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation, setLanguage } from './utils/i18n';
import { useVocabulary } from './hooks/useVocabulary';
import { getLessonLabel } from './utils/helpers';
import Flashcards from './components/Flashcards';
import Quiz from './components/Quiz';
import WriteMode from './components/WriteMode';
import MatchGame from './components/MatchGame';
import Dictionary from './components/Dictionary';
import Grammar from './components/Grammar';
import AddWordModal from './components/AddWordModal';
import Toast from './components/Toast';

const MODES = [
  { id: 'cards', label: { uk: 'Картки', en: 'Cards' }, icon: '📇' },
  { id: 'quiz', label: { uk: 'Тест', en: 'Quiz' }, icon: '✅' },
  { id: 'write', label: { uk: 'Письмо', en: 'Write' }, icon: '✏️' },
  { id: 'match', label: { uk: 'Пари', en: 'Match' }, icon: '🧩' },
  { id: 'list', label: { uk: 'Словник', en: 'Dictionary' }, icon: '📖' },
  { id: 'grammar', label: { uk: 'Граматика', en: 'Grammar' }, icon: '📚' },
];

export default function App() {
  const { words, loading, addWord, deleteWord, toggleStar, toggleMastered, importWords } = useVocabulary();
  const [mode, setMode] = useState('cards');
  const [grammarKey, setGrammarKey] = useState(0);
  const [lessonFilter, setLessonFilter] = useState('all');
  const [starFilter, setStarFilter] = useState(false);
  const [isKanjiMode, setIsKanjiMode] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '' });
  const t = useTranslation();

  const scrollRef = useRef(null);

  const showToast = useCallback((msg) => setToast({ visible: true, message: msg }), []);
  const hideToast = useCallback(() => setToast(t => ({ ...t, visible: false })), []);

  useEffect(() => {
    if (loading) return;
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [loading, mode]);

  useEffect(() => {
    const handler = (e) => importWords(e.detail);
    window.addEventListener('kotoba-import', handler);
    return () => window.removeEventListener('kotoba-import', handler);
  }, [importWords]);

  const filtered = words.filter(w => {
    const matchLesson = lessonFilter === 'all'
      ? true
      : String(w.lesson) === String(lessonFilter);
    const matchStar = starFilter ? w.starred : true;
    return matchLesson && matchStar;
  });

  const masteredCount = filtered.filter(w => w.mastered).length;
  const starredCount = words.filter(w => w.starred).length;

  const lessonKeys = [...new Set(words.map(w => String(w.lesson)))].sort((a, b) => {
    if (a === 'custom') return 1;
    if (b === 'custom') return -1;
    const numA = Number(a);
    const numB = Number(b);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    if (isNaN(numA) && !isNaN(numB)) return 1;
    if (!isNaN(numA) && isNaN(numB)) return -1;
    return a.localeCompare(b);
  });

  const handleAddWord = (newWord) => {
    addWord(newWord);
    showToast(t('wordAddedToast', newWord.kana));
  };

  const handleDelete = (id) => {
    deleteWord(id);
    showToast(t('wordDeletedToast'));
  };

  const selectMode = (id) => {
    // Re-clicking "Граматика" returns to the topic list
    if (id === 'grammar') setGrammarKey(k => k + 1);
    setMode(id);
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-screen__logo font-jp">語</div>
        <p>{t('loading')}</p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header__inner">
          <div className="header__logo" onClick={() => setMode('cards')}>
            <div className="header__logo-icon font-jp">語</div>
            <h1 className="header__title">Kotoba Master</h1>
          </div>

          <nav className="header__nav">
            {MODES.map(m => (
              <button key={m.id}
                className={`header__nav-btn ${mode === m.id ? 'header__nav-btn--active' : ''}`}
                onClick={() => selectMode(m.id)}>
                <span className="header__nav-icon">{m.icon}</span>
                {m.label[localStorage.getItem('kotoba_lang') || 'uk'] || m.label['uk']}
                {m.id === 'list' && <span className="header__nav-badge">({words.length})</span>}
              </button>
            ))}
          </nav>

          <div className="header__actions">
            <button onClick={() => setIsKanjiMode(k => !k)} className="header__toggle-btn">
              <span className="font-jp" style={{ color: 'var(--color-accent)' }}>漢</span>
              <span className="show-desktop">{t('kanjiMode', isKanjiMode)}</span>
            </button>
            <button onClick={() => setModalOpen(true)} className="btn btn--primary btn--sm">
              + <span className="show-desktop">{t('addWordHead')}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mobile-nav">
        {MODES.map(m => (
          <button key={m.id}
            className={`mobile-nav__btn ${mode === m.id ? 'mobile-nav__btn--active' : ''}`}
            onClick={() => selectMode(m.id)}>
            <span className="mobile-nav__icon">{m.icon}</span>
            <span className="mobile-nav__label">{m.label[localStorage.getItem('kotoba_lang') || 'uk'] || m.label['uk']}</span>
          </button>
        ))}
      </div>

      <main className="main">
        {mode !== 'grammar' && (
        <div className="filter-bar">
          <div className="filter-bar__lessons" ref={scrollRef}>
            <span className="filter-bar__label">{t('dictThLesson')}:</span>
            <button className={`lesson-chip ${lessonFilter === 'all' ? 'lesson-chip--active' : ''}`}
              onClick={() => setLessonFilter('all')}>{t('allLessons', words.length)}</button>
            {lessonKeys.map(key => (
              <button key={key}
                className={`lesson-chip ${lessonFilter === key ? 'lesson-chip--active' : ''}`}
                onClick={() => setLessonFilter(key)}>{getLessonLabel(key)}</button>
            ))}
          </div>
          <div className="filter-bar__right">
            <div className="filter-bar__stats">
              <span className="filter-bar__dot" />
              {t('learned')} <strong>{masteredCount}</strong>
              <span className="filter-bar__sep">/</span>
              <strong>{filtered.length}</strong>
            </div>
            <button className={`filter-bar__star-btn ${starFilter ? 'filter-bar__star-btn--active' : ''}`}
              onClick={() => setStarFilter(s => !s)}>{t('starsCount', starredCount)}</button>
          </div>
        </div>
        )}

        <div className="mode-container">
          {mode === 'cards' && <Flashcards words={filtered} isKanjiMode={isKanjiMode} onToggleStar={toggleStar} onToggleMastered={toggleMastered} showToast={showToast} />}
          {mode === 'quiz' && <Quiz words={filtered} allWords={words} isKanjiMode={isKanjiMode} />}
          {mode === 'write' && <WriteMode words={filtered} allWords={words} />}
          {mode === 'match' && <MatchGame words={filtered} allWords={words} isKanjiMode={isKanjiMode} />}
          {mode === 'grammar' && <Grammar key={grammarKey} />}
          {mode === 'list' && <Dictionary words={filtered} isKanjiMode={isKanjiMode} onToggleStar={toggleStar} onDelete={handleDelete} onOpenAdd={() => setModalOpen(true)} showToast={showToast} />}
        </div>
      </main>

      <AddWordModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSave={handleAddWord} lessonKeys={lessonKeys} />
      <Toast message={toast.message} visible={toast.visible} onHide={hideToast} />
    </div>
  );
}
