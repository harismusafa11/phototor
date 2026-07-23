/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { ADSTERRA_CONFIG } from '../config/adsterra';

interface AdsterraBannerProps {
  format: '300x250' | '728x90' | '160x600' | 'native';
  className?: string;
}

export default function AdsterraBanner({ format, className = '' }: AdsterraBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const getFormatDimensions = () => {
    switch (format) {
      case '300x250':
        return { width: 300, height: 250 };
      case '728x90':
        return { width: 728, height: 90 };
      case '160x600':
        return { width: 160, height: 600 };
      case 'native':
        return { width: 728, height: 160 };
      default:
        return { width: 300, height: 250 };
    }
  };

  const { width, height } = getFormatDimensions();

  const isPlaceholder = () => {
    if (!ADSTERRA_CONFIG.enabled) return true;
    if (format === 'native') {
      return !ADSTERRA_CONFIG.nativeBanner.enabled || !ADSTERRA_CONFIG.nativeBanner.containerId;
    }
    const adConfig = format === '728x90' ? ADSTERRA_CONFIG.topBanner : ADSTERRA_CONFIG.exportModal;
    return !adConfig.enabled || adConfig.adUnitKey.includes('placeholder') || adConfig.adUnitKey.startsWith('adsterra_');
  };

  useEffect(() => {
    if (!ADSTERRA_CONFIG.enabled || !containerRef.current || isPlaceholder()) return;

    const container = containerRef.current;
    container.innerHTML = ''; // Clear previous container content

    // Create an isolated iframe to allow document.write() used by Adsterra invoke.js to run without browser blocking
    const iframe = document.createElement('iframe');
    iframe.width = '100%';
    iframe.height = `${height}px`;
    iframe.style.border = 'none';
    iframe.style.outline = 'none';
    iframe.style.overflow = 'hidden';
    iframe.style.background = 'transparent';
    iframe.setAttribute('scrolling', 'no');

    container.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      if (format === 'native') {
        iframeDoc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { margin: 0; padding: 0; background: transparent; overflow: hidden; display: flex; justify-content: center; align-items: center; }
              </style>
            </head>
            <body>
              <script async="async" data-cfasync="false" src="${ADSTERRA_CONFIG.nativeBanner.adScriptUrl}"></script>
              <div id="${ADSTERRA_CONFIG.nativeBanner.containerId}"></div>
            </body>
          </html>
        `);
      } else {
        const adConfig = format === '728x90' ? ADSTERRA_CONFIG.topBanner : ADSTERRA_CONFIG.exportModal;
        iframeDoc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { margin: 0; padding: 0; background: transparent; overflow: hidden; display: flex; justify-content: center; align-items: center; }
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
          </html>
        `);
      }
      iframeDoc.close();
    }

    return () => {
      if (container) container.innerHTML = '';
    };
  }, [format, width, height]);

  return (
    <div className={`flex flex-col items-center justify-center overflow-hidden my-2 ${className}`}>
      <div
        ref={containerRef}
        style={{ width: `${width}px`, maxWidth: '100%', minHeight: `${height}px` }}
        className="bg-transparent rounded-lg flex flex-col items-center justify-center relative overflow-hidden select-none"
      >
        {isPlaceholder() && (
          <div className="flex flex-col items-center justify-center p-4 text-center space-y-1.5 w-full h-full bg-gradient-to-br from-[#181824] to-[#12121a]">
            <div className="flex items-center gap-1.5 text-[9px] font-mono tracking-wider text-indigo-400 font-bold uppercase px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded">
              <span>Sponsor Ad Placement</span>
            </div>
            <span className="text-[11px] font-sans text-gray-300 font-medium">
              Adsterra Banner Slot ({format})
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
