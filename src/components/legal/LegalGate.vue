<template>
  <!-- Aceptar términos y política de datos antes de usar la app. Sale a quien no los ha aceptado
       (cuentas con Google, usuarios de antes) o cuando cambia la versión de un texto. -->
  <div class="grid min-h-dvh grid-cols-[minmax(0,1fr)] place-items-center bg-screen px-5 py-[calc(24px+env(safe-area-inset-top))] font-sans text-ink antialiased lg:bg-desk">
    <div class="flex w-full max-w-[460px] flex-col gap-5 lg:rounded-sheet lg:border lg:border-line lg:bg-surface-100 lg:p-9 lg:shadow-float">
      <span class="grid size-14 place-items-center rounded-full bg-primary-soft text-accent-light [&_svg]:size-7">
        <ShieldCheck :stroke-width="1.75" aria-hidden="true" />
      </span>
      <div class="flex flex-col gap-2">
        <h1 class="m-0 font-sans text-[26px]/8 font-semibold tracking-[-0.3px]">{{ updated ? 'Actualizamos nuestros términos' : 'Antes de empezar' }}</h1>
        <p class="m-0 text-[15px]/6 text-ink-muted">
          Tu información financiera es privada. Lee cómo la cuidamos y acepta para seguir usando TuPlataAlDia.
        </p>
      </div>

      <ul class="m-0 flex list-none flex-col gap-3 rounded-tile border border-line bg-surface-200/40 p-4 text-[13px]/[19px] text-ink-muted">
        <li v-for="p in points" :key="p" class="flex gap-2.5 [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-success">
          <Check :stroke-width="2.25" aria-hidden="true" />{{ p }}
        </li>
      </ul>

      <label class="flex cursor-pointer items-start gap-3 text-sm/5 text-ink-muted">
        <input v-model="acceptTerms" type="checkbox" class="mt-0.5 size-4 shrink-0 accent-primary" />
        <span>Acepto los <button type="button" :class="link" @click.prevent="open = 'terminos'">Términos y condiciones</button>.</span>
      </label>
      <label class="flex cursor-pointer items-start gap-3 text-sm/5 text-ink-muted">
        <input v-model="acceptPrivacy" type="checkbox" class="mt-0.5 size-4 shrink-0 accent-primary" />
        <span>
          Autorizo el tratamiento de mis datos según la
          <button type="button" :class="link" @click.prevent="open = 'privacidad'">Política de tratamiento de datos</button>, incluido su
          almacenamiento en servidores fuera de Colombia.
        </span>
      </label>

      <p v-if="error" role="alert" class="m-0 text-sm text-danger">{{ error }}</p>
      <div class="flex flex-col gap-2">
        <TpButton block :disabled="busy || !acceptTerms || !acceptPrivacy" @click="accept">{{ busy ? 'Guardando…' : 'Aceptar y continuar' }}</TpButton>
        <TpButton variant="ghost" block :disabled="busy" @click="signOutUser">Cerrar sesión</TpButton>
      </div>
    </div>
  </div>

  <LegalSheet v-if="open" :doc-key="open" @close="open = null" />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Check, ShieldCheck } from 'lucide-vue-next'
import TpButton from '@/components/tp/TpButton.vue'
import LegalSheet from './LegalSheet.vue'
import type { LegalDocKey } from '@/legal/documents'
import { authState, signOutUser } from '@/services/auth.service'
import { saveConsents } from '@/services/consent.service'

const link = 'cursor-pointer p-0 font-semibold text-accent-light underline-offset-2 hover:underline'

const points = [
  'No vendemos tus datos ni los usamos para publicidad.',
  'Tus extractos y su contraseña se leen solo en tu celular.',
  'Leer notificaciones o SMS del banco es opcional y te lo preguntamos aparte.',
  'Puedes eliminar tu cuenta y tus datos cuando quieras.'
]

// Ya había aceptado una versión anterior
const updated = computed(() => !!authState.consents.terms || !!authState.consents.privacy)

const acceptTerms = ref(false)
const acceptPrivacy = ref(false)
const open = ref<LegalDocKey | null>(null)
const busy = ref(false)
const error = ref('')

async function accept() {
  busy.value = true
  error.value = ''
  try {
    await saveConsents(['terms', 'privacy'])
  } catch {
    error.value = 'No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.'
  } finally {
    busy.value = false
  }
}
</script>
