import React, { useState, useEffect } from 'react';
import { AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline } from 'lucide-react';
import { GOOGLE_FONTS, SYSTEM_FONTS, loadGoogleFont } from '../../utils/fontLoader';

const ALL_FONTS = [...GOOGLE_FONTS, ...SYSTEM_FONTS].sort();
const FONT_SIZES = [6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 42, 48, 60, 72, 84, 96, 120];

interface CharacterPanelProps {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: string;
  textColor?: string;
  letterSpacing?: number;
  lineHeightMultiplier?: number;
  textAlign?: 'left' | 'center' | 'right';
  onFontChange?: (updates: Partial<{
    fontFamily: string;
    fontSize: number;
    fontWeight: string;
    fontStyle: string;
    textColor: string;
    letterSpacing: number;
    lineHeightMultiplier: number;
    textAlign: 'left' | 'center' | 'right';
  }>) => void;
}

export default function CharacterPanel({
  fontFamily = 'Inter',
  fontSize = 24,
  fontWeight = 'normal',
  fontStyle = 'normal',
  textColor = '#ffffff',
  letterSpacing = 0,
  lineHeightMultiplier = 1.2,
  textAlign = 'left',
  onFontChange,
}: CharacterPanelProps) {
  const [fontSearch, setFontSearch] = useState('');
  const [showFontList, setShowFontList] = useState(false);

  useEffect(() => {
    if (fontFamily) {
      loadGoogleFont(fontFamily);
    }
  }, [fontFamily]);

  const filteredFonts = ALL_FONTS.filter((f) =>
    f.toLowerCase().includes(fontSearch.toLowerCase())
  );

  useEffect(() => {
    if (showFontList) {
      filteredFonts.slice(0, 30).forEach((f) => loadGoogleFont(f));
    }
  }, [showFontList, fontSearch]);

  const emit = (updates: Parameters<NonNullable<typeof onFontChange>>[0]) => onFontChange?.(updates);

  return (
    <div className="flex flex-col gap-2.5 p-2.5 text-gray-300 text-[10px]">
      {/* Font family */}
      <div className="relative">
        <span className="text-[9px] text-gray-500 block mb-1">Font Family</span>
        <button
          onClick={() => setShowFontList((v) => !v)}
          className="w-full flex items-center justify-between px-2 py-1.5 bg-[#1a1a26] border border-[#2d2d40] rounded hover:border-indigo-500 transition-colors text-left cursor-pointer"
          style={{ fontFamily: `"${fontFamily}", sans-serif` }}
        >
          <span className="truncate">{fontFamily}</span>
          <span className="text-gray-600 text-[8px] ml-1">▼</span>
        </button>
        {showFontList && (
          <div className="absolute left-0 right-0 top-full z-50 bg-[#121218] border border-[#2d2d40] rounded shadow-2xl">
            <input
              autoFocus
              type="text"
              placeholder="Search fonts..."
              value={fontSearch}
              onChange={(e) => setFontSearch(e.target.value)}
              className="w-full px-2 py-1.5 bg-[#1a1a26] border-b border-[#2d2d40] text-[10px] focus:outline-none"
            />
            <div className="max-h-48 overflow-y-auto">
              {filteredFonts.map((f) => (
                <button
                  key={f}
                  onClick={() => {
                    loadGoogleFont(f);
                    emit({ fontFamily: f });
                    setShowFontList(false);
                  }}
                  onMouseEnter={() => loadGoogleFont(f)}
                  className={`w-full text-left px-2 py-1 hover:bg-[#1e1e2c] text-[10px] cursor-pointer transition-colors ${f === fontFamily ? 'text-indigo-400 font-bold bg-[#1e1e2c]' : ''}`}
                  style={{ fontFamily: `"${f}", sans-serif` }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Size + weight row */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className="text-[9px] text-gray-500 block mb-1">Size</span>
          <div className="flex gap-1">
            <input
              type="number" value={fontSize} min={1} max={999}
              onChange={(e) => emit({ fontSize: parseInt(e.target.value) || 12 })}
              className="flex-1 bg-[#1a1a26] border border-[#2d2d40] rounded px-1.5 py-1 text-indigo-400 font-mono text-[10px] focus:outline-none focus:border-indigo-500"
            />
            <select
              value={fontSize}
              onChange={(e) => emit({ fontSize: parseInt(e.target.value) })}
              className="bg-[#1a1a26] border border-[#2d2d40] rounded text-[9px] text-gray-400 focus:outline-none px-0.5"
            >
              {FONT_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div>
          <span className="text-[9px] text-gray-500 block mb-1">Weight</span>
          <select
            value={fontWeight}
            onChange={(e) => emit({ fontWeight: e.target.value })}
            className="w-full bg-[#1a1a26] border border-[#2d2d40] rounded px-1.5 py-1 text-gray-300 text-[10px] focus:outline-none"
          >
            {['100','200','300','400','500','600','700','800','900'].map((w) => (
              <option key={w} value={w === '400' ? 'normal' : w === '700' ? 'bold' : w}>
                {w === '400' ? 'Regular' : w === '700' ? 'Bold' : w}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Style buttons */}
      <div className="flex items-center gap-1.5">
        <span className="text-[9px] text-gray-500 mr-1">Style</span>
        {[
          { Icon: Bold, key: 'bold', active: fontWeight === 'bold', onClick: () => emit({ fontWeight: fontWeight === 'bold' ? 'normal' : 'bold' }) },
          { Icon: Italic, key: 'italic', active: fontStyle === 'italic', onClick: () => emit({ fontStyle: fontStyle === 'italic' ? 'normal' : 'italic' }) },
          { Icon: Underline, key: 'underline', active: false, onClick: () => {} },
        ].map(({ Icon, key, active, onClick }) => (
          <button
            key={key}
            onClick={onClick}
            className={`p-1.5 rounded transition-colors ${active ? 'bg-indigo-600 text-white' : 'bg-[#1a1a26] border border-[#2d2d40] text-gray-400 hover:text-white'}`}
          >
            <Icon className="w-3 h-3" />
          </button>
        ))}

        <div className="ml-auto flex items-center gap-1">
          <span className="text-[9px] text-gray-500">Color</span>
          <label>
            <div className="w-6 h-6 rounded border border-[#2d2d40] cursor-pointer" style={{ backgroundColor: textColor }} />
            <input type="color" value={textColor} onChange={(e) => emit({ textColor: e.target.value })} className="sr-only" />
          </label>
        </div>
      </div>

      {/* Alignment */}
      <div className="flex items-center gap-1.5">
        <span className="text-[9px] text-gray-500 mr-1">Align</span>
        {([
          { Icon: AlignLeft, val: 'left' as const },
          { Icon: AlignCenter, val: 'center' as const },
          { Icon: AlignRight, val: 'right' as const },
        ]).map(({ Icon, val }) => (
          <button
            key={val}
            onClick={() => emit({ textAlign: val })}
            className={`p-1.5 rounded transition-colors ${textAlign === val ? 'bg-indigo-600 text-white' : 'bg-[#1a1a26] border border-[#2d2d40] text-gray-400 hover:text-white'}`}
          >
            <Icon className="w-3 h-3" />
          </button>
        ))}
      </div>

      {/* Spacing */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className="text-gray-500 w-20 shrink-0">Letter Spacing</span>
          <input type="range" min={-20} max={100} value={letterSpacing}
            onChange={(e) => emit({ letterSpacing: parseInt(e.target.value) })}
            className="flex-1 accent-indigo-500 h-1" />
          <span className="text-indigo-400 font-mono w-8 text-right">{letterSpacing}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500 w-20 shrink-0">Line Height</span>
          <input type="range" min={0.8} max={3} step={0.05} value={lineHeightMultiplier}
            onChange={(e) => emit({ lineHeightMultiplier: parseFloat(e.target.value) })}
            className="flex-1 accent-indigo-500 h-1" />
          <span className="text-indigo-400 font-mono w-8 text-right">{lineHeightMultiplier.toFixed(2)}</span>
        </div>
      </div>

      {/* Preview */}
      <div
        className="bg-[#1a1a26] border border-[#2d2d40] rounded p-2 text-center break-words overflow-hidden"
        style={{
          fontFamily, fontSize: Math.min(24, fontSize), fontWeight, fontStyle,
          color: textColor, letterSpacing: `${letterSpacing * 0.05}em`,
          lineHeight: lineHeightMultiplier, textAlign,
        }}
      >
        Aa — Sample Text
      </div>
    </div>
  );
}
