import { useId, useState } from 'react';
import { useStrokes } from '../utils/strokeData';

// Animated stroke order. Each AnimCJK stroke is a filled outline; the animation sweeps a thick
// brush along the stroke's median, clipped to the outline, so it looks written by hand.

const KVG_SCALE = 1024 / 109; // KanjiVG fallback data uses a 109×109 viewBox

const medianPath = pts => 'M' + pts.map(p => p.join(' ')).join('L');
const polyLength = pts => pts.reduce((sum, p, i) => i ? sum + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0, 0);
// Long strokes take longer, but never drag or flash by
const durationFor = pts => Math.min(1.1, Math.max(0.3, polyLength(pts) / 900));

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
        {kvg ? (
          <g transform={`scale(${KVG_SCALE})`} className="so__kvg">
            {data.s.map((d, i) => (
              <path key={i} d={d}
                className={i < shown ? 'so__kvg-ink' : i === anim ? 'so__kvg-ink so__brush-anim' : 'so__kvg-ghost'}
                pathLength={i === anim ? 1 : undefined}
                style={i === anim ? { animationDuration: '0.6s' } : undefined}
                onAnimationEnd={i === anim ? () => onEnd(i) : undefined} />
            ))}
          </g>
        ) : (
          <>
            {data.s.map((d, i) => (
              <path key={i} d={d} className={i < shown ? 'so__ink' : 'so__ghost'} />
            ))}
            {anim >= 0 && (
              <g key={anim}>
                <clipPath id={`${uid}c${anim}`}><path d={data.s[anim]} /></clipPath>
                <path className="so__brush so__brush-anim" d={medianPath(data.m[anim])} pathLength={1}
                  clipPath={`url(#${uid}c${anim})`}
                  style={{ animationDuration: `${durationFor(data.m[anim])}s` }}
                  onAnimationEnd={() => onEnd(anim)} />
              </g>
            )}
            {numbers && data.m.map((pts, i) => (i < shown || i === anim) && (
              <g key={`n${i}`} className="so__num">
                <circle cx={pts[0][0]} cy={pts[0][1]} r="42" />
                <text x={pts[0][0]} y={pts[0][1]} dy="0.35em">{i + 1}</text>
              </g>
            ))}
          </>
        )}
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
