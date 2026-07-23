/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  Move,
  Hand,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Square,
  Circle,
  Triangle,
  Minus,
  Scissors,
  Wand2,
  Crop,
  Layers,
  LifeBuoy,
  Copy,
  Droplet,
  Sun,
  Paintbrush,
  Eraser,
  Type,
  PenTool,
  Pipette,
  Maximize2,
  Sliders,
  ChevronRight,
  Zap,
  Grid,
  Shapes,
  History,
  MousePointer,
  ArrowUpDown,
  Maximize,
  CircleDot
} from 'lucide-react';
import { ToolType, SubToolType } from '../types';

interface SidebarToolsProps {
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  activeSubTool: SubToolType;
  setActiveSubTool: (sub: SubToolType) => void;
  brushColor: string;
  setBrushColor: (c: string) => void;
  backgroundColor: string;
  setBackgroundColor: (c: string) => void;
  isQuickMaskMode?: boolean;
  setIsQuickMaskMode?: (b: boolean) => void;
  screenMode?: 'normal' | 'fullscreen';
  setScreenMode?: (m: 'normal' | 'fullscreen') => void;
  onRemoveBackground?: () => void;
}

interface SubToolItem {
  id: SubToolType;
  label: string;
  shortcut: string;
  icon: React.ReactNode;
}

interface ToolGroup {
  key: string;
  id: ToolType;
  label: string;
  shortcut: string;
  defaultSubTool: SubToolType;
  icon: React.ReactNode;
  subTools: SubToolItem[];
}

export default function SidebarTools({
  activeTool,
  setActiveTool,
  activeSubTool,
  setActiveSubTool,
  brushColor,
  setBrushColor,
  backgroundColor,
  setBackgroundColor,
  isQuickMaskMode = false,
  setIsQuickMaskMode,
  screenMode = 'normal',
  setScreenMode,
  onRemoveBackground,
}: SidebarToolsProps) {
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);
  const closeTimeout = useRef<number | null>(null);

  const handleMouseEnter = (groupKey: string) => {
    if (closeTimeout.current) {
      window.clearTimeout(closeTimeout.current);
      closeTimeout.current = null;
    }
    setHoveredGroup(groupKey);
  };

  const handleMouseLeave = () => {
    closeTimeout.current = window.setTimeout(() => {
      setHoveredGroup(null);
    }, 250);
  };

  const toolGroups: ToolGroup[] = [
    // Left Column Tools
    {
      key: 'marquee',
      id: 'select-rect',
      label: 'Marquee Selection',
      shortcut: 'M',
      defaultSubTool: 'select-rect',
      icon: <Square className="w-4 h-4" />,
      subTools: [
        { id: 'select-rect', label: 'Rectangular Marquee Tool', shortcut: 'M', icon: <Square className="w-3.5 h-3.5" /> },
        { id: 'select-ellipse', label: 'Elliptical Marquee Tool', shortcut: 'M', icon: <Circle className="w-3.5 h-3.5" /> },
        { id: 'select-row', label: 'Single Row Marquee Tool', shortcut: '', icon: <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2"><line x1="1" y1="8" x2="15" y2="8" /></svg> },
        { id: 'select-column', label: 'Single Column Marquee Tool', shortcut: '', icon: <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2"><line x1="8" y1="1" x2="8" y2="15" /></svg> },
      ],
    },
    {
      key: 'lasso',
      id: 'select-lasso',
      label: 'Lasso Tools',
      shortcut: 'L',
      defaultSubTool: 'select-lasso',
      icon: <Scissors className="w-4 h-4" />,
      subTools: [
        { id: 'select-lasso', label: 'Lasso Tool', shortcut: 'L', icon: <Scissors className="w-3.5 h-3.5" /> },
        { id: 'select-poly', label: 'Polygonal Lasso Tool', shortcut: 'Shift+L', icon: <Scissors className="w-3.5 h-3.5 text-indigo-400" /> },
        { id: 'select-magnetic', label: 'Magnetic Lasso Tool', shortcut: 'Ctrl+Shift+L', icon: <Scissors className="w-3.5 h-3.5 text-amber-400" /> },
      ],
    },
    {
      key: 'crop',
      id: 'crop',
      label: 'Crop & Slice',
      shortcut: 'C',
      defaultSubTool: 'crop',
      icon: <Crop className="w-4 h-4" />,
      subTools: [
        { id: 'crop', label: 'Crop Tool', shortcut: 'C', icon: <Crop className="w-3.5 h-3.5" /> },
        { id: 'perspective-crop', label: 'Perspective Crop Tool', shortcut: 'Shift+C', icon: <Maximize2 className="w-3.5 h-3.5" /> },
        { id: 'slice', label: 'Slice Tool', shortcut: 'K', icon: <Grid className="w-3.5 h-3.5" /> },
        { id: 'slice-select', label: 'Slice Select Tool', shortcut: 'Shift+K', icon: <MousePointer className="w-3.5 h-3.5 text-indigo-400" /> },
      ],
    },
    {
      key: 'healing',
      id: 'healing',
      label: 'Healing & Retouching',
      shortcut: 'J',
      defaultSubTool: 'healing-spot',
      icon: <LifeBuoy className="w-4 h-4" />,
      subTools: [
        { id: 'healing-spot', label: 'Spot Healing Brush Tool', shortcut: 'J', icon: <LifeBuoy className="w-3.5 h-3.5" /> },
        { id: 'healing-brush', label: 'Healing Brush Tool', shortcut: 'Shift+J', icon: <LifeBuoy className="w-3.5 h-3.5 text-indigo-400" /> },
        { id: 'patch-tool', label: 'Patch Tool', shortcut: 'J', icon: <Layers className="w-3.5 h-3.5" /> },
        { id: 'content-aware-remove', label: 'AI Content-Aware Remove', shortcut: 'Ctrl+J', icon: <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" /> },
      ],
    },
    {
      key: 'stamp',
      id: 'stamp',
      label: 'Clone Stamp',
      shortcut: 'S',
      defaultSubTool: 'stamp',
      icon: <Copy className="w-4 h-4" />,
      subTools: [
        { id: 'stamp', label: 'Clone Stamp Tool', shortcut: 'S', icon: <Copy className="w-3.5 h-3.5" /> },
      ],
    },
    {
      key: 'eraser',
      id: 'eraser',
      label: 'Eraser Tool',
      shortcut: 'E',
      defaultSubTool: 'eraser',
      icon: <Eraser className="w-4 h-4" />,
      subTools: [
        { id: 'eraser', label: 'Eraser Tool', shortcut: 'E', icon: <Eraser className="w-3.5 h-3.5" /> },
        { id: 'background-eraser', label: 'Background Eraser Tool', shortcut: 'Shift+E', icon: <Scissors className="w-3.5 h-3.5 text-amber-400" /> },
        { id: 'magic-eraser', label: 'Magic Eraser Tool', shortcut: 'Ctrl+E', icon: <Wand2 className="w-3.5 h-3.5 text-indigo-400" /> },
      ],
    },
    {
      key: 'blur-sharpen',
      id: 'blur-sharpen',
      label: 'Blur & Smudge',
      shortcut: 'Shift+R',
      defaultSubTool: 'blur',
      icon: <Droplet className="w-4 h-4" />,
      subTools: [
        { id: 'blur', label: 'Blur Tool', shortcut: 'Shift+R', icon: <Droplet className="w-3.5 h-3.5 text-blue-400" /> },
        { id: 'sharpen', label: 'Sharpen Tool', shortcut: 'Shift+R', icon: <Droplet className="w-3.5 h-3.5 text-emerald-400 font-bold" /> },
        { id: 'smudge', label: 'Smudge Tool', shortcut: 'Shift+R', icon: <Hand className="w-3.5 h-3.5 text-amber-400" /> },
      ],
    },
    {
      key: 'pen-tool',
      id: 'shape',
      label: 'Pen & Point Tool',
      shortcut: 'P',
      defaultSubTool: 'pen',
      icon: <PenTool className="w-4 h-4 text-indigo-400" />,
      subTools: [
        { id: 'pen', label: 'Pen Tool', shortcut: 'P', icon: <PenTool className="w-3.5 h-3.5 text-indigo-400" /> },
        { id: 'freeform-pen', label: 'Freeform Pen', shortcut: 'Shift+P', icon: <PenTool className="w-3.5 h-3.5 text-emerald-400" /> },
      ],
    },
    {
      key: 'path-select',
      id: 'path-select',
      label: 'Path Selection',
      shortcut: 'A',
      defaultSubTool: 'path-select',
      icon: <MousePointer className="w-4 h-4 text-amber-400" />,
      subTools: [
        { id: 'path-select', label: 'Path Selection Tool', shortcut: 'A', icon: <MousePointer className="w-3.5 h-3.5 text-amber-400" /> },
        { id: 'direct-select', label: 'Direct Selection Tool', shortcut: 'Shift+A', icon: <MousePointer className="w-3.5 h-3.5 text-indigo-300" /> },
      ],
    },
    {
      key: 'hand',
      id: 'move',
      label: 'Hand & Pan',
      shortcut: 'H',
      defaultSubTool: 'hand',
      icon: <Hand className="w-4 h-4" />,
      subTools: [
        { id: 'hand', label: 'Hand Tool (Pan)', shortcut: 'H', icon: <Hand className="w-3.5 h-3.5" /> },
        { id: 'rotate-canvas', label: 'Rotate Canvas', shortcut: 'R', icon: <RotateCw className="w-3.5 h-3.5" /> },
      ],
    },

    // Right Column Tools
    {
      key: 'move',
      id: 'move',
      label: 'Move Tool',
      shortcut: 'V',
      defaultSubTool: 'move',
      icon: <Move className="w-4 h-4" />,
      subTools: [
        { id: 'move', label: 'Move Tool', shortcut: 'V', icon: <Move className="w-3.5 h-3.5" /> },
      ],
    },
    {
      key: 'quick-select',
      id: 'select-lasso',
      label: 'Quick Selection',
      shortcut: 'W',
      defaultSubTool: 'select-quick',
      icon: <Wand2 className="w-4 h-4" />,
      subTools: [
        { id: 'select-quick', label: 'Quick Selection Tool', shortcut: 'W', icon: <Paintbrush className="w-3.5 h-3.5 text-emerald-400" /> },
        { id: 'select-wand', label: 'Magic Wand Tool', shortcut: 'W', icon: <Wand2 className="w-3.5 h-3.5 text-indigo-300" /> },
        { id: 'select-ai', label: 'Object Selection Tool', shortcut: 'W', icon: <Zap className="w-3.5 h-3.5 text-amber-400" /> },
      ],
    },
    {
      key: 'eyedropper',
      id: 'eyedropper',
      label: 'Eyedropper Tool',
      shortcut: 'I',
      defaultSubTool: 'eyedropper',
      icon: <Pipette className="w-4 h-4 text-indigo-400" />,
      subTools: [
        { id: 'eyedropper', label: 'Eyedropper Tool', shortcut: 'I', icon: <Pipette className="w-3.5 h-3.5" /> },
      ],
    },
    {
      key: 'brush',
      id: 'brush',
      label: 'Brush & Paint',
      shortcut: 'B',
      defaultSubTool: 'brush',
      icon: <Paintbrush className="w-4 h-4" />,
      subTools: [
        { id: 'brush', label: 'Brush Tool', shortcut: 'B', icon: <Paintbrush className="w-3.5 h-3.5 text-indigo-400" /> },
        { id: 'pencil', label: 'Pencil Tool', shortcut: 'B', icon: <PenTool className="w-3.5 h-3.5" /> },
        { id: 'color-replacement', label: 'Color Replacement Tool', shortcut: 'B', icon: <Pipette className="w-3.5 h-3.5 text-emerald-400" /> },
        { id: 'mixer-brush', label: 'Mixer Brush Tool', shortcut: 'B', icon: <Paintbrush className="w-3.5 h-3.5 text-amber-400" /> },
      ],
    },
    {
      key: 'history-brush',
      id: 'history-brush',
      label: 'History Brush Tool',
      shortcut: 'Y',
      defaultSubTool: 'history-brush',
      icon: <History className="w-4 h-4 text-emerald-400" />,
      subTools: [
        { id: 'history-brush', label: 'History Brush Tool', shortcut: 'Y', icon: <History className="w-3.5 h-3.5" /> },
        { id: 'art-history-brush', label: 'Art History Brush', shortcut: 'Shift+Y', icon: <History className="w-3.5 h-3.5 text-amber-400" /> },
      ],
    },
    {
      key: 'gradient',
      id: 'gradient',
      label: 'Gradient & Paint Bucket',
      shortcut: 'G',
      defaultSubTool: 'gradient',
      icon: <Sliders className="w-4 h-4" />,
      subTools: [
        { id: 'gradient', label: 'Gradient Tool', shortcut: 'G', icon: <Sliders className="w-3.5 h-3.5 text-indigo-400" /> },
        { id: 'paint-bucket', label: 'Paint Bucket Tool', shortcut: 'G', icon: <Paintbrush className="w-3.5 h-3.5 text-emerald-400" /> },
      ],
    },
    {
      key: 'dodge-burn',
      id: 'dodge-burn',
      label: 'Dodge, Burn & Sponge',
      shortcut: 'O',
      defaultSubTool: 'dodge',
      icon: <Sun className="w-4 h-4" />,
      subTools: [
        { id: 'dodge', label: 'Dodge Tool', shortcut: 'O', icon: <Sun className="w-3.5 h-3.5 text-amber-400" /> },
        { id: 'burn', label: 'Burn Tool', shortcut: 'Shift+O', icon: <Sun className="w-3.5 h-3.5 text-gray-400" /> },
        { id: 'sponge', label: 'Sponge Tool', shortcut: 'Ctrl+O', icon: <Sliders className="w-3.5 h-3.5 text-indigo-400" /> },
      ],
    },
    {
      key: 'text',
      id: 'text',
      label: 'Horizontal Type Tool',
      shortcut: 'T',
      defaultSubTool: 'text',
      icon: <Type className="w-4 h-4" />,
      subTools: [
        { id: 'text', label: 'Horizontal Type Tool', shortcut: 'T', icon: <Type className="w-3.5 h-3.5" /> },
      ],
    },
    {
      key: 'shape',
      id: 'shape',
      label: 'Shape Tool',
      shortcut: 'U',
      defaultSubTool: 'shape-rect',
      icon: <Square className="w-4 h-4 text-emerald-400" />,
      subTools: [
        { id: 'shape-rect', label: 'Rectangle Tool', shortcut: 'U', icon: <Square className="w-3.5 h-3.5" /> },
        { id: 'shape-rounded-rect', label: 'Rounded Rectangle', shortcut: 'U', icon: <Square className="w-3.5 h-3.5 rounded" /> },
        { id: 'shape-ellipse', label: 'Ellipse Tool', shortcut: 'U', icon: <Circle className="w-3.5 h-3.5" /> },
        { id: 'shape-poly', label: 'Polygon Tool', shortcut: 'U', icon: <Triangle className="w-3.5 h-3.5" /> },
        { id: 'shape-line', label: 'Line Tool', shortcut: 'U', icon: <Minus className="w-3.5 h-3.5 stroke-[2.5]" /> },
        { id: 'shape-custom', label: 'Custom Shape Tool', shortcut: 'Shift+U', icon: <Shapes className="w-3.5 h-3.5 text-amber-400" /> },
      ],
    },
    {
      key: 'zoom',
      id: 'move',
      label: 'Zoom Tool',
      shortcut: 'Z',
      defaultSubTool: 'zoom-in',
      icon: <ZoomIn className="w-4 h-4" />,
      subTools: [
        { id: 'zoom-in', label: 'Zoom In Tool (+)', shortcut: 'Z', icon: <ZoomIn className="w-3.5 h-3.5" /> },
        { id: 'zoom-out', label: 'Zoom Out Tool (-)', shortcut: 'Alt+Z', icon: <ZoomOut className="w-3.5 h-3.5" /> },
      ],
    },
  ];

  const rows = [
    { left: 'marquee', right: 'move' },
    { left: 'lasso', right: 'quick-select' },
    { left: 'crop', right: 'eyedropper' },
    { left: 'healing', right: 'brush' },
    { left: 'stamp', right: 'history-brush' },
    { left: 'eraser', right: 'gradient' },
    { left: 'blur-sharpen', right: 'dodge-burn' },
    { left: 'pen-tool', right: 'text' },
    { left: 'path-select', right: 'shape' },
    { left: 'hand', right: 'zoom' },
  ];

  const handleGroupSelect = (group: ToolGroup) => {
    setActiveTool(group.id);
    const hasActiveSub = group.subTools.some((st) => st.id === activeSubTool);
    if (!hasActiveSub) {
      setActiveSubTool(group.defaultSubTool);
    }
  };

  const handleSubToolSelect = (groupId: ToolType, subId: SubToolType) => {
    setActiveTool(groupId);
    setActiveSubTool(subId);
    setHoveredGroup(null);
  };

  // Color Swap and Defaults
  const swapColors = () => {
    const temp = brushColor;
    setBrushColor(backgroundColor);
    setBackgroundColor(temp);
  };

  const resetColors = () => {
    setBrushColor('#ffffff');
    setBackgroundColor('#000000');
  };

  const renderToolButton = (groupKey: string) => {
    const g = toolGroups.find((tg) => tg.key === groupKey);
    if (!g) return null;

    // A group is active if activeTool matches AND the activeSubTool belongs to this group's subtools
    const isGroupActive = activeTool === g.id && g.subTools.some((st) => st.id === activeSubTool);
    const currentActiveSubItem = g.subTools.find((st) => st.id === activeSubTool);

    const displayedIcon = (isGroupActive && currentActiveSubItem) ? currentActiveSubItem.icon : g.icon;
    const displayedLabel = (isGroupActive && currentActiveSubItem) ? currentActiveSubItem.label : g.label;

    return (
      <div
        key={g.key}
        className="relative"
        onMouseEnter={() => handleMouseEnter(g.key)}
        onMouseLeave={handleMouseLeave}
      >
        <button
          onClick={() => handleGroupSelect(g)}
          title={hoveredGroup === g.key ? undefined : displayedLabel}
          className={`relative flex items-center justify-center w-7 h-7 rounded transition-all cursor-pointer ${
            isGroupActive
              ? 'bg-[#385b75] text-white shadow-md border border-[#4b7a9e]'
              : 'text-gray-400 hover:text-gray-200 hover:bg-[#1c1c24]'
          }`}
        >
          {displayedIcon}

          {g.subTools.length > 1 && (
            <div className="absolute bottom-0 right-0 w-0 h-0 border-b-[3px] border-r-[3px] border-b-transparent border-r-gray-500" />
          )}
        </button>

        {hoveredGroup === g.key && (
          <div
            className="absolute left-[32px] pl-2 top-0 z-[100] w-56 animate-in fade-in slide-in-from-left-1 duration-100 pointer-events-auto"
            onMouseEnter={() => handleMouseEnter(g.key)}
            onMouseLeave={handleMouseLeave}
          >
            <div className="bg-[#0f0f14] border border-[#252532] rounded-lg shadow-2xl p-1.5 font-sans flex flex-col gap-1">
              <div className="px-1.5 py-0.5 border-b border-[#20202c] mb-1 flex items-center justify-between">
                <span className="font-bold text-white text-[10px] uppercase tracking-wider">{g.label}</span>
                <span className="text-[8px] text-indigo-400 font-mono bg-indigo-500/10 px-1 rounded">Key: {g.shortcut}</span>
              </div>

              <div className="flex flex-col gap-0.5 max-h-[220px] overflow-y-auto">
                {g.subTools.map((sub) => {
                  const isSubActive = activeSubTool === sub.id;
                  return (
                    <button
                      key={sub.id}
                      onClick={() => handleSubToolSelect(g.id, sub.id)}
                      className={`flex items-center justify-between w-full text-left px-2 py-1 rounded text-[10px] transition-all cursor-pointer ${
                        isSubActive
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'text-gray-300 hover:bg-[#1a1a24] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={isSubActive ? 'text-white' : 'text-indigo-400'}>{sub.icon}</span>
                        <span>{sub.label}</span>
                      </div>
                      <span className="text-[8px] font-mono text-gray-500">{sub.shortcut}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center py-2 bg-[#0c0c10] border-r border-[#1f1f26] w-18 shrink-0 h-full select-none justify-between relative">
      {/* 2-Column Grid Toolbar */}
      <div className="flex flex-col gap-1 w-full px-1.5">
        <span className="text-[7px] font-mono font-bold text-gray-600 tracking-wider mb-2 text-center block">PS BAR</span>
        <div className="grid grid-cols-2 gap-1.5">
          {rows.map((row, idx) => (
            <React.Fragment key={idx}>
              {renderToolButton(row.left)}
              {renderToolButton(row.right)}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Color and Display Controllers Bottom */}
      <div className="flex flex-col items-center gap-3 pb-3 mt-4 border-t border-[#1a1a24] pt-3 w-full px-2">
        {/* Overlapping Color Squares */}
        <div className="relative w-11 h-11">
          {/* Background color block */}
          <div
            className="absolute bottom-0 right-0 w-6.5 h-6.5 rounded border-2 border-[#2b2b35] shadow-lg overflow-hidden z-10 cursor-pointer hover:border-white transition-colors flex items-center justify-center"
            style={{ backgroundColor: backgroundColor }}
            title="Background Color (Click to pick)"
            onClick={() => document.getElementById('bg-color-picker-input')?.click()}
          >
            <input
              id="bg-color-picker-input"
              type="color"
              value={backgroundColor}
              onChange={(e) => setBackgroundColor(e.target.value)}
              className="opacity-0 absolute w-0 h-0 pointer-events-none"
            />
          </div>

          {/* Foreground color block */}
          <div
            className="absolute top-0 left-0 w-6.5 h-6.5 rounded border-2 border-white shadow-xl overflow-hidden z-20 cursor-pointer hover:scale-105 transition-transform flex items-center justify-center"
            style={{ backgroundColor: brushColor }}
            title="Foreground Color (Click to pick)"
            onClick={() => document.getElementById('fg-color-picker-input')?.click()}
          >
            <input
              id="fg-color-picker-input"
              type="color"
              value={brushColor}
              onChange={(e) => setBrushColor(e.target.value)}
              className="opacity-0 absolute w-0 h-0 pointer-events-none"
            />
          </div>

          {/* Color swap button */}
          <button
            onClick={swapColors}
            title="Swap Colors (X)"
            className="absolute top-0 right-0 z-30 text-gray-400 hover:text-white transition-colors cursor-pointer p-0.5 bg-[#181822] border border-[#2b2b35] rounded-full shadow hover:bg-indigo-600"
          >
            <ArrowUpDown className="w-2.5 h-2.5" />
          </button>

          {/* Color reset button */}
          <button
            onClick={resetColors}
            title="Default Colors Black/White (D)"
            className="absolute bottom-0 left-0 z-30 text-gray-400 hover:text-white transition-colors cursor-pointer p-0.5 bg-[#181822] border border-[#2b2b35] rounded-xs shadow hover:bg-indigo-600"
          >
            <div className="w-2 h-2 border border-white bg-black" />
          </button>
        </div>

        {/* Display Toggles */}
        <div className="flex flex-col gap-1.5 w-full items-center border-t border-[#1a1a24] pt-2">
          {/* AI Remove Background Button */}
          <button
            onClick={onRemoveBackground}
            title="AI Remove Background (Ctrl+Alt+R)"
            className="p-1.5 rounded-md cursor-pointer text-indigo-400 hover:text-white hover:bg-indigo-600/30 border border-indigo-500/30 transition-all shadow-xs"
          >
            <Scissors className="w-3.5 h-3.5" />
          </button>

          {/* Quick Mask Mode Button */}
          <button
            onClick={() => {
              if (setIsQuickMaskMode) {
                const nextQM = !isQuickMaskMode;
                setIsQuickMaskMode(nextQM);
                if (nextQM) {
                  setActiveTool('brush');
                  setActiveSubTool('brush');
                }
              }
            }}
            title={isQuickMaskMode ? "Exit Quick Mask Mode (Q)" : "Edit in Quick Mask Mode (Q)"}
            className={`p-1.5 rounded-md cursor-pointer transition-all border shadow-xs ${
              isQuickMaskMode 
                ? 'bg-rose-600 text-white border-rose-400 shadow-rose-900/50 animate-pulse' 
                : 'text-gray-400 hover:text-white hover:bg-[#1a1a24] border-[#2b2b35]'
            }`}
          >
            <CircleDot className="w-3.5 h-3.5" />
          </button>

          {/* Screen Mode Toggle Button */}
          <button
            onClick={() => setScreenMode && setScreenMode(screenMode === 'normal' ? 'fullscreen' : 'normal')}
            title={screenMode === 'fullscreen' ? "Standard Screen Mode (F)" : "Full Screen Mode (F)"}
            className={`p-1.5 rounded-md cursor-pointer transition-all border shadow-xs ${
              screenMode === 'fullscreen' 
                ? 'bg-indigo-600 text-white border-indigo-400 shadow-indigo-900/50' 
                : 'text-gray-400 hover:text-white hover:bg-[#1a1a24] border-[#2b2b35]'
            }`}
          >
            <Maximize className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
