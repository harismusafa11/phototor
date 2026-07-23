/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Crown, Check, Wand2, X, Zap, ShieldCheck, Layers, Image as ImageIcon, Download } from 'lucide-react';

interface ProUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActivatePro: () => void;
  isPremium: boolean;
}

export default function ProUpgradeModal({
  isOpen,
  onClose,
  onActivatePro,
  isPremium,
}: ProUpgradeModalProps) {
  if (!isOpen) return null;

  const features = [
    { icon: <Crown className="w-4 h-4 text-amber-400" />, title: 'High-Res 4K / 8K & PSD Export', desc: 'Export full multi-layer PSD (.psd) documents and vector SVGs.' },
    { icon: <Zap className="w-4 h-4 text-rose-400" />, title: 'Unlimited AI Background Removal', desc: 'Uncapped client-side AI subject extraction with AI hair & fur refinement.' },
    { icon: <Layers className="w-4 h-4 text-emerald-400" />, title: 'Batch Processing & Unlimited Layers', desc: 'Resize, convert & watermark 50+ photos at once with unlimited layer stacks.' },
    { icon: <Wand2 className="w-4 h-4 text-purple-400" />, title: 'Full Phototor Pro 8K Asset Library', desc: 'Access exclusive studio photography assets, vector stickers & gradients.' },
  ];

  return (
    <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-[#14141d] border border-amber-500/40 rounded-2xl overflow-hidden shadow-2xl relative select-none flex flex-col">
        
        {/* Top Banner Gradient */}
        <div className="bg-gradient-to-r from-amber-600 via-indigo-600 to-purple-600 p-6 text-white text-center relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/30 hover:bg-black/50 p-1.5 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="inline-flex items-center gap-2 bg-black/30 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-amber-300 border border-amber-400/30 mb-2">
            <Crown className="w-3.5 h-3.5 fill-amber-300" />
            PHOTOTOR PRO UNLIMITED
          </div>

          <h2 className="text-2xl font-black tracking-tight text-white">
            {isPremium ? "You are a Pro Member! 🎉" : "Upgrade to Phototor Pro"}
          </h2>
          <p className="text-xs text-white/80 mt-1 font-medium max-w-sm mx-auto">
            {isPremium
              ? "All pro features, 3D mockups, 8K export & batch tools are unlocked."
              : "Unlock studio 3D mockups, PSD file export, batch tools & unlimited AI power."}
          </p>
        </div>

        {/* Features list */}
        <div className="p-6 space-y-4 max-h-[360px] overflow-y-auto bg-[#0f0f16]">
          {features.map((f, idx) => (
            <div key={idx} className="flex items-start gap-3 bg-[#181824] p-3 rounded-xl border border-[#252536]">
              <div className="p-2 bg-[#101018] rounded-lg border border-[#2a2a3e] shrink-0">
                {f.icon}
              </div>
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  {f.title}
                  <span className="text-[9px] text-amber-400 font-mono bg-amber-400/10 px-1.5 py-0.5 rounded">PRO</span>
                </h4>
                <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="p-5 bg-[#14141d] border-t border-[#252536] flex flex-col gap-2.5">
          {!isPremium ? (
            <button
              onClick={onActivatePro}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-indigo-600 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-white font-extrabold text-sm rounded-xl shadow-lg hover:shadow-indigo-500/25 transition-all cursor-pointer flex items-center justify-center gap-2 tracking-wide"
            >
              <Crown className="w-4 h-4 fill-white" />
              ACTIVATE PRO UNLIMITED (FREE DEMO)
            </button>
          ) : (
            <button
              onClick={onClose}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              PRO IS ACTIVE — ENJOY EDITING
            </button>
          )}

          <div className="flex items-center justify-between text-[10px] text-gray-500 px-1">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" /> 100% Client-Side Private & Safe
            </span>
            <button onClick={onClose} className="hover:text-white cursor-pointer underline">
              {isPremium ? "Close Window" : "Maybe Later"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
