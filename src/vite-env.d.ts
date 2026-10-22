/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

// Versión de la app (ej: "1.1"), tomada de package.json en vite.config.ts
declare const __APP_VERSION__: string
declare module '*.css' {
  const content: Record<string, string>
  export default content
}
