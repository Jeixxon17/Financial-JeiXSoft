import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'
import { readFileSync } from 'fs'

// Versión única de la app (package.json): web, PWA y APK de Android
const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'))
const appVersion = pkg.version.split('.').slice(0, 2).join('.')

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion)
  },
  plugins: [
    vue(),
    tailwindcss(),
    // App instalable desde el navegador (PWA)
    VitePWA({
      registerType: 'autoUpdate',
      // Se registra a mano en main.ts: solo en el navegador, no en la app Android
      injectRegister: null,
      includeAssets: ['favicon.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Financial JeiXSoft',
        short_name: 'JeiXSoft',
        description: 'Control de finanzas personales: cuentas, tarjetas y quincenas',
        lang: 'es-CO',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0a0d14',
        theme_color: '#0a0d14',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
        // Firebase siempre va a la red: los datos no se guardan en caché
        navigateFallbackDenylist: [/^\/__/]
      }
    })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
})
