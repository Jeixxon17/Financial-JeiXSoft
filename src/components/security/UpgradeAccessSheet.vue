<template>
  <!--
    Actualizar el acceso de la cuenta anterior (v1): copia los datos a users/{uid},
    el PIN pasa a ser el bloqueo y se entra con Google y/o correo y contraseña.
  -->
  <TpSheet title="Actualiza tu acceso" @close="!busy && emit('close')">
    <div class="flex gap-1.5" aria-hidden="true">
      <span v-for="(s, i) in steps" :key="s" class="h-1 flex-1 rounded-full" :class="stepIndex >= i ? 'bg-accent-light' : 'bg-surface-300'" />
    </div>

    <!-- 1. Qué va a pasar -->
    <template v-if="step === 'intro'">
      <p class="m-0 text-sm text-ink-muted">
        Hoy entras con el PIN como contraseña. Con esto tu cuenta queda como la de cualquier usuario: entras con Google o con
        tu correo, y el PIN solo bloquea la app.
      </p>
      <ol class="m-0 flex list-none flex-col gap-2.5 p-0">
        <li v-for="(item, i) in plan" :key="item" class="flex gap-3 text-sm">
          <span class="grid size-6 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-bold text-accent-light">{{ i + 1 }}</span>
          <span class="text-ink-muted">{{ item }}</span>
        </li>
      </ol>
      <div class="flex gap-3 rounded-tile border border-warning/40 bg-surface-200 p-4 text-[13px]/[19px] [&_svg]:size-5 [&_svg]:shrink-0 [&_svg]:text-warning">
        <TriangleAlert :stroke-width="1.75" aria-hidden="true" />
        <span class="text-ink-muted">
          <strong class="text-ink">La app anterior (v1.14) deja de funcionar.</strong> Desde que copies tus datos, lo que registres
          allá ya no se ve aquí. Hazlo cuando vayas a instalar la nueva en el celular.
        </span>
      </div>
      <p class="m-0 text-xs/[17px] text-ink-faint">
        Antes de empezar publica las reglas nuevas de Firestore (archivo firestore.rules) en Firebase Console > Firestore >
        Reglas, y activa Google en Authentication > Sign-in method.
      </p>
    </template>

    <!-- 2. Confirmar con el PIN -->
    <template v-else-if="step === 'pin'">
      <p class="m-0 text-center text-sm text-ink-muted">{{ busy ? 'Verificando…' : 'Escribe tu PIN actual para confirmar que eres tú' }}</p>
      <div class="flex min-h-[400px] flex-col lg:min-h-0">
        <PinPad ref="pad" :length="PIN_LENGTH" :disabled="busy" :error="error" @complete="confirmPin" />
      </div>
    </template>

    <!-- 3. Copiar los datos -->
    <template v-else-if="step === 'copy'">
      <label class="flex flex-col gap-1.5">
        <span :class="fieldLabel">¿Cómo te llamamos?</span>
        <input v-model="name" :class="fieldInput" placeholder="Tu nombre" :disabled="busy" />
      </label>
      <p class="m-0 text-sm text-ink-muted">
        Se copian tus cuentas, movimientos, categorías, quincenas, metas y demás a tu espacio. Los originales quedan de
        respaldo, no se borran.
      </p>
      <div v-if="progress" class="flex flex-col gap-1.5">
        <div class="h-2 overflow-hidden rounded-full bg-surface-300">
          <span class="block h-full rounded-full bg-linear-to-r from-accent-light to-accent-glow transition-[width]" :style="{ width: `${progressPct}%` }" />
        </div>
        <span class="text-xs text-ink-faint">{{ progress.copied }} de {{ progress.total }} registros</span>
      </div>
      <p v-if="error" role="alert" class="m-0 text-sm text-danger">{{ error }}</p>
    </template>

    <!-- 4. Nuevo acceso -->
    <template v-else-if="step === 'access'">
      <div class="flex gap-3 rounded-tile border border-line bg-surface-200 p-4 text-sm [&_svg]:size-5 [&_svg]:shrink-0 [&_svg]:text-success">
        <CircleCheck :stroke-width="1.75" aria-hidden="true" />
        <span class="text-ink-muted">Se copiaron <strong class="text-ink">{{ copied }}</strong> registros y tu PIN quedó como bloqueo de la app.</span>
      </div>
      <p class="m-0 text-sm text-ink-muted">Ahora elige cómo vas a entrar. Puedes usar los dos.</p>

      <TpButton v-if="googleAvailable" :variant="googleLinked ? 'secondary' : 'primary'" block :disabled="busy || googleLinked" @click="doLinkGoogle">
        <span class="grid size-6 place-items-center rounded-full bg-white text-[13px] font-bold text-[#4285F4]" aria-hidden="true">G</span>
        {{ googleLinked ? 'Google vinculado' : 'Vincular mi cuenta de Google' }}
      </TpButton>

      <form class="flex flex-col gap-3 rounded-card border border-line bg-surface-200/40 p-4" @submit.prevent="doCredentials">
        <span class="text-sm font-semibold">Correo y contraseña</span>
        <label class="flex flex-col gap-1.5">
          <span :class="fieldLabel">Tu correo</span>
          <input v-model="email" type="email" autocomplete="email" :class="fieldInput" placeholder="tu@correo.com" :disabled="busy || credentialsSet" />
        </label>
        <PasswordField v-model="password" label="Contraseña nueva (8+ con un número)" autocomplete="new-password" />
        <TpButton type="submit" variant="secondary" block :disabled="busy || credentialsSet || !canSetCredentials">
          {{ credentialsSet ? 'Listo: revisa tu correo' : 'Guardar correo y contraseña' }}
        </TpButton>
        <small v-if="credentialsSet" class="text-xs/[17px] text-ink-faint">
          Te enviamos un enlace a {{ email }}. Al abrirlo, ese queda como tu correo para entrar.
        </small>
      </form>
      <p v-if="error" role="alert" class="m-0 text-sm text-danger">{{ error }}</p>
    </template>

    <template #footer>
      <template v-if="step === 'intro'">
        <div class="hidden lg:block"><TpButton variant="ghost" @click="emit('close')">Ahora no</TpButton></div>
        <TpButton block class="lg:w-auto lg:min-w-40" @click="step = 'pin'">Empezar</TpButton>
      </template>
      <TpButton v-else-if="step === 'copy'" block class="lg:w-auto lg:min-w-44" :disabled="busy || !name.trim()" @click="copyData">
        {{ busy ? 'Copiando…' : 'Copiar mis datos' }}
      </TpButton>
      <TpButton v-else-if="step === 'access'" block class="lg:w-auto lg:min-w-40" :disabled="busy || !(googleLinked || credentialsSet)" @click="finish">
        Terminar
      </TpButton>
    </template>
  </TpSheet>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { CircleCheck, TriangleAlert } from 'lucide-vue-next'
import PinPad from './PinPad.vue'
import PasswordField from './PasswordField.vue'
import TpSheet from '@/components/tp/TpSheet.vue'
import TpButton from '@/components/tp/TpButton.vue'
import { fieldInput, fieldLabel } from '@/components/tp/format'
import { migrateLegacyData, type MigrationProgress } from '@/services/migration.service'
import {
  PIN_LENGTH,
  authErrorMessage,
  confirmLegacyPin,
  googleAvailable,
  linkGoogle,
  setLockPin,
  setRealCredentials
} from '@/services/auth.service'

const emit = defineEmits<{ close: [] }>()

type Step = 'intro' | 'pin' | 'copy' | 'access'
const steps: Step[] = ['intro', 'pin', 'copy', 'access']
const step = ref<Step>('intro')
const stepIndex = computed(() => steps.indexOf(step.value))

const plan = [
  'Confirmas tu PIN actual.',
  'Se copian tus datos a tu espacio (los originales quedan de respaldo).',
  'Tu PIN queda como bloqueo de la app.',
  'Vinculas Google y/o un correo con contraseña para entrar.'
]

const busy = ref(false)
const error = ref('')
const pad = ref<InstanceType<typeof PinPad> | null>(null)
let pin = ''

async function confirmPin(value: string) {
  busy.value = true
  error.value = ''
  try {
    await confirmLegacyPin(value)
    pin = value
    step.value = 'copy'
  } catch (e) {
    pad.value?.reset()
    error.value = authErrorMessage(e) === 'Correo o contraseña incorrectos' ? 'PIN incorrecto' : authErrorMessage(e)
  } finally {
    busy.value = false
  }
}

// ---------- Copiar ----------
const name = ref('')
const progress = ref<MigrationProgress | null>(null)
const copied = ref(0)
const progressPct = computed(() => (progress.value?.total ? (progress.value.copied / progress.value.total) * 100 : 0))

async function copyData() {
  busy.value = true
  error.value = ''
  try {
    copied.value = await migrateLegacyData(name.value, p => (progress.value = p))
    // El mismo PIN de siempre queda como bloqueo
    await setLockPin(pin)
    step.value = 'access'
  } catch (e) {
    error.value = authErrorMessage(e)
  } finally {
    busy.value = false
  }
}

// ---------- Nuevo acceso ----------
const googleLinked = ref(false)
const credentialsSet = ref(false)
const email = ref('')
const password = ref('')
const canSetCredentials = computed(() => /\S+@\S+\.\S+/.test(email.value) && password.value.length >= 8 && /\d/.test(password.value))

async function doLinkGoogle() {
  busy.value = true
  error.value = ''
  try {
    await linkGoogle()
    googleLinked.value = true
  } catch (e) {
    error.value = authErrorMessage(e)
  } finally {
    busy.value = false
  }
}

async function doCredentials() {
  busy.value = true
  error.value = ''
  try {
    await setRealCredentials(email.value, password.value)
    credentialsSet.value = true
  } catch (e) {
    error.value = authErrorMessage(e)
  } finally {
    busy.value = false
  }
}

// La app vuelve a arrancar ya con la cuenta actualizada
function finish() {
  window.location.reload()
}
</script>
