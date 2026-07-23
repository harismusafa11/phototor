import React, { useRef, useEffect, useState } from 'react';
import { LevelsParams } from '../types';

interface LevelEditorProps {
  levelsRGB: LevelsParams;
  levelsRed: LevelsParams;
  levelsGreen: LevelsParams;
  levelsBlue: LevelsParams;
  onChangeLevelsRGB: (p: LevelsParams) => void;
  onChangeLevelsRed: (p: LevelsParams) => void;
  onChangeLevelsGreen: (p: LevelsParams) => void;
  onChangeLevelsBlue: (p: LevelsParams) => void;
  sourceCanvas: HTMLCanvasElement | null;
}

export default function LevelEditor({
  levelsRGB,
  levelsRed,
  levelsGreen,
  levelsBlue,
  onChangeLevelsRGB,
  onChangeLevelsRed,
  onChangeLevelsGreen,
  onChangeLevelsBlue,
  sourceCanvas,
}: LevelEditorProps) {
  const [activeChannel, setActiveChannel] = useState<'rgb' | 'r' | 'g' | 'b'>('rgb');
  const histogramRef = useRef<HTMLCanvasElement>(null);
  const sliderBarRef = useRef<HTMLDivElement>(null);
  
  const getLevels = () => {
    if (activeChannel === 'r') return levelsRed;
    if (activeChannel === 'g') return levelsGreen;
    if (activeChannel === 'b') return levelsBlue;
    return levelsRGB;
  };

  const setLevels = (p: LevelsParams) => {
    if (activeChannel === 'r') onChangeLevelsRed(p);
    else if (activeChannel === 'g') onChangeLevelsGreen(p);
    else if (activeChannel === 'b') onChangeLevelsBlue(p);
    else onChangeLevelsRGB(p);
  };

  const levels = getLevels();
  const shadows = levels.shadows;
  const midtones = levels.midtones;
  const highlights = levels.highlights;
  const outBlack = levels.outBlack !== undefined ? levels.outBlack : 0;
  const outWhite = levels.outWhite !== undefined ? levels.outWhite : 255;

  // Calculate and draw histogram behind levels sliders
  useEffect(() => {
    const canvas = histogramRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!sourceCanvas) {
      ctx.fillStyle = '#2d2d3a';
      ctx.fillRect(0, canvas.height - 2, canvas.width, 2);
      return;
    }

    try {
      const srcCtx = sourceCanvas.getContext('2d');
      if (!srcCtx) return;
      const w = sourceCanvas.width;
      const h = sourceCanvas.height;
      const imgData = srcCtx.getImageData(0, 0, w, h);
      const data = imgData.data;

      const counts = new Uint32Array(256);
      const step = Math.max(1, Math.floor(data.length / 4 / 20000));

      for (let i = 0; i < data.length; i += step * 4) {
        if (data[i + 3] < 10) continue;
        let val = 0;
        if (activeChannel === 'r') val = data[i];
        else if (activeChannel === 'g') val = data[i + 1];
        else if (activeChannel === 'b') val = data[i + 2];
        else val = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        counts[val]++;
      }

      let max = 0;
      for (let i = 0; i < 256; i++) {
        if (counts[i] > max) max = counts[i];
      }

      // Draw histogram bars
      ctx.fillStyle =
        activeChannel === 'rgb'
          ? '#6b7280'
          : activeChannel === 'r'
          ? 'rgba(239, 68, 68, 0.6)'
          : activeChannel === 'g'
          ? 'rgba(34, 197, 94, 0.6)'
          : 'rgba(59, 130, 246, 0.6)';

      const cW = canvas.width;
      const cH = canvas.height;
      
      for (let i = 0; i < 256; i++) {
        const x = (i / 255) * cW;
        const barH = max > 0 ? (counts[i] / max) * (cH - 4) : 0;
        ctx.fillRect(x, cH - barH, cW / 256 + 0.5, barH);
      }
    } catch (e) {
      console.warn("Histogram Levels Error:", e);
    }
  }, [sourceCanvas, activeChannel]);

  // Handle Multi-Slider Dragging
  const handleSliderDrag = (type: 'shadows' | 'midtones' | 'highlights', clientX: number) => {
    const sliderBar = sliderBarRef.current;
    if (!sliderBar) return;
    const rect = sliderBar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const val = Math.round(pct * 255);

    if (type === 'shadows') {
      const newShadows = Math.min(highlights - 5, val);
      setLevels({ ...levels, shadows: newShadows });
    } else if (type === 'highlights') {
      const newHighlights = Math.max(shadows + 5, val);
      setLevels({ ...levels, highlights: newHighlights });
    } else if (type === 'midtones') {
      // Midtone Gamma slider is relative between shadows & highlights
      // 0.5 ratio is gamma 1.0. Shift left -> smaller gamma, shift right -> larger gamma
      const range = highlights - shadows;
      const relativePct = (clientX - rect.left - (shadows / 255) * rect.width) / ((range / 255) * rect.width);
      const clampedPct = Math.max(0.01, Math.min(0.99, relativePct));
      
      // Map 0-1 relative pct to 0.1-9.9 exponential gamma scale
      let newMidtones = 1.0;
      if (clampedPct < 0.5) {
        newMidtones = 0.1 + (clampedPct / 0.5) * 0.9;
      } else {
        newMidtones = 1.0 + ((clampedPct - 0.5) / 0.5) * 8.9;
      }
      setLevels({ ...levels, midtones: parseFloat(newMidtones.toFixed(2)) });
    }
  };

  const startDrag = (type: 'shadows' | 'midtones' | 'highlights', startEvent: React.MouseEvent) => {
    startEvent.preventDefault();
    const onMouseMove = (moveEvent: MouseEvent) => {
      handleSliderDrag(type, moveEvent.clientX);
    };
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Convert gamma to relative UI percentage between shadows & highlights
  const getMidtoneRelativePosition = () => {
    const range = highlights - shadows;
    if (range <= 0) return 50;
    // Map gamma back to 0-1 relative percentage
    let relativePct = 0.5;
    if (midtones < 1.0) {
      relativePct = (midtones - 0.1) / 0.9 * 0.5;
    } else {
      relativePct = 0.5 + (midtones - 1.0) / 8.9 * 0.5;
    }
    const absolutePct = shadows + relativePct * range;
    return (absolutePct / 255) * 100;
  };

  return (
    <div className="space-y-4 bg-[#0d0d11] p-3.5 rounded-lg border border-[#1b1b24] shadow-inner text-xs text-gray-300">
      <div className="flex justify-between items-center">
        <span className="font-semibold text-gray-400 font-mono uppercase tracking-wider">LEVELS EDITOR</span>
        <div className="flex gap-1 bg-[#141419] p-0.5 rounded border border-[#22222b]">
          {(['rgb', 'r', 'g', 'b'] as const).map((ch) => (
            <button
              key={ch}
              onClick={() => setActiveChannel(ch)}
              className={`px-2 py-0.5 rounded-[3px] text-[9px] font-bold uppercase transition-colors cursor-pointer ${
                activeChannel === ch
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {ch}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Histogram Graph */}
      <div className="space-y-1 select-none">
        <div className="relative w-full h-24 bg-black/60 rounded border border-[#22222b] overflow-hidden">
          <canvas ref={histogramRef} width={256} height={96} className="w-full h-full block" />
        </div>

        {/* Triple Input Levels Slider Track */}
        <div ref={sliderBarRef} className="relative h-6 w-full px-1">
          {/* Shadows Slider Handle (Black) */}
          <div
            onMouseDown={(e) => startDrag('shadows', e)}
            style={{ left: `${(shadows / 255) * 100}%` }}
            className="absolute top-0 w-3 h-4 bg-black border border-gray-600 rounded-b cursor-col-resize -translate-x-1.5 shadow hover:bg-gray-800"
            title={`Black Point: ${shadows}`}
          />
          {/* Midtones Slider Handle (Grey) */}
          <div
            onMouseDown={(e) => startDrag('midtones', e)}
            style={{ left: `${getMidtoneRelativePosition()}%` }}
            className="absolute top-0 w-3 h-4 bg-gray-500 border border-gray-300 rounded-b cursor-col-resize -translate-x-1.5 shadow hover:bg-gray-400"
            title={`Gamma: ${midtones}`}
          />
          {/* Highlights Slider Handle (White) */}
          <div
            onMouseDown={(e) => startDrag('highlights', e)}
            style={{ left: `${(highlights / 255) * 100}%` }}
            className="absolute top-0 w-3 h-4 bg-white border border-gray-400 rounded-b cursor-col-resize -translate-x-1.5 shadow hover:bg-gray-100"
            title={`White Point: ${highlights}`}
          />
        </div>
      </div>

      {/* Numeric inputs */}
      <div className="flex justify-between items-center text-[10px] bg-black/30 p-2 rounded border border-[#1b1b22]">
        <div className="text-center">
          <span className="block text-gray-500 font-mono mb-0.5">Black Point</span>
          <input
            type="number"
            min="0"
            max={highlights - 5}
            value={shadows}
            onChange={(e) => setLevels({ ...levels, shadows: Math.max(0, Math.min(highlights - 5, parseInt(e.target.value) || 0)) })}
            className="w-12 bg-[#1c1c24] border border-[#2a2a35] text-center text-white font-mono rounded py-0.5"
          />
        </div>
        <div className="text-center">
          <span className="block text-gray-500 font-mono mb-0.5">Gamma</span>
          <input
            type="number"
            min="0.01"
            max="9.99"
            step="0.05"
            value={midtones}
            onChange={(e) => setLevels({ ...levels, midtones: Math.max(0.01, Math.min(9.99, parseFloat(e.target.value) || 1.0)) })}
            className="w-14 bg-[#1c1c24] border border-[#2a2a35] text-center text-white font-mono rounded py-0.5"
          />
        </div>
        <div className="text-center">
          <span className="block text-gray-500 font-mono mb-0.5">White Point</span>
          <input
            type="number"
            min={shadows + 5}
            max="255"
            value={highlights}
            onChange={(e) => setLevels({ ...levels, highlights: Math.max(shadows + 5, Math.min(255, parseInt(e.target.value) || 255)) })}
            className="w-12 bg-[#1c1c24] border border-[#2a2a35] text-center text-white font-mono rounded py-0.5"
          />
        </div>
      </div>

      {/* Output Levels Section */}
      <div className="space-y-2 border-t border-[#1b1b24] pt-3">
        <span className="font-semibold text-gray-500 font-mono uppercase tracking-wider text-[9px] block">OUTPUT LEVELS</span>
        
        {/* Output Range Sliders */}
        <div className="space-y-2 text-[10px]">
          <div className="flex justify-between items-center gap-4">
            <span className="text-gray-400 w-16">Out Black:</span>
            <input
              type="range"
              min="0"
              max={outWhite - 5}
              value={outBlack}
              onChange={(e) => setLevels({ ...levels, outBlack: parseInt(e.target.value) })}
              className="flex-1 accent-indigo-500 bg-[#1c1c24] h-1"
            />
            <span className="font-mono text-white w-6 text-right">{outBlack}</span>
          </div>
          <div className="flex justify-between items-center gap-4">
            <span className="text-gray-400 w-16">Out White:</span>
            <input
              type="range"
              min={outBlack + 5}
              max="255"
              value={outWhite}
              onChange={(e) => setLevels({ ...levels, outWhite: parseInt(e.target.value) })}
              className="flex-1 accent-indigo-500 bg-[#1c1c24] h-1"
            />
            <span className="font-mono text-white w-6 text-right">{outWhite}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
