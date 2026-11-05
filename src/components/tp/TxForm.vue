<template>
  <TpSheet :title="done ? '' : sheetTitle" :wide="showInstallments && !done" @close="emit('close')">
    <!-- ===================== Listo (ingreso, transferencia o pago) ===================== -->
    <div v-if="done" class="flex flex-col items-center gap-3 pt-2 text-center">
      <div class="relative grid size-28 place-items-center">
        <span
          class="absolute inset-0 animate-ring rounded-full border-2 motion-reduce:animate-none"
          :class="done.type === 'income' ? 'border-success' : 'border-accent-light'"
        />
        <span
          class="grid grid-cols-[minmax(0,1fr)] size-24 animate-pop place-items-center rounded-full shadow-card motion-reduce:animate-none"
          :class="done.type === 'income' ? 'bg-linear-135 from-success to-primary' : 'bg-linear-135 from-accent-light to-primary'"
        >
          <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path
              d="M5 12.5l4.5 4.5L19 7.5"
              class="animate-draw [stroke-dasharray:60] [stroke-dashoffset:60] motion-reduce:animate-none motion-reduce:[stroke-dashoffset:0]"
            />
          </svg>
        </span>
      </div>
      <h2 class="m-0 font-sans text-2xl/[30px] font-semibold">{{ done.title }}</h2>
      <p class="m-0 text-[32px]/10 font-semibold tracking-[-0.5px] tabular-nums" :class="{ 'text-success': done.type === 'income' }">
        {{ done.amount }}
      </p>
      <div class="w-full text-left">
        <div v-for="row in done.rows" :key="row.label" class="flex justify-between gap-3 border-b border-dashed border-line py-2.5 text-sm text-ink-muted last:border-b-0">
          <span>{{ row.label }}</span>
          <strong class="text-right font-semibold text-ink tabular-nums">{{ row.value }}</strong>
        </div>
      </div>
    </div>

    <!-- ===================== Formulario ===================== -->
    <template v-else>
      <!-- Tipo -->
      <div v-if="!editing" class="grid auto-cols-fr grid-flow-col gap-1 rounded-full bg-surface-200 p-1" role="tablist" aria-label="Tipo de movimiento">
        <button
          v-for="t in types"
          :key="t.value"
          type="button"
          role="tab"
          :aria-selected="form.type === t.value"
          class="min-h-10 cursor-pointer rounded-full text-sm font-medium transition-colors"
          :class="form.type === t.value ? 'bg-ink text-on-inverse' : 'text-ink-muted hover:text-ink'"
          @click="setType(t.value)"
        >
          {{ t.label }}
        </button>
      </div>

      <!-- Monto -->
      <label class="flex flex-col items-center gap-1 py-2">
        <span :class="fieldLabel">¿Cuánto?</span>
        <span class="flex items-baseline justify-center gap-1 text-[42px]/12 font-semibold tracking-[-1px] tabular-nums" :class="{ 'text-success': form.type === 'income' }">
          <span aria-hidden="true">{{ form.type === 'income' ? '+' : form.type === 'expense' ? '−' : '' }}$</span>
          <input
            ref="amountInput"
            v-model="amountText"
            data-amount
            inputmode="numeric"
            autocomplete="off"
            placeholder="0"
            aria-label="Monto en pesos"
            class="max-w-[70vw] bg-transparent text-center font-sans placeholder:text-ink-faint focus:outline-none"
            :style="{ width: `${Math.max(2, amountText.length + 0.5)}ch` }"
          />
        </span>
      </label>

      <!-- Transferencia o pago: desde y hacia -->
      <template v-if="form.type === 'transfer'">
        <div class="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
          <label class="flex flex-col gap-1.5">
            <span :class="fieldLabel">Desde</span>
            <select v-model="form.accountId" :class="fieldInput">
              <option value="" disabled>Elige la cuenta</option>
              <option v-for="acc in sourceAccounts" :key="acc.id" :value="acc.id">{{ acc.name }}</option>
            </select>
            <small v-if="sourceBalance !== null" class="text-xs text-ink-faint">Saldo {{ money(sourceBalance) }}</small>
          </label>
          <label class="flex flex-col gap-1.5">
            <span :class="fieldLabel">Hacia</span>
            <select v-model="form.targetAccountId" :class="fieldInput">
              <option value="" disabled>Elige la cuenta o tarjeta</option>
              <option v-for="acc in destinationAccounts" :key="acc.id" :value="acc.id">
                {{ acc.name }}{{ acc.type === 'credit' ? ' (tarjeta)' : '' }}
              </option>
            </select>
          </label>
        </div>

        <!-- Pagar tarjeta: atajos con el mínimo y el total -->
        <div v-if="payOptions.length" class="flex flex-col gap-2">
          <span :class="fieldLabel">¿Cuánto vas a pagar?</span>
          <button
            v-for="opt in payOptions"
            :key="opt.label"
            type="button"
            class="flex min-h-14 cursor-pointer items-center gap-3 rounded-tile border px-4 py-2.5 text-left transition-colors"
            :class="form.amount === opt.amount ? 'border-primary bg-primary-soft' : 'border-line bg-surface-200 hover:border-line-strong'"
            @click="form.amount = opt.amount"
          >
            <span
              class="grid grid-cols-[minmax(0,1fr)] size-5 shrink-0 place-items-center rounded-full border-2"
              :class="form.amount === opt.amount ? 'border-accent-light' : 'border-line-strong'"
            >
              <span v-if="form.amount === opt.amount" class="size-2.5 rounded-full bg-accent-light" />
            </span>
            <span class="flex min-w-0 flex-1 flex-col">
              <span class="text-[15px]/5 font-semibold">{{ opt.label }}</span>
              <small class="text-xs text-ink-faint">{{ opt.hint }}</small>
            </span>
            <strong class="font-semibold tabular-nums">{{ money(opt.amount) }}</strong>
          </button>
        </div>

        <p v-if="afterTransfer" class="m-0 rounded-tile border border-line bg-surface-200 px-4 py-3 text-[13px]/[19px] text-ink-muted">
          {{ afterTransfer }}
        </p>
      </template>

      <!-- Gasto o ingreso: categoría (las más usadas primero; "Más" busca entre todas o crea una) -->
      <div v-else class="flex flex-col gap-2">
        <span :class="fieldLabel">Categoría</span>
        <p v-if="isTransferLeg" class="m-0 text-[13px]/[19px] text-ink-faint">
          Es parte de una transferencia: la categoría no se cambia.
        </p>
        <CategoryPicker v-else v-model="form.category" :type="form.type === 'income' ? 'income' : 'expense'" />
      </div>

      <!-- Cuenta y fecha -->
      <div class="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
        <label v-if="form.type !== 'transfer'" class="flex flex-col gap-1.5">
          <span :class="fieldLabel">{{ form.type === 'income' ? 'Entra a' : 'Cuenta o tarjeta' }}</span>
          <select v-model="form.accountId" :class="fieldInput">
            <option value="" disabled>Elige la cuenta</option>
            <option v-for="acc in store.accounts" :key="acc.id" :value="acc.id">{{ acc.name }}</option>
          </select>
        </label>
        <label class="flex flex-col gap-1.5" :class="{ 'sm:col-span-2': form.type === 'transfer' }">
          <span :class="fieldLabel">Fecha</span>
          <input v-model="form.date" type="date" :max="maxDate" :class="fieldInput" />
        </label>
      </div>

      <label class="flex flex-col gap-1.5">
        <span :class="fieldLabel">Descripción</span>
        <input
          v-model="form.description"
          :class="fieldInput"
          :placeholder="form.type === 'transfer' ? 'Se llena sola si la dejas vacía' : 'Ej: Mercado de la semana'"
        />
      </label>

      <!-- Compra en dólares: la tarjeta cobra una comisión aparte -->
      <label v-if="showFx" class="flex cursor-pointer items-start gap-3 rounded-tile border border-line bg-surface-200 px-4 py-3">
        <input v-model="form.foreignCurrency" type="checkbox" class="mt-0.5 size-4 shrink-0 accent-primary" />
        <span class="text-sm">
          Compra en moneda extranjera (USD)
          <small class="mt-0.5 block text-xs text-ink-faint">
            {{
              form.foreignCurrency && form.amount > 0
                ? `Se registra aparte la comisión del ${fxRate} %: ${money(fxFee)}`
                : `La tarjeta cobra ${fxRate} % por cambio de moneda`
            }}
          </small>
        </span>
      </label>

      <!-- Compra con tarjeta: cuotas e intereses (capital fijo + interés sobre el saldo) -->
      <div v-if="showInstallments" class="flex flex-col gap-3 rounded-card border border-line bg-surface-200/50 p-4">
        <span class="text-sm font-semibold">Cuotas</span>
        <div class="flex gap-1.5">
          <button
            v-for="n in quickInstallments"
            :key="n"
            type="button"
            class="min-h-10 flex-1 cursor-pointer rounded-chip border text-sm font-medium tabular-nums transition-colors"
            :class="form.installments === n ? 'border-primary bg-primary-soft text-ink' : 'border-line bg-surface-100 text-ink-muted hover:text-ink'"
            @click="form.installments = n"
          >
            {{ n }}
          </button>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <label class="flex flex-col gap-1.5">
            <span :class="fieldLabel">Número de cuotas</span>
            <input v-model.number="form.installments" type="number" min="1" max="48" step="1" :class="fieldInput" />
          </label>
          <label class="flex flex-col gap-1.5">
            <span :class="fieldLabel">Interés mensual (%)</span>
            <input
              v-model.number="form.interestRate"
              type="number"
              min="0"
              step="0.0001"
              placeholder="0"
              :disabled="form.installments <= 1"
              :class="fieldInput"
              @input="rateTouched = true"
            />
          </label>
        </div>
        <p class="m-0 text-xs text-ink-faint">
          <template v-if="form.installments <= 1">A 1 cuota no se cobran intereses.</template>
          <template v-else-if="form.interestRate > 0">
            {{ form.interestRate }} % mensual ({{ annualRate.toFixed(2) }} % E.A.) sobre lo que se debe. Si la compra es sin intereses, pon 0.
          </template>
          <template v-else>Sin intereses.</template>
        </p>

        <div v-if="form.amount > 0" class="grid grid-cols-3 gap-2">
          <div v-for="item in installmentSummary" :key="item.label" class="flex flex-col gap-0.5 rounded-chip bg-surface-100 px-3 py-2">
            <span class="text-[11px]/[14px] text-ink-faint">{{ item.label }}</span>
            <strong class="text-sm font-semibold tabular-nums">{{ item.value }}</strong>
          </div>
        </div>

        <details v-if="form.amount > 0 && form.installments > 1 && form.interestRate > 0" class="group">
          <summary class="cursor-pointer list-none text-[13px] font-medium text-accent-light">
            <span class="group-open:hidden">Ver las {{ schedule.length }} cuotas</span>
            <span class="hidden group-open:inline">Ocultar cuotas</span>
          </summary>
          <div class="mt-2 max-h-48 overflow-y-auto rounded-chip bg-surface-100 px-3 py-1.5 text-xs tabular-nums">
            <div class="grid grid-cols-4 gap-2 border-b border-line py-1.5 text-[11px] text-ink-faint uppercase">
              <span>Cuota</span><span>Capital</span><span>Interés</span><span class="text-right">Total</span>
            </div>
            <div v-for="row in schedule" :key="row.number" class="grid grid-cols-4 gap-2 py-1 text-ink-muted">
              <span>{{ row.number }}/{{ schedule.length }}</span>
              <span>{{ plain(row.capital) }}</span>
              <span>{{ plain(row.interest) }}</span>
              <strong class="text-right font-semibold text-ink">{{ plain(row.total) }}</strong>
            </div>
          </div>
        </details>
      </div>
    </template>

    <template #footer>
      <TpButton v-if="done" block class="lg:w-auto lg:min-w-40" @click="emit('close')">Listo</TpButton>
      <template v-else>
        <div class="hidden lg:block"><TpButton variant="ghost" @click="emit('close')">Cancelar</TpButton></div>
        <TpButton block class="lg:w-auto lg:min-w-48" :disabled="!isValid || saving" @click="save">
          {{ saveLabel }}
        </TpButton>
      </template>
    </template>
  </TpSheet>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import TpSheet from './TpSheet.vue'
import TpButton from './TpButton.vue'
import CategoryPicker from './CategoryPicker.vue'
import { fieldInput, fieldLabel, mediumDate, money, parseISO, plain, shortDate } from './format'
import { useFinanceStore } from '@/stores/finance'
import { showAdvice } from '@/services/advisorToast'
import { hasFullPlan } from '@/services/plan.service'
import { effectiveAnnualRate, installmentSchedule } from '@/utils/installments'
import { todayISO } from '@/utils/dates'
import type { Transaction } from '@/interfaces'

type TxType = 'income' | 'expense' | 'transfer'

const props = defineProps<{
  // Editar un movimiento
  transaction?: Transaction
  // Datos iniciales de uno nuevo (ej: leído de una notificación)
  prefill?: Partial<Transaction>
  title?: string
  // Abrir como "Pagar tarjeta" con esta tarjeta como destino
  payCard?: string
}>()

const emit = defineEmits<{ close: []; saved: [] }>()
const store = useFinanceStore()

const editing = !!props.transaction
const initial = props.transaction || props.prefill
const isTransferLeg = editing && props.transaction?.category === 'transfer'

const form = reactive({
  type: (props.payCard ? 'transfer' : initial?.type || 'expense') as TxType,
  amount: initial?.amount || 0,
  date: initial?.date || todayISO(),
  category: initial?.category || '',
  accountId: initial?.accountId || '',
  targetAccountId: props.payCard || '',
  description: initial?.description || '',
  installments: props.transaction?.installments || 1,
  interestRate: props.transaction?.interestRate || 0,
  foreignCurrency: false
})

const types: { value: TxType; label: string }[] = [
  { value: 'expense', label: 'Gasto' },
  { value: 'income', label: 'Ingreso' },
  // Pagar una tarjeta es transferir hacia ella
  { value: 'transfer', label: 'Transferir' }
]

const maxDate = todayISO()
const saving = ref(false)
const amountInput = ref<HTMLInputElement | null>(null)

// ---------- Monto con punto de miles mientras se escribe ----------
const amountText = computed({
  get: () => (form.amount ? plain(form.amount) : ''),
  set: (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 12)
    form.amount = digits ? Number(digits) : 0
  }
})

// ---------- Cuentas ----------
const selectedAccount = computed(() => store.getAccountById(form.accountId))
const targetAccount = computed(() => store.getAccountById(form.targetAccountId))

// Cuenta más usada últimamente para cada tipo (así casi nunca hay que elegirla)
function lastAccountFor(type: TxType): string {
  const recent = [...store.transactions]
    .filter(t => t.category !== 'transfer' && (type === 'transfer' ? true : t.type === type))
    .sort((a, b) => b.date.localeCompare(a.date))
  const pool = type === 'transfer' ? recent.filter(t => store.getAccountById(t.accountId)?.type !== 'credit') : recent
  return pool[0]?.accountId || ''
}

function setType(type: TxType) {
  form.type = type
  if (type === 'transfer') {
    form.category = ''
    if (selectedAccount.value?.type === 'credit') form.accountId = ''
  }
}

// Al pagar, se paga desde cuentas (no desde otra tarjeta)
const sourceAccounts = computed(() => store.accounts.filter(a => a.type !== 'credit'))
const destinationAccounts = computed(() => store.accounts.filter(a => a.id !== form.accountId))

const sourceBalance = computed(() =>
  selectedAccount.value && selectedAccount.value.type !== 'credit'
    ? store.calculateAccountBalance(selectedAccount.value.id).balance
    : null
)

const afterTransfer = computed(() => {
  if (sourceBalance.value === null || !form.amount || !selectedAccount.value) return ''
  const left = sourceBalance.value - form.amount
  return left < 0
    ? `${selectedAccount.value.name} quedaría en ${money(left)}: revisa el monto o la cuenta.`
    : `Después te quedan ${money(left)} en ${selectedAccount.value.name}.`
})

// ---------- Pagar tarjeta ----------
const payOptions = computed(() => {
  const card = targetAccount.value
  if (form.type !== 'transfer' || card?.type !== 'credit') return []
  const st = store.getCreditStatement(card.id)
  const bal = store.calculateAccountBalance(card.id)
  const options: { label: string; hint: string; amount: number }[] = []

  if (st && !st.isMinimumCovered && st.minimumPayment > 0) {
    options.push({
      label: 'Pago mínimo',
      hint: st.dueDate ? `Vence el ${shortDate(st.dueDate)} · evita intereses de mora` : 'Evita intereses de mora',
      amount: Math.round(st.minimumPayment)
    })
  } else if (st && st.nextMinimumPayment > 0) {
    options.push({
      label: 'Mínimo al próximo corte',
      hint: st.nextCutoff ? `El mínimo actual ya está pagado · corte del ${shortDate(st.nextCutoff)}` : 'El mínimo actual ya está pagado',
      amount: Math.round(st.nextMinimumPayment)
    })
  }
  if (bal.usedCredit > 0) {
    options.push({ label: 'Pago total', hint: 'Quedas sin deuda', amount: Math.round(bal.usedCredit) })
  }
  return options.filter((o, i, all) => all.findIndex(x => x.amount === o.amount) === i)
})

// ---------- Moneda extranjera ----------
const fxRate = computed(() => selectedAccount.value?.fxFeeRate || 0)
const showFx = computed(() => !editing && form.type === 'expense' && fxRate.value > 0)
const fxFee = computed(() => Math.round(form.amount * fxRate.value) / 100)

// ---------- Cuotas ----------
const quickInstallments = [1, 3, 6, 12, 24, 36]
const showInstallments = computed(() => form.type === 'expense' && selectedAccount.value?.type === 'credit')

// Al editar se respeta la tasa guardada; en compras nuevas se toma la de la tarjeta
const rateTouched = ref(editing)
watch(
  () => [form.accountId, form.installments],
  () => {
    if (rateTouched.value || !showInstallments.value) return
    const freeUpTo = selectedAccount.value?.interestFreeInstallments || 1
    form.interestRate = form.installments > freeUpTo ? selectedAccount.value?.interestRate || 0 : 0
  },
  { immediate: true }
)

const schedule = computed(() => installmentSchedule(form.amount, form.installments || 1, form.interestRate || 0))
const installmentAmount = computed(() => Math.round(schedule.value[0]?.total || 0))
const totalInterest = computed(() => Math.round(schedule.value.reduce((sum, row) => sum + row.interest, 0)))
const annualRate = computed(() => effectiveAnnualRate(form.interestRate || 0))

const installmentSummary = computed(() => [
  { label: form.installments > 1 && form.interestRate > 0 ? 'Primera cuota' : 'Cuota', value: money(installmentAmount.value) },
  { label: 'Intereses', value: money(totalInterest.value) },
  { label: 'Total', value: money(form.amount + totalInterest.value) }
])

// ---------- Validación ----------
const installmentsOk = computed(
  () =>
    !showInstallments.value ||
    (Number.isInteger(form.installments) && form.installments >= 1 && form.installments <= 48 && form.interestRate >= 0)
)

const missing = computed(() => {
  if (!form.amount) return 'Escribe el monto'
  if (form.type === 'transfer') {
    if (!form.accountId) return 'Elige desde dónde'
    if (!form.targetAccountId) return 'Elige hacia dónde'
  } else {
    if (!form.category) return 'Elige una categoría'
    if (!form.accountId) return 'Elige la cuenta'
    if (!installmentsOk.value) return 'Revisa las cuotas'
  }
  if (!form.date) return 'Elige la fecha'
  return ''
})

const isValid = computed(() => !missing.value)

const sheetTitle = computed(() => {
  if (props.title) return props.title
  if (editing) return 'Editar movimiento'
  if (form.type === 'transfer' && targetAccount.value?.type === 'credit') return `Pagar ${targetAccount.value.name}`
  return 'Registrar'
})

const saveLabel = computed(() => {
  if (saving.value) return 'Guardando…'
  if (missing.value) return missing.value
  if (editing) return 'Guardar cambios'
  if (form.type === 'transfer' && targetAccount.value?.type === 'credit') return `Registrar pago de ${money(form.amount)}`
  return form.type === 'income' ? 'Registrar ingreso' : form.type === 'transfer' ? 'Registrar transferencia' : 'Registrar gasto'
})

// ---------- Guardar ----------
const paymentMethodByAccountType: Record<string, string> = {
  credit: 'Crédito',
  debit: 'Débito',
  savings: 'Ahorros',
  cash: 'Efectivo'
}

const done = ref<null | { type: TxType; title: string; amount: string; rows: { label: string; value: string }[] }>(null)

async function save() {
  if (saving.value || !isValid.value) return
  saving.value = true
  try {
    if (form.type === 'transfer') {
      await saveTransfer()
      return
    }

    const data: Omit<Transaction, 'id'> = {
      type: form.type,
      amount: form.amount,
      date: form.date,
      category: form.category,
      accountId: form.accountId,
      description: form.description.trim(),
      paymentMethod: paymentMethodByAccountType[selectedAccount.value?.type || ''] || '',
      tags: props.transaction?.tags || []
    }

    // Firestore no acepta undefined: solo se agregan si es compra con tarjeta
    if (showInstallments.value) {
      data.installments = form.installments
      data.interestRate = form.installments > 1 ? form.interestRate || 0 : 0
      data.installmentAmount = installmentAmount.value
    }

    const withFxFee = showFx.value && form.foreignCurrency && fxFee.value > 0
    if (withFxFee) data.tags = [...data.tags, 'moneda extranjera']

    if (editing && props.transaction) await store.updateTransaction(props.transaction.id, data)
    else await store.addTransaction(data)

    // La comisión por cambio de moneda va como un gasto aparte, igual que en el banco
    if (withFxFee) {
      const fee: Omit<Transaction, 'id'> = {
        type: 'expense',
        amount: fxFee.value,
        date: form.date,
        category: await store.getFeesCategoryId(),
        accountId: form.accountId,
        description: `Comisión cambio de moneda${data.description ? ` · ${data.description}` : ''}`,
        paymentMethod: data.paymentMethod,
        tags: ['comisión']
      }
      if (showInstallments.value) {
        fee.installments = 1
        fee.interestRate = 0
        fee.installmentAmount = fxFee.value
      }
      await store.addTransaction(fee)
    }

    emit('saved')

    if (editing || form.type === 'expense') {
      // El asesor comenta cada gasto nuevo (presupuesto, ritmo del mes, deuda)
      if (!editing && hasFullPlan.value) showAdvice(store.feedbackFor(data))
      emit('close')
      return
    }

    done.value = {
      type: 'income',
      title: 'Ingreso registrado',
      amount: `+${money(form.amount)}`,
      rows: [
        { label: 'Entró a', value: selectedAccount.value?.name || '' },
        { label: 'Categoría', value: store.getCategoryById(form.category)?.name || '' },
        { label: 'Fecha', value: mediumDate(parseISO(form.date)) }
      ]
    }
  } finally {
    saving.value = false
  }
}

// Una transferencia son dos movimientos: sale de una cuenta y entra a la otra.
// Si entra a una tarjeta, es un pago: baja la deuda y libera cupo.
async function saveTransfer() {
  const from = selectedAccount.value
  const to = targetAccount.value
  if (!from || !to) return
  const isPayment = to.type === 'credit'
  const note = form.description.trim()

  await store.addTransaction({
    type: 'expense',
    amount: form.amount,
    date: form.date,
    category: 'transfer',
    accountId: from.id,
    description: note || (isPayment ? `Pago a ${to.name}` : `Transferencia a ${to.name}`),
    paymentMethod: 'Transferencia',
    tags: ['transfer']
  })
  await store.addTransaction({
    type: 'income',
    amount: form.amount,
    date: form.date,
    category: 'transfer',
    accountId: to.id,
    description: note || (isPayment ? `Pago desde ${from.name}` : `Transferencia desde ${from.name}`),
    paymentMethod: 'Transferencia',
    tags: ['transfer']
  })
  emit('saved')

  const rows = [
    { label: 'Desde', value: from.name },
    { label: isPayment ? 'Tarjeta' : 'Hacia', value: to.name },
    { label: 'Fecha', value: mediumDate(parseISO(form.date)) }
  ]
  if (isPayment) {
    const bal = store.calculateAccountBalance(to.id)
    rows.push({ label: 'Deuda que queda', value: money(bal.usedCredit) })
    if (to.creditLimit) rows.push({ label: 'Cupo disponible', value: money(bal.availableCredit) })
  }
  done.value = {
    type: 'transfer',
    title: isPayment ? 'Pago registrado' : 'Transferencia registrada',
    amount: money(form.amount),
    rows
  }
}

onMounted(() => {
  // Cuenta por defecto: la del último movimiento de ese tipo
  if (!form.accountId) form.accountId = lastAccountFor(form.type)
  // Pagar tarjeta: arranca con el primer atajo (el mínimo, si está pendiente)
  if (props.payCard && !form.amount && payOptions.value.length) form.amount = payOptions.value[0].amount
  if (!form.amount) amountInput.value?.focus()
})
</script>
