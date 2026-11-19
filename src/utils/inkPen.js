// Brush-like ink for the writing pad. Points are stored as [x, y, w] in a 1024×1024 space
// (w — line width), so strokes survive resizes and can be undone or re-checked.

export const INK_SIZE = 1024;
const BASE_WIDTH = 42;   // ≈ 4% of the cell
const MIN_STEP = 3;      // ignore jitter smaller than this (1024 units)

/**
 * Builds a pen that turns pointer samples into [x, y, w] points.
 * Width follows stylus pressure when the device reports real pressure,
 * otherwise speed: a fast flick thins the line like a brush lifting off (はらい).
 */
export function createPen() {
  let last = null;
  let width = BASE_WIDTH;
  let pressureSeen = false;

  return {
    add(x, y, t, pressure, pointerType) {
      if (last && Math.hypot(x - last.x, y - last.y) < MIN_STEP) return null;
      // Mice report 0.5 (pressed) or 0; only trust values that actually vary.
      if (pointerType === 'pen' && pressure > 0 && pressure !== 0.5) pressureSeen = true;
      let target;
      if (pressureSeen) {
        target = BASE_WIDTH * (0.45 + 1.1 * pressure);
      } else if (last) {
        const v = Math.hypot(x - last.x, y - last.y) / Math.max(1, t - last.t); // units / ms
        target = BASE_WIDTH * Math.min(1.2, Math.max(0.5, 1.2 - v * 0.22));
      } else {
        target = BASE_WIDTH;
      }
      // Low-pass filter so the width breathes instead of jumping
      width = last ? width * 0.75 + target * 0.25 : target * 0.85;
      last = { x, y, t };
      return [x, y, width];
    },
  };
}

const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];

/**
 * Draws one stroke as a chain of pieces: piece 0 is a line from the first point to the
 * midpoint m0 of the first segment, piece i (1…n-2) a quadratic curve m(i-1) → m(i) with
 * point i as the control. Each piece gets its own width (round caps hide the joins), which
 * gives the living line. `tail` adds the last half-segment to the final point.
 * `from` (piece index) lets a stroke in progress draw only its new pieces.
 * Returns the number of pieces now drawn, to pass as `from` next time.
 */
export function drawStroke(ctx, pts, scale, color, { from = 0, tail = true } = {}) {
  const n = pts.length;
  if (!n) return 0;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (n === 1) {
    if (tail) {
      ctx.beginPath();
      ctx.arc(pts[0][0] * scale, pts[0][1] * scale, (pts[0][2] * scale) / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    return 0;
  }

  const piece = (a, b, c) => {
    ctx.lineWidth = Math.max(1, ((a[2] + b[2]) / 2) * scale);
    ctx.beginPath();
    ctx.moveTo(a[0] * scale, a[1] * scale);
    if (c) ctx.quadraticCurveTo(c[0] * scale, c[1] * scale, b[0] * scale, b[1] * scale);
    else ctx.lineTo(b[0] * scale, b[1] * scale);
    ctx.stroke();
  };

  const pieces = n - 1;
  for (let i = from; i < pieces; i++) {
    if (i === 0) piece(pts[0], mid(pts[0], pts[1]));
    else piece(mid(pts[i - 1], pts[i]), mid(pts[i], pts[i + 1]), pts[i]);
  }
  if (tail) piece(mid(pts[n - 2], pts[n - 1]), pts[n - 1]);
  return pieces;
}
