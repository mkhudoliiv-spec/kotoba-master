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

/** Punctuation / spacing ignored when comparing Japanese answers */
const JP_IGNORE_RE = /[\s、。，．,.!?！？・〜~「」『』"'`]/g;

/** Only hiragana, katakana, kanji, ー and 々 are allowed */
const JP_ONLY_RE = /^[\u3040-\u309F\u30A0-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\u3005]+$/;

/** Normalize Japanese text: full/half-width unify (NFKC) and strip punctuation */
function normalizeJp(str) {
  return (str || '').normalize('NFKC').replace(JP_IGNORE_RE, '');
}

/**
 * Build accepted variants for an answer like "はいいろ(の)":
 * with the optional part ("はいいろの") and without it ("はいいろ").
 */
function jpVariants(str) {
  if (!str) return [];
  const s = str.normalize('NFKC');
  const withOpt = normalizeJp(s.replace(/[()[\]]/g, ''));
  const withoutOpt = normalizeJp(s.replace(/\([^)]*\)|\[[^\]]*\]/g, ''));
  return [withOpt, withoutOpt].filter(Boolean);
}

/**
 * Strict check for write mode: the answer must be written in Japanese
 * (kana / kanji) and match the kana or kanji form exactly.
 */
export function checkJapaneseAnswer(input, item) {
  const val = normalizeJp(input);
  if (!val || !JP_ONLY_RE.test(val)) return false;
  const valid = [...jpVariants(item.kana), ...jpVariants(item.kanji)];
  return valid.includes(val);
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
