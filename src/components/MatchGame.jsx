import { useState, useEffect, useRef, useCallback } from 'react';
import { shuffle, getDisplayJp } from '../utils/helpers';
import { useTranslation } from '../utils/i18n';

export default function MatchGame({ words, allWords, isKanjiMode }) {
  const [tiles, setTiles] = useState([]);
  const [first, setFirst] = useState(null);
  const [second, setSecond] = useState(null);
  const [matchedCount, setMatchedCount] = useState(0);
  const [timer, setTimer] = useState('00:00.0');
  const [won, setWon] = useState(false);
  const intervalRef = useRef(null);
  const startRef = useRef(0);
  const t = useTranslation();

  const initGame = useCallback(() => {
    clearInterval(intervalRef.current);
    setTimer('00:00.0');
    setWon(false);
    setFirst(null);
    setSecond(null);
    setMatchedCount(0);

    const pool = words.length >= 6 ? words : allWords;
    const selected = shuffle(pool).slice(0, 6);

    const gameTiles = [];
    selected.forEach(w => {
      gameTiles.push({
        id: w.id, text: getDisplayJp(w, isKanjiMode), sub: w.transcription,
        type: 'jp', matched: false
      });
      gameTiles.push({
        id: w.id, text: w.translation, sub: t('translation'),
        type: 'uk', matched: false
      });
    });

    setTiles(shuffle(gameTiles));

    startRef.current = Date.now();
    intervalRef.current = setInterval(() => {
      const d = Date.now() - startRef.current;
      const m = Math.floor(d / 60000).toString().padStart(2, '0');
      const s = Math.floor((d % 60000) / 1000).toString().padStart(2, '0');
      const t = Math.floor((d % 1000) / 100);
      setTimer(`${m}:${s}.${t}`);
    }, 100);
  }, [words, allWords, isKanjiMode]);

  useEffect(() => { initGame(); return () => clearInterval(intervalRef.current); }, [initGame]);

  const handleTileClick = (tileIdx) => {
    const tile = tiles[tileIdx];
    if (tile.matched) return;

    if (!first) {
      setFirst(tileIdx);
    } else if (first !== tileIdx && second === null) {
      setSecond(tileIdx);
      const t1 = tiles[first];
      const t2 = tiles[tileIdx];

      if (t1.id === t2.id && t1.type !== t2.type) {
        // Match!
        setTimeout(() => {
          setTiles(prev => prev.map((t, i) =>
            (i === first || i === tileIdx) ? { ...t, matched: true } : t
          ));
          const newCount = matchedCount + 1;
          setMatchedCount(newCount);
          if (newCount === 6) {
            clearInterval(intervalRef.current);
            setWon(true);
          }
          setFirst(null);
          setSecond(null);
        }, 300);
      } else {
        // No match
        setTimeout(() => {
          setFirst(null);
          setSecond(null);
        }, 600);
      }
    }
  };

  return (
    <div className="match-game">
      <div className="match-header">
        <div className="match-header__timer">
          <span className="match-header__label">{t('gameTimer')}</span>
          <span className="match-header__time">{timer}</span>
        </div>
        <div className="match-header__right">
          <span className="match-header__hint show-desktop">{t('matchHint')}</span>
          <button onClick={initGame} className="btn btn--ghost btn--sm">{t('restartBtn')}</button>
        </div>
      </div>

      <div className="match-grid">
        {tiles.map((tile, idx) => {
          const isSelected = idx === first || idx === second;
          let cls = 'match-tile';
          if (tile.matched) cls += ' match-tile--matched';
          else if (isSelected) cls += ' match-tile--selected';

          return (
            <div key={idx} className={cls} onClick={() => handleTileClick(idx)}>
              <div className={`match-tile__text ${tile.type === 'jp' ? 'font-jp' : ''}`}>
                {tile.text}
              </div>
              <div className="match-tile__sub">{tile.sub}</div>
            </div>
          );
        })}
      </div>

      {won && (
        <div className="match-win">
          <div className="match-win__icon">⚡</div>
          <h3 className="match-win__title">{t('matchWinTitle')}</h3>
          <p className="match-win__sub">{t('matchWinSub')}</p>
          <div className="match-win__time">{timer}</div>
          <button onClick={initGame} className="btn btn--dark">{t('playMore')}</button>
        </div>
      )}
    </div>
  );
}
