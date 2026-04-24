import React, { useRef, useState, useEffect, useCallback, useImperativeHandle, forwardRef } from "react";
import {
  Pencil, MousePointer2, Square, Circle, ArrowUpRight,
  Type, Eraser, Undo2, Redo2, Trash2, Palette, Minus, Plus,
} from "lucide-react";

const TOOLS = {
  SELECT: "select",
  PEN: "pen",
  ARROW: "arrow",
  RECT: "rect",
  CIRCLE: "circle",
  TEXT: "text",
  ERASER: "eraser",
};

const COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#3b82f6", "#8b5cf6", "#ec4899", "#ffffff",
];

const DrawingCanvas = forwardRef(function DrawingCanvas(
  { width, height, active, existingAnnotation, onAnnotationChange },
  ref
) {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState(TOOLS.PEN);
  const [color, setColor] = useState("#ef4444");
  const [lineWidth, setLineWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const [strokes, setStrokes] = useState([]);
  const [undoneStrokes, setUndoneStrokes] = useState([]);
  const [currentStroke, setCurrentStroke] = useState(null);
  const [textInput, setTextInput] = useState(null);

  useEffect(() => {
    if (existingAnnotation) {
      try {
        const parsed = JSON.parse(existingAnnotation);
        if (Array.isArray(parsed)) setStrokes(parsed);
      } catch { /* ignore */ }
    }
  }, [existingAnnotation]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const allStrokes = currentStroke ? [...strokes, currentStroke] : strokes;
    for (const stroke of allStrokes) {
      drawStroke(ctx, stroke);
    }
  }, [strokes, currentStroke]);

  useEffect(() => { redraw(); }, [redraw]);

  useEffect(() => {
    if (onAnnotationChange) {
      onAnnotationChange(strokes.length > 0 ? JSON.stringify(strokes) : null);
    }
  }, [strokes, onAnnotationChange]);

  useImperativeHandle(ref, () => ({
    getAnnotationData: () => strokes.length > 0 ? JSON.stringify(strokes) : null,
    getSnapshotDataUrl: () => {
      const canvas = canvasRef.current;
      if (!canvas || strokes.length === 0) return null;
      return canvas.toDataURL("image/png", 0.8);
    },
    clearCanvas: () => {
      setStrokes([]);
      setUndoneStrokes([]);
      setCurrentStroke(null);
    },
    hasAnnotation: () => strokes.length > 0,
  }));

  function drawStroke(ctx, stroke) {
    ctx.save();
    ctx.strokeStyle = stroke.color;
    ctx.fillStyle = stroke.color;
    ctx.lineWidth = stroke.lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    switch (stroke.tool) {
      case TOOLS.PEN: {
        if (!stroke.points || stroke.points.length < 2) break;
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          const p0 = stroke.points[i - 1];
          const p1 = stroke.points[i];
          const mx = (p0.x + p1.x) / 2;
          const my = (p0.y + p1.y) / 2;
          ctx.quadraticCurveTo(p0.x, p0.y, mx, my);
        }
        ctx.stroke();
        break;
      }
      case TOOLS.ARROW: {
        if (!stroke.start || !stroke.end) break;
        const { start, end } = stroke;
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        const headLen = Math.max(12, stroke.lineWidth * 4);
        ctx.beginPath();
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(end.x - headLen * Math.cos(angle - Math.PI / 6), end.y - headLen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(end.x - headLen * Math.cos(angle + Math.PI / 6), end.y - headLen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
        break;
      }
      case TOOLS.RECT: {
        if (!stroke.start || !stroke.end) break;
        const x = Math.min(stroke.start.x, stroke.end.x);
        const y = Math.min(stroke.start.y, stroke.end.y);
        const w = Math.abs(stroke.end.x - stroke.start.x);
        const h = Math.abs(stroke.end.y - stroke.start.y);
        ctx.strokeRect(x, y, w, h);
        break;
      }
      case TOOLS.CIRCLE: {
        if (!stroke.start || !stroke.end) break;
        const cx = (stroke.start.x + stroke.end.x) / 2;
        const cy = (stroke.start.y + stroke.end.y) / 2;
        const rx = Math.abs(stroke.end.x - stroke.start.x) / 2;
        const ry = Math.abs(stroke.end.y - stroke.start.y) / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      case TOOLS.TEXT: {
        if (!stroke.position || !stroke.text) break;
        ctx.font = `${Math.max(14, stroke.lineWidth * 5)}px Inter, system-ui, sans-serif`;
        ctx.fillText(stroke.text, stroke.position.x, stroke.position.y);
        break;
      }
      case TOOLS.ERASER: {
        if (!stroke.points || stroke.points.length < 2) break;
        ctx.globalCompositeOperation = "destination-out";
        ctx.lineWidth = stroke.lineWidth * 3;
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
        ctx.globalCompositeOperation = "source-over";
        break;
      }
    }
    ctx.restore();
  }

  function getPos(e) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  const handlePointerDown = (e) => {
    if (!active) return;
    e.preventDefault();

    if (tool === TOOLS.TEXT) {
      const pos = getPos(e);
      setTextInput({ x: pos.x, y: pos.y });
      return;
    }

    setIsDrawing(true);
    setUndoneStrokes([]);
    const pos = getPos(e);

    if (tool === TOOLS.PEN || tool === TOOLS.ERASER) {
      setCurrentStroke({ tool, color, lineWidth, points: [pos] });
    } else {
      setCurrentStroke({ tool, color, lineWidth, start: pos, end: pos });
    }
  };

  const handlePointerMove = (e) => {
    if (!isDrawing || !currentStroke || !active) return;
    e.preventDefault();
    const pos = getPos(e);

    if (tool === TOOLS.PEN || tool === TOOLS.ERASER) {
      setCurrentStroke((prev) => ({
        ...prev,
        points: [...(prev?.points || []), pos],
      }));
    } else {
      setCurrentStroke((prev) => ({ ...prev, end: pos }));
    }
  };

  const handlePointerUp = () => {
    if (!isDrawing || !currentStroke) return;
    setIsDrawing(false);
    setStrokes((prev) => [...prev, currentStroke]);
    setCurrentStroke(null);
  };

  const handleTextSubmit = (text) => {
    if (!text.trim() || !textInput) return;
    setStrokes((prev) => [
      ...prev,
      { tool: TOOLS.TEXT, color, lineWidth, position: textInput, text: text.trim() },
    ]);
    setTextInput(null);
    setUndoneStrokes([]);
  };

  const undo = () => {
    if (strokes.length === 0) return;
    const last = strokes[strokes.length - 1];
    setStrokes((prev) => prev.slice(0, -1));
    setUndoneStrokes((prev) => [...prev, last]);
  };

  const redo = () => {
    if (undoneStrokes.length === 0) return;
    const last = undoneStrokes[undoneStrokes.length - 1];
    setUndoneStrokes((prev) => prev.slice(0, -1));
    setStrokes((prev) => [...prev, last]);
  };

  const clearAll = () => {
    setStrokes([]);
    setUndoneStrokes([]);
    setCurrentStroke(null);
  };

  useEffect(() => {
    if (!active) return;
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [active, strokes, undoneStrokes]);

  const toolConfig = [
    { id: TOOLS.PEN,     icon: Pencil,        label: "Draw" },
    { id: TOOLS.ARROW,   icon: ArrowUpRight,   label: "Arrow" },
    { id: TOOLS.RECT,    icon: Square,         label: "Rectangle" },
    { id: TOOLS.CIRCLE,  icon: Circle,         label: "Circle" },
    { id: TOOLS.TEXT,     icon: Type,           label: "Text" },
    { id: TOOLS.ERASER,  icon: Eraser,         label: "Eraser" },
  ];

  if (!active) {
    return (
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="pointer-events-none absolute inset-0 z-10"
        style={{ width: "100%", height: "100%" }}
      />
    );
  }

  return (
    <>
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="absolute inset-0 z-20 cursor-crosshair"
        style={{ width: "100%", height: "100%" }}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
      />

      {/* Text input overlay */}
      {textInput && (
        <div
          className="absolute z-30"
          style={{
            left: `${(textInput.x / width) * 100}%`,
            top: `${(textInput.y / height) * 100}%`,
          }}
        >
          <input
            autoFocus
            type="text"
            placeholder="Type text…"
            className="rounded-lg border-2 border-red-400 bg-black/60 px-2 py-1 text-sm text-white backdrop-blur focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleTextSubmit(e.target.value);
              if (e.key === "Escape") setTextInput(null);
            }}
            onBlur={(e) => handleTextSubmit(e.target.value)}
          />
        </div>
      )}

      {/* Drawing Toolbar — positioned at top of the video area */}
      <div className="absolute left-1/2 top-3 z-30 -translate-x-1/2">
        <div className="flex items-center gap-1 rounded-2xl border border-white/20 bg-slate-900/90 px-2 py-1.5 shadow-2xl backdrop-blur-lg">
          {/* Tools */}
          {toolConfig.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setTool(id)}
              className={`group relative rounded-xl p-2 transition-all ${
                tool === id
                  ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30"
                  : "text-slate-400 hover:bg-white/10 hover:text-white"
              }`}
              title={label}
            >
              <Icon className="h-4 w-4" />
              <span className="pointer-events-none absolute -bottom-8 left-1/2 z-40 -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-2 py-0.5 text-[10px] text-white opacity-0 shadow-lg transition group-hover:opacity-100">
                {label}
              </span>
            </button>
          ))}

          <div className="mx-1 h-6 w-px bg-white/20" />

          {/* Color picker */}
          <div className="relative">
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="rounded-xl p-1.5 transition hover:bg-white/10"
              title="Color"
            >
              <div
                className="h-5 w-5 rounded-full border-2 border-white/40 shadow-inner"
                style={{ backgroundColor: color }}
              />
            </button>
            {showColorPicker && (
              <div className="absolute left-1/2 top-full z-40 mt-2 -translate-x-1/2 rounded-xl border border-white/20 bg-slate-900/95 p-2 shadow-2xl backdrop-blur">
                <div className="grid grid-cols-4 gap-1.5">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => { setColor(c); setShowColorPicker(false); }}
                      className={`h-6 w-6 rounded-full border-2 transition hover:scale-110 ${
                        color === c ? "border-indigo-400 ring-2 ring-indigo-400/40" : "border-white/20"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Line width */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setLineWidth(Math.max(1, lineWidth - 1))}
              className="rounded-lg p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
              title="Thinner"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="w-5 text-center text-[11px] font-mono text-slate-300">{lineWidth}</span>
            <button
              onClick={() => setLineWidth(Math.min(12, lineWidth + 1))}
              className="rounded-lg p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
              title="Thicker"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mx-1 h-6 w-px bg-white/20" />

          {/* Undo / Redo / Clear */}
          <button
            onClick={undo}
            disabled={strokes.length === 0}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white disabled:opacity-30"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            onClick={redo}
            disabled={undoneStrokes.length === 0}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white disabled:opacity-30"
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 className="h-4 w-4" />
          </button>
          <button
            onClick={clearAll}
            disabled={strokes.length === 0}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-red-400 disabled:opacity-30"
            title="Clear all"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );
});

export default DrawingCanvas;
