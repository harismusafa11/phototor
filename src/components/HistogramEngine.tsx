import React, { useRef, useEffect, useState } from 'react';

interface HistogramEngineProps {
  sourceCanvas: HTMLCanvasElement | null;
  height?: number;
}

export default function HistogramEngine({ sourceCanvas, height = 120 }: HistogramEngineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [channelMode, setChannelMode] = useState<'rgb' | 'red' | 'green' | 'blue' | 'luminance'>('rgb');

  useEffect(() => {
    const histogramCanvas = canvasRef.current;
    if (!histogramCanvas) return;
    const ctx = histogramCanvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, histogramCanvas.width, histogramCanvas.height);

    // Default placeholder grid if no source
    if (!sourceCanvas) {
      ctx.strokeStyle = '#2d2d3a';
      ctx.lineWidth = 1;
      // Draw grid
      for (let i = 1; i < 4; i++) {
        const x = (histogramCanvas.width / 4) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, histogramCanvas.height);
        ctx.stroke();
      }
      ctx.fillStyle = '#6b7280';
      ctx.font = '10px sans-serif';
      ctx.fillText('No image data', histogramCanvas.width / 2 - 32, histogramCanvas.height / 2 + 3);
      return;
    }

    try {
      const srcCtx = sourceCanvas.getContext('2d');
      if (!srcCtx) return;

      const w = sourceCanvas.width;
      const h = sourceCanvas.height;
      const imgData = srcCtx.getImageData(0, 0, w, h);
      const data = imgData.data;

      // Initialize counts
      const rHist = new Uint32Array(256);
      const gHist = new Uint32Array(256);
      const bHist = new Uint32Array(256);
      const lHist = new Uint32Array(256);

      // Count pixel color distributions (optimised step for performance on larger layers)
      const step = Math.max(1, Math.floor(data.length / 4 / 30000));
      for (let i = 0; i < data.length; i += step * 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        if (a < 10) continue; // ignore highly transparent pixels

        rHist[r]++;
        gHist[g]++;
        bHist[b]++;
        
        const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        lHist[lum]++;
      }

      // Find max value to normalize scaling
      let maxVal = 0;
      for (let i = 0; i < 256; i++) {
        if (channelMode === 'red' && rHist[i] > maxVal) maxVal = rHist[i];
        else if (channelMode === 'green' && gHist[i] > maxVal) maxVal = gHist[i];
        else if (channelMode === 'blue' && bHist[i] > maxVal) maxVal = bHist[i];
        else if (channelMode === 'luminance' && lHist[i] > maxVal) maxVal = lHist[i];
        else if (channelMode === 'rgb') {
          const maxRGB = Math.max(rHist[i], gHist[i], bHist[i]);
          if (maxRGB > maxVal) maxVal = maxRGB;
        }
      }

      const histW = histogramCanvas.width;
      const histH = histogramCanvas.height;
      
      // Draw grid
      ctx.strokeStyle = '#24242d';
      ctx.lineWidth = 0.5;
      for (let i = 1; i < 4; i++) {
        const x = (histW / 4) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, histH);
        ctx.stroke();
      }

      const drawChannelCurve = (hist: Uint32Array, color: string, fillColor: string) => {
        ctx.beginPath();
        ctx.moveTo(0, histH);
        for (let i = 0; i < 256; i++) {
          const x = (i / 255) * histW;
          const val = hist[i];
          const normH = maxVal > 0 ? (val / maxVal) * (histH - 10) : 0;
          ctx.lineTo(x, histH - normH);
        }
        ctx.lineTo(histW, histH);
        ctx.closePath();
        ctx.fillStyle = fillColor;
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.stroke();
      };

      if (channelMode === 'rgb') {
        drawChannelCurve(rHist, '#ef4444', 'rgba(239, 68, 68, 0.2)');
        drawChannelCurve(gHist, '#22c55e', 'rgba(34, 197, 94, 0.2)');
        drawChannelCurve(bHist, '#3b82f6', 'rgba(59, 130, 246, 0.2)');
      } else if (channelMode === 'red') {
        drawChannelCurve(rHist, '#ef4444', 'rgba(239, 68, 68, 0.4)');
      } else if (channelMode === 'green') {
        drawChannelCurve(gHist, '#22c55e', 'rgba(34, 197, 94, 0.4)');
      } else if (channelMode === 'blue') {
        drawChannelCurve(bHist, '#3b82f6', 'rgba(59, 130, 246, 0.4)');
      } else {
        drawChannelCurve(lHist, '#f59e0b', 'rgba(245, 158, 11, 0.3)');
      }

    } catch (e) {
      console.error('Error drawing histogram:', e);
    }
  }, [sourceCanvas, channelMode]);

  return (
    <div className="space-y-1.5 w-full bg-[#0d0d11] p-2.5 rounded-lg border border-[#1b1b24] shadow-inner">
      <div className="flex justify-between items-center text-[10px] text-gray-400">
        <span className="font-semibold tracking-wider font-mono">HISTOGRAM</span>
        <div className="flex gap-1.5">
          {(['rgb', 'red', 'green', 'blue', 'luminance'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setChannelMode(mode)}
              className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase transition-colors cursor-pointer ${
                channelMode === mode
                  ? 'bg-[#2f2f3e] text-white border border-[#4d4d61]'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>
      <canvas
        ref={canvasRef}
        width={256}
        height={height}
        className="w-full rounded-md border border-[#21212c] bg-black/40 block"
      />
    </div>
  );
}
