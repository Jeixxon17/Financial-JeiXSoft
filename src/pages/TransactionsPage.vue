<template>
  <AppLayout>
    <div class="transactions-page">
      <!-- Filters -->
      <div class="filter-bar">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input v-model="search" type="text" placeholder="Buscar movimientos..." />
        </div>
        <div class="filters">
          <select v-model="filterType" class="filter-select">
            <option value="">Todos los tipos</option>
            <option value="income">Ingresos</option>
            <option value="expense">Gastos</option>
          </select>
          <select v-model="filterCategory" class="filter-select">
            <option value="">Todas las categorías</option>
            <option v-for="cat in store.categories" :key="cat.id" :value="cat.id">
              {{ cat.icon }} {{ cat.name }}
            </option>
          </select>
          <select v-model="filterAccount" class="filter-select">
            <option value="">Todas las cuentas</option>
            <option v-for="acc in store.accounts" :key="acc.id" :value="acc.id">
              {{ acc.icon }} {{ acc.name }}
            </option>
          </select>
          <button class="btn-add" @click="showModal = true">+ Agregar</button>
        </div>
      </div>

      <!-- Summary row -->
      <div class="summary-row">
        <div class="summary-chip green">
          <span>📥 Ingresos</span>
          <strong>{{ formatCurrency(filteredIncome) }}</strong>
        </div>
        <div class="summary-chip red">
          <span>📤 Gastos</span>
          <strong>{{ formatCurrency(filteredExpenses) }}</strong>
        </div>
        <div class="summary-chip" :class="filteredBalance >= 0 ? 'green' : 'red'">
          <span>⚖️ Balance</span>
          <strong>{{ filteredBalance >= 0 ? '+' : '' }}{{ formatCurrency(filteredBalance) }}</strong>
        </div>
        <div class="summary-chip blue">
          <span>📋 Total</span>
          <strong>{{ filtered.length }} movimientos</strong>
        </div>
      </div>

      <!-- Transactions table -->
      <div class="table-card">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th @click="sort('date')" class="sortable">
                  Fecha {{ sortField === 'date' ? (sortDir === 'asc' ? '↑' : '↓') : '' }}
                </th>
                <th>Descripción</th>
                <th>Categoría</th>
                <th>Cuenta</th>
                <th>Método</th>
                <th @click="sort('amount')" class="sortable">
                  Monto {{ sortField === 'amount' ? (sortDir === 'asc' ? '↑' : '↓') : '' }}
                </th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="tx in paginatedTxs" :key="tx.id">
                <td class="date-cell">{{ formatDate(tx.date) }}</td>
                <td>
                  <p class="tx-desc">{{ tx.description || getCatName(tx.category) }}</p>
                  <div class="tags" v-if="tx.tags.length">
                    <span v-for="tag in tx.tags.slice(0,2)" :key="tag" class="tag">{{ tag }}</span>
                  </div>
                </td>
                <td>
                  <span class="cat-badge" :style="{ background: getCatColor(tx.category)+'22', color: getCatColor(tx.category) }">
                    {{ getCatIcon(tx.category) }} {{ getCatName(tx.category) }}
                  </span>
                </td>
                <td class="text-muted-sm">{{ getAccName(tx.accountId) }}</td>
                <td class="text-muted-sm">{{ tx.paymentMethod }}</td>
                <td>
                  <span class="amount-cell" :class="tx.type">
                    {{ tx.type === 'income' ? '+' : '-' }}{{ formatCurrency(tx.amount) }}
                  </span>
                </td>
                <td>
                  <div class="row-actions">
                    <button @click="editTx = tx; showModal = true" class="icon-btn">✏️</button>
                    <button @click="store.deleteTransaction(tx.id)" class="icon-btn danger">🗑️</button>
                  </div>
                </td>
              </tr>
              <tr v-if="!filtered.length">
                <td colspan="7" class="empty-row">
                  <span>📭</span>
                  <p>Sin movimientos que mostrar</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="pagination" v-if="totalPages > 1">
          <button @click="page = Math.max(1, page - 1)" :disabled="page === 1">‹</button>
          <span>{{ page }} / {{ totalPages }}</span>
          <button @click="page = Math.min(totalPages, page + 1)" :disabled="page === totalPages">›</button>
        </div>
      </div>
    </div>

  </AppLayout>

  <TransactionModal v-if="showModal" :transaction="editTx || undefined" @close="showModal = false; editTx = null" />
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  onMounted
} from 'vue'
import AppLayout from '@/layouts/AppLayout.vue'
import TransactionModal from '@/components/modals/TransactionModal.vue'
import { useFinanceStore } from '@/stores/finance'
import { formatCurrency, formatDate } from '@/utils/formatters'
import type { Transaction } from '@/interfaces'

const store = useFinanceStore()
const search = ref('')
const filterType = ref('')
const filterCategory = ref('')
const filterAccount = ref('')
const showModal = ref(false)
const editTx = ref<Transaction | null>(null)
const sortField = ref<'date' | 'amount'>('date')
const sortDir = ref<'asc' | 'desc'>('desc')
const page = ref(1)
const perPage = 15

onMounted(async () => {

  await Promise.all([
    store.loadAccounts(),
    store.loadTransactions()
  ])

})

function getCatColor(id: string) { return store.getCategoryById(id)?.color || '#6b7280' }
function getCatIcon(id: string) { return store.getCategoryById(id)?.icon || '📦' }
function getCatName(id: string) { return store.getCategoryById(id)?.name || 'Otro' }
function getAccName(id: string) { return store.getAccountById(id)?.name || '' }

function sort(field: 'date' | 'amount') {
  if (sortField.value === field) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  else { sortField.value = field; sortDir.value = 'desc' }
}

const filtered = computed(() => {

  let txs = [...store.monthTransactions]

  if (search.value) {

    const s = search.value.toLowerCase()

    txs = txs.filter(t =>

      (t.description || '')
        .toLowerCase()
        .includes(s)

      ||

      getCatName(t.category)
        .toLowerCase()
        .includes(s)
    )
  }

  if (filterType.value) {

    txs = txs.filter(
      t => t.type === filterType.value
    )
  }

  if (filterCategory.value) {

    txs = txs.filter(
      t => t.category === filterCategory.value
    )
  }

  if (filterAccount.value) {

    txs = txs.filter(
      t => t.accountId === filterAccount.value
    )
  }

  return [...txs].sort((a, b) => {

    const mult =
      sortDir.value === 'asc'
        ? 1
        : -1

    if (sortField.value === 'date') {

      return (
        a.date.localeCompare(b.date)
        * mult
      )
    }

    return (
      (a.amount - b.amount)
      * mult
    )
  })
})

const filteredIncome = computed(() => filtered.value.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0))
const filteredExpenses = computed(() => filtered.value.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0))
const filteredBalance = computed(() => filteredIncome.value - filteredExpenses.value)
const totalPages = computed(() => Math.ceil(filtered.value.length / perPage))
const paginatedTxs = computed(() => filtered.value.slice((page.value - 1) * perPage, page.value * perPage))
</script>

<style scoped>
.transactions-page { display: flex; flex-direction: column; gap: 16px; }

.filter-bar {
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 16px;
}

@media (min-width: 768px) {
  .filter-bar { flex-direction: row; align-items: center; }
}

.search-box {
  flex: 1;
  position: relative;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
  pointer-events: none;
}

.search-box input {
  width: 100%;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 9px 12px 9px 36px;
  color: var(--text-primary);
  font-size: 14px;
  font-family: 'DM Sans', sans-serif;
}

.search-box input:focus {
  outline: none;
  border-color: var(--accent-green);
}

.filters {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-select {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 9px 12px;
  color: var(--text-secondary);
  font-size: 13px;
  font-family: 'DM Sans', sans-serif;
  cursor: pointer;
}

.btn-add {
  background: linear-gradient(135deg, var(--accent-green), #00b377);
  border: none;
  border-radius: 10px;
  padding: 9px 18px;
  color: #000;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
  font-family: 'DM Sans', sans-serif;
}

/* Summary chips */
.summary-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.summary-chip {
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 14px;
  flex: 1;
  min-width: 120px;
}

.summary-chip span { font-size: 11px; color: var(--text-muted); }
.summary-chip strong { font-family: 'JetBrains Mono', monospace; font-size: 14px; color: var(--text-primary); }
.summary-chip.green strong { color: var(--accent-green); }
.summary-chip.red strong { color: var(--accent-red); }
.summary-chip.blue strong { color: var(--accent-blue); }

/* Table */
.table-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  overflow: hidden;
}

.table-wrap { overflow-x: auto; }

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

thead {
  border-bottom: 1px solid var(--border);
}

th {
  padding: 12px 16px;
  text-align: left;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

th.sortable {
  cursor: pointer;
  user-select: none;
}

th.sortable:hover { color: var(--text-primary); }

tbody tr {
  border-bottom: 1px solid rgba(35, 43, 62, 0.5);
  transition: background 0.2s;
}

tbody tr:hover { background: var(--bg-elevated); }
tbody tr:last-child { border-bottom: none; }

td {
  padding: 12px 16px;
  color: var(--text-secondary);
  vertical-align: middle;
}

.date-cell { color: var(--text-muted); white-space: nowrap; font-size: 12px; }

.tx-desc { color: var(--text-primary); font-weight: 500; margin-bottom: 2px; }

.tags { display: flex; gap: 4px; }
.tag {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  color: var(--text-muted);
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 20px;
}

.cat-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 500;
  padding: 3px 8px;
  border-radius: 6px;
  white-space: nowrap;
}

.text-muted-sm { color: var(--text-muted); font-size: 12px; }

.amount-cell {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 600;
  white-space: nowrap;
}

.amount-cell.income { color: var(--accent-green); }
.amount-cell.expense { color: var(--accent-red); }

.row-actions { display: flex; gap: 4px; opacity: 0; transition: opacity 0.2s; }
tbody tr:hover .row-actions { opacity: 1; }

.icon-btn {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.icon-btn:hover { border-color: var(--accent-blue); }
.icon-btn.danger:hover { border-color: var(--accent-red); }

.empty-row {
  text-align: center;
  padding: 48px !important;
  color: var(--text-muted);
}

.empty-row span { font-size: 32px; display: block; margin-bottom: 8px; opacity: 0.4; }

/* Pagination */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 16px;
  border-top: 1px solid var(--border);
  font-size: 13px;
  color: var(--text-muted);
}

.pagination button {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 8px;
  width: 32px;
  height: 32px;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.pagination button:hover:not(:disabled) { border-color: var(--accent-green); color: var(--accent-green); }
.pagination button:disabled { opacity: 0.3; cursor: not-allowed; }
</style>
