/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ToolType =
  | 'move'
  | 'crop'
  | 'select-rect'
  | 'select-lasso'
  | 'brush'
  | 'eraser'
  | 'text'
  | 'shape'
  | 'stamp'
  | 'healing'
  | 'gradient'
  | 'blur-sharpen'
  | 'dodge-burn'
  | 'eyedropper'
  | 'history-brush'
  | 'path-select';

export type SubToolType =
  // Move & Selection group
  | 'move' | 'hand' | 'zoom' | 'rotate-canvas'
  | 'select-rect' | 'select-ellipse' | 'select-row' | 'select-column'
  | 'select-lasso' | 'select-poly' | 'select-magnetic' | 'select-wand' | 'select-quick' | 'select-ai'
  // Crop & Transform group
  | 'crop' | 'perspective-crop' | 'slice' | 'slice-select' | 'transform'
  // Retouching group
  | 'healing-spot' | 'healing-brush' | 'patch-tool' | 'content-aware-remove'
  | 'stamp'
  | 'blur' | 'sharpen' | 'smudge'
  | 'dodge' | 'burn' | 'sponge'
  // Painting group
  | 'brush' | 'pencil' | 'mixer-brush' | 'color-replacement'
  | 'history-brush' | 'art-history-brush'
  | 'eraser' | 'background-eraser' | 'magic-eraser'
  | 'gradient' | 'paint-bucket'
  // Vector & Shape group
  | 'shape-rect' | 'shape-rounded-rect' | 'shape-ellipse' | 'shape-poly' | 'shape-line' | 'shape-custom' | 'pen' | 'freeform-pen'
  // Path selection
  | 'path-select' | 'direct-select'
  // Text group
  | 'text'
  // Eyedropper
  | 'eyedropper'
  // Navigation group
  | 'zoom' | 'zoom-in' | 'zoom-out' | 'hand' | 'rotate-canvas';

export type ShapeType = 'rectangle' | 'circle' | 'triangle' | 'line';

export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion'
  | 'linear-dodge'
  | 'linear-burn'
  | 'vivid-light'
  | 'linear-light'
  | 'pin-light'
  | 'hard-mix'
  | 'subtract'
  | 'divide'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity';

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  w: number;
  h: number;
}

export interface BezierHandle {
  cp1: Point;
  cp2: Point;
}

export interface BezierPoint extends Point {
  handleIn?: Point;
  handleOut?: Point;
}

export interface ColorBalance {
  cyanRed: number;
  magentaGreen: number;
  yellowBlue: number;
}

export interface Adjustments {
  brightness: number;  // -100 to 100 (default 0)
  contrast: number;    // -100 to 100 (default 0)
  saturation: number;  // -100 to 100 (default 0)
  hue: number;         // -180 to 180 (default 0)
  exposure: number;    // -100 to 100 (default 0)
  blur: number;        // 0 to 50px (default 0)
  grayscale: number;   // 0 to 100 (default 0)
  sepia: number;       // 0 to 100 (default 0)
  invert: number;      // 0 to 100 (default 0)
  vignette: number;    // 0 to 100 (default 0)
  vibrance?: number;   // -100 to 100 (default 0)
  colorBalance?: ColorBalance;

  // Professional Adjustments
  levelsRGB?: LevelsParams;
  levelsRed?: LevelsParams;
  levelsGreen?: LevelsParams;
  levelsBlue?: LevelsParams;
  
  curvesRGB?: CurvePoint[];
  curvesRed?: CurvePoint[];
  curvesGreen?: CurvePoint[];
  curvesBlue?: CurvePoint[];

  exposureOffset?: number; // offset parameter for Exposure
  exposureGamma?: number;  // gamma parameter for Exposure

  hueSatChannels?: {
    [channel: string]: {
      hue: number;
      saturation: number;
      lightness: number;
    }
  };

  colorBalanceShadows?: ColorBalance;
  colorBalanceMidtones?: ColorBalance;
  colorBalanceHighlights?: ColorBalance;
  colorBalancePreserveLuminosity?: boolean;

  blackAndWhiteSliders?: {
    red: number;
    yellow: number;
    green: number;
    cyan: number;
    blue: number;
    magenta: number;
  };

  photoFilter?: {
    filterType: 'warming' | 'cooling' | 'sepia' | 'neutral';
    density: number;
    preserveLuminosity: boolean;
  };

  channelMixer?: {
    red: { r: number; g: number; b: number; constant: number };
    green: { r: number; g: number; b: number; constant: number };
    blue: { r: number; g: number; b: number; constant: number };
    monochrome: boolean;
  };

  colorLookup?: {
    name: string;
    cubeData?: string;
  };

  posterizeLevels?: number;
  thresholdValue?: number;

  gradientMap?: {
    stops: { offset: number; color: string }[];
    opacity: number;
    blendMode: BlendMode;
  };

  selectiveColor?: {
    relative: boolean;
    colors: {
      [colorGroup: string]: { c: number; m: number; y: number; k: number } // -100 to 100
    }
  };

  matchColor?: {
    sourceProjId: string;
    luminance: number; // 0-200, default 100
    colorIntensity: number; // 0-200, default 100
    fade: number; // 0-100, default 0
  };

  replaceColor?: {
    targetColor: string; // hex
    fuzziness: number; // 0-200
    hue: number;
    saturation: number;
    lightness: number;
  };

  shadowsHighlights?: {
    shadowAmount: number;
    highlightAmount: number;
    radius: number;
    colorCorrection: number;
    midtoneContrast: number;
  };

  hdrToning?: {
    strength: number;
    radius: number;
    detail: number;
    gamma: number;
    exposure: number;
  };
}


export interface DropShadowStyle {
  enabled: boolean;
  color: string;
  opacity: number;
  blendMode: BlendMode;
  angle: number;
  distance: number;
  spread: number;
  size: number;
}

export interface InnerShadowStyle {
  enabled: boolean;
  color: string;
  opacity: number;
  blendMode: BlendMode;
  angle: number;
  distance: number;
  choke: number;
  size: number;
}

export interface OuterGlowStyle {
  enabled: boolean;
  color: string;
  opacity: number;
  blendMode: BlendMode;
  size: number;
  spread: number;
}

export interface InnerGlowStyle {
  enabled: boolean;
  color: string;
  opacity: number;
  blendMode: BlendMode;
  size: number;
  choke: number;
}

export interface BevelEmbossStyle {
  enabled: boolean;
  style: 'inner-bevel' | 'outer-bevel' | 'emboss' | 'pillow-emboss' | 'stroke-emboss';
  depth: number;
  direction: 'up' | 'down';
  size: number;
  soften: number;
  angle: number;
  altitude: number;
  highlightMode: BlendMode;
  highlightColor: string;
  highlightOpacity: number;
  shadowMode: BlendMode;
  shadowColor: string;
  shadowOpacity: number;
}

export interface SatinStyle {
  enabled: boolean;
  color: string;
  opacity: number;
  blendMode: BlendMode;
  angle: number;
  distance: number;
  size: number;
  invert: boolean;
}

export interface ColorOverlayStyle {
  enabled: boolean;
  color: string;
  opacity: number;
  blendMode: BlendMode;
}

export interface GradientOverlayStyle {
  enabled: boolean;
  stops: { offset: number; color: string }[];
  opacity: number;
  blendMode: BlendMode;
  angle: number;
  style: 'linear' | 'radial' | 'angle' | 'reflected' | 'diamond';
  scale: number;
}

export interface PatternOverlayStyle {
  enabled: boolean;
  patternUrl: string;
  opacity: number;
  blendMode: BlendMode;
  scale: number;
}

export interface StrokeStyle {
  enabled: boolean;
  size: number;
  position: 'outside' | 'inside' | 'center';
  blendMode: BlendMode;
  opacity: number;
  colorType: 'color' | 'gradient';
  color: string;
  stops?: { offset: number; color: string }[];
}

export interface LayerStyles {
  // Simple legacy/fallback mapping
  strokeEnabled?: boolean;
  strokeColor?: string;
  strokeSize?: number;
  shadowEnabled?: boolean;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  colorOverlayEnabled?: boolean;
  colorOverlayColor?: string;
  colorOverlayOpacity?: number;

  // Professional FX mapping
  dropShadow?: DropShadowStyle;
  innerShadow?: InnerShadowStyle;
  outerGlow?: OuterGlowStyle;
  innerGlow?: InnerGlowStyle;
  bevelEmboss?: BevelEmbossStyle;
  satin?: SatinStyle;
  colorOverlay?: ColorOverlayStyle;
  gradientOverlay?: GradientOverlayStyle;
  patternOverlay?: PatternOverlayStyle;
  stroke?: StrokeStyle;
}

export type WarpStyle =
  | 'none'
  | 'custom'
  | 'arc'
  | 'arc-lower'
  | 'arc-upper'
  | 'wave'
  | 'bulge'
  | 'flag'
  | 'fish'
  | 'twist'
  | 'squeeze'
  | 'inflate';

export interface WarpConfig {
  style: WarpStyle;
  bend: number;
  horizDistortion: number;
  vertDistortion: number;
  direction?: 'horizontal' | 'vertical';
  meshPoints?: Point[];
}

export interface Layer {
  id: string;
  name: string;
  type: 'image' | 'text' | 'shape' | 'drawing' | 'adjustment' | 'group' | 'smartobject' | 'background' | 'artboard' | 'video' | 'ai';
  visible: boolean;
  locked: boolean;
  opacity: number;      // 0 to 1 (default 1)
  fillOpacity?: number; // 0 to 1 (default 1)
  lockTransparency?: boolean;
  blendMode: BlendMode;
  expanded?: boolean;   // For group layers - collapsed/expanded
  
  // Coordinates and transformation
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;     // in degrees (default 0)
  flipX?: boolean;
  flipY?: boolean;
  warpConfig?: WarpConfig;
  
  // Content specifics
  imageElement?: HTMLImageElement; // Runtime render cache
  imageBlob?: Blob;               // For persistence in DB
  imageUrl?: string;              // Temporary blob URL for rendering
  
  // Text specific
  text?: string;
  fontSize?: number;
  textColor?: string;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  textAlign?: 'left' | 'center' | 'right';
  letterSpacing?: number;         // Tracking (in px)
  lineHeightMultiplier?: number;  // Leading multiplier (default 1.2)
  textWarp?: 'none' | 'arc' | 'arc-lower' | 'arc-upper' | 'wave' | 'bulge' | 'flag' | 'fish' | 'twist' | 'squeeze' | 'inflate';
  textWarpBend?: number; // Bend value from -100 to 100
  textWarpDir?: 'horizontal' | 'vertical';
  textWarpHorizDistortion?: number; // Horizontal distortion from -100 to 100
  textWarpVertDistortion?: number;  // Vertical distortion from -100 to 100
  
  // Shape specific
  shapeType?: ShapeType;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  gradientStart?: Point;
  gradientEnd?: Point;
  gradientColors?: string[];
  gradientType?: 'linear' | 'radial' | 'angle' | 'reflected' | 'diamond';
  cornerRadius?: number;
  patternUrl?: string;
  patternSize?: number;
  patternImageElement?: HTMLImageElement;
  vectorPath?: string;
  
  // Drawing specific
  drawingPath?: {
    points: Point[];
    color: string;
    size: number;
    isEraser: boolean;
    isPencil?: boolean;
    isMixer?: boolean;
    isColorReplace?: boolean;
    isClosed?: boolean;
    fillColor?: string;
  }[];
  
  // Mask
  hasMask?: boolean;
  maskBlob?: Blob;
  maskCanvas?: HTMLCanvasElement; // For masking interactions
  maskFeather?: number;
  maskDensity?: number;
  maskInvert?: boolean;
  maskDisabled?: boolean;

  // Advanced Styles & Adjustment Properties
  layerStyles?: LayerStyles;
  adjustments?: Adjustments; // Used by adjustment layer type

  // Group/Folder support: parent-child hierarchy
  parentId?: string;    // ID of parent group layer (undefined if root)
  childrenIds?: string[]; // IDs of child layers (for group layers)

  // Advanced Clipping & Locking
  isClippingMask?: boolean;
  linkedGroupId?: string;
  adjustmentType?: string;
  lockPixels?: boolean;
  lockPosition?: boolean;
  
  // Smart Object contents
  smartObjectProject?: Project;
  smartObjectBlob?: Blob;
  
  // Custom layer metadata
  colorLabel?: 'none' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'gray';
  notes?: string;
  metadata?: Record<string, any>;
}

export interface LayerGroup {
  id: string;
  name: string;
  expanded: boolean;
  layers: (Layer | LayerGroup)[];
}

export interface GridSettings {
  enabled: boolean;
  size: number;
  color: string;
  opacity: number;
  snapEnabled: boolean;
  snapThreshold: number;
}

export interface AlignmentGuides {
  enabled: boolean;
  smartGuides: boolean;
}

export interface Slice {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  name?: string;
  type?: 'image' | 'no-image';
  url?: string;
  target?: string;
  alt?: string;
  message?: string;
  bgColor?: string;
  format?: 'png' | 'jpeg' | 'webp' | 'gif';
}

export interface Project {
  id: string;
  name: string;
  width: number;
  height: number;
  layers: Layer[];
  layerGroups?: LayerGroup[];       // Optional named groups for organizing layers
  createdAt: number;
  updatedAt: number;
  thumbnail?: string; // Base64 project thumbnail
  slices?: Slice[];
  guides?: { id: string; type: 'h' | 'v'; position: number }[]; // Canvas guidelines coordinates
  grid?: GridSettings;
  alignmentGuides?: AlignmentGuides;
  colorMode?: 'rgb' | 'cmyk' | 'grayscale' | 'bitmap' | 'lab' | 'indexed';
  bitDepth?: 8 | 16 | 32;
  colorProfile?: string;
}

export interface HistoryState {
  layers: Layer[];
  canvasWidth: number;
  canvasHeight: number;
  description: string;
}

export interface AssetData {
  id: string;
  name: string;
  category: 'sticker' | 'shape' | 'gradient' | 'pattern' | 'stock';
  url?: string;
  style?: string; // For gradients (e.g. linear-gradient...) or raw SVG path
  path?: string;  // SVG path for simple vectors
}

export interface FontData {
  name: string;
  family: string;
  category: 'sans-serif' | 'serif' | 'monospace' | 'display' | 'custom';
  url?: string;
  isCustom?: boolean;
}



export interface BatchJob {
  id: string;
  fileName: string;
  originalSize: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  resultBlob?: Blob;
  resultUrl?: string;
  resultSize?: number;
}

// Filter gallery effect types
export type FilterEffect =
  | 'none'
  | 'gaussian-blur' | 'motion-blur' | 'radial-blur'
  | 'sharpen' | 'edge-detect' | 'emboss'
  | 'pixelate' | 'mosaic' | 'color-halftone'
  | 'oil-paint' | 'posterize' | 'threshold'
  | 'noise' | 'dust-script' | 'median'
  | 'wind' | 'ripple' | 'twirl' | 'spherize'
  | 'find-edges' | 'glow' | 'sketch'
  | 'neon' | 'watercolor' | 'charcoal'
  | 'solarize';

export interface FilterGalleryParams {
  effect: FilterEffect;
  intensity: number;   // 0-100
  radius?: number;     // px
  angle?: number;      // degrees
  threshold?: number;  // 0-255
}

// Workspace layout presets
export type WorkspacePreset = 'essentials' | 'painting' | 'photography' | 'motion';

// Color swatch
export interface ColorSwatch {
  hex: string;
  name?: string;
  isCustom?: boolean;
}

// Curve control point
export interface CurvePoint {
  input: number;  // 0-255
  output: number; // 0-255
}

// Levels adjustment
export interface LevelsParams {
  shadows: number;   // 0-255 (black point)
  midtones: number;  // 0.01-9.99 (gamma)
  highlights: number; // 0-255 (white point)
  outBlack?: number; // 0-255 Output black (default 0)
  outWhite?: number; // 0-255 Output white (default 255)
}

// ─── Panel Management ─────────────────────────────────────────────────────────

export type PanelId =
  | 'layers' | 'channels' | 'paths'
  | 'history' | 'actions'
  | 'properties' | 'adjustments'
  | 'color' | 'swatches' | 'gradients' | 'patterns'
  | 'brushes' | 'brush-settings'
  | 'character' | 'paragraph' | 'glyphs'
  | 'navigator' | 'histogram' | 'info'
  | 'assets'
  | 'tool-presets';

export type DockSide = 'left' | 'right' | 'bottom' | 'float';

export interface PanelState {
  id: PanelId;
  visible: boolean;
  dock: DockSide;
  order: number;        // position within its dock group
  collapsed: boolean;
  width?: number;       // for left/right docks
  height?: number;      // for bottom dock / stacked panels
  floatX?: number;
  floatY?: number;
  floatW?: number;
  floatH?: number;
  minimized?: boolean;  // floating only
}

export interface WorkspaceLayout {
  id: string;
  name: string;
  builtIn?: boolean;
  panels: PanelState[];
  leftDockWidth: number;
  rightDockWidth: number;
  createdAt?: number;
}

// Built-in workspace preset names
export type WorkspacePresetName =
  | 'Essentials'
  | 'Photography'
  | 'Graphic Design'
  | 'Painting'
  | 'Web Design'
  | 'UI/UX'
  | 'AI Editing'
  | 'Minimal';

export type ToastType = 'info' | 'error' | 'success' | 'warning';

export interface ToastMessage {
  message: string;
  type: ToastType;
}


