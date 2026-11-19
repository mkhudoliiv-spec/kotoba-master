import { useState } from 'react';
import Quiz from './Quiz';
import WriteMode from './WriteMode';
import MatchGame from './MatchGame';

// "Вправи": one tab for all word exercises over the filtered word list.
// Add a format here (id, label, icon, hint, render) to get a new exercise.

const FORMAT_KEY = 'kotoba_practice_format';

const FORMATS = [
  { id: 'quiz', label: 'Тест', icon: '✅', hint: 'Обери правильний переклад',
    render: p => <Quiz words={p.words} allWords={p.allWords} isKanjiMode={p.isKanjiMode} /> },
  { id: 'write', label: 'Письмо', icon: '✏️', hint: 'Напиши слово японською',
    render: p => <WriteMode words={p.words} allWords={p.allWords} /> },
  { id: 'match', label: 'Пари', icon: '🧩', hint: 'Знайди пари на час',
    render: p => <MatchGame words={p.words} allWords={p.allWords} isKanjiMode={p.isKanjiMode} /> },
];

function readFormat() {
  try {
    const v = localStorage.getItem(FORMAT_KEY);
    return FORMATS.some(f => f.id === v) ? v : FORMATS[0].id;
  } catch {
    return FORMATS[0].id;
  }
}

export default function Practice({ words, allWords, isKanjiMode }) {
  const [format, setFormat] = useState(readFormat);
  const current = FORMATS.find(f => f.id === format);

  const choose = (id) => {
    setFormat(id);
    try { localStorage.setItem(FORMAT_KEY, id); } catch { /* storage unavailable */ }
  };

  return (
    <div className="practice">
      <nav className="practice-formats" role="tablist" aria-label="Формат вправи">
        {FORMATS.map(f => (
          <button key={f.id} role="tab" aria-selected={format === f.id}
            className={`practice-format ${format === f.id ? 'practice-format--active' : ''}`}
            onClick={() => choose(f.id)}>
            <span className="practice-format__icon" aria-hidden="true">{f.icon}</span>
            <span className="practice-format__text">
              <span className="practice-format__label">{f.label}</span>
              <span className="practice-format__hint">{f.hint}</span>
            </span>
          </button>
        ))}
      </nav>
      {/* key: switching formats starts the exercise afresh */}
      <div key={format}>{current.render({ words, allWords, isKanjiMode })}</div>
    </div>
  );
}
