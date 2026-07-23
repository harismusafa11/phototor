import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Wand2, Cpu, Check, Activity, ShieldAlert } from 'lucide-react';

interface AIDialogProps {
  onApplyAI: (action: string) => Promise<void>;
  onCancel: () => void;
}

const AI_TOOLS = [
  { id: 'enhance', name: 'AI Enhance', desc: 'Optimize brightness, contrast, and color vibrancy automatically.' },
  { id: 'upscale', name: 'AI Upscale', desc: 'Upscale the active layer resolution by 2x with edge preservation.' },
  { id: 'denoise', name: 'AI Denoise', desc: 'Remove high-frequency camera noise while preserving detail edges.' },
  { id: 'sharpen', name: 'AI Sharpen', desc: 'Recover blurred edges using advanced deconvolution simulation.' },
  { id: 'relight', name: 'AI Relight', desc: 'Add virtual directional studio lighting overlays to the image.' },
  { id: 'color-correct', name: 'AI Color Correction', desc: 'Instantly balance color casts and correct white balance.' },
  { id: 'restore', name: 'AI Restore', desc: 'Remove scratches, restore details, and boost dynamic range.' },
  { id: 'face-enhance', name: 'AI Face Enhance', desc: 'Detect and enhance facial features and smooth skin tones.' },
  { id: 'remove-artifacts', name: 'AI Remove JPEG Artifacts', desc: 'Smooth compression blockiness and ringing patterns.' },
  { id: 'sky-replace', name: 'AI Sky Replacement', desc: 'Detect and replace sky regions with a stunning golden hour gradient.' },
];

const STEPS = [
  'Analyzing image structure...',
  'Running deep neural networks...',
  'Synthesizing edge contours...',
  'Applying color temperature match...',
  'Finalizing optimization...',
];

export default function AIDialog({ onApplyAI, onCancel }: AIDialogProps) {
  const [selectedTool, setSelectedTool] = useState<string>('enhance');
  const [processing, setProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);

  useEffect(() => {
    if (!processing) return;

    setProgress(0);
    setCurrentStepIdx(0);

    const stepInterval = 350; // duration per step
    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + 5;
        if (next >= 100) {
          clearInterval(timer);
          // Wait briefly, then execute final apply callback
          setTimeout(() => {
            onApplyAI(selectedTool).then(() => {
              setProcessing(false);
            });
          }, 200);
          return 100;
        }
        
        // Update current step index based on progress percentage
        const newIdx = Math.min(STEPS.length - 1, Math.floor((next / 100) * STEPS.length));
        setCurrentStepIdx(newIdx);

        return next;
      });
    }, 80);

    return () => clearInterval(timer);
  }, [processing, selectedTool]);

  const handleApply = () => {
    setProcessing(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs select-none">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-2xl bg-[#141419] border border-[#2c2c36] rounded-xl overflow-hidden shadow-2xl flex flex-col h-[480px]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#24242c] shrink-0">
          <div className="flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-indigo-400 animate-pulse" />
            <h3 className="font-sans font-bold text-sm text-white">Phototor AI Neural Engine</h3>
          </div>
          {!processing && (
            <button onClick={onCancel} className="text-gray-400 hover:text-white cursor-pointer transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Processing State Overlay */}
        <AnimatePresence>
          {processing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#0f0f13]/90 z-50 flex flex-col items-center justify-center p-6 space-y-6"
            >
              {/* Glowing Loader */}
              <div className="relative w-24 h-24 flex items-center justify-center">
                <div className="absolute inset-0 border-4 border-indigo-500/10 rounded-full" />
                <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <Cpu className="w-8 h-8 text-indigo-400 animate-pulse" />
              </div>

              <div className="space-y-2 text-center w-full max-w-xs">
                <div className="flex justify-between text-[11px] font-mono text-gray-500">
                  <span className="text-indigo-400 font-bold uppercase">{STEPS[currentStepIdx]}</span>
                  <span>{progress}%</span>
                </div>
                {/* Progress Bar */}
                <div className="w-full h-1.5 bg-[#252530] rounded-full overflow-hidden">
                  <div
                    style={{ width: `${progress}%` }}
                    className="h-full bg-gradient-to-right from-indigo-500 to-purple-600 transition-all duration-100 ease-out"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono">
                <Activity className="w-3.5 h-3.5 text-indigo-500 animate-bounce" />
                <span>Running neural core accelerators...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sidebar + Details View */}
        <div className="flex flex-1 min-h-0">
          {/* Left tool selection list */}
          <div className="w-60 border-r border-[#24242c] bg-[#0f0f13] overflow-y-auto p-2 space-y-0.5">
            {AI_TOOLS.map((tool) => (
              <button
                key={tool.id}
                onClick={() => setSelectedTool(tool.id)}
                className={`w-full text-left px-3 py-2.5 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                  selectedTool === tool.id
                    ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-700/35 font-semibold shadow-sm'
                    : 'text-gray-400 hover:bg-[#1a1a24] hover:text-gray-250 border border-transparent'
                }`}
              >
                {tool.name}
              </button>
            ))}
          </div>

          {/* Right tool explanation + apply portal */}
          <div className="flex-1 p-6 flex flex-col justify-between bg-[#111116]/40">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-950 flex items-center justify-center">
                  <Wand2 className="w-4 h-4 text-indigo-400" />
                </div>
                <h4 className="font-bold text-white text-xs">
                  {AI_TOOLS.find((t) => t.id === selectedTool)?.name}
                </h4>
              </div>

              <p className="text-gray-400 text-xs leading-relaxed">
                {AI_TOOLS.find((t) => t.id === selectedTool)?.desc}
              </p>

              <div className="bg-[#1c1c24] border border-[#2b2b36] p-3 rounded-lg flex gap-2 text-[10px] text-gray-500 leading-normal">
                <Cpu className="w-4 h-4 text-indigo-400 shrink-0" />
                <div>
                  <span className="block font-bold text-gray-300">GPU Acceleration Active</span>
                  This model runs directly in your browser using local WASM shaders and hardware acceleration.
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[#24242c]">
              <button
                onClick={onCancel}
                className="px-4 py-2 bg-[#1e1e24] hover:bg-[#25252e] rounded-lg text-xs font-semibold text-gray-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-semibold text-white transition-colors cursor-pointer shadow-lg flex items-center gap-1.5"
              >
                <Wand2 className="w-3.5 h-3.5" />
                Run AI Process
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
