/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BACKEND_URL: string
  readonly VITE_API_BASE_URL: string
  readonly VITE_APP_TITLE: string
  readonly VITE_APP_VERSION: string
  readonly VITE_ENABLE_DEBUG: string
  readonly VITE_MAX_FILE_SIZE: string
  // Ajoutez d'autres variables d'environnement ici au besoin
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}