import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Check, RotateCcw, Sliders } from 'lucide-react';
import { FilterEffect, FilterGalleryParams } from '../../types';
import { applyFilterGallery } from '../../utils/filters';

interface FilterGalleryDialogProps {
  onClose: () => void;
  onApply: (params: FilterGalleryParams) => void;
  previewImageData?: ImageData | null;
}

const FILTER_CATEGORIES: { name: string; effects: { id: FilterEffect; label: string; icon?: string }[] }[] = [
  {
    name: 'Blur',
    effects: [
      { id: 'gaussian-blur', label: 'Gaussian Blur' },
      { id: 'motion-blur', label: 'Motion Blur' },
      { id: 'radial-blur', label: 'Radial Blur' },
    ],
  },
  {
    name: 'Sharpen',
    effects: [
      { id: 'sharpen', label: 'Sharpen' },
    ],
  },
  {
    name: 'Stylize',
    effects: [
      { id: 'emboss', label: 'Emboss' },
      { id: 'find-edges', label: 'Find Edges' },
      { id: 'oil-paint', label: 'Oil Paint' },
      { id: 'twirl', label: 'Twirl' },
    ],
  },
  {
    name: 'Pixelate',
    effects: [
      { id: 'pixelate', label: 'Pixelate' },
      { id: 'posterize', label: 'Posterize' },
      { id: 'threshold', label: 'Threshold' },
    ],
  },
  {
    name: 'Noise',
    effects: [
      { id: 'noise', label: 'Add Noise' },
    ],
  },
];

export default function FilterGalleryDialog({ onClose, onApply, previewImageData }: FilterGalleryDialogProps) {
  const [selectedEffect, setSelectedEffect] = useState<FilterEffect>('gaussian-blur');
  const [intensity, setIntensity] = useState(50);
  const [radius, setRadius] = useState(3);
  const [angle, setAngle] = useState(0);
  const [threshold, setThreshold] = useState(128);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!previewCanvasRef.current || !previewImageData) return;
    const ctx = previewCanvasRef.current.getContext('2d');
    if (!ctx) return;
    const preview = applyFilterGallery(previewImageData, selectedEffect, { intensity, radius, angle, threshold });
    ctx.putImageData(preview, 0, 0);
  }, [selectedEffect, intensity, radius, angle, threshold, previewImageData]);

  const handleApply = () => {
    onApply({
      effect: selectedEffect,
      intensity,
      radius,
      angle,
      threshold,
    } as FilterGalleryParams);
    onClose();
  };

  const handleReset = () => {
    setIntensity(50);
    setRadius(3);
    setAngle(0);
    setThreshold(128);
  };

  const showRadius = ['gaussian-blur', 'motion-blur', 'pixelate', 'oil-paint'].includes(selectedEffect);
  const showAngle = ['motion-blur', 'twirl'].includes(selectedEffect);
  const showThreshold = ['find-edges', 'threshold'].includes(selectedEffect);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-2xl bg-[#141419] border border-[#2c2c36] rounded-xl overflow-hidden shadow-2xl"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#24242c]">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-400" />
            <h3 className="font-bold text-sm text-white">Filter Gallery</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex h-[420px]">
          <div className="w-44 overflow-y-auto border-r border-[#24242c] p-2 space-y-2 shrink-0">
            {FILTER_CATEGORIES.map((cat) => (
              <div key={cat.name}>
                <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wider px-2 py-1">{cat.name}</div>
                {cat.effects.map((eff) => (
                  <button
                    key={eff.id}
                    onClick={() => setSelectedEffect(eff.id)}
                    className={`w-full text-left px-2 py-1.5 rounded text-[10px] transition-colors cursor-pointer ${
                      selectedEffect === eff.id
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'text-gray-300 hover:bg-[#252530]'
                    }`}
                  >
                    {eff.label}
                  </button>
                ))}
              </div>
            ))}
          </div>

          <div className="flex-1 flex flex-col">
            <div className="flex-1 p-3 flex items-center justify-center bg-[#0c0c0f]">
              <canvas
                ref={previewCanvasRef}
                width={240}
                height={180}
                className="max-w-full max-h-full rounded border border-[#2d2d3a]"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>

            <div className="p-3 border-t border-[#24242c] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">{selectedEffect.replace(/-/g, ' ')}</span>
                <button onClick={handleReset} className="flex items-center gap-1 text-[9px] text-gray-500 hover:text-white cursor-pointer">
                  <RotateCcw className="w-3 h-3" /> Reset
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400 w-16">Intensity:</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={intensity}
                  onChange={(e) => setIntensity(parseInt(e.target.value))}
                  className="flex-1 accent-indigo-500 h-1 cursor-pointer"
                />
                <span className="text-[10px] font-mono text-indigo-400 w-8 text-right">{intensity}</span>
              </div>

              {showRadius && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 w-16">Radius:</span>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    value={radius}
                    onChange={(e) => setRadius(parseInt(e.target.value))}
                    className="flex-1 accent-indigo-500 h-1 cursor-pointer"
                  />
                  <span className="text-[10px] font-mono text-indigo-400 w-8 text-right">{radius}px</span>
                </div>
              )}

              {showAngle && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 w-16">Angle:</span>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={angle}
                    onChange={(e) => setAngle(parseInt(e.target.value))}
                    className="flex-1 accent-indigo-500 h-1 cursor-pointer"
                  />
                  <span className="text-[10px] font-mono text-indigo-400 w-8 text-right">{angle}°</span>
                </div>
              )}

              {showThreshold && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 w-16">Threshold:</span>
                  <input
                    type="range"
                    min="0"
                    max="255"
                    value={threshold}
                    onChange={(e) => setThreshold(parseInt(e.target.value))}
                    className="flex-1 accent-indigo-500 h-1 cursor-pointer"
                  />
                  <span className="text-[10px] font-mono text-indigo-400 w-8 text-right">{threshold}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 p-3 border-t border-[#24242c]">
              <button
                onClick={onClose}
                className="px-4 py-1.5 bg-[#1e1e24] hover:bg-[#25252e] rounded text-[11px] font-semibold text-gray-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded text-[11px] font-semibold text-white transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                Apply Filter
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
