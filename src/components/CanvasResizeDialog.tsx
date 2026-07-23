import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Maximize, ArrowLeftRight } from 'lucide-react';
import { Size } from '../types';
import { CANVAS_PRESETS, CANVAS_PRESET_CATEGORIES } from '../utils/canvasPresets';

interface CanvasResizeDialogProps {
  currentSize: Size;
  onApply: (width: number, height: number, anchor: string, extColor: string) => void;
  onCancel: () => void;
}

const ANCHORS = [
  { id: 'top-left', label: '↖' },
  { id: 'top-center', label: '↑' },
  { id: 'top-right', label: '↗' },
  { id: 'middle-left', label: '←' },
  { id: 'middle-center', label: '⊙' },
  { id: 'middle-right', label: '→' },
  { id: 'bottom-left', label: '↙' },
  { id: 'bottom-center', label: '↓' },
  { id: 'bottom-right', label: '↘' },
];

export default function CanvasResizeDialog({
  currentSize,
  onApply,
  onCancel,
}: CanvasResizeDialogProps) {
  const [widthVal, setWidthVal] = useState<number>(currentSize.w);
  const [heightVal, setHeightVal] = useState<number>(currentSize.h);
  const [anchor, setAnchor] = useState<string>('middle-center');
  const [colorType, setColorType] = useState<'transparent' | 'white' | 'black' | 'background' | 'custom'>('transparent');
  const [customColor, setCustomColor] = useState<string>('#ffffff');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');

  const getExtColor = () => {
    if (colorType === 'transparent') return 'transparent';
    if (colorType === 'white') return '#ffffff';
    if (colorType === 'black') return '#000000';
    if (colorType === 'background') return '#1e1e24'; // default workspace dark gray
    return customColor;
  };

  const handleApply = () => {
    onApply(
      Math.max(1, Math.round(widthVal)),
      Math.max(1, Math.round(heightVal)),
      anchor,
      getExtColor()
    );
  };

  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const preset = CANVAS_PRESETS.find(p => p.id === presetId);
    if (preset) {
      setWidthVal(preset.width);
      setHeightVal(preset.height);
    }
  };

  const handleSwapDimensions = () => {
    const temp = widthVal;
    setWidthVal(heightVal);
    setHeightVal(temp);
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
            <Maximize className="w-4 h-4 text-indigo-400" />
            <h3 className="font-sans font-bold text-sm text-white">Canvas Size</h3>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-white cursor-pointer transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs text-gray-300">
          {/* Current Canvas size display */}
          <div className="bg-[#0f0f13] p-3 rounded-lg border border-[#202028] space-y-1 text-[10px] font-mono">
            <div className="flex justify-between text-gray-500">
              <span>Current Width:</span>
              <span className="text-white">{currentSize.w} px</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Current Height:</span>
              <span className="text-white">{currentSize.h} px</span>
            </div>
          </div>

          {/* Preset Canvas Size Dropdown */}
          <div>
            <label className="text-gray-400 block mb-1 text-[11px]">Canvas Size Preset</label>
            <select
              value={selectedPresetId}
              onChange={(e) => handleSelectPreset(e.target.value)}
              className="w-full bg-[#1c1c24] border border-[#2a2a35] rounded p-2 text-white font-sans text-xs focus:border-indigo-500 focus:outline-none cursor-pointer"
            >
              <option value="">-- Select Canvas Preset --</option>
              {CANVAS_PRESET_CATEGORIES.filter(c => c.id !== 'all').map((cat) => (
                <optgroup key={cat.id} label={cat.label}>
                  {CANVAS_PRESETS.filter(p => p.category === cat.id).map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name} ({preset.width} × {preset.height} px) [{preset.badge}]
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* New Width and Height inputs with swap button */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="text-gray-400 block mb-1">New Width (px)</label>
              <input
                type="number"
                min="1"
                value={widthVal}
                onChange={(e) => {
                  setWidthVal(Math.max(1, parseInt(e.target.value) || 1));
                  setSelectedPresetId('');
                }}
                className="w-full bg-[#1c1c24] border border-[#2a2a35] rounded p-2 text-white font-mono focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={handleSwapDimensions}
              title="Tukar Lebar & Tinggi"
              className="p-2.5 bg-[#1c1c24] hover:bg-[#252530] border border-[#2a2a35] text-gray-300 hover:text-white rounded transition-colors cursor-pointer mb-[1px]"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
            </button>

            <div className="flex-1">
              <label className="text-gray-400 block mb-1">New Height (px)</label>
              <input
                type="number"
                min="1"
                value={heightVal}
                onChange={(e) => {
                  setHeightVal(Math.max(1, parseInt(e.target.value) || 1));
                  setSelectedPresetId('');
                }}
                className="w-full bg-[#1c1c24] border border-[#2a2a35] rounded p-2 text-white font-mono focus:outline-none"
              />
            </div>
          </div>

          {/* 3x3 Anchor Positioning Grid */}
          <div className="space-y-1.5 flex flex-col items-center">
            <label className="text-gray-400 block self-start">Anchor Position</label>
            <div className="grid grid-cols-3 gap-1 bg-[#0f0f13] p-1.5 rounded-lg border border-[#202028] w-28 h-28">
              {ANCHORS.map((anc) => (
                <button
                  key={anc.id}
                  onClick={() => setAnchor(anc.id)}
                  className={`flex items-center justify-center text-sm font-semibold rounded transition-all cursor-pointer ${
                    anchor === anc.id
                      ? 'bg-indigo-600 text-white font-black scale-105 shadow-md border border-indigo-500'
                      : 'bg-[#1c1c24] text-gray-500 hover:text-gray-300 hover:bg-[#22222d]'
                  }`}
                >
                  {anc.label}
                </button>
              ))}
            </div>
          </div>

          {/* Extension Background color options */}
          <div className="space-y-1.5">
            <label className="text-gray-400 block">Canvas Extension Color</label>
            <div className="flex gap-2">
              <select
                value={colorType}
                onChange={(e) => setColorType(e.target.value as any)}
                className="flex-1 bg-[#1c1c24] border border-[#2a2a35] text-gray-200 rounded px-2.5 py-1.5 outline-none cursor-pointer"
              >
                <option value="transparent">Transparent</option>
                <option value="white">White</option>
                <option value="black">Black</option>
                <option value="background">Background (Gray)</option>
                <option value="custom">Custom Color</option>
              </select>

              {colorType === 'custom' && (
                <input
                  type="color"
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  className="w-9 h-8 border border-[#2a2a35] rounded bg-transparent cursor-pointer"
                />
              )}
            </div>
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
            Apply Resize
          </button>
        </div>
      </motion.div>
    </div>
  );
}
