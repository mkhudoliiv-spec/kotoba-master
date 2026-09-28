import { useState, useEffect, useRef } from 'react';
import { normalizeText, shuffle } from '../utils/helpers';
import { useTranslation } from '../utils/i18n';

export default function WriteMode({ words, allWords }) {
  const [queue, setQueue] = useState([]);
  const [qIndex, setQIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState(null); // null | { ok, item }
  const [hintVisible, setHintVisible] = useState(false);
  const [finished, setFinished] = useState(false);
  const inputRef = useRef(null);
  const t = useTranslation();

  const start = () => {
    const pool = words.length > 0 ? words : allWords;
    setQueue(shuffle(pool).slice(0, 10));
    setQIndex(0);
    setCorrect(0);
    setInput('');
    setFeedback(null);
    setHintVisible(false);
    setFinished(false);
  };

  useEffect(() => { start(); }, [words]);

  useEffect(() => {
    if (!feedback && inputRef.current) inputRef.current.focus();
  }, [qIndex, feedback]);

  if (queue.length === 0) return null;

  const item = queue[qIndex];
  const total = queue.length;
  const pct = ((qIndex + 1) / total) * 100;

  const handleSubmit = (e) => {
    e.preventDefault();
    const val = normalizeText(input);
    if (!val) return;
    const validAnswers = [
      normalizeText(item.kana),
      normalizeText(item.kanji),
      normalizeText(item.transcription),
      normalizeText(item.romaji)
    ];
    const ok = validAnswers.some(ans => ans && (ans === val || val.includes(ans) || ans.includes(val)));
    if (ok) setCorrect(c => c + 1);
    setFeedback({ ok, item });
  };

  const handleNext = () => {
    if (qIndex + 1 < total) {
      setQIndex(i => i + 1);
      setInput('');
      setFeedback(null);
      setHintVisible(false);
    } else {
      setFinished(true);
    }
  };

  if (finished) {
    return (
      <div className="quiz-results">
        <div className="quiz-results__emoji">✍️</div>
        <h3 className="quiz-results__title">{t('writeDone')}</h3>
        <p className="quiz-results__sub">{t('writeDoneSub')}</p>
        <div className="quiz-results__actions">
          <button onClick={start} className="btn btn--primary">{t('trainAgain')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="write-mode">
      <div className="mode-topbar">
        <div>
          <span>{t('wordCounter', qIndex + 1, total)}</span>
          <span style={{ marginLeft: '1rem' }}>{t('correctStr')} <strong className="text-success">{correct}</strong></span>
        </div>
        <button onClick={start} className="btn btn--ghost btn--sm">{t('restart')}</button>
      </div>
      <div className="progress-bar">
        <div className="progress-bar__fill" style={{ width: `${pct}%` }} />
      </div>

      <div className="write-card">
        <span className="flashcard__badge">{t('writePromptBadge')}</span>
        <div className="write-card__prompt">{item.translation}</div>

        <form onSubmit={handleSubmit} className="write-card__form">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={!!feedback}
            placeholder={t('writeInputPlaceholder')}
            className="write-card__input font-jp"
            autoComplete="off"
          />
          <div className="write-card__btns">
            <button type="button" className="btn btn--ghost btn--sm"
              onClick={() => setHintVisible(true)}>
              {t('hintBtn')}
            </button>
            <button type="submit" className="btn btn--primary btn--sm" disabled={!!feedback}>
              {t('checkBtn')}
            </button>
          </div>
        </form>

        {hintVisible && (
          <div className="write-card__hint">
            {t('hintText', item.transcription, item.kana.charAt(0))}
          </div>
        )}
      </div>

      {feedback && (
        <div className={`write-feedback ${feedback.ok ? 'write-feedback--ok' : 'write-feedback--err'}`}>
          <div>
            <p className="write-feedback__title">
              {feedback.ok ? t('flawless') : t('needToRemember')}
            </p>
            <p className="write-feedback__detail font-jp">
              {t('writeFeedbackDetail', item.kana, item.kanji || '-', item.transcription)}
            </p>
          </div>
          <button onClick={handleNext} className="btn btn--dark btn--sm">{t('nextBtn')}</button>
        </div>
      )}
    </div>
  );
}
