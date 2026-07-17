import { useCallback, useEffect, useRef, useState } from 'react';

const TOOLS = [
  { id: 'crop', label: 'Crop' },
  { id: 'pen', label: 'Pen' },
  { id: 'circle', label: 'Circle' },
  { id: 'arrow', label: 'Arrow' },
  { id: 'highlight', label: 'Highlight' },
];

function drawStroke(ctx, s) {
  if (!s || s.tool === 'crop') return;
  ctx.save();
  if (s.tool === 'pen') {
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    s.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
  } else if (s.tool === 'circle') {
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    const rx = Math.abs(s.x2 - s.x1) / 2;
    const ry = Math.abs(s.y2 - s.y1) / 2;
    ctx.beginPath();
    ctx.ellipse((s.x1 + s.x2) / 2, (s.y1 + s.y2) / 2, Math.max(rx, 1), Math.max(ry, 1), 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (s.tool === 'arrow') {
    ctx.strokeStyle = '#ef4444';
    ctx.fillStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    ctx.lineTo(s.x2, s.y2);
    ctx.stroke();
    const angle = Math.atan2(s.y2 - s.y1, s.x2 - s.x1);
    const head = 12;
    ctx.beginPath();
    ctx.moveTo(s.x2, s.y2);
    ctx.lineTo(s.x2 - head * Math.cos(angle - 0.4), s.y2 - head * Math.sin(angle - 0.4));
    ctx.lineTo(s.x2 - head * Math.cos(angle + 0.4), s.y2 - head * Math.sin(angle + 0.4));
    ctx.closePath();
    ctx.fill();
  } else if (s.tool === 'highlight') {
    ctx.fillStyle = 'rgba(250, 204, 21, 0.35)';
    ctx.fillRect(
      Math.min(s.x1, s.x2),
      Math.min(s.y1, s.y2),
      Math.abs(s.x2 - s.x1),
      Math.abs(s.y2 - s.y1)
    );
  }
  ctx.restore();
}

/**
 * Zoom-style screenshot markup: optional crop, then pen/circle/arrow/highlighter.
 */
export default function ScreenshotAnnotator({ imageSrc, onChange, onCancel }) {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const [tool, setTool] = useState('pen');
  const [strokes, setStrokes] = useState([]);
  const [draft, setDraft] = useState(null);
  const [cropNorm, setCropNorm] = useState(null); // {x,y,w,h} in 0–1 of original
  const [ready, setReady] = useState(false);
  const drawing = useRef(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setStrokes([]);
      setCropNorm(null);
      setDraft(null);
      setReady(true);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return null;

    const maxW = Math.min(720, img.naturalWidth);
    const scale = maxW / img.naturalWidth;
    const displayW = Math.round(img.naturalWidth * scale);
    const displayH = Math.round(img.naturalHeight * scale);
    if (canvas.width !== displayW || canvas.height !== displayH) {
      canvas.width = displayW;
      canvas.height = displayH;
    }

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, displayW, displayH);

    if (cropNorm) {
      const sx = cropNorm.x * img.naturalWidth;
      const sy = cropNorm.y * img.naturalHeight;
      const sw = cropNorm.w * img.naturalWidth;
      const sh = cropNorm.h * img.naturalHeight;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, displayW, displayH);
    } else {
      ctx.drawImage(img, 0, 0, displayW, displayH);
    }

    strokes.forEach((s) => drawStroke(ctx, s));
    if (draft) {
      if (draft.tool === 'crop') {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(0, 0, displayW, displayH);
        const x = Math.min(draft.x1, draft.x2);
        const y = Math.min(draft.y1, draft.y2);
        const w = Math.abs(draft.x2 - draft.x1);
        const h = Math.abs(draft.y2 - draft.y1);
        ctx.clearRect(x, y, w, h);
        ctx.drawImage(
          img,
          x / scale,
          y / scale,
          w / scale,
          h / scale,
          x,
          y,
          w,
          h
        );
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);
        ctx.restore();
      } else {
        drawStroke(ctx, draft);
      }
    }

    // Export without crop preview overlay
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = displayW;
    exportCanvas.height = displayH;
    const ex = exportCanvas.getContext('2d');
    if (cropNorm) {
      ex.drawImage(
        img,
        cropNorm.x * img.naturalWidth,
        cropNorm.y * img.naturalHeight,
        cropNorm.w * img.naturalWidth,
        cropNorm.h * img.naturalHeight,
        0,
        0,
        displayW,
        displayH
      );
    } else {
      ex.drawImage(img, 0, 0, displayW, displayH);
    }
    strokes.forEach((s) => drawStroke(ex, s));
    return exportCanvas.toDataURL('image/png');
  }, [strokes, draft, cropNorm]);

  useEffect(() => {
    if (!ready) return;
    const dataUrl = paint();
    if (dataUrl && (!draft || draft.tool !== 'crop')) {
      onChangeRef.current?.(dataUrl);
    }
  }, [paint, ready, draft]);

  const pos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const onPointerDown = (e) => {
    e.preventDefault();
    drawing.current = true;
    const p = pos(e);
    if (tool === 'pen') setDraft({ tool: 'pen', points: [p] });
    else if (tool === 'crop') setDraft({ tool: 'crop', x1: p.x, y1: p.y, x2: p.x, y2: p.y });
    else setDraft({ tool, x1: p.x, y1: p.y, x2: p.x, y2: p.y });
  };

  const onPointerMove = (e) => {
    if (!drawing.current || !draft) return;
    e.preventDefault();
    const p = pos(e);
    if (draft.tool === 'pen') setDraft({ ...draft, points: [...draft.points, p] });
    else setDraft({ ...draft, x2: p.x, y2: p.y });
  };

  const onPointerUp = () => {
    if (!drawing.current || !draft) return;
    drawing.current = false;
    if (draft.tool === 'crop') {
      const canvas = canvasRef.current;
      const x = Math.min(draft.x1, draft.x2);
      const y = Math.min(draft.y1, draft.y2);
      const w = Math.abs(draft.x2 - draft.x1);
      const h = Math.abs(draft.y2 - draft.y1);
      if (w > 12 && h > 12 && canvas) {
        setCropNorm({
          x: x / canvas.width,
          y: y / canvas.height,
          w: w / canvas.width,
          h: h / canvas.height,
        });
        setStrokes([]);
        setTool('pen');
      }
      setDraft(null);
      return;
    }
    if (draft.tool === 'pen' && draft.points.length < 2) {
      setDraft(null);
      return;
    }
    setStrokes((prev) => [...prev, draft]);
    setDraft(null);
  };

  return (
    <div className="feedback-annotator">
      <div className="feedback-annotator__toolbar">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`feedback-tool-btn${tool === t.id ? ' is-active' : ''}`}
            onClick={() => setTool(t.id)}
          >
            {t.label}
          </button>
        ))}
        <button
          type="button"
          className="feedback-tool-btn"
          onClick={() => setStrokes((s) => s.slice(0, -1))}
          disabled={!strokes.length}
        >
          Undo
        </button>
        <button
          type="button"
          className="feedback-tool-btn"
          onClick={() => {
            setStrokes([]);
            setCropNorm(null);
          }}
        >
          Clear
        </button>
        {onCancel ? (
          <button type="button" className="feedback-tool-btn" onClick={onCancel}>
            Retake
          </button>
        ) : null}
      </div>
      <div className="feedback-annotator__canvas-wrap">
        <canvas
          ref={canvasRef}
          className="feedback-annotator__canvas"
          onMouseDown={onPointerDown}
          onMouseMove={onPointerMove}
          onMouseUp={onPointerUp}
          onMouseLeave={onPointerUp}
          onTouchStart={onPointerDown}
          onTouchMove={onPointerMove}
          onTouchEnd={onPointerUp}
        />
      </div>
      <p className="feedback-annotator__hint">
        Optional: crop first, then circle or highlight the problem area.
      </p>
    </div>
  );
}
