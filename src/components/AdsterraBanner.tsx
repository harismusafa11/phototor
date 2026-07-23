/**
 * AdsterraBanner — React integration for Adsterra display ads.
 *
 * WHY IFRAME: Adsterra's invoke.js uses document.write() internally.
 * document.write() only works during the initial page parse phase.
 * In a React SPA the page has already loaded, so document.write()
 * from dynamically appended scripts is silently blocked by the browser.
 *
 * Solution: render ads inside a fresh iframe whose document hasn't
 * finished loading yet. We listen for the iframe's 'load' event on
 * about:blank, then use doc.open/write/close to inject the full
 * Adsterra snippet. The scripts execute during the iframe's parse,
 * where document.write() works correctly.
 *
 * Each AdsterraBanner instance gets its own isolated iframe context,
 * so multiple ads on the same page can't conflict with each other's
 * atOptions globals.
 */

import React, { useEffect, useRef, useState } from 'react';
import { ADSTERRA_CONFIG } from '../config/adsterra';

interface AdsterraBannerProps {
  format: '300x250' | '728x90' | '160x600' | 'native';
  className?: string;
}

export default function AdsterraBanner({ format, className = '' }: AdsterraBannerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hasInjected = useRef(false);
  const [iframeKey, setIframeKey] = useState(0);

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

  const buildAdHtml = (): string => {
    if (format === 'native') {
      const containerId = ADSTERRA_CONFIG.nativeBanner.containerId;
      const scriptUrl = ADSTERRA_CONFIG.nativeBanner.adScriptUrl;
      return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>*{margin:0;padding:0;box-sizing:border-box}html,body{width:100%;min-height:100%;background:transparent;overflow:auto}</style>
</head><body>
<div id="${containerId}"></div>
<script async="async" data-cfasync="false" src="${scriptUrl}"><\/script>
</body></html>`;
    }

    const adConfig = format === '728x90' ? ADSTERRA_CONFIG.topBanner : ADSTERRA_CONFIG.exportModal;
    return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>*{margin:0;padding:0;box-sizing:border-box}html,body{width:100%;height:100%;background:transparent;overflow:hidden;display:flex;justify-content:center;align-items:center}</style>
</head><body>
<script type="text/javascript">
  atOptions = {
    'key' : '${adConfig.adUnitKey}',
    'format' : 'iframe',
    'height' : ${height},
    'width' : ${width},
    'params' : {}
  };
<\/script>
<script type="text/javascript" src="${adConfig.adScriptUrl}"><\/script>
</body></html>`;
  };

  useEffect(() => {
    if (isPlaceholder()) return;

    // Reset injection flag when key changes (re-mount)
    hasInjected.current = false;

    const iframe = iframeRef.current;
    if (!iframe) return;

    const injectAd = () => {
      if (hasInjected.current) return;
      hasInjected.current = true;

      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!doc) return;

        const html = buildAdHtml();
        doc.open();
        doc.write(html);
        doc.close();
      } catch (e) {
        // Cross-origin or security error — silently ignore
        console.warn('[AdsterraBanner] Failed to inject ad:', e);
      }
    };

    // For about:blank, the iframe is usually ready immediately,
    // but we also listen for load just in case
    if (iframe.contentDocument?.readyState === 'complete') {
      injectAd();
    } else {
      iframe.addEventListener('load', injectAd, { once: true });
    }

    return () => {
      iframe.removeEventListener('load', injectAd);
      hasInjected.current = false;
    };
  }, [format, iframeKey]);

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
        key={iframeKey}
        ref={iframeRef}
        src="about:blank"
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms"
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
