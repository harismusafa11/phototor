import React, { useState, useRef, useEffect } from 'react';
import { Sliders, RotateCcw, Check } from 'lucide-react';
import { CurvePoint, LevelsParams, Adjustments } from '../../types';

interface CurvesLevelsPanelProps {
  adjustments: Adjustments;
  onUpdateAdjustments: (updates: Partial<Adjustments>) => void;
  onReset: () => void;
  onApplyCurves: () => void;
  onApplyLevels: () => void;
}

const INITIAL_LEVELS: LevelsParams = { shadows: 0, midtones: 1.0, highlights: 255 };

// Helper to compute curve LUT using Natural Cubic Spline
function computeCurveLut(points: CurvePoint[]): Uint8Array {
  const lut = new Uint8Array(256);
  const n = points.length;

  if (n === 0) {
    for (let i = 0; i < 256; i++) lut[i] = i;
    return lut;
  }
  if (n === 1) {
    for (let i = 0; i < 256; i++) lut[i] = points[0].output;
    return lut;
  }

  // Sort by input
  const sorted = [...points].sort((a, b) => a.input - b.input);
  
  // Ensure we have endpoints at 0 and 255
  if (sorted[0].input > 0) {
    sorted.unshift({ input: 0, output: sorted[0].output });
  }
  if (sorted[sorted.length - 1].input < 255) {
    sorted.push({ input: 255, output: sorted[sorted.length - 1].output });
  }

  const k = sorted.length;
  
  // Natural Cubic Spline interpolation
  const h = new Float64Array(k - 1);
  for (let i = 0; i < k - 1; i++) {
    h[i] = sorted[i + 1].input - sorted[i].input;
    if (h[i] <= 0) h[i] = 0.000001;
  }

  const a = new Float64Array(k);
  for (let i = 0; i < k; i++) {
    a[i] = sorted[i].output;
  }

  const alpha = new Float64Array(k - 1);
  for (let i = 1; i < k - 1; i++) {
    alpha[i] = (3 / h[i]) * (a[i + 1] - a[i]) - (3 / h[i - 1]) * (a[i] - a[i - 1]);
  }

  const l = new Float64Array(k);
  const mu = new Float64Array(k);
  const z = new Float64Array(k);
  l[0] = 1;
  mu[0] = 0;
  z[0] = 0;

  for (let i = 1; i < k - 1; i++) {
    l[i] = 2 * (sorted[i + 1].input - sorted[i - 1].input) - h[i - 1] * mu[i - 1];
    mu[i] = h[i] / l[i];
    z[i] = (alpha[i] - h[i - 1] * z[i - 1]) / l[i];
  }

  l[k - 1] = 1;
  z[k - 1] = 0;
  const c = new Float64Array(k);
  const b = new Float64Array(k - 1);
  const d = new Float64Array(k - 1);

  c[k - 1] = 0;
  for (let j = k - 2; j >= 0; j--) {
    c[j] = z[j] - mu[j] * c[j + 1];
    b[j] = (a[j + 1] - a[j]) / h[j] - (h[j] * (c[j + 1] + 2 * c[j])) / 3;
    d[j] = (c[j + 1] - c[j]) / (3 * h[j]);
  }

  // Fill the lookup table
  for (let i = 0; i < 256; i++) {
    let idx = 0;
    for (let j = 0; j < k - 1; j++) {
      if (i >= sorted[j].input && i <= sorted[j + 1].input) {
        idx = j;
        break;
      }
    }
    const dx = i - sorted[idx].input;
    const val = a[idx] + b[idx] * dx + c[idx] * dx * dx + d[idx] * dx * dx * dx;
    lut[i] = Math.max(0, Math.min(255, Math.round(val)));
  }

  return lut;
}

export default function CurvesLevelsPanel({ adjustments, onUpdateAdjustments, onReset, onApplyCurves, onApplyLevels }: CurvesLevelsPanelProps) {
  const [tab, setTab] = useState<'curves' | 'levels'>('curves');
  const [curvePoints, setCurvePoints] = useState<CurvePoint[]>([
    { input: 0, output: 0 },
    { input: 255, output: 255 },
  ]);
  const [levels, setLevels] = useState<LevelsParams>(INITIAL_LEVELS);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDraggingRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  // Clean up raf on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const deferUpdateAdjustments = (updates: Partial<Adjustments>) => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(() => {
      onUpdateAdjustments(updates);
    });
  };

  // Sync state from adjustments prop when active layer changes
  useEffect(() => {
    if (isDraggingRef.current) return;

    if (adjustments.curvesRGB) {
      const propStr = JSON.stringify(adjustments.curvesRGB);
      const localStr = JSON.stringify(curvePoints);
      if (propStr !== localStr) {
        setCurvePoints(adjustments.curvesRGB);
      }
    } else {
      if (curvePoints.length !== 2 || curvePoints[0].input !== 0 || curvePoints[0].output !== 0 || curvePoints[1].input !== 255 || curvePoints[1].output !== 255) {
        setCurvePoints([
          { input: 0, output: 0 },
          { input: 255, output: 255 },
        ]);
      }
    }

    if (adjustments.levelsRGB) {
      if (JSON.stringify(adjustments.levelsRGB) !== JSON.stringify(levels)) {
        setLevels(adjustments.levelsRGB);
      }
    } else {
      if (JSON.stringify(levels) !== JSON.stringify(INITIAL_LEVELS)) {
        setLevels(INITIAL_LEVELS);
      }
    }
  }, [adjustments]);

  const drawCurve = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = '#2d2d3a';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const pos = (i / 4) * w;
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(w, pos);
      ctx.stroke();
    }

    // Diagonal reference
    ctx.strokeStyle = '#3d3d4a';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(w, 0);
    ctx.stroke();
    ctx.setLineDash([]);

    // Sort points by input
    const sorted = [...curvePoints].sort((a, b) => a.input - b.input);

    // Draw smooth spline curve
    const lut = computeCurveLut(curvePoints);
    ctx.strokeStyle = '#818cf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let xVal = 0; xVal < 256; xVal++) {
      const x = (xVal / 255) * w;
      const y = h - (lut[xVal] / 255) * h;
      if (xVal === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw handles
    sorted.forEach((pt) => {
      const x = (pt.input / 255) * w;
      const y = h - (pt.output / 255) * h;
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#818cf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  };

  useEffect(() => {
    drawCurve();
  }, [curvePoints]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const input = Math.round((x / rect.width) * 255);
    const output = Math.round((1 - y / rect.height) * 255);

    // Check if clicking near existing point
    const threshold = 12;
    const existing = curvePoints.findIndex(
      (p) => Math.abs(p.input - input) < threshold && Math.abs(p.output - output) < threshold
    );

    if (existing >= 0) {
      setDraggingIdx(existing);
    } else {
      const newPoints = [...curvePoints, { input, output }].sort((a, b) => a.input - b.input);
      setCurvePoints(newPoints);
      setDraggingIdx(newPoints.findIndex((p) => p.input === input && p.output === output));
      deferUpdateAdjustments({ curvesRGB: newPoints });
    }
  };

  const handleCanvasMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (draggingIdx === null) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const input = Math.max(0, Math.min(255, Math.round((x / rect.width) * 255)));
    const output = Math.max(0, Math.min(255, Math.round((1 - y / rect.height) * 255)));

    // Create updated point
    const draggedPoint = {
      input: draggingIdx === 0 ? 0 : draggingIdx === curvePoints.length - 1 ? 255 : input,
      output
    };

    // Update in-place
    let newPoints = [...curvePoints];
    newPoints[draggingIdx] = draggedPoint;

    // Track reference to drag target
    const targetObj = newPoints[draggingIdx];

    // Sort to maintain monotonic sequence
    newPoints.sort((a, b) => a.input - b.input);

    // Find new index
    const newDraggingIdx = newPoints.indexOf(targetObj);

    setCurvePoints(newPoints);
    if (newDraggingIdx >= 0) {
      setDraggingIdx(newDraggingIdx);
    }
    deferUpdateAdjustments({ curvesRGB: newPoints });
  };

  const removePoint = () => {
    if (curvePoints.length <= 2) return;
    if (draggingIdx !== null && draggingIdx > 0 && draggingIdx < curvePoints.length - 1) {
      const newPoints = curvePoints.filter((_, i) => i !== draggingIdx);
      setCurvePoints(newPoints);
      setDraggingIdx(null);
      deferUpdateAdjustments({ curvesRGB: newPoints });
    }
  };

  const handleResetCurves = () => {
    const defaultPoints = [
      { input: 0, output: 0 },
      { input: 255, output: 255 },
    ];
    setCurvePoints(defaultPoints);
    setLevels(INITIAL_LEVELS);
    deferUpdateAdjustments({
      curvesRGB: defaultPoints,
      levelsRGB: INITIAL_LEVELS
    });
    onReset();
  };

  return (
    <div className="flex flex-col bg-[#1e1e1f] h-full text-xs select-none w-full">
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-[#181819] bg-[#181819]">
        <span className="font-bold text-gray-300 flex items-center gap-1.5 text-[10px]">
          <Sliders className="w-3 h-3 text-amber-400" />
          Curves & Levels
        </span>
        <button onClick={handleResetCurves} className="text-gray-500 hover:text-white cursor-pointer p-1" title="Reset">
          <RotateCcw className="w-3 h-3" />
        </button>
      </div>

      <div className="flex bg-[#141418] mx-2 mt-2 rounded border border-[#2d2d3a] p-0.5">
        {(['curves', 'levels'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-1 text-[10px] font-bold rounded transition-all cursor-pointer uppercase ${
              tab === t ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {tab === 'curves' && (
          <div className="space-y-2">
            <canvas
              ref={canvasRef}
              width={200}
              height={200}
              onMouseDown={handleCanvasClick}
              onMouseMove={handleCanvasMove}
              onMouseUp={() => { setDraggingIdx(null); isDraggingRef.current = false; }}
              onMouseLeave={() => { setDraggingIdx(null); isDraggingRef.current = false; }}
              className="w-full aspect-square bg-[#141418] rounded border border-[#2d2d3a] cursor-crosshair"
              style={{ imageRendering: 'pixelated' }}
            />
            <div className="flex items-center justify-between text-[9px] text-gray-500 px-1">
              <span>Input: {draggingIdx !== null ? curvePoints[draggingIdx].input : '-'}</span>
              <span>Output: {draggingIdx !== null ? curvePoints[draggingIdx].output : '-'}</span>
            </div>
            <div className="flex gap-1">
              <button
                onClick={onApplyCurves}
                className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold cursor-pointer transition-colors flex items-center justify-center gap-1"
              >
                <Check className="w-3 h-3" />
                Apply Curve
              </button>
              <button
                onClick={removePoint}
                disabled={curvePoints.length <= 2}
                className="px-2 py-1.5 bg-[#252530] hover:bg-[#2d2d3c] text-gray-300 rounded text-[10px] cursor-pointer transition-colors disabled:opacity-30"
              >
                Delete Point
              </button>
            </div>
            <div className="text-[9px] text-gray-500 leading-relaxed px-1">
              Click on the curve to add points. Drag points to adjust. Click near an existing point to select it.
            </div>
          </div>
        )}

        {tab === 'levels' && (
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="flex justify-between text-gray-400 text-[10px]">
                <span>Shadows (Black Point):</span>
                <span className="font-mono text-gray-300">{levels.shadows}</span>
              </div>
              <input
                type="range"
                min="0"
                max="255"
                value={levels.shadows}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  const newLevels = { ...levels, shadows: val };
                  setLevels(newLevels);
                  deferUpdateAdjustments({ levelsRGB: newLevels });
                }}
                className="w-full accent-indigo-500 h-1 bg-[#1c1c1d] cursor-pointer"
              />
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-4 h-4 rounded bg-black border border-[#3e3e3e]" />
                <input
                  type="number"
                  min="0"
                  max="255"
                  value={levels.shadows}
                  onChange={(e) => {
                    const val = Math.max(0, Math.min(255, parseInt(e.target.value) || 0));
                    const newLevels = { ...levels, shadows: val };
                    setLevels(newLevels);
                    deferUpdateAdjustments({ levelsRGB: newLevels });
                  }}
                  className="w-14 bg-[#141418] border border-[#2d2d3a] rounded px-1.5 py-0.5 text-white font-mono text-center text-[10px] focus:outline-none focus:border-indigo-500"
                />
                <span className="text-gray-500 text-[9px]">(shadows)</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-gray-400 text-[10px]">
                <span>Midtones (Gamma):</span>
                <span className="font-mono text-gray-300">{levels.midtones.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.10"
                max="9.90"
                step="0.01"
                value={levels.midtones}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  const newLevels = { ...levels, midtones: val };
                  setLevels(newLevels);
                  deferUpdateAdjustments({ levelsRGB: newLevels });
                }}
                className="w-full accent-amber-500 h-1 bg-[#1c1c1d] cursor-pointer"
              />
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-4 h-4 rounded bg-[#888888] border border-[#3e3e3e]" />
                <input
                  type="number"
                  min="0.01"
                  max="9.99"
                  step="0.01"
                  value={levels.midtones}
                  onChange={(e) => {
                    const val = Math.max(0.01, Math.min(9.99, parseFloat(e.target.value) || 1.0));
                    const newLevels = { ...levels, midtones: val };
                    setLevels(newLevels);
                    deferUpdateAdjustments({ levelsRGB: newLevels });
                  }}
                  className="w-14 bg-[#141418] border border-[#2d2d3a] rounded px-1.5 py-0.5 text-white font-mono text-center text-[10px] focus:outline-none focus:border-amber-500"
                />
                <span className="text-gray-500 text-[9px]">(midtones)</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-gray-400 text-[10px]">
                <span>Highlights (White Point):</span>
                <span className="font-mono text-gray-300">{levels.highlights}</span>
              </div>
              <input
                type="range"
                min="0"
                max="255"
                value={levels.highlights}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  const newLevels = { ...levels, highlights: val };
                  setLevels(newLevels);
                  deferUpdateAdjustments({ levelsRGB: newLevels });
                }}
                className="w-full accent-indigo-500 h-1 bg-[#1c1c1d] cursor-pointer"
              />
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-4 h-4 rounded bg-white border border-[#3e3e3e]" />
                <input
                  type="number"
                  min="0"
                  max="255"
                  value={levels.highlights}
                  onChange={(e) => {
                    const val = Math.max(0, Math.min(255, parseInt(e.target.value) || 255));
                    const newLevels = { ...levels, highlights: val };
                    setLevels(newLevels);
                    deferUpdateAdjustments({ levelsRGB: newLevels });
                  }}
                  className="w-14 bg-[#141418] border border-[#2d2d3a] rounded px-1.5 py-0.5 text-white font-mono text-center text-[10px] focus:outline-none focus:border-indigo-500"
                />
                <span className="text-gray-500 text-[9px]">(highlights)</span>
              </div>
            </div>

            <button
              onClick={onApplyLevels}
              className="w-full py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-[10px] font-bold cursor-pointer transition-colors"
            >
              Apply Levels
            </button>

            <div className="flex gap-2 text-[9px] text-gray-500 bg-[#252526] p-2 rounded border border-[#2d2d3a]">
              <div className="flex-1 text-center">
                <div className="w-full h-6 rounded bg-gradient-to-r from-black via-gray-500 to-white border border-[#3e3e3e] mb-1" />
                <span>Input: {levels.shadows} → {levels.highlights}</span>
              </div>
              <div className="flex-1 text-center">
                <div className="w-full h-6 rounded bg-gradient-to-r from-black via-gray-500 to-white border border-[#3e3e3e] mb-1" />
                <span>Gamma: {levels.midtones.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
