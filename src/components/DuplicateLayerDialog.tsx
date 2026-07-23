import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { Layer } from '../types';

interface DuplicateLayerDialogProps {
  layer: Layer;
  openProjects: { id: string; name: string }[];
  targetGroups: { id: string; name: string }[];
  onApply: (params: {
    name: string;
    targetProjectId: string;
    targetGroupId: string;
  }) => void;
  onCancel: () => void;
}

export default function DuplicateLayerDialog({
  layer,
  openProjects,
  targetGroups,
  onApply,
  onCancel,
}: DuplicateLayerDialogProps) {
  const [name, setName] = useState<string>(`${layer.name} Copy`);
  const [targetProjectId, setTargetProjectId] = useState<string>(openProjects[0]?.id || 'current');
  const [targetGroupId, setTargetGroupId] = useState<string>('none');

  const handleApply = () => {
    onApply({
      name: name.trim() || `${layer.name} Copy`,
      targetProjectId,
      targetGroupId,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs select-none">
      <div className="w-full max-w-sm bg-[#141419] border border-[#2c2c36] rounded-xl overflow-hidden p-5 shadow-2xl space-y-5 text-xs text-gray-200 font-sans">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#24242c] pb-3 shrink-0">
          <h3 className="font-bold text-sm text-white">Duplicate Layer</h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
        </div>

        {/* Form Body */}
        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-gray-500 font-medium">Duplicate: "{layer.name}"</span>
            <label className="text-gray-400 font-bold mt-1">As:</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-[#1e1e24] border border-[#2c2c36] rounded-lg px-3 py-2 text-white font-sans text-xs focus:border-indigo-500 focus:outline-none w-full"
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-gray-400 font-bold">Destination Document:</label>
            <select
              value={targetProjectId}
              onChange={(e) => setTargetProjectId(e.target.value)}
              className="bg-[#1e1e24] border border-[#2c2c36] rounded-lg px-3 py-2 text-white text-xs focus:border-indigo-500 focus:outline-none w-full"
            >
              <option value="current">Current Document</option>
              {openProjects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
              <option value="new">New Document (New Tab)</option>
            </select>
          </div>

          {targetProjectId !== 'new' && targetGroups.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-gray-400 font-bold">Destination Group/Folder:</label>
              <select
                value={targetGroupId}
                onChange={(e) => setTargetGroupId(e.target.value)}
                className="bg-[#1e1e24] border border-[#2c2c36] rounded-lg px-3 py-2 text-white text-xs focus:border-indigo-500 focus:outline-none w-full"
              >
                <option value="none">Root / None</option>
                {targetGroups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-[#24242c] pt-4 shrink-0">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 bg-[#25252e] hover:bg-[#2d2d38] border border-[#2c2c36] text-gray-300 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors flex items-center gap-1 cursor-pointer font-bold"
          >
            <Check className="w-3.5 h-3.5" />
            Duplicate
          </button>
        </div>

      </div>
    </div>
  );
}
