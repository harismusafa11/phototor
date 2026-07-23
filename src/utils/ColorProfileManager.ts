/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ColorProfileManager handles conversions between different color modes and bit depths.
import { Project } from '../types';

export interface PaletteColor {
  r: number;
  g: number;
  b: number;
}

// Convert RGB to XYZ color space
export function rgbToXyz(r: number, g: number, b: number): { x: number; y: number; z: number } {
  let rL = r / 255;
  let gL = g / 255;
  let bL = b / 255;

  rL = rL > 0.04045 ? Math.pow((rL + 0.055) / 1.055, 2.4) : rL / 12.92;
  gL = gL > 0.04045 ? Math.pow((gL + 0.055) / 1.055, 2.4) : gL / 12.92;
  bL = bL > 0.04045 ? Math.pow((bL + 0.055) / 1.055, 2.4) : bL / 12.92;

  rL *= 100;
  gL *= 100;
  bL *= 100;

  // Observer. = 2°, Illuminant = D65
  const x = rL * 0.4124 + gL * 0.3576 + bL * 0.1805;
  const y = rL * 0.2126 + gL * 0.7152 + bL * 0.0722;
  const z = rL * 0.0193 + gL * 0.1192 + bL * 0.9505;

  return { x, y, z };
}

// Convert XYZ to RGB
export function xyzToRgb(x: number, y: number, z: number): { r: number; g: number; b: number } {
  const xL = x / 100;
  const yL = y / 100;
  const zL = z / 100;

  let r = xL * 3.2406 + yL * -1.5372 + zL * -0.4986;
  let g = xL * -0.9689 + yL * 1.8758 + zL * 0.0415;
  let b = xL * 0.0557 + yL * -0.2040 + zL * 1.0570;

  r = r > 0.0031308 ? 1.055 * Math.pow(r, 1 / 2.4) - 0.055 : 12.92 * r;
  g = g > 0.0031308 ? 1.055 * Math.pow(g, 1 / 2.4) - 0.055 : 12.92 * g;
  b = b > 0.0031308 ? 1.055 * Math.pow(b, 1 / 2.4) - 0.055 : 12.92 * b;

  return {
    r: Math.max(0, Math.min(255, Math.round(r * 255))),
    g: Math.max(0, Math.min(255, Math.round(g * 255))),
    b: Math.max(0, Math.min(255, Math.round(b * 255))),
  };
}

// Convert XYZ to Lab
export function xyzToLab(x: number, y: number, z: number): { l: number; a: number; b: number } {
  // Reference White D65
  const refX = 95.047;
  const refY = 100.000;
  const refZ = 108.883;

  let xN = x / refX;
  let yN = y / refY;
  let zN = z / refZ;

  xN = xN > 0.008856 ? Math.pow(xN, 1 / 3) : 7.787 * xN + 16 / 116;
  yN = yN > 0.008856 ? Math.pow(yN, 1 / 3) : 7.787 * yN + 16 / 116;
  zN = zN > 0.008856 ? Math.pow(zN, 1 / 3) : 7.787 * zN + 16 / 116;

  const l = 116 * yN - 16;
  const a = 500 * (xN - yN);
  const b = 200 * (yN - zN);

  return { l, a, b };
}

// Convert Lab to XYZ
export function labToXyz(l: number, a: number, b: number): { x: number; y: number; z: number } {
  const yN = (l + 16) / 116;
  const xN = a / 500 + yN;
  const zN = yN - b / 200;

  const y3 = Math.pow(yN, 3);
  const x3 = Math.pow(xN, 3);
  const z3 = Math.pow(zN, 3);

  const y = y3 > 0.008856 ? y3 : (yN - 16 / 116) / 7.787;
  const x = x3 > 0.008856 ? x3 : (xN - 16 / 116) / 7.787;
  const z = z3 > 0.008856 ? z3 : (zN - 16 / 116) / 7.787;

  // D65 reference white
  return {
    x: x * 95.047,
    y: y * 100.000,
    z: z * 108.883,
  };
}

// Convert RGB to Lab Color Space
export function rgbToLab(r: number, g: number, b: number): { l: number; a: number; b: number } {
  const xyz = rgbToXyz(r, g, b);
  return xyzToLab(xyz.x, xyz.y, xyz.z);
}

// Convert Lab to RGB Color Space
export function labToRgb(l: number, a: number, b: number): { r: number; g: number; b: number } {
  const xyz = labToXyz(l, a, b);
  return xyzToRgb(xyz.x, xyz.y, xyz.z);
}

// Convert RGB to CMYK
export function rgbToCmyk(r: number, g: number, b: number): { c: number; m: number; y: number; k: number } {
  const rN = r / 255;
  const gN = g / 255;
  const bN = b / 255;

  const k = 1 - Math.max(rN, gN, bN);
  if (k === 1) {
    return { c: 0, m: 0, y: 0, k: 1 };
  }

  const c = (1 - rN - k) / (1 - k);
  const m = (1 - gN - k) / (1 - k);
  const y = (1 - bN - k) / (1 - k);

  return { c, m, y, k };
}

// Convert CMYK to RGB
export function cmykToRgb(c: number, m: number, y: number, k: number): { r: number; g: number; b: number } {
  const r = 255 * (1 - c) * (1 - k);
  const g = 255 * (1 - m) * (1 - k);
  const b = 255 * (1 - y) * (1 - k);

  return {
    r: Math.max(0, Math.min(255, Math.round(r))),
    g: Math.max(0, Math.min(255, Math.round(g))),
    b: Math.max(0, Math.min(255, Math.round(b))),
  };
}

// Popularity Color Quantizer for Indexed Mode
export function generateIndexedPalette(data: Uint8ClampedArray, maxColors: number = 256): PaletteColor[] {
  const samples = 12000;
  const step = Math.max(1, Math.floor(data.length / 4 / samples));
  const colorCounts: { [key: string]: number } = {};

  for (let i = 0; i < data.length; i += step * 4) {
    if (data[i + 3] < 128) continue; // Skip transparent
    // Reduce resolution to 5 bits per channel to group similar colors
    const r = Math.round(data[i] / 8) * 8;
    const g = Math.round(data[i + 1] / 8) * 8;
    const b = Math.round(data[i + 2] / 8) * 8;
    const key = `${r},${g},${b}`;
    colorCounts[key] = (colorCounts[key] || 0) + 1;
  }

  const sorted = Object.keys(colorCounts).sort((a, b) => colorCounts[b] - colorCounts[a]);
  const palette: PaletteColor[] = sorted.slice(0, maxColors).map((key) => {
    const parts = key.split(',').map(Number);
    return { r: parts[0], g: parts[1], b: parts[2] };
  });

  // Ensure default gray palette if image is empty or highly transparent
  if (palette.length === 0) {
    for (let i = 0; i < 256; i += 16) {
      palette.push({ r: i, g: i, b: i });
    }
  }

  return palette;
}

// Convert image mode
export function convertImageMode(
  imgData: ImageData,
  toMode: 'rgb' | 'cmyk' | 'grayscale' | 'bitmap' | 'lab' | 'indexed'
): { imgData: ImageData; warning?: string } {
  const { width, height } = imgData;
  const output = new ImageData(new Uint8ClampedArray(imgData.data), width, height);
  const data = output.data;

  let warning: string | undefined;

  switch (toMode) {
    case 'grayscale':
      warning = "Converting to Grayscale will discard all color information. This cannot be undone.";
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        // Standard NTSC Grayscale coefficients
        const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
      }
      break;

    case 'bitmap':
      warning = "Converting to Bitmap (strictly Black & White) will reduce all pixels to 1-bit color information.";
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        const bw = gray >= 128 ? 255 : 0;
        data[i] = bw;
        data[i + 1] = bw;
        data[i + 2] = bw;
      }
      break;

    case 'cmyk':
      warning = "Converting to CMYK color profile maps colors to printing gamut. Colors may look slightly muted.";
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const { c, m, y, k } = rgbToCmyk(r, g, b);
        // Simulate CMYK to RGB visual mapping in the browser
        const rgb = cmykToRgb(c, m, y, k);
        data[i] = rgb.r;
        data[i + 1] = rgb.g;
        data[i + 2] = rgb.b;
      }
      break;

    case 'lab':
      // Conversion from RGB to Lab and back to simulate Lab color space
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const lab = rgbToLab(r, g, b);
        // Map back to RGB
        const rgb = labToRgb(lab.l, lab.a, lab.b);
        data[i] = rgb.r;
        data[i + 1] = rgb.g;
        data[i + 2] = rgb.b;
      }
      break;

    case 'indexed':
      warning = "Converting to Indexed Color limits the image to 256 colors. Subtle gradients will be quantized.";
      const palette = generateIndexedPalette(data, 256);
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 10) {
          data[i + 3] = 0;
          continue;
        }
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Find nearest palette color
        let minDistance = Infinity;
        let nearest = palette[0];

        // Perform nearest color search
        for (let j = 0; j < palette.length; j++) {
          const pr = palette[j].r;
          const pg = palette[j].g;
          const pb = palette[j].b;
          const dist = (r - pr) * (r - pr) + (g - pg) * (g - pg) + (b - pb) * (b - pb);
          if (dist < minDistance) {
            minDistance = dist;
            nearest = palette[j];
          }
        }

        data[i] = nearest.r;
        data[i + 1] = nearest.g;
        data[i + 2] = nearest.b;
      }
      break;

    case 'rgb':
      // Converting to RGB from others usually has no warnings
      break;
  }

  return { imgData: output, warning };
}

// Convert bit depth and return warning if depth reduces
export function convertBitDepth(
  fromDepth: number,
  toDepth: 8 | 16 | 32
): { warning?: string } {
  if (fromDepth > toDepth) {
    return {
      warning: `Converting from ${fromDepth}-bit/channel to ${toDepth}-bit/channel will discard color precision and high dynamic range details.`
    };
  }
  return {};
}
