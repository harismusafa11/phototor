/**
 * WindowMenu.tsx
 * Simplified Window menu dropdown displaying panels directly.
 */
import React, { useRef } from 'react';
import {
  Check, Layers, Hash, GitBranch, Clock, Star, Settings, Sliders, Palette,
  Grid, BarChart2, BookOpen, Brush, Type, AlignCenter, Compass, Info, Package
} from 'lucide-react';
import { PanelId, WorkspaceLayout } from '../types';

// Icon map for panels
export const PANEL_ICONS: Record<PanelId, React.ReactNode> = {
  layers:         <Layers className="w-3 h-3" />,
  channels:       <Hash className="w-3 h-3" />,
  paths:          <GitBranch className="w-3 h-3" />,
  history:        <Clock className="w-3 h-3" />,
  actions:        <Star className="w-3 h-3" />,
  properties:     <Settings className="w-3 h-3" />,
  adjustments:    <Sliders className="w-3 h-3" />,
  color:          <Palette className="w-3 h-3" />,
  swatches:       <Grid className="w-3 h-3" />,
  gradients:      <BarChart2 className="w-3 h-3" />,
  patterns:       <BookOpen className="w-3 h-3" />,
  brushes:        <Brush className="w-3 h-3" />,
  'brush-settings': <Brush className="w-3 h-3" />,
  character:      <Type className="w-3 h-3" />,
  paragraph:      <AlignCenter className="w-3 h-3" />,
  glyphs:         <Type className="w-3 h-3" />,
  navigator:      <Compass className="w-3 h-3" />,
  histogram:      <BarChart2 className="w-3 h-3" />,
  info:           <Info className="w-3 h-3" />,
  assets:         <Package className="w-3 h-3" />,
  'tool-presets': <Star className="w-3 h-3" />,
};

export const PANEL_TITLES: Record<PanelId, string> = {
  layers: 'Layers', channels: 'Channels', paths: 'Paths',
  history: 'History', actions: 'Actions',
  properties: 'Properties', adjustments: 'Adjustments',
  color: 'Color', swatches: 'Swatches', gradients: 'Gradients', patterns: 'Patterns',
  brushes: 'Brushes', 'brush-settings': 'Brush Settings',
  character: 'Character', paragraph: 'Paragraph', glyphs: 'Glyphs',
  navigator: 'Navigator', histogram: 'Histogram', info: 'Info',
  assets: 'Asset Library',
  'tool-presets': 'Tool Presets',
};

// Panel groups for menu organization
const PANEL_GROUPS = [
  { label: 'Layers & Masks', ids: ['layers','channels','paths'] as PanelId[] },
  { label: 'Image', ids: ['histogram','info','navigator'] as PanelId[] },
  { label: 'Adjustment', ids: ['properties','adjustments','history','actions'] as PanelId[] },
  { label: 'Color & Paint', ids: ['color','swatches','gradients','patterns','brushes','brush-settings'] as PanelId[] },
  { label: 'Typography', ids: ['character','paragraph','glyphs'] as PanelId[] },
  { label: 'Extras', ids: ['assets','tool-presets'] as PanelId[] },
];

interface WindowMenuProps {
  isOpen: boolean;
  layout: WorkspaceLayout;
  activeWorkspaceId?: string;
  customWorkspaces?: WorkspaceLayout[];
  onClose: () => void;
  onLayoutChange: (layout: WorkspaceLayout) => void;
  onWorkspaceSelect?: (id: string) => void;
  onCustomWorkspacesChange?: (workspaces: WorkspaceLayout[]) => void;
  onResetPanelPositions?: () => void;
  onArrange?: (mode: 'cascade' | 'tile-h' | 'tile-v' | 'float' | 'merge') => void;
}

export default function WindowMenu({
  isOpen, layout, onClose, onLayoutChange,
}: WindowMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  const togglePanel = (id: PanelId) => {
    const ps = layout.panels.find((p) => p.id === id);
    if (ps) {
      onLayoutChange({
        ...layout,
        panels: layout.panels.map((p) =>
          p.id === id ? { ...p, visible: !p.visible, dock: p.dock === 'float' ? 'right' : p.dock } : p
        ),
      });
    }
  };

  const isPanelVisible = (id: PanelId) => layout.panels.find((p) => p.id === id)?.visible ?? false;

  if (!isOpen) return null;

  return (
    <div
      className="absolute mt-1 z-50 bg-[#121216] border border-[#2b2b36] rounded-lg shadow-2xl py-1 text-left select-none overflow-y-auto"
      style={{ minWidth: 220, maxHeight: 500 }}
      ref={menuRef}
    >
      {PANEL_GROUPS.map((group, gi) => (
        <React.Fragment key={group.label}>
          {gi > 0 && <div className="h-px bg-[#2b2b36] my-1" />}
          <div className="px-3 py-0.5 text-[9px] text-gray-600 uppercase tracking-wider font-bold">
            {group.label}
          </div>
          {group.ids.map((id) => (
            <button
              key={id}
              onClick={() => togglePanel(id)}
              className={`w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#1c1c28] hover:text-white text-[11px] ${isPanelVisible(id) ? 'text-indigo-400' : 'text-gray-400'}`}
            >
              <div className="flex items-center gap-2">
                {PANEL_ICONS[id]}
                {PANEL_TITLES[id]}
              </div>
              {isPanelVisible(id) && <Check className="w-3 h-3 text-indigo-400" />}
            </button>
          ))}
        </React.Fragment>
      ))}
    </div>
  );
}
