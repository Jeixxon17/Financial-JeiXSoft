<template>
  <!-- Subir el extracto en PDF: se lee en el dispositivo, se cruza con la app y se cuadra la deuda -->
  <TpSheet :title="`Subir extracto de ${account.name}`" :wide="step === 'review'" @close="!busy && $emit('close')">
    <!-- Pasos -->
    <div class="flex gap-1.5" aria-hidden="true">
      <span v-for="(s, i) in ['file', 'review', 'done']" :key="s" class="h-1 flex-1 rounded-full" :class="stepIndex >= i ? 'bg-accent-light' : 'bg-surface-300'" />
    </div>

    <!-- 1. Archivo y contraseña -->
    <template v-if="step === 'file'">
      <label
        class="flex cursor-pointer flex-col items-center gap-2 rounded-card border-[1.5px] border-dashed px-4 py-7 text-center transition-colors"
        :class="file ? 'border-primary bg-primary-soft' : 'border-line-strong bg-surface-200/40 hover:border-accent-light'"
      >
        <input type="file" accept="application/pdf" class="sr-only" @change="onFile" />
        <span class="grid grid-cols-[minmax(0,1fr)] size-12 place-items-center rounded-full bg-surface-200 text-accent-light [&_svg]:size-6">
          <FileText :stroke-width="1.75" aria-hidden="true" />
        </span>
        <strong class="text-[15px] font-semibold">{{ file ? file.name : 'Elige el PDF del extracto' }}</strong>
        <small class="text-[13px] text-ink-muted">{{ file ? 'Toca para cambiarlo' : 'El que descargas de la app del banco' }}</small>
      </label>

      <label class="flex flex-col gap-1.5">
        <span :class="fieldLabel">Contraseña del PDF (si tiene)</span>
        <input
          v-model="password"
          type="password"
          autocomplete="off"
          :class="fieldInput"
          placeholder="Normalmente tu número de documento"
          @keydown.enter="read"
        />
        <small class="flex items-center gap-1.5 text-xs text-ink-faint [&_svg]:size-3.5">
          <LockKeyhole :stroke-width="1.75" aria-hidden="true" />
          El PDF y la contraseña solo se usan en este dispositivo: no se guardan ni se envían.
        </small>
      </label>

      <p v-if="error" class="m-0 text-sm text-danger">{{ error }}</p>
    </template>

    <!-- 2. Revisión -->
    <template v-else-if="step === 'review' && statement">
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div v-for="item in summary" :key="item.label" class="flex flex-col gap-0.5 rounded-tile bg-surface-200 px-3 py-2.5">
          <span class="text-[11px]/[14px] text-ink-faint">{{ item.label }}</span>
          <strong class="text-sm font-semibold tabular-nums">{{ item.value }}</strong>
        </div>
      </div>

      <!-- Nuevos -->
      <section v-if="newRows.length" class="flex flex-col gap-2">
        <h3 :class="sectionTitle">No están en la app ({{ newRows.length }})</h3>
        <div v-for="row in newRows" :key="row.key" class="flex flex-col gap-2 rounded-tile border border-line bg-surface-200/40 p-3" :class="{ 'opacity-60': !row.include }">
          <label class="flex cursor-pointer items-center gap-3">
            <input v-model="row.include" type="checkbox" class="size-4 shrink-0 accent-primary" />
            <span class="flex min-w-0 flex-1 flex-col">
              <strong class="truncate text-sm font-semibold">{{ row.movement.description }}</strong>
              <small class="text-xs text-ink-faint">
                {{ formatDate(row.movement.date) }}
                <template v-if="row.movement.installments > 1">
                  · {{ row.movement.installments }} cuotas
                  <template v-if="row.movement.interestRate">· {{ row.movement.interestRate }} % mes</template>
                </template>
                <template v-if="row.movement.previous"> · periodo anterior</template>
              </small>
            </span>
            <span class="text-sm font-semibold whitespace-nowrap tabular-nums" :class="{ 'text-success': row.movement.kind === 'payment' }">
              {{ row.movement.kind === 'payment' ? '+' : '−' }}{{ formatCurrency(row.movement.amount) }}
            </span>
          </label>
          <TpCategorySelect v-if="row.include && row.movement.kind === 'purchase'" v-model="row.category" type="expense" />
          <label v-if="row.include && row.movement.kind === 'payment'" class="flex flex-col gap-1.5">
            <span :class="fieldLabel">Pagado desde</span>
            <select v-model="row.sourceAccountId" :class="fieldInput">
              <option v-for="acc in sourceAccounts" :key="acc.id" :value="acc.id">{{ acc.name }}</option>
            </select>
          </label>
        </div>
      </section>

      <!-- Créditos de los que el extracto solo trae la cuota del mes (ADDI) -->
      <section v-if="previousCredits.length" class="flex flex-col gap-2">
        <h3 :class="sectionTitle">Créditos con interés ({{ previousCredits.length }})</h3>
        <p class="m-0 text-[13px]/[19px] text-ink-muted">
          El extracto no dice su valor ni sus cuotas: su saldo queda en la deuda sin detalle y se factura
          {{ formatCurrency(previousMonthly) }} al mes (lo que cobran de capital).
        </p>
        <div v-for="credit in previousCredits" :key="credit.date + credit.description" class="flex items-center gap-3 rounded-tile bg-surface-200/40 px-3 py-2.5">
          <span class="flex min-w-0 flex-1 flex-col">
            <strong class="truncate text-sm font-semibold">{{ credit.description }}</strong>
            <small class="text-xs text-ink-faint">
              {{ formatDate(credit.date) }} · {{ credit.interestRate }} % mes
              <template v-if="isSeparate(credit)"> · es el {{ separateDebt!.description }} (va aparte)</template>
            </small>
          </span>
          <span class="text-sm font-semibold whitespace-nowrap tabular-nums">{{ formatCurrency(credit.monthlyCapital) }}/mes</span>
        </div>
      </section>

      <!-- En la app pero no en el extracto -->
      <section v-if="extraTxs.length" class="flex flex-col gap-2">
        <h3 :class="sectionTitle">En la app pero no en el extracto ({{ extraTxs.length }})</h3>
        <p class="m-0 text-[13px]/[19px] text-ink-muted">Pueden ser ajustes tuyos o compras de otro corte. Solo se quitan si los marcas.</p>
        <label v-for="tx in extraTxs" :key="tx.id" class="flex cursor-pointer items-center gap-3 rounded-tile bg-surface-200/40 px-3 py-2.5" :class="{ 'opacity-60': !removeIds.has(tx.id) }">
          <input type="checkbox" class="size-4 shrink-0 accent-primary" :checked="removeIds.has(tx.id)" @change="toggleRemove(tx.id)" />
          <span class="flex min-w-0 flex-1 flex-col">
            <strong class="truncate text-sm font-semibold">{{ tx.description || 'Sin descripción' }}</strong>
            <small class="text-xs text-ink-faint">{{ formatDate(tx.date) }} · {{ removeIds.has(tx.id) ? 'se quitará' : 'se deja' }}</small>
          </span>
          <span class="text-sm font-semibold whitespace-nowrap tabular-nums">{{ formatCurrency(tx.amount) }}</span>
        </label>
      </section>

      <p v-if="nextPeriodTxs.length" class="m-0 text-[13px]/[19px] text-ink-muted">
        {{ nextPeriodTxs.length }} movimiento(s) desde el {{ formatDate(billingCutoff) }} irán en el siguiente extracto
        ({{ nextPeriodTxs.map(t => t.description || 'sin descripción').join(', ') }}).
      </p>

      <!-- Ya registrados -->
      <details v-if="matchedRows.length" class="group">
        <summary class="cursor-pointer list-none text-sm font-semibold text-success">Ya registrados ({{ matchedRows.length }})</summary>
        <div class="mt-2 flex flex-col gap-1.5">
          <div v-for="row in matchedRows" :key="row.key" class="flex items-center gap-3 rounded-tile bg-surface-200/40 px-3 py-2">
            <span class="flex min-w-0 flex-1 flex-col">
              <strong class="truncate text-sm font-semibold">{{ row.movement.description }}</strong>
              <small class="text-xs text-ink-faint">En la app: {{ row.match?.description || 'sin descripción' }} · {{ formatDate(row.match!.date) }}</small>
            </span>
            <span class="text-sm tabular-nums">{{ formatCurrency(row.movement.amount) }}</span>
          </div>
        </div>
      </details>

      <div class="rounded-tile border border-line bg-surface-200/40 px-4 py-3 text-sm">
        <p class="m-0">Deuda en la app al {{ formatDate(statement.cutoffDate) }}: <strong class="tabular-nums">{{ formatCurrency(debtBefore) }}</strong></p>
        <p class="mt-1 mb-0 text-[13px]/[19px] text-ink-muted">
          Al aplicar, la deuda al corte queda en {{ formatCurrency(statement.totalDebt) }} (el saldo sin detalle se ajusta solo) y el
          pago mínimo en {{ formatCurrency(statement.minimumPayment) }}.
        </p>
      </div>

      <p v-if="error" class="m-0 text-sm text-danger">{{ error }}</p>
    </template>

    <!-- 3. Listo -->
    <div v-else-if="step === 'done'" class="flex flex-col items-center gap-3 py-2 text-center">
      <div class="relative grid size-28 place-items-center">
        <span class="absolute inset-0 animate-ring rounded-full border-2 border-accent-light motion-reduce:animate-none" />
        <span class="grid grid-cols-[minmax(0,1fr)] size-24 animate-pop place-items-center rounded-full bg-linear-135 from-accent-light to-primary shadow-card motion-reduce:animate-none">
          <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7.5" class="animate-draw [stroke-dasharray:60] [stroke-dashoffset:60] motion-reduce:animate-none motion-reduce:[stroke-dashoffset:0]" />
          </svg>
        </span>
      </div>
      <h3 class="m-0 font-sans text-2xl/[30px] font-semibold">{{ account.name }} quedó cuadrada</h3>
      <p class="m-0 text-sm text-ink-muted">{{ resultText }}</p>
    </div>

    <template #footer>
      <template v-if="step === 'file'">
        <div class="hidden lg:block"><TpButton variant="ghost" @click="$emit('close')">Cancelar</TpButton></div>
        <TpButton block class="lg:w-auto lg:min-w-40" :disabled="!file || busy" @click="read">{{ busy ? 'Leyendo…' : 'Leer extracto' }}</TpButton>
      </template>
      <template v-else-if="step === 'review'">
        <TpButton variant="secondary" :disabled="busy" @click="step = 'file'">Atrás</TpButton>
        <TpButton block class="lg:w-auto lg:min-w-44" :disabled="busy" @click="apply">{{ busy ? 'Aplicando…' : 'Aplicar extracto' }}</TpButton>
      </template>
      <TpButton v-else block class="lg:w-auto lg:min-w-40" @click="$emit('close')">Listo</TpButton>
    </template>
  </TpSheet>
</template>
<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { FileText, LockKeyhole } from 'lucide-vue-next'
import TpSheet from '@/components/tp/TpSheet.vue'
import TpButton from '@/components/tp/TpButton.vue'
import TpCategorySelect from '@/components/tp/TpCategorySelect.vue'
import { fieldInput, fieldLabel } from '@/components/tp/format'
import { useFinanceStore } from '@/stores/finance'
import { createTransactionService } from '@/services/transaction.service'
import { formatCurrency, formatDate } from '@/utils/formatters'
import { creditDebtUntil } from '@/utils/creditStatement'
import { dateInMonth, parseISODate, toISODate } from '@/utils/dates'
import { installmentSchedule } from '@/utils/installments'
import {
  extractPdfLines, parseStatement, PdfPasswordError, type ParsedStatement, type PreviousCredit
} from '@/utils/statements'
import { buildImportRows, debtEffect, unmatchedTxs, type ImportRow } from '@/utils/statements/matching'
import type { Account, DeferredDebt, Transaction } from '@/interfaces'

const props = defineProps<{ account: Account }>()
defineEmits(['close'])

const store = useFinanceStore()

const step = ref<'file' | 'review' | 'done'>('file')
const file = ref<File | null>(null)
const password = ref('')
const busy = ref(false)
const error = ref('')
const statement = ref<ParsedStatement | null>(null)
const rows = ref<ImportRow[]>([])
const extraTxs = ref<Transaction[]>([])
// Del mismo día del corte: el banco los cobra en el siguiente extracto
const nextPeriodTxs = ref<Transaction[]>([])
const removeIds = reactive(new Set<string>())
const debtBefore = ref(0)
const resultText = ref('')

const sectionTitle = 'm-0 font-sans text-[15px]/5 font-semibold'
const stepIndex = computed(() => ['file', 'review', 'done'].indexOf(step.value))
const summary = computed(() => {
  const st = statement.value
  if (!st) return []
  return [
    { label: 'Corte', value: formatDate(billingCutoff.value) },
    { label: 'Fecha límite', value: formatDate(st.dueDate) },
    { label: 'Pago mínimo', value: formatCurrency(st.minimumPayment) },
    { label: st.debtIncludesUnbilled ? `Deuda al ${formatDate(st.cutoffDate)}` : 'Deuda al corte', value: formatCurrency(st.totalDebt) }
  ]
})

const newRows = computed(() => rows.value.filter(r => r.status === 'new'))
const matchedRows = computed(() => rows.value.filter(r => r.status === 'matched'))

// Corte de la app al que corresponde el extracto (el día de corte de la cuenta)
const billingCutoff = ref('')

function billingCutoffFor(issuedISO: string): string {
  const day = props.account.cutoffDate
  if (!day) return issuedISO
  const issued = parseISODate(issuedISO)
  let cutoff = dateInMonth(issued.getFullYear(), issued.getMonth(), day)
  if (cutoff > issued) cutoff = dateInMonth(issued.getFullYear(), issued.getMonth() - 1, day)
  return toISODate(cutoff)
}

// Crédito aparte del cupo (Crédito Grande de ADDI) y si un crédito del extracto es ese
const separateDebt = computed(() => props.account.deferredDebts?.find(d => d.outsideLimit))
function isSeparate(credit: PreviousCredit): boolean {
  const name = separateDebt.value?.statementName?.trim().toLowerCase()
  return !!name && credit.description.toLowerCase().includes(name)
}

const previousCredits = computed(() => statement.value?.previousCredits || [])
// Capital mensual de los créditos que quedan en el saldo sin detalle
const previousMonthly = computed(() =>
  previousCredits.value.filter(c => !isSeparate(c)).reduce((sum, c) => sum + c.monthlyCapital, 0)
)

const sourceAccounts = computed(() => store.accounts.filter(a => a.type !== 'credit'))

const accountTxs = () => store.transactions.filter(t => t.accountId === props.account.id)

function onFile(event: Event) {
  file.value = (event.target as HTMLInputElement).files?.[0] || null
  error.value = ''
}

function toggleRemove(id: string) {
  if (removeIds.has(id)) removeIds.delete(id)
  else removeIds.add(id)
}

async function read() {
  if (!file.value || busy.value) return
  busy.value = true
  error.value = ''

  try {
    const pages = await extractPdfLines(await file.value.arrayBuffer(), password.value || undefined)
    const parsed = parseStatement(pages)
    billingCutoff.value = billingCutoffFor(parsed.cutoffDate)
    // Sin corte fijo (ADDI): el periodo va desde el corte anterior de la cuenta
    if (parsed.debtIncludesUnbilled && props.account.cutoffDate) {
      const cutoff = parseISODate(billingCutoff.value)
      parsed.periodStart = toISODate(dateInMonth(cutoff.getFullYear(), cutoff.getMonth() - 1, props.account.cutoffDate))
    }

    const feesId = await store.getFeesCategoryId()
    const defaultSource = sourceAccounts.value.find(a => /bancolombia/i.test(a.name))?.id || sourceAccounts.value[0]?.id || ''

    statement.value = parsed
    rows.value = buildImportRows(parsed, accountTxs(), store.transactions, store.categories, feesId, defaultSource)
    const unmatched = unmatchedTxs(parsed, accountTxs(), rows.value, billingCutoff.value)
    extraTxs.value = unmatched.inPeriod
    nextPeriodTxs.value = unmatched.nextPeriod
    removeIds.clear()
    debtBefore.value = debtAtCutoff(parsed.cutoffDate)
    step.value = 'review'
  } catch (e) {
    error.value = e instanceof PdfPasswordError
      ? (e.incorrect ? 'La contraseña no es correcta.' : 'Este PDF tiene contraseña: escríbela arriba.')
      : (e as Error).message || 'No se pudo leer el PDF.'
  } finally {
    busy.value = false
  }
}

const round2 = (n: number) => Math.round(n * 100) / 100

// Deuda en la app a la fecha de la deuda del extracto. NU la da al corte, sin
// lo del día del corte (va al siguiente); ADDI la da a la fecha del extracto
// con todo lo comprado hasta ese día.
function debtAtCutoff(cutoffDate: string): number {
  const debt = creditDebtUntil(props.account, store.transactions, cutoffDate)
  return statement.value?.debtIncludesUnbilled ? debt : debt - debtEffect(nextPeriodTxs.value)
}

async function apply() {
  const st = statement.value
  if (!st || busy.value) return
  busy.value = true
  error.value = ''

  try {
    const accountId = props.account.id
    let added = 0

    for (const row of newRows.value.filter(r => r.include)) {
      const m = row.movement

      // Pago a la tarjeta: transferencia desde la cuenta con la que se pagó
      if (m.kind === 'payment') {
        const source = store.getAccountById(row.sourceAccountId)
        if (!source) continue
        await createTransactionService({
          type: 'expense', amount: m.amount, date: m.date, category: 'transfer', accountId: source.id,
          description: `Pago tarjeta ${props.account.name}`, paymentMethod: 'Transferencia', tags: ['transfer', 'extracto']
        })
        await createTransactionService({
          type: 'income', amount: m.amount, date: m.date, category: 'transfer', accountId,
          description: `Pago desde ${source.name}`, paymentMethod: 'Transferencia', tags: ['transfer', 'extracto']
        })
        added++
        continue
      }

      const first = installmentSchedule(m.amount, m.installments, m.interestRate)[0]
      await createTransactionService({
        type: 'expense',
        amount: m.amount,
        date: m.date,
        category: row.category || 'other',
        accountId,
        description: m.description,
        paymentMethod: 'Crédito',
        tags: m.kind === 'purchase' ? ['extracto'] : ['extracto', 'comisión'],
        installments: m.installments,
        interestRate: m.interestRate,
        installmentAmount: round2(first?.total || m.amount)
      })
      added++
    }

    for (const id of removeIds) await store.deleteTransaction(id)
    await store.loadTransactions()

    // Cuadra la deuda al corte con la del extracto ajustando el saldo sin detalle
    const delta = round2(st.totalDebt - debtAtCutoff(st.cutoffDate))
    const deferred: DeferredDebt[] = (props.account.deferredDebts || []).map(d => ({ ...d }))
    let placeholder = deferred.find(d => d.description.startsWith('Ajuste deuda total'))
    if (Math.abs(delta) >= 0.01) {
      if (placeholder) placeholder.amount = round2(placeholder.amount + delta)
      else {
        placeholder = {
          id: `def_${Date.now()}`, description: 'Ajuste deuda total (compras sin detalle)',
          amount: delta, installments: 1, date: st.cutoffDate
        }
        deferred.push(placeholder)
      }
    }

    // Créditos con interés (ADDI): el saldo sin detalle incluye la cuota de este
    // extracto, así que se factura desde este corte (fecha un día antes) en
    // cuotas del capital que cobran cada mes
    if (placeholder && previousMonthly.value > 0) {
      const dayBefore = parseISODate(billingCutoff.value)
      dayBefore.setDate(dayBefore.getDate() - 1)
      placeholder.date = toISODate(dayBefore)
      placeholder.installments = Math.max(1, Math.round(placeholder.amount / previousMonthly.value))
    }

    await store.updateAccount(accountId, {
      statementMinimums: { ...(props.account.statementMinimums || {}), [billingCutoff.value]: st.minimumPayment },
      paymentDate: Number(st.dueDate.slice(8, 10)),
      deferredDebts: deferred
    })

    const left = deferred.find(d => d.description.startsWith('Ajuste deuda total'))?.amount || 0
    resultText.value =
      `Se agregaron ${added} movimientos${removeIds.size ? ` y se quitaron ${removeIds.size}` : ''}. ` +
      `Pago mínimo: ${formatCurrency(st.minimumPayment)} hasta el ${formatDate(st.dueDate)}. ` +
      `Deuda al corte cuadrada en ${formatCurrency(st.totalDebt)}` +
      (Math.abs(left) >= 1 ? ` (saldo sin detalle: ${left < 0 ? '-' : ''}${formatCurrency(left)}).` : '.')
    step.value = 'done'
  } catch (e) {
    error.value = (e as Error).message || 'No se pudo aplicar el extracto.'
  } finally {
    busy.value = false
  }
}
</script>
