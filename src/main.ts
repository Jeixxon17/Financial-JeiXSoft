import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { Capacitor } from '@capacitor/core'
import { registerSW } from 'virtual:pwa-register'
import { router } from '@/router'
import App from './App.vue'
import './style.css'

if (Capacitor.isNativePlatform()) {
  // En la app Android los archivos vienen dentro del APK: un service worker
  // dejaría la versión anterior en caché después de cada actualización
  navigator.serviceWorker?.getRegistrations().then(registrations => {
    registrations.forEach(registration => registration.unregister())
    if (registrations.length) caches.keys().then(keys => keys.forEach(key => caches.delete(key)))
  })
} else {
  // PWA en el navegador: instalable y se actualiza sola
  registerSW({ immediate: true })
}

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
