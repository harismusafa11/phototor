const loadedFonts = new Set<string>();

export const GOOGLE_FONTS = [
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Poppins',
  'Raleway',
  'Source Code Pro',
  'Playfair Display',
  'Merriweather',
  'Nunito',
  'Outfit',
  'DM Sans',
  'Fira Sans',
  'Josefin Sans',
  'Quicksand',
  'Libre Baskerville',
  'Caveat',
  'Dancing Script',
  'Pacifico',
  'Lobster',
  'Permanent Marker',
  'Space Grotesk',
  'JetBrains Mono',
  'Bebas Neue',
  'Abril Fatface',
  'Satisfy',
  'Great Vibes',
  'Cinzel',
  'Lora',
  'Comfortaa',
  'Press Start 2P',
  'Bangers',
  'Fira Code',
  'Inconsolata',
  'Space Mono',
  'Ubuntu',
  'Kanit',
  'Rubik',
];

export const SYSTEM_FONTS = [
  'Arial',
  'Helvetica',
  'Times New Roman',
  'Courier New',
  'Georgia',
  'Verdana',
  'Impact',
  'Trebuchet MS',
  'Comic Sans MS',
];

export const ALL_FONTS = [...GOOGLE_FONTS, ...SYSTEM_FONTS].sort();

export function loadGoogleFont(fontFamily: string): Promise<boolean> {
  if (!fontFamily || SYSTEM_FONTS.includes(fontFamily) || loadedFonts.has(fontFamily)) {
    return Promise.resolve(true);
  }

  loadedFonts.add(fontFamily);

  return new Promise((resolve) => {
    const formattedName = fontFamily.replace(/\s+/g, '+');
    const linkId = `google-font-${formattedName.toLowerCase()}`;
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${formattedName}:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,700&display=swap`;
      document.head.appendChild(link);
    }

    if ('fonts' in document) {
      document.fonts.load(`16px "${fontFamily}"`).then(() => {
        resolve(true);
      }).catch(() => {
        resolve(false);
      });
    } else {
      setTimeout(() => resolve(true), 300);
    }
  });
}

export function preloadAllGoogleFonts() {
  GOOGLE_FONTS.forEach((f) => loadGoogleFont(f));
}
