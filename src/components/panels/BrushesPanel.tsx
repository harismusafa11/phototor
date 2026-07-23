import React, { useState } from 'react';
import { Search, Star, StarOff } from 'lucide-react';

const BRUSH_CATEGORIES = [
  { id: 'basic', name: 'Basic', icon: '⬤' },
  { id: 'soft', name: 'Soft', icon: '🌫' },
  { id: 'hard', name: 'Hard', icon: '◉' },
  { id: 'pencil', name: 'Pencil', icon: '✏️' },
  { id: 'ink', name: 'Ink', icon: '🖋' },
  { id: 'watercolor', name: 'Watercolor', icon: '💧' },
  { id: 'oil', name: 'Oil', icon: '🎨' },
  { id: 'texture', name: 'Texture', icon: '🔳' },
  { id: 'special', name: 'Special', icon: '✨' },
];

interface Brush {
  id: string;
  name: string;
  category: string;
  size: number;
  hardness: number;
  favorite?: boolean;
  preview: string; // CSS border-radius
}

const DEFAULT_BRUSHES: Brush[] = [
  { id: 'b1', name: 'Soft Round', category: 'soft', size: 20, hardness: 0, preview: '50%' },
  { id: 'b2', name: 'Hard Round', category: 'hard', size: 15, hardness: 100, preview: '50%' },
  { id: 'b3', name: 'Flat', category: 'basic', size: 20, hardness: 80, preview: '0%' },
  { id: 'b4', name: 'Pencil', category: 'pencil', size: 3, hardness: 90, preview: '20%' },
  { id: 'b5', name: 'Calligraphy', category: 'ink', size: 10, hardness: 85, preview: '0%' },
  { id: 'b6', name: 'Watercolor Wet', category: 'watercolor', size: 35, hardness: 0, preview: '30%' },
  { id: 'b7', name: 'Oil Thick', category: 'oil', size: 25, hardness: 60, preview: '15%' },
  { id: 'b8', name: 'Grain', category: 'texture', size: 30, hardness: 40, preview: '5%' },
  { id: 'b9', name: 'Scatter Star', category: 'special', size: 18, hardness: 50, preview: '50%' },
  { id: 'b10', name: 'Fan', category: 'oil', size: 28, hardness: 70, preview: '0%' },
  { id: 'b11', name: 'Spatter', category: 'texture', size: 22, hardness: 0, preview: '50%' },
  { id: 'b12', name: 'Marker', category: 'ink', size: 12, hardness: 95, preview: '10%' },
  { id: 'b13', name: 'Spray', category: 'special', size: 50, hardness: 0, preview: '50%' },
  { id: 'b14', name: 'Chalk', category: 'texture', size: 20, hardness: 30, preview: '20%' },
  { id: 'b15', name: 'Basic Round', category: 'basic', size: 10, hardness: 75, preview: '50%' },
];

interface BrushesPanelProps {
  brushSize: number;
  brushHardness?: number;
  onBrushChange?: (brush: { size: number; hardness: number; name: string }) => void;
}

export default function BrushesPanel({ brushSize, brushHardness = 80, onBrushChange }: BrushesPanelProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [brushes, setBrushes] = useState(DEFAULT_BRUSHES);
  const [selectedBrush, setSelectedBrush] = useState<string>('b1');

  const toggleFavorite = (id: string) => {
    setBrushes((prev) => prev.map((b) => b.id === id ? { ...b, favorite: !b.favorite } : b));
  };

  const filtered = brushes.filter((b) => {
    const matchCat = activeCategory === 'all' || activeCategory === 'favorites'
      ? (activeCategory === 'favorites' ? b.favorite : true)
      : b.category === activeCategory;
    const matchSearch = !search || b.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="flex flex-col gap-2 p-2.5 text-gray-300 text-[10px]">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500" />
        <input
          type="text"
          placeholder="Search brushes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-6 pr-2 py-1 bg-[#1a1a26] border border-[#2d2d40] rounded text-[10px] focus:outline-none focus:border-indigo-500 text-gray-300 placeholder-gray-600"
        />
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-1">
        {[{ id: 'all', name: 'All', icon: '▤' }, { id: 'favorites', name: 'Fav', icon: '★' }, ...BRUSH_CATEGORIES].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-1.5 py-0.5 rounded text-[8px] font-bold transition-colors ${activeCategory === cat.id ? 'bg-indigo-600 text-white' : 'bg-[#1a1a26] border border-[#2d2d40] text-gray-500 hover:text-white'}`}
          >
            {cat.icon} {cat.name}
          </button>
        ))}
      </div>

      {/* Brush grid */}
      <div className="grid grid-cols-4 gap-1.5 max-h-64 overflow-y-auto pr-0.5 scrollbar-thin">
        {filtered.map((brush) => (
          <div
            key={brush.id}
            onClick={() => {
              setSelectedBrush(brush.id);
              onBrushChange?.({ size: brush.size, hardness: brush.hardness, name: brush.name });
            }}
            className={`relative flex flex-col items-center gap-1 p-1.5 rounded border cursor-pointer transition-all ${selectedBrush === brush.id ? 'border-indigo-500 bg-indigo-950/30' : 'border-[#2d2d40] hover:border-gray-500 hover:bg-[#1e1e2c]'}`}
          >
            {/* Brush preview */}
            <div
              className="bg-white"
              style={{
                width: Math.min(32, brush.size * 1.2),
                height: Math.min(32, brush.size * 1.2),
                borderRadius: brush.preview,
                opacity: brush.hardness < 50 ? 0.6 + brush.hardness / 100 : 1,
                boxShadow: brush.hardness < 50 ? `0 0 ${(100 - brush.hardness) / 5}px rgba(255,255,255,0.4)` : 'none',
              }}
            />
            <span className="text-[7px] text-gray-500 text-center leading-tight line-clamp-1 w-full">{brush.name}</span>
            {/* Favorite toggle */}
            <button
              onClick={(e) => { e.stopPropagation(); toggleFavorite(brush.id); }}
              className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
            >
              {brush.favorite
                ? <Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
                : <StarOff className="w-2.5 h-2.5 text-gray-600 hover:text-yellow-400" />
              }
            </button>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center text-gray-600 py-4">No brushes found</div>
      )}

      {/* Quick size & hardness */}
      <div className="flex flex-col gap-1.5 border-t border-[#2d2d40] pt-2">
        <div className="flex items-center gap-2">
          <span className="text-gray-500 w-14 shrink-0">Size</span>
          <input type="range" min={1} max={200} value={brushSize}
            onChange={(e) => onBrushChange?.({ size: parseInt(e.target.value), hardness: brushHardness, name: '' })}
            className="flex-1 accent-indigo-500 h-1" />
          <span className="text-indigo-400 font-mono w-8 text-right">{brushSize}px</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500 w-14 shrink-0">Hardness</span>
          <input type="range" min={0} max={100} value={brushHardness}
            onChange={(e) => onBrushChange?.({ size: brushSize, hardness: parseInt(e.target.value), name: '' })}
            className="flex-1 accent-indigo-500 h-1" />
          <span className="text-indigo-400 font-mono w-8 text-right">{brushHardness}%</span>
        </div>
      </div>
    </div>
  );
}
