import { useState, useEffect } from 'react';

export const dictionary = {
  // Flashcards
  'emptyFilterTitle': { uk: 'Немає слів у фільтрі', en: 'No words in filter' },
  'emptyFilterSub': { uk: 'Спробуйте обрати інший урок або скинути фільтр зірочок', en: 'Try choosing another lesson or reset the star filter' },
  'wordCounter': { uk: (i, t) => `Слово ${i} з ${t}`, en: (i, t) => `Word ${i} of ${t}` },
  'questionCounter': { uk: (i, t) => `Питання ${i} з ${t}`, en: (i, t) => `Question ${i} of ${t}` },
  'jpFirst': { uk: 'Японська спочатку', en: 'Japanese first' },
  'ukFirst': { uk: 'Українська спочатку', en: 'Native first' },
  'mixFirst': { uk: 'Змішано', en: 'Mixed' },
  'studyAll': { uk: 'Усі слова', en: 'All words' },
  'studySmart': { uk: n => `🧠 Розумне повторення (${n})`, en: n => `🧠 Smart review (${n})` },
  'studyHard': { uk: n => `🔥 Складні (${n})`, en: n => `🔥 Hard words (${n})` },
  'smartDoneTitle': { uk: '🎉 На зараз усе повторено!', en: '🎉 All reviewed for now!' },
  'smartDoneSub': { uk: 'Нові слова та слова для повторення з\'являться пізніше. Можна пройти всі слова.', en: 'New and due words will appear later. You can go through all words.' },
  'hardDoneTitle': { uk: '💪 Складних слів немає', en: '💪 No hard words' },
  'hardDoneSub': { uk: 'Натискайте «Не знаю» на картках — такі слова збиратимуться тут.', en: 'Press "Don\'t know" on cards — such words will be collected here.' },
  'srsInfo': { uk: 'Слова з «Не знаю» повторюються частіше, а «Знаю» — рідше', en: '"Don\'t know" words repeat more often, "Know" words less' },
  'shuffle': { uk: 'Перемішати', en: 'Shuffle' },
  'shuffledToast': { uk: 'Слова перемішано!', en: 'Words shuffled!' },
  'customWord': { uk: 'Власне слово', en: 'Custom Word' },
  'lessonTitle': { uk: l => `Урок ${l}`, en: l => `Lesson ${l}` },
  'pronunciation': { uk: 'Прослухати вимову', en: 'Listen pronunciation' },
  'addFavorite': { uk: 'Додати в улюблені', en: 'Add to favorites' },
  'jpEqOnBack': { uk: 'Японський еквівалент на звороті', en: 'Japanese equivalent on back' },
  'tapFlip': { uk: 'Торкніться для перевороту • Свайп ↔', en: 'Tap to flip • Swipe ↔' },
  'clickFlip': { uk: 'Клацніть або натисніть', en: 'Click or press' },
  'spacebar': { uk: 'Пробіл', en: 'Space' },
  'translation': { uk: 'Переклад', en: 'Translation' },
  'clickSwipeBack': { uk: 'Клацніть або проведіть, щоб повернутися', en: 'Click or swipe to return' },
  'repeatAgain': { uk: '✗ Не знаю', en: '✗ Don\'t know' },
  'prev': { uk: 'Попереднє', en: 'Previous' },
  'flip': { uk: 'Перевернути', en: 'Flip' },
  'next': { uk: 'Наступне', en: 'Next' },
  'iKnowThis': { uk: '✓ Знаю', en: '✓ I know' },
  'kbHint': { uk: 'Підказка: клавіші', en: 'Hint: keys' },
  'kbArrows': { uk: 'для гортання', en: 'for navigation' },
  'kbFlip': { uk: 'для перевороту', en: 'to flip' },

  // Quiz
  'score': { uk: 'Бали:', en: 'Score:' },
  'chooseTranslation': { uk: 'Оберіть правильний переклад', en: 'Choose the correct translation' },
  'pronounceBtn': { uk: '🔊 Вимова', en: '🔊 Audio' },
  'correctNice': { uk: '✓ Правильно! Чудова робота.', en: '✓ Correct! Great job.' },
  'wrongWait': { uk: a => `✗ Не зовсім. Правильна відповідь: ${a}`, en: a => `✗ Not quite. Correct answer: ${a}` },
  'nextBtn': { uk: 'Далі →', en: 'Next →' },
  'quizDone': { uk: 'Тест завершено!', en: 'Quiz completed!' },
  'quizResult': { uk: 'Ваш результат у поточному наборі слів:', en: 'Your score for the current set:' },
  'playAgain': { uk: 'Пройти ще раз', en: 'Take again' },
  'restart': { uk: '↻ Перезапустити', en: '↻ Restart' },

  // WriteMode
  'correctStr': { uk: 'Вірно:', en: 'Correct:' },
  'writePromptBadge': { uk: 'Напишіть японською або транскрипцією', en: 'Write in Japanese or Romaji' },
  'writeInputPlaceholder': { uk: 'Введіть каною, ромадзі або транскрипцією...', en: 'Enter in Kana, Romaji or transcription...' },
  'hintBtn': { uk: '💡 Підказка', en: '💡 Hint' },
  'checkBtn': { uk: 'Перевірити', en: 'Check' },
  'hintText': { uk: (t, f) => `Підказка: ${t} • Перша літера: ${f}`, en: (t, f) => `Hint: ${t} • First letter: ${f}` },
  'flawless': { uk: '✓ Бездоганно!', en: '✓ Flawless!' },
  'needToRemember': { uk: '✗ Потрібно запам\'ятати', en: '✗ Need to remember' },
  'writeFeedbackDetail': { uk: (k, kj, t) => `Кана: ${k} | Канджі: ${kj} | Транскрипція: ${t}`, en: (k, kj, t) => `Kana: ${k} | Kanji: ${kj} | Romaji: ${t}` },
  'writeDone': { uk: 'Сесія письма завершена!', en: 'Writing session completed!' },
  'writeDoneSub': { uk: 'Ви чудово попрацювали над написанням слів.', en: 'You did great practicing your writing.' },
  'trainAgain': { uk: 'Тренувати знову', en: 'Train again' },

  // MatchGame
  'gameTimer': { uk: 'Таймер гри', en: 'Game timer' },
  'matchHint': { uk: 'З\'єднайте японське слово з перекладом', en: 'Match Japanese word with its translation' },
  'matchWinTitle': { uk: 'Чудовий результат!', en: 'Great result!' },
  'matchWinSub': { uk: 'Ви знайшли всі пари за час:', en: 'You found all pairs in time:' },

  // Dictionary
  'searchPh': { uk: 'Швидкий пошук (канджі, кана, переклад, транскрипція)...', en: 'Quick search (kanji, kana, translation, romaji)...' },
  'exportBtn': { uk: '⬇ Експорт', en: '⬇ Export' },
  'importBtn': { uk: '⬆ Імпорт', en: '⬆ Import' },
  'addWordBtn': { uk: '+ Додати слово', en: '+ Add word' },
  'dictThJp': { uk: 'Японська (Кана / Канджі)', en: 'Japanese (Kana / Kanji)' },
  'dictThTrans': { uk: 'Транскрипція', en: 'Romaji' },
  'dictThTranslation': { uk: 'Переклад українською', en: 'Translation' },
  'dictThLesson': { uk: 'Урок', en: 'Lesson' },
  'dictThActions': { uk: 'Дії', en: 'Actions' },
  'dictEmpty': { uk: 'Слів не знайдено за заданими критеріями', en: 'No words found matching the criteria' },
  'listen': { uk: 'Слухати', en: 'Listen' },
  'delete': { uk: 'Видалити', en: 'Delete' },
  'exportedToast': { uk: 'Словник експортовано в JSON!', en: 'Dictionary exported to JSON!' },
  'importedToast': { uk: n => `Імпортовано ${n} слів!`, en: n => `Imported ${n} words!` },
  'importError': { uk: 'Помилка читання JSON-файлу', en: 'Error reading JSON file' },

  // App & AddWordModal
  'loading': { uk: 'Завантаження словника...', en: 'Loading dictionary...' },
  'addWordModalTitle': { uk: 'Додати нове слово', en: 'Add new word' },
  'addWordModalSub': { uk: 'Слово одразу додасться до всіх режимів навчання', en: 'The word will be immediately available in all modes' },
  'kanaLabel': { uk: 'Кана (Хіраґана/Катакана) *', en: 'Kana (Hiragana/Katakana) *' },
  'kanjiLabel': { uk: 'Канджі (якщо є)', en: 'Kanji (if any)' },
  'transLabel': { uk: 'Транскрипція українською *', en: 'Romaji or Native transcription *' },
  'translationLabel': { uk: 'Переклад українською *', en: 'Native translation *' },
  'lessonLabel': { uk: 'Урок або категорія', en: 'Lesson or Category' },
  'romajiLabel': { uk: 'Ромадзі (опціонально)', en: 'Romaji (optional)' },
  'cancelBtn': { uk: 'Скасувати', en: 'Cancel' },
  'saveWordBtn': { uk: 'Зберегти слово', en: 'Save word' },
  'wordAddedToast': { uk: w => `Слово «${w}» додано!`, en: w => `Word "${w}" added!` },
  'wordDeletedToast': { uk: 'Слово видалено', en: 'Word deleted' },
  'allLessons': { uk: n => `Всі (${n})`, en: n => `All (${n})` },
  'quickSelect': { uk: '⚡ Швидкий вибір', en: '⚡ Quick select' },
  'rangeFrom': { uk: 'Уроки від', en: 'Lessons from' },
  'rangeTo': { uk: 'до', en: 'to' },
  'applyRange': { uk: 'Обрати', en: 'Select' },
  'invertSel': { uk: '⇄ Інвертувати', en: '⇄ Invert' },
  'selectedCount': { uk: n => `Обрано уроків: ${n}`, en: n => `Lessons selected: ${n}` },
  'learned': { uk: 'Вивчено:', en: 'Mastered:' },
  'starsCount': { uk: n => `★ Зірочки (${n})`, en: n => `★ Stars (${n})` },
  'kanjiMode': { uk: k => `Канджі: ${k ? 'Вкл' : 'Викл'}`, en: k => `Kanji: ${k ? 'On' : 'Off'}` },
  'addWordHead': { uk: 'Додати слово', en: 'Add word' }
};

export function useTranslation() {
  return function t(key, ...args) {
    const translation = dictionary[key]?.['uk'] || key;
    if (typeof translation === 'function') {
      return translation(...args);
    }
    return translation;
  };
}

export function setLanguage(lang) {
  localStorage.setItem('kotoba_lang', lang);
  window.dispatchEvent(new Event('lang-change'));
}
