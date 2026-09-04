/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Origin the API is served from. Defaults to localhost:8000 when unset. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
