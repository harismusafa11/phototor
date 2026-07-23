/**
 * AdsterraBanner — React integration for Adsterra display ads.
 *
 * CRITICAL: Adsterra's invoke.js has TWO modes:
 *   1. Synchronous (atOptions) — uses document.write() → BROKEN in React SPA
 *   2. Async (atAsyncOptions) — uses createElement + container → WORKS in React SPA
 *
 * We MUST use the atAsyncOptions pattern with a container ID.
 * The invoke.js script reads window.atAsyncOptions[], finds the matching
 * config by key, and renders the ad into the specified container element
 * using document.createElement (no document.write).
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

    if (format === 'native') {
      // ═══════════════════════════════════════════════
      // NATIVE BANNER — uses container div + async script
      // The native script populates the container by ID
      // ═══════════════════════════════════════════════
      const nativeDiv = document.createElement('div');
      nativeDiv.id = ADSTERRA_CONFIG.nativeBanner.containerId;
      container.appendChild(nativeDiv);

      const script = document.createElement('script');
      script.async = true;
      script.setAttribute('data-cfasync', 'false');
      script.src = ADSTERRA_CONFIG.nativeBanner.adScriptUrl;
      container.appendChild(script);
    } else {
      // ═══════════════════════════════════════════════
      // DISPLAY BANNER — uses atAsyncOptions pattern
      // This tells invoke.js to use createElement (not document.write)
      // and render the ad into the specified container element
      // ═══════════════════════════════════════════════
      const adConfig = format === '728x90' ? ADSTERRA_CONFIG.topBanner : ADSTERRA_CONFIG.exportModal;
      const containerId = `atContainer-${adConfig.adUnitKey}`;

      // Step 1: Create the target container div where the ad iframe will be placed
      const adTargetDiv = document.createElement('div');
      adTargetDiv.id = containerId;
      container.appendChild(adTargetDiv);

      // Step 2: Push config to window.atAsyncOptions array
      // The invoke.js script reads this array and processes each entry
      const confScript = document.createElement('script');
      confScript.type = 'text/javascript';
      confScript.textContent = [
        'if (typeof window.atAsyncOptions !== "object") window.atAsyncOptions = [];',
        'window.atAsyncOptions.push(' + JSON.stringify({
          key: adConfig.adUnitKey,
          format: 'iframe',
          height: height,
          width: width,
          params: {},
          container: containerId,
        }) + ');',
      ].join('\n');
      container.appendChild(confScript);

      // Step 3: Load invoke.js — it will find the atAsyncOptions entry
      // matching its key, and render the ad into containerId
      const invokeScript = document.createElement('script');
      invokeScript.type = 'text/javascript';
      invokeScript.async = true;
      invokeScript.src = adConfig.adScriptUrl;
      container.appendChild(invokeScript);
    }

    return () => {
      injectedRef.current = false;
      // Remove injected DOM elements
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
        }}
      />
    </div>
  );
}
