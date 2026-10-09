// Spaced repetition (Leitner boxes) helpers.
// word.srs = { box, due, lapses, reviews, last }

const DAY = 24 * 60 * 60 * 1000;

// Review interval per box. Box 0 = "don't know yet" → due immediately.
export const BOX_INTERVALS = [0, 1 * DAY, 3 * DAY, 7 * DAY, 14 * DAY, 30 * DAY];
export const MAX_BOX = BOX_INTERVALS.length - 1;

// Max number of brand-new words introduced per smart session
export const NEW_PER_SESSION = 15;

export function reviewSrs(word, known, now = Date.now()) {
  const prev = word.srs || { box: 0, lapses: 0, reviews: 0, due: 0 };
  if (known) {
    const box = Math.min(prev.box + 1, MAX_BOX);
    return { ...prev, box, due: now + BOX_INTERVALS[box], reviews: prev.reviews + 1, last: now };
  }
  return { ...prev, box: 0, due: now, lapses: prev.lapses + 1, reviews: prev.reviews + 1, last: now };
}

export const isNewWord = (w) => !w.srs;
export const isDueWord = (w, now = Date.now()) => !!w.srs && w.srs.due <= now;
// "Hard" = the user pressed "don't know" and still hasn't climbed out of the low boxes
export const isHardWord = (w) => !!w.srs && w.srs.lapses > 0 && w.srs.box <= 2;

export function getSmartQueue(words, now = Date.now()) {
  const due = words
    .filter(w => isDueWord(w, now))
    .sort((a, b) => (b.srs.lapses - a.srs.lapses) || (a.srs.due - b.srs.due));
  const fresh = words.filter(isNewWord).slice(0, NEW_PER_SESSION);
  return [...due, ...fresh];
}

export function getHardQueue(words) {
  return words
    .filter(isHardWord)
    .sort((a, b) => (b.srs.lapses - a.srs.lapses) || (a.srs.box - b.srs.box));
}

export function getSrsCounts(words, now = Date.now()) {
  const dueCount = words.filter(w => isDueWord(w, now)).length;
  const newCount = Math.min(words.filter(isNewWord).length, NEW_PER_SESSION);
  return {
    smart: dueCount + newCount,
    hard: words.filter(isHardWord).length,
  };
}

export function buildDeck(words, mode) {
  if (mode === 'smart') return getSmartQueue(words);
  if (mode === 'hard') return getHardQueue(words);
  return words;
}
