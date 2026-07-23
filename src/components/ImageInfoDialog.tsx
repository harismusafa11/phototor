import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Info, FileImage } from 'lucide-react';
import { Project } from '../types';

interface ImageInfoDialogProps {
  project: Project;
  onCancel: () => void;
}

export default function ImageInfoDialog({ project, onCancel }: ImageInfoDialogProps) {
  const [fileSizeStr, setFileSizeStr] = useState<string>('Calculating...');

  useEffect(() => {
    // Estimate project size based on blobs
    let totalBytes = JSON.stringify(project).length;
    
    // Add size of layer image blobs
    const sizes = project.layers.map(l => l.imageBlob?.size || 0);
    const blobsBytes = sizes.reduce((a, b) => a + b, 0);
    totalBytes += blobsBytes;

    // Convert to readable format
    if (totalBytes < 1024) setFileSizeStr(`${totalBytes} Bytes`);
    else if (totalBytes < 1024 * 1024) setFileSizeStr(`${(totalBytes / 1024).toFixed(1)} KB`);
    else setFileSizeStr(`${(totalBytes / (1024 * 1024)).toFixed(2)} MB`);
  }, [project]);

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs select-none">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-sm bg-[#141419] border border-[#2c2c36] rounded-xl overflow-hidden p-5 shadow-2xl space-y-5"
      >
        <div className="flex items-center justify-between border-b border-[#24242c] pb-3 shrink-0">
          <div className="flex items-center gap-1.5">
            <Info className="w-4 h-4 text-indigo-400" />
            <h3 className="font-sans font-bold text-sm text-white">Image Information</h3>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-white cursor-pointer transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3.5 text-xs text-gray-300">
          <div className="flex items-center gap-3 bg-[#0f0f13] p-3 rounded-lg border border-[#202028] mb-4">
            <FileImage className="w-8 h-8 text-indigo-500 shrink-0" />
            <div className="min-w-0">
              <span className="block font-bold text-white truncate text-xs">{project.name}</span>
              <span className="block text-[10px] text-gray-500 font-mono">Phototor Document</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-y-2.5 border-t border-[#1c1c24] pt-3 text-[11px]">
            <div className="text-gray-500">Dimensions:</div>
            <div className="text-white font-mono text-right">{project.width} × {project.height} px</div>

            <div className="text-gray-500">Resolution (DPI):</div>
            <div className="text-white font-mono text-right">{project.grid?.size || 72} DPI</div>

            <div className="text-gray-500">Bit Depth:</div>
            <div className="text-white font-mono text-right">{project.bitDepth || 8} Bits/Channel</div>

            <div className="text-gray-500">Color Mode:</div>
            <div className="text-white font-mono text-right uppercase">{project.colorMode || 'RGB Color'}</div>

            <div className="text-gray-500">Color Profile:</div>
            <div className="text-white font-mono text-right text-[10px] truncate">{project.colorProfile || 'sRGB IEC61966-2.1'}</div>

            <div className="text-gray-500">Layer Count:</div>
            <div className="text-white font-mono text-right">{project.layers.length} Layers</div>

            <div className="text-gray-500">Estimated Size:</div>
            <div className="text-white font-mono text-right">{fileSizeStr}</div>

            <div className="text-gray-500">Created At:</div>
            <div className="text-white font-mono text-right text-[10px]">{formatDate(project.createdAt)}</div>

            <div className="text-gray-500">Modified At:</div>
            <div className="text-white font-mono text-right text-[10px]">{formatDate(project.updatedAt)}</div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-[#24242c]">
          <button
            onClick={onCancel}
            className="px-5 py-2 bg-indigo-650 hover:bg-indigo-500 rounded-lg text-xs font-semibold text-white transition-colors cursor-pointer shadow-lg"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}
