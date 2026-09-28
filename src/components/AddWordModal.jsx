import { useState, useRef, useEffect } from 'react';
import { useTranslation } from '../utils/i18n';

export default function AddWordModal({ isOpen, onClose, onSave, lessonKeys = [] }) {
  const [form, setForm] = useState({
    kana: '', kanji: '', transcription: '', translation: '', lesson: 'custom', romaji: ''
  });
  const t = useTranslation();
  const kanaRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => kanaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const processSubmit = () => {
    let parsedLesson = form.lesson.trim();
    if (/^\d+$/.test(parsedLesson)) {
      parsedLesson = Number(parsedLesson);
    } else if (!parsedLesson) {
      parsedLesson = 'custom';
    }

    const newWord = {
      id: 'user_' + Date.now() + Math.floor(Math.random() * 1000),
      lesson: parsedLesson,
      kana: form.kana.trim(),
      kanji: (form.kanji || form.kana).trim(),
      transcription: form.transcription.trim().startsWith('[') ? form.transcription.trim() : `[${form.transcription.trim()}]`,
      translation: form.translation.trim(),
      romaji: form.romaji.trim(),
      mastered: false,
      starred: false,
    };
    onSave(newWord);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    processSubmit();
    setForm({ kana: '', kanji: '', transcription: '', translation: '', lesson: form.lesson, romaji: '' });
    onClose();
  };

  const handleSaveAndAddAnother = (e) => {
    e.preventDefault();
    processSubmit();
    setForm({ kana: '', kanji: '', transcription: '', translation: '', lesson: form.lesson, romaji: '' });
    kanaRef.current?.focus();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">{t('addWordModalTitle')}</h3>
            <p className="modal-subtitle">{t('addWordModalSub')}</p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-row">
            <div className="form-group">
              <label>{t('kanaLabel')}</label>
              <input name="kana" value={form.kana} onChange={handleChange} required ref={kanaRef}
                placeholder="напр., ともだち" className="input-jp" />
            </div>
            <div className="form-group">
              <label>{t('kanjiLabel')}</label>
              <input name="kanji" value={form.kanji} onChange={handleChange}
                placeholder="напр., 友達" className="input-jp" />
            </div>
          </div>

          <div className="form-group">
            <label>{t('transLabel')}</label>
            <input name="transcription" value={form.transcription} onChange={handleChange} required
              placeholder="[томодачі]" />
          </div>

          <div className="form-group">
            <label>{t('translationLabel')}</label>
            <input name="translation" value={form.translation} onChange={handleChange} required
              placeholder="друг, товариш" />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Урок або категорія (можна ввести свій)</label>
              <input name="lesson" value={form.lesson} onChange={handleChange} list="lesson-list" />
              <datalist id="lesson-list">
                {lessonKeys.map(lk => (
                  <option key={lk} value={lk}>{lk === 'custom' ? t('customWord') : t('lesson', lk)}</option>
                ))}
              </datalist>
            </div>
            <div className="form-group">
              <label>{t('romajiLabel')}</label>
              <input name="romaji" value={form.romaji} onChange={handleChange}
                placeholder="tomodachi" />
            </div>
          </div>

          <div className="modal-actions" style={{ justifyContent: 'flex-end', gap: '0.5rem', display: 'flex' }}>
            <button type="button" className="btn btn--ghost" onClick={onClose}>{t('cancelBtn')}</button>
            <button type="button" className="btn btn--dark" onClick={handleSaveAndAddAnother}>Зберегти та додати ще</button>
            <button type="submit" className="btn btn--primary">{t('saveWordBtn')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
