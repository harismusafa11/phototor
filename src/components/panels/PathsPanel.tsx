import React, { useState } from 'react';
import { Plus, Trash2, Target, GitBranch } from 'lucide-react';

interface PathEntry {
  id: string;
  name: string;
  active: boolean;
}

interface PathsPanelProps {
  onConvertToSelection?: (pathId: string) => void;
  onConvertToShape?: (pathId: string) => void;
}

export default function PathsPanel({ onConvertToSelection, onConvertToShape }: PathsPanelProps) {
  const [paths, setPaths] = useState<PathEntry[]>([
    { id: 'path-1', name: 'Work Path', active: true },
    { id: 'path-2', name: 'Path 1', active: false },
  ]);
  const [selected, setSelected] = useState<string>('path-1');

  const addPath = () => {
    const id = `path-${Date.now()}`;
    setPaths((prev) => [...prev, { id, name: `Path ${prev.length + 1}`, active: false }]);
  };

  const deletePath = (id: string) => {
    setPaths((prev) => prev.filter((p) => p.id !== id));
    if (selected === id) setSelected(paths[0]?.id ?? '');
  };

  const renamePath = (id: string, name: string) => {
    setPaths((prev) => prev.map((p) => p.id === id ? { ...p, name } : p));
  };

  return (
    <div className="flex flex-col gap-2 p-2.5 text-gray-300 text-[10px]">
      {/* Paths list */}
      <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
        {paths.map((path) => (
          <div
            key={path.id}
            onClick={() => setSelected(path.id)}
            className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer border transition-colors ${selected === path.id ? 'bg-indigo-950/40 border-indigo-500/40' : 'border-transparent hover:bg-[#1e1e2c]'}`}
          >
            {/* Path thumbnail placeholder */}
            <div className="w-8 h-8 bg-white/5 border border-[#2d2d40] rounded flex items-center justify-center shrink-0">
              <GitBranch className="w-3 h-3 text-gray-500" />
            </div>
            <input
              value={path.name}
              onChange={(e) => renamePath(path.id, e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 bg-transparent text-[10px] focus:outline-none focus:bg-[#1a1a26] focus:px-1 rounded transition-all"
            />
            <button
              onClick={(e) => { e.stopPropagation(); deletePath(path.id); }}
              className="text-gray-600 hover:text-red-400 transition-colors opacity-0 hover:opacity-100 group-hover:opacity-100"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex gap-1 border-t border-[#2d2d40] pt-2">
        <button
          onClick={addPath}
          title="New Path"
          className="flex-1 flex items-center justify-center gap-1 py-1 bg-[#1a1a26] border border-[#2d2d40] rounded hover:bg-[#252535] hover:text-white transition-colors"
        >
          <Plus className="w-3 h-3" /> New
        </button>
        <button
          onClick={() => selected && onConvertToSelection?.(selected)}
          title="Load Selection from Path"
          className="flex-1 flex items-center justify-center gap-1 py-1 bg-[#1a1a26] border border-[#2d2d40] rounded hover:bg-indigo-900/30 hover:border-indigo-500/50 hover:text-indigo-300 transition-colors"
        >
          <Target className="w-3 h-3" /> Select
        </button>
        <button
          onClick={() => selected && onConvertToShape?.(selected)}
          title="Convert Path to Shape"
          className="flex-1 flex items-center justify-center gap-1 py-1 bg-[#1a1a26] border border-[#2d2d40] rounded hover:bg-[#252535] hover:text-white transition-colors"
        >
          <GitBranch className="w-3 h-3" /> Shape
        </button>
      </div>

      <p className="text-[8px] text-gray-600 text-center">Use the Pen Tool to create and edit paths</p>
    </div>
  );
}
