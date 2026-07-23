import React, { useState } from 'react';
import { Layer, LayerStyles, BlendMode } from '../types';
import { X, Check } from 'lucide-react';

interface LayerStyleDialogProps {
  layer: Layer;
  onUpdate: (styles: LayerStyles) => void;
  onClose: () => void;
  initialTab?: string;
}

const BLEND_MODES: BlendMode[] = [
  'normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten',
  'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion',
  'linear-dodge', 'linear-burn', 'vivid-light', 'linear-light', 'pin-light', 'hard-mix', 'subtract', 'divide',
  'hue', 'saturation', 'color', 'luminosity'
];

export default function LayerStyleDialog({
  layer,
  onUpdate,
  onClose,
  initialTab = 'blending',
}: LayerStyleDialogProps) {
  const initialStyles = JSON.parse(JSON.stringify(layer.layerStyles || {}));
  const [styles, setStyles] = useState<LayerStyles>({
    ...initialStyles
  });
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  const lastUpdateRef = React.useRef<number>(0);
  const pendingUpdateRef = React.useRef<any>(null);
  const timeoutRef = React.useRef<any>(null);

  const updateStyles = (updated: LayerStyles) => {
    setStyles(updated);
    const now = Date.now();
    const delay = 35; // ~30 FPS throttle for smooth live preview

    if (now - lastUpdateRef.current >= delay) {
      lastUpdateRef.current = now;
      onUpdate(updated);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      pendingUpdateRef.current = null;
    } else {
      pendingUpdateRef.current = updated;
      if (!timeoutRef.current) {
        timeoutRef.current = setTimeout(() => {
          lastUpdateRef.current = Date.now();
          onUpdate(pendingUpdateRef.current);
          timeoutRef.current = null;
          pendingUpdateRef.current = null;
        }, delay - (now - lastUpdateRef.current));
      }
    }
  };

  const getDefaultFXValue = (effect: keyof LayerStyles) => {
    switch (effect) {
      case 'bevelEmboss':
        return { style: 'inner-bevel', depth: 100, direction: 'up', size: 5, soften: 0, angle: 120, altitude: 30, highlightMode: 'screen', highlightColor: '#ffffff', highlightOpacity: 0.75, shadowMode: 'multiply', shadowColor: '#000000', shadowOpacity: 0.75 };
      case 'stroke':
        return { size: 3, position: 'outside', blendMode: 'normal', opacity: 1.0, colorType: 'color', color: '#ff0000' };
      case 'innerShadow':
        return { color: '#000000', opacity: 0.5, blendMode: 'multiply', angle: 120, distance: 5, choke: 0, size: 5 };
      case 'innerGlow':
        return { color: '#ffffbb', opacity: 0.5, blendMode: 'screen', size: 5, choke: 0 };
      case 'satin':
        return { color: '#000000', opacity: 0.5, blendMode: 'multiply', angle: 19, distance: 11, size: 14, invert: true };
      case 'colorOverlay':
        return { color: '#ff0000', opacity: 1.0, blendMode: 'normal' };
      case 'gradientOverlay':
        return { stops: [{ offset: 0, color: '#000000' }, { offset: 1, color: '#ffffff' }], opacity: 1.0, blendMode: 'normal', angle: 90, style: 'linear', scale: 1.0 };
      case 'patternOverlay':
        return { patternUrl: '', opacity: 1.0, blendMode: 'normal', scale: 1.0 };
      case 'outerGlow':
        return { color: '#ffffbb', opacity: 0.5, blendMode: 'screen', size: 5, spread: 0 };
      case 'dropShadow':
        return { color: '#000000', opacity: 0.5, blendMode: 'multiply', angle: 120, distance: 5, spread: 0, size: 5 };
      default:
        return {};
    }
  };

  const ensureFXEnabled = (effect: keyof LayerStyles) => {
    const updated: any = { ...styles };
    const current: any = updated[effect];
    if (current) {
      updated[effect] = { ...current, enabled: true };
    } else {
      updated[effect] = { ...getDefaultFXValue(effect), enabled: true };
    }
    updateStyles(updated);
  };

  const handleToggleFX = (effect: keyof LayerStyles) => {
    const updated: any = { ...styles };
    const current: any = updated[effect];
    if (current) {
      updated[effect] = { ...current, enabled: !current.enabled };
    } else {
      updated[effect] = { ...getDefaultFXValue(effect), enabled: true };
    }
    updateStyles(updated);
  };

  const handleSelectTab = (tabKey: string, effectKey?: keyof LayerStyles) => {
    setActiveTab(tabKey);
    if (effectKey) {
      const current: any = styles[effectKey];
      if (!current || !current.enabled) {
        ensureFXEnabled(effectKey);
      }
    }
  };

  React.useEffect(() => {
    if (initialTab && initialTab !== 'blending') {
      handleSelectTab(initialTab, initialTab as keyof LayerStyles);
    }
  }, [initialTab]);

  const handleCancel = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    onUpdate(initialStyles);
    onClose();
  };

  const handleApply = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    onUpdate(styles);
    onClose();
  };

  const renderFXRow = (tabKey: string, effectKey: keyof LayerStyles, label: string) => {
    const eff: any = styles[effectKey];
    const isEnabled = !!eff?.enabled;
    const isActive = activeTab === tabKey;

    return (
      <div className={`flex items-center justify-between px-2 py-1 rounded group cursor-pointer ${isActive ? 'bg-[#2a2a35]' : 'hover:bg-[#1a1a22]'}`}>
        <label
          className="flex items-center gap-2 cursor-pointer flex-1 py-0.5"
          onClick={(e) => {
            e.stopPropagation();
            handleSelectTab(tabKey, effectKey);
          }}
        >
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(e) => {
              e.stopPropagation();
              handleToggleFX(effectKey);
            }}
            className="rounded text-indigo-500 bg-gray-900 border-[#2e2e38] cursor-pointer"
          />
          <span className={isActive ? 'text-white font-bold' : 'text-gray-300'}>{label}</span>
        </label>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleSelectTab(tabKey, effectKey);
          }}
          className="text-gray-500 hover:text-indigo-400 font-bold ml-1 cursor-pointer"
        >
          ➔
        </button>
      </div>
    );
  };

  const bevel = styles.bevelEmboss || { style: 'inner-bevel', depth: 100, direction: 'up', size: 5, soften: 0, angle: 120, altitude: 30, highlightMode: 'screen', highlightColor: '#ffffff', highlightOpacity: 0.75, shadowMode: 'multiply', shadowColor: '#000000', shadowOpacity: 0.75, enabled: true };
  const stroke = styles.stroke || { size: 3, position: 'outside', blendMode: 'normal', opacity: 1.0, colorType: 'color', color: '#ff0000', enabled: true };
  const innerShadow = styles.innerShadow || { color: '#000000', opacity: 0.5, blendMode: 'multiply', angle: 120, distance: 5, choke: 0, size: 5, enabled: true };
  const innerGlow = styles.innerGlow || { color: '#ffffbb', opacity: 0.5, blendMode: 'screen', size: 5, choke: 0, enabled: true };
  const satin = styles.satin || { color: '#000000', opacity: 0.5, blendMode: 'multiply', angle: 19, distance: 11, size: 14, invert: true, enabled: true };
  const colorOverlay = styles.colorOverlay || { color: '#ff0000', opacity: 1.0, blendMode: 'normal', enabled: true };
  const gradientOverlay = styles.gradientOverlay || { stops: [{ offset: 0, color: '#000000' }, { offset: 1, color: '#ffffff' }], opacity: 1.0, blendMode: 'normal', angle: 90, style: 'linear', scale: 1.0, enabled: true };
  const patternOverlay = styles.patternOverlay || { patternUrl: '', opacity: 1.0, blendMode: 'normal', scale: 1.0, enabled: true };
  const outerGlow = styles.outerGlow || { color: '#ffffbb', opacity: 0.5, blendMode: 'screen', size: 5, spread: 0, enabled: true };
  const dropShadow = styles.dropShadow || { color: '#000000', opacity: 0.5, blendMode: 'multiply', angle: 120, distance: 5, spread: 0, size: 5, enabled: true };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs select-none">
      <div className="w-[680px] h-[520px] bg-[#141419] border border-[#2c2c36] rounded-xl flex flex-col overflow-hidden shadow-2xl font-sans text-xs text-gray-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#191920] border-b border-[#24242c] shrink-0">
          <h3 className="font-bold text-sm text-white">Layer Style ({layer.name})</h3>
          <button onClick={handleCancel} className="text-gray-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
        </div>

        {/* Workspace */}
        <div className="flex-1 flex min-h-0">
          
          {/* Left Panel: List of Effects */}
          <div className="w-[190px] bg-[#101014] border-r border-[#202028] overflow-y-auto p-2 space-y-1">
            <button
              onClick={() => setActiveTab('blending')}
              className={`w-full text-left px-2 py-1.5 rounded transition-colors cursor-pointer ${activeTab === 'blending' ? 'bg-[#2a2a35] text-white font-bold' : 'hover:bg-[#1a1a22] text-gray-400'}`}
            >
              Blending Options
            </button>
            <hr className="border-[#1e1e24] my-1" />

            {renderFXRow('bevel', 'bevelEmboss', 'Bevel & Emboss')}
            {renderFXRow('stroke', 'stroke', 'Stroke')}
            {renderFXRow('innerShadow', 'innerShadow', 'Inner Shadow')}
            {renderFXRow('innerGlow', 'innerGlow', 'Inner Glow')}
            {renderFXRow('satin', 'satin', 'Satin')}
            {renderFXRow('colorOverlay', 'colorOverlay', 'Color Overlay')}
            {renderFXRow('gradientOverlay', 'gradientOverlay', 'Gradient Overlay')}
            {renderFXRow('patternOverlay', 'patternOverlay', 'Pattern Overlay')}
            {renderFXRow('outerGlow', 'outerGlow', 'Outer Glow')}
            {renderFXRow('dropShadow', 'dropShadow', 'Drop Shadow')}
          </div>

          {/* Right Panel: Settings Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#141419]">
            
            {/* Blending Options Tab */}
            {activeTab === 'blending' && (
              <div className="space-y-3">
                <h4 className="font-bold text-gray-100 border-b border-[#2c2c36] pb-1 text-sm">Blending Options</h4>
                <div className="flex items-center justify-between">
                  <span>General Blend Mode:</span>
                  <select
                    value={layer.blendMode}
                    onChange={(e) => onUpdate({ ...styles })}
                    className="bg-[#24242e] border border-[#2e2e38] rounded px-2 py-1 text-white"
                  >
                    {BLEND_MODES.map(bm => <option key={bm} value={bm}>{bm.toUpperCase()}</option>)}
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <span>Opacity: {Math.round(layer.opacity * 100)}%</span>
                  <span className="text-gray-400 text-[11px]">Adjustable from Layers panel</span>
                </div>
              </div>
            )}

            {/* Bevel & Emboss Tab */}
            {activeTab === 'bevel' && (
              <div className="space-y-3">
                <h4 className="font-bold text-gray-100 border-b border-[#2c2c36] pb-1 text-sm">Bevel & Emboss</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span>Style:</span>
                    <select
                      value={bevel.style}
                      onChange={(e) => {
                        const updated = { ...styles, bevelEmboss: { ...bevel, style: e.target.value as any, enabled: true } };
                        updateStyles(updated);
                      }}
                      className="bg-[#24242e] border border-[#2e2e38] rounded px-2 py-1 w-36 text-white"
                    >
                      <option value="inner-bevel">Inner Bevel</option>
                      <option value="outer-bevel">Outer Bevel</option>
                      <option value="emboss">Emboss</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Depth: {bevel.depth}%</span>
                    <input
                      type="range" min="1" max="1000"
                      value={bevel.depth}
                      onChange={(e) => {
                        const updated = { ...styles, bevelEmboss: { ...bevel, depth: parseInt(e.target.value), enabled: true } };
                        updateStyles(updated);
                      }}
                      className="w-40 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Direction:</span>
                    <div className="flex gap-2">
                      {['up', 'down'].map(dir => (
                        <button
                          key={dir}
                          onClick={() => {
                            const updated = { ...styles, bevelEmboss: { ...bevel, direction: dir as any, enabled: true } };
                            updateStyles(updated);
                          }}
                          className={`px-3 py-1 rounded border cursor-pointer ${bevel.direction === dir ? 'bg-indigo-600 border-indigo-500 text-white font-bold' : 'bg-[#24242e] border-[#2e2e38] text-gray-300'}`}
                        >
                          {dir.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Size: {bevel.size}px</span>
                    <input
                      type="range" min="1" max="100"
                      value={bevel.size}
                      onChange={(e) => {
                        const updated = { ...styles, bevelEmboss: { ...bevel, size: parseInt(e.target.value), enabled: true } };
                        updateStyles(updated);
                      }}
                      className="w-40 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Soften: {bevel.soften}px</span>
                    <input
                      type="range" min="0" max="16"
                      value={bevel.soften}
                      onChange={(e) => {
                        const updated = { ...styles, bevelEmboss: { ...bevel, soften: parseInt(e.target.value), enabled: true } };
                        updateStyles(updated);
                      }}
                      className="w-40 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Stroke Tab */}
            {activeTab === 'stroke' && (
              <div className="space-y-3">
                <h4 className="font-bold text-gray-100 border-b border-[#2c2c36] pb-1 text-sm">Stroke Settings</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span>Size: {stroke.size}px</span>
                    <input
                      type="range" min="1" max="100"
                      value={stroke.size}
                      onChange={(e) => {
                        const updated = { ...styles, stroke: { ...stroke, size: parseInt(e.target.value), enabled: true } };
                        updateStyles(updated);
                      }}
                      className="w-40 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Position:</span>
                    <select
                      value={stroke.position}
                      onChange={(e) => {
                        const updated = { ...styles, stroke: { ...stroke, position: e.target.value as any, enabled: true } };
                        updateStyles(updated);
                      }}
                      className="bg-[#24242e] border border-[#2e2e38] rounded px-2 py-1 w-36 text-white"
                    >
                      <option value="outside">Outside</option>
                      <option value="inside">Inside</option>
                      <option value="center">Center</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Color:</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={stroke.color}
                        onChange={(e) => {
                          const updated = { ...styles, stroke: { ...stroke, color: e.target.value, enabled: true } };
                          updateStyles(updated);
                        }}
                        className="w-8 h-8 rounded border border-gray-600 bg-transparent cursor-pointer"
                      />
                      <input
                        type="text"
                        value={stroke.color}
                        onChange={(e) => {
                          const updated = { ...styles, stroke: { ...stroke, color: e.target.value, enabled: true } };
                          updateStyles(updated);
                        }}
                        className="bg-[#24242e] border border-[#2e2e38] rounded px-2 py-1 w-20 text-center text-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Opacity: {Math.round((stroke.opacity ?? 1) * 100)}%</span>
                    <input
                      type="range" min="0" max="100"
                      value={Math.round((stroke.opacity ?? 1) * 100)}
                      onChange={(e) => {
                        const updated = { ...styles, stroke: { ...stroke, opacity: parseInt(e.target.value) / 100, enabled: true } };
                        updateStyles(updated);
                      }}
                      className="w-40 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Inner Shadow Tab */}
            {activeTab === 'innerShadow' && (
              <div className="space-y-3">
                <h4 className="font-bold text-gray-100 border-b border-[#2c2c36] pb-1 text-sm">Inner Shadow Settings</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span>Color:</span>
                    <input
                      type="color"
                      value={innerShadow.color}
                      onChange={(e) => {
                        const updated = { ...styles, innerShadow: { ...innerShadow, color: e.target.value, enabled: true } };
                        updateStyles(updated);
                      }}
                      className="w-8 h-8 rounded border border-gray-600 bg-transparent cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Opacity: {Math.round(innerShadow.opacity * 100)}%</span>
                    <input
                      type="range" min="0" max="100"
                      value={Math.round(innerShadow.opacity * 100)}
                      onChange={(e) => {
                        const updated = { ...styles, innerShadow: { ...innerShadow, opacity: parseInt(e.target.value) / 100, enabled: true } };
                        updateStyles(updated);
                      }}
                      className="w-40 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Distance: {innerShadow.distance}px</span>
                    <input
                      type="range" min="0" max="100"
                      value={innerShadow.distance}
                      onChange={(e) => {
                        const updated = { ...styles, innerShadow: { ...innerShadow, distance: parseInt(e.target.value), enabled: true } };
                        updateStyles(updated);
                      }}
                      className="w-40 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Size / Blur: {innerShadow.size}px</span>
                    <input
                      type="range" min="0" max="100"
                      value={innerShadow.size}
                      onChange={(e) => {
                        const updated = { ...styles, innerShadow: { ...innerShadow, size: parseInt(e.target.value), enabled: true } };
                        updateStyles(updated);
                      }}
                      className="w-40 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Inner Glow Tab */}
            {activeTab === 'innerGlow' && (
              <div className="space-y-3">
                <h4 className="font-bold text-gray-100 border-b border-[#2c2c36] pb-1 text-sm">Inner Glow Settings</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span>Glow Color:</span>
                    <input
                      type="color"
                      value={innerGlow.color}
                      onChange={(e) => {
                        const updated = { ...styles, innerGlow: { ...innerGlow, color: e.target.value, enabled: true } };
                        updateStyles(updated);
                      }}
                      className="w-8 h-8 rounded border border-gray-600 bg-transparent cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Opacity: {Math.round(innerGlow.opacity * 100)}%</span>
                    <input
                      type="range" min="0" max="100"
                      value={Math.round(innerGlow.opacity * 100)}
                      onChange={(e) => {
                        const updated = { ...styles, innerGlow: { ...innerGlow, opacity: parseInt(e.target.value) / 100, enabled: true } };
                        updateStyles(updated);
                      }}
                      className="w-40 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Size / Blur: {innerGlow.size}px</span>
                    <input
                      type="range" min="0" max="100"
                      value={innerGlow.size}
                      onChange={(e) => {
                        const updated = { ...styles, innerGlow: { ...innerGlow, size: parseInt(e.target.value), enabled: true } };
                        updateStyles(updated);
                      }}
                      className="w-40 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Satin Tab */}
            {activeTab === 'satin' && (
              <div className="space-y-3">
                <h4 className="font-bold text-gray-100 border-b border-[#2c2c36] pb-1 text-sm">Satin Settings</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span>Color:</span>
                    <input
                      type="color"
                      value={satin.color}
                      onChange={(e) => {
                        const updated = { ...styles, satin: { ...satin, color: e.target.value, enabled: true } };
                        updateStyles(updated);
                      }}
                      className="w-8 h-8 rounded border border-gray-600 bg-transparent cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Opacity: {Math.round(satin.opacity * 100)}%</span>
                    <input
                      type="range" min="0" max="100"
                      value={Math.round(satin.opacity * 100)}
                      onChange={(e) => {
                        const updated = { ...styles, satin: { ...satin, opacity: parseInt(e.target.value) / 100, enabled: true } };
                        updateStyles(updated);
                      }}
                      className="w-40 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Distance: {satin.distance}px</span>
                    <input
                      type="range" min="0" max="100"
                      value={satin.distance}
                      onChange={(e) => {
                        const updated = { ...styles, satin: { ...satin, distance: parseInt(e.target.value), enabled: true } };
                        updateStyles(updated);
                      }}
                      className="w-40 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Size: {satin.size}px</span>
                    <input
                      type="range" min="0" max="100"
                      value={satin.size}
                      onChange={(e) => {
                        const updated = { ...styles, satin: { ...satin, size: parseInt(e.target.value), enabled: true } };
                        updateStyles(updated);
                      }}
                      className="w-40 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Invert:</span>
                    <input
                      type="checkbox"
                      checked={satin.invert}
                      onChange={(e) => {
                        const updated = { ...styles, satin: { ...satin, invert: e.target.checked, enabled: true } };
                        updateStyles(updated);
                      }}
                      className="rounded text-indigo-500 bg-gray-900 border-[#2e2e38] cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Color Overlay Tab */}
            {activeTab === 'colorOverlay' && (
              <div className="space-y-3">
                <h4 className="font-bold text-gray-100 border-b border-[#2c2c36] pb-1 text-sm">Color Overlay</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span>Overlay Color:</span>
                    <input
                      type="color"
                      value={colorOverlay.color}
                      onChange={(e) => {
                        const updated = { ...styles, colorOverlay: { ...colorOverlay, color: e.target.value, enabled: true } };
                        updateStyles(updated);
                      }}
                      className="w-8 h-8 rounded border border-gray-600 bg-transparent cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Opacity: {Math.round(colorOverlay.opacity * 100)}%</span>
                    <input
                      type="range" min="0" max="100"
                      value={Math.round(colorOverlay.opacity * 100)}
                      onChange={(e) => {
                        const updated = { ...styles, colorOverlay: { ...colorOverlay, opacity: parseInt(e.target.value) / 100, enabled: true } };
                        updateStyles(updated);
                      }}
                      className="w-40 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Gradient Overlay Tab */}
            {activeTab === 'gradientOverlay' && (
              <div className="space-y-3">
                <h4 className="font-bold text-gray-100 border-b border-[#2c2c36] pb-1 text-sm">Gradient Overlay</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span>Start Color:</span>
                    <input
                      type="color"
                      value={gradientOverlay.stops?.[0]?.color || '#000000'}
                      onChange={(e) => {
                        const newStops = [...(gradientOverlay.stops || [{ offset: 0, color: '#000000' }, { offset: 1, color: '#ffffff' }])];
                        newStops[0] = { ...newStops[0], color: e.target.value };
                        const updated = { ...styles, gradientOverlay: { ...gradientOverlay, stops: newStops, enabled: true } };
                        updateStyles(updated);
                      }}
                      className="w-8 h-8 rounded border border-gray-600 bg-transparent cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span>End Color:</span>
                    <input
                      type="color"
                      value={gradientOverlay.stops?.[1]?.color || '#ffffff'}
                      onChange={(e) => {
                        const newStops = [...(gradientOverlay.stops || [{ offset: 0, color: '#000000' }, { offset: 1, color: '#ffffff' }])];
                        newStops[1] = { ...newStops[1], color: e.target.value };
                        const updated = { ...styles, gradientOverlay: { ...gradientOverlay, stops: newStops, enabled: true } };
                        updateStyles(updated);
                      }}
                      className="w-8 h-8 rounded border border-gray-600 bg-transparent cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Opacity: {Math.round(gradientOverlay.opacity * 100)}%</span>
                    <input
                      type="range" min="0" max="100"
                      value={Math.round(gradientOverlay.opacity * 100)}
                      onChange={(e) => {
                        const updated = { ...styles, gradientOverlay: { ...gradientOverlay, opacity: parseInt(e.target.value) / 100, enabled: true } };
                        updateStyles(updated);
                      }}
                      className="w-40 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Angle: {gradientOverlay.angle}°</span>
                    <input
                      type="range" min="-180" max="180"
                      value={gradientOverlay.angle}
                      onChange={(e) => {
                        const updated = { ...styles, gradientOverlay: { ...gradientOverlay, angle: parseInt(e.target.value), enabled: true } };
                        updateStyles(updated);
                      }}
                      className="w-40 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Style:</span>
                    <select
                      value={gradientOverlay.style}
                      onChange={(e) => {
                        const updated = { ...styles, gradientOverlay: { ...gradientOverlay, style: e.target.value as any, enabled: true } };
                        updateStyles(updated);
                      }}
                      className="bg-[#24242e] border border-[#2e2e38] rounded px-2 py-1 w-36 text-white"
                    >
                      <option value="linear">Linear</option>
                      <option value="radial">Radial</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Pattern Overlay Tab */}
            {activeTab === 'patternOverlay' && (
              <div className="space-y-3">
                <h4 className="font-bold text-gray-100 border-b border-[#2c2c36] pb-1 text-sm">Pattern Overlay</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span>Opacity: {Math.round(patternOverlay.opacity * 100)}%</span>
                    <input
                      type="range" min="0" max="100"
                      value={Math.round(patternOverlay.opacity * 100)}
                      onChange={(e) => {
                        const updated = { ...styles, patternOverlay: { ...patternOverlay, opacity: parseInt(e.target.value) / 100, enabled: true } };
                        updateStyles(updated);
                      }}
                      className="w-40 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Scale: {Math.round(patternOverlay.scale * 100)}%</span>
                    <input
                      type="range" min="10" max="300"
                      value={Math.round(patternOverlay.scale * 100)}
                      onChange={(e) => {
                        const updated = { ...styles, patternOverlay: { ...patternOverlay, scale: parseInt(e.target.value) / 100, enabled: true } };
                        updateStyles(updated);
                      }}
                      className="w-40 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Outer Glow Tab */}
            {activeTab === 'outerGlow' && (
              <div className="space-y-3">
                <h4 className="font-bold text-gray-100 border-b border-[#2c2c36] pb-1 text-sm">Outer Glow</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span>Glow Color:</span>
                    <input
                      type="color"
                      value={outerGlow.color}
                      onChange={(e) => {
                        const updated = { ...styles, outerGlow: { ...outerGlow, color: e.target.value, enabled: true } };
                        updateStyles(updated);
                      }}
                      className="w-8 h-8 rounded border border-gray-600 bg-transparent cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Opacity: {Math.round(outerGlow.opacity * 100)}%</span>
                    <input
                      type="range" min="0" max="100"
                      value={Math.round(outerGlow.opacity * 100)}
                      onChange={(e) => {
                        const updated = { ...styles, outerGlow: { ...outerGlow, opacity: parseInt(e.target.value) / 100, enabled: true } };
                        updateStyles(updated);
                      }}
                      className="w-40 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Size / Blur: {outerGlow.size}px</span>
                    <input
                      type="range" min="0" max="100"
                      value={outerGlow.size}
                      onChange={(e) => {
                        const updated = { ...styles, outerGlow: { ...outerGlow, size: parseInt(e.target.value), enabled: true } };
                        updateStyles(updated);
                      }}
                      className="w-40 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Drop Shadow Tab */}
            {activeTab === 'dropShadow' && (
              <div className="space-y-3">
                <h4 className="font-bold text-gray-100 border-b border-[#2c2c36] pb-1 text-sm">Drop Shadow</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span>Shadow Color:</span>
                    <input
                      type="color"
                      value={dropShadow.color}
                      onChange={(e) => {
                        const updated = { ...styles, dropShadow: { ...dropShadow, color: e.target.value, enabled: true } };
                        updateStyles(updated);
                      }}
                      className="w-8 h-8 rounded border border-gray-600 bg-transparent cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Opacity: {Math.round(dropShadow.opacity * 100)}%</span>
                    <input
                      type="range" min="0" max="100"
                      value={Math.round(dropShadow.opacity * 100)}
                      onChange={(e) => {
                        const updated = { ...styles, dropShadow: { ...dropShadow, opacity: parseInt(e.target.value) / 100, enabled: true } };
                        updateStyles(updated);
                      }}
                      className="w-40 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Angle: {dropShadow.angle}°</span>
                    <input
                      type="range" min="-180" max="180"
                      value={dropShadow.angle}
                      onChange={(e) => {
                        const updated = { ...styles, dropShadow: { ...dropShadow, angle: parseInt(e.target.value), enabled: true } };
                        updateStyles(updated);
                      }}
                      className="w-40 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Distance: {dropShadow.distance}px</span>
                    <input
                      type="range" min="0" max="100"
                      value={dropShadow.distance}
                      onChange={(e) => {
                        const updated = { ...styles, dropShadow: { ...dropShadow, distance: parseInt(e.target.value), enabled: true } };
                        updateStyles(updated);
                      }}
                      className="w-40 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Size / Blur: {dropShadow.size}px</span>
                    <input
                      type="range" min="0" max="100"
                      value={dropShadow.size}
                      onChange={(e) => {
                        const updated = { ...styles, dropShadow: { ...dropShadow, size: parseInt(e.target.value), enabled: true } };
                        updateStyles(updated);
                      }}
                      className="w-40 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-[#191920] border-t border-[#24242c] flex items-center justify-end gap-2 shrink-0">
          <button
            onClick={handleCancel}
            className="px-4 py-1.5 bg-[#25252e] hover:bg-[#2d2d38] border border-[#2c2c36] text-gray-300 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors flex items-center gap-1 cursor-pointer font-bold"
          >
            <Check className="w-3.5 h-3.5" />
            Apply Styles
          </button>
        </div>
      </div>
    </div>
  );
}
