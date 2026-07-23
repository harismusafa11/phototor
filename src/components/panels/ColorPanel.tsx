import React, { useState, useCallback } from 'react';
import { Pipette, Clock, RotateCcw } from 'lucide-react';

interface ColorPanelProps {
  color: string;
  onColorChange: (color: string) => void;
}

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16) || 0;
  const g = parseInt(hex.slice(3, 5), 16) || 0;
  const b = parseInt(hex.slice(5, 7), 16) || 0;
  return { r, g, b };
}

function rgbToHex(r: number, g: number, b: number) {
  return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
}

function rgbToHsl(r: number, g: number, b: number) {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
    else if (max === gn) h = ((bn - rn) / d + 2) / 6;
    else h = ((rn - gn) / d + 4) / 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex(h: number, s: number, l: number) {
  const hn = h / 360, sn = s / 100, ln = l / 100;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  if (sn === 0) {
    const v = Math.round(ln * 255);
    return rgbToHex(v, v, v);
  }
  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
  const p = 2 * ln - q;
  return rgbToHex(
    Math.round(hue2rgb(p, q, hn + 1/3) * 255),
    Math.round(hue2rgb(p, q, hn) * 255),
    Math.round(hue2rgb(p, q, hn - 1/3) * 255)
  );
}

const MAX_RECENT = 16;
const STORAGE_KEY = 'phototor_recent_colors';

function loadRecentColors(): string[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'); } catch { return []; }
}
function saveRecentColors(colors: string[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(colors)); } catch { /* ignore */ }
}

type ColorMode = 'rgb' | 'hsl' | 'hex' | 'cmyk';

export default function ColorPanel({ color, onColorChange }: ColorPanelProps) {
  const [mode, setMode] = useState<ColorMode>('rgb');
  const [recentColors, setRecentColors] = useState<string[]>(loadRecentColors);
  const [hexInput, setHexInput] = useState(color);

  const rgb = hexToRgb(color);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

  const commitColor = useCallback((newColor: string) => {
    onColorChange(newColor);
    setHexInput(newColor);
    setRecentColors((prev) => {
      const filtered = prev.filter((c) => c !== newColor);
      const next = [newColor, ...filtered].slice(0, MAX_RECENT);
      saveRecentColors(next);
      return next;
    });
  }, [onColorChange]);

  const handleRgbChannel = (channel: 'r' | 'g' | 'b', value: number) => {
    const next = { ...rgb, [channel]: Math.max(0, Math.min(255, value)) };
    commitColor(rgbToHex(next.r, next.g, next.b));
  };

  const handleHslChannel = (channel: 'h' | 's' | 'l', value: number) => {
    const next = { ...hsl, [channel]: value };
    commitColor(hslToHex(next.h, next.s, next.l));
  };

  const handleHexInput = (v: string) => {
    setHexInput(v);
    const clean = v.startsWith('#') ? v : `#${v}`;
    if (/^#[0-9a-fA-F]{6}$/.test(clean)) commitColor(clean);
  };

  const SliderRow = ({ label, value, max, onChange, color: trackColor }: {
    label: string; value: number; max: number; onChange: (v: number) => void; color?: string;
  }) => (
    <div className="flex items-center gap-2">
      <span className="text-[9px] text-gray-500 w-4 font-mono uppercase">{label}</span>
      <input
        type="range" min={0} max={max} value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="flex-1 h-1.5 rounded"
        style={{ accentColor: trackColor ?? '#6366f1' }}
      />
      <input
        type="number" min={0} max={max} value={value}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        className="w-9 bg-[#1a1a26] border border-[#2d2d40] text-indigo-400 text-[9px] font-mono text-center rounded px-0.5 py-0.5 focus:outline-none"
      />
    </div>
  );

  return (
    <div className="flex flex-col gap-3 p-2.5 text-gray-300 text-[10px]">
      {/* Color preview + HEX */}
      <div className="flex items-center gap-2">
        <div
          className="w-12 h-10 rounded border border-[#2d2d40] cursor-pointer shadow-inner"
          style={{ backgroundColor: color }}
          title={color}
        />
        <div className="flex-1">
          <div className="text-[9px] text-gray-500 mb-0.5">HEX</div>
          <input
            value={hexInput.startsWith('#') ? hexInput : `#${hexInput}`}
            onChange={(e) => handleHexInput(e.target.value)}
            onBlur={() => setHexInput(color)}
            className="w-full bg-[#1a1a26] border border-[#2d2d40] text-indigo-300 text-[10px] font-mono rounded px-1.5 py-1 focus:outline-none focus:border-indigo-500"
            maxLength={7}
          />
        </div>
        {/* native color picker as eyedropper fallback */}
        <label className="p-1 rounded hover:bg-[#2a2a3c] cursor-pointer" title="Pick color">
          <Pipette className="w-3.5 h-3.5 text-gray-400 hover:text-white" />
          <input
            type="color" value={color}
            onChange={(e) => commitColor(e.target.value)}
            className="sr-only"
          />
        </label>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-0.5 bg-[#1a1a26] border border-[#2d2d40] rounded p-0.5">
        {(['rgb', 'hsl', 'hex', 'cmyk'] as ColorMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 py-0.5 text-[9px] uppercase font-bold rounded transition-colors font-mono ${mode === m ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-white'}`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Sliders */}
      <div className="flex flex-col gap-2">
        {mode === 'rgb' && (
          <>
            <SliderRow label="R" value={rgb.r} max={255} onChange={(v) => handleRgbChannel('r', v)} color="#ef4444" />
            <SliderRow label="G" value={rgb.g} max={255} onChange={(v) => handleRgbChannel('g', v)} color="#22c55e" />
            <SliderRow label="B" value={rgb.b} max={255} onChange={(v) => handleRgbChannel('b', v)} color="#3b82f6" />
          </>
        )}
        {mode === 'hsl' && (
          <>
            <SliderRow label="H" value={hsl.h} max={360} onChange={(v) => handleHslChannel('h', v)} color="#a78bfa" />
            <SliderRow label="S" value={hsl.s} max={100} onChange={(v) => handleHslChannel('s', v)} color="#6366f1" />
            <SliderRow label="L" value={hsl.l} max={100} onChange={(v) => handleHslChannel('l', v)} color="#8b5cf6" />
          </>
        )}
        {mode === 'hex' && (
          <div className="flex flex-col gap-1">
            <span className="text-[9px] text-gray-500">HEX value</span>
            <input
              value={hexInput.startsWith('#') ? hexInput : `#${hexInput}`}
              onChange={(e) => handleHexInput(e.target.value)}
              className="w-full bg-[#1a1a26] border border-[#2d2d40] text-indigo-300 text-sm font-mono rounded px-2 py-1.5 focus:outline-none focus:border-indigo-500 tracking-widest"
              maxLength={7}
            />
          </div>
        )}
        {mode === 'cmyk' && (
          <>
            {['C','M','Y','K'].map((ch, i) => {
              const vals = [
                Math.round((1 - rgb.r/255) * 100),
                Math.round((1 - rgb.g/255) * 100),
                Math.round((1 - rgb.b/255) * 100),
                Math.round(Math.min(1 - rgb.r/255, 1 - rgb.g/255, 1 - rgb.b/255) * 100),
              ];
              return (
                <div key={ch} className="flex items-center gap-2">
                  <span className="text-[9px] text-gray-500 w-4 font-mono">{ch}</span>
                  <div className="flex-1 h-1.5 bg-[#1a1a26] rounded overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded" style={{ width: `${vals[i]}%` }} />
                  </div>
                  <span className="w-7 text-right font-mono text-[9px] text-indigo-400">{vals[i]}</span>
                </div>
              );
            })}
            <p className="text-[8px] text-gray-600 mt-1">CMYK display only (read-only)</p>
          </>
        )}
      </div>

      {/* Hue bar */}
      <div>
        <input
          type="range" min={0} max={360}
          value={hsl.h}
          onChange={(e) => handleHslChannel('h', parseInt(e.target.value))}
          className="w-full h-3 rounded cursor-pointer"
          style={{
            background: 'linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)',
            appearance: 'none',
            WebkitAppearance: 'none',
          }}
        />
      </div>

      {/* Recent colors */}
      {recentColors.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] text-gray-500 flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" /> Recent
            </span>
            <button
              onClick={() => { setRecentColors([]); saveRecentColors([]); }}
              className="text-[8px] text-gray-600 hover:text-red-400 transition-colors flex items-center gap-0.5"
            >
              <RotateCcw className="w-2 h-2" /> Clear
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {recentColors.map((c) => (
              <button
                key={c}
                title={c}
                onClick={() => commitColor(c)}
                className="w-5 h-5 rounded border border-[#2d2d40] hover:scale-125 transition-transform"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
