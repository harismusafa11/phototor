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
  enabled: true,
  exportModal: {
    enabled: true,
    countdownSeconds: 15,
    adUnitKey: '0c3e1fa0be7e2932e13ef9eab9717c24',
    adScriptUrl: 'https://tuxedoarbourannouncement.com/0c3e1fa0be7e2932e13ef9eab9717c24/invoke.js',
  },
  topBanner: {
    enabled: true,
    adUnitKey: '9983f869497de46fb56454506569b4dc',
    adScriptUrl: 'https://tuxedoarbourannouncement.com/9983f869497de46fb56454506569b4dc/invoke.js',
  },
  nativeBanner: {
    enabled: true,
    containerId: 'container-eeb7b692fcc7914fd90ab58261a116fc',
    adScriptUrl: 'https://tuxedoarbourannouncement.com/eeb7b692fcc7914fd90ab58261a116fc/invoke.js',
  },
  socialBar: {
    enabled: true,
    adScriptUrl: 'https://tuxedoarbourannouncement.com/27/3f/ee/273feed465109eaa06c280b41edc4ea7.js',
  },
};
