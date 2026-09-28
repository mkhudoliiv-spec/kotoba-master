# Kotoba Master — React App

## Структура проєкту

```
kotoba-master/
├── public/
│   └── data/
│       └── vocabulary.json      ← JSON з усіма словами (легко додавати!)
├── src/
│   ├── components/
│   │   ├── Flashcards.jsx       ← Режим карток (3D переворот, свайп)
│   │   ├── Quiz.jsx             ← Тест (multiple choice)
│   │   ├── WriteMode.jsx        ← Письмо (ввід японською)
│   │   ├── MatchGame.jsx        ← Гра "Знайди пару" з таймером
│   │   ├── Dictionary.jsx       ← Словник (пошук, експорт/імпорт)
│   │   ├── AddWordModal.jsx     ← Модалка додавання нового слова
│   │   └── Toast.jsx            ← Повідомлення
│   ├── hooks/
│   │   └── useVocabulary.js     ← Хук для роботи зі словами + localStorage
│   ├── utils/
│   │   └── helpers.js           ← Утиліти (TTS, shuffle, labels)
│   ├── App.jsx                  ← Головний компонент
│   ├── index.css                ← Повна CSS дизайн-система
│   └── main.jsx                 ← Точка входу
└── index.html
```

## Як додавати нові слова через JSON

Відкрийте файл `public/data/vocabulary.json` і додайте новий об'єкт:

```json
{
  "id": "u8_1",
  "lesson": 8,
  "kana": "ありがとう",
  "kanji": "有難う",
  "romaji": "arigatou",
  "transcription": "аріґато:",
  "translation": "дякую"
}
```

### Формат кожного слова:

| Поле           | Обов'язкове | Опис                          |
|----------------|:-----------:|-------------------------------|
| `id`           | Так         | Унікальний ID (напр. u8_1)    |
| `lesson`       | Так         | Номер уроку або "custom"      |
| `kana`         | Так         | Хіраґана/Катакана             |
| `kanji`        | Ні          | Ієрогліфи (якщо є)           |
| `romaji`       | Ні          | Латинська транслітерація      |
| `transcription`| Так         | Українська транскрипція       |
| `translation`  | Так         | Переклад українською          |

## Запуск

```bash
cd kotoba-master
npm install
npm run dev
```

Додаток відкриється на http://localhost:5173/
