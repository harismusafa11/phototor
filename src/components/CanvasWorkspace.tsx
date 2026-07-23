/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import type { AlignmentGuides } from '../types';
import {
  ZoomIn,
  ZoomOut,
  Maximize,
  Check,
  X,
  Type,
  Square,
  Zap,
  Activity,
  ChevronDown,
  Copy,
  Paintbrush,
  Eraser,
  Crop,
  Sliders,
  Download
} from 'lucide-react';
import { Project, Layer, ToolType, SubToolType, Point, Adjustments, ShapeType, GridSettings, Slice } from '../types';
import { renderProjectToCanvas } from '../utils/canvas';
import RulerBar from './RulerBar';
import { removeBackground as imglyRemoveBackground } from '@imgly/background-removal';
import { removeBackground as localRemoveBackground } from '../utils/filters';

function parseColorToRgba(colorStr: string): { r: number; g: number; b: number; a: number } {
  const div = document.createElement('div');
  div.style.color = colorStr;
  document.body.appendChild(div);
  const resolved = window.getComputedStyle(div).color;
  document.body.removeChild(div);
  const match = resolved.match(/\d+(\.\d+)?/g);
  if (match) {
    return {
      r: parseInt(match[0]),
      g: parseInt(match[1]),
      b: parseInt(match[2]),
      a: match[3] ? Math.round(parseFloat(match[3]) * 255) : 255,
    };
  }
  return { r: 255, g: 255, b: 255, a: 255 };
}

function runFloodFillAlgo(
  imgData: ImageData,
  startX: number,
  startY: number,
  fillColor: { r: number; g: number; b: number; a: number }
) {
  const { width, height, data } = imgData;
  const targetIdx = (startY * width + startX) * 4;
  const tr = data[targetIdx];
  const tg = data[targetIdx + 1];
  const tb = data[targetIdx + 2];
  const ta = data[targetIdx + 3];

  if (
    Math.abs(tr - fillColor.r) < 5 &&
    Math.abs(tg - fillColor.g) < 5 &&
    Math.abs(tb - fillColor.b) < 5 &&
    Math.abs(ta - fillColor.a) < 5
  ) {
    return;
  }

  // Pre-allocated Int32Array queue for ultra-fast flat index lookup
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;

  const startIdx = startY * width + startX;
  queue[tail++] = startIdx;

  const visited = new Uint8Array(width * height);
  visited[startIdx] = 1;

  const trTol = 25;

  while (head < tail) {
    const idx = queue[head++];
    const cx = idx % width;
    const cy = Math.floor(idx / width);

    const pixIdx = idx * 4;
    data[pixIdx] = fillColor.r;
    data[pixIdx + 1] = fillColor.g;
    data[pixIdx + 2] = fillColor.b;
    data[pixIdx + 3] = fillColor.a;

    // Check neighbors
    const dirs = [
      [cx + 1, cy],
      [cx - 1, cy],
      [cx, cy + 1],
      [cx, cy - 1],
    ];

    for (const [nx, ny] of dirs) {
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nidx = ny * width + nx;
        if (visited[nidx] === 0) {
          const npixIdx = nidx * 4;
          const match =
            Math.abs(data[npixIdx] - tr) < trTol &&
            Math.abs(data[npixIdx + 1] - tg) < trTol &&
            Math.abs(data[npixIdx + 2] - tb) < trTol &&
            Math.abs(data[npixIdx + 3] - ta) < trTol;

          if (match) {
            visited[nidx] = 1;
            queue[tail++] = nidx;
          }
        }
      }
    }
  }
}

interface CanvasWorkspaceProps {
  project: Project;
  activeLayerId: string | null;
  activeTool: ToolType;
  activeSubTool?: SubToolType;
  gridSettings?: GridSettings;
  adjustments: Adjustments;
  brushColor: string;
  brushSize: number;
  brushOpacity: number;
  onUpdateLayer: (id: string, updates: Partial<Layer>) => void;
  onAddLayer: (type: 'image' | 'text' | 'shape' | 'drawing', extra?: Partial<Layer>) => void;
  onPushHistory: (desc: string) => void;
  onCropCanvas: (width: number, height: number, offsetX: number, offsetY: number, straightenAngle?: number, deletePixels?: boolean, targetMode?: 'layer' | 'canvas') => void;
  cropTargetMode?: 'layer' | 'canvas';
  onChangeBrushColor?: (color: string) => void;
  onApplyLocalBrushFilter?: (toolType: 'blur-sharpen' | 'dodge-burn', isShift: boolean, strokePoints?: Point[], strokeSize?: number) => void;
  onApplyHealing?: (strokePoints?: Point[], strokeSize?: number, sourceOffset?: Point) => void;
  onSelectLayer?: (id: string | null) => void;
  onSelectTool?: (tool: ToolType, subTool?: SubToolType) => void;
  slices?: Slice[];
  onUpdateSlices?: (slices: Slice[]) => void;
  onOpenSliceOptions?: (slice: Slice) => void;
  onOpenDivideSlice?: (slice: Slice) => void;
  onPerspectiveCrop?: (points: Point[]) => void;
  onApplyPatch?: (selectionBox: { x: number; y: number; w: number; h: number }, offset: Point) => void;
  onMouseMoveCoords?: (pt: Point | null) => void;
  onContextMenuCoords?: (pt: Point | null, clientPt: Point | null) => void;

  shapeStrokeColor?: string;
  shapeStrokeWidth?: number;
  shapeCornerRadius?: number;
  gradientEndColor?: string;
  gradientType?: 'linear' | 'radial' | 'angle' | 'reflected' | 'diamond';
  gradientOpacity?: number;
  gradientBlendMode?: string;
  gradientReverse?: boolean;
  gradientStops?: { offset: number; color: string }[];
  backgroundColor?: string;
  brushHardness?: number;
  visibleChannel?: 'rgb' | 'r' | 'g' | 'b';
  onUpdateProject?: (updates: Partial<Project>) => void;
  alignmentGuides?: AlignmentGuides;
  selectionFeather?: number;
  cropRatio?: string;
  cropGridOverlay?: 'thirds' | 'golden';
  straightenAngle?: number;
  deleteCroppedPixels?: boolean;
  showRulers?: boolean;
  showGuides?: boolean;
  wandTolerance?: number;
  wandContiguous?: boolean;
  wandAntiAlias?: boolean;
  wandSampleAll?: boolean;
  wandSelectionMode?: 'new' | 'add' | 'subtract' | 'intersect';
  externalZoom?: number;
  onZoomChange?: (zoom: number) => void;
  setToast?: (toast: { message: string; type: 'success' | 'info' | 'error' } | null) => void;
  brushType?: string;
  isQuickMaskMode?: boolean;
}

export default function CanvasWorkspace({
  project,
  activeLayerId,
  activeTool,
  activeSubTool,
  adjustments,
  brushColor,
  brushSize,
  brushOpacity,
  onUpdateLayer,
  onAddLayer,
  onPushHistory,
  onCropCanvas,
  onChangeBrushColor,
  onApplyLocalBrushFilter,
  onApplyHealing,
  onSelectLayer,
  onSelectTool,
  slices = [],
  onUpdateSlices,
  onOpenSliceOptions,
  onOpenDivideSlice,
  onPerspectiveCrop,
  onApplyPatch,
  onMouseMoveCoords,
  onContextMenuCoords,
  shapeStrokeColor = '#ffffff',
  shapeStrokeWidth = 2,
  shapeCornerRadius = 0,
  gradientEndColor = '#000000',
  gradientType = 'linear' as const,
  gradientOpacity = 1,
  gradientBlendMode = 'normal',
  gradientReverse = false,
  gradientStops,
  backgroundColor = '#000000',
  brushHardness = 75,
  visibleChannel = 'rgb',
  onUpdateProject,
  gridSettings = { enabled: false, size: 50, color: '#6666ff', opacity: 0.15, snapEnabled: true, snapThreshold: 8 },
  alignmentGuides,
  selectionFeather = 0,
  cropRatio = 'free',
  cropGridOverlay = 'thirds',
  straightenAngle = 0,
  deleteCroppedPixels = true,
  showRulers = true,
  showGuides = true,
  wandTolerance = 32,
  wandContiguous = true,
  wandAntiAlias = true,
  wandSampleAll = false,
  wandSelectionMode = 'new',
  externalZoom,
  onZoomChange: onExternalZoomChange,
  setToast,
  brushType = 'Round',
  isQuickMaskMode = false,
  cropTargetMode = 'layer',
}: CanvasWorkspaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const customCursorRef = useRef<HTMLDivElement>(null);

  // Viewport parameters
  const [zoom, setZoomInternal] = useState(1.0);
  const setZoom = (v: number | ((prev: number) => number)) => {
    const next = typeof v === 'function' ? v(zoom) : v;
    setZoomInternal(next);
    onExternalZoomChange?.(next);
  };
  // Sync external zoom if provided
  React.useEffect(() => {
    if (externalZoom !== undefined && Math.abs(externalZoom - zoom) > 0.01) {
      setZoomInternal(externalZoom);
    }
  }, [externalZoom]);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef<Point>({ x: 0, y: 0 });

  // Transform / Drag layer state
  const [editingTextLayerId, setEditingTextLayerId] = useState<string | null>(null);
  const [isDraggingLayer, setIsDraggingLayer] = useState(false);
  const [alignmentLines, setAlignmentLines] = useState<{ type: 'h' | 'v'; position: number }[]>([]);
  const dragStartOffset = useRef<Point>({ x: 0, y: 0 });
  const [transformHandle, setTransformHandle] = useState<string | null>(null);
  const transformStart = useRef<{ x: number; y: number; w: number; h: number }>({ x: 0, y: 0, w: 0, h: 0 });
  const rotateStartAngle = useRef<number>(0);
  const rotateStartRotation = useRef<number>(0);
  const transformRafRef = useRef<number | null>(null);

  // Keyboard modifiers state
  const isShiftPressed = useRef(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const isSpacePressedRef = useRef(false);

  // Pen, Freeform, Hover states
  const [penPoints, setPenPoints] = useState<Point[]>([]);
  const [freeformPoints, setFreeformPoints] = useState<Point[]>([]);
  const [hoverMousePos, setHoverMousePos] = useState<Point | null>(null);
  const [aiStatus, setAiStatus] = useState<string | null>(null);

  const penPointsRef = useRef<Point[]>([]);
  const sampledBgColor = useRef<{ r: number; g: number; b: number; a: number } | null>(null);
  const lastEraserPos = useRef<Point | null>(null);
  const lastStrokePt = useRef<Point | null>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isNewStroke = useRef(false);
  const isDrawingRef = useRef(false);
  const bgEraserRafRef = useRef<number | null>(null);
  // Background eraser compositing snapshots
  // bgBaseSnapshotRef = canvas of all layers rendered BELOW the active layer
  // bgUpperSnapshotRef = canvas of all layers rendered ABOVE the active layer
  const bgBaseSnapshotRef = useRef<HTMLCanvasElement | null>(null);
  const bgUpperSnapshotRef = useRef<HTMLCanvasElement | null>(null);
  const bgActiveLayerInfoRef = useRef<{ x: number; y: number; width?: number; height?: number; opacity: number; blendMode: string } | null>(null);
  const [isRepositioningSelection, setIsRepositioningSelection] = useState(false);
  const selectionDragStart = useRef<Point>({ x: 0, y: 0 });
  useEffect(() => {
    penPointsRef.current = penPoints;
  }, [penPoints]);

  const handleFinalizePenPath = (isClosed: boolean, pointsToUse?: Point[]) => {
    const pts = pointsToUse || penPointsRef.current;
    if (pts.length < 2) {
      setPenPoints([]);
      return;
    }

    onAddLayer('drawing', {
      name: isClosed ? 'Closed Pen Vector' : 'Pen Vector Path',
      drawingPath: [
        {
          points: [...pts],
          color: shapeStrokeColor,
          size: shapeStrokeWidth,
          isEraser: false,
          isClosed: isClosed,
          fillColor: isClosed ? brushColor : 'transparent',
        }
      ],
      width: project.width,
      height: project.height,
      x: 0,
      y: 0,
    });

    onPushHistory(isClosed ? 'Closed & Filled Pen Path' : 'Completed Pen Path');
    setPenPoints([]);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') isShiftPressed.current = true;

      // Ctrl shortcuts
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '0') {
          e.preventDefault();
          setZoom(1.0);
          setPan({ x: 0, y: 0 });
        } else if (e.key === '1') {
          e.preventDefault();
          setZoom(1.0);
        } else if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          setZoom((z) => Math.min(8.0, z + 0.15));
        } else if (e.key === '-') {
          e.preventDefault();
          setZoom((z) => Math.max(0.1, z - 0.15));
        } else if (e.key.toLowerCase() === 'd') {
          e.preventDefault();
          setSelectionBox(null);
          setSelectionPath(null);
          setLassoPoints([]);
          onPushHistory('Deselected');
        } else if (e.key.toLowerCase() === 'a') {
          const activeTag = document.activeElement?.tagName;
          if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA') {
            e.preventDefault();
            setSelectionBox({ x: 0, y: 0, w: project.width, h: project.height });
            setSelectionPath(null);
            onPushHistory('Select All');
          }
        }
      }

      if (e.key === ' ' || e.code === 'Space') {
        const activeTag = document.activeElement?.tagName;
        if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA') {
          e.preventDefault();
          if (!isSpacePressedRef.current) {
            isSpacePressedRef.current = true;
            setIsSpacePressed(true);
          }
        }
      }

      if (activeSubTool === 'pen' && penPointsRef.current.length > 0) {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleFinalizePenPath(true);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setPenPoints([]);
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') isShiftPressed.current = false;
      if (e.key === ' ' || e.code === 'Space') {
        isSpacePressedRef.current = false;
        setIsSpacePressed(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('keyup', handleKeyUp, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('keyup', handleKeyUp, { capture: true });
    };
  }, [activeSubTool, brushColor, brushSize, project.width, project.height]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheelEvent = (e: WheelEvent) => {
      // If ctrl, alt or shift is held, or if Zoom subtool is active
      if (e.ctrlKey || e.altKey) {
        e.preventDefault();
        const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
        setZoom((z) => Math.max(0.1, Math.min(8, z * zoomFactor)));
      } else {
        // Horizontal scroll with Shift
        if (e.shiftKey) {
          e.preventDefault();
          setPan((p) => ({ ...p, x: Math.round(p.x - e.deltaY) }));
        } else {
          // Normal vertical or dual scrolling (touchpad trackpad supports deltaX + deltaY)
          e.preventDefault();
          setPan((p) => ({
            x: Math.round(p.x - e.deltaX),
            y: Math.round(p.y - e.deltaY),
          }));
        }
      }
    };

    container.addEventListener('wheel', handleWheelEvent, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheelEvent);
    };
  }, [activeSubTool]);

  // Drawing Brush / Stamp source parameters
  const [isDrawing, setIsDrawing] = useState(false);
  const [stampSource, setStampSource] = useState<Point | null>(null);
  const stampOffset = useRef<Point>({ x: 0, y: 0 });
  const currentPath = useRef<Point[]>([]);

  // Interactive Crop boundaries
  const [cropBox, setCropBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [isResizingCrop, setIsResizingCrop] = useState<string | null>(null);

  // Gradient vector anchors
  const [gradientStart, setGradientStart] = useState<Point | null>(null);
  const [gradientEnd, setGradientEnd] = useState<Point | null>(null);
  // Gradient: pre-drag snapshot canvas for live preview (avoids full renderProjectToCanvas each frame)
  const gradientSnapshotRef = useRef<HTMLCanvasElement | null>(null);
  const gradientRafRef = useRef<number | null>(null);
  const gradientShiftStart = useRef<Point | null>(null); // original start for shift-constrain
  const smudgeBufferRef = useRef<ImageData | null>(null); // carried smudge pixel buffer

  // Selection Box
  const [selectionBox, setSelectionBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const selectStart = useRef<Point>({ x: 0, y: 0 });

  // Patch Tool states
  const [isPatchDragging, setIsPatchDragging] = useState(false);
  const [patchOffset, setPatchOffset] = useState<Point | null>(null);
  const patchDragStart = useRef<Point>({ x: 0, y: 0 });

  // Lasso & polygonal lasso & quick select path states
  const [lassoPoints, setLassoPoints] = useState<Point[]>([]);
  const [selectionPath, setSelectionPath] = useState<Point[] | null>(null);
  const [eyedropperOldColor, setEyedropperOldColor] = useState('#ffffff');

  // Viewport global rotation state
  const [viewportRotation, setViewportRotation] = useState<number>(0);
  const viewportStartRotation = useRef<number>(0);
  const [isRotatingCanvas, setIsRotatingCanvas] = useState(false);

  // Interactive Shape drawing state
  const [isDrawingShape, setIsDrawingShape] = useState(false);
  const [tempShape, setTempShape] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // Layer rotation state
  const [isRotatingLayer, setIsRotatingLayer] = useState(false);
  const layerStartRotation = useRef<number>(0);

  // Perspective Crop states
  const [perspectivePoints, setPerspectivePoints] = useState<Point[] | null>(null);
  const [activePerspectivePointIndex, setActivePerspectivePointIndex] = useState<number | null>(null);

  // Slice states
  const [activeSliceId, setActiveSliceId] = useState<string | null>(null);
  const [isDrawingSlice, setIsDrawingSlice] = useState(false);
  const [isDraggingSlice, setIsDraggingSlice] = useState(false);
  const [resizingSliceHandle, setResizingSliceHandle] = useState<string | null>(null);
  const [tempSlice, setTempSlice] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const sliceStart = useRef<Point>({ x: 0, y: 0 });
  const sliceDragOffset = useRef<Point>({ x: 0, y: 0 });
  const sliceStartRect = useRef<{ x: number; y: number; w: number; h: number }>({ x: 0, y: 0, w: 0, h: 0 });

  const activeLayer = project.layers.find((l) => l.id === activeLayerId);

  // Core Render Trigger — skip when brush is actively painting to avoid overwriting live strokes
  useEffect(() => {
    if (canvasRef.current && !isDrawingRef.current) {
      renderProjectToCanvas(project, canvasRef.current, {
        activeLayerId: activeLayerId || undefined,
        editingTextLayerId: editingTextLayerId || undefined,
        adjustments: adjustments,
        isExport: false,
        zoom: zoom,
        visibleChannel: visibleChannel,
      });

    }
  }, [project, activeLayerId, editingTextLayerId, adjustments, zoom, visibleChannel, gridSettings]);

  // Hide custom cursor immediately when active tool changes
  useEffect(() => {
    if (customCursorRef.current) {
      customCursorRef.current.style.display = 'none';
    }
  }, [activeTool, activeSubTool]);

  // Set up Crop Box or Perspective default state when crop tool is activated
  useEffect(() => {
    if (activeTool === 'crop') {
      if (activeSubTool === 'crop') {
        const activeLayer = project.layers.find((l) => l.id === activeLayerId);
        if (cropTargetMode === 'layer' && activeLayer) {
          setCropBox({
            x: Math.round(activeLayer.x),
            y: Math.round(activeLayer.y),
            w: Math.round(activeLayer.width),
            h: Math.round(activeLayer.height),
          });
        } else {
          setCropBox({ x: 20, y: 20, w: project.width - 40, h: project.height - 40 });
        }
        setPerspectivePoints(null);
      } else if (activeSubTool === 'perspective-crop') {
        const margin = 40;
        setPerspectivePoints([
          { x: margin, y: margin }, // top-left
          { x: project.width - margin, y: margin }, // top-right
          { x: project.width - margin, y: project.height - margin }, // bottom-right
          { x: margin, y: project.height - margin }, // bottom-left
        ]);
        setCropBox(null);
      } else {
        setCropBox(null);
        setPerspectivePoints(null);
      }
    } else {
      setCropBox(null);
      setPerspectivePoints(null);
    }
  }, [activeTool, activeSubTool, activeLayerId, cropTargetMode, project.width, project.height]);

  // Handle zooming defaults
  const handleZoomIn = () => setZoom((z) => Math.min(4.0, z + 0.15));
  const handleZoomOut = () => setZoom((z) => Math.max(0.2, z - 0.15));
  const handleResetZoom = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  // Sobel edge detection helper — returns edge strength 0-255 at given pixel
  const getEdgeStrength = (data: Uint8ClampedArray, x: number, y: number, w: number, h: number): number => {
    const get = (px: number, py: number) => {
      px = Math.max(0, Math.min(w - 1, px));
      py = Math.max(0, Math.min(h - 1, py));
      const i = (py * w + px) * 4;
      return (data[i] + data[i + 1] + data[i + 2]) / 3;
    };
    const gx = -get(x - 1, y - 1) + get(x + 1, y - 1) - 2 * get(x - 1, y) + 2 * get(x + 1, y) - get(x - 1, y + 1) + get(x + 1, y + 1);
    const gy = -get(x - 1, y - 1) - 2 * get(x, y - 1) - get(x + 1, y - 1) + get(x - 1, y + 1) + 2 * get(x, y + 1) + get(x + 1, y + 1);
    return Math.min(255, Math.sqrt(gx * gx + gy * gy));
  };

  // Magnetic Lasso snap: finds nearest high-edge pixel within search radius
  const snapToEdge = (pos: Point): Point => {
    if (!canvasRef.current) return pos;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return pos;
    try {
      const radius = 12;
      const x0 = Math.max(0, Math.floor(pos.x) - radius);
      const y0 = Math.max(0, Math.floor(pos.y) - radius);
      const x1 = Math.min(project.width - 1, Math.floor(pos.x) + radius);
      const y1 = Math.min(project.height - 1, Math.floor(pos.y) + radius);
      if (x1 <= x0 || y1 <= y0) return pos;

      const patch = ctx.getImageData(x0, y0, x1 - x0 + 1, y1 - y0 + 1);
      const pw = x1 - x0 + 1;
      const ph = y1 - y0 + 1;

      let bestStrength = 0;
      let bestPt = pos;

      for (let dy = 0; dy < ph; dy++) {
        for (let dx = 0; dx < pw; dx++) {
          const strength = getEdgeStrength(patch.data, dx, dy, pw, ph);
          if (strength > bestStrength) {
            bestStrength = strength;
            bestPt = { x: x0 + dx, y: y0 + dy };
          }
        }
      }
      return bestStrength > 20 ? bestPt : pos;
    } catch {
      return pos;
    }
  };

  // ---------------------------------------------------------------------------
  // Douglas-Peucker polyline simplification
  // Removes redundant collinear points while preserving shape accuracy
  // ---------------------------------------------------------------------------
  const perpendicularDist = (p: Point, a: Point, b: Point): number => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (dx === 0 && dy === 0) return Math.hypot(p.x - a.x, p.y - a.y);
    const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy);
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
  };

  const douglasPeucker = (pts: Point[], epsilon: number, depth = 0): Point[] => {
    if (pts.length <= 2 || depth > 60) return pts;
    let maxDist = 0, maxIdx = 0;
    const start = pts[0], end = pts[pts.length - 1];
    for (let i = 1; i < pts.length - 1; i++) {
      const d = perpendicularDist(pts[i], start, end);
      if (d > maxDist) { maxDist = d; maxIdx = i; }
    }
    if (maxDist > epsilon) {
      const left  = douglasPeucker(pts.slice(0, maxIdx + 1), epsilon, depth + 1);
      const right = douglasPeucker(pts.slice(maxIdx), epsilon, depth + 1);
      return [...left.slice(0, -1), ...right];
    }
    return [start, end];
  };

  // ---------------------------------------------------------------------------
  // maskToPolygon — Moore Neighbor Contour Tracing
  // Accurately traces the outer boundary of a binary pixel mask.
  // Works for any shape: concave, with holes, irregular edges.
  // Used by: Magic Wand, Quick Selection, AI Select, Magnetic Lasso
  // ---------------------------------------------------------------------------
  const maskToPolygon = (
    mask: Uint8Array,
    imgW: number,
    imgH: number,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number
  ): Point[] => {
    // Find topmost-leftmost set pixel in bounding box (guaranteed start)
    let startX = -1, startY = -1;
    outer:
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (mask[y * imgW + x]) { startX = x; startY = y; break outer; }
      }
    }
    if (startX === -1) return [];

    // 8-connected Moore neighbor directions (clockwise: E, SE, S, SW, W, NW, N, NE)
    const DDX = [ 1,  1,  0, -1, -1, -1,  0,  1];
    const DDY = [ 0,  1,  1,  1,  0, -1, -1, -1];

    const contour: Point[] = [];
    let cx = startX, cy = startY;
    // We entered startX,startY from above (N), so backtrack dir is N=6 → start searching from 7 (NE)
    let prevDir = 6;
    const maxSteps = Math.max(4000, (maxX - minX + maxY - minY + 2) * 8);
    let steps = 0;

    do {
      contour.push({ x: cx, y: cy });

      // Search clockwise from the backtrack direction for next boundary pixel
      let moved = false;
      for (let i = 0; i < 8; i++) {
        const nd = (prevDir + i) % 8;
        const nx = cx + DDX[nd];
        const ny = cy + DDY[nd];
        if (nx >= minX && nx <= maxX && ny >= minY && ny <= maxY && mask[ny * imgW + nx]) {
          prevDir = (nd + 4) % 8; // Opposite direction = backtrack into next pixel
          cx = nx; cy = ny;
          moved = true;
          break;
        }
      }
      if (!moved) break;
      steps++;
    } while ((cx !== startX || cy !== startY) && steps < maxSteps);

    if (contour.length < 3) return contour;

    // Douglas-Peucker: epsilon=1.2 gives smooth but accurate outline
    const simplified = douglasPeucker(contour, 1.2);
    return simplified;
  };

  // ---------------------------------------------------------------------------
  // Core flood-fill used by Magic Wand
  // Returns a Uint8Array mask (1 = selected) over the full canvas
  // ---------------------------------------------------------------------------
  const floodFillMask = (
    data: Uint8ClampedArray,
    imgW: number,
    imgH: number,
    startX: number,
    startY: number,
    targetR: number,
    targetG: number,
    targetB: number,
    targetA: number,
    tol: number,
    contiguous: boolean
  ): { mask: Uint8Array; minX: number; minY: number; maxX: number; maxY: number } => {
    const mask = new Uint8Array(imgW * imgH);
    let minX = startX, maxX = startX, minY = startY, maxY = startY;

    const colorMatch = (idx: number): boolean => {
      const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = data[idx + 3];
      // Euclidean distance in RGBA space (alpha weighted 0.5 like Photoshop)
      return Math.sqrt(
        (r - targetR) ** 2 +
        (g - targetG) ** 2 +
        (b - targetB) ** 2 +
        ((a - targetA) * 0.5) ** 2
      ) <= tol;
    };

    if (contiguous) {
      // BFS / scanline flood fill (4-connected)
      const visited = new Uint8Array(imgW * imgH);
      const queue: number[] = [startY * imgW + startX];
      visited[queue[0]] = 1;
      let head = 0;

      while (head < queue.length) {
        const pidx = queue[head++];
        const px = pidx % imgW;
        const py = Math.floor(pidx / imgW);
        const offset = pidx * 4;

        if (!colorMatch(offset)) continue;

        mask[pidx] = 1;
        if (px < minX) minX = px; if (px > maxX) maxX = px;
        if (py < minY) minY = py; if (py > maxY) maxY = py;

        const neighbors = [
          px > 0       ? pidx - 1       : -1,
          px < imgW-1  ? pidx + 1       : -1,
          py > 0       ? pidx - imgW    : -1,
          py < imgH-1  ? pidx + imgW    : -1,
        ];
        for (const nIdx of neighbors) {
          if (nIdx >= 0 && !visited[nIdx]) {
            visited[nIdx] = 1;
            queue.push(nIdx);
          }
        }
      }
    } else {
      // Non-contiguous: select every matching pixel in entire image
      for (let i = 0; i < imgW * imgH; i++) {
        if (colorMatch(i * 4)) {
          mask[i] = 1;
          const px = i % imgW;
          const py = Math.floor(i / imgW);
          if (px < minX) minX = px; if (px > maxX) maxX = px;
          if (py < minY) minY = py; if (py > maxY) maxY = py;
        }
      }
    }

    return { mask, minX, minY, maxX, maxY };
  };

  // ---------------------------------------------------------------------------
  // Anti-alias helper: dilate selection mask 1px using Gaussian-like softening
  // ---------------------------------------------------------------------------
  const antiAliasMask = (mask: Uint8Array, imgW: number, imgH: number): Uint8Array => {
    const out = new Uint8Array(mask);
    for (let y = 1; y < imgH - 1; y++) {
      for (let x = 1; x < imgW - 1; x++) {
        const i = y * imgW + x;
        if (!mask[i]) {
          // If surrounded by selected pixels on 2+ sides, include
          const n = (mask[i-1]?1:0)+(mask[i+1]?1:0)+(mask[i-imgW]?1:0)+(mask[i+imgW]?1:0);
          if (n >= 2) out[i] = 1;
        }
      }
    }
    return out;
  };

  // ---------------------------------------------------------------------------
  // Combine two masks according to selection mode
  // ---------------------------------------------------------------------------
  const combineMasks = (
    existing: Uint8Array | null,
    incoming: Uint8Array,
    mode: 'new' | 'add' | 'subtract' | 'intersect',
    size: number
  ): Uint8Array => {
    if (mode === 'new' || !existing) return incoming;
    const out = new Uint8Array(size);
    for (let i = 0; i < size; i++) {
      if (mode === 'add')       out[i] = existing[i] || incoming[i] ? 1 : 0;
      else if (mode === 'subtract')  out[i] = existing[i] && !incoming[i] ? 1 : 0;
      else if (mode === 'intersect') out[i] = existing[i] && incoming[i]  ? 1 : 0;
    }
    return out;
  };

  // Store previous selection mask for Add/Subtract/Intersect
  const prevSelectionMask = useRef<Uint8Array | null>(null);

  // ---------------------------------------------------------------------------
  // executeMagicWand — Photoshop-accurate implementation
  // ---------------------------------------------------------------------------
  const executeMagicWand = (pos: Point, shiftKey = false, altKey = false) => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Keyboard modifiers override toolbar selection mode (Photoshop behaviour)
    const effectiveMode: 'new' | 'add' | 'subtract' | 'intersect' =
      shiftKey && altKey ? 'intersect'
      : shiftKey         ? 'add'
      : altKey           ? 'subtract'
      : wandSelectionMode;

    try {
      const W = project.width;
      const H = project.height;
      const clickX = Math.max(0, Math.min(W - 1, Math.floor(pos.x)));
      const clickY = Math.max(0, Math.min(H - 1, Math.floor(pos.y)));

      // Sample colour at click point from rendered canvas
      const imgData = ctx.getImageData(0, 0, W, H);
      const data = imgData.data;
      const ci = (clickY * W + clickX) * 4;
      const [tR, tG, tB, tA] = [data[ci], data[ci+1], data[ci+2], data[ci+3]];

      // Flood fill
      let { mask, minX, minY, maxX, maxY } = floodFillMask(
        data, W, H, clickX, clickY, tR, tG, tB, tA,
        wandTolerance, wandContiguous
      );

      // Anti-alias
      if (wandAntiAlias) mask = antiAliasMask(mask, W, H);

      // Combine with existing selection using effective mode
      const combined = combineMasks(
        prevSelectionMask.current,
        mask,
        effectiveMode,
        W * H
      );
      prevSelectionMask.current = combined;

      // Recalculate bounding box after combination
      let bMinX = W, bMinY = H, bMaxX = 0, bMaxY = 0;
      for (let i = 0; i < W * H; i++) {
        if (combined[i]) {
          const px = i % W, py = Math.floor(i / W);
          if (px < bMinX) bMinX = px; if (px > bMaxX) bMaxX = px;
          if (py < bMinY) bMinY = py; if (py > bMaxY) bMaxY = py;
        }
      }

      if (bMaxX < bMinX) {
        // Empty selection after subtract/intersect
        setSelectionBox(null);
        setSelectionPath(null);
        return;
      }

      const selW = bMaxX - bMinX + 1;
      const selH = bMaxY - bMinY + 1;

      // Build outline polygon
      const polygon = maskToPolygon(combined, W, H, bMinX, bMinY, bMaxX, bMaxY);

      setSelectionBox({ x: bMinX, y: bMinY, w: selW, h: selH });
      setSelectionPath(polygon.length >= 3 ? polygon : null);
      onPushHistory(
        `Magic Wand: ${effectiveMode === 'new' ? 'Select' : effectiveMode} (tol ${wandTolerance}, ${wandContiguous ? 'contiguous' : 'global'})`
      );
    } catch (e) {
      console.warn('Magic wand error:', e);
    }
  };

  const eraseBgColorAtPos = (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    brushSize: number,
    targetColor: { r: number; g: number; b: number; a: number },
    tolerance = 50,
    hardness = 0.85
  ) => {
    const r = Math.max(1, brushSize / 2);
    // Expand region slightly beyond radius to avoid aliased edge clipping
    const pad = Math.ceil(r) + 1;
    const startX = Math.max(0, Math.floor(cx - pad));
    const startY = Math.max(0, Math.floor(cy - pad));
    const endX = Math.min(ctx.canvas.width, Math.ceil(cx + pad));
    const endY = Math.min(ctx.canvas.height, Math.ceil(cy + pad));
    const w = endX - startX;
    const h = endY - startY;
    if (w <= 0 || h <= 0) return;

    const imgData = ctx.getImageData(startX, startY, w, h);
    const data = imgData.data;

    // Soft feathering zone: inner=hard circle, outer=soft fade
    const hardRadius = r * hardness;
    const softRadius = r;

    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const absX = startX + px;
        const absY = startY + py;
        const dist = Math.sqrt((absX - cx) ** 2 + (absY - cy) ** 2);
        if (dist > softRadius) continue;

        const idx = (py * w + px) * 4;
        const pixelA = data[idx + 3];
        if (pixelA === 0) continue;

        const pixelR = data[idx];
        const pixelG = data[idx + 1];
        const pixelB = data[idx + 2];

        // Color distance from sampled background color
        const colorDiff = Math.sqrt(
          (pixelR - targetColor.r) ** 2 +
          (pixelG - targetColor.g) ** 2 +
          (pixelB - targetColor.b) ** 2
        );

        // How strongly this pixel matches the target (0=no match, 1=perfect)
        // Smooth falloff at tolerance boundary
        const matchStrength = Math.max(0, 1 - colorDiff / (tolerance + 1));
        if (matchStrength <= 0) continue;

        // Soft edge falloff based on distance from brush center
        let edgeAlpha = 1.0;
        if (dist > hardRadius) {
          // Smooth cosine transition in the feather zone
          const t = (dist - hardRadius) / Math.max(0.001, softRadius - hardRadius);
          edgeAlpha = 0.5 * (1 + Math.cos(Math.PI * t)); // cosine easing
        }

        // Combined erase amount
        const eraseAmount = matchStrength * edgeAlpha;

        // Apply alpha reduction (don't just snap to 0 — smooth fade)
        data[idx + 3] = Math.max(0, Math.round(pixelA * (1 - eraseAmount)));
      }
    }
    ctx.putImageData(imgData, startX, startY);
  };

  /** Real-time 60 FPS Local Box Blur on offscreen canvas */
  const applyLocalBlurAtPos = (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    brushSize: number,
    strength = 0.5,
    hardness = 0.75
  ) => {
    const r = Math.max(2, brushSize / 2);
    const pad = Math.ceil(r) + 2;
    const startX = Math.max(0, Math.floor(cx - pad));
    const startY = Math.max(0, Math.floor(cy - pad));
    const endX = Math.min(ctx.canvas.width, Math.ceil(cx + pad));
    const endY = Math.min(ctx.canvas.height, Math.ceil(cy + pad));
    const w = endX - startX;
    const h = endY - startY;
    if (w <= 0 || h <= 0) return;

    const imgData = ctx.getImageData(startX, startY, w, h);
    const data = imgData.data;
    const origData = new Uint8ClampedArray(data);

    const hardRadius = r * hardness;
    const softRadius = r;
    const bRad = 2; // 5x5 blur window

    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const absX = startX + px;
        const absY = startY + py;
        const dist = Math.sqrt((absX - cx) ** 2 + (absY - cy) ** 2);
        if (dist > softRadius) continue;

        const idx = (py * w + px) * 4;
        if (origData[idx + 3] === 0) continue;

        let rSum = 0, gSum = 0, bSum = 0, count = 0;
        for (let dy = -bRad; dy <= bRad; dy++) {
          for (let dx = -bRad; dx <= bRad; dx++) {
            const npx = px + dx;
            const npy = py + dy;
            if (npx >= 0 && npx < w && npy >= 0 && npy < h) {
              const nIdx = (npy * w + npx) * 4;
              rSum += origData[nIdx];
              gSum += origData[nIdx + 1];
              bSum += origData[nIdx + 2];
              count++;
            }
          }
        }

        let edgeAlpha = 1.0;
        if (dist > hardRadius) {
          const t = (dist - hardRadius) / Math.max(0.001, softRadius - hardRadius);
          edgeAlpha = 0.5 * (1 + Math.cos(Math.PI * t));
        }
        const blend = Math.max(0, Math.min(1, strength * edgeAlpha));

        const avgR = rSum / count;
        const avgG = gSum / count;
        const avgB = bSum / count;

        data[idx] = Math.round(origData[idx] * (1 - blend) + avgR * blend);
        data[idx + 1] = Math.round(origData[idx + 1] * (1 - blend) + avgG * blend);
        data[idx + 2] = Math.round(origData[idx + 2] * (1 - blend) + avgB * blend);
      }
    }
    ctx.putImageData(imgData, startX, startY);
  };

  /** Real-time 60 FPS Local Sharpen (Unsharp Mask) on offscreen canvas */
  const applyLocalSharpenAtPos = (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    brushSize: number,
    strength = 0.5,
    hardness = 0.75
  ) => {
    const r = Math.max(2, brushSize / 2);
    const pad = Math.ceil(r) + 2;
    const startX = Math.max(0, Math.floor(cx - pad));
    const startY = Math.max(0, Math.floor(cy - pad));
    const endX = Math.min(ctx.canvas.width, Math.ceil(cx + pad));
    const endY = Math.min(ctx.canvas.height, Math.ceil(cy + pad));
    const w = endX - startX;
    const h = endY - startY;
    if (w <= 0 || h <= 0) return;

    const imgData = ctx.getImageData(startX, startY, w, h);
    const data = imgData.data;
    const origData = new Uint8ClampedArray(data);

    const hardRadius = r * hardness;
    const softRadius = r;
    const sRad = 1;

    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const absX = startX + px;
        const absY = startY + py;
        const dist = Math.sqrt((absX - cx) ** 2 + (absY - cy) ** 2);
        if (dist > softRadius) continue;

        const idx = (py * w + px) * 4;
        if (origData[idx + 3] === 0) continue;

        let rSum = 0, gSum = 0, bSum = 0, count = 0;
        for (let dy = -sRad; dy <= sRad; dy++) {
          for (let dx = -sRad; dx <= sRad; dx++) {
            const npx = Math.max(0, Math.min(w - 1, px + dx));
            const npy = Math.max(0, Math.min(h - 1, py + dy));
            const nIdx = (npy * w + npx) * 4;
            rSum += origData[nIdx];
            gSum += origData[nIdx + 1];
            bSum += origData[nIdx + 2];
            count++;
          }
        }

        let edgeAlpha = 1.0;
        if (dist > hardRadius) {
          const t = (dist - hardRadius) / Math.max(0.001, softRadius - hardRadius);
          edgeAlpha = 0.5 * (1 + Math.cos(Math.PI * t));
        }
        const mult = strength * edgeAlpha * 1.5;

        const avgR = rSum / count;
        const avgG = gSum / count;
        const avgB = bSum / count;

        const origR = origData[idx];
        const origG = origData[idx + 1];
        const origB = origData[idx + 2];

        data[idx] = Math.max(0, Math.min(255, Math.round(origR + (origR - avgR) * mult)));
        data[idx + 1] = Math.max(0, Math.min(255, Math.round(origG + (origG - avgG) * mult)));
        data[idx + 2] = Math.max(0, Math.min(255, Math.round(origB + (origB - avgB) * mult)));
      }
    }
    ctx.putImageData(imgData, startX, startY);
  };

  /** Real-time 60 FPS Photoshop Smudge Tool (Smearing pixels along cursor motion) */
  const applyLocalSmudgeAtPos = (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    brushSize: number,
    strength = 0.5,
    hardness = 0.75
  ) => {
    const r = Math.max(2, brushSize / 2);
    const pad = Math.ceil(r) + 1;
    const startX = Math.max(0, Math.floor(cx - pad));
    const startY = Math.max(0, Math.floor(cy - pad));
    const endX = Math.min(ctx.canvas.width, Math.ceil(cx + pad));
    const endY = Math.min(ctx.canvas.height, Math.ceil(cy + pad));
    const w = endX - startX;
    const h = endY - startY;
    if (w <= 0 || h <= 0) return;

    const targetData = ctx.getImageData(startX, startY, w, h);
    const tData = targetData.data;

    if (!smudgeBufferRef.current || smudgeBufferRef.current.width !== w || smudgeBufferRef.current.height !== h) {
      smudgeBufferRef.current = ctx.createImageData(w, h);
      smudgeBufferRef.current.data.set(tData);
    }

    const sData = smudgeBufferRef.current.data;
    const hardRadius = r * hardness;
    const softRadius = r;

    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const absX = startX + px;
        const absY = startY + py;
        const dist = Math.sqrt((absX - cx) ** 2 + (absY - cy) ** 2);
        if (dist > softRadius) continue;

        const idx = (py * w + px) * 4;
        if (tData[idx + 3] === 0 && sData[idx + 3] === 0) continue;

        let edgeAlpha = 1.0;
        if (dist > hardRadius) {
          const t = (dist - hardRadius) / Math.max(0.001, softRadius - hardRadius);
          edgeAlpha = 0.5 * (1 + Math.cos(Math.PI * t));
        }

        const blend = Math.max(0, Math.min(1, strength * edgeAlpha));

        const sR = sData[idx];
        const sG = sData[idx + 1];
        const sB = sData[idx + 2];

        const tR = tData[idx];
        const tG = tData[idx + 1];
        const tB = tData[idx + 2];

        const newR = Math.round(tR * (1 - blend) + sR * blend);
        const newG = Math.round(tG * (1 - blend) + sG * blend);
        const newB = Math.round(tB * (1 - blend) + sB * blend);

        tData[idx] = newR;
        tData[idx + 1] = newG;
        tData[idx + 2] = newB;

        sData[idx] = newR;
        sData[idx + 1] = newG;
        sData[idx + 2] = newB;
      }
    }

    ctx.putImageData(targetData, startX, startY);
  };

  /** Real-time 60 FPS Dodge Tool */
  const applyLocalDodgeAtPos = (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    brushSize: number,
    strength = 0.5,
    hardness = 0.75
  ) => {
    const r = Math.max(2, brushSize / 2);
    const pad = Math.ceil(r) + 1;
    const startX = Math.max(0, Math.floor(cx - pad));
    const startY = Math.max(0, Math.floor(cy - pad));
    const endX = Math.min(ctx.canvas.width, Math.ceil(cx + pad));
    const endY = Math.min(ctx.canvas.height, Math.ceil(cy + pad));
    const w = endX - startX;
    const h = endY - startY;
    if (w <= 0 || h <= 0) return;

    const imgData = ctx.getImageData(startX, startY, w, h);
    const data = imgData.data;
    const hardRadius = r * hardness;
    const softRadius = r;

    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const absX = startX + px;
        const absY = startY + py;
        const dist = Math.sqrt((absX - cx) ** 2 + (absY - cy) ** 2);
        if (dist > softRadius) continue;

        const idx = (py * w + px) * 4;
        if (data[idx + 3] === 0) continue;

        let edgeAlpha = 1.0;
        if (dist > hardRadius) {
          const t = (dist - hardRadius) / Math.max(0.001, softRadius - hardRadius);
          edgeAlpha = 0.5 * (1 + Math.cos(Math.PI * t));
        }

        const factor = 1.0 + 0.15 * strength * edgeAlpha;
        data[idx] = Math.min(255, Math.round(data[idx] * factor));
        data[idx + 1] = Math.min(255, Math.round(data[idx + 1] * factor));
        data[idx + 2] = Math.min(255, Math.round(data[idx + 2] * factor));
      }
    }
    ctx.putImageData(imgData, startX, startY);
  };

  /** Real-time 60 FPS Burn Tool */
  const applyLocalBurnAtPos = (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    brushSize: number,
    strength = 0.5,
    hardness = 0.75
  ) => {
    const r = Math.max(2, brushSize / 2);
    const pad = Math.ceil(r) + 1;
    const startX = Math.max(0, Math.floor(cx - pad));
    const startY = Math.max(0, Math.floor(cy - pad));
    const endX = Math.min(ctx.canvas.width, Math.ceil(cx + pad));
    const endY = Math.min(ctx.canvas.height, Math.ceil(cy + pad));
    const w = endX - startX;
    const h = endY - startY;
    if (w <= 0 || h <= 0) return;

    const imgData = ctx.getImageData(startX, startY, w, h);
    const data = imgData.data;
    const hardRadius = r * hardness;
    const softRadius = r;

    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const absX = startX + px;
        const absY = startY + py;
        const dist = Math.sqrt((absX - cx) ** 2 + (absY - cy) ** 2);
        if (dist > softRadius) continue;

        const idx = (py * w + px) * 4;
        if (data[idx + 3] === 0) continue;

        let edgeAlpha = 1.0;
        if (dist > hardRadius) {
          const t = (dist - hardRadius) / Math.max(0.001, softRadius - hardRadius);
          edgeAlpha = 0.5 * (1 + Math.cos(Math.PI * t));
        }

        const factor = 1.0 - 0.15 * strength * edgeAlpha;
        data[idx] = Math.max(0, Math.round(data[idx] * factor));
        data[idx + 1] = Math.max(0, Math.round(data[idx + 1] * factor));
        data[idx + 2] = Math.max(0, Math.round(data[idx + 2] * factor));
      }
    }
    ctx.putImageData(imgData, startX, startY);
  };

  // Direct compositing render for background eraser — zero encoding, hardware-accelerated blit
  // Uses pre-built base/upper snapshots + draws the erased offscreen layer between them
  const renderBgEraserDirect = () => {
    if (bgEraserRafRef.current !== null) return; // already a frame queued
    bgEraserRafRef.current = requestAnimationFrame(() => {
      bgEraserRafRef.current = null;
      const displayCanvas = canvasRef.current;
      const offscreen = drawingCanvasRef.current;
      const layerInfo = bgActiveLayerInfoRef.current;
      if (!displayCanvas || !offscreen || !layerInfo) return;
      const dCtx = displayCanvas.getContext('2d');
      if (!dCtx) return;

      // 1. Start with base (layers below active)
      dCtx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
      if (bgBaseSnapshotRef.current) {
        dCtx.drawImage(bgBaseSnapshotRef.current, 0, 0);
      }

      // 2. Composite the erased active layer with its proper opacity and blend mode
      dCtx.save();
      dCtx.globalAlpha = layerInfo.opacity;
      dCtx.globalCompositeOperation = (layerInfo.blendMode === 'normal' ? 'source-over' : layerInfo.blendMode) as GlobalCompositeOperation;
      dCtx.drawImage(offscreen, layerInfo.x, layerInfo.y);
      dCtx.restore();

      // 3. Composite layers above active
      if (bgUpperSnapshotRef.current) {
        dCtx.save();
        dCtx.globalCompositeOperation = 'source-over';
        dCtx.drawImage(bgUpperSnapshotRef.current, 0, 0);
        dCtx.restore();
      }
    });
  };

  // ---------------------------------------------------------------------------
  // GRADIENT TOOL HELPERS
  // ---------------------------------------------------------------------------

  /** Build effective gradient color stops from props */
  const getGradientStops = (): { offset: number; color: string }[] => {
    let stops: { offset: number; color: string }[] = [];
    if (gradientStops && gradientStops.length >= 2) {
      stops = gradientStops;
    } else {
      stops = [
        { offset: 0, color: brushColor },
        { offset: 1, color: backgroundColor || gradientEndColor || '#000000' },
      ];
    }
    if (gradientReverse) {
      const reversedColors = [...stops].reverse();
      return stops.map((s, i) => ({
        offset: s.offset,
        color: reversedColors[i].color,
      }));
    }
    return stops;
  };

  /** Snap angle to nearest 45° increment (Shift key behavior) */
  const constrainGradientAngle = (start: Point, end: Point): Point => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    const snapped = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
    return {
      x: start.x + len * Math.cos(snapped),
      y: start.y + len * Math.sin(snapped),
    };
  };

  /**
   * Paint a gradient onto a 2D context.
   * 100% GPU hardware-accelerated (60 FPS smooth, 0ms lag).
   * Supports: linear, radial, angle (conical), reflected, diamond
   */
  const applyGradientToCtx = (
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    x1: number, y1: number,
    x2: number, y2: number,
    stops: { offset: number; color: string }[],
    type: 'linear' | 'radial' | 'angle' | 'reflected' | 'diamond',
    opacity: number,
    blendMode: string
  ) => {
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.globalCompositeOperation = (blendMode === 'normal' ? 'source-over' : blendMode) as GlobalCompositeOperation;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.5) {
      ctx.restore();
      return;
    }

    if (type === 'linear') {
      const grad = ctx.createLinearGradient(x1, y1, x2, y2);
      stops.forEach(s => grad.addColorStop(Math.max(0, Math.min(1, s.offset)), s.color));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

    } else if (type === 'radial') {
      const grad = ctx.createRadialGradient(x1, y1, 0, x1, y1, Math.max(1, len));
      stops.forEach(s => grad.addColorStop(Math.max(0, Math.min(1, s.offset)), s.color));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

    } else if (type === 'reflected') {
      // Mirrored single linear gradient from (x1 - dx, y1 - dy) to (x2, y2)
      const rx = x1 - dx;
      const ry = y1 - dy;
      const grad = ctx.createLinearGradient(rx, ry, x2, y2);
      stops.forEach(s => {
        grad.addColorStop(Math.max(0, Math.min(1, 0.5 - s.offset * 0.5)), s.color);
        grad.addColorStop(Math.max(0, Math.min(1, 0.5 + s.offset * 0.5)), s.color);
      });
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

    } else if (type === 'angle') {
      const angleRad = Math.atan2(dy, dx);
      if ('createConicGradient' in ctx) {
        // Native GPU-accelerated conic gradient
        const grad = (ctx as any).createConicGradient(angleRad, x1, y1);
        stops.forEach(s => grad.addColorStop(Math.max(0, Math.min(1, s.offset)), s.color));
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
      } else {
        // Radial fallback if conic gradient not supported
        const fallbackCtx = ctx as CanvasRenderingContext2D;
        const grad = fallbackCtx.createRadialGradient(x1, y1, 0, x1, y1, Math.max(1, len));
        stops.forEach(s => grad.addColorStop(Math.max(0, Math.min(1, s.offset)), s.color));
        fallbackCtx.fillStyle = grad;
        fallbackCtx.fillRect(0, 0, W, H);
      }

    } else if (type === 'diamond') {
      const angleRad = Math.atan2(dy, dx);
      // GPU-accelerated diamond texture render
      const dCanvas = document.createElement('canvas');
      dCanvas.width = 128;
      dCanvas.height = 128;
      const dCtx = dCanvas.getContext('2d');
      if (dCtx) {
        const grad = dCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
        stops.forEach(s => grad.addColorStop(Math.max(0, Math.min(1, s.offset)), s.color));
        dCtx.fillStyle = grad;
        dCtx.beginPath();
        dCtx.moveTo(64, 0); dCtx.lineTo(128, 64); dCtx.lineTo(64, 128); dCtx.lineTo(0, 64);
        dCtx.closePath();
        dCtx.fill();
      }
      ctx.save();
      ctx.translate(x1, y1);
      ctx.rotate(angleRad);
      const size = Math.max(1, len);
      ctx.drawImage(dCanvas, -size, -size, size * 2, size * 2);
      ctx.restore();
    }

    ctx.restore();
  };

  /**
   * Render gradient live preview on the main display canvas during drag.
   * Uses the pre-captured snapshot to avoid cumulative gradient stacking.
   */
  const renderGradientPreview = (x1: number, y1: number, x2: number, y2: number) => {
    if (gradientRafRef.current !== null) return;
    gradientRafRef.current = requestAnimationFrame(() => {
      gradientRafRef.current = null;
      const displayCanvas = canvasRef.current;
      const snapshot = gradientSnapshotRef.current;
      if (!displayCanvas || !snapshot) return;
      const ctx = displayCanvas.getContext('2d');
      if (!ctx) return;

      const W = displayCanvas.width;
      const H = displayCanvas.height;
      const stops = getGradientStops();
      const dx = x2 - x1;
      const dy = y2 - y1;
      if (Math.sqrt(dx * dx + dy * dy) < 2) return;

      // 1. Restore snapshot (base state before gradient)
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(snapshot, 0, 0);

      // 2. Paint gradient preview on top, clipped to selection box or active image layer bounds
      ctx.save();
      if (selectionBox) {
        ctx.beginPath();
        ctx.rect(selectionBox.x, selectionBox.y, selectionBox.w, selectionBox.h);
        ctx.clip();
      } else if (activeLayer && activeLayer.type === 'image' && !activeLayer.locked) {
        ctx.beginPath();
        ctx.rect(activeLayer.x, activeLayer.y, activeLayer.width, activeLayer.height);
        ctx.clip();
      }
      applyGradientToCtx(ctx, W, H, x1, y1, x2, y2, stops, gradientType, gradientOpacity, gradientBlendMode);
      ctx.restore();
    });
  };

  const runMagicEraserAlgo = (imgData: ImageData, clickX: number, clickY: number) => {
    const { width, height, data } = imgData;
    const clickedIndex = (clickY * width + clickX) * 4;
    const targetR = data[clickedIndex];
    const targetG = data[clickedIndex + 1];
    const targetB = data[clickedIndex + 2];
    const targetA = data[clickedIndex + 3];

    const tolerance = targetA < 30 ? 15 : 45;
    const visited = new Uint8Array(width * height);
    const queue: number[] = [clickY * width + clickX];
    visited[clickY * width + clickX] = 1;
    let head = 0;

    while (head < queue.length) {
      const idx = queue[head++];
      const x = idx % width;
      const y = Math.floor(idx / width);

      data[idx * 4 + 3] = 0; // Erase completely

      for (const d of [-1, 1, -width, width]) {
        const nIdx = idx + d;
        if (nIdx < 0 || nIdx >= width * height || visited[nIdx]) continue;
        const nx = nIdx % width;
        const ny = Math.floor(nIdx / width);
        if (d === -1 && x === 0) continue;
        if (d === 1 && x === width - 1) continue;

        const offset = nIdx * 4;
        const r = data[offset];
        const g = data[offset + 1];
        const b = data[offset + 2];
        const a = data[offset + 3];

        const diff = Math.sqrt(
          (r - targetR) ** 2 +
          (g - targetG) ** 2 +
          (b - targetB) ** 2 +
          ((a - targetA) * 0.5) ** 2
        );

        if (diff <= tolerance) {
          visited[nIdx] = 1;
          queue.push(nIdx);
        }
      }
    }
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

  const getCompositeCanvasBlob = async (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (!canvasRef.current) return reject(new Error("No canvas ref available"));
      canvasRef.current.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to export composite canvas blob"));
      }, 'image/png');
    });
  };

  const executeAISelect = async (pos: Point) => {
    if (!canvasRef.current) return;
    
    setAiStatus("AI: Initializing neural network...");
    setToast?.({ message: "AI Object Selection: Running neural network subject detection...", type: 'info' });

    let imageBlob: Blob | null = null;
    let offsetX = 0;
    let offsetY = 0;
    let targetW = project.width;
    let targetH = project.height;

    const activeLayer = project.layers.find(l => l.id === activeLayerId);

    try {
      // Use active layer if it's an image layer, otherwise use composite canvas
      if (activeLayer && activeLayer.type === 'image') {
        imageBlob = await getLayerBlob(activeLayer);
        offsetX = activeLayer.x;
        offsetY = activeLayer.y;
        targetW = activeLayer.width;
        targetH = activeLayer.height;
      } else {
        imageBlob = await getCompositeCanvasBlob();
        offsetX = 0;
        offsetY = 0;
        targetW = project.width;
        targetH = project.height;
      }

      setAiStatus("AI: Running subject segmentation...");

      // Run local AI model
      const responseBlob = await imglyRemoveBackground(imageBlob, {
        progress: (key, current, total) => {
          const percentage = Math.round((current / total) * 100) || 0;
          const filename = key.split('/').pop() || 'model';
          setAiStatus(`AI: Loading ${filename} (${percentage}%)...`);
          if (setToast) {
            setToast({
              message: `AI Selection: Downloading ${filename} (${percentage}%)...`,
              type: 'info'
            });
          }
        }
      });
      
      setAiStatus("AI: Extracting object boundary...");
      const transparentUrl = URL.createObjectURL(responseBlob);

      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load AI selection mask image"));
        img.src = transparentUrl;
      });

      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = targetW;
      maskCanvas.height = targetH;
      const mCtx = maskCanvas.getContext('2d');
      if (!mCtx) throw new Error("Could not create 2D context for AI Selection");

      mCtx.drawImage(img, 0, 0, targetW, targetH);
      let imgData = mCtx.getImageData(0, 0, targetW, targetH);

      // Check transparency of the result
      let transparentCount = 0;
      const totalPixels = targetW * targetH;
      for (let i = 3; i < imgData.data.length; i += 4) {
        if (imgData.data[i] <= 20) {
          transparentCount++;
        }
      }
      
      const transparencyPercentage = (transparentCount / totalPixels) * 100;
      
      // If the AI output has almost no transparency, it means it returned a solid image (failed to segment)
      if (transparencyPercentage < 1.5) {
        console.warn("AI returned solid image. Applying local keyer fallback...");
        setAiStatus("AI: Applying local keyer...");
        imgData = localRemoveBackground(imgData, 25);
        mCtx.putImageData(imgData, 0, 0);
      }

      // Scan pixels
      let minX = targetW, maxX = 0, minY = targetH, maxY = 0;
      const visited = new Uint8Array(targetW * targetH);
      // Ignore a 3-pixel outer border to avoid edge bleeding/canvas padding issues
      const borderMargin = 3;
      for (let y = borderMargin; y < targetH - borderMargin; y++) {
        for (let x = borderMargin; x < targetW - borderMargin; x++) {
          const alpha = imgData.data[(y * targetW + x) * 4 + 3];
          if (alpha > 20) {
            visited[y * targetW + x] = 1;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      URL.revokeObjectURL(transparentUrl);

      const absMinX = offsetX + minX;
      const absMinY = offsetY + minY;
      const selW = maxX - minX;
      const selH = maxY - minY;

      if (selW > 0 && selH > 0) {
        const polygon = maskToPolygon(visited, targetW, targetH, minX, minY, maxX, maxY).map(p => ({
          x: p.x + offsetX,
          y: p.y + offsetY,
        }));
        setSelectionBox({ x: absMinX, y: absMinY, w: selW + 1, h: selH + 1 });
        if (polygon.length >= 3) {
          setSelectionPath(polygon);
        } else {
          setSelectionPath(null);
        }
        onPushHistory('AI Object Selection — Subject Outline');
        setToast?.({ message: "Object selected successfully!", type: 'success' });
        setAiStatus(null);
      } else {
        setToast?.({ message: "No distinct object detected.", type: 'info' });
        setAiStatus("AI: No object detected");
        setTimeout(() => setAiStatus(null), 3000);
      }
    } catch (err: any) {
      console.error("AI Object Selection failed, running local chromakey fallback:", err);
      const errMsg = err?.message || String(err);
      setAiStatus(`AI Fallback: Processing local selection...`);
      setToast?.({ message: `AI failed: ${errMsg}. Using local keyer selection.`, type: 'info' });
      
      try {
        // Fallback: run local chromakey directly on the original layer/composite image
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = targetW;
        tempCanvas.height = targetH;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx && activeLayer && activeLayer.imageElement) {
          tempCtx.drawImage(activeLayer.imageElement, 0, 0, targetW, targetH);
          let imgData = tempCtx.getImageData(0, 0, targetW, targetH);
          imgData = localRemoveBackground(imgData, 25);
          
          let minX = targetW, maxX = 0, minY = targetH, maxY = 0;
          const visited = new Uint8Array(targetW * targetH);
          const borderMargin = 3;
          for (let y = borderMargin; y < targetH - borderMargin; y++) {
            for (let x = borderMargin; x < targetW - borderMargin; x++) {
              const alpha = imgData.data[(y * targetW + x) * 4 + 3];
              if (alpha > 20) {
                visited[y * targetW + x] = 1;
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
              }
            }
          }
          
          const absMinX = offsetX + minX;
          const absMinY = offsetY + minY;
          const selW = maxX - minX;
          const selH = maxY - minY;
          
          if (selW > 0 && selH > 0) {
            const polygon = maskToPolygon(visited, targetW, targetH, minX, minY, maxX, maxY).map(p => ({
              x: p.x + offsetX,
              y: p.y + offsetY,
            }));
            setSelectionBox({ x: absMinX, y: absMinY, w: selW + 1, h: selH + 1 });
            if (polygon.length >= 3) {
              setSelectionPath(polygon);
            } else {
              setSelectionPath(null);
            }
            onPushHistory('AI Fallback Object Selection — Local Mask');
            setToast?.({ message: "Object selected successfully (local fallback)!", type: 'success' });
            setAiStatus(null);
            return;
          }
        }
      } catch (fallbackErr) {
        console.error("Local selection fallback failed:", fallbackErr);
      }
      
      // Final fallback to rectangle if everything fails
      if (activeLayer) {
        setSelectionBox({
          x: activeLayer.x,
          y: activeLayer.y,
          w: activeLayer.width,
          h: activeLayer.height
        });
        setSelectionPath(null);
        onPushHistory('AI Selection Fallback');
        setAiStatus(null);
      }
    }
  };

  // Converts workspace/mouse coordinates to relative Canvas coordinates
  const getCanvasCoords = (e: React.MouseEvent<HTMLDivElement>): Point => {
    if (!canvasRef.current || !containerRef.current) return { x: 0, y: 0 };

    // Get bounding rect of the parent container which is untransformed
    const containerRect = containerRef.current.getBoundingClientRect();

    // Calculate center of the container
    const cx = containerRect.left + containerRect.width / 2;
    const cy = containerRect.top + containerRect.height / 2;

    // Calculate mouse position relative to container center
    const mx = e.clientX - cx;
    const my = e.clientY - cy;

    // Apply inverse translation: subtract pan offset
    const x1 = mx - pan.x;
    const y1 = my - pan.y;

    // Apply inverse scale: divide by zoom
    const x2 = x1 / zoom;
    const y2 = y1 / zoom;

    // Apply inverse rotation: rotate by -viewportRotation degrees
    const rad = (-viewportRotation * Math.PI) / 180;
    const cosVal = Math.cos(rad);
    const sinVal = Math.sin(rad);
    const x3 = x2 * cosVal - y2 * sinVal;
    const y3 = x2 * sinVal + y2 * cosVal;

    // Convert relative coordinates back to canvas-local coordinates (origin at top-left of canvas)
    const canvasX = x3 + project.width / 2;
    const canvasY = y3 + project.height / 2;

    return { x: Math.round(canvasX), y: Math.round(canvasY) };
  };

  const handleHandleMouseDown = (e: React.MouseEvent<HTMLDivElement>, handle: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (!activeLayer || activeLayer.locked) return;

    setTransformHandle(handle);
    const mousePos = getCanvasCoords(e);
    dragStartOffset.current = mousePos;

    transformStart.current = {
      x: activeLayer.x,
      y: activeLayer.y,
      w: activeLayer.width,
      h: activeLayer.height,
    };

    if (handle === 'rotate') {
      const centerX = activeLayer.x + activeLayer.width / 2;
      const centerY = activeLayer.y + activeLayer.height / 2;
      rotateStartAngle.current = Math.atan2(mousePos.y - centerY, mousePos.x - centerX) * (180 / Math.PI);
      rotateStartRotation.current = activeLayer.rotation || 0;
    }
  };

  const handleFinalizePolySelection = (pointsToUse?: Point[]) => {
    const pts = pointsToUse || lassoPoints;
    if (pts.length < 3) {
      setLassoPoints([]);
      return;
    }
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const w = maxX - minX;
    const h = maxY - minY;

    setSelectionBox({
      x: Math.round(minX),
      y: Math.round(minY),
      w: Math.round(Math.max(1, w)),
      h: Math.round(Math.max(1, h)),
    });
    setSelectionPath([...pts]);
    onPushHistory(`Polygonal Lasso Selected Area (${Math.round(w)}x${Math.round(h)}px)`);
    setLassoPoints([]);
  };

  const handleFinalizeLassoSelection = (pts: Point[]) => {
    if (pts.length < 3) {
      setLassoPoints([]);
      return;
    }
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const w = maxX - minX;
    const h = maxY - minY;

    setSelectionBox({
      x: Math.round(minX),
      y: Math.round(minY),
      w: Math.round(Math.max(1, w)),
      h: Math.round(Math.max(1, h)),
    });
    setSelectionPath([...pts]);
    onPushHistory(`Lasso Selected Area (${Math.round(w)}x${Math.round(h)}px)`);
    setLassoPoints([]);
  };

  const handleQuickSelectionMove = (pos: Point) => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Quick Select: grow selection using magic-wand logic at each brush position
    try {
      const imgData = ctx.getImageData(0, 0, project.width, project.height);
      const data = imgData.data;
      const r = Math.round(brushSize / 2);

      // Sample center pixel color at current brush position
      const cx = Math.max(0, Math.min(project.width - 1, Math.floor(pos.x)));
      const cy = Math.max(0, Math.min(project.height - 1, Math.floor(pos.y)));
      const si = (cy * project.width + cx) * 4;
      const sR = data[si], sG = data[si + 1], sB = data[si + 2];

      const tolerance = 30;
      const visited = new Uint8Array(project.width * project.height);
      const queue: number[] = [cy * project.width + cx];
      visited[cy * project.width + cx] = 1;
      let head = 0;
      let minX = cx, maxX = cx, minY = cy, maxY = cy;

      while (head < queue.length && head < 80000) {
        const idx = queue[head++];
        const x = idx % project.width;
        const y = Math.floor(idx / project.width);
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;

        for (const d of [-1, 1, -project.width, project.width]) {
          const nIdx = idx + d;
          if (nIdx < 0 || nIdx >= project.width * project.height || visited[nIdx]) continue;
          const nx = nIdx % project.width;
          const ny = Math.floor(nIdx / project.width);
          if (d === -1 && x === 0) continue;
          if (d === 1 && x === project.width - 1) continue;
          // Distance from brush center check
          const dist = Math.sqrt((nx - cx) ** 2 + (ny - cy) ** 2);
          if (dist > r * 2.5) continue;
          const offset = nIdx * 4;
          const diff = Math.sqrt((data[offset] - sR) ** 2 + (data[offset + 1] - sG) ** 2 + (data[offset + 2] - sB) ** 2);
          if (diff <= tolerance) {
            visited[nIdx] = 1;
            queue.push(nIdx);
          }
        }
      }

      // Merge with existing lasso points bounding box
      setLassoPoints((prev) => {
        const allPts = [...prev, pos];
        const allXs = allPts.map(p => p.x);
        const allYs = allPts.map(p => p.y);
        const pMinX = Math.max(0, Math.min(...allXs) - r, minX);
        const pMaxX = Math.min(project.width, Math.max(...allXs) + r, maxX);
        const pMinY = Math.max(0, Math.min(...allYs) - r, minY);
        const pMaxY = Math.min(project.height, Math.max(...allYs) + r, maxY);
        setSelectionBox({
          x: Math.round(pMinX),
          y: Math.round(pMinY),
          w: Math.round(Math.max(1, pMaxX - pMinX)),
          h: Math.round(Math.max(1, pMaxY - pMinY)),
        });
        return allPts;
      });
    } catch {
      setLassoPoints((prev) => {
        const updated = [...prev, pos];
        const xs = updated.map((p) => p.x);
        const ys = updated.map((p) => p.y);
        const r2 = Math.round(brushSize / 2);
        const minX2 = Math.max(0, Math.min(...xs) - r2);
        const maxX2 = Math.min(project.width, Math.max(...xs) + r2);
        const minY2 = Math.max(0, Math.min(...ys) - r2);
        const maxY2 = Math.min(project.height, Math.max(...ys) + r2);
        setSelectionBox({
          x: Math.round(minX2), y: Math.round(minY2),
          w: Math.round(Math.max(1, maxX2 - minX2)),
          h: Math.round(Math.max(1, maxY2 - minY2)),
        });
        return updated;
      });
    }
  };

  const handleClearSelection = () => {
    setSelectionBox(null);
    setSelectionPath(null);
    setLassoPoints([]);
    prevSelectionMask.current = null;
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const mousePos = getCanvasCoords(e);
    if (!mousePos) return;

    // Search layers from top to bottom
    const layers = [...project.layers].reverse();
    const clickedTextLayer = layers.find(layer => {
      if (layer.type !== 'text' || !layer.visible || layer.locked) return false;
      const left = layer.x;
      const right = layer.x + layer.width;
      const top = layer.y;
      const bottom = layer.y + layer.height;
      return mousePos.x >= left && mousePos.x <= right && mousePos.y >= top && mousePos.y <= bottom;
    });

    if (clickedTextLayer) {
      setEditingTextLayerId(clickedTextLayer.id);
      if (onSelectLayer) onSelectLayer(clickedTextLayer.id);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (editingTextLayerId) return;
    // Check if middle click or Space pressed to trigger panning OR Hand tool active
    // NOTE: Shift+click is reserved for selection extension on wand/lasso/rect tools
    const isSelectionTool = activeSubTool.startsWith('select-');
    if (e.button === 1 || (e.shiftKey && !isSelectionTool) || isSpacePressed || activeSubTool === 'hand') {
      setIsPanning(true);
      panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      return;
    }

    const mousePos = getCanvasCoords(e);

    // Zoom subtool support (Zoom In & Zoom Out with Alt key toggle)
    if (activeSubTool === 'zoom' || activeSubTool === 'zoom-in' || activeSubTool === 'zoom-out') {
      const isZoomOut = activeSubTool === 'zoom-out' || e.altKey;
      const zoomFactor = isZoomOut ? 0.75 : 1.33;
      setZoom((z) => Math.max(0.1, Math.min(6, z * zoomFactor)));
      return;
    }

    // Canvas/Layer rotation tool support
    if (activeSubTool === 'rotate-canvas') {
      setIsRotatingCanvas(true);
      dragStartOffset.current = mousePos;
      viewportStartRotation.current = viewportRotation;
      return;
    }

    // 1. CROP TOOL INTERACTION (MULTI-HANDLE & DRAG TO MOVE)
    if (activeTool === 'crop' && activeSubTool === 'crop' && cropBox) {
      // Use tolerance scaled to Zoom for precision
      const hitTolerance = Math.max(12, 16 / zoom);
      const cx = mousePos.x;
      const cy = mousePos.y;
      const x = cropBox.x;
      const y = cropBox.y;
      const w = cropBox.w;
      const h = cropBox.h;

      // 4 corners
      if (Math.abs(cx - x) < hitTolerance && Math.abs(cy - y) < hitTolerance) {
        setIsResizingCrop('nw');
        dragStartOffset.current = mousePos;
        transformStart.current = { x, y, w, h };
        return;
      }
      if (Math.abs(cx - (x + w)) < hitTolerance && Math.abs(cy - y) < hitTolerance) {
        setIsResizingCrop('ne');
        dragStartOffset.current = mousePos;
        transformStart.current = { x, y, w, h };
        return;
      }
      if (Math.abs(cx - x) < hitTolerance && Math.abs(cy - (y + h)) < hitTolerance) {
        setIsResizingCrop('sw');
        dragStartOffset.current = mousePos;
        transformStart.current = { x, y, w, h };
        return;
      }
      if (Math.abs(cx - (x + w)) < hitTolerance && Math.abs(cy - (y + h)) < hitTolerance) {
        setIsResizingCrop('se');
        dragStartOffset.current = mousePos;
        transformStart.current = { x, y, w, h };
        return;
      }

      // 4 sides
      if (Math.abs(cy - y) < hitTolerance && cx >= x && cx <= x + w) {
        setIsResizingCrop('n');
        dragStartOffset.current = mousePos;
        transformStart.current = { x, y, w, h };
        return;
      }
      if (Math.abs(cy - (y + h)) < hitTolerance && cx >= x && cx <= x + w) {
        setIsResizingCrop('s');
        dragStartOffset.current = mousePos;
        transformStart.current = { x, y, w, h };
        return;
      }
      if (Math.abs(cx - x) < hitTolerance && cy >= y && cy <= y + h) {
        setIsResizingCrop('w');
        dragStartOffset.current = mousePos;
        transformStart.current = { x, y, w, h };
        return;
      }
      if (Math.abs(cx - (x + w)) < hitTolerance && cy >= y && cy <= y + h) {
        setIsResizingCrop('e');
        dragStartOffset.current = mousePos;
        transformStart.current = { x, y, w, h };
        return;
      }

      // Drag/move the interior of the crop box
      if (cx >= x && cx <= x + w && cy >= y && cy <= y + h) {
        setIsResizingCrop('move');
        dragStartOffset.current = mousePos;
        transformStart.current = { x, y, w, h };
        return;
      }
      return;
    }

    // PERSPECTIVE CROP INTERACTION
    if (activeTool === 'crop' && activeSubTool === 'perspective-crop' && perspectivePoints) {
      const hitTolerance = Math.max(12, 18 / zoom);
      const cx = mousePos.x;
      const cy = mousePos.y;

      for (let i = 0; i < perspectivePoints.length; i++) {
        const pt = perspectivePoints[i];
        const dist = Math.sqrt(Math.pow(cx - pt.x, 2) + Math.pow(cy - pt.y, 2));
        if (dist < hitTolerance) {
          setActivePerspectivePointIndex(i);
          dragStartOffset.current = mousePos;
          return;
        }
      }
      return;
    }

    // SLICE & SLICE SELECT TOOL INTERACTION
    if (activeTool === 'crop' && (activeSubTool === 'slice' || activeSubTool === 'slice-select')) {
      const cx = mousePos.x;
      const cy = mousePos.y;

      // 1. Check control handle hit on active selected slice
      if (activeSliceId && slices) {
        const selSlice = slices.find((s) => s.id === activeSliceId);
        if (selSlice) {
          const handles = [
            { id: 'nw', x: selSlice.x, y: selSlice.y },
            { id: 'ne', x: selSlice.x + selSlice.w, y: selSlice.y },
            { id: 'sw', x: selSlice.x, y: selSlice.y + selSlice.h },
            { id: 'se', x: selSlice.x + selSlice.w, y: selSlice.y + selSlice.h },
            { id: 'n', x: selSlice.x + selSlice.w / 2, y: selSlice.y },
            { id: 's', x: selSlice.x + selSlice.w / 2, y: selSlice.y + selSlice.h },
            { id: 'w', x: selSlice.x, y: selSlice.y + selSlice.h / 2 },
            { id: 'e', x: selSlice.x + selSlice.w, y: selSlice.y + selSlice.h / 2 },
          ];

          const hitHandle = handles.find(
            (h) => Math.abs(cx - h.x) <= 8 && Math.abs(cy - h.y) <= 8
          );

          if (hitHandle) {
            setResizingSliceHandle(hitHandle.id);
            sliceStartRect.current = { x: selSlice.x, y: selSlice.y, w: selSlice.w, h: selSlice.h };
            sliceStart.current = mousePos;
            return;
          }
        }
      }

      // 2. Check if clicked inside any existing slice to select and drag move
      const clickedSlice = [...slices].reverse().find(
        (s) => cx >= s.x && cx <= s.x + s.w && cy >= s.y && cy <= s.y + s.h
      );

      if (clickedSlice) {
        setActiveSliceId(clickedSlice.id);
        setIsDraggingSlice(true);
        sliceDragOffset.current = { x: cx - clickedSlice.x, y: cy - clickedSlice.y };
        return;
      }

      // 3. Start drawing a new slice if using Slice Tool
      if (activeSubTool === 'slice') {
        setIsDrawingSlice(true);
        setActiveSliceId(null);
        sliceStart.current = mousePos;
        setTempSlice({ x: mousePos.x, y: mousePos.y, w: 0, h: 0 });
        return;
      }
    }

    // 1.5 SHAPE TOOL INTERACTION
    if (activeTool === 'shape') {
      if (activeSubTool === 'pen') {
        const clickPoint = { x: mousePos.x, y: mousePos.y };
        if (penPoints.length > 2) {
          const distToFirst = Math.sqrt(
            Math.pow(clickPoint.x - penPoints[0].x, 2) + Math.pow(clickPoint.y - penPoints[0].y, 2)
          );
          if (distToFirst < 12) {
            handleFinalizePenPath(true, [...penPoints]);
            return;
          }
        }
        setPenPoints((prev) => [...prev, clickPoint]);
        return;
      }

      if (activeSubTool === 'freeform-pen') {
        setIsDrawing(true);
        setFreeformPoints([{ x: mousePos.x, y: mousePos.y }]);
        return;
      }

      setIsDrawingShape(true);
      selectStart.current = mousePos;
      setTempShape({ x: mousePos.x, y: mousePos.y, w: 0, h: 0 });
      return;
    }

    // 1.7 TEXT TOOL CANVAS INTERACTION (Adds/Edits text where clicked!)
    if (activeTool === 'text') {
      const layers = [...project.layers].reverse();
      const clickedTextLayer = layers.find(layer => {
        if (layer.type !== 'text' || !layer.visible || layer.locked) return false;
        const left = layer.x;
        const right = layer.x + layer.width;
        const top = layer.y;
        const bottom = layer.y + layer.height;
        return mousePos.x >= left && mousePos.x <= right && mousePos.y >= top && mousePos.y <= bottom;
      });

      if (clickedTextLayer) {
        setEditingTextLayerId(clickedTextLayer.id);
        if (onSelectLayer) onSelectLayer(clickedTextLayer.id);
        return;
      }

      onAddLayer('text', {
        name: 'New Text Layer',
        x: mousePos.x,
        y: mousePos.y,
        width: Math.max(200, project.width - mousePos.x),
        height: 80,
        text: 'Type text here...',
        fontSize: 32,
        fontFamily: 'Inter',
        fontWeight: 'normal',
        fontStyle: 'normal',
        textAlign: 'left',
        textColor: brushColor,
      });
      onPushHistory('Created Text Layer via Click');
      return;
    }

    // 1.8 PAINT BUCKET DIRECT INTERACTION
    if (activeSubTool === 'paint-bucket') {
      if (selectionBox) {
        handleSelectionFill();
      } else if (activeLayer && activeLayer.type === 'image' && activeLayer.imageElement) {
        const localX = mousePos.x - activeLayer.x;
        const localY = mousePos.y - activeLayer.y;
        if (localX >= 0 && localX < activeLayer.width && localY >= 0 && localY < activeLayer.height) {
          const canvas = document.createElement('canvas');
          canvas.width = activeLayer.width;
          canvas.height = activeLayer.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(activeLayer.imageElement, 0, 0, activeLayer.width, activeLayer.height);
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const fillCol = parseColorToRgba(brushColor);
            runFloodFillAlgo(imgData, Math.floor(localX), Math.floor(localY), fillCol);
            ctx.putImageData(imgData, 0, 0);

            const updatedImg = new Image();
            updatedImg.onload = () => {
              onUpdateLayer(activeLayer.id, {
                imageElement: updatedImg,
                imageUrl: canvas.toDataURL(),
              });
              onPushHistory('Applied Paint Bucket Flood Fill');
            };
            updatedImg.src = canvas.toDataURL();
          }
        }
      } else {
        onAddLayer('shape', {
          name: 'Paint Bucket Fill',
          shapeType: 'rectangle',
          fillColor: brushColor,
          strokeColor: 'transparent',
          width: project.width,
          height: project.height,
          x: 0,
          y: 0,
        });
        onPushHistory('Filled Canvas with Paint Bucket');
      }
      return;
    }

    // PATCH TOOL INTERACTION
    if (activeSubTool === 'patch-tool') {
      const isInsideSelection = selectionBox &&
        mousePos.x >= selectionBox.x &&
        mousePos.x <= selectionBox.x + selectionBox.w &&
        mousePos.y >= selectionBox.y &&
        mousePos.y <= selectionBox.y + selectionBox.h;

      if (isInsideSelection && selectionBox) {
        setIsPatchDragging(true);
        patchDragStart.current = mousePos;
        setPatchOffset({ x: 0, y: 0 });
      } else {
        setIsSelecting(true);
        setSelectionPath(null);
        setLassoPoints([mousePos]);
        setSelectionBox({ x: mousePos.x, y: mousePos.y, w: 0, h: 0 });
        setPatchOffset(null);
      }
      return;
    }

    // 2. SELECTION TOOL INTERACTION
    const isMarqueeTool = activeTool === 'select-rect' ||
      activeSubTool === 'select-rect' ||
      activeSubTool === 'select-ellipse' ||
      activeSubTool === 'select-row' ||
      activeSubTool === 'select-column';

    if (isMarqueeTool && selectionBox && selectionBox.w > 2 && selectionBox.h > 2) {
      const clickInside = mousePos.x >= selectionBox.x &&
        mousePos.x <= selectionBox.x + selectionBox.w &&
        mousePos.y >= selectionBox.y &&
        mousePos.y <= selectionBox.y + selectionBox.h;
      if (clickInside) {
        setIsRepositioningSelection(true);
        selectionDragStart.current = {
          x: mousePos.x - selectionBox.x,
          y: mousePos.y - selectionBox.y,
        };
        return;
      }
    }

    if (activeSubTool === 'select-lasso' || activeSubTool === 'select-magnetic') {
      setIsSelecting(true);
      setSelectionPath(null);
      const startPt = activeSubTool === 'select-magnetic' ? snapToEdge(mousePos) : mousePos;
      setLassoPoints([startPt]);
      setSelectionBox({ x: startPt.x, y: startPt.y, w: 0, h: 0 });
      return;
    }

    if (activeSubTool === 'select-poly') {
      setSelectionPath(null);
      if (lassoPoints.length === 0) {
        setLassoPoints([mousePos]);
      } else {
        const firstPt = lassoPoints[0];
        const dist = Math.sqrt(
          Math.pow(mousePos.x - firstPt.x, 2) + Math.pow(mousePos.y - firstPt.y, 2)
        );
        if (dist < 12) {
          handleFinalizePolySelection();
        } else {
          setLassoPoints((prev) => [...prev, mousePos]);
        }
      }
      return;
    }

    if (activeSubTool === 'select-quick') {
      setIsSelecting(true);
      setSelectionPath(null);
      setLassoPoints([mousePos]);
      setSelectionBox({ x: mousePos.x, y: mousePos.y, w: 1, h: 1 });
      return;
    }

    if (activeSubTool === 'select-row') {
      const clickY = Math.floor(mousePos.y);
      setSelectionPath(null);
      setSelectionBox({
        x: 0,
        y: Math.max(0, Math.min(project.height - 1, clickY)),
        w: project.width,
        h: 1
      });
      onPushHistory('Single Row Selection');
      return;
    }

    if (activeSubTool === 'select-column') {
      const clickX = Math.floor(mousePos.x);
      setSelectionPath(null);
      setSelectionBox({
        x: Math.max(0, Math.min(project.width - 1, clickX)),
        y: 0,
        w: 1,
        h: project.height
      });
      onPushHistory('Single Column Selection');
      return;
    }

    if (
      activeTool === 'select-rect' ||
      activeSubTool === 'select-rect' ||
      activeSubTool === 'select-ellipse'
    ) {
      setIsSelecting(true);
      setSelectionPath(null);
      selectStart.current = mousePos;
      setSelectionBox({ x: mousePos.x, y: mousePos.y, w: 0, h: 0 });
      return;
    }

    if (activeSubTool === 'select-wand') {
      executeMagicWand(mousePos, e.shiftKey, e.altKey);
      return;
    }

    if (activeSubTool === 'select-ai') {
      executeAISelect(mousePos);
      return;
    }

    // 3. GRADIENT TOOL ANCHOR SET
    if (activeTool === 'gradient') {
      // Capture snapshot of current canvas state before any gradient is applied
      const displayCanvas = canvasRef.current;
      if (displayCanvas) {
        const snap = document.createElement('canvas');
        snap.width = displayCanvas.width;
        snap.height = displayCanvas.height;
        const snapCtx = snap.getContext('2d');
        if (snapCtx) snapCtx.drawImage(displayCanvas, 0, 0);
        gradientSnapshotRef.current = snap;
      }
      gradientShiftStart.current = mousePos;
      setGradientStart(mousePos);
      setGradientEnd(mousePos);
      isDrawingRef.current = true; // Block React render loop from overwriting live preview
      return;
    }

    // Magic Eraser Tool (Direct contig erase)
    if (activeSubTool === 'magic-eraser') {
      if (activeLayer && activeLayer.type === 'image' && activeLayer.imageElement && !activeLayer.locked) {
        const localX = mousePos.x - activeLayer.x;
        const localY = mousePos.y - activeLayer.y;
        if (localX >= 0 && localX < activeLayer.width && localY >= 0 && localY < activeLayer.height) {
          const canvas = document.createElement('canvas');
          canvas.width = activeLayer.width;
          canvas.height = activeLayer.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(activeLayer.imageElement, 0, 0, activeLayer.width, activeLayer.height);
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            runMagicEraserAlgo(imgData, Math.floor(localX), Math.floor(localY));
            ctx.putImageData(imgData, 0, 0);

            const updatedImg = new Image();
            updatedImg.onload = () => {
              onUpdateLayer(activeLayer.id, {
                imageElement: updatedImg,
                imageUrl: canvas.toDataURL(),
              });
              onPushHistory('Applied Magic Eraser');
            };
            updatedImg.src = canvas.toDataURL();
          }
        }
      }
      return;
    }

    // Background Eraser Tool (Sample & erase drag)
    if (activeSubTool === 'background-eraser') {
      if (activeLayer && activeLayer.type === 'image' && activeLayer.imageElement && !activeLayer.locked) {
        setIsDrawing(true);
        isDrawingRef.current = true;
        const localX = mousePos.x - activeLayer.x;
        const localY = mousePos.y - activeLayer.y;

        // Create offscreen canvas with full image pixels
        const offscreen = document.createElement('canvas');
        offscreen.width = activeLayer.width;
        offscreen.height = activeLayer.height;
        const offCtx = offscreen.getContext('2d');
        if (offCtx) {
          offCtx.drawImage(activeLayer.imageElement, 0, 0, activeLayer.width, activeLayer.height);
          drawingCanvasRef.current = offscreen;

          // Store active layer compositing info
          bgActiveLayerInfoRef.current = {
            x: activeLayer.x,
            y: activeLayer.y,
            opacity: activeLayer.opacity ?? 1,
            blendMode: activeLayer.blendMode ?? 'normal',
          };

          // Build base snapshot (all layers BELOW active layer) for instant compositing
          const activeIdx = project.layers.findIndex((l) => l.id === activeLayer.id);
          const W = project.width;
          const H = project.height;

          // Layers below = higher index (renderProjectToCanvas renders bottom-to-top = highest index first)
          const layersBelow = project.layers.slice(activeIdx + 1);
          const layersAbove = project.layers.slice(0, activeIdx);

          const baseSnap = document.createElement('canvas');
          baseSnap.width = W; baseSnap.height = H;
          bgBaseSnapshotRef.current = baseSnap;

          const upperSnap = document.createElement('canvas');
          upperSnap.width = W; upperSnap.height = H;
          bgUpperSnapshotRef.current = upperSnap;

          // Async render base & upper snapshots (done once on mousedown, not per frame)
          if (layersBelow.length > 0) {
            renderProjectToCanvas(
              { ...project, layers: layersBelow },
              baseSnap,
              { isExport: false, zoom, visibleChannel }
            );
          }
          if (layersAbove.length > 0) {
            renderProjectToCanvas(
              { ...project, layers: layersAbove },
              upperSnap,
              { isExport: false, zoom, visibleChannel }
            );
          }

          // Sample center pixel for background color
          const sx = Math.max(0, Math.min(activeLayer.width - 1, Math.floor(localX)));
          const sy = Math.max(0, Math.min(activeLayer.height - 1, Math.floor(localY)));
          const pixel = offCtx.getImageData(sx, sy, 1, 1).data;
          sampledBgColor.current = { r: pixel[0], g: pixel[1], b: pixel[2], a: pixel[3] };

          // Apply erase at first point
          eraseBgColorAtPos(offCtx, localX, localY, brushSize, sampledBgColor.current);

          // Trigger first live render
          renderBgEraserDirect();
        }
        lastEraserPos.current = { x: localX, y: localY };
      }
      return;
    }

    // 4. DRAWING/BRUSH INTERACTION
    if ((activeTool === 'brush' || activeTool === 'eraser' || activeTool === 'healing' || activeTool === 'blur-sharpen' || activeTool === 'dodge-burn') && activeLayer) {
      if (activeLayer.locked || activeLayer.lockPixels) {
        if (setToast && activeLayer.lockPixels && !activeLayer.locked) setToast({ message: 'Layer pixels are locked!', type: 'error' });
        return;
      }

      if (activeSubTool === 'healing-brush' && e.altKey) {
        setStampSource(mousePos);
        onPushHistory('Set Healing Brush source anchor');
        if (setToast) setToast({ message: 'Healing Brush source anchor set!', type: 'info' });
        return;
      }

      setIsDrawing(true);
      isDrawingRef.current = true;
      isNewStroke.current = true;
      const relativeX = mousePos.x - activeLayer.x;
      const relativeY = mousePos.y - activeLayer.y;
      currentPath.current = [{ x: relativeX, y: relativeY }];
      lastStrokePt.current = { x: relativeX, y: relativeY };

      // Initialize offscreen bitmap from current layer pixels for real-time live editing
      if (!drawingCanvasRef.current && activeLayer.type === 'image') {
        const offscreen = document.createElement('canvas');
        offscreen.width = activeLayer.width;
        offscreen.height = activeLayer.height;
        const offCtx = offscreen.getContext('2d');
        if (offCtx) {
          if (activeLayer.imageElement) {
            offCtx.drawImage(activeLayer.imageElement, 0, 0, activeLayer.width, activeLayer.height);
          }
          drawingCanvasRef.current = offscreen;
        }
      }
      smudgeBufferRef.current = null;

      // Pre-capture base & upper snapshots for 60 FPS live compositing
      bgActiveLayerInfoRef.current = {
        x: activeLayer.x,
        y: activeLayer.y,
        width: activeLayer.width,
        height: activeLayer.height,
        opacity: activeLayer.opacity ?? 1,
        blendMode: activeLayer.blendMode ?? 'normal',
      };
      const activeIdx = project.layers.findIndex((l) => l.id === activeLayer.id);
      const W = project.width;
      const H = project.height;
      const layersBelow = project.layers.slice(activeIdx + 1);
      const layersAbove = project.layers.slice(0, activeIdx);

      const baseSnap = document.createElement('canvas');
      baseSnap.width = W; baseSnap.height = H;
      bgBaseSnapshotRef.current = baseSnap;

      const upperSnap = document.createElement('canvas');
      upperSnap.width = W; upperSnap.height = H;
      bgUpperSnapshotRef.current = upperSnap;

      if (layersBelow.length > 0) {
        renderProjectToCanvas({ ...project, layers: layersBelow }, baseSnap, { isExport: false, zoom, visibleChannel });
      }
      if (layersAbove.length > 0) {
        renderProjectToCanvas({ ...project, layers: layersAbove }, upperSnap, { isExport: false, zoom, visibleChannel });
      }

      if (activeSubTool === 'healing-brush' && stampSource) {
        stampOffset.current = {
          x: stampSource.x - mousePos.x,
          y: stampSource.y - mousePos.y,
        };
      }
      return;
    }

    // 5. CLONE STAMP SETUP
    if (activeTool === 'stamp') {
      if (e.altKey) {
        setStampSource(mousePos);
        onPushHistory('Set Clone Stamp source');
        return;
      }
      if (stampSource && activeLayer && activeLayer.type === 'image' && !activeLayer.locked) {
        setIsDrawing(true);
        stampOffset.current = {
          x: stampSource.x - mousePos.x,
          y: stampSource.y - mousePos.y,
        };
        executeStampClone(mousePos);
      }
      return;
    }

    // 6. EYE DROPPER
    if (activeTool === 'eyedropper') {
      setIsDrawing(true);
      setEyedropperOldColor(brushColor);
      executeEyedropper(mousePos);
      return;
    }

    // 7. TRANSFORM HANDLE / MOVE TOOL INTERACTION
    if (activeTool === 'move' || activeSubTool === 'transform') {
      let targetLayer = activeLayer;

      if (onSelectLayer) {
        const clickedLayer = project.layers
          .find((layer) => {
            if (layer.locked) return false;
            const left = layer.x;
            const right = layer.x + layer.width;
            const top = layer.y;
            const bottom = layer.y + layer.height;
            return (
              mousePos.x >= left &&
              mousePos.x <= right &&
              mousePos.y >= top &&
              mousePos.y <= bottom
            );
          });

        if (clickedLayer) {
          targetLayer = clickedLayer;
          if (clickedLayer.id !== activeLayerId) {
            onSelectLayer(clickedLayer.id);
          }
        }
      }

      if (targetLayer && !targetLayer.locked && !targetLayer.lockPosition) {
        setIsDraggingLayer(true);
        dragStartOffset.current = {
          x: mousePos.x - targetLayer.x,
          y: mousePos.y - targetLayer.y,
        };
      } else if (targetLayer && targetLayer.lockPosition && !targetLayer.locked) {
        if (setToast) setToast({ message: 'Layer position is locked!', type: 'error' });
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const mousePos = getCanvasCoords(e);

    if (onMouseMoveCoords) {
      onMouseMoveCoords(mousePos);
    }

    if (customCursorRef.current && containerRef.current) {
      const brushTools = ['brush', 'eraser', 'healing', 'stamp', 'blur-sharpen', 'dodge-burn'];
      if (brushTools.includes(activeTool) && !isPanning) {
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const size = brushSize * zoom;
        customCursorRef.current.style.display = 'block';
        customCursorRef.current.style.width = `${size}px`;
        customCursorRef.current.style.left = `${x}px`;
        customCursorRef.current.style.top = `${y}px`;

        if (isQuickMaskMode) {
          customCursorRef.current.style.height = `${size}px`;
          customCursorRef.current.style.borderRadius = '50%';
          customCursorRef.current.style.border = '2px solid #f43f5e';
          customCursorRef.current.style.boxShadow = '0 0 12px rgba(244, 63, 94, 0.95), inset 0 0 8px rgba(244, 63, 94, 0.4)';
          customCursorRef.current.style.backgroundColor = 'rgba(244, 63, 94, 0.2)';
          customCursorRef.current.style.transform = 'translate3d(-50%, -50%, 0)';
        } else if (brushType === 'Flat') {
          customCursorRef.current.style.height = `${Math.max(3, size / 3)}px`;
          customCursorRef.current.style.borderRadius = '0px';
          customCursorRef.current.style.border = '1.5px solid white';
          customCursorRef.current.style.boxShadow = 'none';
          customCursorRef.current.style.backgroundColor = 'transparent';
          customCursorRef.current.style.transform = 'translate3d(-50%, -50%, 0)';
        } else if (brushType === 'Calligraphy') {
          customCursorRef.current.style.height = `${Math.max(3, size / 3)}px`;
          customCursorRef.current.style.borderRadius = '0px';
          customCursorRef.current.style.border = '1.5px solid white';
          customCursorRef.current.style.boxShadow = 'none';
          customCursorRef.current.style.backgroundColor = 'transparent';
          customCursorRef.current.style.transform = 'translate3d(-50%, -50%, 0) rotate(-45deg)';
        } else if (brushType === 'Chalk' || brushType === 'Oil Thick') {
          customCursorRef.current.style.height = `${size}px`;
          customCursorRef.current.style.borderRadius = '4px';
          customCursorRef.current.style.border = '1.5px dashed white';
          customCursorRef.current.style.boxShadow = 'none';
          customCursorRef.current.style.backgroundColor = 'transparent';
          customCursorRef.current.style.transform = 'translate3d(-50%, -50%, 0)';
        } else if (brushType === 'Spray' || brushType === 'Spatter' || brushType === 'Grain') {
          customCursorRef.current.style.height = `${size}px`;
          customCursorRef.current.style.borderRadius = '50%';
          customCursorRef.current.style.border = '1.5px dashed rgba(255,255,255,0.9)';
          customCursorRef.current.style.boxShadow = 'none';
          customCursorRef.current.style.backgroundColor = 'transparent';
          customCursorRef.current.style.transform = 'translate3d(-50%, -50%, 0)';
        } else if (brushType === 'Scatter Star') {
          customCursorRef.current.style.height = `${size}px`;
          customCursorRef.current.style.borderRadius = '20%';
          customCursorRef.current.style.border = '1.5px solid #a5b4fc';
          customCursorRef.current.style.boxShadow = 'none';
          customCursorRef.current.style.backgroundColor = 'transparent';
          customCursorRef.current.style.transform = 'translate3d(-50%, -50%, 0) rotate(18deg)';
        } else {
          customCursorRef.current.style.height = `${size}px`;
          customCursorRef.current.style.borderRadius = '50%';
          customCursorRef.current.style.border = '1.2px solid white';
          customCursorRef.current.style.boxShadow = 'none';
          customCursorRef.current.style.backgroundColor = 'transparent';
          customCursorRef.current.style.transform = 'translate3d(-50%, -50%, 0)';
        }
      } else {
        customCursorRef.current.style.display = 'none';
      }
    }

    // Patch Tool Dragging
    if (isPatchDragging) {
      const dx = mousePos.x - patchDragStart.current.x;
      const dy = mousePos.y - patchDragStart.current.y;
      setPatchOffset({ x: dx, y: dy });
      return;
    }

    // Track hover position for Pen Tool / Polygonal Lasso / Brush / Eraser / Marquee tools
    const brushTools = ['brush', 'eraser', 'healing', 'stamp', 'blur-sharpen', 'dodge-burn'];
    const isMarquee = activeTool === 'select-rect' ||
      activeSubTool === 'select-rect' ||
      activeSubTool === 'select-ellipse' ||
      activeSubTool === 'select-row' ||
      activeSubTool === 'select-column';
    const isEyedropperDrawing = activeTool === 'eyedropper' && isDrawing;
    if ((activeSubTool as string) === 'pen' || (activeSubTool as string) === 'select-poly' || brushTools.includes(activeTool) || activeTool === 'shape' || isMarquee || isEyedropperDrawing) {
      setHoverMousePos(mousePos);
    } else if (hoverMousePos && (activeSubTool as string) !== 'pen' && (activeSubTool as string) !== 'select-poly') {
      setHoverMousePos(null);
    }

    // Freeform pen live draw
    if (isDrawing && activeSubTool === 'freeform-pen') {
      setFreeformPoints((prev) => [...prev, mousePos]);
      return;
    }

    // Pan viewport
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.current.x,
        y: e.clientY - panStart.current.y,
      });
      return;
    }

    // Viewport Rotation
    if (isRotatingCanvas) {
      const deltaX = mousePos.x - dragStartOffset.current.x;
      setViewportRotation((viewportStartRotation.current + Math.round(deltaX / 1.5)) % 360);
      return;
    }

    // Active Layer Rotation
    if (isRotatingLayer && activeLayer) {
      const deltaX = mousePos.x - dragStartOffset.current.x;
      onUpdateLayer(activeLayer.id, {
        rotation: (layerStartRotation.current + Math.round(deltaX / 2)) % 360,
      });
      return;
    }

    // Active Shape Drawing Preview
    if (isDrawingShape && tempShape) {
      const x = Math.min(selectStart.current.x, mousePos.x);
      const y = Math.min(selectStart.current.y, mousePos.y);
      const w = Math.abs(selectStart.current.x - mousePos.x);
      const h = Math.abs(selectStart.current.y - mousePos.y);
      setTempShape({ x, y, w, h });
      return;
    }

    // Interactive corner handle resize logic
    if (transformHandle && activeLayer) {
      const deltaX = mousePos.x - dragStartOffset.current.x;
      const deltaY = mousePos.y - dragStartOffset.current.y;

      let newWidth = transformStart.current.w;
      let newHeight = transformStart.current.h;
      let newX = transformStart.current.x;
      let newY = transformStart.current.y;

      const minSize = 15;

      switch (transformHandle) {
        case 'rotate': {
          const centerX = transformStart.current.x + transformStart.current.w / 2;
          const centerY = transformStart.current.y + transformStart.current.h / 2;
          const currentMouseAngle = Math.atan2(mousePos.y - centerY, mousePos.x - centerX) * (180 / Math.PI);
          const angleDelta = currentMouseAngle - rotateStartAngle.current;

          let targetDeg = rotateStartRotation.current + angleDelta;

          if (isShiftPressed.current) {
            targetDeg = Math.round(targetDeg / 15) * 15;
          } else {
            targetDeg = Math.round(targetDeg * 2) / 2;
          }

          targetDeg = ((targetDeg % 360) + 360) % 360;
          if (targetDeg > 180) targetDeg -= 360;

          if (transformRafRef.current !== null) return;
          transformRafRef.current = requestAnimationFrame(() => {
            transformRafRef.current = null;
            onUpdateLayer(activeLayer.id, { rotation: targetDeg });
          });
          return;
        }
        case 'se':
          newWidth = Math.max(minSize, transformStart.current.w + deltaX);
          newHeight = Math.max(minSize, transformStart.current.h + deltaY);
          break;
        case 'nw':
          newWidth = Math.max(minSize, transformStart.current.w - deltaX);
          newHeight = Math.max(minSize, transformStart.current.h - deltaY);
          if (transformStart.current.w - deltaX > minSize) newX = transformStart.current.x + deltaX;
          if (transformStart.current.h - deltaY > minSize) newY = transformStart.current.y + deltaY;
          break;
        case 'ne':
          newWidth = Math.max(minSize, transformStart.current.w + deltaX);
          newHeight = Math.max(minSize, transformStart.current.h - deltaY);
          if (transformStart.current.h - deltaY > minSize) newY = transformStart.current.y + deltaY;
          break;
        case 'sw':
          newWidth = Math.max(minSize, transformStart.current.w - deltaX);
          newHeight = Math.max(minSize, transformStart.current.h + deltaY);
          if (transformStart.current.w - deltaX > minSize) newX = transformStart.current.x + deltaX;
          break;
      }

      onUpdateLayer(activeLayer.id, {
        x: Math.round(newX),
        y: Math.round(newY),
        width: Math.round(newWidth),
        height: Math.round(newHeight),
      });
      return;
    }

    // Resize / move crop box (multi-handle & reposition)
    if (isResizingCrop && cropBox) {
      const deltaX = mousePos.x - dragStartOffset.current.x;
      const deltaY = mousePos.y - dragStartOffset.current.y;

      let newX = transformStart.current.x;
      let newY = transformStart.current.y;
      let newW = transformStart.current.w;
      let newH = transformStart.current.h;

      const minCropSize = 15;

      if (isResizingCrop === 'move') {
        newX = Math.max(0, Math.min(project.width - newW, transformStart.current.x + deltaX));
        newY = Math.max(0, Math.min(project.height - newH, transformStart.current.y + deltaY));
      } else {
        if (isResizingCrop.includes('w')) {
          const possibleW = transformStart.current.w - deltaX;
          if (possibleW >= minCropSize) {
            newX = transformStart.current.x + deltaX;
            newW = possibleW;
          }
        }
        if (isResizingCrop.includes('e')) {
          newW = Math.max(minCropSize, transformStart.current.w + deltaX);
        }
        if (isResizingCrop.includes('n')) {
          const possibleH = transformStart.current.h - deltaY;
          if (possibleH >= minCropSize) {
            newY = transformStart.current.y + deltaY;
            newH = possibleH;
          }
        }
        if (isResizingCrop.includes('s')) {
          newH = Math.max(minCropSize, transformStart.current.h + deltaY);
        }

        let ratioVal: number | null = null;
        if (cropRatio === '1:1') ratioVal = 1;
        else if (cropRatio === '16:9') ratioVal = 16 / 9;
        else if (cropRatio === '4:3') ratioVal = 4 / 3;

        if (ratioVal !== null) {
          if (isResizingCrop.includes('e') || isResizingCrop.includes('w')) {
            newH = newW / ratioVal;
          } else {
            newW = newH * ratioVal;
          }
        }

      }

      setCropBox({
        x: Math.round(newX),
        y: Math.round(newY),
        w: Math.round(newW),
        h: Math.round(newH),
      });
      return;
    }

    // Perspective corner point dragging
    if (activePerspectivePointIndex !== null && perspectivePoints) {
      const updatedPts = [...perspectivePoints];
      const px = Math.max(0, Math.min(project.width, mousePos.x));
      const py = Math.max(0, Math.min(project.height, mousePos.y));
      updatedPts[activePerspectivePointIndex] = { x: px, y: py };
      setPerspectivePoints(updatedPts);
      return;
    }

    // Slice resizing control handle dragging
    if (resizingSliceHandle && activeSliceId && slices && onUpdateSlices) {
      const dx = mousePos.x - sliceStart.current.x;
      const dy = mousePos.y - sliceStart.current.y;
      const orig = sliceStartRect.current;

      let newX = orig.x;
      let newY = orig.y;
      let newW = orig.w;
      let newH = orig.h;

      if (resizingSliceHandle.includes('e')) newW = Math.max(5, orig.w + dx);
      if (resizingSliceHandle.includes('s')) newH = Math.max(5, orig.h + dy);
      if (resizingSliceHandle.includes('w')) {
        const potentialW = orig.w - dx;
        if (potentialW >= 5) {
          newX = orig.x + dx;
          newW = potentialW;
        }
      }
      if (resizingSliceHandle.includes('n')) {
        const potentialH = orig.h - dy;
        if (potentialH >= 5) {
          newY = orig.y + dy;
          newH = potentialH;
        }
      }

      onUpdateSlices(
        slices.map((s) => (s.id === activeSliceId ? { ...s, x: Math.round(newX), y: Math.round(newY), w: Math.round(newW), h: Math.round(newH) } : s))
      );
      return;
    }

    // Slice position dragging (moving)
    if (isDraggingSlice && activeSliceId && slices && onUpdateSlices) {
      const newX = Math.round(mousePos.x - sliceDragOffset.current.x);
      const newY = Math.round(mousePos.y - sliceDragOffset.current.y);
      onUpdateSlices(
        slices.map((s) => (s.id === activeSliceId ? { ...s, x: newX, y: newY } : s))
      );
      return;
    }

    // Slice drawing
    if (isDrawingSlice && tempSlice) {
      const x = Math.min(sliceStart.current.x, mousePos.x);
      const y = Math.min(sliceStart.current.y, mousePos.y);
      const w = Math.abs(sliceStart.current.x - mousePos.x);
      const h = Math.abs(sliceStart.current.y - mousePos.y);
      setTempSlice({ x, y, w, h });
      return;
    }

    // Repositioning selection marquee outline
    if (isRepositioningSelection && selectionBox) {
      const newX = mousePos.x - selectionDragStart.current.x;
      const newY = mousePos.y - selectionDragStart.current.y;

      if (selectionPath && selectionPath.length > 0) {
        const dx = newX - selectionBox.x;
        const dy = newY - selectionBox.y;
        setSelectionPath((prev) =>
          prev ? prev.map((p) => ({ x: p.x + dx, y: p.y + dy })) : null
        );
      }

      setSelectionBox({
        ...selectionBox,
        x: newX,
        y: newY,
      });
      return;
    }

    if (isSelecting && selectionBox) {
      if (activeSubTool === 'select-lasso' || activeSubTool === 'select-magnetic' || activeSubTool === 'patch-tool') {
        const targetPt = activeSubTool === 'select-magnetic' ? snapToEdge(mousePos) : mousePos;
        setLassoPoints((prev) => {
          const updated = [...prev, targetPt];
          // Update bounding box in real time from lasso path extent
          if (updated.length > 1) {
            const xs = updated.map((p) => p.x);
            const ys = updated.map((p) => p.y);
            setSelectionBox({
              x: Math.round(Math.min(...xs)),
              y: Math.round(Math.min(...ys)),
              w: Math.round(Math.max(1, Math.max(...xs) - Math.min(...xs))),
              h: Math.round(Math.max(1, Math.max(...ys) - Math.min(...ys))),
            });
          }
          return updated;
        });
      } else if (activeSubTool === 'select-quick') {
        handleQuickSelectionMove(mousePos);
      } else {
        const x = Math.min(selectStart.current.x, mousePos.x);
        const y = Math.min(selectStart.current.y, mousePos.y);
        const w = Math.abs(selectStart.current.x - mousePos.x);
        const h = Math.abs(selectStart.current.y - mousePos.y);
        setSelectionBox({ x, y, w, h });
      }
      return;
    }

    // Gradient Line drag — with Shift-constraint + live canvas preview
    if (activeTool === 'gradient' && gradientStart) {
      let endPt = mousePos;
      // Shift key: snap to 45° angles
      if (e.shiftKey && gradientShiftStart.current) {
        endPt = constrainGradientAngle(gradientShiftStart.current, mousePos);
      }
      setGradientEnd(endPt);
      // Live canvas preview (RAF-throttled, no toDataURL)
      renderGradientPreview(gradientStart.x, gradientStart.y, endPt.x, endPt.y);
      return;
    }

    // Background Eraser Tool (Sample & erase drag) — smooth live rendering
    if (isDrawing && activeSubTool === 'background-eraser' && activeLayer && activeLayer.type === 'image' && sampledBgColor.current && drawingCanvasRef.current) {
      const localX = mousePos.x - activeLayer.x;
      const localY = mousePos.y - activeLayer.y;

      const offscreen = drawingCanvasRef.current;
      const offCtx = offscreen.getContext('2d');
      if (offCtx) {
        const p0 = lastEraserPos.current || { x: localX, y: localY };
        const p1 = { x: localX, y: localY };
        const segDx = p1.x - p0.x;
        const segDy = p1.y - p0.y;
        const segLen = Math.sqrt(segDx * segDx + segDy * segDy);

        // Photoshop-like spacing: step every ~25% of brush diameter for smooth fill
        const spacing = Math.max(1, (brushSize / 2) * 0.25);
        const numSteps = Math.max(1, Math.ceil(segLen / spacing));

        for (let s = 0; s <= numSteps; s++) {
          const t = s / numSteps;
          const tx = p0.x + segDx * t;
          const ty = p0.y + segDy * t;

          // Continuous re-sampling: sample under cursor hotspot for smarter color tracking
          const sampleX = Math.max(0, Math.min(offscreen.width - 1, Math.floor(tx)));
          const sampleY = Math.max(0, Math.min(offscreen.height - 1, Math.floor(ty)));
          const samplePixel = offCtx.getImageData(sampleX, sampleY, 1, 1).data;
          // Only update sampled color if the center pixel is not already erased
          if (samplePixel[3] > 10) {
            sampledBgColor.current = { r: samplePixel[0], g: samplePixel[1], b: samplePixel[2], a: samplePixel[3] };
          }

          eraseBgColorAtPos(offCtx, tx, ty, brushSize, sampledBgColor.current);
        }

        // Schedule RAF-throttled live composite render (base layers + erased + upper layers)
        renderBgEraserDirect();
      }
      lastEraserPos.current = { x: localX, y: localY };
      return;
    }

    // Drawing brush / filter stroke (Direct 2D Context Canvas Rendering for zero-lag 60 FPS real-time feedback!)
    if (isDrawing && activeLayer && currentPath.current.length > 0 && drawingCanvasRef.current && lastStrokePt.current) {
      const relativeX = mousePos.x - activeLayer.x;
      const relativeY = mousePos.y - activeLayer.y;
      currentPath.current.push({ x: relativeX, y: relativeY });

      const p0 = lastStrokePt.current;
      const p1 = { x: relativeX, y: relativeY };

      const offCtx = drawingCanvasRef.current.getContext('2d');
      if (offCtx) {
        // Real-time pixel filter tools: Blur, Sharpen, Smudge, Dodge, Burn
        if (activeSubTool === 'blur' || activeSubTool === 'sharpen' || activeSubTool === 'smudge' || activeSubTool === 'dodge' || activeSubTool === 'burn' || activeTool === 'blur-sharpen' || activeTool === 'dodge-burn') {
          const segDx = p1.x - p0.x;
          const segDy = p1.y - p0.y;
          const dist = Math.sqrt(segDx * segDx + segDy * segDy);
          const spacing = Math.max(1, (brushSize / 2) * 0.25);
          const steps = Math.max(1, Math.ceil(dist / spacing));

          for (let s = 0; s <= steps; s++) {
            const t = s / steps;
            const tx = p0.x + segDx * t;
            const ty = p0.y + segDy * t;

            if (activeSubTool === 'sharpen') {
              applyLocalSharpenAtPos(offCtx, tx, ty, brushSize, 0.5, brushHardness / 100);
            } else if (activeSubTool === 'smudge') {
              applyLocalSmudgeAtPos(offCtx, tx, ty, brushSize, 0.5, brushHardness / 100);
            } else if (activeSubTool === 'dodge') {
              applyLocalDodgeAtPos(offCtx, tx, ty, brushSize, 0.5, brushHardness / 100);
            } else if (activeSubTool === 'burn') {
              applyLocalBurnAtPos(offCtx, tx, ty, brushSize, 0.5, brushHardness / 100);
            } else {
              // Default: blur
              applyLocalBlurAtPos(offCtx, tx, ty, brushSize, 0.5, brushHardness / 100);
            }
          }
          // Schedule 60 FPS live composite blit to display canvas
          renderBgEraserDirect();
        } else {
          // Standard Brush / Eraser / Pencil / Healing stroke
          const isEraser = activeTool === 'eraser';
          const isHealing = activeTool === 'healing';
          const strokeColor = isHealing ? 'rgba(239, 68, 68, 0.65)' : brushColor;

          // Parse brushColor into rgb once, before the per-dot loop
          let brushR = 255, brushG = 255, brushB = 255;
          if (!isEraser) {
            const tmp = document.createElement('canvas');
            tmp.width = 1; tmp.height = 1;
            const tmpCtx = tmp.getContext('2d')!;
            tmpCtx.fillStyle = brushColor;
            tmpCtx.fillRect(0, 0, 1, 1);
            const px = tmpCtx.getImageData(0, 0, 1, 1).data;
            brushR = px[0]; brushG = px[1]; brushB = px[2];
          }

          const paintSegment = (ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number) => {
            const r = Math.max(0.5, brushSize / 2);
            const hardFraction = brushHardness / 100; // 0=fully soft, 1=fully hard
            const dx = toX - fromX;
            const dy = toY - fromY;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;

            // Compute dynamic spacing based on brush type
            let spacing = Math.max(1, r * 0.2);
            if (brushType === 'Scatter Star') {
              spacing = Math.max(12, r * 1.8);
            } else if (brushType === 'Spray') {
              spacing = Math.max(6, r * 0.7);
            } else if (brushType === 'Spatter' || brushType === 'Grain') {
              spacing = Math.max(8, r * 0.8);
            } else if (brushType === 'Chalk') {
              spacing = Math.max(4, r * 0.5);
            } else if (brushType === 'Watercolor Wet') {
              spacing = Math.max(3, r * 0.4);
            } else if (brushType === 'Fan') {
              spacing = Math.max(2, r * 0.25);
            }

            const steps = Math.max(1, Math.ceil(dist / spacing));

            for (let s = 0; s <= steps; s++) {
              const t = s / steps;
              const cx = fromX + dx * t;
              const cy = fromY + dy * t;

              ctx.save();

              if (isEraser) {
                ctx.globalCompositeOperation = 'destination-out';
              } else {
                ctx.globalCompositeOperation = 'source-over';
              }

              const fillAlpha = brushOpacity;
              const rgbStr = isEraser ? '255,255,255' : `${brushR},${brushG},${brushB}`;

              if (brushType === 'Flat') {
                // Flat brush (horizontal rectangular tip)
                ctx.translate(cx, cy);
                ctx.fillStyle = `rgba(${rgbStr}, ${fillAlpha})`;
                ctx.fillRect(-r, -Math.max(1, r / 3), r * 2, Math.max(2, (r * 2) / 3));
              } else if (brushType === 'Calligraphy') {
                // Calligraphy (45-degree angled chisel tip)
                ctx.translate(cx, cy);
                ctx.rotate(-Math.PI / 4);
                ctx.fillStyle = `rgba(${rgbStr}, ${fillAlpha})`;
                ctx.fillRect(-r, -Math.max(1, r / 4), r * 2, Math.max(2, r / 2));
              } else if (brushType === 'Scatter Star') {
                // Scatter Star (rotated 5-point star)
                ctx.translate(cx, cy);
                ctx.rotate(Math.random() * Math.PI * 2);
                ctx.fillStyle = `rgba(${rgbStr}, ${fillAlpha})`;
                const starSize = r * (0.6 + Math.random() * 0.6);
                ctx.beginPath();
                for (let i = 0; i < 5; i++) {
                  ctx.lineTo(Math.cos((18 + i * 72) * Math.PI / 180) * starSize, -Math.sin((18 + i * 72) * Math.PI / 180) * starSize);
                  ctx.lineTo(Math.cos((54 + i * 72) * Math.PI / 180) * (starSize / 2), -Math.sin((54 + i * 72) * Math.PI / 180) * (starSize / 2));
                }
                ctx.closePath();
                ctx.fill();
              } else if (brushType === 'Spray') {
                // Airbrush Spray (fine mist particles)
                ctx.fillStyle = `rgba(${rgbStr}, ${fillAlpha * 0.6})`;
                const count = 30;
                for (let i = 0; i < count; i++) {
                  const angle = Math.random() * Math.PI * 2;
                  const d = Math.random() * r;
                  const dotX = cx + Math.cos(angle) * d;
                  const dotY = cy + Math.sin(angle) * d;
                  const dotR = Math.max(0.5, Math.random() * (r / 8));
                  ctx.beginPath();
                  ctx.arc(dotX, dotY, dotR, 0, Math.PI * 2);
                  ctx.fill();
                }
              } else if (brushType === 'Spatter' || brushType === 'Grain') {
                // Spatter droplets / Grain
                ctx.fillStyle = `rgba(${rgbStr}, ${fillAlpha})`;
                const count = 10;
                for (let i = 0; i < count; i++) {
                  const angle = Math.random() * Math.PI * 2;
                  const d = Math.random() * r * 1.2;
                  const dotX = cx + Math.cos(angle) * d;
                  const dotY = cy + Math.sin(angle) * d;
                  const dotR = Math.max(0.6, Math.random() * (r / 5));
                  ctx.beginPath();
                  ctx.arc(dotX, dotY, dotR, 0, Math.PI * 2);
                  ctx.fill();
                }
              } else if (brushType === 'Chalk') {
                // Chalk / Crayon (dry porous grain particles)
                const count = 16;
                for (let i = 0; i < count; i++) {
                  const angle = Math.random() * Math.PI * 2;
                  const d = Math.random() * r;
                  const px = cx + Math.cos(angle) * d;
                  const py = cy + Math.sin(angle) * d;
                  const grainSize = Math.max(0.8, Math.random() * (r / 3));
                  const alpha = fillAlpha * (0.3 + Math.random() * 0.6);
                  ctx.fillStyle = `rgba(${rgbStr}, ${alpha})`;
                  ctx.fillRect(px - grainSize / 2, py - grainSize / 2, grainSize, grainSize);
                }
              } else if (brushType === 'Fan') {
                // Fan Brush (5 parallel bristle strokes across arc)
                ctx.fillStyle = `rgba(${rgbStr}, ${fillAlpha * 0.75})`;
                const bristles = 5;
                const spread = r * 1.2;
                for (let b = 0; b < bristles; b++) {
                  const offset = -spread / 2 + (spread / (bristles - 1)) * b;
                  ctx.beginPath();
                  ctx.arc(cx + offset, cy, Math.max(0.75, r / 6), 0, Math.PI * 2);
                  ctx.fill();
                }
              } else if (brushType === 'Oil Thick') {
                // Oil Thick (impasto layered brush)
                const innerR = r * Math.min(0.999, hardFraction);
                const grad = ctx.createRadialGradient(cx, cy, innerR, cx, cy, r);
                grad.addColorStop(0, `rgba(${rgbStr}, ${fillAlpha})`);
                grad.addColorStop(0.8, `rgba(${rgbStr}, ${fillAlpha * 0.9})`);
                grad.addColorStop(1, `rgba(${rgbStr}, 0)`);
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, Math.PI * 2);
                ctx.fill();
              } else if (brushType === 'Watercolor Wet') {
                // Watercolor Wet (bleeding translucent edge)
                const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.1);
                grad.addColorStop(0, `rgba(${rgbStr}, ${fillAlpha * 0.25})`);
                grad.addColorStop(0.7, `rgba(${rgbStr}, ${fillAlpha * 0.15})`);
                grad.addColorStop(1, `rgba(${rgbStr}, 0)`);
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(cx, cy, r * 1.1, 0, Math.PI * 2);
                ctx.fill();
              } else if (brushType === 'Marker') {
                // Marker (semi-transparent felt tip)
                ctx.translate(cx, cy);
                ctx.fillStyle = `rgba(${rgbStr}, ${fillAlpha * 0.35})`;
                ctx.beginPath();
                if ((ctx as any).roundRect) {
                  (ctx as any).roundRect(-r, -r * 0.7, r * 2, r * 1.4, 4);
                } else {
                  ctx.rect(-r, -r * 0.7, r * 2, r * 1.4);
                }
                ctx.fill();
              } else {
                // Default / Soft Round / Hard Round / Basic Round
                const innerR = r * Math.min(0.999, hardFraction);
                const grad = ctx.createRadialGradient(cx, cy, innerR, cx, cy, r);
                grad.addColorStop(0, `rgba(${rgbStr}, ${fillAlpha})`);
                grad.addColorStop(1, `rgba(${rgbStr}, 0)`);
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, Math.PI * 2);
                ctx.fill();
              }

              ctx.restore();
            }
          };

          paintSegment(offCtx, p0.x, p0.y, p1.x, p1.y);
          const canvas = canvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.save();
              ctx.translate(activeLayer.x, activeLayer.y);
              paintSegment(ctx, p0.x, p0.y, p1.x, p1.y);
              ctx.restore();
            }
          }
        }
      }

      lastStrokePt.current = { x: relativeX, y: relativeY };
      return;
    }

    // Stamp Clone drag stroke
    if (isDrawing && activeTool === 'stamp' && activeLayer && activeLayer.type === 'image') {
      executeStampClone(mousePos);
    }

    // Eyedropper drag sampling
    if (isDrawing && activeTool === 'eyedropper') {
      executeEyedropper(mousePos);
    }

    // Move layer
    if (isDraggingLayer && activeLayer && (activeTool === 'move' || activeSubTool === 'transform')) {
      let targetX = mousePos.x - dragStartOffset.current.x;
      let targetY = mousePos.y - dragStartOffset.current.y;

      // 1. Grid Snapping
      if (gridSettings?.enabled && gridSettings?.snapEnabled) {
        const gridSize = gridSettings.size || 50;
        const snapThresh = gridSettings.snapThreshold || 8;

        const remX = targetX % gridSize;
        const remY = targetY % gridSize;

        if (Math.abs(remX) < snapThresh) {
          targetX -= remX;
        } else if (gridSize - Math.abs(remX) < snapThresh) {
          targetX += (remX < 0 ? -1 : 1) * (gridSize - Math.abs(remX));
        }

        if (Math.abs(remY) < snapThresh) {
          targetY -= remY;
        } else if (gridSize - Math.abs(remY) < snapThresh) {
          targetY += (remY < 0 ? -1 : 1) * (gridSize - Math.abs(remY));
        }
      }

      // 2. Smart Snapping Guidelines
      let finalLines: { type: 'h' | 'v'; position: number }[] = [];
      if (alignmentGuides?.enabled) {
        const snapThresh = 8;
        const halfW = activeLayer.width / 2;
        const halfH = activeLayer.height / 2;

        const refCoordsX: number[] = [0, project.width, project.width / 2];
        const refCoordsY: number[] = [0, project.height, project.height / 2];

        project.layers.forEach(l => {
          if (l.id !== activeLayer.id && l.visible && l.type !== 'adjustment' && l.type !== 'group') {
            refCoordsX.push(l.x, l.x + l.width, l.x + l.width / 2);
            refCoordsY.push(l.y, l.y + l.height, l.y + l.height / 2);
          }
        });

        let bestDiffX = snapThresh;
        let bestSnapX = targetX;
        let snapRefX: number | null = null;

        for (const refX of refCoordsX) {
          const dL = targetX - refX;
          if (Math.abs(dL) < Math.abs(bestDiffX)) {
            bestDiffX = dL;
            bestSnapX = refX;
            snapRefX = refX;
          }
          const dC = (targetX + halfW) - refX;
          if (Math.abs(dC) < Math.abs(bestDiffX)) {
            bestDiffX = dC;
            bestSnapX = refX - halfW;
            snapRefX = refX;
          }
          const dR = (targetX + activeLayer.width) - refX;
          if (Math.abs(dR) < Math.abs(bestDiffX)) {
            bestDiffX = dR;
            bestSnapX = refX - activeLayer.width;
            snapRefX = refX;
          }
        }

        let bestDiffY = snapThresh;
        let bestSnapY = targetY;
        let snapRefY: number | null = null;

        for (const refY of refCoordsY) {
          const dT = targetY - refY;
          if (Math.abs(dT) < Math.abs(bestDiffY)) {
            bestDiffY = dT;
            bestSnapY = refY;
            snapRefY = refY;
          }
          const dC = (targetY + halfH) - refY;
          if (Math.abs(dC) < Math.abs(bestDiffY)) {
            bestDiffY = dC;
            bestSnapY = refY - halfH;
            snapRefY = refY;
          }
          const dB = (targetY + activeLayer.height) - refY;
          if (Math.abs(dB) < Math.abs(bestDiffY)) {
            bestDiffY = dB;
            bestSnapY = refY - activeLayer.height;
            snapRefY = refY;
          }
        }

        if (snapRefX !== null) {
          targetX = bestSnapX;
          finalLines.push({ type: 'v', position: snapRefX });
        }
        if (snapRefY !== null) {
          targetY = bestSnapY;
          finalLines.push({ type: 'h', position: snapRefY });
        }
      }

      setAlignmentLines(finalLines);

      onUpdateLayer(activeLayer.id, {
        x: targetX,
        y: targetY,
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setIsResizingCrop(null);
    setIsSelecting(false);

    if (isRepositioningSelection) {
      setIsRepositioningSelection(false);
      onPushHistory('Moved Selection Marquee');
      return;
    }

    if (resizingSliceHandle) {
      setResizingSliceHandle(null);
      onPushHistory('Resized export slice');
      return;
    }

    if (isDraggingSlice) {
      setIsDraggingSlice(false);
      onPushHistory('Moved export slice');
      return;
    }

    if (activePerspectivePointIndex !== null) {
      setActivePerspectivePointIndex(null);
    }

    if (isDrawingSlice && tempSlice) {
      setIsDrawingSlice(false);
      if (tempSlice.w > 10 && tempSlice.h > 10) {
        const newSlice = {
          id: `slice-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          x: Math.round(tempSlice.x),
          y: Math.round(tempSlice.y),
          w: Math.round(tempSlice.w),
          h: Math.round(tempSlice.h),
        };
        if (onUpdateSlices) {
          onUpdateSlices([...slices, newSlice]);
        }
        setActiveSliceId(newSlice.id);
        onPushHistory(`Created export slice (${newSlice.w}x${newSlice.h}px)`);
      }
      setTempSlice(null);
    }

    if (isRotatingCanvas) {
      setIsRotatingCanvas(false);
      onPushHistory('Rotated Workspace View');
    }

    if (activeSubTool === 'select-lasso' || activeSubTool === 'select-magnetic' || activeSubTool === 'patch-tool') {
      if (lassoPoints.length > 0) {
        handleFinalizeLassoSelection(lassoPoints);
      }
    }

    if (isPatchDragging) {
      setIsPatchDragging(false);
      if (patchOffset && selectionBox && activeLayer && activeLayer.type === 'image' && onApplyPatch) {
        onApplyPatch(selectionBox, patchOffset);
      }
      setPatchOffset(null);
    }

    if (activeSubTool === 'select-quick') {
      if (lassoPoints.length > 0) {
        setSelectionPath([...lassoPoints]);
        setLassoPoints([]);
      }
    }

    // Shape creation finalization
    if (isDrawingShape && tempShape) {
      setIsDrawingShape(false);
      const isLine = activeSubTool === 'shape-line';
      const isValidSize = isLine ? (tempShape.w > 2 || tempShape.h > 2) : (tempShape.w > 4 && tempShape.h > 4);
      if (isValidSize) {
        let shapeType: ShapeType = 'rectangle';
        if (activeSubTool === 'shape-ellipse') {
          shapeType = 'circle';
        } else if (activeSubTool === 'shape-poly') {
          shapeType = 'triangle';
        } else if (activeSubTool === 'shape-line') {
          shapeType = 'line';
        }

        onAddLayer('shape', {
          name: `${activeSubTool === 'shape-rect' ? 'Rectangle' : activeSubTool === 'shape-rounded-rect' ? 'Rounded Rect' : activeSubTool === 'shape-ellipse' ? 'Ellipse' : activeSubTool === 'shape-poly' ? 'Polygon' : activeSubTool === 'shape-line' ? 'Line' : 'Shape'}`,
          shapeType: shapeType,
          width: Math.round(tempShape.w),
          height: Math.round(tempShape.h),
          x: Math.round(tempShape.x),
          y: Math.round(tempShape.y),
          fillColor: brushColor,
          strokeColor: shapeStrokeColor,
          strokeWidth: shapeStrokeWidth,
          cornerRadius: activeSubTool === 'shape-rounded-rect' ? (shapeCornerRadius > 0 ? shapeCornerRadius : 16) : shapeCornerRadius,
        });
        onPushHistory(`Drew Shape (${activeSubTool})`);
      }
      setTempShape(null);
    }

    // Layer rotation finalization
    if (isRotatingLayer) {
      setIsRotatingLayer(false);
      onPushHistory('Rotated Active Layer');
    }

    // Save final transform scale/move/rotate history
    if (transformHandle) {
      const handleType = transformHandle;
      setTransformHandle(null);
      if (handleType === 'rotate') {
        onPushHistory('Rotated layer');
      } else {
        onPushHistory('Resized layer bounds');
      }
    }

    // Save final drawing path
    if (isDrawing) {
      setIsDrawing(false);
      isDrawingRef.current = false;
      currentPath.current = [];

      if (activeSubTool === 'background-eraser') {
        if (drawingCanvasRef.current && activeLayer) {
          const finalUrl = drawingCanvasRef.current.toDataURL();
          const finalImg = new Image();
          finalImg.onload = () => {
            onUpdateLayer(activeLayer.id, {
              imageElement: finalImg,
              imageUrl: finalUrl,
            });
            onPushHistory('Applied Background Eraser');
            drawingCanvasRef.current = null;
          };
          finalImg.src = finalUrl;
        }
        sampledBgColor.current = null;
        lastEraserPos.current = null;
        // Cancel any pending RAF and clean up compositing snapshots
        if (bgEraserRafRef.current !== null) {
          cancelAnimationFrame(bgEraserRafRef.current);
          bgEraserRafRef.current = null;
        }
        bgBaseSnapshotRef.current = null;
        bgUpperSnapshotRef.current = null;
        bgActiveLayerInfoRef.current = null;
      } else if (activeSubTool === 'freeform-pen') {
        if (freeformPoints.length > 1) {
          onAddLayer('drawing', {
            name: 'Freeform Vector Path',
            drawingPath: [
              {
                points: [...freeformPoints],
                color: brushColor,
                size: brushSize,
                isEraser: false,
              }
            ],
            width: project.width,
            height: project.height,
            x: 0,
            y: 0,
          });
          onPushHistory('Drew Freeform Vector Path');
        }
        setFreeformPoints([]);
      } else if (drawingCanvasRef.current && activeLayer) {
        // Bake the offscreen bitmap permanently into the layer
        const finalUrl = drawingCanvasRef.current.toDataURL();
        const finalImg = new Image();
        finalImg.onload = () => {
          onUpdateLayer(activeLayer.id, {
            imageElement: finalImg,
            imageUrl: finalUrl,
            drawingPath: [],
          });
          onPushHistory(`Applied ${activeSubTool || activeTool}`);
          drawingCanvasRef.current = null;
          smudgeBufferRef.current = null;
        };
        finalImg.src = finalUrl;
      } else if (activeTool === 'healing' && onApplyHealing) {
        if (activeSubTool === 'healing-brush') {
          onApplyHealing([...currentPath.current], brushSize, stampOffset.current);
        } else {
          onApplyHealing([...currentPath.current], brushSize);
        }
      } else if (activeTool === 'stamp' && drawingCanvasRef.current && activeLayer) {
        const finalUrl = drawingCanvasRef.current.toDataURL();
        const finalImg = new Image();
        finalImg.onload = () => {
          onUpdateLayer(activeLayer.id, {
            imageElement: finalImg,
            imageUrl: finalUrl,
          });
          onPushHistory('Applied Clone Stamp');
          drawingCanvasRef.current = null;
        };
        finalImg.src = finalUrl;
      } else {
        onPushHistory(`Painted with ${activeTool}`);
      }
      lastStrokePt.current = null;
    }

    // Finish translation
    if (isDraggingLayer) {
      setIsDraggingLayer(false);
      setAlignmentLines([]);
      onPushHistory('Moved Layer position');
    }

    // Apply gradient when mouse is released
    if (activeTool === 'gradient' && gradientStart && gradientEnd) {
      // Cancel any pending RAF
      if (gradientRafRef.current !== null) {
        cancelAnimationFrame(gradientRafRef.current);
        gradientRafRef.current = null;
      }
      isDrawingRef.current = false;

      let finalEnd = gradientEnd;
      // Note: shift constraint already applied during mousemove, gradientEnd is already constrained
      // (gradientShiftStart.current stores the original start for reference)

      const dx = finalEnd.x - gradientStart.x;
      const dy = finalEnd.y - gradientStart.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 3) {
        const stops = getGradientStops();
        const W = project.width;
        const H = project.height;

        if (activeLayer && !activeLayer.locked) {
          // Apply gradient directly onto the active layer's pixels
          const offscreen = document.createElement('canvas');
          offscreen.width = W;
          offscreen.height = H;
          const offCtx = offscreen.getContext('2d');
          if (offCtx) {
            // Start from the snapshot state (before live preview) to avoid double-applying
            const snap = gradientSnapshotRef.current;
            if (snap) {
              offCtx.drawImage(snap, 0, 0);
            } else if (activeLayer.imageElement) {
              offCtx.drawImage(activeLayer.imageElement, activeLayer.x, activeLayer.y, activeLayer.width, activeLayer.height);
            }

            // Apply gradient in project coordinates
            applyGradientToCtx(offCtx, W, H,
              gradientStart.x, gradientStart.y,
              finalEnd.x, finalEnd.y,
              stops, gradientType, gradientOpacity, gradientBlendMode
            );

            // Bake the result: crop to active layer bounds if it's an image layer
            if (activeLayer.type === 'image') {
              const layerCanvas = document.createElement('canvas');
              layerCanvas.width = activeLayer.width;
              layerCanvas.height = activeLayer.height;
              const lCtx = layerCanvas.getContext('2d');
              if (lCtx) {
                // Start with original image
                if (activeLayer.imageElement) {
                  lCtx.drawImage(activeLayer.imageElement, 0, 0, activeLayer.width, activeLayer.height);
                }
                lCtx.save();
                if (selectionBox) {
                  lCtx.beginPath();
                  lCtx.rect(selectionBox.x - activeLayer.x, selectionBox.y - activeLayer.y, selectionBox.w, selectionBox.h);
                  lCtx.clip();
                }
                // Apply gradient in layer-local coordinates
                applyGradientToCtx(lCtx, activeLayer.width, activeLayer.height,
                  gradientStart.x - activeLayer.x, gradientStart.y - activeLayer.y,
                  finalEnd.x - activeLayer.x, finalEnd.y - activeLayer.y,
                  stops, gradientType, gradientOpacity, gradientBlendMode
                );
                lCtx.restore();
                const finalUrl = layerCanvas.toDataURL();
                const finalImg = new Image();
                finalImg.onload = () => {
                  onUpdateLayer(activeLayer.id, { imageElement: finalImg, imageUrl: finalUrl });
                  onPushHistory(`Applied ${gradientType} Gradient`);
                };
                finalImg.src = finalUrl;
              }
            } else {
              // For non-image layers (shape / drawing): add a new gradient layer
              onAddLayer('shape', {
                name: `${gradientType.charAt(0).toUpperCase() + gradientType.slice(1)} Gradient`,
                shapeType: 'rectangle',
                fillColor: stops[0].color,
                strokeColor: 'transparent',
                strokeWidth: 0,
                width: W,
                height: H,
                x: 0,
                y: 0,
                opacity: gradientOpacity,
                blendMode: gradientBlendMode as any,
                gradientStart: { x: gradientStart.x, y: gradientStart.y },
                gradientEnd: { x: finalEnd.x, y: finalEnd.y },
                gradientColors: stops.map(s => s.color),
                gradientType: gradientType as any,
              });
              onPushHistory(`Added ${gradientType} Gradient Layer`);
            }
          }
        } else {
          // No active layer: add new gradient layer
          onAddLayer('shape', {
            name: `${gradientType.charAt(0).toUpperCase() + gradientType.slice(1)} Gradient`,
            shapeType: 'rectangle',
            fillColor: stops[0].color,
            strokeColor: 'transparent',
            strokeWidth: 0,
            width: W,
            height: H,
            x: 0,
            y: 0,
            opacity: gradientOpacity,
            blendMode: gradientBlendMode as any,
            gradientStart: { x: gradientStart.x, y: gradientStart.y },
            gradientEnd: { x: finalEnd.x, y: finalEnd.y },
            gradientColors: stops.map(s => s.color),
            gradientType: gradientType as any,
          });
          onPushHistory(`Added ${gradientType} Gradient Layer`);
        }

        // Restore snapshot to canvas (React will re-render from project state shortly)
        if (gradientSnapshotRef.current && canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            ctx.drawImage(gradientSnapshotRef.current, 0, 0);
          }
        }
      } else {
        // Too short drag — restore snapshot without applying
        if (gradientSnapshotRef.current && canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            ctx.drawImage(gradientSnapshotRef.current, 0, 0);
          }
        }
      }

      // Cleanup
      gradientSnapshotRef.current = null;
      gradientShiftStart.current = null;
      setGradientStart(null);
      setGradientEnd(null);
    }
  };

  const executeStampClone = (pos: Point) => {
    if (!stampSource || !activeLayer || activeLayer.type !== 'image' || !canvasRef.current) return;

    if (!drawingCanvasRef.current && activeLayer.imageElement) {
      const canvas = document.createElement('canvas');
      canvas.width = activeLayer.width;
      canvas.height = activeLayer.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(activeLayer.imageElement, 0, 0, activeLayer.width, activeLayer.height);
        drawingCanvasRef.current = canvas;
      }
    }

    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const sourceX = pos.x + stampOffset.current.x;
    const sourceY = pos.y + stampOffset.current.y;

    const radius = brushSize / 2;
    const diameter = brushSize;

    const patchCanvas = document.createElement('canvas');
    patchCanvas.width = diameter;
    patchCanvas.height = diameter;
    const patchCtx = patchCanvas.getContext('2d');
    if (!patchCtx) return;

    patchCtx.beginPath();
    patchCtx.arc(radius, radius, radius, 0, Math.PI * 2);
    patchCtx.clip();

    patchCtx.drawImage(
      canvasRef.current,
      sourceX - radius,
      sourceY - radius,
      diameter,
      diameter,
      0,
      0,
      diameter,
      diameter
    );

    const destX = pos.x - activeLayer.x;
    const destY = pos.y - activeLayer.y;

    ctx.save();
    ctx.globalAlpha = brushOpacity;
    ctx.drawImage(patchCanvas, destX - radius, destY - radius);
    ctx.restore();

    const tempImg = new Image();
    tempImg.src = canvas.toDataURL();
    onUpdateLayer(activeLayer.id, { imageElement: tempImg });
  };



  const executeEyedropper = (pos: Point) => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Read pixel color on canvas
    try {
      const pixel = ctx.getImageData(pos.x, pos.y, 1, 1).data;
      const r = pixel[0];
      const g = pixel[1];
      const b = pixel[2];
      const hex = '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);

      if (onChangeBrushColor) {
        onChangeBrushColor(hex);
        onPushHistory(`Eyedropper sampled color: ${hex.toUpperCase()}`);
      }
    } catch (e) {
      console.warn("Could not read canvas pixel data: ", e);
    }
  };

  const handleConfirmCrop = async () => {
    if (cropBox) {
      await onCropCanvas(cropBox.w, cropBox.h, cropBox.x, cropBox.y, straightenAngle, deleteCroppedPixels, cropTargetMode);
      setCropBox(null);
      if (onSelectTool) {
        onSelectTool('move', 'move');
      }
    }
  };

  const handleSelectionCopy = () => {
    if (!selectionBox || !activeLayer || activeLayer.type !== 'image') return;

    let img = activeLayer.imageElement;
    if (!img && activeLayer.imageUrl) {
      const tempImg = new Image();
      tempImg.src = activeLayer.imageUrl;
      img = tempImg;
    }
    if (!img) return;

    // Calculate intersection between active layer bounds and selection box
    const interX = Math.round(Math.max(activeLayer.x, selectionBox.x));
    const interY = Math.round(Math.max(activeLayer.y, selectionBox.y));
    const interRight = Math.round(Math.min(activeLayer.x + activeLayer.width, selectionBox.x + selectionBox.w));
    const interBottom = Math.round(Math.min(activeLayer.y + activeLayer.height, selectionBox.y + selectionBox.h));

    if (interX < interRight && interY < interBottom) {
      const interW = interRight - interX;
      const interH = interBottom - interY;

      // Relative coordinates on the source layer display canvas
      const relX = interX - activeLayer.x;
      const relY = interY - activeLayer.y;

      // 1. Create a layer canvas at the activeLayer display resolution (activeLayer.width x activeLayer.height)
      const layerCanvas = document.createElement('canvas');
      layerCanvas.width = Math.max(1, Math.round(activeLayer.width));
      layerCanvas.height = Math.max(1, Math.round(activeLayer.height));
      const lCtx = layerCanvas.getContext('2d');
      if (!lCtx) return;

      lCtx.drawImage(img, 0, 0, layerCanvas.width, layerCanvas.height);

      // 2. Create target canvas for the extracted selection patch
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(interW));
      canvas.height = Math.max(1, Math.round(interH));
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const feather = selectionFeather || 0;
      if (feather > 0) {
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = canvas.width;
        maskCanvas.height = canvas.height;
        const mCtx = maskCanvas.getContext('2d');
        if (mCtx) {
          mCtx.fillStyle = '#ffffff';
          if (activeSubTool === 'select-ellipse') {
            mCtx.beginPath();
            mCtx.ellipse(canvas.width / 2, canvas.height / 2, canvas.width / 2, canvas.height / 2, 0, 0, Math.PI * 2);
            mCtx.fill();
          } else if (selectionPath && selectionPath.length >= 3) {
            mCtx.beginPath();
            const offsetPath = selectionPath.map(p => ({
              x: p.x - interX,
              y: p.y - interY,
            }));
            mCtx.moveTo(offsetPath[0].x, offsetPath[0].y);
            for (let i = 1; i < offsetPath.length; i++) {
              mCtx.lineTo(offsetPath[i].x, offsetPath[i].y);
            }
            mCtx.closePath();
            mCtx.fill('evenodd');
          } else {
            mCtx.fillRect(0, 0, canvas.width, canvas.height);
          }

          ctx.save();
          ctx.filter = `blur(${feather}px)`;
          ctx.drawImage(maskCanvas, 0, 0);
          ctx.restore();

          ctx.globalCompositeOperation = 'source-in';
          ctx.drawImage(
            layerCanvas,
            relX, relY, interW, interH,
            0, 0, interW, interH
          );
        }
      } else {
        if (activeSubTool === 'select-ellipse') {
          ctx.beginPath();
          ctx.ellipse(canvas.width / 2, canvas.height / 2, canvas.width / 2, canvas.height / 2, 0, 0, Math.PI * 2);
          ctx.clip();
        } else if (selectionPath && selectionPath.length >= 3) {
          ctx.beginPath();
          const offsetPath = selectionPath.map(p => ({
            x: p.x - interX,
            y: p.y - interY,
          }));
          ctx.moveTo(offsetPath[0].x, offsetPath[0].y);
          for (let i = 1; i < offsetPath.length; i++) {
            ctx.lineTo(offsetPath[i].x, offsetPath[i].y);
          }
          ctx.closePath();
          ctx.clip('evenodd');
        }

        ctx.drawImage(
          layerCanvas,
          relX, relY, interW, interH,
          0, 0, interW, interH
        );
      }

      const dataUrl = canvas.toDataURL();
      const croppedImg = new Image();
      croppedImg.onload = () => {
        onAddLayer('image', {
          name: `${activeLayer.name} (Selection)`,
          imageUrl: dataUrl,
          imageElement: croppedImg,
          x: interX,
          y: interY,
          width: interW,
          height: interH,
        });
        onPushHistory('Created new layer from lasso selection');
        handleClearSelection();
      };
      croppedImg.src = dataUrl;
    }
  };

  const handleInvertSelection = () => {
    if (!selectionBox || !project) return;
    if (selectionPath && selectionPath.length >= 3) {
      const invertedPath = [
        { x: 0, y: 0 },
        { x: project.width, y: 0 },
        { x: project.width, y: project.height },
        { x: 0, y: project.height },
        { x: 0, y: 0 },
        ...selectionPath,
        selectionPath[0]
      ];
      setSelectionPath(invertedPath);
    }
    setSelectionBox({
      x: 0,
      y: 0,
      w: project.width,
      h: project.height
    });
    onPushHistory('Inverted selection marquee');
  };

  const handleSelectionFill = () => {
    if (!selectionBox) return;

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(selectionBox.w));
    canvas.height = Math.max(1, Math.round(selectionBox.h));
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.fillStyle = brushColor;

      if (activeSubTool === 'select-ellipse') {
        ctx.beginPath();
        ctx.ellipse(canvas.width / 2, canvas.height / 2, canvas.width / 2, canvas.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (selectionPath && selectionPath.length >= 3) {
        ctx.beginPath();
        const offsetPath = selectionPath.map(p => ({
          x: p.x - selectionBox.x,
          y: p.y - selectionBox.y,
        }));
        ctx.moveTo(offsetPath[0].x, offsetPath[0].y);
        for (let i = 1; i < offsetPath.length; i++) {
          ctx.lineTo(offsetPath[i].x, offsetPath[i].y);
        }
        ctx.closePath();
        ctx.fill('evenodd');
      } else {
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      const dataUrl = canvas.toDataURL();
      const filledImg = new Image();
      filledImg.onload = () => {
        onAddLayer('image', {
          name: 'Filled Selection',
          imageUrl: dataUrl,
          imageElement: filledImg,
          x: Math.round(selectionBox.x),
          y: Math.round(selectionBox.y),
          width: Math.round(selectionBox.w),
          height: Math.round(selectionBox.h),
        });
        onPushHistory('Filled lasso selection');
        handleClearSelection();
      };
      filledImg.src = dataUrl;
    }
  };

  const handleSelectionErase = () => {
    if (!selectionBox || !activeLayer || activeLayer.locked) return;

    if (activeLayer.type === 'image') {
      let img = activeLayer.imageElement;
      if (!img && activeLayer.imageUrl) {
        const tempImg = new Image();
        tempImg.src = activeLayer.imageUrl;
        img = tempImg;
      }
      if (!img) return;

      const interX = Math.round(Math.max(activeLayer.x, selectionBox.x));
      const interY = Math.round(Math.max(activeLayer.y, selectionBox.y));
      const interRight = Math.round(Math.min(activeLayer.x + activeLayer.width, selectionBox.x + selectionBox.w));
      const interBottom = Math.round(Math.min(activeLayer.y + activeLayer.height, selectionBox.y + selectionBox.h));

      if (interX < interRight && interY < interBottom) {
        const interW = interRight - interX;
        const interH = interBottom - interY;
        const relX = interX - activeLayer.x;
        const relY = interY - activeLayer.y;

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(activeLayer.width));
        canvas.height = Math.max(1, Math.round(activeLayer.height));
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          ctx.save();
          ctx.globalCompositeOperation = 'destination-out';

          if (activeSubTool === 'select-ellipse') {
            ctx.beginPath();
            ctx.ellipse(relX + interW / 2, relY + interH / 2, interW / 2, interH / 2, 0, 0, Math.PI * 2);
            ctx.fill();
          } else if (selectionPath && selectionPath.length >= 3) {
            ctx.beginPath();
            const offsetPath = selectionPath.map(p => ({
              x: p.x - activeLayer.x,
              y: p.y - activeLayer.y,
            }));
            ctx.moveTo(offsetPath[0].x, offsetPath[0].y);
            for (let i = 1; i < offsetPath.length; i++) {
              ctx.lineTo(offsetPath[i].x, offsetPath[i].y);
            }
            ctx.closePath();
            ctx.fill('evenodd');
          } else {
            ctx.fillRect(relX, relY, interW, interH);
          }

          ctx.restore();

          const dataUrl = canvas.toDataURL();
          const updatedImg = new Image();
          updatedImg.onload = () => {
            onUpdateLayer(activeLayer.id, {
              imageElement: updatedImg,
              imageUrl: dataUrl,
            });
            onPushHistory('Erased layer pixels inside lasso selection');
            handleClearSelection();
          };
          updatedImg.src = dataUrl;
        }
      }
    } else if (activeLayer.type === 'drawing') {
      onUpdateLayer(activeLayer.id, { drawingPath: [] });
      onPushHistory('Cleared drawing paths in selection');
      handleClearSelection();
    }
  };

  const handleSelectionCrop = () => {
    if (!selectionBox) return;
    onCropCanvas(
      Math.round(selectionBox.w),
      Math.round(selectionBox.h),
      Math.round(selectionBox.x),
      Math.round(selectionBox.y),
      0,
      deleteCroppedPixels
    );
    handleClearSelection();
  };

  const getToolHelpTip = (): string => {
    switch (activeSubTool) {
      case 'move':
        return 'Move Tool: Click & drag on any layer to reposition it on the canvas.';
      case 'hand':
        return 'Hand Tool: Click & drag anywhere to pan the workspace. Hold Spacebar at any time.';
      case 'zoom':
        return 'Zoom Tool: Click to zoom in. Adjust slider below for precise sizing.';
      case 'rotate-canvas':
        return 'Rotate Canvas: Click & drag left/right to rotate the workspace view.';
      case 'select-rect':
        return 'Rectangular Marquee: Drag on canvas to select. Use toolbar below to copy/erase/fill.';
      case 'select-ellipse':
        return 'Elliptical Marquee: Drag on canvas to select circular/ellipse areas to copy/erase/fill.';
      case 'select-lasso':
        return 'Lasso Tool: Drag freeform outline on canvas to create a custom selection boundary.';
      case 'select-poly':
        return 'Polygonal Lasso: Click multiple points to trace a straight-edged custom selection outline.';
      case 'select-wand':
        return 'Magic Wand: Click on any area to automatically select adjacent pixels of similar color.';
      case 'select-quick':
        return 'Quick Selection: Paint over regions to select similar color/texture areas instantly.';
      case 'select-ai':
        return 'AI Object Selection: Click to run edge-detection and outline the active layer subject.';
      case 'crop':
        return 'Crop Tool: Adjust crop boundaries, then click the checkmark to resize the workspace.';
      case 'perspective-crop':
        return 'Perspective Crop: Cut out and correct tilted or skewed perspective lines.';
      case 'slice':
        return 'Slice Tool: Segment regions of your artwork for optimized slice exports.';
      case 'transform':
        return 'Free Transform: Drag the outer boundary anchors to scale, rotate, or distort layers.';
      case 'healing-spot':
        return 'Spot Healing Brush: Paint directly over spots or blemishes to automatically heal them instantly.';
      case 'healing-brush':
        return 'Healing Brush: Clone texture smoothly by painting blemishes into nearby pixels.';
      case 'content-aware-remove':
        return 'AI Content-Aware Remove: Paint over any object, and AI will replace it seamlessly.';
      case 'patch-tool':
        return 'Patch Tool: Draw a selection and drag it to replace blemish textures with source textures.';
      case 'stamp':
        return stampSource
          ? 'Clone Stamp: Click and drag to paint cloned pixels from the target source anchor.'
          : 'Clone Stamp: Hold ALT and click on canvas to set target clone source.';
      case 'blur':
        return 'Blur Tool: Paint over pixels to smooth details and soften edge sharpness.';
      case 'sharpen':
        return 'Sharpen Tool: Paint over pixels to enhance edge definition and details.';
      case 'smudge':
        return 'Smudge Tool: Paint over canvas to drag and smear pixel colors together.';
      case 'dodge':
        return 'Dodge Tool: Paint directly over pixels to lighten and brighten them.';
      case 'burn':
        return 'Burn Tool: Paint directly over pixels to darken and burn them.';
      case 'sponge':
        return 'Sponge Tool: Paint to saturate pixels. Hold SHIFT while painting to desaturate.';
      case 'brush':
        return 'Paint Brush: Paint smooth anti-aliased strokes with selected brush size and color.';
      case 'pencil':
        return 'Pencil Tool: Paint sharp, hard-edged pixel-perfect lines on active layer.';
      case 'mixer-brush':
        return 'Mixer Brush: Blend canvas color layers together smoothly like real wet oil paint.';
      case 'color-replacement':
        return 'Color Replacement: Paint to swap existing hues with active brush color.';
      case 'eraser':
        return 'Eraser Tool: Paint directly to erase pixels from active layer.';
      case 'background-eraser':
        return 'Background Eraser: Erase only the sampled background color, preserving foreground colors.';
      case 'magic-eraser':
        return 'Magic Eraser: Click to erase a contiguous region of matching color entirely.';
      case 'gradient':
        return 'Gradient Tool: Click and drag a line across the canvas to apply a smooth linear gradient.';
      case 'paint-bucket':
        return 'Paint Bucket: Click to fill selection marquee or active layer canvas with solid color.';
      case 'shape-rect':
        return 'Rectangle Tool: Drag to draw a vector-styled flat rectangle layer.';
      case 'shape-rounded-rect':
        return 'Rounded Rectangle: Drag to draw vector shapes with clean curved corners.';
      case 'shape-ellipse':
        return 'Ellipse Tool: Drag to draw perfect circles or oval vector shapes.';
      case 'shape-poly':
        return 'Polygon Tool: Drag to draw vector triangles or custom polygons.';
      case 'shape-line':
        return 'Line Tool: Click & drag to draw clean vector lines with custom stroke widths.';
      case 'pen':
        return 'Pen Tool: Click points to draw precise bezier curves and custom vector paths.';
      case 'freeform-pen':
        return 'Freeform Pen: Draw custom shapes freehand as editable vector paths.';
      case 'text':
        return 'Text Tool: Click anywhere on the canvas to place a new editable text layer.';
      case 'eyedropper':
        return 'Eyedropper Tool: Click and hold on canvas to sample the exact color below the cursor.';
      default:
        return 'Active Tool: Click or drag on the canvas to edit active layers.';
    }
  };

  const getCursorClass = () => {
    if (isPanning) return 'cursor-grabbing';
    if (activeSubTool === 'hand') return 'cursor-grab';
    if (activeSubTool === 'zoom-out') return 'cursor-zoom-out';
    if (activeSubTool === 'zoom' || activeSubTool === 'zoom-in') return 'cursor-zoom-in';
    if (activeSubTool === 'move') return 'cursor-move';
    if (activeTool === 'text') return 'cursor-text';
    if (activeTool === 'eyedropper') return 'cursor-none';

    const isMarquee = activeTool === 'select-rect' ||
      activeSubTool === 'select-rect' ||
      activeSubTool === 'select-ellipse' ||
      activeSubTool === 'select-row' ||
      activeSubTool === 'select-column';
    if (isMarquee && selectionBox && hoverMousePos) {
      const hoverInside = hoverMousePos.x >= selectionBox.x &&
        hoverMousePos.x <= selectionBox.x + selectionBox.w &&
        hoverMousePos.y >= selectionBox.y &&
        hoverMousePos.y <= selectionBox.y + selectionBox.h;
      if (hoverInside) {
        return 'cursor-move';
      }
    }

    if (
      activeTool === 'select-rect' ||
      activeSubTool === 'select-rect' ||
      activeSubTool === 'select-ellipse' ||
      activeSubTool === 'select-row' ||
      activeSubTool === 'select-column' ||
      activeSubTool === 'select-wand' ||
      activeSubTool === 'select-quick' ||
      activeSubTool === 'select-ai'
    ) {
      return 'cursor-crosshair';
    }
    if (
      activeTool === 'brush' ||
      activeTool === 'eraser' ||
      activeTool === 'healing' ||
      activeTool === 'stamp' ||
      activeTool === 'blur-sharpen' ||
      activeTool === 'dodge-burn'
    ) {
      return 'cursor-none';
    }
    if (activeTool === 'gradient') {
      return 'cursor-crosshair';
    }
    return 'cursor-default';
  };

  const getCustomCursorStyle = (): string | undefined => {
    if (activeTool === 'eyedropper' && !isDrawing) {
      return "url(\"data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.5'%3E%3Cpath d='m14 2 8 8' fill='%23141419' stroke='black' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='m18 6-3-3' stroke='white' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='m15 9-9 9H3v-3l9-9 3 3z' fill='%23f8fafc' stroke='black' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M3 21v-3h3' stroke='black' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\") 3 21, auto";
    }

    if (activeSubTool === 'select-poly') {
      let isNearStart = false;
      if (lassoPoints.length >= 3 && hoverMousePos) {
        const firstPt = lassoPoints[0];
        const dist = Math.sqrt(
          Math.pow(hoverMousePos.x - firstPt.x, 2) + Math.pow(hoverMousePos.y - firstPt.y, 2)
        );
        if (dist < 12) {
          isNearStart = true;
        }
      }

      if (isNearStart) {
        // Polygonal Lasso CLOSE LOOP cursor (with small 'o' circle at bottom right)
        return "url(\"data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none'%3E%3Cline x1='2' y1='0' x2='2' y2='5' stroke='%23ffffff' stroke-width='1.8'/%3E%3Cline x1='2' y1='0' x2='2' y2='5' stroke='%23000000' stroke-width='0.8'/%3E%3Cline x1='0' y1='2' x2='5' y2='2' stroke='%23ffffff' stroke-width='1.8'/%3E%3Cline x1='0' y1='2' x2='5' y2='2' stroke='%23000000' stroke-width='0.8'/%3E%3Cpolygon points='7,7 16,9 20,18 11,20 6,14' stroke='%23ffffff' stroke-width='2.2' stroke-linejoin='round' fill='%236366f1' fill-opacity='0.4'/%3E%3Cpolygon points='7,7 16,9 20,18 11,20 6,14' stroke='%23000000' stroke-width='1' stroke-linejoin='round' fill='none'/%3E%3Ccircle cx='7' cy='7' r='1.2' fill='%23ffffff' stroke='%23000000' stroke-width='0.6'/%3E%3Ccircle cx='16' cy='9' r='1.2' fill='%23ffffff' stroke='%23000000' stroke-width='0.6'/%3E%3Ccircle cx='20' cy='18' r='1.2' fill='%23ffffff' stroke='%23000000' stroke-width='0.6'/%3E%3Ccircle cx='11' cy='20' r='1.2' fill='%23ffffff' stroke='%23000000' stroke-width='0.6'/%3E%3Ccircle cx='6' cy='14' r='1.2' fill='%23ffffff' stroke='%23000000' stroke-width='0.6'/%3E%3Ccircle cx='19' cy='19' r='3.5' stroke='%23ffffff' stroke-width='1.5' fill='%236366f1'/%3E%3Ccircle cx='19' cy='19' r='3.5' stroke='%23000000' stroke-width='0.8' fill='none'/%3E%3C/svg%3E\") 2 2, crosshair";
      }

      // Standard Photoshop-style Polygonal Lasso cursor
      return "url(\"data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none'%3E%3Cline x1='2' y1='0' x2='2' y2='5' stroke='%23ffffff' stroke-width='1.8'/%3E%3Cline x1='2' y1='0' x2='2' y2='5' stroke='%23000000' stroke-width='0.8'/%3E%3Cline x1='0' y1='2' x2='5' y2='2' stroke='%23ffffff' stroke-width='1.8'/%3E%3Cline x1='0' y1='2' x2='5' y2='2' stroke='%23000000' stroke-width='0.8'/%3E%3Cpolygon points='7,7 16,9 20,18 11,20 6,14' stroke='%23ffffff' stroke-width='2.2' stroke-linejoin='round' fill='%236366f1' fill-opacity='0.3'/%3E%3Cpolygon points='7,7 16,9 20,18 11,20 6,14' stroke='%23000000' stroke-width='1' stroke-linejoin='round' fill='none'/%3E%3Ccircle cx='7' cy='7' r='1.2' fill='%23ffffff' stroke='%23000000' stroke-width='0.6'/%3E%3Ccircle cx='16' cy='9' r='1.2' fill='%23ffffff' stroke='%23000000' stroke-width='0.6'/%3E%3Ccircle cx='20' cy='18' r='1.2' fill='%23ffffff' stroke='%23000000' stroke-width='0.6'/%3E%3Ccircle cx='11' cy='20' r='1.2' fill='%23ffffff' stroke='%23000000' stroke-width='0.6'/%3E%3Ccircle cx='6' cy='14' r='1.2' fill='%23ffffff' stroke='%23000000' stroke-width='0.6'/%3E%3C/svg%3E\") 2 2, crosshair";
    }

    if (activeSubTool === 'select-lasso' || activeTool === 'select-lasso') {
      // Standard Freehand Lasso cursor
      return "url(\"data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none'%3E%3Cline x1='2' y1='0' x2='2' y2='5' stroke='%23ffffff' stroke-width='1.8'/%3E%3Cline x1='2' y1='0' x2='2' y2='5' stroke='%23000000' stroke-width='0.8'/%3E%3Cline x1='0' y1='2' x2='5' y2='2' stroke='%23ffffff' stroke-width='1.8'/%3E%3Cline x1='0' y1='2' x2='5' y2='2' stroke='%23000000' stroke-width='0.8'/%3E%3Cpath d='M 7 7 C 12 4 18 8 19 14 C 20 20 12 21 8 17 C 5 13 8 9 13 11 C 16 12 16 16 13 16' stroke='%23ffffff' stroke-width='2.2' stroke-linecap='round' fill='none'/%3E%3Cpath d='M 7 7 C 12 4 18 8 19 14 C 20 20 12 21 8 17 C 5 13 8 9 13 11 C 16 12 16 16 13 16' stroke='%23000000' stroke-width='1' stroke-linecap='round' fill='none'/%3E%3C/svg%3E\") 2 2, crosshair";
    }

    if (activeSubTool === 'select-magnetic') {
      // Magnetic Lasso cursor with magnet badge
      return "url(\"data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none'%3E%3Cline x1='2' y1='0' x2='2' y2='5' stroke='%23ffffff' stroke-width='1.8'/%3E%3Cline x1='2' y1='0' x2='2' y2='5' stroke='%23000000' stroke-width='0.8'/%3E%3Cline x1='0' y1='2' x2='5' y2='2' stroke='%23ffffff' stroke-width='1.8'/%3E%3Cline x1='0' y1='2' x2='5' y2='2' stroke='%23000000' stroke-width='0.8'/%3E%3Cpath d='M 6 8 C 10 5 15 9 16 14 C 17 19 10 20 7 16' stroke='%23ffffff' stroke-width='2.2' stroke-linecap='round' fill='none'/%3E%3Cpath d='M 6 8 C 10 5 15 9 16 14 C 17 19 10 20 7 16' stroke='%23000000' stroke-width='1' stroke-linecap='round' fill='none'/%3E%3Cpath d='M 16 14 L 16 18 C 16 20 20 20 20 18 L 20 14' stroke='%23ffffff' stroke-width='2.2' stroke-linecap='round' fill='none'/%3E%3Cpath d='M 16 14 L 16 18 C 16 20 20 20 20 18 L 20 14' stroke='%23f59e0b' stroke-width='1' stroke-linecap='round' fill='none'/%3E%3C/svg%3E\") 2 2, crosshair";
    }

    return undefined;
  };

  // Drag and Drop from Internet / Browser / Local File state
  const [isDragOverWorkspace, setIsDragOverWorkspace] = useState(false);
  const dragCounterRef = useRef(0);

  const handleWorkspaceDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (
      e.dataTransfer.types &&
      (e.dataTransfer.types.includes('Files') ||
        e.dataTransfer.types.includes('text/uri-list') ||
        e.dataTransfer.types.includes('text/html') ||
        e.dataTransfer.types.includes('text/plain') ||
        e.dataTransfer.types.includes('URL'))
    ) {
      setIsDragOverWorkspace(true);
    }
  };

  const handleWorkspaceDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    if (!isDragOverWorkspace) setIsDragOverWorkspace(true);
  };

  const handleWorkspaceDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragOverWorkspace(false);
    }
  };

  const loadAndAddImageToCanvas = (imgSrc: string, name: string, blob?: Blob) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const naturalW = img.naturalWidth || img.width || 1200;
      const naturalH = img.naturalHeight || img.height || 800;
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

      // Center image on canvas
      const posX = Math.round((canvasW - targetW) / 2);
      const posY = Math.round((canvasH - targetH) / 2);

      onAddLayer('image', {
        name: name || 'Dropped Image',
        imageUrl: imgSrc,
        imageBlob: blob,
        imageElement: img,
        width: targetW,
        height: targetH,
        x: posX,
        y: posY,
      });

      onPushHistory(`Dropped Image: ${name}`);
      if (setToast) {
        setToast({ message: `Image "${name}" added to Canvas (${naturalW}×${naturalH} px)!`, type: 'success' });
      }
    };
    img.onerror = () => {
      if (setToast) {
        setToast({ message: 'Could not load dropped image from internet.', type: 'error' });
      }
    };
    img.src = imgSrc;
  };

  const processImageFileOrUrl = (source: File | string, defaultName: string) => {
    if (!project) return;
    if (setToast) {
      setToast({ message: 'Processing dropped image...', type: 'info' });
    }

    if (source instanceof File) {
      const objectUrl = URL.createObjectURL(source);
      loadAndAddImageToCanvas(objectUrl, source.name, source);
    } else {
      const urlStr = source;
      if (urlStr.startsWith('data:image/')) {
        loadAndAddImageToCanvas(urlStr, defaultName);
        return;
      }

      // Try fetching as Blob first to bypass cross-origin restrictions when rendering/exporting
      fetch(urlStr)
        .then((res) => res.blob())
        .then((blob) => {
          const localBlobUrl = URL.createObjectURL(blob);
          loadAndAddImageToCanvas(localBlobUrl, defaultName, blob);
        })
        .catch(() => {
          // Fallback if fetch fails (e.g. CORS): load image directly via Image src
          loadAndAddImageToCanvas(urlStr, defaultName);
        });
    }
  };

  const handleWorkspaceDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragOverWorkspace(false);

    // 1. Local files dropped from computer
    const files: File[] = e.dataTransfer.files ? Array.from(e.dataTransfer.files) : [];
    const imageFiles = files.filter((f) => f.type.startsWith('image/'));

    if (imageFiles.length > 0) {
      imageFiles.forEach((file) => {
        processImageFileOrUrl(file, file.name);
      });
      return;
    }

    // 2. Internet / Web image dropped from browser tab / website
    let imageUrl = e.dataTransfer.getData('text/uri-list');
    if (!imageUrl) {
      imageUrl = e.dataTransfer.getData('URL');
    }
    if (!imageUrl) {
      const plainText = e.dataTransfer.getData('text/plain');
      if (plainText && (plainText.startsWith('http://') || plainText.startsWith('https://') || plainText.startsWith('data:image/'))) {
        imageUrl = plainText.trim();
      }
    }
    if (!imageUrl) {
      const htmlText = e.dataTransfer.getData('text/html');
      if (htmlText) {
        const match = htmlText.match(/src=["'](https?:\/\/[^"']+|data:image\/[^"']+)["']/i);
        if (match && match[1]) {
          imageUrl = match[1];
        }
      }
    }

    if (imageUrl) {
      const firstUrl = imageUrl
        .split('\n')
        .map((s) => s.trim())
        .find((s) => s && !s.startsWith('#'));
      if (firstUrl) {
        processImageFileOrUrl(firstUrl, 'Web Image');
        return;
      }
    }

    if (files.length > 0 && imageFiles.length === 0) {
      if (setToast) setToast({ message: 'Only image files or web images can be added to canvas.', type: 'error' });
    }
  };

  return (
    <div
      className="flex-1 flex flex-col bg-[#0a0a0d] relative overflow-hidden select-none"
      onDragEnter={handleWorkspaceDragEnter}
      onDragOver={handleWorkspaceDragOver}
      onDragLeave={handleWorkspaceDragLeave}
      onDrop={handleWorkspaceDrop}
    >

      {/* Top bar controls (Zoom details & shortcuts) */}
      <div className="flex items-center justify-between px-6 py-2 border-b border-[#24242c] bg-[#111115] z-10 text-xs">
        <div className="flex items-center gap-3">
          <span className="text-gray-400 font-mono">Workspace Canvas:</span>
          <span className="font-bold text-indigo-400 font-mono">
            {project.width} × {project.height} px
          </span>
          <span className="text-gray-500 font-mono">•</span>
          <span className="text-gray-400 font-mono">Zoom: {Math.round(zoom * 100)}%</span>
        </div>

        {/* View helpers */}
        <div className="flex items-center gap-2 bg-[#1a1a24] px-3 py-1 rounded-lg border border-[#242432]">
          <button
            onClick={handleZoomOut}
            className="p-1 hover:bg-[#252535] text-gray-400 hover:text-white rounded cursor-pointer transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <input
            type="range"
            min="0.1"
            max="3"
            step="0.05"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="w-16 accent-indigo-500 h-1 bg-[#101015] cursor-pointer"
            title="Zoom slider"
          />

          <button
            onClick={handleZoomIn}
            className="p-1 hover:bg-[#252535] text-gray-400 hover:text-white rounded cursor-pointer transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-3 bg-[#2c2c3a] mx-1" />

          <button
            onClick={handleResetZoom}
            className="px-2 py-0.5 bg-[#22222f] hover:bg-[#2a2a3f] text-gray-200 font-bold rounded text-[10px] font-mono transition-colors cursor-pointer"
            title="Reset to 100%"
          >
            100%
          </button>

          <button
            onClick={() => setPan({ x: 0, y: 0 })}
            className="px-2 py-0.5 bg-[#22222f] hover:bg-[#2a2a3f] text-gray-400 hover:text-white rounded text-[10px] font-mono transition-colors cursor-pointer"
            title="Reset Pan Center"
          >
            Reset Pan
          </button>

          {viewportRotation !== 0 && (
            <button
              onClick={() => setViewportRotation(0)}
              className="px-2 py-0.5 bg-[#22222f] hover:bg-[#2a2a3f] text-indigo-400 hover:text-indigo-300 rounded text-[10px] font-mono transition-colors cursor-pointer"
              title="Reset View Rotation to 0°"
            >
              Reset 0°
            </button>
          )}
        </div>
      </div>

      {/* Rulers and Viewport Container Grid */}
      <div className="flex-1 flex flex-col overflow-hidden relative w-full h-full bg-[#0a0a0d]">
        {/* Top Ruler Row */}
        {showRulers && (
          <div className="flex flex-row h-5 w-full shrink-0 border-b border-[#181819] z-20 bg-[#1e1e1f]">
            <div className="w-5 h-5 bg-[#1e1e1f] border-r border-[#181819] shrink-0" />
            <RulerBar
              type="horizontal"
              zoom={zoom}
              pan={pan.x}
              canvasSize={project.width}
              onAddGuide={(pos) => {
                const newGuides = [...(project.guides || []), { id: Date.now().toString(), type: 'h' as const, position: pos }];
                if (onUpdateProject) onUpdateProject({ guides: newGuides });
              }}
            />
          </div>
        )}

        {/* Bottom Content Row */}
        <div className="flex flex-row flex-1 w-full overflow-hidden">
          {/* Left Vertical Ruler */}
          {showRulers && (
            <div className="w-5 h-full shrink-0 border-r border-[#181819] z-20 bg-[#1e1e1f]">
              <RulerBar
                type="vertical"
                zoom={zoom}
                pan={pan.y}
                canvasSize={project.height}
                onAddGuide={(pos) => {
                  const newGuides = [...(project.guides || []), { id: Date.now().toString(), type: 'v' as const, position: pos }];
                  if (onUpdateProject) onUpdateProject({ guides: newGuides });
                }}
              />
            </div>
          )}

          {/* Main Canvas Container Drag Workspace Stage */}
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onDoubleClick={handleDoubleClick}
            onMouseLeave={() => {
              if (onMouseMoveCoords) onMouseMoveCoords(null);
              setHoverMousePos(null);
              if (customCursorRef.current) {
                customCursorRef.current.style.display = 'none';
              }
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              const mousePos = getCanvasCoords(e);
              if (onContextMenuCoords) {
                onContextMenuCoords(mousePos, { x: e.clientX, y: e.clientY });
              }
            }}
            className={`flex-1 flex items-center justify-center relative p-8 overflow-hidden ${getCursorClass()}`}
            style={{
              backgroundImage: 'radial-gradient(circle, #1a1a24 1px, transparent 1.5px)',
              backgroundSize: '24px 24px',
              cursor: getCustomCursorStyle()
            }}
          >
            {/* Custom cursor element */}
            <div
              ref={customCursorRef}
              style={{
                position: 'absolute',
                pointerEvents: 'none',
                display: 'none',
                border: '1.2px solid white',
                borderRadius: '50%',
                mixBlendMode: 'difference',
                zIndex: 9999,
                transform: 'translate3d(-50%, -50%, 0)',
                boxShadow: '0 0 2px rgba(0,0,0,0.4)',
              }}
            />

            {/* Floating HUD Tool Help Tip */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-[#0d0d12]/90 backdrop-blur-md border border-[#2d2d3a]/60 px-4 py-2 rounded-full text-[11px] text-gray-300 flex items-center gap-2.5 shadow-2xl select-none max-w-[90%] md:max-w-[70%] transition-all duration-300">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse shrink-0" />
              <span className="font-medium font-sans truncate">{aiStatus || getToolHelpTip()}</span>
            </div>

            <div
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${viewportRotation}deg)`,
                transformOrigin: 'center center',
                transition: isPanning || isRotatingCanvas ? 'none' : 'transform 0.1s cubic-bezier(0.1, 0.8, 0.2, 1)',
              }}
              className="relative shadow-2xl bg-black border border-[#22222a]"
            >
              {/* GUIDELINES RENDERING (PHOTOSHOP GUIDES) */}
              {showGuides && project.guides && project.guides.map((guide) => (
                <div
                  key={guide.id}
                  style={{
                    position: 'absolute',
                    left: guide.type === 'v' ? `${guide.position}px` : 0,
                    top: guide.type === 'h' ? `${guide.position}px` : 0,
                    width: guide.type === 'v' ? '1px' : '100%',
                    height: guide.type === 'h' ? '1px' : '100%',
                    backgroundColor: '#00c8ff',
                    cursor: guide.type === 'v' ? 'col-resize' : 'row-resize',
                    zIndex: 35,
                  }}
                  className="pointer-events-auto"
                  title="Double click to remove guideline"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    const newGuides = (project.guides || []).filter((g) => g.id !== guide.id);
                    if (onUpdateProject) onUpdateProject({ guides: newGuides });
                  }}
                />
              ))}

              {/* SMART ALIGNMENT SNAPPING GUIDELINES */}
              {alignmentLines.map((line, idx) => (
                <div
                  key={`snap-guide-${idx}`}
                  style={{
                    position: 'absolute',
                    left: line.type === 'v' ? `${line.position}px` : 0,
                    top: line.type === 'h' ? `${line.position}px` : 0,
                    width: line.type === 'v' ? '1.5px' : '100%',
                    height: line.type === 'h' ? '1.5px' : '100%',
                    backgroundColor: '#ff00ff',
                    zIndex: 38,
                    pointerEvents: 'none',
                    boxShadow: '0 0 2.5px rgba(255, 0, 255, 0.75)',
                  }}
                />
              ))}

              {/* Main Rendering Canvas */}
              <canvas
                ref={canvasRef}
                id="workspace-canvas"
                width={project.width}
                height={project.height}
                className="block max-w-none shadow-xl select-none pointer-events-none"
              />

              {/* GRID OVERLAY (SVG – persistent, not painted on canvas) */}
              {gridSettings.enabled && (
                <svg
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: project.width,
                    height: project.height,
                    pointerEvents: 'none',
                    zIndex: 10,
                  }}
                  viewBox={`0 0 ${project.width} ${project.height}`}
                  preserveAspectRatio="none"
                >
                  <defs>
                    <pattern
                      id="grid-pattern"
                      width={gridSettings.size}
                      height={gridSettings.size}
                      patternUnits="userSpaceOnUse"
                    >
                      <path
                        d={`M ${gridSettings.size} 0 L 0 0 0 ${gridSettings.size}`}
                        fill="none"
                        stroke={gridSettings.color}
                        strokeWidth="0.5"
                        strokeOpacity={gridSettings.opacity}
                      />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid-pattern)" />
                </svg>
              )}

              {/* FLOATING TEXT EDITOR OVERLAY */}
              {editingTextLayerId && (() => {
                const layer = project.layers.find(l => l.id === editingTextLayerId);
                if (!layer || layer.type !== 'text') return null;

                const lines = (layer.text || '').split('\n');
                const fontSize = layer.fontSize || 24;
                const lineHeightMultiplier = layer.lineHeightMultiplier || 1.25;
                const lineHeight = fontSize * lineHeightMultiplier;
                const totalHeight = lines.length * lineHeight;
                
                // Align vertical padding to match canvas middle baseline centering
                const topPadding = Math.max(0, (layer.height - totalHeight) / 2);

                return (
                  <textarea
                    autoFocus
                    value={layer.text}
                    onChange={(e) => {
                      onUpdateLayer(layer.id, { text: e.target.value });
                    }}
                    onBlur={() => {
                      setEditingTextLayerId(null);
                      onPushHistory('Edited Text Layer');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        e.preventDefault();
                        e.currentTarget.blur();
                      }
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                        e.currentTarget.blur();
                      }
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onMouseMove={(e) => e.stopPropagation()}
                    onMouseUp={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    onDoubleClick={(e) => e.stopPropagation()}
                    style={{
                      position: 'absolute',
                      left: `${layer.x}px`,
                      top: `${layer.y}px`,
                      width: `${layer.width}px`,
                      height: `${layer.height}px`,
                      transform: `rotate(${layer.rotation || 0}deg)`,
                      transformOrigin: 'center center',
                      fontSize: `${fontSize}px`,
                      fontFamily: layer.fontFamily || 'Inter',
                      fontWeight: layer.fontWeight || 'normal',
                      fontStyle: layer.fontStyle || 'normal',
                      color: layer.textColor || '#ffffff',
                      textAlign: (layer.textAlign as any) || 'left',
                      background: 'transparent',
                      border: '1.5px solid #818cf8',
                      boxShadow: '0 0 4px rgba(129, 140, 248, 0.4)',
                      outline: 'none',
                      resize: 'none',
                      overflow: 'hidden',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      zIndex: 100,
                      lineHeight: `${lineHeightMultiplier}`,
                      paddingTop: `${topPadding}px`,
                      paddingBottom: '0px',
                      paddingLeft: '0px',
                      paddingRight: '0px',
                      margin: '0px',
                      WebkitFontSmoothing: 'antialiased',
                      MozOsxFontSmoothing: 'grayscale',
                    }}
                  />
                );
              })()}

              {/* LAYER TRANSFORM BOUNDING BOX (FOR MOVE TOOL & TRANSFORM) */}
              {(activeTool === 'move' || activeSubTool === 'transform') && activeLayer && !activeLayer.locked && editingTextLayerId !== activeLayer.id && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${activeLayer.x}px`,
                    top: `${activeLayer.y}px`,
                    width: `${activeLayer.width}px`,
                    height: `${activeLayer.height}px`,
                    transform: `rotate(${activeLayer.rotation}deg)`,
                    transformOrigin: 'center center',
                  }}
                  className="border border-indigo-500 pointer-events-none z-20 shadow-sm"
                >
                  {/* Top Rotation Extension Stem & Pin Handle */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '-28px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      cursor: transformHandle === 'rotate' ? 'grabbing' : 'grab',
                      zIndex: 50,
                    }}
                    className="pointer-events-auto group"
                    onMouseDown={(e) => handleHandleMouseDown(e, 'rotate')}
                    title="Click & Drag to rotate object (Hold Shift to snap to 15°)"
                  >
                    {/* Top Knob Handle Circle */}
                    <div className="w-3.5 h-3.5 bg-indigo-500 border-2 border-white rounded-full shadow-md group-hover:scale-125 group-hover:bg-indigo-400 transition-all flex items-center justify-center">
                      <div className="w-1 h-1 bg-white rounded-full" />
                    </div>
                    {/* Vertical Connecting Stem Line */}
                    <div className="w-[1.5px] h-3.5 bg-indigo-500 shadow-sm" />
                  </div>

                  {/* Corner Handles */}
                  <div
                    onMouseDown={(e) => handleHandleMouseDown(e, 'nw')}
                    className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-indigo-600 rounded-full cursor-nwse-resize pointer-events-auto hover:scale-125 transition-transform"
                    title="Resize top-left"
                  />
                  <div
                    onMouseDown={(e) => handleHandleMouseDown(e, 'ne')}
                    className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-indigo-600 rounded-full cursor-nesw-resize pointer-events-auto hover:scale-125 transition-transform"
                    title="Resize top-right"
                  />
                  <div
                    onMouseDown={(e) => handleHandleMouseDown(e, 'sw')}
                    className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-indigo-600 rounded-full cursor-nesw-resize pointer-events-auto hover:scale-125 transition-transform"
                    title="Resize bottom-left"
                  />
                  <div
                    onMouseDown={(e) => handleHandleMouseDown(e, 'se')}
                    className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-indigo-600 rounded-full cursor-nwse-resize pointer-events-auto hover:scale-125 transition-transform"
                    title="Resize bottom-right"
                  />
                </div>
              )}

              {/* CROP INTERACTIVE OVERLAY BOX */}
              {activeTool === 'crop' && cropBox && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${cropBox.x}px`,
                    top: `${cropBox.y}px`,
                    width: `${cropBox.w}px`,
                    height: `${cropBox.h}px`,
                    transform: `rotate(${straightenAngle}deg)`,
                    transformOrigin: 'center center',
                  }}
                  className="border-2 border-[#10b981] bg-black/25 z-30 pointer-events-none"
                >
                  {/* Grid Lines */}
                  <div className="absolute inset-0 pointer-events-none opacity-40">
                    {cropGridOverlay === 'thirds' ? (
                      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
                        <div className="border-r border-b border-white/40" />
                        <div className="border-r border-b border-white/40" />
                        <div className="border-b border-white/40" />
                        <div className="border-r border-b border-white/40" />
                        <div className="border-r border-b border-white/40" />
                        <div className="border-b border-white/40" />
                        <div className="border-r border-white/40" />
                        <div className="border-r border-white/40" />
                        <div className="border-0" />
                      </div>
                    ) : (
                      <>
                        <div className="absolute top-0 bottom-0 left-[38.2%] border-r border-white/40" />
                        <div className="absolute top-0 bottom-0 left-[61.8%] border-r border-white/40" />
                        <div className="absolute left-0 right-0 top-[38.2%] border-b border-white/40" />
                        <div className="absolute left-0 right-0 top-[61.8%] border-b border-white/40" />
                      </>
                    )}
                  </div>

                  {/* Photoshop-style crop handles (Corners and Edges) */}
                  {/* Corners */}
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-t-[3px] border-l-[3px] border-white pointer-events-none" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 border-t-[3px] border-r-[3px] border-white pointer-events-none" />
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-[3px] border-l-[3px] border-white pointer-events-none" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-[3px] border-r-[3px] border-white pointer-events-none" />

                  {/* Edges */}
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-5 h-[3px] bg-white pointer-events-none" />
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-[3px] bg-white pointer-events-none" />
                  <div className="absolute top-1/2 -translate-y-1/2 -left-1 w-[3px] h-5 bg-white pointer-events-none" />
                  <div className="absolute top-1/2 -translate-y-1/2 -right-1 w-[3px] h-5 bg-white pointer-events-none" />

                  {/* Highlight confirmation */}
                  <div className="absolute bottom-4 right-4 flex gap-1.5 pointer-events-auto">
                    <button
                      onClick={handleConfirmCrop}
                      className="p-1.5 bg-emerald-600 hover:bg-emerald-500 rounded text-white shadow-md cursor-pointer transition-colors"
                      title="Confirm Crop"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCropBox(null)}
                      className="p-1.5 bg-red-600 hover:bg-red-500 rounded text-white shadow-md cursor-pointer transition-colors"
                      title="Cancel Crop"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* PERSPECTIVE CROP INTERACTIVE OVERLAY BOX */}
              {activeTool === 'crop' && activeSubTool === 'perspective-crop' && perspectivePoints && perspectivePoints.length === 4 && (
                <>
                  {/* SVG containing the grid and connecting lines */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-30">
                    {/* Outer quadrilateral border */}
                    <polygon
                      points={perspectivePoints.map((p) => `${p.x},${p.y}`).join(' ')}
                      fill="rgba(16, 185, 129, 0.04)"
                      stroke="#10b981"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                    />

                    {/* Perspective 3x3 Grid Lines */}
                    {(() => {
                      const [p0, p1, p2, p3] = perspectivePoints;
                      const lines = [];

                      // Draw 2 vertical perspective lines (t = 1/3, t = 2/3)
                      for (let i = 1; i <= 2; i++) {
                        const t = i / 3;
                        const topPt = {
                          x: p0.x + (p1.x - p0.x) * t,
                          y: p0.y + (p1.y - p0.y) * t,
                        };
                        const bottomPt = {
                          x: p3.x + (p2.x - p3.x) * t,
                          y: p3.y + (p2.y - p3.y) * t,
                        };
                        lines.push(
                          <line
                            key={`v-${i}`}
                            x1={topPt.x}
                            y1={topPt.y}
                            x2={bottomPt.x}
                            y2={bottomPt.y}
                            stroke="rgba(16, 185, 129, 0.35)"
                            strokeWidth="1"
                          />
                        );
                      }

                      // Draw 2 horizontal perspective lines (t = 1/3, t = 2/3)
                      for (let i = 1; i <= 2; i++) {
                        const t = i / 3;
                        const leftPt = {
                          x: p0.x + (p3.x - p0.x) * t,
                          y: p0.y + (p3.y - p0.y) * t,
                        };
                        const rightPt = {
                          x: p1.x + (p2.x - p1.x) * t,
                          y: p1.y + (p2.y - p1.y) * t,
                        };
                        lines.push(
                          <line
                            key={`h-${i}`}
                            x1={leftPt.x}
                            y1={leftPt.y}
                            x2={rightPt.x}
                            y2={rightPt.y}
                            stroke="rgba(16, 185, 129, 0.35)"
                            strokeWidth="1"
                          />
                        );
                      }

                      return lines;
                    })()}

                    {/* Handles visualization */}
                    {perspectivePoints.map((pt, idx) => (
                      <circle
                        key={idx}
                        cx={pt.x}
                        cy={pt.y}
                        r="6"
                        fill="#ffffff"
                        stroke="#10b981"
                        strokeWidth="2.5"
                        className="pointer-events-auto cursor-move hover:scale-125 transition-transform shadow"
                        style={{ transformOrigin: 'center' }}
                      />
                    ))}
                  </svg>

                  {/* Floating Toolbar to confirm/cancel */}
                  <div
                    style={{
                      position: 'absolute',
                      left: `${(perspectivePoints[0].x + perspectivePoints[1].x + perspectivePoints[2].x + perspectivePoints[3].x) / 4}px`,
                      top: `${Math.max(...perspectivePoints.map((p) => p.y)) + 15}px`,
                      transform: 'translateX(-50%)',
                    }}
                    className="z-40 bg-[#121218]/95 border border-[#2d2d3c] text-white p-1.5 rounded-lg shadow-2xl flex items-center gap-1.5 text-[10px] select-none backdrop-blur-md pointer-events-auto animate-in fade-in zoom-in duration-100"
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => {
                        if (onPerspectiveCrop && perspectivePoints) {
                          onPerspectiveCrop(perspectivePoints);
                          setPerspectivePoints(null);
                          if (onSelectTool) onSelectTool('move', 'move');
                        }
                      }}
                      className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold cursor-pointer transition-colors flex items-center gap-1 font-sans"
                    >
                      <Check className="w-3 h-3" />
                      Warp Active Layer
                    </button>
                    <button
                      onClick={() => setPerspectivePoints(null)}
                      className="px-2 py-1 bg-red-950/40 border border-red-900/30 hover:bg-red-900/50 text-red-300 rounded cursor-pointer transition-colors flex items-center gap-1 font-sans"
                    >
                      <X className="w-3 h-3" />
                      Cancel
                    </button>
                  </div>
                </>
              )}

              {/* GRADIENT DRAG VECTOR — Photoshop-style interactive overlay */}
              {activeTool === 'gradient' && gradientStart && gradientEnd && (() => {
                const dx = gradientEnd.x - gradientStart.x;
                const dy = gradientEnd.y - gradientStart.y;
                const len = Math.sqrt(dx * dx + dy * dy);
                const angle = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
                const stops = getGradientStops();
                const startColor = stops[0]?.color ?? brushColor;
                const endColor = stops[stops.length - 1]?.color ?? gradientEndColor;
                // Perpendicular tick direction
                const nx = -dy / Math.max(1, len);
                const ny = dx / Math.max(1, len);
                const TICK = 10;
                return (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-30" style={{ overflow: 'visible' }}>
                    <defs>
                      <linearGradient id="grad-line-color" x1="0%" y1="0%" x2="100%" y2="0%">
                        {stops.map((s, i) => (
                          <stop key={i} offset={`${Math.round(s.offset * 100)}%`} stopColor={s.color} />
                        ))}
                      </linearGradient>
                      <filter id="grad-shadow">
                        <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="black" floodOpacity="0.6" />
                      </filter>
                    </defs>

                    {/* Main gradient line — white outline for visibility */}
                    <line
                      x1={gradientStart.x} y1={gradientStart.y}
                      x2={gradientEnd.x} y2={gradientEnd.y}
                      stroke="rgba(0,0,0,0.5)" strokeWidth="4" strokeLinecap="round"
                    />
                    <line
                      x1={gradientStart.x} y1={gradientStart.y}
                      x2={gradientEnd.x} y2={gradientEnd.y}
                      stroke="white" strokeWidth="2" strokeLinecap="round"
                      strokeDasharray="none" filter="url(#grad-shadow)"
                    />

                    {/* Start tick */}
                    <line
                      x1={gradientStart.x + nx * TICK} y1={gradientStart.y + ny * TICK}
                      x2={gradientStart.x - nx * TICK} y2={gradientStart.y - ny * TICK}
                      stroke="black" strokeWidth="3" strokeLinecap="round"
                    />
                    <line
                      x1={gradientStart.x + nx * TICK} y1={gradientStart.y + ny * TICK}
                      x2={gradientStart.x - nx * TICK} y2={gradientStart.y - ny * TICK}
                      stroke="white" strokeWidth="1.5" strokeLinecap="round"
                    />

                    {/* End tick */}
                    <line
                      x1={gradientEnd.x + nx * TICK} y1={gradientEnd.y + ny * TICK}
                      x2={gradientEnd.x - nx * TICK} y2={gradientEnd.y - ny * TICK}
                      stroke="black" strokeWidth="3" strokeLinecap="round"
                    />
                    <line
                      x1={gradientEnd.x + nx * TICK} y1={gradientEnd.y + ny * TICK}
                      x2={gradientEnd.x - nx * TICK} y2={gradientEnd.y - ny * TICK}
                      stroke="white" strokeWidth="1.5" strokeLinecap="round"
                    />

                    {/* Start circle handle */}
                    <circle cx={gradientStart.x} cy={gradientStart.y} r="7" fill="black" opacity="0.4" />
                    <circle cx={gradientStart.x} cy={gradientStart.y} r="6" fill={startColor} stroke="white" strokeWidth="2" filter="url(#grad-shadow)" />
                    <circle cx={gradientStart.x} cy={gradientStart.y} r="2" fill="white" opacity="0.8" />

                    {/* End circle handle */}
                    <circle cx={gradientEnd.x} cy={gradientEnd.y} r="7" fill="black" opacity="0.4" />
                    <circle cx={gradientEnd.x} cy={gradientEnd.y} r="6" fill={endColor} stroke="white" strokeWidth="2" filter="url(#grad-shadow)" />
                    {/* Square marker on end */}
                    <rect
                      x={gradientEnd.x - 4} y={gradientEnd.y - 4} width="8" height="8"
                      fill="none" stroke="white" strokeWidth="1.5"
                      transform={`rotate(${angle},${gradientEnd.x},${gradientEnd.y})`}
                    />

                    {/* Angle + length readout */}
                    {len > 20 && (
                      <g transform={`translate(${gradientEnd.x + 12},${gradientEnd.y - 8})`}>
                        <rect x="-2" y="-10" width="68" height="26" rx="3" fill="rgba(0,0,0,0.7)" />
                        <text fill="white" fontSize="10" fontFamily="monospace" dy="0">
                          {gradientType}
                        </text>
                        <text fill="#a5b4fc" fontSize="9" fontFamily="monospace" dy="12">
                          {Math.round(angle)}° · {Math.round(len)}px
                        </text>
                      </g>
                    )}
                  </svg>
                );
              })()}

              {/* PEN TOOL INTERACTIVE SVG OVERLAY */}
              {activeSubTool === 'pen' && penPoints.length > 0 && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-30">
                  <polyline
                    points={penPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                    fill="none"
                    stroke={shapeStrokeColor}
                    strokeWidth={shapeStrokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {hoverMousePos && (
                    <line
                      x1={penPoints[penPoints.length - 1].x}
                      y1={penPoints[penPoints.length - 1].y}
                      x2={hoverMousePos.x}
                      y2={hoverMousePos.y}
                      stroke={shapeStrokeColor}
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                      opacity="0.75"
                    />
                  )}
                  {penPoints.map((pt, idx) => {
                    const isFirst = idx === 0;
                    return (
                      <circle
                        key={idx}
                        cx={pt.x}
                        cy={pt.y}
                        r={isFirst ? '5.5' : '4.5'}
                        fill={isFirst ? '#10b981' : '#6366f1'}
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                    );
                  })}
                </svg>
              )}

              {/* FREEFORM PEN LIVE SVG OVERLAY */}
              {activeSubTool === 'freeform-pen' && freeformPoints.length > 0 && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-30">
                  <polyline
                    points={freeformPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                    fill="none"
                    stroke={brushColor}
                    strokeWidth={brushSize}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}

              {/* LASSO & POLY LASSO & QUICK SELECT SVG OVERLAY */}
              {((lassoPoints && lassoPoints.length > 0) || (selectionPath && selectionPath.length > 0)) && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-30">
                  {/* Draft/active lasso line */}
                  {lassoPoints && lassoPoints.length > 1 && (
                    <polyline
                      points={lassoPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                      fill={activeSubTool === 'select-quick' ? 'none' : 'rgba(99, 102, 241, 0.08)'}
                      stroke="#6366f1"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="marching-ants-svg-path"
                    />
                  )}
                  {/* Finalized selection outline */}
                  {selectionPath && selectionPath.length > 1 && (
                    <polygon
                      points={selectionPath.map((p) => `${p.x},${p.y}`).join(' ')}
                      fill="rgba(99, 102, 241, 0.05)"
                      stroke="#4f46e5"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="marching-ants-svg-path"
                    />
                  )}
                  {/* Poly lasso live cursor line */}
                  {activeSubTool === 'select-poly' && lassoPoints && lassoPoints.length > 0 && hoverMousePos && (
                    <line
                      x1={lassoPoints[lassoPoints.length - 1].x}
                      y1={lassoPoints[lassoPoints.length - 1].y}
                      x2={hoverMousePos.x}
                      y2={hoverMousePos.y}
                      stroke="#6366f1"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                      opacity="0.8"
                    />
                  )}
                  {/* Poly lasso first point circle anchor to close */}
                  {activeSubTool === 'select-poly' && lassoPoints && lassoPoints.length > 0 && (
                    <circle
                      cx={lassoPoints[0].x}
                      cy={lassoPoints[0].y}
                      r="6"
                      fill="#10b981"
                      stroke="#ffffff"
                      strokeWidth="2"
                      className="cursor-pointer pointer-events-auto hover:scale-125 transition-transform animate-pulse"
                      style={{ transformOrigin: 'center' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFinalizePolySelection();
                      }}
                    >
                      <title>Click to close polygonal selection</title>
                    </circle>
                  )}
                </svg>
              )}

              {/* FLOATING PEN TOOL ACTIONS TOOLBAR */}
              {activeSubTool === 'pen' && penPoints.length > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${penPoints[penPoints.length - 1].x + 15}px`,
                    top: `${penPoints[penPoints.length - 1].y + 15}px`,
                  }}
                  className="z-40 bg-[#121218]/95 border border-[#2d2d3c] text-white p-1.5 rounded-lg shadow-2xl flex items-center gap-1.5 text-[10px] select-none backdrop-blur-md pointer-events-auto"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => handleFinalizePenPath(true)}
                    className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-bold cursor-pointer transition-colors flex items-center gap-1 font-sans"
                  >
                    <Check className="w-3 h-3" />
                    Close & Fill Shape
                  </button>
                  <button
                    onClick={() => handleFinalizePenPath(false)}
                    className="px-2 py-1 bg-[#1a1a24] border border-[#2d2d3c] hover:bg-[#252535] text-gray-200 rounded cursor-pointer transition-colors flex items-center gap-1 font-sans"
                  >
                    <Sliders className="w-3 h-3 text-indigo-400" />
                    Stroke Path
                  </button>
                  <button
                    onClick={() => setPenPoints([])}
                    className="px-2 py-1 bg-red-950/40 border border-red-900/30 hover:bg-red-900/50 text-red-300 rounded cursor-pointer transition-colors flex items-center gap-1 font-sans"
                  >
                    <X className="w-3 h-3" />
                    Clear
                  </button>
                </div>
              )}

              {/* SELECTION BOX MARQUEE */}
              {selectionBox && activeSubTool === 'select-ellipse' ? (
                <svg
                  style={{
                    position: 'absolute',
                    left: `${selectionBox.x}px`,
                    top: `${selectionBox.y}px`,
                    width: `${selectionBox.w}px`,
                    height: `${selectionBox.h}px`,
                    overflow: 'visible',
                  }}
                  className="z-30 pointer-events-none"
                >
                  {/* shadow ellipse for contrast */}
                  <ellipse
                    cx={selectionBox.w / 2}
                    cy={selectionBox.h / 2}
                    rx={Math.max(1, selectionBox.w / 2)}
                    ry={Math.max(1, selectionBox.h / 2)}
                    fill="none"
                    stroke="black"
                    strokeWidth="2"
                    strokeDasharray="6 6"
                    strokeDashoffset="0"
                  />
                  {/* white marching-ants ellipse on top */}
                  <ellipse
                    cx={selectionBox.w / 2}
                    cy={selectionBox.h / 2}
                    rx={Math.max(1, selectionBox.w / 2)}
                    ry={Math.max(1, selectionBox.h / 2)}
                    fill="rgba(99,102,241,0.04)"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeDasharray="6 6"
                    strokeDashoffset="0"
                    className="marching-ants-svg-path"
                  />
                </svg>
              ) : selectionBox ? (
                <div
                  style={{
                    position: 'absolute',
                    left: `${selectionBox.x}px`,
                    top: `${selectionBox.y}px`,
                    width: `${selectionBox.w}px`,
                    height: `${selectionBox.h}px`,
                  }}
                  className="marching-ants-selection z-30 pointer-events-none"
                />
              ) : null}

              {/* CLONE STAMP ACTIVE SOURCE TARGET INDICATOR */}
              {activeTool === 'stamp' && stampSource && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${isDrawing && hoverMousePos ? (hoverMousePos.x + stampOffset.current.x) : stampSource.x}px`,
                    top: `${isDrawing && hoverMousePos ? (hoverMousePos.y + stampOffset.current.y) : stampSource.y}px`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  className="w-6 h-6 flex items-center justify-center text-rose-500 pointer-events-none z-30 select-none bg-black/20 border border-white/40 rounded-full"
                >
                  <span className="font-sans font-bold text-xs">＋</span>
                </div>
              )}

              {/* PATCH TOOL SOURCE AREA PREVIEW MARQUEE */}
              {activeSubTool === 'patch-tool' && isPatchDragging && patchOffset && selectionBox && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${selectionBox.x + patchOffset.x}px`,
                    top: `${selectionBox.y + patchOffset.y}px`,
                    width: `${selectionBox.w}px`,
                    height: `${selectionBox.h}px`,
                    borderRadius: '0px',
                  }}
                  className="border-2 border-dashed border-emerald-400 bg-emerald-500/5 z-30 pointer-events-none opacity-85"
                />
              )}

              {/* REAL-TIME BRUSH CURSOR RING OVERLAY */}
              {hoverMousePos && (activeTool === 'brush' || activeTool === 'eraser' || activeTool === 'healing' || activeTool === 'blur-sharpen' || activeTool === 'dodge-burn' || activeSubTool === 'blur' || activeSubTool === 'sharpen' || activeSubTool === 'smudge' || activeSubTool === 'dodge' || activeSubTool === 'burn') && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${hoverMousePos.x}px`,
                    top: `${hoverMousePos.y}px`,
                    width: `${Math.max(4, brushSize)}px`,
                    height: `${Math.max(4, brushSize)}px`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  className="rounded-full border border-white/90 shadow-[0_0_2px_rgba(0,0,0,0.8)] pointer-events-none z-30 opacity-90"
                />
              )}



              {/* EYEDROPPER PREVIEW COLOR RING */}
              {activeTool === 'eyedropper' && isDrawing && hoverMousePos && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${hoverMousePos.x}px`,
                    top: `${hoverMousePos.y}px`,
                    transform: 'translate(-50%, -50%) translate(0, -35px)',
                  }}
                  className="w-12 h-12 rounded-full border-2 border-white shadow-2xl flex items-center justify-center pointer-events-none z-50 overflow-hidden"
                >
                  <div className="w-full h-full flex flex-col">
                    {/* Top Half - New sampled color */}
                    <div
                      style={{ backgroundColor: brushColor }}
                      className="w-full h-1/2 flex items-center justify-center text-[7px] text-white font-bold select-none font-sans"
                    >
                      NEW
                    </div>
                    {/* Bottom Half - Old color */}
                    <div
                      style={{ backgroundColor: eyedropperOldColor }}
                      className="w-full h-1/2 flex items-center justify-center text-[7px] text-gray-400 font-bold select-none font-sans"
                    >
                      OLD
                    </div>
                  </div>
                </div>
              )}



              {/* SLICES RENDERING */}
              {slices && slices.length > 0 && (activeTool === 'crop' || activeSubTool === 'slice' || activeSubTool === 'slice-select') && (
                <>
                  {slices.map((slice, idx) => {
                    const isSelected = slice.id === activeSliceId;
                    const sliceName = slice.name || `slice_${String(idx + 1).padStart(2, '0')}`;
                    return (
                      <div
                        key={slice.id}
                        style={{
                          position: 'absolute',
                          left: `${slice.x}px`,
                          top: `${slice.y}px`,
                          width: `${slice.w}px`,
                          height: `${slice.h}px`,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveSliceId(slice.id);
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          if (onOpenSliceOptions) onOpenSliceOptions(slice);
                        }}
                        className={`z-30 border pointer-events-auto transition-all ${
                          isSelected
                            ? 'border-2 border-indigo-500 bg-indigo-500/10 shadow-xl'
                            : 'border border-indigo-400/80 bg-indigo-500/5 hover:border-indigo-400 hover:bg-indigo-500/10'
                        }`}
                      >
                        {/* Photoshop-Style Slice Badge Header */}
                        <div
                          className={`absolute -top-5 left-0 px-1.5 py-0.5 rounded-t text-[9px] font-mono font-bold flex items-center gap-1 select-none shadow-md z-40 ${
                            isSelected
                              ? 'bg-indigo-600 text-white border border-indigo-400'
                              : 'bg-[#181824] text-indigo-300 border border-[#2d2d3c]'
                          }`}
                        >
                          <span className="bg-indigo-950/60 px-1 rounded text-[8px] text-indigo-200">
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <span className="truncate max-w-[80px]">{sliceName}</span>
                          <span className="opacity-70 text-[8px]">({slice.w}×{slice.h})</span>
                        </div>

                        {/* Delete button */}
                        {(activeSubTool === 'slice' || activeSubTool === 'slice-select') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onUpdateSlices) {
                                onUpdateSlices(slices.filter((s) => s.id !== slice.id));
                              }
                              if (activeSliceId === slice.id) setActiveSliceId(null);
                              onPushHistory('Deleted export slice');
                            }}
                            className="absolute -top-5 right-0 bg-[#14141d] hover:bg-red-950/80 border border-[#2b2b3a] hover:border-red-900/50 text-gray-400 hover:text-red-400 px-1 py-0.5 rounded-t shadow-sm cursor-pointer transition-colors text-[9px]"
                            title="Delete Slice"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        )}

                        {/* 8 Control Handles for Selected Slice */}
                        {isSelected && (
                          <>
                            {['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].map((handle) => {
                              let style: React.CSSProperties = {
                                position: 'absolute',
                                width: '7px',
                                height: '7px',
                                backgroundColor: '#ffffff',
                                border: '1px solid #4f46e5',
                                zIndex: 50,
                              };
                              let cursor = 'default';

                              if (handle === 'nw') { style.top = '-4px'; style.left = '-4px'; cursor = 'nwse-resize'; }
                              if (handle === 'n') { style.top = '-4px'; style.left = 'calc(50% - 3.5px)'; cursor = 'ns-resize'; }
                              if (handle === 'ne') { style.top = '-4px'; style.right = '-4px'; cursor = 'nesw-resize'; }
                              if (handle === 'e') { style.top = 'calc(50% - 3.5px)'; style.right = '-4px'; cursor = 'ew-resize'; }
                              if (handle === 'se') { style.bottom = '-4px'; style.right = '-4px'; cursor = 'nwse-resize'; }
                              if (handle === 's') { style.bottom = '-4px'; style.left = 'calc(50% - 3.5px)'; cursor = 'ns-resize'; }
                              if (handle === 'sw') { style.bottom = '-4px'; style.left = '-4px'; cursor = 'nesw-resize'; }
                              if (handle === 'w') { style.top = 'calc(50% - 3.5px)'; style.left = '-4px'; cursor = 'ew-resize'; }

                              return (
                                <div
                                  key={handle}
                                  style={{ ...style, cursor }}
                                  className="shadow-sm rounded-sm hover:scale-125 transition-transform"
                                />
                              );
                            })}
                          </>
                        )}
                      </div>
                    );
                  })}
                </>
              )}

              {/* TEMPORARY SLICE DRAWING PREVIEW */}
              {isDrawingSlice && tempSlice && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${tempSlice.x}px`,
                    top: `${tempSlice.y}px`,
                    width: `${tempSlice.w}px`,
                    height: `${tempSlice.h}px`,
                  }}
                  className="z-30 border border-dashed border-indigo-400 bg-indigo-500/10 pointer-events-none"
                />
              )}

              {/* TEMPORARY SHAPE DRAWING LIVE VECTOR PREVIEW */}
              {isDrawingShape && tempShape && (
                <>
                  {activeSubTool === 'shape-line' ? (
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-30 overflow-visible">
                      <line
                        x1={selectStart.current.x}
                        y1={selectStart.current.y}
                        x2={hoverMousePos ? hoverMousePos.x : selectStart.current.x + tempShape.w}
                        y2={hoverMousePos ? hoverMousePos.y : selectStart.current.y + tempShape.h}
                        stroke={shapeStrokeColor && shapeStrokeColor !== 'transparent' ? shapeStrokeColor : brushColor}
                        strokeWidth={Math.max(2, shapeStrokeWidth || 2)}
                        strokeLinecap="round"
                      />
                    </svg>
                  ) : (
                    <svg
                      style={{
                        position: 'absolute',
                        left: `${tempShape.x}px`,
                        top: `${tempShape.y}px`,
                        width: `${tempShape.w}px`,
                        height: `${tempShape.h}px`,
                      }}
                      className="z-30 pointer-events-none overflow-visible"
                    >
                      {activeSubTool === 'shape-poly' ? (
                        /* TRIANGLE / POLYGON PREVIEW */
                        <polygon
                          points={`${tempShape.w / 2},0 ${tempShape.w},${tempShape.h} 0,${tempShape.h}`}
                          fill={brushColor || 'rgba(99,102,241,0.2)'}
                          fillOpacity={0.4}
                          stroke={shapeStrokeColor && shapeStrokeColor !== 'transparent' ? shapeStrokeColor : brushColor}
                          strokeWidth={Math.max(1.5, shapeStrokeWidth || 1.5)}
                        />
                      ) : activeSubTool === 'shape-ellipse' ? (
                        /* ELLIPSE / CIRCLE PREVIEW */
                        <ellipse
                          cx={tempShape.w / 2}
                          cy={tempShape.h / 2}
                          rx={Math.max(1, tempShape.w / 2)}
                          ry={Math.max(1, tempShape.h / 2)}
                          fill={brushColor || 'rgba(99,102,241,0.2)'}
                          fillOpacity={0.4}
                          stroke={shapeStrokeColor && shapeStrokeColor !== 'transparent' ? shapeStrokeColor : brushColor}
                          strokeWidth={Math.max(1.5, shapeStrokeWidth || 1.5)}
                        />
                      ) : activeSubTool === 'shape-rounded-rect' ? (
                        /* ROUNDED RECTANGLE PREVIEW */
                        <rect
                          x={0}
                          y={0}
                          width={tempShape.w}
                          height={tempShape.h}
                          rx={shapeCornerRadius || 12}
                          ry={shapeCornerRadius || 12}
                          fill={brushColor || 'rgba(99,102,241,0.2)'}
                          fillOpacity={0.4}
                          stroke={shapeStrokeColor && shapeStrokeColor !== 'transparent' ? shapeStrokeColor : brushColor}
                          strokeWidth={Math.max(1.5, shapeStrokeWidth || 1.5)}
                        />
                      ) : (
                        /* STANDARD RECTANGLE PREVIEW */
                        <rect
                          x={0}
                          y={0}
                          width={tempShape.w}
                          height={tempShape.h}
                          fill={brushColor || 'rgba(99,102,241,0.2)'}
                          fillOpacity={0.4}
                          stroke={shapeStrokeColor && shapeStrokeColor !== 'transparent' ? shapeStrokeColor : brushColor}
                          strokeWidth={Math.max(1.5, shapeStrokeWidth || 1.5)}
                        />
                      )}
                    </svg>
                  )}
                </>
              )}

              {/* FLOATING SELECTION ACTIONS TOOLBAR */}
              {selectionBox && !isSelecting && selectionBox.w > 10 && selectionBox.h > 10 && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${selectionBox.x}px`,
                    top: `${selectionBox.y + selectionBox.h + 10}px`,
                    transformOrigin: 'top left',
                  }}
                  className="z-40 bg-[#121218]/95 border border-[#2d2d3c] text-white p-1.5 rounded-lg shadow-2xl flex items-center gap-1 text-[10px] select-none backdrop-blur-md shrink-0 pointer-events-auto"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={handleSelectionCopy}
                    disabled={!activeLayer || activeLayer.type !== 'image'}
                    className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-bold cursor-pointer transition-colors disabled:opacity-40 flex items-center gap-1 font-sans"
                    title="New Layer via Copy"
                  >
                    <Copy className="w-3 h-3" />
                    Copy to Layer
                  </button>
                  <button
                    onClick={handleSelectionFill}
                    className="px-2 py-1 bg-[#1a1a24] border border-[#2d2d3c] hover:bg-[#252535] text-gray-200 rounded cursor-pointer transition-colors flex items-center gap-1 font-sans"
                    title="Fill selection with current brush color"
                  >
                    <Paintbrush className="w-3 h-3 text-indigo-400" />
                    Fill
                  </button>
                  <button
                    onClick={handleSelectionErase}
                    disabled={!activeLayer || activeLayer.locked}
                    className="px-2 py-1 bg-[#1a1a24] border border-[#2d2d3c] hover:bg-[#252535] text-gray-200 rounded cursor-pointer transition-colors disabled:opacity-40 flex items-center gap-1 font-sans"
                    title="Erase active layer content inside selection"
                  >
                    <Eraser className="w-3 h-3 text-red-400" />
                    Clear
                  </button>
                  <button
                    onClick={handleSelectionCrop}
                    className="px-2 py-1 bg-[#1a1a24] border border-[#2d2d3c] hover:bg-[#252535] text-gray-200 rounded cursor-pointer transition-colors flex items-center gap-1 font-sans"
                    title="Crop canvas to selection"
                  >
                    <Crop className="w-3 h-3 text-emerald-400" />
                    Crop
                  </button>
                  <button
                    onClick={handleInvertSelection}
                    className="px-2 py-1 bg-[#1a1a24] border border-[#2d2d3c] hover:bg-[#252535] text-gray-200 rounded cursor-pointer transition-colors flex items-center gap-1 font-sans"
                    title="Invert selection marquee"
                  >
                    Invert
                  </button>
                  <div className="w-[1px] h-3 bg-[#2d2d3c] mx-0.5" />
                  <button
                    onClick={handleClearSelection}
                    className="p-1 hover:bg-[#252535] text-red-400 rounded cursor-pointer transition-colors"
                    title="Deselect"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              {/* Quick Mask Mode Status Banner */}
              {isQuickMaskMode && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-rose-600/95 text-white px-4 py-2 rounded-full shadow-2xl border border-rose-300 font-bold text-xs flex items-center gap-2.5 select-none backdrop-blur-md">
                  <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                  <span>🔴 QUICK MASK MODE (Q)</span>
                  <span className="text-[10px] text-rose-100 font-normal border-l border-rose-400 pl-2">
                    Paint with Brush (Black/White) to modify Selection
                  </span>
                </div>
              )}

              {/* DRAG & DROP INTERNET / FILE OVERLAY */}
              {isDragOverWorkspace && (
                <div className="absolute inset-0 z-60 bg-indigo-950/85 backdrop-blur-md border-4 border-dashed border-indigo-400 flex flex-col items-center justify-center text-white space-y-3 p-6 pointer-events-none animate-in fade-in duration-150">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-500/30 border border-indigo-400/50 flex items-center justify-center text-indigo-200 shadow-2xl animate-bounce">
                    <Download className="w-8 h-8" />
                  </div>
                  <div className="text-center space-y-1">
                    <h3 className="font-sans font-bold text-lg text-indigo-100">Drop Images Here</h3>
                    <p className="text-xs text-indigo-200/90 max-w-sm">
                      Images from the web or computer will automatically be added to the Canvas as a New Layer!
                    </p>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
