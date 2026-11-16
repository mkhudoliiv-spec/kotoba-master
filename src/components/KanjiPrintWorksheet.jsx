import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { readingRomaji, fetchKanjiStrokes } from '../hooks/useKanji';

// A4 worksheet (прописи), printed with window.print().
// Each block: theory, then 1–2 stroke-order rows (the kanji built up stroke by stroke, from KanjiVG;
// the rest of the row is pale outlines to trace), then the user-selected number of empty practice rows.
// Blocks differ in height (2 stroke-order rows for > 11 strokes), so pages are filled greedily.
// While mounted, body gets `kpw-printing`, and @media print hides everything except `.kpw-print`.

const MAX_EXAMPLES = 6;   // 2 columns × 3 rows inside the theory cell
const TRACE_CELLS = 3;   // pale outlines in the first row when there is no stroke data
const FIRST_ROW_CELLS = 11; // first row sits to the right of the big sample
const FULL_ROW_CELLS = 14;
const strokeRowCount = (k) => (k.strokes > FIRST_ROW_CELLS ? 2 : 1);

// Geometry in mm — keep in sync with .kpw-block / .kpw-cell in index.css
const ROW_MM = 13;
const BLOCK_HEAD_MM = 27;   // meta + theory rows above the first (stroke-order) row
const BLOCK_GAP_MM = 4;
const PAGE_HEIGHT_MM = 277; // A4 297mm minus 8mm page margins, with slack for the KanjiVG credit line
const MIN_ROWS = 0;
const MAX_ROWS = Math.floor((PAGE_HEIGHT_MM - BLOCK_HEAD_MM) / ROW_MM) - 2;
const DEFAULT_ROWS = 2;
// New key: the old setting counted the first row too; now stroke-order rows come on top of these
const ROWS_KEY = 'kotoba_print_practice_rows';

const blockHeight = (k, rows) => BLOCK_HEAD_MM + ROW_MM * (strokeRowCount(k) + rows);

function paginate(list, rows) {
  const pages = [];
  let page = [];
  let used = 0;
  for (const k of list) {
    const h = blockHeight(k, rows) + BLOCK_GAP_MM;
    if (page.length && used + h > PAGE_HEIGHT_MM + BLOCK_GAP_MM) {
      pages.push(page);
      page = [];
      used = 0;
    }
    page.push(k);
    used += h;
  }
  if (page.length) pages.push(page);
  return pages;
}

function loadRows() {
  try {
    const n = parseInt(localStorage.getItem(ROWS_KEY), 10);
    if (n >= MIN_ROWS && n <= MAX_ROWS) return n;
  } catch {
    // storage unavailable
  }
  return DEFAULT_ROWS;
}

const PRINT_FONTS = ['600 40px "Klee One"', '400 12px "Noto Sans JP"', '700 12px "Noto Sans JP"'];

function Cells({ count }) {
  return Array.from({ length: count }, (_, i) => <div key={i} className="kpw-cell" />);
}

/** Step `step` of the stroke order: earlier strokes grey, the new one black with a red arrow and number. */
function StrokeStep({ data, step }) {
  const [x, y] = data.n[step] || [];
  return (
    <svg className="kpw-stroke" viewBox="0 0 109 109" aria-hidden="true">
      {data.s.slice(0, step).map((d, i) => <path key={i} d={d} className="kpw-stroke__done" />)}
      <path d={data.s[step]} className="kpw-stroke__new" markerEnd="url(#kpw-arrow)" />
      {x != null && <text x={x} y={y} className="kpw-stroke__num">{step + 1}</text>}
    </svg>
  );
}

/** Stroke-order rows: one cell per stroke, then trace outlines to the end of the row(s). */
function StrokeRows({ k, data }) {
  const total = strokeRowCount(k) === 2 ? FIRST_ROW_CELLS + FULL_ROW_CELLS : FIRST_ROW_CELLS;
  const steps = data ? Math.min(data.s.length, total) : 0;
  const traces = data ? total - steps : TRACE_CELLS;
  const cells = Array.from({ length: total }, (_, i) => (
    <div key={i} className="kpw-cell">
      {i < steps
        ? <StrokeStep data={data} step={i} />
        : i < steps + traces && <span className="kpw-cell__trace">{k.kanji}</span>}
    </div>
  ));
  return (
    <>
      <div className="kpw-row kpw-row--first">{cells.slice(0, FIRST_ROW_CELLS)}</div>
      {total > FIRST_ROW_CELLS && <div className="kpw-row kpw-row--full">{cells.slice(FIRST_ROW_CELLS)}</div>}
    </>
  );
}

function WorksheetBlock({ k, rows, strokes }) {
  const on = k.onYomi.map(r => readingRomaji(r).toUpperCase());
  const kun = k.kunYomi.map(r => readingRomaji(r).toLowerCase());
  const examples = k.vocabulary.slice(0, MAX_EXAMPLES);

  return (
    <section className="kpw-block">
      <div className="kpw-block__meta">
        <div className="kpw-block__num">№ {k.index}</div>
        <ul className="kpw-block__radicals">
          {k.radicals.map(r => (
            <li key={r.char + r.nameUk}><span className="kpw-jp">{r.char}</span> {r.nameUk} <small>({r.strokes})</small></li>
          ))}
        </ul>
      </div>

      <div className="kpw-block__theory">
        <p className="kpw-block__readings">
          {on.length > 0 && <em className="kpw-on">{on.join(', ')}</em>}
          {kun.length > 0 && <span className="kpw-kun">{kun.join(', ')}</span>}
          <span className="kpw-meaning">— {k.meaningUk.toLowerCase()}</span>
        </p>
        <ul className="kpw-examples">
          {examples.map(v => (
            <li key={v.word + v.kana} className="kpw-example">
              <span className="kpw-jp kpw-example__word">{v.word}</span>
              <span className="kpw-example__reading"><span className="kpw-jp">{v.kana}</span> <i>{v.romaji}</i></span>
              <span className="kpw-example__meaning">{v.meaningUk}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="kpw-block__sample">
        <span className="kpw-sample-glyph">{k.kanji}</span>
        <small>{k.strokes} рис.</small>
      </div>

      <StrokeRows k={k} data={strokes?.[k.kanji]} />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="kpw-row kpw-row--full"><Cells count={FULL_ROW_CELLS} /></div>
      ))}
    </section>
  );
}

export default function KanjiPrintWorksheet({ kanji, visible, initialIds, onClose }) {
  const [selected, setSelected] = useState(() => new Set(initialIds));
  const [rows, setRows] = useState(loadRows);
  const [strokes, setStrokes] = useState(null);

  useEffect(() => {
    let alive = true;
    fetchKanjiStrokes().then(d => { if (alive) setStrokes(d); });
    return () => { alive = false; };
  }, []);

  const changeRows = (n) => {
    const v = Math.min(MAX_ROWS, Math.max(MIN_ROWS, n));
    setRows(v);
    try { localStorage.setItem(ROWS_KEY, String(v)); } catch { /* storage unavailable */ }
  };

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.classList.add('kpw-printing');
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.classList.remove('kpw-printing');
      document.body.style.overflow = '';
    };
  }, [onClose]);

  // Keep list order regardless of click order
  const toPrint = useMemo(() => kanji.filter(k => selected.has(k.id)), [kanji, selected]);
  const pages = useMemo(() => paginate(toPrint, rows), [toPrint, rows]);

  const toggle = (id) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const selectList = (list) => setSelected(new Set(list.map(k => k.id)));

  const quick = [
    { label: `Показані (${visible.length})`, list: visible },
    { label: `Усі канджі (${kanji.length})`, list: kanji },
    { label: 'Не вивчені', list: kanji.filter(k => !k.mastered) },
    { label: '★ Обрані', list: kanji.filter(k => k.starred) },
  ];

  const handlePrint = async () => {
    // The print sheet is display:none on screen, so web fonts for its glyphs aren't loaded yet
    const text = toPrint.map(k => k.kanji + k.radicals.map(r => r.char).join('') + k.vocabulary.map(v => v.word + v.kana).join('')).join('');
    try {
      await Promise.all(PRINT_FONTS.map(f => document.fonts.load(f, text)));
    } catch {
      // print with fallback fonts
    }
    window.print();
  };

  return (
    <>
      {createPortal(
        <div className="jk-overlay jlpt-theme" onClick={onClose}>
          <article className="jk-card kpw-dialog" onClick={e => e.stopPropagation()} role="dialog" aria-label="Друк прописів канджі">
            <header className="jk-card__head">
              <span className="jk-card__title">🖨️ Друкувати прописи Канджі</span>
              <button className="jk-icon-btn" onClick={onClose} title="Закрити (Esc)">✕</button>
            </header>

            <div className="kpw-dialog__quick g-cats">
              {quick.map(q => (
                <button key={q.label} className="lesson-chip" disabled={!q.list.length} onClick={() => selectList(q.list)}>{q.label}</button>
              ))}
              <button className="lesson-chip" disabled={!selected.size} onClick={() => setSelected(new Set())}>Очистити</button>
            </div>

            <div className="kpw-picks">
              {kanji.map(k => (
                <button key={k.id} className={`kpw-pick ${selected.has(k.id) ? 'kpw-pick--on' : ''}`}
                  onClick={() => toggle(k.id)} title={k.meaningUk} aria-pressed={selected.has(k.id)}>
                  <span className="kpw-pick__num">{k.index}</span>
                  <span className="font-jp">{k.kanji}</span>
                </button>
              ))}
            </div>

            <div className="kpw-rows">
              <span className="kpw-rows__label">Порожніх рядків на канджі:</span>
              <div className="kpw-rows__stepper">
                <button className="jk-icon-btn" onClick={() => changeRows(rows - 1)} disabled={rows <= MIN_ROWS} aria-label="Менше рядків">−</button>
                <select className="kpw-rows__select" value={rows} onChange={e => changeRows(Number(e.target.value))} aria-label="Кількість рядків">
                  {Array.from({ length: MAX_ROWS - MIN_ROWS + 1 }, (_, i) => MIN_ROWS + i).map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <button className="jk-icon-btn" onClick={() => changeRows(rows + 1)} disabled={rows >= MAX_ROWS} aria-label="Більше рядків">+</button>
              </div>
              <span className="kpw-rows__hint">+ 1–2 рядки порядку рисок · {rows * FULL_ROW_CELLS} порожніх клітинок</span>
            </div>

            <footer className="kpw-dialog__foot">
              <span>Обрано <strong>{toPrint.length}</strong> · {pages.length} стор. A4</span>
              <button className="btn btn--primary btn--sm" disabled={!toPrint.length} onClick={handlePrint}>🖨️ Друкувати</button>
            </footer>
          </article>
        </div>,
        document.body
      )}

      {createPortal(
        <div className="kpw-print" aria-hidden="true">
          <svg className="kpw-defs" width="0" height="0">
            <defs>
              <marker id="kpw-arrow" viewBox="0 0 10 10" refX="3" refY="5" markerUnits="userSpaceOnUse"
                markerWidth="16" markerHeight="16" orient="auto">
                <path d="M0,0 L10,5 L0,10 z" />
              </marker>
            </defs>
          </svg>
          {pages.map((page, i) => (
            <div key={i} className="kpw-page">
              {page.map(k => <WorksheetBlock key={k.id} k={k} rows={rows} strokes={strokes} />)}
              {strokes && i === pages.length - 1 && (
                <p className="kpw-credit">Порядок рисок: KanjiVG (kanjivg.tagaini.net), CC BY-SA 3.0</p>
              )}
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}
