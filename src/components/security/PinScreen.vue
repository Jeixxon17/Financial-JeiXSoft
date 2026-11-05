<template>
  <!-- PIN de bloqueo: crearlo (primera vez o "Olvidé mi PIN") o escribirlo para abrir la app -->
  <div
    class="flex min-h-dvh justify-center bg-screen px-7 pt-[calc(52px+env(safe-area-inset-top))] pb-[calc(20px+env(safe-area-inset-bottom))] font-sans text-ink antialiased lg:items-center lg:p-10"
  >
    <main
      class="flex w-full max-w-[360px] flex-col items-center gap-6 text-center lg:max-w-[440px] lg:gap-5 lg:rounded-sheet lg:border lg:border-line lg:bg-surface-100 lg:px-9 lg:pt-10 lg:pb-7 lg:shadow-float"
      aria-labelledby="pin-title"
    >
      <img :src="appIcon" alt="TuPlataAlDia" class="size-[76px] rounded-card shadow-icon lg:size-[72px]" width="76" height="76" />

      <!-- Pasos al crear el PIN después de registrarse -->
      <div v-if="mode !== 'unlock'" class="flex w-full max-w-[220px] items-center gap-2" aria-hidden="true">
        <span class="h-1 flex-1 rounded-full bg-accent-light" />
        <span class="h-1 flex-1 rounded-full" :class="mode === 'confirm' ? 'bg-accent-light' : 'bg-surface-300'" />
      </div>

      <div class="flex flex-col gap-2">
        <h1 id="pin-title" :class="titleClass">{{ title }}</h1>
        <p :class="hintClass">{{ hint }}</p>
      </div>

      <PinPad
        ref="pad"
        :key="mode"
        :length="PIN_LENGTH"
        :disabled="busy || lockedFor > 0"
        :error="lockedFor > 0 ? `Muchos intentos. Espera ${lockedFor} s` : error"
        @complete="onComplete"
      />

      <div class="flex flex-wrap justify-center gap-x-5 gap-y-1">
        <button v-if="mode === 'confirm'" type="button" :class="link" @click="restart">Empezar de nuevo</button>
        <button v-if="mode === 'unlock'" type="button" :class="link" @click="forgot">Olvidé mi PIN</button>
        <button type="button" :class="[link, 'text-ink-muted']" @click="signOutUser">Cerrar sesión</button>
      </div>

      <p class="text-xs text-ink-faint">TuPlataAlDia v{{ appVersion }}</p>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import PinPad from './PinPad.vue'
import appIcon from '@/assets/brand/tuplata-app-icon.svg'
import { PIN_LENGTH, authErrorMessage, authState, forgotPin, setLockPin, signOutUser, unlockWithPin } from '@/services/auth.service'

type Mode = 'create' | 'confirm' | 'unlock'

// Tras varios intentos fallidos se bloquea el teclado un rato
const MAX_ATTEMPTS = 5
const LOCK_SECONDS = 30

const appVersion = __APP_VERSION__
const titleClass = 'm-0 font-sans text-[28px]/[34px] font-semibold tracking-[-0.3px] lg:text-[26px]/8'
const hintClass = 'm-0 text-base/6 text-ink-muted lg:text-[15px]/[22px]'
const link = 'cursor-pointer p-1 text-sm font-medium text-accent-light hover:text-ink'

const pad = ref<InstanceType<typeof PinPad> | null>(null)
const mode = ref<Mode>(!authState.pinSet || authState.resettingPin ? 'create' : 'unlock')
const error = ref('')
const busy = ref(false)
const firstPin = ref('')
const failed = ref(0)
const lockedFor = ref(0)
let lockTimer: ReturnType<typeof setInterval> | null = null

const firstName = computed(() => authState.name.trim().split(/\s+/)[0] || '')

const title = computed(() => {
  if (mode.value === 'create') return authState.resettingPin ? 'Crea un PIN nuevo' : 'Crea tu PIN'
  if (mode.value === 'confirm') return 'Confirma tu PIN'
  return firstName.value ? `Hola, ${firstName.value}` : 'Hola de nuevo'
})

const hint = computed(() => {
  if (busy.value) return 'Verificando…'
  if (mode.value === 'create') return `${PIN_LENGTH} dígitos para abrir la app. Te lo pediremos cada vez que entres.`
  if (mode.value === 'confirm') return 'Escríbelo otra vez para confirmarlo.'
  return `Ingresa tu PIN de ${PIN_LENGTH} dígitos`
})

function restart() {
  firstPin.value = ''
  error.value = ''
  mode.value = 'create'
}

function startLock() {
  lockedFor.value = LOCK_SECONDS
  lockTimer = setInterval(() => {
    lockedFor.value--
    if (lockedFor.value <= 0 && lockTimer) {
      clearInterval(lockTimer)
      lockTimer = null
      failed.value = 0
      error.value = ''
    }
  }, 1000)
}

async function onComplete(pin: string) {
  error.value = ''

  if (mode.value === 'create') {
    firstPin.value = pin
    mode.value = 'confirm'
    return
  }

  busy.value = true
  try {
    if (mode.value === 'confirm') {
      if (pin !== firstPin.value) {
        restart()
        error.value = 'Los PIN no coinciden. Créalo de nuevo'
        return
      }
      await setLockPin(pin)
    } else {
      await unlockWithPin(pin)
    }
    // App.vue abre la app al quedar desbloqueada
  } catch (e) {
    pad.value?.reset()
    error.value = authErrorMessage(e)
    if (mode.value === 'unlock') {
      failed.value++
      if (failed.value >= MAX_ATTEMPTS) startLock()
    }
  } finally {
    busy.value = false
  }
}

// Se cierra la sesión: al volver a entrar con la contraseña o Google se crea uno nuevo
async function forgot() {
  await forgotPin()
}

onBeforeUnmount(() => lockTimer && clearInterval(lockTimer))
</script>
