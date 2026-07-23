import React from 'react';
import { Layout, Paintbrush, Camera, Monitor, Check } from 'lucide-react';
import { WorkspacePreset } from '../types';

interface WorkspaceSwitcherProps {
  current: WorkspacePreset;
  onChange: (preset: WorkspacePreset) => void;
}

const WORKSPACES: { id: WorkspacePreset; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: 'essentials', label: 'Essentials', icon: <Layout className="w-3.5 h-3.5" />, desc: 'Standard editing panels' },
  { id: 'painting', label: 'Painting', icon: <Paintbrush className="w-3.5 h-3.5" />, desc: 'Brush & color panels' },
  { id: 'photography', label: 'Photography', icon: <Camera className="w-3.5 h-3.5" />, desc: 'Curves, levels, channels' },
  { id: 'motion', label: 'Motion', icon: <Monitor className="w-3.5 h-3.5" />, desc: 'Animation & timeline' },
];

export default function WorkspaceSwitcher({ current, onChange }: WorkspaceSwitcherProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1 bg-[#1a1a22] hover:bg-[#252530] border border-[#2a2a35] rounded text-[10px] text-gray-300 cursor-pointer transition-colors"
      >
        <Layout className="w-3 h-3 text-indigo-400" />
        <span className="font-medium capitalize">{current}</span>
        <span className="text-gray-600 text-[9px]">▼</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-50 bg-[#121216] border border-[#2b2b36] rounded-lg shadow-2xl py-1 w-48 animate-in fade-in slide-in-from-top-2 duration-100">
            {WORKSPACES.map((ws) => {
              const isActive = current === ws.id;
              return (
                <button
                  key={ws.id}
                  onClick={() => { onChange(ws.id); setOpen(false); }}
                  className={`flex items-center gap-2 w-full px-3 py-2 hover:bg-[#1c1c28] text-left transition-colors cursor-pointer ${
                    isActive ? 'text-white bg-[#1c1c28]' : 'text-gray-300'
                  }`}
                >
                  <span className={isActive ? 'text-indigo-400' : 'text-gray-500'}>{ws.icon}</span>
                  <div className="flex-1">
                    <span className="text-[11px] font-semibold block">{ws.label}</span>
                    <span className="text-[9px] text-gray-500">{ws.desc}</span>
                  </div>
                  {isActive && <Check className="w-3 h-3 text-indigo-400" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
