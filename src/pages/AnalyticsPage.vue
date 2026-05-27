<template>
  <AppLayout>
    <div class="analytics-page">

      <!-- Financial health indicators -->
      <div class="indicators-row">
        <div class="indicator-card">
          <div class="ind-header">
            <span class="ind-icon">❤️</span>
            <span class="ind-label">Salud financiera</span>
          </div>
          <div class="ind-ring" :class="healthClass">
            <svg viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="24" fill="none" stroke="var(--bg-elevated)" stroke-width="6"/>
              <circle
                cx="28" cy="28" r="24" fill="none"
                :stroke="healthColor"
                stroke-width="6"
                stroke-linecap="round"
                stroke-dasharray="150.8"
                :stroke-dashoffset="150.8 - (150.8 * store.financialHealth / 100)"
                transform="rotate(-90 28 28)"
              />
            </svg>
            <span>{{ store.financialHealth }}%</span>
          </div>
          <p class="ind-desc">{{ healthText }}</p>
        </div>

        <div class="indicator-card">
          <div class="ind-header">
            <span class="ind-icon">💾</span>
            <span class="ind-label">Tasa de ahorro</span>
          </div>
          <div class="ind-value" :class="store.savingsRate >= 20 ? 'text-green' : store.savingsRate >= 10 ? 'text-amber' : 'text-red'">
            {{ store.savingsRate.toFixed(1) }}%
          </div>
          <div class="ind-bar">
            <div class="ind-fill" :style="{ width: `${Math.min(store.savingsRate, 100)}%` }" :class="store.savingsRate >= 20 ? 'fill-green' : store.savingsRate >= 10 ? 'fill-amber' : 'fill-red'" />
          </div>
          <p class="ind-desc">Meta recomendada: 20%</p>
        </div>

        <div class="indicator-card">
          <div class="ind-header">
            <span class="ind-icon">📊</span>
            <span class="ind-label">Nivel de deuda</span>
          </div>
          <div class="ind-value" :class="debtRatio > 50 ? 'text-red' : debtRatio > 30 ? 'text-amber' : 'text-green'">
            {{ debtRatio.toFixed(1) }}%
          </div>
          <div class="ind-bar">
            <div class="ind-fill" :style="{ width: `${Math.min(debtRatio, 100)}%` }" :class="debtRatio > 50 ? 'fill-red' : debtRatio > 30 ? 'fill-amber' : 'fill-green'" />
          </div>
          <p class="ind-desc">Deuda / Ingresos mensuales</p>
        </div>

        <div class="indicator-card">
          <div class="ind-header">
            <span class="ind-icon">💳</span>
            <span class="ind-label">Uso de crédito</span>
          </div>
          <div class="ind-value" :class="creditUsage > 70 ? 'text-red' : creditUsage > 30 ? 'text-amber' : 'text-green'">
            {{ creditUsage.toFixed(1) }}%
          </div>
          <div class="ind-bar">
            <div class="ind-fill" :style="{ width: `${Math.min(creditUsage, 100)}%` }" :class="creditUsage > 70 ? 'fill-red' : creditUsage > 30 ? 'fill-amber' : 'fill-green'" />
          </div>
          <p class="ind-desc">Cupo utilizado / Cupo total</p>
        </div>
      </div>

      <!-- Charts row -->
      <div class="charts-row">
        <IncomeExpenseBar />
        <ExpenseDonut title="Distribución de gastos" />
      </div>

      <!-- Top expenses + Projections -->
      <div class="analytics-grid">
        <!-- Top categories -->
        <div class="analysis-card">
          <h3 class="card-title">Top categorías de gasto</h3>
          <div class="top-cats">
            <div
              v-for="(item, i) in topCategories"
              :key="item.catId"
              class="top-cat-row"
            >
              <span class="rank">#{{ i + 1 }}</span>
              <span class="cat-pill" :style="{ background: item.color+'22', color: item.color }">
                {{ item.icon }} {{ item.name }}
              </span>
              <div class="cat-bar-wrap">
                <div class="cat-mini-bar">
                  <div
                    class="cat-mini-fill"
                    :style="{ width: `${item.percent}%`, background: item.color }"
                  />
                </div>
              </div>
              <span class="cat-amount mono">{{ formatCompact(item.amount) }}</span>
              <span class="cat-pct text-muted">{{ item.percent.toFixed(0) }}%</span>
            </div>
            <div class="empty-cats" v-if="!topCategories.length">
              <span>📭</span>
              <p>Sin gastos registrados</p>
            </div>
          </div>
        </div>

        <!-- Monthly summary -->
        <div class="analysis-card">
          <h3 class="card-title">Proyección mensual</h3>
          <div class="projection-content">
            <div class="proj-row">
              <span class="proj-label">Ingresos actuales</span>
              <span class="proj-value text-green mono">{{ formatCurrency(store.monthIncome) }}</span>
            </div>
            <div class="proj-row">
              <span class="proj-label">Gastos actuales</span>
              <span class="proj-value text-red mono">{{ formatCurrency(store.monthExpenses) }}</span>
            </div>
            <div class="proj-divider" />
            <div class="proj-row highlight">
              <span class="proj-label">Balance actual</span>
              <span class="proj-value mono" :class="store.remaining >= 0 ? 'text-green' : 'text-red'">
                {{ formatCurrency(store.remaining) }}
              </span>
            </div>
            <div class="proj-row">
              <span class="proj-label">Promedio gasto diario</span>
              <span class="proj-value mono">{{ formatCurrency(dailyAvg) }}</span>
            </div>
            <div class="proj-row">
              <span class="proj-label">Proyección a fin de mes</span>
              <span class="proj-value mono text-amber">{{ formatCurrency(projectedExpenses) }}</span>
            </div>
            <div class="proj-row">
              <span class="proj-label">Balance proyectado</span>
              <span class="proj-value mono" :class="projectedBalance >= 0 ? 'text-green' : 'text-red'">
                {{ formatCurrency(projectedBalance) }}
              </span>
            </div>
          </div>

          <!-- Recommendation -->
          <div class="recommendation" :class="store.remaining >= 0 ? 'rec-good' : 'rec-bad'">
            <span>{{ store.remaining >= 0 ? '💡' : '⚠️' }}</span>
            <p>{{ recommendation }}</p>
          </div>
        </div>
      </div>

      <!-- Monthly trend table -->
      <div class="trend-card">
        <h3 class="card-title">Evolución mensual</h3>
        <div class="trend-table">
          <table>
            <thead>
              <tr>
                <th>Mes</th>
                <th>Ingresos</th>
                <th>Gastos</th>
                <th>Balance</th>
                <th>Ahorro</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="month in store.monthlyTrend" :key="month.month">
                <td class="month-cell">{{ monthShort(month.month) }}</td>
                <td class="text-green mono-sm">{{ formatCurrency(month.income) }}</td>
                <td class="text-red mono-sm">{{ formatCurrency(month.expenses) }}</td>
                <td class="mono-sm" :class="month.income - month.expenses >= 0 ? 'text-green' : 'text-red'">
                  {{ formatCurrency(month.income - month.expenses) }}
                </td>
                <td>
                  <span class="savings-badge" :class="savingsClass(month)">
                    {{ month.income > 0 ? (((month.income - month.expenses) / month.income) * 100).toFixed(0) : 0 }}%
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppLayout from '@/layouts/AppLayout.vue'
import IncomeExpenseBar from '@/components/charts/IncomeExpenseBar.vue'
import ExpenseDonut from '@/components/charts/ExpenseDonut.vue'
import { useFinanceStore } from '@/stores/finance'
import { formatCurrency, formatCompact } from '@/utils/formatters'

const store = useFinanceStore()

const healthClass = computed(() => {
  const h = store.financialHealth
  return h >= 70 ? 'ring-good' : h >= 40 ? 'ring-medium' : 'ring-bad'
})

const healthColor = computed(() => {
  const h = store.financialHealth
  return h >= 70 ? 'var(--accent-green)' : h >= 40 ? 'var(--accent-amber)' : 'var(--accent-red)'
})

const healthText = computed(() => {
  const h = store.financialHealth
  if (h >= 80) return 'Excelentes hábitos financieros'
  if (h >= 60) return 'Buen manejo del dinero'
  if (h >= 40) return 'Hay áreas por mejorar'
  return 'Requiere atención urgente'
})

const debtRatio = computed(() =>
  store.monthIncome > 0 ? (store.totalDebt / store.monthIncome) * 100 : 0
)

const creditUsage = computed(() => {
  const creditAccs = store.accounts.filter(a => a.type === 'credit')
  const totalLimit = creditAccs.reduce((s, a) => s + (a.creditLimit || 0), 0)
  const totalUsed = creditAccs.reduce((s, a) => s + (a.usedCredit || 0), 0)
  return totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0
})

const topCategories = computed(() => {
  const total = store.monthExpenses
  return Object.entries(store.expensesByCategory)
    .map(([catId, amount]) => {
      const cat = store.getCategoryById(catId)
      return {
        catId, amount,
        name: cat?.name || 'Otro',
        icon: cat?.icon || '📦',
        color: cat?.color || '#6b7280',
        percent: total > 0 ? (amount / total) * 100 : 0
      }
    })
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6)
})

const today = new Date()
const dayOfMonth = today.getDate()
const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()

const dailyAvg = computed(() =>
  dayOfMonth > 0 ? store.monthExpenses / dayOfMonth : 0
)

const projectedExpenses = computed(() => dailyAvg.value * daysInMonth)
const projectedBalance = computed(() => store.monthIncome - projectedExpenses.value)

const recommendation = computed(() => {
  if (store.remaining >= 0 && store.savingsRate >= 20) return 'Excelente! Estás ahorrando más del 20% de tus ingresos.'
  if (store.remaining >= 0 && store.savingsRate >= 10) return 'Bien encaminado. Intenta aumentar tu tasa de ahorro al 20%.'
  if (store.remaining >= 0) return 'Estás en positivo pero el margen es bajo. Revisa tus gastos variables.'
  return `Gastos superan ingresos por ${formatCurrency(Math.abs(store.remaining))}. Considera reducir gastos no esenciales.`
})

function monthShort(month: string) {
  const [y, m] = month.split('-')
  return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('es-CO', { month: 'short', year: '2-digit' })
}

function savingsClass(m: { income: number; expenses: number }) {
  const rate = m.income > 0 ? ((m.income - m.expenses) / m.income) * 100 : 0
  return rate >= 20 ? 'badge-green' : rate >= 10 ? 'badge-amber' : 'badge-red'
}
</script>

<style scoped>
.analytics-page { display: flex; flex-direction: column; gap: 20px; }

/* Indicators */
.indicators-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.indicator-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 18px;
}

.ind-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.ind-icon { font-size: 18px; }
.ind-label { font-size: 12px; color: var(--text-muted); font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }

.ind-ring {
  position: relative;
  width: 56px; height: 56px;
  margin-bottom: 10px;
}

.ind-ring svg { width: 100%; height: 100%; }

.ind-ring span {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-primary);
}

.ind-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 26px;
  font-weight: 700;
  margin-bottom: 8px;
}

.ind-bar {
  height: 6px;
  background: var(--bg-elevated);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 8px;
}

.ind-fill { height: 100%; border-radius: 3px; transition: width 0.6s ease; }
.fill-green { background: var(--accent-green); }
.fill-amber { background: var(--accent-amber); }
.fill-red { background: var(--accent-red); }

.ind-desc { font-size: 11px; color: var(--text-muted); }

/* Charts row */
.charts-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

@media (min-width: 768px) {
  .charts-row { grid-template-columns: 2fr 1fr; }
}

/* Analytics grid */
.analytics-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

@media (min-width: 768px) {
  .analytics-grid { grid-template-columns: 1fr 1fr; }
}

.analysis-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 20px;
}

.card-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 16px;
}

/* Top categories */
.top-cats { display: flex; flex-direction: column; gap: 10px; }

.top-cat-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.rank { color: var(--text-muted); width: 20px; text-align: center; font-weight: 600; }

.cat-pill {
  font-size: 11px;
  font-weight: 500;
  padding: 3px 8px;
  border-radius: 6px;
  white-space: nowrap;
  min-width: 90px;
}

.cat-bar-wrap { flex: 1; }

.cat-mini-bar {
  height: 4px;
  background: var(--bg-elevated);
  border-radius: 2px;
  overflow: hidden;
}

.cat-mini-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.6s ease;
}

.cat-amount { font-size: 12px; color: var(--text-primary); font-weight: 600; white-space: nowrap; }
.cat-pct { color: var(--text-muted); font-size: 11px; width: 30px; text-align: right; }

.empty-cats {
  display: flex; flex-direction: column; align-items: center;
  gap: 8px; padding: 24px; color: var(--text-muted); font-size: 13px;
}

.empty-cats span { font-size: 28px; opacity: 0.4; }

/* Projection */
.projection-content { display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; }

.proj-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
}

.proj-row.highlight {
  background: var(--bg-elevated);
  padding: 8px 12px;
  border-radius: 8px;
}

.proj-label { font-size: 12px; color: var(--text-secondary); }
.proj-value { font-size: 13px; font-weight: 600; color: var(--text-primary); }

.proj-divider {
  height: 1px;
  background: var(--border);
  margin: 4px 0;
}

.recommendation {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 12px 14px;
  border-radius: 10px;
  font-size: 12px;
}

.recommendation span { font-size: 16px; flex-shrink: 0; }
.rec-good { background: var(--accent-green-dim); color: #00c47f; border: 1px solid rgba(0,214,143,0.15); }
.rec-bad { background: var(--accent-red-dim); color: #ff6b7a; border: 1px solid rgba(255,71,87,0.15); }

/* Trend table */
.trend-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 20px;
}

.trend-table { overflow-x: auto; }

table { width: 100%; border-collapse: collapse; }

th {
  padding: 10px 16px;
  text-align: left;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid var(--border);
}

td {
  padding: 12px 16px;
  color: var(--text-secondary);
  font-size: 13px;
  border-bottom: 1px solid rgba(35, 43, 62, 0.4);
}

tbody tr:hover { background: var(--bg-elevated); }
tbody tr:last-child td { border-bottom: none; }

.month-cell { color: var(--text-primary); font-weight: 500; text-transform: capitalize; }
.mono-sm { font-family: 'JetBrains Mono', monospace; font-size: 12px; }

.savings-badge {
  padding: 2px 8px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  font-family: 'JetBrains Mono', monospace;
}

.badge-green { background: var(--accent-green-dim); color: var(--accent-green); }
.badge-amber { background: var(--accent-amber-dim); color: var(--accent-amber); }
.badge-red { background: var(--accent-red-dim); color: var(--accent-red); }

.text-green { color: var(--accent-green); }
.text-red { color: var(--accent-red); }
.text-amber { color: var(--accent-amber); }
.text-muted { color: var(--text-muted); }
.mono { font-family: 'JetBrains Mono', monospace; }
</style>
