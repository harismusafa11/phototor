import React, { useState } from 'react';
import { Plus, Trash2, Palette } from 'lucide-react';
import { ColorSwatch } from '../../types';

interface SwatchesPanelProps {
  onSelectColor: (color: string) => void;
  currentColor: string;
}

const DEFAULT_SWATCHES: ColorSwatch[] = [
  { hex: '#ff0000', name: 'Red' },
  { hex: '#ff6600', name: 'Orange' },
  { hex: '#ffff00', name: 'Yellow' },
  { hex: '#00ff00', name: 'Green' },
  { hex: '#00ffff', name: 'Cyan' },
  { hex: '#0066ff', name: 'Blue' },
  { hex: '#9900ff', name: 'Purple' },
  { hex: '#ff00ff', name: 'Magenta' },
  { hex: '#ffffff', name: 'White' },
  { hex: '#cccccc', name: 'Light Gray' },
  { hex: '#888888', name: 'Gray' },
  { hex: '#444444', name: 'Dark Gray' },
  { hex: '#000000', name: 'Black' },
  { hex: '#8b4513', name: 'Brown' },
  { hex: '#e9967a', name: 'Dark Salmon' },
  { hex: '#ffb6c1', name: 'Light Pink' },
  { hex: '#87ceeb', name: 'Sky Blue' },
  { hex: '#98fb98', name: 'Pale Green' },
  { hex: '#ffd700', name: 'Gold' },
  { hex: '#c0c0c0', name: 'Silver' },
];

export default function SwatchesPanel({ onSelectColor, currentColor }: SwatchesPanelProps) {
  const [swatches, setSwatches] = useState<ColorSwatch[]>(DEFAULT_SWATCHES);
  const [showPicker, setShowPicker] = useState(false);
  const [newColor, setNewColor] = useState('#ff0000');

  const handleAddSwatch = () => {
    setSwatches((prev) => [...prev, { hex: newColor, name: 'Custom', isCustom: true }]);
    setShowPicker(false);
  };

  const handleDeleteSwatch = (idx: number) => {
    setSwatches((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="flex flex-col bg-[#1e1e1f] h-full text-xs select-none w-full">
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-[#181819] bg-[#181819]">
        <span className="font-bold text-gray-300 flex items-center gap-1.5 text-[10px]">
          <Palette className="w-3 h-3 text-indigo-400" />
          Swatches
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-5 gap-1.5">
          {swatches.map((swatch, idx) => (
            <div key={idx} className="relative group">
              <button
                onClick={() => onSelectColor(swatch.hex)}
                className={`w-full aspect-square rounded border cursor-pointer transition-all hover:scale-110 hover:shadow-lg ${
                  currentColor === swatch.hex ? 'ring-2 ring-indigo-400 ring-offset-1 ring-offset-[#1e1e1f]' : 'border-[#3e3e3e]'
                }`}
                style={{ backgroundColor: swatch.hex }}
                title={swatch.name || swatch.hex}
              />
              {swatch.isCustom && (
                <button
                  onClick={() => handleDeleteSwatch(idx)}
                  className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <Trash2 className="w-2 h-2 text-white" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="p-2 border-t border-[#181819] text-[10px] space-y-2">
        {showPicker ? (
          <div className="space-y-1.5">
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="w-full h-8 rounded cursor-pointer bg-transparent border-0"
            />
            <div className="flex gap-1">
              <button
                onClick={handleAddSwatch}
                className="flex-1 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-bold cursor-pointer"
              >
                Add
              </button>
              <button
                onClick={() => setShowPicker(false)}
                className="px-2 py-1 bg-[#2d2d2e] hover:bg-[#38383a] rounded text-gray-300 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowPicker(true)}
            className="flex items-center justify-center gap-1 w-full py-1.5 bg-[#252526] hover:bg-[#2d2d2e] rounded border border-[#3e3e3e] text-gray-300 cursor-pointer transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add Swatch
          </button>
        )}
      </div>
    </div>
  );
}
