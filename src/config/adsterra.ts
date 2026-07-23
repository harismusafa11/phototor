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
  socialBar: {
    enabled: boolean;
    adScriptUrl: string;      // Adsterra Social Bar script URL
  };
}

export const ADSTERRA_CONFIG: AdsterraConfig = {
  enabled: true,
  exportModal: {
    enabled: true,
    countdownSeconds: 15,
    adUnitKey: 'adsterra_300x250_key',
    adScriptUrl: '//www.highperformanceformat.com/adsterra_300x250/invoke.js',
  },
  topBanner: {
    enabled: true,
    adUnitKey: 'adsterra_728x90_key',
    adScriptUrl: '//www.highperformanceformat.com/adsterra_728x90/invoke.js',
  },
  socialBar: {
    enabled: false,
    adScriptUrl: '//www.highperformanceformat.com/adsterra_socialbar/invoke.js',
  },
};
