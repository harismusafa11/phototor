/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LayerStyles, BlendMode } from '../types';
import { blendPixelChannel } from './BlendModeEngine';

// Renders the chosen layer styles onto the layer's temporary canvas
export function applyLayerStyles(canvas: HTMLCanvasElement, rawStyles: LayerStyles): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;

  // Normalize legacy properties to professional FX objects
  const styles: LayerStyles = { ...rawStyles };

  if (rawStyles.strokeEnabled) {
    styles.stroke = {
      enabled: true,
      size: rawStyles.strokeSize || 3,
      color: rawStyles.strokeColor || '#ff0000',
      opacity: 1.0,
      position: 'outside',
      blendMode: 'normal',
      ...rawStyles.stroke
    };
  } else if (rawStyles.strokeEnabled === false && styles.stroke) {
    styles.stroke = { ...styles.stroke, enabled: false };
  }

  if (rawStyles.shadowEnabled) {
    const dx = rawStyles.shadowOffsetX !== undefined ? rawStyles.shadowOffsetX : 5;
    const dy = rawStyles.shadowOffsetY !== undefined ? rawStyles.shadowOffsetY : 5;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
    styles.dropShadow = {
      enabled: true,
      angle: angle,
      distance: distance,
      size: rawStyles.shadowBlur || 5,
      color: rawStyles.shadowColor || 'rgba(0,0,0,0.5)',
      opacity: 0.75,
      spread: 0,
      blendMode: 'normal',
      ...rawStyles.dropShadow
    };
  } else if (rawStyles.shadowEnabled === false && styles.dropShadow) {
    styles.dropShadow = { ...styles.dropShadow, enabled: false };
  }

  if (rawStyles.colorOverlayEnabled) {
    styles.colorOverlay = {
      enabled: true,
      color: rawStyles.colorOverlayColor || '#ff0000',
      opacity: rawStyles.colorOverlayOpacity !== undefined ? rawStyles.colorOverlayOpacity : 1.0,
      blendMode: 'normal',
      ...rawStyles.colorOverlay
    };
  } else if (rawStyles.colorOverlayEnabled === false && styles.colorOverlay) {
    styles.colorOverlay = { ...styles.colorOverlay, enabled: false };
  }

  // Render order for Layer Style effects:
  // 1. Drop Shadow (rendered under)
  // 2. Outer Glow (rendered under)
  // 3. Bevel & Emboss (3D lighting)
  // 4. Color / Gradient / Pattern Overlay
  // 5. Inner Glow
  // 6. Inner Shadow
  // 7. Satin
  // 8. Stroke (overlay/outlines)

  // We construct temporary canvases to render individual effects
  const originalImg = document.createElement('canvas');
  originalImg.width = width;
  originalImg.height = height;
  const origCtx = originalImg.getContext('2d');
  if (origCtx) origCtx.drawImage(canvas, 0, 0);

  // Clear original to draw styles in correct order
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, width, height);

  // --- 1. Drop Shadow & Outer Glow ---
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = width;
  shadowCanvas.height = height;
  const shadowCtx = shadowCanvas.getContext('2d');

  if (shadowCtx) {
    if (styles.dropShadow?.enabled) {
      const ds = styles.dropShadow;
      const angleRad = (ds.angle * Math.PI) / 180;
      const dx = Math.round(Math.cos(angleRad) * ds.distance);
      const dy = Math.round(Math.sin(angleRad) * ds.distance);

      shadowCtx.save();
      // Draw silhouette of original image
      shadowCtx.drawImage(originalImg, dx, dy);
      shadowCtx.globalCompositeOperation = 'source-in';
      shadowCtx.fillStyle = ds.color || 'rgba(0,0,0,0.5)';
      shadowCtx.fillRect(0, 0, width, height);
      shadowCtx.restore();

      // Apply blur
      if (ds.size > 0) {
        applyBlurToCanvas(shadowCanvas, ds.size);
      }
      ctx.save();
      ctx.globalAlpha = ds.opacity;
      ctx.drawImage(shadowCanvas, 0, 0);
      ctx.restore();
    }

    if (styles.outerGlow?.enabled) {
      const og = styles.outerGlow;
      shadowCtx.clearRect(0, 0, width, height);
      shadowCtx.save();
      shadowCtx.drawImage(originalImg, 0, 0);
      shadowCtx.globalCompositeOperation = 'source-in';
      shadowCtx.fillStyle = og.color || '#ffffaa';
      shadowCtx.fillRect(0, 0, width, height);
      shadowCtx.restore();

      if (og.size > 0) {
        applyBlurToCanvas(shadowCanvas, og.size);
      }
      ctx.save();
      ctx.globalAlpha = og.opacity;
      ctx.drawImage(shadowCanvas, 0, 0);
      ctx.restore();
    }
  }

  // --- Render Layer Base Content ---
  const contentCanvas = document.createElement('canvas');
  contentCanvas.width = width;
  contentCanvas.height = height;
  const contentCtx = contentCanvas.getContext('2d');
  if (contentCtx) contentCtx.drawImage(originalImg, 0, 0);

  // --- 2. Color, Gradient, and Pattern Overlays ---
  if (contentCtx) {
    // Solid Color Overlay
    if (styles.colorOverlay?.enabled) {
      const co = styles.colorOverlay;
      const overlay = document.createElement('canvas');
      overlay.width = width;
      overlay.height = height;
      const oCtx = overlay.getContext('2d');
      if (oCtx) {
        oCtx.fillStyle = co.color || '#ff0000';
        oCtx.fillRect(0, 0, width, height);
        applyOverlay(contentCanvas, overlay, co.opacity, co.blendMode);
      }
    }

    // Gradient Overlay
    if (styles.gradientOverlay?.enabled) {
      const go = styles.gradientOverlay;
      const overlay = document.createElement('canvas');
      overlay.width = width;
      overlay.height = height;
      const oCtx = overlay.getContext('2d');
      if (oCtx && go.stops && go.stops.length >= 2) {
        let grad: CanvasGradient;
        const rad = (go.angle * Math.PI) / 180;
        
        if (go.style === 'radial') {
          grad = oCtx.createRadialGradient(width/2, height/2, 5, width/2, height/2, Math.max(width, height) / 2 * go.scale);
        } else {
          // Linear based on angle
          const x1 = width / 2 - Math.cos(rad) * (width / 2) * go.scale;
          const y1 = height / 2 - Math.sin(rad) * (height / 2) * go.scale;
          const x2 = width / 2 + Math.cos(rad) * (width / 2) * go.scale;
          const y2 = height / 2 + Math.sin(rad) * (height / 2) * go.scale;
          grad = oCtx.createLinearGradient(x1, y1, x2, y2);
        }

        go.stops.forEach(s => grad.addColorStop(s.offset, s.color));
        oCtx.fillStyle = grad;
        oCtx.fillRect(0, 0, width, height);
        applyOverlay(contentCanvas, overlay, go.opacity, go.blendMode);
      }
    }

    // Pattern Overlay
    if (styles.patternOverlay?.enabled) {
      const po = styles.patternOverlay;
      const overlay = document.createElement('canvas');
      overlay.width = width;
      overlay.height = height;
      const oCtx = overlay.getContext('2d');
      if (oCtx) {
        const patCanvas = document.createElement('canvas');
        patCanvas.width = 20 * po.scale;
        patCanvas.height = 20 * po.scale;
        const patCtx = patCanvas.getContext('2d');
        if (patCtx) {
          // Draw standard checkboard / dot pattern as default
          patCtx.fillStyle = '#2c2c36';
          patCtx.fillRect(0, 0, patCanvas.width, patCanvas.height);
          patCtx.fillStyle = '#444454';
          patCtx.fillRect(0, 0, patCanvas.width / 2, patCanvas.height / 2);
          patCtx.fillRect(patCanvas.width / 2, patCanvas.height / 2, patCanvas.width / 2, patCanvas.height / 2);
          
          const pattern = oCtx.createPattern(patCanvas, 'repeat');
          if (pattern) {
            oCtx.fillStyle = pattern;
            oCtx.fillRect(0, 0, width, height);
            applyOverlay(contentCanvas, overlay, po.opacity, po.blendMode);
          }
        }
      }
    }
  }

  // --- 3. Bevel & Emboss (Sobel edge highlights) ---
  if (contentCtx && styles.bevelEmboss?.enabled) {
    applyBevelEmboss(contentCanvas, styles.bevelEmboss);
  }

  // --- 4. Inner Shadow & Inner Glow ---
  if (contentCtx) {
    if (styles.innerShadow?.enabled) {
      const is = styles.innerShadow;
      applyInnerShadow(contentCanvas, is);
    }
    if (styles.innerGlow?.enabled) {
      const ig = styles.innerGlow;
      applyInnerGlow(contentCanvas, ig);
    }
  }

  // --- 5. Satin ---
  if (contentCtx && styles.satin?.enabled) {
    applySatin(contentCanvas, styles.satin);
  }

  // --- Draw content with inner styling to main canvas ---
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(contentCanvas, 0, 0);

  // --- 6. Stroke (Outlines) ---
  if (styles.stroke?.enabled) {
    const st = styles.stroke;
    applyStroke(canvas, originalImg, st);
  }

  ctx.restore();
}

// Helpers for drawing effects

function applyBlurToCanvas(canvas: HTMLCanvasElement, radius: number): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const temp = document.createElement('canvas');
  temp.width = canvas.width;
  temp.height = canvas.height;
  const tCtx = temp.getContext('2d');
  if (tCtx) {
    tCtx.filter = `blur(${radius}px)`;
    tCtx.drawImage(canvas, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(temp, 0, 0);
  }
}

function applyOverlay(target: HTMLCanvasElement, overlay: HTMLCanvasElement, opacity: number, blendMode: BlendMode): void {
  const tCtx = target.getContext('2d');
  if (!tCtx) return;
  tCtx.save();
  tCtx.globalAlpha = opacity;
  tCtx.globalCompositeOperation = blendMode === 'normal' ? 'source-atop' : (blendMode as any);
  tCtx.drawImage(overlay, 0, 0);
  tCtx.restore();
}

function applyBevelEmboss(canvas: HTMLCanvasElement, bevel: any): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  const rad = (bevel.angle * Math.PI) / 180;
  const altRad = (bevel.altitude * Math.PI) / 180;

  // Light vector
  const lx = Math.cos(rad) * Math.cos(altRad);
  const ly = Math.sin(rad) * Math.cos(altRad);
  const lz = Math.sin(altRad);

  const depth = bevel.depth / 100 * 5; // Scaling factor
  const size = Math.max(1, bevel.size);

  const tempAlpha = new Uint8ClampedArray(w * h);
  for (let i = 0; i < data.length; i += 4) {
    tempAlpha[i / 4] = data[i + 3];
  }

  // Apply Sobel filter to compute slopes from the alpha boundary height map
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = (y * w + x) * 4;
      if (data[idx + 3] === 0) continue;

      // Alpha values around pixel
      const a00 = tempAlpha[(y - 1) * w + (x - 1)];
      const a01 = tempAlpha[(y - 1) * w + x];
      const a02 = tempAlpha[(y - 1) * w + (x + 1)];
      const a10 = tempAlpha[y * w + (x - 1)];
      const a12 = tempAlpha[y * w + (x + 1)];
      const a20 = tempAlpha[(y + 1) * w + (x - 1)];
      const a21 = tempAlpha[(y + 1) * w + x];
      const a22 = tempAlpha[(y + 1) * w + (x + 1)];

      const gx = (a02 + 2*a12 + a22) - (a00 + 2*a10 + a20);
      const gy = (a20 + 2*a21 + a22) - (a00 + 2*a01 + a02);

      if (gx === 0 && gy === 0) continue;

      // Normal vector
      const nx = -gx * depth;
      const ny = -gy * depth;
      const nz = 255;

      const norm = Math.sqrt(nx * nx + ny * ny + nz * nz);
      const nnx = nx / norm;
      const nny = ny / norm;
      const nnz = nz / norm;

      // Diffuse lighting factor
      const dot = nnx * lx + nny * ly + nnz * lz;

      let r = data[idx];
      let g = data[idx + 1];
      let b = data[idx + 2];

      if (dot > 0) {
        // Highlight side
        const factor = dot * bevel.highlightOpacity * 255;
        r = Math.min(255, r + factor);
        g = Math.min(255, g + factor);
        b = Math.min(255, b + factor);
      } else {
        // Shadow side
        const factor = -dot * bevel.shadowOpacity * 255;
        r = Math.max(0, r - factor);
        g = Math.max(0, g - factor);
        b = Math.max(0, b - factor);
      }

      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

function applyInnerShadow(canvas: HTMLCanvasElement, shadow: any): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;

  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = w;
  shadowCanvas.height = h;
  const sCtx = shadowCanvas.getContext('2d');

  if (sCtx) {
    const angleRad = (shadow.angle * Math.PI) / 180;
    const dx = Math.round(Math.cos(angleRad) * shadow.distance);
    const dy = Math.round(Math.sin(angleRad) * shadow.distance);

    sCtx.save();
    // Draw inverted mask
    sCtx.fillRect(0, 0, w, h);
    sCtx.globalCompositeOperation = 'destination-out';
    sCtx.drawImage(canvas, -dx, -dy);
    sCtx.restore();

    if (shadow.size > 0) {
      applyBlurToCanvas(shadowCanvas, shadow.size);
    }

    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    ctx.globalAlpha = shadow.opacity;
    ctx.fillStyle = shadow.color || '#000000';
    ctx.drawImage(shadowCanvas, 0, 0);
    ctx.restore();
  }
}

function applyInnerGlow(canvas: HTMLCanvasElement, glow: any): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;

  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = w;
  glowCanvas.height = h;
  const gCtx = glowCanvas.getContext('2d');

  if (gCtx) {
    gCtx.save();
    gCtx.fillRect(0, 0, w, h);
    gCtx.globalCompositeOperation = 'destination-out';
    gCtx.drawImage(canvas, 0, 0);
    gCtx.restore();

    if (glow.size > 0) {
      applyBlurToCanvas(glowCanvas, glow.size);
    }

    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    ctx.globalAlpha = glow.opacity;
    ctx.fillStyle = glow.color || '#ffffbb';
    ctx.drawImage(glowCanvas, 0, 0);
    ctx.restore();
  }
}

function applySatin(canvas: HTMLCanvasElement, satin: any): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;

  const satinCanvas = document.createElement('canvas');
  satinCanvas.width = w;
  satinCanvas.height = h;
  const sCtx = satinCanvas.getContext('2d');

  if (sCtx) {
    const angleRad = (satin.angle * Math.PI) / 180;
    const dx = Math.round(Math.cos(angleRad) * satin.distance);
    const dy = Math.round(Math.sin(angleRad) * satin.distance);

    sCtx.drawImage(canvas, dx, dy);
    if (satin.size > 0) {
      applyBlurToCanvas(satinCanvas, satin.size);
    }

    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    ctx.globalAlpha = satin.opacity;
    ctx.fillStyle = satin.color || '#440066';
    if (satin.invert) {
      ctx.globalCompositeOperation = 'source-out';
    }
    ctx.drawImage(satinCanvas, 0, 0);
    ctx.restore();
  }
}

function applyStroke(canvas: HTMLCanvasElement, maskCanvas: HTMLCanvasElement, stroke: any): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  const size = stroke.size || 3;
  const opacity = stroke.opacity !== undefined ? stroke.opacity : 1.0;
  const color = stroke.color || '#ff0000';
  const position = stroke.position || 'outside';

  const renderOutsideStrokeCanvas = (strokeWidth: number) => {
    const strokeCanvas = document.createElement('canvas');
    strokeCanvas.width = w;
    strokeCanvas.height = h;
    const sCtx = strokeCanvas.getContext('2d');
    if (!sCtx) return null;

    // Multi-pass continuous dilation from radius 1 to strokeWidth
    const stepSize = Math.max(1, Math.min(2, strokeWidth / 8));
    for (let r = stepSize; r <= strokeWidth; r += stepSize) {
      const numSamples = Math.max(16, Math.min(36, Math.round(r * 2)));
      for (let i = 0; i < numSamples; i++) {
        const angle = (i * 2 * Math.PI) / numSamples;
        const dx = Math.round(Math.cos(angle) * r);
        const dy = Math.round(Math.sin(angle) * r);
        sCtx.drawImage(maskCanvas, dx, dy);
      }
    }
    sCtx.drawImage(maskCanvas, 0, 0);

    // Color the solid dilated silhouette
    sCtx.globalCompositeOperation = 'source-in';
    sCtx.fillStyle = color;
    sCtx.fillRect(0, 0, w, h);

    // Subtract original maskCanvas so Outside Stroke is 100% strictly OUTSIDE non-transparent pixels!
    sCtx.globalCompositeOperation = 'destination-out';
    sCtx.drawImage(maskCanvas, 0, 0);

    return strokeCanvas;
  };

  const renderInsideStrokeCanvas = (strokeWidth: number) => {
    const strokeCanvas = document.createElement('canvas');
    strokeCanvas.width = w;
    strokeCanvas.height = h;
    const sCtx = strokeCanvas.getContext('2d');
    if (!sCtx) return null;

    sCtx.drawImage(maskCanvas, 0, 0);
    sCtx.globalCompositeOperation = 'source-in';
    sCtx.fillStyle = color;
    sCtx.fillRect(0, 0, w, h);

    const innerMask = document.createElement('canvas');
    innerMask.width = w;
    innerMask.height = h;
    const iCtx = innerMask.getContext('2d');
    if (iCtx) {
      iCtx.drawImage(maskCanvas, 0, 0);

      // Clip 4 outer borders
      iCtx.save();
      iCtx.globalCompositeOperation = 'destination-out';
      iCtx.fillStyle = '#000000';
      iCtx.fillRect(0, 0, w, strokeWidth);
      iCtx.fillRect(0, 0, strokeWidth, h);
      iCtx.fillRect(w - strokeWidth, 0, strokeWidth, h);
      iCtx.fillRect(0, h - strokeWidth, w, strokeWidth);
      iCtx.restore();

      // Erode contour incrementally
      const stepSize = Math.max(1, Math.min(2, strokeWidth / 8));
      for (let r = stepSize; r <= strokeWidth; r += stepSize) {
        const steps = 8;
        for (let i = 0; i < steps; i++) {
          const angle = (i * 2 * Math.PI) / steps;
          const dx = Math.round(Math.cos(angle) * r);
          const dy = Math.round(Math.sin(angle) * r);

          const tempShift = document.createElement('canvas');
          tempShift.width = w;
          tempShift.height = h;
          const tCtx = tempShift.getContext('2d');
          if (tCtx) {
            tCtx.drawImage(maskCanvas, dx, dy);
            iCtx.save();
            iCtx.globalCompositeOperation = 'destination-in';
            iCtx.drawImage(tempShift, 0, 0);
            iCtx.restore();
          }
        }
      }
    }

    sCtx.save();
    sCtx.globalCompositeOperation = 'destination-out';
    sCtx.drawImage(innerMask, 0, 0);
    sCtx.restore();

    return strokeCanvas;
  };

  if (position === 'outside') {
    const strokeImg = renderOutsideStrokeCanvas(size);
    if (strokeImg) {
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(strokeImg, 0, 0);
      ctx.restore();
    }
  } else if (position === 'inside') {
    const strokeImg = renderInsideStrokeCanvas(size);
    if (strokeImg) {
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(strokeImg, 0, 0);
      ctx.restore();
    }
  } else {
    // Center stroke
    const halfSize = Math.max(1, Math.round(size / 2));
    const outStroke = renderOutsideStrokeCanvas(halfSize);
    const inStroke = renderInsideStrokeCanvas(halfSize);
    ctx.save();
    ctx.globalAlpha = opacity;
    if (outStroke) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(outStroke, 0, 0);
    }
    if (inStroke) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(inStroke, 0, 0);
    }
    ctx.restore();
  }
}
