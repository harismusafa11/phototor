/**
 * DraggableTabContainer.tsx
 * Professional Drag-and-Drop Reorderable Tab Container for Phototor.
 * Supports fluid HTML5 drag & drop reordering, active tab switching, and tab closing.
 */

import React, { useState, useRef } from 'react';
import { GripVertical, X } from 'lucide-react';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  active: boolean;
}

interface DraggableTabContainerProps {
  tabs: TabItem[];
  onSelectTab: (id: string) => void;
  onCloseTab?: (id: string) => void;
  onReorderTabs: (reorderedIds: string[]) => void;
  className?: string;
}

export default function DraggableTabContainer({
  tabs,
  onSelectTab,
  onCloseTab,
  onReorderTabs,
  className = '',
}: DraggableTabContainerProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const dragItemNode = useRef<HTMLDivElement | null>(null);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    setDraggedId(id);
    dragItemNode.current = e.currentTarget;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedId && draggedId !== id) {
      setDragOverId(id);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    if (dragOverId === id) {
      setDragOverId(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const currentIds = tabs.map((t) => t.id);
    const draggedIndex = currentIds.indexOf(draggedId);
    const targetIndex = currentIds.indexOf(targetId);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      const newIds = [...currentIds];
      const [removed] = newIds.splice(draggedIndex, 1);
      newIds.splice(targetIndex, 0, removed);
      onReorderTabs(newIds);
    }

    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  return (
    <div className={`flex items-center bg-[#171722] border-b border-[#1e1e2c] overflow-x-auto scrollbar-none shrink-0 select-none ${className}`}>
      {tabs.map((tab) => {
        const isBeingDragged = draggedId === tab.id;
        const isDragOver = dragOverId === tab.id;

        return (
          <div
            key={tab.id}
            draggable
            onDragStart={(e) => handleDragStart(e, tab.id)}
            onDragOver={(e) => handleDragOver(e, tab.id)}
            onDragLeave={(e) => handleDragLeave(e, tab.id)}
            onDrop={(e) => handleDrop(e, tab.id)}
            onDragEnd={handleDragEnd}
            className={`group flex items-center shrink-0 border-r border-[#1e1e2c] relative transition-all duration-150 ${
              isBeingDragged ? 'opacity-40 bg-indigo-950/40 border-dashed border-indigo-500 scale-95' : ''
            } ${isDragOver ? 'border-l-2 border-l-indigo-400 bg-indigo-500/10' : ''}`}
          >
            {/* Reorder Grip Indicator on hover */}
            <div className="pl-1 text-gray-600 group-hover:text-gray-400 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity">
              <GripVertical className="w-2.5 h-2.5" />
            </div>

            {/* Main Tab Switcher Button */}
            <button
              onClick={() => onSelectTab(tab.id)}
              className={`flex items-center gap-1.5 pl-1.5 pr-2 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                tab.active
                  ? 'bg-[#121218] text-indigo-400 border-b-2 border-b-indigo-500 font-extrabold shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#1b1b26]'
              }`}
            >
              {tab.icon && <span className="w-3.5 h-3.5 text-gray-500 shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
            </button>

            {/* Close Button */}
            {onCloseTab && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab.id);
                }}
                className="pr-2 pl-0.5 text-gray-600 hover:text-red-400 transition-colors text-[9px] bg-transparent border-0 self-stretch flex items-center justify-center hover:bg-[#1c1c28] cursor-pointer"
                title={`Close ${tab.label}`}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
