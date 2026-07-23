export interface CanvasPreset {
  id: string;
  name: string;
  width: number;
  height: number;
  category: 'social' | 'print' | 'screen' | 'photo';
  desc: string;
  badge: string;
}

export type PresetCategory = 'all' | 'social' | 'print' | 'screen' | 'photo';

export const CANVAS_PRESET_CATEGORIES: { id: PresetCategory; label: string; iconName?: string }[] = [
  { id: 'all', label: 'Semua Preset' },
  { id: 'social', label: 'Social Media' },
  { id: 'print', label: 'Cetak & Kertas' },
  { id: 'screen', label: 'Layar & Web' },
  { id: 'photo', label: 'Foto & Seni' },
];

export const CANVAS_PRESETS: CanvasPreset[] = [
  // --- SOCIAL MEDIA ---
  {
    id: 'ig-square',
    name: 'Instagram Square Post',
    width: 1080,
    height: 1080,
    category: 'social',
    desc: 'Feed Post 1:1 Square (HD)',
    badge: '1:1',
  },
  {
    id: 'ig-portrait',
    name: 'Instagram Portrait Post',
    width: 1080,
    height: 1350,
    category: 'social',
    desc: 'Feed Post 4:5 Optimal Vertical',
    badge: '4:5',
  },
  {
    id: 'ig-story',
    name: 'Instagram Story / Reel',
    width: 1080,
    height: 1920,
    category: 'social',
    desc: 'Full Vertical 9:16 Video / Story',
    badge: '9:16',
  },
  {
    id: 'tiktok-video',
    name: 'TikTok Video / Reel',
    width: 1080,
    height: 1920,
    category: 'social',
    desc: 'Vertical 9:16 Short Content',
    badge: '9:16',
  },
  {
    id: 'yt-thumb',
    name: 'YouTube Thumbnail',
    width: 1280,
    height: 720,
    category: 'social',
    desc: 'Standard 16:9 HD Video Cover',
    badge: '16:9 HD',
  },
  {
    id: 'yt-banner',
    name: 'YouTube Channel Header',
    width: 2560,
    height: 1440,
    category: 'social',
    desc: 'Channel Banner Header (4K)',
    badge: '2560p',
  },
  {
    id: 'fb-cover',
    name: 'Facebook Page Cover',
    width: 1640,
    height: 624,
    category: 'social',
    desc: 'Header Banner Fanpage & Profile',
    badge: 'Banner',
  },
  {
    id: 'tw-header',
    name: 'X / Twitter Banner',
    width: 1500,
    height: 500,
    category: 'social',
    desc: 'Profile Header 3:1 Banner',
    badge: '3:1',
  },
  {
    id: 'li-banner',
    name: 'LinkedIn Banner',
    width: 1584,
    height: 396,
    category: 'social',
    desc: 'Header Background Profil / Perusahaan',
    badge: '4:1',
  },
  {
    id: 'pin-post',
    name: 'Pinterest Pin',
    width: 1000,
    height: 1500,
    category: 'social',
    desc: 'Rasio Vertikal 2:3 Pin',
    badge: '2:3',
  },

  // --- CETAK & KERTAS (PRINT) ---
  {
    id: 'a4-portrait',
    name: 'A4 Portrait',
    width: 2480,
    height: 3508,
    category: 'print',
    desc: 'Dokumen Standar A4 (300 DPI)',
    badge: 'A4',
  },
  {
    id: 'a4-landscape',
    name: 'A4 Landscape',
    width: 3508,
    height: 2480,
    category: 'print',
    desc: 'Lembar Horisontal A4 (300 DPI)',
    badge: 'A4',
  },
  {
    id: 'a3-portrait',
    name: 'A3 Poster Sheet',
    width: 3508,
    height: 4960,
    category: 'print',
    desc: 'Poster Cetak A3 (300 DPI)',
    badge: 'A3',
  },
  {
    id: 'a5-portrait',
    name: 'A5 Flyer / Brosur',
    width: 1748,
    height: 2480,
    category: 'print',
    desc: 'Brosur & Pamflet A5 (300 DPI)',
    badge: 'A5',
  },
  {
    id: 'us-letter',
    name: 'US Letter Paper',
    width: 2550,
    height: 3300,
    category: 'print',
    desc: '8.5 × 11 in Surat (300 DPI)',
    badge: 'Letter',
  },
  {
    id: 'us-legal',
    name: 'US Legal Paper',
    width: 2550,
    height: 4200,
    category: 'print',
    desc: '8.5 × 14 in Legal (300 DPI)',
    badge: 'Legal',
  },
  {
    id: 'biz-card',
    name: 'Kartu Nama (Business Card)',
    width: 1050,
    height: 600,
    category: 'print',
    desc: '3.5 × 2 in Standar (300 DPI)',
    badge: 'Kartu',
  },
  {
    id: 'print-poster-m',
    name: 'Poster Sedang (40×60 cm)',
    width: 4724,
    height: 7087,
    category: 'print',
    desc: 'Poster Cetak Dinding (300 DPI)',
    badge: 'Poster',
  },

  // --- LAYAR & WEB (SCREEN) ---
  {
    id: 'web-fhd',
    name: 'Full HD (1080p)',
    width: 1920,
    height: 1080,
    category: 'screen',
    desc: 'Standar Video & Web Desktop (16:9)',
    badge: '1080p',
  },
  {
    id: 'web-4k',
    name: '4K Ultra HD',
    width: 3840,
    height: 2160,
    category: 'screen',
    desc: 'Resolusi Tinggi Ultra HD (16:9)',
    badge: '4K UHD',
  },
  {
    id: 'web-2k',
    name: '2K Quad HD (1440p)',
    width: 2560,
    height: 1440,
    category: 'screen',
    desc: 'Monitor High-End / Gaming (16:9)',
    badge: '1440p',
  },
  {
    id: 'web-desktop',
    name: 'Macbook / Laptop Wide',
    width: 1440,
    height: 900,
    category: 'screen',
    desc: 'Desain Layout Website Laptop (16:10)',
    badge: 'Laptop',
  },
  {
    id: 'mobile-screen',
    name: 'Layar HP Smartphone',
    width: 1170,
    height: 2532,
    category: 'screen',
    desc: 'Mockup UI Mobile App',
    badge: 'Mobile',
  },
  {
    id: 'tablet-screen',
    name: 'Tablet / iPad Screen',
    width: 2048,
    height: 2732,
    category: 'screen',
    desc: 'Mockup & Ilustrasi Tablet (4:3)',
    badge: 'Tablet',
  },
  {
    id: 'app-icon',
    name: 'App Icon / Logo',
    width: 512,
    height: 512,
    category: 'screen',
    desc: 'Icon Persegi High-Res',
    badge: 'Icon',
  },
  {
    id: 'ultrawide',
    name: '21:9 Ultrawide',
    width: 2560,
    height: 1080,
    category: 'screen',
    desc: 'Layar Monitor Ultrawide Cinematic',
    badge: '21:9',
  },

  // --- FOTO & SENI (PHOTO) ---
  {
    id: 'photo-4x6',
    name: 'Cetak Foto 4 × 6 Inch',
    width: 1200,
    height: 1800,
    category: 'photo',
    desc: 'Foto R-Standar 4R (300 DPI)',
    badge: '4x6"',
  },
  {
    id: 'photo-5x7',
    name: 'Cetak Foto 5 × 7 Inch',
    width: 1500,
    height: 2100,
    category: 'photo',
    desc: 'Foto Bingkai 5R (300 DPI)',
    badge: '5x7"',
  },
  {
    id: 'photo-8x10',
    name: 'Cetak Foto 8 × 10 Inch',
    width: 2400,
    height: 3000,
    category: 'photo',
    desc: 'Portofolio & Galeri 8R (300 DPI)',
    badge: '8x10"',
  },
  {
    id: 'digital-painting-4k',
    name: 'Kanvas Lukis Digital 4K',
    width: 4096,
    height: 4096,
    category: 'photo',
    desc: 'Kanvas Persegi Resolusi Tinggi untuk Gambar',
    badge: '4K Art',
  },
  {
    id: 'art-wall-portrait',
    name: 'Kanvas Galeri Art 3:4',
    width: 3000,
    height: 4000,
    category: 'photo',
    desc: 'Poster Seni Dinding Estetik',
    badge: '3:4 Art',
  },
];

export function getFilteredPresets(category: PresetCategory, searchQuery: string = ''): CanvasPreset[] {
  let list = CANVAS_PRESETS;
  if (category !== 'all') {
    list = list.filter((p) => p.category === category);
  }
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.desc.toLowerCase().includes(q) ||
        p.badge.toLowerCase().includes(q) ||
        `${p.width}x${p.height}`.includes(q) ||
        `${p.width} x ${p.height}`.includes(q)
    );
  }
  return list;
}
