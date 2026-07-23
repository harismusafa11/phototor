/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Eye,
  EyeOff,
  Lock,
  Folder,
  Plus,
  Trash2,
  Copy,
  Circle,
  Sun,
  Link,
  Grid,
  Paintbrush,
  Move,
  Search,
  ChevronRight,
  ChevronDown,
  FileText,
  HelpCircle,
  FolderOpen,
  Square,
  Type
} from 'lucide-react';
import { Layer, BlendMode } from '../../types';

const BLEND_MODES: BlendMode[] = [
  'normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten',
  'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion',
  'linear-dodge', 'linear-burn', 'vivid-light', 'linear-light', 'pin-light', 'hard-mix', 'subtract', 'divide',
  'hue', 'saturation', 'color', 'luminosity'
];

interface LayersPanelProps {
  layers: Layer[];
  activeLayerId: string | null;
  activeLayerIds?: string[];
  setActiveLayerId: (id: string) => void;
  setActiveLayerIds?: (ids: string[]) => void;
  onUpdateLayer: (id: string, updates: Partial<Layer>) => void;
  onAddLayer: (type: 'image' | 'text' | 'shape' | 'drawing' | 'adjustment' | 'group' | 'smartobject', extra?: Partial<Layer>) => void;
  onDeleteLayer: (id: string) => void;
  onDuplicateLayer: (id: string) => void;
  onReorderLayers: (fromIndex: number, toIndex: number) => void;
  onOpenLayerStyle?: (layerId: string) => void;
  onOpenLayerProperties?: (layerId: string) => void;
  onOpenDuplicateDialog?: (layerId: string) => void;
  onOpenNewLayerDialog?: () => void;
  onOpenAdjustmentDialog?: (adjustmentType: string) => void;
  onMergeSelected?: () => void;
  onMergeDown?: (layerId: string) => void;
  onFlattenImage?: () => void;
  onEditSmartObject?: (id: string) => void;
  onUngroupLayers?: (groupId: string) => void;
  onGroupSelected?: () => void;
}

export default function LayersPanel({
  layers,
  activeLayerId,
  activeLayerIds = [],
  setActiveLayerId,
  setActiveLayerIds,
  onUpdateLayer,
  onAddLayer,
  onDeleteLayer,
  onDuplicateLayer,
  onReorderLayers,
  onOpenLayerStyle,
  onOpenLayerProperties,
  onOpenDuplicateDialog,
  onOpenNewLayerDialog,
  onOpenAdjustmentDialog,
  onMergeSelected,
  onMergeDown,
  onFlattenImage,
  onEditSmartObject,
  onUngroupLayers,
  onGroupSelected,
}: LayersPanelProps) {
  const [showAdjustmentPopover, setShowAdjustmentPopover] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<'above' | 'below' | 'inside' | null>(null);
  const [showOpacitySlider, setShowOpacitySlider] = useState(false);
  const [showFillSlider, setShowFillSlider] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'image' | 'text' | 'shape' | 'adjustment' | 'smartobject'>('all');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; layer: Layer } | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);

  const ADJUSTMENT_MENU_GROUPS = [
    {
      title: 'Fill Layers',
      items: [
        { id: 'solid-color', name: 'Solid Color...', isFill: true },
        { id: 'gradient-fill', name: 'Gradient...', isFill: true },
      ]
    },
    {
      title: 'Tone & Contrast',
      items: [
        { id: 'brightness-contrast', name: 'Brightness/Contrast...' },
        { id: 'levels', name: 'Levels...' },
        { id: 'curves', name: 'Curves...' },
        { id: 'exposure', name: 'Exposure...' },
      ]
    },
    {
      title: 'Color Adjustments',
      items: [
        { id: 'vibrance', name: 'Vibrance...' },
        { id: 'hue-saturation', name: 'Hue/Saturation...' },
        { id: 'color-balance', name: 'Color Balance...' },
        { id: 'black-white', name: 'Black & White...' },
        { id: 'photo-filter', name: 'Photo Filter...' },
        { id: 'channel-mixer', name: 'Channel Mixer...' },
        { id: 'color-lookup', name: 'Color Lookup (LUT)...' },
      ]
    },
    {
      title: 'Special Effects',
      items: [
        { id: 'invert', name: 'Invert' },
        { id: 'posterize', name: 'Posterize...' },
        { id: 'threshold', name: 'Threshold...' },
        { id: 'gradient-map', name: 'Gradient Map...' },
        { id: 'selective-color', name: 'Selective Color...' },
      ]
    }
  ];

  // Sync multi-select keys if not managed by parent
  const selectedIds = activeLayerIds.length > 0 ? activeLayerIds : (activeLayerId ? [activeLayerId] : []);

  useEffect(() => {
    // Dismiss context menu on click outside
    const handleOutsideClick = () => setContextMenu(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const handleSelectLayer = (e: React.MouseEvent, layerId: string) => {
    e.stopPropagation();
    if (!setActiveLayerIds) {
      setActiveLayerId(layerId);
      return;
    }

    if (e.ctrlKey || e.metaKey) {
      // Toggle selection
      if (selectedIds.includes(layerId)) {
        setActiveLayerIds(selectedIds.filter(id => id !== layerId));
      } else {
        setActiveLayerIds([...selectedIds, layerId]);
      }
    } else if (e.shiftKey && selectedIds.length > 0) {
      // Select range
      const lastSelected = selectedIds[selectedIds.length - 1];
      const idx1 = layers.findIndex(l => l.id === lastSelected);
      const idx2 = layers.findIndex(l => l.id === layerId);
      if (idx1 !== -1 && idx2 !== -1) {
        const start = Math.min(idx1, idx2);
        const end = Math.max(idx1, idx2);
        const range = layers.slice(start, end + 1).map(l => l.id);
        setActiveLayerIds(Array.from(new Set([...selectedIds, ...range])));
      }
    } else {
      // Single select
      setActiveLayerIds([layerId]);
      setActiveLayerId(layerId);
    }
  };

  const handleStartRename = (layer: Layer) => {
    setEditingId(layer.id);
    setEditingName(layer.name);
  };

  const handleFinishRename = (id: string) => {
    onUpdateLayer(id, { name: editingName || 'Unnamed Layer' });
    setEditingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, layerId: string) => {
    if (e.key === 'F2') {
      const layer = layers.find(l => l.id === layerId);
      if (layer) handleStartRename(layer);
    }
  };

  // Drag and Drop reordering tree handlers
  const handleDragStart = (e: React.DragEvent, layerId: string) => {
    e.dataTransfer.setData('text/plain', layerId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetLayer: Layer) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const rect = e.currentTarget.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;

    if (targetLayer.type === 'group') {
      if (relativeY < rect.height * 0.3) {
        setDragOverPosition('above');
      } else if (relativeY > rect.height * 0.7) {
        setDragOverPosition('below');
      } else {
        setDragOverPosition('inside');
      }
    } else {
      if (relativeY < rect.height * 0.5) {
        setDragOverPosition('above');
      } else {
        setDragOverPosition('below');
      }
    }
    setDragOverId(targetLayer.id);
  };

  const handleDrop = (e: React.DragEvent, targetLayer: Layer) => {
    e.preventDefault();
    const dragId = e.dataTransfer.getData('text/plain');
    if (!dragId || dragId === targetLayer.id) {
      setDragOverId(null);
      return;
    }

    const fromIndex = layers.findIndex(l => l.id === dragId);
    const toIndex = layers.findIndex(l => l.id === targetLayer.id);

    if (fromIndex === -1 || toIndex === -1) return;

    if (dragOverPosition === 'inside' && targetLayer.type === 'group') {
      // Add inside group
      onUpdateLayer(dragId, { parentId: targetLayer.id });
      // Add to childrenIds
      const children = targetLayer.childrenIds || [];
      if (!children.includes(dragId)) {
        onUpdateLayer(targetLayer.id, { childrenIds: [...children, dragId] });
      }
    } else {
      // Reorder layers list
      const dragLayer = layers[fromIndex];
      // Keep same group depth context as target
      onUpdateLayer(dragId, { parentId: targetLayer.parentId });
      onReorderLayers(fromIndex, toIndex);
    }

    setDragOverId(null);
    setDragOverPosition(null);
  };

  const activeLayer = layers.find((l) => l.id === activeLayerId);

  // Render recursive nested layers
  const renderLayerTree = (parentId: string | undefined, depth: number): React.ReactNode[] => {
    const items: React.ReactNode[] = [];
    const filtered = layers.filter(l => l.parentId === parentId);
    const isFiltering = filterText.trim() !== '' || filterType !== 'all';

    // Apply filters if no parent is set or filtering is active
    const displayList = parentId === undefined
      ? layers.filter(l => {
          const matchesText = l.name.toLowerCase().includes(filterText.toLowerCase());
          const matchesType = filterType === 'all'
            ? true
            : filterType === 'image'
              ? (l.type === 'image' || l.type === 'background' || l.type === 'video' || l.type === 'drawing' || l.type === 'ai')
              : filterType === 'smartobject'
                ? l.type === 'smartobject'
                : l.type === filterType;
          return matchesText && matchesType;
        })
      : filtered;

    // If searching or filtering by category, render flat displayList
    const loopList = isFiltering ? displayList : filtered;

    loopList.forEach((layer) => {
      // If nested rendering is active, make sure we only draw root folders at root level
      if (!isFiltering && parentId === undefined && layer.parentId !== undefined) return;

      const isSelected = selectedIds.includes(layer.id);
      const isDragOver = dragOverId === layer.id;

      let borderStyle = '';
      if (isDragOver) {
        if (dragOverPosition === 'above') borderStyle = 'border-t-2 border-t-indigo-500';
        else if (dragOverPosition === 'below') borderStyle = 'border-b-2 border-b-indigo-500';
        else if (dragOverPosition === 'inside') borderStyle = 'bg-indigo-900/20 border-2 border-indigo-400';
      }

      const layerColorLabel = layer.colorLabel && layer.colorLabel !== 'none'
        ? {
            red: 'border-l-4 border-l-red-500',
            orange: 'border-l-4 border-l-orange-500',
            yellow: 'border-l-4 border-l-yellow-500',
            green: 'border-l-4 border-l-green-500',
            blue: 'border-l-4 border-l-blue-500',
            purple: 'border-l-4 border-l-purple-500',
            gray: 'border-l-4 border-l-gray-500',
          }[layer.colorLabel]
        : '';

      const isGroupFolder = layer.type === 'group';
      const isNestedInGroup = depth > 0;

      // Derived visual styling for root vs nested grouped layers
      const itemBgStyle = isSelected
        ? 'bg-[#385b75] border-[#4b7a9e] text-white font-semibold shadow-xs'
        : isGroupFolder
          ? 'bg-[#1e1c14] border-[#38301c] text-amber-200 hover:bg-[#28251b] font-bold'
          : isNestedInGroup
            ? 'bg-[#161620] border-[#222230] text-gray-300 hover:bg-[#20202d] border-l-2 border-l-amber-500/60'
            : 'bg-[#252526] border-[#1d1d1e] text-gray-300 hover:bg-[#2d2d2e]';

      items.push(
        <div
          key={layer.id}
          onClick={(e) => handleSelectLayer(e, layer.id)}
          onKeyDown={(e) => handleKeyDown(e, layer.id)}
          tabIndex={0}
          draggable={!layer.locked}
          onDragStart={(e) => handleDragStart(e, layer.id)}
          onDragOver={(e) => handleDragOver(e, layer)}
          onDrop={(e) => handleDrop(e, layer)}
          onContextMenu={(e) => {
            e.preventDefault();
            setContextMenu({ x: e.clientX, y: e.clientY, layer });
          }}
          className={`flex items-center justify-between py-1.5 px-2 border transition-all cursor-pointer select-none relative ${itemBgStyle} ${borderStyle} ${layerColorLabel}`}
          style={{ paddingLeft: `${Math.max(8, depth * 22)}px` }}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {/* Group Tree Branch Connector Icon */}
            {isNestedInGroup && (
              <span className="text-amber-500/80 font-mono text-[10px] font-bold shrink-0 leading-none select-none">
                └─
              </span>
            )}

            {/* Visibility Toggle */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUpdateLayer(layer.id, { visible: !layer.visible });
              }}
              className="hover:text-white cursor-pointer shrink-0"
              title={layer.visible ? "Hide Layer" : "Show Layer"}
            >
              {layer.visible ? (
                <Eye className="w-3.5 h-3.5 text-gray-300" />
              ) : (
                <EyeOff className="w-3.5 h-3.5 text-gray-700" />
              )}
            </button>

            {/* Folder Toggle */}
            {isGroupFolder && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateLayer(layer.id, { expanded: layer.expanded !== false ? false : true });
                }}
                className="text-amber-400 hover:text-amber-200 shrink-0 p-0.5 rounded hover:bg-amber-500/20"
                title="Expand/Collapse Group"
              >
                {layer.expanded !== false ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            )}

            {/* Clipping Mask Indent Indicator */}
            {layer.isClippingMask && (
              <span className="text-indigo-400 font-bold mr-0.5 text-[9px]">↳</span>
            )}

            {/* Icon */}
            <div className={`w-8 h-6 bg-[#0d0d0f] border flex items-center justify-center overflow-hidden shrink-0 rounded-xs ${
              isGroupFolder ? 'border-amber-500/40 bg-amber-950/20' : 'border-[#3e3e3e]'
            }`}>
              {layer.imageUrl ? (
                <img src={layer.imageUrl} className="max-w-full max-h-full object-contain" alt="" />
              ) : layer.type === 'text' ? (
                <Type className="w-3 h-3 text-gray-400" />
              ) : layer.type === 'shape' ? (
                <Square className="w-3 h-3 text-gray-400" />
              ) : isGroupFolder ? (
                <Folder className="w-3.5 h-3.5 text-amber-400 fill-amber-500/20" />
              ) : layer.type === 'smartobject' ? (
                <FileText className="w-3 h-3 text-sky-400" />
              ) : (
                <Move className="w-3 h-3 text-gray-400" />
              )}
            </div>

            {/* Layer Mask thumbnail */}
            {layer.hasMask && layer.maskCanvas && (
              <div
                className="w-8 h-6 bg-black border border-[#3e3e3e] flex items-center justify-center overflow-hidden shrink-0 rounded-xs ml-0.5"
                title="Layer Mask (paint on it)"
              >
                <img src={layer.maskCanvas.toDataURL()} className="max-w-full max-h-full object-contain bg-[#111]" alt="mask" />
              </div>
            )}

            {/* Text Rename Input vs Display */}
            <div className="min-w-0 flex-1 flex items-center gap-1.5">
              {editingId === layer.id ? (
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => handleFinishRename(layer.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleFinishRename(layer.id);
                  }}
                  autoFocus
                  className="bg-[#121214] text-white text-[10px] px-1 py-0.5 rounded border border-indigo-500 focus:outline-none w-full font-sans"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <>
                  <span
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      handleStartRename(layer);
                    }}
                    className={`truncate block tracking-tight text-[10px] ${
                      isGroupFolder ? 'text-amber-200 font-bold' : layer.locked ? 'text-gray-500' : 'text-gray-200'
                    }`}
                  >
                    {layer.name}
                  </span>
                  {isGroupFolder && layer.childrenIds && (
                    <span className="text-[8px] font-mono text-amber-500/70 font-semibold shrink-0">
                      ({layer.childrenIds.length})
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Indicators column */}
          <div className="flex items-center gap-1 shrink-0 ml-1.5">
            {layer.locked && <Lock className="w-3 h-3 text-gray-500" />}
            {layer.layerStyles && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenLayerStyle?.(layer.id);
                }}
                className="text-[8px] font-bold text-gray-400 hover:text-white px-0.5 bg-[#2d2d3a] border border-[#3c3c4a] rounded-sm cursor-pointer"
                title="Layer Styles FX"
              >
                fx
              </span>
            )}
            {layer.blendMode !== 'normal' && (
              <span className="text-[7px] px-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/15 rounded-xs uppercase font-bold font-mono">
                {layer.blendMode.slice(0, 3)}
              </span>
            )}
          </div>
        </div>
      );

      // Render children recursively inside a distinct Photoshop Group Folder Card Enclosure
      if (!filterText && isGroupFolder && layer.expanded !== false) {
        const childNodes = renderLayerTree(layer.id, depth + 1);
        if (childNodes.length > 0) {
          items.push(
            <div
              key={`group-container-${layer.id}`}
              className="my-0.5 ml-2.5 border-l-2 border-l-amber-500/60 bg-[#12121c]/90 rounded-r-md overflow-hidden shadow-inner transition-all border-y border-y-[#252535]"
            >
              {childNodes}
            </div>
          );
        } else {
          items.push(
            <div
              key={`group-empty-${layer.id}`}
              className="py-1 px-4 text-[9px] text-amber-500/60 italic font-mono ml-3 border-l-2 border-l-amber-500/40 bg-[#14141d]/50"
            >
              (Empty Folder - drag layers here)
            </div>
          );
        }
      }
    });

    return items;
  };

  return (
    <div ref={panelRef} className="flex flex-col bg-[#1e1e1f] h-full text-xs select-none w-full relative">
      
      {/* Blend Mode and Opacity Row */}
      <div className="grid grid-cols-2 gap-2 px-2.5 py-1.5 bg-[#1e1e1f] text-[10px] text-gray-300 border-b border-[#181819] items-center shrink-0">
        <select
          value={activeLayer?.blendMode || 'normal'}
          disabled={!activeLayer || activeLayer.locked}
          onChange={(e) => activeLayer && onUpdateLayer(activeLayer.id, { blendMode: e.target.value as BlendMode })}
          className="bg-[#2d2d2d] border border-[#3e3e3e] rounded px-1.5 py-0.5 text-white text-[10px] w-full cursor-pointer focus:outline-none disabled:opacity-40 font-medium"
        >
          {BLEND_MODES.map((m) => (
            <option key={m} value={m}>{m.toUpperCase()}</option>
          ))}
        </select>
        <div className="flex items-center justify-end gap-1.5 relative w-full">
          <span className="text-gray-400">Opacity:</span>
          <div className="flex items-center border border-[#3e3e3e] rounded bg-[#2d2d2d] px-1 py-0.5 text-white font-mono text-[10px] gap-0.5 w-16 justify-between cursor-pointer">
            <input
              type="number"
              min="0"
              max="100"
              value={activeLayer ? Math.round(activeLayer.opacity * 100) : 100}
              onChange={(e) => activeLayer && onUpdateLayer(activeLayer.id, { opacity: parseFloat(e.target.value) / 100 })}
              className="bg-transparent text-white font-mono text-[10px] w-8 border-none focus:outline-none text-right"
              onClick={(e) => e.stopPropagation()}
            />
            <span onClick={() => setShowOpacitySlider(!showOpacitySlider)} className="text-gray-500 hover:text-gray-300 font-sans">▾</span>
          </div>
          {showOpacitySlider && activeLayer && (
            <div className="absolute right-0 top-6 bg-[#252526] border border-[#3e3e3e] p-2 rounded shadow-2xl z-50 flex flex-col gap-1 w-32">
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round(activeLayer.opacity * 100)}
                onChange={(e) => onUpdateLayer(activeLayer.id, { opacity: parseFloat(e.target.value) / 100 })}
                className="w-full accent-indigo-500 h-1 cursor-pointer"
              />
            </div>
          )}
        </div>
      </div>

      {/* Lock row and Fill Opacity Row */}
      <div className="grid grid-cols-2 gap-2 px-2.5 py-1.5 bg-[#1e1e1f] border-b border-[#181819] text-[10px] text-gray-400 items-center shrink-0">
        <div className="flex items-center gap-1">
          <span className="text-gray-500">Lock:</span>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => activeLayer && onUpdateLayer(activeLayer.id, { lockTransparency: !activeLayer.lockTransparency })}
              className={`p-1 rounded hover:bg-[#2e2e2f] hover:text-white transition-colors cursor-pointer ${activeLayer?.lockTransparency ? 'text-indigo-400 bg-indigo-500/10' : 'text-gray-500'}`}
              title="Lock Transparent Pixels"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => activeLayer && onUpdateLayer(activeLayer.id, { lockPixels: !activeLayer.lockPixels })}
              className={`p-1 rounded hover:bg-[#2e2e2f] hover:text-white transition-colors cursor-pointer ${activeLayer?.lockPixels ? 'text-indigo-400 bg-indigo-500/10' : 'text-gray-500'}`}
              title="Lock Image Pixels"
            >
              <Paintbrush className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => activeLayer && onUpdateLayer(activeLayer.id, { lockPosition: !activeLayer.lockPosition })}
              className={`p-1 rounded hover:bg-[#2e2e2f] hover:text-white transition-colors cursor-pointer ${activeLayer?.lockPosition ? 'text-indigo-400 bg-indigo-500/10' : 'text-gray-500'}`}
              title="Lock Position"
            >
              <Move className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => activeLayer && onUpdateLayer(activeLayer.id, { locked: !activeLayer.locked })}
              className={`p-1 rounded hover:bg-[#2e2e2f] hover:text-white transition-colors cursor-pointer ${activeLayer?.locked ? 'text-amber-500 bg-amber-500/10' : 'text-gray-500'}`}
              title="Lock All"
            >
              <Lock className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end gap-1.5 relative w-full">
          <span className="text-gray-500">Fill:</span>
          <div className="flex items-center border border-[#3e3e3e] rounded bg-[#2d2d2d] px-1 py-0.5 text-white font-mono text-[10px] gap-0.5 w-16 justify-between cursor-pointer">
            <input
              type="number"
              min="0"
              max="100"
              value={activeLayer ? Math.round((activeLayer.fillOpacity !== undefined ? activeLayer.fillOpacity : 1.0) * 100) : 100}
              onChange={(e) => activeLayer && onUpdateLayer(activeLayer.id, { fillOpacity: parseFloat(e.target.value) / 100 })}
              className="bg-transparent text-white font-mono text-[10px] w-8 border-none focus:outline-none text-right"
              onClick={(e) => e.stopPropagation()}
            />
            <span onClick={() => setShowFillSlider(!showFillSlider)} className="text-gray-500 hover:text-gray-300 font-sans">▾</span>
          </div>
          {showFillSlider && activeLayer && (
            <div className="absolute right-0 top-6 bg-[#252526] border border-[#3e3e3e] p-2 rounded shadow-2xl z-50 flex flex-col gap-1 w-32">
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round((activeLayer.fillOpacity !== undefined ? activeLayer.fillOpacity : 1.0) * 100)}
                onChange={(e) => onUpdateLayer(activeLayer.id, { fillOpacity: parseFloat(e.target.value) / 100 })}
                className="w-full accent-indigo-500 h-1 cursor-pointer"
              />
            </div>
          )}
        </div>
      </div>

      {/* Layer Filter Query Bar */}
      <div className="flex flex-col gap-1 p-1.5 bg-[#1b1b1c] border-b border-[#181819] shrink-0">
        <div className="flex items-center gap-1.5 bg-[#252526] border border-[#2d2d2d] rounded px-1.5 py-0.5">
          <Search className="w-3 h-3 text-gray-500" />
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Search layers..."
            className="bg-transparent border-none text-[10px] text-white w-full placeholder-gray-600 focus:outline-none font-sans"
          />
          {filterText && (
            <button onClick={() => setFilterText('')} className="text-gray-500 hover:text-white text-[9px]">✕</button>
          )}
        </div>
        
        {/* Layer Type Filters */}
        <div className="flex items-center justify-between text-[9px] text-gray-400 pt-0.5 px-0.5 gap-0.5">
          {['all', 'image', 'text', 'shape', 'adjustment', 'smartobject'].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t as any)}
              className={`px-1.5 py-0.5 rounded cursor-pointer transition-all uppercase font-bold text-[8px] tracking-wide ${
                filterType === t
                  ? 'bg-indigo-600 text-white font-extrabold shadow-sm ring-1 ring-indigo-400/50'
                  : 'hover:text-white hover:bg-[#282832]'
              }`}
            >
              {t === 'smartobject' ? 'SMART' : t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Layers List Stack */}
      <div className="flex-1 overflow-y-auto p-1 bg-[#1a1a1a] space-y-0.5 scrollbar-thin">
        {renderLayerTree(undefined, 0)}
        {layers.length === 0 && (
          <div className="text-center py-8 text-gray-600 font-medium">No layers on canvas yet</div>
        )}
        {layers.length > 0 && filterType !== 'all' && renderLayerTree(undefined, 0).length === 0 && (
          <div className="text-center py-8 text-gray-500 text-[10px] font-medium">
            No layers found in category <span className="text-indigo-400 font-bold uppercase">{filterType === 'smartobject' ? 'Smart' : filterType}</span>
          </div>
        )}
      </div>

      {/* Right-click Context Menu Portal */}
      {contextMenu && (
        <div
          className="fixed bg-[#191920] border border-[#2c2c36] rounded-lg py-1.5 w-44 shadow-2xl z-50 text-[10px] text-gray-200 font-sans"
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => { onOpenLayerStyle?.(contextMenu.layer.id); setContextMenu(null); }}
            className="w-full text-left px-3 py-1 hover:bg-indigo-600 hover:text-white cursor-pointer font-medium"
          >
            Blending Options (fx)...
          </button>
          <button
            onClick={() => { onOpenDuplicateDialog?.(contextMenu.layer.id); setContextMenu(null); }}
            className="w-full text-left px-3 py-1 hover:bg-indigo-600 hover:text-white cursor-pointer font-medium"
          >
            Duplicate Layer...
          </button>
          <button
            onClick={() => { onDeleteLayer(contextMenu.layer.id); setContextMenu(null); }}
            className="w-full text-left px-3 py-1 hover:bg-red-600 hover:text-white cursor-pointer font-medium"
          >
            Delete Layer
          </button>
          <button
            onClick={() => { handleStartRename(contextMenu.layer); setContextMenu(null); }}
            className="w-full text-left px-3 py-1 hover:bg-indigo-600 hover:text-white cursor-pointer font-medium"
          >
            Rename Layer (F2)
          </button>
          
          {/* Group / Ungroup Options */}
          {contextMenu.layer.type === 'group' ? (
            <button
              onClick={() => {
                onUngroupLayers?.(contextMenu.layer.id);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1 hover:bg-amber-600 hover:text-white cursor-pointer font-bold text-amber-300"
            >
              Ungroup Folder Layers (Shift+Ctrl+G)
            </button>
          ) : (
            <button
              onClick={() => {
                onGroupSelected?.();
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1 hover:bg-indigo-600 hover:text-white cursor-pointer font-medium"
            >
              Group into Folder (Ctrl+G)
            </button>
          )}

          <hr className="border-[#24242c] my-1" />
          
          {/* Clipping Mask option */}
          <button
            onClick={() => {
              onUpdateLayer(contextMenu.layer.id, { isClippingMask: !contextMenu.layer.isClippingMask });
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1 hover:bg-indigo-600 hover:text-white cursor-pointer font-medium"
          >
            {contextMenu.layer.isClippingMask ? 'Release Clipping Mask' : 'Create Clipping Mask'}
          </button>

          {/* Mask Options */}
          <button
            onClick={() => {
              const mCanvas = document.createElement('canvas');
              mCanvas.width = contextMenu.layer.width;
              mCanvas.height = contextMenu.layer.height;
              const mCtx = mCanvas.getContext('2d');
              if (mCtx) {
                mCtx.fillStyle = '#ffffff';
                mCtx.fillRect(0, 0, mCanvas.width, mCanvas.height);
              }
              onUpdateLayer(contextMenu.layer.id, { hasMask: true, maskCanvas: mCanvas });
              setContextMenu(null);
            }}
            disabled={contextMenu.layer.hasMask}
            className="w-full text-left px-3 py-1 hover:bg-indigo-600 hover:text-white cursor-pointer font-medium disabled:opacity-30"
          >
            Add Layer Mask
          </button>

          {contextMenu.layer.hasMask && (
            <>
              <button
                onClick={() => {
                  onUpdateLayer(contextMenu.layer.id, { maskDisabled: !contextMenu.layer.maskDisabled });
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1 hover:bg-indigo-600 hover:text-white cursor-pointer font-medium"
              >
                {contextMenu.layer.maskDisabled ? 'Enable Layer Mask' : 'Disable Layer Mask'}
              </button>
              <button
                onClick={() => {
                  onUpdateLayer(contextMenu.layer.id, { hasMask: false, maskCanvas: undefined, maskBlob: undefined });
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1 hover:bg-red-600 hover:text-white cursor-pointer font-medium"
              >
                Delete Layer Mask
              </button>
            </>
          )}

          <hr className="border-[#24242c] my-1" />

          {/* Smart Object options */}
          {contextMenu.layer.type === 'smartobject' ? (
            <>
              <button
                onClick={() => {
                  onEditSmartObject?.(contextMenu.layer.id);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1 hover:bg-indigo-600 hover:text-white cursor-pointer font-medium"
              >
                Edit Contents
              </button>
              <button
                onClick={() => {
                  onUpdateLayer(contextMenu.layer.id, { type: 'image' });
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1 hover:bg-indigo-600 hover:text-white cursor-pointer font-medium"
              >
                Rasterize Smart Object
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                onUpdateLayer(contextMenu.layer.id, { type: 'smartobject' });
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1 hover:bg-indigo-600 hover:text-white cursor-pointer font-medium"
            >
              Convert to Smart Object
            </button>
          )}

          <hr className="border-[#24242c] my-1" />
          <button
            onClick={() => { onOpenLayerProperties?.(contextMenu.layer.id); setContextMenu(null); }}
            className="w-full text-left px-3 py-1 hover:bg-indigo-600 hover:text-white cursor-pointer font-medium"
          >
            Layer Properties...
          </button>
        </div>
      )}

      {/* Footer Toolbar */}
      <div className="p-1.5 bg-[#1e1e1f] border-t border-[#181819] flex items-center justify-between text-gray-500 text-[10px] shrink-0 relative">
        
        {/* 1. LINK / MERGE LAYERS TOOL */}
        <button
          onClick={(e) => {
            if (e.shiftKey || e.altKey) {
              onMergeSelected?.();
            } else if (selectedIds.length >= 2) {
              const linkGroupId = `link-${Date.now()}`;
              selectedIds.forEach((id) => {
                const l = layers.find((x) => x.id === id);
                onUpdateLayer(id, { linkedGroupId: l?.linkedGroupId ? undefined : linkGroupId });
              });
            } else if (onMergeSelected) {
              onMergeSelected();
            }
          }}
          disabled={selectedIds.length < 1}
          title="Link Layers (Shift+Click to Merge Selected)"
          className={`p-1 hover:text-white transition-colors cursor-pointer disabled:opacity-20 ${
            selectedIds.some((id) => layers.find((x) => x.id === id)?.linkedGroupId) ? 'text-indigo-400 font-bold' : ''
          }`}
        >
          <Link className="w-3.5 h-3.5" />
        </button>

        {/* 2. LAYER STYLES (FX) TOOL */}
        <button
          onClick={() => activeLayerId && onOpenLayerStyle?.(activeLayerId)}
          disabled={!activeLayerId}
          title="Add Layer Style (fx)"
          className="p-1 hover:text-white transition-colors cursor-pointer font-bold text-[10px] disabled:opacity-30"
        >
          fx
        </button>

        {/* 3. ADD LAYER MASK TOOL */}
        <button
          onClick={() => {
            if (activeLayerId) {
              const activeL = layers.find((l) => l.id === activeLayerId);
              if (activeL && !activeL.hasMask) {
                const mCanvas = document.createElement('canvas');
                mCanvas.width = activeL.width || 500;
                mCanvas.height = activeL.height || 500;
                const mCtx = mCanvas.getContext('2d');
                if (mCtx) {
                  mCtx.fillStyle = '#ffffff';
                  mCtx.fillRect(0, 0, mCanvas.width, mCanvas.height);
                }
                onUpdateLayer(activeLayerId, { hasMask: true, maskCanvas: mCanvas });
              } else if (activeL?.hasMask) {
                onUpdateLayer(activeLayerId, { maskDisabled: !activeL.maskDisabled });
              }
            }
          }}
          disabled={!activeLayerId}
          title={activeLayer?.hasMask ? "Toggle Layer Mask Enable/Disable" : "Add Layer Mask"}
          className={`p-1 hover:text-white transition-colors cursor-pointer disabled:opacity-30 ${
            activeLayer?.hasMask ? 'text-indigo-400 font-bold' : ''
          }`}
        >
          <Circle className="w-3.5 h-3.5" />
        </button>

        {/* 4. NEW ADJUSTMENT LAYER / FILL LAYER POPOVER MENU TOOL */}
        <div className="relative">
          <button
            onClick={() => setShowAdjustmentPopover((v) => !v)}
            title="Create New Fill or Adjustment Layer"
            className={`p-1 hover:text-white transition-colors cursor-pointer ${
              showAdjustmentPopover ? 'text-indigo-400 bg-indigo-500/20 rounded' : ''
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
          </button>

          {/* ADJUSTMENT & FILL LAYER POPUP MENU */}
          {showAdjustmentPopover && (
            <div className="absolute bottom-7 left-1/2 -translate-x-1/2 bg-[#14141c] border border-[#2b2b3d] rounded-lg shadow-2xl py-1.5 w-52 z-50 text-[10px] text-gray-200 animate-in fade-in slide-in-from-bottom-2 duration-100 font-sans max-h-80 overflow-y-auto scrollbar-thin">
              {ADJUSTMENT_MENU_GROUPS.map((grp, gIdx) => (
                <div key={grp.title}>
                  {gIdx > 0 && <div className="h-[1px] bg-[#222232] my-1" />}
                  <div className="px-3 py-0.5 text-[8.5px] font-mono text-indigo-400 font-bold uppercase tracking-wider">
                    {grp.title}
                  </div>
                  {grp.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setShowAdjustmentPopover(false);
                        if (item.id === 'solid-color') {
                          onAddLayer('shape', { name: 'Color Fill 1', fillColor: '#3b82f6' });
                        } else if (item.id === 'gradient-fill') {
                          onAddLayer('shape', { name: 'Gradient Fill 1', fillColor: '#0575e6', gradientColors: ['#0575e6', '#00f260'] });
                        } else {
                          onAddLayer('adjustment', {
                            adjustmentType: item.id,
                            name: item.name.replace('...', ''),
                          });
                          onOpenAdjustmentDialog?.(item.id);
                        }
                      }}
                      className="w-full text-left px-3 py-1 hover:bg-indigo-600 hover:text-white cursor-pointer font-medium flex items-center justify-between"
                    >
                      <span>{item.name}</span>
                      {item.isFill && <span className="text-[8px] text-amber-400 font-mono">FILL</span>}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 5. CREATE NEW GROUP FOLDER TOOL */}
        <button
          onClick={() => {
            if (onGroupSelected) {
              onGroupSelected();
            } else {
              onAddLayer('group', { name: 'Group 1' });
            }
          }}
          title="Create New Group Folder (Ctrl+G)"
          className="p-1 hover:text-white transition-colors cursor-pointer"
        >
          <Folder className="w-3.5 h-3.5 text-amber-500" />
        </button>

        {/* 6. CREATE NEW TRANSPARENT LAYER TOOL */}
        <button
          onClick={(e) => {
            if (e.altKey || e.shiftKey) {
              onOpenNewLayerDialog?.();
            } else {
              onAddLayer('image', { name: `Layer ${layers.length + 1}` });
            }
          }}
          title="Create New Layer (Alt+Click for Options)"
          className="p-1 hover:text-white transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>

        {/* 7. DELETE LAYER TOOL */}
        <button
          onClick={() => {
            if (selectedIds.length > 0) {
              selectedIds.forEach((id) => onDeleteLayer(id));
            } else if (activeLayerId) {
              onDeleteLayer(activeLayerId);
            }
          }}
          disabled={selectedIds.length === 0 && !activeLayerId}
          title="Delete Selected Layer(s)"
          className="p-1 hover:text-red-400 transition-colors cursor-pointer disabled:opacity-30"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
