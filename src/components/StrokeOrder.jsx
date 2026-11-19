import { useId, useState } from 'react';
import { useStrokes } from '../utils/strokeData';
import StrokeGlyph from './StrokeGlyph';

// Animated stroke order with play / step controls (kanji card, kana card).

function Player({ char, data, autoPlay, size, stack, credit }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const total = data.s.length;
  const kvg = data.f === 'kanjivg';
  // shown — strokes fully drawn; anim — stroke being animated (-1: none); run — 'play' | 'step'
  const [shown, setShown] = useState(autoPlay ? 0 : total);
  const [anim, setAnim] = useState(autoPlay ? 0 : -1);
  const [run, setRun] = useState('play');
  const [numbers, setNumbers] = useState(true);

  const play = () => { setRun('play'); setShown(0); setAnim(0); };
  // Animate just the next stroke; a stroke still in progress is completed first,
  // and after the last stroke it starts over from an empty grid.
  const step = () => {
    let next;
    if (anim >= 0) { next = anim + 1; setShown(next); }
    else if (shown >= total) { next = 0; setShown(0); }
    else next = shown;
    setRun('step');
    setAnim(next < total ? next : -1);
  };
  const onEnd = (i) => {
    setShown(i + 1);
    setAnim(run === 'play' && i + 1 < total ? i + 1 : -1);
  };

  const label = anim >= 0 ? anim + 1 : shown;

  return (
    <div className={`so so--${size} ${stack ? 'so--stack' : ''}`}>
      <svg className="so__canvas" viewBox="0 0 1024 1024" role="img"
        aria-label={`Порядок рисок ${char}: ${total}`}>
        <StrokeGlyph data={data} uid={uid} shown={shown} anim={anim} onAnimEnd={onEnd} numbers={numbers && !kvg} />
      </svg>

      <div className="so__side">
        <div className="so__count">Риска <strong>{label}</strong> / {total}</div>
        <div className="so__btns">
          <button type="button" className="btn btn--dark btn--sm" onClick={play}>▶ Відтворити</button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={step}>Наступна риска</button>
          {!kvg && (
            <button type="button" className={`btn btn--ghost btn--sm ${numbers ? 'so__toggle--on' : ''}`}
              aria-pressed={numbers} onClick={() => setNumbers(n => !n)}>№ Номери</button>
          )}
        </div>
        {credit && <p className="so__credit">
          {kvg ? 'Штрихи: KanjiVG, CC BY-SA 3.0' : <>Штрихи: <a href="https://github.com/parsimonhi/animCJK" target="_blank" rel="noreferrer">AnimCJK</a> (японський стандарт)</>}
        </p>}
      </div>
    </div>
  );
}

// size: 'md' | 'lg'; stack: controls under the grid; credit: show the data source line
export default function StrokeOrder({ char, autoPlay = false, size = 'md', stack = false, credit = true }) {
  const { data, loading } = useStrokes(char);

  if (loading) return <div className={`so so--${size} ${stack ? 'so--stack' : ''} so--loading`}><div className="so__canvas" /></div>;
  if (!data) return null;
  return <Player key={char} char={char} data={data} autoPlay={autoPlay} size={size} stack={stack} credit={credit} />;
}
