import { useState, useEffect } from 'react';
import { speakJapanese, getDisplayJp, shuffle } from '../utils/helpers';
import { useTranslation } from '../utils/i18n';

export default function Quiz({ words, allWords, isKanjiMode }) {
  const [questions, setQuestions] = useState([]);
  const [qIndex, setQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(null); // null | 'correct' | 'wrong'
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [options, setOptions] = useState([]);
  const [finished, setFinished] = useState(false);
  const t = useTranslation();

  const startQuiz = () => {
    const source = words.length >= 4 ? words : allWords;
    const q = shuffle(source).slice(0, 10);
    setQuestions(q);
    setQIndex(0);
    setScore(0);
    setAnswered(null);
    setSelectedIdx(null);
    setFinished(false);
  };

  useEffect(() => { startQuiz(); }, [words]);

  useEffect(() => {
    if (questions.length === 0) return;
    const q = questions[qIndex];
    const pool = allWords.filter(w => w.id !== q.id);
    const distractors = shuffle(pool).slice(0, 3);
    setOptions(shuffle([q, ...distractors]));
    setAnswered(null);
    setSelectedIdx(null);
  }, [qIndex, questions]);

  if (questions.length === 0) return null;

  const q = questions[qIndex];
  const total = questions.length;
  const pct = ((qIndex + 1) / total) * 100;
  const displayJp = getDisplayJp(q, isKanjiMode);

  const handleAnswer = (opt, idx) => {
    if (answered) return;
    setSelectedIdx(idx);
    if (opt.id === q.id) {
      setAnswered('correct');
      setScore(s => s + 1);
    } else {
      setAnswered('wrong');
    }
  };

  const handleNext = () => {
    if (qIndex + 1 < total) {
      setQIndex(i => i + 1);
    } else {
      setFinished(true);
    }
  };

  if (finished) {
    return (
      <div className="quiz-results">
        <div className="quiz-results__emoji">🎉</div>
        <h3 className="quiz-results__title">{t('quizDone')}</h3>
        <p className="quiz-results__sub">{t('quizResult')}</p>
        <div className="quiz-results__score">
          <span className="quiz-results__score-val">{score}</span> / {total}
        </div>
        <div className="quiz-results__actions">
          <button onClick={startQuiz} className="btn btn--primary">{t('playAgain')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz">
      <div className="mode-topbar">
        <div>
          <span>{t('questionCounter', qIndex + 1, total)}</span>
          <span style={{ marginLeft: '1rem' }}>{t('score')} <strong className="text-accent">{score}</strong></span>
        </div>
        <button onClick={startQuiz} className="btn btn--ghost btn--sm">{t('restart')}</button>
      </div>
      <div className="progress-bar">
        <div className="progress-bar__fill" style={{ width: `${pct}%` }} />
      </div>

      <div className="quiz-question-card">
        <span className="flashcard__badge">{t('chooseTranslation')}</span>
        <div className="quiz-question-card__body">
          <div className="quiz-question-card__text font-jp">{displayJp}</div>
          <div className="quiz-question-card__sub">{q.transcription}</div>
        </div>
        <button onClick={() => speakJapanese(q.kana)} className="btn btn--ghost btn--sm">
          {t('pronounceBtn')}
        </button>
      </div>

      <div className="quiz-options">
        {options.map((opt, idx) => {
          let cls = 'quiz-option';
          if (answered && idx === selectedIdx) {
            cls += answered === 'correct' ? ' quiz-option--correct' : ' quiz-option--wrong';
          }
          return (
            <button key={opt.id + idx} className={cls}
              onClick={() => handleAnswer(opt, idx)} disabled={!!answered}>
              <span>{opt.translation}</span>
              <span className="quiz-option__dot" />
            </button>
          );
        })}
      </div>

      {answered && (
        <div className={`quiz-feedback ${answered === 'correct' ? 'quiz-feedback--correct' : 'quiz-feedback--wrong'}`}>
          <span>{answered === 'correct'
            ? t('correctNice')
            : t('wrongWait', q.translation)
          }</span>
          <button onClick={handleNext} className="btn btn--dark btn--sm">{t('nextBtn')}</button>
        </div>
      )}
    </div>
  );
}
