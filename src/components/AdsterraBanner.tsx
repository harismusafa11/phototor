/**
 * AdsterraBanner — Main DOM integration for Adsterra Ads.
 *
 * Adsterra's invoke.js validates window.location.host to prevent anti-fraud blocks.
 * Running invoke.js on the main window DOM ensures the publisher domain
 * (e.g. www.phototorstudio.com) is passed correctly to Adsterra servers.
 *
 * Both window.atOptions and window.atAsyncOptions are populated before script execution.
 */

import React, { useEffect, useRef } from 'react';
import { ADSTERRA_CONFIG } from '../config/adsterra';

interface AdsterraBannerProps {
  format: '300x250' | '728x90' | '160x600' | 'native';
  className?: string;
}

declare global {
  interface Window {
    atOptions?: any;
    atAsyncOptions?: any[];
  }
}

export default function AdsterraBanner({ format, className = '' }: AdsterraBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const injectedRef = useRef(false);

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

  useEffect(() => {
    if (isPlaceholder() || !containerRef.current || injectedRef.current) return;
    injectedRef.current = true;

    const container = containerRef.current;
    container.innerHTML = '';

    if (format === 'native') {
      const nativeDiv = document.createElement('div');
      nativeDiv.id = ADSTERRA_CONFIG.nativeBanner.containerId;
      container.appendChild(nativeDiv);

      const script = document.createElement('script');
      script.async = true;
      script.setAttribute('data-cfasync', 'false');
      script.src = ADSTERRA_CONFIG.nativeBanner.adScriptUrl;
      container.appendChild(script);
    } else {
      const adConfig = format === '728x90' ? ADSTERRA_CONFIG.topBanner : ADSTERRA_CONFIG.exportModal;

      // 1. Set global atOptions
      window.atOptions = {
        key: adConfig.adUnitKey,
        format: 'iframe',
        height: height,
        width: width,
        params: {},
      };

      // 2. Set global atAsyncOptions array as fallback
      if (!Array.isArray(window.atAsyncOptions)) {
        window.atAsyncOptions = [];
      }
      window.atAsyncOptions.push({
        key: adConfig.adUnitKey,
        format: 'iframe',
        height: height,
        width: width,
        params: {},
      });

      // 3. Append invoke.js to container
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = adConfig.adScriptUrl;
      container.appendChild(script);
    }

    return () => {
      injectedRef.current = false;
      if (container) {
        container.innerHTML = '';
      }
    };
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
      <div
        ref={containerRef}
        style={{
          width: `${width}px`,
          maxWidth: '100%',
          minHeight: `${height}px`,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      />
    </div>
  );
}
