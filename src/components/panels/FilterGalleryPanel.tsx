import React, { useState, useRef } from 'react';
import { Wand2, Sliders, RotateCcw, Check } from 'lucide-react';
import { FilterEffect, FilterGalleryParams } from '../../types';

interface FilterGalleryPanelProps {
  onApplyFilter: (params: FilterGalleryParams) => void;
}

const FILTERS: { effect: FilterEffect; label: string; icon: string; group: string }[] = [
  { effect: 'gaussian-blur', label: 'Gaussian Blur', icon: '〇', group: 'Blur' },
  { effect: 'motion-blur', label: 'Motion Blur', icon: '↔', group: 'Blur' },
  { effect: 'radial-blur', label: 'Radial Blur', icon: '◎', group: 'Blur' },
  { effect: 'sharpen', label: 'Sharpen', icon: '△', group: 'Sharpen' },
  { effect: 'edge-detect', label: 'Edge Detect', icon: '◈', group: 'Stylize' },
  { effect: 'emboss', label: 'Emboss', icon: '◆', group: 'Stylize' },
  { effect: 'find-edges', label: 'Find Edges', icon: '▣', group: 'Stylize' },
  { effect: 'glow', label: 'Glow Effect', icon: '✦', group: 'Stylize' },
  { effect: 'sketch', label: 'Sketch', icon: '✎', group: 'Artistic' },
  { effect: 'neon', label: 'Neon Glow', icon: '⚡', group: 'Artistic' },
  { effect: 'watercolor', label: 'Watercolor', icon: '💧', group: 'Artistic' },
  { effect: 'charcoal', label: 'Charcoal', icon: '✏', group: 'Artistic' },
  { effect: 'oil-paint', label: 'Oil Paint', icon: '🖌', group: 'Artistic' },
  { effect: 'pixelate', label: 'Pixelate', icon: '◻', group: 'Pixelate' },
  { effect: 'mosaic', label: 'Mosaic', icon: '▦', group: 'Pixelate' },
  { effect: 'color-halftone', label: 'Color Halftone', icon: '●', group: 'Pixelate' },
  { effect: 'posterize', label: 'Posterize', icon: '▒', group: 'Adjust' },
  { effect: 'threshold', label: 'Threshold', icon: '⬛', group: 'Adjust' },
  { effect: 'noise', label: 'Add Noise', icon: '▤', group: 'Noise' },
  { effect: 'dust-script', label: 'Dust & Script', icon: '※', group: 'Noise' },
  { effect: 'median', label: 'Median', icon: '⊞', group: 'Noise' },
  { effect: 'wind', label: 'Wind', icon: '≡', group: 'Distort' },
  { effect: 'ripple', label: 'Ripple', icon: '〰', group: 'Distort' },
  { effect: 'twirl', label: 'Twirl', icon: '🌀', group: 'Distort' },
  { effect: 'spherize', label: 'Spherize', icon: '🔮', group: 'Distort' },
];

const GROUPS = ['All', 'Blur', 'Sharpen', 'Stylize', 'Artistic', 'Pixelate', 'Adjust', 'Noise', 'Distort'];

export default function FilterGalleryPanel({ onApplyFilter }: FilterGalleryPanelProps) {
  const [selectedEffect, setSelectedEffect] = useState<FilterEffect>('gaussian-blur');
  const [intensity, setIntensity] = useState(50);
  const [radius, setRadius] = useState(5);
  const [angle, setAngle] = useState(0);
  const [threshold, setThreshold] = useState(128);
  const [groupFilter, setGroupFilter] = useState('All');

  const filteredFilters = groupFilter === 'All'
    ? FILTERS
    : FILTERS.filter((f) => f.group === groupFilter);

  const handleApply = () => {
    onApplyFilter({
      effect: selectedEffect,
      intensity,
      radius,
      angle,
      threshold,
    });
  };

  return (
    <div className="flex flex-col bg-[#1e1e1f] h-full text-xs select-none w-full">
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-[#181819] bg-[#181819]">
        <span className="font-bold text-gray-300 flex items-center gap-1.5 text-[10px]">
          <Wand2 className="w-3 h-3 text-indigo-400" />
          Filter Gallery
        </span>
      </div>

      <div className="flex flex-col h-full">
        {/* Group filter tabs */}
        <div className="flex flex-wrap gap-0.5 p-1.5 border-b border-[#181819] bg-[#1a1a22] max-h-20 overflow-y-auto">
          {GROUPS.map((g) => (
            <button
              key={g}
              onClick={() => setGroupFilter(g)}
              className={`px-1.5 py-0.5 text-[9px] rounded font-medium transition-colors cursor-pointer ${
                groupFilter === g
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-[#252530]'
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        {/* Filter Grid */}
        <div className="flex-1 overflow-y-auto p-1.5">
          <div className="grid grid-cols-3 gap-1.5">
            {filteredFilters.map((f) => {
              const isSelected = selectedEffect === f.effect;
              return (
                <button
                  key={f.effect}
                  onClick={() => setSelectedEffect(f.effect)}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600/20 border-indigo-500 text-white'
                      : 'bg-[#252526] border-[#2d2d3a] text-gray-300 hover:border-indigo-500/50 hover:bg-[#2d2d2e]'
                  }`}
                >
                  <span className="text-lg mb-0.5">{f.icon}</span>
                  <span className="text-[8px] text-center leading-tight">{f.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Parameters */}
        <div className="p-2 border-t border-[#181819] bg-[#1a1a22] space-y-2">
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-400 text-[10px]">Intensity:</span>
              <span className="font-mono text-gray-300 text-[10px]">{intensity}%</span>
            </div>
            <input
              type="range" min="1" max="100" value={intensity}
              onChange={(e) => setIntensity(parseInt(e.target.value))}
              className="w-full accent-indigo-500 h-1 bg-[#1c1c1d] cursor-pointer"
            />
          </div>

          {selectedEffect === 'gaussian-blur' || selectedEffect === 'motion-blur' || selectedEffect === 'radial-blur' ? (
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-400 text-[10px]">Radius:</span>
                <span className="font-mono text-gray-300 text-[10px]">{radius}px</span>
              </div>
              <input
                type="range" min="1" max="50" value={radius}
                onChange={(e) => setRadius(parseInt(e.target.value))}
                className="w-full accent-indigo-500 h-1 bg-[#1c1c1d] cursor-pointer"
              />
            </div>
          ) : null}

          {selectedEffect === 'motion-blur' || selectedEffect === 'wind' ? (
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-400 text-[10px]">Angle:</span>
                <span className="font-mono text-gray-300 text-[10px]">{angle}°</span>
              </div>
              <input
                type="range" min="0" max="360" value={angle}
                onChange={(e) => setAngle(parseInt(e.target.value))}
                className="w-full accent-indigo-500 h-1 bg-[#1c1c1d] cursor-pointer"
              />
            </div>
          ) : null}

          {selectedEffect === 'threshold' ? (
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-400 text-[10px]">Threshold:</span>
                <span className="font-mono text-gray-300 text-[10px]">{threshold}</span>
              </div>
              <input
                type="range" min="0" max="255" value={threshold}
                onChange={(e) => setThreshold(parseInt(e.target.value))}
                className="w-full accent-indigo-500 h-1 bg-[#1c1c1d] cursor-pointer"
              />
            </div>
          ) : null}

          <button
            onClick={handleApply}
            className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold cursor-pointer transition-colors flex items-center justify-center gap-1"
          >
            <Check className="w-3 h-3" />
            Apply {FILTERS.find((f) => f.effect === selectedEffect)?.label || 'Filter'}
          </button>
        </div>
      </div>
    </div>
  );
}
