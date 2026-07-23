/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ImageResizeEngine implements image resampling algorithms (Nearest, Bilinear, Bicubic, Lanczos, and AI Edge-Preserving).

export function resampleImageData(
  imgData: ImageData,
  newW: number,
  newH: number,
  algorithm: 'nearest' | 'bilinear' | 'bicubic' | 'lanczos' | 'ai-upscale'
): ImageData {
  const { width: srcW, height: srcH, data: srcData } = imgData;
  const output = new ImageData(newW, newH);
  const outData = output.data;

  const getPixel = (x: number, y: number) => {
    const px = Math.max(0, Math.min(srcW - 1, x));
    const py = Math.max(0, Math.min(srcH - 1, y));
    const idx = (py * srcW + px) * 4;
    return {
      r: srcData[idx],
      g: srcData[idx + 1],
      b: srcData[idx + 2],
      a: srcData[idx + 3],
    };
  };

  switch (algorithm) {
    case 'nearest': {
      for (let y = 0; y < newH; y++) {
        for (let x = 0; x < newW; x++) {
          const srcX = Math.floor(x * (srcW / newW));
          const srcY = Math.floor(y * (srcH / newH));
          const p = getPixel(srcX, srcY);
          const outIdx = (y * newW + x) * 4;
          outData[outIdx] = p.r;
          outData[outIdx + 1] = p.g;
          outData[outIdx + 2] = p.b;
          outData[outIdx + 3] = p.a;
        }
      }
      break;
    }

    case 'bilinear': {
      for (let y = 0; y < newH; y++) {
        for (let x = 0; x < newW; x++) {
          const srcX = x * (srcW - 1) / (newW - 1 || 1);
          const srcY = y * (srcH - 1) / (newH - 1 || 1);

          const x0 = Math.floor(srcX);
          const x1 = Math.min(srcW - 1, x0 + 1);
          const y0 = Math.floor(srcY);
          const y1 = Math.min(srcH - 1, y0 + 1);

          const dx = srcX - x0;
          const dy = srcY - y0;

          const p00 = getPixel(x0, y0);
          const p10 = getPixel(x1, y0);
          const p01 = getPixel(x0, y1);
          const p11 = getPixel(x1, y1);

          const lerp = (c00: number, c10: number, c01: number, c11: number) => {
            return c00 * (1 - dx) * (1 - dy) + c10 * dx * (1 - dy) + c01 * (1 - dx) * dy + c11 * dx * dy;
          };

          const outIdx = (y * newW + x) * 4;
          outData[outIdx] = lerp(p00.r, p10.r, p01.r, p11.r);
          outData[outIdx + 1] = lerp(p00.g, p10.g, p01.g, p11.g);
          outData[outIdx + 2] = lerp(p00.b, p10.b, p01.b, p11.b);
          outData[outIdx + 3] = lerp(p00.a, p10.a, p01.a, p11.a);
        }
      }
      break;
    }

    case 'bicubic': {
      const cubicInterpolate = (p: number[], t: number) => {
        return p[1] + 0.5 * t * (p[2] - p[0] + t * (2.0 * p[0] - 5.0 * p[1] + 4.0 * p[2] - p[3] + t * (3.0 * (p[1] - p[2]) + p[3] - p[0])));
      };

      for (let y = 0; y < newH; y++) {
        for (let x = 0; x < newW; x++) {
          const srcX = x * (srcW - 1) / (newW - 1 || 1);
          const srcY = y * (srcH - 1) / (newH - 1 || 1);

          const x0 = Math.floor(srcX);
          const y0 = Math.floor(srcY);

          const dx = srcX - x0;
          const dy = srcY - y0;

          // Interpolate channels
          const channels = ['r', 'g', 'b', 'a'] as const;
          const val = { r: 0, g: 0, b: 0, a: 0 };

          for (const ch of channels) {
            const arrY = [];
            for (let j = -1; j <= 2; j++) {
              const arrX = [];
              for (let i = -1; i <= 2; i++) {
                arrX.push(getPixel(x0 + i, y0 + j)[ch]);
              }
              arrY.push(cubicInterpolate(arrX, dx));
            }
            val[ch] = Math.max(0, Math.min(255, cubicInterpolate(arrY, dy)));
          }

          const outIdx = (y * newW + x) * 4;
          outData[outIdx] = val.r;
          outData[outIdx + 1] = val.g;
          outData[outIdx + 2] = val.b;
          outData[outIdx + 3] = val.a;
        }
      }
      break;
    }

    case 'lanczos': {
      // Lanczos-3 window
      const a = 3;
      const sinc = (t: number) => {
        if (t === 0) return 1;
        const piT = Math.PI * t;
        return Math.sin(piT) / piT;
      };
      const lanczos = (t: number) => {
        if (Math.abs(t) >= a) return 0;
        return sinc(t) * sinc(t / a);
      };

      for (let y = 0; y < newH; y++) {
        for (let x = 0; x < newW; x++) {
          const srcX = x * (srcW - 1) / (newW - 1 || 1);
          const srcY = y * (srcH - 1) / (newH - 1 || 1);

          const x0 = Math.floor(srcX);
          const y0 = Math.floor(srcY);

          let sumR = 0, sumG = 0, sumB = 0, sumA = 0;
          let weightSum = 0;

          for (let j = -a + 1; j <= a; j++) {
            const wy = lanczos(srcY - y0 - j);
            if (wy === 0) continue;
            for (let i = -a + 1; i <= a; i++) {
              const wx = lanczos(srcX - x0 - i);
              const w = wx * wy;
              if (w === 0) continue;

              const p = getPixel(x0 + i, y0 + j);
              sumR += p.r * w;
              sumG += p.g * w;
              sumB += p.b * w;
              sumA += p.a * w;
              weightSum += w;
            }
          }

          const outIdx = (y * newW + x) * 4;
          if (weightSum > 0) {
            outData[outIdx] = Math.max(0, Math.min(255, sumR / weightSum));
            outData[outIdx + 1] = Math.max(0, Math.min(255, sumG / weightSum));
            outData[outIdx + 2] = Math.max(0, Math.min(255, sumB / weightSum));
            outData[outIdx + 3] = Math.max(0, Math.min(255, sumA / weightSum));
          } else {
            const p = getPixel(x0, y0);
            outData[outIdx] = p.r;
            outData[outIdx + 1] = p.g;
            outData[outIdx + 2] = p.b;
            outData[outIdx + 3] = p.a;
          }
        }
      }
      break;
    }

    case 'ai-upscale': {
      // AI Edge-Preserving Directional Interpolation Simulation
      for (let y = 0; y < newH; y++) {
        for (let x = 0; x < newW; x++) {
          const srcX = x * (srcW - 1) / (newW - 1 || 1);
          const srcY = y * (srcH - 1) / (newH - 1 || 1);

          const x0 = Math.floor(srcX);
          const y0 = Math.floor(srcY);
          const dx = srcX - x0;
          const dy = srcY - y0;

          const p00 = getPixel(x0, y0);
          const p10 = getPixel(x0 + 1, y0);
          const p01 = getPixel(x0, y0 + 1);
          const p11 = getPixel(x0 + 1, y0 + 1);

          // Calculate horizontal and vertical gradient intensities
          const gradH = Math.abs(p10.r - p00.r) + Math.abs(p11.r - p01.r);
          const gradV = Math.abs(p01.r - p00.r) + Math.abs(p11.r - p10.r);

          const outIdx = (y * newW + x) * 4;

          const interpolateEdge = (c00: number, c10: number, c01: number, c11: number) => {
            // If vertical gradient is much higher (horizontal edge)
            if (gradV > gradH + 20) {
              // Interpolate horizontally first, keep vertical transition sharp
              const tY = dy > 0.5 ? 1 : 0;
              return c00 * (1 - dx) * (1 - tY) + c10 * dx * (1 - tY) + c01 * (1 - dx) * tY + c11 * dx * tY;
            }
            // If horizontal gradient is much higher (vertical edge)
            if (gradH > gradV + 20) {
              const tX = dx > 0.5 ? 1 : 0;
              return c00 * (1 - tX) * (1 - dy) + c10 * tX * (1 - dy) + c01 * (1 - tX) * dy + c11 * tX * dy;
            }
            // Standard Bilinear as fallback
            return c00 * (1 - dx) * (1 - dy) + c10 * dx * (1 - dy) + c01 * (1 - dx) * dy + c11 * dx * dy;
          };

          outData[outIdx] = Math.round(interpolateEdge(p00.r, p10.r, p01.r, p11.r));
          outData[outIdx + 1] = Math.round(interpolateEdge(p00.g, p10.g, p01.g, p11.g));
          outData[outIdx + 2] = Math.round(interpolateEdge(p00.b, p10.b, p01.b, p11.b));
          outData[outIdx + 3] = Math.round(interpolateEdge(p00.a, p10.a, p01.a, p11.a));
        }
      }
      break;
    }
  }

  return output;
}
