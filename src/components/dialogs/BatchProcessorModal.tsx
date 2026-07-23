/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Layers, X, Upload, Download, Wand2, Check, Crown, FileText, Image as ImageIcon } from 'lucide-react';
import JSZip from 'jszip';

interface BatchProcessorModalProps {
  isOpen: boolean;
  onClose: () => void;
  isPremium: boolean;
  onOpenProModal: () => void;
  setToast: (toast: { message: string; type: 'success' | 'info' | 'error' } | null) => void;
}

export default function BatchProcessorModal({
  isOpen,
  onClose,
  isPremium,
  onOpenProModal,
  setToast,
}: BatchProcessorModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [maxWidth, setMaxWidth] = useState(1920);
  const [format, setFormat] = useState<'png' | 'jpeg' | 'webp'>('png');
  const [watermarkText, setWatermarkText] = useState('Phototor Studio');
  const [enableWatermark, setEnableWatermark] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleProcessBatch = async () => {
    if (!isPremium) {
      onOpenProModal();
      return;
    }

    if (files.length === 0) {
      setToast({ message: 'Please select at least one image file.', type: 'error' });
      return;
    }

    setIsProcessing(true);
    setProgress(5);

    try {
      const zip = new JSZip();
      const folder = zip.folder('phototor_batch_export');

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const img = new Image();
        img.src = URL.createObjectURL(file);
        await new Promise((res) => { img.onload = res; });

        const canvas = document.createElement('canvas');
        const scaleFactor = Math.min(1, maxWidth / img.width);
        canvas.width = Math.round(img.width * scaleFactor);
        canvas.height = Math.round(img.height * scaleFactor);

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // Apply Watermark if enabled
          if (enableWatermark && watermarkText) {
            ctx.save();
            ctx.font = 'bold 20px sans-serif';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
            ctx.shadowColor = 'rgba(0,0,0,0.8)';
            ctx.shadowBlur = 4;
            ctx.textAlign = 'right';
            ctx.fillText(watermarkText, canvas.width - 20, canvas.height - 20);
            ctx.restore();
          }
        }

        const mimeType = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
        const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), mimeType, 0.9));
        
        const ext = format;
        const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        folder?.file(`${nameWithoutExt}_processed.${ext}`, blob);

        setProgress(Math.round(((i + 1) / files.length) * 90));
      }

      setToast({ message: 'Packaging ZIP file...', type: 'info' });
      const content = await zip.generateAsync({ type: 'blob' });

      // Trigger Download
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'phototor_batch_images.zip';
      a.click();
      URL.revokeObjectURL(url);

      setIsProcessing(false);
      setProgress(100);
      setToast({ message: `Successfully processed ${files.length} images!`, type: 'success' });
      onClose();
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
      setToast({ message: 'Batch processing failed.', type: 'error' });
    }
  };

  return (
    <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-lg bg-[#14141d] border border-[#252536] rounded-2xl overflow-hidden shadow-2xl p-6 space-y-5 text-gray-300 text-xs">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#252535] pb-3">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-400" />
            Batch Image Processor (Pro Tool)
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Upload Drop Zone */}
        <div className="border-2 border-dashed border-[#2d2d3f] hover:border-indigo-500 rounded-xl p-6 text-center cursor-pointer transition-colors bg-[#101018]">
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            id="batch-file-input"
          />
          <label htmlFor="batch-file-input" className="cursor-pointer flex flex-col items-center justify-center gap-2">
            <Upload className="w-8 h-8 text-indigo-400" />
            <span className="font-bold text-white text-xs">
              {files.length > 0 ? `${files.length} Image Files Selected` : 'Click to Upload Multiple Photos'}
            </span>
            <span className="text-[10px] text-gray-500">Supports PNG, JPG, WEBP formats</span>
          </label>
        </div>

        {/* Options */}
        <div className="space-y-3 bg-[#181824] p-4 rounded-xl border border-[#252536]">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <span className="text-[10px] text-gray-400 font-bold block">Max Target Width:</span>
              <select
                value={maxWidth}
                onChange={(e) => setMaxWidth(parseInt(e.target.value))}
                className="w-full bg-[#101018] border border-[#2a2a3a] rounded px-2.5 py-1.5 text-white text-xs"
              >
                <option value={3840}>3840px (4K Ultra HD)</option>
                <option value={1920}>1920px (Full HD)</option>
                <option value={1280}>1280px (HD Standard)</option>
                <option value={800}>800px (Web Compressed)</option>
              </select>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-gray-400 font-bold block">Output Format:</span>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as any)}
                className="w-full bg-[#101018] border border-[#2a2a3a] rounded px-2.5 py-1.5 text-white text-xs"
              >
                <option value="png">PNG (Lossless)</option>
                <option value="jpeg">JPEG (Web Standard)</option>
                <option value="webp">WEBP (Modern Compressed)</option>
              </select>
            </div>
          </div>

          <div className="pt-2 border-t border-[#252536] space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={enableWatermark}
                onChange={(e) => setEnableWatermark(e.target.checked)}
                className="accent-indigo-500 w-3.5 h-3.5"
              />
              <span className="font-bold text-white text-xs">Add Text Watermark to all photos</span>
            </label>

            {enableWatermark && (
              <input
                type="text"
                value={watermarkText}
                onChange={(e) => setWatermarkText(e.target.value)}
                placeholder="Watermark text..."
                className="w-full bg-[#101018] border border-[#2a2a3a] rounded px-3 py-1.5 text-white text-xs focus:outline-none focus:border-indigo-500"
              />
            )}
          </div>
        </div>

        {/* Progress bar */}
        {isProcessing && (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-indigo-300 font-mono">
              <span>Processing Batch...</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-[#20202d] h-2 rounded-full overflow-hidden">
              <div className="bg-indigo-500 h-full transition-all duration-200" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-2.5 pt-2 border-t border-[#252535]">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#2a2a30] hover:bg-[#33333c] text-gray-300 font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleProcessBatch}
            disabled={isProcessing || files.length === 0}
            className="px-5 py-2 bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white font-extrabold rounded-lg shadow-lg transition-all cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            Process & Download ZIP
          </button>
        </div>

      </div>
    </div>
  );
}
