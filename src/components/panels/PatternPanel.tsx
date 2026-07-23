import React, { useState, useRef } from 'react';
import { Plus, Download, Upload, Trash2 } from 'lucide-react';

interface Pattern {
  id: string;
  name: string;
  svg: string;
  size: number;
}

const DEFAULT_PATTERNS: Pattern[] = [
  {
    id: 'dots', name: 'Polka Dots', size: 20,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><circle cx="10" cy="10" r="4" fill="#6366f1" opacity="0.5"/></svg>`,
  },
  {
    id: 'lines-h', name: 'Horizontal Lines', size: 10,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><line x1="0" y1="5" x2="10" y2="5" stroke="#6366f1" stroke-width="1" opacity="0.4"/></svg>`,
  },
  {
    id: 'lines-v', name: 'Vertical Lines', size: 10,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><line x1="5" y1="0" x2="5" y2="10" stroke="#6366f1" stroke-width="1" opacity="0.4"/></svg>`,
  },
  {
    id: 'grid', name: 'Grid', size: 20,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="none" stroke="#6366f1" stroke-width="0.5" opacity="0.4"/></svg>`,
  },
  {
    id: 'diagonal', name: 'Diagonal', size: 20,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><line x1="0" y1="20" x2="20" y2="0" stroke="#6366f1" stroke-width="1" opacity="0.4"/></svg>`,
  },
  {
    id: 'checker', name: 'Checkerboard', size: 20,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="10" height="10" fill="#6366f1" opacity="0.3"/><rect x="10" y="10" width="10" height="10" fill="#6366f1" opacity="0.3"/></svg>`,
  },
  {
    id: 'triangles', name: 'Triangles', size: 20,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><polygon points="10,2 18,18 2,18" fill="none" stroke="#6366f1" stroke-width="1" opacity="0.5"/></svg>`,
  },
  {
    id: 'hexagons', name: 'Hexagons', size: 30,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30"><polygon points="15,3 27,9 27,21 15,27 3,21 3,9" fill="none" stroke="#6366f1" stroke-width="1" opacity="0.4"/></svg>`,
  },
];

function svgToDataUrl(svg: string) {
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

interface PatternPanelProps {
  onApplyPattern?: (patternUrl: string, patternSize: number) => void;
}

export default function PatternPanel({ onApplyPattern }: PatternPanelProps) {
  const [patterns, setPatterns] = useState<Pattern[]>(DEFAULT_PATTERNS);
  const [selected, setSelected] = useState<string | null>(null);
  const [scale, setScale] = useState(100);
  const fileRef = useRef<HTMLInputElement>(null);

  const applyPattern = (p: Pattern) => {
    setSelected(p.id);
    onApplyPattern?.(svgToDataUrl(p.svg), Math.round(p.size * scale / 100));
  };

  const deletePattern = (id: string) => {
    setPatterns((prev) => prev.filter((p) => p.id !== id));
    if (selected === id) setSelected(null);
  };

  return (
    <div className="flex flex-col gap-2.5 p-2.5 text-gray-300 text-[10px]">
      {/* Scale */}
      <div className="flex items-center gap-2">
        <span className="text-gray-500 shrink-0">Scale</span>
        <input type="range" min={25} max={400} value={scale}
          onChange={(e) => setScale(parseInt(e.target.value))}
          className="flex-1 accent-indigo-500 h-1" />
        <span className="text-indigo-400 font-mono w-10 text-right">{scale}%</span>
      </div>

      {/* Pattern grid */}
      <div className="grid grid-cols-3 gap-1.5 max-h-64 overflow-y-auto">
        {patterns.map((pattern) => {
          const dataUrl = svgToDataUrl(pattern.svg);
          return (
            <div
              key={pattern.id}
              onClick={() => applyPattern(pattern)}
              className={`relative group flex flex-col items-center gap-1 p-1 rounded border cursor-pointer transition-all ${selected === pattern.id ? 'border-indigo-500 bg-indigo-950/30' : 'border-[#2d2d40] hover:border-gray-500'}`}
            >
              {/* Pattern preview */}
              <div
                className="w-full rounded"
                style={{
                  height: 48,
                  backgroundImage: `url("${dataUrl}")`,
                  backgroundRepeat: 'repeat',
                  backgroundSize: `${pattern.size}px`,
                  backgroundColor: '#1a1a26',
                }}
              />
              <span className="text-[7px] text-gray-500 text-center w-full truncate">{pattern.name}</span>
              <button
                onClick={(e) => { e.stopPropagation(); deletePattern(pattern.id); }}
                className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 p-0.5 rounded text-gray-600 hover:text-red-400 transition-all bg-[#13131a]/80"
              >
                <Trash2 className="w-2.5 h-2.5" />
              </button>
            </div>
          );
        })}

        {/* Add custom pattern */}
        <div
          onClick={() => fileRef.current?.click()}
          className="flex flex-col items-center justify-center gap-1 p-1 rounded border border-dashed border-[#2d2d40] hover:border-indigo-500/50 cursor-pointer transition-colors"
          style={{ minHeight: 72 }}
        >
          <Plus className="w-4 h-4 text-gray-600" />
          <span className="text-[7px] text-gray-600">Add Pattern</span>
        </div>
        <input ref={fileRef} type="file" accept="image/svg+xml,image/png" className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
              const id = `custom-${Date.now()}`;
              setPatterns((prev) => [...prev, {
                id, name: file.name.replace(/\.[^.]+$/, ''), size: 40,
                svg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><image href="${ev.target?.result}" width="40" height="40"/></svg>`,
              }]);
            };
            reader.readAsDataURL(file);
            e.target.value = '';
          }}
        />
      </div>

      {/* Actions */}
      {selected && (
        <button
          onClick={() => {
            const p = patterns.find((pt) => pt.id === selected);
            if (p) applyPattern(p);
          }}
          className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold transition-colors flex items-center justify-center gap-1"
        >
          <Download className="w-3 h-3" /> Apply Pattern
        </button>
      )}
    </div>
  );
}
