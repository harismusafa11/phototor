import React, { useRef, useEffect, useCallback } from 'react';
import { Project } from '../../types';
import { ZoomIn, ZoomOut } from 'lucide-react';

interface NavigatorPanelProps {
  project: Project | null;
  zoom: number;
  pan: { x: number; y: number };
  onZoomChange: (zoom: number) => void;
  onPanChange?: (pan: { x: number; y: number }) => void;
}

export default function NavigatorPanel({ project, zoom, pan, onZoomChange, onPanChange }: NavigatorPanelProps) {
  const thumbRef = useRef<HTMLCanvasElement>(null);
  const isDraggingRef = useRef(false);

  // Draw thumbnail
  useEffect(() => {
    if (!thumbRef.current || !project) return;
    const canvas = thumbRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const maxW = 220, maxH = 140;
    const scale = Math.min(maxW / project.width, maxH / project.height, 1);
    canvas.width = Math.round(project.width * scale);
    canvas.height = Math.round(project.height * scale);

    // Checkerboard for transparency
    const size = 6;
    for (let y = 0; y < canvas.height; y += size) {
      for (let x = 0; x < canvas.width; x += size) {
        ctx.fillStyle = (Math.floor(x / size) + Math.floor(y / size)) % 2 === 0 ? '#303040' : '#252535';
        ctx.fillRect(x, y, size, size);
      }
    }

    // Draw visible layers
    project.layers
      .filter((l) => l.visible)
      .forEach((layer) => {
        if (layer.imageElement || layer.imageUrl) {
          const img = layer.imageElement ?? (() => { const i = new Image(); i.src = layer.imageUrl ?? ''; return i; })();
          try {
            ctx.globalAlpha = layer.opacity;
            ctx.drawImage(img,
              layer.x * scale, layer.y * scale,
              layer.width * scale, layer.height * scale
            );
            ctx.globalAlpha = 1;
          } catch { /* image not loaded */ }
        }
      });
  }, [project, zoom]);

  const zoomPct = Math.round(zoom * 100);

  return (
    <div className="flex flex-col gap-2 p-2.5 text-gray-300">
      {/* Thumbnail area */}
      <div className="relative flex justify-center bg-[#1a1a26] rounded border border-[#2d2d40] overflow-hidden" style={{ minHeight: 80 }}>
        {project ? (
          <>
            <canvas ref={thumbRef} className="rounded" style={{ maxWidth: '100%', maxHeight: 140 }} />
            {/* Viewport indicator (simplified) */}
            <div
              className="absolute border-2 border-red-400 pointer-events-none opacity-70"
              style={{
                left: '10%', top: '10%',
                width: `${Math.min(100, (100 / zoom))}%`,
                height: `${Math.min(100, (100 / zoom))}%`,
              }}
            />
          </>
        ) : (
          <div className="flex items-center justify-center w-full h-20 text-gray-600 text-xs">No document open</div>
        )}
      </div>

      {/* Zoom controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onZoomChange(Math.max(0.1, zoom - 0.1))}
          className="p-1 rounded hover:bg-[#2a2a3c] text-gray-400 hover:text-white transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <input
          type="range"
          min={10} max={800} step={5}
          value={zoomPct}
          onChange={(e) => onZoomChange(parseInt(e.target.value) / 100)}
          className="flex-1 accent-indigo-500 h-1 bg-[#252535] rounded"
        />
        <button
          onClick={() => onZoomChange(Math.min(8, zoom + 0.1))}
          className="p-1 rounded hover:bg-[#2a2a3c] text-gray-400 hover:text-white transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <span
          className="font-mono text-[10px] text-indigo-400 w-10 text-center cursor-pointer hover:text-white"
          onClick={() => onZoomChange(1)}
          title="Reset zoom to 100%"
        >
          {zoomPct}%
        </span>
      </div>

      {/* Fit / Fill shortcuts */}
      <div className="flex gap-1.5">
        {[
          { label: 'Fit', action: () => onZoomChange(0.5) },
          { label: '100%', action: () => onZoomChange(1) },
          { label: '200%', action: () => onZoomChange(2) },
          { label: 'Fill', action: () => onZoomChange(1.5) },
        ].map(({ label, action }) => (
          <button
            key={label}
            onClick={action}
            className="flex-1 py-0.5 text-[9px] bg-[#1a1a26] border border-[#2d2d40] rounded hover:bg-[#252535] hover:text-white transition-colors font-mono"
          >
            {label}
          </button>
        ))}
      </div>

      {/* Document info */}
      {project && (
        <div className="text-[9px] text-gray-600 text-center font-mono">
          {project.width} × {project.height} px
        </div>
      )}
    </div>
  );
}
