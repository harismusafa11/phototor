import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { BlendMode } from '../types';

interface NewLayerDialogProps {
  onApply: (params: {
    name: string;
    type: 'image' | 'text' | 'shape' | 'group';
    opacity: number;
    blendMode: BlendMode;
    colorLabel: 'none' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'gray';
    locked: boolean;
  }) => void;
  onCancel: () => void;
}

const BLEND_MODES = [
  'normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten',
  'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion'
];

const COLOR_LABELS = [
  { id: 'none', label: 'None', color: 'bg-transparent border border-gray-700' },
  { id: 'red', label: 'Red', color: 'bg-red-500' },
  { id: 'orange', label: 'Orange', color: 'bg-orange-500' },
  { id: 'yellow', label: 'Yellow', color: 'bg-yellow-500' },
  { id: 'green', label: 'Green', color: 'bg-green-500' },
  { id: 'blue', label: 'Blue', color: 'bg-blue-500' },
  { id: 'purple', label: 'Purple', color: 'bg-purple-500' },
  { id: 'gray', label: 'Gray', color: 'bg-gray-500' },
];

export default function NewLayerDialog({
  onApply,
  onCancel,
}: NewLayerDialogProps) {
  const [name, setName] = useState<string>('New Layer');
  const [type, setType] = useState<'image' | 'text' | 'shape' | 'group'>('image');
  const [opacity, setOpacity] = useState<number>(100);
  const [blendMode, setBlendMode] = useState<BlendMode>('normal');
  const [colorLabel, setColorLabel] = useState<any>('none');
  const [locked, setLocked] = useState<boolean>(false);

  const handleApply = () => {
    onApply({
      name: name.trim() || 'Untitled Layer',
      type,
      opacity: opacity / 100,
      blendMode,
      colorLabel,
      locked,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs select-none">
      <div className="w-full max-w-sm bg-[#141419] border border-[#2c2c36] rounded-xl overflow-hidden p-5 shadow-2xl space-y-5 text-xs text-gray-200 font-sans">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#24242c] pb-3 shrink-0">
          <h3 className="font-bold text-sm text-white">New Layer</h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
        </div>

        {/* Form Body */}
        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-gray-400 font-bold">Layer Name:</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-[#1e1e24] border border-[#2c2c36] rounded-lg px-3 py-2 text-white font-sans text-xs focus:border-indigo-500 focus:outline-none w-full"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-gray-400 font-bold">Layer Type:</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="bg-[#1e1e24] border border-[#2c2c36] rounded-lg px-3 py-2 text-white text-xs focus:border-indigo-500 focus:outline-none"
              >
                <option value="image">Image Layer</option>
                <option value="text">Text Layer</option>
                <option value="shape">Shape Layer</option>
                <option value="group">Group / Folder</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-gray-400 font-bold">Blend Mode:</label>
              <select
                value={blendMode}
                onChange={(e) => setBlendMode(e.target.value as any)}
                className="bg-[#1e1e24] border border-[#2c2c36] rounded-lg px-3 py-2 text-white text-xs focus:border-indigo-500 focus:outline-none"
              >
                {BLEND_MODES.map(bm => <option key={bm} value={bm}>{bm.toUpperCase()}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-400 font-bold">Opacity: {opacity}%</span>
            <input
              type="range" min="0" max="100"
              value={opacity}
              onChange={(e) => setOpacity(parseInt(e.target.value))}
              className="w-44"
            />
          </div>

          {/* Color Label Buttons */}
          <div className="space-y-1.5">
            <label className="text-gray-400 font-bold">Color Label Tag:</label>
            <div className="flex items-center gap-1.5">
              {COLOR_LABELS.map(cl => (
                <button
                  key={cl.id}
                  onClick={() => setColorLabel(cl.id)}
                  title={cl.label}
                  className={`w-6 h-6 rounded-full cursor-pointer flex items-center justify-center transition-all ${cl.color} ${colorLabel === cl.id ? 'scale-115 ring-2 ring-indigo-500 ring-offset-2 ring-offset-[#141419]' : 'opacity-85 hover:opacity-100'}`}
                >
                  {colorLabel === cl.id && <span className="text-[9px] text-white">✓</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Lock Checkbox */}
          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={locked}
              onChange={(e) => setLocked(e.target.checked)}
              className="rounded text-indigo-500 bg-gray-900 border-[#2e2e38] focus:ring-0"
            />
            <span className="text-gray-300 font-bold">Lock Layer immediately</span>
          </label>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-[#24242c] pt-4 shrink-0">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 bg-[#25252e] hover:bg-[#2d2d38] border border-[#2c2c36] text-gray-300 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors flex items-center gap-1 cursor-pointer font-bold"
          >
            <Check className="w-3.5 h-3.5" />
            Create
          </button>
        </div>

      </div>
    </div>
  );
}
