/**
 * WorkspaceManager.ts
 * Manages workspace presets, panel layouts, save/load/rename/delete.
 * Persists to localStorage under key 'phototor_workspaces_v2'.
 */
import { PanelId, PanelState, WorkspaceLayout, DockSide } from '../types';

const p = (
  id: PanelId,
  visible: boolean,
  dock: DockSide,
  order: number,
  extra: Partial<PanelState> = {}
): PanelState => ({
  id, visible, dock, order, collapsed: false, ...extra,
});

export const BUILTIN_WORKSPACES: WorkspaceLayout[] = [
  {
    id: 'essentials',
    name: 'Essentials',
    builtIn: true,
    leftDockWidth: 240,
    rightDockWidth: 260,
    panels: [
      p('layers',true,'right',0),p('channels',false,'right',1),p('paths',false,'right',2),
      p('history',true,'right',3),p('properties',true,'right',4),p('adjustments',false,'right',5),
      p('color',true,'right',6),p('swatches',true,'right',7),p('navigator',true,'right',8),
      p('info',false,'right',9),p('histogram',false,'right',10),p('brushes',false,'right',11),
      p('brush-settings',false,'right',12),p('character',false,'right',13),
      p('paragraph',false,'right',14),p('glyphs',false,'right',15),
      p('gradients',false,'right',16),p('patterns',false,'right',17),
      p('assets',false,'right',18),
      p('tool-presets',false,'right',19),p('actions',false,'right',20),
    ],
  },
  {
    id: 'photography',
    name: 'Photography',
    builtIn: true,
    leftDockWidth: 240,
    rightDockWidth: 280,
    panels: [
      p('layers',true,'right',0),p('channels',true,'right',1),p('history',true,'right',2),
      p('properties',true,'right',3),p('adjustments',true,'right',4),
      p('histogram',true,'right',5),p('info',true,'right',6),p('navigator',true,'right',7),
      p('color',false,'right',8),p('swatches',false,'right',9),p('gradients',false,'right',10),
      p('patterns',false,'right',11),p('brushes',false,'right',12),p('brush-settings',false,'right',13),
      p('character',false,'right',14),p('paragraph',false,'right',15),p('glyphs',false,'right',16),
      p('paths',false,'right',17),p('assets',false,'right',18),
      p('tool-presets',false,'right',19),p('actions',false,'right',20),
    ],
  },
  {
    id: 'graphic-design',
    name: 'Graphic Design',
    builtIn: true,
    leftDockWidth: 240,
    rightDockWidth: 280,
    panels: [
      p('layers',true,'right',0),p('character',true,'right',1),p('paragraph',true,'right',2),
      p('color',true,'right',3),p('swatches',true,'right',4),p('gradients',true,'right',5),
      p('patterns',true,'right',6),p('properties',true,'right',7),p('paths',true,'right',8),
      p('navigator',false,'right',9),p('history',true,'right',10),p('adjustments',false,'right',11),
      p('histogram',false,'right',12),p('info',false,'right',13),p('brushes',false,'right',14),
      p('brush-settings',false,'right',15),p('glyphs',true,'right',16),
      p('assets',true,'right',17),p('tool-presets',false,'right',18),
      p('actions',true,'right',19),p('channels',false,'right',20),
    ],
  },
  {
    id: 'painting',
    name: 'Painting',
    builtIn: true,
    leftDockWidth: 240,
    rightDockWidth: 280,
    panels: [
      p('brushes',true,'right',0),p('brush-settings',true,'right',1),p('color',true,'right',2),
      p('swatches',true,'right',3),p('layers',true,'right',4),p('history',true,'right',5),
      p('gradients',false,'right',6),p('patterns',true,'right',7),p('tool-presets',true,'right',8),
      p('properties',false,'right',9),p('adjustments',false,'right',10),p('histogram',false,'right',11),
      p('navigator',false,'right',12),p('info',false,'right',13),p('character',false,'right',14),
      p('paragraph',false,'right',15),p('glyphs',false,'right',16),p('paths',false,'right',17),
      p('assets',false,'right',18),
      p('actions',false,'right',19),p('channels',false,'right',20),
    ],
  },
  {
    id: 'web-design',
    name: 'Web Design',
    builtIn: true,
    leftDockWidth: 240,
    rightDockWidth: 280,
    panels: [
      p('layers',true,'right',0),p('properties',true,'right',1),p('character',true,'right',2),
      p('paragraph',true,'right',3),p('color',true,'right',4),p('swatches',true,'right',5),
      p('gradients',true,'right',6),p('patterns',false,'right',7),p('paths',true,'right',8),
      p('navigator',true,'right',9),p('assets',true,'right',10),p('history',false,'right',11),
      p('adjustments',false,'right',12),p('histogram',false,'right',13),p('info',false,'right',14),
      p('brushes',false,'right',15),p('brush-settings',false,'right',16),p('glyphs',true,'right',17),
      p('tool-presets',false,'right',18),
      p('actions',false,'right',19),p('channels',false,'right',20),
    ],
  },
  {
    id: 'ui-ux',
    name: 'UI/UX',
    builtIn: true,
    leftDockWidth: 240,
    rightDockWidth: 300,
    panels: [
      p('layers',true,'right',0),p('properties',true,'right',1),p('character',true,'right',2),
      p('color',true,'right',3),p('swatches',true,'right',4),p('gradients',false,'right',5),
      p('patterns',false,'right',6),p('assets',true,'right',7),p('paths',true,'right',8),
      p('glyphs',false,'right',9),p('navigator',true,'right',10),p('history',false,'right',11),
      p('adjustments',false,'right',12),p('histogram',false,'right',13),p('info',false,'right',14),
      p('brushes',false,'right',15),p('brush-settings',false,'right',16),p('paragraph',true,'right',17),
      p('tool-presets',false,'right',18),
      p('actions',false,'right',19),p('channels',false,'right',20),
    ],
  },
  {
    id: 'minimal',
    name: 'Minimal',
    builtIn: true,
    leftDockWidth: 240,
    rightDockWidth: 240,
    panels: [
      p('layers',true,'right',0),p('history',false,'right',1),p('properties',false,'right',2),
      p('adjustments',false,'right',3),p('color',false,'right',4),p('swatches',false,'right',5),
      p('navigator',false,'right',6),p('histogram',false,'right',7),p('info',false,'right',8),
      p('brushes',false,'right',9),p('brush-settings',false,'right',10),p('character',false,'right',11),
      p('paragraph',false,'right',12),p('glyphs',false,'right',13),p('gradients',false,'right',14),
      p('patterns',false,'right',15),p('paths',false,'right',16),
      p('assets',false,'right',17),p('tool-presets',false,'right',18),
      p('actions',false,'right',19),p('channels',false,'right',20),
    ],
  },
];

const STORAGE_KEY = 'phototor_workspaces_v2';
const ACTIVE_WS_KEY = 'phototor_active_workspace_v2';

export function loadCustomWorkspaces(): WorkspaceLayout[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveCustomWorkspaces(workspaces: WorkspaceLayout[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(workspaces)); } catch { /* ignore */ }
}

export function loadActiveWorkspaceId(): string {
  return localStorage.getItem(ACTIVE_WS_KEY) ?? 'essentials';
}

export function saveActiveWorkspaceId(id: string): void {
  try { localStorage.setItem(ACTIVE_WS_KEY, id); } catch { /* ignore */ }
}

export function getAllWorkspaces(custom: WorkspaceLayout[]): WorkspaceLayout[] {
  return [...BUILTIN_WORKSPACES, ...custom];
}

export function getWorkspaceById(id: string, custom: WorkspaceLayout[]): WorkspaceLayout | undefined {
  return getAllWorkspaces(custom).find((w) => w.id === id);
}
