// Geometry for stroke animation and the soft stroke checker.
// All coordinates are in AnimCJK's 1024×1024 space.

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

export const polyLength = pts => pts.reduce((sum, p, i) => i ? sum + dist(p, pts[i - 1]) : 0, 0);

export const medianPath = pts => 'M' + pts.map(p => `${Math.round(p[0])} ${Math.round(p[1])}`).join('L');

/** Animation time for one stroke: long strokes take longer, but never drag or flash by. */
export const durationFor = pts => Math.min(1.1, Math.max(0.3, polyLength(pts) / 900));

/** n points evenly spaced along the polyline. */
export function resample(pts, n = 24) {
  if (pts.length === 1) return Array.from({ length: n }, () => [pts[0][0], pts[0][1]]);
  const total = polyLength(pts);
  if (total === 0) return Array.from({ length: n }, () => [pts[0][0], pts[0][1]]);
  const step = total / (n - 1);
  const out = [[pts[0][0], pts[0][1]]];
  let acc = 0;
  let i = 1;
  let prev = pts[0];
  while (out.length < n - 1 && i < pts.length) {
    const d = dist(prev, pts[i]);
    if (acc + d >= step && d > 0) {
      const t = (step - acc) / d;
      const q = [prev[0] + t * (pts[i][0] - prev[0]), prev[1] + t * (pts[i][1] - prev[1])];
      out.push(q);
      prev = q;
      acc = 0;
    } else {
      acc += d;
      prev = pts[i];
      i++;
    }
  }
  while (out.length < n) out.push([pts[pts.length - 1][0], pts[pts.length - 1][1]]);
  return out;
}

const meanDist = (a, b) => a.reduce((s, p, i) => s + dist(p, b[i]), 0) / a.length;
const centroid = pts => [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];

// Short strokes (dots, ticks) are judged by position only: their hand-drawn shape varies too much.
const DOT_LENGTH = 170;

/**
 * How well does the drawn stroke fit the model stroke?
 * Generous tolerances: a living hand is shaky, a bit off-centre and differently sized.
 * → { res: 'match' | 'reversed' | 'no', score } — score: mean distance (lower is better).
 */
export function compareStroke(drawn, median) {
  const mLen = polyLength(median);
  const dLen = polyLength(drawn);
  const m = resample(median);
  const d = resample(drawn);
  const fwd = meanDist(d, m);
  const rev = meanDist(d, [...m].reverse());

  if (mLen < DOT_LENGTH) {
    const off = dist(centroid(d), centroid(m));
    if (off > 150 || dLen > Math.max(320, mLen * 2.6)) return { res: 'no', score: Infinity };
    if (dLen < 60) return { res: 'match', score: off }; // a tap: direction can't be judged
    return rev + 40 < fwd ? { res: 'reversed', score: rev } : { res: 'match', score: Math.min(fwd, off + 20) };
  }

  const ratio = dLen / mLen;
  if (ratio < 0.35 || ratio > 2.4) return { res: 'no', score: Infinity };
  const tol = 120 + 0.18 * mLen;
  if (fwd <= tol && fwd <= rev * 1.05) return { res: 'match', score: fwd };
  if (rev <= tol && rev < fwd) return { res: 'reversed', score: rev };
  return { res: 'no', score: fwd };
}

/**
 * Where and how big the writer puts the character, learned from the strokes already accepted:
 * maps the writer's space onto the model's. Translation from one stroke, plus scale from two.
 */
function fitTransform(prior, medians) {
  if (!prior.length) return null;
  const P = [], Q = [];
  prior.forEach((stroke, i) => {
    resample(stroke, 12).forEach(p => P.push(p));
    resample(medians[i], 12).forEach(q => Q.push(q));
  });
  const cp = centroid(P), cq = centroid(Q);
  let s = 1;
  if (prior.length >= 2) {
    const spread = (pts, c) => Math.sqrt(pts.reduce((a, p) => a + (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2, 0) / pts.length);
    const sp = spread(P, cp);
    if (sp > 20) s = Math.min(1.6, Math.max(0.6, spread(Q, cq) / sp));
  }
  return p => [cq[0] + (p[0] - cp[0]) * s, cq[1] + (p[1] - cp[1]) * s];
}

/**
 * Checks a drawn stroke against the stroke expected next.
 * prior — the writer's strokes already accepted in this cell (used to adapt to their size/position).
 * → { ok: true } | { ok: false, reason: 'reversed' | 'order' | 'shape', index? }
 */
export function checkStroke(drawn, medians, expected, prior = []) {
  const tf = fitTransform(prior, medians);
  const pts = tf ? drawn.map(tf) : drawn;
  const exp = compareStroke(pts, medians[expected]);

  // The best-fitting stroke among those not written yet
  let best = -1, bestScore = Infinity;
  for (let j = expected + 1; j < medians.length; j++) {
    const c = compareStroke(pts, medians[j]);
    if (c.res === 'match' && c.score < bestScore) { best = j; bestScore = c.score; }
  }

  if (exp.res === 'match' && (best < 0 || exp.score <= bestScore * 1.25 + 15)) return { ok: true };
  if (best >= 0) return { ok: false, reason: 'order', index: best };
  if (exp.res === 'reversed') return { ok: false, reason: 'reversed' };
  return { ok: false, reason: 'shape' };
}
