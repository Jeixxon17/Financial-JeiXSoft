<template>
  <TpSheet :title="account ? `Editar ${account.name}` : 'Nueva cuenta'" wide @close="emit('close')">
    <!-- Tipo -->
    <div class="flex flex-col gap-2">
      <span :class="fieldLabel">¿Qué es?</span>
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <button
          v-for="k in kinds"
          :key="k.value"
          type="button"
          class="flex min-h-14 cursor-pointer items-center gap-2.5 rounded-tile border px-3 text-left text-sm font-semibold transition-colors [&_svg]:size-[18px] [&_svg]:shrink-0"
          :class="form.type === k.value ? 'border-primary bg-primary-soft text-ink' : 'border-line bg-surface-200 text-ink-muted hover:text-ink'"
          :aria-pressed="form.type === k.value"
          @click="form.type = k.value"
        >
          <component :is="k.icon" :stroke-width="1.75" aria-hidden="true" />
          {{ k.label }}
        </button>
      </div>
    </div>

    <!-- Banco (del catálogo): da el distintivo y el color de la tarjeta -->
    <div v-if="form.type !== 'cash'" class="flex flex-col gap-2">
      <span :class="fieldLabel">Banco</span>
      <div class="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
        <button
          v-for="b in bankChoices"
          :key="b.id || 'otro'"
          type="button"
          class="flex min-h-[78px] min-w-0 cursor-pointer flex-col items-center gap-1.5 rounded-tile border px-1 pt-2 pb-1.5 transition-colors"
          :class="form.bank === b.id ? 'border-primary bg-primary-soft text-ink' : 'border-transparent text-ink-muted hover:bg-surface-200 hover:text-ink'"
          :aria-pressed="form.bank === b.id"
          @click="pickBank(b)"
        >
          <BankBadge :bank="b.id ? b : undefined" :size="34" />
          <span class="line-clamp-2 w-full text-center text-[11px]/[14px] font-medium hyphens-auto">{{ b.id ? shortName(b) : 'Otro' }}</span>
        </button>
      </div>
    </div>
    <div class="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
      <label class="flex flex-col gap-1.5">
        <span :class="fieldLabel">Nombre</span>
        <input v-model="form.name" :class="fieldInput" placeholder="Ej: Bancolombia ahorros" />
      </label>
      <label class="flex flex-col gap-1.5">
        <span :class="fieldLabel">Últimos 4 dígitos</span>
        <input v-model="form.lastDigits" inputmode="numeric" maxlength="4" :class="fieldInput" placeholder="Ej: 1234" />
        <small :class="hint">Para reconocerla en las notificaciones del banco.</small>
      </label>
      <label v-if="form.type !== 'credit'" class="flex flex-col gap-1.5">
        <span :class="fieldLabel">Saldo inicial</span>
        <input v-model.number="form.balance" type="number" :class="fieldInput" placeholder="0" />
      </label>
    </div>

    <!-- ===== Tarjeta de crédito ===== -->
    <template v-if="form.type === 'credit'">
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <label class="flex flex-col gap-1.5">
          <span :class="fieldLabel">Cupo total</span>
          <input v-model.number="form.creditLimit" type="number" min="0" :class="fieldInput" placeholder="0" />
        </label>
        <label class="flex flex-col gap-1.5">
          <span :class="fieldLabel">Día de corte</span>
          <input v-model.number="form.cutoffDate" type="number" min="1" max="31" :class="fieldInput" placeholder="15" />
        </label>
        <label class="flex flex-col gap-1.5">
          <span :class="fieldLabel">Día de pago</span>
          <input v-model.number="form.paymentDate" type="number" min="1" max="31" :class="fieldInput" placeholder="25" />
        </label>
        <label class="flex flex-col gap-1.5">
          <span :class="fieldLabel">Interés mensual a cuotas (%)</span>
          <input v-model.number="form.interestRate" type="number" min="0" step="0.0001" :class="fieldInput" placeholder="Ej: 2,1593" />
        </label>
        <label class="flex flex-col gap-1.5">
          <span :class="fieldLabel">Cuotas sin interés (hasta)</span>
          <input v-model.number="form.interestFreeInstallments" type="number" min="0" max="48" :class="fieldInput" placeholder="Ej: 3" />
        </label>
        <label class="flex flex-col gap-1.5">
          <span :class="fieldLabel">Comisión en dólares (%)</span>
          <input v-model.number="form.fxFeeRate" type="number" min="0" step="0.01" :class="fieldInput" placeholder="Ej: 0,45" />
        </label>
      </div>

      <!-- Cuadrar con lo que dice el banco (solo al editar) -->
      <section v-if="account" class="flex flex-col gap-3 rounded-card border border-line bg-surface-200/40 p-4">
        <div>
          <span class="block text-sm font-semibold">Ajustar con el banco</span>
          <span :class="hint">Escribe lo que dice el banco; la app ajusta la diferencia.</span>
        </div>
        <label class="flex flex-col gap-1.5">
          <span :class="fieldLabel">Pago mínimo del extracto (corte {{ currentCutoffLabel || '—' }})</span>
          <input v-model.number="form.statementMinimum" type="number" min="0" :class="fieldInput" placeholder="Lo que dice el banco" />
          <small :class="hint">Si el banco cobra intereses o comisiones, escribe el mínimo real.</small>
        </label>
        <div class="grid grid-cols-2 gap-3">
          <label class="flex flex-col gap-1.5">
            <span :class="fieldLabel">Deuda total según el banco</span>
            <input v-model.number="form.reportedDebt" type="number" :class="fieldInput" :placeholder="money(currentDebt)" />
          </label>
          <label class="flex flex-col gap-1.5">
            <span :class="fieldLabel">Cuotas de la diferencia</span>
            <input v-model.number="form.reportedDebtInstallments" type="number" min="1" :class="fieldInput" placeholder="1" />
          </label>
        </div>
        <small :class="hint">
          La app lleva {{ money(currentDebt) }}. Si el banco dice otra cosa, la diferencia se guarda como compra diferida y se
          factura por cuotas desde el próximo corte.
        </small>

        <div v-if="listedDeferred.length" class="flex flex-col gap-2">
          <span :class="fieldLabel">Deuda diferida</span>
          <div v-for="debt in listedDeferred" :key="debt.id" class="flex items-center gap-2 rounded-tile bg-surface-100 px-3 py-2 text-sm">
            <span class="min-w-0 flex-1 truncate">{{ debt.description }} · {{ money(debt.amount) }}</span>
            <input v-model.number="debt.installments" type="number" min="1" aria-label="Cuotas" :class="[fieldInput, 'max-w-20']" />
            <span class="text-xs text-ink-faint">cuotas</span>
            <button
              type="button"
              class="grid grid-cols-[minmax(0,1fr)] size-9 cursor-pointer place-items-center rounded-full text-ink-faint hover:bg-surface-200 hover:text-danger [&_svg]:size-4"
              aria-label="Quitar"
              @click="removeDeferred(debt.id)"
            >
              <Trash2 :stroke-width="1.75" aria-hidden="true" />
            </button>
          </div>
        </div>

        <label class="flex flex-col gap-1.5">
          <span :class="fieldLabel">Cupo gastado según el banco (hoy)</span>
          <input v-model.number="form.reportedLimitUsed" type="number" min="0" :class="fieldInput" :placeholder="money(currentLimitUsed)" />
          <small :class="hint">
            Opcional, ej: "Cupo que has gastado" en ADDI. Desde ahí suben las compras y cada pago libera cupo.
          </small>
        </label>
      </section>

      <!-- Crédito aparte del cupo (ej: Crédito Grande de ADDI) -->
      <details class="group rounded-card border border-line bg-surface-200/40 p-4" :open="!!form.separatePending">
        <summary class="cursor-pointer list-none">
          <span class="block text-sm font-semibold">Crédito aparte del cupo (opcional)</span>
          <span :class="hint">Ej: el Crédito Grande de ADDI. Cuenta como deuda y entra en el mínimo, pero no gasta cupo.</span>
        </summary>
        <div class="mt-3 grid grid-cols-2 gap-3">
          <label class="flex flex-col gap-1.5">
            <span :class="fieldLabel">Nombre</span>
            <input v-model="form.separateName" :class="fieldInput" placeholder="Crédito Grande" />
          </label>
          <label class="flex flex-col gap-1.5">
            <span :class="fieldLabel">Nombre en el extracto</span>
            <input v-model="form.separateStatementName" :class="fieldInput" placeholder="Ej: Marketplace Addi" />
          </label>
          <label class="flex flex-col gap-1.5">
            <span :class="fieldLabel">Capital pendiente</span>
            <input v-model.number="form.separatePending" type="number" min="0" :class="fieldInput" placeholder="0" />
          </label>
          <label class="flex flex-col gap-1.5">
            <span :class="fieldLabel">Cuotas que faltan</span>
            <input v-model.number="form.separateInstallments" type="number" min="1" :class="fieldInput" placeholder="1" />
          </label>
        </div>
      </details>
    </template>

    <template #footer>
      <div class="hidden lg:block"><TpButton variant="ghost" @click="emit('close')">Cancelar</TpButton></div>
      <TpButton block class="lg:w-auto lg:min-w-44" :disabled="!form.name.trim() || saving" @click="save">
        {{ saving ? 'Guardando…' : account ? 'Guardar cambios' : 'Agregar cuenta' }}
      </TpButton>
    </template>
  </TpSheet>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { Banknote, CreditCard, Landmark, Wallet, Trash2 } from 'lucide-vue-next'
import TpSheet from './TpSheet.vue'
import TpButton from './TpButton.vue'
import BankBadge from './BankBadge.vue'
import { bankById, banks, bankOf, otherBank, type Bank } from './banks'
import { fieldInput, fieldLabel, money } from './format'
import { useFinanceStore } from '@/stores/finance'
import { calculateCreditStatement } from '@/utils/creditStatement'
import { dateInMonth, parseISODate, toISODate, todayISO } from '@/utils/dates'
import type { Account, DeferredDebt } from '@/interfaces'

const props = defineProps<{ account?: Account | null }>()
const emit = defineEmits<{ close: []; saved: [] }>()
const store = useFinanceStore()

const hint = 'text-xs text-ink-faint'

const kinds: { value: Account['type']; label: string; icon: unknown }[] = [
  { value: 'savings', label: 'Ahorros', icon: Landmark },
  { value: 'debit', label: 'Débito', icon: Wallet },
  { value: 'credit', label: 'Tarjeta de crédito', icon: CreditCard },
  { value: 'cash', label: 'Efectivo', icon: Banknote }
]

const defaultForm = () => ({
  name: '',
  bank: '',
  type: 'savings' as Account['type'],
  balance: 0,
  color: '#4f6fdc',
  icon: '🏦',
  creditLimit: 0,
  usedCredit: 0,
  cutoffDate: 15,
  paymentDate: 25,
  interestRate: 0,
  interestFreeInstallments: 0,
  fxFeeRate: 0,
  lastDigits: '',
  statementMinimums: {} as Record<string, number>,
  statementMinimum: 0,
  deferredDebts: [] as DeferredDebt[],
  limitUsedAnchor: undefined as Account['limitUsedAnchor'],
  reportedDebt: null as number | null,
  reportedDebtInstallments: 1,
  separateName: '',
  separateStatementName: '',
  separatePending: 0,
  separateInstallments: 1,
  reportedLimitUsed: null as number | null
})

const form = reactive(defaultForm())
const saving = ref(false)

// ---------- Banco ----------
// Efectivo no va en la lista: se elige con el tipo
const bankChoices = computed(() => [...banks.filter(b => b.id !== 'cash'), otherBank])
const shortName = (b: Bank) => b.name.replace(/^Banco (de )?/, '').replace(/ \(.*\)$/, '')

function pickBank(b: Bank) {
  const previous = bankById(form.bank)
  form.bank = b.id
  // Si el nombre estaba vacío o era el del banco anterior, se pone el del nuevo
  if (!form.name.trim() || (previous && form.name.trim() === previous.name)) form.name = b.id ? b.name : form.name
}

// Último corte cerrado de la tarjeta que se está editando
const currentCutoff = computed(() => {
  if (!props.account || form.type !== 'credit' || !form.cutoffDate) return null
  const { lastCutoff } = calculateCreditStatement({ ...props.account, cutoffDate: form.cutoffDate }, [])
  return lastCutoff ? toISODate(lastCutoff) : null
})

const currentCutoffLabel = computed(() => (currentCutoff.value ? currentCutoff.value.split('-').reverse().join('/') : ''))

const sumDeferred = (debts: DeferredDebt[] = []) => debts.reduce((s, d) => s + d.amount, 0)

// Deuda que lleva la app, con la deuda diferida tal como está en el formulario
const currentDebt = computed(() => {
  if (!props.account) return 0
  return store.calculateAccountBalance(props.account.id).usedCredit - sumDeferred(props.account.deferredDebts) + sumDeferred(form.deferredDebts)
})

const currentLimitUsed = computed(() => (props.account ? store.calculateAccountBalance(props.account.id).limitUsed : 0))

// El crédito aparte del cupo se edita con sus propios campos
const listedDeferred = computed(() => form.deferredDebts.filter(d => !d.outsideLimit))

function removeDeferred(id: string) {
  form.deferredDebts = form.deferredDebts.filter(d => d.id !== id)
}

// Un día antes del corte: la compra se factura en ese corte
function dayBefore(iso: string): string {
  const date = parseISODate(iso)
  date.setDate(date.getDate() - 1)
  return toISODate(date)
}

// Al editar se llena con la cuenta
if (props.account) {
  const acc = props.account
  Object.assign(form, defaultForm(), acc)
  form.deferredDebts = (acc.deferredDebts || []).map(d => ({ ...d }))
  const separate = acc.deferredDebts?.find(d => d.outsideLimit)
  if (separate) {
    form.separateName = separate.description
    form.separateStatementName = separate.statementName || ''
    form.separatePending = separate.amount
    form.separateInstallments = separate.installments
  }
  form.statementMinimum = currentCutoff.value ? acc.statementMinimums?.[currentCutoff.value] || 0 : 0
  // Cuentas viejas sin banco: se propone el que se reconoce en el nombre
  if (!acc.bank) form.bank = bankOf(acc)?.id || ''
}

async function save() {
  if (!form.name.trim() || saving.value) return
  saving.value = true
  try {
    const {
      statementMinimum, reportedDebt, reportedDebtInstallments,
      separateName, separateStatementName, separatePending, separateInstallments, reportedLimitUsed, ...data
    } = form
    data.name = data.name.trim()
    if (reportedLimitUsed != null && reportedLimitUsed >= 0 && data.type === 'credit') {
      data.limitUsedAnchor = { amount: reportedLimitUsed, date: todayISO() }
    }
    // Firestore no acepta campos undefined
    if (!data.limitUsedAnchor) delete data.limitUsedAnchor

    // Si cambia el día de corte, cada mínimo pasa al corte nuevo de ese extracto
    const previousDay = props.account?.cutoffDate
    const statementMinimums = previousDay && data.cutoffDate && previousDay !== data.cutoffDate
      ? Object.fromEntries(Object.entries(data.statementMinimums).map(([iso, minimum]) => {
          const date = parseISODate(iso)
          let cutoff = dateInMonth(date.getFullYear(), date.getMonth(), data.cutoffDate)
          if (cutoff > date) cutoff = dateInMonth(date.getFullYear(), date.getMonth() - 1, data.cutoffDate)
          return [toISODate(cutoff), minimum]
        }))
      : { ...data.statementMinimums }
    const deferredDebts = data.deferredDebts
      .filter(d => !d.outsideLimit)
      .map(d => ({ ...d, installments: Math.max(1, d.installments || 1) }))

    // Crédito aparte del cupo: si cambia el capital pendiente se factura desde el último corte
    const separate = data.deferredDebts.find(d => d.outsideLimit)
    if (data.type === 'credit' && separatePending > 0) {
      const changed = !separate || Math.abs(separate.amount - separatePending) >= 1 ||
        separate.installments !== Math.max(1, separateInstallments || 1)
      deferredDebts.push({
        id: separate?.id || `sep_${Date.now()}`,
        description: separateName.trim() || 'Crédito aparte',
        statementName: separateStatementName.trim(),
        amount: separatePending,
        installments: Math.max(1, separateInstallments || 1),
        date: changed ? dayBefore(currentCutoff.value || todayISO()) : separate!.date,
        outsideLimit: true
      })
    }

    const difference = reportedDebt ? Math.round(reportedDebt - currentDebt.value) : 0
    if (difference !== 0) {
      deferredDebts.push({
        id: `def_${Date.now()}`,
        description: 'Ajuste deuda total',
        amount: difference,
        installments: Math.max(1, reportedDebtInstallments || 1),
        date: todayISO()
      })
    }

    if (currentCutoff.value) {
      if (statementMinimum > 0) statementMinimums[currentCutoff.value] = statementMinimum
      else delete statementMinimums[currentCutoff.value]
    }

    if (props.account) await store.updateAccount(props.account.id, { ...data, statementMinimums, deferredDebts })
    else await store.addAccount({ ...data, statementMinimums, deferredDebts })
    emit('saved')
    emit('close')
  } finally {
    saving.value = false
  }
}
</script>
