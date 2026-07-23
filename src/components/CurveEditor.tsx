import React, { useState, useRef, useEffect } from 'react';
import { CurvePoint } from '../types';

interface CurveEditorProps {
  curvesRGB: CurvePoint[];
  curvesRed: CurvePoint[];
  curvesGreen: CurvePoint[];
  curvesBlue: CurvePoint[];
  onChangeCurvesRGB: (pts: CurvePoint[]) => void;
  onChangeCurvesRed: (pts: CurvePoint[]) => void;
  onChangeCurvesGreen: (pts: CurvePoint[]) => void;
  onChangeCurvesBlue: (pts: CurvePoint[]) => void;
}

const PRESETS = {
  Linear: [
    { input: 0, output: 0 },
    { input: 255, output: 255 },
  ],
  'Medium Contrast': [
    { input: 0, output: 0 },
    { input: 64, output: 48 },
    { input: 128, output: 128 },
    { input: 192, output: 208 },
    { input: 255, output: 255 },
  ],
  'Strong Contrast': [
    { input: 0, output: 0 },
    { input: 64, output: 32 },
    { input: 128, output: 128 },
    { input: 192, output: 224 },
    { input: 255, output: 255 },
  ],
};

export default function CurveEditor({
  curvesRGB,
  curvesRed,
  curvesGreen,
  curvesBlue,
  onChangeCurvesRGB,
  onChangeCurvesRed,
  onChangeCurvesGreen,
  onChangeCurvesBlue,
}: CurveEditorProps) {
  const [activeChannel, setActiveChannel] = useState<'rgb' | 'r' | 'g' | 'b'>('rgb');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

  const getPoints = () => {
    if (activeChannel === 'r') return curvesRed;
    if (activeChannel === 'g') return curvesGreen;
    if (activeChannel === 'b') return curvesBlue;
    return curvesRGB;
  };

  const setPoints = (pts: CurvePoint[]) => {
    if (activeChannel === 'r') onChangeCurvesRed(pts);
    else if (activeChannel === 'g') onChangeCurvesGreen(pts);
    else if (activeChannel === 'b') onChangeCurvesBlue(pts);
    else onChangeCurvesRGB(pts);
  };

  const points = getPoints();

  const drawCurve = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Draw background guide grid
    ctx.strokeStyle = '#1d1d24';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const pos = (i / 4) * w;
      // Verticals
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, h);
      ctx.stroke();
      // Horizontals
      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(w, pos);
      ctx.stroke();
    }

    // Diagonal reference
    ctx.strokeStyle = '#2c2c38';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(w, 0);
    ctx.stroke();
    ctx.setLineDash([]);

    // Sort points by input coordinate
    const sorted = [...points].sort((a, b) => a.input - b.input);

    // Draw curves line (cubic smooth step mapping)
    ctx.strokeStyle =
      activeChannel === 'rgb'
        ? '#818cf8'
        : activeChannel === 'r'
        ? '#ef4444'
        : activeChannel === 'g'
        ? '#22c55e'
        : '#3b82f6';
    ctx.lineWidth = 2;
    ctx.beginPath();

    // Plot curves interpolation
    for (let x = 0; x < w; x++) {
      const input = (x / w) * 255;
      let lowerIdx = 0;
      for (let j = 0; j < sorted.length - 1; j++) {
        if (input >= sorted[j].input && input <= sorted[j + 1].input) {
          lowerIdx = j;
          break;
        }
      }
      const p0 = sorted[lowerIdx];
      const p1 = sorted[Math.min(lowerIdx + 1, sorted.length - 1)];
      let outputY = 0;
      if (p0.input === p1.input) {
        outputY = p0.output;
      } else {
        const t = (input - p0.input) / (p1.input - p0.input);
        const st = t * t * (3 - 2 * t);
        outputY = p0.output + (p1.output - p0.output) * st;
      }
      const y = h - (outputY / 255) * h;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw handles (points)
    sorted.forEach((pt, idx) => {
      const x = (pt.input / 255) * w;
      const y = h - (pt.output / 255) * h;
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = ctx.strokeStyle =
        activeChannel === 'rgb'
          ? '#6366f1'
          : activeChannel === 'r'
          ? '#dc2626'
          : activeChannel === 'g'
          ? '#16a34a'
          : '#2563eb';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  };

  useEffect(() => {
    drawCurve();
  }, [points, activeChannel]);

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const input = Math.round((x / canvas.width) * 255);
    const output = Math.round((1 - y / canvas.height) * 255);

    // Check if clicking near existing point
    let foundIdx = -1;
    points.forEach((pt, idx) => {
      const ptX = (pt.input / 255) * canvas.width;
      const ptY = (1 - pt.output / 255) * canvas.height;
      const dist = Math.sqrt((x - ptX) * (x - ptX) + (y - ptY) * (y - ptY));
      if (dist < 8) {
        foundIdx = idx;
      }
    });

    if (foundIdx !== -1) {
      setDraggingIdx(foundIdx);
    } else {
      // Add point if we click on curve
      const newPoints = [...points, { input, output }].sort((a, b) => a.input - b.input);
      const newIdx = newPoints.findIndex((pt) => pt.input === input && pt.output === output);
      setPoints(newPoints);
      setDraggingIdx(newIdx);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (draggingIdx === null) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    let input = Math.round((x / canvas.width) * 255);
    let output = Math.round((1 - y / canvas.height) * 255);

    input = Math.max(0, Math.min(255, input));
    output = Math.max(0, Math.min(255, output));

    // Do not let endpoints cross their boundaries
    const currentPt = points[draggingIdx];
    if (currentPt.input === 0) {
      input = 0; // lock first point to left edge
    } else if (currentPt.input === 255) {
      input = 255; // lock last point to right edge
    } else {
      // Keep sort order bounds
      const sorted = [...points].sort((a, b) => a.input - b.input);
      const curIdxInSorted = sorted.findIndex((pt) => pt.input === currentPt.input && pt.output === currentPt.output);
      const prevPt = sorted[curIdxInSorted - 1];
      const nextPt = sorted[curIdxInSorted + 1];
      if (prevPt) input = Math.max(prevPt.input + 2, input);
      if (nextPt) input = Math.min(nextPt.input - 2, input);
    }

    const updatedPoints = points.map((pt, idx) => {
      if (idx === draggingIdx) {
        return { input, output };
      }
      return pt;
    });

    setPoints(updatedPoints);
  };

  const handleCanvasMouseUpOrLeave = () => {
    setDraggingIdx(null);
  };

  // Remove point (double click or Delete key)
  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let targetIdx = -1;
    points.forEach((pt, idx) => {
      const ptX = (pt.input / 255) * canvas.width;
      const ptY = (1 - pt.output / 255) * canvas.height;
      const dist = Math.sqrt((x - ptX) * (x - ptX) + (y - ptY) * (y - ptY));
      if (dist < 8) {
        targetIdx = idx;
      }
    });

    // Cannot remove endpoints (0 or 255)
    if (targetIdx !== -1 && points.length > 2) {
      const targetPt = points[targetIdx];
      if (targetPt.input !== 0 && targetPt.input !== 255) {
        const filtered = points.filter((_, idx) => idx !== targetIdx);
        setPoints(filtered);
      }
    }
  };

  const applyPreset = (presetName: keyof typeof PRESETS) => {
    setPoints(PRESETS[presetName]);
  };

  return (
    <div className="space-y-3 bg-[#0d0d11] p-3 rounded-lg border border-[#1b1b24] shadow-inner text-xs">
      <div className="flex justify-between items-center">
        <span className="font-semibold text-gray-400 font-mono uppercase tracking-wider">CURVE EDITOR</span>
        
        {/* Preset Selector */}
        <select
          onChange={(e) => applyPreset(e.target.value as any)}
          defaultValue="Linear"
          className="bg-[#1c1c24] border border-[#2a2a35] text-gray-300 rounded px-2 py-0.5 outline-none cursor-pointer text-[10px]"
        >
          <option value="Linear">Linear</option>
          <option value="Medium Contrast">Medium Contrast</option>
          <option value="Strong Contrast">Strong Contrast</option>
        </select>
      </div>

      {/* Channel Switcher */}
      <div className="flex gap-2">
        {(['rgb', 'r', 'g', 'b'] as const).map((ch) => (
          <button
            key={ch}
            onClick={() => setActiveChannel(ch)}
            className={`flex-1 py-1 rounded text-[10px] font-bold uppercase transition-colors cursor-pointer text-center border ${
              activeChannel === ch
                ? ch === 'rgb'
                  ? 'bg-indigo-950/40 text-indigo-400 border-indigo-700/60'
                  : ch === 'r'
                  ? 'bg-red-950/40 text-red-400 border-red-700/60'
                  : ch === 'g'
                  ? 'bg-green-950/40 text-green-400 border-green-700/60'
                  : 'bg-blue-950/40 text-blue-400 border-blue-700/60'
                : 'bg-[#141419] border-[#22222b] text-gray-400 hover:bg-[#1a1a24]'
            }`}
          >
            {ch === 'rgb' ? 'RGB' : ch.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="relative mx-auto w-[200px] h-[200px] bg-[#141419] rounded border border-[#24242d] overflow-hidden select-none">
        <canvas
          ref={canvasRef}
          width={200}
          height={200}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUpOrLeave}
          onMouseLeave={handleCanvasMouseUpOrLeave}
          onDoubleClick={handleDoubleClick}
          className="cursor-crosshair block"
        />
      </div>

      <div className="flex justify-between text-[8px] text-gray-500 font-mono px-1 select-none">
        <span>0 (Shadows)</span>
        <span>255 (Highlights)</span>
      </div>
    </div>
  );
}
