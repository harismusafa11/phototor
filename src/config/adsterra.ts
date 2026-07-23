/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AdsterraConfig {
  enabled: boolean;
  exportModal: {
    enabled: boolean;
    countdownSeconds: number; // Seconds user waits before download button unlocks
    adUnitKey: string;        // Adsterra 300x250 ad unit key
    adScriptUrl: string;      // Adsterra invoke.js script URL
  };
  topBanner: {
    enabled: boolean;
    adUnitKey: string;        // Adsterra 728x90 leaderboard ad key
    adScriptUrl: string;
  };
  nativeBanner: {
    enabled: boolean;
    containerId: string;      // Adsterra native banner container ID
    adScriptUrl: string;
  };
  socialBar: {
    enabled: boolean;
    adScriptUrl: string;      // Adsterra Social Bar script URL
  };
}

export const ADSTERRA_CONFIG: AdsterraConfig = {
  enabled: import.meta.env.VITE_ADSTERRA_ENABLED !== undefined 
    ? import.meta.env.VITE_ADSTERRA_ENABLED === 'true' 
    : true,
  exportModal: {
    enabled: true,
    countdownSeconds: Number(import.meta.env.VITE_ADSTERRA_COUNTDOWN) || 15,
    adUnitKey: import.meta.env.VITE_ADSTERRA_300X250_KEY || '0c3e1fa0be7e2932e13ef9eab9717c24',
    adScriptUrl: import.meta.env.VITE_ADSTERRA_300X250_URL || 'https://www.highperformanceformat.com/0c3e1fa0be7e2932e13ef9eab9717c24/invoke.js',
  },
  topBanner: {
    enabled: true,
    adUnitKey: import.meta.env.VITE_ADSTERRA_728X90_KEY || '9983f869497de46fb56454506569b4dc',
    adScriptUrl: import.meta.env.VITE_ADSTERRA_728X90_URL || 'https://www.highperformanceformat.com/9983f869497de46fb56454506569b4dc/invoke.js',
  },
  nativeBanner: {
    enabled: true,
    containerId: import.meta.env.VITE_ADSTERRA_NATIVE_CONTAINER || 'container-eeb7b692fcc7914fd90ab58261a116fc',
    adScriptUrl: import.meta.env.VITE_ADSTERRA_NATIVE_URL || 'https://www.highperformanceformat.com/eeb7b692fcc7914fd90ab58261a116fc/invoke.js',
  },
  socialBar: {
    enabled: true,
    adScriptUrl: import.meta.env.VITE_ADSTERRA_SOCIALBAR_URL || 'https://www.highperformanceformat.com/27/3f/ee/273feed465109eaa06c280b41edc4ea7.js',
  },
};
