import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { readingRomaji } from '../hooks/useJlpt';

// A4 worksheet (прописи): 4 kanji blocks per page, printed with window.print().
// While mounted, body gets `kpw-printing`, and @media print hides everything except `.kpw-print`.

const BLOCKS_PER_PAGE = 4;
const MAX_EXAMPLES = 5;
const TRACE_CELLS = 3;   // pale outlines to trace over at the start of the first row
const FIRST_ROW_CELLS = 11; // first row sits to the right of the big sample
const FULL_ROW_CELLS = 14;

const PRINT_FONTS = ['600 40px "Klee One"', '400 12px "Noto Sans JP"', '700 12px "Noto Sans JP"'];

function Cells({ count, trace }) {
  return Array.from({ length: count }, (_, i) => (
    <div key={i} className="kpw-cell">
      {trace && i < TRACE_CELLS && <span className="kpw-cell__trace">{trace}</span>}
    </div>
  ));
}

function WorksheetBlock({ k }) {
  const on = k.onYomi.map(r => readingRomaji(r).toUpperCase());
  const kun = k.kunYomi.map(r => readingRomaji(r).toLowerCase());
  const examples = k.vocabulary.slice(0, MAX_EXAMPLES);

  return (
    <section className="kpw-block">
      <div className="kpw-block__meta">
        <div className="kpw-block__num">№ {k.index} <small>JLPT {k.level}</small></div>
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
        <table className="kpw-examples">
          <tbody>
            {examples.map(v => (
              <tr key={v.word + v.kana}>
                <td className="kpw-jp kpw-examples__word">{v.word}</td>
                <td><span className="kpw-jp">{v.kana}</span> <i>{v.romaji}</i></td>
                <td>{v.meaningUk}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="kpw-block__sample">
        <span className="kpw-sample-glyph">{k.kanji}</span>
        <small>{k.strokes} рис.</small>
      </div>

      <div className="kpw-row kpw-row--first"><Cells count={FIRST_ROW_CELLS} trace={k.kanji} /></div>
      <div className="kpw-row kpw-row--full kpw-row--2"><Cells count={FULL_ROW_CELLS} /></div>
      <div className="kpw-row kpw-row--full kpw-row--3"><Cells count={FULL_ROW_CELLS} /></div>
    </section>
  );
}

export default function KanjiPrintWorksheet({ level, kanji, visible, initialIds, onClose }) {
  const [selected, setSelected] = useState(() => new Set(initialIds));

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

  // Keep level order regardless of click order
  const toPrint = useMemo(() => kanji.filter(k => selected.has(k.id)), [kanji, selected]);
  const pages = useMemo(() => {
    const out = [];
    for (let i = 0; i < toPrint.length; i += BLOCKS_PER_PAGE) out.push(toPrint.slice(i, i + BLOCKS_PER_PAGE));
    return out;
  }, [toPrint]);

  const toggle = (id) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const selectList = (list) => setSelected(new Set(list.map(k => k.id)));

  const quick = [
    { label: `Показані (${visible.length})`, list: visible },
    { label: `Весь рівень ${level} (${kanji.length})`, list: kanji },
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
              <span className="jk-card__title">🖨️ Друкувати прописи Канджі · JLPT {level}</span>
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

            <footer className="kpw-dialog__foot">
              <span>Обрано <strong>{toPrint.length}</strong> · {pages.length} стор. A4 (по {BLOCKS_PER_PAGE} канджі)</span>
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
              {page.map(k => <WorksheetBlock key={k.id} k={k} />)}
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}
