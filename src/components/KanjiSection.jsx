import { useState, useEffect, useMemo, useCallback } from 'react';
import { useKanji, kanjiToTrainerItem, readingKana } from '../hooks/useKanji';
import KanjiPrintWorksheet from './KanjiPrintWorksheet';
import { Block } from './Grammar';
import KanjiCard from './KanjiCard';
import Flashcards from './Flashcards';
import Quiz from './Quiz';
import WriteMode from './WriteMode';
import MatchGame from './MatchGame';

// Key predates the Kanji section (it used to be the JLPT section) — kept so the choice survives
const TAB_KEY = 'kotoba_jlpt_tab';

const TABS = [
  { id: 'kanji', label: 'Канджі (Картки)', icon: '漢' },
  { id: 'rules', label: 'Правила читання Канджі', icon: '📐' },
];

const TRAIN_MODES = [
  { id: 'cards', label: 'Картки', icon: '📇', min: 1, hint: 'Розумне повторення (SRS)' },
  { id: 'quiz', label: 'Тест', icon: '✅', min: 4, hint: 'Обери переклад' },
  { id: 'write', label: 'Письмо', icon: '✏️', min: 1, hint: 'Напиши читання японською' },
  { id: 'match', label: 'Пари', icon: '🧩', min: 6, hint: 'Знайди пари на час' },
];

const TRAIN_SOURCES = [
  { id: 'all', label: 'Усі канджі' },
  { id: 'new', label: 'Не вивчені' },
  { id: 'starred', label: '★ Обрані' },
];

const STATUS_FILTERS = [
  { id: 'all', label: 'Усі' },
  { id: 'new', label: 'Не вивчені' },
  { id: 'mastered', label: '✓ Вивчені' },
  { id: 'starred', label: '★ Обрані' },
];

const readStored = (key, allowed, fallback) => {
  const v = localStorage.getItem(key);
  return allowed.includes(v) ? v : fallback;
};

const matchStatus = (item, status) =>
  status === 'all' || (status === 'new' && !item.mastered) ||
  (status === 'mastered' && item.mastered) || (status === 'starred' && item.starred);

function StatusChips({ value, onChange, items }) {
  return STATUS_FILTERS.map(f => (
    <button key={f.id} className={`lesson-chip ${value === f.id ? 'lesson-chip--active' : ''}`}
      onClick={() => onChange(f.id)}>
      {f.label} ({items.filter(i => matchStatus(i, f.id)).length})
    </button>
  ));
}

/* ── Tab: kanji grid ── */

function KanjiTab({ kanji, onToggleMastered, onToggleStar }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [openId, setOpenId] = useState(null);
  const [printIds, setPrintIds] = useState(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return kanji.filter(k => {
      if (!matchStatus(k, status)) return false;
      if (!q) return true;
      return [k.kanji, k.meaningUk, ...k.onYomi, ...k.kunYomi, ...k.vocabulary.map(v => `${v.word} ${v.kana} ${v.meaningUk}`)]
        .some(s => s.toLowerCase().includes(q));
    });
  }, [kanji, query, status]);

  const openIdx = visible.findIndex(k => k.id === openId);
  const opened = openIdx >= 0 ? visible[openIdx] : kanji.find(k => k.id === openId);
  const close = useCallback(() => setOpenId(null), []);
  const prev = openIdx > 0 ? () => setOpenId(visible[openIdx - 1].id) : null;
  const next = openIdx >= 0 && openIdx < visible.length - 1 ? () => setOpenId(visible[openIdx + 1].id) : null;

  return (
    <>
      <div className="g-toolbar">
        <div className="jlpt-toolbar__row">
          <input className="g-search" type="search" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Пошук: 男, чоловік, おとこ, dan…" />
          <button className="btn btn--primary btn--sm jlpt-print-btn" disabled={!visible.length}
            onClick={() => setPrintIds(visible.map(k => k.id))}
            title="Обрати канджі та надрукувати прописи на A4">🖨️ Друкувати прописи Канджі</button>
        </div>
        <div className="g-cats"><StatusChips value={status} onChange={setStatus} items={kanji} /></div>
      </div>

      {visible.length === 0 ? (
        <div className="g-state"><p>Нічого не знайдено. Спробуй інший запит.</p></div>
      ) : (
        <div className="jlpt-kanji-grid">
          {visible.map((k, i) => (
            <button key={k.id} className={`jlpt-kanji-tile ${k.mastered ? 'jlpt-kanji-tile--mastered' : ''}`}
              style={{ animationDelay: `${Math.min(i, 30) * 20}ms` }} onClick={() => setOpenId(k.id)}>
              <span className="jlpt-kanji-tile__num">{k.index}</span>
              {k.starred && <span className="jlpt-kanji-tile__star">★</span>}
              {k.mastered && <span className="jlpt-kanji-tile__check">✓</span>}
              <span className="jlpt-kanji-tile__glyph font-jp">{k.kanji}</span>
              <span className="jlpt-kanji-tile__meaning">{k.meaningUk}</span>
              <span className="jlpt-kanji-tile__reading font-jp">
                {[k.kunYomi[0], k.onYomi[0]].filter(Boolean).map(readingKana).join(' · ')}
              </span>
            </button>
          ))}
        </div>
      )}

      {opened && (
        <KanjiCard kanji={opened} onClose={close} onPrev={prev} onNext={next}
          onToggleMastered={onToggleMastered} onToggleStar={onToggleStar}
          onPrint={() => { setOpenId(null); setPrintIds([opened.id]); }} />
      )}

      {printIds && (
        <KanjiPrintWorksheet kanji={kanji} visible={visible} initialIds={printIds}
          onClose={() => setPrintIds(null)} />
      )}
    </>
  );
}

/* ── Tab: reading rules ── */

function RulesTab({ rules }) {
  const [openIds, setOpenIds] = useState(() => new Set(rules.slice(0, 1).map(r => r.id)));
  const toggle = (id) => setOpenIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return (
    <div className="jlpt-rules">
      {rules.map((r, i) => {
        const isOpen = openIds.has(r.id);
        return (
          <article key={r.id} className={`jlpt-rule ${isOpen ? 'jlpt-rule--open' : ''}`}
            style={{ '--cat': r.color || 'var(--color-accent)', animationDelay: `${i * 40}ms` }}>
            <button className="jlpt-rule__head" onClick={() => toggle(r.id)} aria-expanded={isOpen}>
              <span className="jlpt-rule__icon">{r.icon}</span>
              <span className="jlpt-rule__titles">
                <span className="jlpt-rule__jp font-jp">{r.jp}</span>
                <span className="jlpt-rule__title">{r.title}</span>
                <span className="jlpt-rule__summary">{r.summary}</span>
              </span>
              <span className="jlpt-rule__chevron">{isOpen ? '−' : '+'}</span>
            </button>
            {isOpen && (
              <div className="jlpt-rule__body">
                {r.blocks.map((b, bi) => <Block key={bi} block={b} />)}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

/* ── Training ── */

function TrainPicker({ pools, onStart, onClose }) {
  const [source, setSource] = useState('all');
  const pool = pools[source];

  return (
    <div className="jlpt-train-picker">
      <div className="jlpt-train-picker__head">
        <h3>🔥 Тренування канджі</h3>
        <button className="jk-icon-btn" onClick={onClose} title="Закрити">✕</button>
      </div>
      <div className="jlpt-train-picker__label">Що тренуємо</div>
      <div className="g-cats">
        {TRAIN_SOURCES.map(s => (
          <button key={s.id} className={`lesson-chip ${source === s.id ? 'lesson-chip--active' : ''}`}
            onClick={() => setSource(s.id)}>{s.label} ({pools[s.id].length})</button>
        ))}
      </div>
      <div className="jlpt-train-picker__label">Режим</div>
      <div className="jlpt-train-modes">
        {TRAIN_MODES.map(m => {
          const disabled = pool.length < m.min;
          return (
            <button key={m.id} className="jlpt-train-mode" disabled={disabled}
              onClick={() => onStart(m.id, source)}>
              <span className="jlpt-train-mode__icon">{m.icon}</span>
              <span className="jlpt-train-mode__label">{m.label}</span>
              <span className="jlpt-train-mode__hint">{disabled ? `Потрібно мінімум ${m.min}` : m.hint}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TrainView({ training, pools, isKanjiMode, onReview, onToggleStar, showToast, onBack }) {
  // Quiz / Write / Match restart whenever `words` changes, so they get a snapshot taken at start.
  // Flashcards need live items to show SRS updates, but keep the deck fixed to the snapshot ids
  // (the "new"/"starred" pools shrink as you study).
  const words = useMemo(() => {
    if (training.mode !== 'cards') return training.snapshot;
    const live = new Map(pools.all.map(i => [i.id, i]));
    return training.snapshot.map(i => live.get(i.id) || i);
  }, [training, pools]);
  const mode = TRAIN_MODES.find(m => m.id === training.mode);
  const source = TRAIN_SOURCES.find(s => s.id === training.source);

  return (
    <div className="jlpt-train">
      <div className="jlpt-train__bar">
        <button className="g-back" onClick={onBack}>← До канджі</button>
        <span className="jlpt-train__title">{mode.icon} {mode.label} · {source.label}</span>
      </div>
      <div className="jlpt-train__body">
        {training.mode === 'cards' && <Flashcards words={words} isKanjiMode={isKanjiMode} onToggleStar={onToggleStar} onReview={onReview} showToast={showToast} />}
        {training.mode === 'quiz' && <Quiz words={words} allWords={words} isKanjiMode={isKanjiMode} onAnswer={onReview} />}
        {training.mode === 'write' && <WriteMode words={words} allWords={words} onAnswer={onReview} />}
        {training.mode === 'match' && <MatchGame words={words} allWords={words} isKanjiMode={isKanjiMode} />}
      </div>
    </div>
  );
}

/* ── Main ── */

export default function KanjiSection({ isKanjiMode, showToast }) {
  const { kanji, rules, loading, error, toggleStar, toggleMastered, reviewItem } = useKanji();
  const [tab, setTab] = useState(() => readStored(TAB_KEY, TABS.map(t => t.id), 'kanji'));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [training, setTraining] = useState(null);

  useEffect(() => { localStorage.setItem(TAB_KEY, tab); }, [tab]);


  const pools = useMemo(() => {
    const items = kanji.map(kanjiToTrainerItem);
    return {
      all: items,
      new: items.filter(i => !i.mastered),
      starred: items.filter(i => i.starred),
    };
  }, [kanji]);

  const startTraining = (mode, source) => {
    setTraining({ mode, source, snapshot: pools[source] });
    setPickerOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleMastered = useCallback((id) => {
    const item = kanji.find(i => i.id === id);
    toggleMastered(id);
    if (item && !item.mastered) showToast('Позначено як вивчене ✓');
  }, [kanji, toggleMastered, showToast]);

  if (loading) {
    return <div className="jlpt jlpt-theme"><div className="g-state"><div className="loading-screen__logo font-jp">漢</div><p>Завантаження канджі...</p></div></div>;
  }
  if (error) {
    return <div className="jlpt jlpt-theme"><div className="g-state"><p>Не вдалося завантажити канджі 😔</p></div></div>;
  }

  const masteredKanji = kanji.filter(k => k.mastered).length;
  const masteredPct = kanji.length ? (masteredKanji / kanji.length) * 100 : 0;

  return (
    <section className="jlpt jlpt-theme">
      <header className="jlpt-hero">
        <div className="jlpt-hero__bg font-jp" aria-hidden="true">漢字</div>
        <div className="jlpt-hero__top">
          <div>
            <span className="jlpt-hero__eyebrow font-jp">漢字 · かんじ</span>
            <h2 className="jlpt-hero__title">Канджі</h2>
            <p className="jlpt-hero__sub">Усі базові канджі в одному місці: значення, читання on/kun, слова-приклади, тренування та прописи.</p>
          </div>
          <button className="btn btn--primary jlpt-hero__train" onClick={() => { setPickerOpen(o => !o); setTraining(null); }}>
            🔥 Тренувати канджі
          </button>
        </div>

        <div className="jlpt-hero__stats">
          <span>Канджі вивчено <strong>{masteredKanji}</strong> / {kanji.length}</span>
          <span className="jlpt-progress"><span style={{ width: `${masteredPct}%` }} /></span>
        </div>
      </header>

      {pickerOpen && (
        <TrainPicker pools={pools} onStart={startTraining} onClose={() => setPickerOpen(false)} />
      )}

      {training ? (
        <TrainView training={training} pools={pools} isKanjiMode={isKanjiMode}
          onReview={reviewItem} onToggleStar={toggleStar} showToast={showToast} onBack={() => setTraining(null)} />
      ) : (
        <>
          <nav className="jlpt-tabs">
            {TABS.map(t => (
              <button key={t.id} className={`jlpt-tab ${tab === t.id ? 'jlpt-tab--active' : ''}`} onClick={() => setTab(t.id)}>
                <span className="jlpt-tab__icon font-jp">{t.icon}</span>{t.label}
              </button>
            ))}
          </nav>

          <div className="jlpt-panel" key={tab}>
            {tab === 'kanji' && <KanjiTab kanji={kanji} onToggleMastered={handleToggleMastered} onToggleStar={toggleStar} />}
            {tab === 'rules' && <RulesTab rules={rules} />}
          </div>
        </>
      )}
    </section>
  );
}
