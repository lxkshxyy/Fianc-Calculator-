/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/**
 * §2.1.9 — configuration is read only through `import.meta.env.VITE_*`, always with `??`.
 * Anything declared here ships in the client bundle, so it must never hold a secret.
 */
interface ImportMetaEnv {
  readonly VITE_APP_NAME?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
