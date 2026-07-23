import React, { useState } from 'react';
import { Slice } from '../types';
import { X, Grid, ExternalLink, Image as ImageIcon, Check } from 'lucide-react';

interface SliceOptionsDialogProps {
  slice: Slice;
  sliceIndex: number;
  onSave: (updatedSlice: Slice) => void;
  onClose: () => void;
}

export default function SliceOptionsDialog({
  slice,
  sliceIndex,
  onSave,
  onClose,
}: SliceOptionsDialogProps) {
  const [sliceType, setSliceType] = useState<'image' | 'no-image'>(slice.type || 'image');
  const [name, setName] = useState(slice.name || `slice_${String(sliceIndex + 1).padStart(2, '0')}`);
  const [url, setUrl] = useState(slice.url || '');
  const [target, setTarget] = useState(slice.target || '_blank');
  const [alt, setAlt] = useState(slice.alt || '');
  const [message, setMessage] = useState(slice.message || '');
  const [x, setX] = useState(slice.x);
  const [y, setY] = useState(slice.y);
  const [w, setW] = useState(slice.w);
  const [h, setH] = useState(slice.h);
  const [bgColor, setBgColor] = useState(slice.bgColor || 'none');
  const [format, setFormat] = useState<'png' | 'jpeg' | 'webp' | 'gif'>(slice.format || 'png');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...slice,
      type: sliceType,
      name,
      url,
      target,
      alt,
      message,
      x: Math.max(0, Number(x)),
      y: Math.max(0, Number(y)),
      w: Math.max(1, Number(w)),
      h: Math.max(1, Number(h)),
      bgColor,
      format,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm select-none p-4">
      <div className="bg-[#141419] border border-[#2a2a38] text-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#242432] bg-[#1a1a24]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Grid className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-sm font-sans tracking-wide">Slice Options</span>
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
          {/* Slice Type */}
          <div className="grid grid-cols-2 gap-3 p-1 bg-[#1a1a24] rounded-lg border border-[#262634]">
            <button
              type="button"
              onClick={() => setSliceType('image')}
              className={`py-1.5 rounded flex items-center justify-center gap-1.5 font-semibold transition-all cursor-pointer ${
                sliceType === 'image'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              Image Slice
            </button>
            <button
              type="button"
              onClick={() => setSliceType('no-image')}
              className={`py-1.5 rounded flex items-center justify-center gap-1.5 font-semibold transition-all cursor-pointer ${
                sliceType === 'no-image'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              No Image (HTML/Text)
            </button>
          </div>

          {/* Name & Format */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-[11px] text-gray-400 mb-1 font-medium">Slice Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#1c1c26] border border-[#2d2d3c] focus:border-indigo-500 rounded px-3 py-1.5 text-white outline-none font-mono"
                placeholder="slice_name"
              />
            </div>
            <div>
              <label className="block text-[11px] text-gray-400 mb-1 font-medium">Export Format</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as any)}
                className="w-full bg-[#1c1c26] border border-[#2d2d3c] focus:border-indigo-500 rounded px-2.5 py-1.5 text-gray-200 outline-none cursor-pointer font-medium"
              >
                <option value="png">PNG</option>
                <option value="jpeg">JPEG</option>
                <option value="webp">WEBP</option>
                <option value="gif">GIF</option>
              </select>
            </div>
          </div>

          {/* URL & Target */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-[11px] text-gray-400 mb-1 font-medium">URL (Web Hyperlink)</label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full bg-[#1c1c26] border border-[#2d2d3c] focus:border-indigo-500 rounded px-3 py-1.5 text-white outline-none font-mono placeholder:text-gray-600"
                placeholder="https://example.com/banner"
              />
            </div>
            <div>
              <label className="block text-[11px] text-gray-400 mb-1 font-medium">Target Frame</label>
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="w-full bg-[#1c1c26] border border-[#2d2d3c] focus:border-indigo-500 rounded px-2.5 py-1.5 text-gray-200 outline-none cursor-pointer font-medium"
              >
                <option value="_blank">_blank (New Window)</option>
                <option value="_self">_self (Same Window)</option>
                <option value="_parent">_parent</option>
                <option value="_top">_top</option>
              </select>
            </div>
          </div>

          {/* Alt Tag & Message Text */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-gray-400 mb-1 font-medium">Alt Tag (HTML Image Alt)</label>
              <input
                type="text"
                value={alt}
                onChange={(e) => setAlt(e.target.value)}
                className="w-full bg-[#1c1c26] border border-[#2d2d3c] focus:border-indigo-500 rounded px-3 py-1.5 text-white outline-none"
                placeholder="Banner description"
              />
            </div>
            <div>
              <label className="block text-[11px] text-gray-400 mb-1 font-medium">Status Message Text</label>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full bg-[#1c1c26] border border-[#2d2d3c] focus:border-indigo-500 rounded px-3 py-1.5 text-white outline-none"
                placeholder="Status bar message"
              />
            </div>
          </div>

          {/* Dimensions & Position */}
          <div className="pt-2 border-t border-[#242432]">
            <label className="block text-[11px] text-gray-400 mb-2 font-semibold">Dimensions & Position (Pixels)</label>
            <div className="grid grid-cols-4 gap-2.5">
              <div>
                <span className="text-[10px] text-gray-500 font-mono block mb-0.5">X Position</span>
                <input
                  type="number"
                  value={x}
                  onChange={(e) => setX(Number(e.target.value))}
                  className="w-full bg-[#1c1c26] border border-[#2d2d3c] focus:border-indigo-500 rounded px-2.5 py-1 text-white outline-none font-mono"
                />
              </div>
              <div>
                <span className="text-[10px] text-gray-500 font-mono block mb-0.5">Y Position</span>
                <input
                  type="number"
                  value={y}
                  onChange={(e) => setY(Number(e.target.value))}
                  className="w-full bg-[#1c1c26] border border-[#2d2d3c] focus:border-indigo-500 rounded px-2.5 py-1 text-white outline-none font-mono"
                />
              </div>
              <div>
                <span className="text-[10px] text-gray-500 font-mono block mb-0.5">Width (W)</span>
                <input
                  type="number"
                  min="1"
                  value={w}
                  onChange={(e) => setW(Number(e.target.value))}
                  className="w-full bg-[#1c1c26] border border-[#2d2d3c] focus:border-indigo-500 rounded px-2.5 py-1 text-white outline-none font-mono"
                />
              </div>
              <div>
                <span className="text-[10px] text-gray-500 font-mono block mb-0.5">Height (H)</span>
                <input
                  type="number"
                  min="1"
                  value={h}
                  onChange={(e) => setH(Number(e.target.value))}
                  className="w-full bg-[#1c1c26] border border-[#2d2d3c] focus:border-indigo-500 rounded px-2.5 py-1 text-white outline-none font-mono"
                />
              </div>
            </div>
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
