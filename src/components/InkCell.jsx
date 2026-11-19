import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPen, drawStroke, INK_SIZE } from '../utils/inkPen';

// One square of the writing pad: SVG underlay (十字マス guides + optional glyph) and a canvas
// for live ink. Mouse, touch and stylus via Pointer Events; once a stylus is used in the cell,
// touches are ignored there (palm rejection).
//
// onStroke(points) → true to keep the stroke, false to drop it (the parent may flash it red).

const FLASH_COLOR = '#dc2626';

// overlay — SVG content drawn above the ink (e.g. the highlighted expected stroke)
export default function InkCell({ strokes, flash, active, done, label, onActivate, onStroke, children, overlay }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const flashRef = useRef(null);
  const [dims, setDims] = useState(null); // { w, h, scale } in device pixels
  const drawing = useRef(null);           // { id, pen, pts, pieces }
  const penOnly = useRef(false);
  const strokesRef = useRef(strokes);
  strokesRef.current = strokes;

  const inkColor = () => getComputedStyle(canvasRef.current).color;

  const redraw = (withCurrent = true) => {
    const c = canvasRef.current;
    if (!c || !dims) return;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    const color = inkColor();
    strokesRef.current.forEach(s => drawStroke(ctx, s, dims.scale, color));
    if (withCurrent && drawing.current?.pts.length) drawStroke(ctx, drawing.current.pts, dims.scale, color);
  };

  // Track the cell's size (and the screen's pixel density) to keep the ink sharp
  useLayoutEffect(() => {
    const el = wrapRef.current;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = Math.max(1, Math.round(r.width * dpr));
      setDims(d => (d && d.w === w ? d : { w, h: w, scale: w / INK_SIZE }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Redraw whenever the committed strokes or the size change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { redraw(); }, [strokes, dims]);

  // A rejected stroke: drawn red on its own layer, which fades out via CSS
  useEffect(() => {
    const c = flashRef.current;
    if (!c || !dims || !flash) return;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    drawStroke(ctx, flash.pts, dims.scale, FLASH_COLOR);
  }, [flash, dims]);

  const toInk = (ev) => {
    const r = canvasRef.current.getBoundingClientRect();
    return [((ev.clientX - r.left) / r.width) * INK_SIZE, ((ev.clientY - r.top) / r.height) * INK_SIZE];
  };

  const addSample = (ev) => {
    const d = drawing.current;
    const [x, y] = toInk(ev);
    const p = d.pen.add(x, y, ev.timeStamp, ev.pressure, ev.pointerType);
    if (p) d.pts.push(p);
  };

  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.pointerType === 'pen') penOnly.current = true;
    else if (e.pointerType === 'touch' && penOnly.current) return;
    if (drawing.current || !dims) return; // one pointer at a time
    e.preventDefault();
    canvasRef.current.setPointerCapture(e.pointerId);
    drawing.current = { id: e.pointerId, pen: createPen(), pts: [], pieces: 0 };
    addSample(e.nativeEvent);
    onActivate?.();
  };

  const onPointerMove = (e) => {
    const d = drawing.current;
    if (!d || e.pointerId !== d.id) return;
    const events = e.nativeEvent.getCoalescedEvents?.() || [];
    (events.length ? events : [e.nativeEvent]).forEach(addSample);
    // Draw only the new pieces; the last half-segment waits for the next sample
    const ctx = canvasRef.current.getContext('2d');
    d.pieces = drawStroke(ctx, d.pts, dims.scale, inkColor(), { from: d.pieces, tail: false });
  };

  const finish = (e) => {
    const d = drawing.current;
    if (!d || e.pointerId !== d.id) return;
    drawing.current = null;
    if (canvasRef.current.hasPointerCapture?.(e.pointerId)) canvasRef.current.releasePointerCapture(e.pointerId);
    if (!d.pts.length) return;
    const kept = onStroke?.(d.pts);
    if (kept) {
      // Draw it whole until the parent's new `strokes` arrive
      drawStroke(canvasRef.current.getContext('2d'), d.pts, dims.scale, inkColor(), { from: d.pieces });
    } else {
      redraw(false);
    }
  };

  return (
    <div ref={wrapRef} className={`wp__cell ${active ? 'wp__cell--active' : ''} ${done ? 'wp__cell--done' : ''}`}>
      <svg className="wp__under" viewBox="0 0 1024 1024" aria-hidden="true">
        <rect className="wp__frame" x="0" y="0" width="1024" height="1024" />
        <line className="wp__guide" x1="512" y1="0" x2="512" y2="1024" />
        <line className="wp__guide" x1="0" y1="512" x2="1024" y2="512" />
        {children}
      </svg>
      {flash && dims && <canvas key={flash.id} ref={flashRef} className="wp__flash" width={dims.w} height={dims.h} />}
      <canvas ref={canvasRef} className="wp__ink" width={dims?.w || 1} height={dims?.h || 1}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove}
        onPointerUp={finish} onPointerCancel={finish} onContextMenu={e => e.preventDefault()} />
      {overlay && <svg className="wp__over" viewBox="0 0 1024 1024" aria-hidden="true">{overlay}</svg>}
      {label && <span className="wp__label">{label}</span>}
      {done && <span className="wp__done" aria-label="Готово">✓</span>}
    </div>
  );
}
