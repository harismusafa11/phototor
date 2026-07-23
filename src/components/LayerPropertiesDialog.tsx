import React, { useState } from 'react';
import { X, Check, Info } from 'lucide-react';
import { Layer, BlendMode } from '../types';

interface LayerPropertiesDialogProps {
  layer: Layer;
  onApply: (updates: Partial<Layer>) => void;
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

export default function LayerPropertiesDialog({
  layer,
  onApply,
  onCancel,
}: LayerPropertiesDialogProps) {
  const [name, setName] = useState<string>(layer.name);
  const [colorLabel, setColorLabel] = useState<any>(layer.colorLabel || 'none');
  const [opacity, setOpacity] = useState<number>(Math.round(layer.opacity * 100));
  const [blendMode, setBlendMode] = useState<BlendMode>(layer.blendMode);
  const [lockTransparency, setLockTransparency] = useState<boolean>(!!layer.lockTransparency);
  const [lockPixels, setLockPixels] = useState<boolean>(!!layer.lockPixels);
  const [lockPosition, setLockPosition] = useState<boolean>(!!layer.lockPosition);
  const [notes, setNotes] = useState<string>(layer.notes || '');

  const handleApply = () => {
    onApply({
      name: name.trim() || layer.name,
      colorLabel,
      opacity: opacity / 100,
      blendMode,
      lockTransparency,
      lockPixels,
      lockPosition,
      notes: notes.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs select-none">
      <div className="w-full max-w-md bg-[#141419] border border-[#2c2c36] rounded-xl overflow-hidden p-5 shadow-2xl space-y-4 text-xs text-gray-200 font-sans">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#24242c] pb-3 shrink-0">
          <h3 className="font-bold text-sm text-white">Layer Properties</h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
        </div>

        {/* Body */}
        <div className="grid grid-cols-2 gap-4 min-h-0 overflow-y-auto">
          
          {/* Left Column: Properties */}
          <div className="space-y-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-gray-400 font-bold">Name:</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-[#1e1e24] border border-[#2c2c36] rounded-lg px-2.5 py-1.5 text-white font-sans text-xs focus:border-indigo-500 focus:outline-none w-full"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-gray-400 font-bold">Color Label Tag:</label>
              <div className="flex flex-wrap gap-1 mt-1">
                {COLOR_LABELS.map(cl => (
                  <button
                    key={cl.id}
                    onClick={() => setColorLabel(cl.id)}
                    title={cl.label}
                    className={`w-5 h-5 rounded-full cursor-pointer flex items-center justify-center transition-all ${cl.color} ${colorLabel === cl.id ? 'scale-110 ring-2 ring-indigo-500' : 'opacity-80 hover:opacity-100'}`}
                  >
                    {colorLabel === cl.id && <span className="text-[8px] text-white">✓</span>}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-gray-400 font-bold">Locks:</label>
              <div className="space-y-1 mt-1 text-gray-300">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox" checked={lockTransparency}
                    onChange={(e) => setLockTransparency(e.target.checked)}
                    className="rounded text-indigo-500 bg-gray-900 border-[#2e2e38] focus:ring-0"
                  />
                  <span>Lock Transparency</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox" checked={lockPixels}
                    onChange={(e) => setLockPixels(e.target.checked)}
                    className="rounded text-indigo-500 bg-gray-900 border-[#2e2e38] focus:ring-0"
                  />
                  <span>Lock Pixels</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox" checked={lockPosition}
                    onChange={(e) => setLockPosition(e.target.checked)}
                    className="rounded text-indigo-500 bg-gray-900 border-[#2e2e38] focus:ring-0"
                  />
                  <span>Lock Position</span>
                </label>
              </div>
            </div>
          </div>

          {/* Right Column: Metadata & Notes */}
          <div className="space-y-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-gray-400 font-bold">Notes / Annotations:</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add layer notes here..."
                rows={3}
                className="bg-[#1e1e24] border border-[#2c2c36] rounded-lg px-2.5 py-1.5 text-white font-sans text-xs focus:border-indigo-500 focus:outline-none w-full resize-none"
              />
            </div>

            {/* Technical Metadata */}
            <div className="bg-[#101014] border border-[#1d1d23] rounded-lg p-2.5 space-y-1">
              <div className="flex items-center gap-1 text-[#4f8ab4] font-bold mb-1">
                <Info className="w-3.5 h-3.5" />
                <span>Technical Stats</span>
              </div>
              <div className="text-[10px] space-y-0.5 text-gray-400 font-mono">
                <div>Type: <span className="text-gray-200">{layer.type.toUpperCase()}</span></div>
                <div>ID: <span className="text-gray-200">{layer.id.slice(0, 12)}...</span></div>
                <div>Size: <span className="text-gray-200">{layer.width} × {layer.height} px</span></div>
                <div>Offset: <span className="text-gray-200">X:{layer.x}, Y:{layer.y}</span></div>
                <div>Rotation: <span className="text-gray-200">{layer.rotation}°</span></div>
                {layer.hasMask && <div className="text-emerald-400">Mask: ATTACHED</div>}
                {layer.isClippingMask && <div className="text-indigo-400">Clipping Mask: TRUE</div>}
              </div>
            </div>
          </div>

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
            Apply
          </button>
        </div>

      </div>
    </div>
  );
}
