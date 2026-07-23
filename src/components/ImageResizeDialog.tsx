import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Scale, Lock, Unlock } from 'lucide-react';
import { Size } from '../types';

interface ImageResizeDialogProps {
  originalSize: Size;
  resolution: number;
  onApply: (width: number, height: number, resolution: number, algorithm: 'nearest' | 'bilinear' | 'bicubic' | 'lanczos' | 'ai-upscale') => void;
  onCancel: () => void;
}

type UnitType = 'pixels' | 'percent' | 'inches' | 'cm' | 'mm';

export default function ImageResizeDialog({
  originalSize,
  resolution: initialResolution,
  onApply,
  onCancel,
}: ImageResizeDialogProps) {
  const [unit, setUnit] = useState<UnitType>('pixels');
  const [widthVal, setWidthVal] = useState<number>(originalSize.w);
  const [heightVal, setHeightVal] = useState<number>(originalSize.h);
  const [resolution, setResolution] = useState<number>(initialResolution || 72);
  const [lockAspect, setLockAspect] = useState<boolean>(true);
  const [algorithm, setAlgorithm] = useState<'nearest' | 'bilinear' | 'bicubic' | 'lanczos' | 'ai-upscale'>('bicubic');

  const aspectRatio = originalSize.w / originalSize.h;

  // Convert pixels to target unit value
  const pixelsToUnit = (pixels: number, isWidth: boolean) => {
    if (unit === 'pixels') return pixels;
    if (unit === 'percent') return (pixels / (isWidth ? originalSize.w : originalSize.h)) * 100;
    
    // Inch conversion based on resolution (DPI)
    const inches = pixels / resolution;
    if (unit === 'inches') return inches;
    if (unit === 'cm') return inches * 2.54;
    if (unit === 'mm') return inches * 25.4;
    return pixels;
  };

  // Convert target unit value back to pixels
  const unitToPixels = (val: number, isWidth: boolean) => {
    if (unit === 'pixels') return val;
    if (unit === 'percent') return (val / 100) * (isWidth ? originalSize.w : originalSize.h);
    
    let inches = val;
    if (unit === 'cm') inches = val / 2.54;
    if (unit === 'mm') inches = val / 25.4;
    return inches * resolution;
  };

  const handleWidthChange = (val: number) => {
    setWidthVal(val);
    if (lockAspect) {
      if (unit === 'percent') {
        setHeightVal(val);
      } else {
        const pxW = unitToPixels(val, true);
        const pxH = pxW / aspectRatio;
        setHeightVal(Math.round(pixelsToUnit(pxH, false) * 100) / 100);
      }
    }
  };

  const handleHeightChange = (val: number) => {
    setHeightVal(val);
    if (lockAspect) {
      if (unit === 'percent') {
        setWidthVal(val);
      } else {
        const pxH = unitToPixels(val, false);
        const pxW = pxH * aspectRatio;
        setWidthVal(Math.round(pixelsToUnit(pxW, true) * 100) / 100);
      }
    }
  };

  // Recompute values when unit changes
  const prevUnitRef = React.useRef<UnitType>(unit);
  useEffect(() => {
    const prevUnit = prevUnitRef.current;
    if (prevUnit !== unit) {
      // Convert current pixel values to new unit representation
      const currentPxW = unitToPixels(widthVal, true);
      const currentPxH = unitToPixels(heightVal, false);

      prevUnitRef.current = unit;
      // Truncate decimals for display representation
      setWidthVal(Math.round(pixelsToUnit(currentPxW, true) * 100) / 100);
      setHeightVal(Math.round(pixelsToUnit(currentPxH, false) * 100) / 100);
    }
  }, [unit]);

  const handleApply = () => {
    // Convert current width & height to pixels before applying
    const finalW = Math.max(1, Math.round(unitToPixels(widthVal, true)));
    const finalH = Math.max(1, Math.round(unitToPixels(heightVal, false)));
    onApply(finalW, finalH, resolution, algorithm);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs select-none">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-sm bg-[#141419] border border-[#2c2c36] rounded-xl overflow-hidden p-5 shadow-2xl space-y-5"
      >
        <div className="flex items-center justify-between border-b border-[#24242c] pb-3 shrink-0">
          <div className="flex items-center gap-1.5">
            <Scale className="w-4 h-4 text-indigo-400" />
            <h3 className="font-sans font-bold text-sm text-white">Image Size</h3>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-white cursor-pointer transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs text-gray-300">
          {/* Unit selector */}
          <div className="flex justify-between items-center">
            <span>Dimensions Unit:</span>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as UnitType)}
              className="bg-[#1c1c24] border border-[#2a2a35] text-gray-200 rounded px-2 py-1 outline-none cursor-pointer"
            >
              <option value="pixels">Pixels</option>
              <option value="percent">Percent</option>
              <option value="inches">Inches</option>
              <option value="cm">Centimeters</option>
              <option value="mm">Millimeters</option>
            </select>
          </div>

          {/* Width / Height inputs with lock aspect ratio toggle */}
          <div className="flex items-center gap-2">
            <div className="flex-1 space-y-3">
              <div>
                <label className="text-gray-400 block mb-1">Width</label>
                <input
                  type="number"
                  min="0.1"
                  step="any"
                  value={widthVal}
                  onChange={(e) => handleWidthChange(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#1c1c24] border border-[#2a2a35] rounded p-2 text-white font-mono focus:outline-none"
                />
              </div>
              <div>
                <label className="text-gray-400 block mb-1">Height</label>
                <input
                  type="number"
                  min="0.1"
                  step="any"
                  value={heightVal}
                  onChange={(e) => handleHeightChange(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#1c1c24] border border-[#2a2a35] rounded p-2 text-white font-mono focus:outline-none"
                />
              </div>
            </div>

            {/* Lock aspect ratio button */}
            <button
              onClick={() => setLockAspect(!lockAspect)}
              className={`p-2 rounded border transition-colors cursor-pointer self-end mb-1 ${
                lockAspect
                  ? 'bg-indigo-650/20 border-indigo-500/60 text-indigo-400 hover:text-white'
                  : 'bg-[#1c1c24] border-[#2a2a35] text-gray-500 hover:text-gray-300'
              }`}
              title={lockAspect ? 'Unlock Aspect Ratio' : 'Lock Aspect Ratio'}
            >
              {lockAspect ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Resolution DPI */}
          <div>
            <label className="text-gray-400 block mb-1">Resolution (DPI / Pixels per Inch)</label>
            <input
              type="number"
              min="1"
              value={resolution}
              onChange={(e) => setResolution(Math.max(1, parseInt(e.target.value) || 72))}
              className="w-full bg-[#1c1c24] border border-[#2a2a35] rounded p-2 text-white font-mono focus:outline-none"
            />
          </div>

          {/* Resampling Algorithm selection */}
          <div>
            <label className="text-gray-400 block mb-1">Resample Algorithm</label>
            <select
              value={algorithm}
              onChange={(e) => setAlgorithm(e.target.value as any)}
              className="w-full bg-[#1c1c24] border border-[#2a2a35] text-gray-200 rounded p-2 outline-none cursor-pointer"
            >
              <option value="nearest">Nearest Neighbor (Fastest / Retro pixelated)</option>
              <option value="bilinear">Bilinear (Standard smooth)</option>
              <option value="bicubic">Bicubic (Best for smooth gradients)</option>
              <option value="lanczos">Lanczos (Sharpest high fidelity details)</option>
              <option value="ai-upscale">AI Super Resolution (Edge preserving crisp outlines)</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t border-[#24242c]">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-[#1e1e24] hover:bg-[#25252e] rounded-lg text-xs font-semibold text-gray-300 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-semibold text-white transition-colors cursor-pointer shadow-lg"
          >
            Resize
          </button>
        </div>
      </motion.div>
    </div>
  );
}
