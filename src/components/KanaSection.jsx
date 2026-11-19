import { useState, useMemo, useCallback, useEffect } from 'react';
import { SCRIPTS, GROUPS, getKanaTable, flattenTable } from '../utils/kana';
import { hasGlyphNote } from '../utils/glyphNotes';
import { speakJapanese } from '../utils/helpers';
import GlyphStyleSwitch from './GlyphStyleSwitch';
import KanaCard from './KanaCard';
import KanaPractice from './KanaPractice';

const SCRIPT_KEY = 'kotoba_kana_script';
const GROUP_KEY = 'kotoba_kana_group';
const ROMAJI_KEY = 'kotoba_kana_romaji';

function readStored(key, allowed, fallback) {
  try {
    const v = localStorage.getItem(key);
    return allowed.includes(v) ? v : fallback;
  } catch {
    return fallback;
  }
}
function store(key, value) {
  try { localStorage.setItem(key, value); } catch { /* storage unavailable */ }
}

export default function KanaSection({ words }) {
  const [script, setScript] = useState(() => readStored(SCRIPT_KEY, SCRIPTS.map(s => s.id), 'hira'));
  const [group, setGroup] = useState(() => readStored(GROUP_KEY, GROUPS.map(g => g.id), 'seion'));
  const [showRomaji, setShowRomaji] = useState(() => readStored(ROMAJI_KEY, ['1', '0'], '1') === '1');
  const [openId, setOpenId] = useState(null);
  // { items, index, title } while the practice view is open
  const [practice, setPractice] = useState(null);

  useEffect(() => { store(SCRIPT_KEY, script); }, [script]);
  useEffect(() => { store(GROUP_KEY, group); }, [group]);
  useEffect(() => { store(ROMAJI_KEY, showRomaji ? '1' : '0'); }, [showRomaji]);

  const table = useMemo(() => getKanaTable(group, script), [group, script]);
  const flat = useMemo(() => flattenTable(table), [table]);

  const openIdx = flat.findIndex(e => e.id === openId);
  const opened = openIdx >= 0 ? flat[openIdx] : null;
  const close = useCallback(() => setOpenId(null), []);
  const prev = openIdx > 0 ? () => setOpenId(flat[openIdx - 1].id) : null;
  const next = openIdx >= 0 && openIdx < flat.length - 1 ? () => setOpenId(flat[openIdx + 1].id) : null;

  const openPractice = (items, index, title) => {
    setOpenId(null);
    setPractice({ items, index, title });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const closePractice = useCallback(() => setPractice(null), []);

  const scriptInfo = SCRIPTS.find(s => s.id === script);

  return (
    <section className="jlpt kana">
      <header className="jlpt-hero">
        <div className="jlpt-hero__bg font-jp" aria-hidden="true">{script === 'kata' ? 'カナ' : 'かな'}</div>
        <div className="jlpt-hero__top">
          <div>
            <span className="jlpt-hero__eyebrow font-jp">五十音 · ごじゅうおん</span>
            <h2 className="jlpt-hero__title">Абетки</h2>
            <p className="jlpt-hero__sub">
              Хірагана та катакана: таблиця 五十音, транскрипція, озвучка і порядок рисок пензлем.
              Натисни на символ, щоб відкрити картку, або на «✍», щоб прописати цілий рядок.
            </p>
          </div>
          <div className="jlpt-hero__actions">
            <div className="kana-script" role="radiogroup" aria-label="Абетка">
              {SCRIPTS.map(s => (
                <button key={s.id} role="radio" aria-checked={script === s.id}
                  className={`kana-script__btn ${script === s.id ? 'kana-script__btn--active' : ''}`}
                  onClick={() => setScript(s.id)}>
                  <span className="font-jp" lang="ja">{s.jp}</span>
                  <span className="kana-script__label">{s.label}</span>
                </button>
              ))}
            </div>
            <GlyphStyleSwitch />
          </div>
        </div>
      </header>

      {practice ? (
        <KanaPractice key={`${practice.title}-${practice.index}`} items={practice.items} startIndex={practice.index}
          title={practice.title} onBack={closePractice} />
      ) : (
        <>
          <nav className="jlpt-tabs">
            {GROUPS.map(g => (
              <button key={g.id} className={`jlpt-tab ${group === g.id ? 'jlpt-tab--active' : ''}`} onClick={() => setGroup(g.id)}>
                {g.label} <span className="jlpt-tab__icon font-jp" lang="ja">{g.jp}</span>
              </button>
            ))}
          </nav>

          <div className="kana-toolbar">
            <span className="kana-toolbar__info">
              {scriptInfo.label}: <strong>{flat.length}</strong> {group === 'yoon' ? 'сполучення' : 'знаків'}
            </span>
            <label className="kana-toolbar__toggle">
              <input type="checkbox" checked={showRomaji} onChange={e => setShowRomaji(e.target.checked)} />
              Показувати транскрипцію
            </label>
            <button className="btn btn--ghost btn--sm" onClick={() => openPractice(flat, 0, table.rows.map(r => r.cells.find(Boolean).char).join(''))}>
              ✍ Прописати всі
            </button>
          </div>

          <div className="jlpt-panel" key={`${script}-${group}`}>
            <div className={`kana-table kana-table--${table.cols.length}`}>
              <div className="kana-table__corner" />
              {table.cols.map(c => <div key={c} className="kana-table__col">{c}</div>)}

              {table.rows.map(row => {
                const rowItems = row.cells.filter(Boolean);
                return [
                  <button key={`head-${row.id}`} className="kana-table__row-head" title={`Прописати рядок ${row.label}`}
                    onClick={() => openPractice(rowItems, 0, rowItems.map(e => e.char).join(''))}>
                    <span className="font-jp" lang="ja">{row.label}</span>
                    <span className="kana-table__row-write">✍</span>
                  </button>,
                  ...row.cells.map((e, i) => e ? (
                    <button key={e.id} className="kana-cell" onClick={() => { setOpenId(e.id); speakJapanese(e.char); }}
                      title={`${e.char} — ${e.r} [${e.uk}]`}>
                      {hasGlyphNote(e.char) && <span className="kana-cell__note" title="Підступний знак: є примітка">!</span>}
                      <span className={`kana-cell__glyph font-jp jp-glyph ${[...e.char].length > 1 ? 'kana-cell__glyph--yoon' : ''}`} lang="ja">{e.char}</span>
                      {showRomaji && (
                        <span className="kana-cell__reading">
                          <span className="kana-cell__romaji">{e.r}</span>
                          <span className="kana-cell__uk">{e.uk}</span>
                        </span>
                      )}
                    </button>
                  ) : <div key={`${row.id}-gap${i}`} className="kana-cell kana-cell--empty" aria-hidden="true" />),
                ];
              })}
            </div>

            {script === 'kata' && (
              <p className="kana-footnote">
                <span className="font-jp" lang="ja">ー</span> — у катакані позначає подовження голосного: <span className="font-jp" lang="ja">ケーキ</span> [ке:кі] — торт.
              </p>
            )}
          </div>
        </>
      )}

      {opened && (
        <KanaCard entry={opened} script={script} words={words} onClose={close} onPrev={prev} onNext={next}
          onSwitchScript={() => setScript(s => s === 'kata' ? 'hira' : 'kata')}
          onPractice={() => openPractice([opened], 0, opened.char)} />
      )}
    </section>
  );
}
