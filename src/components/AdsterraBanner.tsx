/**
 * AdsterraBanner — Correct React integration for Adsterra display ads.
 *
 * Adsterra's invoke.js must run directly on the page DOM (NOT inside a
 * nested iframe). The script reads `atOptions` from the global scope,
 * then creates its own iframe to render the ad creative.
 *
 * Pattern: useRef(div) + useEffect → dynamically append <script> elements.
 */

import React, { useEffect, useRef } from 'react';
import { ADSTERRA_CONFIG } from '../config/adsterra';

interface AdsterraBannerProps {
  format: '300x250' | '728x90' | '160x600' | 'native';
  className?: string;
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
    return (
      !adConfig.enabled ||
      !adConfig.adUnitKey ||
      adConfig.adUnitKey.includes('placeholder') ||
      adConfig.adUnitKey.startsWith('adsterra_')
    );
  };

  useEffect(() => {
    // Don't inject if placeholder or already injected (prevents duplicates on re-render)
    if (isPlaceholder() || !containerRef.current || injectedRef.current) return;

    const container = containerRef.current;

    if (format === 'native') {
      // ── Native Banner ──
      // Adsterra native: container div first, then async script
      const nativeContainer = document.createElement('div');
      nativeContainer.id = ADSTERRA_CONFIG.nativeBanner.containerId;
      container.appendChild(nativeContainer);

      const script = document.createElement('script');
      script.async = true;
      script.setAttribute('data-cfasync', 'false');
      script.src = ADSTERRA_CONFIG.nativeBanner.adScriptUrl;
      container.appendChild(script);
    } else {
      // ── Display Banner (300x250 / 728x90 / 160x600) ──
      // Step 1: inject atOptions config script
      const adConfig = format === '728x90' ? ADSTERRA_CONFIG.topBanner : ADSTERRA_CONFIG.exportModal;

      const confScript = document.createElement('script');
      confScript.type = 'text/javascript';
      confScript.innerHTML = `atOptions = ${JSON.stringify({
        key: adConfig.adUnitKey,
        format: 'iframe',
        height: height,
        width: width,
        params: {},
      })};`;
      container.appendChild(confScript);

      // Step 2: load invoke.js — Adsterra reads atOptions and creates an ad iframe
      const invokeScript = document.createElement('script');
      invokeScript.type = 'text/javascript';
      invokeScript.src = adConfig.adScriptUrl;
      container.appendChild(invokeScript);
    }

    injectedRef.current = true;

    return () => {
      // Cleanup on unmount: remove injected scripts/elements
      injectedRef.current = false;
      while (container.firstChild) {
        container.removeChild(container.firstChild);
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
