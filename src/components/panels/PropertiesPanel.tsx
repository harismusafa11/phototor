/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sliders, Type, Square, Paintbrush, RotateCcw, Compass } from 'lucide-react';
import { Layer, ToolType, SubToolType, Adjustments, ShapeType, ColorBalance } from '../../types';
import { GOOGLE_FONTS, SYSTEM_FONTS, loadGoogleFont } from '../../utils/fontLoader';

const ALL_FONTS = [...GOOGLE_FONTS, ...SYSTEM_FONTS].sort();

interface PropertiesPanelProps {
  activeLayer: Layer | null;
  activeTool: ToolType;
  activeSubTool?: SubToolType;
  adjustments: Adjustments;
  setAdjustments: (adj: Adjustments) => void;
  onUpdateLayer: (id: string, updates: Partial<Layer>) => void;
  
  // Brush properties
  brushColor: string;
  setBrushColor: (c: string) => void;
  brushSize: number;
  setBrushSize: (s: number) => void;
  brushOpacity: number;
  setBrushOpacity: (o: number) => void;
  onApplyHealing?: () => void;
  onApplyMask?: (id: string) => void;
  onDeleteMask?: (id: string) => void;
}

export default function PropertiesPanel({
  activeLayer,
  activeTool,
  activeSubTool,
  onUpdateLayer,
  brushColor,
  setBrushColor,
  brushSize,
  setBrushSize,
  brushOpacity,
  setBrushOpacity,
  onApplyHealing,
  onApplyMask,
  onDeleteMask,
}: PropertiesPanelProps) {

  const [customFonts, setCustomFonts] = React.useState<{ name: string; family: string }[]>([]);
  const handleAdjustmentChange = (key: keyof Adjustments, val: any) => {
    if (!activeLayer) return;
    const currentAdj = activeLayer.adjustments || {
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
    };
    onUpdateLayer(activeLayer.id, {
      adjustments: {
        ...currentAdj,
        [key]: val
      }
    });
  };

  const handleColorBalanceChange = (channel: keyof ColorBalance, val: number) => {
    if (!activeLayer) return;
    const currentAdj = activeLayer.adjustments || {
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
    };
    const currentCB = currentAdj.colorBalance || {
      cyanRed: 0,
      magentaGreen: 0,
      yellowBlue: 0
    };
    onUpdateLayer(activeLayer.id, {
      adjustments: {
        ...currentAdj,
        colorBalance: {
          ...currentCB,
          [channel]: val
        }
      }
    });
  };
  const fonts = [
    ...ALL_FONTS.map((f) => ({ name: f, family: f })),
    ...customFonts
  ];

  const handleFontUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fontName = 'Uploaded_' + file.name.split('.')[0].replace(/[^a-zA-Z0-9]/g, '_');
    try {
      const buffer = await file.arrayBuffer();
      const fontFace = new FontFace(fontName, buffer);
      const loadedFace = await fontFace.load();
      document.fonts.add(loadedFace);
      setCustomFonts((prev) => [...prev, { name: file.name.split('.')[0], family: fontName }]);
      if (activeLayer) {
        onUpdateLayer(activeLayer.id, { fontFamily: fontName });
      }
    } catch (err) {
      alert('Error loading custom font: ' + err);
    }
  };

  return (
    <div className="flex flex-col w-full h-full text-xs select-none bg-[#1e1e1f]">
      <div className="flex-1 overflow-y-auto p-2.5 space-y-4 scrollbar-thin">
        
        {/* Layer Mini-Map/Navigator block */}
        <div className="space-y-2 bg-[#252526] p-2 rounded border border-[#2d2d2d]">
          <div className="flex items-center justify-between text-[9px] font-mono font-bold tracking-wider text-emerald-400">
            <span className="flex items-center gap-1">
              <Compass className="w-3 h-3 text-emerald-400" />
              NAVIGATOR MINI-MAP
            </span>
            <span className="text-emerald-500 font-sans">• LIVE</span>
          </div>
          
          <div className="relative h-16 bg-[#0d0d0f] rounded border border-[#2d2d2d] flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: 'radial-gradient(circle, #818cf8 0.5px, transparent 0.5px)',
              backgroundSize: '6px 6px',
            }} />
            
            <div className="relative w-20 h-10 border border-gray-700/50 bg-[#1e1e24]/40 flex items-center justify-center rounded">
              {activeLayer ? (
                <div className="absolute border border-indigo-500 bg-indigo-500/10 text-indigo-300 px-1 py-0.5 rounded text-[8px] max-w-full truncate font-mono scale-90">
                  {activeLayer.name}
                </div>
              ) : (
                <span className="text-gray-600 font-mono text-[8px]">CANVAS</span>
              )}
              <div className="absolute w-10 h-6 border border-red-500 bg-red-500/5 rounded pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Selected Layer Properties */}
        {activeLayer && activeLayer.type !== 'adjustment' ? (
          <div className="space-y-3 bg-[#252526] p-2.5 rounded border border-[#2d2d2d]">
            <div className="flex items-center gap-1.5 text-[9px] font-mono font-bold tracking-wider text-indigo-400">
              <Sliders className="w-3 h-3" />
              <span>TRANSFORM PROPERTIES</span>
            </div>
            
            {/* Position inputs */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-gray-500 block mb-0.5 text-[9px]">X Position</label>
                <input
                  type="number"
                  value={Math.round(activeLayer.x)}
                  disabled={activeLayer.locked}
                  onChange={(e) => onUpdateLayer(activeLayer.id, { x: parseInt(e.target.value) || 0 })}
                  className="w-full bg-[#1c1c1d] border border-[#3e3e3e] rounded p-1 text-white font-mono text-center focus:outline-none"
                />
              </div>
              <div>
                <label className="text-gray-500 block mb-0.5 text-[9px]">Y Position</label>
                <input
                  type="number"
                  value={Math.round(activeLayer.y)}
                  disabled={activeLayer.locked}
                  onChange={(e) => onUpdateLayer(activeLayer.id, { y: parseInt(e.target.value) || 0 })}
                  className="w-full bg-[#1c1c1d] border border-[#3e3e3e] rounded p-1 text-white font-mono text-center focus:outline-none"
                />
              </div>
            </div>

            {/* Dimension inputs */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-gray-500 block mb-0.5 text-[9px]">Width (px)</label>
                <input
                  type="number"
                  value={Math.round(activeLayer.width)}
                  disabled={activeLayer.locked}
                  onChange={(e) => onUpdateLayer(activeLayer.id, { width: Math.max(5, parseInt(e.target.value) || 5) })}
                  className="w-full bg-[#1c1c1d] border border-[#3e3e3e] rounded p-1 text-white font-mono text-center focus:outline-none"
                />
              </div>
              <div>
                <label className="text-gray-500 block mb-0.5 text-[9px]">Height (px)</label>
                <input
                  type="number"
                  value={Math.round(activeLayer.height)}
                  disabled={activeLayer.locked}
                  onChange={(e) => onUpdateLayer(activeLayer.id, { height: Math.max(5, parseInt(e.target.value) || 5) })}
                  className="w-full bg-[#1c1c1d] border border-[#3e3e3e] rounded p-1 text-white font-mono text-center focus:outline-none"
                />
              </div>
            </div>

            {/* Rotation slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-gray-400 text-[10px]">
                <span>Rotation Angle:</span>
                <span className="font-mono text-gray-300">{activeLayer.rotation || 0}°</span>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                value={activeLayer.rotation || 0}
                disabled={activeLayer.locked}
                onChange={(e) => onUpdateLayer(activeLayer.id, { rotation: parseInt(e.target.value) })}
                className="w-full accent-indigo-500 h-1 bg-[#1c1c1d] cursor-pointer"
              />
            </div>
          </div>
        ) : activeLayer && activeLayer.type === 'adjustment' ? (
          <div className="space-y-3 bg-[#252526] p-2.5 rounded border border-[#2d2d2d]">
            <div className="flex items-center gap-1.5 text-[9px] font-mono font-bold tracking-wider text-amber-400">
              <Sliders className="w-3 h-3 text-amber-400" />
              <span>ADJUSTMENT PROPERTIES</span>
            </div>
            
            {(() => {
              const adj = activeLayer.adjustments || {
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
              };

              return (
                <div className="space-y-2.5 text-[10px]">
                  {/* Brightness */}
                  <div className="space-y-0.5">
                    <div className="flex justify-between text-gray-400">
                      <span>Brightness:</span>
                      <span className="font-mono text-gray-300">{adj.brightness}</span>
                    </div>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={adj.brightness}
                      onChange={(e) => handleAdjustmentChange('brightness', parseInt(e.target.value))}
                      className="w-full accent-amber-500 h-1 bg-[#1c1c1d] cursor-pointer"
                    />
                  </div>

                  {/* Contrast */}
                  <div className="space-y-0.5">
                    <div className="flex justify-between text-gray-400">
                      <span>Contrast:</span>
                      <span className="font-mono text-gray-300">{adj.contrast}</span>
                    </div>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={adj.contrast}
                      onChange={(e) => handleAdjustmentChange('contrast', parseInt(e.target.value))}
                      className="w-full accent-amber-500 h-1 bg-[#1c1c1d] cursor-pointer"
                    />
                  </div>

                  {/* Saturation */}
                  <div className="space-y-0.5">
                    <div className="flex justify-between text-gray-400">
                      <span>Saturation:</span>
                      <span className="font-mono text-gray-300">{adj.saturation}</span>
                    </div>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={adj.saturation}
                      onChange={(e) => handleAdjustmentChange('saturation', parseInt(e.target.value))}
                      className="w-full accent-amber-500 h-1 bg-[#1c1c1d] cursor-pointer"
                    />
                  </div>

                  {/* Hue */}
                  <div className="space-y-0.5">
                    <div className="flex justify-between text-gray-400">
                      <span>Hue Angle:</span>
                      <span className="font-mono text-gray-300">{adj.hue}°</span>
                    </div>
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      value={adj.hue}
                      onChange={(e) => handleAdjustmentChange('hue', parseInt(e.target.value))}
                      className="w-full accent-amber-500 h-1 bg-[#1c1c1d] cursor-pointer"
                    />
                  </div>

                  {/* Exposure */}
                  <div className="space-y-0.5">
                    <div className="flex justify-between text-gray-400">
                      <span>Exposure:</span>
                      <span className="font-mono text-gray-300">{adj.exposure}</span>
                    </div>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={adj.exposure}
                      onChange={(e) => handleAdjustmentChange('exposure', parseInt(e.target.value))}
                      className="w-full accent-amber-500 h-1 bg-[#1c1c1d] cursor-pointer"
                    />
                  </div>

                  {/* Blur */}
                  <div className="space-y-0.5">
                    <div className="flex justify-between text-gray-400">
                      <span>Blur:</span>
                      <span className="font-mono text-gray-300">{adj.blur}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="30"
                      value={adj.blur}
                      onChange={(e) => handleAdjustmentChange('blur', parseInt(e.target.value))}
                      className="w-full accent-amber-500 h-1 bg-[#1c1c1d] cursor-pointer"
                    />
                  </div>

                  {/* Vignette */}
                  <div className="space-y-0.5">
                    <div className="flex justify-between text-gray-400">
                      <span>Vignette:</span>
                      <span className="font-mono text-gray-300">{adj.vignette}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={adj.vignette}
                      onChange={(e) => handleAdjustmentChange('vignette', parseInt(e.target.value))}
                      className="w-full accent-amber-500 h-1 bg-[#1c1c1d] cursor-pointer"
                    />
                  </div>

                  {/* Vibrance */}
                  <div className="space-y-0.5">
                    <div className="flex justify-between text-gray-400">
                      <span>Vibrance:</span>
                      <span className="font-mono text-gray-300">{adj.vibrance !== undefined ? adj.vibrance : 0}</span>
                    </div>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={adj.vibrance !== undefined ? adj.vibrance : 0}
                      onChange={(e) => handleAdjustmentChange('vibrance', parseInt(e.target.value))}
                      className="w-full accent-amber-500 h-1 bg-[#1c1c1d] cursor-pointer"
                    />
                  </div>

                  {/* Color Balance */}
                  <div className="space-y-1.5 pt-1.5 border-t border-[#3a3a3d]">
                    <div className="text-gray-400 font-bold text-[9px] uppercase tracking-wider">Color Balance</div>
                    
                    {/* Cyan / Red */}
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[9px] text-gray-500">
                        <span>Cyan / Red:</span>
                        <span className="font-mono text-gray-300">{adj.colorBalance?.cyanRed || 0}</span>
                      </div>
                      <input
                        type="range"
                        min="-100"
                        max="100"
                        value={adj.colorBalance?.cyanRed || 0}
                        onChange={(e) => handleColorBalanceChange('cyanRed', parseInt(e.target.value))}
                        className="w-full accent-amber-500 h-1 bg-[#1c1c1d] cursor-pointer"
                      />
                    </div>

                    {/* Magenta / Green */}
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[9px] text-gray-500">
                        <span>Magenta / Green:</span>
                        <span className="font-mono text-gray-300">{adj.colorBalance?.magentaGreen || 0}</span>
                      </div>
                      <input
                        type="range"
                        min="-100"
                        max="100"
                        value={adj.colorBalance?.magentaGreen || 0}
                        onChange={(e) => handleColorBalanceChange('magentaGreen', parseInt(e.target.value))}
                        className="w-full accent-amber-500 h-1 bg-[#1c1c1d] cursor-pointer"
                      />
                    </div>

                    {/* Yellow / Blue */}
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[9px] text-gray-500">
                        <span>Yellow / Blue:</span>
                        <span className="font-mono text-gray-300">{adj.colorBalance?.yellowBlue || 0}</span>
                      </div>
                      <input
                        type="range"
                        min="-100"
                        max="100"
                        value={adj.colorBalance?.yellowBlue || 0}
                        onChange={(e) => handleColorBalanceChange('yellowBlue', parseInt(e.target.value))}
                        className="w-full accent-amber-500 h-1 bg-[#1c1c1d] cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="p-3 text-center text-gray-500 font-sans border border-[#2d2d2d] rounded bg-[#252526]">
            Select a layer to view coordinates
          </div>
        )}

        {/* Brush options */}
        {(activeTool === 'brush' || activeTool === 'eraser' || activeTool === 'stamp' || activeTool === 'healing' || activeTool === 'blur-sharpen' || activeTool === 'dodge-burn') && (
          <div className="space-y-3 bg-[#252526] p-2.5 rounded border border-[#2d2d2d]">
            <div className="flex items-center gap-1 text-[9px] font-mono font-bold tracking-wider text-indigo-400">
              <Paintbrush className="w-3 h-3" />
              <span>{activeTool.toUpperCase()} TOOL OPTIONS</span>
            </div>

            {activeTool !== 'eraser' && activeTool !== 'healing' && activeTool !== 'blur-sharpen' && activeTool !== 'dodge-burn' && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-gray-400">Brush Color:</span>
                <input
                  type="color"
                  value={brushColor}
                  onChange={(e) => setBrushColor(e.target.value)}
                  className="bg-[#1c1c1d] border border-[#3e3e3e] h-6 w-12 rounded cursor-pointer p-0.5"
                />
              </div>
            )}

            <div className="space-y-1">
              <div className="flex justify-between text-gray-400">
                <span>Brush Size:</span>
                <span className="font-mono text-gray-300">{brushSize}px</span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                value={brushSize}
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                className="w-full accent-indigo-500 h-1 bg-[#1c1c1d] cursor-pointer"
              />
            </div>

            {activeTool !== 'stamp' && activeTool !== 'healing' && (
              <div className="space-y-1">
                <div className="flex justify-between text-gray-400">
                  <span>Flow Opacity:</span>
                  <span className="font-mono text-gray-300">{Math.round(brushOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={Math.round(brushOpacity * 100)}
                  onChange={(e) => setBrushOpacity(parseFloat(e.target.value) / 100)}
                  className="w-full accent-indigo-500 h-1 bg-[#1c1c1d] cursor-pointer"
                />
              </div>
            )}

            {/* Presets */}
            {(activeTool === 'brush' || activeTool === 'eraser') && (
              <div className="pt-2 border-t border-[#3e3e3e] space-y-1.5">
                <span className="text-[9px] text-gray-500 font-bold block">ROUND PRESETS:</span>
                <div className="grid grid-cols-2 gap-1">
                  {[
                    { label: 'Basic', size: 15, opacity: 1.0 },
                    { label: 'Soft', size: 45, opacity: 0.45 },
                    { label: 'Hard', size: 4, opacity: 1.0 },
                    { label: 'Chalk', size: 30, opacity: 0.8 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => {
                        setBrushSize(preset.size);
                        setBrushOpacity(preset.opacity);
                      }}
                      className="p-1 bg-[#1c1c1d] hover:bg-[#323233] border border-[#3e3e3e] hover:border-indigo-500 rounded text-center text-[10px] text-gray-300 cursor-pointer"
                    >
                      {preset.label} ({preset.size}px)
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTool === 'healing' && (
              <div className="space-y-2">
                <p className="text-[10px] text-indigo-300 bg-indigo-500/5 p-2 rounded border border-indigo-500/10 leading-normal font-sans">
                  Paint over defects or objects on the canvas, then click the button below to heal.
                </p>
                {activeLayer && activeLayer.type === 'image' && (
                  <div className="space-y-1">
                    <button
                      onClick={onApplyHealing}
                      disabled={!activeLayer.drawingPath || activeLayer.drawingPath.length === 0}
                      className="w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-bold text-[10px] disabled:opacity-40 cursor-pointer"
                    >
                      Apply Healing
                    </button>
                    {activeLayer.drawingPath && activeLayer.drawingPath.length > 0 && (
                      <button
                        onClick={() => onUpdateLayer(activeLayer.id, { drawingPath: [] })}
                        className="w-full py-1 bg-[#1c1c1d] text-[9px] text-gray-500 hover:text-white rounded border border-[#3e3e3e] cursor-pointer"
                      >
                        Clear Stroke Path
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Text Layer Typography options */}
        {activeLayer && activeLayer.type === 'text' && (
          <div className="space-y-3 bg-[#252526] p-2.5 rounded border border-[#2d2d2d]">
            <div className="flex items-center gap-1 text-[9px] font-mono font-bold tracking-wider text-emerald-400">
              <Type className="w-3 h-3 text-emerald-400" />
              <span>TEXT ATTRIBUTES</span>
            </div>

            <div className="space-y-1">
              <label className="text-gray-500 block mb-0.5 text-[9px]">Text String</label>
              <textarea
                value={activeLayer.text || ''}
                rows={2}
                disabled={activeLayer.locked}
                onChange={(e) => onUpdateLayer(activeLayer.id, { text: e.target.value })}
                className="w-full bg-[#1c1c1d] border border-[#3e3e3e] rounded p-1.5 text-white font-medium focus:border-indigo-500 focus:outline-none text-[11px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="flex justify-between items-center mb-0.5 text-[9px]">
                  <label className="text-gray-500">Font</label>
                  <label className="text-indigo-400 hover:text-indigo-300 font-bold cursor-pointer">
                    [File]
                    <input type="file" accept=".ttf,.otf,.woff" onChange={handleFontUpload} className="hidden" />
                  </label>
                </div>
                <select
                  value={activeLayer.fontFamily || 'Inter'}
                  disabled={activeLayer.locked}
                  onChange={(e) => {
                    const font = e.target.value;
                    loadGoogleFont(font);
                    onUpdateLayer(activeLayer.id, { fontFamily: font });
                  }}
                  className="w-full bg-[#1c1c1d] border border-[#3e3e3e] rounded p-0.5 text-white focus:outline-none text-[10px]"
                >
                  {fonts.map((f) => (
                    <option key={f.family} value={f.family} style={{ fontFamily: `"${f.family}", sans-serif` }}>{f.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-gray-500 block mb-0.5 text-[9px]">Size (pt)</label>
                <input
                  type="number"
                  value={activeLayer.fontSize || 24}
                  disabled={activeLayer.locked}
                  onChange={(e) => onUpdateLayer(activeLayer.id, { fontSize: Math.max(6, parseInt(e.target.value) || 12) })}
                  className="w-full bg-[#1c1c1d] border border-[#3e3e3e] rounded p-0.5 text-white font-mono text-center focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-gray-500 block mb-0.5 text-[9px]">Weight</label>
                <select
                  value={activeLayer.fontWeight || 'normal'}
                  disabled={activeLayer.locked}
                  onChange={(e) => onUpdateLayer(activeLayer.id, { fontWeight: e.target.value })}
                  className="w-full bg-[#1c1c1d] border border-[#3e3e3e] rounded p-0.5 text-white focus:outline-none text-[10px]"
                >
                  <option value="normal">Normal</option>
                  <option value="bold">Bold</option>
                </select>
              </div>
              <div>
                <label className="text-gray-500 block mb-0.5 text-[9px]">Color</label>
                <input
                  type="color"
                  value={activeLayer.textColor || '#ffffff'}
                  disabled={activeLayer.locked}
                  onChange={(e) => onUpdateLayer(activeLayer.id, { textColor: e.target.value })}
                  className="bg-[#1c1c1d] border border-[#3e3e3e] h-6 w-full rounded cursor-pointer p-0.5"
                />
              </div>
            </div>

            <div className="flex justify-between items-center bg-[#1c1c1d] p-1 rounded border border-[#3e3e3e]">
              <span className="text-gray-500 text-[10px]">Align:</span>
              <div className="flex gap-1">
                {(['left', 'center', 'right'] as const).map((align) => (
                  <button
                    key={align}
                    onClick={() => onUpdateLayer(activeLayer.id, { textAlign: align })}
                    disabled={activeLayer.locked}
                    className={`px-1.5 py-0.5 rounded text-[8px] uppercase font-bold transition-colors ${
                      activeLayer.textAlign === align
                        ? 'bg-indigo-600 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {align}
                  </button>
                ))}
              </div>
            </div>

            {/* Text Warp options */}
            <div className="border-t border-[#3e3e3e] pt-2.5 mt-1 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-gray-400 font-bold text-[9px] uppercase tracking-wider">Text Warp Effects</label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-gray-500 block mb-0.5 text-[9px]">Warp Style</label>
                  <select
                    value={activeLayer.textWarp || 'none'}
                    disabled={activeLayer.locked}
                    onChange={(e) => {
                      onUpdateLayer(activeLayer.id, { textWarp: e.target.value as any });
                    }}
                    className="w-full bg-[#1c1c1d] border border-[#3e3e3e] rounded p-0.5 text-white focus:outline-none text-[10px]"
                  >
                    <option value="none">None</option>
                    <option value="arc">Arc</option>
                    <option value="arc-lower">Arc Lower</option>
                    <option value="arc-upper">Arc Upper</option>
                    <option value="wave">Wave</option>
                    <option value="bulge">Bulge</option>
                    <option value="flag">Flag</option>
                    <option value="fish">Fish</option>
                    <option value="twist">Twist</option>
                    <option value="squeeze">Squeeze</option>
                    <option value="inflate">Inflate</option>
                  </select>
                </div>
                {activeLayer.textWarp && activeLayer.textWarp !== 'none' && (
                  <div>
                    <label className="text-gray-500 block mb-0.5 text-[9px]">Direction</label>
                    <div className="flex bg-[#1c1c1d] rounded border border-[#3e3e3e] p-0.5">
                      {(['horizontal', 'vertical'] as const).map((d) => (
                        <button
                          key={d}
                          onClick={() => onUpdateLayer(activeLayer.id, { textWarpDir: d })}
                          disabled={activeLayer.locked}
                          className={`flex-1 py-0.5 text-[8px] font-bold rounded transition-all cursor-pointer uppercase ${
                            (activeLayer.textWarpDir || 'horizontal') === d
                              ? 'bg-indigo-600 text-white'
                              : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          {d === 'horizontal' ? 'Horiz' : 'Vert'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {activeLayer.textWarp && activeLayer.textWarp !== 'none' && (
                <div className="space-y-2 bg-[#1c1c1d] p-2 rounded border border-[#2d2d2d] mt-1">
                  {/* Bend Slider */}
                  <div className="space-y-0.5">
                    <div className="flex justify-between text-gray-500 text-[9px]">
                      <span>Bend</span>
                      <span className="font-mono text-indigo-400 font-bold">
                        {activeLayer.textWarpBend !== undefined ? activeLayer.textWarpBend : 50}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={activeLayer.textWarpBend !== undefined ? activeLayer.textWarpBend : 50}
                      disabled={activeLayer.locked}
                      onChange={(e) => {
                        onUpdateLayer(activeLayer.id, { textWarpBend: parseInt(e.target.value) });
                      }}
                      className="w-full accent-indigo-500 h-1 bg-[#141415] cursor-pointer"
                    />
                  </div>

                  {/* Horizontal Distortion Slider */}
                  <div className="space-y-0.5">
                    <div className="flex justify-between text-gray-500 text-[9px]">
                      <span>Horizontal Distortion</span>
                      <span className="font-mono text-indigo-400 font-bold">
                        {activeLayer.textWarpHorizDistortion !== undefined ? activeLayer.textWarpHorizDistortion : 0}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={activeLayer.textWarpHorizDistortion !== undefined ? activeLayer.textWarpHorizDistortion : 0}
                      disabled={activeLayer.locked}
                      onChange={(e) => {
                        onUpdateLayer(activeLayer.id, { textWarpHorizDistortion: parseInt(e.target.value) });
                      }}
                      className="w-full accent-indigo-500 h-1 bg-[#141415] cursor-pointer"
                    />
                  </div>

                  {/* Vertical Distortion Slider */}
                  <div className="space-y-0.5">
                    <div className="flex justify-between text-gray-500 text-[9px]">
                      <span>Vertical Distortion</span>
                      <span className="font-mono text-indigo-400 font-bold">
                        {activeLayer.textWarpVertDistortion !== undefined ? activeLayer.textWarpVertDistortion : 0}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={activeLayer.textWarpVertDistortion !== undefined ? activeLayer.textWarpVertDistortion : 0}
                      disabled={activeLayer.locked}
                      onChange={(e) => {
                        onUpdateLayer(activeLayer.id, { textWarpVertDistortion: parseInt(e.target.value) });
                      }}
                      className="w-full accent-indigo-500 h-1 bg-[#141415] cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Vector Shape properties */}
        {activeLayer && activeLayer.type === 'shape' && (
          <div className="space-y-3 bg-[#252526] p-2.5 rounded border border-[#2d2d2d]">
            <div className="flex items-center gap-1 text-[9px] font-mono font-bold tracking-wider text-purple-400">
              <Square className="w-3 h-3 text-purple-400" />
              <span>SHAPE GEOMETRY</span>
            </div>

            <div className="space-y-1">
              <label className="text-gray-500 block mb-0.5 text-[9px]">Shape Type</label>
              <select
                value={activeLayer.shapeType || 'rectangle'}
                disabled={activeLayer.locked}
                onChange={(e) => onUpdateLayer(activeLayer.id, { shapeType: e.target.value as ShapeType })}
                className="w-full bg-[#1c1c1d] border border-[#3e3e3e] rounded p-0.5 text-white focus:outline-none"
              >
                <option value="rectangle">Rectangle</option>
                <option value="circle">Ellipse</option>
                <option value="triangle">Triangle</option>
                <option value="line">Straight Line</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-gray-500 block mb-0.5 text-[9px]">Fill Color</label>
                <input
                  type="color"
                  value={activeLayer.fillColor === 'transparent' ? '#ffffff' : (activeLayer.fillColor || '#ffffff')}
                  disabled={activeLayer.locked}
                  onChange={(e) => onUpdateLayer(activeLayer.id, { fillColor: e.target.value })}
                  className="bg-[#1c1c1d] border border-[#3e3e3e] h-6 w-full rounded cursor-pointer p-0.5"
                />
              </div>
              <div>
                <label className="text-gray-500 block mb-0.5 text-[9px]">Stroke Color</label>
                <input
                  type="color"
                  value={activeLayer.strokeColor || '#ffffff'}
                  disabled={activeLayer.locked}
                  onChange={(e) => onUpdateLayer(activeLayer.id, { strokeColor: e.target.value })}
                  className="bg-[#1c1c1d] border border-[#3e3e3e] h-6 w-full rounded cursor-pointer p-0.5"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-gray-400">
                <span>Stroke Weight:</span>
                <span className="font-mono text-gray-300">{activeLayer.strokeWidth || 2}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="20"
                value={activeLayer.strokeWidth || 2}
                disabled={activeLayer.locked}
                onChange={(e) => onUpdateLayer(activeLayer.id, { strokeWidth: parseInt(e.target.value) })}
                className="w-full accent-indigo-500 h-1 bg-[#1c1c1d] cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Layer Styles (fx) sidebar controls */}
        {activeLayer && activeLayer.type !== 'adjustment' && (
          <div className="space-y-3 bg-[#252526] p-2.5 rounded border border-[#2d2d2d] text-[10px]">
            <div className="flex items-center gap-1.5 text-[9px] font-mono font-bold tracking-wider text-indigo-400">
              <span className="font-extrabold text-[9px]">FX</span>
              <span>LAYER EFFECTS (FX)</span>
            </div>

            {(() => {
              const styles = activeLayer.layerStyles || {};

              const handleFxChange = (updates: Partial<typeof styles>) => {
                onUpdateLayer(activeLayer.id, {
                  layerStyles: {
                    ...styles,
                    ...updates
                  }
                });
              };

              return (
                <div className="space-y-3 text-[10px]">
                  {/* Stroke outline */}
                  <div className="space-y-1.5 border-t border-[#3e3e3e]/40 pt-2">
                    {(() => {
                      const isStrokeOn = !!(styles.strokeEnabled || styles.stroke?.enabled);
                      const currentSize = styles.stroke?.size || styles.strokeSize || 3;
                      const currentColor = styles.stroke?.color || styles.strokeColor || '#ff0000';

                      return (
                        <>
                          <label className="flex items-center gap-1.5 cursor-pointer font-bold text-white">
                            <input
                              type="checkbox"
                              checked={isStrokeOn}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                handleFxChange({
                                  strokeEnabled: checked,
                                  stroke: {
                                    ...(styles.stroke || { position: 'outside', opacity: 1, blendMode: 'normal', colorType: 'color' }),
                                    enabled: checked,
                                    size: currentSize,
                                    color: currentColor,
                                  }
                                });
                              }}
                              className="accent-indigo-500 rounded cursor-pointer"
                            />
                            Stroke Outline
                          </label>
                          {isStrokeOn && (
                            <div className="pl-4 space-y-1.5 border-l border-[#3e3e3e]">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-400">Size:</span>
                                <input
                                  type="range"
                                  min="1"
                                  max="100"
                                  value={currentSize}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    handleFxChange({
                                      strokeSize: val,
                                      stroke: {
                                        ...(styles.stroke || { position: 'outside', opacity: 1, blendMode: 'normal', colorType: 'color' }),
                                        enabled: true,
                                        size: val,
                                        color: currentColor,
                                      }
                                    });
                                  }}
                                  className="w-full accent-indigo-500 h-1 cursor-pointer"
                                />
                                <span className="font-mono text-gray-300 w-8 text-right">{currentSize}px</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-gray-400">Color:</span>
                                <input
                                  type="color"
                                  value={currentColor}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    handleFxChange({
                                      strokeColor: val,
                                      stroke: {
                                        ...(styles.stroke || { position: 'outside', opacity: 1, blendMode: 'normal', colorType: 'color' }),
                                        enabled: true,
                                        size: currentSize,
                                        color: val,
                                      }
                                    });
                                  }}
                                  className="bg-transparent border border-[#3e3e3e] rounded cursor-pointer w-8 h-4.5"
                                />
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  {/* Drop shadow */}
                  <div className="space-y-1.5 border-t border-[#3e3e3e]/40 pt-2">
                    <label className="flex items-center gap-1.5 cursor-pointer font-bold text-white">
                      <input
                        type="checkbox"
                        checked={!!styles.shadowEnabled}
                        onChange={(e) => handleFxChange({ shadowEnabled: e.target.checked })}
                        className="accent-indigo-500 rounded"
                      />
                      Drop Shadow
                    </label>
                    {styles.shadowEnabled && (
                      <div className="pl-4 space-y-1.5 border-l border-[#3e3e3e] text-[9px]">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">Blur:</span>
                          <input
                            type="range"
                            min="0"
                            max="30"
                            value={styles.shadowBlur !== undefined ? styles.shadowBlur : 10}
                            onChange={(e) => handleFxChange({ shadowBlur: parseInt(e.target.value) })}
                            className="w-full accent-indigo-500 h-1 cursor-pointer"
                          />
                          <span className="font-mono text-gray-300">{styles.shadowBlur !== undefined ? styles.shadowBlur : 10}px</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">Dist X:</span>
                          <input
                            type="range"
                            min="-20"
                            max="20"
                            value={styles.shadowOffsetX !== undefined ? styles.shadowOffsetX : 5}
                            onChange={(e) => handleFxChange({ shadowOffsetX: parseInt(e.target.value) })}
                            className="w-full accent-indigo-500 h-1 cursor-pointer"
                          />
                          <span className="font-mono text-gray-300">{styles.shadowOffsetX !== undefined ? styles.shadowOffsetX : 5}px</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">Dist Y:</span>
                          <input
                            type="range"
                            min="-20"
                            max="20"
                            value={styles.shadowOffsetY !== undefined ? styles.shadowOffsetY : 5}
                            onChange={(e) => handleFxChange({ shadowOffsetY: parseInt(e.target.value) })}
                            className="w-full accent-indigo-500 h-1 cursor-pointer"
                          />
                          <span className="font-mono text-gray-300">{styles.shadowOffsetY !== undefined ? styles.shadowOffsetY : 5}px</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Color:</span>
                          <input
                            type="color"
                            value={styles.shadowColor || '#000000'}
                            onChange={(e) => handleFxChange({ shadowColor: e.target.value })}
                            className="bg-transparent border border-[#3e3e3e] rounded cursor-pointer w-8 h-4.5"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Color overlay */}
                  <div className="space-y-1.5 border-t border-[#3e3e3e]/40 pt-2">
                    <label className="flex items-center gap-1.5 cursor-pointer font-bold text-white">
                      <input
                        type="checkbox"
                        checked={!!styles.colorOverlayEnabled}
                        onChange={(e) => handleFxChange({ colorOverlayEnabled: e.target.checked })}
                        className="accent-indigo-500 rounded"
                      />
                      Color Overlay
                    </label>
                    {styles.colorOverlayEnabled && (
                      <div className="pl-4 space-y-1.5 border-l border-[#3e3e3e]">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">Opacity:</span>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={Math.round((styles.colorOverlayOpacity !== undefined ? styles.colorOverlayOpacity : 0.5) * 100)}
                            onChange={(e) => handleFxChange({ colorOverlayOpacity: parseFloat(e.target.value) / 100 })}
                            className="w-full accent-indigo-500 h-1 cursor-pointer"
                          />
                          <span className="font-mono text-gray-300">{Math.round((styles.colorOverlayOpacity !== undefined ? styles.colorOverlayOpacity : 0.5) * 100)}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Color:</span>
                          <input
                            type="color"
                            value={styles.colorOverlayColor || '#00ff00'}
                            onChange={(e) => handleFxChange({ colorOverlayColor: e.target.value })}
                            className="bg-transparent border border-[#3e3e3e] rounded cursor-pointer w-8 h-4.5"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Layer Mask Properties */}
        {activeLayer && activeLayer.hasMask && (
          <div className="space-y-3 bg-[#252526] p-2.5 rounded border border-[#2d2d2d] text-[10px] mt-2">
            <div className="flex items-center justify-between text-[9px] font-mono font-bold tracking-wider text-green-400 border-b border-[#3e3e3e]/40 pb-1">
              <span className="flex items-center gap-1">
                <span className="font-extrabold text-[10px]">🎭</span>
                <span>LAYER MASK PROPERTIES</span>
              </span>
              {activeLayer.maskDisabled && (
                <span className="text-red-400 text-[8px] font-sans font-normal uppercase">Disabled</span>
              )}
            </div>

            <div className="space-y-2.5">
              {/* Density Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-gray-400">
                  <span>Density (Alpha Opacity):</span>
                  <span className="font-mono text-gray-300">
                    {Math.round((activeLayer.maskDensity !== undefined ? activeLayer.maskDensity : 1.0) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round((activeLayer.maskDensity !== undefined ? activeLayer.maskDensity : 1.0) * 100)}
                  onChange={(e) => onUpdateLayer(activeLayer.id, { maskDensity: parseFloat(e.target.value) / 100 })}
                  className="w-full accent-green-500 h-1 bg-[#1c1c1d] cursor-pointer"
                />
              </div>

              {/* Feather Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-gray-400">
                  <span>Feather Blur Edge:</span>
                  <span className="font-mono text-gray-300">
                    {activeLayer.maskFeather || 0}px
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={activeLayer.maskFeather || 0}
                  onChange={(e) => onUpdateLayer(activeLayer.id, { maskFeather: parseInt(e.target.value) })}
                  className="w-full accent-green-500 h-1 bg-[#1c1c1d] cursor-pointer"
                />
              </div>

              {/* Invert and Disable Mask Toggles */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-gray-300">
                  <input
                    type="checkbox"
                    checked={!!activeLayer.maskInvert}
                    onChange={(e) => onUpdateLayer(activeLayer.id, { maskInvert: e.target.checked })}
                    className="accent-green-500 rounded"
                  />
                  <span>Invert Mask</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-gray-300">
                  <input
                    type="checkbox"
                    checked={!!activeLayer.maskDisabled}
                    onChange={(e) => onUpdateLayer(activeLayer.id, { maskDisabled: e.target.checked })}
                    className="accent-green-500 rounded"
                  />
                  <span>Disable Mask</span>
                </label>
              </div>

              {/* Action Buttons: Apply, Delete */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#3e3e3e]/40">
                <button
                  onClick={() => onApplyMask?.(activeLayer.id)}
                  className="bg-green-700 hover:bg-green-600 text-white font-bold py-1 px-1.5 rounded text-[10px] transition-colors cursor-pointer text-center"
                >
                  Apply Mask
                </button>
                <button
                  onClick={() => onDeleteMask?.(activeLayer.id)}
                  className="bg-red-950 hover:bg-red-900 border border-red-800 text-red-300 font-bold py-1 px-1.5 rounded text-[10px] transition-colors cursor-pointer text-center"
                >
                  Delete Mask
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
