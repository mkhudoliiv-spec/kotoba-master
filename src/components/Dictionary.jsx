import { useState } from 'react';
import { speakJapanese, getDisplayJp, hasKanjiDistinction, getLessonShortLabel } from '../utils/helpers';
import { useTranslation } from '../utils/i18n';

export default function Dictionary({ words, isKanjiMode, onToggleStar, onDelete, onOpenAdd, showToast }) {
  const [search, setSearch] = useState('');
  const t = useTranslation();

  const filtered = words.filter(w => {
    const s = search.toLowerCase();
    return (
      w.kana.toLowerCase().includes(s) ||
      (w.kanji && w.kanji.toLowerCase().includes(s)) ||
      w.translation.toLowerCase().includes(s) ||
      w.transcription.toLowerCase().includes(s)
    );
  });

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(words, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kotoba_master_words_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(t('exportedToast'));
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (Array.isArray(data)) {
          // We pass the event up through a custom event
          window.dispatchEvent(new CustomEvent('kotoba-import', { detail: data }));
          showToast(t('importedToast', data.length));
        }
      } catch {
        showToast(t('importError'));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="dictionary">
      <div className="dictionary__toolbar">
        <div className="dictionary__search-wrap">
          <span className="dictionary__search-icon">🔍</span>
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t('searchPh')}
            className="dictionary__search-input"
          />
        </div>
        <div className="dictionary__actions">
          <button onClick={handleExport} className="btn btn--ghost btn--sm">{t('exportBtn')}</button>
          <label className="btn btn--ghost btn--sm" style={{ cursor: 'pointer' }}>
            {t('importBtn')}
            <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
          </label>
          <button onClick={onOpenAdd} className="btn btn--primary btn--sm">{t('addWordBtn')}</button>
        </div>
      </div>

      <div className="dictionary__table-wrap">
        <table className="dictionary__table">
          <thead>
            <tr>
              <th className="dict-th--star">★</th>
              <th>{t('dictThJp')}</th>
              <th>{t('dictThTrans')}</th>
              <th>{t('dictThTranslation')}</th>
              <th className="dict-th--lesson">{t('dictThLesson')}</th>
              <th className="dict-th--actions">{t('dictThActions')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="6" className="dictionary__empty">
                  {t('dictEmpty')}
                </td>
              </tr>
            ) : filtered.map(item => {
              const displayJp = getDisplayJp(item, isKanjiMode);
              const showKana = hasKanjiDistinction(item, isKanjiMode);
              return (
                <tr key={item.id} className="dictionary__row">
                  <td className="dict-td--star">
                    <button onClick={() => onToggleStar(item.id)}
                      className={`star-btn ${item.starred ? 'star-btn--active' : ''}`}>★</button>
                  </td>
                  <td className="dict-td--jp">
                    <span className="font-jp">{displayJp}</span>
                    {showKana && <span className="dict-kana-badge font-jp">{item.kana}</span>}
                    <button onClick={() => speakJapanese(item.kana)}
                      className="dict-speak-btn" title={t('listen')}>🔊</button>
                  </td>
                  <td className="dict-td--trans">{item.transcription}</td>
                  <td className="dict-td--translation">{item.translation}</td>
                  <td>
                    <span className={`lesson-badge ${item.lesson === 'custom' ? 'lesson-badge--custom' : ''}`}>
                      {getLessonShortLabel(item.lesson, localStorage.getItem('kotoba_lang') || 'uk')}
                    </span>
                  </td>
                  <td className="dict-td--actions">
                    <button onClick={() => onDelete(item.id)} className="delete-btn" title={t('delete')}>🗑</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
