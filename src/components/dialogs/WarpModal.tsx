import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { X, RotateCcw, Check, Grid, Sliders, Move } from 'lucide-react';
import { Layer, Point, WarpConfig, WarpStyle } from '../../types';

interface WarpModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeLayer: Layer | null;
  onApplyWarp: (
    layerId: string,
    warpedDataUrl: string,
    warpedBlob: Blob,
    newWidth: number,
    newHeight: number,
    warpConfig: WarpConfig
  ) => void;
  setToast?: (toast: { message: string; type: 'success' | 'info' | 'error' } | null) => void;
}

const DEFAULT_MESH_POINTS: Point[] = [
  { x: 0, y: 0 },     { x: 0.5, y: 0 },     { x: 1, y: 0 },
  { x: 0, y: 0.5 },   { x: 0.5, y: 0.5 },   { x: 1, y: 0.5 },
  { x: 0, y: 1 },     { x: 0.5, y: 1 },     { x: 1, y: 1 },
];

export default function WarpModal({
  isOpen,
  onClose,
  activeLayer,
  onApplyWarp,
  setToast,
}: WarpModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [style, setStyle] = useState<WarpStyle>('custom');
  const [bend, setBend] = useState<number>(50);
  const [horizDistortion, setHorizDistortion] = useState<number>(0);
  const [vertDistortion, setVertDistortion] = useState<number>(0);
  const [direction, setDirection] = useState<'horizontal' | 'vertical'>('horizontal');

  // Normalized 3x3 mesh points (0..1 range)
  const [meshPoints, setMeshPoints] = useState<Point[]>(DEFAULT_MESH_POINTS);
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);
  const [isDraggingIndex, setIsDraggingIndex] = useState<number | null>(null);

  const [imgElement, setImgElement] = useState<HTMLImageElement | null>(null);
  const [previewDim, setPreviewDim] = useState<{ w: number; h: number }>({ w: 500, h: 400 });

  // Load active layer image element
  useEffect(() => {
    if (!isOpen || !activeLayer) return;

    // Reset settings to layer warpConfig if present
    const cfg = activeLayer.warpConfig;
    if (cfg) {
      setStyle(cfg.style || 'custom');
      setBend(cfg.bend !== undefined ? cfg.bend : 50);
      setHorizDistortion(cfg.horizDistortion || 0);
      setVertDistortion(cfg.vertDistortion || 0);
      setDirection(cfg.direction || 'horizontal');
      if (cfg.meshPoints && cfg.meshPoints.length === 9) {
        setMeshPoints(cfg.meshPoints);
      } else {
        setMeshPoints(DEFAULT_MESH_POINTS);
      }
    } else {
      setStyle('custom');
      setBend(50);
      setHorizDistortion(0);
      setVertDistortion(0);
      setDirection('horizontal');
      setMeshPoints(DEFAULT_MESH_POINTS);
    }

    let img = activeLayer.imageElement;
    if (img && img.complete) {
      setImgElement(img);
    } else if (activeLayer.imageUrl) {
      const temp = new Image();
      temp.crossOrigin = 'anonymous';
      temp.onload = () => setImgElement(temp);
      temp.src = activeLayer.imageUrl;
    }
  }, [isOpen, activeLayer]);

  // Compute preset mesh point deformation based on style, bend, distortion
  const computePresetMesh = (
    currentStyle: WarpStyle,
    b: number,
    hDist: number,
    vDist: number,
    dir: 'horizontal' | 'vertical'
  ): Point[] => {
    if (currentStyle === 'none' || currentStyle === 'custom') {
      return meshPoints;
    }

    const bFactor = (b / 100) * 0.35;
    const hFactor = (hDist / 100) * 0.3;
    const vFactor = (vDist / 100) * 0.3;

    // Base grid
    const grid: Point[] = [
      { x: 0, y: 0 },     { x: 0.5, y: 0 },     { x: 1, y: 0 },
      { x: 0, y: 0.5 },   { x: 0.5, y: 0.5 },   { x: 1, y: 0.5 },
      { x: 0, y: 1 },     { x: 0.5, y: 1 },     { x: 1, y: 1 },
    ];

    return grid.map((pt, idx) => {
      const row = Math.floor(idx / 3);
      const col = idx % 3;
      let nx = pt.x;
      let ny = pt.y;

      if (dir === 'horizontal') {
        const u = nx;
        const sinCurve = Math.sin(u * Math.PI);
        const cosWave = Math.sin(u * Math.PI * 2);

        if (currentStyle === 'arc') {
          ny -= sinCurve * bFactor;
        } else if (currentStyle === 'arc-lower') {
          if (row === 2) ny += sinCurve * bFactor;
        } else if (currentStyle === 'arc-upper') {
          if (row === 0) ny -= sinCurve * bFactor;
        } else if (currentStyle === 'wave') {
          ny += cosWave * bFactor * 0.5;
        } else if (currentStyle === 'bulge' || currentStyle === 'inflate') {
          if (col === 1) nx += (nx - 0.5) * bFactor;
          if (row === 1) ny += (ny - 0.5) * bFactor;
        } else if (currentStyle === 'flag') {
          ny += Math.sin(u * Math.PI * 1.5) * bFactor * 0.6;
        } else if (currentStyle === 'fish') {
          const scale = 1 + (u - 0.5) * bFactor * 1.5;
          ny = 0.5 + (ny - 0.5) * scale;
        } else if (currentStyle === 'twist') {
          const rot = (u - 0.5) * bFactor * 1.5;
          const dy = ny - 0.5;
          ny = 0.5 + dy * Math.cos(rot);
        } else if (currentStyle === 'squeeze') {
          const scale = 1 - sinCurve * bFactor;
          ny = 0.5 + (ny - 0.5) * scale;
        }

        // Apply distortion
        ny += (u - 0.5) * vFactor;
        nx += (pt.y - 0.5) * hFactor;
      } else {
        const v = ny;
        const sinCurve = Math.sin(v * Math.PI);
        const cosWave = Math.sin(v * Math.PI * 2);

        if (currentStyle === 'arc') {
          nx -= sinCurve * bFactor;
        } else if (currentStyle === 'wave') {
          nx += cosWave * bFactor * 0.5;
        } else if (currentStyle === 'bulge' || currentStyle === 'inflate') {
          if (col === 1) nx += (nx - 0.5) * bFactor;
          if (row === 1) ny += (ny - 0.5) * bFactor;
        } else if (currentStyle === 'flag') {
          nx += Math.sin(v * Math.PI * 1.5) * bFactor * 0.6;
        } else if (currentStyle === 'fish') {
          const scale = 1 + (v - 0.5) * bFactor * 1.5;
          nx = 0.5 + (nx - 0.5) * scale;
        } else if (currentStyle === 'squeeze') {
          const scale = 1 - sinCurve * bFactor;
          nx = 0.5 + (nx - 0.5) * scale;
        }

        nx += (v - 0.5) * hFactor;
        ny += (pt.x - 0.5) * vFactor;
      }

      return { x: Math.max(-0.5, Math.min(1.5, nx)), y: Math.max(-0.5, Math.min(1.5, ny)) };
    });
  };

  const effectiveMeshPoints = computePresetMesh(style, bend, horizDistortion, vertDistortion, direction);

  // Render warped preview onto canvas
  useEffect(() => {
    if (!canvasRef.current || !imgElement) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const maxW = 560;
    const maxH = 400;
    const srcW = imgElement.naturalWidth || imgElement.width || activeLayer?.width || 800;
    const srcH = imgElement.naturalHeight || imgElement.height || activeLayer?.height || 600;

    const scale = Math.min(maxW / srcW, maxH / srcH);
    const renderW = Math.round(srcW * scale);
    const renderH = Math.round(srcH * scale);

    canvas.width = renderW;
    canvas.height = renderH;
    setPreviewDim({ w: renderW, h: renderH });

    // Build 3x3 pixel grid coordinates
    const pixelMesh: Point[][] = [
      [
        { x: effectiveMeshPoints[0].x * renderW, y: effectiveMeshPoints[0].y * renderH },
        { x: effectiveMeshPoints[1].x * renderW, y: effectiveMeshPoints[1].y * renderH },
        { x: effectiveMeshPoints[2].x * renderW, y: effectiveMeshPoints[2].y * renderH },
      ],
      [
        { x: effectiveMeshPoints[3].x * renderW, y: effectiveMeshPoints[3].y * renderH },
        { x: effectiveMeshPoints[4].x * renderW, y: effectiveMeshPoints[4].y * renderH },
        { x: effectiveMeshPoints[5].x * renderW, y: effectiveMeshPoints[5].y * renderH },
      ],
      [
        { x: effectiveMeshPoints[6].x * renderW, y: effectiveMeshPoints[6].y * renderH },
        { x: effectiveMeshPoints[7].x * renderW, y: effectiveMeshPoints[7].y * renderH },
        { x: effectiveMeshPoints[8].x * renderW, y: effectiveMeshPoints[8].y * renderH },
      ],
    ];

    drawWarpedMesh(ctx, imgElement, srcW, srcH, pixelMesh, 20);
  }, [imgElement, effectiveMeshPoints, activeLayer]);

  // Mouse Handlers for Interactive 3x3 Control Points Dragging
  const handleMouseDownPoint = (idx: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActivePointIndex(idx);
    setIsDraggingIndex(idx);
    setStyle('custom'); // Switch to custom when manually moving handles
  };

  const handleMouseMoveContainer = (e: React.MouseEvent) => {
    if (isDraggingIndex === null || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const normX = mouseX / previewDim.w;
    const normY = mouseY / previewDim.h;

    setMeshPoints((prev) => {
      const updated = [...prev];
      updated[isDraggingIndex] = {
        x: Math.max(-0.5, Math.min(1.5, normX)),
        y: Math.max(-0.5, Math.min(1.5, normY)),
      };
      return updated;
    });
  };

  const handleMouseUpContainer = () => {
    setIsDraggingIndex(null);
  };

  const handleResetMesh = () => {
    setStyle('custom');
    setBend(0);
    setHorizDistortion(0);
    setVertDistortion(0);
    setMeshPoints(DEFAULT_MESH_POINTS);
    setActivePointIndex(null);
    if (setToast) setToast({ message: 'Mesh handles reset to default.', type: 'info' });
  };

  const handleApply = () => {
    if (!activeLayer || !imgElement) return;

    const srcW = imgElement.naturalWidth || imgElement.width || activeLayer.width;
    const srcH = imgElement.naturalHeight || imgElement.height || activeLayer.height;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = Math.max(1, Math.round(srcW));
    exportCanvas.height = Math.max(1, Math.round(srcH));

    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    const pixelMesh: Point[][] = [
      [
        { x: effectiveMeshPoints[0].x * srcW, y: effectiveMeshPoints[0].y * srcH },
        { x: effectiveMeshPoints[1].x * srcW, y: effectiveMeshPoints[1].y * srcH },
        { x: effectiveMeshPoints[2].x * srcW, y: effectiveMeshPoints[2].y * srcH },
      ],
      [
        { x: effectiveMeshPoints[3].x * srcW, y: effectiveMeshPoints[3].y * srcH },
        { x: effectiveMeshPoints[4].x * srcW, y: effectiveMeshPoints[4].y * srcH },
        { x: effectiveMeshPoints[5].x * srcW, y: effectiveMeshPoints[5].y * srcH },
      ],
      [
        { x: effectiveMeshPoints[6].x * srcW, y: effectiveMeshPoints[6].y * srcH },
        { x: effectiveMeshPoints[7].x * srcW, y: effectiveMeshPoints[7].y * srcH },
        { x: effectiveMeshPoints[8].x * srcW, y: effectiveMeshPoints[8].y * srcH },
      ],
    ];

    drawWarpedMesh(ctx, imgElement, srcW, srcH, pixelMesh, 32);

    exportCanvas.toBlob((blob) => {
      if (blob) {
        const dataUrl = exportCanvas.toDataURL();
        const warpConfig: WarpConfig = {
          style,
          bend,
          horizDistortion,
          vertDistortion,
          direction,
          meshPoints: effectiveMeshPoints,
        };

        onApplyWarp(activeLayer.id, dataUrl, blob, srcW, srcH, warpConfig);
        onClose();
      }
    }, 'image/png');
  };

  if (!isOpen || !activeLayer) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[#121218] border border-[#2b2b3c] rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-[#22222e] bg-[#161622]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Grid className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-sans font-bold text-white text-base">Warp Transform</h3>
              <p className="text-[11px] text-gray-400">
                Deform layer object shape using presets or drag 3x3 mesh control handles interactively
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-[#252535] text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Grid */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          {/* Left Canvas Preview Area */}
          <div className="md:col-span-8 p-6 bg-[#0a0a0d] flex flex-col items-center justify-center relative overflow-hidden select-none">
            <div
              ref={containerRef}
              style={{ width: previewDim.w, height: previewDim.h }}
              onMouseMove={handleMouseMoveContainer}
              onMouseUp={handleMouseUpContainer}
              onMouseLeave={handleMouseUpContainer}
              className="relative shadow-2xl border border-[#2d2d3e] rounded-lg overflow-hidden bg-checkerboard"
            >
              <canvas ref={canvasRef} className="block w-full h-full object-contain pointer-events-none" />

              {/* 3x3 Mesh Overlay Grid Lines */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                {/* Horizontal mesh curves */}
                {[0, 1, 2].map((r) => {
                  const p0 = effectiveMeshPoints[r * 3];
                  const p1 = effectiveMeshPoints[r * 3 + 1];
                  const p2 = effectiveMeshPoints[r * 3 + 2];
                  const x0 = p0.x * previewDim.w, y0 = p0.y * previewDim.h;
                  const x1 = p1.x * previewDim.w, y1 = p1.y * previewDim.h;
                  const x2 = p2.x * previewDim.w, y2 = p2.y * previewDim.h;

                  return (
                    <path
                      key={`row-${r}`}
                      d={`M ${x0} ${y0} Q ${2 * x1 - 0.5 * (x0 + x2)} ${2 * y1 - 0.5 * (y0 + y2)} ${x2} ${y2}`}
                      stroke="#818cf8"
                      strokeWidth="1.5"
                      fill="none"
                      strokeDasharray={r === 1 ? '4 3' : undefined}
                    />
                  );
                })}

                {/* Vertical mesh curves */}
                {[0, 1, 2].map((c) => {
                  const p0 = effectiveMeshPoints[c];
                  const p1 = effectiveMeshPoints[3 + c];
                  const p2 = effectiveMeshPoints[6 + c];
                  const x0 = p0.x * previewDim.w, y0 = p0.y * previewDim.h;
                  const x1 = p1.x * previewDim.w, y1 = p1.y * previewDim.h;
                  const x2 = p2.x * previewDim.w, y2 = p2.y * previewDim.h;

                  return (
                    <path
                      key={`col-${c}`}
                      d={`M ${x0} ${y0} Q ${2 * x1 - 0.5 * (x0 + x2)} ${2 * y1 - 0.5 * (y0 + y2)} ${x2} ${y2}`}
                      stroke="#818cf8"
                      strokeWidth="1.5"
                      fill="none"
                      strokeDasharray={c === 1 ? '4 3' : undefined}
                    />
                  );
                })}
              </svg>

              {/* Interactive 3x3 Control Handles */}
              {effectiveMeshPoints.map((pt, idx) => {
                const posX = pt.x * previewDim.w;
                const posY = pt.y * previewDim.h;
                const isActive = activePointIndex === idx || isDraggingIndex === idx;

                return (
                  <div
                    key={idx}
                    onMouseDown={(e) => handleMouseDownPoint(idx, e)}
                    style={{ left: `${posX}px`, top: `${posY}px` }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 cursor-grab active:cursor-grabbing transition-all z-20 flex items-center justify-center ${
                      isActive
                        ? 'bg-amber-400 border-white ring-4 ring-amber-500/40 scale-125'
                        : 'bg-indigo-600 border-white hover:scale-125 hover:bg-indigo-500 shadow-md'
                    }`}
                    title={`Mesh Node ${idx + 1}`}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  </div>
                );
              })}
            </div>

            <div className="mt-3 flex items-center gap-2 text-[11px] text-gray-400">
              <Move className="w-3.5 h-3.5 text-indigo-400" />
              <span>Drag 3x3 control points on the image to warp freely</span>
            </div>
          </div>

          {/* Right Parameters Panel */}
          <div className="md:col-span-4 p-5 bg-[#14141d] border-l border-[#242434] flex flex-col justify-between space-y-4 overflow-y-auto">
            <div className="space-y-4">
              <h4 className="font-sans font-bold text-xs text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-indigo-400" />
                <span>Warp Settings</span>
              </h4>

              {/* Preset Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300">Warp Style (Preset):</label>
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value as WarpStyle)}
                  className="w-full bg-[#1e1e2b] border border-[#323246] text-white px-3 py-2 rounded-lg text-xs font-sans focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="custom">🌀 Custom Grid Mesh (Interactive)</option>
                  <option value="arc">🏹 Arc</option>
                  <option value="arc-lower">🔻 Arc Lower</option>
                  <option value="arc-upper">🔺 Arc Upper</option>
                  <option value="wave">🌊 Wave</option>
                  <option value="bulge">🎈 Bulge / Inflate</option>
                  <option value="flag">🚩 Flag</option>
                  <option value="fish">🐟 Fish</option>
                  <option value="squeeze">⏳ Squeeze</option>
                  <option value="twist">🔄 Twist (Vortex)</option>
                </select>
              </div>

              {/* Direction Toggle */}
              {style !== 'custom' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-300">Warp Direction:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDirection('horizontal')}
                      className={`py-1.5 px-3 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                        direction === 'horizontal'
                          ? 'bg-indigo-600 border-indigo-400 text-white'
                          : 'bg-[#1a1a24] border-[#2d2d3e] text-gray-400 hover:text-white'
                      }`}
                    >
                      Horizontal ↔
                    </button>
                    <button
                      type="button"
                      onClick={() => setDirection('vertical')}
                      className={`py-1.5 px-3 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                        direction === 'vertical'
                          ? 'bg-indigo-600 border-indigo-400 text-white'
                          : 'bg-[#1a1a24] border-[#2d2d3e] text-gray-400 hover:text-white'
                      }`}
                    >
                      Vertical ↕
                    </button>
                  </div>
                </div>
              )}

              {/* Bend Slider */}
              {style !== 'custom' && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-gray-300">
                    <span>Bend:</span>
                    <span className="font-mono text-indigo-400 font-bold">{bend}%</span>
                  </div>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={bend}
                    onChange={(e) => setBend(parseInt(e.target.value))}
                    className="w-full accent-indigo-500 h-1.5 bg-[#0a0a0e] rounded cursor-pointer"
                  />
                </div>
              )}

              {/* Horizontal Distortion */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-gray-300">
                  <span>Horizontal Distortion:</span>
                  <span className="font-mono text-indigo-400 font-bold">{horizDistortion}%</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={horizDistortion}
                  onChange={(e) => setHorizDistortion(parseInt(e.target.value))}
                  className="w-full accent-indigo-500 h-1.5 bg-[#0a0a0e] rounded cursor-pointer"
                />
              </div>

              {/* Vertical Distortion */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-gray-300">
                  <span>Vertical Distortion:</span>
                  <span className="font-mono text-indigo-400 font-bold">{vertDistortion}%</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={vertDistortion}
                  onChange={(e) => setVertDistortion(parseInt(e.target.value))}
                  className="w-full accent-indigo-500 h-1.5 bg-[#0a0a0e] rounded cursor-pointer"
                />
              </div>

              {/* Reset Handles Button */}
              <button
                type="button"
                onClick={handleResetMesh}
                className="w-full py-2 bg-[#1c1c28] hover:bg-[#28283a] border border-[#2d2d3e] text-gray-300 hover:text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>Reset Mesh Points</span>
              </button>
            </div>

            {/* Modal Actions */}
            <div className="space-y-2 pt-4 border-t border-[#222232]">
              <button
                type="button"
                onClick={handleApply}
                className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Apply Warp to Layer</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 bg-[#181822] hover:bg-[#222230] text-gray-400 hover:text-white rounded-xl font-semibold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ── Bilinear ImageData Mesh Warp Renderer ─────────────────────────────────
function drawWarpedMesh(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | HTMLCanvasElement,
  srcW: number,
  srcH: number,
  mesh: Point[][],
  gridSteps = 24
) {
  const targetW = ctx.canvas.width;
  const targetH = ctx.canvas.height;
  if (targetW <= 0 || targetH <= 0 || srcW <= 0 || srcH <= 0) return;

  ctx.clearRect(0, 0, targetW, targetH);

  // Extract source ImageData from offscreen canvas
  const sCanvas = document.createElement('canvas');
  sCanvas.width = srcW;
  sCanvas.height = srcH;
  const sCtx = sCanvas.getContext('2d');
  if (!sCtx) return;

  sCtx.drawImage(img, 0, 0, srcW, srcH);
  const srcImgData = sCtx.getImageData(0, 0, srcW, srcH);

  const warpedImgData = renderWarpImageData(srcImgData, targetW, targetH, mesh, gridSteps);
  ctx.putImageData(warpedImgData, 0, 0);
}

function renderWarpImageData(
  srcImgData: ImageData,
  targetW: number,
  targetH: number,
  mesh: Point[][],
  gridSteps = 24
): ImageData {
  const { width: srcW, height: srcH, data: srcData } = srcImgData;
  const outImgData = new ImageData(targetW, targetH);
  const outData = outImgData.data;

  // 3x3 Bezier mesh interpolation
  const getPt = (u: number, v: number) => {
    const B0u = (1 - u) * (1 - u);
    const B1u = 2 * (1 - u) * u;
    const B2u = u * u;

    const B0v = (1 - v) * (1 - v);
    const B1v = 2 * (1 - v) * v;
    const B2v = v * v;

    let x = 0;
    let y = 0;

    const uWeights = [B0u, B1u, B2u];
    const vWeights = [B0v, B1v, B2v];

    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const w = vWeights[r] * uWeights[c];
        x += mesh[r][c].x * w;
        y += mesh[r][c].y * w;
      }
    }

    return { x, y };
  };

  const du = 1 / gridSteps;
  const dv = 1 / gridSteps;

  for (let gy = 0; gy < gridSteps; gy++) {
    for (let gx = 0; gx < gridSteps; gx++) {
      const u0 = gx * du;
      const v0 = gy * dv;
      const u1 = u0 + du;
      const v1 = v0 + dv;

      // Source vertices in original image space
      const s00 = { x: u0 * srcW, y: v0 * srcH };
      const s10 = { x: u1 * srcW, y: v0 * srcH };
      const s01 = { x: u0 * srcW, y: v1 * srcH };
      const s11 = { x: u1 * srcW, y: v1 * srcH };

      // Destination warped vertices in target canvas space
      const d00 = getPt(u0, v0);
      const d10 = getPt(u1, v0);
      const d01 = getPt(u0, v1);
      const d11 = getPt(u1, v1);

      // Triangle 1: s00-s10-s01 -> d00-d10-d01
      renderWarpTriangle(srcData, srcW, srcH, outData, targetW, targetH, s00, s10, s01, d00, d10, d01);

      // Triangle 2: s11-s01-s10 -> d11-d01-d10
      renderWarpTriangle(srcData, srcW, srcH, outData, targetW, targetH, s11, s01, s10, d11, d01, d10);
    }
  }

  return outImgData;
}

function renderWarpTriangle(
  srcData: Uint8ClampedArray,
  srcW: number,
  srcH: number,
  outData: Uint8ClampedArray,
  targetW: number,
  targetH: number,
  s0: Point, s1: Point, s2: Point,
  d0: Point, d1: Point, d2: Point
) {
  // Destination triangle bounding box
  const minX = Math.max(0, Math.floor(Math.min(d0.x, d1.x, d2.x)));
  const maxX = Math.min(targetW - 1, Math.ceil(Math.max(d0.x, d1.x, d2.x)));
  const minY = Math.max(0, Math.floor(Math.min(d0.y, d1.y, d2.y)));
  const maxY = Math.min(targetH - 1, Math.ceil(Math.max(d0.y, d1.y, d2.y)));

  const denom = (d1.y - d2.y) * (d0.x - d2.x) + (d2.x - d1.x) * (d0.y - d2.y);
  if (Math.abs(denom) < 1e-5) return;

  const invDenom = 1 / denom;

  for (let py = minY; py <= maxY; py++) {
    const dy2 = py - d2.y;
    for (let px = minX; px <= maxX; px++) {
      const dx2 = px - d2.x;

      const w0 = ((d1.y - d2.y) * dx2 + (d2.x - d1.x) * dy2) * invDenom;
      const w1 = ((d2.y - d0.y) * dx2 + (d0.x - d2.x) * dy2) * invDenom;
      const w2 = 1 - w0 - w1;

      // Inside triangle check with 0.001 seam tolerance
      if (w0 >= -0.001 && w1 >= -0.001 && w2 >= -0.001) {
        // Source location
        const sx = w0 * s0.x + w1 * s1.x + w2 * s2.x;
        const sy = w0 * s0.y + w1 * s1.y + w2 * s2.y;

        if (sx >= 0 && sx < srcW - 1 && sy >= 0 && sy < srcH - 1) {
          const outIdx = (py * targetW + px) * 4;

          // Bilinear interpolation
          const x0 = Math.floor(sx);
          const y0 = Math.floor(sy);
          const x1 = x0 + 1;
          const y1 = y0 + 1;

          const fx = sx - x0;
          const fy = sy - y0;

          const w00 = (1 - fx) * (1 - fy);
          const w10 = fx * (1 - fy);
          const w01 = (1 - fx) * fy;
          const w11 = fx * fy;

          const i00 = (y0 * srcW + x0) * 4;
          const i10 = (y0 * srcW + x1) * 4;
          const i01 = (y1 * srcW + x0) * 4;
          const i11 = (y1 * srcW + x1) * 4;

          const a00 = srcData[i00 + 3];
          const a10 = srcData[i10 + 3];
          const a01 = srcData[i01 + 3];
          const a11 = srcData[i11 + 3];
          const alpha = a00 * w00 + a10 * w10 + a01 * w01 + a11 * w11;

          if (alpha > 0.5) {
            const r = srcData[i00] * w00 + srcData[i10] * w10 + srcData[i01] * w01 + srcData[i11] * w11;
            const g = srcData[i00 + 1] * w00 + srcData[i10 + 1] * w10 + srcData[i01 + 1] * w01 + srcData[i11 + 1] * w11;
            const b = srcData[i00 + 2] * w00 + srcData[i10 + 2] * w10 + srcData[i01 + 2] * w01 + srcData[i11 + 2] * w11;

            outData[outIdx]     = Math.round(r);
            outData[outIdx + 1] = Math.round(g);
            outData[outIdx + 2] = Math.round(b);
            outData[outIdx + 3] = Math.round(alpha);
          }
        }
      }
    }
  }
}
