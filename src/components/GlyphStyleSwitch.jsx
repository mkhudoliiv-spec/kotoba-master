import { GLYPH_STYLES, useGlyphStyle } from '../hooks/useGlyphStyle';

// Segmented control: which font big Japanese glyphs are shown in.
// Each button's icon is drawn in its own font so the difference is visible at a glance.
export default function GlyphStyleSwitch({ compact = false, className = '' }) {
  const [style, setStyle] = useGlyphStyle();
  return (
    <div className={`glyph-switch ${compact ? 'glyph-switch--compact' : ''} ${className}`}
      role="radiogroup" aria-label="Стиль японських символів">
      {GLYPH_STYLES.map(s => (
        <button key={s.id} type="button" role="radio" aria-checked={style === s.id}
          className={`glyph-switch__btn ${style === s.id ? 'glyph-switch__btn--active' : ''}`}
          title={s.title}
          onClick={(e) => { e.stopPropagation(); setStyle(s.id); }}>
          <span className={`glyph-switch__icon glyph-switch__icon--${s.id}`}>{s.icon}</span>
          {!compact && <span className="glyph-switch__label">{s.label}</span>}
        </button>
      ))}
    </div>
  );
}
