/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BlendMode } from '../types';

// Returns whether the blend mode requires custom pixel-level calculation
export function isCustomBlendMode(mode: BlendMode | string): boolean {
  const nativeModes = [
    'normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten',
    'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference',
    'exclusion', 'hue', 'saturation', 'color', 'luminosity'
  ];
  return !nativeModes.includes(mode);
}

// Computes the luminance of an RGB pixel for Lighter/Darker Color modes
function getLuminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

// Individual channel shaders
export function blendPixelChannel(b: number, s: number, mode: string): number {
  switch (mode) {
    case 'linear-dodge': // Add
    case 'add':
      return Math.min(255, b + s);

    case 'linear-burn':
      return Math.max(0, b + s - 255);

    case 'subtract':
      return Math.max(0, b - s);

    case 'divide':
      return s === 0 ? 255 : Math.min(255, Math.round((b / s) * 255));

    case 'vivid-light': {
      if (s < 128) {
        // Color Burn
        const k = s * 2;
        return k === 0 ? 0 : Math.max(0, 255 - ((255 - b) * 255) / k);
      } else {
        // Color Dodge
        const k = (s - 128) * 2;
        return k === 255 ? 255 : Math.min(255, (b * 255) / (255 - k));
      }
    }

    case 'linear-light':
      return Math.max(0, Math.min(255, b + 2 * s - 255));

    case 'pin-light': {
      const k = 2 * s;
      if (s < 128) {
        return b < k ? b : k;
      } else {
        const k2 = 2 * (s - 128);
        return b > k2 ? b : k2;
      }
    }

    case 'hard-mix': {
      const vl = blendPixelChannel(b, s, 'vivid-light');
      return vl < 128 ? 0 : 255;
    }

    default:
      return s;
  }
}

// Core loop that blends full image buffers for a specific custom mode
export function blendBuffers(
  backdrop: ImageData,
  source: ImageData,
  mode: string
): ImageData {
  const b = backdrop.data;
  const s = source.data;
  const len = s.length;
  const w = source.width;

  for (let i = 0; i < len; i += 4) {
    const sa = s[i + 3] / 255;
    if (sa === 0) continue;

    const px = (i / 4) % w;
    const py = Math.floor((i / 4) / w);

    const br = b[i];
    const bg = b[i + 1];
    const bb = b[i + 2];

    const sr = s[i];
    const sg = s[i + 1];
    const sb = s[i + 2];

    if (mode === 'darker-color') {
      const lB = getLuminance(br, bg, bb);
      const lS = getLuminance(sr, sg, sb);
      if (lB < lS) {
        s[i] = br; s[i + 1] = bg; s[i + 2] = bb;
      }
    } else if (mode === 'lighter-color') {
      const lB = getLuminance(br, bg, bb);
      const lS = getLuminance(sr, sg, sb);
      if (lB > lS) {
        s[i] = br; s[i + 1] = bg; s[i + 2] = bb;
      }
    } else if (mode === 'dissolve') {
      const noise = (Math.sin(px * 12.9898 + py * 78.233) * 43758.5453) % 1;
      const rand = Math.abs(noise);
      if (rand > sa) {
        s[i] = br; s[i + 1] = bg; s[i + 2] = bb; s[i + 3] = b[i + 3];
      }
    } else {
      s[i] = blendPixelChannel(br, sr, mode);
      s[i + 1] = blendPixelChannel(bg, sg, mode);
      s[i + 2] = blendPixelChannel(bb, sb, mode);
    }
  }

  return source;
}
