/**
 * WindowManager.tsx
 * Professional dockable panel management system.
 * Supports: dock left/right, floating panels, collapse/expand, resize.
 */
import React, {
  useState, useRef, useCallback, useEffect, ReactNode,
} from 'react';
import {
  X, Minus, Maximize2, ChevronDown, ChevronRight, GripVertical,
} from 'lucide-react';
import { PanelId, PanelState, WorkspaceLayout } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PanelDef {
  id: PanelId;
  title: string;
  icon: ReactNode;
  content: ReactNode;
  minHeight?: number;
}

interface WindowManagerProps {
  panels: PanelDef[];
  layout: WorkspaceLayout;
  onLayoutChange: (layout: WorkspaceLayout) => void;
  children: ReactNode; // canvas area
}

// ─── Floating Panel Window ────────────────────────────────────────────────────

interface FloatingPanelProps {
  key?: React.Key;
  id: PanelId;
  title: string;
  icon: ReactNode;
  content: ReactNode;
  x: number;
  y: number;
  w: number;
  h: number;
  minimized: boolean;
  onMove: (x: number, y: number) => void;
  onResize: (w: number, h: number) => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
  onDock: () => void;
}

function FloatingPanel({
  id, title, icon, content, x, y, w, h, minimized,
  onMove, onResize, onMinimize, onMaximize, onClose, onDock,
}: FloatingPanelProps) {
  const dragRef = useRef<{ startX: number; startY: number; panelX: number; panelY: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; startW: number; startH: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleTitleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, panelX: x, panelY: y };

    const onMouseMove = (me: MouseEvent) => {
      if (!dragRef.current) return;
      onMove(
        Math.max(0, dragRef.current.panelX + (me.clientX - dragRef.current.startX)),
        Math.max(0, dragRef.current.panelY + (me.clientY - dragRef.current.startY)),
      );
    };
    const onMouseUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    resizeRef.current = { startX: e.clientX, startY: e.clientY, startW: w, startH: h };

    const onMouseMove = (me: MouseEvent) => {
      if (!resizeRef.current) return;
      onResize(
        Math.max(200, resizeRef.current.startW + (me.clientX - resizeRef.current.startX)),
        Math.max(100, resizeRef.current.startH + (me.clientY - resizeRef.current.startY)),
      );
    };
    const onMouseUp = () => {
      resizeRef.current = null;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div
      ref={panelRef}
      className="fixed z-[100] bg-[#13131a] border border-[#2a2a38] rounded-lg shadow-2xl overflow-hidden flex flex-col"
      style={{ left: x, top: y, width: w, height: minimized ? 'auto' : h }}
    >
      {/* Title bar */}
      <div
        onMouseDown={handleTitleMouseDown}
        className="flex items-center gap-2 px-2 py-1.5 bg-[#1a1a26] border-b border-[#2a2a38] cursor-move select-none shrink-0"
      >
        <span className="text-gray-400 text-[10px] shrink-0">{icon}</span>
        <span className="text-[10px] text-gray-300 font-semibold flex-1 truncate">{title}</span>
        <div className="flex items-center gap-0.5 ml-auto">
          <button
            onClick={onDock}
            title="Dock to panel"
            className="p-0.5 rounded text-gray-500 hover:text-indigo-400 hover:bg-[#252535] transition-colors"
          >
            <GripVertical className="w-3 h-3" />
          </button>
          <button
            onClick={onMinimize}
            title="Minimize"
            className="p-0.5 rounded text-gray-500 hover:text-white hover:bg-[#252535] transition-colors"
          >
            <Minus className="w-3 h-3" />
          </button>
          <button
            onClick={onMaximize}
            title="Maximize"
            className="p-0.5 rounded text-gray-500 hover:text-white hover:bg-[#252535] transition-colors"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
          <button
            onClick={onClose}
            title="Close"
            className="p-0.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-950/30 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Content */}
      {!minimized && (
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
          {content}
        </div>
      )}

      {/* Resize handle */}
      {!minimized && (
        <div
          onMouseDown={handleResizeMouseDown}
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-40 hover:opacity-100 transition-opacity"
          style={{ background: 'linear-gradient(135deg, transparent 50%, #6366f1 50%)' }}
        />
      )}
    </div>
  );
}

// ─── Docked Panel Item ────────────────────────────────────────────────────────

interface DockedPanelItemProps {
  key?: React.Key;
  panelDef: PanelDef;
  panelState: PanelState;
  onToggleCollapse: () => void;
  onFloat: () => void;
  onHide: () => void;
}

function DockedPanelItem({ panelDef, panelState, onToggleCollapse, onFloat, onHide }: DockedPanelItemProps) {
  return (
    <div className="border-b border-[#1e1e2c] last:border-b-0">
      {/* Panel header */}
      <div
        className="flex items-center gap-1.5 px-2 py-1.5 bg-[#16161f] hover:bg-[#1c1c28] cursor-pointer select-none group transition-colors"
        onClick={onToggleCollapse}
      >
        {panelState.collapsed
          ? <ChevronRight className="w-3 h-3 text-gray-500 shrink-0" />
          : <ChevronDown className="w-3 h-3 text-gray-500 shrink-0" />
        }
        <span className="text-gray-500 text-[9px] shrink-0">{panelDef.icon}</span>
        <span className="text-[10px] text-gray-200 font-semibold uppercase tracking-wider flex-1 truncate">
          {panelDef.title}
        </span>

        {/* Actions (shown on hover) */}
        <div className="hidden group-hover:flex items-center gap-0.5 ml-auto">
          <button
            onClick={(e) => { e.stopPropagation(); onFloat(); }}
            title="Float panel"
            className="p-0.5 rounded text-gray-600 hover:text-indigo-400 hover:bg-[#252535] transition-colors"
          >
            <Maximize2 className="w-2.5 h-2.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onHide(); }}
            title="Hide panel"
            className="p-0.5 rounded text-gray-600 hover:text-red-400 hover:bg-red-950/20 transition-colors"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>

      {/* Panel content */}
      {!panelState.collapsed && (
        <div className="overflow-y-auto overflow-x-hidden" style={{ maxHeight: panelState.height ?? 300 }}>
          {panelDef.content}
        </div>
      )}
    </div>
  );
}

// ─── Dock Column ─────────────────────────────────────────────────────────────

interface DockColumnProps {
  side: 'left' | 'right';
  width: number;
  onWidthChange: (w: number) => void;
  panelDefs: PanelDef[];
  panelStates: PanelState[];
  onPanelStateChange: (id: PanelId, updates: Partial<PanelState>) => void;
}

function DockColumn({ side, width, onWidthChange, panelDefs, panelStates, onPanelStateChange }: DockColumnProps) {
  const dragRef = useRef<{ startX: number; startW: number } | null>(null);

  const handleResizeDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startW: width };
    const onMove = (me: MouseEvent) => {
      if (!dragRef.current) return;
      const delta = side === 'right'
        ? dragRef.current.startX - me.clientX
        : me.clientX - dragRef.current.startX;
      onWidthChange(Math.max(180, Math.min(480, dragRef.current.startW + delta)));
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const visible = panelStates
    .filter((ps) => ps.visible && ps.dock === side)
    .sort((a, b) => a.order - b.order);

  if (visible.length === 0) return null;

  return (
    <div
      className="relative flex flex-col bg-[#13131a] border-[#1e1e2c] shrink-0 overflow-hidden"
      style={{
        width,
        borderLeft: side === 'right' ? '1px solid #1e1e2c' : undefined,
        borderRight: side === 'left' ? '1px solid #1e1e2c' : undefined,
      }}
    >
      {/* Resize handle */}
      <div
        onMouseDown={handleResizeDrag}
        className={`absolute top-0 bottom-0 w-1 cursor-col-resize z-10 hover:bg-indigo-500/30 transition-colors ${side === 'right' ? 'left-0' : 'right-0'}`}
      />

      {/* Panels */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {visible.map((ps) => {
          const def = panelDefs.find((d) => d.id === ps.id);
          if (!def) return null;
          return (
            <DockedPanelItem
              key={ps.id}
              panelDef={def}
              panelState={ps}
              onToggleCollapse={() => onPanelStateChange(ps.id, { collapsed: !ps.collapsed })}
              onFloat={() => onPanelStateChange(ps.id, {
                dock: 'float', floatX: 100, floatY: 100, floatW: 280, floatH: 400,
              })}
              onHide={() => onPanelStateChange(ps.id, { visible: false })}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── Main WindowManager ───────────────────────────────────────────────────────

export default function WindowManager({ panels, layout, onLayoutChange, children }: WindowManagerProps) {
  // Derive panel states map from layout
  const getPanelState = useCallback(
    (id: PanelId): PanelState =>
      layout.panels.find((p) => p.id === id) ?? {
        id, visible: false, dock: 'right', order: 99, collapsed: false,
      },
    [layout.panels]
  );

  const updatePanelState = useCallback(
    (id: PanelId, updates: Partial<PanelState>) => {
      onLayoutChange({
        ...layout,
        panels: layout.panels.map((p) =>
          p.id === id ? { ...p, ...updates } : p
        ),
      });
    },
    [layout, onLayoutChange]
  );

  const floatingPanels = layout.panels.filter(
    (p) => p.visible && p.dock === 'float'
  );

  return (
    <div className="flex flex-1 overflow-hidden relative">
      {/* Left dock */}
      <DockColumn
        side="left"
        width={layout.leftDockWidth}
        onWidthChange={(w) => onLayoutChange({ ...layout, leftDockWidth: w })}
        panelDefs={panels}
        panelStates={layout.panels}
        onPanelStateChange={updatePanelState}
      />

      {/* Canvas area */}
      <div className="flex-1 overflow-hidden relative">
        {children}
      </div>

      {/* Right dock */}
      <DockColumn
        side="right"
        width={layout.rightDockWidth}
        onWidthChange={(w) => onLayoutChange({ ...layout, rightDockWidth: w })}
        panelDefs={panels}
        panelStates={layout.panels}
        onPanelStateChange={updatePanelState}
      />

      {/* Floating panels */}
      {floatingPanels.map((fp) => {
        const def = panels.find((p) => p.id === fp.id);
        if (!def) return null;
        return (
          <FloatingPanel
            key={fp.id}
            id={fp.id}
            title={def.title}
            icon={def.icon}
            content={def.content}
            x={fp.floatX ?? 200}
            y={fp.floatY ?? 100}
            w={fp.floatW ?? 280}
            h={fp.floatH ?? 400}
            minimized={fp.minimized ?? false}
            onMove={(x, y) => updatePanelState(fp.id, { floatX: x, floatY: y })}
            onResize={(w, h) => updatePanelState(fp.id, { floatW: w, floatH: h })}
            onMinimize={() => updatePanelState(fp.id, { minimized: !fp.minimized })}
            onMaximize={() => updatePanelState(fp.id, { floatW: 500, floatH: 600 })}
            onClose={() => updatePanelState(fp.id, { visible: false, dock: 'right' })}
            onDock={() => updatePanelState(fp.id, { dock: 'right', visible: true })}
          />
        );
      })}
    </div>
  );
}
