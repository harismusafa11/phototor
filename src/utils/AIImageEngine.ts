/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// AIImageEngine implements neural simulation pixel filters (enhance, upscale, denoise, sharpen, relight, sky replacement, etc.)

import { rgbToHsl, hslToRgb } from './AdjustmentEngine';

// 1. AI Enhance: Auto contrast stretch + HSL saturation pop + minor detail boost
export function applyAIEnhance(imgData: ImageData): ImageData {
  const { width, height, data } = imgData;
  const output = new ImageData(new Uint8ClampedArray(data), width, height);
  const out = output.data;

  // Find min/max values of composite channels
  let min = 255, max = 0;
  const step = Math.max(1, Math.floor(out.length / 4 / 10000));
  for (let i = 0; i < out.length; i += step * 4) {
    if (out[i + 3] < 10) continue;
    const lum = 0.299 * out[i] + 0.587 * out[i + 1] + 0.114 * out[i + 2];
    if (lum < min) min = lum;
    if (lum > max) max = lum;
  }

  // Adjust contrast & boost saturation
  for (let i = 0; i < out.length; i += 4) {
    if (out[i + 3] === 0) continue;
    let r = out[i];
    let g = out[i + 1];
    let b = out[i + 2];

    // Contrast stretching
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const norm = max > min ? (lum - min) / (max - min) : 0.5;
    const stretchFactor = 1.15;
    r = r + (r * (norm - 0.5)) * stretchFactor;
    g = g + (g * (norm - 0.5)) * stretchFactor;
    b = b + (b * (norm - 0.5)) * stretchFactor;

    // Saturation pop
    let hsl = rgbToHsl(r, g, b);
    hsl.s = Math.max(0, Math.min(100, hsl.s + 12));
    hsl.l = Math.max(0, Math.min(100, hsl.l + 3));
    const rgb = hslToRgb(hsl.h, hsl.s, hsl.l);

    out[i] = Math.max(0, Math.min(255, rgb.r));
    out[i + 1] = Math.max(0, Math.min(255, rgb.g));
    out[i + 2] = Math.max(0, Math.min(255, rgb.b));
  }

  return output;
}

// 2. AI Denoise: 5x5 selective bilateral filter (smooth flat regions, keep edge gradients sharp)
export function applyAIDenoise(imgData: ImageData): ImageData {
  const { width, height, data } = imgData;
  const output = new ImageData(new Uint8ClampedArray(data), width, height);
  const out = output.data;

  const getPixelIndex = (x: number, y: number) => {
    const px = Math.max(0, Math.min(width - 1, x));
    const py = Math.max(0, Math.min(height - 1, y));
    return (py * width + px) * 4;
  };

  const colorWeightLimit = 35; // edge threshold

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      if (data[idx + 3] === 0) continue;

      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      let sumR = 0, sumG = 0, sumB = 0;
      let wSum = 0;

      // 5x5 neighborhood check
      for (let j = -2; j <= 2; j++) {
        for (let i = -2; i <= 2; i++) {
          const nidx = getPixelIndex(x + i, y + j);
          const nr = data[nidx];
          const ng = data[nidx + 1];
          const nb = data[nidx + 2];

          // Compute color difference
          const cDist = Math.sqrt((r - nr) * (r - nr) + (g - ng) * (g - ng) + (b - nb) * (b - nb));
          if (cDist < colorWeightLimit) {
            // Bilateral range weighting
            const w = (1 - cDist / colorWeightLimit);
            sumR += nr * w;
            sumG += ng * w;
            sumB += nb * w;
            wSum += w;
          }
        }
      }

      if (wSum > 0) {
        out[idx] = Math.round(sumR / wSum);
        out[idx + 1] = Math.round(sumG / wSum);
        out[idx + 2] = Math.round(sumB / wSum);
      }
    }
  }

  return output;
}

// 3. AI Sharpen: Laplacian 3x3 high-pass edge-enhancing convolution
export function applyAISharpen(imgData: ImageData): ImageData {
  const { width, height, data } = imgData;
  const output = new ImageData(new Uint8ClampedArray(data), width, height);
  const out = output.data;

  const kernel = [
     0, -1,  0,
    -1,  5, -1,
     0, -1,  0
  ];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      if (data[idx + 3] === 0) continue;

      let rVal = 0, gVal = 0, bVal = 0;

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const kidx = ((y + ky) * width + (x + kx)) * 4;
          const kweight = kernel[(ky + 1) * 3 + (kx + 1)];
          rVal += data[kidx] * kweight;
          gVal += data[kidx + 1] * kweight;
          bVal += data[kidx + 2] * kweight;
        }
      }

      out[idx] = Math.max(0, Math.min(255, rVal));
      out[idx + 1] = Math.max(0, Math.min(255, gVal));
      out[idx + 2] = Math.max(0, Math.min(255, bVal));
    }
  }

  return output;
}

// 4. AI Relight: Apply high fidelity virtual radial spotlight from top-left
export function applyAIRelight(imgData: ImageData): ImageData {
  const { width, height, data } = imgData;
  const output = new ImageData(new Uint8ClampedArray(data), width, height);
  const out = output.data;

  // Center of spotlight: 25% width, 20% height
  const cX = width * 0.25;
  const cY = height * 0.20;
  const maxRadius = Math.sqrt(width * width + height * height) * 0.65;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      if (data[idx + 3] === 0) continue;

      const dx = x - cX;
      const dy = y - cY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Light scaling falloff factor
      let factor = 1.0;
      if (dist < maxRadius) {
        const falloff = 1 - dist / maxRadius;
        factor = 1 + 0.35 * Math.pow(falloff, 2);
      } else {
        factor = 0.85; // darken shadows outside range
      }

      out[idx] = Math.max(0, Math.min(255, data[idx] * factor));
      out[idx + 1] = Math.max(0, Math.min(255, data[idx + 1] * factor));
      out[idx + 2] = Math.max(0, Math.min(255, data[idx + 2] * factor));
    }
  }

  return output;
}

// 5. AI Color Correct: Grey-world average channel normalization
export function applyAIColorCorrect(imgData: ImageData): ImageData {
  const { width, height, data } = imgData;
  const output = new ImageData(new Uint8ClampedArray(data), width, height);
  const out = output.data;

  let sumR = 0, sumG = 0, sumB = 0;
  let count = 0;

  // Calculate channel averages
  const step = Math.max(1, Math.floor(out.length / 4 / 20000));
  for (let i = 0; i < out.length; i += step * 4) {
    if (out[i + 3] < 50) continue;
    sumR += out[i];
    sumG += out[i + 1];
    sumB += out[i + 2];
    count++;
  }

  if (count > 0) {
    const avgR = sumR / count;
    const avgG = sumG / count;
    const avgB = sumB / count;
    const targetAvg = (avgR + avgG + avgB) / 3;

    // Scaling factors to normalize color shifts
    const scaleR = targetAvg / (avgR || 1);
    const scaleG = targetAvg / (avgG || 1);
    const scaleB = targetAvg / (avgB || 1);

    for (let i = 0; i < out.length; i += 4) {
      if (out[i + 3] === 0) continue;
      out[i] = Math.max(0, Math.min(255, out[i] * scaleR));
      out[i + 1] = Math.max(0, Math.min(255, out[i + 1] * scaleG));
      out[i + 2] = Math.max(0, Math.min(255, out[i + 2] * scaleB));
    }
  }

  return output;
}

// 6. AI Restore: Combined denoise, minor sharpening, and dynamic range stretch
export function applyAIRestore(imgData: ImageData): ImageData {
  const denoised = applyAIDenoise(imgData);
  const sharpened = applyAISharpen(denoised);
  return applyAIEnhance(sharpened);
}

// 7. AI Face Enhance: Bilateral smoothing on skin tones, sharpen elsewhere
export function applyAIFaceEnhance(imgData: ImageData): ImageData {
  const { width, height, data } = imgData;
  const output = new ImageData(new Uint8ClampedArray(data), width, height);
  const out = output.data;

  // 1. Compute skin smoothed map using bilateral filter
  const smoothed = applyAIDenoise(imgData);
  const smoothedData = smoothed.data;

  // 2. Compute sharp details map using sharpening
  const sharpened = applyAISharpen(imgData);
  const sharpenedData = sharpened.data;

  // Blends skin tones smoothly, sharpens non-skin areas (hair, eyes, lips)
  for (let i = 0; i < out.length; i += 4) {
    if (out[i + 3] === 0) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Standard RGB human skin color classification bounds
    const isSkin =
      r > 95 &&
      g > 40 &&
      b > 20 &&
      r - g > 15 &&
      r > b &&
      Math.max(r, g, b) - Math.min(r, g, b) > 15;

    if (isSkin) {
      // Skin tone: smooth textures
      out[i] = smoothedData[i];
      out[i + 1] = smoothedData[i + 1];
      out[i + 2] = smoothedData[i + 2];
    } else {
      // Features (eyes, hair): sharpen outlines
      out[i] = sharpenedData[i];
      out[i + 1] = sharpenedData[i + 1];
      out[i + 2] = sharpenedData[i + 2];
    }
  }

  return output;
}

// 8. AI Remove JPEG Artifacts: 3x3 block-smoothing filter on low-contrast zones
export function applyAIRemoveArtifacts(imgData: ImageData): ImageData {
  const { width, height, data } = imgData;
  const output = new ImageData(new Uint8ClampedArray(data), width, height);
  const out = output.data;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      if (data[idx + 3] === 0) continue;

      // Check local block contrast
      let maxDiff = 0;
      for (let j = -1; j <= 1; j++) {
        for (let i = -1; i <= 1; i++) {
          const nidx = ((y + j) * width + (x + i)) * 4;
          const diff = Math.abs(data[idx] - data[nidx]);
          if (diff > maxDiff) maxDiff = diff;
        }
      }

      // If low contrast, smooth JPEG block ringing
      if (maxDiff < 32) {
        let rSum = 0, gSum = 0, bSum = 0;
        for (let j = -1; j <= 1; j++) {
          for (let i = -1; i <= 1; i++) {
            const nidx = ((y + j) * width + (x + i)) * 4;
            rSum += data[nidx];
            gSum += data[nidx + 1];
            bSum += data[nidx + 2];
          }
        }
        out[idx] = Math.round(rSum / 9);
        out[idx + 1] = Math.round(gSum / 9);
        out[idx + 2] = Math.round(bSum / 9);
      }
    }
  }

  return output;
}

// 9. AI Sky Replacement: Detect blue/gray gradient zones in top 55% of image and composite warm golden sunset sky
export function applyAISkyReplacement(imgData: ImageData): ImageData {
  const { width, height, data } = imgData;
  const output = new ImageData(new Uint8ClampedArray(data), width, height);
  const out = output.data;

  // Sky colors definition (Sunset gradient: top purple, middle orange, bottom yellow)
  const getSunsetSkyColor = (yPct: number) => {
    // top (purple-ish blue)
    const c0 = { r: 90, g: 60, b: 155 };
    // middle (warm orange)
    const c1 = { r: 245, g: 110, b: 60 };
    // bottom (golden yellow)
    const c2 = { r: 250, g: 200, b: 70 };

    if (yPct < 0.5) {
      const t = yPct / 0.5;
      return {
        r: Math.round(c0.r + (c1.r - c0.r) * t),
        g: Math.round(c0.g + (c1.g - c0.g) * t),
        b: Math.round(c0.b + (c1.b - c0.b) * t),
      };
    } else {
      const t = (yPct - 0.5) / 0.5;
      return {
        r: Math.round(c1.r + (c2.r - c1.r) * t),
        g: Math.round(c1.g + (c2.g - c1.g) * t),
        b: Math.round(c1.b + (c2.b - c1.b) * t),
      };
    }
  };

  for (let y = 0; y < height; y++) {
    const yPct = y / height;
    const skyColor = getSunsetSkyColor(yPct);

    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      if (data[idx + 3] === 0) continue;

      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      // Heuristic sky detection rules:
      // Must be in upper 60% of the canvas height
      // Blue sky: (B > R && B > G) OR High brightness white/gray sky (R,G,B > 185)
      const isSkyPos = yPct < 0.60;
      const isSkyColor = (b > r * 1.05 && b > g * 1.02 && b > 80) || (r > 185 && g > 185 && b > 185);

      if (isSkyPos && isSkyColor) {
        // Blend factor based on how blue/light it is to soften horizon mask edges
        let blendFactor = 1.0;
        if (yPct > 0.40) {
          blendFactor = (0.60 - yPct) / 0.20; // fade out blend towards 60% limit
        }

        out[idx] = Math.round(r * (1 - blendFactor) + skyColor.r * blendFactor);
        out[idx + 1] = Math.round(g * (1 - blendFactor) + skyColor.g * blendFactor);
        out[idx + 2] = Math.round(b * (1 - blendFactor) + skyColor.b * blendFactor);
      }
    }
  }

  return output;
}
