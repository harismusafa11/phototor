import React from 'react';
import { Eye, EyeOff, Sliders } from 'lucide-react';

interface ChannelsPanelProps {
  visibleChannel: 'rgb' | 'r' | 'g' | 'b';
  onChannelChange: (ch: 'rgb' | 'r' | 'g' | 'b') => void;
}

export default function ChannelsPanel({ visibleChannel, onChannelChange }: ChannelsPanelProps) {
  const channels = [
    { id: 'rgb' as const, label: 'RGB', shortcut: 'Ctrl+2', color: '#ffffff' },
    { id: 'r' as const, label: 'Red', shortcut: 'Ctrl+3', color: '#ff0000' },
    { id: 'g' as const, label: 'Green', shortcut: 'Ctrl+4', color: '#00ff00' },
    { id: 'b' as const, label: 'Blue', shortcut: 'Ctrl+5', color: '#0066ff' },
  ];

  return (
    <div className="flex flex-col bg-[#1e1e1f] h-full text-xs select-none w-full">
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-[#181819] bg-[#181819]">
        <span className="font-bold text-gray-300 flex items-center gap-1.5 text-[10px]">
          <Sliders className="w-3 h-3 text-indigo-400" />
          Channels
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
        {channels.map((ch) => {
          const isActive = visibleChannel === ch.id;
          const isRgb = ch.id === 'rgb';

          return (
            <div
              key={ch.id}
              onClick={() => onChannelChange(ch.id)}
              className={`flex items-center justify-between py-2 px-2.5 rounded-sm border cursor-pointer transition-all ${
                isActive
                  ? 'bg-[#385b75] border-[#4b7a9e] text-white'
                  : 'bg-[#252526] border-[#1d1d1e] text-gray-300 hover:bg-[#2d2d2e]'
              }`}
            >
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isRgb) {
                      onChannelChange('rgb');
                    } else {
                      onChannelChange(isActive ? 'rgb' : ch.id);
                    }
                  }}
                  className="text-gray-500 hover:text-white cursor-pointer"
                >
                  {isActive || isRgb ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-gray-700" />}
                </button>
                <div
                  className="w-4 h-4 rounded border border-[#3e3e3e] flex items-center justify-center"
                  style={{ backgroundColor: ch.color, opacity: isRgb ? 1 : 0.5 }}
                >
                  {isRgb && <span className="text-[6px] font-bold text-black">RGB</span>}
                </div>
                <span className="font-medium">{ch.label}</span>
              </div>
              <div className="flex items-center gap-2">
                {isRgb && (
                  <span className="flex -space-x-1">
                    <span className="w-2 h-2 rounded-full bg-red-500 border border-[#3e3e3e]" />
                    <span className="w-2 h-2 rounded-full bg-green-500 border border-[#3e3e3e]" />
                    <span className="w-2 h-2 rounded-full bg-blue-500 border border-[#3e3e3e]" />
                  </span>
                )}
                <span className={`text-[9px] font-mono ${isActive ? 'text-indigo-200' : 'text-gray-600'}`}>
                  {ch.shortcut}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Channel info footer */}
      <div className="p-2 border-t border-[#181819] bg-[#1e1e1f] text-[9px] text-gray-500">
        <div className="flex justify-between">
          <span>Depth:</span>
          <span className="font-mono text-gray-400">8-bit/channel</span>
        </div>
        <div className="flex justify-between">
          <span>Color Mode:</span>
          <span className="font-mono text-gray-400">RGB</span>
        </div>
      </div>
    </div>
  );
}
