import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { X, Sliders, RefreshCw, Layers, Check, FileCode, SlidersHorizontal } from 'lucide-react';
import { Adjustments, CurvePoint, LevelsParams, Project } from '../types';
import HistogramEngine from './HistogramEngine';
import CurveEditor from './CurveEditor';
import LevelEditor from './LevelEditor';

interface AdjustmentDialogProps {
  initialType: string;
  projects: Project[];
  activeLayerId: string | null;
  onApply: (adj: Adjustments, targetMode: 'direct' | 'layer') => void;
  onCancel: () => void;
  onUpdatePreview: (adj: Adjustments) => void;
}

const ADJUSTMENT_LIST = [
  { id: 'brightness-contrast', name: 'Brightness & Contrast' },
  { id: 'levels', name: 'Levels' },
  { id: 'curves', name: 'Curves' },
  { id: 'exposure', name: 'Exposure' },
  { id: 'vibrance', name: 'Vibrance' },
  { id: 'hue-saturation', name: 'Hue / Saturation' },
  { id: 'color-balance', name: 'Color Balance' },
  { id: 'black-white', name: 'Black & White' },
  { id: 'photo-filter', name: 'Photo Filter' },
  { id: 'channel-mixer', name: 'Channel Mixer' },
  { id: 'color-lookup', name: 'Color Lookup (LUT)' },
  { id: 'invert', name: 'Invert' },
  { id: 'posterize', name: 'Posterize' },
  { id: 'threshold', name: 'Threshold' },
  { id: 'gradient-map', name: 'Gradient Map' },
  { id: 'selective-color', name: 'Selective Color' },
  { id: 'match-color', name: 'Match Color' },
  { id: 'replace-color', name: 'Replace Color' },
  { id: 'shadows-highlights', name: 'Shadows / Highlights' },
  { id: 'hdr-toning', name: 'HDR Toning' },
];

export default function AdjustmentDialog({
  initialType,
  projects,
  activeLayerId,
  onApply,
  onCancel,
  onUpdatePreview,
}: AdjustmentDialogProps) {
  const [selectedType, setSelectedType] = useState<string>(initialType);
  const [targetMode, setTargetMode] = useState<'direct' | 'layer'>('layer');
  const [previewEnabled, setPreviewEnabled] = useState(true);

  // Core state containing all parameters
  const [params, setParams] = useState<Adjustments>({
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
    vibrance: 0,
    colorBalance: { cyanRed: 0, magentaGreen: 0, yellowBlue: 0 },
    levelsRGB: { shadows: 0, midtones: 1.0, highlights: 255, outBlack: 0, outWhite: 255 },
    levelsRed: { shadows: 0, midtones: 1.0, highlights: 255, outBlack: 0, outWhite: 255 },
    levelsGreen: { shadows: 0, midtones: 1.0, highlights: 255, outBlack: 0, outWhite: 255 },
    levelsBlue: { shadows: 0, midtones: 1.0, highlights: 255, outBlack: 0, outWhite: 255 },
    curvesRGB: [{ input: 0, output: 0 }, { input: 255, output: 255 }],
    curvesRed: [{ input: 0, output: 0 }, { input: 255, output: 255 }],
    curvesGreen: [{ input: 0, output: 0 }, { input: 255, output: 255 }],
    curvesBlue: [{ input: 0, output: 0 }, { input: 255, output: 255 }],
    exposureOffset: 0,
    exposureGamma: 1.0,
    hueSatChannels: {
      Master: { hue: 0, saturation: 0, lightness: 0 },
      Reds: { hue: 0, saturation: 0, lightness: 0 },
      Yellows: { hue: 0, saturation: 0, lightness: 0 },
      Greens: { hue: 0, saturation: 0, lightness: 0 },
      Cyans: { hue: 0, saturation: 0, lightness: 0 },
      Blues: { hue: 0, saturation: 0, lightness: 0 },
      Magentas: { hue: 0, saturation: 0, lightness: 0 },
    },
    colorBalanceShadows: { cyanRed: 0, magentaGreen: 0, yellowBlue: 0 },
    colorBalanceMidtones: { cyanRed: 0, magentaGreen: 0, yellowBlue: 0 },
    colorBalanceHighlights: { cyanRed: 0, magentaGreen: 0, yellowBlue: 0 },
    colorBalancePreserveLuminosity: true,
    blackAndWhiteSliders: { red: 40, yellow: 60, green: 40, cyan: 60, blue: 20, magenta: 80 },
    photoFilter: { filterType: 'warming', density: 25, preserveLuminosity: true },
    channelMixer: {
      red: { r: 100, g: 0, b: 0, constant: 0 },
      green: { r: 0, g: 100, b: 0, constant: 0 },
      blue: { r: 0, g: 0, b: 100, constant: 0 },
      monochrome: false,
    },
    colorLookup: { name: 'Teal & Orange' },
    posterizeLevels: 4,
    thresholdValue: 128,
    gradientMap: {
      stops: [
        { offset: 0, color: '#000000' },
        { offset: 1, color: '#ffffff' },
      ],
      opacity: 100,
      blendMode: 'normal',
    },
    selectiveColor: {
      relative: true,
      colors: {
        Reds: { c: 0, m: 0, y: 0, k: 0 },
        Yellows: { c: 0, m: 0, y: 0, k: 0 },
        Greens: { c: 0, m: 0, y: 0, k: 0 },
        Cyans: { c: 0, m: 0, y: 0, k: 0 },
        Blues: { c: 0, m: 0, y: 0, k: 0 },
        Magentas: { c: 0, m: 0, y: 0, k: 0 },
        Whites: { c: 0, m: 0, y: 0, k: 0 },
        Neutrals: { c: 0, m: 0, y: 0, k: 0 },
        Blacks: { c: 0, m: 0, y: 0, k: 0 },
      },
    },
    matchColor: { sourceProjId: '', luminance: 100, colorIntensity: 100, fade: 0 },
    replaceColor: { targetColor: '#ff0000', fuzziness: 40, hue: 0, saturation: 0, lightness: 0 },
    shadowsHighlights: { shadowAmount: 35, highlightAmount: 0, radius: 30, colorCorrection: 20, midtoneContrast: 0 },
    hdrToning: { strength: 50, radius: 15, detail: 20, gamma: 1.0, exposure: 0 },
  });

  // Source canvas ref for histogram calculations
  const [workspaceCanvas, setWorkspaceCanvas] = useState<HTMLCanvasElement | null>(null);

  useEffect(() => {
    // Lookup main workspace canvas
    const canvas = document.getElementById('workspace-canvas') as HTMLCanvasElement;
    if (canvas) setWorkspaceCanvas(canvas);
  }, []);

  const animFrameRef = useRef<number | null>(null);

  // Update preview when params change (throttled for silky smooth 60fps response)
  useEffect(() => {
    if (previewEnabled) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(() => {
        onUpdatePreview(params);
      });
    } else {
      // Clear live adjustments for standard preview rendering
      onUpdatePreview({
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
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [params, previewEnabled, selectedType]);

  const handleReset = () => {
    // Reset specific parameters to standard values
    setParams((prev) => ({
      ...prev,
      brightness: 0,
      contrast: 0,
      saturation: 0,
      hue: 0,
      exposure: 0,
      vibrance: 0,
      colorBalance: { cyanRed: 0, magentaGreen: 0, yellowBlue: 0 },
      levelsRGB: { shadows: 0, midtones: 1.0, highlights: 255, outBlack: 0, outWhite: 255 },
      levelsRed: { shadows: 0, midtones: 1.0, highlights: 255, outBlack: 0, outWhite: 255 },
      levelsGreen: { shadows: 0, midtones: 1.0, highlights: 255, outBlack: 0, outWhite: 255 },
      levelsBlue: { shadows: 0, midtones: 1.0, highlights: 255, outBlack: 0, outWhite: 255 },
      curvesRGB: [{ input: 0, output: 0 }, { input: 255, output: 255 }],
      curvesRed: [{ input: 0, output: 0 }, { input: 255, output: 255 }],
      curvesGreen: [{ input: 0, output: 0 }, { input: 255, output: 255 }],
      curvesBlue: [{ input: 0, output: 0 }, { input: 255, output: 255 }],
      exposureOffset: 0,
      exposureGamma: 1.0,
      colorBalanceShadows: { cyanRed: 0, magentaGreen: 0, yellowBlue: 0 },
      colorBalanceMidtones: { cyanRed: 0, magentaGreen: 0, yellowBlue: 0 },
      colorBalanceHighlights: { cyanRed: 0, magentaGreen: 0, yellowBlue: 0 },
      posterizeLevels: 4,
      thresholdValue: 128,
      hdrToning: { strength: 50, radius: 15, detail: 20, gamma: 1.0, exposure: 0 },
    }));
  };

  const handleParamChange = (key: keyof Adjustments, val: any) => {
    setParams((prev) => ({ ...prev, [key]: val }));
  };

  // Color Balance sub-channel state
  const [cbTargetRange, setCbTargetRange] = useState<'shadows' | 'midtones' | 'highlights'>('midtones');

  // Hue Saturation target channel selection
  const [hueSatTargetChannel, setHueSatTargetChannel] = useState<string>('Master');

  // Channel Mixer output channel selection
  const [mixerOutputChannel, setMixerOutputChannel] = useState<'red' | 'green' | 'blue'>('red');

  // Selective Color target color group selection
  const [selectiveColorGroup, setSelectiveColorGroup] = useState<string>('Reds');

  // Gradient Map active color stop index
  const [activeGradientStop, setActiveGradientStop] = useState<number>(0);

  // Custom LUT upload handler
  const handleLutUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      setParams((prev) => ({
        ...prev,
        colorLookup: {
          name: file.name,
          cubeData: content,
        },
      }));
    };
    reader.readAsText(file);
  };

  const handleApply = () => {
    // Pass final parameters back to App for execution
    onApply(params, targetMode);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs select-none">
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-4xl h-[620px] bg-[#141419] border border-[#2c2c36] rounded-xl overflow-hidden shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#24242c] shrink-0">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
            <h3 className="font-sans font-bold text-sm text-white">Adjustments Studio</h3>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-white cursor-pointer transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex flex-1 min-h-0">
          {/* Left Adjustments List Sidebar */}
          <div className="w-56 border-r border-[#24242c] bg-[#0f0f13] overflow-y-auto p-2 space-y-0.5">
            {ADJUSTMENT_LIST.map((adj) => (
              <button
                key={adj.id}
                onClick={() => setSelectedType(adj.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-[11px] font-medium transition-all cursor-pointer flex justify-between items-center ${
                  selectedType === adj.id
                    ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-700/35 font-semibold'
                    : 'text-gray-400 hover:bg-[#1a1a24] hover:text-gray-200 border border-transparent'
                }`}
              >
                <span>{adj.name}</span>
                {selectedType === adj.id && <div className="w-1 h-1 rounded-full bg-indigo-400" />}
              </button>
            ))}
          </div>

          {/* Right Adjustments Controls panel */}
          <div className="flex-1 overflow-y-auto p-6 flex gap-6">
            <div className="flex-1 space-y-6">
              
              {/* === Brightness & Contrast === */}
              {selectedType === 'brightness-contrast' && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-gray-400">
                      <span>Brightness</span>
                      <span className="font-mono text-white font-bold">{params.brightness}</span>
                    </div>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={params.brightness}
                      onChange={(e) => handleParamChange('brightness', parseInt(e.target.value))}
                      className="w-full accent-indigo-500 bg-[#252530] h-1"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-gray-400">
                      <span>Contrast</span>
                      <span className="font-mono text-white font-bold">{params.contrast}</span>
                    </div>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={params.contrast}
                      onChange={(e) => handleParamChange('contrast', parseInt(e.target.value))}
                      className="w-full accent-indigo-500 bg-[#252530] h-1"
                    />
                  </div>
                  {/* Auto Contrast simulation */}
                  <button
                    onClick={() => {
                      setParams(prev => ({ ...prev, brightness: 10, contrast: 25 }));
                    }}
                    className="px-3 py-1.5 bg-[#1f1f28] hover:bg-[#282835] border border-[#2d2d3d] text-[10px] rounded text-indigo-400 font-bold transition-all cursor-pointer"
                  >
                    Auto Balance
                  </button>
                </div>
              )}

              {/* === Levels === */}
              {selectedType === 'levels' && (
                <LevelEditor
                  levelsRGB={params.levelsRGB!}
                  levelsRed={params.levelsRed!}
                  levelsGreen={params.levelsGreen!}
                  levelsBlue={params.levelsBlue!}
                  onChangeLevelsRGB={(p) => handleParamChange('levelsRGB', p)}
                  onChangeLevelsRed={(p) => handleParamChange('levelsRed', p)}
                  onChangeLevelsGreen={(p) => handleParamChange('levelsGreen', p)}
                  onChangeLevelsBlue={(p) => handleParamChange('levelsBlue', p)}
                  sourceCanvas={workspaceCanvas}
                />
              )}

              {/* === Curves === */}
              {selectedType === 'curves' && (
                <CurveEditor
                  curvesRGB={params.curvesRGB!}
                  curvesRed={params.curvesRed!}
                  curvesGreen={params.curvesGreen!}
                  curvesBlue={params.curvesBlue!}
                  onChangeCurvesRGB={(pts) => handleParamChange('curvesRGB', pts)}
                  onChangeCurvesRed={(pts) => handleParamChange('curvesRed', pts)}
                  onChangeCurvesGreen={(pts) => handleParamChange('curvesGreen', pts)}
                  onChangeCurvesBlue={(pts) => handleParamChange('curvesBlue', pts)}
                />
              )}

              {/* === Exposure === */}
              {selectedType === 'exposure' && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-gray-400">
                      <span>Exposure</span>
                      <span className="font-mono text-white font-bold">{params.exposure}</span>
                    </div>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={params.exposure}
                      onChange={(e) => handleParamChange('exposure', parseInt(e.target.value))}
                      className="w-full accent-indigo-500 bg-[#252530] h-1"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-gray-400">
                      <span>Offset (Black Correction)</span>
                      <span className="font-mono text-white font-bold">{(params.exposureOffset || 0).toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      value={params.exposureOffset || 0}
                      onChange={(e) => handleParamChange('exposureOffset', parseInt(e.target.value))}
                      className="w-full accent-indigo-500 bg-[#252530] h-1"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-gray-400">
                      <span>Gamma Correction</span>
                      <span className="font-mono text-white font-bold">{(params.exposureGamma || 1.0).toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="300"
                      value={(params.exposureGamma || 1.0) * 100}
                      onChange={(e) => handleParamChange('exposureGamma', parseInt(e.target.value) / 100)}
                      className="w-full accent-indigo-500 bg-[#252530] h-1"
                    />
                  </div>
                </div>
              )}

              {/* === Vibrance === */}
              {selectedType === 'vibrance' && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-gray-400">
                      <span>Vibrance</span>
                      <span className="font-mono text-white font-bold">{params.vibrance}</span>
                    </div>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={params.vibrance}
                      onChange={(e) => handleParamChange('vibrance', parseInt(e.target.value))}
                      className="w-full accent-indigo-500 bg-[#252530] h-1"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-gray-400">
                      <span>Saturation</span>
                      <span className="font-mono text-white font-bold">{params.saturation}</span>
                    </div>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={params.saturation}
                      onChange={(e) => handleParamChange('saturation', parseInt(e.target.value))}
                      className="w-full accent-indigo-500 bg-[#252530] h-1"
                    />
                  </div>
                </div>
              )}

              {/* === Hue / Saturation === */}
              {selectedType === 'hue-saturation' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-gray-400">Channel target:</span>
                    <select
                      value={hueSatTargetChannel}
                      onChange={(e) => setHueSatTargetChannel(e.target.value)}
                      className="bg-[#1c1c24] border border-[#2a2a35] text-gray-200 text-xs rounded px-2.5 py-1 outline-none cursor-pointer"
                    >
                      {['Master', 'Reds', 'Yellows', 'Greens', 'Cyans', 'Blues', 'Magentas'].map((ch) => (
                        <option key={ch} value={ch}>
                          {ch}
                        </option>
                      ))}
                    </select>
                  </div>

                  {(() => {
                    const chan = params.hueSatChannels?.[hueSatTargetChannel] || { hue: 0, saturation: 0, lightness: 0 };
                    const updateChan = (key: 'hue' | 'saturation' | 'lightness', val: number) => {
                      const updated = {
                        ...params.hueSatChannels,
                        [hueSatTargetChannel]: {
                          ...chan,
                          [key]: val,
                        },
                      };
                      handleParamChange('hueSatChannels', updated);
                    };

                    return (
                      <div className="space-y-4 border-t border-[#1b1b24] pt-4">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] text-gray-400">
                            <span>Hue ({hueSatTargetChannel})</span>
                            <span className="font-mono text-white font-bold">{chan.hue}</span>
                          </div>
                          <input
                            type="range"
                            min="-180"
                            max="180"
                            value={chan.hue}
                            onChange={(e) => updateChan('hue', parseInt(e.target.value))}
                            className="w-full accent-indigo-500 bg-[#252530] h-1"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] text-gray-400">
                            <span>Saturation ({hueSatTargetChannel})</span>
                            <span className="font-mono text-white font-bold">{chan.saturation}</span>
                          </div>
                          <input
                            type="range"
                            min="-100"
                            max="100"
                            value={chan.saturation}
                            onChange={(e) => updateChan('saturation', parseInt(e.target.value))}
                            className="w-full accent-indigo-500 bg-[#252530] h-1"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] text-gray-400">
                            <span>Lightness ({hueSatTargetChannel})</span>
                            <span className="font-mono text-white font-bold">{chan.lightness}</span>
                          </div>
                          <input
                            type="range"
                            min="-100"
                            max="100"
                            value={chan.lightness}
                            onChange={(e) => updateChan('lightness', parseInt(e.target.value))}
                            className="w-full accent-indigo-500 bg-[#252530] h-1"
                          />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* === Color Balance === */}
              {selectedType === 'color-balance' && (
                <div className="space-y-4">
                  {/* Select Tonal range */}
                  <div className="flex justify-around border-b border-[#202028] pb-3 mb-2 text-xs">
                    {(['shadows', 'midtones', 'highlights'] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => setCbTargetRange(r)}
                        className={`px-3 py-1 font-bold rounded uppercase tracking-wider cursor-pointer ${
                          cbTargetRange === r ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-200'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>

                  {(() => {
                    const getCbChannelKey = () => {
                      if (cbTargetRange === 'shadows') return 'colorBalanceShadows';
                      if (cbTargetRange === 'highlights') return 'colorBalanceHighlights';
                      return 'colorBalanceMidtones';
                    };
                    const targetKey = getCbChannelKey();
                    const toneCB = params[targetKey] || { cyanRed: 0, magentaGreen: 0, yellowBlue: 0 };

                    const updateCbValue = (chKey: 'cyanRed' | 'magentaGreen' | 'yellowBlue', val: number) => {
                      handleParamChange(targetKey, { ...toneCB, [chKey]: val });
                    };

                    return (
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                            <span>CYAN ↔ RED</span>
                            <span className="text-white font-bold">{toneCB.cyanRed > 0 ? `+${toneCB.cyanRed}` : toneCB.cyanRed}</span>
                          </div>
                          <input
                            type="range"
                            min="-100"
                            max="100"
                            value={toneCB.cyanRed}
                            onChange={(e) => updateCbValue('cyanRed', parseInt(e.target.value))}
                            className="w-full accent-red-500 bg-[#252530] h-1"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                            <span>MAGENTA ↔ GREEN</span>
                            <span className="text-white font-bold">{toneCB.magentaGreen > 0 ? `+${toneCB.magentaGreen}` : toneCB.magentaGreen}</span>
                          </div>
                          <input
                            type="range"
                            min="-100"
                            max="100"
                            value={toneCB.magentaGreen}
                            onChange={(e) => updateCbValue('magentaGreen', parseInt(e.target.value))}
                            className="w-full accent-green-500 bg-[#252530] h-1"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                            <span>YELLOW ↔ BLUE</span>
                            <span className="text-white font-bold">{toneCB.yellowBlue > 0 ? `+${toneCB.yellowBlue}` : toneCB.yellowBlue}</span>
                          </div>
                          <input
                            type="range"
                            min="-100"
                            max="100"
                            value={toneCB.yellowBlue}
                            onChange={(e) => updateCbValue('yellowBlue', parseInt(e.target.value))}
                            className="w-full accent-blue-500 bg-[#252530] h-1"
                          />
                        </div>

                        <div className="flex items-center gap-2 mt-4 text-[11px]">
                          <input
                            type="checkbox"
                            id="preserve-lum"
                            checked={params.colorBalancePreserveLuminosity}
                            onChange={(e) => handleParamChange('colorBalancePreserveLuminosity', e.target.checked)}
                            className="accent-indigo-500 rounded border-gray-600 bg-gray-700"
                          />
                          <label htmlFor="preserve-lum" className="text-gray-400">
                            Preserve Luminosity
                          </label>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* === Black & White === */}
              {selectedType === 'black-white' && (
                <div className="space-y-4">
                  {/* Presets */}
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-gray-400">Presets:</span>
                    <select
                      onChange={(e) => {
                        const val = e.target.value;
                        let sliders = { red: 40, yellow: 60, green: 40, cyan: 60, blue: 20, magenta: 80 };
                        if (val === 'landscape') sliders = { red: 30, yellow: 80, green: 70, cyan: 50, blue: 10, magenta: 60 };
                        if (val === 'portrait') sliders = { red: 60, yellow: 50, green: 30, cyan: 40, blue: 30, magenta: 70 };
                        if (val === 'high-contrast') sliders = { red: 80, yellow: 90, green: 10, cyan: 10, blue: 0, magenta: 100 };
                        if (val === 'infrared') sliders = { red: -20, yellow: 150, green: 120, cyan: 100, blue: -20, magenta: 80 };
                        handleParamChange('blackAndWhiteSliders', sliders);
                      }}
                      className="bg-[#1c1c24] border border-[#2a2a35] text-gray-200 text-xs rounded px-2.5 py-1 outline-none cursor-pointer"
                    >
                      <option value="default">Default</option>
                      <option value="landscape">Landscape</option>
                      <option value="portrait">Portrait</option>
                      <option value="high-contrast">High Contrast</option>
                      <option value="infrared">Infrared</option>
                    </select>
                  </div>

                  {(() => {
                    const sliders = params.blackAndWhiteSliders || { red: 40, yellow: 60, green: 40, cyan: 60, blue: 20, magenta: 80 };
                    const updateBwSlider = (key: keyof typeof sliders, val: number) => {
                      handleParamChange('blackAndWhiteSliders', { ...sliders, [key]: val });
                    };

                    return (
                      <div className="grid grid-cols-2 gap-4 border-t border-[#1b1b24] pt-4">
                        {(Object.keys(sliders) as Array<keyof typeof sliders>).map((color) => (
                          <div key={color} className="space-y-1">
                            <div className="flex justify-between text-[10px] text-gray-400 capitalize">
                              <span>{color}</span>
                              <span className="font-mono text-white font-bold">{sliders[color]}%</span>
                            </div>
                            <input
                              type="range"
                              min="-200"
                              max="300"
                              value={sliders[color]}
                              onChange={(e) => updateBwSlider(color, parseInt(e.target.value))}
                              className="w-full accent-indigo-500 bg-[#252530] h-1"
                            />
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* === Photo Filter === */}
              {selectedType === 'photo-filter' && (
                <div className="space-y-4">
                  {(() => {
                    const pf = params.photoFilter || { filterType: 'warming', density: 25, preserveLuminosity: true };
                    const updatePf = (key: keyof typeof pf, val: any) => {
                      handleParamChange('photoFilter', { ...pf, [key]: val });
                    };

                    return (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] text-gray-400">Filter Type:</span>
                          <select
                            value={pf.filterType}
                            onChange={(e) => updatePf('filterType', e.target.value)}
                            className="bg-[#1c1c24] border border-[#2a2a35] text-gray-200 text-xs rounded px-2.5 py-1 outline-none cursor-pointer"
                          >
                            <option value="warming">Warming Filter (85)</option>
                            <option value="cooling">Cooling Filter (80)</option>
                            <option value="sepia">Sepia tint</option>
                            <option value="neutral">Neutral Density (Gray)</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] text-gray-400">
                            <span>Density (Intensity)</span>
                            <span className="font-mono text-white font-bold">{pf.density}%</span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="100"
                            value={pf.density}
                            onChange={(e) => updatePf('density', parseInt(e.target.value))}
                            className="w-full accent-indigo-500 bg-[#252530] h-1"
                          />
                        </div>

                        <div className="flex items-center gap-2 mt-4 text-[11px]">
                          <input
                            type="checkbox"
                            id="pf-preserve-lum"
                            checked={pf.preserveLuminosity}
                            onChange={(e) => updatePf('preserveLuminosity', e.target.checked)}
                            className="accent-indigo-500 rounded border-gray-600 bg-gray-700"
                          />
                          <label htmlFor="pf-preserve-lum" className="text-gray-400">
                            Preserve Luminosity
                          </label>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* === Channel Mixer === */}
              {selectedType === 'channel-mixer' && (
                <div className="space-y-4">
                  {(() => {
                    const mix = params.channelMixer || {
                      red: { r: 100, g: 0, b: 0, constant: 0 },
                      green: { r: 0, g: 100, b: 0, constant: 0 },
                      blue: { r: 0, g: 0, b: 100, constant: 0 },
                      monochrome: false,
                    };
                    const updateMix = (chan: 'red' | 'green' | 'blue', key: 'r' | 'g' | 'b' | 'constant', val: number) => {
                      const updated = {
                        ...mix,
                        [chan]: {
                          ...mix[chan],
                          [key]: val,
                        },
                      };
                      handleParamChange('channelMixer', updated);
                    };

                    const activeMixChan = mix[mixerOutputChannel];

                    return (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] text-gray-400">Output Channel:</span>
                          <select
                            value={mixerOutputChannel}
                            onChange={(e) => setMixerOutputChannel(e.target.value as any)}
                            disabled={mix.monochrome}
                            className="bg-[#1c1c24] border border-[#2a2a35] text-gray-200 text-xs rounded px-2.5 py-1 outline-none cursor-pointer disabled:opacity-30"
                          >
                            <option value="red">Red</option>
                            <option value="green">Green</option>
                            <option value="blue">Blue</option>
                          </select>

                          <div className="flex items-center gap-1.5 ml-auto text-[11px]">
                            <input
                              type="checkbox"
                              id="mix-mono"
                              checked={mix.monochrome}
                              onChange={(e) => {
                                handleParamChange('channelMixer', { ...mix, monochrome: e.target.checked });
                                if (e.target.checked) setMixerOutputChannel('red');
                              }}
                              className="accent-indigo-500 rounded border-gray-600 bg-gray-700"
                            />
                            <label htmlFor="mix-mono" className="text-gray-400">
                              Monochrome
                            </label>
                          </div>
                        </div>

                        <div className="space-y-4 border-t border-[#1b1b24] pt-4">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] text-gray-400">
                              <span>Source Red</span>
                              <span className="font-mono text-white font-bold">{activeMixChan.r}%</span>
                            </div>
                            <input
                              type="range"
                              min="-200"
                              max="200"
                              value={activeMixChan.r}
                              onChange={(e) => updateMix(mixerOutputChannel, 'r', parseInt(e.target.value))}
                              className="w-full accent-red-500 bg-[#252530] h-1"
                            />
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] text-gray-400">
                              <span>Source Green</span>
                              <span className="font-mono text-white font-bold">{activeMixChan.g}%</span>
                            </div>
                            <input
                              type="range"
                              min="-200"
                              max="200"
                              value={activeMixChan.g}
                              onChange={(e) => updateMix(mixerOutputChannel, 'g', parseInt(e.target.value))}
                              className="w-full accent-green-500 bg-[#252530] h-1"
                            />
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] text-gray-400">
                              <span>Source Blue</span>
                              <span className="font-mono text-white font-bold">{activeMixChan.b}%</span>
                            </div>
                            <input
                              type="range"
                              min="-200"
                              max="200"
                              value={activeMixChan.b}
                              onChange={(e) => updateMix(mixerOutputChannel, 'b', parseInt(e.target.value))}
                              className="w-full accent-blue-500 bg-[#252530] h-1"
                            />
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] text-gray-400">
                              <span>Constant (Offset)</span>
                              <span className="font-mono text-white font-bold">{activeMixChan.constant}%</span>
                            </div>
                            <input
                              type="range"
                              min="-100"
                              max="100"
                              value={activeMixChan.constant}
                              onChange={(e) => updateMix(mixerOutputChannel, 'constant', parseInt(e.target.value))}
                              className="w-full accent-gray-500 bg-[#252530] h-1"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* === Color Lookup (LUT) === */}
              {selectedType === 'color-lookup' && (
                <div className="space-y-4">
                  {(() => {
                    const cl = params.colorLookup || { name: 'Teal & Orange' };

                    return (
                      <div className="space-y-5">
                        <div className="space-y-2">
                          <span className="text-[11px] text-gray-400 block">Built-in Presets LUTs:</span>
                          <div className="grid grid-cols-2 gap-2">
                            {['Teal & Orange', 'Vintage Film', 'Warm Golden', 'Cool Shadow'].map((lutName) => (
                              <button
                                key={lutName}
                                onClick={() => handleParamChange('colorLookup', { name: lutName })}
                                className={`px-3 py-2 rounded text-xs font-semibold cursor-pointer border text-center transition-all ${
                                  cl.name === lutName && !cl.cubeData
                                    ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/50'
                                    : 'bg-[#1c1c24] text-gray-400 border-transparent hover:bg-[#252533]'
                                }`}
                              >
                                {lutName}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="border-t border-[#1b1b24] pt-4 space-y-2">
                          <span className="text-[11px] text-gray-400 block">Load Custom .3DL / .CUBE LUT file:</span>
                          
                          <label className="flex items-center gap-2 justify-center border border-dashed border-[#444458] hover:border-indigo-500 bg-[#1c1c24] hover:bg-[#20202d] rounded-lg py-4 cursor-pointer text-xs text-gray-400 hover:text-white transition-all select-none">
                            <FileCode className="w-5 h-5 text-indigo-400" />
                            <span>{cl.cubeData ? `LUT Loaded: ${cl.name}` : 'Choose .CUBE file...'}</span>
                            <input
                              type="file"
                              accept=".cube"
                              onChange={handleLutUpload}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* === Invert === */}
              {selectedType === 'invert' && (
                <div className="space-y-4">
                  <div className="bg-[#1c1c24] p-4 rounded border border-[#2b2b36] space-y-2 text-xs">
                    <p className="text-gray-300">
                      This adjustment inverts the color values of the active layer pixels.
                    </p>
                    <p className="text-gray-500 font-mono">
                      Output Channel = 255 - Input Channel
                    </p>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-gray-400">
                      <span>Invert Intensity</span>
                      <span className="font-mono text-white font-bold">{params.invert}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={params.invert}
                      onChange={(e) => handleParamChange('invert', parseInt(e.target.value))}
                      className="w-full accent-indigo-500 bg-[#252530] h-1"
                    />
                  </div>
                </div>
              )}

              {/* === Posterize === */}
              {selectedType === 'posterize' && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-gray-400">
                      <span>Posterize Levels</span>
                      <span className="font-mono text-white font-bold">{params.posterizeLevels}</span>
                    </div>
                    <input
                      type="range"
                      min="2"
                      max="255"
                      value={params.posterizeLevels || 4}
                      onChange={(e) => handleParamChange('posterizeLevels', parseInt(e.target.value))}
                      className="w-full accent-indigo-500 bg-[#252530] h-1"
                    />
                  </div>
                </div>
              )}

              {/* === Threshold === */}
              {selectedType === 'threshold' && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-gray-400">
                      <span>Threshold Level</span>
                      <span className="font-mono text-white font-bold">{params.thresholdValue}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="255"
                      value={params.thresholdValue}
                      onChange={(e) => handleParamChange('thresholdValue', parseInt(e.target.value))}
                      className="w-full accent-indigo-500 bg-[#252530] h-1"
                    />
                  </div>
                </div>
              )}

              {/* === Gradient Map === */}
              {selectedType === 'gradient-map' && (
                <div className="space-y-4">
                  {(() => {
                    const gm = params.gradientMap || {
                      stops: [{ offset: 0, color: '#000000' }, { offset: 1, color: '#ffffff' }],
                      opacity: 100,
                      blendMode: 'normal',
                    };
                    const updateStopColor = (idx: number, col: string) => {
                      const updatedStops = gm.stops.map((st, i) => (i === idx ? { ...st, color: col } : st));
                      handleParamChange('gradientMap', { ...gm, stops: updatedStops });
                    };
                    const addStop = () => {
                      const newStop = { offset: 0.5, color: '#888888' };
                      const updatedStops = [...gm.stops, newStop].sort((a, b) => a.offset - b.offset);
                      handleParamChange('gradientMap', { ...gm, stops: updatedStops });
                    };

                    return (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <span className="text-[11px] text-gray-400 block">Gradient Editor:</span>
                          <div className="h-6 w-full rounded border border-[#2b2b36] relative flex overflow-hidden"
                               style={{
                                 background: `linear-gradient(to right, ${gm.stops.map((s) => `${s.color} ${s.offset * 100}%`).join(', ')})`,
                               }}
                          />
                          <div className="flex gap-2 items-center">
                            {gm.stops.map((stop, sidx) => (
                              <div key={sidx} className="flex flex-col items-center gap-1">
                                <span className="text-[9px] font-mono text-gray-500">Stop {sidx + 1}</span>
                                <input
                                  type="color"
                                  value={stop.color}
                                  onChange={(e) => updateStopColor(sidx, e.target.value)}
                                  className="w-6 h-6 rounded border border-gray-600 bg-transparent cursor-pointer"
                                />
                              </div>
                            ))}
                            <button
                              onClick={addStop}
                              className="px-2 py-1 bg-[#1c1c24] hover:bg-[#232330] border border-[#2d2d3a] rounded text-[9px] text-indigo-400 font-bold ml-auto cursor-pointer"
                            >
                              Add Stop
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1 border-t border-[#1b1b24] pt-4">
                          <div className="flex justify-between text-[11px] text-gray-400">
                            <span>Opacity</span>
                            <span className="font-mono text-white font-bold">{gm.opacity}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={gm.opacity}
                            onChange={(e) => handleParamChange('gradientMap', { ...gm, opacity: parseInt(e.target.value) })}
                            className="w-full accent-indigo-500 bg-[#252530] h-1"
                          />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* === Selective Color === */}
              {selectedType === 'selective-color' && (
                <div className="space-y-4">
                  {(() => {
                    const sel = params.selectiveColor || {
                      relative: true,
                      colors: { Reds: { c: 0, m: 0, y: 0, k: 0 } },
                    };
                    const activeGroupColors = sel.colors[selectiveColorGroup] || { c: 0, m: 0, y: 0, k: 0 };
                    
                    const updateSelValue = (chan: keyof typeof activeGroupColors, val: number) => {
                      const updatedColors = {
                        ...sel.colors,
                        [selectiveColorGroup]: {
                          ...activeGroupColors,
                          [chan]: val,
                        },
                      };
                      handleParamChange('selectiveColor', { ...sel, colors: updatedColors });
                    };

                    return (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-gray-400">Colors:</span>
                            <select
                              value={selectiveColorGroup}
                              onChange={(e) => setSelectiveColorGroup(e.target.value)}
                              className="bg-[#1c1c24] border border-[#2a2a35] text-gray-200 text-xs rounded px-2 py-0.5 outline-none cursor-pointer"
                            >
                              {['Reds', 'Yellows', 'Greens', 'Cyans', 'Blues', 'Magentas', 'Whites', 'Neutrals', 'Blacks'].map((col) => (
                                <option key={col} value={col}>
                                  {col}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex gap-4 text-[11px]">
                            <label className="flex items-center gap-1 text-gray-400 cursor-pointer">
                              <input
                                type="radio"
                                name="sel-mode"
                                checked={sel.relative}
                                onChange={() => handleParamChange('selectiveColor', { ...sel, relative: true })}
                                className="accent-indigo-500"
                              />
                              Relative
                            </label>
                            <label className="flex items-center gap-1 text-gray-400 cursor-pointer">
                              <input
                                type="radio"
                                name="sel-mode"
                                checked={!sel.relative}
                                onChange={() => handleParamChange('selectiveColor', { ...sel, relative: false })}
                                className="accent-indigo-500"
                              />
                              Absolute
                            </label>
                          </div>
                        </div>

                        <div className="space-y-4 border-t border-[#1b1b24] pt-4">
                          {(['c', 'm', 'y', 'k'] as const).map((ch) => (
                            <div key={ch} className="space-y-1">
                              <div className="flex justify-between text-[11px] text-gray-400 uppercase">
                                <span>{ch === 'c' ? 'Cyan' : ch === 'm' ? 'Magenta' : ch === 'y' ? 'Yellow' : 'Black'} ({selectiveColorGroup})</span>
                                <span className="font-mono text-white font-bold">{activeGroupColors[ch] > 0 ? `+${activeGroupColors[ch]}` : activeGroupColors[ch]}%</span>
                              </div>
                              <input
                                type="range"
                                min="-100"
                                max="100"
                                value={activeGroupColors[ch]}
                                onChange={(e) => updateSelValue(ch, parseInt(e.target.value))}
                                className="w-full accent-indigo-500 bg-[#252530] h-1"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* === Match Color === */}
              {selectedType === 'match-color' && (
                <div className="space-y-4">
                  {(() => {
                    const mc = params.matchColor || { sourceProjId: '', luminance: 100, colorIntensity: 100, fade: 0 };
                    
                    return (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] text-gray-400">Source Document:</span>
                          <select
                            value={mc.sourceProjId}
                            onChange={(e) => handleParamChange('matchColor', { ...mc, sourceProjId: e.target.value })}
                            className="bg-[#1c1c24] border border-[#2a2a35] text-gray-200 text-xs rounded px-2.5 py-1 outline-none cursor-pointer"
                          >
                            <option value="">Select source document...</option>
                            {projects.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-4 border-t border-[#1b1b24] pt-4">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] text-gray-400">
                              <span>Luminance</span>
                              <span className="font-mono text-white font-bold">{mc.luminance}%</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="200"
                              value={mc.luminance}
                              onChange={(e) => handleParamChange('matchColor', { ...mc, luminance: parseInt(e.target.value) })}
                              className="w-full accent-indigo-500 bg-[#252530] h-1"
                            />
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] text-gray-400">
                              <span>Color Intensity</span>
                              <span className="font-mono text-white font-bold">{mc.colorIntensity}%</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="200"
                              value={mc.colorIntensity}
                              onChange={(e) => handleParamChange('matchColor', { ...mc, colorIntensity: parseInt(e.target.value) })}
                              className="w-full accent-indigo-500 bg-[#252530] h-1"
                            />
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] text-gray-400">
                              <span>Fade (Match Amount)</span>
                              <span className="font-mono text-white font-bold">{mc.fade}%</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={mc.fade}
                              onChange={(e) => handleParamChange('matchColor', { ...mc, fade: parseInt(e.target.value) })}
                              className="w-full accent-indigo-500 bg-[#252530] h-1"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* === Replace Color === */}
              {selectedType === 'replace-color' && (
                <div className="space-y-4">
                  {(() => {
                    const rc = params.replaceColor || { targetColor: '#ff0000', fuzziness: 40, hue: 0, saturation: 0, lightness: 0 };
                    
                    return (
                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-gray-400">Replace Color:</span>
                            <input
                              type="color"
                              value={rc.targetColor}
                              onChange={(e) => handleParamChange('replaceColor', { ...rc, targetColor: e.target.value })}
                              className="w-8 h-8 rounded border border-gray-600 bg-transparent cursor-pointer"
                            />
                          </div>

                          <div className="flex-1 space-y-1">
                            <div className="flex justify-between text-[10px] text-gray-400">
                              <span>Fuzziness (Tolerance)</span>
                              <span className="font-mono text-white font-bold">{rc.fuzziness}</span>
                            </div>
                            <input
                              type="range"
                              min="1"
                              max="200"
                              value={rc.fuzziness}
                              onChange={(e) => handleParamChange('replaceColor', { ...rc, fuzziness: parseInt(e.target.value) })}
                              className="w-full accent-indigo-500 bg-[#252530] h-1"
                            />
                          </div>
                        </div>

                        <div className="space-y-4 border-t border-[#1b1b24] pt-4">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] text-gray-400">
                              <span>Hue Shift</span>
                              <span className="font-mono text-white font-bold">{rc.hue}°</span>
                            </div>
                            <input
                              type="range"
                              min="-180"
                              max="180"
                              value={rc.hue}
                              onChange={(e) => handleParamChange('replaceColor', { ...rc, hue: parseInt(e.target.value) })}
                              className="w-full accent-indigo-500 bg-[#252530] h-1"
                            />
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] text-gray-400">
                              <span>Saturation Shift</span>
                              <span className="font-mono text-white font-bold">{rc.saturation}%</span>
                            </div>
                            <input
                              type="range"
                              min="-100"
                              max="100"
                              value={rc.saturation}
                              onChange={(e) => handleParamChange('replaceColor', { ...rc, saturation: parseInt(e.target.value) })}
                              className="w-full accent-indigo-500 bg-[#252530] h-1"
                            />
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] text-gray-400">
                              <span>Lightness Shift</span>
                              <span className="font-mono text-white font-bold">{rc.lightness}%</span>
                            </div>
                            <input
                              type="range"
                              min="-100"
                              max="100"
                              value={rc.lightness}
                              onChange={(e) => handleParamChange('replaceColor', { ...rc, lightness: parseInt(e.target.value) })}
                              className="w-full accent-indigo-500 bg-[#252530] h-1"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* === Shadows / Highlights === */}
              {selectedType === 'shadows-highlights' && (
                <div className="space-y-4">
                  {(() => {
                    const sh = params.shadowsHighlights || { shadowAmount: 35, highlightAmount: 0, radius: 30, colorCorrection: 20, midtoneContrast: 0 };
                    const updateSh = (key: keyof typeof sh, val: number) => {
                      handleParamChange('shadowsHighlights', { ...sh, [key]: val });
                    };

                    return (
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] text-gray-400">
                            <span>Shadow Amount</span>
                            <span className="font-mono text-white font-bold">{sh.shadowAmount}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={sh.shadowAmount}
                            onChange={(e) => updateSh('shadowAmount', parseInt(e.target.value))}
                            className="w-full accent-indigo-500 bg-[#252530] h-1"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] text-gray-400">
                            <span>Highlight Amount</span>
                            <span className="font-mono text-white font-bold">{sh.highlightAmount}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={sh.highlightAmount}
                            onChange={(e) => updateSh('highlightAmount', parseInt(e.target.value))}
                            className="w-full accent-indigo-500 bg-[#252530] h-1"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] text-gray-400">
                            <span>Tonal Radius</span>
                            <span className="font-mono text-white font-bold">{sh.radius}px</span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="100"
                            value={sh.radius}
                            onChange={(e) => updateSh('radius', parseInt(e.target.value))}
                            className="w-full accent-indigo-500 bg-[#252530] h-1"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] text-gray-400">
                            <span>Color Correction</span>
                            <span className="font-mono text-white font-bold">{(sh.colorCorrection > 0 ? '+' : '') + sh.colorCorrection}%</span>
                          </div>
                          <input
                            type="range"
                            min="-100"
                            max="100"
                            value={sh.colorCorrection}
                            onChange={(e) => updateSh('colorCorrection', parseInt(e.target.value))}
                            className="w-full accent-indigo-500 bg-[#252530] h-1"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] text-gray-400">
                            <span>Midtone Contrast</span>
                            <span className="font-mono text-white font-bold">{(sh.midtoneContrast > 0 ? '+' : '') + sh.midtoneContrast}%</span>
                          </div>
                          <input
                            type="range"
                            min="-100"
                            max="100"
                            value={sh.midtoneContrast}
                            onChange={(e) => updateSh('midtoneContrast', parseInt(e.target.value))}
                            className="w-full accent-indigo-500 bg-[#252530] h-1"
                          />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* === HDR Toning === */}
              {selectedType === 'hdr-toning' && (
                <div className="space-y-4">
                  {(() => {
                    const hdr = params.hdrToning || { strength: 50, radius: 15, detail: 20, gamma: 1.0, exposure: 0 };
                    const updateHdr = (key: keyof typeof hdr, val: number) => {
                      handleParamChange('hdrToning', { ...hdr, [key]: val });
                    };

                    return (
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] text-gray-400">
                            <span>HDR Strength</span>
                            <span className="font-mono text-white font-bold">{hdr.strength}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={hdr.strength}
                            onChange={(e) => updateHdr('strength', parseInt(e.target.value))}
                            className="w-full accent-indigo-500 bg-[#252530] h-1"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] text-gray-400">
                            <span>Detail Enhancement</span>
                            <span className="font-mono text-white font-bold">{hdr.detail}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={hdr.detail}
                            onChange={(e) => updateHdr('detail', parseInt(e.target.value))}
                            className="w-full accent-indigo-500 bg-[#252530] h-1"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] text-gray-400">
                            <span>HDR Filter Radius</span>
                            <span className="font-mono text-white font-bold">{hdr.radius}px</span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="100"
                            value={hdr.radius}
                            onChange={(e) => updateHdr('radius', parseInt(e.target.value))}
                            className="w-full accent-indigo-500 bg-[#252530] h-1"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] text-gray-400">
                            <span>Local Contrast Gamma</span>
                            <span className="font-mono text-white font-bold">{hdr.gamma.toFixed(2)}</span>
                          </div>
                          <input
                            type="range"
                            min="10"
                            max="300"
                            value={hdr.gamma * 100}
                            onChange={(e) => updateHdr('gamma', parseInt(e.target.value) / 100)}
                            className="w-full accent-indigo-500 bg-[#252530] h-1"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] text-gray-400">
                            <span>HDR Exposure Compensation</span>
                            <span className="font-mono text-white font-bold">{hdr.exposure > 0 ? `+${hdr.exposure}` : hdr.exposure}</span>
                          </div>
                          <input
                            type="range"
                            min="-100"
                            max="100"
                            value={hdr.exposure}
                            onChange={(e) => updateHdr('exposure', parseInt(e.target.value))}
                            className="w-full accent-indigo-500 bg-[#252530] h-1"
                          />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

            </div>

            {/* Right-most Histogram & Apply side column */}
            <div className="w-64 flex flex-col gap-6 select-none shrink-0 border-l border-[#24242c] pl-6 justify-between">
              
              {/* Live Histogram Display */}
              <HistogramEngine sourceCanvas={workspaceCanvas} height={100} />

              <div className="space-y-4">
                {/* Apply Mode Selector */}
                <div className="space-y-2">
                  <span className="text-[10px] text-gray-500 font-mono tracking-wider block uppercase">Execution workflow</span>
                  <div className="flex flex-col gap-1.5 text-[11px] text-gray-300">
                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded-md hover:bg-[#1a1a24] bg-black/20">
                      <input
                        type="radio"
                        name="apply-target"
                        checked={targetMode === 'layer'}
                        onChange={() => setTargetMode('layer')}
                        className="accent-indigo-500"
                      />
                      <div className="flex flex-col">
                        <span className="font-bold text-white">Create Adjustment Layer</span>
                        <span className="text-[9px] text-gray-500">Non-destructive workflow</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded-md hover:bg-[#1a1a24] bg-black/20">
                      <input
                        type="radio"
                        name="apply-target"
                        checked={targetMode === 'direct'}
                        onChange={() => setTargetMode('direct')}
                        className="accent-indigo-500"
                      />
                      <div className="flex flex-col">
                        <span className="font-bold text-white">Apply Directly</span>
                        <span className="text-[9px] text-gray-500">Modifies active layer pixels</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Preview Checkbox & Reset */}
                <div className="flex items-center justify-between text-xs pt-2">
                  <label className="flex items-center gap-2 text-gray-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={previewEnabled}
                      onChange={(e) => setPreviewEnabled(e.target.checked)}
                      className="accent-indigo-500 rounded border-gray-600 bg-gray-700"
                    />
                    Preview Canvas
                  </label>

                  <button
                    onClick={handleReset}
                    className="flex items-center gap-1 text-[10px] font-bold text-amber-500 hover:text-amber-400 cursor-pointer transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Reset
                  </button>
                </div>
              </div>

              {/* Apply / Cancel */}
              <div className="flex gap-2 pt-4 border-t border-[#24242c]">
                <button
                  onClick={onCancel}
                  className="flex-1 py-2 bg-[#1e1e24] hover:bg-[#252530] border border-[#2d2d3a] rounded-lg text-xs font-semibold text-gray-400 hover:text-white cursor-pointer text-center transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApply}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-semibold text-white cursor-pointer text-center transition-colors shadow-lg"
                >
                  Apply Filter
                </button>
              </div>

            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
