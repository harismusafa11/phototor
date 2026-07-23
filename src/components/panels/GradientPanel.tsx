import React, { useState } from 'react';
import { Plus, Trash2, Download } from 'lucide-react';

const DEFAULT_GRADIENTS = [
  { name: 'Sunset', stops: [{ offset: 0, color: '#f97316' }, { offset: 0.5, color: '#ec4899' }, { offset: 1, color: '#8b5cf6' }] },
  { name: 'Ocean', stops: [{ offset: 0, color: '#0ea5e9' }, { offset: 1, color: '#6366f1' }] },
  { name: 'Forest', stops: [{ offset: 0, color: '#22c55e' }, { offset: 1, color: '#14b8a6' }] },
  { name: 'Fire', stops: [{ offset: 0, color: '#fbbf24' }, { offset: 0.5, color: '#f97316' }, { offset: 1, color: '#ef4444' }] },
  { name: 'Night', stops: [{ offset: 0, color: '#1e1b4b' }, { offset: 1, color: '#0f172a' }] },
  { name: 'Aurora', stops: [{ offset: 0, color: '#34d399' }, { offset: 0.5, color: '#818cf8' }, { offset: 1, color: '#fb7185' }] },
  { name: 'Gold', stops: [{ offset: 0, color: '#fde68a' }, { offset: 1, color: '#b45309' }] },
  { name: 'Mono', stops: [{ offset: 0, color: '#ffffff' }, { offset: 1, color: '#000000' }] },
  { name: 'Violet', stops: [{ offset: 0, color: '#c4b5fd' }, { offset: 1, color: '#7c3aed' }] },
  { name: 'Rose', stops: [{ offset: 0, color: '#fda4af' }, { offset: 1, color: '#e11d48' }] },
  { name: 'Sky', stops: [{ offset: 0, color: '#e0f2fe' }, { offset: 1, color: '#0284c7' }] },
  { name: 'Emerald', stops: [{ offset: 0, color: '#d1fae5' }, { offset: 1, color: '#065f46' }] },
];

type GradientStop = { offset: number; color: string };
type GradientType = 'linear' | 'radial';

interface GradientPanelProps {
  onApplyGradient?: (stops: GradientStop[], type: GradientType, angle: number) => void;
}

function buildCSSGradient(stops: GradientStop[], type: GradientType, angle: number) {
  const stopsStr = stops.map((s) => `${s.color} ${Math.round(s.offset * 100)}%`).join(', ');
  return type === 'radial'
    ? `radial-gradient(circle, ${stopsStr})`
    : `linear-gradient(${angle}deg, ${stopsStr})`;
}

export default function GradientPanel({ onApplyGradient }: GradientPanelProps) {
  const [type, setType] = useState<GradientType>('linear');
  const [angle, setAngle] = useState(90);
  const [stops, setStops] = useState<GradientStop[]>([
    { offset: 0, color: '#6366f1' },
    { offset: 1, color: '#ec4899' },
  ]);
  const [selected, setSelected] = useState<string | null>(null);

  const updateStop = (idx: number, updates: Partial<GradientStop>) => {
    setStops((prev) => prev.map((s, i) => i === idx ? { ...s, ...updates } : s));
  };

  const addStop = () => {
    const mid = stops.length > 0 ? stops[Math.floor(stops.length / 2)].offset + 0.1 : 0.5;
    setStops((prev) => [...prev, { offset: Math.min(1, mid), color: '#ffffff' }].sort((a, b) => a.offset - b.offset));
  };

  const removeStop = (idx: number) => {
    if (stops.length <= 2) return;
    setStops((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="flex flex-col gap-3 p-2.5 text-gray-300 text-[10px]">
      {/* Type + angle */}
      <div className="flex items-center gap-2">
        <div className="flex gap-0.5 bg-[#1a1a26] border border-[#2d2d40] rounded p-0.5">
          {(['linear', 'radial'] as GradientType[]).map((t) => (
            <button key={t} onClick={() => setType(t)}
              className={`px-2 py-0.5 text-[9px] font-bold rounded transition-colors capitalize font-mono ${type === t ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-white'}`}>
              {t}
            </button>
          ))}
        </div>
        {type === 'linear' && (
          <div className="flex items-center gap-1 flex-1">
            <span className="text-gray-500 text-[9px]">°</span>
            <input type="range" min={0} max={360} value={angle}
              onChange={(e) => setAngle(parseInt(e.target.value))}
              className="flex-1 accent-indigo-500 h-1" />
            <span className="text-indigo-400 font-mono text-[9px] w-7 text-right">{angle}</span>
          </div>
        )}
      </div>

      {/* Gradient preview bar */}
      <div
        className="h-10 rounded border border-[#2d2d40] cursor-pointer"
        style={{ background: buildCSSGradient(stops, type, angle) }}
        title="Click to apply gradient"
        onClick={() => onApplyGradient?.(stops, type, angle)}
      />

      {/* Color stops */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-gray-500">Color Stops</span>
          <button onClick={addStop}
            className="p-0.5 rounded hover:bg-[#2a2a3c] text-gray-400 hover:text-white transition-colors" title="Add stop">
            <Plus className="w-3 h-3" />
          </button>
        </div>
        {stops.map((stop, i) => (
          <div key={i} className="flex items-center gap-1.5 bg-[#1a1a26] rounded p-1.5 border border-[#2d2d40]">
            <label className="w-6 h-6 rounded border border-[#3d3d50] cursor-pointer shrink-0">
              <div className="w-full h-full rounded" style={{ backgroundColor: stop.color }} />
              <input type="color" value={stop.color}
                onChange={(e) => updateStop(i, { color: e.target.value })} className="sr-only" />
            </label>
            <input type="range" min={0} max={100} value={Math.round(stop.offset * 100)}
              onChange={(e) => updateStop(i, { offset: parseInt(e.target.value) / 100 })}
              className="flex-1 accent-indigo-500 h-1" />
            <span className="font-mono text-[9px] text-indigo-400 w-7 text-right">{Math.round(stop.offset * 100)}%</span>
            <button onClick={() => removeStop(i)}
              className="text-gray-600 hover:text-red-400 transition-colors" title="Remove">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Apply button */}
      <button
        onClick={() => onApplyGradient?.(stops, type, angle)}
        className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold transition-colors flex items-center justify-center gap-1"
      >
        <Download className="w-3 h-3" /> Apply Gradient
      </button>

      {/* Preset gradients */}
      <div>
        <span className="text-[9px] text-gray-500 block mb-1.5">Presets</span>
        <div className="grid grid-cols-3 gap-1.5">
          {DEFAULT_GRADIENTS.map((g) => (
            <button
              key={g.name}
              onClick={() => { setStops(g.stops); setSelected(g.name); }}
              title={g.name}
              className={`h-8 rounded border transition-all ${selected === g.name ? 'border-indigo-400 scale-105' : 'border-[#2d2d40] hover:border-gray-500'}`}
              style={{ background: buildCSSGradient(g.stops, 'linear', 135) }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
