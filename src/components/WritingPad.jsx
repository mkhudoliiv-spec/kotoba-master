import { useEffect, useId, useRef, useState } from 'react';
import { useStrokeSet } from '../utils/strokeData';
import { checkStroke } from '../utils/strokeCheck';
import { speakJapanese } from '../utils/helpers';
import InkCell from './InkCell';
import StrokeGlyph from './StrokeGlyph';

// Japanese-copybook trainer: per character a row of 4 十字マス cells —
// 1: clear sample to trace (with the stroke-order animation), 2: faint hint, 3–4: from memory.
// Modes: free writing, or soft checking of stroke order and direction against AnimCJK medians.

const MODE_KEY = 'kotoba_pad_mode';
const HINT_KEY = 'kotoba_pad_hint';
const CELL_LABELS = ['1', '2', '3', '4'];
const FLASH_MS = 800;
const HIGHLIGHT_MS = 1500;

const readStored = (key, allowed, fallback) => {
  try { const v = localStorage.getItem(key); return allowed.includes(v) ? v : fallback; } catch { return fallback; }
};
const store = (key, v) => { try { localStorage.setItem(key, v); } catch { /* storage unavailable */ } };
const xy = pts => pts.map(p => [p[0], p[1]]);

/** Cell 1 underlay: the glyph to trace; replays the stroke-order animation on demand. */
function SampleGlyph({ data, uid, replay, visible }) {
  const total = data.s.length;
  const [shown, setShown] = useState(replay ? 0 : total);
  const [anim, setAnim] = useState(replay ? 0 : -1);
  const onEnd = (i) => { setShown(i + 1); setAnim(i + 1 < total ? i + 1 : -1); };
  const animating = anim >= 0;
  if (!visible && !animating) return null;
  return (
    <g>
      <StrokeGlyph data={data} uid={uid} shown={shown} anim={anim} onAnimEnd={onEnd}
        numbers={visible && !data.f} inkClass="wp__trace" ghostClass="wp__ghost" />
    </g>
  );
}

function Pad({ text, speakText, list, autoPlay }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const chars = [...text];
  const [mode, setMode] = useState(() => readStored(MODE_KEY, ['free', 'check'], 'check'));
  const [showHint, setShowHint] = useState(() => readStored(HINT_KEY, ['1', '0'], '1') === '1');
  const [cells, setCells] = useState({});      // "row-col" → strokes
  const [history, setHistory] = useState([]);  // keys, in drawing order (for undo)
  const [activeKey, setActiveKey] = useState('0-0');
  const [misses, setMisses] = useState({});    // "row-col" → wrong strokes (check mode)
  const [status, setStatus] = useState(null);  // { tone: 'ok' | 'warn' | 'done' | 'info', text }
  const [flash, setFlash] = useState(null);    // { key, id, pts }
  const [highlight, setHighlight] = useState(null); // { row, index }
  // The first row plays the stroke-order animation once on open
  const [replay, setReplay] = useState({ row: 0, n: autoPlay ? 1 : 0 });
  const timers = useRef({});

  useEffect(() => () => Object.values(timers.current).forEach(clearTimeout), []);
  const later = (name, fn, ms) => { clearTimeout(timers.current[name]); timers.current[name] = setTimeout(fn, ms); };

  const activeRow = Number(activeKey.split('-')[0]);
  const canCheck = row => Boolean(list[row]?.m);
  const checking = mode === 'check';

  const addStroke = (key, pts) => {
    setCells(c => ({ ...c, [key]: [...(c[key] || []), pts] }));
    setHistory(h => [...h, key]);
  };

  const reject = (key, row, pts, expected, text) => {
    setFlash(f => ({ key, id: (f?.id || 0) + 1, pts }));
    later('flash', () => setFlash(null), FLASH_MS);
    if (expected >= 0) {
      setHighlight(h => ({ row, index: expected, id: (h?.id || 0) + 1 }));
      later('hl', () => setHighlight(null), HIGHLIGHT_MS);
    }
    setStatus({ tone: 'warn', text });
  };

  const handleStroke = (row, col, pts) => {
    const key = `${row}-${col}`;
    const data = list[row];
    if (!checking || !canCheck(row)) { addStroke(key, pts); setStatus(null); return true; }

    const done = cells[key] || [];
    const total = data.m.length;
    const idx = done.length;
    if (idx >= total) {
      reject(key, row, pts, -1, 'Символ уже дописано — пишіть у наступній клітинці або очистіть цю.');
      return false;
    }
    const res = checkStroke(xy(pts), data.m, idx, done.map(xy));
    if (res.ok) {
      addStroke(key, pts);
      if (idx + 1 === total) {
        const m = misses[key] || 0;
        setStatus({ tone: 'done', text: m ? `Готово ✓ Помилок: ${m}. Спробуйте ще раз у наступній клітинці.` : 'Готово ✓ Усі риски в правильному порядку!' });
      } else {
        setStatus({ tone: 'ok', text: `Риска ${idx + 1} / ${total} ✓` });
      }
      return true;
    }
    setMisses(m => ({ ...m, [key]: (m[key] || 0) + 1 }));
    const n = idx + 1;
    const text = res.reason === 'order' ? `Це риска №${res.index + 1}, а зараз потрібна №${n}.`
      : res.reason === 'reversed' ? `Риска №${n} пишеться в інший бік — подивіться, де вона починається.`
      : `Не схоже на риску №${n}. Її підсвічено в першій клітинці.`;
    reject(key, row, pts, idx, text);
    return false;
  };

  const undo = () => {
    if (!history.length) return;
    const key = history[history.length - 1];
    setHistory(history.slice(0, -1));
    setCells(c => ({ ...c, [key]: (c[key] || []).slice(0, -1) }));
    setActiveKey(key);
    setStatus(null);
  };

  const clearKeys = (keys) => {
    setCells(c => { const n = { ...c }; keys.forEach(k => delete n[k]); return n; });
    setHistory(h => h.filter(k => !keys.includes(k)));
    setMisses(m => { const n = { ...m }; keys.forEach(k => delete n[k]); return n; });
    setStatus(null);
  };
  const clearActive = () => clearKeys([activeKey]);
  const clearAll = () => clearKeys(Object.keys(cells));

  const changeMode = (m) => {
    if (m === mode) return;
    store(MODE_KEY, m);
    setMode(m);
    // Strokes written in the other mode weren't checked — start fresh
    setCells({}); setHistory([]); setMisses({});
    setStatus({ tone: 'info', text: m === 'check' ? 'Режим перевірки: пишіть риски по черзі.' : 'Вільне письмо: без перевірок.' });
  };
  const toggleHint = () => setShowHint(v => { store(HINT_KEY, v ? '0' : '1'); return !v; });

  // Ctrl/Cmd+Z → undo (re-bound every render so it sees the current history)
  useEffect(() => {
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z') return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
      e.preventDefault();
      undo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const activeStrokes = (cells[activeKey] || []).length;
  const anyStrokes = history.length > 0;

  return (
    <div className="wp">
      <div className="wp__toolbar">
        <div className="wp__tools">
          <button type="button" className="btn btn--dark btn--sm" onClick={() => setReplay(r => ({ row: activeRow, n: r.n + 1 }))}>▶ Повтор</button>
          <button type="button" className={`btn btn--ghost btn--sm ${showHint ? '' : 'wp__btn--off'}`} aria-pressed={showHint} onClick={toggleHint}
            title={showHint ? 'Сховати штрихи' : 'Показати штрихи'}>
            {showHint ? '🙈' : '👁'}<span className="wp__btn-label">{showHint ? ' Сховати штрихи' : ' Показати штрихи'}</span>
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={undo} disabled={!anyStrokes} title="Скасувати (Ctrl+Z)">↶<span className="wp__btn-label"> Скасувати</span></button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={clearActive} disabled={!activeStrokes} title="Очистити клітинку">⌫<span className="wp__btn-label"> Очистити</span></button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={clearAll} disabled={!anyStrokes} title="Очистити всі клітинки">🗑<span className="wp__btn-label"> Очистити все</span></button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => speakJapanese(speakText || text)} title="Озвучити">🔊<span className="wp__btn-label"> Озвучити</span></button>
        </div>
        <div className="wp__modes" role="radiogroup" aria-label="Режим">
          <button type="button" role="radio" aria-checked={mode === 'free'}
            className={`wp__mode ${mode === 'free' ? 'wp__mode--active' : ''}`} onClick={() => changeMode('free')}>Вільне письмо</button>
          <button type="button" role="radio" aria-checked={checking}
            className={`wp__mode ${checking ? 'wp__mode--active' : ''}`} onClick={() => changeMode('check')}>З перевіркою</button>
        </div>
      </div>

      <p className={`wp__status ${status ? `wp__status--${status.tone}` : ''}`} aria-live="polite">
        {status?.text || (checking
          ? 'Обведіть символ у клітинці 1, потім пишіть по підказці та з пам\'яті. Порядок рисок перевіряється.'
          : 'Обведіть символ у клітинці 1, потім пишіть по підказці та з пам\'яті.')}
      </p>

      {chars.map((ch, row) => {
        const data = list[row];
        if (!data) return <p key={row} className="wp__status">Немає даних штрихів для «{ch}».</p>;
        const total = data.s.length;
        return (
          <div key={row} className="wp__row" lang="ja">
            {CELL_LABELS.map((label, col) => {
              const key = `${row}-${col}`;
              const strokes = cells[key] || [];
              return (
                <InkCell key={key} strokes={strokes} label={label}
                  active={activeKey === key}
                  done={checking && canCheck(row) && strokes.length === total}
                  flash={flash?.key === key ? flash : null}
                  onActivate={() => setActiveKey(key)}
                  onStroke={pts => handleStroke(row, col, pts)}
                  overlay={col === 0 && highlight?.row === row && (data.f
                    ? <g transform={`scale(${1024 / 109})`}><path d={data.s[highlight.index]} className="so__kvg-hl" /></g>
                    : <path key={highlight.id} d={data.s[highlight.index]} className="so__hl" />)}>
                  {col === 0 && (
                    <SampleGlyph key={replay.row === row ? replay.n : 0} data={data} uid={`${uid}r${row}`}
                      replay={replay.row === row && replay.n > 0} visible={showHint} />
                  )}
                  {col === 1 && showHint && (
                    <StrokeGlyph data={data} uid={`${uid}f${row}`} shown={total} inkClass="wp__faint" ghostClass="wp__faint" />
                  )}
                </InkCell>
              );
            })}
          </div>
        );
      })}

      <p className="wp__legend">
        <span>1 — обведіть</span><span>2 — за блідою підказкою</span><span>3–4 — з пам'яті</span>
      </p>
    </div>
  );
}

/**
 * text — what to write (one kana/kanji, or a yōon pair like きゃ: one row per character);
 * speakText — what 🔊 reads (e.g. a kanji's reading), defaults to text.
 */
export default function WritingPad({ text, speakText, autoPlay = true }) {
  const list = useStrokeSet(text);
  if (!list) return <div className="wp wp--loading"><div className="wp__row">{CELL_LABELS.map(l => <div key={l} className="wp__cell" />)}</div></div>;
  return <Pad key={text} text={text} speakText={speakText} list={list} autoPlay={autoPlay} />;
}
