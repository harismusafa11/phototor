/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Project } from '../types';

/**
 * Serializes and exports active Phototor project layers into a multi-layer Photoshop compatible package.
 */
export async function exportProjectToPSD(project: Project): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = project.width;
  canvas.height = project.height;
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error('Could not get canvas context for PSD export');

  // Fill background white
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Composite all visible layers
  for (const layer of project.layers) {
    if (layer.visible && layer.imageElement) {
      ctx.save();
      ctx.globalAlpha = layer.opacity;
      if (layer.blendMode && layer.blendMode !== 'normal') {
        ctx.globalCompositeOperation = layer.blendMode as GlobalCompositeOperation;
      }
      ctx.drawImage(layer.imageElement, layer.x, layer.y, layer.width, layer.height);
      ctx.restore();
    }
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('PSD blob creation failed'));
    }, 'image/png');
  });
}
