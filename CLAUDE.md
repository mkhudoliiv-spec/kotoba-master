# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Kotoba Master is a client-only React 19 + Vite app for studying Japanese vocabulary and grammar, aimed at Ukrainian speakers (UI text, translations and transcriptions are Ukrainian). There is no backend: content is static JSON in `public/data/`, and all user progress lives in `localStorage`.

## Commands

```bash
npm install
npm run dev       # Vite dev server
npm run build     # production build to dist/
npm run preview   # serve dist/
npm run lint      # oxlint (config: .oxlintrc.json — react + oxc plugins)
npm run deploy    # builds, then publishes dist/ to GitHub Pages via gh-pages
```

There is no test suite.

## Architecture

- **`src/App.jsx`** holds the shell: mode tabs (`cards`, `quiz`, `write`, `match`, `list`, `grammar`, `kanji`), lesson multi-select / range quick-select, star filter and kanji toggle. It computes the `filtered` word list and passes it to the mode components, which get all their data from props.
- **`src/hooks/useVocabulary.js`** loads `vocabulary.json` and merges it with `localStorage['kotoba_master_words']`. User state per word (`mastered`, `starred`, `srs`) is copied by `id` onto the JSON entries. Stored words whose `id` isn't in the JSON are kept as custom or imported words. The whole word array is written back to storage on every change. **Word `id`s must stay stable**: changing one drops that word's progress and turns the old stored entry into a custom word.
- **`src/hooks/useGrammar.js`** loads `grammar.json`, which `Grammar.jsx` renders.
- **`src/hooks/useKanji.js`** loads `kanji.json` for the Kanji section (`KanjiSection.jsx`: one flat kanji grid with no JLPT level split — all N5 kanji, then the N4/N3 ones, numbered by position; `KanjiCard.jsx`, reading rules, trainers, printable A4 worksheets in `KanjiPrintWorksheet.jsx`). Kanji progress is stored in `localStorage['kotoba_jlpt_progress']` (the key predates the section rename — keep it). Old JLPT-word progress in that key is picked up by `useVocabulary` for `jlpt_w_*` ids.
- The hooks fetch from several candidate paths (`/kotoba-master/data/...`, `./data/...`, `/data/...`) so the app works under the GitHub Pages subpath and locally. `vite.config.js` uses `base: './'`.
- **`src/utils/srs.js`** implements spaced repetition with Leitner boxes (`BOX_INTERVALS`). It decides which words go into the smart-review queue (due words + up to `NEW_PER_SESSION` new ones) and the "hard words" queue. Flashcards call `reviewWord(id, known)`.
- **`src/utils/helpers.js`** has TTS (`speakJapanese`, browser `ja-JP` speech synthesis), the strict answer check for write mode (`checkJapaneseAnswer`: the answer must be Japanese script; it accepts `/`-separated alternatives and optional `(...)` parts from `kana`/`kanji`), and `LESSON_LABELS`.
- **`src/utils/i18n.js`** is a `{ key: { uk, en } }` dictionary. Values can be strings or functions that take arguments. `t()` currently always returns `uk`. Some components still hardcode Ukrainian strings.
- Importing from the Dictionary goes through a `window` `CustomEvent('kotoba-import')`, which App listens for.
- Styling is a single hand-written design system in `src/index.css` (no CSS framework).

## Content data

### `public/data/vocabulary.json`
A flat array of `{ id, lesson, kana, kanji?, romaji?, transcription, translation }`. IDs follow `u<lesson>_<n>`. `lesson` is a number, `"custom"`, or a JLPT level (`"N5"`, `"N4"`, `"N3"`) for the JLPT word lists, whose ids are `jlpt_w_<level>_<word>`.

### `public/data/grammar.json`
`{ categories: [{id, title, icon, color}], topics: [...] }`. Each topic has `id`, `category`, `lessons: [n]`, `pattern`, `title`, `summary`, `blocks`. Block types:
- `heading` / `text` / `tip` / `warn` — `{ text }`
- `formula` — `{ text, meaning? }`
- `examples` — `{ items: [{ jp, tr?, uk }] }`
- `table` — `{ head: [], rows: [[]] }`

Text fields support `**highlight**` markup; use `
` for line breaks (table cells render `white-space: pre-line`, raw `<br/>` would show as text). JLPT grammar topics use categories `jlpt-n5` / `jlpt-n4` / `jlpt-n3` and `lessons: []`.

### `public/data/kanji.json`
`{ levels: [{id, title, description, totalKanji}], kanji: [...], rules: [...] }`. Kanji ids are `jlpt_k_<codepoint hex>`. `scripts/fetch-jlpt-data.mjs` and `scripts/build-jlpt-n5.mjs` generate/extend it (and JLPT words into `vocabulary.json`).

### Adding a new lesson
Recent commits follow this pattern:
1. Append words to `vocabulary.json`.
2. Append topics to `grammar.json` (including a `kanji-…` topic for the lesson's kanji).
3. Add the lesson's label to `LESSON_LABELS` in `src/utils/helpers.js`.
