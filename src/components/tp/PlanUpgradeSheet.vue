<template>
  <!-- "Mejora tu plan" → "Pagar": un solo pago de $ 50.000 para desbloquear todo -->
  <TpSheet :title="step === 'offer' ? '' : 'Pagar plan Completo'" :wide="step === 'offer'" @close="close">
    <template v-if="step === 'offer'" #head>
      <div class="flex flex-col gap-2.5">
        <span :class="chip">Plan Completo</span>
        <h2 class="m-0 font-sans text-[22px]/7 font-semibold">Desbloquea todo, una sola vez</h2>
      </div>
    </template>

    <!-- ===== Oferta ===== -->
    <div v-if="step === 'offer'" class="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start">
      <div class="flex flex-col">
        <div v-for="b in planBenefits" :key="b.key" class="flex items-center gap-3 py-2.5">
          <span class="grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft text-accent-light [&_svg]:size-4">
            <component :is="benefitIcon[b.key]" :stroke-width="1.9" aria-hidden="true" />
          </span>
          <span class="flex flex-col">
            <strong class="text-sm font-semibold" :class="{ 'text-accent-light': b.key === planUi.from }">{{ b.title }}</strong>
            <small class="text-xs text-ink-faint">{{ b.text }}</small>
          </span>
        </div>
      </div>
      <div class="flex flex-col gap-3">
        <PlanPrice />
        <p class="m-0 text-xs/[17px] text-ink-faint">
          Lo que ya usas (cuentas, tarjetas, movimientos, quincenas y categorías) sigue gratis.
        </p>
      </div>
    </div>

    <!-- ===== Pagar ===== -->
    <template v-else>
      <div class="flex flex-col rounded-card border border-line bg-surface-100 px-4">
        <div v-for="row in summary" :key="row.label" class="flex justify-between gap-3 border-b border-line py-2.5 text-sm text-ink-muted last:border-b-0">
          <span>{{ row.label }}</span><strong class="font-semibold" :class="row.class || 'text-ink'">{{ row.value }}</strong>
        </div>
      </div>
      <span :class="fieldLabel">Puedes pagar con</span>
      <div class="grid grid-cols-2 gap-2">
        <span v-for="m in methods" :key="m.name" class="flex items-center gap-2.5 rounded-tile border border-line bg-surface-200 px-3 py-2.5 text-[13px] font-medium">
          <span class="grid size-8 shrink-0 place-items-center rounded-[30%] text-[11px] font-extrabold" :style="{ background: m.bg, color: m.ink }">{{ m.mark }}</span>
          {{ m.name }}
        </span>
      </div>
      <p class="m-0 flex gap-2 text-xs/[17px] text-ink-faint [&_svg]:size-4 [&_svg]:shrink-0">
        <ShieldCheck :stroke-width="1.9" aria-hidden="true" />
        Pagas en la página segura de Wompi (Bancolombia). TuPlataAlDia no ve ni guarda los datos de tu tarjeta o cuenta. Al
        aprobarse, todo se desbloquea solo.
      </p>
      <!-- Ley 1480 art. 47: informar que el plan empieza a prestarse al pagar (no aplica retracto) -->
      <p class="m-0 text-xs/[17px] text-ink-faint">
        Al pagar aceptas que el plan se active de inmediato; por eso, una vez activado, no aplica el derecho de retracto. Si no
        se activa o hay un cobro de más, te devolvemos el dinero. Ver
        <button type="button" class="cursor-pointer p-0 font-semibold text-accent-light hover:underline" @click="showTerms = true">Términos y condiciones</button>.
      </p>
      <p v-if="error" role="alert" class="m-0 text-sm text-danger">{{ error }}</p>
    </template>

    <template #footer>
      <template v-if="step === 'offer'">
        <TpButton variant="ghost" class="shrink-0 whitespace-nowrap lg:min-w-28" @click="close">Ahora no</TpButton>
        <TpButton block class="lg:w-auto lg:min-w-48" @click="step = 'pay'">Pagar {{ money(PLAN_PRICE) }}</TpButton>
      </template>
      <template v-else>
        <TpButton variant="ghost" :disabled="busy" @click="step = 'offer'">Atrás</TpButton>
        <TpButton block class="lg:w-auto lg:min-w-56" :disabled="busy" @click="pay">
          {{ busy ? 'Abriendo el pago…' : `Continuar al pago · ${money(PLAN_PRICE)}` }}
        </TpButton>
      </template>
    </template>
  </TpSheet>
  <LegalSheet v-if="showTerms" doc-key="terminos" @close="showTerms = false" />
</template>

<script setup lang="ts">
import { ref, type Component } from 'vue'
import { ChartPie, FileText, Inbox, ChartNoAxesColumn, MapPin, Repeat, ShieldCheck } from 'lucide-vue-next'
import TpSheet from './TpSheet.vue'
import TpButton from './TpButton.vue'
import PlanPrice from './PlanPrice.vue'
import LegalSheet from '@/components/legal/LegalSheet.vue'
import { fieldLabel, money } from './format'
import { bankById } from './banks'
import { PLAN_PRICE, planBenefits, planUi, startCheckout } from '@/services/plan.service'

const chip = 'inline-flex self-start items-center rounded-chip border border-line bg-primary-soft px-3 py-[5px] text-xs font-semibold text-accent-light'

const benefitIcon: Record<string, Component> = {
  inbox: Inbox,
  budgets: ChartNoAxesColumn,
  recurring: Repeat,
  statements: FileText,
  analytics: ChartPie,
  events: MapPin
}

const step = ref<'offer' | 'pay'>('offer')
const busy = ref(false)
const error = ref('')
const showTerms = ref(false)

const summary = [
  { label: 'Plan Completo', value: money(PLAN_PRICE) },
  { label: 'Tipo de pago', value: 'Único, para siempre' },
  { label: 'Cobros después', value: 'Ninguno', class: 'text-success' }
]

const nequi = bankById('nequi')
const bancolombia = bankById('bancolombia')
const methods = [
  { name: 'Nequi', mark: 'N', bg: nequi?.color, ink: nequi?.ink },
  { name: 'PSE', mark: 'PSE', bg: '#253157', ink: '#b9cbff' },
  { name: 'Tarjeta', mark: 'TC', bg: '#253157', ink: '#b9cbff' },
  { name: 'Botón Bancolombia', mark: 'B', bg: bancolombia?.color, ink: bancolombia?.ink }
]

function close() {
  if (busy.value) return
  planUi.open = false
}

async function pay() {
  busy.value = true
  error.value = ''
  try {
    await startCheckout()
  } catch (e) {
    const code = (e as { code?: string }).code
    error.value =
      code === 'tp/payments-not-configured'
        ? 'El pago todavía no está configurado en esta versión de la app.'
        : 'No se pudo abrir el pago. Revisa tu internet e intenta de nuevo.'
    busy.value = false
  }
}
</script>
