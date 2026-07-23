/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Project, Layer, Adjustments, Point } from '../types';
import { applyAdjustmentsToCanvas, applyVignette } from './filters';
import { applyLayerStyles } from './LayerStyleEngine';
import { isCustomBlendMode, blendBuffers } from './BlendModeEngine';
import { loadGoogleFont } from './fontLoader';

// Cache data structures for high performance rendering
interface CacheEntry {
  canvas: HTMLCanvasElement;
  key: string;
}

const layerCache = new Map<string, CacheEntry>();

export function clearLayerCache(id?: string) {
  if (id) {
    layerCache.delete(id);
  } else {
    layerCache.clear();
  }
}

function getLayerCacheKey(layer: Layer, layerAdjustments?: Adjustments): string {
  const parts: any[] = [
    layer.id,
    layer.type,
    layer.width,
    layer.height,
    layer.imageUrl || '',
    layer.imageElement ? 'has-img' : 'no-img',
    layer.fillOpacity !== undefined ? layer.fillOpacity : 1.0,
    layer.lockTransparency ? 'lock-trans' : 'no-lock-trans',
    layer.hasMask ? 'mask' : 'no-mask',
    layer.maskDisabled ? 'mask-dis' : 'mask-en',
    layer.maskFeather || 0,
    layer.maskDensity !== undefined ? layer.maskDensity : 1.0,
    layer.maskInvert ? 'mask-inv' : 'mask-norm',
    layer.maskCanvas ? 'has-mask-canvas' : 'no-mask-canvas'
  ];

  if (layer.type === 'text') {
    parts.push(
      layer.text || '',
      layer.fontSize || 24,
      layer.textColor || '#ffffff',
      layer.fontFamily || 'Inter',
      layer.fontWeight || 'normal',
      layer.fontStyle || 'normal',
      layer.textAlign || 'left',
      layer.letterSpacing || 0,
      layer.lineHeightMultiplier || 1.25,
      layer.textWarp || 'none',
      layer.textWarpBend ?? 50,
      layer.textWarpDir || 'horizontal',
      layer.textWarpHorizDistortion ?? 0,
      layer.textWarpVertDistortion ?? 0
    );
  } else if (layer.type === 'shape') {
    parts.push(
      layer.shapeType || '',
      layer.fillColor || 'transparent',
      layer.strokeColor || 'transparent',
      layer.strokeWidth ?? 0,
      layer.cornerRadius ?? 0,
      layer.vectorPath || '',
      layer.patternUrl || '',
      layer.gradientStart ? `${layer.gradientStart.x},${layer.gradientStart.y}` : '',
      layer.gradientEnd ? `${layer.gradientEnd.x},${layer.gradientEnd.y}` : '',
      layer.gradientColors ? layer.gradientColors.join(',') : ''
    );
  } else if (layer.type === 'drawing') {
    if (layer.drawingPath) {
      parts.push(layer.drawingPath.map(p => `${p.color}_${p.size}_${p.isEraser}_${p.points.length}`).join('|'));
    }
  }

  // Include adjustments
  if (layerAdjustments) {
    parts.push(
      layerAdjustments.brightness,
      layerAdjustments.contrast,
      layerAdjustments.saturation,
      layerAdjustments.hue,
      layerAdjustments.exposure,
      layerAdjustments.blur,
      layerAdjustments.grayscale,
      layerAdjustments.sepia,
      layerAdjustments.invert,
      layerAdjustments.vignette
    );
    if (layerAdjustments.curvesRGB) parts.push(JSON.stringify(layerAdjustments.curvesRGB));
    if (layerAdjustments.levelsRGB) parts.push(JSON.stringify(layerAdjustments.levelsRGB));
  }

  // Include layer styles
  if (layer.layerStyles) {
    parts.push(JSON.stringify(layer.layerStyles));
  }

  return parts.join('::');
}

// Composites all project layers onto a single target HTML5 canvas
export async function renderProjectToCanvas(
  project: Project,
  destCanvas: HTMLCanvasElement,
  options?: {
    activeLayerId?: string;
    editingTextLayerId?: string;
    adjustments?: Adjustments; // Live preview adjustments for the active layer
    isExport?: boolean;        // If true, render high quality without bounding boxes
    zoom?: number;
    visibleChannel?: 'rgb' | 'r' | 'g' | 'b';
    isRecursive?: boolean;      // Private flag to identify group recursion
  }
) {
  const destCtx = destCanvas.getContext('2d');
  if (!destCtx) return;

  const { activeLayerId, editingTextLayerId, adjustments, isExport } = options || {};

  // Root level double-buffering setup to prevent async rendering flickering/duplication
  const isRoot = !options?.isRecursive;
  const canvas = isRoot ? document.createElement('canvas') : destCanvas;
  if (isRoot) {
    canvas.width = destCanvas.width;
    canvas.height = destCanvas.height;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Clean up cache for layers no longer in project (only at root render level)
  if (isRoot) {
    const currentLayerIds = new Set(project.layers.map(l => l.id));
    for (const cachedId of layerCache.keys()) {
      if (!currentLayerIds.has(cachedId)) {
        layerCache.delete(cachedId);
      }
    }
  }

  // Clear offscreen canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Variables for tracking clipping stacks
  let baseCanvas: HTMLCanvasElement | null = null;
  let baseCtx: CanvasRenderingContext2D | null = null;
  let baseLayer: Layer | null = null;

  // Draw layers from bottom to top
  for (let i = project.layers.length - 1; i >= 0; i--) {
    const layer = project.layers[i];
    if (!layer.visible) continue;

    // Check if the NEXT visible layer is a clipping mask
    let nextIsClip = false;
    for (let j = i - 1; j >= 0; j--) {
      const nextL = project.layers[j];
      if (nextL.visible) {
        if (nextL.isClippingMask) {
          nextIsClip = true;
        }
        break;
      }
    }

    // Set target rendering canvas and context
    let targetCanvas = canvas;
    let targetCtx = ctx;

    // If we have an active clipping stack and the CURRENT layer is a clipping mask
    if (baseCanvas && baseCtx && layer.isClippingMask) {
      targetCanvas = baseCanvas;
      targetCtx = baseCtx;
    } else if (nextIsClip) {
      // Create new clipping stack
      baseCanvas = document.createElement('canvas');
      baseCanvas.width = canvas.width;
      baseCanvas.height = canvas.height;
      baseCtx = baseCanvas.getContext('2d');
      baseLayer = layer;

      targetCanvas = baseCanvas;
      targetCtx = baseCtx;
    }

    // --- RENDER GROUP LAYER ---
    if (layer.type === 'group') {
      if (layer.childrenIds && layer.childrenIds.length > 0) {
        const childLayers = layer.childrenIds
          .map(cid => project.layers.find(l => l.id === cid))
          .filter(Boolean) as Layer[];

        if (childLayers.length > 0) {
          const groupCanvas = document.createElement('canvas');
          groupCanvas.width = canvas.width;
          groupCanvas.height = canvas.height;
          const groupProject = { ...project, layers: childLayers };
          await renderProjectToCanvas(groupProject, groupCanvas, {
            ...options,
            isRecursive: true
          });

          targetCtx.save();
          targetCtx.globalAlpha = layer.opacity;
          if (baseCtx && layer.isClippingMask) {
            targetCtx.globalCompositeOperation = 'source-atop';
          } else {
            targetCtx.globalCompositeOperation = layer.blendMode === 'normal' ? 'source-over' : (layer.blendMode as any);
          }
          targetCtx.drawImage(groupCanvas, 0, 0);
          targetCtx.restore();
        }
      }

      // Check if we need to flush clipping stack
      if (baseCanvas && baseLayer && !nextIsClip) {
        ctx.save();
        ctx.globalAlpha = baseLayer.opacity;
        ctx.globalCompositeOperation = baseLayer.blendMode === 'normal' ? 'source-over' : (baseLayer.blendMode as any);
        ctx.drawImage(baseCanvas, 0, 0);
        ctx.restore();
        baseCanvas = null;
        baseCtx = null;
        baseLayer = null;
      }
      continue;
    }

    // --- RENDER ADJUSTMENT LAYER ---
    if (layer.type === 'adjustment') {
      const adjCanvas = document.createElement('canvas');
      adjCanvas.width = canvas.width;
      adjCanvas.height = canvas.height;
      const adjCtx = adjCanvas.getContext('2d');
      if (adjCtx) {
        // Draw the current target canvas pixels to apply the adjustments
        adjCtx.drawImage(targetCanvas, 0, 0);

        const adj = layer.adjustments;
        if (adj) {
          applyAdjustmentsToCanvas(adjCtx, canvas.width, canvas.height, adj);
          if (adj.vignette > 0) {
            applyVignette(adjCtx, canvas.width, canvas.height, adj.vignette);
          }
        }

        targetCtx.save();
        targetCtx.globalAlpha = layer.opacity;
        if (baseCtx && layer.isClippingMask) {
          targetCtx.globalCompositeOperation = 'source-atop';
        } else {
          targetCtx.globalCompositeOperation = 'source-over';
          if (targetCanvas === canvas) {
            targetCtx.clearRect(0, 0, canvas.width, canvas.height);
          }
        }
        targetCtx.drawImage(adjCanvas, 0, 0);
        targetCtx.restore();
      }

      // Check if we need to flush clipping stack
      if (baseCanvas && baseLayer && !nextIsClip) {
        ctx.save();
        ctx.globalAlpha = baseLayer.opacity;
        ctx.globalCompositeOperation = baseLayer.blendMode === 'normal' ? 'source-over' : (baseLayer.blendMode as any);
        ctx.drawImage(baseCanvas, 0, 0);
        ctx.restore();
        baseCanvas = null;
        baseCtx = null;
        baseLayer = null;
      }
      continue;
    }

    // --- RENDER STANDARD LAYER ---
    targetCtx.save();

    // 1. Set global opacity
    targetCtx.globalAlpha = layer.opacity;

    // 2. Set blend mode
    const isCustomBlend = isCustomBlendMode(layer.blendMode);
    const drawBlendMode = isCustomBlend
      ? (baseCtx && layer.isClippingMask ? 'source-atop' : 'source-over')
      : (baseCtx && layer.isClippingMask ? 'source-atop' : (layer.blendMode === 'normal' ? 'source-over' : layer.blendMode));
    
    targetCtx.globalCompositeOperation = drawBlendMode as any;

    // 3. Coordinate translation, rotation & drawing
    targetCtx.translate(layer.x + layer.width / 2, layer.y + layer.height / 2);
    if (layer.flipX || layer.flipY) {
      targetCtx.scale(layer.flipX ? -1 : 1, layer.flipY ? -1 : 1);
    }
    if (layer.rotation !== 0) {
      targetCtx.rotate((layer.rotation * Math.PI) / 180);
    }
    targetCtx.translate(-layer.width / 2, -layer.height / 2);

    // Get layer adjustments (live preview adjustments or static layer adjustments)
    const layerAdjustments = layer.id === activeLayerId ? adjustments : layer.adjustments;

    // Check layer cache
    const isEditingText = layer.id === editingTextLayerId;
    const cacheKey = getLayerCacheKey(layer, layerAdjustments) + (isEditingText ? '-editing' : '');
    let cached = layerCache.get(layer.id);
    let cacheHit = cached && cached.key === cacheKey;

    if (!cacheHit) {
      // 4. Draw specific layer content using temporary offscreen canvas
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = layer.width;
      tempCanvas.height = layer.height;
      const tempCtx = tempCanvas.getContext('2d');

      if (tempCtx) {
        tempCtx.globalAlpha = layer.fillOpacity !== undefined ? layer.fillOpacity : 1.0;
        switch (layer.type) {
          case 'image':
          case 'smartobject':
          case 'background':
          case 'artboard':
          case 'video':
          case 'ai':
            if (layer.imageElement) {
              tempCtx.drawImage(layer.imageElement, 0, 0, layer.width, layer.height);
            } else if (layer.imageUrl) {
              // Load asynchronously
              await new Promise<void>((resolve) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                  layer.imageElement = img;
                  tempCtx.drawImage(img, 0, 0, layer.width, layer.height);
                  resolve();
                };
                img.onerror = () => resolve();
                img.src = layer.imageUrl!;
              });
            } else {
              tempCtx.fillStyle = '#ef4444';
              tempCtx.fillRect(0, 0, layer.width, layer.height);
            }
            break;

          case 'text':
            if (isEditingText) {
              break;
            }
            const fontName = layer.fontFamily || 'Inter';
            loadGoogleFont(fontName);
            tempCtx.fillStyle = layer.textColor || '#ffffff';
            tempCtx.font = `${layer.fontStyle || 'normal'} ${layer.fontWeight || 'normal'} ${layer.fontSize || 24}px "${fontName}", sans-serif`;
            tempCtx.textAlign = layer.textAlign || 'left';
            tempCtx.textBaseline = 'middle';
            
            if ('letterSpacing' in tempCtx) {
              try {
                (tempCtx as any).letterSpacing = `${layer.letterSpacing || 0}px`;
              } catch (e) {}
            }
            
            const lines = (layer.text || '').split('\n');
            const lineHeight = (layer.fontSize || 24) * (layer.lineHeightMultiplier || 1.25);
            const totalHeight = lines.length * lineHeight;
            
            let startY = (layer.height - totalHeight) / 2 + lineHeight / 2;
            let startX = 0;
            if (layer.textAlign === 'center') {
              startX = layer.width / 2;
            } else if (layer.textAlign === 'right') {
              startX = layer.width;
            }

            lines.forEach((line, index) => {
              tempCtx.fillText(line, startX, startY + index * lineHeight);
            });
            break;

          case 'shape':
            let fillStyle: string | CanvasGradient | CanvasPattern = layer.fillColor || 'transparent';
            if (layer.gradientStart && layer.gradientEnd && layer.gradientColors && layer.gradientColors.length >= 2) {
              const localX1 = layer.gradientStart.x - layer.x;
              const localY1 = layer.gradientStart.y - layer.y;
              const localX2 = layer.gradientEnd.x - layer.x;
              const localY2 = layer.gradientEnd.y - layer.y;
              const gType = layer.gradientType || 'linear';
              try {
                if (gType === 'radial') {
                  const r = Math.sqrt((localX2 - localX1) ** 2 + (localY2 - localY1) ** 2);
                  const grad = tempCtx.createRadialGradient(localX1, localY1, 0, localX1, localY1, Math.max(1, r));
                  layer.gradientColors.forEach((color, idx) => {
                    const stop = idx / (layer.gradientColors!.length - 1);
                    grad.addColorStop(stop, color);
                  });
                  fillStyle = grad;
                } else {
                  const grad = tempCtx.createLinearGradient(localX1, localY1, localX2, localY2);
                  layer.gradientColors.forEach((color, idx) => {
                    const stop = idx / (layer.gradientColors!.length - 1);
                    grad.addColorStop(stop, color);
                  });
                  fillStyle = grad;
                }
              } catch (err) {
                console.error("Error creating gradient: ", err);
              }
            } else if (layer.patternUrl) {
              if (layer.patternImageElement) {
                const pattern = tempCtx.createPattern(layer.patternImageElement, 'repeat');
                if (pattern) fillStyle = pattern;
              } else {
                await new Promise<void>((resolve) => {
                  const img = new Image();
                  img.crossOrigin = 'anonymous';
                  img.onload = () => {
                    layer.patternImageElement = img;
                    const pattern = tempCtx.createPattern(img, 'repeat');
                    if (pattern) fillStyle = pattern;
                    resolve();
                  };
                  img.onerror = () => resolve();
                  img.src = layer.patternUrl!;
                });
              }
            }

            tempCtx.fillStyle = fillStyle;
            tempCtx.strokeStyle = layer.strokeColor || 'transparent';
            tempCtx.lineWidth = layer.strokeWidth ?? 0;
            
            if (layer.vectorPath) {
              try {
                const path2D = new Path2D(layer.vectorPath);
                tempCtx.save();
                tempCtx.scale(layer.width / 100, layer.height / 100);
                if ((layer.fillColor && layer.fillColor !== 'transparent') || (layer.gradientColors && layer.gradientColors.length >= 2) || layer.patternUrl) {
                  tempCtx.fill(path2D);
                }
                if (layer.strokeColor && layer.strokeColor !== 'transparent' && (layer.strokeWidth ?? 0) > 0) {
                  tempCtx.stroke(path2D);
                }
                tempCtx.restore();
              } catch (err) {
                console.error("Error rendering vectorPath: ", err);
              }
            } else {
              const strokeW = (layer.strokeWidth ?? 0) / 2;
              tempCtx.beginPath();
              
              if (layer.shapeType === 'rectangle') {
                const isRoundedLayer = layer.name?.toLowerCase().includes('rounded') || (layer.cornerRadius && layer.cornerRadius > 0);
                const cr = layer.cornerRadius ?? (isRoundedLayer ? 16 : 0);
                if (cr > 0) {
                  const x = strokeW;
                  const y = strokeW;
                  const w = Math.max(1, layer.width - strokeW * 2);
                  const h = Math.max(1, layer.height - strokeW * 2);
                  const r = Math.min(cr, w / 2, h / 2);
                  if (typeof tempCtx.roundRect === 'function') {
                    tempCtx.roundRect(x, y, w, h, r);
                  } else {
                    tempCtx.moveTo(x + r, y);
                    tempCtx.arcTo(x + w, y, x + w, y + h, r);
                    tempCtx.arcTo(x + w, y + h, x, y + h, r);
                    tempCtx.arcTo(x, y + h, x, y, r);
                    tempCtx.arcTo(x, y, x + w, y, r);
                    tempCtx.closePath();
                  }
                } else {
                  tempCtx.rect(strokeW, strokeW, layer.width - strokeW * 2, layer.height - strokeW * 2);
                }
              } else if (layer.shapeType === 'circle') {
                const r = Math.min(layer.width, layer.height) / 2 - strokeW;
                tempCtx.arc(layer.width / 2, layer.height / 2, Math.max(1, r), 0, 2 * Math.PI);
              } else if (layer.shapeType === 'triangle') {
                tempCtx.moveTo(layer.width / 2, strokeW);
                tempCtx.lineTo(layer.width - strokeW, layer.height - strokeW);
                tempCtx.lineTo(strokeW, layer.height - strokeW);
                tempCtx.closePath();
              } else if (layer.shapeType === 'line') {
                tempCtx.moveTo(strokeW, strokeW);
                tempCtx.lineTo(layer.width - strokeW, layer.height - strokeW);
              }
              
              if ((layer.fillColor && layer.fillColor !== 'transparent') || (layer.gradientColors && layer.gradientColors.length >= 2) || layer.patternUrl) {
                tempCtx.fill();
              }
              if (layer.strokeColor && layer.strokeColor !== 'transparent' && (layer.strokeWidth ?? 0) > 0) {
                tempCtx.stroke();
              }
            }
            break;

          case 'drawing':
            break;
        }

        // Render drawingPaths
        if (layer.drawingPath && layer.drawingPath.length > 0) {
          layer.drawingPath.forEach((path) => {
            if (path.points.length < 1) return;
            
            tempCtx.save();
            if (path.isEraser) {
              tempCtx.globalCompositeOperation = 'destination-out';
            } else if (path.isColorReplace) {
              tempCtx.globalCompositeOperation = 'color';
            } else if (layer.lockTransparency) {
              tempCtx.globalCompositeOperation = 'source-atop';
            } else {
              tempCtx.globalCompositeOperation = 'source-over';
            }

            if (path.isPencil) {
              tempCtx.fillStyle = path.color;
              for (let j = 0; j < path.points.length; j++) {
                const p0 = path.points[j - 1] || path.points[j];
                const p1 = path.points[j];
                const dx = Math.abs(p1.x - p0.x);
                const dy = Math.abs(p1.y - p0.y);
                const steps = Math.max(dx, dy, 1);
                for (let s = 0; s <= steps; s++) {
                  const t = s / steps;
                  const px = p0.x + (p1.x - p0.x) * t;
                  const py = p0.y + (p1.y - p0.y) * t;
                  tempCtx.fillRect(
                    Math.floor(px - path.size / 2),
                    Math.floor(py - path.size / 2),
                    path.size,
                    path.size
                  );
                }
              }
            } else if (path.isMixer) {
              tempCtx.lineCap = 'round';
              tempCtx.lineJoin = 'round';
              for (let j = 0; j < path.points.length; j++) {
                const pt = path.points[j];
                const prevPt = path.points[j - 1] || pt;
                const dx = pt.x - prevPt.x;
                const dy = pt.y - prevPt.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const steps = Math.max(1, Math.floor(dist / 1.5));
                for (let s = 0; s <= steps; s++) {
                  const t = s / steps;
                  const cx = prevPt.x + dx * t;
                  const cy = prevPt.y + dy * t;
                  try {
                    const grad = tempCtx.createRadialGradient(cx, cy, path.size * 0.05, cx, cy, path.size * 0.5);
                    grad.addColorStop(0, path.color);
                    grad.addColorStop(0.25, path.color);
                    grad.addColorStop(1, 'transparent');
                    tempCtx.save();
                    tempCtx.globalAlpha = 0.25;
                    tempCtx.fillStyle = grad;
                    tempCtx.beginPath();
                    tempCtx.arc(cx, cy, path.size * 0.5, 0, Math.PI * 2);
                    tempCtx.fill();
                    tempCtx.restore();
                  } catch (e) {
                    tempCtx.save();
                    tempCtx.globalAlpha = 0.15;
                    tempCtx.fillStyle = path.color;
                    tempCtx.beginPath();
                    tempCtx.arc(cx, cy, path.size * 0.5, 0, Math.PI * 2);
                    tempCtx.fill();
                    tempCtx.restore();
                  }
                }
              }
            } else {
              tempCtx.lineCap = 'round';
              tempCtx.lineJoin = 'round';
              tempCtx.beginPath();
              tempCtx.strokeStyle = path.color;
              tempCtx.lineWidth = path.size;
              tempCtx.moveTo(path.points[0].x, path.points[0].y);
              for (let j = 1; j < path.points.length; j++) {
                tempCtx.lineTo(path.points[j].x, path.points[j].y);
              }
              if (path.isClosed) tempCtx.closePath();
              if (path.fillColor && path.fillColor !== 'transparent') {
                tempCtx.fillStyle = path.fillColor;
                tempCtx.fill();
              }
              tempCtx.stroke();
            }
            tempCtx.restore();
          });
        }

        // 5. Apply live/saved adjustments
        if (layerAdjustments) {
          const filterCanvas = document.createElement('canvas');
          filterCanvas.width = layer.width;
          filterCanvas.height = layer.height;
          const filterCtx = filterCanvas.getContext('2d');
          if (filterCtx) {
            let filters: string[] = [];
            const adj = layerAdjustments;
            if (adj.brightness !== undefined && adj.brightness !== 0) filters.push(`brightness(${100 + adj.brightness}%)`);
            if (adj.contrast !== undefined && adj.contrast !== 0) filters.push(`contrast(${100 + adj.contrast}%)`);
            if (adj.saturation !== undefined && adj.saturation !== 0) filters.push(`saturate(${100 + adj.saturation}%)`);
            if (adj.hue !== undefined && adj.hue !== 0) filters.push(`hue-rotate(${adj.hue}deg)`);
            if (adj.exposure !== undefined && adj.exposure !== 0) {
              const exposureVal = adj.exposure > 0 ? 100 + adj.exposure * 1.5 : 100 + adj.exposure;
              filters.push(`brightness(${exposureVal}%)`);
            }
            if (adj.blur !== undefined && adj.blur > 0) filters.push(`blur(${adj.blur}px)`);
            if (adj.grayscale !== undefined && adj.grayscale > 0) filters.push(`grayscale(${adj.grayscale}%)`);
            if (adj.sepia !== undefined && adj.sepia > 0) filters.push(`sepia(${adj.sepia}%)`);
            if (adj.invert !== undefined && adj.invert > 0) filters.push(`invert(${adj.invert}%)`);
            
            filterCtx.filter = filters.length > 0 ? filters.join(' ') : 'none';
            filterCtx.drawImage(tempCanvas, 0, 0);
            
            tempCtx.clearRect(0, 0, layer.width, layer.height);
            tempCtx.drawImage(filterCanvas, 0, 0);
            
            applyAdjustmentsToCanvas(tempCtx, layer.width, layer.height, {
              ...adj,
              brightness: 0, contrast: 0, saturation: 0, hue: 0, exposure: 0, blur: 0, grayscale: 0, sepia: 0, invert: 0
            });
          }
        }

        if (layer.id === activeLayerId && adjustments && adjustments.vignette > 0) {
          applyVignette(tempCtx, layer.width, layer.height, adjustments.vignette);
        }

        // 6. Handle custom layer masks (Must be applied before Layer Styles so FX follow object contour)
        if (layer.hasMask && layer.maskCanvas && !layer.maskDisabled) {
          const maskTemp = document.createElement('canvas');
          maskTemp.width = layer.width;
          maskTemp.height = layer.height;
          const mCtx = maskTemp.getContext('2d');
          if (mCtx) {
            const feather = layer.maskFeather || 0;
            if (feather > 0) mCtx.filter = `blur(${feather}px)`;
            mCtx.drawImage(layer.maskCanvas, 0, 0, layer.width, layer.height);
            if (feather > 0) mCtx.filter = 'none';

            const density = layer.maskDensity !== undefined ? layer.maskDensity : 1.0;
            const invert = !!layer.maskInvert;

            const imgData = mCtx.getImageData(0, 0, layer.width, layer.height);
            const data = imgData.data;
            for (let k = 0; k < data.length; k += 4) {
              let maskVal = data[k]; // Grayscale level (R channel)
              if (invert) {
                maskVal = 255 - maskVal;
              }
              data[k + 3] = maskVal * density; // Map to alpha channel
            }
            mCtx.putImageData(imgData, 0, 0);

            tempCtx.globalCompositeOperation = 'destination-in';
            tempCtx.drawImage(maskTemp, 0, 0);
            tempCtx.globalCompositeOperation = 'source-over';
          }
        }

        // 7. Apply Layer Styles FX (On masked object contour)
        if (layer.layerStyles) {
          applyLayerStyles(tempCanvas, layer.layerStyles);
        }

        // 8.5. Pre-warp text layers if there is NO custom blending
        if (!isCustomBlend && layer.type === 'text' && layer.textWarp && layer.textWarp !== 'none') {
          const warpCanvas = document.createElement('canvas');
          warpCanvas.width = layer.width;
          warpCanvas.height = layer.height;
          const warpCtx = warpCanvas.getContext('2d');
          if (warpCtx) {
            const bendVal = layer.textWarpBend !== undefined ? layer.textWarpBend : 50;
            const bendFactor = bendVal / 100;
            const dir = layer.textWarpDir || 'horizontal';
            const hDist = (layer.textWarpHorizDistortion || 0) / 100;
            const vDist = (layer.textWarpVertDistortion || 0) / 100;
            const style = layer.textWarp;

            if (dir === 'horizontal') {
              const cols = layer.width;
              for (let x = 0; x < cols; x++) {
                const progress = x / layer.width;
                const distScaleY = 1 + (progress - 0.5) * hDist;
                const distOffsetY = (progress - 0.5) * vDist * layer.height * 0.3;
                
                let warpOffsetY = 0;
                let warpScaleY = 1.0;

                if (style === 'arc') {
                  warpOffsetY = -Math.sin(progress * Math.PI) * (layer.height * 0.4 * bendFactor) + (layer.height * 0.2 * bendFactor);
                } else if (style === 'arc-lower') {
                  warpOffsetY = -Math.sin(progress * Math.PI) * (layer.height * 0.2 * bendFactor);
                  warpScaleY = 1 + Math.sin(progress * Math.PI) * 0.3 * bendFactor;
                } else if (style === 'arc-upper') {
                  warpOffsetY = -Math.sin(progress * Math.PI) * (layer.height * 0.3 * bendFactor);
                  warpScaleY = 1 - Math.sin(progress * Math.PI) * 0.2 * bendFactor;
                } else if (style === 'wave') {
                  warpOffsetY = Math.sin(progress * Math.PI * 2) * (layer.height * 0.2 * bendFactor);
                } else if (style === 'bulge') {
                  warpScaleY = 1 + Math.sin(progress * Math.PI) * 0.4 * bendFactor;
                  warpOffsetY = -Math.sin(progress * Math.PI) * (layer.height * 0.1 * bendFactor);
                } else if (style === 'flag') {
                  warpOffsetY = Math.sin(progress * Math.PI * 1.5) * (layer.height * 0.2 * bendFactor);
                } else if (style === 'fish') {
                  warpScaleY = 1 + (progress - 0.5) * 0.6 * bendFactor;
                } else if (style === 'twist') {
                  warpOffsetY = Math.sin(progress * Math.PI * 2) * (layer.height * 0.15 * bendFactor);
                  warpScaleY = 1 + Math.cos(progress * Math.PI * 2) * 0.2 * bendFactor;
                } else if (style === 'squeeze') {
                  warpScaleY = 1 - Math.sin(progress * Math.PI) * 0.4 * bendFactor;
                  warpOffsetY = Math.sin(progress * Math.PI) * (layer.height * 0.2 * bendFactor);
                } else if (style === 'inflate') {
                  warpScaleY = 1 + Math.sin(progress * Math.PI) * 0.5 * bendFactor;
                  warpOffsetY = -Math.sin(progress * Math.PI) * (layer.height * 0.25 * bendFactor);
                }

                const finalOffsetY = warpOffsetY + distOffsetY;
                const finalScaleY = Math.max(0.05, warpScaleY * distScaleY);

                warpCtx.drawImage(
                  tempCanvas,
                  x, 0, 1, layer.height,
                  x, finalOffsetY + (layer.height * (1 - finalScaleY) / 2), 1, layer.height * finalScaleY
                );
              }
            } else {
              const rows = layer.height;
              for (let y = 0; y < rows; y++) {
                const progress = y / layer.height;
                const distScaleX = 1 + (progress - 0.5) * vDist;
                const distOffsetX = (progress - 0.5) * hDist * layer.width * 0.3;

                let warpOffsetX = 0;
                let warpScaleX = 1.0;

                if (style === 'arc') {
                  warpOffsetX = Math.sin(progress * Math.PI) * (layer.width * 0.4 * bendFactor) - (layer.width * 0.2 * bendFactor);
                } else if (style === 'arc-lower') {
                  warpOffsetX = Math.sin(progress * Math.PI) * (layer.width * 0.2 * bendFactor);
                  warpScaleX = 1 + Math.sin(progress * Math.PI) * 0.3 * bendFactor;
                } else if (style === 'arc-upper') {
                  warpOffsetX = Math.sin(progress * Math.PI) * (layer.width * 0.3 * bendFactor);
                  warpScaleX = 1 - Math.sin(progress * Math.PI) * 0.2 * bendFactor;
                } else if (style === 'wave') {
                  warpOffsetX = Math.sin(progress * Math.PI * 2) * (layer.width * 0.2 * bendFactor);
                } else if (style === 'bulge') {
                  warpScaleX = 1 + Math.sin(progress * Math.PI) * 0.4 * bendFactor;
                  warpOffsetX = -Math.sin(progress * Math.PI) * (layer.width * 0.1 * bendFactor);
                } else if (style === 'flag') {
                  warpOffsetX = Math.sin(progress * Math.PI * 1.5) * (layer.width * 0.2 * bendFactor);
                } else if (style === 'fish') {
                  warpScaleX = 1 + (progress - 0.5) * 0.6 * bendFactor;
                } else if (style === 'twist') {
                  warpOffsetX = Math.sin(progress * Math.PI * 2) * (layer.width * 0.15 * bendFactor);
                  warpScaleX = 1 + Math.cos(progress * Math.PI * 2) * 0.2 * bendFactor;
                } else if (style === 'squeeze') {
                  warpScaleX = 1 - Math.sin(progress * Math.PI) * 0.4 * bendFactor;
                  warpOffsetX = Math.sin(progress * Math.PI) * (layer.width * 0.2 * bendFactor);
                } else if (style === 'inflate') {
                  warpScaleX = 1 + Math.sin(progress * Math.PI) * 0.5 * bendFactor;
                  warpOffsetX = -Math.sin(progress * Math.PI) * (layer.width * 0.25 * bendFactor);
                }

                const finalOffsetX = warpOffsetX + distOffsetX;
                const finalScaleX = Math.max(0.05, warpScaleX * distScaleX);

                warpCtx.drawImage(
                  tempCanvas,
                  0, y, layer.width, 1,
                  finalOffsetX + (layer.width * (1 - finalScaleX) / 2), y, layer.width * finalScaleX, 1
                );
              }
            }
            tempCtx.clearRect(0, 0, layer.width, layer.height);
            tempCtx.drawImage(warpCanvas, 0, 0);
          }
        }
      }

      // Save output to cache
      const cacheCanvas = document.createElement('canvas');
      cacheCanvas.width = layer.width;
      cacheCanvas.height = layer.height;
      const cacheCtx = cacheCanvas.getContext('2d');
      if (cacheCtx) {
        cacheCtx.drawImage(tempCanvas, 0, 0);
      }
      cached = { canvas: cacheCanvas, key: cacheKey };
      layerCache.set(layer.id, cached);
    }

    // Now draw cached canvas to target
    if (isCustomBlend) {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = layer.width;
      tempCanvas.height = layer.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.drawImage(cached!.canvas, 0, 0);

        // 7. Apply Custom pixel blending
        const backdropCanvas = document.createElement('canvas');
        backdropCanvas.width = layer.width;
        backdropCanvas.height = layer.height;
        const bdCtx = backdropCanvas.getContext('2d');
        if (bdCtx) {
          bdCtx.save();
          bdCtx.translate(layer.width / 2, layer.height / 2);
          if (layer.rotation !== 0) {
            bdCtx.rotate((-layer.rotation * Math.PI) / 180);
          }
          if (layer.flipX || layer.flipY) {
            bdCtx.scale(layer.flipX ? -1 : 1, layer.flipY ? -1 : 1);
          }
          bdCtx.translate(-(layer.x + layer.width / 2), -(layer.y + layer.height / 2));
          bdCtx.drawImage(targetCanvas, 0, 0);
          bdCtx.restore();

          const bdData = bdCtx.getImageData(0, 0, layer.width, layer.height);
          const sData = tempCtx.getImageData(0, 0, layer.width, layer.height);
          const blended = blendBuffers(bdData, sData, layer.blendMode);
          tempCtx.putImageData(blended, 0, 0);
        }

        // Apply text warp after blending
        if (layer.type === 'text' && layer.textWarp && layer.textWarp !== 'none') {
          const warpCanvas = document.createElement('canvas');
          warpCanvas.width = layer.width;
          warpCanvas.height = layer.height;
          const warpCtx = warpCanvas.getContext('2d');
          if (warpCtx) {
            const bendVal = layer.textWarpBend !== undefined ? layer.textWarpBend : 50;
            const bendFactor = bendVal / 100;
            const dir = layer.textWarpDir || 'horizontal';
            const hDist = (layer.textWarpHorizDistortion || 0) / 100;
            const vDist = (layer.textWarpVertDistortion || 0) / 100;
            const style = layer.textWarp;

            if (dir === 'horizontal') {
              const cols = layer.width;
              for (let x = 0; x < cols; x++) {
                const progress = x / layer.width;
                const distScaleY = 1 + (progress - 0.5) * hDist;
                const distOffsetY = (progress - 0.5) * vDist * layer.height * 0.3;
                
                let warpOffsetY = 0;
                let warpScaleY = 1.0;

                if (style === 'arc') {
                  warpOffsetY = -Math.sin(progress * Math.PI) * (layer.height * 0.4 * bendFactor) + (layer.height * 0.2 * bendFactor);
                } else if (style === 'arc-lower') {
                  warpOffsetY = -Math.sin(progress * Math.PI) * (layer.height * 0.2 * bendFactor);
                  warpScaleY = 1 + Math.sin(progress * Math.PI) * 0.3 * bendFactor;
                } else if (style === 'arc-upper') {
                  warpOffsetY = -Math.sin(progress * Math.PI) * (layer.height * 0.3 * bendFactor);
                  warpScaleY = 1 - Math.sin(progress * Math.PI) * 0.2 * bendFactor;
                } else if (style === 'wave') {
                  warpOffsetY = Math.sin(progress * Math.PI * 2) * (layer.height * 0.2 * bendFactor);
                } else if (style === 'bulge') {
                  warpScaleY = 1 + Math.sin(progress * Math.PI) * 0.4 * bendFactor;
                  warpOffsetY = -Math.sin(progress * Math.PI) * (layer.height * 0.1 * bendFactor);
                } else if (style === 'flag') {
                  warpOffsetY = Math.sin(progress * Math.PI * 1.5) * (layer.height * 0.2 * bendFactor);
                } else if (style === 'fish') {
                  warpScaleY = 1 + (progress - 0.5) * 0.6 * bendFactor;
                } else if (style === 'twist') {
                  warpOffsetY = Math.sin(progress * Math.PI * 2) * (layer.height * 0.15 * bendFactor);
                  warpScaleY = 1 + Math.cos(progress * Math.PI * 2) * 0.2 * bendFactor;
                } else if (style === 'squeeze') {
                  warpScaleY = 1 - Math.sin(progress * Math.PI) * 0.4 * bendFactor;
                  warpOffsetY = Math.sin(progress * Math.PI) * (layer.height * 0.2 * bendFactor);
                } else if (style === 'inflate') {
                  warpScaleY = 1 + Math.sin(progress * Math.PI) * 0.5 * bendFactor;
                  warpOffsetY = -Math.sin(progress * Math.PI) * (layer.height * 0.25 * bendFactor);
                }

                const finalOffsetY = warpOffsetY + distOffsetY;
                const finalScaleY = Math.max(0.05, warpScaleY * distScaleY);

                warpCtx.drawImage(
                  tempCanvas,
                  x, 0, 1, layer.height,
                  x, finalOffsetY + (layer.height * (1 - finalScaleY) / 2), 1, layer.height * finalScaleY
                );
              }
            } else {
              const rows = layer.height;
              for (let y = 0; y < rows; y++) {
                const progress = y / layer.height;
                const distScaleX = 1 + (progress - 0.5) * vDist;
                const distOffsetX = (progress - 0.5) * hDist * layer.width * 0.3;

                let warpOffsetX = 0;
                let warpScaleX = 1.0;

                if (style === 'arc') {
                  warpOffsetX = Math.sin(progress * Math.PI) * (layer.width * 0.4 * bendFactor) - (layer.width * 0.2 * bendFactor);
                } else if (style === 'arc-lower') {
                  warpOffsetX = Math.sin(progress * Math.PI) * (layer.width * 0.2 * bendFactor);
                  warpScaleX = 1 + Math.sin(progress * Math.PI) * 0.3 * bendFactor;
                } else if (style === 'arc-upper') {
                  warpOffsetX = Math.sin(progress * Math.PI) * (layer.width * 0.3 * bendFactor);
                  warpScaleX = 1 - Math.sin(progress * Math.PI) * 0.2 * bendFactor;
                } else if (style === 'wave') {
                  warpOffsetX = Math.sin(progress * Math.PI * 2) * (layer.width * 0.2 * bendFactor);
                } else if (style === 'bulge') {
                  warpScaleX = 1 + Math.sin(progress * Math.PI) * 0.4 * bendFactor;
                  warpOffsetX = -Math.sin(progress * Math.PI) * (layer.width * 0.1 * bendFactor);
                } else if (style === 'flag') {
                  warpOffsetX = Math.sin(progress * Math.PI * 1.5) * (layer.width * 0.2 * bendFactor);
                } else if (style === 'fish') {
                  warpScaleX = 1 + (progress - 0.5) * 0.6 * bendFactor;
                } else if (style === 'twist') {
                  warpOffsetX = Math.sin(progress * Math.PI * 2) * (layer.width * 0.15 * bendFactor);
                  warpScaleX = 1 + Math.cos(progress * Math.PI * 2) * 0.2 * bendFactor;
                } else if (style === 'squeeze') {
                  warpScaleX = 1 - Math.sin(progress * Math.PI) * 0.4 * bendFactor;
                  warpOffsetX = Math.sin(progress * Math.PI) * (layer.width * 0.2 * bendFactor);
                } else if (style === 'inflate') {
                  warpScaleX = 1 + Math.sin(progress * Math.PI) * 0.5 * bendFactor;
                  warpOffsetX = -Math.sin(progress * Math.PI) * (layer.width * 0.25 * bendFactor);
                }

                const finalOffsetX = warpOffsetX + distOffsetX;
                const finalScaleX = Math.max(0.05, warpScaleX * distScaleX);

                warpCtx.drawImage(
                  tempCanvas,
                  0, y, layer.width, 1,
                  finalOffsetX + (layer.width * (1 - finalScaleX) / 2), y, layer.width * finalScaleX, 1
                );
              }
            }
            targetCtx.drawImage(warpCanvas, 0, 0);
          } else {
            targetCtx.drawImage(tempCanvas, 0, 0);
          }
        } else {
          targetCtx.drawImage(tempCanvas, 0, 0);
        }
      }
    } else {
      // Normal draw (cached canvas is already warped if needed)
      targetCtx.drawImage(cached!.canvas, 0, 0);
    }

    targetCtx.restore();

    // Check if we need to flush clipping stack
    if (baseCanvas && baseLayer && !nextIsClip) {
      ctx.save();
      ctx.globalAlpha = baseLayer.opacity;
      ctx.globalCompositeOperation = baseLayer.blendMode === 'normal' ? 'source-over' : (baseLayer.blendMode as any);
      ctx.drawImage(baseCanvas, 0, 0);
      ctx.restore();
      baseCanvas = null;
      baseCtx = null;
      baseLayer = null;
    }
  }

  // 7. Color channel isolation filter (RGB / Red / Green / Blue toggle support)
  if (options?.visibleChannel && options.visibleChannel !== 'rgb') {
    try {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      const channel = options.visibleChannel;
      for (let i = 0; i < data.length; i += 4) {
        if (channel === 'r') {
          data[i + 1] = 0; // G
          data[i + 2] = 0; // B
        } else if (channel === 'g') {
          data[i] = 0;     // R
          data[i + 2] = 0; // B
        } else if (channel === 'b') {
          data[i] = 0;     // R
          data[i + 1] = 0; // G
        }
      }
      ctx.putImageData(imgData, 0, 0);
    } catch (e) {
      console.warn("Could not isolate color channel: ", e);
    }
  }

  // Copy double buffer to destination canvas (root level only)
  if (isRoot) {
    destCtx.clearRect(0, 0, destCanvas.width, destCanvas.height);
    if (!isExport) {
      drawCheckerboard(destCtx, destCanvas.width, destCanvas.height);
    }
    destCtx.drawImage(canvas, 0, 0);
  }
}

// Helper to draw Photoshop-style grid overlay
export function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number, gridSize: number, color: string, opacity: number) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.5;

  for (let x = 0; x <= width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.restore();
}

// Helper to draw editor-workspace background checkerboard grids
export function drawCheckerboard(ctx: CanvasRenderingContext2D, width: number, height: number, size: number = 10) {
  ctx.fillStyle = '#1e1e24';
  ctx.fillRect(0, 0, width, height);
  
  ctx.fillStyle = '#282830';
  for (let y = 0; y < height; y += size * 2) {
    for (let x = 0; x < width; x += size * 2) {
      ctx.fillRect(x, y, size, size);
      ctx.fillRect(x + size, y + size, size, size);
    }
  }
}
