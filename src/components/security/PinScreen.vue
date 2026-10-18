<template>
  <div class="pin-screen">
    <div class="pin-card">
      <img :src="logo" alt="JeiXSoft" class="pin-logo" />

      <template v-if="mode === 'loading'">
        <p class="pin-subtitle">Cargando…</p>
      </template>

      <template v-else-if="mode === 'error'">
        <h1 class="pin-title">Sin conexión</h1>
        <p class="pin-subtitle">{{ error }}</p>
        <button class="pin-retry" @click="detectMode">Reintentar</button>
      </template>

      <template v-else>
        <h1 class="pin-title">{{ title }}</h1>
        <p class="pin-subtitle">{{ subtitle }}</p>

        <PinPad
          ref="pad"
          :key="mode"
          :length="PIN_LENGTH"
          :disabled="busy || lockedFor > 0"
          :error="lockedFor > 0 ? `Espera ${lockedFor} s para intentar de nuevo` : error"
          @complete="onComplete"
        />

        <button v-if="mode === 'confirm'" class="pin-link" @click="restartSetup">
          Empezar de nuevo
        </button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import PinPad from './PinPad.vue'
import logo from '@/assets/LogoFx.png'
import {
  PIN_LENGTH,
  isPinConfigured,
  loginWithPin,
  pinErrorMessage,
  setupPin
} from '@/services/auth.service'

type Mode = 'loading' | 'error' | 'setup' | 'confirm' | 'login'

// Tras varios intentos fallidos se bloquea el teclado un rato
const MAX_ATTEMPTS = 5
const LOCK_SECONDS = 30

const pad = ref<InstanceType<typeof PinPad> | null>(null)
const mode = ref<Mode>('loading')
const error = ref('')
const busy = ref(false)
const firstPin = ref('')
const failedAttempts = ref(0)
const lockedFor = ref(0)
let lockTimer: ReturnType<typeof setInterval> | null = null

const title = computed(() => ({
  setup: 'Crea tu PIN',
  confirm: 'Confirma tu PIN',
  login: 'Ingresa tu PIN'
}[mode.value as 'setup' | 'confirm' | 'login']))

const subtitle = computed(() => ({
  setup: `Elige ${PIN_LENGTH} dígitos. Con este PIN entrarás a la app.`,
  confirm: 'Escríbelo otra vez para confirmarlo.',
  login: 'Tus finanzas están protegidas.'
}[mode.value as 'setup' | 'confirm' | 'login']))

async function detectMode() {
  mode.value = 'loading'
  error.value = ''
  try {
    mode.value = (await isPinConfigured()) ? 'login' : 'setup'
  } catch {
    error.value = 'No se pudo conectar con el servidor. Revisa tu conexión.'
    mode.value = 'error'
  }
}

function restartSetup() {
  firstPin.value = ''
  error.value = ''
  mode.value = 'setup'
}

function startLock() {
  lockedFor.value = LOCK_SECONDS
  lockTimer = setInterval(() => {
    lockedFor.value--
    if (lockedFor.value <= 0 && lockTimer) {
      clearInterval(lockTimer)
      lockTimer = null
      failedAttempts.value = 0
      error.value = ''
    }
  }, 1000)
}

async function onComplete(pin: string) {
  error.value = ''

  if (mode.value === 'setup') {
    firstPin.value = pin
    mode.value = 'confirm'
    return
  }

  busy.value = true
  try {
    if (mode.value === 'confirm') {
      if (pin !== firstPin.value) {
        restartSetup()
        error.value = 'Los PIN no coinciden. Créalo de nuevo'
        return
      }
      await setupPin(pin)
    } else {
      await loginWithPin(pin)
    }
    // Al iniciar sesión, App.vue cambia a la aplicación
  } catch (e) {
    pad.value?.reset()
    error.value = pinErrorMessage(e)
    if (mode.value === 'login') {
      failedAttempts.value++
      if (failedAttempts.value >= MAX_ATTEMPTS) startLock()
    }
    if ((e as { code?: string })?.code === 'auth/email-already-in-use') mode.value = 'login'
  } finally {
    busy.value = false
  }
}

onMounted(detectMode)
onBeforeUnmount(() => lockTimer && clearInterval(lockTimer))
</script>

<style scoped>
.pin-screen {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(24px + env(safe-area-inset-top)) 16px calc(24px + env(safe-area-inset-bottom));
  background:
    radial-gradient(circle at 50% 0%, rgba(74, 158, 255, 0.12), transparent 60%),
    var(--bg-base);
}

.pin-card {
  width: 100%;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.pin-logo {
  width: 64px;
  height: auto;
  margin-bottom: 20px;
}

.pin-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.pin-subtitle {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 28px;
  max-width: 280px;
}

.pin-link,
.pin-retry {
  margin-top: 20px;
  background: none;
  border: none;
  color: var(--accent-blue);
  font-size: 14px;
  cursor: pointer;
}

.pin-retry {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 20px;
  color: var(--text-primary);
}
</style>
