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
    return !adConfig.enabled || !adConfig.adUnitKey || adConfig.adUnitKey.includes('placeholder') || adConfig.adUnitKey.startsWith('adsterra_');
  };

  useEffect(() => {
    if (!ADSTERRA_CONFIG.enabled || !containerRef.current || isPlaceholder()) return;

    const container = containerRef.current;
    container.innerHTML = ''; // Clear container

    if (format === 'native') {
      // Native Banner Injection directly into main DOM so Adsterra anti-cheat validation passes
      const nativeDiv = document.createElement('div');
      nativeDiv.id = ADSTERRA_CONFIG.nativeBanner.containerId;

      const scriptInvoke = document.createElement('script');
      scriptInvoke.async = true;
      scriptInvoke.setAttribute('data-cfasync', 'false');
      scriptInvoke.src = ADSTERRA_CONFIG.nativeBanner.adScriptUrl;

      container.appendChild(nativeDiv);
      container.appendChild(scriptInvoke);
    } else {
      // Banner 728x90 / 300x250 Injection directly into main DOM
      const adConfig = format === '728x90' ? ADSTERRA_CONFIG.topBanner : ADSTERRA_CONFIG.exportModal;

      // Set global atOptions on window object required by Adsterra invoke.js
      (window as any).atOptions = {
        'key': adConfig.adUnitKey,
        'format': 'iframe',
        'height': height,
        'width': width,
        'params': {}
      };

      const scriptInvoke = document.createElement('script');
      scriptInvoke.type = 'text/javascript';
      scriptInvoke.src = adConfig.adScriptUrl;

      container.appendChild(scriptInvoke);
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
