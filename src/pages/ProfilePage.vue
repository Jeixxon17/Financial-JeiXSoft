<template>
  <TpLayout>
    <div class="flex flex-wrap items-center gap-3">
      <div class="min-w-0 flex-[1_1_220px]">
        <h1 :class="pageTitle">Perfil y ajustes</h1>
        <p class="mt-0.5 text-[13px]/[18px] text-ink-muted lg:text-sm">Tu seguridad, tus finanzas y la app.</p>
      </div>
    </div>

    <!-- Cuenta anterior (v1): actualizar el acceso -->
    <section v-if="authState.legacy" class="flex flex-col gap-3 rounded-card border border-primary bg-primary-soft/50 p-5 sm:flex-row sm:items-center">
      <span class="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-white [&_svg]:size-5">
        <ShieldCheck :stroke-width="1.75" aria-hidden="true" />
      </span>
      <span class="flex flex-1 flex-col gap-0.5">
        <strong class="text-[15px] font-semibold">Actualiza tu acceso</strong>
        <span class="text-[13px]/[19px] text-ink-muted">
          Hoy entras con el PIN como contraseña. Pasa a Google o correo, y el PIN queda solo como bloqueo.
        </span>
      </span>
      <TpButton size="sm" @click="showUpgrade = true">Actualizar</TpButton>
    </section>

    <!-- Tu cuenta -->
    <section class="flex items-center gap-3 rounded-card border border-line bg-surface-100 p-5">
      <span class="grid size-12 shrink-0 place-items-center rounded-full bg-surface-300 text-lg font-bold">{{ initials }}</span>
      <span class="flex min-w-0 flex-1 flex-col">
        <strong class="truncate text-base font-semibold">{{ authState.name || 'Mi cuenta' }}</strong>
        <small class="truncate text-[13px] text-ink-faint">{{ authState.legacy ? 'Cuenta anterior (entra con PIN)' : authState.email }}</small>
      </span>
      <TpButton size="sm" variant="secondary" @click="signOutUser">
        <LogOut :stroke-width="1.75" aria-hidden="true" />
        Cerrar sesión
      </TpButton>
    </section>

    <!-- Tu plan -->
    <section v-if="hasFullPlan" class="flex items-center gap-3 rounded-card border border-line bg-surface-100 p-5">
      <span class="grid size-12 shrink-0 place-items-center rounded-full bg-linear-135 from-accent-light to-primary text-white [&_svg]:size-[22px]">
        <BadgeCheck :stroke-width="1.9" aria-hidden="true" />
      </span>
      <span class="flex min-w-0 flex-1 flex-col">
        <strong class="text-base font-semibold">Plan Completo</strong>
        <small class="text-[13px] text-ink-faint">
          {{ authState.planInfo ? `Pago único el ${mediumDate(new Date(authState.planInfo.paidAt))} · sin más cobros` : 'Todo desbloqueado' }}
        </small>
      </span>
    </section>
    <section v-else class="flex flex-col gap-4 rounded-card border border-line bg-surface-100 p-5">
      <div class="flex items-center gap-3">
        <span class="flex min-w-0 flex-1 flex-col">
          <span :class="panelLabel">Tu plan</span>
          <strong class="text-base font-semibold">Plan Gratis</strong>
        </span>
        <span class="rounded-chip border border-line bg-surface-200 px-3 py-[5px] text-xs font-semibold text-ink-muted">Actual</span>
      </div>
      <div class="flex flex-col overflow-hidden rounded-tile border border-line">
        <div class="grid grid-cols-[minmax(0,1fr)_64px_72px] bg-surface-200 px-3.5 py-2 text-[11px] font-semibold tracking-[0.4px] text-ink-faint uppercase">
          <span>Qué incluye</span><span class="text-center">Gratis</span><span class="text-center">Completo</span>
        </div>
        <div
          v-for="row in planCompare"
          :key="row.label"
          class="grid grid-cols-[minmax(0,1fr)_64px_72px] items-center border-t border-line px-3.5 py-2.5 text-[13px] [&_svg]:mx-auto [&_svg]:size-4"
        >
          <span class="min-w-0">{{ row.label }}</span>
          <Check v-if="row.free" class="text-success" :stroke-width="2.4" aria-label="Incluido" />
          <Minus v-else class="text-ink-faint" :stroke-width="2" aria-label="No incluido" />
          <Check class="text-success" :stroke-width="2.4" aria-label="Incluido" />
        </div>
      </div>
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <span class="flex-1 text-[13px] text-ink-muted">{{ money(PLAN_PRICE) }} una sola vez. Sin mensualidades.</span>
        <TpButton @click="openUpgrade()">Desbloquear todo</TpButton>
      </div>
    </section>

    <div class="grid grid-cols-[minmax(0,1fr)] items-start gap-[18px] lg:grid-cols-2 lg:gap-5">
      <!-- Seguridad -->
      <section :class="panel">
        <span :class="panelLabel">Seguridad</span>
        <button type="button" :class="row" @click="showChangePin = true">
          <KeyRound :stroke-width="1.75" aria-hidden="true" />
          <span class="flex flex-1 flex-col"><strong class="font-medium">Cambiar PIN</strong><small :class="small">6 dígitos para abrir la app</small></span>
          <ChevronRight :stroke-width="1.75" aria-hidden="true" />
        </button>
        <button type="button" :class="row" @click="lockApp">
          <LockKeyhole :stroke-width="1.75" aria-hidden="true" />
          <span class="flex flex-1 flex-col"><strong class="font-medium">Bloquear ahora</strong><small :class="small">{{ authState.legacy ? 'Cierra la sesión: vuelves a entrar con tu PIN' : 'También se bloquea sola tras 5 min en segundo plano' }}</small></span>
        </button>
      </section>

      <!-- Salud financiera -->
      <section :class="[panel, 'gap-3']">
        <span :class="panelLabel">Salud financiera</span>
        <div class="flex items-center gap-4">
          <strong class="text-[32px]/10 font-semibold tabular-nums" :class="health.class">{{ store.financialHealth }}%</strong>
          <span class="text-sm text-ink-muted">{{ health.text }}</span>
        </div>
        <span class="h-2 overflow-hidden rounded-full bg-surface-300">
          <span class="block h-full rounded-full" :class="health.bar" :style="{ width: `${store.financialHealth}%` }" />
        </span>
        <RouterLink to="/analytics" class="text-[13px] font-medium text-ink no-underline hover:text-accent-light">Ver estadísticas</RouterLink>
      </section>

      <!-- Mis finanzas -->
      <section :class="panel">
        <span :class="panelLabel">Mis finanzas</span>
        <RouterLink v-for="link in financeLinks" :key="link.to" :to="link.to" :class="row">
          <component :is="link.icon" :stroke-width="1.75" aria-hidden="true" />
          <span class="flex flex-1 flex-col"><strong class="font-medium">{{ link.label }}</strong><small :class="small">{{ link.hint }}</small></span>
          <ChevronRight :stroke-width="1.75" aria-hidden="true" />
        </RouterLink>
      </section>

      <!-- Acerca de -->
      <section :class="[panel, 'gap-3']">
        <span :class="panelLabel">Acerca de</span>
        <div class="flex items-center gap-3">
          <img :src="appIcon" alt="" width="48" height="48" class="size-12 rounded-tile" />
          <span class="flex flex-col">
            <strong class="text-base font-semibold">TuPlata<span class="text-accent-light">AlDia</span></strong>
            <small :class="small">Versión {{ appVersion }}</small>
          </span>
        </div>
        <div class="flex items-center gap-2.5 border-t border-line pt-3 text-[13px] text-ink-muted">
          <img :src="jeixLogo" alt="JeiXSoft" class="h-6 w-auto" />
          Desarrollado por JeiXSoft
        </div>
      </section>

      <!-- Privacidad y datos: documentos, autorizaciones y eliminar la cuenta -->
      <section :class="[panel, 'lg:col-span-2']">
        <span :class="panelLabel">Privacidad y datos</span>
        <button v-for="d in legalDocs" :key="d.key" type="button" :class="row" @click="openDoc = d.key">
          <component :is="d.icon" :stroke-width="1.75" aria-hidden="true" />
          <span class="flex flex-1 flex-col"><strong class="font-medium">{{ d.label }}</strong><small :class="small">{{ d.hint }}</small></span>
          <ChevronRight :stroke-width="1.75" aria-hidden="true" />
        </button>
        <div v-for="c in consentRows" :key="c.key" :class="infoRow">
          <ShieldCheck :stroke-width="1.75" aria-hidden="true" />
          <span class="flex min-w-0 flex-1 flex-col">
            <strong class="font-medium">{{ c.label }}</strong>
            <small :class="small">{{ c.state }}</small>
          </span>
          <TpButton v-if="c.revocable" size="sm" variant="secondary" :disabled="revoking === c.key" @click="toRevoke = c.key">Retirar</TpButton>
        </div>
        <button type="button" :class="dangerRow" @click="showDelete = true">
          <UserX :stroke-width="1.75" aria-hidden="true" />
          <span class="flex flex-1 flex-col"><strong class="font-medium">Eliminar mi cuenta</strong><small :class="small">Borra tu cuenta y todos tus datos</small></span>
          <ChevronRight :stroke-width="1.75" aria-hidden="true" />
        </button>
      </section>
    </div>
  </TpLayout>

  <ChangePinModal v-if="showChangePin" @close="showChangePin = false" />
  <UpgradeAccessSheet v-if="showUpgrade" @close="showUpgrade = false" />
  <LegalSheet v-if="openDoc" :doc-key="openDoc" @close="openDoc = null" />
  <DeleteAccountSheet v-if="showDelete" @close="showDelete = false" />
  <TpConfirm
    v-if="toRevoke"
    title="¿Retirar la autorización?"
    :text="revokeText"
    confirm-label="Sí, retirar"
    busy-label="Retirando…"
    :busy="!!revoking"
    @confirm="revoke"
    @cancel="toRevoke = null"
  />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  BadgeCheck,
  CalendarDays,
  Check,
  ChevronRight,
  FileText,
  KeyRound,
  LockKeyhole,
  LogOut,
  Minus,
  Repeat,
  ShieldCheck,
  Tags,
  UserX
} from 'lucide-vue-next'
import TpConfirm from '@/components/tp/TpConfirm.vue'
import LegalSheet from '@/components/legal/LegalSheet.vue'
import DeleteAccountSheet from '@/components/legal/DeleteAccountSheet.vue'
import type { LegalDocKey } from '@/legal/documents'
import { consentLabels, featureConsents, type ConsentKey } from '@/legal/legal'
import { hasConsent, revokeConsent } from '@/services/consent.service'
import { mediumDate, money } from '@/components/tp/format'
import { PLAN_PRICE, hasFullPlan, openUpgrade } from '@/services/plan.service'
import TpButton from '@/components/tp/TpButton.vue'
import UpgradeAccessSheet from '@/components/security/UpgradeAccessSheet.vue'
import TpLayout from '@/layouts/TpLayout.vue'
import ChangePinModal from '@/components/security/ChangePinModal.vue'
import appIcon from '@/assets/brand/tuplata-app-icon.svg'
import jeixLogo from '@/assets/LogoFx.png'
import { authState, lockApp, signOutUser } from '@/services/auth.service'
import { useFinanceStore } from '@/stores/finance'

const store = useFinanceStore()
const appVersion = __APP_VERSION__
const showChangePin = ref(false)
const showUpgrade = ref(false)

// ---------- Privacidad y datos ----------
const openDoc = ref<LegalDocKey | null>(null)
const showDelete = ref(false)
const toRevoke = ref<ConsentKey | null>(null)
const revoking = ref<ConsentKey | null>(null)

const legalDocs = [
  { key: 'terminos' as const, label: 'Términos y condiciones', hint: 'Lo que aceptaste al usar la app', icon: FileText },
  { key: 'privacidad' as const, label: 'Política de privacidad', hint: 'Qué datos guardamos y tus derechos', icon: FileText }
]

// Autorizaciones dadas: términos y privacidad no se retiran aquí (para eso, eliminar la cuenta)
const consentRows = computed(() =>
  (Object.keys(consentLabels) as ConsentKey[])
    .filter(key => authState.consents[key])
    .map(key => {
      const record = authState.consents[key] as { acceptedAt: string; revokedAt?: string }
      const active = hasConsent(key)
      return {
        key,
        label: consentLabels[key],
        state: record.revokedAt
          ? `Retirada el ${mediumDate(new Date(record.revokedAt))}`
          : `Autorizada el ${mediumDate(new Date(record.acceptedAt))}${active ? '' : ' (versión anterior)'}`,
        revocable: active && key !== 'terms' && key !== 'privacy'
      }
    })
)

const revokeText = computed(() =>
  toRevoke.value && toRevoke.value !== 'terms' && toRevoke.value !== 'privacy' ? featureConsents[toRevoke.value].revokeNote : ''
)

async function revoke() {
  if (!toRevoke.value) return
  revoking.value = toRevoke.value
  try {
    await revokeConsent(toRevoke.value)
  } finally {
    revoking.value = null
    toRevoke.value = null
  }
}

// Plan Gratis contra plan Completo
const planCompare = [
  { label: 'Cuentas, tarjetas y movimientos', free: true },
  { label: 'Quincenas y categorías', free: true },
  { label: 'Gastos que llegan solos (SMS)', free: false },
  { label: 'Presupuesto, metas y asesor', free: false },
  { label: 'Gastos automáticos', free: false },
  { label: 'Extractos y estadísticas', free: false }
]

const initials = computed(() =>
  (authState.name || authState.email || '?')
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() || '')
    .join('')
)

const pageTitle = 'm-0 font-sans text-xl/[26px] font-semibold lg:text-[26px]/8 lg:tracking-[-0.3px]'
const panel = 'flex flex-col rounded-card border border-line bg-surface-100 p-5'
const panelLabel = 'mb-1 text-sm font-medium text-ink-muted'
const small = 'text-xs text-ink-faint'
const row =
  'flex min-h-14 w-full cursor-pointer items-center gap-3 border-b border-line py-2 text-left text-[15px] text-ink no-underline last:border-b-0 hover:text-accent-light [&>svg]:size-5 [&>svg]:shrink-0 [&>svg]:text-ink-muted'

// Variantes de la fila: sin enlace (autorizaciones) y en rojo (eliminar la cuenta)
const infoRow = row.replace('cursor-pointer ', '').replace(' hover:text-accent-light', '')
const dangerRow = row.replace('text-ink ', 'text-danger ').replace('hover:text-accent-light', 'hover:opacity-80').replace('[&>svg]:text-ink-muted', '[&>svg]:text-danger')

const financeLinks = [
  { to: '/paychecks', label: 'Quincenas y salario', hint: 'Salario, deducciones y obligaciones', icon: CalendarDays },
  { to: '/categories', label: 'Categorías', hint: 'Para ordenar tus movimientos', icon: Tags },
  { to: '/recurring', label: 'Gastos automáticos', hint: 'Suscripciones que se registran solas', icon: Repeat }
]

const health = computed(() => {
  // Mismos umbrales que Estadísticas
  const h = store.financialHealth
  if (h >= 80) return { text: 'Excelentes hábitos financieros', class: 'text-success', bar: 'bg-success' }
  if (h >= 60) return { text: 'Buen manejo del dinero', class: 'text-success', bar: 'bg-success' }
  if (h >= 40) return { text: 'Hay cosas por mejorar', class: 'text-warning', bar: 'bg-warning' }
  return { text: 'Requiere atención', class: 'text-danger', bar: 'bg-danger' }
})
</script>
