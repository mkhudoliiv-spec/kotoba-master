import { getGlyphNote } from '../utils/glyphNotes';

// Print form (Noto Sans JP) vs handwritten school form (教科書体) of a character,
// with a short note on how it differs. Renders nothing for characters without a note
// unless `always` is set.
export default function GlyphCompare({ char, note, always = false }) {
  const text = note ?? getGlyphNote(char);
  if (!text && !always) return null;
  return (
    <section className={`glyph-compare ${[...char].length > 1 ? 'glyph-compare--multi' : ''}`}>
      <div className="glyph-compare__pair">
        <figure className="glyph-compare__cell">
          <span className="glyph-compare__glyph glyph-compare__glyph--print" lang="ja">{char}</span>
          <figcaption>Друк</figcaption>
        </figure>
        <span className="glyph-compare__arrow" aria-hidden="true">→</span>
        <figure className="glyph-compare__cell glyph-compare__cell--hand">
          <span className="glyph-compare__glyph glyph-compare__glyph--school" lang="ja">{char}</span>
          <figcaption>Пишемо так</figcaption>
        </figure>
      </div>
      {text && <p className="glyph-compare__note"><strong>Увага:</strong> {text}</p>}
    </section>
  );
}
