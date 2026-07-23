import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Check, Pipette } from 'lucide-react';
import { ColorSwatch } from '../types';

interface ColorPickerDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (color: string) => void;
  initialColor: string;
}

function hexToHsl(hex: string) {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex[1] + hex[2], 16);
    g = parseInt(hex[3] + hex[4], 16);
    b = parseInt(hex[5] + hex[6], 16);
  }
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex(h: number, s: number, l: number) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

const QUICK_SWATCHES: ColorSwatch[] = [
  { hex: '#ffffff' }, { hex: '#cccccc' }, { hex: '#999999' }, { hex: '#666666' }, { hex: '#333333' }, { hex: '#000000' },
  { hex: '#ff0000' }, { hex: '#ff6600' }, { hex: '#ffff00' }, { hex: '#00ff00' }, { hex: '#00ffff' }, { hex: '#0066ff' },
  { hex: '#9900ff' }, { hex: '#ff00ff' }, { hex: '#800000' }, { hex: '#808000' }, { hex: '#008000' }, { hex: '#008080' },
  { hex: '#000080' }, { hex: '#800080' }, { hex: '#ffa500' }, { hex: '#a52a2a' }, { hex: '#8a2be2' }, { hex: '#ff1493' },
  { hex: '#00ced1' }, { hex: '#32cd32' }, { hex: '#ffd700' }, { hex: '#ff69b4' }, { hex: '#ba55d3' }, { hex: '#00fa9a' },
];

export default function ColorPickerDialog({ open, onClose, onConfirm, initialColor }: ColorPickerDialogProps) {
  const [hex, setHex] = useState(initialColor);
  const [hsl, setHsl] = useState(hexToHsl(initialColor));
  const [huePos, setHuePos] = useState({ x: 0, y: 0 });
  const [brightnessPos, setBrightnessPos] = useState({ x: 0, y: 0 });
  const [activeTab, setActiveTab] = useState<'hsl' | 'rgb' | 'hex'>('hex');
  const [rgb, setRgb] = useState({ r: 255, g: 255, b: 255 });
  const [isDraggingHue, setIsDraggingHue] = useState(false);
  const [isDraggingBrightness, setIsDraggingBrightness] = useState(false);

  useEffect(() => {
    setHex(initialColor);
    setHsl(hexToHsl(initialColor));
    const r = parseInt(initialColor.slice(1, 3), 16) || 255;
    const g = parseInt(initialColor.slice(3, 5), 16) || 255;
    const b = parseInt(initialColor.slice(5, 7), 16) || 255;
    setRgb({ r, g, b });
  }, [initialColor, open]);

  const handleHueChange = (h: number) => {
    const newHsl = { ...hsl, h: Math.max(0, Math.min(360, h)) };
    setHsl(newHsl);
    setHex(hslToHex(newHsl.h, newHsl.s, newHsl.l));
  };

  const handleSatLumChange = (s: number, l: number) => {
    const newHsl = { ...hsl, s: Math.max(0, Math.min(100, s)), l: Math.max(0, Math.min(100, l)) };
    setHsl(newHsl);
    setHex(hslToHex(newHsl.h, newHsl.s, newHsl.l));
  };

  const handleHexChange = (val: string) => {
    if (/^#[0-9a-fA-F]{0,6}$/.test(val)) {
      setHex(val);
      if (val.length === 7) {
        setHsl(hexToHsl(val));
        const r = parseInt(val.slice(1, 3), 16) || 0;
        const g = parseInt(val.slice(3, 5), 16) || 0;
        const b = parseInt(val.slice(5, 7), 16) || 0;
        setRgb({ r, g, b });
      }
    }
  };

  const handleRgbChange = (channel: 'r' | 'g' | 'b', val: number) => {
    const newRgb = { ...rgb, [channel]: Math.max(0, Math.min(255, val)) };
    setRgb(newRgb);
    const h = `#${newRgb.r.toString(16).padStart(2, '0')}${newRgb.g.toString(16).padStart(2, '0')}${newRgb.b.toString(16).padStart(2, '0')}`;
    setHex(h);
    setHsl(hexToHsl(h));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-[380px] bg-[#1a1a20] border border-[#2d2d3a] rounded-xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2d2d3a] bg-[#141418]">
          <span className="text-sm font-bold text-white flex items-center gap-2">
            <Pipette className="w-4 h-4 text-indigo-400" />
            Color Picker
          </span>
          <button onClick={onClose} className="text-gray-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Color Preview */}
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-xl border-2 border-[#3e3e3e] shadow-inner"
              style={{ backgroundColor: hex }}
            />
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-16 text-[10px] text-gray-400 font-mono">Hue:</span>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={hsl.h}
                  onChange={(e) => handleHueChange(parseInt(e.target.value))}
                  className="flex-1 accent-indigo-500 h-1.5 cursor-pointer"
                />
                <span className="w-10 text-right text-[10px] font-mono text-gray-300">{hsl.h}°</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-16 text-[10px] text-gray-400 font-mono">Sat:</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={hsl.s}
                  onChange={(e) => handleSatLumChange(parseInt(e.target.value), hsl.l)}
                  className="flex-1 accent-indigo-500 h-1.5 cursor-pointer"
                />
                <span className="w-10 text-right text-[10px] font-mono text-gray-300">{hsl.s}%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-16 text-[10px] text-gray-400 font-mono">Lum:</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={hsl.l}
                  onChange={(e) => handleSatLumChange(hsl.s, parseInt(e.target.value))}
                  className="flex-1 accent-indigo-500 h-1.5 cursor-pointer"
                />
                <span className="w-10 text-right text-[10px] font-mono text-gray-300">{hsl.l}%</span>
              </div>
            </div>
          </div>

          {/* Tabs: HSL / RGB / HEX */}
          <div className="flex bg-[#141418] rounded-lg border border-[#2d2d3a] p-0.5">
            {(['hex', 'hsl', 'rgb'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-1.5 text-[10px] font-bold rounded transition-all cursor-pointer uppercase ${
                  activeTab === tab ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* HEX Input */}
          {activeTab === 'hex' && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400 font-mono w-10">HEX:</span>
              <input
                type="text"
                value={hex}
                onChange={(e) => handleHexChange(e.target.value)}
                className="flex-1 bg-[#141418] border border-[#2d2d3a] rounded px-3 py-1.5 text-white font-mono text-sm focus:border-indigo-500 focus:outline-none"
                placeholder="#000000"
              />
            </div>
          )}

          {/* HSL Inputs */}
          {activeTab === 'hsl' && (
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'H', val: hsl.h, max: 360, onChange: (v: number) => handleHueChange(v) },
                { label: 'S', val: hsl.s, max: 100, onChange: (v: number) => handleSatLumChange(v, hsl.l) },
                { label: 'L', val: hsl.l, max: 100, onChange: (v: number) => handleSatLumChange(hsl.s, v) },
              ].map((item) => (
                <div key={item.label} className="flex flex-col items-center gap-1">
                  <span className="text-[9px] font-mono text-gray-500">{item.label}</span>
                  <input
                    type="number"
                    min="0"
                    max={item.max}
                    value={item.val}
                    onChange={(e) => item.onChange(parseInt(e.target.value) || 0)}
                    className="w-full bg-[#141418] border border-[#2d2d3a] rounded px-2 py-1 text-white font-mono text-center text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              ))}
            </div>
          )}

          {/* RGB Inputs */}
          {activeTab === 'rgb' && (
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'R', val: rgb.r, onChange: (v: number) => handleRgbChange('r', v) },
                { label: 'G', val: rgb.g, onChange: (v: number) => handleRgbChange('g', v) },
                { label: 'B', val: rgb.b, onChange: (v: number) => handleRgbChange('b', v) },
              ].map((item) => (
                <div key={item.label} className="flex flex-col items-center gap-1">
                  <span className="text-[9px] font-mono text-gray-500">{item.label}</span>
                  <input
                    type="number"
                    min="0"
                    max="255"
                    value={item.val}
                    onChange={(e) => item.onChange(parseInt(e.target.value) || 0)}
                    className="w-full bg-[#141418] border border-[#2d2d3a] rounded px-2 py-1 text-white font-mono text-center text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Quick Swatches Grid */}
          <div>
            <span className="text-[9px] text-gray-500 font-mono uppercase tracking-wider block mb-1.5">Quick Colors</span>
            <div className="grid grid-cols-10 gap-1">
              {QUICK_SWATCHES.map((sw, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setHex(sw.hex);
                    setHsl(hexToHsl(sw.hex));
                    const r = parseInt(sw.hex.slice(1, 3), 16);
                    const g = parseInt(sw.hex.slice(3, 5), 16);
                    const b = parseInt(sw.hex.slice(5, 7), 16);
                    setRgb({ r, g, b });
                  }}
                  className={`w-full aspect-square rounded border cursor-pointer transition-all hover:scale-110 ${
                    hex === sw.hex ? 'ring-2 ring-indigo-400' : 'border-[#3e3e3e]'
                  }`}
                  style={{ backgroundColor: sw.hex }}
                  title={sw.hex}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#2d2d3a] bg-[#141418]">
          <span className="text-[10px] font-mono text-gray-400">{hex.toUpperCase()}</span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-[#252530] hover:bg-[#2d2d3c] rounded text-xs text-gray-300 cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => { onConfirm(hex); onClose(); }}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-bold cursor-pointer transition-colors flex items-center gap-1"
            >
              <Check className="w-3 h-3" />
              OK
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
