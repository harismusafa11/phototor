/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_ADSTERRA_ENABLED?: string;
  readonly VITE_ADSTERRA_COUNTDOWN?: string;
  readonly VITE_ADSTERRA_300X250_KEY?: string;
  readonly VITE_ADSTERRA_300X250_URL?: string;
  readonly VITE_ADSTERRA_728X90_KEY?: string;
  readonly VITE_ADSTERRA_728X90_URL?: string;
  readonly VITE_ADSTERRA_NATIVE_CONTAINER?: string;
  readonly VITE_ADSTERRA_NATIVE_URL?: string;
  readonly VITE_ADSTERRA_SOCIALBAR_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
