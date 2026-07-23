import React from 'react';
import { Paintbrush, Sliders, RotateCcw, Grid } from 'lucide-react';

interface BrushSettingsPanelProps {
  brushSize: number;
  setBrushSize: (s: number) => void;
  brushOpacity: number;
  setBrushOpacity: (o: number) => void;
  brushColor: string;
  setBrushColor: (c: string) => void;
  brushHardness: number;
  setBrushHardness: (h: number) => void;
  brushSmoothing: number;
  setBrushSmoothing: (s: number) => void;
  brushFlow: number;
  setBrushFlow: (f: number) => void;
  brushBlendMode: string;
  setBrushBlendMode: (m: string) => void;
}

export default function BrushSettingsPanel({
  brushSize, setBrushSize,
  brushOpacity, setBrushOpacity,
  brushColor, setBrushColor,
  brushHardness, setBrushHardness,
  brushSmoothing, setBrushSmoothing,
  brushFlow, setBrushFlow,
  brushBlendMode, setBrushBlendMode,
}: BrushSettingsPanelProps) {
  const [spacing, setSpacing] = React.useState(25);
  const [angle, setAngle] = React.useState(0);
  const [roundness, setRoundness] = React.useState(100);
  const [scatter, setScatter] = React.useState(0);

  return (
    <div className="flex flex-col bg-[#1e1e1f] h-full text-xs select-none w-full">
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-[#181819] bg-[#181819]">
        <span className="font-bold text-gray-300 flex items-center gap-1.5 text-[10px]">
          <Paintbrush className="w-3 h-3 text-indigo-400" />
          Brush Settings
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-3 text-[10px]">
        {/* Brush Preview */}
        <div className="flex items-center justify-center bg-[#141418] rounded border border-[#2d2d3a] p-3">
          <div className="relative w-full flex items-center justify-center">
            <svg width="80" height="80" className="overflow-visible">
              <circle
                cx="40" cy="40" r={Math.min(38, Math.max(2, brushSize / 1.5))}
                fill="none"
                stroke={brushColor}
                strokeWidth="1.5"
                opacity={brushOpacity}
              />
              <circle
                cx="40" cy="40" r={Math.min(38, Math.max(2, brushSize / 1.5))}
                fill={brushColor}
                opacity={brushOpacity * 0.15}
              />
              <line
                x1="40" y1="40"
                x2={40 + Math.sin(angle * Math.PI / 180) * 30}
                y2={40 - Math.cos(angle * Math.PI / 180) * 30}
                stroke={brushColor}
                strokeWidth="1"
                opacity="0.5"
              />
            </svg>
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-mono text-gray-500">
              {brushSize}px
            </div>
          </div>
        </div>

        {/* Brush Tip Shape */}
        <div className="bg-[#252526] rounded border border-[#2d2d3a] p-2 space-y-2">
          <span className="text-gray-500 font-mono text-[9px] uppercase tracking-wider flex items-center gap-1">
            <Grid className="w-2.5 h-2.5 text-indigo-400" />
            Brush Tip Shape
          </span>

          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="text-gray-400">Size:</span>
              <span className="font-mono text-gray-300">{brushSize}px</span>
            </div>
            <input
              type="range" min="1" max="200" value={brushSize}
              onChange={(e) => setBrushSize(parseInt(e.target.value))}
              className="w-full accent-indigo-500 h-1 bg-[#1c1c1d] cursor-pointer"
            />

            <div className="flex justify-between">
              <span className="text-gray-400">Angle:</span>
              <span className="font-mono text-gray-300">{angle}°</span>
            </div>
            <input
              type="range" min="0" max="360" value={angle}
              onChange={(e) => setAngle(parseInt(e.target.value))}
              className="w-full accent-indigo-500 h-1 bg-[#1c1c1d] cursor-pointer"
            />

            <div className="flex justify-between">
              <span className="text-gray-400">Roundness:</span>
              <span className="font-mono text-gray-300">{roundness}%</span>
            </div>
            <input
              type="range" min="0" max="100" value={roundness}
              onChange={(e) => setRoundness(parseInt(e.target.value))}
              className="w-full accent-indigo-500 h-1 bg-[#1c1c1d] cursor-pointer"
            />

            <div className="flex justify-between">
              <span className="text-gray-400">Spacing:</span>
              <span className="font-mono text-gray-300">{spacing}%</span>
            </div>
            <input
              type="range" min="1" max="200" value={spacing}
              onChange={(e) => setSpacing(parseInt(e.target.value))}
              className="w-full accent-indigo-500 h-1 bg-[#1c1c1d] cursor-pointer"
            />
          </div>
        </div>

        {/* Shape Dynamics */}
        <div className="bg-[#252526] rounded border border-[#2d2d3a] p-2 space-y-2">
          <span className="text-gray-500 font-mono text-[9px] uppercase tracking-wider">Shape Dynamics</span>
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="text-gray-400">Scatter:</span>
              <span className="font-mono text-gray-300">{scatter}%</span>
            </div>
            <input
              type="range" min="0" max="300" value={scatter}
              onChange={(e) => setScatter(parseInt(e.target.value))}
              className="w-full accent-indigo-500 h-1 bg-[#1c1c1d] cursor-pointer"
            />
          </div>
        </div>

        {/* Transfer / Opacity Flow */}
        <div className="bg-[#252526] rounded border border-[#2d2d3a] p-2 space-y-2">
          <span className="text-gray-500 font-mono text-[9px] uppercase tracking-wider">Transfer</span>
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="text-gray-400">Opacity Jitter:</span>
              <span className="font-mono text-gray-300">{Math.round(brushOpacity * 100)}%</span>
            </div>
            <input
              type="range" min="0" max="100" value={brushOpacity * 100}
              onChange={(e) => setBrushOpacity(parseInt(e.target.value) / 100)}
              className="w-full accent-indigo-500 h-1 bg-[#1c1c1d] cursor-pointer"
            />

            <div className="flex justify-between">
              <span className="text-gray-400">Flow:</span>
              <span className="font-mono text-gray-300">{brushFlow}%</span>
            </div>
            <input
              type="range" min="1" max="100" value={brushFlow}
              onChange={(e) => setBrushFlow(parseInt(e.target.value))}
              className="w-full accent-indigo-500 h-1 bg-[#1c1c1d] cursor-pointer"
            />

            <div className="flex justify-between">
              <span className="text-gray-400">Smoothing:</span>
              <span className="font-mono text-gray-300">{brushSmoothing}%</span>
            </div>
            <input
              type="range" min="0" max="100" value={brushSmoothing}
              onChange={(e) => setBrushSmoothing(parseInt(e.target.value))}
              className="w-full accent-indigo-500 h-1 bg-[#1c1c1d] cursor-pointer"
            />
          </div>
        </div>

        {/* Blend Mode */}
        <div className="bg-[#252526] rounded border border-[#2d2d3a] p-2 space-y-1.5">
          <span className="text-gray-500 font-mono text-[9px] uppercase tracking-wider">Blend Mode</span>
          <select
            value={brushBlendMode}
            onChange={(e) => setBrushBlendMode(e.target.value)}
            className="w-full bg-[#1c1c1d] border border-[#3e3e3e] rounded p-1 text-white text-[10px] focus:outline-none"
          >
            <option value="normal">Normal</option>
            <option value="multiply">Multiply</option>
            <option value="screen">Screen</option>
            <option value="overlay">Overlay</option>
            <option value="darken">Darken</option>
            <option value="lighten">Lighten</option>
            <option value="color-dodge">Color Dodge</option>
            <option value="color-burn">Color Burn</option>
            <option value="hard-light">Hard Light</option>
            <option value="soft-light">Soft Light</option>
            <option value="difference">Difference</option>
            <option value="exclusion">Exclusion</option>
          </select>
        </div>

        {/* Color */}
        <div className="bg-[#252526] rounded border border-[#2d2d3a] p-2 space-y-1.5">
          <span className="text-gray-500 font-mono text-[9px] uppercase tracking-wider">Color</span>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={brushColor}
              onChange={(e) => setBrushColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0"
            />
            <span className="font-mono text-gray-300 text-[10px]">{brushColor.toUpperCase()}</span>
          </div>
        </div>

        {/* Reset */}
        <button
          onClick={() => {
            setBrushSize(15);
            setBrushOpacity(0.85);
            setBrushFlow(100);
            setBrushSmoothing(10);
            setBrushHardness(80);
            setAngle(0);
            setRoundness(100);
            setSpacing(25);
            setScatter(0);
          }}
          className="w-full py-1.5 bg-[#252530] hover:bg-[#2d2d3c] rounded text-gray-300 text-[10px] cursor-pointer transition-colors flex items-center justify-center gap-1"
        >
          <RotateCcw className="w-3 h-3" />
          Reset Brush Settings
        </button>
      </div>
    </div>
  );
}
