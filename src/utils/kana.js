// Kana tables (五十音). Stored as hiragana; katakana is derived by code-point shift.
// r — Hepburn romaji; uk — Ukrainian transcription in the same system as vocabulary.json
// (し → ші, つ → цу, じゃ → джя, りょ → рьо…); hint — optional pronunciation tip.

export const SCRIPTS = [
  { id: 'hira', label: 'Хірагана', jp: 'ひらがな' },
  { id: 'kata', label: 'Катакана', jp: 'カタカナ' },
];

export const GROUPS = [
  { id: 'seion', label: 'Базові', jp: '清音' },
  { id: 'dakuon', label: 'Дзвінкі', jp: '濁音・半濁音' },
  { id: 'yoon', label: 'Сполучення', jp: '拗音' },
];

const VOWEL_COLS = ['a', 'i', 'u', 'e', 'o'];
const YOON_COLS = ['ya', 'yu', 'yo'];

const k = (h, r, uk, hint) => ({ h, r, uk, ...(hint && { hint }) });

const SEION = [
  ['あ', [k('あ', 'a', 'а'), k('い', 'i', 'і'), k('う', 'u', 'у', 'Губи не округлюються. У кінці слова після глухих часто майже зникає: です → дес.'), k('え', 'e', 'е'), k('お', 'o', 'о')]],
  ['か', [k('か', 'ka', 'ка'), k('き', 'ki', 'кі'), k('く', 'ku', 'ку'), k('け', 'ke', 'ке'), k('こ', 'ko', 'ко')]],
  ['さ', [k('さ', 'sa', 'са'), k('し', 'shi', 'ші', 'М\'якше за українське «ші», щось між «ші» і «сі».'), k('す', 'su', 'су', 'У кінці слова «у» часто не чути: です → дес.'), k('せ', 'se', 'се'), k('そ', 'so', 'со')]],
  ['た', [k('た', 'ta', 'та'), k('ち', 'chi', 'чі', 'М\'якше за українське «чі».'), k('つ', 'tsu', 'цу', 'Звучить як «ц» + «у» одним складом.'), k('て', 'te', 'те'), k('と', 'to', 'то')]],
  ['な', [k('な', 'na', 'на'), k('に', 'ni', 'ні'), k('ぬ', 'nu', 'ну'), k('ね', 'ne', 'не'), k('の', 'no', 'но')]],
  ['は', [k('は', 'ha', 'ха', 'Як частка (わたしは) читається «ва».'), k('ひ', 'hi', 'хі', 'Легкий видих, м\'якше за українське «хі».'), k('ふ', 'fu', 'фу', 'Між «ф» і «х»: легенько дмухніть, губи не торкаються зубів.'), k('へ', 'he', 'хе', 'Як частка напрямку (がっこうへ) читається «е».'), k('ほ', 'ho', 'хо')]],
  ['ま', [k('ま', 'ma', 'ма'), k('み', 'mi', 'мі'), k('む', 'mu', 'му'), k('め', 'me', 'ме'), k('も', 'mo', 'мо')]],
  ['や', [k('や', 'ya', 'я'), null, k('ゆ', 'yu', 'ю'), null, k('よ', 'yo', 'йо')]],
  ['ら', [k('ら', 'ra', 'ра', 'Японське «р» — один легкий удар язика, щось середнє між «р» і «л».'), k('り', 'ri', 'рі'), k('る', 'ru', 'ру'), k('れ', 're', 'ре'), k('ろ', 'ro', 'ро')]],
  ['わ', [k('わ', 'wa', 'ва', 'Губи майже не округлюються: між «ва» і «уа».'), null, null, null, k('を', 'wo', 'о', 'Уживається лише як частка знахідного відмінка й читається «о».')]],
  ['ん', [k('ん', 'n', 'н', 'Окремий склад. Перед б/п/м звучить як «м»: せんぱい → семпай.'), null, null, null, null]],
];

const DAKUON = [
  ['が', [k('が', 'ga', 'ґа'), k('ぎ', 'gi', 'ґі'), k('ぐ', 'gu', 'ґу'), k('げ', 'ge', 'ґе'), k('ご', 'go', 'ґо')]],
  ['ざ', [k('ざ', 'za', 'дза'), k('じ', 'ji', 'джі'), k('ず', 'zu', 'дзу'), k('ぜ', 'ze', 'дзе'), k('ぞ', 'zo', 'дзо')]],
  ['だ', [k('だ', 'da', 'да'), k('ぢ', 'ji', 'джі', 'Звучить так само, як じ. Пишеться рідко, переважно в словах на кшталт はなぢ.'), k('づ', 'zu', 'дзу', 'Звучить так само, як ず. Пишеться рідко, наприклад, つづく.'), k('で', 'de', 'де'), k('ど', 'do', 'до')]],
  ['ば', [k('ば', 'ba', 'ба'), k('び', 'bi', 'бі'), k('ぶ', 'bu', 'бу'), k('べ', 'be', 'бе'), k('ぼ', 'bo', 'бо')]],
  ['ぱ', [k('ぱ', 'pa', 'па'), k('ぴ', 'pi', 'пі'), k('ぷ', 'pu', 'пу'), k('ぺ', 'pe', 'пе'), k('ぽ', 'po', 'по')]],
];

const YOON = [
  ['き', [k('きゃ', 'kya', 'кя'), k('きゅ', 'kyu', 'кю'), k('きょ', 'kyo', 'кьо')]],
  ['し', [k('しゃ', 'sha', 'шя'), k('しゅ', 'shu', 'шю'), k('しょ', 'sho', 'шьо')]],
  ['ち', [k('ちゃ', 'cha', 'чя'), k('ちゅ', 'chu', 'чю'), k('ちょ', 'cho', 'чьо')]],
  ['に', [k('にゃ', 'nya', 'ня'), k('にゅ', 'nyu', 'ню'), k('にょ', 'nyo', 'ньо')]],
  ['ひ', [k('ひゃ', 'hya', 'хя'), k('ひゅ', 'hyu', 'хю'), k('ひょ', 'hyo', 'хьо')]],
  ['み', [k('みゃ', 'mya', 'мя'), k('みゅ', 'myu', 'мю'), k('みょ', 'myo', 'мьо')]],
  ['り', [k('りゃ', 'rya', 'ря'), k('りゅ', 'ryu', 'рю'), k('りょ', 'ryo', 'рьо')]],
  ['ぎ', [k('ぎゃ', 'gya', 'ґя'), k('ぎゅ', 'gyu', 'ґю'), k('ぎょ', 'gyo', 'ґьо')]],
  ['じ', [k('じゃ', 'ja', 'джя'), k('じゅ', 'ju', 'джю'), k('じょ', 'jo', 'джо')]],
  ['び', [k('びゃ', 'bya', 'бя'), k('びゅ', 'byu', 'бю'), k('びょ', 'byo', 'бьо')]],
  ['ぴ', [k('ぴゃ', 'pya', 'пя'), k('ぴゅ', 'pyu', 'пю'), k('ぴょ', 'pyo', 'пьо')]],
];

const TABLES = {
  seion: { cols: VOWEL_COLS, rows: SEION },
  dakuon: { cols: VOWEL_COLS, rows: DAKUON },
  yoon: { cols: YOON_COLS, rows: YOON },
};

/** Hiragana → katakana (U+3041–U+3096 shift by 0x60); other chars stay as they are. */
export const toKatakana = s => s.replace(/[ぁ-ゖ]/g, c => String.fromCharCode(c.charCodeAt(0) + 0x60));

const withScript = (entry, script) => entry && {
  ...entry,
  id: entry.h,
  char: script === 'kata' ? toKatakana(entry.h) : entry.h,
  pair: script === 'kata' ? entry.h : toKatakana(entry.h),
};

/** { cols, rows: [{ id, label, cells: [entry | null] }] } for one group in one script. */
export function getKanaTable(group, script) {
  const { cols, rows } = TABLES[group];
  return {
    cols,
    rows: rows.map(([head, cells]) => ({
      id: head,
      label: (script === 'kata' ? toKatakana(head) : head) + '行',
      cells: cells.map(c => withScript(c, script)),
    })),
  };
}

/** Flat list of the entries of a group (gaps removed), in table order. */
export const flattenTable = table => table.rows.flatMap(r => r.cells.filter(Boolean));
