import { useState, useEffect, useMemo, useCallback } from 'react';
import { useJlpt, kanjiToTrainerItem, readingKana } from '../hooks/useJlpt';
import { speakJapanese } from '../utils/helpers';
import KanjiPrintWorksheet from './KanjiPrintWorksheet';
import { Block } from './Grammar';
import JlptKanjiCard from './JlptKanjiCard';
import Flashcards from './Flashcards';
import Quiz from './Quiz';
import WriteMode from './WriteMode';
import MatchGame from './MatchGame';

const LEVEL_KEY = 'kotoba_jlpt_level';
const TAB_KEY = 'kotoba_jlpt_tab';

const TABS = [
  { id: 'kanji', label: 'Канджі (Картки)', icon: '漢' },
  { id: 'rules', label: 'Правила читання Канджі', icon: '📐' },
  { id: 'words', label: 'Слова рівня', icon: '📖' },
  { id: 'grammar', label: 'Граматика рівня', icon: '📚' },
];

const TRAIN_MODES = [
  { id: 'cards', label: 'Картки', icon: '📇', min: 1, hint: 'Розумне повторення (SRS)' },
  { id: 'quiz', label: 'Тест', icon: '✅', min: 4, hint: 'Обери переклад' },
  { id: 'write', label: 'Письмо', icon: '✏️', min: 1, hint: 'Напиши японською' },
  { id: 'match', label: 'Пари', icon: '🧩', min: 6, hint: 'Знайди пари на час' },
];

const TRAIN_SOURCES = [
  { id: 'kanji', label: 'Канджі' },
  { id: 'words', label: 'Слова' },
  { id: 'starred', label: '★ Обрані' },
];

const STATUS_FILTERS = [
  { id: 'all', label: 'Усі' },
  { id: 'new', label: 'Не вивчені' },
  { id: 'mastered', label: '✓ Вивчені' },
  { id: 'starred', label: '★ Обрані' },
];

const POS_LABELS = {
  noun: 'Іменники', verb: 'Дієслова', 'i-adj': 'い-прикм.', 'na-adj': 'な-прикм.', adv: 'Прислівники', other: 'Інше',
};

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

function KanjiTab({ level, kanji, onToggleMastered, onToggleStar }) {
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
        <JlptKanjiCard kanji={opened} onClose={close} onPrev={prev} onNext={next}
          onToggleMastered={onToggleMastered} onToggleStar={onToggleStar}
          onPrint={() => { setOpenId(null); setPrintIds([opened.id]); }} />
      )}

      {printIds && (
        <KanjiPrintWorksheet level={level} kanji={kanji} visible={visible} initialIds={printIds}
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

/* ── Tab: level vocabulary ── */

function WordsTab({ words, isKanjiMode, onToggleMastered, onToggleStar }) {
  const [query, setQuery] = useState('');
  const [pos, setPos] = useState('all');
  const [status, setStatus] = useState('all');

  const posKeys = useMemo(() => Object.keys(POS_LABELS).filter(p => words.some(w => w.pos === p)), [words]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return words.filter(w => {
      if (pos !== 'all' && w.pos !== pos) return false;
      if (!matchStatus(w, status)) return false;
      if (!q) return true;
      return [w.kana, w.kanji, w.romaji, w.transcription, w.translation].some(s => s?.toLowerCase().includes(q));
    });
  }, [words, query, pos, status]);

  return (
    <>
      <div className="g-toolbar">
        <input className="g-search" type="search" value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Пошук: 食べる, taberu, їсти…" />
        <div className="g-cats">
          <button className={`lesson-chip ${pos === 'all' ? 'lesson-chip--active' : ''}`}
            onClick={() => setPos('all')}>Усі частини мови</button>
          {posKeys.map(p => (
            <button key={p} className={`lesson-chip ${pos === p ? 'lesson-chip--active' : ''}`}
              onClick={() => setPos(p)}>{POS_LABELS[p]} ({words.filter(w => w.pos === p).length})</button>
          ))}
        </div>
        <div className="g-cats"><StatusChips value={status} onChange={setStatus} items={words} /></div>
      </div>

      {visible.length === 0 ? (
        <div className="g-state"><p>Нічого не знайдено. Спробуй інший запит.</p></div>
      ) : (
        <ul className="jlpt-words">
          {visible.map(w => (
            <li key={w.id} className={`jlpt-word ${w.mastered ? 'jlpt-word--mastered' : ''}`}>
              <button className={`star-btn ${w.starred ? 'star-btn--active' : ''}`}
                onClick={() => onToggleStar(w.id)} title="В обрані">★</button>
              <div className="jlpt-word__jp">
                <span className="jlpt-word__main font-jp">{isKanjiMode && w.kanji ? w.kanji : w.kana}</span>
                {isKanjiMode && w.kanji && w.kanji !== w.kana && <span className="jlpt-word__kana font-jp">{w.kana}</span>}
              </div>
              <div className="jlpt-word__tr">
                <span>{w.transcription}</span>
                <span className="jlpt-word__romaji">{w.romaji}</span>
              </div>
              <div className="jlpt-word__uk">{w.translation}</div>
              <div className="jlpt-word__actions">
                <button className="dict-speak-btn" onClick={() => speakJapanese(w.kana)} title="Прослухати">🔊</button>
                <button className={`jlpt-check ${w.mastered ? 'jlpt-check--on' : ''}`}
                  onClick={() => onToggleMastered(w.id)} title={w.mastered ? 'Вивчено' : 'Позначити як вивчене'}>✓</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/* ── Tab: level grammar ── */

function GrammarTab({ topics, level }) {
  const [openId, setOpenId] = useState(null);
  const [query, setQuery] = useState('');
  const opened = topics.find(t => t.id === openId);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return topics;
    return topics.filter(t => [t.title, t.pattern, t.summary, JSON.stringify(t.blocks)].some(s => s.toLowerCase().includes(q)));
  }, [topics, query]);

  if (opened) {
    const idx = topics.indexOf(opened);
    const prev = topics[idx - 1];
    const next = topics[idx + 1];
    return (
      <article className="g-topic jlpt-topic">
        <button className="g-back" onClick={() => setOpenId(null)}>← Усі конструкції {level}</button>
        <header className="g-topic__hero">
          <div className="g-topic__meta"><span className="g-badge">JLPT {level}</span></div>
          <div className="g-topic__pattern font-jp">{opened.pattern}</div>
          <h2 className="g-topic__title">{opened.title}</h2>
          <p className="g-topic__summary">{opened.summary}</p>
        </header>
        <div className="g-topic__body">
          {opened.blocks.map((b, i) => <Block key={i} block={b} />)}
        </div>
        <nav className="g-pager jlpt-pager">
          {prev ? (
            <button className="g-pager__btn" onClick={() => setOpenId(prev.id)}>
              <span className="g-pager__dir">← Попередня</span>
              <span className="g-pager__title">{prev.pattern}</span>
            </button>
          ) : <span />}
          {next ? (
            <button className="g-pager__btn g-pager__btn--next" onClick={() => setOpenId(next.id)}>
              <span className="g-pager__dir">Наступна →</span>
              <span className="g-pager__title">{next.pattern}</span>
            </button>
          ) : <span />}
        </nav>
      </article>
    );
  }

  return (
    <>
      <div className="g-toolbar">
        <input className="g-search" type="search" value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Пошук конструкції: てください, можливість…" />
      </div>
      {visible.length === 0 ? (
        <div className="g-state"><p>Нічого не знайдено. Спробуй інший запит.</p></div>
      ) : (
        <div className="g-grid">
          {visible.map((t, i) => (
            <button key={t.id} className="g-card" style={{ animationDelay: `${i * 40}ms` }}
              onClick={() => { setOpenId(t.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
              <div className="g-card__top"><span className="g-card__cat">JLPT {level}</span></div>
              <div className="g-card__pattern font-jp">{t.pattern}</div>
              <div className="g-card__title">{t.title}</div>
              <p className="g-card__summary">{t.summary}</p>
              <div className="g-card__foot"><span className="g-card__go">Читати →</span></div>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

/* ── Training ── */

function TrainPicker({ level, pools, onStart, onClose }) {
  const [source, setSource] = useState('kanji');
  const pool = pools[source];

  return (
    <div className="jlpt-train-picker">
      <div className="jlpt-train-picker__head">
        <h3>🔥 Тренування JLPT {level}</h3>
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

function TrainView({ level, training, pools, isKanjiMode, onReview, onToggleStar, showToast, onBack }) {
  // Quiz / Write / Match restart whenever `words` changes, so they get a snapshot taken at start.
  // Flashcards keep their deck by id and need live items to show SRS updates.
  const live = pools[training.source];
  const words = training.mode === 'cards' ? live : training.snapshot;
  const mode = TRAIN_MODES.find(m => m.id === training.mode);
  const source = TRAIN_SOURCES.find(s => s.id === training.source);

  return (
    <div className="jlpt-train">
      <div className="jlpt-train__bar">
        <button className="g-back" onClick={onBack}>← До рівня {level}</button>
        <span className="jlpt-train__title">{mode.icon} {mode.label} · {source.label} · JLPT {level}</span>
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

export default function JlptSection({ isKanjiMode, showToast }) {
  const { levels, kanji, words, grammar, rules, loading, error, toggleStar, toggleMastered, reviewItem } = useJlpt();
  const [level, setLevel] = useState(() => readStored(LEVEL_KEY, ['N5', 'N4', 'N3'], 'N5'));
  const [tab, setTab] = useState(() => readStored(TAB_KEY, TABS.map(t => t.id), 'kanji'));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [training, setTraining] = useState(null);

  useEffect(() => { localStorage.setItem(LEVEL_KEY, level); }, [level]);
  useEffect(() => { localStorage.setItem(TAB_KEY, tab); }, [tab]);

  const levelKanji = useMemo(() => kanji.filter(k => k.level === level), [kanji, level]);
  const levelWords = useMemo(() => words.filter(w => w.level === level), [words, level]);
  const levelGrammar = useMemo(() => grammar.filter(g => g.level === level), [grammar, level]);
  const levelRules = useMemo(() => rules.filter(r => !r.levels || r.levels.includes(level)), [rules, level]);

  const pools = useMemo(() => {
    const kanjiItems = levelKanji.map(kanjiToTrainerItem);
    return {
      kanji: kanjiItems,
      words: levelWords,
      starred: [...kanjiItems, ...levelWords].filter(i => i.starred),
    };
  }, [levelKanji, levelWords]);

  const selectLevel = (id) => {
    setLevel(id);
    setTraining(null);
    setPickerOpen(false);
  };

  const startTraining = (mode, source) => {
    setTraining({ mode, source, snapshot: pools[source] });
    setPickerOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleMastered = useCallback((id) => {
    const item = [...kanji, ...words].find(i => i.id === id);
    toggleMastered(id);
    if (item && !item.mastered) showToast('Позначено як вивчене ✓');
  }, [kanji, words, toggleMastered, showToast]);

  if (loading) {
    return <div className="jlpt jlpt-theme"><div className="g-state"><div className="loading-screen__logo font-jp">試</div><p>Завантаження матеріалів JLPT...</p></div></div>;
  }
  if (error) {
    return <div className="jlpt jlpt-theme"><div className="g-state"><p>Не вдалося завантажити матеріали JLPT 😔</p></div></div>;
  }

  const levelInfo = levels.find(l => l.id === level);
  const masteredKanji = levelKanji.filter(k => k.mastered).length;
  const masteredWords = levelWords.filter(w => w.mastered).length;

  return (
    <section className="jlpt jlpt-theme">
      <header className="jlpt-hero">
        <div className="jlpt-hero__bg font-jp" aria-hidden="true">{level}</div>
        <div className="jlpt-hero__top">
          <div>
            <span className="jlpt-hero__eyebrow font-jp">日本語能力試験</span>
            <h2 className="jlpt-hero__title">JLPT {level} <span>· {levelInfo?.title}</span></h2>
            <p className="jlpt-hero__sub">{levelInfo?.description}</p>
          </div>
          <button className="btn btn--primary jlpt-hero__train" onClick={() => { setPickerOpen(o => !o); setTraining(null); }}>
            🔥 Тренувати рівень
          </button>
        </div>

        <div className="jlpt-levels" role="tablist" aria-label="Рівень JLPT">
          {levels.map(l => {
            const lk = kanji.filter(k => k.level === l.id);
            const pct = lk.length ? (lk.filter(k => k.mastered).length / lk.length) * 100 : 0;
            return (
              <button key={l.id} role="tab" aria-selected={level === l.id}
                className={`jlpt-level ${level === l.id ? 'jlpt-level--active' : ''}`} onClick={() => selectLevel(l.id)}>
                <span className="jlpt-level__id">JLPT {l.id}</span>
                <span className="jlpt-level__title">{l.title}</span>
                <span className="jlpt-level__bar"><span style={{ width: `${pct}%` }} /></span>
              </button>
            );
          })}
        </div>

        <div className="jlpt-hero__stats">
          <span>Канджі вивчено <strong>{masteredKanji}</strong> / {levelKanji.length}
            <span className="jlpt-hero__muted"> (у рівні ~{levelInfo?.totalKanji})</span></span>
          <span>Слова вивчено <strong>{masteredWords}</strong> / {levelWords.length}</span>
          <span>Граматика: <strong>{levelGrammar.length}</strong> конструкцій</span>
        </div>
      </header>

      {pickerOpen && (
        <TrainPicker level={level} pools={pools} onStart={startTraining} onClose={() => setPickerOpen(false)} />
      )}

      {training ? (
        <TrainView level={level} training={training} pools={pools} isKanjiMode={isKanjiMode}
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

          <div className="jlpt-panel" key={`${level}-${tab}`}>
            {tab === 'kanji' && <KanjiTab level={level} kanji={levelKanji} onToggleMastered={handleToggleMastered} onToggleStar={toggleStar} />}
            {tab === 'rules' && <RulesTab rules={levelRules} />}
            {tab === 'words' && <WordsTab words={levelWords} isKanjiMode={isKanjiMode} onToggleMastered={handleToggleMastered} onToggleStar={toggleStar} />}
            {tab === 'grammar' && <GrammarTab topics={levelGrammar} level={level} />}
          </div>
        </>
      )}
    </section>
  );
}
