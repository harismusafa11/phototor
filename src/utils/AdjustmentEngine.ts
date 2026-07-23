/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Adjustments, CurvePoint, LevelsParams } from '../types';

// Convert RGB to HSL
export function rgbToHsl(r: number, g: number, b: number) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

// Convert HSL to RGB
export function hslToRgb(h: number, s: number, l: number) {
  h /= 360;
  s /= 100;
  l /= 100;
  let r = l;
  let g = l;
  let b = l;

  if (s !== 0) {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

// Calculate Natural Cubic Spline Curve LUT
export function computeCurveLut(points: CurvePoint[]): Uint8Array {
  const lut = new Uint8Array(256);
  const n = points.length;

  if (n === 0) {
    for (let i = 0; i < 256; i++) lut[i] = i;
    return lut;
  }
  if (n === 1) {
    for (let i = 0; i < 256; i++) lut[i] = points[0].output;
    return lut;
  }

  // Sort by input
  const sorted = [...points].sort((a, b) => a.input - b.input);
  
  // Ensure we have endpoints at 0 and 255
  if (sorted[0].input > 0) {
    sorted.unshift({ input: 0, output: sorted[0].output });
  }
  if (sorted[sorted.length - 1].input < 255) {
    sorted.push({ input: 255, output: sorted[sorted.length - 1].output });
  }

  const k = sorted.length;
  
  // Natural Cubic Spline interpolation
  // Solve A * c = B, where A is a tridiagonal matrix
  const h = new Float64Array(k - 1);
  for (let i = 0; i < k - 1; i++) {
    h[i] = sorted[i + 1].input - sorted[i].input;
    if (h[i] <= 0) h[i] = 0.000001; // prevent division by zero
  }

  const a = new Float64Array(k);
  for (let i = 0; i < k; i++) {
    a[i] = sorted[i].output;
  }

  const alpha = new Float64Array(k - 1);
  for (let i = 1; i < k - 1; i++) {
    alpha[i] = (3 / h[i]) * (a[i + 1] - a[i]) - (3 / h[i - 1]) * (a[i] - a[i - 1]);
  }

  const l = new Float64Array(k);
  const mu = new Float64Array(k);
  const z = new Float64Array(k);
  l[0] = 1;
  mu[0] = 0;
  z[0] = 0;

  for (let i = 1; i < k - 1; i++) {
    l[i] = 2 * (sorted[i + 1].input - sorted[i - 1].input) - h[i - 1] * mu[i - 1];
    mu[i] = h[i] / l[i];
    z[i] = (alpha[i] - h[i - 1] * z[i - 1]) / l[i];
  }

  l[k - 1] = 1;
  z[k - 1] = 0;
  const c = new Float64Array(k);
  const b = new Float64Array(k - 1);
  const d = new Float64Array(k - 1);

  c[k - 1] = 0;
  for (let j = k - 2; j >= 0; j--) {
    c[j] = z[j] - mu[j] * c[j + 1];
    b[j] = (a[j + 1] - a[j]) / h[j] - (h[j] * (c[j + 1] + 2 * c[j])) / 3;
    d[j] = (c[j + 1] - c[j]) / (3 * h[j]);
  }

  // Fill the lookup table
  for (let i = 0; i < 256; i++) {
    // Find interval containing i
    let idx = 0;
    for (let j = 0; j < k - 1; j++) {
      if (i >= sorted[j].input && i <= sorted[j + 1].input) {
        idx = j;
        break;
      }
    }
    const dx = i - sorted[idx].input;
    const val = a[idx] + b[idx] * dx + c[idx] * dx * dx + d[idx] * dx * dx * dx;
    lut[i] = Math.max(0, Math.min(255, Math.round(val)));
  }

  return lut;
}

// Parse Cube LUT content
export function parseCubeLut(cubeContent: string): { size: number; data: Float32Array } | null {
  const lines = cubeContent.split('\n');
  let size = 0;
  const rgbList: number[] = [];

  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('#')) continue;

    if (line.startsWith('LUT_3D_SIZE')) {
      const parts = line.split(/\s+/);
      size = parseInt(parts[1]);
      continue;
    }

    if (line.startsWith('LUT_1D_SIZE')) {
      // We only support 3D LUTs for photo filters
      return null;
    }

    const colorParts = line.split(/\s+/).map(Number);
    if (colorParts.length === 3 && !colorParts.some(isNaN)) {
      rgbList.push(colorParts[0], colorParts[1], colorParts[2]);
    }
  }

  if (size === 0 || rgbList.length !== size * size * size * 3) {
    return null;
  }

  return { size, data: new Float32Array(rgbList) };
}

// Built-in LUT collections
export const PRESETS_LUTS: { [name: string]: string } = {
  'Teal & Orange': `# Teal and Orange LUT simulation\nLUT_3D_SIZE 2\n0.0 0.1 0.2\n0.9 0.4 0.1\n0.0 0.7 0.9\n0.95 0.75 0.35\n0.1 0.2 0.3\n1.0 0.45 0.15\n0.0 0.8 1.0\n1.0 0.85 0.4`,
  'Vintage Film': `# Vintage Film LUT\nLUT_3D_SIZE 2\n0.15 0.1 0.05\n0.8 0.75 0.65\n0.1 0.7 0.6\n0.9 0.85 0.75\n0.2 0.15 0.1\n0.85 0.8 0.7\n0.15 0.8 0.7\n0.95 0.9 0.85`,
  'Warm Golden': `# Warm Golden Hour LUT\nLUT_3D_SIZE 2\n0.05 0.05 0.0\n0.95 0.75 0.4\n0.05 0.55 0.3\n1.0 0.8 0.45\n0.1 0.1 0.02\n1.0 0.8 0.5\n0.1 0.6 0.35\n1.0 0.9 0.6`,
  'Cool Shadow': `# Cool Shadow Ice LUT\nLUT_3D_SIZE 2\n0.0 0.05 0.15\n0.7 0.8 0.9\n0.05 0.6 0.7\n0.8 0.9 0.95\n0.02 0.1 0.2\n0.75 0.85 0.95\n0.08 0.7 0.8\n0.85 0.95 1.0`
};

// Trilinear interpolation for 3D LUT
export function apply3dLut(r: number, g: number, b: number, size: number, lutData: Float32Array): { r: number; g: number; b: number } {
  // Map 0-255 RGB to 0-(size-1) float coordinates
  const rf = (r / 255) * (size - 1);
  const gf = (g / 255) * (size - 1);
  const bf = (b / 255) * (size - 1);

  const r0 = Math.floor(rf);
  const r1 = Math.min(size - 1, r0 + 1);
  const g0 = Math.floor(gf);
  const g1 = Math.min(size - 1, g0 + 1);
  const b0 = Math.floor(bf);
  const b1 = Math.min(size - 1, b0 + 1);

  const rx = rf - r0;
  const gx = gf - g0;
  const bx = bf - b0;

  const getLutVal = (x: number, y: number, z: number) => {
    const idx = (x + y * size + z * size * size) * 3;
    return {
      r: lutData[idx],
      g: lutData[idx + 1],
      b: lutData[idx + 2]
    };
  };

  // Trilinear interpolation
  const c000 = getLutVal(r0, g0, b0);
  const c100 = getLutVal(r1, g0, b0);
  const c010 = getLutVal(r0, g1, b0);
  const c110 = getLutVal(r1, g1, b0);
  const c001 = getLutVal(r0, g0, b1);
  const c101 = getLutVal(r1, g0, b1);
  const c011 = getLutVal(r0, g1, b1);
  const c111 = getLutVal(r1, g1, b1);

  const c00 = c000.r * (1 - rx) + c100.r * rx;
  const c10 = c010.r * (1 - rx) + c110.r * rx;
  const c01 = c001.r * (1 - rx) + c101.r * rx;
  const c11 = c011.r * (1 - rx) + c111.r * rx;
  const c0 = c00 * (1 - gx) + c10 * gx;
  const c1 = c01 * (1 - gx) + c11 * gx;
  const finalR = c0 * (1 - bx) + c1 * bx;

  const cg00 = c000.g * (1 - rx) + c100.g * rx;
  const cg10 = c010.g * (1 - rx) + c110.g * rx;
  const cg01 = c001.g * (1 - rx) + c101.g * rx;
  const cg11 = c011.g * (1 - rx) + c111.g * rx;
  const cg0 = cg00 * (1 - gx) + cg10 * gx;
  const cg1 = cg01 * (1 - gx) + cg11 * gx;
  const finalG = cg0 * (1 - bx) + cg1 * bx;

  const cb00 = c000.b * (1 - rx) + c100.b * rx;
  const cb10 = c010.b * (1 - rx) + c110.b * rx;
  const cb01 = c001.b * (1 - rx) + c101.b * rx;
  const cb11 = c011.b * (1 - rx) + c111.b * rx;
  const cb0 = cb00 * (1 - gx) + cb10 * gx;
  const cb1 = cb01 * (1 - gx) + cb11 * gx;
  const finalB = cb0 * (1 - bx) + cb1 * bx;

  return {
    r: Math.max(0, Math.min(255, Math.round(finalR * 255))),
    g: Math.max(0, Math.min(255, Math.round(finalG * 255))),
    b: Math.max(0, Math.min(255, Math.round(finalB * 255)))
  };
}

// Master execution pipeline
export function applyAllAdjustments(imgData: ImageData, adj: Adjustments): ImageData {
  const { width, height } = imgData;
  const output = new ImageData(new Uint8ClampedArray(imgData.data), width, height);
  const data = output.data;

  // Pre-calculate curves if enabled
  let curveRGBTable: Uint8Array | null = adj.curvesRGB ? computeCurveLut(adj.curvesRGB) : null;
  let curveRedTable: Uint8Array | null = adj.curvesRed ? computeCurveLut(adj.curvesRed) : null;
  let curveGreenTable: Uint8Array | null = adj.curvesGreen ? computeCurveLut(adj.curvesGreen) : null;
  let curveBlueTable: Uint8Array | null = adj.curvesBlue ? computeCurveLut(adj.curvesBlue) : null;

  // Color lookup LUT
  let lutObject: { size: number; data: Float32Array } | null = null;
  if (adj.colorLookup) {
    const rawLut = PRESETS_LUTS[adj.colorLookup.name] || adj.colorLookup.cubeData;
    if (rawLut) {
      lutObject = parseCubeLut(rawLut);
    }
  }

  // Pre-calculate gradient map if enabled
  let gradLut: { r: number; g: number; b: number }[] | null = null;
  if (adj.gradientMap && adj.gradientMap.stops.length > 0) {
    gradLut = [];
    const sortedStops = [...adj.gradientMap.stops].sort((a, b) => a.offset - b.offset);
    if (sortedStops[0].offset > 0) sortedStops.unshift({ offset: 0, color: sortedStops[0].color });
    if (sortedStops[sortedStops.length - 1].offset < 1) sortedStops.push({ offset: 1, color: sortedStops[sortedStops.length - 1].color });

    const parseHex = (hex: string) => {
      const h = hex.replace('#', '');
      return {
        r: parseInt(h.substring(0, 2), 16),
        g: parseInt(h.substring(2, 4), 16),
        b: parseInt(h.substring(4, 6), 16)
      };
    };

    for (let i = 0; i < 256; i++) {
      const offset = i / 255;
      let left = sortedStops[0];
      let right = sortedStops[sortedStops.length - 1];
      for (let j = 0; j < sortedStops.length - 1; j++) {
        if (offset >= sortedStops[j].offset && offset <= sortedStops[j + 1].offset) {
          left = sortedStops[j];
          right = sortedStops[j + 1];
          break;
        }
      }
      const div = (right.offset - left.offset) || 1;
      const t = (offset - left.offset) / div;
      const lc = parseHex(left.color);
      const rc = parseHex(right.color);
      gradLut.push({
        r: Math.round(lc.r + (rc.r - lc.r) * t),
        g: Math.round(lc.g + (rc.g - lc.g) * t),
        b: Math.round(lc.b + (rc.b - lc.b) * t)
      });
    }
  }

  // Optimize pipeline: identify which adjustments are non-default
  const hasBC = adj.brightness !== 0 || adj.contrast !== 0;
  const hasLevels = adj.levelsRGB || adj.levelsRed || adj.levelsGreen || adj.levelsBlue;
  const hasCurves = curveRGBTable || curveRedTable || curveGreenTable || curveBlueTable;
  const hasExposure = adj.exposure !== 0 || adj.exposureOffset || adj.exposureGamma;
  const hasVibrance = adj.vibrance !== 0 || adj.saturation !== 0;
  const hasHueSat = adj.hueSatChannels && Object.keys(adj.hueSatChannels).length > 0;
  const hasCB = adj.colorBalanceShadows || adj.colorBalanceMidtones || adj.colorBalanceHighlights;
  const hasBW = adj.blackAndWhiteSliders;
  const hasFilter = adj.photoFilter;
  const hasMixer = adj.channelMixer;
  const hasLut = lutObject !== null;
  const hasInvert = adj.invert > 0;
  const hasPosterize = adj.posterizeLevels && adj.posterizeLevels > 0;
  const hasThreshold = adj.thresholdValue !== undefined;
  const hasGradientMap = gradLut !== null;
  const hasSelective = adj.selectiveColor;
  const hasReplaceColor = adj.replaceColor;
  const hasShadowsHighlights = adj.shadowsHighlights;
  const hasHdrToning = adj.hdrToning;

  // Pre-calculate 1D Master LUTs (Brightness/Contrast, Levels, Curves, Exposure, Invert)
  // This turns millions of math operations into 256 pre-calculated lookups!
  const has1D = hasBC || hasLevels || hasCurves || hasExposure || hasInvert;
  let lutR: Uint8Array | null = null;
  let lutG: Uint8Array | null = null;
  let lutB: Uint8Array | null = null;

  if (has1D) {
    lutR = new Uint8Array(256);
    lutG = new Uint8Array(256);
    lutB = new Uint8Array(256);

    const applyChanLevels = (val: number, lp?: LevelsParams) => {
      if (!lp) return val;
      const shadows = lp.shadows;
      const highlights = lp.highlights;
      const midtones = lp.midtones;
      const outB = lp.outBlack !== undefined ? lp.outBlack : 0;
      const outW = lp.outWhite !== undefined ? lp.outWhite : 255;
      let norm = val / 255;
      norm = (norm - shadows / 255) / ((highlights - shadows) / 255 || 1);
      norm = Math.max(0, Math.min(1, norm));
      if (midtones !== 1.0 && midtones > 0) {
        norm = Math.pow(norm, 1 / midtones);
      }
      return outB + norm * (outW - outB);
    };

    const br = adj.brightness || 0;
    const ctr = adj.contrast || 0;
    const factor = (259 * (ctr + 255)) / (255 * (259 - ctr));
    const exp = adj.exposure || 0;
    const expGain = Math.pow(2, exp / 25);
    const offset = (adj.exposureOffset || 0) * 2.55;
    const gamma = adj.exposureGamma || 1.0;
    const invPct = (adj.invert || 0) / 100;

    for (let v = 0; v < 256; v++) {
      let r = v, g = v, b = v;

      if (hasBC) {
        r += br; g += br; b += br;
        r = factor * (r - 128) + 128;
        g = factor * (g - 128) + 128;
        b = factor * (b - 128) + 128;
      }
      if (hasLevels) {
        r = applyChanLevels(r, adj.levelsRGB || adj.levelsRed);
        g = applyChanLevels(g, adj.levelsRGB || adj.levelsGreen);
        b = applyChanLevels(b, adj.levelsRGB || adj.levelsBlue);
      }
      if (hasCurves) {
        const cr = Math.min(255, Math.max(0, Math.round(r)));
        const cg = Math.min(255, Math.max(0, Math.round(g)));
        const cb = Math.min(255, Math.max(0, Math.round(b)));
        r = curveRedTable ? curveRedTable[cr] : cr;
        g = curveGreenTable ? curveGreenTable[cg] : cg;
        b = curveBlueTable ? curveBlueTable[cb] : cb;
        if (curveRGBTable) {
          r = curveRGBTable[Math.min(255, Math.max(0, Math.round(r)))];
          g = curveRGBTable[Math.min(255, Math.max(0, Math.round(g)))];
          b = curveRGBTable[Math.min(255, Math.max(0, Math.round(b)))];
        }
      }
      if (hasExposure) {
        r = r * expGain + offset;
        g = g * expGain + offset;
        b = b * expGain + offset;
        if (gamma > 0 && gamma !== 1.0) {
          r = 255 * Math.pow(Math.max(0, r / 255), 1 / gamma);
          g = 255 * Math.pow(Math.max(0, g / 255), 1 / gamma);
          b = 255 * Math.pow(Math.max(0, b / 255), 1 / gamma);
        }
      }
      if (hasInvert) {
        r = r + (255 - r - r) * invPct;
        g = g + (255 - g - g) * invPct;
        b = b + (255 - b - b) * invPct;
      }

      lutR[v] = Math.min(255, Math.max(0, Math.round(r)));
      lutG[v] = Math.min(255, Math.max(0, Math.round(g)));
      lutB[v] = Math.min(255, Math.max(0, Math.round(b)));
    }
  }

  // Main pixel iteration loop
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];
    const a = data[i + 3];

    if (a === 0) continue;

    // Apply pre-calculated 1D master LUT
    if (lutR && lutG && lutB) {
      r = lutR[r];
      g = lutG[g];
      b = lutB[b];
    }

    // 6. Channel Mixer
    if (hasMixer && adj.channelMixer) {
      const mix = adj.channelMixer;
      const sr = r, sg = g, sb = b;
      if (mix.monochrome) {
        const grayVal = (sr * mix.red.r + sg * mix.red.g + sb * mix.red.b) / 100 + mix.red.constant * 2.55;
        r = g = b = grayVal;
      } else {
        r = (sr * mix.red.r + sg * mix.red.g + sb * mix.red.b) / 100 + mix.red.constant * 2.55;
        g = (sr * mix.green.r + sg * mix.green.g + sb * mix.green.b) / 100 + mix.green.constant * 2.55;
        b = (sr * mix.blue.r + sg * mix.blue.g + sb * mix.blue.b) / 100 + mix.blue.constant * 2.55;
      }
    }

    // 7. Hue/Saturation/Lightness & Vibrance
    if (hasVibrance || hasHueSat || hasReplaceColor) {
      let hsl = rgbToHsl(r, g, b);

      // Hue/Saturation master & target colors channel adjustment
      if (hasHueSat && adj.hueSatChannels) {
        // Master Hue Sat
        const master = adj.hueSatChannels['Master'];
        if (master) {
          hsl.h = (hsl.h + master.hue + 360) % 360;
          hsl.s = Math.max(0, Math.min(100, hsl.s + master.saturation));
          hsl.l = Math.max(0, Math.min(100, hsl.l + master.lightness));
        }

        // Determine specific color channel
        let targetKey = '';
        const hVal = hsl.h;
        if (hVal >= 345 || hVal < 15) targetKey = 'Reds';
        else if (hVal >= 15 && hVal < 75) targetKey = 'Yellows';
        else if (hVal >= 75 && hVal < 165) targetKey = 'Greens';
        else if (hVal >= 165 && hVal < 225) targetKey = 'Cyans';
        else if (hVal >= 225 && hVal < 285) targetKey = 'Blues';
        else if (hVal >= 285 && hVal < 345) targetKey = 'Magentas';

        const chanAdj = adj.hueSatChannels[targetKey];
        if (chanAdj) {
          hsl.h = (hsl.h + chanAdj.hue + 360) % 360;
          hsl.s = Math.max(0, Math.min(100, hsl.s + chanAdj.saturation));
          hsl.l = Math.max(0, Math.min(100, hsl.l + chanAdj.lightness));
        }
      }

      // Vibrance
      if (hasVibrance) {
        const vib = adj.vibrance || 0;
        const sat = adj.saturation || 0;
        
        // Apply Saturation slider
        hsl.s = Math.max(0, Math.min(100, hsl.s + sat));

        if (vib !== 0) {
          // Adjust vibrance based on how desaturated the color is
          const amt = (1 - hsl.s / 100) * (vib / 100) * 40;
          hsl.s = Math.max(0, Math.min(100, hsl.s + amt));
        }
      }

      // Replace Color HSL adjustment
      if (hasReplaceColor && adj.replaceColor) {
        const rc = adj.replaceColor;
        const parseHex = (hex: string) => {
          const h = hex.replace('#', '');
          return {
            r: parseInt(h.substring(0, 2), 16),
            g: parseInt(h.substring(2, 4), 16),
            b: parseInt(h.substring(4, 6), 16)
          };
        };
        const tc = parseHex(rc.targetColor);
        const dist = Math.sqrt((r - tc.r) * (r - tc.r) + (g - tc.g) * (g - tc.g) + (b - tc.b) * (b - tc.b));
        if (dist <= rc.fuzziness) {
          // Compute blending factor
          const blendFactor = 1 - dist / (rc.fuzziness || 1);
          hsl.h = (hsl.h + rc.hue * blendFactor + 360) % 360;
          hsl.s = Math.max(0, Math.min(100, hsl.s + rc.saturation * blendFactor));
          hsl.l = Math.max(0, Math.min(100, hsl.l + rc.lightness * blendFactor));
        }
      }

      const rgb = hslToRgb(hsl.h, hsl.s, hsl.l);
      r = rgb.r;
      g = rgb.g;
      b = rgb.b;
    }

    // 8. Color Balance
    if (hasCB) {
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      let cr = 0, mg = 0, yb = 0;

      // Distribute weights between shadows, midtones and highlights
      const shadowsWeight = Math.max(0, 1 - lum / 85);
      const highlightsWeight = Math.max(0, (lum - 170) / 85);
      const midtonesWeight = Math.max(0, 1 - shadowsWeight - highlightsWeight);

      if (adj.colorBalanceShadows && shadowsWeight > 0) {
        cr += adj.colorBalanceShadows.cyanRed * shadowsWeight;
        mg += adj.colorBalanceShadows.magentaGreen * shadowsWeight;
        yb += adj.colorBalanceShadows.yellowBlue * shadowsWeight;
      }
      if (adj.colorBalanceMidtones && midtonesWeight > 0) {
        cr += adj.colorBalanceMidtones.cyanRed * midtonesWeight;
        mg += adj.colorBalanceMidtones.magentaGreen * midtonesWeight;
        yb += adj.colorBalanceMidtones.yellowBlue * midtonesWeight;
      }
      if (adj.colorBalanceHighlights && highlightsWeight > 0) {
        cr += adj.colorBalanceHighlights.cyanRed * highlightsWeight;
        mg += adj.colorBalanceHighlights.magentaGreen * highlightsWeight;
        yb += adj.colorBalanceHighlights.yellowBlue * highlightsWeight;
      }

      // Scaling factor
      const scale = 0.45;
      r += cr * scale;
      g += mg * scale;
      b += yb * scale;

      // Preserve luminosity if checked
      if (adj.colorBalancePreserveLuminosity) {
        const newLum = 0.299 * r + 0.587 * g + 0.114 * b;
        const ratio = lum / (newLum || 1);
        r *= ratio;
        g *= ratio;
        b *= ratio;
      }
    }

    // 9. Black & White customized grayscale mapping
    if (hasBW && adj.blackAndWhiteSliders) {
      const bw = adj.blackAndWhiteSliders;
      // Calculate color components differences
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const chroma = max - min;
      
      let gray = (r + g + b) / 3;
      if (chroma > 0) {
        // Quantize color ratios
        const rRatio = (r - min) / chroma;
        const gRatio = (g - min) / chroma;
        const bRatio = (b - min) / chroma;

        // Weights: Red (0°), Yellow (60°), Green (120°), Cyan (180°), Blue (240°), Magenta (300°)
        let h = rgbToHsl(r, g, b).h;
        let w = 1;
        if (h < 60) {
          const t = h / 60;
          w = (bw.red * (1 - t) + bw.yellow * t) / 100;
        } else if (h < 120) {
          const t = (h - 60) / 60;
          w = (bw.yellow * (1 - t) + bw.green * t) / 100;
        } else if (h < 180) {
          const t = (h - 120) / 60;
          w = (bw.green * (1 - t) + bw.cyan * t) / 100;
        } else if (h < 240) {
          const t = (h - 180) / 60;
          w = (bw.cyan * (1 - t) + bw.blue * t) / 100;
        } else if (h < 300) {
          const t = (h - 240) / 60;
          w = (bw.blue * (1 - t) + bw.magenta * t) / 100;
        } else {
          const t = (h - 300) / 60;
          w = (bw.magenta * (1 - t) + bw.red * t) / 100;
        }
        gray = max * w + min * (1 - w);
      }
      r = g = b = gray;
    }

    // 10. Photo Filter
    if (hasFilter && adj.photoFilter) {
      const pf = adj.photoFilter;
      const density = pf.density / 100;
      let filterR = 255, filterG = 200, filterB = 100; // default warming
      if (pf.filterType === 'cooling') {
        filterR = 100; filterG = 180; filterB = 255;
      } else if (pf.filterType === 'sepia') {
        filterR = 190; filterG = 145; filterB = 95;
      } else if (pf.filterType === 'neutral') {
        filterR = 150; filterG = 150; filterB = 150;
      }

      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      
      // Blend filter color
      const mixR = r * (1 - density) + filterR * density;
      const mixG = g * (1 - density) + filterG * density;
      const mixB = b * (1 - density) + filterB * density;

      if (pf.preserveLuminosity) {
        const newLum = 0.299 * mixR + 0.587 * mixG + 0.114 * mixB;
        const ratio = lum / (newLum || 1);
        r = mixR * ratio;
        g = mixG * ratio;
        b = mixB * ratio;
      } else {
        r = mixR; g = mixG; b = mixB;
      }
    }

    // 11. Color Lookup LUT 3D Mapping
    if (hasLut && lutObject) {
      const lutMapped = apply3dLut(r, g, b, lutObject.size, lutObject.data);
      r = lutMapped.r;
      g = lutMapped.g;
      b = lutMapped.b;
    }

    // 12. Posterize
    if (hasPosterize && adj.posterizeLevels) {
      const levels = adj.posterizeLevels;
      const step = 255 / (levels - 1);
      r = Math.round(r / step) * step;
      g = Math.round(g / step) * step;
      b = Math.round(b / step) * step;
    }

    // 13. Threshold
    if (hasThreshold && adj.thresholdValue !== undefined) {
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const threshVal = lum >= adj.thresholdValue ? 255 : 0;
      r = g = b = threshVal;
    }

    // 14. Gradient Map
    if (hasGradientMap && gradLut) {
      const lum = Math.max(0, Math.min(255, Math.round(0.299 * r + 0.587 * g + 0.114 * b)));
      const gradColor = gradLut[lum];
      const opacity = adj.gradientMap!.opacity / 100;

      r = r * (1 - opacity) + gradColor.r * opacity;
      g = g * (1 - opacity) + gradColor.g * opacity;
      b = b * (1 - opacity) + gradColor.b * opacity;
    }

    // 15. Selective Color
    if (hasSelective && adj.selectiveColor && adj.selectiveColor.colors) {
      const sel = adj.selectiveColor;
      // Get primary colors
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const mid = r + g + b - max - min;
      const chroma = max - min;
      const sum = r + g + b;

      // Group identifiers weighting
      let wReds = 0, wYellows = 0, wGreens = 0, wCyans = 0, wBlues = 0, wMagentas = 0;
      let wWhites = 0, wNeutrals = 0, wBlacks = 0;

      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      // Neutrals, Blacks, Whites
      if (chroma < 15) {
        if (lum > 200) wWhites = 1;
        else if (lum < 55) wBlacks = 1;
        else wNeutrals = 1;
      } else {
        // Color channels hue check
        const h = rgbToHsl(r, g, b).h;
        if (h >= 345 || h < 15) wReds = chroma / 255;
        else if (h >= 15 && h < 75) wYellows = chroma / 255;
        else if (h >= 75 && h < 165) wGreens = chroma / 255;
        else if (h >= 165 && h < 225) wCyans = chroma / 255;
        else if (h >= 225 && h < 285) wBlues = chroma / 255;
        else wMagentas = chroma / 255;
      }

      const adjustSelective = (groupName: string, wGroup: number) => {
        if (wGroup <= 0) return;
        const vals = sel.colors[groupName];
        if (!vals) return;

        // Selective adjustment modifies cyan, magenta, yellow, black mapping
        // We simulate CMYK adjusts back to RGB
        const cAdjust = (vals.c / 100) * wGroup * 0.5;
        const mAdjust = (vals.m / 100) * wGroup * 0.5;
        const yAdjust = (vals.y / 100) * wGroup * 0.5;
        const kAdjust = (vals.k / 100) * wGroup * 0.5;

        // Apply shifts
        r = r * (1 - cAdjust - kAdjust);
        g = g * (1 - mAdjust - kAdjust);
        b = b * (1 - yAdjust - kAdjust);
      };

      adjustSelective('Reds', wReds);
      adjustSelective('Yellows', wYellows);
      adjustSelective('Greens', wGreens);
      adjustSelective('Cyans', wCyans);
      adjustSelective('Blues', wBlues);
      adjustSelective('Magentas', wMagentas);
      adjustSelective('Whites', wWhites);
      adjustSelective('Neutrals', wNeutrals);
      adjustSelective('Blacks', wBlacks);
    }

    // 16. Replace Color is handled directly inside HSL section

    // 17. Shadows/Highlights
    if (hasShadowsHighlights && adj.shadowsHighlights) {
      const sh = adj.shadowsHighlights;
      const shAmt = sh.shadowAmount / 100;
      const hiAmt = sh.highlightAmount / 100;

      // Extract luminance
      const lum = (r + g + b) / 3;
      // Shadow mask: peak around 0, tapering off to 128
      const shadowFactor = Math.max(0, 1 - lum / 128) * shAmt * 60;
      // Highlight mask: peak around 255, tapering off to 128
      const highlightFactor = Math.max(0, (lum - 128) / 128) * hiAmt * -60;

      r += shadowFactor + highlightFactor;
      g += shadowFactor + highlightFactor;
      b += shadowFactor + highlightFactor;

      // Midtone contrast
      if (sh.midtoneContrast !== 0) {
        const mc = sh.midtoneContrast / 100;
        const factor = 1 + mc * 0.5;
        r = factor * (r - 128) + 128;
        g = factor * (g - 128) + 128;
        b = factor * (b - 128) + 128;
      }
    }

    // 18. HDR Toning
    if (hasHdrToning && adj.hdrToning) {
      const hdr = adj.hdrToning;
      // Simple HDR tone mapper simulation: local contrast enhancement + exposure details
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      
      // Detail filter (unsharp mask simulation)
      const detailFactor = (hdr.detail / 100) * 15;
      const targetLum = 128 + (lum - 128) * (1 + detailFactor);
      
      // Strength blend
      const s = hdr.strength / 100;
      r = r * (1 - s) + (r * (targetLum / (lum || 1))) * s;
      g = g * (1 - s) + (g * (targetLum / (lum || 1))) * s;
      b = b * (1 - s) + (b * (targetLum / (lum || 1))) * s;

      // Apply HDR exposure & gamma
      const expGain = Math.pow(2, hdr.exposure / 25);
      r *= expGain; g *= expGain; b *= expGain;

      if (hdr.gamma > 0 && hdr.gamma !== 1.0) {
        r = 255 * Math.pow(Math.max(0, r / 255), 1 / hdr.gamma);
        g = 255 * Math.pow(Math.max(0, g / 255), 1 / hdr.gamma);
        b = 255 * Math.pow(Math.max(0, b / 255), 1 / hdr.gamma);
      }
    }

    data[i] = Math.max(0, Math.min(255, r));
    data[i + 1] = Math.max(0, Math.min(255, g));
    data[i + 2] = Math.max(0, Math.min(255, b));
  }

  return output;
}
