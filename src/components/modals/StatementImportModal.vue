<template>
  <Teleport to="body">
    <div class="modal-backdrop" @click.self="!busy && $emit('close')">
      <div class="modal">
        <div class="modal-header">
          <div>
            <h2>Subir extracto</h2>
            <p class="subtitle">{{ account.icon }} {{ account.name }}</p>
          </div>
          <button class="modal-close" :disabled="busy" @click="$emit('close')">✕</button>
        </div>

        <!-- 1. Archivo y contraseña -->
        <div v-if="step === 'file'" class="modal-body">
          <label class="file-drop" :class="{ selected: !!file }">
            <input type="file" accept="application/pdf" @change="onFile" />
            <span class="file-icon">📄</span>
            <strong>{{ file ? file.name : 'Elegir el PDF del extracto' }}</strong>
            <small>{{ file ? 'Toca para cambiarlo' : 'El extracto que descargas de la app del banco' }}</small>
          </label>

          <div class="form-group">
            <label>Contraseña del PDF (si tiene)</label>
            <input
              v-model="password"
              type="password"
              autocomplete="off"
              placeholder="Normalmente tu número de documento"
              @keydown.enter="read"
            />
            <small class="hint">El PDF y la contraseña solo se usan en este dispositivo: no se guardan ni se envían.</small>
          </div>

          <p v-if="error" class="error">{{ error }}</p>
        </div>

        <!-- 2. Revisión -->
        <div v-else-if="step === 'review' && statement" class="modal-body">
          <div class="summary">
            <div><span>Corte</span><strong>{{ formatDate(statement.cutoffDate) }}</strong></div>
            <div><span>Fecha límite</span><strong>{{ formatDate(statement.dueDate) }}</strong></div>
            <div><span>Pago mínimo</span><strong>{{ formatCurrency(statement.minimumPayment) }}</strong></div>
            <div><span>Deuda al corte</span><strong>{{ formatCurrency(statement.totalDebt) }}</strong></div>
          </div>

          <!-- Nuevos -->
          <section v-if="newRows.length">
            <h3>🆕 No están en la app ({{ newRows.length }})</h3>
            <div v-for="row in newRows" :key="row.key" class="row" :class="{ off: !row.include }">
              <label class="row-main">
                <input v-model="row.include" type="checkbox" />
                <span class="row-info">
                  <strong>{{ row.movement.description }}</strong>
                  <small>
                    {{ formatDate(row.movement.date) }}
                    <template v-if="row.movement.installments > 1">
                      · {{ row.movement.installments }} cuotas
                      <template v-if="row.movement.interestRate">· {{ row.movement.interestRate }}% mes</template>
                    </template>
                    <template v-if="row.movement.previous"> · periodo anterior</template>
                  </small>
                </span>
                <span class="row-amount" :class="row.movement.kind === 'payment' ? 'income' : 'expense'">
                  {{ row.movement.kind === 'payment' ? '+' : '-' }}{{ formatCurrency(row.movement.amount) }}
                </span>
              </label>

              <div v-if="row.include && row.movement.kind === 'purchase'" class="row-extra">
                <CategorySelect v-model="row.category" type="expense" />
              </div>
              <div v-if="row.include && row.movement.kind === 'payment'" class="row-extra">
                <label class="inline-label">Pagado desde</label>
                <select v-model="row.sourceAccountId">
                  <option v-for="acc in sourceAccounts" :key="acc.id" :value="acc.id">
                    {{ acc.icon }} {{ acc.name }}
                  </option>
                </select>
              </div>
            </div>
          </section>

          <!-- En la app pero no en el extracto -->
          <section v-if="extraTxs.length">
            <h3>⚠️ En la app pero no en el extracto ({{ extraTxs.length }})</h3>
            <p class="hint">Pueden ser ajustes tuyos o compras que el banco cobra en otro corte. Solo se quitan si los marcas.</p>
            <label v-for="tx in extraTxs" :key="tx.id" class="row row-main" :class="{ off: !removeIds.has(tx.id) }">
              <input type="checkbox" :checked="removeIds.has(tx.id)" @change="toggleRemove(tx.id)" />
              <span class="row-info">
                <strong>{{ tx.description || 'Sin descripción' }}</strong>
                <small>{{ formatDate(tx.date) }} · {{ removeIds.has(tx.id) ? 'se quitará' : 'se deja' }}</small>
              </span>
              <span class="row-amount" :class="tx.type">{{ formatCurrency(tx.amount) }}</span>
            </label>
          </section>

          <p v-if="nextPeriodTxs.length" class="hint">
            📅 {{ nextPeriodTxs.length }} movimiento(s) del {{ formatDate(statement.cutoffDate) }} irán en el siguiente extracto
            ({{ nextPeriodTxs.map(t => t.description || 'sin descripción').join(', ') }}).
          </p>

          <!-- Ya registrados -->
          <details v-if="matchedRows.length" class="matched">
            <summary>✅ Ya registrados ({{ matchedRows.length }})</summary>
            <div v-for="row in matchedRows" :key="row.key" class="row row-main">
              <span class="row-info">
                <strong>{{ row.movement.description }}</strong>
                <small>En la app: {{ row.match?.description || 'sin descripción' }} · {{ formatDate(row.match!.date) }}</small>
              </span>
              <span class="row-amount">{{ formatCurrency(row.movement.amount) }}</span>
            </div>
          </details>

          <div class="reconcile">
            <p>
              Deuda en la app al {{ formatDate(statement.cutoffDate) }}: <strong>{{ formatCurrency(debtBefore) }}</strong>
            </p>
            <p class="hint">
              Al aplicar, la deuda al corte queda en {{ formatCurrency(statement.totalDebt) }} (el saldo sin detalle se ajusta
              solo) y el pago mínimo en {{ formatCurrency(statement.minimumPayment) }}.
            </p>
          </div>

          <p v-if="error" class="error">{{ error }}</p>
        </div>

        <!-- 3. Listo -->
        <div v-else-if="step === 'done'" class="modal-body done">
          <span>✅</span>
          <h3>Extracto aplicado</h3>
          <p>{{ resultText }}</p>
        </div>

        <div class="modal-footer">
          <template v-if="step === 'file'">
            <button class="btn-cancel" @click="$emit('close')">Cancelar</button>
            <button class="btn-save" :disabled="!file || busy" @click="read">
              {{ busy ? 'Leyendo...' : 'Leer extracto' }}
            </button>
          </template>
          <template v-else-if="step === 'review'">
            <button class="btn-cancel" :disabled="busy" @click="step = 'file'">Atrás</button>
            <button class="btn-save" :disabled="busy" @click="apply">
              {{ busy ? 'Aplicando...' : 'Aplicar extracto' }}
            </button>
          </template>
          <button v-else class="btn-save" @click="$emit('close')">Listo</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import CategorySelect from '@/components/CategorySelect.vue'
import { useFinanceStore } from '@/stores/finance'
import { createTransactionService } from '@/services/transaction.service'
import { formatCurrency, formatDate } from '@/utils/formatters'
import { creditDebtUntil } from '@/utils/creditStatement'
import { installmentSchedule } from '@/utils/installments'
import { extractPdfLines, parseStatement, PdfPasswordError, type ParsedStatement } from '@/utils/statements'
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

const newRows = computed(() => rows.value.filter(r => r.status === 'new'))
const matchedRows = computed(() => rows.value.filter(r => r.status === 'matched'))

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

    const feesId = await store.getFeesCategoryId()
    const defaultSource = sourceAccounts.value.find(a => /bancolombia/i.test(a.name))?.id || sourceAccounts.value[0]?.id || ''

    statement.value = parsed
    rows.value = buildImportRows(parsed, accountTxs(), store.transactions, store.categories, feesId, defaultSource)
    const unmatched = unmatchedTxs(parsed, accountTxs(), rows.value)
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

// Deuda en la app al corte, sin lo del día del corte que va al siguiente extracto
function debtAtCutoff(cutoffDate: string): number {
  return creditDebtUntil(props.account, store.transactions, cutoffDate) - debtEffect(nextPeriodTxs.value)
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
    const placeholder = deferred.find(d => d.description.startsWith('Ajuste deuda total'))
    if (Math.abs(delta) >= 0.01) {
      if (placeholder) placeholder.amount = round2(placeholder.amount + delta)
      else deferred.push({
        id: `def_${Date.now()}`, description: 'Ajuste deuda total (compras sin detalle)',
        amount: delta, installments: 1, date: st.cutoffDate
      })
    }

    await store.updateAccount(accountId, {
      statementMinimums: { ...(props.account.statementMinimums || {}), [st.cutoffDate]: st.minimumPayment },
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

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
}

.modal {
  width: 100%;
  max-width: 600px;
  max-height: calc(100dvh - 32px);
  display: flex;
  flex-direction: column;
  border-radius: 20px;
  border: 1px solid var(--border);
  background: var(--bg-surface);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px 20px 0;
}

.modal-header h2 { font-size: 19px; color: var(--text-primary); }
.subtitle { font-size: 13px; color: var(--text-muted); margin-top: 2px; }

.modal-close {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 16px;
  cursor: pointer;
}

.modal-body {
  padding: 18px 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 0 20px 20px;
}

.file-drop {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 22px 16px;
  border: 1.5px dashed var(--border-light);
  border-radius: 14px;
  text-align: center;
  cursor: pointer;
  color: var(--text-primary);
}

.file-drop.selected { border-color: var(--accent-green); }
.file-drop input { display: none; }
.file-icon { font-size: 30px; }
.file-drop strong { font-size: 14px; overflow-wrap: anywhere; }
.file-drop small { font-size: 12px; color: var(--text-muted); }

.form-group { display: flex; flex-direction: column; gap: 6px; }

.form-group label,
.inline-label {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-group input,
.row-extra select {
  width: 100%;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 12px;
  color: var(--text-primary);
  font-size: 14px;
}

.hint { font-size: 12px; color: var(--text-muted); }
.error { font-size: 13px; color: var(--accent-red); }

.summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.summary div {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--bg-elevated);
}

.summary span { font-size: 11px; color: var(--text-muted); }
.summary strong { font-family: 'JetBrains Mono', monospace; font-size: 14px; color: var(--text-primary); }

section { display: flex; flex-direction: column; gap: 8px; }
section h3, .matched summary { font-size: 14px; color: var(--text-primary); }

.row {
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--bg-card);
  padding: 10px 12px;
}

.row.off { opacity: 0.55; }

.row-main {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.row-main input[type='checkbox'] {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  accent-color: var(--accent-green);
}

.row-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }

.row-info strong {
  font-size: 13px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-info small { font-size: 11px; color: var(--text-muted); }

.row-amount {
  flex-shrink: 0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  color: var(--text-primary);
}

.row-amount.income { color: var(--accent-green); }
.row-amount.expense { color: var(--accent-red); }

.row-extra {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 8px;
  padding-left: 26px;
}

.matched { display: flex; flex-direction: column; gap: 8px; }
.matched summary { cursor: pointer; margin-bottom: 8px; }
.matched .row { margin-bottom: 6px; }

.reconcile {
  padding: 12px;
  border-radius: 12px;
  background: var(--bg-elevated);
  font-size: 13px;
  color: var(--text-secondary);
}

.reconcile strong { color: var(--text-primary); }

.done {
  align-items: center;
  text-align: center;
  color: var(--text-primary);
}

.done span { font-size: 40px; }

.btn-cancel,
.btn-save {
  padding: 10px 18px;
  border-radius: 10px;
  font-size: 14px;
  cursor: pointer;
}

.btn-cancel {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  color: var(--text-secondary);
}

.btn-save {
  border: none;
  background: linear-gradient(135deg, var(--accent-green), #00b377);
  color: #000;
  font-weight: 600;
}

.btn-save:disabled,
.btn-cancel:disabled { opacity: 0.5; cursor: default; }
</style>
