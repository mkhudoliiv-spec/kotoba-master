/** Speak Japanese text using browser TTS */
export function speakJapanese(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ja-JP';
  utterance.rate = 0.9;
  const voices = window.speechSynthesis.getVoices();
  const jaVoice = voices.find(v => v.lang.startsWith('ja'));
  if (jaVoice) utterance.voice = jaVoice;
  window.speechSynthesis.speak(utterance);
}

/** Normalize text for comparison in write mode */
export function normalizeText(str) {
  return (str || '').toLowerCase().replace(/[\s\-_—–()[\]]/g, '').trim();
}

/** Shuffle an array (Fisher-Yates) */
export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Get display text for a word based on kanji mode */
export function getDisplayJp(word, isKanjiMode) {
  return (isKanjiMode && word.kanji) ? word.kanji : word.kana;
}

/** Check if kanji differs from kana */
export function hasKanjiDistinction(word, isKanjiMode) {
  return isKanjiMode && word.kanji && word.kanji !== word.kana;
}

/** Generate lesson metadata from vocabulary data */
export function getLessonsMeta(words) {
  const lessons = new Map();
  words.forEach(w => {
    const key = String(w.lesson);
    if (!lessons.has(key)) {
      lessons.set(key, { id: key, count: 0 });
    }
    lessons.get(key).count++;
  });
  return lessons;
}

/** Lesson labels in Ukrainian */
export const LESSON_LABELS = {
  '2': 'Привітання & Кольори',
  '3': 'Самопочуття',
  '4': 'Катакана 1',
  '5': 'Катакана 2',
  '6': 'Знайомство',
  '7': 'Країни & Цифри',
  '9': 'Предмети',
  '10': 'Вирази & Числа 1–3',
  '11': 'Місця & Числа 4–6',
  'custom': 'Власні слова',
};

export function getLessonLabel(lesson) {
  const key = String(lesson);
  if (key === 'custom') return 'Власні слова';
  const label = LESSON_LABELS[key];
  return label ? `Урок ${key}: ${label}` : `Урок ${key}`;
}

export function getLessonShortLabel(lesson) {
  const key = String(lesson);
  return key === 'custom' ? 'Власне' : `Урок ${key}`;
}
