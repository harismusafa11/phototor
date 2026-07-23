import React from 'react';
import { Info, Crosshair, Maximize, Sliders } from 'lucide-react';
import { Point, Layer } from '../../types';

interface InfoPanelProps {
  hoverCoords: Point | null;
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
  activeLayer: Layer | null;
  currentColor: string;
}

export default function InfoPanel({ hoverCoords, canvasWidth, canvasHeight, zoom, activeLayer, currentColor }: InfoPanelProps) {
  return (
    <div className="flex flex-col bg-[#1e1e1f] h-full text-xs select-none w-full">
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-[#181819] bg-[#181819]">
        <span className="font-bold text-gray-300 flex items-center gap-1.5 text-[10px]">
          <Info className="w-3 h-3 text-indigo-400" />
          Info
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 text-[10px]">
        {/* Cursor Coordinates */}
        <div className="bg-[#252526] rounded border border-[#2d2d3a] p-2 space-y-1.5">
          <span className="text-gray-500 font-mono text-[9px] uppercase tracking-wider flex items-center gap-1">
            <Crosshair className="w-2.5 h-2.5 text-indigo-400" />
            Cursor Position
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            <div className="flex justify-between">
              <span className="text-gray-400">X:</span>
              <span className="font-mono text-white">{hoverCoords ? hoverCoords.x : '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Y:</span>
              <span className="font-mono text-white">{hoverCoords ? hoverCoords.y : '-'}</span>
            </div>
          </div>
        </div>

        {/* Canvas Size */}
        <div className="bg-[#252526] rounded border border-[#2d2d3a] p-2 space-y-1.5">
          <span className="text-gray-500 font-mono text-[9px] uppercase tracking-wider flex items-center gap-1">
            <Maximize className="w-2.5 h-2.5 text-emerald-400" />
            Canvas
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            <div className="flex justify-between">
              <span className="text-gray-400">Width:</span>
              <span className="font-mono text-white">{canvasWidth}px</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Height:</span>
              <span className="font-mono text-white">{canvasHeight}px</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Zoom:</span>
              <span className="font-mono text-white">{Math.round(zoom * 100)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Ratio:</span>
              <span className="font-mono text-white">{(canvasWidth / canvasHeight).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Active Layer Info */}
        {activeLayer && (
          <div className="bg-[#252526] rounded border border-[#2d2d3a] p-2 space-y-1.5">
            <span className="text-gray-500 font-mono text-[9px] uppercase tracking-wider flex items-center gap-1">
              <Sliders className="w-2.5 h-2.5 text-amber-400" />
              Active Layer
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="flex justify-between">
                <span className="text-gray-400">Name:</span>
                <span className="text-white truncate max-w-[80px]" title={activeLayer.name}>{activeLayer.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Type:</span>
                <span className="font-mono text-white capitalize">{activeLayer.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">W:</span>
                <span className="font-mono text-white">{Math.round(activeLayer.width)}px</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">H:</span>
                <span className="font-mono text-white">{Math.round(activeLayer.height)}px</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">X:</span>
                <span className="font-mono text-white">{Math.round(activeLayer.x)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Y:</span>
                <span className="font-mono text-white">{Math.round(activeLayer.y)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Opacity:</span>
                <span className="font-mono text-white">{Math.round(activeLayer.opacity * 100)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Blend:</span>
                <span className="font-mono text-white capitalize">{activeLayer.blendMode}</span>
              </div>
            </div>
          </div>
        )}

        {/* Current Color */}
        <div className="bg-[#252526] rounded border border-[#2d2d3a] p-2 space-y-1.5">
          <span className="text-gray-500 font-mono text-[9px] uppercase tracking-wider">Foreground Color</span>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded border border-[#3e3e3e]" style={{ backgroundColor: currentColor }} />
            <span className="font-mono text-white text-[10px]">{currentColor.toUpperCase()}</span>
          </div>
        </div>

        {/* Document Info */}
        <div className="bg-[#252526] rounded border border-[#2d2d3a] p-2 text-[9px] text-gray-500">
          <div className="flex justify-between">
            <span>Mode:</span>
            <span className="font-mono text-gray-300">RGB Color</span>
          </div>
          <div className="flex justify-between">
            <span>Depth:</span>
            <span className="font-mono text-gray-300">8-bit/channel</span>
          </div>
          <div className="flex justify-between">
            <span>Resolution:</span>
            <span className="font-mono text-gray-300">72 PPI</span>
          </div>
          <div className="flex justify-between">
            <span>Profile:</span>
            <span className="font-mono text-gray-300">sRGB IEC61966-2.1</span>
          </div>
        </div>
      </div>
    </div>
  );
}
