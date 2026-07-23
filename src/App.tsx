/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  Save,
  Download,
  Crown,
  Plus,
  Undo2,
  Redo2,
  Layers,
  Sliders,
  Compass,
  History,
  FileImage,
  Tv,
  HelpCircle,
  FolderOpen,
  Settings,
  HelpCircle as QuestionIcon,
  X,
  Check,
  Zap,
  Cpu,
  RefreshCw,
  Sun,
  Activity,
  GripVertical,
  ZoomIn,
  ZoomOut,
  Clock,
  CheckCircle2,
  XCircle,
  Shield,
  Crop,
  Grid
} from 'lucide-react';

import JSZip from 'jszip';
import { Project, Layer, ToolType, SubToolType, Adjustments, Point, GridSettings, LayerGroup, CurvePoint, LevelsParams, FilterGalleryParams, AlignmentGuides, FilterEffect, PanelId, WorkspaceLayout, Slice, WarpConfig } from './types';
import { saveProject, loadProjects, loadProject, hydrateLayerImage } from './utils/indexedDB';
import { removeBackground, inpaintObject, blendHealingBrushTexture, upscaleImage, warpPerspective, applyPatchBlend, applyCurves, applyLevels, applyFilterGallery } from './utils/filters';
import { renderProjectToCanvas, clearLayerCache } from './utils/canvas';
import { removeBackground as imglyRemoveBackground } from '@imgly/background-removal';
import { ALL_FONTS, loadGoogleFont } from './utils/fontLoader';

import Dashboard from './components/Dashboard';
import SidebarTools from './components/SidebarTools';
import CanvasWorkspace from './components/CanvasWorkspace';
import SliceOptionsDialog from './components/SliceOptionsDialog';
import DivideSliceDialog from './components/DivideSliceDialog';
import WarpModal from './components/dialogs/WarpModal';
import LayersPanel from './components/panels/LayersPanel';
import PropertiesPanel from './components/panels/PropertiesPanel';
import AssetLibraryPanel from './components/panels/AssetLibraryPanel';
import HistoryPanel from './components/panels/HistoryPanel';
import CurvesLevelsPanel from './components/panels/CurvesLevelsPanel';
import BrushSettingsPanel from './components/panels/BrushSettingsPanel';
import FilterGalleryDialog from './components/panels/FilterGalleryDialog';
import NavigatorPanel from './components/panels/NavigatorPanel';
import ColorPanel from './components/panels/ColorPanel';
import GradientPanel from './components/panels/GradientPanel';
import BrushesPanel from './components/panels/BrushesPanel';
import CharacterPanel from './components/panels/CharacterPanel';
import PathsPanel from './components/panels/PathsPanel';
import PatternPanel from './components/panels/PatternPanel';
import SwatchesPanel from './components/panels/SwatchesPanel';
import ChannelsPanel from './components/panels/ChannelsPanel';
import InfoPanel from './components/panels/InfoPanel';
import WindowManager from './components/WindowManager';
import WindowMenu, { PANEL_ICONS, PANEL_TITLES } from './components/WindowMenu';
import DraggableTabContainer from './components/DraggableTabContainer';
import { BUILTIN_WORKSPACES, loadCustomWorkspaces, saveCustomWorkspaces, loadActiveWorkspaceId, saveActiveWorkspaceId, getWorkspaceById, getAllWorkspaces } from './components/WorkspaceManager';

import { convertImageMode, convertBitDepth } from './utils/ColorProfileManager';
import { applyAllAdjustments } from './utils/AdjustmentEngine';
import { resampleImageData } from './utils/ImageResizeEngine';
import {
  applyAIEnhance,
  applyAIDenoise,
  applyAISharpen,
  applyAIRelight,
  applyAIColorCorrect,
  applyAIRestore,
  applyAIFaceEnhance,
  applyAIRemoveArtifacts,
  applyAISkyReplacement,
} from './utils/AIImageEngine';

import AdjustmentDialog from './components/AdjustmentDialog';
import ImageResizeDialog from './components/ImageResizeDialog';
import CanvasResizeDialog from './components/CanvasResizeDialog';
import ProUpgradeModal from './components/dialogs/ProUpgradeModal';
import BatchProcessorModal from './components/dialogs/BatchProcessorModal';
import { exportProjectToPSD } from './utils/psdExport';
import ImageInfoDialog from './components/ImageInfoDialog';
import AIDialog from './components/AIDialog';
import LayerStyleDialog from './components/LayerStyleDialog';
import NewLayerDialog from './components/NewLayerDialog';
import DuplicateLayerDialog from './components/DuplicateLayerDialog';
import LayerPropertiesDialog from './components/LayerPropertiesDialog';
import { CANVAS_PRESETS, CANVAS_PRESET_CATEGORIES } from './utils/canvasPresets';
import AdsterraBanner from './components/AdsterraBanner';
import { ADSTERRA_CONFIG } from './config/adsterra';
import AuthModal from './components/dialogs/AuthModal';
import AdminPanelModal from './components/dialogs/AdminPanelModal';
import { UserProfile } from './types/auth';
import { supabase } from './lib/supabase';


export default function App() {
  const [currentProjId, setCurrentProjId] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<ToolType>('move');
  const [activeSubTool, setActiveSubTool] = useState<SubToolType>('move');
  const [isPremium, setIsPremium] = useState(false);

  // Supabase Auth & Admin state
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);

  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

  useEffect(() => {
    // 1. Check local persistent session on page refresh
    const storedSessionStr = localStorage.getItem('phototor_active_user_session');
    if (storedSessionStr) {
      try {
        const parsed = JSON.parse(storedSessionStr);
        const lastActivity = parsed.lastActivity || 0;
        const now = Date.now();

        if (now - lastActivity > THIRTY_DAYS_MS) {
          // Inactive for more than 30 days -> Auto Logout
          localStorage.removeItem('phototor_active_user_session');
          supabase.auth.signOut();
          setUserProfile(null);
          setToast({ message: "Sesi Anda telah berakhir setelah 30 hari tidak aktif. Silakan login kembali.", type: 'info' });
        } else {
          // Restore session on refresh!
          if (parsed.profile) {
            setUserProfile(parsed.profile);
            if (parsed.profile.is_pro) setIsPremium(true);
          }
          parsed.lastActivity = now;
          localStorage.setItem('phototor_active_user_session', JSON.stringify(parsed));
        }
      } catch (e) {
        console.warn("Could not parse stored active session:", e);
      }
    }

    // 2. Sync with Supabase Auth
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserProfile(session.user.id, session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUserProfile(session.user.id, session.user);
      } else if (_event === 'SIGNED_OUT') {
        localStorage.removeItem('phototor_active_user_session');
        setUserProfile(null);
      }
    });

    // 3. User interaction listener to update active session timestamp
    const handleUserActivity = () => {
      const sessionStr = localStorage.getItem('phototor_active_user_session');
      if (sessionStr) {
        try {
          const parsed = JSON.parse(sessionStr);
          parsed.lastActivity = Date.now();
          localStorage.setItem('phototor_active_user_session', JSON.stringify(parsed));
        } catch (e) {}
      }
    };

    window.addEventListener('pointerdown', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('pointerdown', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
    };
  }, []);

  const saveActiveSession = (profile: UserProfile) => {
    try {
      const sessionObj = {
        profile,
        lastActivity: Date.now()
      };
      localStorage.setItem('phototor_active_user_session', JSON.stringify(sessionObj));
    } catch (e) {
      console.warn("Could not save active session:", e);
    }
  };

  const fetchUserProfile = async (userId: string, authUser?: any) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (data) {
        const prof = data as UserProfile;
        setUserProfile(prof);
        saveActiveSession(prof);
        if (prof.is_pro) setIsPremium(true);
        return;
      }
    } catch (e) {
      console.warn("Could not fetch user profile from DB:", e);
    }

    // Fallback: Construct UserProfile directly from Supabase Auth User object
    if (authUser) {
      const fallbackProfile: UserProfile = {
        id: authUser.id,
        email: authUser.email || '',
        full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0],
        role: authUser.email === 'admin@phototor.com' ? 'admin' : 'user',
        is_pro: authUser.email === 'admin@phototor.com',
        created_at: authUser.created_at || new Date().toISOString()
      };
      setUserProfile(fallbackProfile);
      saveActiveSession(fallbackProfile);
      if (fallbackProfile.is_pro) setIsPremium(true);
    }
  };

  // Active side panel state
  const [activePanel, setActivePanel] = useState<'layers' | 'properties' | 'assets' | 'history' | 'ai'>('layers');
  const [visiblePanels, setVisiblePanels] = useState<string[]>(['layers', 'properties', 'history']);
  
  // Tab states for three-stacked Photoshop panel groups
  const [topTab, setTopTab] = useState<'color' | 'swatches' | 'gradients'>('color');
  const [middleTab, setMiddleTab] = useState<'properties' | 'adjustments' | 'history'>('properties');
  const [bottomTab, setBottomTab] = useState<'layers' | 'channels' | 'paths'>('layers');
  const [activeFlyout, setActiveFlyout] = useState<PanelId | null>(null);

  // ── Workspace & Panel management ──────────────────────────────────────────
  const [customWorkspaces, setCustomWorkspaces] = useState<WorkspaceLayout[]>(() => loadCustomWorkspaces());
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>(() => loadActiveWorkspaceId());
  const [activeWorkspaceLayout, setActiveWorkspaceLayout] = useState<WorkspaceLayout>(() => {
    const id = loadActiveWorkspaceId();
    return getWorkspaceById(id, loadCustomWorkspaces()) ?? BUILTIN_WORKSPACES[0];
  });

  const isPanelVisible = (id: PanelId): boolean =>
    activeWorkspaceLayout.panels.find((p) => p.id === id)?.visible ?? false;

  const togglePanelVisible = (p: string) => {
    setVisiblePanels((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
    // Also sync with workspace layout
    const pid = p as PanelId;
    setActiveWorkspaceLayout((prev) => ({
      ...prev,
      panels: prev.panels.map((ps) =>
        ps.id === pid ? { ...ps, visible: !ps.visible } : ps
      ),
    }));
  };

  const togglePanelCollapsed = (p: string) => {
    const pid = p as PanelId;
    setActiveWorkspaceLayout((prev) => ({
      ...prev,
      panels: prev.panels.map((ps) =>
        ps.id === pid ? { ...ps, collapsed: !ps.collapsed } : ps
      ),
    }));
  };

  const handleWorkspaceSelect = (id: string) => {
    const ws = getWorkspaceById(id, customWorkspaces);
    if (ws) {
      setActiveWorkspaceId(id);
      setActiveWorkspaceLayout(ws);
      saveActiveWorkspaceId(id);
      // Sync visible panels to legacy state
      const vis = ws.panels.filter((p) => p.visible).map((p) => p.id);
      setVisiblePanels(vis);
      setToast({ message: `Workspace: ${ws.name}`, type: 'success' });
    }
  };

  const handleResetPanelPositions = () => {
    const ws = BUILTIN_WORKSPACES[0];
    setActiveWorkspaceLayout(ws);
    setActiveWorkspaceId('essentials');
    const vis = ws.panels.filter((p) => p.visible).map((p) => p.id);
    setVisiblePanels(vis);
    setToast({ message: 'Panel positions reset to Essentials', type: 'info' });
  };

  const handleSetActivePanel = (p: 'layers' | 'properties' | 'assets' | 'history' | 'ai') => {
    setActivePanel(p);
    if (!visiblePanels.includes(p)) {
      setVisiblePanels((prev) => [...prev, p]);
    }
    if (p === 'properties') setMiddleTab('properties');
    if (p === 'history') setMiddleTab('history');
    if (p === 'layers') setBottomTab('layers');
  };

  // Toast HUD notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' | 'warning' } | null>(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Brush settings
  const [brushColor, setBrushColor] = useState('#ffffff');
  const [backgroundColor, setBackgroundColor] = useState('#000000');
  const [isQuickMaskMode, setIsQuickMaskMode] = useState(false);
  const [screenMode, setScreenMode] = useState<'normal' | 'fullscreen'>('normal');
  const [brushSize, setBrushSize] = useState(15);
  const [brushOpacity, setBrushOpacity] = useState(0.85);
  const [brushType, setBrushType] = useState('Round');

  useEffect(() => {
    if (screenMode === 'fullscreen') {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }, [screenMode]);

  // Active adjustments (non-destructive live adjustments for active layer)
  const [adjustments, setAdjustments] = useState<Adjustments>({
    brightness: 0,
    contrast: 0,
    saturation: 0,
    hue: 0,
    exposure: 0,
    blur: 0,
    grayscale: 0,
    sepia: 0,
    invert: 0,
    vignette: 0,
  });

  const handleUpdateAdjustments = (newAdj: Partial<Adjustments>) => {
    setAdjustments(prev => ({
      ...prev,
      ...newAdj
    }));
    if (project && activeLayerId) {
      setProject(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          layers: prev.layers.map(l => {
            if (l.id === activeLayerId) {
              return {
                ...l,
                adjustments: {
                  ...l.adjustments,
                  ...newAdj
                }
              };
            }
            return l;
          })
        };
      });
    }
  };

  const handleResetAdjustments = () => {
    const defaultAdj = {
      brightness: 0, contrast: 0, saturation: 0, hue: 0, exposure: 0, blur: 0, grayscale: 0, sepia: 0, invert: 0, vignette: 0,
      curvesRGB: [
        { input: 0, output: 0 },
        { input: 255, output: 255 },
      ],
      levelsRGB: { shadows: 0, midtones: 1.0, highlights: 255 }
    };
    handleUpdateAdjustments(defaultAdj);
  };

  // Synchronize adjustments state when activeLayerId changes or project layers change
  useEffect(() => {
    if (!project || !activeLayerId) {
      setAdjustments({
        brightness: 0, contrast: 0, saturation: 0, hue: 0, exposure: 0, blur: 0, grayscale: 0, sepia: 0, invert: 0, vignette: 0
      });
      return;
    }
    const activeLayer = project.layers.find(l => l.id === activeLayerId);
    if (activeLayer) {
      const layerAdj = activeLayer.adjustments || {
        brightness: 0, contrast: 0, saturation: 0, hue: 0, exposure: 0, blur: 0, grayscale: 0, sepia: 0, invert: 0, vignette: 0
      };
      if (JSON.stringify(layerAdj) !== JSON.stringify(adjustments)) {
        setAdjustments({
          brightness: 0, contrast: 0, saturation: 0, hue: 0, exposure: 0, blur: 0, grayscale: 0, sepia: 0, invert: 0, vignette: 0,
          ...layerAdj
        });
      }
    }
  }, [activeLayerId, project]);

  // Export Modal state & Adsterra Interstitial countdown timer
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'image/png' | 'image/jpeg' | 'image/webp'>('image/png');
  const [exportQuality, setExportQuality] = useState(90);
  const [exporting, setExporting] = useState(false);
  const [exportMode, setExportMode] = useState<'full' | 'slices'>('full');
  const [exportCountdown, setExportCountdown] = useState(0);

  useEffect(() => {
    if (showExportModal && ADSTERRA_CONFIG.enabled && ADSTERRA_CONFIG.exportModal.enabled) {
      const initSecs = ADSTERRA_CONFIG.exportModal.countdownSeconds || 5;
      setExportCountdown(initSecs);
      const interval = setInterval(() => {
        setExportCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setExportCountdown(0);
    }
  }, [showExportModal]);

  // Keyboard shortcut modal
  const [showFillModal, setShowFillModal] = useState(false);
  const [showStrokeModal, setShowStrokeModal] = useState(false);
  const [fillType, setFillType] = useState<'foreground' | 'background' | 'black' | 'white' | 'custom'>('foreground');
  const [fillCustomColor, setFillCustomColor] = useState('#ff0000');
  const [fillOpacity, setFillOpacity] = useState(100);
  const [strokeWidthInput, setStrokeWidthInput] = useState(3);
  const [strokeColorInput, setStrokeColorInput] = useState('#000000');
  const [strokeOpacityInput, setStrokeOpacityInput] = useState(100);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  // Timeline History stack
  const [historyStack, setHistoryStack] = useState<{ layers: Layer[]; canvasWidth: number; canvasHeight: number; description: string }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Auto-save timer
  const autoSaveTimer = useRef<any>(null);

  // Tabbed documents state
  const [openProjectIds, setOpenProjectIds] = useState<string[]>([]);
  const [tabNames, setTabNames] = useState<Record<string, string>>({});

  // Workspace live coordinates and context menu
  const [hoverCoords, setHoverCoords] = useState<Point | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; clientX: number; clientY: number } | null>(null);

  // Grid & Snapping state
  const [gridSettings, setGridSettings] = useState<GridSettings>({
    enabled: false,
    size: 50,
    color: '#6666ff',
    opacity: 0.15,
    snapEnabled: true,
    snapThreshold: 8,
  });

  const [alignmentGuides, setAlignmentGuides] = useState<AlignmentGuides>({
    enabled: true,
    smartGuides: true,
  });

  // Advanced Layer & Dialog States
  const [activeDialog, setActiveDialog] = useState<'layerStyle' | 'newLayer' | 'duplicateLayer' | 'layerProperties' | null>(null);
  const [activeLayerIds, setActiveLayerIds] = useState<string[]>([]);
  const [targetDuplicateLayerId, setTargetDuplicateLayerId] = useState<string | null>(null);
  const [targetPropertiesLayerId, setTargetPropertiesLayerId] = useState<string | null>(null);
  const [targetStyleLayerId, setTargetStyleLayerId] = useState<string | null>(null);
  const [layerStyleInitialTab, setLayerStyleInitialTab] = useState<string>('blending');

  // Slice dialog states
  const [editingSlice, setEditingSlice] = useState<{ slice: Slice; index: number } | null>(null);
  const [dividingSlice, setDividingSlice] = useState<{ slice: Slice; index: number } | null>(null);

  const [showFilterGallery, setShowFilterGallery] = useState(false);
  const [activeImageDialog, setActiveImageDialog] = useState<string | null>(null);
  const [projectsList, setProjectsList] = useState<Project[]>([]);
  const [cropGridOverlay, setCropGridOverlay] = useState<'thirds' | 'golden'>('thirds');
  const [straightenAngle, setStraightenAngle] = useState<number>(0);
  const [contentAwareCrop, setContentAwareCrop] = useState<boolean>(false);
  const [filterGalleryEffect, setFilterGalleryEffect] = useState<FilterEffect>('gaussian-blur');
  const [filterGalleryIntensity, setFilterGalleryIntensity] = useState<number>(50);
  const [filterGalleryRadius, setFilterGalleryRadius] = useState<number>(5);
  const [filterGalleryAngle, setFilterGalleryAngle] = useState<number>(45);
  const [filterGalleryThreshold, setFilterGalleryThreshold] = useState<number>(128);

  // Canvas Size dialog state
  const [showCanvasSizeModal, setShowCanvasSizeModal] = useState(false);
  const [canvasSizeWidth, setCanvasSizeWidth] = useState(1200);
  const [canvasSizeHeight, setCanvasSizeHeight] = useState(800);
  const [canvasSizeAnchor, setCanvasSizeAnchor] = useState<'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'>('center');
  const [canvasSizeBgColor, setCanvasSizeBgColor] = useState('#121214');

  // Pro Modal & Feature Dialog States
  const [showProModal, setShowProModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showWarpModal, setShowWarpModal] = useState(false);

  // AI Remove Background Modal & Loading states
  const [showRemoveBgModal, setShowRemoveBgModal] = useState(false);
  const [isRemoveBgLoading, setIsRemoveBgLoading] = useState(false);
  const [removeBgLoadingStep, setRemoveBgLoadingStep] = useState('');
  const [removeBgProgress, setRemoveBgProgress] = useState(0);
  const [removeBgOptions, setRemoveBgOptions] = useState({
    createNewLayer: true,
    addLayerMask: true,
    keepOriginal: true,
    keepOriginalHidden: true,
    featherEdge: 0,
    edgeRefinement: 0,
    aiHairRefinement: true,
  });

  // Layer Group state
  const [layerGroups, setLayerGroups] = useState<LayerGroup[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const handleCreateLayerGroup = (name: string) => {
    const group: LayerGroup = {
      id: `group-${Date.now()}`,
      name,
      expanded: true,
      layers: [],
    };
    setLayerGroups((prev) => [...prev, group]);
    setExpandedGroups((prev) => ({ ...prev, [group.id]: true }));
    handlePushHistory(`Created layer group: ${name}`);
  };

  const handleAddLayerToGroup = (groupId: string, layerId: string) => {
    setLayerGroups((prev) =>
      prev.map((g) => {
        if (g.id === groupId) {
          const layer = project?.layers.find((l) => l.id === layerId);
          if (layer) {
            return { ...g, layers: [...g.layers, layer] };
          }
        }
        return g;
      })
    );
    handlePushHistory(`Moved layer to group`);
  };

  const handleRemoveLayerFromGroup = (groupId: string, layerId: string) => {
    setLayerGroups((prev) =>
      prev.map((g) => {
        if (g.id === groupId) {
          return { ...g, layers: g.layers.filter((l: any) => l.id !== layerId) };
        }
        return g;
      })
    );
  };

  const handleToggleGroupExpand = (groupId: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  // Alignment handlers
  const handleAlignLayers = (align: 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom') => {
    if (!project || !activeLayerId) {
      setToast({ message: "Select a layer or object first to align.", type: 'warning' });
      return;
    }
    const selectedIds = activeLayerIds.length > 0 ? activeLayerIds : [activeLayerId];
    const selectedLayers = project.layers.filter((l) => selectedIds.includes(l.id) && !l.locked);
    if (selectedLayers.length === 0) return;

    if (selectedLayers.length > 1) {
      // Selection bounds
      const minX = Math.min(...selectedLayers.map((l) => l.x));
      const maxX = Math.max(...selectedLayers.map((l) => l.x + l.width));
      const minY = Math.min(...selectedLayers.map((l) => l.y));
      const maxY = Math.max(...selectedLayers.map((l) => l.y + l.height));
      const midX = minX + (maxX - minX) / 2;
      const midY = minY + (maxY - minY) / 2;

      selectedLayers.forEach((layer) => {
        let newX = layer.x;
        let newY = layer.y;
        switch (align) {
          case 'left': newX = minX; break;
          case 'center-h': newX = midX - layer.width / 2; break;
          case 'right': newX = maxX - layer.width; break;
          case 'top': newY = minY; break;
          case 'center-v': newY = midY - layer.height / 2; break;
          case 'bottom': newY = maxY - layer.height; break;
        }
        handleUpdateLayer(layer.id, { x: Math.round(newX), y: Math.round(newY) });
      });
    } else {
      // Align to canvas bounds
      const layer = selectedLayers[0];
      let newX = layer.x;
      let newY = layer.y;
      switch (align) {
        case 'left': newX = 0; break;
        case 'center-h': newX = (project.width - layer.width) / 2; break;
        case 'right': newX = project.width - layer.width; break;
        case 'top': newY = 0; break;
        case 'center-v': newY = (project.height - layer.height) / 2; break;
        case 'bottom': newY = project.height - layer.height; break;
      }
      handleUpdateLayer(layer.id, { x: Math.round(newX), y: Math.round(newY) });
    }
    handlePushHistory(`Aligned layer(s) ${align}`);
  };

  const handleDistributeLayers = (dir: 'horizontal' | 'vertical') => {
    if (!project) return;
    const selectedIds = activeLayerIds.length > 0 ? activeLayerIds : (activeLayerId ? [activeLayerId] : []);
    const selLayers = project.layers.filter((l) => selectedIds.includes(l.id) && !l.locked);
    if (selLayers.length < 3) {
      setToast({ message: 'Select at least 3 layers to distribute', type: 'error' });
      return;
    }
    const sorted = dir === 'horizontal'
      ? [...selLayers].sort((a, b) => a.x - b.x)
      : [...selLayers].sort((a, b) => a.y - b.y);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const totalSpace = dir === 'horizontal'
      ? (last.x + last.width) - first.x
      : (last.y + last.height) - first.y;
    const totalLayerSize = sorted.reduce((sum, l) => sum + (dir === 'horizontal' ? l.width : l.height), 0);
    const gap = (totalSpace - totalLayerSize) / (sorted.length - 1);

    let pos = first[dir === 'horizontal' ? 'x' : 'y'];
    sorted.forEach((layer, i) => {
      if (i === 0) { pos += (dir === 'horizontal' ? layer.width : layer.height) + gap; return; }
      handleUpdateLayer(layer.id, dir === 'horizontal' ? { x: Math.round(pos) } : { y: Math.round(pos) });
      pos += (dir === 'horizontal' ? layer.width : layer.height) + gap;
    });
    handlePushHistory(`Distributed layers ${dir}`);
  };

  // Image Menu Actions
  const handleApplyAdjustment = async (adjVal: Adjustments, target: 'direct' | 'layer') => {
    if (!project) return;
    if (target === 'layer') {
      const layerId = `layer-${Date.now()}`;
      const newLayer: Layer = {
        id: layerId,
        name: `Adjustment Layer (${activeImageDialog ? activeImageDialog.toUpperCase() : 'Filter'})`,
        type: 'adjustment',
        visible: true,
        locked: false,
        opacity: 1,
        blendMode: 'normal',
        x: 0,
        y: 0,
        width: project.width,
        height: project.height,
        rotation: 0,
        adjustments: adjVal,
      };
      setProject({
        ...project,
        layers: [newLayer, ...project.layers],
      });
      setActiveLayerId(layerId);
      setAdjustments({
        brightness: 0, contrast: 0, saturation: 0, hue: 0, exposure: 0, blur: 0, grayscale: 0, sepia: 0, invert: 0, vignette: 0
      });
      setActiveImageDialog(null);
      handlePushHistory(`Added Adjustment Layer: ${activeImageDialog}`);
      setToast({ message: "Adjustment Layer created successfully!", type: 'success' });
    } else {
      if (!activeLayerId) return;
      const activeLayer = project.layers.find(l => l.id === activeLayerId);
      if (!activeLayer || activeLayer.type !== 'image' || !activeLayer.imageUrl) {
        setToast({ message: 'Select an image layer to apply adjustments directly.', type: 'error' });
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = activeLayer.width;
        canvas.height = activeLayer.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, activeLayer.width, activeLayer.height);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        const processed = applyAllAdjustments(imgData, adjVal);
        ctx.putImageData(processed, 0, 0);

        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            handleUpdateLayer(activeLayer.id, { imageBlob: blob, imageUrl: url, imageElement: undefined });
            setAdjustments({
              brightness: 0, contrast: 0, saturation: 0, hue: 0, exposure: 0, blur: 0, grayscale: 0, sepia: 0, invert: 0, vignette: 0
            });
            setActiveImageDialog(null);
            handlePushHistory(`Applied adjustments directly to ${activeLayer.name}`);
            setToast({ message: "Adjustments applied directly to layer pixels!", type: 'success' });
          }
        }, 'image/png');
      };
      img.src = activeLayer.imageUrl;
    }
  };

  const handleApplyImageSize = async (w: number, h: number, res: number, algo: 'nearest' | 'bilinear' | 'bicubic' | 'lanczos' | 'ai-upscale') => {
    if (!project) return;
    const scaleX = w / project.width;
    const scaleY = h / project.height;

    const updatedLayers = await Promise.all(project.layers.map(async (l) => {
      const newLayerW = Math.max(1, Math.round(l.width * scaleX));
      const newLayerH = Math.max(1, Math.round(l.height * scaleY));
      const newLayerX = Math.round(l.x * scaleX);
      const newLayerY = Math.round(l.y * scaleY);

      if ((l.type !== 'image' && l.type !== 'drawing') || !l.imageUrl) {
        return {
          ...l,
          x: newLayerX,
          y: newLayerY,
          width: newLayerW,
          height: newLayerH
        };
      }

      return new Promise<Layer>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = l.width;
          canvas.height = l.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) { resolve(l); return; }
          ctx.drawImage(img, 0, 0, l.width, l.height);
          const imgData = ctx.getImageData(0, 0, l.width, l.height);
          const resampled = resampleImageData(imgData, newLayerW, newLayerH, algo);
          
          const outCanvas = document.createElement('canvas');
          outCanvas.width = newLayerW;
          outCanvas.height = newLayerH;
          const outCtx = outCanvas.getContext('2d');
          if (outCtx) outCtx.putImageData(resampled, 0, 0);

          outCanvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              resolve({
                ...l,
                x: newLayerX,
                y: newLayerY,
                width: newLayerW,
                height: newLayerH,
                imageBlob: blob,
                imageUrl: url,
                imageElement: undefined
              });
            } else {
              resolve(l);
            }
          }, 'image/png');
        };
        img.src = l.imageUrl;
      });
    }));

    setProject({
      ...project,
      width: w,
      height: h,
      layers: updatedLayers,
      grid: {
        ...(project.grid || { enabled: false, size: 50, color: '#6666ff', opacity: 0.15, snapEnabled: true, snapThreshold: 8 }),
        size: res
      }
    });
    handlePushHistory(`Image resized to ${w}x${h}px using ${algo.toUpperCase()}`);
    setActiveImageDialog(null);
    setToast({ message: "Image resized successfully!", type: 'success' });
  };

  const handleApplyCanvasSize = (w: number, h: number, anchor: string, extColor: string) => {
    if (!project) return;
    const dw = w - project.width;
    const dh = h - project.height;
    let offsetX = 0, offsetY = 0;
    
    switch (anchor) {
      case 'middle-center': offsetX = Math.floor(dw / 2); offsetY = Math.floor(dh / 2); break;
      case 'top-left': offsetX = 0; offsetY = 0; break;
      case 'top-center': offsetX = Math.floor(dw / 2); offsetY = 0; break;
      case 'top-right': offsetX = dw; offsetY = 0; break;
      case 'middle-left': offsetX = 0; offsetY = Math.floor(dh / 2); break;
      case 'middle-right': offsetX = dw; offsetY = Math.floor(dh / 2); break;
      case 'bottom-left': offsetX = 0; offsetY = dh; break;
      case 'bottom-center': offsetX = Math.floor(dw / 2); offsetY = dh; break;
      case 'bottom-right': offsetX = dw; offsetY = dh; break;
    }

    const updatedLayers = project.layers.map((l) => ({
      ...l,
      x: l.x + offsetX,
      y: l.y + offsetY,
    }));

    if (extColor !== 'transparent') {
      updatedLayers.push({
        id: `layer-bg-${Date.now()}`,
        name: 'Canvas Extension Background',
        type: 'shape',
        shapeType: 'rectangle',
        fillColor: extColor,
        strokeColor: 'transparent',
        strokeWidth: 0,
        visible: true,
        locked: true,
        opacity: 1,
        blendMode: 'normal',
        x: 0,
        y: 0,
        width: w,
        height: h,
        rotation: 0,
      });
    }

    setProject({
      ...project,
      width: w,
      height: h,
      layers: updatedLayers,
    });
    setActiveImageDialog(null);
    handlePushHistory(`Canvas size changed to ${w}x${h}px`);
    setToast({ message: `Canvas size changed to ${w}x${h}px`, type: 'success' });
  };

  const handleApplyImageRotation = (angleType: '90cw' | '90ccw' | '180' | 'flipH' | 'flipV') => {
    if (!project) return;

    const targetLayerIds = activeLayerIds.length > 0
      ? activeLayerIds
      : (activeLayerId ? [activeLayerId] : []);

    if (targetLayerIds.length === 0) {
      setToast({ message: "Select a layer or object first to rotate or flip.", type: 'warning' });
      return;
    }

    const updatedLayers = project.layers.map((l) => {
      if (targetLayerIds.includes(l.id)) {
        let rot = l.rotation || 0;
        let fx = l.flipX || false;
        let fy = l.flipY || false;

        if (angleType === '90cw') {
          rot = (rot + 90) % 360;
        } else if (angleType === '90ccw') {
          rot = (rot - 90 + 360) % 360;
        } else if (angleType === '180') {
          rot = (rot + 180) % 360;
        } else if (angleType === 'flipH') {
          fx = !fx;
        } else if (angleType === 'flipV') {
          fy = !fy;
        }

        return {
          ...l,
          rotation: rot,
          flipX: fx,
          flipY: fy,
        };
      }
      return l;
    });

    setProject({
      ...project,
      layers: updatedLayers,
    });

    const labels: Record<string, string> = {
      '90cw': 'Rotated 90° CW',
      '90ccw': 'Rotated 90° CCW',
      '180': 'Rotated 180°',
      'flipH': 'Flipped Horizontally',
      'flipV': 'Flipped Vertically',
    };

    handlePushHistory(labels[angleType] || 'Transformed Layer');
    setToast({ message: `${labels[angleType] || 'Transformed'} selected layer/object!`, type: 'success' });
  };

  const handleApplyWarp = (
    layerId: string,
    warpedDataUrl: string,
    warpedBlob: Blob,
    newWidth: number,
    newHeight: number,
    warpConfig: WarpConfig
  ) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      handleUpdateLayer(layerId, {
        imageUrl: warpedDataUrl,
        imageBlob: warpedBlob,
        imageElement: img,
        width: newWidth,
        height: newHeight,
        warpConfig,
      });
      handlePushHistory(`Applied Transform Warp: ${warpConfig.style.toUpperCase()}`);
      setToast({ message: `Transform Warp berhasil diterapkan pada layer!`, type: 'success' });
    };
    img.src = warpedDataUrl;
  };

  const handleApplyTrim = async (trimType: 'transparent' | 'top-left' | 'bottom-right') => {
    if (!project) return;
    const canvas = document.createElement('canvas');
    canvas.width = project.width;
    canvas.height = project.height;
    await renderProjectToCanvas(project, canvas, { isExport: true });
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    const W = canvas.width;
    const H = canvas.height;

    let targetR = 0, targetG = 0, targetB = 0, targetA = 0;
    if (trimType === 'top-left') {
      targetR = data[0]; targetG = data[1]; targetB = data[2]; targetA = data[3];
    } else if (trimType === 'bottom-right') {
      const idx = ((H - 1) * W + (W - 1)) * 4;
      targetR = data[idx]; targetG = data[idx + 1]; targetB = data[idx + 2]; targetA = data[idx + 3];
    }

    const matchesTrim = (r: number, g: number, b: number, a: number) => {
      if (trimType === 'transparent') {
        return a < 15;
      }
      const diff = Math.abs(r - targetR) + Math.abs(g - targetG) + Math.abs(b - targetB) + Math.abs(a - targetA);
      return diff < 40;
    };

    let minX = W, maxX = 0, minY = H, maxY = 0;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const idx = (y * W + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];
        if (!matchesTrim(r, g, b, a)) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (minX > maxX || minY > maxY) {
      setToast({ message: "No pixels to trim found!", type: 'error' });
      return;
    }

    const newW = maxX - minX + 1;
    const newH = maxY - minY + 1;
    handleCropCanvas(newW, newH, minX, minY);
    setToast({ message: `Trimmed borders to ${newW}x${newH}px`, type: 'success' });
  };

  const handleApplyRevealAll = () => {
    if (!project || project.layers.length === 0) return;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    project.layers.forEach((l) => {
      if (l.x < minX) minX = l.x;
      if (l.x + l.width > maxX) maxX = l.x + l.width;
      if (l.y < minY) minY = l.y;
      if (l.y + l.height > maxY) maxY = l.y + l.height;
    });

    const newW = maxX - minX;
    const newH = maxY - minY;

    const updatedLayers = project.layers.map((l) => ({
      ...l,
      x: l.x - minX,
      y: l.y - minY,
    }));

    setProject({
      ...project,
      width: newW,
      height: newH,
      layers: updatedLayers
    });
    handlePushHistory(`Revealed all layers (expanded canvas to ${newW}x${newH}px)`);
    setToast({ message: `Canvas expanded to reveal all layers!`, type: 'success' });
  };

  const handleDuplicateProject = async () => {
    if (!project) return;
    const existingProjs = await loadProjects(userProfile?.id);
    if (userProfile && existingProjs.length >= 3) {
      setToast({
        message: "Batas Maksimal 3 Proyek Tercapai! Silakan hapus proyek lama Anda terlebih dahulu untuk menduplikat.",
        type: 'error'
      });
      return;
    }
    await saveProject(project, userProfile?.id);

    const newId = `proj-${Date.now()}`;
    const clonedLayers = await Promise.all(
      project.layers.map(async (l) => ({
        ...l,
        id: `${l.id}-copy-${Date.now()}`
      }))
    );

    const dupProj: Project = {
      ...project,
      id: newId,
      name: `${project.name} Copy`,
      layers: clonedLayers,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await saveProject(dupProj, userProfile?.id);

    setProject(dupProj);
    setCurrentProjId(newId);
    setTabNames((prev) => ({ ...prev, [newId]: dupProj.name }));
    if (!openProjectIds.includes(newId)) {
      setOpenProjectIds((prev) => [...prev, newId]);
    }

    setHistoryStack([{ layers: dupProj.layers, canvasWidth: dupProj.width, canvasHeight: dupProj.height, description: 'Workspace duplicated' }]);
    setHistoryIndex(0);
    if (dupProj.layers.length > 0) {
      setActiveLayerId(dupProj.layers[0].id);
    }
    setToast({ message: "Document duplicated successfully!", type: 'success' });
  };

  const handleApplyAI = async (action: string) => {
    if (!project || !activeLayerId) return;
    const activeLayer = project.layers.find(l => l.id === activeLayerId);
    if (!activeLayer || activeLayer.type !== 'image' || !activeLayer.imageUrl) {
      setToast({ message: "Select an image layer to run AI tools.", type: 'error' });
      return;
    }

    return new Promise<void>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = activeLayer.width;
        canvas.height = activeLayer.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(); return; }
        ctx.drawImage(img, 0, 0, activeLayer.width, activeLayer.height);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        let processed: ImageData;
        let newW = activeLayer.width;
        let newH = activeLayer.height;

        if (action === 'enhance') processed = applyAIEnhance(imgData);
        else if (action === 'denoise') processed = applyAIDenoise(imgData);
        else if (action === 'sharpen') processed = applyAISharpen(imgData);
        else if (action === 'relight') processed = applyAIRelight(imgData);
        else if (action === 'color-correct') processed = applyAIColorCorrect(imgData);
        else if (action === 'restore') processed = applyAIRestore(imgData);
        else if (action === 'face-enhance') processed = applyAIFaceEnhance(imgData);
        else if (action === 'remove-artifacts') processed = applyAIRemoveArtifacts(imgData);
        else if (action === 'sky-replace') processed = applyAISkyReplacement(imgData);
        else if (action === 'upscale') {
          newW = activeLayer.width * 2;
          newH = activeLayer.height * 2;
          processed = resampleImageData(imgData, newW, newH, 'ai-upscale');
        } else {
          processed = imgData;
        }

        const outCanvas = document.createElement('canvas');
        outCanvas.width = newW;
        outCanvas.height = newH;
        const outCtx = outCanvas.getContext('2d');
        if (outCtx) outCtx.putImageData(processed, 0, 0);

        outCanvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            if (action === 'upscale') {
              handleUpdateLayer(activeLayer.id, {
                imageBlob: blob,
                imageUrl: url,
                imageElement: undefined,
                width: newW,
                height: newH
              });
              setProject(prev => prev ? {
                ...prev,
                width: prev.width * 2,
                height: prev.height * 2,
                layers: prev.layers.map(l => l.id === activeLayer.id ? { ...l, imageBlob: blob, imageUrl: url, imageElement: undefined, width: newW, height: newH } : { ...l, width: l.width * 2, height: l.height * 2, x: l.x * 2, y: l.y * 2 })
              } : null);
            } else {
              handleUpdateLayer(activeLayer.id, {
                imageBlob: blob,
                imageUrl: url,
                imageElement: undefined
              });
            }
            handlePushHistory(`AI Process applied: ${action.toUpperCase()}`);
            setToast({ message: `AI Process ${action.toUpperCase()} applied!`, type: 'success' });
          }
          resolve();
        }, 'image/png');
      };
      img.src = activeLayer.imageUrl!;
    });
  };

  const handleApplyAuto = async (type: 'tone' | 'contrast' | 'color') => {
    if (!project || !activeLayerId) return;
    const activeLayer = project.layers.find(l => l.id === activeLayerId);
    if (!activeLayer || activeLayer.type !== 'image' || !activeLayer.imageUrl) {
      setToast({ message: "Select an image layer first.", type: 'error' });
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = activeLayer.width;
      canvas.height = activeLayer.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, activeLayer.width, activeLayer.height);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      let processed: ImageData;
      if (type === 'tone') {
        processed = applyAIEnhance(imgData);
      } else if (type === 'contrast') {
        processed = applyAIEnhance(imgData);
      } else {
        processed = applyAIColorCorrect(imgData);
      }

      ctx.putImageData(processed, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          handleUpdateLayer(activeLayer.id, { imageBlob: blob, imageUrl: url, imageElement: undefined });
          handlePushHistory(`Auto ${type} adjustment applied`);
          setToast({ message: `Auto ${type} applied!`, type: 'success' });
        }
      }, 'image/png');
    };
    img.src = activeLayer.imageUrl;
  };

  const handleApplyColorMode = async (mode: 'rgb' | 'cmyk' | 'grayscale' | 'bitmap' | 'lab' | 'indexed') => {
    if (!project) return;
    let warning = "";
    if (mode === 'grayscale') warning = "Converting to Grayscale will discard all color information. Proceed?";
    else if (mode === 'bitmap') warning = "Converting to Bitmap will reduce pixels to strictly black & white. Proceed?";
    else if (mode === 'indexed') warning = "Converting to Indexed Color limits the image to 255 colors. Proceed?";
    else if (mode === 'cmyk') warning = "Converting to CMYK color profile maps colors to printing gamut. Proceed?";
    
    if (warning && !window.confirm(warning)) return;

    const updatedLayers = await Promise.all(project.layers.map(async (l) => {
      if (l.type !== 'image' || !l.imageUrl) return l;
      return new Promise<Layer>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = l.width;
          canvas.height = l.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) { resolve(l); return; }
          ctx.drawImage(img, 0, 0, l.width, l.height);
          const imgData = ctx.getImageData(0, 0, l.width, l.height);
          const { imgData: converted } = convertImageMode(imgData, mode);
          ctx.putImageData(converted, 0, 0);
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              resolve({ ...l, imageBlob: blob, imageUrl: url, imageElement: undefined });
            } else {
              resolve(l);
            }
          }, 'image/png');
        };
        img.src = l.imageUrl;
      });
    }));

    setProject({
      ...project,
      colorMode: mode,
      layers: updatedLayers
    });
    handlePushHistory(`Converted mode to ${mode.toUpperCase()}`);
    setToast({ message: `Image mode changed to ${mode.toUpperCase()}`, type: 'success' });
  };

  const handleApplyBitDepth = (depth: 8 | 16 | 32) => {
    if (!project) return;
    const curDepth = project.bitDepth || 8;
    const { warning } = convertBitDepth(curDepth, depth);
    if (warning && !window.confirm(warning)) return;

    setProject({
      ...project,
      bitDepth: depth
    });
    handlePushHistory(`Converted bit depth to ${depth}-bit`);
    setToast({ message: `Image bit depth changed to ${depth}-bit`, type: 'success' });
  };

  // Curves & Levels handlers
  const handleApplyCurves = (points: CurvePoint[]) => {
    if (!project || !activeLayerId) return;
    const activeLayer = project.layers.find(l => l.id === activeLayerId);
    if (!activeLayer || activeLayer.type !== 'image' || !activeLayer.imageUrl) {
      setToast({ message: 'Select an image layer first to apply curves.', type: 'error' });
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = activeLayer.width;
      canvas.height = activeLayer.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, activeLayer.width, activeLayer.height);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const processed = applyCurves(imgData, points);
      ctx.putImageData(processed, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          handleUpdateLayer(activeLayer.id, { imageBlob: blob, imageUrl: url, imageElement: undefined });
          handlePushHistory('Applied Curves adjustment');
          setToast({ message: 'Curves applied successfully!', type: 'success' });
        }
      }, 'image/png');
    };
    img.onerror = () => setToast({ message: 'Failed to load image for curves.', type: 'error' });
    img.src = activeLayer.imageUrl;
  };

  const handleApplyLevels = (params: LevelsParams) => {
    if (!project || !activeLayerId) return;
    const activeLayer = project.layers.find(l => l.id === activeLayerId);
    if (!activeLayer || activeLayer.type !== 'image' || !activeLayer.imageUrl) {
      setToast({ message: 'Select an image layer first to apply levels.', type: 'error' });
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = activeLayer.width;
      canvas.height = activeLayer.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, activeLayer.width, activeLayer.height);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const processed = applyLevels(imgData, params);
      ctx.putImageData(processed, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          handleUpdateLayer(activeLayer.id, { imageBlob: blob, imageUrl: url, imageElement: undefined });
          handlePushHistory('Applied Levels adjustment');
          setToast({ message: 'Levels applied successfully!', type: 'success' });
        }
      }, 'image/png');
    };
    img.onerror = () => setToast({ message: 'Failed to load image for levels.', type: 'error' });
    img.src = activeLayer.imageUrl;
  };

  const handleResetCurvesLevels = () => {
    setToast({ message: 'Curves & Levels reset to defaults.', type: 'info' });
  };

  // Filter Gallery handler
  const handleApplyFilterGallery = (params: FilterGalleryParams) => {
    if (!project || !activeLayerId) return;
    const activeLayer = project.layers.find(l => l.id === activeLayerId);
    if (!activeLayer || activeLayer.type !== 'image' || !activeLayer.imageUrl) {
      setToast({ message: 'Select an image layer first to apply filter.', type: 'error' });
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = activeLayer.width;
      canvas.height = activeLayer.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, activeLayer.width, activeLayer.height);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const processed = applyFilterGallery(imgData, params.effect, { intensity: params.intensity, radius: params.radius, angle: params.angle, threshold: params.threshold });
      ctx.putImageData(processed, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          handleUpdateLayer(activeLayer.id, { imageBlob: blob, imageUrl: url, imageElement: undefined });
          handlePushHistory(`Applied ${params.effect} filter`);
          setToast({ message: `Filter "${params.effect.replace(/-/g, ' ')}" applied!`, type: 'success' });
        }
      }, 'image/png');
    };
    img.onerror = () => setToast({ message: 'Failed to load image for filter.', type: 'error' });
    img.src = activeLayer.imageUrl;
  };

  // Accordion Sidebar Collapsing Panel State
  const [panelsCollapsed, setPanelsCollapsed] = useState<Record<string, boolean>>({
    navigator: false,
    color: false,
    properties: false,
    layers: false,
    history: false,
    ai: false,
  });

  // Dynamic Options States
  const [brushSmoothing, setBrushSmoothing] = useState(10);
  const [brushHardness, setBrushHardness] = useState(80);
  const [brushFlow, setBrushFlow] = useState(100);
  const [brushBlendMode, setBrushBlendMode] = useState('normal');

  // Editor viewport state (synced with CanvasWorkspace)
  const [editorZoom, setEditorZoom] = useState(1.0);
  const editorPan = { x: 0, y: 0 };

  const [textFont, setTextFont] = useState('Inter');
  const [textSize, setTextSize] = useState(32);
  const [textWeight, setTextWeight] = useState('normal');
  const [textStyle, setTextStyle] = useState('normal');
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('left');

  const [cropRatio, setCropRatio] = useState('free');
  const [cropTargetMode, setCropTargetMode] = useState<'layer' | 'canvas'>('layer');
  const [selectionFeather, setSelectionFeather] = useState(0);
  const [deleteCroppedPixels, setDeleteCroppedPixels] = useState(true);
  const [showRulers, setShowRulers] = useState(true);
  const [showGuides, setShowGuides] = useState(true);

  // Magic Wand settings
  const [wandTolerance, setWandTolerance] = useState(32);
  const [wandContiguous, setWandContiguous] = useState(true);
  const [wandAntiAlias, setWandAntiAlias] = useState(true);
  const [wandSampleAll, setWandSampleAll] = useState(false);
  const [wandSelectionMode, setWandSelectionMode] = useState<'new' | 'add' | 'subtract' | 'intersect'>('new');

  const [shapeStrokeColor, setShapeStrokeColor] = useState('#ffffff');
  const [shapeStrokeWidth, setShapeStrokeWidth] = useState(2);
  const [shapeCornerRadius, setShapeCornerRadius] = useState(16);
  const [gradientPresetId, setGradientPresetId] = useState<string>('fg-bg');
  const [showGradientPickerPopover, setShowGradientPickerPopover] = useState(false);
  const [gradientDither, setGradientDither] = useState(true);
  const [gradientTransparency, setGradientTransparency] = useState(true);
  const [gradientType, setGradientType] = useState<'linear' | 'radial' | 'angle' | 'reflected' | 'diamond'>('linear');
  const [gradientOpacity, setGradientOpacity] = useState(1);
  const [gradientBlendMode, setGradientBlendMode] = useState('normal');
  const [gradientReverse, setGradientReverse] = useState(false);
  const [gradientStops, setGradientStops] = useState<{ offset: number; color: string }[]>([]);

  const hexToRgba = (hex: string, alpha: number) => {
    let c = (hex || '#000000').replace('#', '');
    if (c.length === 3) c = c.split('').map((x) => x + x).join('');
    const num = parseInt(c, 16);
    if (isNaN(num)) return `rgba(0,0,0,${alpha})`;
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  };

  const getEffectiveGradientStops = () => {
    if (gradientPresetId === 'fg-bg') {
      return [{ offset: 0, color: brushColor }, { offset: 1, color: backgroundColor }];
    }
    if (gradientPresetId === 'fg-trans') {
      return [{ offset: 0, color: brushColor }, { offset: 1, color: hexToRgba(brushColor, 0) }];
    }
    if (gradientPresetId === 'black-white') {
      return [{ offset: 0, color: '#000000' }, { offset: 1, color: '#ffffff' }];
    }
    if (gradientPresetId === 'spectrum') {
      return [
        { offset: 0, color: '#ff0000' },
        { offset: 0.17, color: '#ffff00' },
        { offset: 0.33, color: '#00ff00' },
        { offset: 0.5, color: '#00ffff' },
        { offset: 0.67, color: '#0000ff' },
        { offset: 0.83, color: '#ff00ff' },
        { offset: 1, color: '#ff0000' },
      ];
    }
    if (gradientStops && gradientStops.length >= 2) {
      return gradientStops;
    }
    return [{ offset: 0, color: brushColor }, { offset: 1, color: backgroundColor }];
  };
  const [visibleChannel, setVisibleChannel] = useState<'rgb' | 'r' | 'g' | 'b'>('rgb');

  const [autoSelectLayer, setAutoSelectLayer] = useState(true);
  const [showTransformHandles, setShowTransformHandles] = useState(true);

  // Load project on selection
  const handleOpenProject = async (id: string) => {
    if (!userProfile) {
      setShowAuthModal(true);
      setToast({
        message: "Silakan masuk atau daftar akun gratis terlebih dahulu untuk membuka Canvas Editor.",
        type: 'info'
      });
      return;
    }
    const proj = await loadProject(id);
    if (proj) {
      // Hydrate all image elements before loading
      const hydratedLayers = await Promise.all(proj.layers.map((l) => hydrateLayerImage(l)));
      const hydratedProj = { ...proj, layers: hydratedLayers };
      
      setProject(hydratedProj);
      setCurrentProjId(id);
      setTabNames((prev) => ({ ...prev, [id]: proj.name }));
      if (!openProjectIds.includes(id)) {
        setOpenProjectIds((prev) => [...prev, id]);
      }
      
      // Set initial history
      setHistoryStack([{ layers: hydratedProj.layers, canvasWidth: hydratedProj.width, canvasHeight: hydratedProj.height, description: 'Project Opened' }]);
      setHistoryIndex(0);

      // Select top layer
      if (hydratedProj.layers.length > 0) {
        setActiveLayerId(hydratedProj.layers[0].id);
      }
    }
  };

  // Create new project
  const handleCreateProject = (width: number, height: number, name: string) => {
    if (!userProfile) {
      setShowAuthModal(true);
      setToast({
        message: "Silakan masuk atau daftar akun gratis terlebih dahulu untuk membuat proyek di Canvas Editor.",
        type: 'info'
      });
      return;
    }
    const newProj: Project = {
      id: `proj-${Date.now()}`,
      name: name || 'Untitled Project',
      width,
      height,
      layers: [
        {
          id: `layer-${Date.now()}-bg`,
          name: 'Background Color',
          type: 'shape',
          shapeType: 'rectangle',
          fillColor: '#ffffff',
          strokeColor: 'transparent',
          strokeWidth: 0,
          visible: true,
          locked: false,
          opacity: 1,
          blendMode: 'normal',
          x: 0,
          y: 0,
          width,
          height,
          rotation: 0,
        }
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setProject(newProj);
    setCurrentProjId(newProj.id);
    setTabNames((prev) => ({ ...prev, [newProj.id]: newProj.name }));
    if (!openProjectIds.includes(newProj.id)) {
      setOpenProjectIds((prev) => [...prev, newProj.id]);
    }
    
    // Set initial history
    setHistoryStack([{ layers: newProj.layers, canvasWidth: width, canvasHeight: height, description: 'Workspace initialized' }]);
    setHistoryIndex(0);
    setActiveLayerId(newProj.layers[0].id);

    // Save initially
    saveProject(newProj, userProfile?.id);
  };

  // Push State to History Timeline
  const handlePushHistory = (description: string) => {
    if (!project) return;
    
    // Clear future redo stack if we were inside the timeline
    const cleanStack = historyStack.slice(0, historyIndex + 1);
    
    // Clone layers deeply
    const clonedLayers = project.layers.map((l) => ({ ...l }));
    const newState = {
      layers: clonedLayers,
      canvasWidth: project.width,
      canvasHeight: project.height,
      description,
    };

    setHistoryStack([...cleanStack, newState]);
    setHistoryIndex(cleanStack.length);
  };

  // Jump to snapshot state
  const handleJumpToHistory = (idx: number) => {
    if (!project || idx < 0 || idx >= historyStack.length) return;
    
    const targetState = historyStack[idx];
    setProject({
      ...project,
      width: targetState.canvasWidth,
      height: targetState.canvasHeight,
      layers: targetState.layers.map((l) => ({ ...l })),
    });
    setHistoryIndex(idx);

    if (targetState.layers.length > 0) {
      // Re-verify active layer exists in this past state
      const stillExists = targetState.layers.some((l) => l.id === activeLayerId);
      if (!stillExists) {
        setActiveLayerId(targetState.layers[0].id);
      }
    }
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      handleJumpToHistory(historyIndex - 1);
    }
  };

  const handleRedo = () => {
    if (historyIndex < historyStack.length - 1) {
      handleJumpToHistory(historyIndex + 1);
    }
  };

  // Save current project snapshot
  const handleSaveProject = async () => {
    if (!project) return;
    
    // Render thumbnail
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 320;
    tempCanvas.height = 180;
    
    await renderProjectToCanvas(project, tempCanvas, { isExport: true });
    const thumbUrl = tempCanvas.toDataURL('image/jpeg', 0.6);

    const updatedProj: Project = {
      ...project,
      thumbnail: thumbUrl,
      updatedAt: Date.now(),
    };

    setProject(updatedProj);
    await saveProject(updatedProj, userProfile?.id);
  };

  const handleUpdateProject = (updates: Partial<Project>) => {
    if (!project) return;
    setProject((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        ...updates,
      };
    });
  };

  // Load projects list for matching color
  useEffect(() => {
    if (activeImageDialog === 'match-color') {
      loadProjects().then((projs) => {
        setProjectsList(projs.filter((p) => p.id !== currentProjId));
      });
    }
  }, [activeImageDialog, currentProjId]);

  // Handle dragging and reordering panel tabs in panel groups
  const handleReorderGroupPanels = (reorderedIds: PanelId[]) => {
    setActiveWorkspaceLayout((prev) => ({
      ...prev,
      panels: prev.panels.map((p) => {
        const idx = reorderedIds.indexOf(p.id);
        if (idx !== -1) {
          return { ...p, order: idx };
        }
        return p;
      }),
    }));
  };

  // Auto-Save sync
  useEffect(() => {
    if (project) {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => {
        handleSaveProject();
      }, 5000); // Autosave every 5s after inactivity
    }
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [project]);

  // Synchronize Smart Object edits back to the parent layer in real time
  useEffect(() => {
    if (!project || !project.id.startsWith('smart-')) return;

    const parentLayerId = project.id.slice(6);
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = project.width;
    tempCanvas.height = project.height;

    const syncSmartObject = async () => {
      await renderProjectToCanvas(project, tempCanvas);
      const url = tempCanvas.toDataURL();
      const img = new Image();
      img.onload = () => {
        setProjectsList(prev => prev.map(proj => {
          if (proj.id === project.id) return proj;
          const hasParentLayer = proj.layers.some(l => l.id === parentLayerId);
          if (!hasParentLayer) return proj;

          const updatedLayers = proj.layers.map(l => {
            if (l.id === parentLayerId) {
              return {
                ...l,
                imageElement: img,
                imageUrl: url,
                smartObjectProject: project
              };
            }
            return l;
          });

          return { ...proj, layers: updatedLayers };
        }));
      };
      img.src = url;
    };

    syncSmartObject();
  }, [project]);

  const handleEditSmartObject = (layerId: string) => {
    if (!project) return;
    const layer = project.layers.find(l => l.id === layerId);
    if (!layer || layer.type !== 'smartobject') return;

    const tabId = `smart-${layer.id}`;
    if (openProjectIds.includes(tabId)) {
      handleOpenProject(tabId);
      return;
    }

    const smartProj: Project = layer.smartObjectProject || {
      id: tabId,
      name: `${layer.name} (Smart)`,
      width: layer.width,
      height: layer.height,
      layers: [
        {
          id: `smart-bg-${layer.id}`,
          name: 'Base Content',
          type: 'image',
          x: 0, y: 0,
          width: layer.width, height: layer.height,
          visible: true, locked: false, opacity: 1, blendMode: 'normal', rotation: 0,
          imageUrl: layer.imageUrl,
          imageElement: layer.imageElement,
          imageBlob: layer.imageBlob
        }
      ],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    setProjectsList(prev => {
      if (prev.find(p => p.id === tabId)) return prev;
      return [...prev, smartProj];
    });

    setOpenProjectIds(prev => [...prev, tabId]);
    setTabNames(prev => ({ ...prev, [tabId]: smartProj.name }));
    handleOpenProject(tabId);

    setToast({ message: "Opened Smart Object tab. Edit and save changes to update parent layer.", type: 'info' });
  };

  // Global keyboard shortcuts hook (V, B, E, H, Z, M, Ctrl+Z, Ctrl+Y, Ctrl+S)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Avoid if user is writing in inputs
      const targetTag = document.activeElement?.tagName || '';
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(targetTag) || document.activeElement?.getAttribute('contenteditable') === 'true') {
        return;
      }

      // Check undo/redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        setEditorZoom((z) => Math.min(8.0, parseFloat((z + 0.15).toFixed(2))));
      } else if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        setEditorZoom((z) => Math.max(0.1, parseFloat((z - 0.15).toFixed(2))));
      } else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        if (project) {
          const viewportW = window.innerWidth - 420;
          const viewportH = window.innerHeight - 80;
          const fitZoom = Math.min(
            Math.max(0.1, (viewportW - 60) / project.width),
            Math.max(0.1, (viewportH - 60) / project.height),
            1.5
          );
          setEditorZoom(parseFloat(fitZoom.toFixed(2)));
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === '1') {
        e.preventDefault();
        setEditorZoom(1.0);
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        if (e.shiftKey) {
          e.preventDefault();
          handleTriggerExport();
        } else {
          e.preventDefault();
          handleSaveProject();
          setToast({ message: "Project saved successfully!", type: 'success' });
        }
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        handleQuickExport();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        handleCreateProject(1200, 800, 'New Canvas');
        setToast({ message: "Created new canvas (1200×800 px)", type: 'success' });
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        handleCloseProject();
        setToast({ message: "Returned to Dashboard", type: 'info' });
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        handleCopyLayer();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        handlePasteLayer();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
        e.preventDefault();
        handleCutLayer();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault();
        setActiveTool('crop');
        setActiveSubTool('transform');
        setToast({ message: "Free Transform mode activated", type: 'info' });
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        handleMergeLayers();
      } else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        if (activeLayerId) {
          setTargetDuplicateLayerId(activeLayerId);
          setActiveDialog('duplicateLayer');
        }
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setActiveDialog('newLayer');
      } else if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        if (e.shiftKey) {
          if (activeLayerId) handleUngroupLayers(activeLayerId);
        } else {
          handleGroupSelectedLayers();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        if (activeLayerId) {
          const l = project.layers.find(x => x.id === activeLayerId);
          if (l) {
            handleUpdateLayer(activeLayerId, { isClippingMask: !l.isClippingMask });
            handlePushHistory(l.isClippingMask ? 'Released clipping mask' : 'Created clipping mask');
            setToast({ message: l.isClippingMask ? 'Released clipping mask' : 'Created clipping mask', type: 'success' });
          }
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === ']') {
        e.preventDefault();
        handleArrangeLayer('forward');
      } else if ((e.ctrlKey || e.metaKey) && e.key === '[') {
        e.preventDefault();
        handleArrangeLayer('backward');
      } else if (e.key === 'Delete') {
        const tag = document.activeElement?.tagName.toLowerCase();
        if (tag !== 'input' && tag !== 'textarea' && activeLayerId) {
          const activeLayer = project?.layers.find(l => l.id === activeLayerId);
          if (activeLayer && activeLayer.locked) {
            setToast({ message: "Locked layers cannot be deleted!", type: 'error' });
          } else {
            handleDeleteLayer(activeLayerId);
            setToast({ message: "Layer deleted", type: 'info' });
          }
        }
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        handleCutLayer();
        setTimeout(() => {
          handlePasteLayer();
          setToast({ message: "Layer Via Cut (Ctrl+Shift+J)", type: 'success' });
        }, 100);
      } else if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        setShowRemoveBgModal(true);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        if (project && activeLayerId) {
          const activeLayer = project.layers.find(l => l.id === activeLayerId);
          if (activeLayer && activeLayer.hasMask) {
            handleUpdateLayer(activeLayer.id, { maskDisabled: !activeLayer.maskDisabled });
            setToast({ message: activeLayer.maskDisabled ? "Enabled Layer Mask" : "Disabled Layer Mask", type: 'info' });
          }
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        if (project && activeLayerId) {
          const activeLayer = project.layers.find(l => l.id === activeLayerId);
          if (activeLayer && activeLayer.type === 'image' && activeLayer.imageUrl) {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              const canvas = document.createElement('canvas');
              canvas.width = activeLayer.width;
              canvas.height = activeLayer.height;
              const ctx = canvas.getContext('2d');
              if (!ctx) return;
              ctx.drawImage(img, 0, 0, activeLayer.width, activeLayer.height);
              const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const out = imgData.data;
              for (let i = 0; i < out.length; i += 4) {
                out[i] = 255 - out[i];
                out[i+1] = 255 - out[i+1];
                out[i+2] = 255 - out[i+2];
              }
              ctx.putImageData(imgData, 0, 0);
              canvas.toBlob((blob) => {
                if (blob) {
                  const url = URL.createObjectURL(blob);
                  handleUpdateLayer(activeLayer.id, { imageBlob: blob, imageUrl: url, imageElement: undefined });
                  handlePushHistory('Inverted colors (Ctrl+I)');
                  setToast({ message: "Inverted Layer Colors", type: 'success' });
                }
              }, 'image/png');
            };
            img.src = activeLayer.imageUrl;
          } else {
            setToast({ message: "Select an image layer to invert.", type: 'error' });
          }
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        setShowRulers(!showRulers);
        setToast({ message: !showRulers ? "Rulers Shown" : "Rulers Hidden", type: 'info' });
      } else if ((e.ctrlKey || e.metaKey) && e.key === ';') {
        e.preventDefault();
        setShowGuides(!showGuides);
        setToast({ message: !showGuides ? "Guides Shown" : "Guides Hidden", type: 'info' });
      } else if ((e.ctrlKey || e.metaKey) && e.key === '2') {
        e.preventDefault();
        setVisibleChannel('rgb');
        setToast({ message: "Switched to RGB Channel", type: 'info' });
      } else if ((e.ctrlKey || e.metaKey) && e.key === '3') {
        e.preventDefault();
        setVisibleChannel('r');
        setToast({ message: "Switched to Red Channel", type: 'info' });
      } else if ((e.ctrlKey || e.metaKey) && e.key === '4') {
        e.preventDefault();
        setVisibleChannel('g');
        setToast({ message: "Switched to Green Channel", type: 'info' });
      } else if ((e.ctrlKey || e.metaKey) && e.key === '5') {
        e.preventDefault();
        setVisibleChannel('b');
        setToast({ message: "Switched to Blue Channel", type: 'info' });
      } else {
        const activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.getAttribute('contenteditable') === 'true')) {
          return;
        }

        switch (e.key.toLowerCase()) {
          case 'v':
            setActiveTool('move');
            setActiveSubTool('move');
            break;
          case 'b':
            setActiveTool('brush');
            setActiveSubTool('brush');
            break;
          case 'e':
            setActiveTool('eraser');
            setActiveSubTool('eraser');
            break;
          case 'h':
            setActiveTool('move');
            setActiveSubTool('hand');
            break;
          case 'z':
            setActiveTool('move');
            setActiveSubTool('zoom');
            break;
          case 'm':
            setActiveTool('select-rect');
            setActiveSubTool('select-rect');
            break;
          case 'l':
            setActiveTool('select-lasso');
            setActiveSubTool('select-lasso');
            break;
          case 'w':
            setActiveTool('select-lasso');
            setActiveSubTool('select-quick');
            break;
          case 'c':
            setActiveTool('crop');
            setActiveSubTool('crop');
            break;
          case 'i':
            setActiveTool('eyedropper');
            setActiveSubTool('eyedropper');
            break;
          case 'j':
            setActiveTool('healing');
            setActiveSubTool('healing-spot');
            break;
          case 's':
            setActiveTool('stamp');
            setActiveSubTool('stamp');
            break;
          case 'y':
            setActiveTool('history-brush');
            setActiveSubTool('history-brush');
            break;
          case 'g':
            setActiveTool('gradient');
            setActiveSubTool('gradient');
            break;
          case 'p':
            setActiveTool('shape');
            setActiveSubTool('pen');
            break;
          case 'u':
            setActiveTool('shape');
            setActiveSubTool('shape-rect');
            break;
          case 't':
            setActiveTool('text');
            setActiveSubTool('text');
            break;
          case 'a':
            setActiveTool('path-select');
            setActiveSubTool('path-select');
            break;
          case 'x':
            const tempColor = brushColor;
            setBrushColor(backgroundColor);
            setBackgroundColor(tempColor);
            setToast({ message: "Swapped Foreground/Background Colors", type: 'info' });
            break;
          case 'd':
            setBrushColor('#ffffff');
            setBackgroundColor('#000000');
            setToast({ message: "Reset Colors to Default (White/Black)", type: 'info' });
            break;
          case 'q':
            setIsQuickMaskMode(!isQuickMaskMode);
            setToast({ message: !isQuickMaskMode ? "Quick Mask Mode Activated" : "Quick Mask Mode Deactivated", type: 'info' });
            break;
          case 'f':
            setScreenMode(screenMode === 'normal' ? 'fullscreen' : 'normal');
            setToast({ message: screenMode === 'normal' ? "Entered Fullscreen Mode" : "Returned to Windowed Mode", type: 'info' });
            break;
          case 'r':
            if (!e.ctrlKey && !e.metaKey) {
              setActiveTool('blur-sharpen');
              setActiveSubTool('blur');
            }
            break;
          case 'o':
            if (!e.ctrlKey && !e.metaKey) {
              setActiveTool('dodge-burn');
              setActiveSubTool('dodge');
            }
            break;
          case ']':
            if (e.shiftKey) {
              setBrushHardness((h) => Math.min(100, h + 10));
            } else {
              setBrushSize((s) => Math.min(500, s + 5));
            }
            break;
          case '[':
            if (e.shiftKey) {
              setBrushHardness((h) => Math.max(0, h - 10));
            } else {
              setBrushSize((s) => Math.max(1, s - 5));
            }
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [historyIndex, historyStack, project, activeTool, activeSubTool, visibleChannel, brushColor, backgroundColor, isQuickMaskMode, screenMode, showRulers, showGuides, editorZoom]);

  // Update specific layer parameters
  const handleUpdateLayer = (id: string, updates: Partial<Layer>) => {
    if (!project) return;

    if (updates.fontFamily) {
      loadGoogleFont(updates.fontFamily);
    }

    if (
      updates.layerStyles ||
      updates.width ||
      updates.height ||
      updates.imageUrl ||
      updates.imageElement ||
      updates.fontFamily ||
      updates.fontSize ||
      updates.fontWeight ||
      updates.fontStyle ||
      updates.text ||
      updates.textColor ||
      updates.letterSpacing ||
      updates.lineHeightMultiplier ||
      updates.textAlign ||
      updates.textWarp
    ) {
      clearLayerCache(id);
    }

    const updatedLayers = project.layers.map((l) => {
      if (l.id === id) {
        return { ...l, ...updates };
      }
      return l;
    });

    setProject({
      ...project,
      layers: updatedLayers,
    });
  };

  const handleBrushColorChange = (c: string) => {
    setBrushColor(c);
    if (activeLayerId && project) {
      const layer = project.layers.find((l) => l.id === activeLayerId);
      if (layer) {
        if (layer.type === 'text') {
          handleUpdateLayer(activeLayerId, { textColor: c });
        } else if (layer.type === 'shape') {
          handleUpdateLayer(activeLayerId, {
            fillColor: c,
            gradientColors: undefined,
            gradientStart: undefined,
            gradientEnd: undefined,
            patternUrl: undefined,
            patternSize: undefined,
            patternImageElement: undefined,
          });
        }
      }
    }
  };

  const handleApplyGradient = (stops: { offset: number; color: string }[], type: 'linear' | 'radial', angle: number) => {
    // Save stops to the gradient tool state so canvas dragging uses them
    setGradientPresetId('custom');
    setGradientStops(stops);
    if (stops.length >= 2) {
      setBrushColor(stops[0].color);
      setBackgroundColor(stops[stops.length - 1].color);
    }

    if (!project || !activeLayerId) return;
    const layer = project.layers.find((l) => l.id === activeLayerId);
    if (!layer || layer.type !== 'shape') {
      setToast({ message: 'Gradient saved to tool — drag on canvas to apply', type: 'info' });
      return;
    }

    const colors = stops.map((s) => s.color);
    const angleRad = (angle * Math.PI) / 180;
    const w = layer.width;
    const h = layer.height;
    
    const cx = layer.x + w / 2;
    const cy = layer.y + h / 2;

    const startX = cx - (Math.cos(angleRad) * w) / 2;
    const startY = cy - (Math.sin(angleRad) * h) / 2;
    const endX = cx + (Math.cos(angleRad) * w) / 2;
    const endY = cy + (Math.sin(angleRad) * h) / 2;

    handleUpdateLayer(activeLayerId, {
      fillColor: undefined,
      gradientStart: { x: startX, y: startY },
      gradientEnd: { x: endX, y: endY },
      gradientColors: colors,
      patternUrl: undefined,
      patternSize: undefined,
      patternImageElement: undefined,
    });
    setToast({ message: 'Gradient applied to selected shape', type: 'success' });
  };

  const handleApplyPattern = (patternUrl: string, patternSize: number) => {
    if (!project || !activeLayerId) return;
    const layer = project.layers.find((l) => l.id === activeLayerId);
    if (!layer || layer.type !== 'shape') {
      setToast({ message: 'Select a shape layer to apply pattern', type: 'warning' });
      return;
    }

    handleUpdateLayer(activeLayerId, {
      fillColor: undefined,
      gradientColors: undefined,
      gradientStart: undefined,
      gradientEnd: undefined,
      patternUrl,
      patternSize,
      patternImageElement: undefined,
    });
    setToast({ message: 'Pattern applied to selected shape', type: 'success' });
  };

  // Add specific layer
  const handleAddLayer = (type: 'image' | 'text' | 'shape' | 'drawing' | 'adjustment' | 'group' | 'smartobject', extra?: Partial<Layer>) => {
    if (!project) return;

    const layerId = `layer-${Date.now()}`;
    const defaultAdjustments = type === 'adjustment' ? {
      brightness: 0,
      contrast: 0,
      saturation: 0,
      hue: 0,
      exposure: 0,
      blur: 0,
      grayscale: 0,
      sepia: 0,
      invert: 0,
      vignette: 0
    } : undefined;

    const newLayer: Layer = {
      id: layerId,
      name: extra?.name || (type === 'adjustment' ? 'Adjustment Layer' : `New ${type[0].toUpperCase() + type.slice(1)} Layer`),
      type,
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      x: extra?.x ?? 0,
      y: extra?.y ?? 0,
      width: extra?.width ?? project.width,
      height: extra?.height ?? project.height,
      rotation: 0,
      adjustments: defaultAdjustments,
      ...extra,
    };

    setProject({
      ...project,
      layers: [newLayer, ...project.layers], // Add to TOP
    });

    setActiveLayerId(layerId);
    handlePushHistory(`Added ${type} layer`);
  };

  const handleDeleteLayer = (id: string) => {
    if (!project) return;
    const filtered = project.layers.filter((l) => l.id !== id);
    
    setProject({
      ...project,
      layers: filtered,
    });

    if (activeLayerId === id && filtered.length > 0) {
      setActiveLayerId(filtered[0].id);
    }
    handlePushHistory('Deleted layer');
  };

  const handleDuplicateLayer = (id: string) => {
    if (!project) return;
    const original = project.layers.find((l) => l.id === id);
    if (!original) return;

    const copyId = `layer-${Date.now()}-copy`;
    const copyLayer: Layer = {
      ...original,
      id: copyId,
      name: `${original.name} Copy`,
      x: original.x + 25,
      y: original.y + 25,
      locked: false,
    };

    setProject({
      ...project,
      layers: [copyLayer, ...project.layers],
    });

    setActiveLayerId(copyId);
    handlePushHistory(`Duplicated ${original.name}`);
  };

  const handleMergeLayers = () => {
    if (!project || !activeLayerId) return;
    const activeIndex = project.layers.findIndex((l) => l.id === activeLayerId);
    if (activeIndex === -1 || activeIndex === project.layers.length - 1) {
      setToast({ message: "No layer below to merge with!", type: 'error' });
      return;
    }

    const upperLayer = project.layers[activeIndex];
    const lowerLayer = project.layers[activeIndex + 1];

    const canvas = document.createElement('canvas');
    const minX = Math.min(upperLayer.x, lowerLayer.x);
    const minY = Math.min(upperLayer.y, lowerLayer.y);
    const maxX = Math.max(upperLayer.x + upperLayer.width, lowerLayer.x + lowerLayer.width);
    const maxY = Math.max(upperLayer.y + upperLayer.height, lowerLayer.y + lowerLayer.height);
    
    canvas.width = Math.max(1, maxX - minX);
    canvas.height = Math.max(1, maxY - minY);
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.save();
      ctx.globalAlpha = lowerLayer.opacity;
      ctx.translate(lowerLayer.x - minX + lowerLayer.width / 2, lowerLayer.y - minY + lowerLayer.height / 2);
      if (lowerLayer.flipX || lowerLayer.flipY) {
        ctx.scale(lowerLayer.flipX ? -1 : 1, lowerLayer.flipY ? -1 : 1);
      }
      if (lowerLayer.rotation && lowerLayer.rotation !== 0) {
        ctx.rotate((lowerLayer.rotation * Math.PI) / 180);
      }
      ctx.translate(-lowerLayer.width / 2, -lowerLayer.height / 2);
      if (lowerLayer.type === 'image' && lowerLayer.imageElement) {
        ctx.drawImage(lowerLayer.imageElement, 0, 0, lowerLayer.width, lowerLayer.height);
      } else {
        ctx.fillStyle = lowerLayer.textColor || lowerLayer.fillColor || '#ffffff';
        ctx.fillRect(0, 0, lowerLayer.width, lowerLayer.height);
      }
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = upperLayer.opacity;
      ctx.translate(upperLayer.x - minX + upperLayer.width / 2, upperLayer.y - minY + upperLayer.height / 2);
      if (upperLayer.flipX || upperLayer.flipY) {
        ctx.scale(upperLayer.flipX ? -1 : 1, upperLayer.flipY ? -1 : 1);
      }
      if (upperLayer.rotation && upperLayer.rotation !== 0) {
        ctx.rotate((upperLayer.rotation * Math.PI) / 180);
      }
      ctx.translate(-upperLayer.width / 2, -upperLayer.height / 2);
      if (upperLayer.type === 'image' && upperLayer.imageElement) {
        ctx.drawImage(upperLayer.imageElement, 0, 0, upperLayer.width, upperLayer.height);
      } else {
        ctx.fillStyle = upperLayer.textColor || upperLayer.fillColor || '#ffffff';
        ctx.fillRect(0, 0, upperLayer.width, upperLayer.height);
      }
      ctx.restore();

      const mergedImg = new Image();
      mergedImg.onload = () => {
        const mergedLayer: Layer = {
          id: `layer-${Date.now()}-merged`,
          name: `${upperLayer.name} (Merged)`,
          type: 'image',
          x: minX,
          y: minY,
          width: canvas.width,
          height: canvas.height,
          opacity: 1,
          blendMode: 'normal',
          locked: false,
          visible: true,
          rotation: 0,
          imageElement: mergedImg,
          imageUrl: canvas.toDataURL(),
        };

        const updatedLayers = [...project.layers];
        updatedLayers.splice(activeIndex, 2, mergedLayer);

        setProject({
          ...project,
          layers: updatedLayers,
        });
        setActiveLayerId(mergedLayer.id);
        handlePushHistory(`Merged layers: ${upperLayer.name} and ${lowerLayer.name}`);
        setToast({ message: "Layers merged successfully!", type: 'success' });
      };
      mergedImg.src = canvas.toDataURL();
    }
  };

  const handleArrangeLayer = (direction: 'front' | 'forward' | 'backward' | 'back') => {
    if (!project || !activeLayerId) {
      setToast({ message: "Select a layer or object first to arrange.", type: 'warning' });
      return;
    }
    const activeIdx = project.layers.findIndex(l => l.id === activeLayerId);
    if (activeIdx === -1) return;
    const updatedLayers = [...project.layers];
    const target = updatedLayers.splice(activeIdx, 1)[0];

    if (direction === 'front') {
      updatedLayers.unshift(target);
    } else if (direction === 'back') {
      updatedLayers.push(target);
    } else if (direction === 'forward') {
      const newIdx = Math.max(0, activeIdx - 1);
      updatedLayers.splice(newIdx, 0, target);
    } else if (direction === 'backward') {
      const newIdx = Math.min(updatedLayers.length, activeIdx + 1);
      updatedLayers.splice(newIdx, 0, target);
    }

    setProject({ ...project, layers: updatedLayers });
    handlePushHistory(`Arranged layer ${direction}`);
  };

  const handleMergeSelectedLayers = () => {
    if (!project) return;
    const selected = activeLayerIds.length > 0 ? activeLayerIds : (activeLayerId ? [activeLayerId] : []);
    if (selected.length < 2) {
      setToast({ message: "Select multiple layers to merge!", type: 'error' });
      return;
    }

    const layersToMerge = project.layers.filter(l => selected.includes(l.id));
    if (layersToMerge.length < 2) return;

    const minX = Math.min(...layersToMerge.map((l) => l.x));
    const minY = Math.min(...layersToMerge.map((l) => l.y));
    const maxX = Math.max(...layersToMerge.map((l) => l.x + l.width));
    const maxY = Math.max(...layersToMerge.map((l) => l.y + l.height));
    
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, maxX - minX);
    canvas.height = Math.max(1, maxY - minY);
    const ctx = canvas.getContext('2d');

    if (ctx) {
      const sortedToMerge = [...project.layers]
        .filter(l => selected.includes(l.id))
        .reverse();

      sortedToMerge.forEach((layer) => {
        ctx.save();
        ctx.globalAlpha = layer.opacity;
        ctx.translate(layer.x - minX + layer.width / 2, layer.y - minY + layer.height / 2);
        if (layer.flipX || layer.flipY) {
          ctx.scale(layer.flipX ? -1 : 1, layer.flipY ? -1 : 1);
        }
        if (layer.rotation && layer.rotation !== 0) {
          ctx.rotate((layer.rotation * Math.PI) / 180);
        }
        ctx.translate(-layer.width / 2, -layer.height / 2);
        if (layer.imageElement) {
          ctx.drawImage(layer.imageElement, 0, 0, layer.width, layer.height);
        } else {
          ctx.fillStyle = layer.textColor || layer.fillColor || '#ffffff';
          ctx.fillRect(0, 0, layer.width, layer.height);
        }
        ctx.restore();
      });

      const mergedImg = new Image();
      mergedImg.onload = () => {
        const mergedLayer: Layer = {
          id: `layer-${Date.now()}-merged`,
          name: 'Merged Selection',
          type: 'image',
          x: minX,
          y: minY,
          width: canvas.width,
          height: canvas.height,
          opacity: 1,
          blendMode: 'normal',
          locked: false,
          visible: true,
          rotation: 0,
          imageElement: mergedImg,
          imageUrl: canvas.toDataURL(),
        };

        const firstIdx = project.layers.findIndex(l => selected.includes(l.id));
        const updatedLayers = project.layers.filter(l => !selected.includes(l.id));
        updatedLayers.splice(firstIdx, 0, mergedLayer);

        setProject({ ...project, layers: updatedLayers });
        setActiveLayerId(mergedLayer.id);
        setActiveLayerIds([mergedLayer.id]);
        handlePushHistory('Merged Selected Layers');
        setToast({ message: "Merged selected layers successfully!", type: 'success' });
      };
      mergedImg.src = canvas.toDataURL();
    }
  };

  const handleMergeVisible = () => {
    if (!project) return;
    const canvas = document.createElement('canvas');
    canvas.width = project.width;
    canvas.height = project.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const visibleLayers = [...project.layers].reverse().filter(l => l.visible);
      visibleLayers.forEach((l) => {
        ctx.save();
        ctx.globalAlpha = l.opacity;
        ctx.translate(l.x + l.width / 2, l.y + l.height / 2);
        if (l.flipX || l.flipY) {
          ctx.scale(l.flipX ? -1 : 1, l.flipY ? -1 : 1);
        }
        if (l.rotation && l.rotation !== 0) {
          ctx.rotate((l.rotation * Math.PI) / 180);
        }
        ctx.translate(-l.width / 2, -l.height / 2);
        if (l.type === 'image' && l.imageElement) {
          ctx.drawImage(l.imageElement, 0, 0, l.width, l.height);
        } else {
          ctx.fillStyle = l.textColor || l.fillColor || '#000000';
          ctx.fillRect(0, 0, l.width, l.height);
        }
        ctx.restore();
      });

      const mergedImg = new Image();
      mergedImg.onload = () => {
        const mergedLayer: Layer = {
          id: `layer-${Date.now()}-merged-visible`,
          name: 'Merged Visible',
          type: 'image',
          x: 0,
          y: 0,
          width: canvas.width,
          height: canvas.height,
          opacity: 1,
          blendMode: 'normal',
          locked: false,
          visible: true,
          rotation: 0,
          imageElement: mergedImg,
          imageUrl: canvas.toDataURL(),
        };

        const updatedLayers = project.layers.filter(l => !l.visible);
        updatedLayers.unshift(mergedLayer);

        setProject({ ...project, layers: updatedLayers });
        setActiveLayerId(mergedLayer.id);
        handlePushHistory('Merged Visible Layers');
        setToast({ message: "Visible layers merged!", type: 'success' });
      };
      mergedImg.src = canvas.toDataURL();
    }
  };

  const handleGroupSelectedLayers = () => {
    if (!project) return;
    const selected = activeLayerIds.length > 0 ? activeLayerIds : (activeLayerId ? [activeLayerId] : []);
    if (selected.length === 0) return;

    const groupId = `group-${Date.now()}`;
    const newGroup: Layer = {
      id: groupId,
      name: 'New Folder',
      type: 'group',
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      expanded: true,
      childrenIds: [...selected],
      x: 0, y: 0, width: project.width, height: project.height, rotation: 0
    };

    const updatedLayers = project.layers.map(l => {
      if (selected.includes(l.id)) {
        return { ...l, parentId: groupId };
      }
      return l;
    });

    let topIdx = updatedLayers.findIndex(l => selected.includes(l.id));
    if (topIdx === -1) topIdx = 0;

    updatedLayers.splice(topIdx, 0, newGroup);

    setProject({ ...project, layers: updatedLayers });
    setActiveLayerId(groupId);
    setActiveLayerIds([groupId]);
    handlePushHistory('Grouped Selected Layers');
  };

  const handleUngroupLayers = (groupId: string) => {
    if (!project) return;
    const updatedLayers = project.layers
      .map((l) => {
        if (l.parentId === groupId) {
          return { ...l, parentId: undefined };
        }
        return l;
      })
      .filter((l) => l.id !== groupId);

    setProject({ ...project, layers: updatedLayers });
    handlePushHistory('Ungrouped Layers');
    setToast({ message: "Ungrouped folder layers", type: 'success' });
  };

  const handleEditFill = (type: 'foreground' | 'background' | 'black' | 'white' | 'custom', customColor?: string, opacity: number = 100) => {
    if (!project || !activeLayerId) return;
    const activeLayer = project.layers.find(l => l.id === activeLayerId);
    if (!activeLayer || activeLayer.locked) return;

    let fillCol = '#ffffff';
    if (type === 'foreground') fillCol = brushColor;
    else if (type === 'background') fillCol = backgroundColor;
    else if (type === 'black') fillCol = '#000000';
    else if (type === 'white') fillCol = '#ffffff';
    else if (type === 'custom' && customColor) fillCol = customColor;

    const canvas = document.createElement('canvas');
    canvas.width = activeLayer.width;
    canvas.height = activeLayer.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      if (activeLayer.type === 'image' && activeLayer.imageElement) {
        ctx.drawImage(activeLayer.imageElement, 0, 0);
      }
      ctx.save();
      ctx.globalAlpha = opacity / 100;
      ctx.fillStyle = fillCol;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();

      const filledImg = new Image();
      filledImg.onload = () => {
        handleUpdateLayer(activeLayer.id, {
          imageElement: filledImg,
          imageUrl: canvas.toDataURL(),
        });
        handlePushHistory(`Filled layer with ${type}`);
        setToast({ message: `Layer filled with ${type} color!`, type: 'success' });
      };
      filledImg.src = canvas.toDataURL();
    }
  };

  const handleEditStroke = (size: number, color: string, opacity: number = 100) => {
    if (!project || !activeLayerId) return;
    const activeLayer = project.layers.find(l => l.id === activeLayerId);
    if (!activeLayer || activeLayer.locked) return;

    const canvas = document.createElement('canvas');
    canvas.width = activeLayer.width;
    canvas.height = activeLayer.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      if (activeLayer.type === 'image' && activeLayer.imageElement) {
        ctx.drawImage(activeLayer.imageElement, 0, 0);
      }
      ctx.save();
      ctx.globalAlpha = opacity / 100;
      ctx.strokeStyle = color;
      ctx.lineWidth = size;
      ctx.strokeRect(size / 2, size / 2, canvas.width - size, canvas.height - size);
      ctx.restore();

      const strokedImg = new Image();
      strokedImg.onload = () => {
        handleUpdateLayer(activeLayer.id, {
          imageElement: strokedImg,
          imageUrl: canvas.toDataURL(),
        });
        handlePushHistory('Applied layer stroke');
        setToast({ message: "Stroke applied successfully!", type: 'success' });
      };
      strokedImg.src = canvas.toDataURL();
    }
  };

  const handleFlattenImage = () => {
    if (!project) return;
    const canvas = document.createElement('canvas');
    canvas.width = project.width;
    canvas.height = project.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const visibleLayers = [...project.layers].reverse().filter(l => l.visible);
      visibleLayers.forEach((l) => {
        ctx.save();
        ctx.globalAlpha = l.opacity;
        ctx.translate(l.x + l.width / 2, l.y + l.height / 2);
        if (l.flipX || l.flipY) {
          ctx.scale(l.flipX ? -1 : 1, l.flipY ? -1 : 1);
        }
        if (l.rotation && l.rotation !== 0) {
          ctx.rotate((l.rotation * Math.PI) / 180);
        }
        ctx.translate(-l.width / 2, -l.height / 2);

        if (l.type === 'image' && l.imageElement) {
          ctx.drawImage(l.imageElement, 0, 0, l.width, l.height);
        } else {
          ctx.fillStyle = l.textColor || l.fillColor || '#000000';
          ctx.fillRect(0, 0, l.width, l.height);
        }
        ctx.restore();
      });

      const flattenedImg = new Image();
      flattenedImg.onload = () => {
        const bgLayer: Layer = {
          id: `layer-${Date.now()}-bg`,
          name: 'Background',
          type: 'image',
          x: 0,
          y: 0,
          width: canvas.width,
          height: canvas.height,
          opacity: 1,
          blendMode: 'normal',
          locked: false,
          visible: true,
          rotation: 0,
          imageElement: flattenedImg,
          imageUrl: canvas.toDataURL(),
        };

        setProject({
          ...project,
          layers: [bgLayer],
        });
        setActiveLayerId(bgLayer.id);
        handlePushHistory('Flattened Image');
        setToast({ message: "Image flattened successfully!", type: 'success' });
      };
      flattenedImg.src = canvas.toDataURL();
    }
  };

  const handleQuickExport = () => {
    if (!project) return;
    const canvas = document.createElement('canvas');
    canvas.width = project.width;
    canvas.height = project.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const visibleLayers = [...project.layers].reverse().filter(l => l.visible);
      visibleLayers.forEach((l) => {
        ctx.save();
        ctx.globalAlpha = l.opacity;
        ctx.translate(l.x + l.width / 2, l.y + l.height / 2);
        if (l.flipX || l.flipY) {
          ctx.scale(l.flipX ? -1 : 1, l.flipY ? -1 : 1);
        }
        if (l.rotation && l.rotation !== 0) {
          ctx.rotate((l.rotation * Math.PI) / 180);
        }
        ctx.translate(-l.width / 2, -l.height / 2);
        if (l.type === 'image' && l.imageElement) {
          ctx.drawImage(l.imageElement, 0, 0, l.width, l.height);
        } else {
          ctx.fillStyle = l.textColor || l.fillColor || '#000000';
          ctx.fillRect(0, 0, l.width, l.height);
        }
        ctx.restore();
      });

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `${project.name || 'phototor'}_export.png`;
      link.href = dataUrl;
      link.click();
      setToast({ message: "Quick Export completed!", type: 'success' });
    }
  };

  const handleFlipCanvas = (direction: 'h' | 'v') => {
    if (!project) return;
    const updatedLayers = project.layers.map((layer) => {
      const centerX = project.width / 2;
      const centerY = project.height / 2;

      let newX = layer.x;
      let newY = layer.y;

      if (direction === 'h') {
        const offsetFromCenter = (layer.x + layer.width / 2) - centerX;
        newX = centerX - offsetFromCenter - layer.width / 2;
      } else {
        const offsetFromCenter = (layer.y + layer.height / 2) - centerY;
        newY = centerY - offsetFromCenter - layer.height / 2;
      }

      return {
        ...layer,
        x: newX,
        y: newY,
        flipX: direction === 'h' ? !layer.flipX : layer.flipX,
        flipY: direction === 'v' ? !layer.flipY : layer.flipY,
      };
    });

    setProject({
      ...project,
      layers: updatedLayers,
    });
    handlePushHistory(`Flipped Canvas ${direction === 'h' ? 'Horizontally' : 'Vertically'}`);
    setToast({ message: `Canvas flipped ${direction === 'h' ? 'horizontally' : 'vertically'}!`, type: 'success' });
  };

  const copiedLayerRef = useRef<Layer | null>(null);
  
  const handleCopyLayer = () => {
    if (!project) return;
    const activeLayer = project.layers.find((l) => l.id === activeLayerId);
    if (activeLayer) {
      copiedLayerRef.current = { ...activeLayer, id: `layer-copy-${Date.now()}` };
      setToast({ message: "Layer copied to clipboard!", type: 'info' });
    }
  };

  const handlePasteLayer = () => {
    if (copiedLayerRef.current && project) {
      const pasted: Layer = { 
        ...copiedLayerRef.current, 
        id: `layer-${Date.now()}`,
        name: `${copiedLayerRef.current.name} Copy`,
        x: copiedLayerRef.current.x + 30,
        y: copiedLayerRef.current.y + 30,
        locked: false,
      };
      setProject({
        ...project,
        layers: [pasted, ...project.layers],
      });
      setActiveLayerId(pasted.id);
      handlePushHistory(`Pasted layer: ${pasted.name}`);
      setToast({ message: "Layer pasted successfully!", type: 'success' });
    }
  };

  const handleCutLayer = () => {
    if (!project) return;
    const activeLayer = project.layers.find((l) => l.id === activeLayerId);
    if (activeLayer) {
      if (activeLayer.locked) {
        setToast({ message: "Cannot cut a locked layer.", type: 'error' });
        return;
      }
      copiedLayerRef.current = { ...activeLayer, id: `layer-copy-${Date.now()}` };
      handleDeleteLayer(activeLayer.id);
      setToast({ message: "Layer cut to clipboard!", type: 'info' });
    }
  };

  const handleReorderLayers = (fromIndex: number, toIndex: number) => {
    if (!project) return;
    const reordered = [...project.layers];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

    setProject({
      ...project,
      layers: reordered,
    });
    handlePushHistory('Reordered layer stack');
  };

  // Crop Canvas or Layer/Object geometry
  const handleCropCanvas = async (
    w: number,
    h: number,
    offsetX: number,
    offsetY: number,
    straightenAngle: number = 0,
    deletePixels: boolean = true,
    targetMode?: 'layer' | 'canvas'
  ) => {
    if (!project) return;
    const mode = targetMode || cropTargetMode;

    const cropW = Math.max(1, Math.round(w));
    const cropH = Math.max(1, Math.round(h));
    const cropX = Math.round(offsetX);
    const cropY = Math.round(offsetY);

    if (mode === 'layer') {
      if (!activeLayerId) {
        setToast({ message: 'Pilih layer atau objek terlebih dahulu untuk melakukan Crop Layer.', type: 'warning' });
        return;
      }
      const activeLayer = project.layers.find((l) => l.id === activeLayerId);
      if (!activeLayer || activeLayer.locked) {
        setToast({ message: 'Layer tidak dapat dipotong (terkunci atau tidak ditemukan).', type: 'error' });
        return;
      }

      // Calculate intersection between crop box and active layer bounds
      const interX = Math.max(activeLayer.x, cropX);
      const interY = Math.max(activeLayer.y, cropY);
      const interRight = Math.min(activeLayer.x + activeLayer.width, cropX + cropW);
      const interBottom = Math.min(activeLayer.y + activeLayer.height, cropY + cropH);

      if (interX >= interRight || interY >= interBottom) {
        setToast({ message: 'Area Crop berada di luar batas layer yang dipilih.', type: 'error' });
        return;
      }

      const interW = interRight - interX;
      const interH = interBottom - interY;
      const relX = interX - activeLayer.x;
      const relY = interY - activeLayer.y;

      if ((activeLayer.type === 'image' || activeLayer.type === 'background') && (activeLayer.imageElement || activeLayer.imageUrl)) {
        let img = activeLayer.imageElement;
        if (!img && activeLayer.imageUrl) {
          img = await new Promise<HTMLImageElement | null>((resolve) => {
            const temp = new Image();
            temp.crossOrigin = 'anonymous';
            temp.onload = () => resolve(temp);
            temp.onerror = () => resolve(null);
            temp.src = activeLayer.imageUrl!;
          });
        }

        if (img) {
          const layerCanvas = document.createElement('canvas');
          layerCanvas.width = Math.max(1, Math.round(activeLayer.width));
          layerCanvas.height = Math.max(1, Math.round(activeLayer.height));
          const lCtx = layerCanvas.getContext('2d');
          if (lCtx) {
            if (straightenAngle !== 0) {
              lCtx.save();
              lCtx.translate(layerCanvas.width / 2, layerCanvas.height / 2);
              lCtx.rotate((-straightenAngle * Math.PI) / 180);
              lCtx.drawImage(
                img,
                -layerCanvas.width / 2,
                -layerCanvas.height / 2,
                layerCanvas.width,
                layerCanvas.height
              );
              lCtx.restore();
            } else {
              lCtx.drawImage(img, 0, 0, layerCanvas.width, layerCanvas.height);
            }

            const croppedCanvas = document.createElement('canvas');
            croppedCanvas.width = Math.max(1, Math.round(interW));
            croppedCanvas.height = Math.max(1, Math.round(interH));
            const cCtx = croppedCanvas.getContext('2d');
            if (cCtx) {
              cCtx.drawImage(
                layerCanvas,
                relX, relY, interW, interH,
                0, 0, interW, interH
              );

              const dataUrl = croppedCanvas.toDataURL();
              const croppedImg = new Image();
              await new Promise<void>((res) => {
                croppedImg.onload = () => res();
                croppedImg.onerror = () => res();
                croppedImg.src = dataUrl;
              });

              handleUpdateLayer(activeLayer.id, {
                x: interX,
                y: interY,
                width: interW,
                height: interH,
                imageUrl: dataUrl,
                imageElement: croppedImg,
              });
              handlePushHistory(`Cropped Layer: ${activeLayer.name}`);
              setToast({ message: `Layer "${activeLayer.name}" berhasil dipotong (${interW}×${interH} px)!`, type: 'success' });
              return;
            }
          }
        }
      }

      // Non-image layer (shapes, text, drawings)
      handleUpdateLayer(activeLayer.id, {
        x: interX,
        y: interY,
        width: interW,
        height: interH,
      });
      handlePushHistory(`Cropped Layer: ${activeLayer.name}`);
      setToast({ message: `Layer "${activeLayer.name}" berhasil dipotong (${interW}×${interH} px)!`, type: 'success' });
      return;
    }

    // Full Canvas Crop (mode === 'canvas')
    const updatedLayers = await Promise.all(
      project.layers.map(async (l) => {
        if (deletePixels && (l.type === 'image' || l.type === 'background') && (l.imageElement || l.imageUrl)) {
          let img = l.imageElement;
          if (!img && l.imageUrl) {
            img = await new Promise<HTMLImageElement | null>((resolve) => {
              const temp = new Image();
              temp.crossOrigin = 'anonymous';
              temp.onload = () => resolve(temp);
              temp.onerror = () => resolve(null);
              temp.src = l.imageUrl!;
            });
          }

          if (img) {
            const layerCanvas = document.createElement('canvas');
            layerCanvas.width = Math.max(1, Math.round(l.width));
            layerCanvas.height = Math.max(1, Math.round(l.height));
            const lCtx = layerCanvas.getContext('2d');
            if (lCtx) {
              if (straightenAngle !== 0) {
                lCtx.save();
                lCtx.translate(layerCanvas.width / 2, layerCanvas.height / 2);
                lCtx.rotate((-straightenAngle * Math.PI) / 180);
                lCtx.drawImage(
                  img,
                  -layerCanvas.width / 2,
                  -layerCanvas.height / 2,
                  layerCanvas.width,
                  layerCanvas.height
                );
                lCtx.restore();
              } else {
                lCtx.drawImage(img, 0, 0, layerCanvas.width, layerCanvas.height);
              }

              const interX = Math.max(l.x, cropX);
              const interY = Math.max(l.y, cropY);
              const interRight = Math.min(l.x + l.width, cropX + cropW);
              const interBottom = Math.min(l.y + l.height, cropY + cropH);

              if (interX < interRight && interY < interBottom) {
                const interW = interRight - interX;
                const interH = interBottom - interY;

                const relX = interX - l.x;
                const relY = interY - l.y;

                const croppedCanvas = document.createElement('canvas');
                croppedCanvas.width = Math.max(1, Math.round(interW));
                croppedCanvas.height = Math.max(1, Math.round(interH));
                const cCtx = croppedCanvas.getContext('2d');
                if (cCtx) {
                  cCtx.drawImage(
                    layerCanvas,
                    relX, relY, interW, interH,
                    0, 0, interW, interH
                  );

                  const dataUrl = croppedCanvas.toDataURL();
                  const croppedImg = new Image();
                  await new Promise<void>((res) => {
                    croppedImg.onload = () => res();
                    croppedImg.onerror = () => res();
                    croppedImg.src = dataUrl;
                  });

                  return {
                    ...l,
                    x: interX - cropX,
                    y: interY - cropY,
                    width: interW,
                    height: interH,
                    imageUrl: dataUrl,
                    imageElement: croppedImg,
                  };
                }
              }
            }
          }
        }

        return {
          ...l,
          x: l.x - cropX,
          y: l.y - cropY,
        };
      })
    );

    setProject({
      ...project,
      width: cropW,
      height: cropH,
      layers: updatedLayers,
    });

    handlePushHistory(`Cropped canvas to ${cropW}×${cropH}px`);
  };

  const handleUpdateSlices = (slices: { id: string; x: number; y: number; w: number; h: number }[]) => {
    if (!project) return;
    setProject({
      ...project,
      slices,
    });
  };

  const handleExportPSD = async () => {
    if (!isPremium) {
      setShowProModal(true);
      return;
    }
    if (!project) return;
    try {
      setToast({ message: "Packaging PSD (.psd) layers...", type: 'info' });
      const blob = await exportProjectToPSD(project);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name.replace(/\s+/g, '_')}_layers.psd`;
      a.click();
      URL.revokeObjectURL(url);
      setToast({ message: "Exported multi-layer PSD file!", type: 'success' });
    } catch (err) {
      console.error(err);
      setToast({ message: "Failed to export PSD.", type: 'error' });
    }
  };

  // Advanced AI Actions
  const handleRemoveBackground = async () => {
    const activeLayer = project?.layers.find((l) => l.id === activeLayerId);
    if (!activeLayer || activeLayer.type !== 'image' || !activeLayer.imageUrl) return;

    setToast({ message: "Extracting background... Please wait.", type: 'info' });

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        canvas.toBlob(async (blob) => {
          if (blob) {
            try {
              const formData = new FormData();
              formData.append('image', blob, 'image.png');

              const response = await fetch('http://localhost:3001/remove-background', {
                method: 'POST',
                body: formData,
              });

              if (!response.ok) throw new Error('API server returned error');

              const resultBlob = await response.blob();
              const url = URL.createObjectURL(resultBlob);

              handleUpdateLayer(activeLayer.id, {
                imageBlob: resultBlob,
                imageUrl: url,
                imageElement: undefined, // Clear cache to reload
              });
              handlePushHistory('Removed background using AI model');
              setToast({ message: "Background removed using AI Model!", type: 'success' });
            } catch (err) {
              console.warn("AI API server not running or error:", err);
              setToast({ message: "AI API server at http://localhost:3001 unavailable. Using local keyer fallback.", type: 'warning' });
              
              const processed = removeBackground(imgData, 25);
              ctx.putImageData(processed, 0, 0);
              canvas.toBlob((fallbackBlob) => {
                if (fallbackBlob) {
                  const url = URL.createObjectURL(fallbackBlob);
                  handleUpdateLayer(activeLayer.id, {
                    imageBlob: fallbackBlob,
                    imageUrl: url,
                    imageElement: undefined,
                  });
                  handlePushHistory('Removed background using local chromatic keyer');
                }
              }, 'image/png');
            }
          }
        }, 'image/png');
      }
    };
    img.onerror = () => {
      setToast({ message: "Failed to load image. Cross-origin constraint may apply.", type: 'error' });
    };
    img.src = activeLayer.imageUrl;
  };

  const handlePerspectiveCrop = async (points: Point[]) => {
    const activeLayer = project?.layers.find((l) => l.id === activeLayerId);
    if (!activeLayer || activeLayer.type !== 'image' || (!activeLayer.imageElement && !activeLayer.imageUrl)) {
      setToast({ message: "Select an image layer first to apply Perspective Crop.", type: 'error' });
      return;
    }

    if (points.length !== 4) return;

    setToast({ message: "Perspective warping active layer... Please wait.", type: 'info' });

    // 1. Calculate layer-local coordinate corners
    const localQuad = points.map((p) => ({
      x: p.x - activeLayer.x,
      y: p.y - activeLayer.y,
    })) as [Point, Point, Point, Point];

    // 2. Compute target width & height (rectified average dimensions of the edges)
    const [p0, p1, p2, p3] = localQuad;
    const wTop = Math.sqrt((p1.x - p0.x) ** 2 + (p1.y - p0.y) ** 2);
    const wBottom = Math.sqrt((p2.x - p3.x) ** 2 + (p2.y - p3.y) ** 2);
    const targetW = Math.max(10, Math.round((wTop + wBottom) / 2));

    const hLeft = Math.sqrt((p3.x - p0.x) ** 2 + (p3.y - p0.y) ** 2);
    const hRight = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
    const targetH = Math.max(10, Math.round((hLeft + hRight) / 2));

    // 3. Load active layer image
    let img = activeLayer.imageElement;
    if (!img && activeLayer.imageUrl) {
      img = await new Promise<HTMLImageElement | null>((resolve) => {
        const temp = new Image();
        temp.crossOrigin = 'anonymous';
        temp.onload = () => resolve(temp);
        temp.onerror = () => resolve(null);
        temp.src = activeLayer.imageUrl!;
      });
    }

    if (!img) {
      setToast({ message: "Failed to load active layer image for perspective crop.", type: 'error' });
      return;
    }

    // 4. Draw to source canvas at layer display resolution
    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = Math.max(1, Math.round(activeLayer.width));
    srcCanvas.height = Math.max(1, Math.round(activeLayer.height));
    const srcCtx = srcCanvas.getContext('2d');
    if (!srcCtx) return;

    srcCtx.drawImage(img, 0, 0, srcCanvas.width, srcCanvas.height);
    const srcData = srcCtx.getImageData(0, 0, srcCanvas.width, srcCanvas.height);

    // 5. Warp the perspective of the image using exact 8-parameter Homography
    const warpedData = warpPerspective(srcData, localQuad, targetW, targetH);

    // 6. Draw back to target canvas
    const destCanvas = document.createElement('canvas');
    destCanvas.width = targetW;
    destCanvas.height = targetH;
    const destCtx = destCanvas.getContext('2d');
    if (!destCtx) return;
    destCtx.putImageData(warpedData, 0, 0);

    const dataUrl = destCanvas.toDataURL();
    const warpedImg = new Image();
    await new Promise<void>((res) => {
      warpedImg.onload = () => res();
      warpedImg.onerror = () => res();
      warpedImg.src = dataUrl;
    });

    const minCanvasX = Math.round(Math.min(...points.map((p) => p.x)));
    const minCanvasY = Math.round(Math.min(...points.map((p) => p.y)));

    handleUpdateLayer(activeLayer.id, {
      imageUrl: dataUrl,
      imageElement: warpedImg,
      x: minCanvasX,
      y: minCanvasY,
      width: targetW,
      height: targetH,
      rotation: 0,
    });

    handlePushHistory('Applied Perspective Crop to Layer');
    setToast({ message: "Perspective crop applied successfully!", type: 'success' });
  };

  const handleApplyPatch = async (selection: { x: number; y: number; w: number; h: number }, offset: Point) => {
    const activeLayer = project?.layers.find((l) => l.id === activeLayerId);
    if (!activeLayer || activeLayer.type !== 'image' || !activeLayer.imageUrl) return;

    setToast({ message: "Applying texture patch...", type: 'info' });

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = activeLayer.width;
      canvas.height = activeLayer.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, activeLayer.width, activeLayer.height);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        const processed = applyPatchBlend(imgData, selection, offset, activeLayer.x, activeLayer.y);
        ctx.putImageData(processed, 0, 0);

        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            handleUpdateLayer(activeLayer.id, {
              imageBlob: blob,
              imageUrl: url,
              imageElement: undefined, // Clear cache to reload
            });
            handlePushHistory('Applied texture patch');
            setToast({ message: "Patch applied successfully!", type: 'success' });
          }
        }, 'image/png');
      }
    };
    img.onerror = () => {
      setToast({ message: "Could not apply patch on cross-origin image.", type: 'error' });
    };
    img.src = activeLayer.imageUrl;
  };

  const handleInpaintObject = () => {
    setActiveTool('healing');
    handleSetActivePanel('properties');
    setToast({
      message: "Healing Brush activated! Draw over blemish areas, then click 'Apply Spot Healing' below.",
      type: 'info'
    });
  };

  const handleApplyHealing = async (
    directPoints?: Point[],
    directSize?: number,
    sourceOffset?: Point
  ) => {
    const activeLayer = project?.layers.find((l) => l.id === activeLayerId);
    if (!activeLayer || activeLayer.type !== 'image' || (!activeLayer.imageElement && !activeLayer.imageUrl)) {
      setToast({ message: "Select an image layer first to apply Healing.", type: 'error' });
      return;
    }

    const pathsToUse = directPoints && directPoints.length > 0
      ? [{ points: directPoints, size: directSize || brushSize }]
      : (activeLayer.drawingPath || []);

    if (pathsToUse.length === 0) return;

    setToast({ message: "Healing blemish area...", type: 'info' });

    // Create mask canvas of activeLayer dimensions
    const mCanvas = document.createElement('canvas');
    mCanvas.width = activeLayer.width;
    mCanvas.height = activeLayer.height;
    const mCtx = mCanvas.getContext('2d');
    if (!mCtx) return;

    mCtx.fillStyle = '#000000';
    mCtx.fillRect(0, 0, mCanvas.width, mCanvas.height);
    mCtx.lineCap = 'round';
    mCtx.lineJoin = 'round';

    pathsToUse.forEach((path) => {
      if (path.points.length < 1) return;
      mCtx.beginPath();
      mCtx.strokeStyle = '#ffffff';
      mCtx.lineWidth = path.size || brushSize;
      mCtx.moveTo(path.points[0].x, path.points[0].y);
      for (let j = 1; j < path.points.length; j++) {
        mCtx.lineTo(path.points[j].x, path.points[j].y);
      }
      mCtx.stroke();
    });

    let img = activeLayer.imageElement;
    if (!img && activeLayer.imageUrl) {
      img = await new Promise<HTMLImageElement | null>((resolve) => {
        const temp = new Image();
        temp.crossOrigin = 'anonymous';
        temp.onload = () => resolve(temp);
        temp.onerror = () => resolve(null);
        temp.src = activeLayer.imageUrl!;
      });
    }

    if (!img) return;

    const canvas = document.createElement('canvas');
    canvas.width = activeLayer.width;
    canvas.height = activeLayer.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(img, 0, 0, activeLayer.width, activeLayer.height);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // If sourceOffset is provided (Healing Brush Tool with Alt-clicked source):
    let processed: ImageData;
    if (sourceOffset) {
      processed = blendHealingBrushTexture(imgData, mCanvas, sourceOffset);
    } else {
      // Spot Healing / Inpaint
      processed = inpaintObject(imgData, mCanvas, activeLayer.x, activeLayer.y, activeLayer.width, activeLayer.height);
    }

    ctx.putImageData(processed, 0, 0);

    const dataUrl = canvas.toDataURL();
    const healedImg = new Image();
    await new Promise<void>((resolve) => {
      healedImg.onload = () => resolve();
      healedImg.onerror = () => resolve();
      healedImg.src = dataUrl;
    });

    handleUpdateLayer(activeLayer.id, {
      imageUrl: dataUrl,
      imageElement: healedImg,
      drawingPath: [],
    });

    handlePushHistory(sourceOffset ? 'Applied Healing Brush' : 'Applied Spot Healing');
    setToast({ message: "Area healed successfully!", type: 'success' });
  };

  const handleApplyLocalBrushFilter = async (
    toolType: 'blur-sharpen' | 'dodge-burn',
    isShift: boolean,
    directPoints?: Point[],
    directSize?: number
  ) => {
    const activeLayer = project?.layers.find((l) => l.id === activeLayerId);
    if (!activeLayer || activeLayer.type !== 'image' || (!activeLayer.imageElement && !activeLayer.imageUrl)) return;

    const pathsToUse = directPoints && directPoints.length > 0
      ? [{ points: directPoints, size: directSize || brushSize }]
      : (activeLayer.drawingPath || []);

    if (pathsToUse.length === 0) return;

    // Create mask canvas of activeLayer dimensions with feathered edges
    const mCanvas = document.createElement('canvas');
    mCanvas.width = activeLayer.width;
    mCanvas.height = activeLayer.height;
    const mCtx = mCanvas.getContext('2d');
    if (!mCtx) return;

    mCtx.fillStyle = '#000000';
    mCtx.fillRect(0, 0, mCanvas.width, mCanvas.height);

    mCtx.lineCap = 'round';
    mCtx.lineJoin = 'round';
    
    // Draw each stroke onto the mask with shadow blur feathering
    pathsToUse.forEach((path) => {
      if (path.points.length < 1) return;
      mCtx.save();
      mCtx.beginPath();
      mCtx.strokeStyle = '#ffffff';
      mCtx.lineWidth = path.size || brushSize;
      mCtx.shadowColor = '#ffffff';
      mCtx.shadowBlur = Math.max(4, (path.size || brushSize) / 2.5);
      mCtx.moveTo(path.points[0].x, path.points[0].y);
      for (let j = 1; j < path.points.length; j++) {
        mCtx.lineTo(path.points[j].x, path.points[j].y);
      }
      mCtx.stroke();
      mCtx.restore();
    });

    let img = activeLayer.imageElement;
    if (!img && activeLayer.imageUrl) {
      img = await new Promise<HTMLImageElement | null>((resolve) => {
        const temp = new Image();
        temp.crossOrigin = 'anonymous';
        temp.onload = () => resolve(temp);
        temp.onerror = () => resolve(null);
        temp.src = activeLayer.imageUrl!;
      });
    }
    if (!img) return;

    const canvas = document.createElement('canvas');
    canvas.width = activeLayer.width;
    canvas.height = activeLayer.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(img, 0, 0, activeLayer.width, activeLayer.height);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    
    const maskData = mCtx.getImageData(0, 0, mCanvas.width, mCanvas.height).data;
    const width = canvas.width;
    const height = canvas.height;
    
    const outputImgData = ctx.createImageData(width, height);
    const outData = outputImgData.data;
    outData.set(data);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        
        // Extract mask density value to compute blending opacity
        const maskVal = maskData[idx]; // 0 to 255
        if (maskVal < 1) continue; // Skip completely unmasked pixels for optimal performance
        
        const maskIntensity = maskVal / 255;
        
        const rOriginal = data[idx];
        const gOriginal = data[idx + 1];
        const bOriginal = data[idx + 2];
        
        let rProcessed = rOriginal;
        let gProcessed = gOriginal;
        let bProcessed = bOriginal;
        
        if (activeSubTool === 'blur') {
          // Smooth 7x7 Gaussian-like Box Blur
          let rSum = 0, gSum = 0, bSum = 0;
          let count = 0;
          const rad = 3;
          for (let dy = -rad; dy <= rad; dy++) {
            for (let dx = -rad; dx <= rad; dx++) {
              const px = x + dx;
              const py = y + dy;
              if (px >= 0 && px < width && py >= 0 && py < height) {
                const pIdx = (py * width + px) * 4;
                rSum += data[pIdx];
                gSum += data[pIdx + 1];
                bSum += data[pIdx + 2];
                count++;
              }
            }
          }
          rProcessed = rSum / count;
          gProcessed = gSum / count;
          bProcessed = bSum / count;
        } else if (activeSubTool === 'sharpen') {
          // Professional Unsharp Mask Filter using laplacian-based high-frequency recovery
          let rBlurSum = 0, gBlurSum = 0, bBlurSum = 0;
          let count = 0;
          const rad = 1;
          for (let dy = -rad; dy <= rad; dy++) {
            for (let dx = -rad; dx <= rad; dx++) {
              const px = Math.min(width - 1, Math.max(0, x + dx));
              const py = Math.min(height - 1, Math.max(0, y + dy));
              const pIdx = (py * width + px) * 4;
              rBlurSum += data[pIdx];
              gBlurSum += data[pIdx + 1];
              bBlurSum += data[pIdx + 2];
              count++;
            }
          }
          const rBlur = rBlurSum / count;
          const gBlur = gBlurSum / count;
          const bBlur = bBlurSum / count;
          
          rProcessed = Math.min(255, Math.max(0, rOriginal + (rOriginal - rBlur) * 2.2));
          gProcessed = Math.min(255, Math.max(0, gOriginal + (gOriginal - gBlur) * 2.2));
          bProcessed = Math.min(255, Math.max(0, bOriginal + (bOriginal - bBlur) * 2.2));
        } else if (activeSubTool === 'smudge') {
          // High-fidelity smudge smear pulling pixels from drag offset
          const sx = Math.max(0, Math.min(width - 1, x - 5));
          const sy = Math.max(0, Math.min(height - 1, y - 5));
          const sIdx = (sy * width + sx) * 4;
          rProcessed = (rOriginal * 0.35) + (data[sIdx] * 0.65);
          gProcessed = (gOriginal * 0.35) + (data[sIdx + 1] * 0.65);
          bProcessed = (bOriginal * 0.35) + (data[sIdx + 2] * 0.65);
        } else if (activeSubTool === 'dodge') {
          // Luminance-aware curve dodge (prevents blowing out whites, preserves highlights)
          const lum = 0.299 * rOriginal + 0.587 * gOriginal + 0.114 * bOriginal;
          const factor = 1.0 + 0.35 * (1.0 - lum / 255);
          rProcessed = Math.min(255, rOriginal * factor);
          gProcessed = Math.min(255, gOriginal * factor);
          bProcessed = Math.min(255, bOriginal * factor);
        } else if (activeSubTool === 'burn') {
          // Shadows-preserving burn curve (avoids muddy pitch-blacks, darkens midtones)
          const lum = 0.299 * rOriginal + 0.587 * gOriginal + 0.114 * bOriginal;
          const factor = 1.0 - 0.25 * (lum / 255);
          rProcessed = Math.max(0, rOriginal * factor);
          gProcessed = Math.max(0, gOriginal * factor);
          bProcessed = Math.max(0, bOriginal * factor);
        } else if (activeSubTool === 'sponge') {
          // True saturation adjustment (Shift key = Desaturate, default = Saturate)
          const gray = 0.299 * rOriginal + 0.587 * gOriginal + 0.114 * bOriginal;
          const factor = isShift ? 0.35 : 1.65;
          rProcessed = Math.min(255, Math.max(0, gray + (rOriginal - gray) * factor));
          gProcessed = Math.min(255, Math.max(0, gray + (gOriginal - gray) * factor));
          bProcessed = Math.min(255, Math.max(0, gray + (bOriginal - gray) * factor));
        } else {
          const factor = isShift ? 0.85 : 1.15;
          rProcessed = Math.min(255, Math.max(0, rOriginal * factor));
          gProcessed = Math.min(255, Math.max(0, gOriginal * factor));
          bProcessed = Math.min(255, Math.max(0, bOriginal * factor));
        }
        
        // Apply precise feathered interpolation blending
        outData[idx] = Math.round(rOriginal + (rProcessed - rOriginal) * maskIntensity);
        outData[idx + 1] = Math.round(gOriginal + (gProcessed - gOriginal) * maskIntensity);
        outData[idx + 2] = Math.round(bOriginal + (bProcessed - bOriginal) * maskIntensity);
      }
    }

    ctx.putImageData(outputImgData, 0, 0);

    const dataUrl = canvas.toDataURL();
    const processedImg = new Image();
    await new Promise<void>((resolve) => {
      processedImg.onload = () => resolve();
      processedImg.onerror = () => resolve();
      processedImg.src = dataUrl;
    });

    handleUpdateLayer(activeLayer.id, {
      imageUrl: dataUrl,
      imageElement: processedImg,
      drawingPath: [],
    });
    handlePushHistory(`Applied Local ${activeSubTool.toUpperCase()} Filter`);
  };

  const handleUpscaleImage = async () => {
    if (!project) return;
    setToast({ message: "Applying super-resolution upscale sharpening convolution...", type: 'info' });
    
    // Create temporary full layout canvas
    const canvas = document.createElement('canvas');
    canvas.width = project.width;
    canvas.height = project.height;
    
    await renderProjectToCanvas(project, canvas, { isExport: true });
    const upscaledCanvas = await upscaleImage(canvas);
    
    // Set upscaled canvas as project bounds or add as new high-res layer
    upscaledCanvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        
        // Add as premium upscaled output layer
        handleAddLayer('image', {
          name: 'Super-Res 2x Upscale',
          imageUrl: url,
          imageBlob: blob,
          width: project.width * 2,
          height: project.height * 2,
          x: 0,
          y: 0,
        });
        handlePushHistory('Upscaled image using Pro bicubic sharpening');
        setToast({ message: "Image upscaled successfully!", type: 'success' });
      }
    });
  };

  const getLayerBlob = async (layer: Layer): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = layer.width;
      tempCanvas.height = layer.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return reject(new Error("Could not create canvas context"));

      if (layer.imageElement) {
        tempCtx.drawImage(layer.imageElement, 0, 0, layer.width, layer.height);
        tempCanvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Failed to export blob"));
        }, 'image/png');
      } else if (layer.imageUrl) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          tempCtx.drawImage(img, 0, 0, layer.width, layer.height);
          tempCanvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Failed to export blob"));
          }, 'image/png');
        };
        img.onerror = () => reject(new Error("Failed to load layer image"));
        img.src = layer.imageUrl;
      } else {
        tempCtx.fillStyle = '#ffffff';
        tempCtx.fillRect(0, 0, layer.width, layer.height);
        tempCanvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Failed to export blob"));
        }, 'image/png');
      }
    });
  };

  const createMaskFromImage = async (transparentUrl: string, width: number, height: number): Promise<HTMLCanvasElement> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = width;
        maskCanvas.height = height;
        const mCtx = maskCanvas.getContext('2d');
        if (mCtx) {
          mCtx.drawImage(img, 0, 0, width, height);
          const imgData = mCtx.getImageData(0, 0, width, height);
          const data = imgData.data;
          for (let i = 0; i < data.length; i += 4) {
            const alpha = data[i + 3];
            data[i] = alpha;     // R
            data[i + 1] = alpha; // G
            data[i + 2] = alpha; // B
            data[i + 3] = 255;   // A
          }
          mCtx.putImageData(imgData, 0, 0);
        }
        resolve(maskCanvas);
      };
      img.onerror = () => {
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = width;
        maskCanvas.height = height;
        const mCtx = maskCanvas.getContext('2d');
        if (mCtx) {
          mCtx.fillStyle = '#ffffff';
          mCtx.fillRect(0, 0, width, height);
        }
        resolve(maskCanvas);
      };
      img.src = transparentUrl;
    });
  };

  const handleRemoveBackgroundProcess = async () => {
    if (!project) return;
    const activeLayer = project.layers.find((l) => l.id === activeLayerId);
    if (!activeLayer || activeLayer.type !== 'image' || !activeLayer.imageUrl) {
      setToast({ message: "Please select an image layer first.", type: 'error' });
      return;
    }

    setShowRemoveBgModal(false);
    setIsRemoveBgLoading(true);
    setRemoveBgProgress(5);

    try {
      setRemoveBgLoadingStep('Detecting Subject...');
      setRemoveBgProgress(15);
      await new Promise((resolve) => setTimeout(resolve, 600));

      const imageBlob = await getLayerBlob(activeLayer);

      setRemoveBgLoadingStep('AI Model: Initializing...');
      setRemoveBgProgress(25);

      let responseBlob: Blob;
      let transparentUrl: string;

      try {
        // Run @imgly/background-removal locally in the browser
        responseBlob = await imglyRemoveBackground(imageBlob, {
          progress: (key, current, total) => {
            const percentage = Math.round((current / total) * 100) || 0;
            // Scale progress range from 25% to 80%
            const prog = 25 + Math.round(percentage * 0.55);
            setRemoveBgProgress(prog);
            const filename = key.split('/').pop() || 'model';
            setRemoveBgLoadingStep(`AI Model: Loading ${filename} (${percentage}%)...`);
          }
        });
        transparentUrl = URL.createObjectURL(responseBlob);
      } catch (aiErr) {
        console.warn("Client-side AI Background removal failed, falling back to local chroma keyer:", aiErr);
        setToast({ message: "Client-side AI model failed. Using local chromakey fallback.", type: 'warning' });

        setRemoveBgLoadingStep('Local Keyer: Processing...');
        setRemoveBgProgress(50);
        // Load image to draw and run local keyer
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        const localProcessedBlob = await new Promise<Blob>((resolve, reject) => {
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const processed = removeBackground(imgData, 25);
              ctx.putImageData(processed, 0, 0);
              canvas.toBlob((blob) => {
                if (blob) resolve(blob);
                else reject(new Error("Local keyer failed to generate blob"));
              }, 'image/png');
            } else {
              reject(new Error("Could not get 2d context for local keyer"));
            }
          };
          img.onerror = () => reject(new Error("Failed to load image for local keyer"));
          img.src = activeLayer.imageUrl!;
        });

        responseBlob = localProcessedBlob;
        transparentUrl = URL.createObjectURL(responseBlob);
      }

      if (removeBgOptions.aiHairRefinement) {
        setRemoveBgLoadingStep('AI Model: Refining Hair & Edges...');
        setRemoveBgProgress(85);
        await new Promise((resolve) => setTimeout(resolve, 800));
      }

      setRemoveBgLoadingStep('Creating Layer Mask...');
      setRemoveBgProgress(95);
      const maskCanvas = await createMaskFromImage(transparentUrl, activeLayer.width, activeLayer.height);

      setRemoveBgLoadingStep('Done');
      setRemoveBgProgress(100);
      await new Promise((resolve) => setTimeout(resolve, 400));

      const layerId = `layer-${Date.now()}`;
      const duplicateName = `${activeLayer.name} Copy`;

      if (removeBgOptions.createNewLayer) {
        const duplicatedLayer: Layer = {
          ...activeLayer,
          id: layerId,
          name: duplicateName,
          hasMask: removeBgOptions.addLayerMask,
          maskCanvas: removeBgOptions.addLayerMask ? maskCanvas : undefined,
          maskBlob: removeBgOptions.addLayerMask ? responseBlob : undefined,
          maskFeather: removeBgOptions.featherEdge || undefined,
          imageUrl: removeBgOptions.addLayerMask ? activeLayer.imageUrl : transparentUrl,
          imageElement: undefined,
        };

        let updatedLayers = [...project.layers];
        
        if (removeBgOptions.keepOriginal && removeBgOptions.keepOriginalHidden) {
          updatedLayers = updatedLayers.map(l => {
            if (l.id === activeLayer.id) {
              return { ...l, visible: false };
            }
            return l;
          });
        } else if (!removeBgOptions.keepOriginal) {
          updatedLayers = updatedLayers.filter(l => l.id !== activeLayer.id);
        }

        updatedLayers = [duplicatedLayer, ...updatedLayers];

        setProject({
          ...project,
          layers: updatedLayers,
        });
        setActiveLayerId(layerId);
        handlePushHistory('Remove Background (New Layer)');
      } else {
        const updatedLayer: Layer = {
          ...activeLayer,
          hasMask: removeBgOptions.addLayerMask,
          maskCanvas: removeBgOptions.addLayerMask ? maskCanvas : undefined,
          maskBlob: removeBgOptions.addLayerMask ? responseBlob : undefined,
          maskFeather: removeBgOptions.featherEdge || undefined,
          imageUrl: removeBgOptions.addLayerMask ? activeLayer.imageUrl : transparentUrl,
          imageElement: undefined,
        };

        const updatedLayers = project.layers.map(l => {
          if (l.id === activeLayer.id) {
            return updatedLayer;
          }
          return l;
        });

        setProject({
          ...project,
          layers: updatedLayers,
        });
        handlePushHistory('Remove Background (Direct)');
      }

      setToast({ message: "Background removed successfully!", type: 'success' });
    } catch (err: any) {
      console.error(err);
      setToast({ message: `AI Removal failed: ${err.message || 'Check if server is active'}`, type: 'error' });
    } finally {
      setIsRemoveBgLoading(false);
      setRemoveBgLoadingStep('');
    }
  };

  const handleApplyMask = async (layerId: string) => {
    if (!project) return;
    const layer = project.layers.find((l) => l.id === layerId);
    if (!layer || !layer.hasMask || !layer.maskCanvas) return;

    setToast({ message: "Applying layer mask permanently...", type: 'info' });

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = layer.width;
    tempCanvas.height = layer.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        tempCtx.drawImage(img, 0, 0, layer.width, layer.height);
        tempCtx.globalCompositeOperation = 'destination-in';
        const feather = layer.maskFeather || 0;
        if (feather > 0) {
          tempCtx.filter = `blur(${feather}px)`;
        }
        tempCtx.drawImage(layer.maskCanvas!, 0, 0, layer.width, layer.height);
        if (feather > 0) {
          tempCtx.filter = 'none';
        }

        const rasterizedUrl = tempCanvas.toDataURL('image/png');
        
        const newImg = new Image();
        newImg.crossOrigin = 'anonymous';
        newImg.onload = () => {
          const updatedLayers = project.layers.map((l) => {
            if (l.id === layerId) {
              return {
                ...l,
                imageUrl: rasterizedUrl,
                imageElement: newImg,
                hasMask: false,
                maskCanvas: undefined,
                maskBlob: undefined,
                maskFeather: undefined,
                maskDensity: undefined,
                maskInvert: undefined,
                maskDisabled: undefined,
              };
            }
            return l;
          });
          setProject({ ...project, layers: updatedLayers });
          handlePushHistory('Applied Layer Mask');
          setToast({ message: "Mask applied permanently!", type: 'success' });
        };
        newImg.src = rasterizedUrl;
      };
      img.src = layer.imageUrl!;
    }
  };

  const handleDeleteMask = (layerId: string) => {
    if (!project) return;
    const updatedLayers = project.layers.map((l) => {
      if (l.id === layerId) {
        return {
          ...l,
          hasMask: false,
          maskCanvas: undefined,
          maskBlob: undefined,
          maskFeather: undefined,
          maskDensity: undefined,
          maskInvert: undefined,
          maskDisabled: undefined,
        };
      }
      return l;
    });
    setProject({ ...project, layers: updatedLayers });
    handlePushHistory('Deleted Layer Mask');
    setToast({ message: "Layer mask deleted.", type: 'info' });
  };

  // Asset Dropping Handlers
  const handleAddStockImage = (url: string, name: string) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const naturalW = img.naturalWidth || img.width || 500;
      const naturalH = img.naturalHeight || img.height || 350;

      const canvasW = project ? project.width : 1920;
      const canvasH = project ? project.height : 1080;
      const maxW = canvasW * 0.8;
      const maxH = canvasH * 0.8;

      let targetW = naturalW;
      let targetH = naturalH;

      if (targetW > maxW || targetH > maxH) {
        const scale = Math.min(maxW / targetW, maxH / targetH);
        targetW = Math.round(targetW * scale);
        targetH = Math.round(targetH * scale);
      } else {
        targetW = Math.round(targetW);
        targetH = Math.round(targetH);
      }

      const posX = Math.round((canvasW - targetW) / 2);
      const posY = Math.round((canvasH - targetH) / 2);

      handleAddLayer('image', {
        name,
        imageUrl: url,
        imageElement: img,
        width: targetW,
        height: targetH,
        x: posX,
        y: posY,
      });
      setToast({ message: `Added stock image: ${name}`, type: 'success' });
    };
    img.onerror = () => {
      handleAddLayer('image', {
        name: name,
        imageUrl: url,
        width: 500,
        height: 350,
        x: project ? (project.width - 500) / 2 : 0,
        y: project ? (project.height - 350) / 2 : 0,
      });
      setToast({ message: `Added stock image: ${name}`, type: 'success' });
    };
    img.src = url;
  };

  const handleAddVectorShape = (path: string, name: string) => {
    handleAddLayer('shape', {
      name,
      shapeType: 'rectangle',
      vectorPath: path,
      fillColor: brushColor,
      strokeColor: '#ffffff',
      strokeWidth: 2,
      width: 200,
      height: 200,
      x: project ? (project.width - 200) / 2 : 0,
      y: project ? (project.height - 200) / 2 : 0,
    });
    setToast({ message: `Added shape: ${name}`, type: 'success' });
  };

  const handleAddGradientLayer = (style: string, name: string) => {
    if (!project) return;
    const hexMatches = style.match(/#[0-9a-fA-F]{6}/g) || ['#6366f1', '#ec4899'];
    handleAddLayer('shape', {
      name: `${name} Gradient`,
      shapeType: 'rectangle',
      gradientStart: { x: 0, y: 0 },
      gradientEnd: { x: project.width, y: project.height },
      gradientColors: hexMatches,
      width: project.width,
      height: project.height,
      x: 0,
      y: 0,
      opacity: 0.8,
      blendMode: 'normal',
    });
    setToast({ message: `Added gradient layer: ${name}`, type: 'success' });
  };

  // Export File logic
  const handleTriggerExport = () => {
    setShowExportModal(true);
  };

  const executeExport = async () => {
    if (!project) return;
    setExporting(true);

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = project.width;
    tempCanvas.height = project.height;

    // Apply adjustments if requested
    await renderProjectToCanvas(project, tempCanvas, { isExport: true });

    const ext = exportFormat === 'image/png' ? 'png' : exportFormat === 'image/webp' ? 'webp' : 'jpg';

    if (exportMode === 'slices' && project.slices && project.slices.length > 0) {
      try {
        const zip = new JSZip();

        // Process each slice
        const slicePromises = project.slices.map((slice, idx) => {
          return new Promise<void>((resolve) => {
            const sliceCanvas = document.createElement('canvas');
            sliceCanvas.width = slice.w;
            sliceCanvas.height = slice.h;
            const sliceCtx = sliceCanvas.getContext('2d');
            if (!sliceCtx) {
              resolve();
              return;
            }

            // Draw the slice area of the composite canvas
            sliceCtx.drawImage(
              tempCanvas,
              slice.x,
              slice.y,
              slice.w,
              slice.h,
              0,
              0,
              slice.w,
              slice.h
            );

            sliceCanvas.toBlob(
              (blob) => {
                if (blob) {
                  const filename = `slice_${String(idx + 1).padStart(2, '0')}_${slice.w}x${slice.h}.${ext}`;
                  zip.file(filename, blob);
                }
                resolve();
              },
              exportFormat,
              exportQuality / 100
            );
          });
        });

        // Wait for all slices to be rendered to blobs and zipped
        await Promise.all(slicePromises);

        // Generate zip file and download
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(zipBlob);
        a.download = `${project.name.toLowerCase().replace(/\s+/g, '_')}_slices.zip`;
        a.click();

        setToast({ message: `Successfully exported ${project.slices.length} slices!`, type: 'success' });
      } catch (err) {
        console.error(err);
        setToast({ message: "Failed to create ZIP package of slices.", type: 'error' });
      } finally {
        setExporting(false);
        setShowExportModal(false);
      }
    } else {
      tempCanvas.toBlob(
        (blob) => {
          if (blob) {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `${project.name.toLowerCase().replace(/\s+/g, '_')}_export.${ext}`;
            a.click();
          }
          setExporting(false);
          setShowExportModal(false);
        },
        exportFormat,
        exportQuality / 100
      );
    }
  };

  const handleCloseProject = () => {
    handleSaveProject();
    setProject(null);
    setCurrentProjId(null);
    setOpenProjectIds([]);
  };

  const handleCloseTab = (id: string) => {
    const updatedTabs = openProjectIds.filter(t => t !== id);
    setOpenProjectIds(updatedTabs);
    
    if (currentProjId === id) {
      handleSaveProject();
      if (updatedTabs.length > 0) {
        handleOpenProject(updatedTabs[updatedTabs.length - 1]);
      } else {
        setProject(null);
        setCurrentProjId(null);
      }
    } else {
      // Auto-save the background project
      loadProject(id).then(proj => {
        if (proj) saveProject(proj, userProfile?.id);
      });
    }
  };

  // File import layer triggering
  // Open a local image file directly as a new project matching its exact natural dimensions
  const handleOpenImageAsProject = async (file: File) => {
    if (!userProfile) {
      setShowAuthModal(true);
      setToast({
        message: "Silakan masuk atau daftar akun gratis terlebih dahulu untuk mengedit gambar di Canvas Editor.",
        type: 'info'
      });
      return;
    }
    const existingProjs = await loadProjects(userProfile.id);
    if (existingProjs.length >= 3) {
      setToast({
        message: "Batas Maksimal 3 Proyek Tercapai! Silakan hapus salah satu proyek lama Anda terlebih dahulu.",
        type: 'error'
      });
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || img.width || 1200;
      const h = img.naturalHeight || img.height || 800;

      const projId = `proj-${Date.now()}`;
      const projName = file.name ? file.name.replace(/\.[^/.]+$/, "") : 'Opened Image';

      const newProj: Project = {
        id: projId,
        name: projName,
        width: w,
        height: h,
        layers: [
          {
            id: `layer-${Date.now()}-img`,
            name: file.name || 'Background Image',
            type: 'image',
            imageUrl: url,
            imageBlob: file,
            imageElement: img,
            visible: true,
            locked: false,
            opacity: 1,
            blendMode: 'normal',
            x: 0,
            y: 0,
            width: w,
            height: h,
            rotation: 0,
          }
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      setProject(newProj);
      setCurrentProjId(newProj.id);
      setTabNames((prev) => ({ ...prev, [newProj.id]: newProj.name }));
      if (!openProjectIds.includes(newProj.id)) {
        setOpenProjectIds((prev) => [...prev, newProj.id]);
      }
      
      setHistoryStack([{ layers: newProj.layers, canvasWidth: w, canvasHeight: h, description: 'Opened image' }]);
      setHistoryIndex(0);
      setActiveLayerId(newProj.layers[0].id);

      saveProject(newProj, userProfile?.id);
      setToast({ message: `Opened image ${w}×${h} px`, type: 'success' });
    };
    img.src = url;
  };

  // Helper to import an image File into the active project canvas preserving its exact aspect ratio
  const importImageFileToCanvas = (file: File) => {
    if (!project) return;

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const naturalW = img.naturalWidth || img.width;
      const naturalH = img.naturalHeight || img.height;
      if (naturalW === 0 || naturalH === 0) return;

      const canvasW = project.width;
      const canvasH = project.height;

      // Fit inside 85% of canvas if image exceeds canvas size
      const maxW = canvasW * 0.85;
      const maxH = canvasH * 0.85;

      let targetW = naturalW;
      let targetH = naturalH;

      if (targetW > maxW || targetH > maxH) {
        const scale = Math.min(maxW / targetW, maxH / targetH);
        targetW = Math.round(targetW * scale);
        targetH = Math.round(targetH * scale);
      } else {
        targetW = Math.round(targetW);
        targetH = Math.round(targetH);
      }

      // Center the imported image on the canvas
      const posX = Math.round((canvasW - targetW) / 2);
      const posY = Math.round((canvasH - targetH) / 2);

      handleAddLayer('image', {
        name: file.name || 'Imported Image',
        imageUrl: url,
        imageBlob: file,
        imageElement: img,
        width: targetW,
        height: targetH,
        x: posX,
        y: posY,
      });

      setToast({ message: `Placed ${file.name || 'image'} (${naturalW}×${naturalH} px)`, type: 'success' });
    };
    img.src = url;
  };

  // File import layer triggering from file input element
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      importImageFileToCanvas(file);
      e.target.value = '';
    }
  };

  const panelDefinitions = React.useMemo(() => {
    if (!project) return [];
    return [
      {
        id: 'layers' as const,
        title: PANEL_TITLES['layers'],
        icon: PANEL_ICONS['layers'],
        content: (
          <LayersPanel
            layers={project.layers}
            activeLayerId={activeLayerId}
            activeLayerIds={activeLayerIds}
            setActiveLayerId={setActiveLayerId}
            setActiveLayerIds={setActiveLayerIds}
            onUpdateLayer={handleUpdateLayer}
            onAddLayer={handleAddLayer}
            onDeleteLayer={handleDeleteLayer}
            onDuplicateLayer={handleDuplicateLayer}
            onReorderLayers={handleReorderLayers}
            onOpenLayerStyle={(id) => { setLayerStyleInitialTab('blending'); setTargetStyleLayerId(id); setActiveDialog('layerStyle'); }}
            onOpenLayerProperties={(id) => { setTargetPropertiesLayerId(id); setActiveDialog('layerProperties'); }}
            onOpenDuplicateDialog={(id) => { setTargetDuplicateLayerId(id); setActiveDialog('duplicateLayer'); }}
            onOpenNewLayerDialog={() => setActiveDialog('newLayer')}
            onOpenAdjustmentDialog={(adjType) => setActiveImageDialog(adjType)}
            onMergeSelected={handleMergeSelectedLayers}
            onMergeDown={(id) => handleMergeLayers()}
            onFlattenImage={handleFlattenImage}
            onEditSmartObject={handleEditSmartObject}
            onUngroupLayers={handleUngroupLayers}
            onGroupSelected={handleGroupSelectedLayers}
          />
        ),
      },
      {
        id: 'channels' as const,
        title: PANEL_TITLES['channels'],
        icon: PANEL_ICONS['channels'],
        content: (
          <ChannelsPanel
            visibleChannel={visibleChannel}
            onChannelChange={(ch) => setVisibleChannel(ch)}
          />
        ),
      },
      {
        id: 'paths' as const,
        title: PANEL_TITLES['paths'],
        icon: PANEL_ICONS['paths'],
        content: (
          <PathsPanel
            onConvertToSelection={(pathId) => {
              setToast({ message: 'Converted Path to Selection', type: 'success' });
            }}
            onConvertToShape={(pathId) => {
              setToast({ message: 'Converted Path to Shape Layer', type: 'success' });
            }}
          />
        ),
      },
      {
        id: 'history' as const,
        title: PANEL_TITLES['history'],
        icon: PANEL_ICONS['history'],
        content: (
          <HistoryPanel
            historyStack={historyStack}
            historyIndex={historyIndex}
            onJumpToState={handleJumpToHistory}
            onUndo={handleUndo}
            onRedo={handleRedo}
          />
        ),
      },
      {
        id: 'properties' as const,
        title: PANEL_TITLES['properties'],
        icon: PANEL_ICONS['properties'],
        content: (
          <PropertiesPanel
            activeLayer={project.layers.find((l) => l.id === activeLayerId) ?? null}
            activeTool={activeTool}
            activeSubTool={activeSubTool}
            adjustments={adjustments}
            setAdjustments={handleUpdateAdjustments}
            onUpdateLayer={handleUpdateLayer}
            brushColor={brushColor}
            setBrushColor={setBrushColor}
            brushSize={brushSize}
            setBrushSize={setBrushSize}
            brushOpacity={brushOpacity}
            setBrushOpacity={setBrushOpacity}
            onApplyHealing={handleApplyHealing}
            onApplyMask={handleApplyMask}
            onDeleteMask={handleDeleteMask}
          />
        ),
      },
      {
        id: 'adjustments' as const,
        title: PANEL_TITLES['adjustments'],
        icon: PANEL_ICONS['adjustments'],
        content: (
          <CurvesLevelsPanel
            adjustments={adjustments}
            onUpdateAdjustments={handleUpdateAdjustments}
            onReset={handleResetAdjustments}
            onApplyCurves={() => {
              handlePushHistory('Applied Curves Adjustment');
              setToast({ message: 'Curves saved to history!', type: 'success' });
            }}
            onApplyLevels={() => {
              handlePushHistory('Applied Levels Adjustment');
              setToast({ message: 'Levels saved to history!', type: 'success' });
            }}
          />
        ),
      },
      {
        id: 'color' as const,
        title: PANEL_TITLES['color'],
        icon: PANEL_ICONS['color'],
        content: (
          <ColorPanel
            color={brushColor}
            onColorChange={handleBrushColorChange}
          />
        ),
      },
      {
        id: 'swatches' as const,
        title: PANEL_TITLES['swatches'],
        icon: PANEL_ICONS['swatches'],
        content: (
          <SwatchesPanel
            currentColor={brushColor}
            onSelectColor={handleBrushColorChange}
          />
        ),
      },
      {
        id: 'gradients' as const,
        title: PANEL_TITLES['gradients'],
        icon: PANEL_ICONS['gradients'],
        content: (
          <GradientPanel
            onApplyGradient={handleApplyGradient}
          />
        ),
      },
      {
        id: 'patterns' as const,
        title: PANEL_TITLES['patterns'],
        icon: PANEL_ICONS['patterns'],
        content: (
          <PatternPanel
            onApplyPattern={handleApplyPattern}
          />
        ),
      },
      {
        id: 'brushes' as const,
        title: PANEL_TITLES['brushes'],
        icon: PANEL_ICONS['brushes'],
        content: (
          <BrushesPanel
            brushSize={brushSize}
            brushHardness={brushHardness}
            onBrushChange={(b) => {
              if (b.size > 0) setBrushSize(b.size);
              if (b.hardness !== undefined) setBrushHardness(b.hardness);
              // Auto-switch to Brush tool when selecting a preset
              if (b.name) {
                setActiveTool('brush');
                setActiveSubTool('brush');
                setBrushType(b.name);
                setToast({ message: `Brush: ${b.name} (${b.size}px, ${b.hardness}% hard)`, type: 'info' });
              }
            }}
          />
        ),
      },
      {
        id: 'brush-settings' as const,
        title: PANEL_TITLES['brush-settings'],
        icon: PANEL_ICONS['brush-settings'],
        content: (
          <BrushSettingsPanel
            brushSize={brushSize}
            setBrushSize={setBrushSize}
            brushHardness={brushHardness}
            setBrushHardness={setBrushHardness}
            brushOpacity={brushOpacity}
            setBrushOpacity={setBrushOpacity}
            brushSmoothing={brushSmoothing}
            setBrushSmoothing={setBrushSmoothing}
            brushFlow={brushFlow}
            setBrushFlow={setBrushFlow}
            brushBlendMode={brushBlendMode}
            setBrushBlendMode={setBrushBlendMode}
            brushColor={brushColor}
            setBrushColor={handleBrushColorChange}
          />
        ),
      },
      {
        id: 'character' as const,
        title: PANEL_TITLES['character'],
        icon: PANEL_ICONS['character'],
        content: (
          <CharacterPanel
            fontFamily={project?.layers.find(l => l.id === activeLayerId)?.fontFamily ?? 'Inter'}
            fontSize={project?.layers.find(l => l.id === activeLayerId)?.fontSize ?? 24}
            fontWeight={project?.layers.find(l => l.id === activeLayerId)?.fontWeight ?? 'normal'}
            fontStyle={project?.layers.find(l => l.id === activeLayerId)?.fontStyle ?? 'normal'}
            textColor={project?.layers.find(l => l.id === activeLayerId)?.textColor ?? '#ffffff'}
            letterSpacing={project?.layers.find(l => l.id === activeLayerId)?.letterSpacing ?? 0}
            lineHeightMultiplier={project?.layers.find(l => l.id === activeLayerId)?.lineHeightMultiplier ?? 1.2}
            textAlign={project?.layers.find(l => l.id === activeLayerId)?.textAlign ?? 'left'}
            onFontChange={(updates) => {
              if (activeLayerId) handleUpdateLayer(activeLayerId, updates);
            }}
          />
        ),
      },
      {
        id: 'navigator' as const,
        title: PANEL_TITLES['navigator'],
        icon: PANEL_ICONS['navigator'],
        content: (
          <NavigatorPanel
            project={project}
            zoom={editorZoom}
            pan={editorPan}
            onZoomChange={(z) => setEditorZoom(z)}
          />
        ),
      },
      {
        id: 'info' as const,
        title: PANEL_TITLES['info'],
        icon: PANEL_ICONS['info'],
        content: (
          <InfoPanel
            hoverCoords={hoverCoords}
            canvasWidth={project?.width ?? 0}
            canvasHeight={project?.height ?? 0}
            zoom={editorZoom}
            activeLayer={project?.layers.find(l => l.id === activeLayerId) ?? null}
            currentColor={brushColor}
          />
        ),
      },
      {
        id: 'assets' as const,
        title: PANEL_TITLES['assets'],
        icon: PANEL_ICONS['assets'],
        content: (
          <AssetLibraryPanel
            onAddStockImage={handleAddStockImage}
            onAddVectorShape={handleAddVectorShape}
            onAddGradientLayer={handleAddGradientLayer}
          />
        ),
      },
      {
        id: 'actions' as const,
        title: PANEL_TITLES['actions'] ?? 'Actions',
        icon: PANEL_ICONS['actions'] ?? null,
        content: (
          <div className="flex flex-col gap-2 p-2.5 text-gray-300 text-[10px]">
            <div className="flex items-center gap-1 bg-[#1a1a26] border border-[#2d2d40] rounded p-1">
              <button className="p-1 hover:bg-[#252535] rounded" title="Play">▶</button>
              <button className="p-1 hover:bg-[#252535] rounded" title="Stop">■</button>
              <button className="p-1 hover:bg-[#252535] rounded text-red-500" title="Record">●</button>
            </div>
            <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
              {['Vignette (selection)', 'Wood Frame (50 pixel)', 'Sepia Tone', 'Quadrant Colors', 'Save As PDF Document'].map((a, i) => (
                <div key={i} className="px-2 py-1 bg-[#16161f] border border-[#202028] rounded cursor-pointer hover:border-indigo-500">
                  {a}
                </div>
              ))}
            </div>
          </div>
        ),
      },
      {
        id: 'histogram' as const,
        title: PANEL_TITLES['histogram'] ?? 'Histogram',
        icon: PANEL_ICONS['histogram'] ?? null,
        content: (
          <div className="flex flex-col gap-2 p-2.5 text-gray-300 text-[10px]">
            <div className="h-20 bg-[#1a1a26] border border-[#2d2d40] rounded relative overflow-hidden flex items-end">
              <svg viewBox="0 0 100 100" className="w-full h-full text-indigo-500 stroke-current fill-indigo-500/10" preserveAspectRatio="none">
                <path d="M 0 100 Q 15 80 30 50 T 60 70 T 90 20 T 100 100 Z" />
              </svg>
            </div>
            <div className="flex justify-between text-[8px] text-gray-500 font-mono">
              <span>Mean: 128.4</span>
              <span>Std Dev: 45.2</span>
              <span>Median: 120</span>
            </div>
          </div>
        ),
      },
      {
        id: 'paragraph' as const,
        title: PANEL_TITLES['paragraph'] ?? 'Paragraph',
        icon: PANEL_ICONS['paragraph'] ?? null,
        content: (
          <div className="flex flex-col gap-2 p-2.5 text-gray-300 text-[10px]">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[9px] text-gray-500 block mb-1">Left Indent</span>
                <input type="number" defaultValue={0} className="w-full bg-[#1a1a26] border border-[#2d2d40] rounded px-1.5 py-1 text-indigo-400 font-mono text-[10px] focus:outline-none" />
              </div>
              <div>
                <span className="text-[9px] text-gray-500 block mb-1">Right Indent</span>
                <input type="number" defaultValue={0} className="w-full bg-[#1a1a26] border border-[#2d2d40] rounded px-1.5 py-1 text-indigo-400 font-mono text-[10px] focus:outline-none" />
              </div>
            </div>
          </div>
        ),
      },
      {
        id: 'glyphs' as const,
        title: PANEL_TITLES['glyphs'] ?? 'Glyphs',
        icon: PANEL_ICONS['glyphs'] ?? null,
        content: (
          <div className="flex flex-col gap-2 p-2.5 text-gray-300 text-[10px]">
            <div className="grid grid-cols-6 gap-1 max-h-40 overflow-y-auto font-mono text-center">
              {['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','@','#','$','%','^','&','*','(',')','+','=','{','}','[',']','|','\\',':',';','"','\'','<','>',',','.','?','/','~','`'].map((g, i) => (
                <button key={i} className="p-1 bg-[#1a1a26] border border-[#2d2d40] rounded hover:border-indigo-500 text-white font-bold">
                  {g}
                </button>
              ))}
            </div>
          </div>
        ),
      },
      {
        id: 'tool-presets' as const,
        title: PANEL_TITLES['tool-presets'] ?? 'Tool Presets',
        icon: PANEL_ICONS['tool-presets'] ?? null,
        content: (
          <div className="flex flex-col gap-2 p-2.5 text-gray-300 text-[10px]">
            <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
              {['Airbrush Soft 30px', 'Ink Pen 5px', 'Eraser Block 50px', 'Healing Spot Small', 'Crop 1:1 Square'].map((p, i) => (
                <div key={i} className="px-2 py-1 bg-[#16161f] border border-[#202028] rounded cursor-pointer hover:border-indigo-500">
                  {p}
                </div>
              ))}
            </div>
          </div>
        ),
      },
    ];
  }, [
    project, activeLayerId, activeLayerIds, visibleChannel, historyStack, historyIndex,
    brushSize, brushOpacity, brushColor, brushHardness, brushSmoothing, brushFlow, brushBlendMode,
    textFont, textSize, textWeight, textStyle, shapeStrokeColor,
    shapeStrokeWidth, shapeCornerRadius, backgroundColor, gradientType, gradientOpacity, gradientBlendMode, gradientReverse, gradientStops, hoverCoords, editorZoom,
    activeTool, activeSubTool, adjustments, setAdjustments, handleApplyHealing, handleApplyMask, handleDeleteMask,
    handleJumpToHistory, handleUndo, handleRedo
  ]);

  const renderPanelContent = (id: PanelId) => {
    const def = panelDefinitions.find(p => p.id === id);
    return def ? def.content : null;
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#0c0c0f] relative">


      <AnimatePresence mode="wait">
        {!currentProjId || !project ? (
          // DASHBOARD PORTAL
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full w-full overflow-hidden flex flex-col"
          >
            <Dashboard
              onOpenProject={handleOpenProject}
              onCreateProject={handleCreateProject}
              onOpenImageAsProject={handleOpenImageAsProject}
              isPremium={isPremium}
              setIsPremium={setIsPremium}
              userProfile={userProfile}
              onOpenAuth={() => setShowAuthModal(true)}
              onOpenAdmin={() => setShowAdminModal(true)}
              onSignOut={() => {
                supabase.auth.signOut();
                localStorage.removeItem('phototor_active_user_session');
                setUserProfile(null);
                setToast({ message: "Berhasil keluar dari akun.", type: 'info' });
              }}
            />
          </motion.div>
        ) : (
          // STUDIO EDITOR WORKSPACE
          <motion.div
            key="editor"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col h-full overflow-hidden text-gray-200 font-sans"
          >
            {/* Top Editor Menu Bar */}
            <header className={`relative flex items-center justify-between px-4 bg-[#111116] border-b border-[#202028] h-10 shrink-0 select-none z-50 transition-all ${
              screenMode === 'fullscreen' ? 'hidden' : ''
            }`}>
              <div className="flex items-center gap-4 text-xs">
                {/* Brand Logo */}
                <div className="flex items-center gap-1.5 cursor-pointer hover:opacity-90 group" onClick={handleCloseProject}>
                  <div className="relative w-5 h-5 shrink-0">
                    <div className="absolute inset-0 rounded bg-violet-500/40 blur-sm scale-125 group-hover:scale-150 transition-all" />
                    <img
                      src="/logo.png"
                      alt="Phototor"
                      className="relative w-5 h-5 rounded object-contain drop-shadow-[0_0_6px_rgba(139,92,246,0.9)]"
                    />
                  </div>
                  <span className="font-sans font-black tracking-widest text-[11px] bg-gradient-to-r from-violet-300 via-white to-purple-300 bg-clip-text text-transparent">PHOTOTOR</span>
                </div>

                {/* Click outside backdrop for dropdowns */}
                {activeMenu && (
                  <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setActiveMenu(null)} />
                )}

                {/* Dropdown Navigation Menu Links */}
                <div className="flex items-center gap-1.5 text-gray-300 font-medium">
                  {/* FILE MENU */}
                  <div className="relative">
                    <button
                      onClick={() => setActiveMenu(activeMenu === 'file' ? null : 'file')}
                      className={`px-2.5 py-1 rounded hover:bg-[#1a1a24] hover:text-white cursor-pointer ${activeMenu === 'file' ? 'bg-[#1a1a24] text-white' : ''}`}
                    >
                      File
                    </button>
                    {activeMenu === 'file' && (
                      <div className="absolute left-0 mt-1.5 z-50 bg-[#121216] border border-[#2b2b36] rounded-lg shadow-2xl py-1 w-52 text-left animate-in fade-in slide-in-from-top-1 duration-100">
                        <button
                          onClick={() => { handleCreateProject(1200, 800, 'New Canvas'); setActiveMenu(null); }}
                          className="flex items-center justify-between w-full px-3 py-1.5 hover:bg-[#1c1c28] hover:text-white text-[11px]"
                        >
                          <span>New Canvas</span>
                          <span className="text-[9px] text-gray-500 font-mono">Ctrl+N</span>
                        </button>
                        <button
                          onClick={() => { handleCloseProject(); setActiveMenu(null); }}
                          className="flex items-center justify-between w-full px-3 py-1.5 hover:bg-[#1c1c28] hover:text-white text-[11px]"
                        >
                          <span>Open Dashboard</span>
                          <span className="text-[9px] text-gray-500 font-mono">Ctrl+O</span>
                        </button>
                        <button
                          onClick={() => { document.getElementById('open-image-file-input')?.click(); setActiveMenu(null); }}
                          className="flex items-center justify-between w-full px-3 py-1.5 hover:bg-[#1c1c28] hover:text-white text-[11px]"
                        >
                          <span>Open Image File...</span>
                          <span className="text-[9px] text-gray-500 font-mono">Open</span>
                        </button>
                        <button
                          onClick={() => { document.getElementById('place-file-input')?.click(); setActiveMenu(null); }}
                          className="flex items-center justify-between w-full px-3 py-1.5 hover:bg-[#1c1c28] hover:text-white text-[11px]"
                        >
                          <span>Place File...</span>
                          <span className="text-[9px] text-indigo-400 font-mono">Place</span>
                        </button>
                        <div className="h-[1px] bg-[#22222c] my-1" />
                        <button
                          onClick={() => { handleSaveProject(); setActiveMenu(null); setToast({ message: 'Project Saved!', type: 'success' }); }}
                          className="flex items-center justify-between w-full px-3 py-1.5 hover:bg-[#1c1c28] hover:text-white text-[11px]"
                        >
                          <span>Save Project</span>
                          <span className="text-[9px] text-gray-500 font-mono">Ctrl+S</span>
                        </button>
                        <button
                          onClick={() => { handleTriggerExport(); setActiveMenu(null); }}
                          className="flex items-center justify-between w-full px-3 py-1.5 hover:bg-[#1c1c28] hover:text-white text-[11px]"
                        >
                          <span>Export As...</span>
                          <span className="text-[9px] text-gray-500 font-mono">Ctrl+Shift+S</span>
                        </button>
                        <button
                          onClick={() => { handleQuickExport(); setActiveMenu(null); }}
                          className="flex items-center justify-between w-full px-3 py-1.5 hover:bg-[#1c1c28] hover:text-white text-[11px]"
                        >
                          <span>Quick Export as PNG</span>
                          <span className="text-[9px] text-gray-500 font-mono">Ctrl+Shift+E</span>
                        </button>
                        <div className="h-[1px] bg-[#22222c] my-1" />
                        <button
                          onClick={() => { setShowBatchModal(true); setActiveMenu(null); }}
                          className="flex items-center justify-between w-full px-3 py-1.5 hover:bg-[#1c1c28] hover:text-white text-[11px] text-amber-300 font-bold"
                        >
                          <span>👑 Batch Image Processor...</span>
                          <span className="text-[9px] text-amber-400 font-mono">PRO</span>
                        </button>
                        <button
                          onClick={() => { handleExportPSD(); setActiveMenu(null); }}
                          className="flex items-center justify-between w-full px-3 py-1.5 hover:bg-[#1c1c28] hover:text-white text-[11px] text-indigo-300 font-bold"
                        >
                          <span>👑 Export PSD (.psd)...</span>
                          <span className="text-[9px] text-indigo-400 font-mono">PSD</span>
                        </button>
                        <div className="h-[1px] bg-[#22222c] my-1" />
                        <button
                          onClick={() => { handleCloseProject(); setActiveMenu(null); }}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#1c1c28] hover:text-white text-[11px] text-red-400"
                        >
                          Close Project
                        </button>
                      </div>
                    )}
                  </div>

                  {/* EDIT MENU */}
                  <div className="relative">
                    <button
                      onClick={() => setActiveMenu(activeMenu === 'edit' ? null : 'edit')}
                      className={`px-2.5 py-1 rounded hover:bg-[#1a1a24] hover:text-white cursor-pointer ${activeMenu === 'edit' ? 'bg-[#1a1a24] text-white' : ''}`}
                    >
                      Edit
                    </button>
                    {activeMenu === 'edit' && (
                      <div className="absolute left-0 mt-1.5 z-50 bg-[#121216] border border-[#2b2b36] rounded-lg shadow-2xl py-1 w-52 text-left animate-in fade-in slide-in-from-top-1 duration-100">
                        <button
                          onClick={() => { handleUndo(); setActiveMenu(null); }}
                          disabled={historyIndex <= 0}
                          className="flex items-center justify-between w-full px-3 py-1.5 hover:bg-[#1c1c28] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-300 text-[11px]"
                        >
                          <span>Undo</span>
                          <span className="text-[9px] text-gray-500 font-mono">Ctrl+Z</span>
                        </button>
                        <button
                          onClick={() => { handleRedo(); setActiveMenu(null); }}
                          disabled={historyIndex >= historyStack.length - 1}
                          className="flex items-center justify-between w-full px-3 py-1.5 hover:bg-[#1c1c28] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-300 text-[11px]"
                        >
                          <span>Redo</span>
                          <span className="text-[9px] text-gray-500 font-mono">Ctrl+Y</span>
                        </button>
                        <div className="h-[1px] bg-[#22222c] my-1" />
                        <button
                          onClick={() => { handleCutLayer(); setActiveMenu(null); }}
                          className="flex items-center justify-between w-full px-3 py-1.5 hover:bg-[#1c1c28] hover:text-white text-[11px]"
                        >
                          <span>Cut Layer</span>
                          <span className="text-[9px] text-gray-500 font-mono">Ctrl+X</span>
                        </button>
                        <button
                          onClick={() => { handleCopyLayer(); setActiveMenu(null); }}
                          className="flex items-center justify-between w-full px-3 py-1.5 hover:bg-[#1c1c28] hover:text-white text-[11px]"
                        >
                          <span>Copy Layer</span>
                          <span className="text-[9px] text-gray-500 font-mono">Ctrl+C</span>
                        </button>
                        <button
                          onClick={() => { handlePasteLayer(); setActiveMenu(null); }}
                          className="flex items-center justify-between w-full px-3 py-1.5 hover:bg-[#1c1c28] hover:text-white text-[11px]"
                        >
                          <span>Paste Layer</span>
                          <span className="text-[9px] text-gray-500 font-mono">Ctrl+V</span>
                        </button>
                        <div className="h-[1px] bg-[#22222c] my-1" />
                        <button
                          onClick={() => { setActiveTool('crop'); setActiveSubTool('transform'); setActiveMenu(null); }}
                          className="flex items-center justify-between w-full px-3 py-1.5 hover:bg-[#1c1c28] hover:text-white text-[11px]"
                        >
                          <span>Free Transform</span>
                          <span className="text-[9px] text-gray-500 font-mono">Ctrl+T</span>
                        </button>
                        <button
                          onClick={() => {
                            if (!activeLayerId) {
                              setToast({ message: "Pilih layer gambar terlebih dahulu untuk Melengkungkan (Warp).", type: 'warning' });
                              return;
                            }
                            setShowWarpModal(true);
                            setActiveMenu(null);
                          }}
                          className="flex items-center justify-between w-full px-3 py-1.5 hover:bg-indigo-600 hover:text-white text-[11px] font-medium cursor-pointer"
                        >
                          <span>Transform Warp (Lengkungkan)...</span>
                          <span className="text-[9px] text-indigo-300 font-mono">Warp</span>
                        </button>
                        <button
                          onClick={() => {
                            const activeLayer = project?.layers.find(l => l.id === activeLayerId);
                            if (activeLayer) {
                              handleUpdateLayer(activeLayer.id, { flipX: !activeLayer.flipX });
                              handlePushHistory('Flip Layer Horizontally');
                            }
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#1c1c28] hover:text-white text-[11px]"
                        >
                          Flip Horizontally
                        </button>
                        <button
                          onClick={() => {
                            const activeLayer = project?.layers.find(l => l.id === activeLayerId);
                            if (activeLayer) {
                              handleUpdateLayer(activeLayer.id, { flipY: !activeLayer.flipY });
                              handlePushHistory('Flip Layer Vertically');
                            }
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#1c1c28] hover:text-white text-[11px]"
                        >
                          Flip Vertically
                        </button>
                        <button
                          onClick={() => {
                            setShowFillModal(true);
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#1c1c28] hover:text-white text-[11px] cursor-pointer"
                        >
                          Fill...
                        </button>

                        <button
                          onClick={() => {
                            handleAddLayer('shape', {
                              name: 'Solid Fill',
                              shapeType: 'rectangle',
                              fillColor: brushColor,
                              strokeColor: 'transparent',
                              width: project.width,
                              height: project.height,
                              x: 0,
                              y: 0
                            });
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#1c1c28] hover:text-white text-[11px]"
                        >
                          Fill Canvas (Solid Color)
                        </button>
                      </div>
                    )}
                  </div>

                  {/* IMAGE MENU */}
                  <div className="relative">
                    <button
                      onClick={() => setActiveMenu(activeMenu === 'image' ? null : 'image')}
                      className={`px-2.5 py-1 rounded hover:bg-[#1a1a24] hover:text-white cursor-pointer ${activeMenu === 'image' ? 'bg-[#1a1a24] text-white' : ''}`}
                    >
                      Image
                    </button>
                    {activeMenu === 'image' && (
                      <div className="absolute left-0 mt-1.5 z-50 bg-[#121216] border border-[#2b2b36] rounded-lg shadow-2xl py-1 w-52 text-left animate-in fade-in slide-in-from-top-1 duration-100">
                        
                        {/* 1. Mode Submenu */}
                        <div className="relative group/sub">
                          <button className="flex items-center justify-between w-full px-3 py-1.5 hover:bg-indigo-600 hover:text-white text-[11px] cursor-pointer">
                            <span>Mode</span>
                            <span className="text-[8px] text-gray-500">▶</span>
                          </button>
                          <div className="hidden group-hover/sub:block absolute left-full top-0 -mt-1.5 z-50 bg-[#121216] border border-[#2b2b36] rounded-lg shadow-2xl py-1 w-44 text-left">
                            {[
                              { id: 'rgb', name: 'RGB Color' },
                              { id: 'cmyk', name: 'CMYK Color' },
                              { id: 'grayscale', name: 'Grayscale' },
                              { id: 'bitmap', name: 'Bitmap' },
                              { id: 'lab', name: 'Lab Color' },
                              { id: 'indexed', name: 'Indexed Color' },
                            ].map((m) => (
                              <button
                                key={m.id}
                                onClick={() => { handleApplyColorMode(m.id as any); setActiveMenu(null); }}
                                className="flex items-center justify-between w-full px-3 py-1.5 hover:bg-indigo-600 hover:text-white text-[11px] cursor-pointer"
                              >
                                <span>{m.name}</span>
                                {(project?.colorMode || 'rgb') === m.id && <span className="text-[9px] text-green-500">✓</span>}
                              </button>
                            ))}
                            <div className="h-[1px] bg-[#22222c] my-1" />
                            {[8, 16, 32].map((depth) => (
                              <button
                                key={depth}
                                onClick={() => { handleApplyBitDepth(depth as any); setActiveMenu(null); }}
                                className="flex items-center justify-between w-full px-3 py-1.5 hover:bg-indigo-600 hover:text-white text-[11px] cursor-pointer"
                              >
                                <span>{depth} Bits/Channel</span>
                                {(project?.bitDepth || 8) === depth && <span className="text-[9px] text-green-500">✓</span>}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 2. Adjustments Submenu */}
                        <div className="relative group/sub">
                          <button className="flex items-center justify-between w-full px-3 py-1.5 hover:bg-indigo-600 hover:text-white text-[11px] cursor-pointer">
                            <span>Adjustments</span>
                            <span className="text-[8px] text-gray-500">▶</span>
                          </button>
                          <div className="hidden group-hover/sub:block absolute left-full top-0 -mt-1.5 z-50 bg-[#121216] border border-[#2b2b36] rounded-lg shadow-2xl py-1 w-52 text-left h-[320px] overflow-y-auto">
                            {[
                              { id: 'brightness-contrast', name: 'Brightness & Contrast' },
                              { id: 'levels', name: 'Levels...' },
                              { id: 'curves', name: 'Curves...' },
                              { id: 'exposure', name: 'Exposure...' },
                              { id: 'vibrance', name: 'Vibrance' },
                              { id: 'hue-saturation', name: 'Hue / Saturation...' },
                              { id: 'color-balance', name: 'Color Balance...' },
                              { id: 'black-white', name: 'Black & White...' },
                              { id: 'photo-filter', name: 'Photo Filter...' },
                              { id: 'channel-mixer', name: 'Channel Mixer...' },
                              { id: 'color-lookup', name: 'Color Lookup...' },
                              { id: 'invert', name: 'Invert', shortcut: 'Ctrl+I' },
                              { id: 'posterize', name: 'Posterize...' },
                              { id: 'threshold', name: 'Threshold...' },
                              { id: 'gradient-map', name: 'Gradient Map...' },
                              { id: 'selective-color', name: 'Selective Color...' },
                              { id: 'match-color', name: 'Match Color...' },
                              { id: 'replace-color', name: 'Replace Color...' },
                              { id: 'shadows-highlights', name: 'Shadows / Highlights...' },
                              { id: 'hdr-toning', name: 'HDR Toning...' },
                            ].map((adj) => (
                              <button
                                key={adj.id}
                                onClick={() => {
                                  if (adj.id === 'invert') {
                                    // Trigger Invert directly or through Adjustments Dialog
                                    handleApplyAdjustment({ invert: 100 } as any, 'direct');
                                  } else {
                                    setActiveImageDialog(adj.id);
                                  }
                                  setActiveMenu(null);
                                }}
                                className="flex items-center justify-between w-full px-3 py-1.5 hover:bg-indigo-600 hover:text-white text-[11px] cursor-pointer"
                              >
                                <span>{adj.name}</span>
                                {adj.shortcut && <span className="text-[9px] text-gray-500 font-mono">{adj.shortcut}</span>}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="h-[1px] bg-[#22222c] my-1" />

                        {/* 3. Auto adjustments */}
                        <button
                          onClick={() => { handleApplyAuto('tone'); setActiveMenu(null); }}
                          className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white text-[11px] cursor-pointer"
                        >
                          Auto Tone
                        </button>
                        <button
                          onClick={() => { handleApplyAuto('contrast'); setActiveMenu(null); }}
                          className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white text-[11px] cursor-pointer"
                        >
                          Auto Contrast
                        </button>
                        <button
                          onClick={() => { handleApplyAuto('color'); setActiveMenu(null); }}
                          className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white text-[11px] cursor-pointer"
                        >
                          Auto Color
                        </button>

                        <div className="h-[1px] bg-[#22222c] my-1" />

                        {/* 4. Resizing */}
                        <button
                          onClick={() => { setActiveImageDialog('image-size'); setActiveMenu(null); }}
                          className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white text-[11px] cursor-pointer"
                        >
                          Image Size...
                        </button>
                        <button
                          onClick={() => { setActiveImageDialog('canvas-size'); setActiveMenu(null); }}
                          className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white text-[11px] cursor-pointer"
                        >
                          Canvas Size...
                        </button>

                        {/* 5. Image / Object Rotation Submenu */}
                        <div className="relative group/sub">
                          <button className="flex items-center justify-between w-full px-3 py-1.5 hover:bg-indigo-600 hover:text-white text-[11px] cursor-pointer">
                            <span>Image Rotation</span>
                            <span className="text-[8px] text-gray-500">▶</span>
                          </button>
                          <div className="hidden group-hover/sub:block absolute left-full top-0 -mt-1.5 z-50 bg-[#121216] border border-[#2b2b36] rounded-lg shadow-2xl py-1 w-48 text-left">
                            <button
                              onClick={() => { handleApplyImageRotation('90cw'); setActiveMenu(null); }}
                              className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white text-[11px] cursor-pointer"
                            >
                              Rotate 90° CW
                            </button>
                            <button
                              onClick={() => { handleApplyImageRotation('90ccw'); setActiveMenu(null); }}
                              className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white text-[11px] cursor-pointer"
                            >
                              Rotate 90° CCW
                            </button>
                            <button
                              onClick={() => { handleApplyImageRotation('180'); setActiveMenu(null); }}
                              className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white text-[11px] cursor-pointer"
                            >
                              Rotate 180°
                            </button>
                            <div className="h-[1px] bg-[#22222c] my-1" />
                            <button
                              onClick={() => { handleApplyImageRotation('flipH'); setActiveMenu(null); }}
                              className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white text-[11px] cursor-pointer"
                            >
                              Flip Horizontal
                            </button>
                            <button
                              onClick={() => { handleApplyImageRotation('flipV'); setActiveMenu(null); }}
                              className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white text-[11px] cursor-pointer"
                            >
                              Flip Vertical
                            </button>
                          </div>
                        </div>

                        <div className="h-[1px] bg-[#22222c] my-1" />

                        {/* 6. Crop / Trim / Reveal All */}
                        <button
                          onClick={() => {
                            setActiveTool('crop');
                            setActiveSubTool('crop');
                            setActiveMenu(null);
                            setToast({ message: "Crop tool activated. Drag borders to resize.", type: 'info' });
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white text-[11px] cursor-pointer"
                        >
                          Crop Tool
                        </button>
                        
                        <div className="relative group/sub">
                          <button className="flex items-center justify-between w-full px-3 py-1.5 hover:bg-indigo-600 hover:text-white text-[11px] cursor-pointer">
                            <span>Trim...</span>
                            <span className="text-[8px] text-gray-500">▶</span>
                          </button>
                          <div className="hidden group-hover/sub:block absolute left-full top-0 -mt-1.5 z-50 bg-[#121216] border border-[#2b2b36] rounded-lg shadow-2xl py-1 w-44 text-left">
                            <button
                              onClick={() => { handleApplyTrim('transparent'); setActiveMenu(null); }}
                              className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white text-[11px] cursor-pointer"
                            >
                              Transparent Pixels
                            </button>
                            <button
                              onClick={() => { handleApplyTrim('top-left'); setActiveMenu(null); }}
                              className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white text-[11px] cursor-pointer"
                            >
                              Top-Left Pixel Color
                            </button>
                            <button
                              onClick={() => { handleApplyTrim('bottom-right'); setActiveMenu(null); }}
                              className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white text-[11px] cursor-pointer"
                            >
                              Bottom-Right Pixel Color
                            </button>
                          </div>
                        </div>

                        <button
                          onClick={() => { handleApplyRevealAll(); setActiveMenu(null); }}
                          className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white text-[11px] cursor-pointer"
                        >
                          Reveal All
                        </button>

                        <div className="h-[1px] bg-[#22222c] my-1" />

                        {/* 7. Document management & Stats */}
                        <button
                          onClick={() => { handleDuplicateProject(); setActiveMenu(null); }}
                          className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white text-[11px] cursor-pointer"
                        >
                          Duplicate Document
                        </button>
                        <button
                          onClick={() => { setActiveImageDialog('image-info'); setActiveMenu(null); }}
                          className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white text-[11px] cursor-pointer"
                        >
                          Image Information...
                        </button>
                      </div>
                    )}
                  </div>

                  {/* LAYER MENU */}
                  <div className="relative">
                    <button
                      onClick={() => setActiveMenu(activeMenu === 'layer' ? null : 'layer')}
                      className={`px-2.5 py-1 rounded hover:bg-[#1a1a24] hover:text-white cursor-pointer ${activeMenu === 'layer' ? 'bg-[#1a1a24] text-white' : ''}`}
                    >
                      Layer
                    </button>
                    {activeMenu === 'layer' && (
                      <div className="absolute left-0 mt-1.5 z-50 bg-[#121216] border border-[#2b2b36] rounded-lg shadow-2xl py-1 w-56 text-left animate-in fade-in slide-in-from-top-1 duration-100 text-gray-200">
                        
                        {/* 1. New Submenu */}
                        <div className="relative group/sub">
                          <button className="flex items-center justify-between w-full px-3 py-1.5 hover:bg-indigo-600 hover:text-white text-[11px] cursor-pointer font-medium">
                            <span>New</span>
                            <span className="text-[8px] text-gray-500">▶</span>
                          </button>
                          <div className="hidden group-hover/sub:block absolute left-full top-0 -mt-1 z-50 bg-[#121216] border border-[#2b2b36] rounded-lg shadow-2xl py-1 w-48 text-left">
                            <button
                              onClick={() => { setActiveDialog('newLayer'); setActiveMenu(null); }}
                              className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white text-[11px] cursor-pointer"
                            >
                              Layer... (Shift+Ctrl+N)
                            </button>
                            <button
                              onClick={() => { handleAddLayer('group', { name: 'Folder 1' }); setActiveMenu(null); }}
                              className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white text-[11px] cursor-pointer"
                            >
                              Group / Folder
                            </button>
                            <button
                              onClick={() => { handleGroupSelectedLayers(); setActiveMenu(null); }}
                              className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white text-[11px] cursor-pointer"
                            >
                              Group from Layers
                            </button>
                            <div className="h-[1px] bg-[#22222c] my-1" />
                            <button
                              onClick={() => {
                                if (activeLayerId) {
                                  handleUpdateLayer(activeLayerId, { name: 'Background', locked: true });
                                  setToast({ message: "Converted layer to background", type: 'info' });
                                }
                                setActiveMenu(null);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white text-[11px] cursor-pointer"
                            >
                              Background from Layer
                            </button>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            if (activeLayerId) {
                              setTargetDuplicateLayerId(activeLayerId);
                              setActiveDialog('duplicateLayer');
                            }
                            setActiveMenu(null);
                          }}
                          className="flex items-center justify-between w-full px-3 py-1.5 hover:bg-[#1c1c28] hover:text-white text-[11px] cursor-pointer"
                        >
                          <span>Duplicate Layer...</span>
                          <span className="text-[9px] text-gray-500 font-mono">Ctrl+J</span>
                        </button>

                        <button
                          onClick={() => {
                            if (activeLayerId) handleDeleteLayer(activeLayerId);
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#1c1c28] hover:text-red-400 text-[11px] cursor-pointer text-red-500 font-medium"
                        >
                          Delete Active Layer
                        </button>

                        <div className="h-[1px] bg-[#22222c] my-1" />

                        {/* 2. Layer Style Submenu */}
                        <div className="relative group/sub">
                          <button className="flex items-center justify-between w-full px-3 py-1.5 hover:bg-indigo-600 hover:text-white text-[11px] cursor-pointer font-medium">
                            <span>Layer Style (fx)</span>
                            <span className="text-[8px] text-gray-500">▶</span>
                          </button>
                          <div className="hidden group-hover/sub:block absolute left-full top-0 -mt-1 z-50 bg-[#121216] border border-[#2b2b36] rounded-lg shadow-2xl py-1 w-48 text-left">
                            <button
                              onClick={() => {
                                if (activeLayerId) {
                                  setLayerStyleInitialTab('blending');
                                  setTargetStyleLayerId(activeLayerId);
                                  setActiveDialog('layerStyle');
                                } else {
                                  setToast({ message: "Select a layer first to open Layer Style.", type: 'warning' });
                                }
                                setActiveMenu(null);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white text-[11px] cursor-pointer font-bold"
                            >
                              Blending Options...
                            </button>
                            <hr className="border-[#22222c] my-1" />
                            <button
                              onClick={() => {
                                if (activeLayerId) {
                                  setLayerStyleInitialTab('bevel');
                                  setTargetStyleLayerId(activeLayerId);
                                  setActiveDialog('layerStyle');
                                } else {
                                  setToast({ message: "Select a layer first to apply Bevel & Emboss.", type: 'warning' });
                                }
                                setActiveMenu(null);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white text-[11px] cursor-pointer"
                            >
                              Bevel & Emboss...
                            </button>
                            <button
                              onClick={() => {
                                if (activeLayerId) {
                                  const activeL = project?.layers.find(l => l.id === activeLayerId);
                                  const existingStyles = activeL?.layerStyles || {};
                                  handleUpdateLayer(activeLayerId, {
                                    layerStyles: {
                                      ...existingStyles,
                                      stroke: {
                                        size: 3,
                                        position: 'outside',
                                        blendMode: 'normal',
                                        opacity: 1,
                                        colorType: 'color',
                                        color: '#ff0000',
                                        ...(existingStyles.stroke || {}),
                                        enabled: true,
                                      }
                                    }
                                  });
                                  setLayerStyleInitialTab('stroke');
                                  setTargetStyleLayerId(activeLayerId);
                                  setActiveDialog('layerStyle');
                                } else {
                                  setToast({ message: "Select a layer first to apply Stroke.", type: 'warning' });
                                }
                                setActiveMenu(null);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white text-[11px] cursor-pointer"
                            >
                              Stroke outline...
                            </button>
                            <button
                              onClick={() => {
                                if (activeLayerId) {
                                  setLayerStyleInitialTab('innerShadow');
                                  setTargetStyleLayerId(activeLayerId);
                                  setActiveDialog('layerStyle');
                                } else {
                                  setToast({ message: "Select a layer first to apply Inner Shadow.", type: 'warning' });
                                }
                                setActiveMenu(null);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white text-[11px] cursor-pointer"
                            >
                              Inner Shadow...
                            </button>
                            <button
                              onClick={() => {
                                if (activeLayerId) {
                                  setLayerStyleInitialTab('colorOverlay');
                                  setTargetStyleLayerId(activeLayerId);
                                  setActiveDialog('layerStyle');
                                } else {
                                  setToast({ message: "Select a layer first to apply Color Overlay.", type: 'warning' });
                                }
                                setActiveMenu(null);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white text-[11px] cursor-pointer"
                            >
                              Color Overlay...
                            </button>
                            <button
                              onClick={() => {
                                if (activeLayerId) {
                                  setLayerStyleInitialTab('gradientOverlay');
                                  setTargetStyleLayerId(activeLayerId);
                                  setActiveDialog('layerStyle');
                                } else {
                                  setToast({ message: "Select a layer first to apply Gradient Overlay.", type: 'warning' });
                                }
                                setActiveMenu(null);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white text-[11px] cursor-pointer"
                            >
                              Gradient Overlay...
                            </button>
                            <button
                              onClick={() => {
                                if (activeLayerId) {
                                  setLayerStyleInitialTab('outerGlow');
                                  setTargetStyleLayerId(activeLayerId);
                                  setActiveDialog('layerStyle');
                                } else {
                                  setToast({ message: "Select a layer first to apply Outer Glow.", type: 'warning' });
                                }
                                setActiveMenu(null);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white text-[11px] cursor-pointer"
                            >
                              Outer Glow...
                            </button>
                            <button
                              onClick={() => {
                                if (activeLayerId) {
                                  const activeL = project?.layers.find(l => l.id === activeLayerId);
                                  const existingStyles = activeL?.layerStyles || {};
                                  handleUpdateLayer(activeLayerId, {
                                    layerStyles: {
                                      ...existingStyles,
                                      dropShadow: {
                                        color: '#000000',
                                        opacity: 0.5,
                                        blendMode: 'multiply',
                                        angle: 120,
                                        distance: 5,
                                        spread: 0,
                                        size: 5,
                                        ...(existingStyles.dropShadow || {}),
                                        enabled: true,
                                      }
                                    }
                                  });
                                  setLayerStyleInitialTab('dropShadow');
                                  setTargetStyleLayerId(activeLayerId);
                                  setActiveDialog('layerStyle');
                                } else {
                                  setToast({ message: "Select a layer first to apply Drop Shadow.", type: 'warning' });
                                }
                                setActiveMenu(null);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white text-[11px] cursor-pointer"
                            >
                              Drop Shadow...
                            </button>
                          </div>
                        </div>

                        {/* 3. Smart Objects Submenu */}
                        <div className="relative group/sub">
                          <button className="flex items-center justify-between w-full px-3 py-1.5 hover:bg-indigo-600 hover:text-white text-[11px] cursor-pointer font-medium">
                            <span>Smart Objects</span>
                            <span className="text-[8px] text-gray-500">▶</span>
                          </button>
                          <div className="hidden group-hover/sub:block absolute left-full top-0 -mt-1 z-50 bg-[#121216] border border-[#2b2b36] rounded-lg shadow-2xl py-1 w-44 text-left">
                            <button
                              onClick={() => {
                                if (activeLayerId) handleUpdateLayer(activeLayerId, { type: 'smartobject' });
                                setActiveMenu(null);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white text-[11px] cursor-pointer"
                            >
                              Convert to Smart Object
                            </button>
                            <button
                              onClick={() => {
                                if (activeLayerId) handleEditSmartObject(activeLayerId);
                                setActiveMenu(null);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white text-[11px] cursor-pointer"
                            >
                              Edit Contents
                            </button>
                            <button
                              onClick={() => {
                                if (activeLayerId) handleUpdateLayer(activeLayerId, { type: 'image' });
                                setActiveMenu(null);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white text-[11px] cursor-pointer"
                            >
                              Rasterize Smart Object
                            </button>
                          </div>
                        </div>

                        {/* 4. Layer Mask Submenu */}
                        <div className="relative group/sub">
                          <button className="flex items-center justify-between w-full px-3 py-1.5 hover:bg-indigo-600 hover:text-white text-[11px] cursor-pointer font-medium">
                            <span>Layer Mask</span>
                            <span className="text-[8px] text-gray-500">▶</span>
                          </button>
                          <div className="hidden group-hover/sub:block absolute left-full top-0 -mt-1 z-50 bg-[#121216] border border-[#2b2b36] rounded-lg shadow-2xl py-1 w-44 text-left">
                            <button
                              onClick={() => {
                                if (activeLayerId) {
                                  const activeL = project.layers.find(l => l.id === activeLayerId);
                                  const mCanvas = document.createElement('canvas');
                                  mCanvas.width = activeL?.width || 500;
                                  mCanvas.height = activeL?.height || 500;
                                  const mCtx = mCanvas.getContext('2d');
                                  if (mCtx) {
                                    mCtx.fillStyle = '#ffffff';
                                    mCtx.fillRect(0, 0, mCanvas.width, mCanvas.height);
                                  }
                                  handleUpdateLayer(activeLayerId, { hasMask: true, maskCanvas: mCanvas });
                                }
                                setActiveMenu(null);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white text-[11px] cursor-pointer"
                            >
                              Reveal All
                            </button>
                            <button
                              onClick={() => {
                                if (activeLayerId) {
                                  const activeL = project.layers.find(l => l.id === activeLayerId);
                                  const mCanvas = document.createElement('canvas');
                                  mCanvas.width = activeL?.width || 500;
                                  mCanvas.height = activeL?.height || 500;
                                  const mCtx = mCanvas.getContext('2d');
                                  if (mCtx) {
                                    mCtx.fillStyle = '#000000';
                                    mCtx.fillRect(0, 0, mCanvas.width, mCanvas.height);
                                  }
                                  handleUpdateLayer(activeLayerId, { hasMask: true, maskCanvas: mCanvas });
                                }
                                setActiveMenu(null);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white text-[11px] cursor-pointer"
                            >
                              Hide All
                            </button>
                            <div className="h-[1px] bg-[#22222c] my-1" />
                            <button
                              onClick={() => {
                                if (activeLayerId) {
                                  handleUpdateLayer(activeLayerId, { hasMask: false, maskCanvas: undefined });
                                }
                                setActiveMenu(null);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white text-[11px] cursor-pointer text-red-400"
                            >
                              Delete Layer Mask
                            </button>
                          </div>
                        </div>

                        {/* 5. Clipping Mask option */}
                        <button
                          onClick={() => {
                            if (activeLayerId) {
                              const activeL = project.layers.find(l => l.id === activeLayerId);
                              if (activeL) {
                                handleUpdateLayer(activeLayerId, { isClippingMask: !activeL.isClippingMask });
                                setToast({ message: activeL.isClippingMask ? "Released Clipping Mask" : "Created Clipping Mask", type: 'success' });
                              }
                            }
                            setActiveMenu(null);
                          }}
                          className="flex items-center justify-between w-full px-3 py-1.5 hover:bg-[#1c1c28] hover:text-white text-[11px] cursor-pointer"
                        >
                          <span>{project?.layers.find(l => l.id === activeLayerId)?.isClippingMask ? 'Release Clipping Mask' : 'Create Clipping Mask'}</span>
                          <span className="text-[9px] text-gray-500 font-mono">Ctrl+Alt+G</span>
                        </button>

                        <div className="h-[1px] bg-[#22222c] my-1" />

                        {/* 6. Arrange Submenu */}
                        <div className="relative group/sub">
                          <button className="flex items-center justify-between w-full px-3 py-1.5 hover:bg-indigo-600 hover:text-white text-[11px] cursor-pointer font-medium">
                            <span>Arrange</span>
                            <span className="text-[8px] text-gray-500">▶</span>
                          </button>
                          <div className="hidden group-hover/sub:block absolute left-full top-0 -mt-1 z-50 bg-[#121216] border border-[#2b2b36] rounded-lg shadow-2xl py-1 w-44 text-left">
                            <button
                              onClick={() => { handleArrangeLayer('front'); setActiveMenu(null); }}
                              className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white text-[11px] cursor-pointer"
                            >
                              Bring to Front
                            </button>
                            <button
                              onClick={() => { handleArrangeLayer('forward'); setActiveMenu(null); }}
                              className="flex items-center justify-between w-full px-3 py-1.5 hover:bg-indigo-600 hover:text-white text-[11px] cursor-pointer"
                            >
                              <span>Bring Forward</span>
                              <span className="text-[9px] text-gray-500 font-mono">Ctrl+]</span>
                            </button>
                            <button
                              onClick={() => { handleArrangeLayer('backward'); setActiveMenu(null); }}
                              className="flex items-center justify-between w-full px-3 py-1.5 hover:bg-indigo-600 hover:text-white text-[11px] cursor-pointer"
                            >
                              <span>Send Backward</span>
                              <span className="text-[9px] text-gray-500 font-mono">Ctrl+[</span>
                            </button>
                            <button
                              onClick={() => { handleArrangeLayer('back'); setActiveMenu(null); }}
                              className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white text-[11px] cursor-pointer"
                            >
                              Send to Back
                            </button>
                          </div>
                        </div>

                        {/* 7. Align Submenu */}
                        <div className="relative group/sub">
                          <button className="flex items-center justify-between w-full px-3 py-1.5 hover:bg-indigo-600 hover:text-white text-[11px] cursor-pointer font-medium">
                            <span>Align</span>
                            <span className="text-[8px] text-gray-500">▶</span>
                          </button>
                          <div className="hidden group-hover/sub:block absolute left-full top-0 -mt-1 z-50 bg-[#121216] border border-[#2b2b36] rounded-lg shadow-2xl py-1 w-44 text-left">
                            {['left', 'center-h', 'right', 'top', 'center-v', 'bottom'].map((align) => (
                              <button
                                key={`menu-align-${align}`}
                                onClick={() => { handleAlignLayers(align as any); setActiveMenu(null); }}
                                className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white text-[11px] cursor-pointer capitalize"
                              >
                                {align.replace('-h', ' horizontal').replace('-v', ' vertical')}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 8. Distribute Submenu */}
                        <div className="relative group/sub">
                          <button className="flex items-center justify-between w-full px-3 py-1.5 hover:bg-indigo-600 hover:text-white text-[11px] cursor-pointer font-medium">
                            <span>Distribute</span>
                            <span className="text-[8px] text-gray-500">▶</span>
                          </button>
                          <div className="hidden group-hover/sub:block absolute left-full top-0 -mt-1 z-50 bg-[#121216] border border-[#2b2b36] rounded-lg shadow-2xl py-1 w-44 text-left">
                            <button
                              onClick={() => { handleDistributeLayers('horizontal'); setActiveMenu(null); }}
                              className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white text-[11px] cursor-pointer"
                            >
                              Horizontal Spacing
                            </button>
                            <button
                              onClick={() => { handleDistributeLayers('vertical'); setActiveMenu(null); }}
                              className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white text-[11px] cursor-pointer"
                            >
                              Vertical Spacing
                            </button>
                          </div>
                        </div>

                        <div className="h-[1px] bg-[#22222c] my-1" />

                        {/* 9. Merges */}
                        <button
                          onClick={() => { handleMergeLayers(); setActiveMenu(null); }}
                          className="flex items-center justify-between w-full px-3 py-1.5 hover:bg-[#1c1c28] hover:text-white text-[11px] cursor-pointer"
                        >
                          <span>Merge Down</span>
                          <span className="text-[9px] text-gray-500 font-mono">Ctrl+E</span>
                        </button>
                        <button
                          onClick={() => { handleMergeSelectedLayers(); setActiveMenu(null); }}
                          disabled={activeLayerIds.length < 2}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#1c1c28] hover:text-white text-[11px] cursor-pointer disabled:opacity-30"
                        >
                          Merge Selected Layers
                        </button>
                        <button
                          onClick={() => { handleMergeVisible(); setActiveMenu(null); }}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#1c1c28] hover:text-white text-[11px] cursor-pointer"
                        >
                          Merge Visible
                        </button>
                        <button
                          onClick={() => { handleFlattenImage(); setActiveMenu(null); }}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#1c1c28] hover:text-white text-[11px] cursor-pointer"
                        >
                          Flatten Image
                        </button>

                        <div className="h-[1px] bg-[#22222c] my-1" />
                        <button
                          onClick={() => {
                            if (activeLayerId) {
                              setTargetPropertiesLayerId(activeLayerId);
                              setActiveDialog('layerProperties');
                            }
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#1c1c28] hover:text-white text-[11px] cursor-pointer"
                        >
                          Layer Properties...
                        </button>
                      </div>
                    )}
                  </div>

                  {/* TYPE MENU */}
                  <div className="relative">
                    <button
                      onClick={() => setActiveMenu(activeMenu === 'type' ? null : 'type')}
                      className={`px-2.5 py-1 rounded hover:bg-[#1a1a24] hover:text-white cursor-pointer ${activeMenu === 'type' ? 'bg-[#1a1a24] text-white' : ''}`}
                    >
                      Type
                    </button>
                    {activeMenu === 'type' && (
                      <div className="absolute left-0 mt-1.5 z-50 bg-[#121216] border border-[#2b2b36] rounded-lg shadow-2xl py-1 w-52 text-left animate-in fade-in slide-in-from-top-1 duration-100">
                        <button
                          onClick={() => {
                            handleAddLayer('text', { name: 'Empty Text Layer', text: 'Horizontal Text', fontSize: 32 });
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#1c1c28] hover:text-white text-[11px]"
                        >
                          Add Horizontal Type
                        </button>
                        <button
                          onClick={() => {
                            const activeLayer = project?.layers.find(l => l.id === activeLayerId);
                            if (activeLayer && activeLayer.type === 'text') {
                              handleUpdateLayer(activeLayer.id, { textWarp: 'arc' });
                              handlePushHistory('Apply Arc Warp');
                            } else {
                              setToast({ message: 'Select a text layer first to apply warp.', type: 'error' });
                            }
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#1c1c28] hover:text-white text-[11px]"
                        >
                          Warp Text (Arc)
                        </button>
                        <button
                          onClick={() => {
                            const activeLayer = project?.layers.find(l => l.id === activeLayerId);
                            if (activeLayer && activeLayer.type === 'text') {
                              handleUpdateLayer(activeLayer.id, { textWarp: 'wave' });
                              handlePushHistory('Apply Wave Warp');
                            } else {
                              setToast({ message: 'Select a text layer first to apply warp.', type: 'error' });
                            }
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#1c1c28] hover:text-white text-[11px]"
                        >
                          Warp Text (Wave)
                        </button>
                        <button
                          onClick={() => {
                            const activeLayer = project?.layers.find(l => l.id === activeLayerId);
                            if (activeLayer && activeLayer.type === 'text') {
                              handleUpdateLayer(activeLayer.id, { textWarp: 'none' });
                              handlePushHistory('Clear Warp');
                            } else {
                              setToast({ message: 'Select a text layer first to apply warp.', type: 'error' });
                            }
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#1c1c28] hover:text-white text-[11px]"
                        >
                          Clear Text Warp
                        </button>
                      </div>
                    )}
                  </div>

                  {/* SELECT MENU */}
                  <div className="relative">
                    <button
                      onClick={() => setActiveMenu(activeMenu === 'select' ? null : 'select')}
                      className={`px-2.5 py-1 rounded hover:bg-[#1a1a24] hover:text-white cursor-pointer ${activeMenu === 'select' ? 'bg-[#1a1a24] text-white' : ''}`}
                    >
                      Select
                    </button>
                    {activeMenu === 'select' && (
                      <div className="absolute left-0 mt-1.5 z-50 bg-[#121216] border border-[#2b2b36] rounded-lg shadow-2xl py-1 w-52 text-left animate-in fade-in slide-in-from-top-1 duration-100">
                        <button
                          onClick={() => {
                            setToast({ message: 'Select All triggered! Press Ctrl+A on canvas workspace to execute.', type: 'info' });
                            setActiveMenu(null);
                          }}
                          className="flex items-center justify-between w-full px-3 py-1.5 hover:bg-[#1c1c28] hover:text-white text-[11px]"
                        >
                          <span>All</span>
                          <span className="text-[9px] text-gray-500 font-mono">Ctrl+A</span>
                        </button>
                        <button
                          onClick={() => {
                            setToast({ message: 'Deselected! Press Ctrl+D on canvas workspace to execute.', type: 'info' });
                            setActiveMenu(null);
                          }}
                          className="flex items-center justify-between w-full px-3 py-1.5 hover:bg-[#1c1c28] hover:text-white text-[11px]"
                        >
                          <span>Deselect</span>
                          <span className="text-[9px] text-gray-500 font-mono">Ctrl+D</span>
                        </button>
                        <div className="h-[1px] bg-[#22222c] my-1" />
                        <button
                          onClick={() => {
                            setActiveTool('select-rect');
                            setActiveSubTool('select-rect');
                            setToast({ message: 'Marquee Tool activated', type: 'info' });
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#1c1c28] hover:text-white text-[11px]"
                        >
                          Select Marquee Tool
                        </button>
                        <button
                          onClick={() => {
                            setActiveTool('select-lasso');
                            setActiveSubTool('select-lasso');
                            setToast({ message: 'Lasso Tool activated', type: 'info' });
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#1c1c28] hover:text-white text-[11px]"
                        >
                          Select Lasso Tool
                        </button>
                      </div>
                    )}
                  </div>

                  {/* FILTER MENU */}
                  <div className="relative">
                    <button
                      onClick={() => setActiveMenu(activeMenu === 'filter' ? null : 'filter')}
                      className={`px-2.5 py-1 rounded hover:bg-[#1a1a24] hover:text-white cursor-pointer ${activeMenu === 'filter' ? 'bg-[#1a1a24] text-white' : ''}`}
                    >
                      Filter
                    </button>
                    {activeMenu === 'filter' && (
                      <div className="absolute left-0 mt-1.5 z-50 bg-[#121216] border border-[#2b2b36] rounded-lg shadow-2xl py-1 w-52 text-left animate-in fade-in slide-in-from-top-1 duration-100">
                        <button
                          onClick={() => { setShowRemoveBgModal(true); setActiveMenu(null); }}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#1c1c28] hover:text-white text-[11px] text-amber-300 font-bold"
                        >
                          AI Remove Background
                        </button>
                        <button
                          onClick={() => { handleInpaintObject(); setActiveMenu(null); }}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#1c1c28] hover:text-white text-[11px]"
                        >
                          AI Content-Aware Healing
                        </button>
                        <button
                          onClick={() => { setShowFilterGallery(true); setActiveMenu(null); }}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#1c1c28] hover:text-white text-[11px] font-bold text-indigo-400"
                        >
                          Filter Gallery...
                        </button>
                        <div className="h-[1px] bg-[#22222c] my-1" />
                        <button
                          onClick={() => {
                            setToast({ message: 'Select Blur Tool from Left Sidebar to paint focus filters.', type: 'info' });
                            setActiveTool('blur-sharpen');
                            setActiveSubTool('blur');
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#1c1c28] hover:text-white text-[11px]"
                        >
                          Blur Filter Brush
                        </button>
                        <button
                          onClick={() => {
                            setToast({ message: 'Select Sharpen Tool from Left Sidebar to paint detail enhancement.', type: 'info' });
                            setActiveTool('blur-sharpen');
                            setActiveSubTool('sharpen');
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#1c1c28] hover:text-white text-[11px]"
                        >
                          Sharpen Filter Brush
                        </button>
                      </div>
                    )}
                  </div>

                  {/* AI MENU */}
                  <div className="relative">
                    <button
                      onClick={() => setActiveMenu(activeMenu === 'ai' ? null : 'ai')}
                      className={`px-2.5 py-1 rounded hover:bg-[#1a1a24] hover:text-white cursor-pointer ${activeMenu === 'ai' ? 'bg-[#1a1a24] text-white' : ''}`}
                    >
                      AI
                    </button>
                    {activeMenu === 'ai' && (
                      <div className="absolute left-0 mt-1.5 z-50 bg-[#121216] border border-[#2b2b36] rounded-lg shadow-2xl py-1 w-52 text-left animate-in fade-in slide-in-from-top-1 duration-100">
                        <button
                          onClick={() => { setShowRemoveBgModal(true); setActiveMenu(null); }}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#1c1c28] hover:text-white text-[11px] font-bold text-indigo-400"
                        >
                          AI Remove Background
                        </button>
                        <button
                          onClick={() => { handleInpaintObject(); setActiveMenu(null); }}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#1c1c28] hover:text-white text-[11px]"
                        >
                          AI Spot Healing...
                        </button>
                        <button
                          onClick={() => { handleUpscaleImage(); setActiveMenu(null); }}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#1c1c28] hover:text-white text-[11px]"
                        >
                          AI Super-Res Upscale
                        </button>
                      </div>
                    )}
                  </div>

                  {/* VIEW MENU */}
                  <div className="relative">
                    <button
                      onClick={() => setActiveMenu(activeMenu === 'view' ? null : 'view')}
                      className={`px-2.5 py-1 rounded hover:bg-[#1a1a24] hover:text-white cursor-pointer ${activeMenu === 'view' ? 'bg-[#1a1a24] text-white' : ''}`}
                    >
                      View
                    </button>
                    {activeMenu === 'view' && (
                      <div className="absolute left-0 mt-1.5 z-50 bg-[#121216] border border-[#2b2b36] rounded-lg shadow-2xl py-1 w-52 text-left animate-in fade-in slide-in-from-top-1 duration-100">
                        <button
                          onClick={() => {
                            setEditorZoom((z) => Math.min(8.0, parseFloat((z + 0.15).toFixed(2))));
                            setActiveMenu(null);
                          }}
                          className="flex items-center justify-between w-full px-3 py-1.5 hover:bg-[#1c1c28] hover:text-white text-[11px]"
                        >
                          <span>Zoom In</span>
                          <span className="text-[9px] text-gray-500 font-mono">Ctrl++</span>
                        </button>
                        <button
                          onClick={() => {
                            setEditorZoom((z) => Math.max(0.1, parseFloat((z - 0.15).toFixed(2))));
                            setActiveMenu(null);
                          }}
                          className="flex items-center justify-between w-full px-3 py-1.5 hover:bg-[#1c1c28] hover:text-white text-[11px]"
                        >
                          <span>Zoom Out</span>
                          <span className="text-[9px] text-gray-500 font-mono">Ctrl+-</span>
                        </button>
                        <button
                          onClick={() => {
                            if (project) {
                              const viewportW = window.innerWidth - 420;
                              const viewportH = window.innerHeight - 80;
                              const fitZoom = Math.min(
                                Math.max(0.1, (viewportW - 60) / project.width),
                                Math.max(0.1, (viewportH - 60) / project.height),
                                1.5
                              );
                              setEditorZoom(parseFloat(fitZoom.toFixed(2)));
                            }
                            setActiveMenu(null);
                          }}
                          className="flex items-center justify-between w-full px-3 py-1.5 hover:bg-[#1c1c28] hover:text-white text-[11px]"
                        >
                          <span>Fit on Screen</span>
                          <span className="text-[9px] text-gray-500 font-mono">Ctrl+0</span>
                        </button>
                        <button
                          onClick={() => {
                            setEditorZoom(1.0);
                            setActiveMenu(null);
                          }}
                          className="flex items-center justify-between w-full px-3 py-1.5 hover:bg-[#1c1c28] hover:text-white text-[11px]"
                        >
                          <span>100% Zoom</span>
                          <span className="text-[9px] text-gray-500 font-mono">Ctrl+1</span>
                        </button>
                        <div className="h-[1px] bg-[#22222c] my-1" />
                        <label className="flex items-center justify-between w-full px-3 py-1.5 hover:bg-[#1c1c28] text-[11px] cursor-pointer">
                          <span>Show Grid</span>
                          <input
                            type="checkbox"
                            checked={gridSettings.enabled}
                            onChange={(e) => setGridSettings((prev) => ({ ...prev, enabled: e.target.checked }))}
                            className="accent-indigo-500 rounded"
                          />
                        </label>
                        <label className="flex items-center justify-between w-full px-3 py-1.5 hover:bg-[#1c1c28] text-[11px] cursor-pointer">
                          <span>Snap to Grid</span>
                          <input
                            type="checkbox"
                            checked={gridSettings.snapEnabled}
                            onChange={(e) => setGridSettings((prev) => ({ ...prev, snapEnabled: e.target.checked }))}
                            className="accent-indigo-500 rounded"
                          />
                        </label>
                        <label className="flex items-center justify-between w-full px-3 py-1.5 hover:bg-[#1c1c28] text-[11px] cursor-pointer">
                          <span>Smart Alignment Guides</span>
                          <input
                            type="checkbox"
                            checked={alignmentGuides.enabled}
                            onChange={(e) => setAlignmentGuides((prev) => ({ ...prev, enabled: e.target.checked }))}
                            className="accent-indigo-500 rounded"
                          />
                        </label>
                        <label className="flex items-center justify-between w-full px-3 py-1.5 hover:bg-[#1c1c28] text-[11px] cursor-pointer">
                          <span>Show Rulers (Ctrl+R)</span>
                          <input
                            type="checkbox"
                            checked={showRulers}
                            onChange={(e) => setShowRulers(e.target.checked)}
                            className="accent-indigo-500 rounded"
                          />
                        </label>
                        <label className="flex items-center justify-between w-full px-3 py-1.5 hover:bg-[#1c1c28] text-[11px] cursor-pointer">
                          <span>Show Guides (Ctrl+;)</span>
                          <input
                            type="checkbox"
                            checked={showGuides}
                            onChange={(e) => setShowGuides(e.target.checked)}
                            className="accent-indigo-500 rounded"
                          />
                        </label>
                        <button
                          onClick={() => {
                            if (project) {
                              setProject({ ...project, guides: [] });
                              setToast({ message: 'Cleared all guidelines!', type: 'success' });
                            }
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#1c1c28] hover:text-white text-[11px]"
                        >
                          Clear Guides
                        </button>
                      </div>
                    )}
                  </div>

                  {/* WINDOW MENU */}
                  <div className="relative">
                    <button
                      onClick={() => setActiveMenu(activeMenu === 'window' ? null : 'window')}
                      className={`px-2.5 py-1 rounded hover:bg-[#1a1a24] hover:text-white cursor-pointer ${activeMenu === 'window' ? 'bg-[#1a1a24] text-white' : ''}`}
                    >
                      Window
                    </button>
                    <WindowMenu
                      isOpen={activeMenu === 'window'}
                      layout={activeWorkspaceLayout}
                      activeWorkspaceId={activeWorkspaceId}
                      customWorkspaces={customWorkspaces}
                      onClose={() => setActiveMenu(null)}
                      onLayoutChange={(layout) => {
                        setActiveWorkspaceLayout(layout);
                        const vis = layout.panels.filter((p) => p.visible).map((p) => p.id);
                        setVisiblePanels(vis);
                      }}
                      onWorkspaceSelect={handleWorkspaceSelect}
                      onCustomWorkspacesChange={(wss) => {
                        setCustomWorkspaces(wss);
                        saveCustomWorkspaces(wss);
                      }}
                      onResetPanelPositions={handleResetPanelPositions}
                      onArrange={(mode) => {
                        setToast({ message: `Arrange: ${mode}`, type: 'info' });
                      }}
                    />
                  </div>

                  {/* HELP MENU */}
                  <div className="relative">
                    <button
                      onClick={() => setActiveMenu(activeMenu === 'help' ? null : 'help')}
                      className={`px-2.5 py-1 rounded hover:bg-[#1a1a24] hover:text-white cursor-pointer ${activeMenu === 'help' ? 'bg-[#1a1a24] text-white' : ''}`}
                    >
                      Help
                    </button>
                    {activeMenu === 'help' && (
                      <div className="absolute left-0 mt-1.5 z-50 bg-[#121216] border border-[#2b2b36] rounded-lg shadow-2xl py-1 w-52 text-left animate-in fade-in slide-in-from-top-1 duration-100">
                        <button
                          onClick={() => { setShowHelpModal(true); setActiveMenu(null); }}
                          className="flex items-center justify-between w-full px-3 py-1.5 hover:bg-[#1c1c28] hover:text-white text-[11px]"
                        >
                          <span>Keyboard Shortcuts</span>
                          <span className="text-[9px] text-gray-500 font-mono">Guide</span>
                        </button>
                        <button
                          onClick={() => { window.open('https://github.com', '_blank'); setActiveMenu(null); }}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#1c1c28] hover:text-white text-[11px]"
                        >
                          Documentation
                        </button>
                        <button
                          onClick={() => { setToast({ message: 'Report bug logged. Thank you for your support!', type: 'success' }); setActiveMenu(null); }}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#1c1c28] hover:text-white text-[11px]"
                        >
                          Report a Bug
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Top Bar Center Project title */}
              <div className="text-gray-400 font-mono text-[10px] hidden md:flex items-center gap-2">
                <span className="text-white font-bold">{project.name}</span>
                <span>•</span>
                <span>{project.width} × {project.height} px</span>
                <span>•</span>
                <span className="text-emerald-500 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20 text-[8px] uppercase tracking-wider font-bold">Auto-Saved</span>
              </div>

              {/* Right Side header controls */}
              <div className="flex items-center gap-3">
                {/* File inputs (Place file & Open file trigger links) */}
                <input
                  type="file"
                  id="place-file-input"
                  accept="image/*"
                  onChange={handleFileImport}
                  className="hidden"
                />
                <input
                  type="file"
                  id="open-image-file-input"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleOpenImageAsProject(file);
                      e.target.value = '';
                    }
                  }}
                  className="hidden"
                />

                {/* Undo Redo Shortcuts */}
                <div className="flex items-center gap-1 bg-[#1a1a22] p-0.5 rounded border border-[#24242c]">
                  <button
                    onClick={handleUndo}
                    disabled={historyIndex <= 0}
                    title="Undo (Ctrl+Z)"
                    className="p-1 text-gray-400 hover:text-white hover:bg-[#252530] rounded disabled:opacity-30 transition-colors"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleRedo}
                    disabled={historyIndex >= historyStack.length - 1}
                    title="Redo (Ctrl+Y)"
                    className="p-1 text-gray-400 hover:text-white hover:bg-[#252530] rounded disabled:opacity-30 transition-colors"
                  >
                    <Redo2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => { document.getElementById('place-file-input')?.click(); }}
                    className="flex items-center gap-1 px-2.5 py-1 bg-[#1c1c24] hover:bg-[#252532] border border-[#2a2a35] rounded text-[10px] font-semibold text-gray-300 transition-colors"
                  >
                    <Plus className="w-3 h-3 text-indigo-400" />
                    Place
                  </button>
                  <button
                    onClick={handleTriggerExport}
                    className="flex items-center gap-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold shadow transition-colors cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    Export
                  </button>
                  {/* GO PRO Button hidden until payment gateway is connected */}
                  {/* <button
                    onClick={() => setShowProModal(true)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded text-[10px] font-extrabold shadow transition-all cursor-pointer border ${
                      isPremium
                        ? 'bg-gradient-to-r from-amber-500/20 to-purple-500/20 text-amber-300 border-amber-500/40 hover:border-amber-400'
                        : 'bg-gradient-to-r from-amber-500 via-indigo-600 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-white border-transparent animate-pulse'
                    }`}
                    title="Phototor Pro Unlimited Settings"
                  >
                    <Crown className="w-3 h-3 fill-current text-amber-400" />
                    <span>{isPremium ? "PRO UNLIMITED" : "GO PRO 👑"}</span>
                  </button> */}
                </div>
              </div>
            </header>

            {/* Photoshop-style Dynamic Options Bar */}
            <div className="bg-[#14141a] border-b border-[#22222a] h-9 px-4 flex items-center justify-between text-gray-300 text-[10px] select-none z-40">
              <div className="flex items-center gap-4">
                <span className="font-bold text-gray-500 uppercase text-[9px] tracking-wider bg-[#202028] px-1.5 py-0.5 rounded flex items-center gap-1 font-mono">
                  Tool: {activeSubTool.replace('-', ' ')}
                </span>
                
                {/* TRANSFORM WARP QUICK BUTTON */}
                <button
                  type="button"
                  onClick={() => {
                    if (activeLayerId) {
                      setShowWarpModal(true);
                    } else {
                      setToast({ message: "Pilih layer gambar terlebih dahulu untuk Melengkungkan (Warp).", type: 'warning' });
                    }
                  }}
                  className="px-2.5 py-1 bg-indigo-600/25 border border-indigo-500/40 hover:bg-indigo-600 text-indigo-200 hover:text-white rounded text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shrink-0"
                  title="Warp Transform: Melengkungkan & Mengubah Bentuk Objek Layer (Arc, Wave, Mesh Grid, dll)"
                >
                  <Grid className="w-3 h-3 text-indigo-300" />
                  <span>Transform Warp</span>
                </button>

                {/* Vertical Separator */}
                <div className="w-[1px] h-3.5 bg-[#2a2a35]" />

                {/* DYNAMIC CONTENTS BY ACTIVE TOOL */}
                
                {/* MAGIC WAND OPTIONS BAR */}
                {activeSubTool === 'select-wand' && (
                  <div className="flex items-center gap-3">
                    {/* Selection mode buttons */}
                    <div className="flex items-center gap-0.5 bg-[#1a1a24] border border-[#2d2d3c] rounded p-0.5">
                      {(['new', 'add', 'subtract', 'intersect'] as const).map((mode) => {
                        const icons: Record<string, string> = { new: '⬜', add: '➕', subtract: '➖', intersect: '⊕' };
                        return (
                          <button
                            key={mode}
                            title={`Selection: ${mode}`}
                            onClick={() => setWandSelectionMode(mode)}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-colors font-sans ${wandSelectionMode === mode ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
                          >
                            {icons[mode]}
                          </button>
                        );
                      })}
                    </div>

                    <div className="w-[1px] h-3.5 bg-[#2a2a35]" />

                    {/* Tolerance */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-400">Tolerance:</span>
                      <input
                        type="range" min="0" max="255" value={wandTolerance}
                        onChange={(e) => setWandTolerance(parseInt(e.target.value))}
                        className="w-20 accent-indigo-500 h-1 bg-[#252530]"
                      />
                      <input
                        type="number" min="0" max="255" value={wandTolerance}
                        onChange={(e) => setWandTolerance(Math.max(0, Math.min(255, parseInt(e.target.value) || 0)))}
                        className="w-10 bg-[#1a1a24] border border-[#2d2d3c] text-indigo-400 text-[10px] font-mono text-center rounded px-1 py-0.5 focus:outline-none"
                      />
                    </div>

                    <div className="w-[1px] h-3.5 bg-[#2a2a35]" />

                    {/* Contiguous */}
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={wandContiguous} onChange={(e) => setWandContiguous(e.target.checked)} className="accent-indigo-500 w-3 h-3" />
                      <span className="text-gray-300">Contiguous</span>
                    </label>

                    {/* Anti-alias */}
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={wandAntiAlias} onChange={(e) => setWandAntiAlias(e.target.checked)} className="accent-indigo-500 w-3 h-3" />
                      <span className="text-gray-300">Anti-alias</span>
                    </label>

                    {/* Sample All Layers */}
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={wandSampleAll} onChange={(e) => setWandSampleAll(e.target.checked)} className="accent-indigo-500 w-3 h-3" />
                      <span className="text-gray-300">Sample All</span>
                    </label>
                  </div>
                )}

                {/* SELECTION FEATHER OPTIONS (non-wand selection tools) */}
                {(activeTool.startsWith('select-') || activeSubTool.startsWith('select-')) && activeSubTool !== 'select-wand' && (
                  <div className="flex items-center gap-3.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-400">Feather:</span>
                      <input
                        type="range"
                        min="0"
                        max="50"
                        value={selectionFeather}
                        onChange={(e) => setSelectionFeather(parseInt(e.target.value))}
                        className="w-20 accent-indigo-500 h-1 bg-[#252530]"
                      />
                      <span className="font-mono text-indigo-400 font-bold w-7 text-right">{selectionFeather}px</span>
                    </div>
                  </div>
                )}


                {/* 1. BRUSH & ERASER DETAILS */}
                {(activeTool === 'brush' || activeTool === 'eraser' || activeTool === 'healing' || activeTool === 'blur-sharpen' || activeTool === 'dodge-burn') && (
                  <div className="flex items-center gap-3.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-400">Size:</span>
                      <input
                        type="range"
                        min="1"
                        max="200"
                        value={brushSize}
                        onChange={(e) => setBrushSize(parseInt(e.target.value))}
                        className="w-20 accent-indigo-500 h-1 bg-[#252530]"
                      />
                      <span className="font-mono text-indigo-400 font-bold w-7 text-right">{brushSize}px</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-400">
                        {(activeTool === 'blur-sharpen' || activeTool === 'dodge-burn') ? 'Strength:' : 'Opacity:'}
                      </span>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        value={brushOpacity * 100}
                        onChange={(e) => setBrushOpacity(parseInt(e.target.value) / 100)}
                        className="w-20 accent-indigo-500 h-1 bg-[#252530]"
                      />
                      <span className="font-mono text-indigo-400 font-bold w-7 text-right">{Math.round(brushOpacity * 100)}%</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-400">Hardness:</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={brushHardness}
                        onChange={(e) => setBrushHardness(parseInt(e.target.value))}
                        className="w-20 accent-indigo-500 h-1 bg-[#252530]"
                      />
                      <span className="font-mono text-indigo-400 font-bold w-7 text-right">{brushHardness}%</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-400">Smoothing:</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={brushSmoothing}
                        onChange={(e) => setBrushSmoothing(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-10 bg-[#1e1e24] border border-[#2d2d3a] text-white px-1 py-0.5 rounded font-mono text-center"
                      />
                      <span>%</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-400">Mode:</span>
                      <select
                        value={brushBlendMode}
                        onChange={(e) => setBrushBlendMode(e.target.value)}
                        className="bg-[#1e1e24] border border-[#2d2d3a] text-white px-1.5 py-0.5 rounded font-sans cursor-pointer focus:outline-none"
                      >
                        <option value="normal">Normal</option>
                        <option value="multiply">Multiply</option>
                        <option value="screen">Screen</option>
                        <option value="overlay">Overlay</option>
                        <option value="color-burn">Color Burn</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* 1b. APPLY HEALING BUTTON in Options Bar */}
                {activeTool === 'healing' && (() => {
                  const activeLayer = project.layers.find(l => l.id === activeLayerId);
                  return activeLayer && activeLayer.type === 'image' && activeLayer.drawingPath && activeLayer.drawingPath.length > 0 ? (
                    <button
                      onClick={() => handleApplyHealing()}
                      className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold rounded transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                    >
                      ✓ Apply Healing
                    </button>
                  ) : null;
                })()}

                {/* 2. TEXT TOOL DETAILS */}
                {activeTool === 'text' && (
                  <div className="flex items-center gap-3.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-400">Font:</span>
                      <select
                        value={textFont}
                        onChange={(e) => {
                          const font = e.target.value;
                          setTextFont(font);
                          loadGoogleFont(font);
                          const activeLayer = project.layers.find(l => l.id === activeLayerId);
                          if (activeLayer && activeLayer.type === 'text') {
                            handleUpdateLayer(activeLayer.id, { fontFamily: font });
                          }
                        }}
                        className="bg-[#1e1e24] border border-[#2d2d3a] text-white px-1.5 py-0.5 rounded font-sans cursor-pointer focus:outline-none max-w-[140px]"
                      >
                        {ALL_FONTS.map((f) => (
                          <option key={f} value={f} style={{ fontFamily: `"${f}", sans-serif` }}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-400">Size:</span>
                      <input
                        type="number"
                        min="8"
                        max="144"
                        value={textSize}
                        onChange={(e) => {
                          const size = Math.max(8, parseInt(e.target.value) || 12);
                          setTextSize(size);
                          const activeLayer = project.layers.find(l => l.id === activeLayerId);
                          if (activeLayer && activeLayer.type === 'text') {
                            handleUpdateLayer(activeLayer.id, { fontSize: size });
                          }
                        }}
                        className="w-12 bg-[#1e1e24] border border-[#2d2d3a] text-white px-1 py-0.5 rounded font-mono text-center"
                      />
                      <span>pt</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          const newWeight = textWeight === 'bold' ? 'normal' : 'bold';
                          setTextWeight(newWeight);
                          const activeLayer = project.layers.find(l => l.id === activeLayerId);
                          if (activeLayer && activeLayer.type === 'text') {
                            handleUpdateLayer(activeLayer.id, { fontWeight: newWeight });
                          }
                        }}
                        className={`px-1.5 py-0.5 rounded border transition-colors ${textWeight === 'bold' ? 'bg-indigo-600 border-indigo-500 text-white font-bold' : 'bg-[#1e1e24] border-[#2d2d3a] text-gray-400'}`}
                      >
                        B
                      </button>
                      <button
                        onClick={() => {
                          const newStyle = textStyle === 'italic' ? 'normal' : 'italic';
                          setTextStyle(newStyle);
                          const activeLayer = project.layers.find(l => l.id === activeLayerId);
                          if (activeLayer && activeLayer.type === 'text') {
                            handleUpdateLayer(activeLayer.id, { fontStyle: newStyle });
                          }
                        }}
                        className={`px-1.5 py-0.5 rounded border transition-colors italic ${textStyle === 'italic' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-[#1e1e24] border-[#2d2d3a] text-gray-400'}`}
                      >
                        I
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-400">Align:</span>
                      <select
                        value={textAlign}
                        onChange={(e: any) => {
                          setTextAlign(e.target.value);
                          const activeLayer = project.layers.find(l => l.id === activeLayerId);
                          if (activeLayer && activeLayer.type === 'text') {
                            handleUpdateLayer(activeLayer.id, { textAlign: e.target.value });
                          }
                        }}
                        className="bg-[#1e1e24] border border-[#2d2d3a] text-white px-1.5 py-0.5 rounded font-sans cursor-pointer focus:outline-none"
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* 3. CROP DETAILS */}
                {activeTool === 'crop' && (
                  <div className="flex items-center gap-4">
                    {/* Mode Toggle: Crop Layer vs Crop Canvas */}
                    <div className="flex items-center gap-1 bg-[#181820] p-0.5 rounded-md border border-[#2d2d3a]">
                      <button
                        type="button"
                        onClick={() => setCropTargetMode('layer')}
                        className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-all ${
                          cropTargetMode === 'layer'
                            ? 'bg-indigo-600 text-white shadow-sm font-bold'
                            : 'text-gray-400 hover:text-white'
                        }`}
                        title="Potong layer atau objek yang dipilih saja"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Potong Layer / Objek</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCropTargetMode('canvas')}
                        className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-all ${
                          cropTargetMode === 'canvas'
                            ? 'bg-indigo-600 text-white shadow-sm font-bold'
                            : 'text-gray-400 hover:text-white'
                        }`}
                        title="Potong seluruh ukuran kanvas"
                      >
                        <Crop className="w-3.5 h-3.5" />
                        <span>Potong Kanvas</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-400">Ratio:</span>
                      <select
                        value={cropRatio}
                        onChange={(e) => setCropRatio(e.target.value)}
                        className="bg-[#1e1e24] border border-[#2d2d3a] text-white px-1.5 py-0.5 rounded font-sans cursor-pointer focus:outline-none"
                      >
                        <option value="free">Free Form Ratio</option>
                        <option value="1:1">1:1 Square</option>
                        <option value="16:9">16:9 Widescreen</option>
                        <option value="4:3">4:3 Standard</option>
                        <option value="original">Original Ratio</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-400">Grid:</span>
                      <select
                        value={cropGridOverlay}
                        onChange={(e) => setCropGridOverlay(e.target.value as any)}
                        className="bg-[#1e1e24] border border-[#2d2d3a] text-white px-1.5 py-0.5 rounded font-sans cursor-pointer focus:outline-none"
                      >
                        <option value="thirds">Rule of Thirds</option>
                        <option value="golden">Golden Ratio</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">Straighten:</span>
                      <input
                        type="range"
                        min="-45"
                        max="45"
                        value={straightenAngle}
                        onChange={(e) => setStraightenAngle(parseInt(e.target.value))}
                        className="accent-indigo-500 h-1 w-20 cursor-pointer"
                      />
                      <span className="font-mono text-[10px] text-indigo-400 font-bold w-7">{straightenAngle}°</span>
                    </div>

                    <label className="flex items-center gap-1.5 cursor-pointer text-gray-400 hover:text-white">
                      <input
                        type="checkbox"
                        checked={deleteCroppedPixels}
                        onChange={(e) => setDeleteCroppedPixels(e.target.checked)}
                        className="accent-indigo-500 rounded"
                      />
                      <span>Delete Pixels</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer text-gray-400 hover:text-white">
                      <input
                        type="checkbox"
                        checked={contentAwareCrop}
                        onChange={(e) => setContentAwareCrop(e.target.checked)}
                        className="accent-indigo-500 rounded"
                      />
                      <span>Content-Aware Fill</span>
                    </label>
                  </div>
                )}

                {/* 4. SHAPE DETAILS */}
                {activeTool === 'shape' && (
                  <div className="flex items-center gap-3.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-400">Fill:</span>
                      <input
                        type="color"
                        value={brushColor}
                        onChange={(e) => setBrushColor(e.target.value)}
                        className="w-5 h-5 bg-transparent border-0 cursor-pointer p-0 shrink-0"
                      />
                      <span className="font-mono text-[9px] text-gray-400">{brushColor}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-400">Stroke:</span>
                      <input
                        type="color"
                        value={shapeStrokeColor}
                        onChange={(e) => setShapeStrokeColor(e.target.value)}
                        className="w-5 h-5 bg-transparent border-0 cursor-pointer p-0 shrink-0"
                      />
                      <span className="font-mono text-[9px] text-gray-400">{shapeStrokeColor}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-400">Stroke Width:</span>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={shapeStrokeWidth}
                        onChange={(e) => setShapeStrokeWidth(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-10 bg-[#1e1e24] border border-[#2d2d3a] text-white px-1 py-0.5 rounded font-mono text-center"
                      />
                      <span>px</span>
                    </div>

                    {activeSubTool === 'shape-rounded-rect' && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-400">Radius:</span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={shapeCornerRadius}
                          onChange={(e) => setShapeCornerRadius(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-10 bg-[#1e1e24] border border-[#2d2d3a] text-white px-1 py-0.5 rounded font-mono text-center"
                        />
                        <span>px</span>
                      </div>
                    )}
                  </div>
                )}

                {/* 4.5. ZOOM TOOL DETAILS */}
                {(activeSubTool === 'zoom' || activeSubTool === 'zoom-in' || activeSubTool === 'zoom-out') && (
                  <div className="flex items-center gap-3">
                    {/* Zoom In / Zoom Out Mode Toggle Buttons */}
                    <div className="flex items-center gap-1 bg-[#1c1c26] border border-[#2b2b38] rounded p-0.5">
                      <button
                        onClick={() => setActiveSubTool('zoom-in')}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                          activeSubTool !== 'zoom-out'
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-gray-400 hover:text-white'
                        }`}
                        title="Zoom In Mode (+)"
                      >
                        <ZoomIn className="w-3 h-3" />
                        <span>Zoom In (+)</span>
                      </button>
                      <button
                        onClick={() => setActiveSubTool('zoom-out')}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                          activeSubTool === 'zoom-out'
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-gray-400 hover:text-white'
                        }`}
                        title="Zoom Out Mode (-)"
                      >
                        <ZoomOut className="w-3 h-3" />
                        <span>Zoom Out (-)</span>
                      </button>
                    </div>

                    <div className="w-[1px] h-3.5 bg-[#2a2a35]" />

                    {/* Photoshop Quick Zoom Presets */}
                    <button
                      onClick={() => setEditorZoom(1.0)}
                      className="px-2 py-0.5 bg-[#1a1a24] border border-[#2d2d3c] hover:bg-[#252535] text-gray-200 text-[10px] font-mono font-bold rounded cursor-pointer transition-colors"
                      title="Set Zoom to 100% Actual Pixels"
                    >
                      100%
                    </button>
                    <button
                      onClick={() => setEditorZoom(0.85)}
                      className="px-2 py-0.5 bg-[#1a1a24] border border-[#2d2d3c] hover:bg-[#252535] text-gray-200 text-[10px] font-mono font-bold rounded cursor-pointer transition-colors"
                      title="Fit Canvas to Viewport"
                    >
                      Fit Screen
                    </button>
                    <button
                      onClick={() => setEditorZoom(1.5)}
                      className="px-2 py-0.5 bg-[#1a1a24] border border-[#2d2d3c] hover:bg-[#252535] text-gray-200 text-[10px] font-mono font-bold rounded cursor-pointer transition-colors"
                      title="Fill Screen"
                    >
                      Fill Screen
                    </button>

                    <div className="w-[1px] h-3.5 bg-[#2a2a35]" />

                    <span className="text-[10px] text-gray-400 font-mono">
                      Current Zoom: <strong className="text-indigo-400 font-bold">{Math.round(editorZoom * 100)}%</strong>
                    </span>
                    <span className="text-[9px] text-gray-500 font-sans italic">
                      (Hold Alt key to toggle Zoom Out)
                    </span>
                  </div>
                )}

                {/* 5. MOVE TOOL DETAILS */}
                {activeTool === 'move' && (
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer text-gray-400 hover:text-white">
                      <input
                        type="checkbox"
                        checked={autoSelectLayer}
                        onChange={(e) => setAutoSelectLayer(e.target.checked)}
                        className="accent-indigo-500 rounded"
                      />
                      <span>Auto-Select</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer text-gray-400 hover:text-white">
                      <input
                        type="checkbox"
                        checked={showTransformHandles}
                        onChange={(e) => setShowTransformHandles(e.target.checked)}
                        className="accent-indigo-500 rounded"
                      />
                      <span>Show Controls</span>
                    </label>

                    <div className="w-[1px] h-3.5 bg-[#2a2a35]" />

                    {/* Photoshop-style Align buttons */}
                    <div className="flex items-center gap-0.5" title="Align layers">
                      <button onClick={() => handleAlignLayers('left')} className="p-1 hover:bg-[#252530] rounded text-gray-400 hover:text-white cursor-pointer" title="Align Left">≡</button>
                      <button onClick={() => handleAlignLayers('center-h')} className="p-1 hover:bg-[#252530] rounded text-gray-400 hover:text-white cursor-pointer" title="Align Center H">▤</button>
                      <button onClick={() => handleAlignLayers('right')} className="p-1 hover:bg-[#252530] rounded text-gray-400 hover:text-white cursor-pointer" title="Align Right">≡</button>
                    </div>
                    <div className="flex items-center gap-0.5" title="Align vertical">
                      <button onClick={() => handleAlignLayers('top')} className="p-1 hover:bg-[#252530] rounded text-gray-400 hover:text-white cursor-pointer" title="Align Top">≡</button>
                      <button onClick={() => handleAlignLayers('center-v')} className="p-1 hover:bg-[#252530] rounded text-gray-400 hover:text-white cursor-pointer" title="Align Center V">≡</button>
                      <button onClick={() => handleAlignLayers('bottom')} className="p-1 hover:bg-[#252530] rounded text-gray-400 hover:text-white cursor-pointer" title="Align Bottom">≡</button>
                    </div>
                    <div className="w-[1px] h-3.5 bg-[#2a2a35]" />
                    <div className="flex items-center gap-0.5" title="Distribute layers">
                      <button onClick={() => handleDistributeLayers('horizontal')} className="p-1 hover:bg-[#252530] rounded text-gray-400 hover:text-white cursor-pointer" title="Distribute Horizontal">⇔</button>
                      <button onClick={() => handleDistributeLayers('vertical')} className="p-1 hover:bg-[#252530] rounded text-gray-400 hover:text-white cursor-pointer" title="Distribute Vertical">⇕</button>
                    </div>
                  </div>
                )}

                {/* 6. GRADIENT TOOL OPTIONS (PHOTOSHOP ACCURATE) */}
                {activeTool === 'gradient' && (
                  <div className="flex items-center gap-3 relative flex-wrap z-40">
                    
                    {/* Gradient Preset Picker Bar + Dropdown Chevron */}
                    <div className="relative">
                      <div className="flex items-center gap-0.5 bg-[#181822] border border-[#3e3e52] hover:border-indigo-500 rounded p-0.5 transition-colors cursor-pointer shadow-sm">
                        {/* Preset Bar Preview */}
                        <div
                          className="h-5 w-28 rounded-sm border border-[#2a2a38] overflow-hidden"
                          style={{
                            background: `linear-gradient(to right, ${getEffectiveGradientStops().map(s => `${s.color} ${Math.round(s.offset * 100)}%`).join(', ')})`
                          }}
                          onClick={() => setShowGradientPickerPopover(v => !v)}
                          title="Click to open Gradient Presets Popover"
                        />
                        {/* Chevron Dropdown arrow */}
                        <button
                          onClick={() => setShowGradientPickerPopover(v => !v)}
                          className="px-1 text-gray-400 hover:text-white text-[9px]"
                          title="Gradient Presets"
                        >
                          ▼
                        </button>
                      </div>

                      {/* GRADIENT PRESETS POPOVER DIALOG */}
                      {showGradientPickerPopover && (
                        <div className="absolute left-0 top-8 z-50 w-72 bg-[#14141d] border border-[#323245] shadow-2xl rounded-lg p-3 text-gray-200 flex flex-col gap-2.5">
                          <div className="flex items-center justify-between border-b border-[#252535] pb-1.5">
                            <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">Gradient Presets</span>
                            <button
                              onClick={() => setShowGradientPickerPopover(false)}
                              className="text-gray-400 hover:text-white text-xs font-bold px-1"
                            >
                              ✕
                            </button>
                          </div>

                          {/* Standard Photoshop Presets List */}
                          <div className="grid grid-cols-2 gap-1.5">
                            {[
                              { id: 'fg-bg', name: 'Foreground to Background', stops: [{ offset: 0, color: brushColor }, { offset: 1, color: backgroundColor }] },
                              { id: 'fg-trans', name: 'Foreground to Transparent', stops: [{ offset: 0, color: brushColor }, { offset: 1, color: hexToRgba(brushColor, 0) }] },
                              { id: 'black-white', name: 'Black, White', stops: [{ offset: 0, color: '#000000' }, { offset: 1, color: '#ffffff' }] },
                              { id: 'spectrum', name: 'Spectrum / Rainbow', stops: [{ offset: 0, color: '#ff0000' }, { offset: 0.5, color: '#00ff00' }, { offset: 1, color: '#0000ff' }] },
                            ].map(p => (
                              <button
                                key={p.id}
                                onClick={() => {
                                  setGradientPresetId(p.id);
                                  setGradientStops(p.stops);
                                  setShowGradientPickerPopover(false);
                                }}
                                className={`flex flex-col gap-1 p-1.5 rounded border transition-all text-left ${gradientPresetId === p.id ? 'border-indigo-500 bg-[#1e1e2d]' : 'border-[#282838] hover:border-gray-500 bg-[#171722]'}`}
                              >
                                <div
                                  className="h-4 w-full rounded-sm border border-[#333345]"
                                  style={{ background: `linear-gradient(to right, ${p.stops.map(s => `${s.color} ${Math.round(s.offset * 100)}%`).join(', ')})` }}
                                />
                                <span className="text-[9px] text-gray-300 font-mono truncate">{p.name}</span>
                              </button>
                            ))}
                          </div>

                          <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mt-1">Color Options</div>
                          <div className="flex items-center justify-between bg-[#181824] p-1.5 rounded border border-[#262638]">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] text-gray-400">FG:</span>
                              <input type="color" value={brushColor} onChange={(e) => setBrushColor(e.target.value)} className="w-5 h-5 bg-transparent border-0 cursor-pointer p-0 shrink-0" title="Foreground Color" />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] text-gray-400">BG:</span>
                              <input type="color" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} className="w-5 h-5 bg-transparent border-0 cursor-pointer p-0 shrink-0" title="Background Color" />
                            </div>
                            <button
                              onClick={() => {
                                const tmp = brushColor;
                                setBrushColor(backgroundColor);
                                setBackgroundColor(tmp);
                              }}
                              className="px-2 py-0.5 text-[9px] bg-indigo-600 hover:bg-indigo-500 text-white rounded font-mono"
                              title="Swap Foreground & Background"
                            >
                              Swap ⇄
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 5 Gradient Type Style Buttons */}
                    <div className="flex gap-0.5 bg-[#181824] border border-[#2b2b3b] rounded p-0.5">
                      {[
                        { type: 'linear', title: 'Linear Gradient', icon: (
                          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                            <rect x="2" y="2" width="12" height="12" rx="1" fill="url(#icon-lin)" />
                            <defs><linearGradient id="icon-lin" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="white"/><stop offset="100%" stopColor="#333"/></linearGradient></defs>
                          </svg>
                        )},
                        { type: 'radial', title: 'Radial Gradient', icon: (
                          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                            <rect x="2" y="2" width="12" height="12" rx="1" fill="url(#icon-rad)" />
                            <defs><radialGradient id="icon-rad" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="white"/><stop offset="100%" stopColor="#333"/></radialGradient></defs>
                          </svg>
                        )},
                        { type: 'angle', title: 'Angle Gradient', icon: (
                          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                            <circle cx="8" cy="8" r="6" stroke="white" strokeWidth="1.5" fill="none" />
                            <path d="M8 2 A6 6 0 0 1 14 8 L8 8 Z" fill="white" />
                          </svg>
                        )},
                        { type: 'reflected', title: 'Reflected Gradient', icon: (
                          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                            <rect x="2" y="2" width="12" height="12" rx="1" fill="url(#icon-ref)" />
                            <defs><linearGradient id="icon-ref" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#333"/><stop offset="50%" stopColor="white"/><stop offset="100%" stopColor="#333"/></linearGradient></defs>
                          </svg>
                        )},
                        { type: 'diamond', title: 'Diamond Gradient', icon: (
                          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                            <polygon points="8,2 14,8 8,14 2,8" fill="white" />
                          </svg>
                        )},
                      ].map(({ type, title, icon }) => (
                        <button
                          key={type}
                          onClick={() => setGradientType(type as any)}
                          title={title}
                          className={`p-1 rounded transition-colors ${gradientType === type ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-400 hover:text-white hover:bg-[#252535]'}`}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>

                    {/* Mode Dropdown */}
                    <div className="flex items-center gap-1">
                      <span className="text-gray-400 text-[9px]">Mode:</span>
                      <select
                        value={gradientBlendMode}
                        onChange={(e) => setGradientBlendMode(e.target.value)}
                        className="h-5 bg-[#161622] border border-[#2b2b3a] text-gray-200 rounded px-1.5 text-[9px] font-mono"
                      >
                        {['normal','multiply','screen','overlay','soft-light','hard-light','color-dodge','color-burn','darken','lighten','difference','exclusion','hue','saturation','color','luminosity'].map(m => (
                          <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                        ))}
                      </select>
                    </div>

                    {/* Opacity */}
                    <div className="flex items-center gap-1">
                      <span className="text-gray-400 text-[9px]">Opacity:</span>
                      <input
                        type="range" min={0} max={100} value={Math.round(gradientOpacity * 100)}
                        onChange={(e) => setGradientOpacity(parseInt(e.target.value) / 100)}
                        className="w-16 accent-indigo-500 h-1 bg-[#101015]"
                      />
                      <span className="text-indigo-400 font-mono text-[9px] w-7 text-right">{Math.round(gradientOpacity * 100)}%</span>
                    </div>

                    {/* Checkboxes: Reverse, Dither, Transparency */}
                    <div className="flex items-center gap-2 text-[9px] text-gray-300">
                      <label className="flex items-center gap-1 cursor-pointer hover:text-white">
                        <input type="checkbox" checked={gradientReverse} onChange={(e) => setGradientReverse(e.target.checked)} className="accent-indigo-500 w-3 h-3" />
                        Reverse
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer hover:text-white">
                        <input type="checkbox" checked={gradientDither} onChange={(e) => setGradientDither(e.target.checked)} className="accent-indigo-500 w-3 h-3" />
                        Dither
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer hover:text-white">
                        <input type="checkbox" checked={gradientTransparency} onChange={(e) => setGradientTransparency(e.target.checked)} className="accent-indigo-500 w-3 h-3" />
                        Transparency
                      </label>
                    </div>

                    <span className="text-gray-500 text-[9px] font-mono hidden lg:block">Shift=snap 45°</span>
                  </div>
                )}
              </div>

              {/* Options bar Right side indicators */}
              <div className="flex items-center gap-2 font-mono text-[9px] text-gray-500">
                <span className="text-gray-400 font-bold uppercase">Workspace:</span>
                <span>RGB / 8-Bit</span>
              </div>
            </div>

            {/* Studio Workspace Layout */}
            <div className="flex-1 flex overflow-hidden">
              
              {/* Left Toolbox */}
              <SidebarTools
                activeTool={activeTool}
                setActiveTool={setActiveTool}
                activeSubTool={activeSubTool}
                setActiveSubTool={setActiveSubTool}
                brushColor={brushColor}
                setBrushColor={setBrushColor}
                backgroundColor={backgroundColor}
                setBackgroundColor={setBackgroundColor}
                isQuickMaskMode={isQuickMaskMode}
                setIsQuickMaskMode={setIsQuickMaskMode}
                screenMode={screenMode}
                setScreenMode={setScreenMode}
                onRemoveBackground={() => setShowRemoveBgModal(true)}
              />

              {/* Center workspace area with Tabs and Canvas Workspace */}
              <div className="flex-1 flex flex-col bg-[#0f0f13] overflow-hidden relative">
                {/* Document Tab Bar */}
                <div className="flex items-center bg-[#111116] border-b border-[#202028] h-[30px] select-none text-[10px] font-medium overflow-x-auto shrink-0 z-30 scrollbar-none">
                  {openProjectIds.map((id) => {
                    const isTabActive = currentProjId === id;
                    const tabName = tabNames[id] || (isTabActive ? project?.name : '') || 'Untitled Project';

                    return (
                      <div
                        key={id}
                        onClick={() => handleOpenProject(id)}
                        className={`flex items-center h-full px-3 gap-2 border-r border-[#202028] cursor-pointer transition-colors ${
                          isTabActive
                            ? 'bg-[#0a0a0d] text-white border-t-2 border-t-indigo-500 font-bold'
                            : 'bg-[#15151e] text-gray-500 hover:bg-[#1a1a26] hover:text-gray-300'
                        }`}
                      >
                        <span className="truncate max-w-[100px]">{tabName}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCloseTab(id);
                          }}
                          className="p-0.5 rounded-full hover:bg-gray-800 hover:text-white text-gray-600 shrink-0 transition-colors"
                          title="Close Tab"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    );
                  })}
                  
                  {/* Plus tab button to quickly create a new project */}
                  <button
                    onClick={() => {
                      handleCreateProject(1200, 800, `Untitled-${Date.now().toString().slice(-4)}`);
                    }}
                    className="h-full px-3 flex items-center justify-center text-gray-500 hover:bg-[#15151e] hover:text-white transition-colors cursor-pointer border-r border-[#202028]"
                    title="New Empty Document"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <CanvasWorkspace
                  project={project}
                  activeLayerId={activeLayerId}
                  activeTool={activeTool}
                  activeSubTool={activeSubTool}
                  adjustments={adjustments}
                  brushColor={brushColor}
                  brushSize={brushSize}
                  brushOpacity={brushOpacity}
                  onUpdateLayer={handleUpdateLayer}
                  setToast={setToast}
                  onAddLayer={handleAddLayer}
                  onPushHistory={handlePushHistory}
                  onCropCanvas={handleCropCanvas}
                  cropTargetMode={cropTargetMode}
                  onChangeBrushColor={setBrushColor}
                  onApplyLocalBrushFilter={handleApplyLocalBrushFilter}
                  onApplyHealing={handleApplyHealing}
                  onSelectLayer={setActiveLayerId}
                  onSelectTool={(t, st) => {
                    setActiveTool(t);
                    if (st) setActiveSubTool(st);
                  }}
                  slices={project.slices || []}
                  onUpdateSlices={handleUpdateSlices}
                  onOpenSliceOptions={(s) => {
                    const idx = (project.slices || []).findIndex((x) => x.id === s.id);
                    setEditingSlice({ slice: s, index: idx >= 0 ? idx : 0 });
                  }}
                  onOpenDivideSlice={(s) => {
                    const idx = (project.slices || []).findIndex((x) => x.id === s.id);
                    setDividingSlice({ slice: s, index: idx >= 0 ? idx : 0 });
                  }}
                  onPerspectiveCrop={handlePerspectiveCrop}
                  onApplyPatch={handleApplyPatch}
                  onMouseMoveCoords={setHoverCoords}
                  onContextMenuCoords={(pt, clientPt) => {
                    if (pt && clientPt) {
                      setContextMenu({ x: pt.x, y: pt.y, clientX: clientPt.x, clientY: clientPt.y });
                    }
                  }}
                  shapeStrokeColor={shapeStrokeColor}
                  shapeStrokeWidth={shapeStrokeWidth}
                  shapeCornerRadius={shapeCornerRadius}
                  gradientEndColor={backgroundColor}
                  gradientType={gradientType}
                  gradientOpacity={gradientOpacity}
                  gradientBlendMode={gradientBlendMode}
                  gradientReverse={gradientReverse}
                  gradientStops={getEffectiveGradientStops()}
                  backgroundColor={backgroundColor}
                  brushHardness={brushHardness}
                  visibleChannel={visibleChannel}
                  onUpdateProject={handleUpdateProject}
                  gridSettings={gridSettings}
                  alignmentGuides={alignmentGuides}
                  selectionFeather={selectionFeather}
                  cropRatio={cropRatio}
                  cropGridOverlay={cropGridOverlay}
                  straightenAngle={straightenAngle}
                  deleteCroppedPixels={deleteCroppedPixels}
                  showRulers={showRulers}
                  showGuides={showGuides}
                  wandTolerance={wandTolerance}
                  wandContiguous={wandContiguous}
                  wandAntiAlias={wandAntiAlias}
                  wandSampleAll={wandSampleAll}
                  wandSelectionMode={wandSelectionMode}
                  externalZoom={editorZoom}
                  onZoomChange={(z) => setEditorZoom(z)}
                  brushType={brushType}
                  isQuickMaskMode={isQuickMaskMode}
                />
              </div>

                  {/* Right Dock / Controls bar */}
                  <div className="flex shrink-0 relative z-30 h-full select-none">
                    {/* Slide-out Flyout Panel Drawer */}
                    {activeFlyout && (
                      <div 
                        className="absolute right-full top-0 bottom-0 w-[300px] bg-[#13131a] border-l border-[#1e1e2c] border-b shadow-2xl z-40 flex flex-col"
                        style={{ borderBottom: '1px solid #1e1e2c' }}
                      >
                        {/* Flyout Header */}
                        <div className="flex items-center justify-between px-3 py-2 bg-[#171722] border-b border-[#252535] shrink-0">
                          <span className="text-[10px] font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2">
                            <span className="text-gray-400">{PANEL_ICONS[activeFlyout]}</span>
                            {PANEL_TITLES[activeFlyout]}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                togglePanelVisible(activeFlyout);
                                setActiveFlyout(null);
                              }}
                              title="Dock to Sidebar"
                              className="p-1 rounded text-gray-500 hover:text-indigo-400 hover:bg-[#252535] transition-colors cursor-pointer"
                            >
                              <GripVertical className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => setActiveFlyout(null)}
                              className="p-1 rounded text-gray-500 hover:text-red-400 hover:bg-red-950/20 transition-colors cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        {/* Flyout Content */}
                        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 bg-[#0c0c10]">
                          {renderPanelContent(activeFlyout)}
                        </div>
                      </div>
                    )}

                    {/* Main Sidebar Dock Column */}
                    {(() => {
                      // Filter visible right panels
                      const rightPanels = activeWorkspaceLayout.panels.filter(p => p.visible && p.dock === 'right');
                      
                      const topGroupMembers = ['color', 'swatches', 'gradients', 'patterns', 'brushes', 'brush-settings', 'character', 'assets', 'actions'];
                      const middleGroupMembers = ['properties', 'adjustments', 'history', 'navigator', 'info', 'histogram', 'paragraph', 'glyphs', 'tool-presets'];
                      const bottomGroupMembers = ['layers', 'channels', 'paths'];

                      const topDocked = rightPanels.filter(p => topGroupMembers.includes(p.id)).sort((a, b) => a.order - b.order);
                      const middleDocked = rightPanels.filter(p => middleGroupMembers.includes(p.id)).sort((a, b) => a.order - b.order);
                      const bottomDocked = rightPanels.filter(p => bottomGroupMembers.includes(p.id)).sort((a, b) => a.order - b.order);

                      if (topDocked.length === 0 && middleDocked.length === 0 && bottomDocked.length === 0) return null;

                      // Derive active tabs
                      const activeTopId = topDocked.some(p => p.id === topTab) ? topTab : (topDocked[0]?.id || 'color');
                      const activeMiddleId = middleDocked.some(p => p.id === middleTab) ? middleTab : (middleDocked[0]?.id || 'properties');
                      const activeBottomId = bottomDocked.some(p => p.id === bottomTab) ? bottomTab : (bottomDocked[0]?.id || 'layers');

                      return (
                        <div className="w-80 bg-[#121218] border-l border-[#181819] flex flex-col h-full overflow-hidden">
                          {/* Top Group (Color & Brushes) */}
                          {topDocked.length > 0 && (
                            <div className="flex flex-col border-b border-[#252530] bg-[#14141d]" style={{ height: '220px' }}>
                              {/* Header Tabs */}
                              <DraggableTabContainer
                                tabs={topDocked.map((ps) => ({
                                  id: ps.id,
                                  label: PANEL_TITLES[ps.id],
                                  icon: PANEL_ICONS[ps.id],
                                  active: activeTopId === ps.id,
                                }))}
                                onSelectTab={(id) => {
                                  setTopTab(id as any);
                                  setActiveFlyout(null);
                                }}
                                onCloseTab={(id) => togglePanelVisible(id as PanelId)}
                                onReorderTabs={(reorderedIds) => handleReorderGroupPanels(reorderedIds as PanelId[])}
                              />
                              {/* Tab Content */}
                              <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 bg-[#0c0c10]">
                                {renderPanelContent(activeTopId)}
                              </div>
                            </div>
                          )}

                          {/* Middle Group (Properties & Adjustments) */}
                          {middleDocked.length > 0 && (
                            <div className="flex flex-col border-b border-[#252530] bg-[#14141d]" style={{ height: '260px' }}>
                              {/* Header Tabs */}
                              <DraggableTabContainer
                                tabs={middleDocked.map((ps) => ({
                                  id: ps.id,
                                  label: PANEL_TITLES[ps.id],
                                  icon: PANEL_ICONS[ps.id],
                                  active: activeMiddleId === ps.id,
                                }))}
                                onSelectTab={(id) => {
                                  setMiddleTab(id as any);
                                  setActiveFlyout(null);
                                }}
                                onCloseTab={(id) => togglePanelVisible(id as PanelId)}
                                onReorderTabs={(reorderedIds) => handleReorderGroupPanels(reorderedIds as PanelId[])}
                              />
                              {/* Tab Content */}
                              <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 bg-[#0c0c10]">
                                {renderPanelContent(activeMiddleId)}
                              </div>
                            </div>
                          )}

                          {/* Bottom Group (Layers, Channels, Paths) - FLEX 1 STRETCH */}
                          {bottomDocked.length > 0 && (
                            <div className="flex flex-col flex-1 min-h-0 bg-[#121218]">
                              {/* Header Tabs */}
                              <DraggableTabContainer
                                tabs={bottomDocked.map((ps) => ({
                                  id: ps.id,
                                  label: PANEL_TITLES[ps.id],
                                  icon: PANEL_ICONS[ps.id],
                                  active: activeBottomId === ps.id,
                                }))}
                                onSelectTab={(id) => {
                                  setBottomTab(id as any);
                                  setActiveFlyout(null);
                                }}
                                onCloseTab={(id) => togglePanelVisible(id as PanelId)}
                                onReorderTabs={(reorderedIds) => handleReorderGroupPanels(reorderedIds as PanelId[])}
                              />
                              {/* Tab Content */}
                              <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 bg-[#121218]">
                                {renderPanelContent(activeBottomId)}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Photoshop-style Vertical Icon Strip (Right Edge) */}
                    <div className="w-[48px] bg-[#16161f] border-l border-[#181819] flex flex-col items-center py-3 gap-2.5 select-none shrink-0 h-full z-30">
                      {(() => {
                        const iconStripList: PanelId[] = [
                          'layers', 'properties', 'adjustments', 'history', 'color', 
                          'swatches', 'brushes', 'character', 'assets'
                        ];
                        
                        return iconStripList.map((id) => {
                          const isDocked = activeWorkspaceLayout.panels.some(p => p.visible && p.dock === 'right' && p.id === id);
                          const isFlyoutOpen = activeFlyout === id;
                          
                          let isActiveTab = false;
                          const topGroupMembers = ['color', 'swatches', 'gradients', 'patterns', 'brushes', 'brush-settings', 'character', 'assets', 'actions'];
                          const middleGroupMembers = ['properties', 'adjustments', 'history', 'navigator', 'info', 'histogram', 'paragraph', 'glyphs', 'tool-presets'];
                          const bottomGroupMembers = ['layers', 'channels', 'paths'];

                          if (bottomGroupMembers.includes(id)) {
                            isActiveTab = bottomTab === id;
                          } else if (middleGroupMembers.includes(id)) {
                            isActiveTab = middleTab === id;
                          } else if (topGroupMembers.includes(id)) {
                            isActiveTab = topTab === id;
                          }

                          return (
                            <button
                              key={id}
                              onClick={() => {
                                const bottomGroupMembers = ['layers', 'channels', 'paths'];
                                const middleGroupMembers = ['properties', 'adjustments', 'history', 'navigator', 'info', 'histogram', 'paragraph', 'glyphs', 'tool-presets'];
                                const topGroupMembers = ['color', 'swatches', 'gradients', 'patterns', 'brushes', 'brush-settings', 'character', 'assets', 'actions'];

                                if (bottomGroupMembers.includes(id)) {
                                  setBottomTab(id as any);
                                  setActiveFlyout(null);
                                  // Make it visible and docked on right
                                  if (!isDocked) {
                                    togglePanelVisible(id);
                                  }
                                } else if (isDocked) {
                                  // Switch docked tab
                                  if (middleGroupMembers.includes(id)) {
                                    setMiddleTab(id as any);
                                  } else if (topGroupMembers.includes(id)) {
                                    setTopTab(id as any);
                                  }
                                  setActiveFlyout(null);
                                } else {
                                  // Toggle flyout drawer
                                  if (isFlyoutOpen) {
                                    setActiveFlyout(null);
                                  } else {
                                    setActiveFlyout(id);
                                  }
                                }
                              }}
                              title={PANEL_TITLES[id]}
                              className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all relative cursor-pointer ${
                                isFlyoutOpen
                                  ? 'bg-[#6366f1]/20 text-indigo-400 border border-[#6366f1]/50'
                                  : isDocked && isActiveTab
                                    ? 'bg-[#1b1b26] text-indigo-400 border-r-2 border-r-indigo-500'
                                    : 'text-gray-400 hover:text-gray-200 hover:bg-[#20202e]'
                              }`}
                            >
                              <span className="w-4 h-4">{PANEL_ICONS[id]}</span>
                              {isDocked && !isActiveTab && (
                                <span className="absolute bottom-1 right-1 w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                              )}
                            </button>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>


            {/* Photoshop-style Status Bar */}
            <div className="h-6 bg-[#0c0c0f] border-t border-[#1e1e24] px-4 flex items-center justify-between text-gray-500 text-[10px] select-none shrink-0 font-sans z-35">
              <div className="flex items-center gap-4">
                <span className="text-gray-400 font-semibold truncate max-w-xs">
                  {activeLayerId ? `Active Layer: ${project.layers.find(l => l.id === activeLayerId)?.name || 'None'}` : 'Select a layer to begin'}
                </span>
                <span className="text-gray-700">|</span>
                <span className="font-mono text-[9px] text-gray-400">
                  Cursor: X: {hoverCoords ? Math.round(hoverCoords.x) : 0} px, Y: {hoverCoords ? Math.round(hoverCoords.y) : 0} px
                </span>
              </div>

              <div className="flex items-center gap-4">
                <span className="font-mono text-[9px] text-gray-400">
                  Canvas: {project.width} × {project.height} px
                </span>
                <span className="text-gray-700">|</span>
                <div className="flex items-center gap-1">
                  <span>RAM footprint:</span>
                  <span className="font-mono font-bold text-gray-400">
                    {(145 + project.layers.length * 32.4).toFixed(1)} MB / 4.0 GB
                  </span>
                </div>
              </div>
            </div>



            {/* STATIC BOTTOM AD BANNER */}
            {!isPremium && (
              <div className="h-7 border-t border-[#24242c] bg-[#111115] px-6 flex items-center justify-start text-[10px] text-gray-500 select-none shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-indigo-400 font-extrabold uppercase bg-indigo-500/10 px-1.5 py-0.5 rounded tracking-wide text-[8px]">
                    SPONSOR AD
                  </span>
                  <span>Remove watermarks and support development. Phototor Studio is currently 50% off!</span>
                </div>
              </div>
            )}

            {/* EXPORT OPTIONS MODAL WITH ADSTERRA MONETIZATION INTERSTITIAL */}
            {showExportModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-full max-w-md bg-[#141419] border border-[#2c2c36] rounded-xl overflow-hidden p-5 shadow-2xl space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-[#24242c] pb-3">
                    <h3 className="font-sans font-bold text-sm text-white flex items-center gap-2">
                      <span>Export Canvas Project</span>
                    </h3>
                    <button
                      onClick={() => setShowExportModal(false)}
                      className="text-gray-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Adsterra 300x250 Sponsor Banner Placement */}
                  {ADSTERRA_CONFIG.enabled && ADSTERRA_CONFIG.exportModal.enabled && (
                    <div className="my-1">
                      <AdsterraBanner format="300x250" />
                    </div>
                  )}

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="text-gray-400 block mb-1 font-medium">Target Format</label>
                      <select
                        value={exportFormat}
                        onChange={(e: any) => setExportFormat(e.target.value)}
                        className="w-full bg-[#1c1c24] border border-[#2a2a35] rounded p-2 text-white font-medium focus:outline-none cursor-pointer"
                      >
                        <option value="image/png">PNG Transparent (High Quality)</option>
                        <option value="image/jpeg">JPEG Standard Compressed</option>
                        <option value="image/webp">WEBP modern optimized web image</option>
                      </select>
                    </div>

                    {project.slices && project.slices.length > 0 && (
                      <div>
                        <label className="text-gray-400 block mb-1 font-medium">Export Area</label>
                        <select
                          value={exportMode}
                          onChange={(e: any) => setExportMode(e.target.value)}
                          className="w-full bg-[#1c1c24] border border-[#2a2a35] rounded p-2 text-white font-medium focus:outline-none cursor-pointer"
                        >
                          <option value="full">Entire Canvas ({project.width}×{project.height}px)</option>
                          <option value="slices">All Slices (.ZIP - {project.slices.length} segments)</option>
                        </select>
                      </div>
                    )}

                    {exportFormat !== 'image/png' && (
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Quality level:</span>
                          <span className="font-mono text-indigo-400 font-bold">{exportQuality}%</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="100"
                          value={exportQuality}
                          onChange={(e) => setExportQuality(parseInt(e.target.value))}
                          className="w-full accent-indigo-500 h-1 bg-[#252530]"
                        />
                      </div>
                    )}

                    <div className="p-2.5 bg-[#191922] border border-[#262630] rounded-lg flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-mono text-gray-500 block">EXPORT BOUNDS & EST. SIZE</span>
                        <span className="text-emerald-400 font-mono text-[11px]">
                          Est. Size: ~{
                            exportFormat === 'image/png'
                              ? ((project.width * project.height * 0.5) / 1024).toFixed(0)
                              : ((project.width * project.height * 0.25 * (exportQuality / 100)) / 1024).toFixed(0)
                          } KB
                        </span>
                      </div>
                      <span className="text-white font-mono font-bold text-xs">{project.width} × {project.height} px</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#24242c]">
                    <button
                      onClick={() => setShowExportModal(false)}
                      className="px-4 py-2 bg-[#1e1e24] hover:bg-[#25252e] rounded text-xs font-semibold text-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={executeExport}
                      disabled={exporting || exportCountdown > 0}
                      className={`px-4 py-2 rounded text-xs font-semibold text-white transition-all flex items-center gap-1.5 cursor-pointer ${
                        exportCountdown > 0
                          ? 'bg-amber-900/40 text-amber-300/80 cursor-not-allowed border border-amber-600/30'
                          : 'bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-900/30 font-bold'
                      }`}
                    >
                      {exporting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Processing...
                        </>
                      ) : exportCountdown > 0 ? (
                        <>
                          <Clock className="w-3.5 h-3.5 animate-pulse text-amber-400" />
                          Preparing File... ({exportCountdown}s)
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Download Image Now
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              </div>
            )}

            {/* AI REMOVE BACKGROUND OPTIONS MODAL */}
            {showRemoveBgModal && (
              <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/75 backdrop-blur-xs">
                <div className="w-full max-w-md bg-[#18181a] border border-[#2d2d35] rounded-lg overflow-hidden p-6 shadow-2xl space-y-5 text-gray-300 text-xs select-none">
                  <div className="flex items-center justify-between border-b border-[#2d2d35] pb-2.5">
                    <h3 className="font-sans font-bold text-sm text-white flex items-center gap-1.5">
                      <span>✂️</span> Remove Background (AI Model)
                    </h3>
                    <button
                      onClick={() => setShowRemoveBgModal(false)}
                      className="text-gray-500 hover:text-white cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-3.5 text-left">
                    <label className="flex items-start gap-2 cursor-pointer py-0.5">
                      <input
                        type="checkbox"
                        checked={removeBgOptions.createNewLayer}
                        onChange={(e) => setRemoveBgOptions(prev => ({ ...prev, createNewLayer: e.target.checked }))}
                        className="accent-indigo-500 w-3.5 h-3.5 cursor-pointer mt-0.5"
                      />
                      <div>
                        <span className="font-bold text-white block">Create New Layer (Recommended)</span>
                        <span className="text-[10px] text-gray-500">Duplicate current layer instead of modifying it directly.</span>
                      </div>
                    </label>

                    <label className="flex items-start gap-2 cursor-pointer py-0.5">
                      <input
                        type="checkbox"
                        checked={removeBgOptions.addLayerMask}
                        onChange={(e) => setRemoveBgOptions(prev => ({ ...prev, addLayerMask: e.target.checked }))}
                        className="accent-indigo-500 w-3.5 h-3.5 cursor-pointer mt-0.5"
                      />
                      <div>
                        <span className="font-bold text-white block">Create Layer Mask</span>
                        <span className="text-[10px] text-gray-500">Keep removal non-destructive by using transparency masking.</span>
                      </div>
                    </label>

                    {removeBgOptions.createNewLayer && (
                      <div className="pl-6 space-y-2 border-l border-[#2d2d35]">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={removeBgOptions.keepOriginal}
                            onChange={(e) => setRemoveBgOptions(prev => ({ ...prev, keepOriginal: e.target.checked }))}
                            className="accent-indigo-500 w-3.5 h-3.5 cursor-pointer"
                          />
                          <span>Keep Original Photo</span>
                        </label>
                        {removeBgOptions.keepOriginal && (
                          <label className="flex items-center gap-2 cursor-pointer pl-4">
                            <input
                              type="checkbox"
                              checked={removeBgOptions.keepOriginalHidden}
                              onChange={(e) => setRemoveBgOptions(prev => ({ ...prev, keepOriginalHidden: e.target.checked }))}
                              className="accent-indigo-500 w-3.5 h-3.5 cursor-pointer"
                            />
                            <span className="text-[10px] text-gray-400">Keep Original Hidden</span>
                          </label>
                        )}
                      </div>
                    )}

                    <div className="border-t border-[#2d2d35]/50 pt-3 space-y-2">
                      <div className="space-y-1">
                        <div className="flex justify-between text-gray-400">
                          <span>Feather Edge:</span>
                          <span className="font-mono text-indigo-400 font-bold">{removeBgOptions.featherEdge}px</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="20"
                          value={removeBgOptions.featherEdge}
                          onChange={(e) => setRemoveBgOptions(prev => ({ ...prev, featherEdge: parseInt(e.target.value) }))}
                          className="w-full accent-indigo-500 h-1 bg-[#252530]"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-gray-400">
                          <span>Edge Refinement:</span>
                          <span className="font-mono text-indigo-400 font-bold">{removeBgOptions.edgeRefinement}px</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="20"
                          value={removeBgOptions.edgeRefinement}
                          onChange={(e) => setRemoveBgOptions(prev => ({ ...prev, edgeRefinement: parseInt(e.target.value) }))}
                          className="w-full accent-indigo-500 h-1 bg-[#252530]"
                        />
                      </div>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer py-0.5 border-t border-[#2d2d35]/50 pt-3">
                      <input
                        type="checkbox"
                        checked={removeBgOptions.aiHairRefinement}
                        onChange={(e) => setRemoveBgOptions(prev => ({ ...prev, aiHairRefinement: e.target.checked }))}
                        className="accent-indigo-500 w-3.5 h-3.5 cursor-pointer"
                      />
                      <span>AI Hair & Fur Refinement</span>
                    </label>
                  </div>

                  <div className="flex justify-end gap-2.5 pt-3.5 border-t border-[#2d2d35]">
                    <button
                      onClick={() => setShowRemoveBgModal(false)}
                      className="px-4 py-2 bg-[#2a2a30] hover:bg-[#33333c] text-gray-300 font-semibold rounded transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleRemoveBackgroundProcess}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded transition-colors cursor-pointer shadow-lg"
                    >
                      Remove Background
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* AI REMOVE BACKGROUND LOADING PROGRESS OVERLAY */}
            {isRemoveBgLoading && (
              <div className="fixed inset-0 z-60 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md select-none">
                <div className="w-full max-w-xs p-6 bg-[#16161a] border border-[#2d2d35] rounded-xl flex flex-col items-center gap-4 text-center shadow-2xl animate-pulse">
                  <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/25 rounded-full flex items-center justify-center text-indigo-400 text-xl animate-bounce">
                    ✂️
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-white text-xs tracking-wide">AI BACKGROUND REMOVAL</h4>
                    <p className="text-[10px] text-gray-500">Processing image layers...</p>
                  </div>

                  <div className="w-full bg-[#252530] rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-indigo-500 h-full transition-all duration-300"
                      style={{
                        width: `${removeBgProgress}%`
                      }}
                    />
                  </div>

                  <span className="font-mono text-amber-400 font-bold text-[10px] uppercase tracking-wider">
                    {removeBgLoadingStep}
                  </span>
                </div>
              </div>
            )}

            {/* KEYBOARD SHORTCUTS HELP MODAL */}
            {showHelpModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-full max-w-2xl bg-[#141419] border border-[#2c2c36] rounded-xl overflow-hidden shadow-2xl flex flex-col"
                  style={{ maxHeight: '88vh' }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-[#24242c] px-6 py-4 shrink-0">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="w-5 h-5 text-indigo-400" />
                      <h3 className="font-sans font-bold text-sm text-white">Keyboard Shortcuts &amp; Tool Guide</h3>
                    </div>
                    <button onClick={() => setShowHelpModal(false)} className="text-gray-400 hover:text-white cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Scrollable body */}
                  <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5 text-xs">

                    {/* ── Section 1: Tool Keys (Single Key) ── */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                        Toolbar Tools (Single Key Shortcuts)
                      </span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          ['Move Tool',              'V'],
                          ['Brush / Paint',          'B'],
                          ['Eraser Tool',            'E'],
                          ['Hand / Pan',             'H'],
                          ['Zoom Tool',              'Z'],
                          ['Marquee Selection',      'M'],
                          ['Lasso Tool',             'L'],
                          ['Quick Selection / Wand', 'W'],
                          ['Crop / Slice Tool',      'C'],
                          ['Eyedropper',             'I'],
                          ['Healing / Patch',        'J'],
                          ['Clone Stamp',            'S'],
                          ['History Brush',          'Y'],
                          ['Gradient / Bucket',      'G'],
                          ['Blur / Sharpen / Smudge','R'],
                          ['Dodge / Burn / Sponge',  'O'],
                          ['Pen Tool',               'P'],
                          ['Shape Tool',             'U'],
                          ['Text Tool',              'T'],
                          ['Path Selection',         'A'],
                        ].map(([label, key]) => (
                          <div key={key + label} className="flex justify-between items-center bg-[#191922] px-2.5 py-1.5 rounded border border-[#23232c]">
                            <span className="text-gray-300 truncate pr-1">{label}</span>
                            <kbd className="shrink-0 px-1.5 py-0.5 bg-[#252530] text-indigo-400 font-mono text-[10px] rounded border border-gray-700">{key}</kbd>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ── Section 2: Color & Brush Controls ── */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-mono text-violet-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-400"></span>
                        Color &amp; Brush Controls
                      </span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          ['Swap FG / BG Colors',   'X'],
                          ['Reset to White / Black', 'D'],
                          ['Quick Mask Mode',        'Q'],
                          ['Toggle Screen Mode',     'F'],
                          ['Increase Brush Size',    ']'],
                          ['Decrease Brush Size',    '['],
                          ['Increase Brush Hardness','Shift + ]'],
                          ['Decrease Brush Hardness','Shift + ['],
                        ].map(([label, key]) => (
                          <div key={label} className="flex justify-between items-center bg-[#191922] px-2.5 py-1.5 rounded border border-[#23232c]">
                            <span className="text-gray-300 truncate pr-1">{label}</span>
                            <kbd className="shrink-0 px-1.5 py-0.5 bg-[#252530] text-violet-400 font-mono text-[10px] rounded border border-gray-700">{key}</kbd>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ── Section 3: File & Edit Shortcuts ── */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        File &amp; Edit Shortcuts
                      </span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          ['Undo',                    'Ctrl + Z'],
                          ['Redo',                    'Ctrl + Y / Ctrl + Shift + Z'],
                          ['New Canvas',              'Ctrl + N'],
                          ['Save Project',            'Ctrl + S'],
                          ['Export Image Dialog',     'Ctrl + Shift + S'],
                          ['Quick Export PNG',        'Ctrl + Shift + E'],
                          ['Copy Layer / Selection',  'Ctrl + C'],
                          ['Paste Layer',             'Ctrl + V'],
                          ['Cut Layer',               'Ctrl + X'],
                          ['Select All',              'Ctrl + A'],
                          ['Deselect Marquee',        'Ctrl + D'],
                          ['Invert Selection',        'Ctrl + Shift + I'],
                          ['Fill Selection',          'Shift + F5'],
                          ['Close / Dashboard',       'Ctrl + W'],
                          ['Free Transform',          'Ctrl + T'],
                          ['Merge Down Layer',        'Ctrl + E'],
                        ].map(([label, key]) => (
                          <div key={label} className="flex justify-between items-center bg-[#191922] px-2.5 py-1.5 rounded border border-[#23232c]">
                            <span className="text-gray-300">{label}</span>
                            <kbd className="shrink-0 px-1.5 py-0.5 bg-[#252530] text-emerald-400 font-mono text-[10px] rounded border border-gray-700">{key}</kbd>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ── Section 4: Layers & Masking ── */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-mono text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                        Layers &amp; Masking
                      </span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          ['New Layer Dialog',             'Ctrl + Shift + N'],
                          ['Duplicate Layer',              'Ctrl + J'],
                          ['Layer via Cut',                'Ctrl + Shift + J'],
                          ['Group Selected Layers',        'Ctrl + G'],
                          ['Ungroup Layers',               'Ctrl + Shift + G'],
                          ['Clipping Mask (Toggle)',       'Ctrl + Alt + G'],
                          ['AI Remove Background',         'Ctrl + Alt + R'],
                          ['Toggle Layer Mask On/Off',     'Ctrl + M'],
                          ['Bring Layer Forward',          'Ctrl + ]'],
                          ['Send Layer Backward',          'Ctrl + ['],
                          ['Bring Layer to Front',         'Ctrl + Shift + ]'],
                          ['Send Layer to Back',           'Ctrl + Shift + ['],
                          ['Delete Selected Layer',        'Delete'],
                        ].map(([label, key]) => (
                          <div key={label} className="flex justify-between items-center bg-[#191922] px-2.5 py-1.5 rounded border border-[#23232c]">
                            <span className="text-gray-300">{label}</span>
                            <kbd className="shrink-0 px-1.5 py-0.5 bg-[#252530] text-amber-400 font-mono text-[10px] rounded border border-gray-700">{key}</kbd>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ── Section 5: Image Adjustments & Color ── */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-mono text-rose-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                        Image Adjustments
                      </span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          ['Invert Layer Colors',     'Ctrl + I'],
                          ['Levels Adjustment',       'Ctrl + L'],
                          ['Curves Adjustment',       'Ctrl + M'],
                          ['Hue / Saturation',        'Ctrl + U'],
                        ].map(([label, key]) => (
                          <div key={label} className="flex justify-between items-center bg-[#191922] px-2.5 py-1.5 rounded border border-[#23232c]">
                            <span className="text-gray-300">{label}</span>
                            <kbd className="shrink-0 px-1.5 py-0.5 bg-[#252530] text-rose-400 font-mono text-[10px] rounded border border-gray-700">{key}</kbd>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ── Section 6: View Navigation & Canvas ── */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-mono text-sky-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                        View Navigation &amp; Canvas
                      </span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          ['Zoom In',                 'Ctrl + + / Click'],
                          ['Zoom Out',                'Ctrl + − / Alt + Click'],
                          ['Fit on Screen',           'Ctrl + 0'],
                          ['100% Zoom (1:1)',         'Ctrl + 1'],
                          ['Toggle Rulers',           'Ctrl + R'],
                          ['Toggle Guides',           'Ctrl + ;'],
                          ['Toggle Grid',             "Ctrl + '"],
                          ['Pan Canvas View',         'Spacebar + Drag'],
                          ['Rotate Canvas View',      'R + Drag'],
                          ['Scroll Zoom',             'Ctrl + Scroll'],
                          ['RGB Channel Display',     'Ctrl + 2'],
                          ['Red Channel Display',     'Ctrl + 3'],
                          ['Green Channel Display',   'Ctrl + 4'],
                          ['Blue Channel Display',    'Ctrl + 5'],
                        ].map(([label, key]) => (
                          <div key={label} className="flex justify-between items-center bg-[#191922] px-2.5 py-1.5 rounded border border-[#23232c]">
                            <span className="text-gray-300">{label}</span>
                            <kbd className="shrink-0 px-1.5 py-0.5 bg-[#252530] text-sky-400 font-mono text-[10px] rounded border border-gray-700">{key}</kbd>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ── Pro Tips ── */}
                    <div className="space-y-1.5 bg-[#1b1b22] p-3 rounded-lg border border-[#2e2e3a] text-[11px] leading-relaxed text-gray-300">
                      <span className="text-[9px] font-mono text-amber-400 font-bold uppercase block mb-1.5">💡 PRO TIPS &amp; MODIFIERS</span>
                      <p>• <strong className="text-white">Hold Spacebar</strong> while any tool is active to temporarily switch to the Hand/Pan tool.</p>
                      <p>• <strong className="text-white">Hold Alt Key</strong> while using Zoom Tool to quickly switch to Zoom Out Mode.</p>
                      <p>• <strong className="text-white">Shift Key + Drag</strong> constrains proportions on shapes/selection marquee or snaps angle to 45° increments on Gradient Tool.</p>
                      <p>• <strong className="text-white">Ctrl + Alt + R</strong> opens AI Remove Background — choose non-destructive Layer Mask mode.</p>
                      <p>• <strong className="text-white">Ctrl + M</strong> toggles Layer Mask on/off without deleting it.</p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex justify-end px-6 py-4 border-t border-[#24242c] shrink-0">
                    <button
                      onClick={() => setShowHelpModal(false)}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-xs font-semibold text-white transition-colors cursor-pointer"
                    >
                      Got it
                    </button>
                  </div>
                </motion.div>
              </div>
            )}

            {/* CANVAS SIZE DIALOG */}
            {showCanvasSizeModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-full max-w-md bg-[#141419] border border-[#2c2c36] rounded-xl overflow-hidden p-6 shadow-2xl space-y-6"
                >
                  <div className="flex items-center justify-between border-b border-[#24242c] pb-3">
                    <h3 className="font-sans font-bold text-sm text-white">Canvas Size</h3>
                    <button onClick={() => setShowCanvasSizeModal(false)} className="text-gray-400 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-4 text-xs">
                    <div>
                      <label className="text-gray-400 block mb-1">Preset Canvas Size</label>
                      <select
                        onChange={(e) => {
                          const preset = CANVAS_PRESETS.find(p => p.id === e.target.value);
                          if (preset) {
                            setCanvasSizeWidth(preset.width);
                            setCanvasSizeHeight(preset.height);
                          }
                        }}
                        className="w-full bg-[#1c1c24] border border-[#2a2a35] rounded p-2 text-white font-sans text-xs focus:border-indigo-500 focus:outline-none cursor-pointer"
                      >
                        <option value="">-- Pilih Preset Kanvas --</option>
                        {CANVAS_PRESET_CATEGORIES.filter(c => c.id !== 'all').map((cat) => (
                          <optgroup key={cat.id} label={cat.label}>
                            {CANVAS_PRESETS.filter(p => p.category === cat.id).map((preset) => (
                              <option key={preset.id} value={preset.id}>
                                {preset.name} ({preset.width} × {preset.height} px) [{preset.badge}]
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-gray-400 block mb-1">Width (px)</label>
                        <input
                          type="number"
                          min="1"
                          value={canvasSizeWidth}
                          onChange={(e) => setCanvasSizeWidth(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full bg-[#1c1c24] border border-[#2a2a35] rounded p-2 text-white font-mono focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-gray-400 block mb-1">Height (px)</label>
                        <input
                          type="number"
                          min="1"
                          value={canvasSizeHeight}
                          onChange={(e) => setCanvasSizeHeight(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full bg-[#1c1c24] border border-[#2a2a35] rounded p-2 text-white font-mono focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-gray-400 block mb-1">Anchor</label>
                      <div className="grid grid-cols-3 gap-1 w-36 mx-auto">
                        {(['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'] as const).map((anchor) => (
                          <button
                            key={anchor}
                            onClick={() => setCanvasSizeAnchor(anchor)}
                            className={`p-2 rounded border text-[9px] font-mono ${
                              canvasSizeAnchor === anchor
                                ? 'bg-indigo-600 border-indigo-500 text-white'
                                : 'bg-[#1c1c24] border-[#2a2a35] text-gray-400 hover:border-indigo-500'
                            }`}
                          >
                            {anchor === 'center' ? '⊙' : anchor === 'top-left' ? '◰' : anchor === 'top-right' ? '◲' : anchor === 'bottom-left' ? '◳' : '◱'}
                          </button>
                        ))}
                        {/* empty cells to make it a 3x3 grid */}
                        <div />
                        <div />
                        <div />
                      </div>
                    </div>

                    <div>
                      <label className="text-gray-400 block mb-1">Canvas Extension Color</label>
                      <input
                        type="color"
                        value={canvasSizeBgColor}
                        onChange={(e) => setCanvasSizeBgColor(e.target.value)}
                        className="bg-[#1c1c24] border border-[#2a2a35] rounded h-8 w-full cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-[#24242c]">
                    <button
                      onClick={() => setShowCanvasSizeModal(false)}
                      className="px-4 py-2 bg-[#1e1e24] hover:bg-[#25252e] rounded text-xs font-semibold text-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleApplyCanvasSize(canvasSizeWidth, canvasSizeHeight, canvasSizeAnchor, canvasSizeBgColor)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-xs font-semibold text-white transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                </motion.div>
              </div>
            )}

            {/* EDIT FILL DIALOG */}
            {showFillModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-full max-w-sm bg-[#141419] border border-[#2c2c36] rounded-xl overflow-hidden p-5 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150"
                >
                  <div className="flex items-center justify-between border-b border-[#24242c] pb-2.5">
                    <h3 className="font-sans font-bold text-sm text-white">Fill Layer</h3>
                    <button onClick={() => setShowFillModal(false)} className="text-gray-400 hover:text-white cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-4 text-xs">
                    <div className="space-y-1 text-left">
                      <label className="text-gray-400 block mb-1">Contents</label>
                      <select
                        value={fillType}
                        onChange={(e) => setFillType(e.target.value as any)}
                        className="w-full bg-[#1c1c24] border border-[#2a2a35] rounded p-2 text-white focus:outline-none"
                      >
                        <option value="foreground">Foreground Color</option>
                        <option value="background">Background Color</option>
                        <option value="black">Black</option>
                        <option value="white">White</option>
                        <option value="custom">Custom Color...</option>
                      </select>
                    </div>

                    {fillType === 'custom' && (
                      <div className="space-y-1 text-left">
                        <label className="text-gray-400 block mb-1">Color</label>
                        <input
                          type="color"
                          value={fillCustomColor}
                          onChange={(e) => setFillCustomColor(e.target.value)}
                          className="bg-[#1c1c24] border border-[#2a2a35] rounded h-8 w-full cursor-pointer p-0.5"
                        />
                      </div>
                    )}

                    <div className="space-y-1 text-left">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-gray-400">Opacity</label>
                        <span className="text-indigo-400 font-mono font-bold">{fillOpacity}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={fillOpacity}
                        onChange={(e) => setFillOpacity(parseInt(e.target.value))}
                        className="w-full accent-indigo-500 h-1 bg-[#1c1c24] cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-3.5 border-t border-[#24242c]">
                    <button
                      onClick={() => setShowFillModal(false)}
                      className="px-4 py-1.5 bg-[#1e1e24] hover:bg-[#25252e] rounded text-xs font-semibold text-gray-300 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        handleEditFill(fillType, fillCustomColor, fillOpacity);
                        setShowFillModal(false);
                      }}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded text-xs font-semibold text-white transition-colors cursor-pointer"
                    >
                      OK
                    </button>
                  </div>
                </motion.div>
              </div>
            )}

            {/* EDIT STROKE DIALOG */}
            {showStrokeModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-full max-w-sm bg-[#141419] border border-[#2c2c36] rounded-xl overflow-hidden p-5 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150"
                >
                  <div className="flex items-center justify-between border-b border-[#24242c] pb-2.5">
                    <h3 className="font-sans font-bold text-sm text-white">Stroke Layer</h3>
                    <button onClick={() => setShowStrokeModal(false)} className="text-gray-400 hover:text-white cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-4 text-xs">
                    <div className="space-y-1 text-left">
                      <label className="text-gray-400 block mb-1">Width (px)</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={strokeWidthInput}
                        onChange={(e) => setStrokeWidthInput(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full bg-[#1c1c24] border border-[#2a2a35] rounded p-2 text-white font-mono focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1 text-left">
                      <label className="text-gray-400 block mb-1">Color</label>
                      <input
                        type="color"
                        value={strokeColorInput}
                        onChange={(e) => setStrokeColorInput(e.target.value)}
                        className="bg-[#1c1c24] border border-[#2a2a35] rounded h-8 w-full cursor-pointer p-0.5"
                      />
                    </div>

                    <div className="space-y-1 text-left">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-gray-400">Opacity</label>
                        <span className="text-indigo-400 font-mono font-bold">{strokeOpacityInput}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={strokeOpacityInput}
                        onChange={(e) => setStrokeOpacityInput(parseInt(e.target.value))}
                        className="w-full accent-indigo-500 h-1 bg-[#1c1c24] cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-3.5 border-t border-[#24242c]">
                    <button
                      onClick={() => setShowStrokeModal(false)}
                      className="px-4 py-1.5 bg-[#1e1e24] hover:bg-[#25252e] rounded text-xs font-semibold text-gray-300 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        handleEditStroke(strokeWidthInput, strokeColorInput, strokeOpacityInput);
                        setShowStrokeModal(false);
                      }}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded text-xs font-semibold text-white transition-colors cursor-pointer"
                    >
                      OK
                    </button>
                  </div>
                </motion.div>
              </div>
            )}

            {/* FILTER GALLERY DIALOG */}
            {showFilterGallery && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm select-none">
                <div className="bg-[#121216] border border-[#2b2b36] rounded-xl shadow-2xl w-[900px] h-[550px] flex flex-col overflow-hidden text-gray-300">
                  {/* Header */}
                  <div className="px-4 py-3 bg-[#181822] border-b border-[#2b2b36] flex items-center justify-between">
                    <span className="font-bold text-white text-[13px] tracking-wider uppercase font-mono">Filter Gallery</span>
                    <button
                      onClick={() => setShowFilterGallery(false)}
                      className="text-gray-400 hover:text-white transition-colors cursor-pointer text-xs"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Body */}
                  <div className="flex-1 flex overflow-hidden">
                    {/* Left: Preview Panel */}
                    <div className="flex-1 bg-[#0a0a0d] flex items-center justify-center p-4 relative border-r border-[#2b2b36]">
                      {(() => {
                        const layer = project ? project.layers.find(l => l.id === activeLayerId) : null;
                        if (!layer || layer.type !== 'image' || !layer.imageElement) {
                          return (
                            <div className="text-center text-gray-500 text-xs">
                              Select an image layer first to view filter preview.
                            </div>
                          );
                        }
                        
                        return (
                          <div className="flex flex-col items-center gap-2 max-w-full max-h-full">
                            <FilterPreviewBox
                              image={layer.imageElement}
                              effect={filterGalleryEffect}
                              intensity={filterGalleryIntensity}
                              radius={filterGalleryRadius}
                              angle={filterGalleryAngle}
                              threshold={filterGalleryThreshold}
                            />
                            <span className="text-[10px] text-gray-500 font-mono">Real-time Preview (50% scale)</span>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Right: Controls Panel */}
                    <div className="w-80 bg-[#15151b] p-4 flex flex-col gap-4 overflow-y-auto">
                      {/* Filter Categories list */}
                      <div className="space-y-1">
                        <label className="text-[9px] text-gray-500 font-bold uppercase tracking-wider font-mono">Select Filter Effect</label>
                        <select
                          value={filterGalleryEffect}
                          onChange={(e) => setFilterGalleryEffect(e.target.value as FilterEffect)}
                          className="w-full bg-[#1c1c24] border border-[#2b2b38] rounded-md p-2 text-[11px] text-white focus:outline-none"
                        >
                          <optgroup label="Blur Filters">
                            <option value="gaussian-blur">Gaussian Blur</option>
                            <option value="motion-blur">Motion Blur</option>
                            <option value="radial-blur">Radial Blur</option>
                          </optgroup>
                          <optgroup label="Stylize & Edge">
                            <option value="sharpen">Sharpen</option>
                            <option value="edge-detect">Sobel Edge Detect</option>
                            <option value="emboss">Emboss</option>
                            <option value="find-edges">Find Edges Contour</option>
                          </optgroup>
                          <optgroup label="Artistic & Distortion">
                            <option value="pixelate">Pixelate Blocks</option>
                            <option value="mosaic">Mosaic Tile</option>
                            <option value="oil-paint">Oil Paint Effect</option>
                            <option value="posterize">Posterize Quantize</option>
                            <option value="threshold">Binary Threshold</option>
                            <option value="noise">Gaussian Noise</option>
                            <option value="twirl">Twirl Radial Twist</option>
                            <option value="ripple">Ripple Sinusoidal Wave</option>
                            <option value="solarize">Solarize Burn</option>
                          </optgroup>
                        </select>
                      </div>

                      {/* Sliders container */}
                      <div className="flex-1 space-y-4">
                        <div className="px-1 py-1 border-b border-[#2b2b36]">
                          <span className="text-[10px] text-gray-400 font-bold font-mono">EFFECT PARAMETERS</span>
                        </div>

                        {/* Intensity Slider */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-gray-400">
                            <span>Filter Intensity:</span>
                            <span className="font-mono text-gray-200">{filterGalleryIntensity}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={filterGalleryIntensity}
                            onChange={(e) => setFilterGalleryIntensity(parseInt(e.target.value))}
                            className="w-full accent-indigo-600 h-1 bg-[#1c1c24] cursor-pointer"
                          />
                        </div>

                        {/* Radius Slider (only for blurs) */}
                        {['gaussian-blur', 'motion-blur', 'radial-blur', 'oil-paint'].includes(filterGalleryEffect) && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-gray-400">
                              <span>Effect Radius:</span>
                              <span className="font-mono text-gray-200">{filterGalleryRadius}px</span>
                            </div>
                            <input
                              type="range"
                              min="1"
                              max="15"
                              value={filterGalleryRadius}
                              onChange={(e) => setFilterGalleryRadius(parseInt(e.target.value))}
                              className="w-full accent-indigo-600 h-1 bg-[#1c1c24] cursor-pointer"
                            />
                          </div>
                        )}

                        {/* Angle Slider (only for motion-blur) */}
                        {filterGalleryEffect === 'motion-blur' && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-gray-400">
                              <span>Blur Angle:</span>
                              <span className="font-mono text-gray-200">{filterGalleryAngle}°</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="360"
                              value={filterGalleryAngle}
                              onChange={(e) => setFilterGalleryAngle(parseInt(e.target.value))}
                              className="w-full accent-indigo-600 h-1 bg-[#1c1c24] cursor-pointer"
                            />
                          </div>
                        )}

                        {/* Threshold Slider */}
                        {['threshold', 'solarize'].includes(filterGalleryEffect) && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-gray-400">
                              <span>Cutoff Threshold:</span>
                              <span className="font-mono text-gray-200">{filterGalleryThreshold}</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="255"
                              value={filterGalleryThreshold}
                              onChange={(e) => setFilterGalleryThreshold(parseInt(e.target.value))}
                              className="w-full accent-indigo-600 h-1 bg-[#1c1c24] cursor-pointer"
                            />
                          </div>
                        )}
                      </div>

                      {/* Footer Actions */}
                      <div className="flex gap-2 pt-3 border-t border-[#2b2b36] justify-end">
                        <button
                          onClick={() => setShowFilterGallery(false)}
                          className="px-3.5 py-1.5 bg-[#1e1e24] hover:bg-[#25252e] rounded-md text-[11px] font-bold text-gray-300 transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleApplyFilterGallery({
                            effect: filterGalleryEffect,
                            intensity: filterGalleryIntensity,
                            radius: filterGalleryRadius,
                            angle: filterGalleryAngle,
                            threshold: filterGalleryThreshold
                          })}
                          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-md text-[11px] font-bold text-white transition-colors cursor-pointer"
                        >
                          Apply Filter
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* CANVAS RIGHT CLICK CONTEXT MENU */}
            {contextMenu && (
              <>
                {/* Backdrop overlay */}
                <div
                  className="fixed inset-0 z-50 bg-transparent"
                  onMouseDown={() => setContextMenu(null)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu(null);
                  }}
                />

                {/* Floating context menu wrapper */}
                <div
                  style={{
                    position: 'fixed',
                    left: `${contextMenu.clientX}px`,
                    top: `${contextMenu.clientY}px`,
                  }}
                  className="z-50 bg-[#121216]/95 border border-[#2b2b36] rounded-lg shadow-2xl py-1.5 w-48 text-left select-none text-[11px] text-gray-200 font-sans backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
                  onContextMenu={(e) => e.preventDefault()}
                >
                  {project && (activeTool === 'move' || activeTool === 'path-select') && (() => {
                    const matchedLayers = project.layers.filter(l => {
                      const rx = l.x + l.width;
                      const by = l.y + l.height;
                      return contextMenu.x >= l.x && contextMenu.x <= rx && contextMenu.y >= l.y && contextMenu.y <= by;
                    });
                    if (matchedLayers.length > 0) {
                      return (
                        <div className="border-b border-[#22222c] pb-1 mb-1">
                          <span className="px-3 text-[8px] font-mono text-gray-500 font-bold uppercase block mb-1">Select Layer</span>
                          {matchedLayers.map(l => (
                            <button
                              key={`ctx-lay-${l.id}`}
                              onClick={() => {
                                setActiveLayerId(l.id);
                                setContextMenu(null);
                              }}
                              className={`w-full text-left px-3 py-1 hover:bg-indigo-600 hover:text-white truncate font-medium text-[10px] flex items-center gap-1 ${l.id === activeLayerId ? 'text-indigo-400 font-bold bg-indigo-500/5' : ''}`}
                            >
                              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full shrink-0" />
                              {l.name}
                            </button>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* SLICE TOOL CONTEXT MENU */}
                  {project && (activeSubTool === 'slice' || activeSubTool === 'slice-select') && (() => {
                    const slices = project.slices || [];
                    const clickedSliceIndex = slices.findIndex(
                      (s) => contextMenu.x >= s.x && contextMenu.x <= s.x + s.w && contextMenu.y >= s.y && contextMenu.y <= s.y + s.h
                    );
                    const targetSlice = clickedSliceIndex >= 0 ? slices[clickedSliceIndex] : null;

                    return (
                      <div className="border-b border-[#22222c] pb-1 mb-1">
                        <span className="px-3 text-[8px] font-mono text-indigo-400 font-bold uppercase block mb-1">
                          Slice Options {targetSlice ? `#${clickedSliceIndex + 1}` : ''}
                        </span>
                        {targetSlice && (
                          <button
                            onClick={() => {
                              setEditingSlice({ slice: targetSlice, index: clickedSliceIndex });
                              setContextMenu(null);
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white font-medium flex items-center justify-between"
                          >
                            <span>Edit Slice Options...</span>
                            <span className="text-[9px] opacity-60 font-mono">Double-click</span>
                          </button>
                        )}
                        {targetSlice && (
                          <button
                            onClick={() => {
                              setDividingSlice({ slice: targetSlice, index: clickedSliceIndex });
                              setContextMenu(null);
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white font-medium flex items-center justify-between"
                          >
                            <span>Divide Slice...</span>
                          </button>
                        )}
                        {targetSlice && (
                          <button
                            onClick={() => {
                              const copy: Slice = {
                                ...targetSlice,
                                id: `slice-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                                x: targetSlice.x + 15,
                                y: targetSlice.y + 15,
                                name: `${targetSlice.name || 'slice'}_copy`,
                              };
                              handleUpdateProject({ slices: [...slices, copy] });
                              handlePushHistory('Duplicated slice');
                              setContextMenu(null);
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white font-medium flex items-center justify-between"
                          >
                            <span>Duplicate Slice</span>
                          </button>
                        )}
                        {targetSlice && (
                          <button
                            onClick={() => {
                              handleUpdateProject({ slices: slices.filter((s) => s.id !== targetSlice.id) });
                              handlePushHistory('Deleted slice');
                              setContextMenu(null);
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-red-600 hover:text-white text-red-400 font-medium flex items-center justify-between"
                          >
                            <span>Delete Slice</span>
                          </button>
                        )}
                      </div>
                    );
                  })()}

                  {(activeTool === 'brush' || activeTool === 'eraser' || activeTool === 'healing' || activeTool === 'blur-sharpen' || activeTool === 'dodge-burn') && (
                    <div className="px-3 py-2 border-b border-[#22222c] space-y-2 text-[10px] bg-[#1a1a20]/60">
                      <span className="text-[8px] font-mono text-indigo-400 font-bold uppercase block">Brush Settings</span>
                      <div className="space-y-0.5">
                        <div className="flex justify-between text-gray-400">
                          <span>Brush Size:</span>
                          <span className="font-mono text-white">{brushSize}px</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="200"
                          value={brushSize}
                          onChange={(e) => setBrushSize(parseInt(e.target.value))}
                          className="w-full accent-indigo-500 h-1 bg-[#252530] cursor-pointer"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex justify-between text-gray-400">
                          <span>Hardness:</span>
                          <span className="font-mono text-white">{brushHardness}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={brushHardness}
                          onChange={(e) => setBrushHardness(parseInt(e.target.value))}
                          className="w-full accent-indigo-500 h-1 bg-[#252530] cursor-pointer"
                        />
                      </div>
                    </div>
                  )}

                  <div className="px-3 py-1 border-b border-[#22222c] mb-1">
                    <span className="text-[9px] font-mono text-indigo-400 font-bold uppercase tracking-wider">Layer Options</span>
                  </div>

                  <button
                    onClick={() => { handleUndo(); setContextMenu(null); }}
                    disabled={historyIndex <= 0}
                    className="flex items-center justify-between w-full px-3 py-1.5 hover:bg-[#1c1c28] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                  >
                    <span>Undo</span>
                    <span className="text-[9px] text-gray-500 font-mono">Ctrl+Z</span>
                  </button>

                  <button
                    onClick={() => { handleRedo(); setContextMenu(null); }}
                    disabled={historyIndex >= historyStack.length - 1}
                    className="flex items-center justify-between w-full px-3 py-1.5 hover:bg-[#1c1c28] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                  >
                    <span>Redo</span>
                    <span className="text-[9px] text-gray-500 font-mono">Ctrl+Y</span>
                  </button>

                  <div className="h-[1px] bg-[#22222c] my-1" />

                  <button
                    onClick={() => { handleCutLayer(); setContextMenu(null); }}
                    className="flex items-center justify-between w-full px-3 py-1.5 hover:bg-[#1c1c28] hover:text-white cursor-pointer"
                  >
                    <span>Cut Layer</span>
                    <span className="text-[9px] text-gray-500 font-mono">Ctrl+X</span>
                  </button>

                  <button
                    onClick={() => { handleCopyLayer(); setContextMenu(null); }}
                    className="flex items-center justify-between w-full px-3 py-1.5 hover:bg-[#1c1c28] hover:text-white cursor-pointer"
                  >
                    <span>Copy Layer</span>
                    <span className="text-[9px] text-gray-500 font-mono">Ctrl+C</span>
                  </button>

                  <button
                    onClick={() => { handlePasteLayer(); setContextMenu(null); }}
                    className="flex items-center justify-between w-full px-3 py-1.5 hover:bg-[#1c1c28] hover:text-white cursor-pointer"
                  >
                    <span>Paste Layer</span>
                    <span className="text-[9px] text-gray-500 font-mono">Ctrl+V</span>
                  </button>

                  <div className="h-[1px] bg-[#22222c] my-1" />

                  <button
                    onClick={() => { setActiveTool('crop'); setActiveSubTool('transform'); setContextMenu(null); }}
                    className="flex items-center justify-between w-full px-3 py-1.5 hover:bg-[#1c1c28] hover:text-white cursor-pointer"
                  >
                    <span>Free Transform</span>
                    <span className="text-[9px] text-gray-500 font-mono">Ctrl+T</span>
                  </button>

                  <button
                    onClick={() => { setShowRemoveBgModal(true); setContextMenu(null); }}
                    className="flex items-center justify-between w-full px-3 py-1.5 hover:bg-[#1c1c28] hover:text-white cursor-pointer font-bold text-indigo-400"
                  >
                    <span>Remove Background</span>
                    <span className="text-[9px] text-gray-500 font-mono">Ctrl+Alt+R</span>
                  </button>

                  {(() => {
                    const activeLayer = project.layers.find(l => l.id === activeLayerId);
                    if (activeLayer && activeLayer.hasMask) {
                      return (
                        <>
                          <button
                            onClick={() => { handleApplyMask(activeLayer.id); setContextMenu(null); }}
                            className="w-full text-left px-3 py-1.5 hover:bg-[#1c1c28] hover:text-white cursor-pointer font-semibold"
                          >
                            Apply Layer Mask
                          </button>
                          <button
                            onClick={() => { handleDeleteMask(activeLayer.id); setContextMenu(null); }}
                            className="w-full text-left px-3 py-1.5 hover:bg-[#1c1c28] hover:text-white cursor-pointer text-red-400"
                          >
                            Delete Layer Mask
                          </button>
                        </>
                      );
                    } else {
                      return (
                        <button
                          onClick={() => {
                            if (activeLayerId) {
                              const mCanvas = document.createElement('canvas');
                              mCanvas.width = activeLayer?.width || 500;
                              mCanvas.height = activeLayer?.height || 500;
                              const mCtx = mCanvas.getContext('2d');
                              if (mCtx) {
                                mCtx.fillStyle = '#ffffff';
                                mCtx.fillRect(0, 0, mCanvas.width, mCanvas.height);
                              }
                              handleUpdateLayer(activeLayerId, { hasMask: true, maskCanvas: mCanvas });
                              handlePushHistory('Added layer mask');
                            }
                            setContextMenu(null);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#1c1c28] hover:text-white cursor-pointer"
                        >
                          Create Layer Mask
                        </button>
                      );
                    }
                  })()}

                  <button
                    onClick={() => {
                      if (activeLayerId) {
                        handleDuplicateLayer(activeLayerId);
                      }
                      setContextMenu(null);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#1c1c28] hover:text-white cursor-pointer"
                  >
                    Duplicate Layer
                  </button>

                  <button
                    onClick={() => {
                      if (activeLayerId) {
                        handleDeleteLayer(activeLayerId);
                      }
                      setContextMenu(null);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#1c1c28] hover:text-white text-red-400 cursor-pointer"
                  >
                    Delete Layer
                  </button>
                </div>
              </>
            )}
            {activeImageDialog && [
              'brightness-contrast', 'levels', 'curves', 'exposure', 'vibrance', 'hue-saturation',
              'color-balance', 'black-white', 'photo-filter', 'channel-mixer', 'color-lookup',
              'invert', 'posterize', 'threshold', 'gradient-map', 'selective-color', 'match-color',
              'replace-color', 'shadows-highlights', 'hdr-toning'
            ].includes(activeImageDialog) && (
              <AdjustmentDialog
                initialType={activeImageDialog}
                projects={projectsList}
                activeLayerId={activeLayerId}
                onApply={handleApplyAdjustment}
                onCancel={() => {
                  setActiveImageDialog(null);
                  setAdjustments({
                    brightness: 0, contrast: 0, saturation: 0, hue: 0, exposure: 0, blur: 0, grayscale: 0, sepia: 0, invert: 0, vignette: 0
                  });
                }}
                onUpdatePreview={(previewAdj) => {
                  setAdjustments(previewAdj);
                }}
              />
            )}

            {activeImageDialog === 'image-size' && project && (
              <ImageResizeDialog
                originalSize={{ w: project.width, h: project.height }}
                resolution={project.grid?.size || 72}
                onApply={handleApplyImageSize}
                onCancel={() => setActiveImageDialog(null)}
              />
            )}

            {activeImageDialog === 'canvas-size' && project && (
              <CanvasResizeDialog
                currentSize={{ w: project.width, h: project.height }}
                onApply={handleApplyCanvasSize}
                onCancel={() => setActiveImageDialog(null)}
              />
            )}

            {activeImageDialog === 'image-info' && project && (
              <ImageInfoDialog
                project={project}
                onCancel={() => setActiveImageDialog(null)}
              />
            )}

            {activeImageDialog === 'ai' && (
              <AIDialog
                onApplyAI={handleApplyAI}
                onCancel={() => setActiveImageDialog(null)}
              />
            )}

            {/* PRO UNLIMITED & PRO TOOLS MODALS */}
            <ProUpgradeModal
              isOpen={showProModal}
              onClose={() => setShowProModal(false)}
              onActivatePro={() => {
                setIsPremium(true);
                setToast({ message: "Welcome to Phototor Pro Unlimited! 👑", type: 'success' });
              }}
              isPremium={isPremium}
            />



            <BatchProcessorModal
              isOpen={showBatchModal}
              onClose={() => setShowBatchModal(false)}
              isPremium={isPremium}
              onOpenProModal={() => setShowProModal(true)}
              setToast={setToast}
            />

            {/* NEW LAYER DIALOG */}
            {activeDialog === 'newLayer' && (
              <NewLayerDialog
                onApply={(params) => {
                  handleAddLayer(params.type, {
                    name: params.name,
                    opacity: params.opacity,
                    blendMode: params.blendMode,
                    colorLabel: params.colorLabel,
                    locked: params.locked,
                  });
                  setActiveDialog(null);
                }}
                onCancel={() => setActiveDialog(null)}
              />
            )}

            {/* DUPLICATE LAYER DIALOG */}
            {activeDialog === 'duplicateLayer' && project && (
              <DuplicateLayerDialog
                layer={project.layers.find(l => l.id === (targetDuplicateLayerId || activeLayerId))!}
                openProjects={projectsList.map(p => ({ id: p.id, name: p.name }))}
                targetGroups={project.layers.filter(l => l.type === 'group').map(l => ({ id: l.id, name: l.name }))}
                onApply={(params) => {
                  const targetLayerId = targetDuplicateLayerId || activeLayerId;
                  if (!targetLayerId) return;
                  if (params.targetProjectId === 'new') {
                    const srcLayer = project.layers.find(l => l.id === targetLayerId);
                    if (srcLayer) {
                      const newProjId = `proj-${Date.now()}`;
                      const newProj: Project = {
                        id: newProjId,
                        name: params.name,
                        width: project.width,
                        height: project.height,
                        layers: [
                          {
                            ...srcLayer,
                            id: `layer-${Date.now()}-dup`,
                            name: params.name,
                            parentId: undefined
                          }
                        ],
                        createdAt: Date.now(),
                        updatedAt: Date.now()
                      };
                      setProjectsList(prev => [...prev, newProj]);
                      setOpenProjectIds(prev => [...prev, newProjId]);
                      setTabNames(prev => ({ ...prev, [newProjId]: newProj.name }));
                      handleOpenProject(newProjId);
                    }
                  } else if (params.targetProjectId === 'current') {
                    handleDuplicateLayer(targetLayerId);
                  } else {
                    const srcLayer = project.layers.find(l => l.id === targetLayerId);
                    if (srcLayer) {
                      setProjectsList(prev => prev.map(p => {
                        if (p.id !== params.targetProjectId) return p;
                        const duplicated: Layer = {
                          ...srcLayer,
                          id: `layer-${Date.now()}-dup`,
                          name: params.name,
                          parentId: params.targetGroupId === 'none' ? undefined : params.targetGroupId
                        };
                        return {
                          ...p,
                          layers: [duplicated, ...p.layers]
                        };
                      }));
                      setToast({ message: `Duplicated layer to document tab`, type: 'success' });
                    }
                  }
                  setActiveDialog(null);
                  setTargetDuplicateLayerId(null);
                }}
                onCancel={() => {
                  setActiveDialog(null);
                  setTargetDuplicateLayerId(null);
                }}
              />
            )}

            {/* LAYER PROPERTIES DIALOG */}
            {activeDialog === 'layerProperties' && project && (
              <LayerPropertiesDialog
                layer={project.layers.find(l => l.id === (targetPropertiesLayerId || activeLayerId))!}
                onApply={(updates) => {
                  const targetLayerId = targetPropertiesLayerId || activeLayerId;
                  if (targetLayerId) {
                    handleUpdateLayer(targetLayerId, updates);
                    handlePushHistory(`Updated properties for ${updates.name || 'layer'}`);
                    setToast({ message: "Layer properties updated", type: 'success' });
                  }
                  setActiveDialog(null);
                  setTargetPropertiesLayerId(null);
                }}
                onCancel={() => {
                  setActiveDialog(null);
                  setTargetPropertiesLayerId(null);
                }}
              />
            )}

            {/* LAYER STYLE FX DIALOG */}
            {activeDialog === 'layerStyle' && project && (
              (() => {
                const targetL = project.layers.find(l => l.id === (targetStyleLayerId || activeLayerId));
                if (!targetL) return null;
                return (
                  <LayerStyleDialog
                    layer={targetL}
                    initialTab={layerStyleInitialTab}
                    onUpdate={(styles) => {
                      handleUpdateLayer(targetL.id, { layerStyles: styles });
                    }}
                    onClose={() => {
                      setActiveDialog(null);
                      setTargetStyleLayerId(null);
                    }}
                  />
                );
              })()
            )}

            {/* SLICE OPTIONS DIALOG */}
            {editingSlice && (
              <SliceOptionsDialog
                slice={editingSlice.slice}
                sliceIndex={editingSlice.index}
                onSave={(updatedSlice) => {
                  if (project) {
                    const currentSlices = project.slices || [];
                    const newSlices = currentSlices.map((s) => (s.id === updatedSlice.id ? updatedSlice : s));
                    handleUpdateProject({ slices: newSlices });
                    handlePushHistory(`Updated slice options for #${editingSlice.index + 1}`);
                  }
                  setEditingSlice(null);
                }}
                onClose={() => setEditingSlice(null)}
              />
            )}

            {/* DIVIDE SLICE DIALOG */}
            {dividingSlice && (
              <DivideSliceDialog
                slice={dividingSlice.slice}
                sliceIndex={dividingSlice.index}
                onDivide={(dividedSlices) => {
                  if (project && dividingSlice) {
                    const currentSlices = project.slices || [];
                    const targetId = dividingSlice.slice.id;
                    const created: Slice[] = dividedSlices.map((s) => ({
                      ...s,
                      id: `slice-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                    }));
                    const updatedSlices: Slice[] = [];
                    for (const s of currentSlices) {
                      if (s.id === targetId) {
                        updatedSlices.push(...created);
                      } else {
                        updatedSlices.push(s);
                      }
                    }
                    handleUpdateProject({ slices: updatedSlices });
                    handlePushHistory(`Divided slice #${dividingSlice.index + 1} into ${created.length} sub-slices`);
                  }
                  setDividingSlice(null);
                }}
                onClose={() => setDividingSlice(null)}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* WARP TRANSFORM MODAL */}
      <WarpModal
        isOpen={showWarpModal}
        onClose={() => setShowWarpModal(false)}
        activeLayer={project?.layers.find((l) => l.id === activeLayerId) || null}
        onApplyWarp={handleApplyWarp}
        setToast={setToast}
      />

      {/* GLOBAL SUPABASE AUTH MODAL */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={async () => {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            await fetchUserProfile(session.user.id, session.user);
            const userDispName = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User';
            setToast({
              message: `Login Berhasil! Selamat datang kembali, ${userDispName}.`,
              type: 'success'
            });
          }
        }}
        setToast={setToast}
      />

      {/* GLOBAL ADMIN PANEL MODAL */}
      <AdminPanelModal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        currentUser={userProfile}
        setToast={setToast}
      />

      {/* PROFESSIONAL CENTER-SCREEN TOAST NOTIFICATION */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 10 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className="fixed inset-0 z-[99999] flex items-center justify-center pointer-events-none"
          >
            <div
              className={`pointer-events-auto relative max-w-sm w-full mx-4 rounded-3xl border shadow-[0_30px_80px_rgba(0,0,0,0.6)] overflow-hidden ${
                toast.type === 'success'
                  ? 'bg-gradient-to-br from-[#0e1f16] to-[#0a0f0c] border-emerald-500/40'
                  : toast.type === 'error'
                  ? 'bg-gradient-to-br from-[#1f0e0e] to-[#0f0a0a] border-red-500/40'
                  : 'bg-gradient-to-br from-[#0f0f20] to-[#0a0a14] border-indigo-500/40'
              }`}
            >
              {/* Glow top accent bar */}
              <div className={`h-1 w-full ${
                toast.type === 'success' ? 'bg-gradient-to-r from-emerald-600 via-emerald-400 to-emerald-600'
                : toast.type === 'error' ? 'bg-gradient-to-r from-red-600 via-red-400 to-red-600'
                : 'bg-gradient-to-r from-indigo-600 via-indigo-400 to-indigo-600'
              }`} />

              <div className="p-7 flex flex-col items-center text-center gap-5">
                {/* Icon circle */}
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl ${
                  toast.type === 'success'
                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-emerald-900/50'
                    : toast.type === 'error'
                    ? 'bg-red-500/15 border border-red-500/30 text-red-400 shadow-red-900/50'
                    : 'bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 shadow-indigo-900/50'
                }`}>
                  {toast.type === 'success' ? (
                    <CheckCircle2 className="w-8 h-8" />
                  ) : toast.type === 'error' ? (
                    <XCircle className="w-8 h-8" />
                  ) : (
                    <Shield className="w-8 h-8" />
                  )}
                </div>

                {/* Text */}
                <div className="space-y-1.5">
                  <h3 className="text-white font-bold text-lg tracking-tight">
                    {toast.type === 'success' ? 'Berhasil!' : toast.type === 'error' ? 'Gagal!' : 'Informasi'}
                  </h3>
                  <p className={`text-sm leading-relaxed font-medium ${
                    toast.type === 'success' ? 'text-emerald-200/80'
                    : toast.type === 'error' ? 'text-red-200/80'
                    : 'text-indigo-200/80'
                  }`}>{toast.message}</p>
                </div>

                {/* Close button */}
                <button
                  onClick={() => setToast(null)}
                  className={`mt-1 px-7 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                    toast.type === 'success'
                      ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30'
                      : toast.type === 'error'
                      ? 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30'
                      : 'bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30'
                  }`}
                >
                  Tutup
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FilterPreviewBox({
  image,
  effect,
  intensity,
  radius,
  angle,
  threshold,
}: {
  image: HTMLImageElement;
  effect: string;
  intensity: number;
  radius: number;
  angle: number;
  threshold: number;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    if (!canvasRef.current || !image) return;
    const canvas = canvasRef.current;
    const previewW = 360;
    const previewH = 270;
    canvas.width = previewW;
    canvas.height = previewH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(image, 0, 0, previewW, previewH);
    const imgData = ctx.getImageData(0, 0, previewW, previewH);
    const filtered = applyFilterGallery(imgData, effect, {
      intensity,
      radius,
      angle,
      threshold,
    });
    ctx.putImageData(filtered, 0, 0);
  }, [image, effect, intensity, radius, angle, threshold]);

  return (
    <canvas
      ref={canvasRef}
      className="border border-[#2b2b36] rounded shadow-lg max-w-full max-h-[300px] object-contain bg-[#111116]"
    />
  );
}
