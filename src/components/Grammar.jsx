import { useState, useEffect, useMemo, useCallback, Fragment } from 'react';
import { useGrammar } from '../hooks/useGrammar';
import { speakJapanese } from '../utils/helpers';

const READ_KEY = 'kotoba_grammar_read';

/** Render text with **highlight** markup and \n line breaks */
function Rich({ text, className = '' }) {
  if (!text) return null;
  const parts = String(text).split(/\*\*(.+?)\*\*/g);
  return (
    <span className={className}>
      {parts.map((p, i) => (i % 2 === 1
        ? <mark key={i} className="g-hl">{p}</mark>
        : <Fragment key={i}>{p}</Fragment>))}
    </span>
  );
}

const plain = (text) => String(text || '').replace(/\*\*/g, '');
const hasJapanese = (text) => /[\u3040-\u30ff\u4e00-\u9faf]/.test(text);

function useReadTopics() {
  const [read, setRead] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(READ_KEY) || '[]')); }
    catch { return new Set(); }
  });
  const toggle = useCallback((id, value) => {
    setRead(prev => {
      const next = new Set(prev);
      const shouldAdd = value ?? !next.has(id);
      if (shouldAdd) next.add(id); else next.delete(id);
      localStorage.setItem(READ_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);
  return [read, toggle];
}

/* ── Blocks ── */

function Block({ block }) {
  switch (block.type) {
    case 'heading':
      return <h3 className="g-block-heading">{block.text}</h3>;
    case 'text':
      return <p className="g-block-text"><Rich text={block.text} /></p>;
    case 'formula':
      return (
        <div className="g-formula">
          <div className="g-formula__text font-jp"><Rich text={block.text} /></div>
          {block.meaning && <div className="g-formula__meaning">{block.meaning}</div>}
        </div>
      );
    case 'examples':
      return (
        <ul className="g-examples">
          {block.items.map((ex, i) => (
            <li key={i} className="g-example">
              <button className="g-example__audio" onClick={() => speakJapanese(plain(ex.jp))}
                title="Прослухати" aria-label="Прослухати приклад">🔊</button>
              <div className="g-example__body">
                <div className="g-example__jp font-jp"><Rich text={ex.jp} /></div>
                {ex.tr && <div className="g-example__tr">[{ex.tr}]</div>}
                <div className="g-example__uk">{ex.uk}</div>
              </div>
            </li>
          ))}
        </ul>
      );
    case 'table':
      return (
        <div className="g-table-wrap">
          <table className="g-table">
            <thead>
              <tr>{block.head.map((h, i) => <th key={i}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci} className={hasJapanese(cell) ? 'font-jp' : ''}><Rich text={cell} /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'tip':
    case 'warn':
      return (
        <div className={`g-callout g-callout--${block.type}`}>
          <span className="g-callout__icon">{block.type === 'tip' ? '💡' : '⚠️'}</span>
          <p><Rich text={block.text} /></p>
        </div>
      );
    default:
      return null;
  }
}

/* ── Topic detail ── */

function TopicView({ topic, category, prev, next, isRead, onToggleRead, onBack, onOpen }) {
  return (
    <article className="g-topic" style={{ '--cat': category?.color || 'var(--color-accent)' }}>
      <button className="g-back" onClick={onBack} id="grammar-back-btn">← Усі теми</button>

      <header className="g-topic__hero">
        <div className="g-topic__meta">
          {category && <span className="g-badge">{category.icon} {category.title}</span>}
          {topic.lessons?.length > 0 && (
            <span className="g-topic__lessons">Урок {topic.lessons.join(', ')}</span>
          )}
        </div>
        <div className="g-topic__pattern font-jp">{topic.pattern}</div>
        <h2 className="g-topic__title">{topic.title}</h2>
        <p className="g-topic__summary">{topic.summary}</p>
      </header>

      <div className="g-topic__body">
        {topic.blocks.map((b, i) => <Block key={i} block={b} />)}
      </div>

      <div className="g-topic__footer">
        <button className={`btn ${isRead ? 'btn--success' : 'btn--dark'} g-read-btn`}
          onClick={() => onToggleRead(topic.id)} id="grammar-read-btn">
          {isRead ? '✓ Прочитано' : 'Позначити як прочитане'}
        </button>

        <nav className="g-pager">
          {prev ? (
            <button className="g-pager__btn" onClick={() => onOpen(prev.id)}>
              <span className="g-pager__dir">← Попередня</span>
              <span className="g-pager__title">{prev.title}</span>
            </button>
          ) : <span />}
          {next ? (
            <button className="g-pager__btn g-pager__btn--next" onClick={() => onOpen(next.id)}>
              <span className="g-pager__dir">Наступна →</span>
              <span className="g-pager__title">{next.title}</span>
            </button>
          ) : <span />}
        </nav>
      </div>
    </article>
  );
}

/* ── Main ── */

export default function Grammar() {
  const { data, loading, error } = useGrammar();
  const [selectedId, setSelectedId] = useState(null);
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [read, toggleRead] = useReadTopics();

  const categories = useMemo(() => data?.categories || [], [data]);
  const topics = useMemo(() => {
    const firstLesson = t => (t.lessons?.length ? Math.min(...t.lessons) : Infinity);
    return [...(data?.topics || [])].sort((a, b) => firstLesson(a) - firstLesson(b));
  }, [data]);
  const catMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return topics.filter(t => {
      if (category !== 'all' && t.category !== category) return false;
      if (!q) return true;
      return [t.title, t.pattern, t.summary, plain(JSON.stringify(t.blocks))]
        .some(s => s.toLowerCase().includes(q));
    });
  }, [topics, category, query]);

  const open = useCallback((id) => {
    window.history.pushState({ grammarTopic: id }, '');
    setSelectedId(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const back = useCallback(() => {
    if (window.history.state && window.history.state.grammarTopic === selectedId) {
      window.history.back();
    } else {
      setSelectedId(null);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [selectedId]);

  useEffect(() => {
    const onPop = () => {
      if (selectedId) {
        setSelectedId(null);
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    const onKey = (e) => { if (e.key === 'Escape') back(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId, back]);

  if (loading) {
    return <div className="g-state"><div className="loading-screen__logo font-jp">文</div><p>Завантаження конспектів...</p></div>;
  }
  if (error || !data) {
    return <div className="g-state"><p>Не вдалося завантажити конспекти 😔</p></div>;
  }

  const selected = topics.find(t => t.id === selectedId);
  if (selected) {
    const idx = topics.indexOf(selected);
    return (
      <TopicView
        key={selected.id}
        topic={selected}
        category={catMap.get(selected.category)}
        prev={topics[idx - 1]}
        next={topics[idx + 1]}
        isRead={read.has(selected.id)}
        onToggleRead={toggleRead}
        onBack={back}
        onOpen={open}
      />
    );
  }

  const readCount = topics.filter(t => read.has(t.id)).length;

  return (
    <section className="grammar">
      <header className="g-hero">
        <div className="g-hero__kanji font-jp" aria-hidden="true">文法</div>
        <h2 className="g-hero__title">Граматика</h2>
        <p className="g-hero__sub">Обери тему, щоб відкрити конспект з правилами та прикладами.</p>
        <div className="g-hero__progress">
          <div className="g-hero__bar"><div style={{ width: `${topics.length ? (readCount / topics.length) * 100 : 0}%` }} /></div>
          <span>Прочитано <strong>{readCount}</strong> / {topics.length}</span>
        </div>
      </header>

      <div className="g-toolbar">
        <input
          id="grammar-search"
          className="g-search"
          type="search"
          placeholder="Пошук теми: は, частки, місяці…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <div className="g-cats">
          <button className={`lesson-chip ${category === 'all' ? 'lesson-chip--active' : ''}`}
            onClick={() => setCategory('all')}>Усі ({topics.length})</button>
          {categories.map(c => {
            const count = topics.filter(t => t.category === c.id).length;
            if (!count) return null;
            return (
              <button key={c.id} id={`grammar-cat-${c.id}`}
                className={`lesson-chip ${category === c.id ? 'lesson-chip--active' : ''}`}
                onClick={() => setCategory(c.id)}>{c.icon} {c.title} ({count})</button>
            );
          })}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="g-state"><p>Нічого не знайдено. Спробуй інший запит.</p></div>
      ) : (
        <div className="g-grid">
          {visible.map((t, i) => {
            const c = catMap.get(t.category);
            const isRead = read.has(t.id);
            return (
              <button key={t.id} id={`grammar-topic-${t.id}`}
                className={`g-card ${isRead ? 'g-card--read' : ''}`}
                style={{ '--cat': c?.color || 'var(--color-accent)', animationDelay: `${i * 40}ms` }}
                onClick={() => open(t.id)}>
                <div className="g-card__top">
                  <span className="g-card__cat">{c?.icon} {c?.title}</span>
                  {isRead && <span className="g-card__check" title="Прочитано">✓</span>}
                </div>
                <div className="g-card__pattern font-jp">{t.pattern}</div>
                <div className="g-card__title">{t.title}</div>
                <p className="g-card__summary">{t.summary}</p>
                <div className="g-card__foot">
                  {t.lessons?.length > 0 && <span>Урок {t.lessons.join(', ')}</span>}
                  <span className="g-card__go">Читати →</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
