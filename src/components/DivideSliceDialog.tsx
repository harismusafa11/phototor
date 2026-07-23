import React, { useState } from 'react';
import { Slice } from '../types';
import { X, Grid, Check } from 'lucide-react';

interface DivideSliceDialogProps {
  slice: Slice;
  sliceIndex: number;
  onDivide: (dividedSlices: Omit<Slice, 'id'>[]) => void;
  onClose: () => void;
}

export default function DivideSliceDialog({
  slice,
  sliceIndex,
  onDivide,
  onClose,
}: DivideSliceDialogProps) {
  const [divideHorizontally, setDivideHorizontally] = useState(false);
  const [hMode, setHMode] = useState<'count' | 'pixels'>('count');
  const [hCount, setHCount] = useState(2);
  const [hPixels, setHPixels] = useState(Math.round(slice.h / 2));

  const [divideVertically, setDivideVertically] = useState(false);
  const [vMode, setVMode] = useState<'count' | 'pixels'>('count');
  const [vCount, setVCount] = useState(2);
  const [vPixels, setVPixels] = useState(Math.round(slice.w / 2));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!divideHorizontally && !divideVertically) {
      onClose();
      return;
    }

    const numRows = divideHorizontally
      ? hMode === 'count'
        ? Math.max(1, Math.round(hCount))
        : Math.max(1, Math.round(slice.h / Math.max(1, hPixels)))
      : 1;

    const numCols = divideVertically
      ? vMode === 'count'
        ? Math.max(1, Math.round(vCount))
        : Math.max(1, Math.round(slice.w / Math.max(1, vPixels)))
      : 1;

    const rowH = slice.h / numRows;
    const colW = slice.w / numCols;

    const result: Omit<Slice, 'id'>[] = [];

    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        const x = Math.round(slice.x + c * colW);
        const y = Math.round(slice.y + r * rowH);
        const w = Math.round(c === numCols - 1 ? slice.x + slice.w - x : colW);
        const h = Math.round(r === numRows - 1 ? slice.y + slice.h - y : rowH);

        result.push({
          x,
          y,
          w: Math.max(1, w),
          h: Math.max(1, h),
          name: `${slice.name || `slice_${sliceIndex + 1}`}_${r}_${c}`,
          type: slice.type || 'image',
          format: slice.format || 'png',
        });
      }
    }

    onDivide(result);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm select-none p-4">
      <div className="bg-[#141419] border border-[#2a2a38] text-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#242432] bg-[#1a1a24]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Grid className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-sm font-sans tracking-wide">Divide Slice</span>
            <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-mono font-semibold px-2 py-0.5 rounded border border-indigo-500/30">
              #{sliceIndex + 1}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#282836] text-gray-400 hover:text-white rounded cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs font-sans">
          {/* Divide Horizontally */}
          <div className="p-3.5 bg-[#181822] rounded-lg border border-[#262636] space-y-2.5">
            <label className="flex items-center gap-2 font-bold text-gray-200 cursor-pointer">
              <input
                type="checkbox"
                checked={divideHorizontally}
                onChange={(e) => setDivideHorizontally(e.target.checked)}
                className="accent-indigo-500 rounded"
              />
              <span>Divide Horizontally Into (Rows)</span>
            </label>

            {divideHorizontally && (
              <div className="pl-6 space-y-2 text-gray-300">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="hMode"
                    checked={hMode === 'count'}
                    onChange={() => setHMode('count')}
                    className="accent-indigo-500"
                  />
                  <span>slices down, evenly spaced</span>
                  <input
                    type="number"
                    min="2"
                    max="100"
                    value={hCount}
                    onChange={(e) => setHCount(Number(e.target.value))}
                    className="w-16 bg-[#101017] border border-[#2d2d3c] rounded px-2 py-0.5 text-white font-mono outline-none ml-auto text-right"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="hMode"
                    checked={hMode === 'pixels'}
                    onChange={() => setHMode('pixels')}
                    className="accent-indigo-500"
                  />
                  <span>pixels per slice</span>
                  <input
                    type="number"
                    min="1"
                    value={hPixels}
                    onChange={(e) => setHPixels(Number(e.target.value))}
                    className="w-16 bg-[#101017] border border-[#2d2d3c] rounded px-2 py-0.5 text-white font-mono outline-none ml-auto text-right"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Divide Vertically */}
          <div className="p-3.5 bg-[#181822] rounded-lg border border-[#262636] space-y-2.5">
            <label className="flex items-center gap-2 font-bold text-gray-200 cursor-pointer">
              <input
                type="checkbox"
                checked={divideVertically}
                onChange={(e) => setDivideVertically(e.target.checked)}
                className="accent-indigo-500 rounded"
              />
              <span>Divide Vertically Into (Columns)</span>
            </label>

            {divideVertically && (
              <div className="pl-6 space-y-2 text-gray-300">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="vMode"
                    checked={vMode === 'count'}
                    onChange={() => setVMode('count')}
                    className="accent-indigo-500"
                  />
                  <span>slices across, evenly spaced</span>
                  <input
                    type="number"
                    min="2"
                    max="100"
                    value={vCount}
                    onChange={(e) => setVCount(Number(e.target.value))}
                    className="w-16 bg-[#101017] border border-[#2d2d3c] rounded px-2 py-0.5 text-white font-mono outline-none ml-auto text-right"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="vMode"
                    checked={vMode === 'pixels'}
                    onChange={() => setVMode('pixels')}
                    className="accent-indigo-500"
                  />
                  <span>pixels per slice</span>
                  <input
                    type="number"
                    min="1"
                    value={vPixels}
                    onChange={(e) => setVPixels(Number(e.target.value))}
                    className="w-16 bg-[#101017] border border-[#2d2d3c] rounded px-2 py-0.5 text-white font-mono outline-none ml-auto text-right"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#242432]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-[#20202c] hover:bg-[#282838] border border-[#2e2e40] text-gray-300 hover:text-white rounded-lg transition-colors font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors font-bold cursor-pointer flex items-center gap-1.5 shadow-lg"
            >
              <Check className="w-3.5 h-3.5" />
              OK
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
