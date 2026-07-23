/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Compass, Image as ImageIcon, Paintbrush, Square, Search, Layers, ShieldAlert } from 'lucide-react';
import { AssetData } from '../../types';

interface AssetLibraryPanelProps {
  onAddStockImage: (url: string, name: string) => void;
  onAddVectorShape: (path: string, name: string) => void;
  onAddGradientLayer: (style: string, name: string) => void;
}

export default function AssetLibraryPanel({
  onAddStockImage,
  onAddVectorShape,
  onAddGradientLayer,
}: AssetLibraryPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState<'sticker' | 'gradient' | 'stock'>('stock');

  const stockImages = [
    { name: 'Phototor Pro: Cyberpunk Model', url: '/assets/stock/pro_cyberpunk_portrait.png', tag: 'Phototor Pro' },
    { name: 'Phototor Pro: Luxury Perfume', url: '/assets/stock/pro_studio_product.png', tag: 'Phototor Pro' },
    { name: 'Phototor Pro: Alpine Sunrise', url: '/assets/stock/pro_nature_landscape.png', tag: 'Phototor Pro' },
    { name: 'Phototor Pro: Iridescent 3D Glass', url: '/assets/stock/pro_abstract_art.png', tag: 'Phototor Pro' },
    { name: 'Architectural Minimal Facade', url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&auto=format&fit=crop&q=80', tag: 'Architecture' },
    { name: 'Neon Tokyo Rain Street', url: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=800&auto=format&fit=crop&q=80', tag: 'Urban' },
    { name: 'Golden Sand Dunes', url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=800&auto=format&fit=crop&q=80', tag: 'Nature' },
    { name: 'Minimalist Studio Portrait', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80', tag: 'Portrait' },
    { name: 'Abstract Fluid Hologram', url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800&auto=format&fit=crop&q=80', tag: 'Abstract' },
    { name: 'Cinematic Mountain Fog', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=80', tag: 'Landscape' },
  ];

  const vectorGradients = [
    { name: 'Cosmic Sunset', style: 'linear-gradient(135deg, #f53f3f, #f5a623)' },
    { name: 'Northern Lights', style: 'linear-gradient(135deg, #0575e6, #00f260)' },
    { name: 'Deep Ocean Blue', style: 'linear-gradient(135deg, #00c6ff, #0072ff)' },
    { name: 'Royal Cyberpunk', style: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)' },
    { name: 'Clean Titanium', style: 'linear-gradient(135deg, #1f1f2e, #3a3a52, #1f1f2e)' },
    { name: 'Emerald Luxe', style: 'linear-gradient(135deg, #059669, #10b981, #34d399)' },
    { name: 'Golden Velvet', style: 'linear-gradient(135deg, #b45309, #f59e0b, #fbbf24)' },
    { name: 'Midnight Violet', style: 'linear-gradient(135deg, #4c1d95, #6d28d9, #8b5cf6)' },
  ];

  // SVG shapes (Precision UI vectors)
  const vectorShapes = [
    { name: 'Speech Bubble', path: 'M 10 10 L 90 10 L 90 70 L 40 70 L 10 90 L 10 70 Z' },
    { name: 'Hexagon Shield', path: 'M 50 10 L 90 30 L 90 70 L 50 90 L 10 70 L 10 30 Z' },
    { name: 'Arrow Right', path: 'M 10 40 L 60 40 L 60 20 L 90 50 L 60 80 L 60 60 L 10 60 Z' },
    { name: 'Sleek Checkmark', path: 'M 20 50 L 40 70 L 80 30' },
    { name: 'Heart Emblem', path: 'M 50 80 C 10 50 10 20 50 20 C 90 20 90 50 50 80 Z' },
    { name: 'Diamond Gem', path: 'M 50 10 L 90 40 L 50 90 L 10 40 Z' },
    { name: 'Badge Ribbon', path: 'M 20 10 L 80 10 L 80 90 L 50 70 L 20 90 Z' },
    { name: 'Camera Frame', path: 'M 10 20 L 35 20 L 45 10 L 55 10 L 65 20 L 90 20 L 90 85 L 10 85 Z M 50 35 A 18 18 0 1 0 50 71 A 18 18 0 1 0 50 35' },
  ];

  const filteredStock = stockImages.filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredGradients = vectorGradients.filter((g) => g.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredShapes = vectorShapes.filter((v) => v.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex flex-col bg-[#111115] border-l border-[#24242c] w-64 shrink-0 h-full text-xs select-none">
      
      {/* Header */}
      <div className="p-3 border-b border-[#24242c] bg-[#141419] flex items-center justify-between">
        <span className="font-bold text-white flex items-center gap-1.5">
          <Compass className="w-4 h-4 text-indigo-400" />
          Asset Library
        </span>
      </div>

      {/* Categories selectors */}
      <div className="flex bg-[#181822] border-b border-[#24242c] p-1 gap-1">
        {(['stock', 'gradient', 'sticker'] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`flex-1 py-1.5 text-center text-[10px] font-bold rounded capitalize transition-all ${
              category === cat
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {cat}s
          </button>
        ))}
      </div>

      {/* Search Input */}
      <div className="p-3 border-b border-[#24242c] relative">
        <Search className="absolute left-5.5 top-5 w-3.5 h-3.5 text-gray-500" />
        <input
          type="text"
          placeholder={`Search ${category}s...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[#1c1c24] border border-[#2a2a35] rounded pl-8 pr-2.5 py-1.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-[11px]"
        />
      </div>

      {/* Main Grid display list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
        
        {category === 'stock' && (
          <div className="grid grid-cols-2 gap-2">
            {filteredStock.map((img, idx) => (
              <div
                key={idx}
                onClick={() => onAddStockImage(img.url, img.name)}
                className="group relative rounded-lg overflow-hidden aspect-video bg-black/40 border border-[#23232c] hover:border-indigo-500/50 cursor-pointer transition-colors"
              >
                <img
                  src={img.url}
                  alt={img.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  referrerPolicy="no-referrer"
                />
                {img.tag === 'Phototor Pro' ? (
                  <span className="absolute top-1 left-1 text-[7px] font-bold bg-indigo-600/90 text-white px-1 py-0.5 rounded shadow z-10 backdrop-blur-xs">
                    ★ Phototor Pro
                  </span>
                ) : (
                  <span className="absolute top-1 left-1 text-[7px] font-bold bg-black/60 text-gray-300 px-1 py-0.5 rounded z-10 backdrop-blur-xs">
                    HD Stock
                  </span>
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity p-1 text-center">
                  <span className="text-[9px] font-bold text-white line-clamp-2">{img.name}</span>
                  <span className="text-[8px] text-indigo-300 font-semibold mt-1 bg-indigo-950/80 border border-indigo-500/40 px-1.5 py-0.5 rounded">
                    + Add to Canvas
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {category === 'gradient' && (
          <div className="grid grid-cols-2 gap-2">
            {filteredGradients.map((g, idx) => (
              <div
                key={idx}
                onClick={() => onAddGradientLayer(g.style, g.name)}
                className="group relative rounded-lg aspect-square border border-[#23232c] hover:border-indigo-500/50 cursor-pointer overflow-hidden p-2 flex flex-col justify-between shadow-md"
                style={{ background: g.style }}
              >
                <span className="text-[9px] font-bold text-white bg-black/40 px-1 py-0.5 rounded backdrop-blur-xs truncate max-w-full">
                  {g.name}
                </span>
                <span className="text-[8px] font-semibold text-white/80 opacity-0 group-hover:opacity-100 transition-opacity">
                  + Add Layer
                </span>
              </div>
            ))}
          </div>
        )}

        {category === 'sticker' && (
          <div className="grid grid-cols-2 gap-2">
            {filteredShapes.map((shape, idx) => (
              <div
                key={idx}
                onClick={() => onAddVectorShape(shape.path, shape.name)}
                className="group flex flex-col items-center justify-center p-2.5 bg-[#181822] border border-[#282836] hover:border-indigo-500 hover:bg-[#1e1e2d] rounded-lg cursor-pointer transition-all h-28 relative shadow-sm"
              >
                <div className="w-14 h-14 bg-[#12121a] rounded border border-[#2a2a3a] flex items-center justify-center p-1.5 shadow-inner">
                  <svg
                    viewBox="0 0 100 100"
                    className="w-full h-full text-indigo-400 group-hover:text-indigo-300 group-hover:scale-110 transition-all"
                  >
                    <path
                      d={shape.path}
                      fill="rgba(129, 140, 248, 0.2)"
                      stroke="#818cf8"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <span className="text-[9.5px] text-gray-300 font-semibold mt-2 text-center truncate w-full group-hover:text-white">
                  {shape.name}
                </span>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
