/**
 * AdsterraBanner — Same-Origin Iframe Injection for Adsterra Ads.
 *
 * Pattern:
 * 1. Create <iframe> on main DOM (inherits same-origin www.phototorstudio.com).
 * 2. Execute doc.open() -> doc.write() -> doc.close() immediately during mount.
 * 3. This allows document.write() inside invoke.js to run during initial document
 *    parse phase without browser blocking, while preserving valid same-origin
 *    domain headers for Adsterra anti-fraud verification.
 */

import React, { useMemo } from 'react';
import { ADSTERRA_CONFIG } from '../config/adsterra';

interface AdsterraBannerProps {
  format: '300x250' | '728x90' | '160x600' | 'native';
  className?: string;
}

export default function AdsterraBanner({ format, className = '' }: AdsterraBannerProps) {
  const getFormatDimensions = () => {
    switch (format) {
      case '300x250':
        return { width: 300, height: 250 };
      case '728x90':
        return { width: 728, height: 90 };
      case '160x600':
        return { width: 160, height: 600 };
      case 'native':
        return { width: 728, height: 250 };
      default:
        return { width: 300, height: 250 };
    }
  };

  const { width, height } = getFormatDimensions();

  const isPlaceholder = (): boolean => {
    if (!ADSTERRA_CONFIG.enabled) return true;
    if (format === 'native') {
      return !ADSTERRA_CONFIG.nativeBanner.enabled || !ADSTERRA_CONFIG.nativeBanner.containerId;
    }
    const adConfig = format === '728x90' ? ADSTERRA_CONFIG.topBanner : ADSTERRA_CONFIG.exportModal;
    return (
      !adConfig.enabled ||
      !adConfig.adUnitKey ||
      adConfig.adUnitKey.includes('placeholder') ||
      adConfig.adUnitKey.startsWith('adsterra_')
    );
  };

  const iframeSrcDoc = useMemo(() => {
    if (isPlaceholder()) return '';

    if (format === 'native') {
      const containerId = ADSTERRA_CONFIG.nativeBanner.containerId;
      const scriptUrl = ADSTERRA_CONFIG.nativeBanner.adScriptUrl;
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; background: transparent; overflow: hidden; }
  </style>
</head>
<body>
  <div id="${containerId}"></div>
  <script async="async" data-cfasync="false" src="${scriptUrl}"></script>
</body>
</html>`;
    }

    const adConfig = format === '728x90' ? ADSTERRA_CONFIG.topBanner : ADSTERRA_CONFIG.exportModal;
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; background: transparent; overflow: hidden; display: flex; justify-content: center; align-items: center; }
  </style>
</head>
<body>
  <script type="text/javascript">
    atOptions = {
      'key' : '${adConfig.adUnitKey}',
      'format' : 'iframe',
      'height' : ${height},
      'width' : ${width},
      'params' : {}
    };
  </script>
  <script type="text/javascript" src="${adConfig.adScriptUrl}"></script>
</body>
</html>`;
  }, [format]);

  if (isPlaceholder()) {
    return (
      <div className={`flex flex-col items-center justify-center overflow-hidden my-2 ${className}`}>
        <div
          style={{ width: `${width}px`, maxWidth: '100%', minHeight: `${height}px` }}
          className="bg-[#181824] border border-[#2a2a38] rounded-lg flex flex-col items-center justify-center relative overflow-hidden select-none p-4 text-center space-y-1.5"
        >
          <div className="flex items-center gap-1.5 text-[9px] font-mono tracking-wider text-indigo-400 font-bold uppercase px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded">
            <span>Sponsor Ad Placement</span>
          </div>
          <span className="text-[11px] font-sans text-gray-300 font-medium">
            Adsterra Banner Slot ({format})
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center overflow-hidden my-2 ${className}`}>
      <iframe
        srcDoc={iframeSrcDoc}
        width={width}
        height={height}
        style={{
          width: `${width}px`,
          maxWidth: '100%',
          height: `${height}px`,
          border: 'none',
          outline: 'none',
          overflow: 'hidden',
          background: 'transparent',
        }}
        scrolling="no"
        title={`adsterra-${format}`}
      />
    </div>
  );
}
