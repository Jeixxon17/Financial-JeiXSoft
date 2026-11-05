<template>
  <!-- Acceso: bienvenida, iniciar sesión, crear cuenta, recuperar contraseña y la cuenta anterior (PIN) -->
  <div class="flex min-h-dvh bg-screen font-sans text-ink antialiased lg:bg-desk">
    <!-- ===== Escritorio: la marca a la izquierda ===== -->
    <section class="relative hidden flex-1 flex-col justify-center gap-10 overflow-hidden px-16 py-12 lg:flex">
      <component
        :is="onHome ? 'button' : 'div'"
        :type="onHome ? 'button' : undefined"
        :title="onHome ? 'Volver al inicio' : undefined"
        class="flex items-center gap-3 self-start text-[26px] font-extrabold tracking-[-0.5px] text-ink"
        :class="onHome && 'cursor-pointer'"
        @click="onHome?.()"
      >
        <img :src="appIcon" alt="" width="44" height="44" class="size-11 rounded-tile" />
        <span>TuPlata<span class="text-accent-light">AlDia</span></span>
      </component>
      <div class="relative h-[250px] max-w-[460px]">
        <div :class="[demoCard, 'absolute top-0 left-10 w-[340px] -rotate-6 opacity-80']"><BankCardFace :card="demoCards[0]" /></div>
        <div :class="[demoCard, 'absolute top-12 left-0 w-[340px] rotate-3']"><BankCardFace :card="demoCards[1]" /></div>
      </div>
      <div class="flex max-w-[460px] flex-col gap-5">
        <h1 class="m-0 font-sans text-[34px]/[42px] font-semibold tracking-[-0.5px]">Toda tu plata, al día y en un solo lugar</h1>
        <div v-for="f in features" :key="f.title" class="flex gap-3.5">
          <span class="grid size-10 shrink-0 place-items-center rounded-full bg-primary-soft text-accent-light [&_svg]:size-5">
            <component :is="f.icon" :stroke-width="1.75" aria-hidden="true" />
          </span>
          <span class="flex flex-col gap-0.5">
            <strong class="text-[15px] font-semibold">{{ f.title }}</strong>
            <span class="text-sm text-ink-muted">{{ f.text }}</span>
          </span>
        </div>
      </div>
    </section>

    <!-- ===== Formularios ===== -->
    <section class="flex w-full flex-col px-6 pt-[calc(24px+env(safe-area-inset-top))] pb-[calc(24px+env(safe-area-inset-bottom))] lg:w-[520px] lg:shrink-0 lg:items-center lg:justify-center lg:px-10">
      <div class="mx-auto flex w-full max-w-[400px] flex-1 flex-col gap-5 lg:flex-none lg:rounded-sheet lg:border lg:border-line lg:bg-surface-100 lg:p-9 lg:shadow-float">
        <!-- ===== Bienvenida (celular) ===== -->
        <template v-if="view === 'welcome'">
          <div class="flex items-center gap-3">
            <button v-if="onHome" type="button" :class="backBtn" aria-label="Volver al inicio" @click="onHome()"><ArrowLeft :stroke-width="1.75" aria-hidden="true" /></button>
            <div class="flex items-center gap-2.5 text-xl font-extrabold tracking-[-0.4px]">
              <img :src="appIcon" alt="" width="36" height="36" class="size-9 rounded-chip" />
              <span>TuPlata<span class="text-accent-light">AlDia</span></span>
            </div>
          </div>
          <div class="relative mx-auto mt-2 h-[230px] w-full max-w-[340px]">
            <div :class="[demoCard, 'absolute top-0 right-0 left-6 -rotate-6 opacity-80']"><BankCardFace :card="demoCards[0]" /></div>
            <div :class="[demoCard, 'absolute top-14 right-6 left-0 rotate-3']"><BankCardFace :card="demoCards[1]" /></div>
          </div>
          <div class="mt-auto flex flex-col gap-2.5 pt-6">
            <h1 class="m-0 font-sans text-[28px]/[34px] font-semibold tracking-[-0.3px]">Toda tu plata, al día y en un solo lugar</h1>
            <p class="m-0 text-base/6 text-ink-muted">Cuentas, tarjetas, quincenas y metas de ahorro. La app lee las notificaciones del banco por ti.</p>
          </div>
          <div class="flex flex-col gap-2">
            <TpButton block @click="go('register')">Crear mi cuenta</TpButton>
            <TpButton variant="ghost" block @click="go('login')">Ya tengo cuenta</TpButton>
          </div>
        </template>

        <!-- ===== Iniciar sesión ===== -->
        <template v-else-if="view === 'login'">
          <button type="button" :class="[backBtn, 'lg:hidden']" aria-label="Volver" @click="go('welcome')"><ArrowLeft :stroke-width="1.75" aria-hidden="true" /></button>
          <div class="flex flex-col gap-2">
            <img :src="symbol" alt="" width="40" height="40" class="size-10 lg:hidden" />
            <h1 :class="title">Hola de nuevo</h1>
            <p :class="subtitle">Entra con tu correo para ver tus cuentas.</p>
          </div>
          <form class="flex flex-col gap-3.5" @submit.prevent="doLogin">
            <label class="flex flex-col gap-1.5">
              <span :class="fieldLabel">Correo</span>
              <input v-model="email" type="email" autocomplete="email" required :class="fieldInput" placeholder="tu@correo.com" />
            </label>
            <PasswordField v-model="password" label="Contraseña" autocomplete="current-password" />
            <button type="button" class="cursor-pointer self-end p-1 text-[13px] font-medium text-accent-light hover:text-ink" @click="go('recover')">
              Olvidé mi contraseña
            </button>
            <p v-if="error" role="alert" class="m-0 text-sm text-danger">{{ error }}</p>
            <TpButton type="submit" block :disabled="busy || !email || !password">{{ busy ? 'Entrando…' : 'Entrar' }}</TpButton>
          </form>
          <GoogleBlock :busy="busy" @google="doGoogle" />
          <p class="m-0 text-center text-sm text-ink-muted">
            ¿No tienes cuenta?
            <button type="button" class="cursor-pointer font-semibold text-accent-light hover:text-ink" @click="go('register')">Créala gratis</button>
          </p>
        </template>

        <!-- ===== Crear cuenta ===== -->
        <template v-else-if="view === 'register'">
          <div class="flex items-center gap-3">
            <button type="button" :class="backBtn" aria-label="Volver" @click="go(isDesktop ? 'login' : 'welcome')"><ArrowLeft :stroke-width="1.75" aria-hidden="true" /></button>
            <div class="flex flex-1 gap-1.5" aria-hidden="true"><span class="h-1 flex-1 rounded-full bg-accent-light" /><span class="h-1 flex-1 rounded-full bg-surface-300" /></div>
            <span class="text-xs text-ink-faint">Paso 1 de 2</span>
          </div>
          <div class="flex flex-col gap-2">
            <h1 :class="title">Crea tu cuenta</h1>
            <p :class="subtitle">Gratis. Tus datos solo los ves tú.</p>
          </div>
          <form class="flex flex-col gap-3.5" @submit.prevent="doRegister">
            <label class="flex flex-col gap-1.5">
              <span :class="fieldLabel">Nombre</span>
              <input v-model="name" autocomplete="name" required :class="fieldInput" placeholder="Cómo te llamamos" />
            </label>
            <label class="flex flex-col gap-1.5">
              <span :class="fieldLabel">Correo</span>
              <input v-model="email" type="email" autocomplete="email" required :class="fieldInput" placeholder="tu@correo.com" />
            </label>
            <PasswordField v-model="password" label="Contraseña" autocomplete="new-password" />
            <div class="flex flex-wrap gap-x-4 gap-y-1">
              <span v-for="rule in passwordRules" :key="rule.label" class="flex items-center gap-1.5 text-xs [&_svg]:size-3.5" :class="rule.ok ? 'text-success' : 'text-ink-faint'">
                <component :is="rule.ok ? CircleCheck : Circle" :stroke-width="2" aria-hidden="true" />
                {{ rule.label }}
              </span>
            </div>
            <label class="flex cursor-pointer items-start gap-3 text-[13px]/[19px] text-ink-muted">
              <input v-model="accepted" type="checkbox" class="mt-0.5 size-4 shrink-0 accent-primary" />
              <span>
                Acepto los
                <button type="button" :class="docLink" @click.prevent="openDoc = 'terminos'">Términos y condiciones</button>
                y autorizo el tratamiento de mis datos según la
                <button type="button" :class="docLink" @click.prevent="openDoc = 'privacidad'">Política de datos</button>.
              </span>
            </label>
            <p v-if="error" role="alert" class="m-0 text-sm text-danger">{{ error }}</p>
            <TpButton type="submit" block :disabled="busy || !canRegister">{{ busy ? 'Creando tu cuenta…' : 'Continuar' }}</TpButton>
          </form>
          <GoogleBlock :busy="busy" label="Crear con Google" @google="doGoogle" />
          <p class="m-0 text-center text-sm text-ink-muted">
            ¿Ya tienes cuenta?
            <button type="button" class="cursor-pointer font-semibold text-accent-light hover:text-ink" @click="go('login')">Inicia sesión</button>
          </p>
        </template>

        <!-- ===== Recuperar contraseña ===== -->
        <template v-else-if="view === 'recover'">
          <button type="button" :class="backBtn" aria-label="Volver" @click="go('login')"><ArrowLeft :stroke-width="1.75" aria-hidden="true" /></button>
          <div class="flex flex-col gap-2">
            <h1 :class="title">Recupera tu contraseña</h1>
            <p :class="subtitle">Te enviamos un enlace para crear una nueva.</p>
          </div>
          <div v-if="sent" class="flex gap-3 rounded-tile border border-line bg-surface-100 p-4 [&_svg]:size-5 [&_svg]:shrink-0 [&_svg]:text-success">
            <MailCheck :stroke-width="1.75" aria-hidden="true" />
            <span class="text-sm text-ink-muted">Si <strong class="text-ink">{{ email }}</strong> tiene cuenta, ya te llegó el enlace. Revisa también el correo no deseado.</span>
          </div>
          <form v-else class="flex flex-col gap-3.5" @submit.prevent="doRecover">
            <label class="flex flex-col gap-1.5">
              <span :class="fieldLabel">Correo</span>
              <input v-model="email" type="email" autocomplete="email" required :class="fieldInput" placeholder="tu@correo.com" />
            </label>
            <p v-if="error" role="alert" class="m-0 text-sm text-danger">{{ error }}</p>
            <TpButton type="submit" block :disabled="busy || !email">{{ busy ? 'Enviando…' : 'Enviar enlace' }}</TpButton>
          </form>
          <TpButton v-if="sent" variant="secondary" block @click="go('login')">Volver a iniciar sesión</TpButton>
        </template>
      </div>

      <p class="mt-6 text-center text-xs text-ink-faint">TuPlataAlDia v{{ appVersion }} · Desarrollado por JeiXSoft</p>
      <p class="mt-2 flex justify-center gap-4 text-xs">
        <button type="button" :class="footLink" @click="openDoc = 'terminos'">Términos</button>
        <button type="button" :class="footLink" @click="openDoc = 'privacidad'">Privacidad</button>
      </p>
    </section>
  </div>
  <LegalSheet v-if="openDoc" :doc-key="openDoc" @close="openDoc = null" />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowLeft, Bell, Circle, CircleCheck, CreditCard, MailCheck, PiggyBank } from 'lucide-vue-next'
import PasswordField from './PasswordField.vue'
import GoogleBlock from './GoogleBlock.vue'
import TpButton from '@/components/tp/TpButton.vue'
import BankCardFace from '@/components/tp/BankCardFace.vue'
import { bankCardClass, type CardView } from '@/components/tp/cards'
import { bankById } from '@/components/tp/banks'
import { fieldInput, fieldLabel } from '@/components/tp/format'
import appIcon from '@/assets/brand/tuplata-app-icon.svg'
import symbol from '@/assets/brand/tuplata-symbol-dark.svg'
import { authErrorMessage, loginWithEmail, loginWithGoogle, registerWithEmail, resetPassword } from '@/services/auth.service'
import { saveConsents } from '@/services/consent.service'
import LegalSheet from '@/components/legal/LegalSheet.vue'
import type { LegalDocKey } from '@/legal/documents'

type View = 'welcome' | 'login' | 'register' | 'recover'

// En la web se llega desde la landing: el logo (escritorio) o la flecha (celular) vuelven a ella
defineProps<{ onHome?: () => void }>()

const appVersion = __APP_VERSION__
const isDesktop = window.matchMedia('(min-width: 1024px)').matches
// En escritorio la marca ya está a la izquierda: se empieza en iniciar sesión
const view = ref<View>(isDesktop ? 'login' : 'welcome')

const title = 'm-0 font-sans text-[28px]/[34px] font-semibold tracking-[-0.3px]'
const subtitle = 'm-0 text-base/6 text-ink-muted'
const backBtn =
  'grid size-10 shrink-0 cursor-pointer place-items-center rounded-full border border-line-strong text-ink transition-colors hover:bg-surface-200 [&_svg]:size-[18px]'
const demoCard = `${bankCardClass} h-[190px] shadow-float`

// Tarjetas de muestra (ejemplo, no son datos de nadie)
const demoCards: CardView[] = [
  { id: 'd1', bank: bankById('nu'), name: 'Nu', kind: 'Crédito', number: '•••• 4526', labelA: 'Pago mínimo', valueA: '$ 443.626', labelB: 'Fecha límite', valueB: '18 nov', rows: [] },
  { id: 'd2', bank: bankById('bancolombia'), name: 'Bancolombia', kind: 'Ahorros', number: '•••• 4521', labelA: 'Saldo', valueA: '$ 2.140.000', labelB: 'Movimientos del mes', valueB: '24', rows: [] }
]

const features = [
  { icon: CreditCard, title: 'Tarjetas cuadradas con el banco', text: 'Pago mínimo, cupo y fecha límite, desde tu extracto.' },
  { icon: Bell, title: 'Gastos que llegan solos', text: 'Desde las notificaciones del banco en tu celular.' },
  { icon: PiggyBank, title: 'Metas y un asesor que te avisa', text: 'Cuánto ahorrar por quincena y cuándo frenar.' }
]

const name = ref('')
const email = ref('')
const password = ref('')
const accepted = ref(false)
const busy = ref(false)
const error = ref('')
const sent = ref(false)
const openDoc = ref<LegalDocKey | null>(null)
const docLink = 'cursor-pointer p-0 font-semibold text-accent-light hover:underline'
const footLink = 'cursor-pointer p-1 text-ink-faint hover:text-ink'

function go(next: View) {
  error.value = ''
  sent.value = false
  view.value = next
}

async function run(action: () => Promise<void>) {
  busy.value = true
  error.value = ''
  try {
    await action()
  } catch (e) {
    error.value = authErrorMessage(e)
  } finally {
    busy.value = false
  }
}

const doLogin = () => run(() => loginWithEmail(email.value, password.value))
const doGoogle = () => run(() => loginWithGoogle())

// ---------- Crear cuenta ----------
const passwordRules = computed(() => [
  { label: '8 caracteres', ok: password.value.length >= 8 },
  { label: 'Un número', ok: /\d/.test(password.value) },
  { label: 'Una letra', ok: /[a-zA-ZñÑ]/.test(password.value) }
])
const canRegister = computed(
  () => !!name.value.trim() && /\S+@\S+\.\S+/.test(email.value) && passwordRules.value.every(r => r.ok) && accepted.value
)
// La casilla de términos y datos queda guardada como autorización (con fecha y versión)
const doRegister = () =>
  run(async () => {
    await registerWithEmail(name.value, email.value, password.value)
    await saveConsents(['terms', 'privacy']).catch(() => {})
  })

// ---------- Recuperar ----------
const doRecover = () =>
  run(async () => {
    await resetPassword(email.value)
    sent.value = true
  })
</script>
