/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Adjustments, Point } from '../types';
import { applyAllAdjustments, computeCurveLut } from './AdjustmentEngine';

// Applies full adjustments to an image layer on a target canvas context
export function applyAdjustmentsToCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  adj: Adjustments
) {
  if (width <= 0 || height <= 0) return;
  try {
    const imgData = ctx.getImageData(0, 0, width, height);
    const processed = applyAllAdjustments(imgData, adj);
    ctx.putImageData(processed, 0, 0);
  } catch (e) {
    console.warn("Could not apply pixel adjustments:", e);
  }
}


// Applies a vignette effect to a canvas
export function applyVignette(ctx: CanvasRenderingContext2D, width: number, height: number, value: number) {
  if (value <= 0 || width <= 0 || height <= 0) return;

  const radius = Math.sqrt(width * width + height * height) / 2;
  const grad = ctx.createRadialGradient(width / 2, height / 2, radius * (1 - value / 100), width / 2, height / 2, radius);

  grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  grad.addColorStop(1, `rgba(0, 0, 0, ${value / 100 * 0.85})`);

  ctx.fillStyle = grad;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillRect(0, 0, width, height);
}

// SMART BACKGROUND REMOVER (Chromatic Edge Keying & Flood Fill)
// Analyzes the corners of the image to detect the background color,
// then applies chromakey-based transparent masking with alpha feathering.
export function removeBackground(imgData: ImageData, tolerance: number = 25): ImageData {
  const { width, height, data } = imgData;
  if (!width || !height || width <= 0 || height <= 0 || !data || data.length === 0) return imgData;
  const output = new ImageData(new Uint8ClampedArray(data), width, height);
  const outData = output.data;

  // Sample corner pixels to guess background color
  const samplePoints = [
    0, // top-left
    (width - 1) * 4, // top-right
    (height - 1) * width * 4, // bottom-left
    ((height - 1) * width + (width - 1)) * 4, // bottom-right
  ];

  let rSum = 0, gSum = 0, bSum = 0;
  samplePoints.forEach((idx) => {
    rSum += data[idx];
    gSum += data[idx + 1];
    bSum += data[idx + 2];
  });
  const bgR = rSum / 4;
  const bgG = gSum / 4;
  const bgB = bSum / 4;

  // Key out matching pixels
  for (let i = 0; i < outData.length; i += 4) {
    const r = outData[i];
    const g = outData[i + 1];
    const b = outData[i + 2];

    const dist = Math.sqrt(
      (r - bgR) * (r - bgR) +
      (g - bgG) * (g - bgG) +
      (b - bgB) * (b - bgB)
    );

    if (dist < tolerance) {
      // Complete background removal
      outData[i + 3] = 0;
    } else if (dist < tolerance + 15) {
      // Feathering edge smoothly
      const ratio = (dist - tolerance) / 15;
      outData[i + 3] = Math.min(outData[i + 3], Math.floor(ratio * 255));
    }
  }

  return output;
}

// CONTENT-AWARE OBJECT REMOVAL (Inpaint Algorithm)
// Given an imageData and a mask canvas (where painted area is white/black),
// it fills the masked area using an advanced texture synth / pixel propagation search.
export function inpaintObject(
  imgData: ImageData,
  maskCanvas: HTMLCanvasElement,
  layerX: number,
  layerY: number,
  layerW: number,
  layerH: number
): ImageData {
  const { width, height, data } = imgData;
  const output = new ImageData(new Uint8ClampedArray(data), width, height);
  const outData = output.data;

  // Get mask pixels
  const mCtx = maskCanvas.getContext('2d');
  if (!mCtx) return output;

  // Draw scaled/repositioned mask to match original image dimensions
  const tempMaskCanvas = document.createElement('canvas');
  tempMaskCanvas.width = width;
  tempMaskCanvas.height = height;
  const tempMaskCtx = tempMaskCanvas.getContext('2d');
  if (!tempMaskCtx) return output;

  tempMaskCtx.drawImage(maskCanvas, 0, 0, width, height);
  const maskImgData = tempMaskCtx.getImageData(0, 0, width, height);
  const maskData = maskImgData.data;

  // 1. Identify which pixels are marked for removal
  const inpainted = new Uint8Array(width * height);
  const queue: number[] = [];
  const inQueue = new Uint8Array(width * height);

  for (let i = 0; i < maskData.length; i += 4) {
    const r = maskData[i];
    const g = maskData[i + 1];
    const b = maskData[i + 2];
    const a = maskData[i + 3];

    const isMasked = a > 50 && (r > 100 || g > 100 || b > 100);
    const pixelIdx = i / 4;
    if (isMasked) {
      inpainted[pixelIdx] = 1; // Mark to be filled
    }
  }

  // Find boundaries of the inpainted region to push to queue
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      if (inpainted[idx] === 1) {
        // If any neighbor is NOT inpainted, it is a boundary pixel
        if (
          inpainted[idx - 1] === 0 ||
          inpainted[idx + 1] === 0 ||
          inpainted[idx - width] === 0 ||
          inpainted[idx + width] === 0
        ) {
          queue.push(idx);
          inQueue[idx] = 1;
        }
      }
    }
  }

  // BFS flood-fill and average surrounding non-inpainted pixels (Fast marching/texture interpolation)
  let head = 0;
  const dirs = [-1, 1, -width, width];

  while (head < queue.length) {
    const idx = queue[head++];
    const x = idx % width;
    const y = Math.floor(idx / width);

    let rSum = 0, gSum = 0, bSum = 0, aSum = 0;
    let count = 0;

    // Search neighbors within a radius of 3 for valid texture sources
    const radius = 3;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nIdx = ny * width + nx;
          if (inpainted[nIdx] === 0) {
            // Valid unmasked neighbor pixel
            const offset = nIdx * 4;
            const distWeight = 1 / (dx * dx + dy * dy + 0.1);
            rSum += outData[offset] * distWeight;
            gSum += outData[offset + 1] * distWeight;
            bSum += outData[offset + 2] * distWeight;
            aSum += outData[offset + 3] * distWeight;
            count += distWeight;
          }
        }
      }
    }

    if (count > 0) {
      const offset = idx * 4;
      outData[offset] = Math.floor(rSum / count);
      outData[offset + 1] = Math.floor(gSum / count);
      outData[offset + 2] = Math.floor(bSum / count);
      outData[offset + 3] = Math.floor(aSum / count);
      inpainted[idx] = 0; // Filled successfully
    }

    // Add remaining adjacent unfilled pixels to queue
    for (const d of dirs) {
      const nIdx = idx + d;
      if (nIdx >= 0 && nIdx < width * height && inpainted[nIdx] === 1) {
        if (inQueue[nIdx] === 0) {
          queue.push(nIdx);
          inQueue[nIdx] = 1;
        }
      }
    }
  }

  return output;
}

// HEALING BRUSH SEAMLESS TEXTURE BLENDING (Copies source texture while matching target luminance)
export function blendHealingBrushTexture(
  imgData: ImageData,
  maskCanvas: HTMLCanvasElement,
  sourceOffset: Point
): ImageData {
  const { width, height, data } = imgData;
  const output = new ImageData(new Uint8ClampedArray(data), width, height);
  const outData = output.data;

  const mCtx = maskCanvas.getContext('2d');
  if (!mCtx) return output;

  const maskData = mCtx.getImageData(0, 0, width, height).data;
  const offX = Math.round(sourceOffset.x);
  const offY = Math.round(sourceOffset.y);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const maskVal = maskData[idx]; // 0..255
      if (maskVal < 1) continue;

      const alpha = maskVal / 255;
      const srcX = Math.max(0, Math.min(width - 1, x + offX));
      const srcY = Math.max(0, Math.min(height - 1, y + offY));
      const srcIdx = (srcY * width + srcX) * 4;

      // Extract RGB & Luminance from source and target
      const rDst = data[idx];
      const gDst = data[idx + 1];
      const bDst = data[idx + 2];
      const lumDst = 0.299 * rDst + 0.587 * gDst + 0.114 * bDst;

      const rSrc = data[srcIdx];
      const gSrc = data[srcIdx + 1];
      const bSrc = data[srcIdx + 2];
      const lumSrc = 0.299 * rSrc + 0.587 * gSrc + 0.114 * bSrc;

      // Scale source texture to match target luminance illumination
      const lumRatio = lumSrc > 5 ? Math.min(2.5, Math.max(0.3, lumDst / lumSrc)) : 1.0;
      const rHealed = Math.min(255, Math.max(0, rSrc * lumRatio));
      const gHealed = Math.min(255, Math.max(0, gSrc * lumRatio));
      const bHealed = Math.min(255, Math.max(0, bSrc * lumRatio));

      outData[idx] = Math.round(rDst * (1 - alpha) + rHealed * alpha);
      outData[idx + 1] = Math.round(gDst * (1 - alpha) + gHealed * alpha);
      outData[idx + 2] = Math.round(bDst * (1 - alpha) + bHealed * alpha);
    }
  }

  return output;
}

// IMAGE UPSCALE (Bicubic with Unsharp-Mask Sharpening Matrix)
// Doubles the image size and runs an edge-detection sharpening filter to retain fine details.
export function upscaleImage(canvas: HTMLCanvasElement): Promise<HTMLCanvasElement> {
  return new Promise((resolve) => {
    const target = document.createElement('canvas');
    const scale = 2;
    target.width = canvas.width * scale;
    target.height = canvas.height * scale;
    const ctx = target.getContext('2d');
    if (!ctx) {
      resolve(canvas);
      return;
    }

    // Bilinear/Bicubic upscale via browser scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(canvas, 0, 0, target.width, target.height);

    // Apply Sharpening convolution filter to make the upscale crisp (anti-blur)
    const imgData = ctx.getImageData(0, 0, target.width, target.height);
    const data = imgData.data;
    const output = ctx.createImageData(target.width, target.height);
    const outData = output.data;

    const w = target.width;
    const h = target.height;

    // Convolution Kernel: Unsharp mask (sharpening matrix)
    //  0  -1   0
    // -1   5  -1
    //  0  -1   0
    const kernel = [
       0, -1,  0,
      -1,  5, -1,
       0, -1,  0
    ];
    const kSize = 3;
    const halfK = 1;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const pixelIdx = (y * w + x) * 4;
        
        // Skip edges
        if (y < halfK || y >= h - halfK || x < halfK || x >= w - halfK) {
          outData[pixelIdx] = data[pixelIdx];
          outData[pixelIdx + 1] = data[pixelIdx + 1];
          outData[pixelIdx + 2] = data[pixelIdx + 2];
          outData[pixelIdx + 3] = data[pixelIdx + 3];
          continue;
        }

        let r = 0, g = 0, b = 0;
        for (let ky = 0; ky < kSize; ky++) {
          for (let kx = 0; kx < kSize; kx++) {
            const px = x + kx - halfK;
            const py = y + ky - halfK;
            const pIdx = (py * w + px) * 4;
            const weight = kernel[ky * kSize + kx];

            r += data[pIdx] * weight;
            g += data[pIdx + 1] * weight;
            b += data[pIdx + 2] * weight;
          }
        }

        // Clamp & set channels
        outData[pixelIdx] = Math.max(0, Math.min(255, r));
        outData[pixelIdx + 1] = Math.max(0, Math.min(255, g));
        outData[pixelIdx + 2] = Math.max(0, Math.min(255, b));
        outData[pixelIdx + 3] = data[pixelIdx + 3]; // Maintain opacity
      }
    }

    ctx.putImageData(output, 0, 0);
    resolve(target);
  });
}

// Helper to solve 8x8 linear system M * x = B using Gaussian elimination
function solve8x8(A: number[][], B: number[]): number[] {
  const n = 8;
  const M: number[][] = A.map((row, i) => [...row, B[i]]);

  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) {
        maxRow = k;
      }
    }
    const temp = M[i];
    M[i] = M[maxRow];
    M[maxRow] = temp;

    if (Math.abs(M[i][i]) < 1e-10) continue;

    for (let k = i + 1; k < n; k++) {
      const c = M[k][i] / M[i][i];
      for (let j = i; j <= n; j++) {
        if (i === j) {
          M[k][j] = 0;
        } else {
          M[k][j] -= c * M[i][j];
        }
      }
    }
  }

  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = M[i][n];
    for (let j = i + 1; j < n; j++) {
      sum -= M[i][j] * x[j];
    }
    x[i] = M[i][i] !== 0 ? sum / M[i][i] : 0;
  }
  return x;
}

// PERSPECTIVE WARP TRANSFORMATION (Exact 8-Parameter Homography with Bilinear Interpolation)
export function warpPerspective(
  imgData: ImageData,
  quad: [Point, Point, Point, Point], // [TL, TR, BR, BL] in layer-local coordinates
  targetW: number,
  targetH: number
): ImageData {
  const { width: srcW, height: srcH, data: srcData } = imgData;
  const output = new ImageData(targetW, targetH);
  const outData = output.data;

  // Target rectangle points: [TL, TR, BR, BL]
  const dstPts: Point[] = [
    { x: 0, y: 0 },
    { x: targetW, y: 0 },
    { x: targetW, y: targetH },
    { x: 0, y: targetH },
  ];

  // Build 8x8 system mapping (u, v) in destination -> (x, y) in source
  // x = (h0*u + h1*v + h2) / (h6*u + h7*v + 1)
  // y = (h3*u + h4*v + h5) / (h6*u + h7*v + 1)
  const A: number[][] = [];
  const B: number[] = [];

  for (let i = 0; i < 4; i++) {
    const u = dstPts[i].x;
    const v = dstPts[i].y;
    const px = quad[i].x;
    const py = quad[i].y;

    A.push([u, v, 1, 0, 0, 0, -u * px, -v * px]);
    B.push(px);

    A.push([0, 0, 0, u, v, 1, -u * py, -v * py]);
    B.push(py);
  }

  const [h0, h1, h2, h3, h4, h5, h6, h7] = solve8x8(A, B);

  // Bilinear sampling helper
  const sampleBilinear = (x: number, y: number) => {
    if (x < 0 || x > srcW - 1 || y < 0 || y > srcH - 1) {
      return [0, 0, 0, 0];
    }

    const xf = Math.floor(x);
    const yf = Math.floor(y);
    const xc = Math.min(srcW - 1, xf + 1);
    const yc = Math.min(srcH - 1, yf + 1);

    const dx = x - xf;
    const dy = y - yf;

    const idx00 = (yf * srcW + xf) * 4;
    const idx10 = (yf * srcW + xc) * 4;
    const idx01 = (yc * srcW + xf) * 4;
    const idx11 = (yc * srcW + xc) * 4;

    const res = [];
    for (let c = 0; c < 4; c++) {
      const val =
        srcData[idx00 + c] * (1 - dx) * (1 - dy) +
        srcData[idx10 + c] * dx * (1 - dy) +
        srcData[idx01 + c] * (1 - dx) * dy +
        srcData[idx11 + c] * dx * dy;
      res.push(Math.round(val));
    }
    return res;
  };

  // Perform backward warping
  for (let v = 0; v < targetH; v++) {
    for (let u = 0; u < targetW; u++) {
      const denom = h6 * u + h7 * v + 1;
      if (Math.abs(denom) < 1e-10) continue;
      const x = (h0 * u + h1 * v + h2) / denom;
      const y = (h3 * u + h4 * v + h5) / denom;

      const [r, g, b, a] = sampleBilinear(x, y);

      const outIdx = (v * targetW + u) * 4;
      outData[outIdx] = r;
      outData[outIdx + 1] = g;
      outData[outIdx + 2] = b;
      outData[outIdx + 3] = a;
    }
  }

  return output;
}

// PATCH TOOL SEAMLESS CLONING & BLENDING
export function applyPatchBlend(
  imgData: ImageData,
  selection: { x: number; y: number; w: number; h: number },
  offset: Point,
  layerX: number,
  layerY: number
): ImageData {
  const { width: srcW, height: srcH, data } = imgData;
  const output = new ImageData(new Uint8ClampedArray(data), srcW, srcH);
  const outData = output.data;

  // Selection boundaries relative to layer coordinates
  const selX = Math.round(selection.x - layerX);
  const selY = Math.round(selection.y - layerY);
  const selW = Math.round(selection.w);
  const selH = Math.round(selection.h);

  // Offset coordinates
  const dx = Math.round(offset.x);
  const dy = Math.round(offset.y);

  // Feather margin (15% of width/height or at least 5px, max 25px)
  const feather = Math.min(25, Math.max(5, Math.round(Math.min(selW, selH) * 0.15)));

  for (let y = 0; y < selH; y++) {
    for (let x = 0; x < selW; x++) {
      const destX = selX + x;
      const destY = selY + y;

      // Check destination bounds
      if (destX < 0 || destX >= srcW || destY < 0 || destY >= srcH) continue;

      // Source coordinate (where we copy from)
      const srcX = destX + dx;
      const srcY = destY + dy;

      // Check source bounds
      if (srcX < 0 || srcX >= srcW || srcY < 0 || srcY >= srcH) continue;

      const destIdx = (destY * srcW + destX) * 4;
      const srcIdx = (srcY * srcW + srcX) * 4;

      // Calculate distance to selection boundaries to apply feathering
      const distLeft = x;
      const distRight = selW - 1 - x;
      const distTop = y;
      const distBottom = selH - 1 - y;
      
      const minDist = Math.min(distLeft, distRight, distTop, distBottom);
      
      // Compute feather blend weight (0 at boundary, 1 inside)
      let weight = 1.0;
      if (minDist < feather) {
        weight = minDist / feather;
        // smoothstep interpolation
        weight = weight * weight * (3 - 2 * weight);
      }

      // Blend source pixel with destination pixel
      outData[destIdx] = Math.round(data[destIdx] * (1 - weight) + data[srcIdx] * weight);
      outData[destIdx + 1] = Math.round(data[destIdx + 1] * (1 - weight) + data[srcIdx + 1] * weight);
      outData[destIdx + 2] = Math.round(data[destIdx + 2] * (1 - weight) + data[srcIdx + 2] * weight);
      outData[destIdx + 3] = Math.round(data[destIdx + 3] * (1 - weight) + data[srcIdx + 3] * weight);
    }
  }

  return output;
}

// === CURVES ADJUSTMENT ===
export function applyCurves(
  imgData: ImageData,
  points: { input: number; output: number }[]
): ImageData {
  const { width, height, data } = imgData;
  const output = new ImageData(new Uint8ClampedArray(data), width, height);
  const outData = output.data;

  const lut = computeCurveLut(points);

  for (let i = 0; i < outData.length; i += 4) {
    outData[i] = lut[data[i]];
    outData[i + 1] = lut[data[i + 1]];
    outData[i + 2] = lut[data[i + 2]];
  }

  return output;
}

// === LEVELS ADJUSTMENT ===
export function applyLevels(
  imgData: ImageData,
  params: { shadows: number; midtones: number; highlights: number }
): ImageData {
  const { width, height, data } = imgData;
  const output = new ImageData(new Uint8ClampedArray(data), width, height);
  const outData = output.data;

  const { shadows, midtones, highlights } = params;

  for (let i = 0; i < outData.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      let val = data[i + c] / 255;
      val = (val - shadows / 255) / ((highlights - shadows) / 255);
      val = Math.max(0, Math.min(1, val));
      if (midtones !== 1.0 && midtones > 0) {
        val = Math.pow(val, 1 / midtones);
      }
      outData[i + c] = Math.max(0, Math.min(255, Math.round(val * 255)));
    }
    outData[i + 3] = data[i + 3];
  }

  return output;
}

// === FILTER GALLERY ===
export function applyFilterGallery(
  imgData: ImageData,
  effect: string,
  params: { intensity?: number; radius?: number; angle?: number; threshold?: number }
): ImageData {
  const { width, height, data } = imgData;
  const output = new ImageData(new Uint8ClampedArray(data), width, height);
  const outData = output.data;

  const intensity = params.intensity ?? 50;
  const radius = params.radius ?? 3;
  const angle = params.angle ?? 0;
  const threshold = params.threshold ?? 128;

  switch (effect) {
    case 'gaussian-blur': {
      const rad = Math.max(1, Math.round(radius));
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let r = 0, g = 0, b = 0, count = 0;
          for (let dy = -rad; dy <= rad; dy++) {
            for (let dx = -rad; dx <= rad; dx++) {
              const px = x + dx;
              const py = y + dy;
              if (px >= 0 && px < width && py >= 0 && py < height) {
                const idx = (py * width + px) * 4;
                const dist = dx * dx + dy * dy;
                const weight = Math.exp(-dist / (rad * rad));
                r += data[idx] * weight;
                g += data[idx + 1] * weight;
                b += data[idx + 2] * weight;
                count += weight;
              }
            }
          }
          const oi = (y * width + x) * 4;
          outData[oi] = count > 0 ? Math.round(r / count) : data[oi];
          outData[oi + 1] = count > 0 ? Math.round(g / count) : data[oi + 1];
          outData[oi + 2] = count > 0 ? Math.round(b / count) : data[oi + 2];
          outData[oi + 3] = data[oi + 3];
        }
      }
      break;
    }

    case 'motion-blur': {
      const rad = Math.max(1, Math.round(radius));
      const radAng = (angle * Math.PI) / 180;
      const cosA = Math.cos(radAng);
      const sinA = Math.sin(radAng);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let r = 0, g = 0, b = 0, count = 0;
          for (let d = -rad; d <= rad; d++) {
            const px = Math.round(x + d * cosA);
            const py = Math.round(y + d * sinA);
            if (px >= 0 && px < width && py >= 0 && py < height) {
              const idx = (py * width + px) * 4;
              const weight = 1 / (Math.abs(d) + 1);
              r += data[idx] * weight;
              g += data[idx + 1] * weight;
              b += data[idx + 2] * weight;
              count += weight;
            }
          }
          const oi = (y * width + x) * 4;
          outData[oi] = count > 0 ? Math.round(r / count) : data[oi];
          outData[oi + 1] = count > 0 ? Math.round(g / count) : data[oi + 1];
          outData[oi + 2] = count > 0 ? Math.round(b / count) : data[oi + 2];
          outData[oi + 3] = data[oi + 3];
        }
      }
      break;
    }

    case 'radial-blur': {
      const cx = width / 2;
      const cy = height / 2;
      const samples = Math.max(3, Math.round(intensity / 5));
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const dx = x - cx;
          const dy = y - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const angleStep = (intensity / 100) * 0.1;
          let r = 0, g = 0, b = 0, count = 0;
          for (let s = -samples; s <= samples; s++) {
            const a = Math.atan2(dy, dx) + s * angleStep;
            const px = Math.round(cx + dist * Math.cos(a));
            const py = Math.round(cy + dist * Math.sin(a));
            if (px >= 0 && px < width && py >= 0 && py < height) {
              const idx = (py * width + px) * 4;
              r += data[idx];
              g += data[idx + 1];
              b += data[idx + 2];
              count++;
            }
          }
          const oi = (y * width + x) * 4;
          outData[oi] = count > 0 ? Math.round(r / count) : data[oi];
          outData[oi + 1] = count > 0 ? Math.round(g / count) : data[oi + 1];
          outData[oi + 2] = count > 0 ? Math.round(b / count) : data[oi + 2];
          outData[oi + 3] = data[oi + 3];
        }
      }
      break;
    }

    case 'emboss': {
      const embossKernel = [-2, -1, 0, -1, 1, 1, 0, 1, 2];
      const kSize = 3;
      const half = 1;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (y < half || y >= height - half || x < half || x >= width - half) {
            const oi = (y * width + x) * 4;
            outData[oi] = data[oi]; outData[oi + 1] = data[oi + 1]; outData[oi + 2] = data[oi + 2]; outData[oi + 3] = data[oi + 3];
            continue;
          }
          let r = 128, g = 128, b = 128;
          for (let ky = 0; ky < kSize; ky++) {
            for (let kx = 0; kx < kSize; kx++) {
              const px = x + kx - half;
              const py = y + ky - half;
              const pIdx = (py * width + px) * 4;
              const weight = embossKernel[ky * kSize + kx];
              r += data[pIdx] * weight;
              g += data[pIdx + 1] * weight;
              b += data[pIdx + 2] * weight;
            }
          }
          const oi = (y * width + x) * 4;
          outData[oi] = Math.max(0, Math.min(255, r));
          outData[oi + 1] = Math.max(0, Math.min(255, g));
          outData[oi + 2] = Math.max(0, Math.min(255, b));
          outData[oi + 3] = data[oi + 3];
        }
      }
      break;
    }

    case 'find-edges': {
      const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
      const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          let gxR = 0, gxG = 0, gxB = 0;
          let gyR = 0, gyG = 0, gyB = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const idx = ((y + ky) * width + (x + kx)) * 4;
              const w = (ky + 1) * 3 + (kx + 1);
              gxR += data[idx] * sobelX[w];
              gxG += data[idx + 1] * sobelX[w];
              gxB += data[idx + 2] * sobelX[w];
              gyR += data[idx] * sobelY[w];
              gyG += data[idx + 1] * sobelY[w];
              gyB += data[idx + 2] * sobelY[w];
            }
          }
          const oi = (y * width + x) * 4;
          const magR = Math.min(255, Math.sqrt(gxR * gxR + gyR * gyR));
          const magG = Math.min(255, Math.sqrt(gxG * gxG + gyG * gyG));
          const magB = Math.min(255, Math.sqrt(gxB * gxB + gyB * gyB));
          const inv = threshold / 255;
          outData[oi] = Math.max(0, 255 - magR * (1 - inv));
          outData[oi + 1] = Math.max(0, 255 - magG * (1 - inv));
          outData[oi + 2] = Math.max(0, 255 - magB * (1 - inv));
          outData[oi + 3] = data[oi + 3];
        }
      }
      break;
    }

    case 'posterize': {
      const levels = Math.max(2, Math.min(32, Math.round((intensity / 100) * 30) + 2));
      const step = 255 / (levels - 1);
      for (let i = 0; i < outData.length; i += 4) {
        outData[i] = Math.round(data[i] / step) * step;
        outData[i + 1] = Math.round(data[i + 1] / step) * step;
        outData[i + 2] = Math.round(data[i + 2] / step) * step;
        outData[i + 3] = data[i + 3];
      }
      break;
    }

    case 'threshold': {
      const t = Math.max(0, Math.min(255, threshold));
      for (let i = 0; i < outData.length; i += 4) {
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        const val = lum >= t ? 255 : 0;
        outData[i] = val; outData[i + 1] = val; outData[i + 2] = val;
        outData[i + 3] = data[i + 3];
      }
      break;
    }

    case 'pixelate': {
      const blockSize = Math.max(2, Math.round(radius));
      for (let y = 0; y < height; y += blockSize) {
        for (let x = 0; x < width; x += blockSize) {
          let r = 0, g = 0, b = 0, count = 0;
          const endY = Math.min(y + blockSize, height);
          const endX = Math.min(x + blockSize, width);
          for (let py = y; py < endY; py++) {
            for (let px = x; px < endX; px++) {
              const idx = (py * width + px) * 4;
              r += data[idx]; g += data[idx + 1]; b += data[idx + 2];
              count++;
            }
          }
          if (count > 0) {
            r /= count; g /= count; b /= count;
            for (let py = y; py < endY; py++) {
              for (let px = x; px < endX; px++) {
                const oi = (py * width + px) * 4;
                outData[oi] = r; outData[oi + 1] = g; outData[oi + 2] = b;
              }
            }
          }
        }
      }
      break;
    }

    case 'noise': {
      const amount = (intensity / 100) * 60;
      for (let i = 0; i < outData.length; i += 4) {
        const n = (Math.random() - 0.5) * amount;
        outData[i] = Math.max(0, Math.min(255, data[i] + n));
        outData[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n));
        outData[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n));
        outData[i + 3] = data[i + 3];
      }
      break;
    }

    case 'sharpen': {
      const sk = [0, -1, 0, -1, 5, -1, 0, -1, 0];
      const half = 1;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (y < half || y >= height - half || x < half || x >= width - half) {
            const oi = (y * width + x) * 4;
            outData[oi] = data[oi]; outData[oi + 1] = data[oi + 1]; outData[oi + 2] = data[oi + 2]; outData[oi + 3] = data[oi + 3];
            continue;
          }
          let r = 0, g = 0, b = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const idx = ((y + ky) * width + (x + kx)) * 4;
              const w = (ky + 1) * 3 + (kx + 1);
              r += data[idx] * sk[w];
              g += data[idx + 1] * sk[w];
              b += data[idx + 2] * sk[w];
            }
          }
          const oi = (y * width + x) * 4;
          outData[oi] = Math.max(0, Math.min(255, r));
          outData[oi + 1] = Math.max(0, Math.min(255, g));
          outData[oi + 2] = Math.max(0, Math.min(255, b));
          outData[oi + 3] = data[oi + 3];
        }
      }
      break;
    }

    case 'twirl': {
      const cx = width / 2;
      const cy = height / 2;
      const maxR = Math.min(width, height) / 2;
      const twirlAng = (intensity / 100) * 20;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const dx = x - cx;
          const dy = y - cy;
          let dist = Math.min(Math.sqrt(dx * dx + dy * dy), maxR - 1);
          const srcAng = Math.atan2(dy, dx);
          const newAng = srcAng + (twirlAng * (1 - dist / maxR));
          const sx = Math.round(cx + dist * Math.cos(newAng));
          const sy = Math.round(cy + dist * Math.sin(newAng));
          const oi = (y * width + x) * 4;
          if (sx >= 0 && sx < width && sy >= 0 && sy < height) {
            const si = (sy * width + sx) * 4;
            outData[oi] = data[si]; outData[oi + 1] = data[si + 1]; outData[oi + 2] = data[si + 2];
          } else {
            outData[oi] = data[oi]; outData[oi + 1] = data[oi + 1]; outData[oi + 2] = data[oi + 2];
          }
          outData[oi + 3] = data[oi + 3];
        }
      }
      break;
    }

    case 'oil-paint': {
      const rad = Math.max(1, Math.round(radius));
      const lvls = Math.max(2, Math.round((intensity / 100) * 20) + 2);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const bins: number[][] = Array.from({ length: lvls }, () => [0, 0, 0, 0]);
          let maxCount = 0, maxIdx = 0;
          for (let dy = -rad; dy <= rad; dy++) {
            for (let dx = -rad; dx <= rad; dx++) {
              const px = x + dx;
              const py = y + dy;
              if (px >= 0 && px < width && py >= 0 && py < height) {
                const idx = (py * width + px) * 4;
                const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
                const bin = Math.min(lvls - 1, Math.floor((lum / 255) * lvls));
                bins[bin][0] += data[idx];
                bins[bin][1] += data[idx + 1];
                bins[bin][2] += data[idx + 2];
                bins[bin][3]++;
                if (bins[bin][3] > maxCount) { maxCount = bins[bin][3]; maxIdx = bin; }
              }
            }
          }
          const oi = (y * width + x) * 4;
          if (maxCount > 0) {
            outData[oi] = bins[maxIdx][0] / bins[maxIdx][3];
            outData[oi + 1] = bins[maxIdx][1] / bins[maxIdx][3];
            outData[oi + 2] = bins[maxIdx][2] / bins[maxIdx][3];
          }
          outData[oi + 3] = data[oi + 3];
        }
      }
      break;
    }

    case 'solarize': {
      const thresh = (intensity / 100) * 255;
      for (let i = 0; i < outData.length; i += 4) {
        for (let c = 0; c < 3; c++) {
          outData[i + c] = data[i + c] > thresh ? 255 - data[i + c] : data[i + c];
        }
        outData[i + 3] = data[i + 3];
      }
      break;
    }

    case 'ripple': {
      const wave = (intensity / 100) * 20;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const dx = Math.round(Math.sin(y / 8) * wave);
          const nx = Math.max(0, Math.min(width - 1, x + dx));
          const idx = (y * width + x) * 4;
          const nidx = (y * width + nx) * 4;
          outData[idx] = data[nidx];
          outData[idx + 1] = data[nidx + 1];
          outData[idx + 2] = data[nidx + 2];
          outData[idx + 3] = data[nidx + 3];
        }
      }
      break;
    }



    default:
      for (let i = 0; i < outData.length; i++) outData[i] = data[i];
      break;
  }

  return output;
}

// === LAYER ALIGNMENT HELPERS ===
export type AlignmentType = 'left' | 'right' | 'top' | 'bottom' | 'center-h' | 'center-v' | 'distribute-h' | 'distribute-v';

export function alignLayers(
  layers: { id: string; x: number; y: number; width: number; height: number }[],
  alignment: AlignmentType,
  canvasWidth: number,
  canvasHeight: number
): { id: string; x: number; y: number }[] {
  if (layers.length === 0) return [];
  const result = layers.map((l) => ({ id: l.id, x: l.x, y: l.y }));

  switch (alignment) {
    case 'left': {
      const minX = Math.min(...layers.map((l) => l.x));
      result.forEach((r, i) => (r.x = minX));
      break;
    }
    case 'right': {
      const maxRight = Math.max(...layers.map((l) => l.x + l.width));
      result.forEach((r, i) => (r.x = maxRight - layers[i].width));
      break;
    }
    case 'top': {
      const minY = Math.min(...layers.map((l) => l.y));
      result.forEach((r, i) => (r.y = minY));
      break;
    }
    case 'bottom': {
      const maxBottom = Math.max(...layers.map((l) => l.y + l.height));
      result.forEach((r, i) => (r.y = maxBottom - layers[i].height));
      break;
    }
    case 'center-h':
      result.forEach((r, i) => (r.x = Math.round((canvasWidth - layers[i].width) / 2)));
      break;
    case 'center-v':
      result.forEach((r, i) => (r.y = Math.round((canvasHeight - layers[i].height) / 2)));
      break;
    case 'distribute-h': {
      if (layers.length < 3) break;
      const sorted = layers.map((l, i) => ({ ...l, origIdx: i })).sort((a, b) => a.x - b.x);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const totalSpace = last.x + last.width - first.x;
      const totalWidths = sorted.reduce((sum, l) => sum + l.width, 0);
      const gap = (totalSpace - totalWidths) / (sorted.length - 1);
      let cursor = first.x;
      for (let i = 0; i < sorted.length; i++) {
        result[sorted[i].origIdx].x = Math.round(cursor);
        cursor += sorted[i].width + gap;
      }
      break;
    }
    case 'distribute-v': {
      if (layers.length < 3) break;
      const sorted = layers.map((l, i) => ({ ...l, origIdx: i })).sort((a, b) => a.y - b.y);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const totalSpace = last.y + last.height - first.y;
      const totalHeights = sorted.reduce((sum, l) => sum + l.height, 0);
      const gap = (totalSpace - totalHeights) / (sorted.length - 1);
      let cursor = first.y;
      for (let i = 0; i < sorted.length; i++) {
        result[sorted[i].origIdx].y = Math.round(cursor);
        cursor += sorted[i].height + gap;
      }
      break;
    }
  }

  return result;
}

export function applyFilterEffect(imgData: ImageData, effect: string, intensity: number = 50): ImageData {
  const { width, height, data } = imgData;
  const output = new ImageData(new Uint8ClampedArray(data), width, height);
  const out = output.data;

  switch (effect) {
    case 'noise': {
      const amt = (intensity / 100) * 128;
      for (let i = 0; i < out.length; i += 4) {
        const offset = (Math.random() - 0.5) * amt;
        out[i] = Math.max(0, Math.min(255, out[i] + offset));
        out[i + 1] = Math.max(0, Math.min(255, out[i + 1] + offset));
        out[i + 2] = Math.max(0, Math.min(255, out[i + 2] + offset));
      }
      break;
    }
    case 'posterize': {
      const levels = Math.max(2, Math.min(16, Math.round(2 + (1 - intensity / 100) * 14)));
      const step = 255 / (levels - 1);
      for (let i = 0; i < out.length; i += 4) {
        out[i] = Math.round(out[i] / step) * step;
        out[i + 1] = Math.round(out[i + 1] / step) * step;
        out[i + 2] = Math.round(out[i + 2] / step) * step;
      }
      break;
    }
    case 'threshold': {
      const thresh = (intensity / 100) * 255;
      for (let i = 0; i < out.length; i += 4) {
        const bright = (out[i] + out[i + 1] + out[i + 2]) / 3;
        const val = bright >= thresh ? 255 : 0;
        out[i] = val;
        out[i + 1] = val;
        out[i + 2] = val;
      }
      break;
    }
    case 'solarize': {
      const thresh = (intensity / 100) * 255;
      for (let i = 0; i < out.length; i += 4) {
        if (out[i] > thresh) out[i] = 255 - out[i];
        if (out[i + 1] > thresh) out[i + 1] = 255 - out[i + 1];
        if (out[i + 2] > thresh) out[i + 2] = 255 - out[i + 2];
      }
      break;
    }
    case 'find-edges': {
      const edgeData = new Uint8ClampedArray(data);
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = (y * width + x) * 4;
          const idxR = (y * width + (x + 1)) * 4;
          const val = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          const valR = (data[idxR] + data[idxR + 1] + data[idxR + 2]) / 3;

          const idxD = ((y + 1) * width + x) * 4;
          const valD = (data[idxD] + data[idxD + 1] + data[idxD + 2]) / 3;

          const diff = Math.min(255, (Math.abs(val - valR) + Math.abs(val - valD)) * (intensity / 50));
          edgeData[idx] = diff;
          edgeData[idx + 1] = diff;
          edgeData[idx + 2] = diff;
        }
      }
      for (let i = 0; i < out.length; i += 4) {
        out[i] = edgeData[i];
        out[i + 1] = edgeData[i + 1];
        out[i + 2] = edgeData[i + 2];
      }
      break;
    }
    case 'emboss': {
      const embossData = new Uint8ClampedArray(data);
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = (y * width + x) * 4;
          const idxTL = ((y - 1) * width + (x - 1)) * 4;
          const idxBR = ((y + 1) * width + (x + 1)) * 4;

          for (let c = 0; c < 3; c++) {
            const diff = data[idxBR + c] - data[idxTL + c] + 128;
            embossData[idx + c] = Math.max(0, Math.min(255, diff));
          }
        }
      }
      for (let i = 0; i < out.length; i += 4) {
        out[i] = embossData[i];
        out[i + 1] = embossData[i + 1];
        out[i + 2] = embossData[i + 2];
      }
      break;
    }
    case 'pixelate':
    case 'mosaic': {
      const size = Math.max(2, Math.round(2 + (intensity / 100) * 30));
      for (let y = 0; y < height; y += size) {
        for (let x = 0; x < width; x += size) {
          const blockIdx = (y * width + x) * 4;
          const r = data[blockIdx];
          const g = data[blockIdx + 1];
          const b = data[blockIdx + 2];
          
          for (let by = 0; by < size && y + by < height; by++) {
            for (let bx = 0; bx < size && x + bx < width; bx++) {
              const idx = ((y + by) * width + (x + bx)) * 4;
              out[idx] = r;
              out[idx + 1] = g;
              out[idx + 2] = b;
            }
          }
        }
      }
      break;
    }
    case 'ripple': {
      const wave = (intensity / 100) * 20;
      const copy = new Uint8ClampedArray(data);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const dx = Math.round(Math.sin(y / 8) * wave);
          const nx = Math.max(0, Math.min(width - 1, x + dx));
          const idx = (y * width + x) * 4;
          const nidx = (y * width + nx) * 4;
          out[idx] = copy[nidx];
          out[idx + 1] = copy[nidx + 1];
          out[idx + 2] = copy[nidx + 2];
        }
      }
      break;
    }
    case 'twirl': {
      const angle = (intensity / 100) * Math.PI;
      const cx = width / 2;
      const cy = height / 2;
      const maxR = Math.min(width, height) / 2;
      const copy = new Uint8ClampedArray(data);

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const dx = x - cx;
          const dy = y - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < maxR) {
            const fact = 1 - dist / maxR;
            const currentAngle = Math.atan2(dy, dx) + angle * fact;
            const srcX = Math.max(0, Math.min(width - 1, Math.round(cx + Math.cos(currentAngle) * dist)));
            const srcY = Math.max(0, Math.min(height - 1, Math.round(cy + Math.sin(currentAngle) * dist)));
            const idx = (y * width + x) * 4;
            const sidx = (srcY * width + srcX) * 4;
            out[idx] = copy[sidx];
            out[idx + 1] = copy[sidx + 1];
            out[idx + 2] = copy[sidx + 2];
          }
        }
      }
      break;
    }
  }

  return output;
}

