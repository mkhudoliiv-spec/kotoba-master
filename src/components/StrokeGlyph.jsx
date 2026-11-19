import { medianPath, durationFor } from '../utils/strokeCheck';

const KVG_SCALE = 1024 / 109; // KanjiVG fallback data uses a 109×109 viewBox

/**
 * SVG content (no <svg> wrapper) of one character in a 1024×1024 box.
 * Strokes before `shown` use `inkClass`, the rest `ghostClass`. Stroke `anim` is being written:
 * a thick brush sweeps along its median, clipped to the stroke outline (AnimCJK technique).
 * `highlight` marks one stroke (e.g. the one the writer should draw next).
 */
export default function StrokeGlyph({
  data, uid, shown, anim = -1, onAnimEnd, numbers = false, highlight = -1,
  inkClass = 'so__ink', ghostClass = 'so__ghost',
}) {
  if (data.f === 'kanjivg') {
    return (
      <g transform={`scale(${KVG_SCALE})`} className="so__kvg">
        {data.s.map((d, i) => (
          <path key={i} d={d}
            className={i < shown || i === anim ? `so__kvg-ink ${i === anim ? 'so__brush-anim' : ''}` : 'so__kvg-ghost'}
            pathLength={i === anim ? 1 : undefined}
            style={i === anim ? { animationDuration: '0.6s' } : undefined}
            onAnimationEnd={i === anim ? () => onAnimEnd?.(i) : undefined} />
        ))}
        {highlight >= 0 && <path d={data.s[highlight]} className="so__kvg-hl" />}
      </g>
    );
  }

  return (
    <>
      {data.s.map((d, i) => <path key={i} d={d} className={i < shown ? inkClass : ghostClass} />)}
      {highlight >= 0 && <path key={`hl${highlight}`} d={data.s[highlight]} className="so__hl" />}
      {anim >= 0 && (
        <g key={anim}>
          <clipPath id={`${uid}c${anim}`}><path d={data.s[anim]} /></clipPath>
          <path className="so__brush so__brush-anim" d={medianPath(data.m[anim])} pathLength={1}
            clipPath={`url(#${uid}c${anim})`}
            style={{ animationDuration: `${durationFor(data.m[anim])}s` }}
            onAnimationEnd={() => onAnimEnd?.(anim)} />
        </g>
      )}
      {numbers && data.m.map((pts, i) => (i < shown || i === anim) && (
        <g key={`n${i}`} className="so__num">
          <circle cx={pts[0][0]} cy={pts[0][1]} r="42" />
          <text x={pts[0][0]} y={pts[0][1]} dy="0.35em">{i + 1}</text>
        </g>
      ))}
    </>
  );
}
