/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE: string;
  readonly VITE_TEST_USERNAME: string;
  readonly VITE_TEST_PASSWORD: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}