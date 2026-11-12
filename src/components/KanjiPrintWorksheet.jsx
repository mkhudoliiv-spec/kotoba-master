import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { readingRomaji } from '../hooks/useKanji';

// A4 worksheet (прописи), printed with window.print(). The number of practice rows per kanji
// is user-selectable; blocks per page follow from the block height.
// While mounted, body gets `kpw-printing`, and @media print hides everything except `.kpw-print`.

const MAX_EXAMPLES = 6;   // 2 columns × 3 rows inside the theory cell
const TRACE_CELLS = 3;   // pale outlines to trace over at the start of the first row
const FIRST_ROW_CELLS = 11; // first row sits to the right of the big sample
const FULL_ROW_CELLS = 14;

// Geometry in mm — keep in sync with .kpw-block / .kpw-cell in index.css
const ROW_MM = 13;
const BLOCK_HEAD_MM = 27;   // meta + theory rows above the first practice row
const BLOCK_GAP_MM = 4;
const PAGE_HEIGHT_MM = 280; // A4 297mm minus 8mm page margins, with a little slack
const MIN_ROWS = 1;
const MAX_ROWS = Math.floor((PAGE_HEIGHT_MM - BLOCK_HEAD_MM) / ROW_MM);
const DEFAULT_ROWS = 3;
const ROWS_KEY = 'kotoba_print_rows';

const blocksPerPage = (rows) =>
  Math.max(1, Math.floor((PAGE_HEIGHT_MM + BLOCK_GAP_MM) / (BLOCK_HEAD_MM + ROW_MM * rows + BLOCK_GAP_MM)));

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

function Cells({ count, trace }) {
  return Array.from({ length: count }, (_, i) => (
    <div key={i} className="kpw-cell">
      {trace && i < TRACE_CELLS && <span className="kpw-cell__trace">{trace}</span>}
    </div>
  ));
}

function WorksheetBlock({ k, rows }) {
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

      <div className="kpw-row kpw-row--first"><Cells count={FIRST_ROW_CELLS} trace={k.kanji} /></div>
      {Array.from({ length: rows - 1 }, (_, i) => (
        <div key={i} className="kpw-row kpw-row--full"><Cells count={FULL_ROW_CELLS} /></div>
      ))}
    </section>
  );
}

export default function KanjiPrintWorksheet({ kanji, visible, initialIds, onClose }) {
  const [selected, setSelected] = useState(() => new Set(initialIds));
  const [rows, setRows] = useState(loadRows);
  const perPage = blocksPerPage(rows);

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
  const pages = useMemo(() => {
    const out = [];
    for (let i = 0; i < toPrint.length; i += perPage) out.push(toPrint.slice(i, i + perPage));
    return out;
  }, [toPrint, perPage]);

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
              <span className="kpw-rows__label">Рядків прописів на канджі:</span>
              <div className="kpw-rows__stepper">
                <button className="jk-icon-btn" onClick={() => changeRows(rows - 1)} disabled={rows <= MIN_ROWS} aria-label="Менше рядків">−</button>
                <select className="kpw-rows__select" value={rows} onChange={e => changeRows(Number(e.target.value))} aria-label="Кількість рядків">
                  {Array.from({ length: MAX_ROWS - MIN_ROWS + 1 }, (_, i) => MIN_ROWS + i).map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <button className="jk-icon-btn" onClick={() => changeRows(rows + 1)} disabled={rows >= MAX_ROWS} aria-label="Більше рядків">+</button>
              </div>
              <span className="kpw-rows__hint">{FIRST_ROW_CELLS + (rows - 1) * FULL_ROW_CELLS} клітинок · по {perPage} канджі на сторінку</span>
            </div>

            <footer className="kpw-dialog__foot">
              <span>Обрано <strong>{toPrint.length}</strong> · {pages.length} стор. A4 (по {perPage} канджі)</span>
              <button className="btn btn--primary btn--sm" disabled={!toPrint.length} onClick={handlePrint}>🖨️ Друкувати</button>
            </footer>
          </article>
        </div>,
        document.body
      )}

      {createPortal(
        <div className="kpw-print" aria-hidden="true">
          {pages.map((page, i) => (
            <div key={i} className="kpw-page">
              {page.map(k => <WorksheetBlock key={k.id} k={k} rows={rows} />)}
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}
