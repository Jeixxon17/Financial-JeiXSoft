<template>
  <!-- A esta pantalla vuelve Wompi después de pagar (?id=<transacción>) -->
  <TpLayout>
    <div class="mx-auto flex w-full max-w-[460px] flex-col items-center gap-4 py-6 text-center">
      <!-- Ya desbloqueado -->
      <template v-if="hasFullPlan">
        <div class="relative grid size-28 place-items-center">
          <span class="absolute inset-0 animate-ring rounded-full border-2 border-accent-light motion-reduce:animate-none" />
          <span class="grid size-24 animate-pop place-items-center rounded-full bg-linear-135 from-accent-light to-primary shadow-card motion-reduce:animate-none">
            <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M5 12.5l4.5 4.5L19 7.5" class="animate-draw [stroke-dasharray:60] [stroke-dashoffset:60] motion-reduce:animate-none motion-reduce:[stroke-dashoffset:0]" />
            </svg>
          </span>
        </div>
        <span :class="chip">Plan Completo</span>
        <h1 class="m-0 font-sans text-[26px]/8 font-semibold">¡Ya tienes todo!</h1>
        <p class="m-0 text-[15px]/[22px] text-ink-muted">Pagaste {{ money(PLAN_PRICE) }} una sola vez. Nunca más te volvemos a cobrar.</p>
        <div class="flex flex-col gap-2.5 self-stretch py-1 text-left">
          <span v-for="b in planBenefits" :key="b.key" class="flex items-center gap-2.5 text-sm font-medium [&_svg]:size-[18px] [&_svg]:shrink-0 [&_svg]:text-success">
            <Check :stroke-width="2.4" aria-hidden="true" />{{ b.title }}
          </span>
        </div>
        <div v-if="receipt.length" class="flex flex-col self-stretch rounded-card border border-line bg-surface-100 px-4 text-left">
          <div v-for="row in receipt" :key="row.label" class="flex justify-between gap-3 border-b border-dashed border-line py-2.5 text-[13px] text-ink-muted last:border-b-0">
            <span class="shrink-0">{{ row.label }}</span><strong class="min-w-0 truncate font-semibold text-ink" :title="row.value">{{ row.value }}</strong>
          </div>
        </div>
        <TpButton to="/dashboard" block>Empezar a usarlo</TpButton>
      </template>

      <!-- Rechazado -->
      <template v-else-if="status === 'DECLINED' || status === 'VOIDED' || status === 'ERROR'">
        <span class="grid size-16 place-items-center rounded-full bg-surface-200 text-danger [&_svg]:size-7"><CircleX :stroke-width="1.75" aria-hidden="true" /></span>
        <h1 class="m-0 font-sans text-2xl font-semibold">El pago no se aprobó</h1>
        <p class="m-0 text-[15px]/[22px] text-ink-muted">No se hizo ningún cobro. Puedes intentarlo otra vez, con el mismo u otro medio de pago.</p>
        <TpButton block @click="openUpgrade()">Intentar de nuevo</TpButton>
        <TpButton to="/dashboard" variant="ghost" block>Volver al inicio</TpButton>
      </template>

      <!-- Esperando la confirmación -->
      <template v-else>
        <span class="grid size-16 place-items-center rounded-full bg-primary-soft text-accent-light [&_svg]:size-7">
          <LoaderCircle class="animate-spin motion-reduce:animate-none" :stroke-width="1.75" aria-hidden="true" />
        </span>
        <h1 class="m-0 font-sans text-2xl font-semibold">Confirmando tu pago…</h1>
        <p class="m-0 text-[15px]/[22px] text-ink-muted">
          {{ slow ? 'Está tardando más de lo normal. Puedes seguir usando la app: apenas se apruebe, todo se desbloquea solo.' : 'Esto tarda unos segundos. No cierres la app.' }}
        </p>
        <TpButton v-if="slow" to="/dashboard" variant="secondary" block>Seguir usando la app</TpButton>
      </template>
    </div>
  </TpLayout>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { Check, CircleX, LoaderCircle } from 'lucide-vue-next'
import TpLayout from '@/layouts/TpLayout.vue'
import TpButton from '@/components/tp/TpButton.vue'
import { mediumDate, money } from '@/components/tp/format'
import { authState } from '@/services/auth.service'
import { PLAN_PRICE, hasFullPlan, methodName, openUpgrade, planBenefits, transactionStatus, type TransactionStatus } from '@/services/plan.service'

const chip = 'inline-flex items-center rounded-chip border border-line bg-primary-soft px-3 py-[5px] text-xs font-semibold text-accent-light'

const route = useRoute()
// Wompi agrega ?id=<transacción> a la dirección de regreso (dentro del # o antes, según el navegador)
const transactionId =
  (typeof route.query.id === 'string' ? route.query.id : '') || new URLSearchParams(window.location.search).get('id') || ''
const status = ref<TransactionStatus | ''>('')
const method = ref('')
const slow = ref(false)

const receipt = computed(() => {
  const info = authState.planInfo
  if (!info) return []
  const rows = [{ label: 'Referencia', value: info.reference }]
  if (info.method || method.value) rows.push({ label: 'Pagado con', value: methodName(info.method || method.value) })
  rows.push({ label: 'Fecha', value: mediumDate(new Date(info.paidAt)) })
  return rows
})

// Se pregunta a Wompi cómo va la transacción mientras llega el aviso al servicio de pagos
let timer: ReturnType<typeof setInterval> | null = null
let slowTimer: ReturnType<typeof setTimeout> | null = null

async function check() {
  if (!transactionId || hasFullPlan.value) return
  const result = await transactionStatus(transactionId)
  if (!result) return
  status.value = result.status
  method.value = result.method || ''
  if (result.status !== 'PENDING' && timer) {
    clearInterval(timer)
    timer = null
  }
}

onMounted(() => {
  check()
  timer = setInterval(check, 4000)
  slowTimer = setTimeout(() => (slow.value = true), 25000)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
  if (slowTimer) clearTimeout(slowTimer)
})
</script>
