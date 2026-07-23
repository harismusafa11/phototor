/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { History, RotateCcw, ArrowLeft, ArrowRight } from 'lucide-react';

interface HistoryPanelProps {
  historyStack: { description: string }[];
  historyIndex: number;
  onJumpToState: (idx: number) => void;
  onUndo: () => void;
  onRedo: () => void;
}

export default function HistoryPanel({
  historyStack,
  historyIndex,
  onJumpToState,
  onUndo,
  onRedo,
}: HistoryPanelProps) {
  return (
    <div className="flex flex-col bg-[#1e1e1f] h-full text-xs select-none w-full">
      
      {/* Header */}
      <div className="p-2 border-b border-[#181819] bg-[#181819] flex items-center justify-between text-[10px]">
        <span className="font-bold text-gray-300 flex items-center gap-1.5 font-sans">
          <History className="w-3.5 h-3.5 text-indigo-400" />
          Edit History
        </span>

        {/* Shortcuts Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={onUndo}
            disabled={historyIndex <= 0}
            title="Undo (Ctrl+Z)"
            className="p-1 text-gray-400 hover:text-white hover:bg-[#2d2d2e] rounded disabled:opacity-35 cursor-pointer"
          >
            <ArrowLeft className="w-3 h-3" />
          </button>
          <button
            onClick={onRedo}
            disabled={historyIndex >= historyStack.length - 1}
            title="Redo (Ctrl+Shift+Z)"
            className="p-1 text-gray-400 hover:text-white hover:bg-[#2d2d2e] rounded disabled:opacity-35 cursor-pointer"
          >
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* States Stack List */}
      <div className="flex-1 overflow-y-auto p-1.5 bg-[#1a1a1a] space-y-0.5 scrollbar-thin">
        {historyStack.length === 0 ? (
          <div className="text-center py-8 text-gray-500 font-medium">New document sessions</div>
        ) : (
          historyStack.map((state, idx) => {
            const isActive = idx === historyIndex;
            const isDiscarded = idx > historyIndex; // States in the future timeline before redo

            return (
              <div
                key={idx}
                onClick={() => onJumpToState(idx)}
                className={`py-1.5 px-2.5 rounded-sm border cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-[#385b75] border-[#4b7a9e] text-white font-bold'
                    : isDiscarded
                    ? 'bg-[#252526]/40 border-transparent text-gray-600 line-through decoration-gray-700'
                    : 'bg-[#252526] border-[#1d1d1e] text-gray-300 hover:bg-[#2d2d2e]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate">{state.description}</span>
                  <span className="font-mono text-[8px] text-gray-500">#{idx}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Snapshot/Session Info */}
      <div className="p-2 border-t border-[#181819] bg-[#1e1e1f] flex justify-between text-[9px] text-gray-500">
        <span>Timeline Snapshots</span>
        <span className="font-mono">{historyIndex + 1} / {historyStack.length} states</span>
      </div>
    </div>
  );
}
