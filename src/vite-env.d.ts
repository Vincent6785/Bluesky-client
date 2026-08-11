/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_HANDLE_RESOLVER?: string;
  readonly VITE_APP_URL?: string;
  readonly VITE_DEBUG_NETWORK?: "true" | "false";
}
