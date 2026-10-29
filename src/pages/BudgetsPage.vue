<template>
  <AppLayout>
    <div class="budgets-page">
      <div class="page-header">
        <p class="subtitle">Tu plan del mes, tus metas de ahorro y consejos con tus datos</p>
      </div>

      <!-- Plan del mes -->
      <section class="block">
        <h2 class="section-title">🧭 Plan de {{ formatMonth(store.selectedMonth) }}</h2>
        <div class="plan-grid">
          <div class="plan-card">
            <span>Ingreso neto</span>
            <strong>{{ formatCurrency(plan.income) }}</strong>
            <small>2 quincenas de {{ formatCurrency(store.quincenaValue) }}</small>
          </div>
          <div class="plan-card red">
            <span>Obligaciones</span>
            <strong>-{{ formatCurrency(plan.obligations) }}</strong>
            <small>Lo que pagas en las quincenas</small>
          </div>
          <div class="plan-card blue">
            <span>Ahorro de metas</span>
            <strong>-{{ formatCurrency(plan.savings) }}</strong>
            <small>{{ formatCurrency(plan.savings / 2) }} por quincena</small>
          </div>
          <div class="plan-card" :class="plan.free < 0 ? 'red' : 'green'">
            <span>Libre para gastar</span>
            <strong :class="plan.free < 0 ? 'text-red' : 'text-green'">{{ signed(plan.free) }}</strong>
            <small>Comida, transporte, salidas...</small>
          </div>
        </div>

        <div v-if="plan.income > 0" class="plan-bar" :title="'Obligaciones · Ahorro · Libre'">
          <div class="seg seg-red" :style="{ width: `${barPart(plan.obligations)}%` }" />
          <div class="seg seg-blue" :style="{ width: `${barPart(plan.savings)}%` }" />
          <div class="seg seg-green" :style="{ width: `${barPart(Math.max(0, plan.free))}%` }" />
        </div>

        <div class="plan-spent">
          <div>
            <span>Gastado con débito y efectivo</span>
            <strong>{{ formatCurrency(plan.spentCash) }}</strong>
          </div>
          <div>
            <span>Te queda para gastar</span>
            <strong :class="plan.leftToSpend < 0 ? 'text-red' : 'text-green'">{{ signed(plan.leftToSpend) }}</strong>
          </div>
          <div>
            <span>Compras con crédito (deuda nueva)</span>
            <strong :class="plan.spentCredit > 0 ? 'text-amber' : ''">{{ formatCurrency(plan.spentCredit) }}</strong>
          </div>
        </div>
      </section>

      <!-- Asesor -->
      <section class="block">
        <h2 class="section-title">🤖 Tu asesor</h2>
        <div class="advice-list">
          <div v-for="(tip, i) in advice" :key="i" class="advice" :class="tip.level">
            <span class="advice-icon">{{ tip.icon }}</span>
            <div>
              <strong>{{ tip.title }}</strong>
              <p>{{ tip.text }}</p>
            </div>
          </div>
        </div>
        <p class="disclaimer">
          Sugerencias automáticas calculadas con los datos de la app. No reemplazan la asesoría de un profesional financiero.
        </p>
      </section>

      <!-- Metas de ahorro -->
      <section class="block">
        <div class="section-head">
          <h2 class="section-title">🎯 Metas de ahorro</h2>
          <button class="btn-add" @click="openGoal(null)">+ Nueva meta</button>
        </div>

        <div class="goals-grid">
          <div v-for="{ goal, st } in goalCards" :key="goal.id" class="goal-card" :class="{ inactive: !goal.active }">
            <div class="goal-top">
              <span class="goal-icon">{{ goal.icon }}</span>
              <div class="goal-info">
                <h3>{{ goal.name }}</h3>
                <p v-if="goal.kind === 'emergency'">Para imprevistos · {{ store.emergencyFund.months }} meses de sueldo</p>
                <p v-else>Para el {{ formatDate(goal.targetDate) }}</p>
              </div>
              <span class="goal-badge" :class="badgeClass(st)">{{ badgeText(goal, st) }}</span>
            </div>

            <div class="goal-amounts">
              <strong>{{ formatCurrency(st.saved) }}</strong>
              <span>de {{ formatCurrency(goal.kind === 'emergency' ? store.emergencyFund.target : goal.targetAmount) }}</span>
            </div>

            <div v-if="goal.kind === 'emergency' && store.emergencyFund.locked" class="goal-lock">
              <strong>🔒 Aún no se puede sacar fondo de emergencia</strong>
              <p>{{ store.emergencyFund.reason }}</p>
              <p>
                Cuando la deuda baje de {{ formatCurrency(store.emergencyFund.debtLimit) }} y las quincenas alcancen,
                arranca solo con {{ formatCurrency(store.emergencyFund.monthly / 2) }} por quincena.
              </p>
            </div>
            <div class="budget-bar-full">
              <div class="budget-bar-fill" :style="{ width: `${st.percent}%`, background: 'var(--accent-green)' }" />
            </div>

            <div class="budget-numbers">
              <div class="num-item">
                <span>Al mes</span>
                <strong>{{ formatCurrency(st.monthly) }}</strong>
              </div>
              <div class="num-item">
                <span>Por quincena</span>
                <strong>{{ formatCurrency(st.perQuincena) }}</strong>
              </div>
              <div class="num-item">
                <span>Faltan</span>
                <strong>{{ formatCurrency(st.remaining) }}</strong>
              </div>
            </div>

            <p v-if="goal.kind === 'emergency'" class="goal-note">
              Cubrir
              <select :value="store.emergencyFund.months" @change="setEmergencyMonths(goal, Number(($event.target as HTMLSelectElement).value))">
                <option :value="3">3 meses</option>
                <option :value="4">4 meses</option>
                <option :value="6">6 meses</option>
              </select>
              de sueldo neto · se ahorra el 10 % del sueldo
            </p>
            <p v-else-if="!st.started" class="goal-note">
              Empieza el {{ formatDate(goal.startDate) }} · {{ st.monthsLeft }} meses de ahorro
            </p>
            <p v-else-if="st.late" class="goal-note warn">
              Vas atrasado: deberías llevar {{ formatCurrency(st.expectedNow) }}
            </p>

            <details v-if="goal.items.length" class="goal-details">
              <summary>Desglose ({{ goal.items.length }})</summary>
              <div v-for="item in goal.items" :key="item.id" class="detail-row">
                <span>{{ item.name }}</span>
                <span class="mono">{{ formatCurrency(item.amount) }}</span>
              </div>
            </details>

            <details v-if="goal.contributions.length" class="goal-details">
              <summary>Abonos ({{ goal.contributions.length }})</summary>
              <div v-for="c in sortedContributions(goal)" :key="c.id" class="detail-row">
                <span>{{ formatDate(c.date) }}</span>
                <span class="mono" :class="c.amount < 0 ? 'text-red' : 'text-green'">{{ signed(c.amount) }}</span>
                <button class="mini-btn" title="Quitar abono" @click="removeContribution(goal, c.id)">✕</button>
              </div>
            </details>

            <p v-if="goal.notes" class="goal-notes">{{ goal.notes }}</p>

            <div class="budget-actions">
              <button class="btn-edit" @click="openContribution(goal)">💵 Abonar</button>
              <button v-if="goal.kind !== 'emergency'" class="btn-edit" @click="openGoal(goal)">Editar</button>
              <button class="btn-delete" @click="removeGoal(goal)">Eliminar</button>
            </div>
          </div>

          <div v-if="!hasEmergencyFund" class="budget-add-card" @click="createEmergencyFund">
            <span>🛟</span>
            <p>Crear fondo de emergencia</p>
            <small>{{ store.emergencyFund.months }} meses de sueldo · {{ formatCurrency(store.emergencyFund.target) }}</small>
          </div>

          <div class="budget-add-card" @click="openGoal(null)">
            <span>+</span>
            <p>Crear meta de ahorro</p>
          </div>
        </div>
      </section>

      <!-- Presupuesto por categoría -->
      <section class="block">
        <div class="section-head">
          <h2 class="section-title">💰 Topes de gasto por categoría</h2>
          <div class="head-actions">
            <button class="btn-ghost" @click="openSuggestions">✨ Sugerir con mi historial</button>
            <button class="btn-add" @click="showModal = true">+ Nuevo</button>
          </div>
        </div>
        <p class="section-help">
          Un tope es el máximo que te permites gastar al mes en algo, por ejemplo 400.000 en Comida o 200.000 en
          Salidas. La app suma lo que registras en esa categoría y te avisa al llegar al 80 % y si te pasas, también
          justo al registrar el gasto. Con "Sugerir" se proponen topes según lo que gastaste los últimos 3 meses.
        </p>

      <!-- Global summary -->
      <div class="budget-overview">
        <div class="overview-card">
          <p class="ov-label">Presupuesto total</p>
          <p class="ov-value mono">{{ formatCurrency(totalBudget) }}</p>
        </div>
        <div class="overview-card red">
          <p class="ov-label">Total gastado</p>
          <p class="ov-value mono">{{ formatCurrency(totalSpent) }}</p>
        </div>
        <div class="overview-card" :class="totalAvailable >= 0 ? 'green' : 'red'">
          <p class="ov-label">Disponible</p>
          <p class="ov-value mono">{{ formatCurrency(totalAvailable) }}</p>
        </div>
        <div class="overview-card">
          <p class="ov-label">Progreso global</p>
          <div class="ov-progress">
            <div class="ov-bar">
              <div
                class="ov-fill"
                :style="{ width: `${Math.min(globalPercent, 100)}%` }"
                :class="globalPercent > 90 ? 'fill-red' : globalPercent > 70 ? 'fill-amber' : 'fill-green'"
              />
            </div>
            <span class="ov-pct">{{ globalPercent.toFixed(0) }}%</span>
          </div>
        </div>
      </div>

      <!-- Budget items -->
      <div class="budgets-grid">
        <div
          v-for="item in store.budgetProgress"
          :key="item.id"
          class="budget-item"
          :class="{ exceeded: item.exceeded }"
        >
          <div class="budget-top">
            <div class="cat-icon-lg" :style="{ background: item.category?.color + '22', color: item.category?.color }">
              {{ item.category?.icon }}
            </div>
            <div class="budget-info">
              <h3>{{ item.category?.name }}</h3>
              <p class="budget-period">{{ item.month ? formatMonth(item.month) : 'Todos los meses' }}</p>
            </div>
            <div class="budget-pct-badge" :class="item.exceeded ? 'badge-red' : item.percentage > 70 ? 'badge-amber' : 'badge-green'">
              {{ item.percentage.toFixed(0) }}%
            </div>
          </div>
          <div class="budget-numbers">
            <div class="num-item">
              <span>Presupuesto</span>
              <strong>{{ formatCurrency(item.amount) }}</strong>
            </div>
            <div class="num-item">
              <span>Gastado</span>
              <strong :class="item.exceeded ? 'text-red' : ''">{{ formatCurrency(item.spent) }}</strong>
            </div>
            <div class="num-item">
              <span>{{ item.exceeded ? 'Excedido' : 'Disponible' }}</span>
              <strong :class="item.exceeded ? 'text-red' : 'text-green'">
                {{ formatCurrency(Math.abs(item.amount - item.spent)) }}
              </strong>
            </div>
          </div>
          <div class="budget-bar-wrap">
            <div class="budget-bar-full">
              <div
                class="budget-bar-fill"
                :style="{
                  width: `${Math.min(item.percentage, 100)}%`,
                  background: item.exceeded ? 'var(--accent-red)' : item.category?.color || '#6b7280'
                }"
              />
            </div>
          </div>
          <div class="budget-alert" v-if="item.exceeded">
            🚨 Presupuesto superado en {{ formatCurrency(item.spent - item.amount) }}
          </div>
          <div class="budget-warning" v-else-if="item.percentage > 80">
            ⚠️ Casi al límite — te quedan {{ formatCurrency(item.amount - item.spent) }}
          </div>
          <div class="budget-actions">
            <button @click="openEdit(item)" class="btn-edit">Editar</button>
            <button @click="removeBudget(item.id)" class="btn-delete">Eliminar</button>
          </div>
        </div>

        <div class="budget-add-card" @click="showModal = true">
          <span>+</span>
          <p>Agregar tope de gasto</p>
        </div>
      </div>
      </section>
    </div>
  </AppLayout>

  <!-- Presupuesto -->
  <Teleport to="body">
    <div class="modal-backdrop" v-if="showModal" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <h2>{{ editItem ? 'Editar tope de gasto' : 'Nuevo tope de gasto' }}</h2>
          <button @click="closeModal">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group full">
              <label>Categoría *</label>
              <CategorySelect v-model="form.categoryId" type="expense" />
            </div>
            <div class="form-group full">
              <label>Máximo al mes *</label>
              <input v-model.number="form.amount" type="number" placeholder="0" />
              <small v-if="averageFor(form.categoryId)" class="hint">
                Tu promedio de los últimos 3 meses: {{ formatCurrency(averageFor(form.categoryId)) }}
              </small>
            </div>
            <div class="form-group full">
              <label>Aplica</label>
              <select v-model="form.scope">
                <option value="all">Todos los meses</option>
                <option value="month">Solo {{ formatMonth(store.selectedMonth) }}</option>
              </select>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="closeModal">Cancelar</button>
          <button class="btn-save" @click="save" :disabled="!form.categoryId || !form.amount">
            Guardar
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Sugerencias -->
  <Teleport to="body">
    <div class="modal-backdrop" v-if="showSuggestions" @click.self="showSuggestions = false">
      <div class="modal">
        <div class="modal-header">
          <h2>Topes sugeridos</h2>
          <button @click="showSuggestions = false">✕</button>
        </div>
        <div class="modal-body">
          <p class="hint">
            Según lo que gastaste en promedio los últimos 3 meses<template v-if="plan.free > 0">, ajustado para que
            quepa en lo libre del mes ({{ formatCurrency(plan.free) }})</template><template v-else>. Como este mes no
            queda dinero libre, se propone la mitad de lo que sueles gastar</template>. Se guardan para todos los meses.
          </p>
          <div v-if="!suggestions.length" class="hint">Aún no hay suficientes movimientos para sugerir.</div>
          <label v-for="s in suggestions" :key="s.categoryId" class="suggest-row">
            <input v-model="s.include" type="checkbox" />
            <span class="suggest-name">{{ s.icon }} {{ s.name }}</span>
            <small>prom. {{ formatCurrency(s.average) }}</small>
            <input v-model.number="s.amount" type="number" min="0" class="suggest-amount" />
          </label>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="showSuggestions = false">Cancelar</button>
          <button class="btn-save" :disabled="busy || !suggestions.some(s => s.include)" @click="applySuggestions">
            {{ busy ? 'Guardando...' : 'Guardar topes' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Abonar a una meta -->
  <Teleport to="body">
    <div class="modal-backdrop" v-if="contributionGoal" @click.self="contributionGoal = null">
      <div class="modal">
        <div class="modal-header">
          <h2>{{ contributionGoal.icon }} {{ contributionGoal.name }}</h2>
          <button @click="contributionGoal = null">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group full">
              <label>Monto *</label>
              <input v-model.number="contribution.amount" type="number" min="0" placeholder="0" />
              <small class="hint">Sugerido por quincena: {{ formatCurrency(goalStatus(contributionGoal, today, store.emergencyFund).perQuincena) }}</small>
            </div>
            <div class="form-group full">
              <label>Fecha</label>
              <input v-model="contribution.date" type="date" />
            </div>
            <label class="check">
              <input v-model="contribution.withdraw" type="checkbox" />
              Es un retiro (saqué dinero de la meta)
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="contributionGoal = null">Cancelar</button>
          <button class="btn-save" :disabled="busy || !contribution.amount" @click="saveContribution">
            {{ busy ? 'Guardando...' : contribution.withdraw ? 'Retirar' : 'Abonar' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <SavingsGoalModal v-if="goalModal" :goal="editingGoal" @close="goalModal = false" />
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import AppLayout from '@/layouts/AppLayout.vue'
import CategorySelect from '@/components/CategorySelect.vue'
import SavingsGoalModal from '@/components/modals/SavingsGoalModal.vue'
import { useFinanceStore } from '@/stores/finance'
import { formatCurrency, formatDate, formatMonth } from '@/utils/formatters'
import { todayISO } from '@/utils/dates'
import { averageSpending, goalStatus, suggestBudgets, type GoalStatus } from '@/utils/plan'
import type { SavingsGoal } from '@/interfaces'

const store = useFinanceStore()
const today = todayISO()
const busy = ref(false)

const signed = (n: number) => `${n < 0 ? '-' : ''}${formatCurrency(n)}`

// ---------------------------------------------------------------- Plan del mes

const plan = computed(() => store.currentPlan)

// Partes de la barra: sobre el ingreso, o sobre el total si las obligaciones lo pasan
function barPart(value: number) {
  const base = Math.max(plan.value.income, plan.value.obligations + plan.value.savings + Math.max(0, plan.value.free))
  return base > 0 ? (value / base) * 100 : 0
}

// ---------------------------------------------------------------- Asesor

const average = computed(() => averageSpending(store.transactions, store.selectedMonth))

const advice = computed(() => store.advisorTips)

// ---------------------------------------------------------------- Metas

const goalCards = computed(() =>
  store.savingsGoals.map(goal => ({ goal, st: goalStatus(goal, today, store.emergencyFund) }))
)
const hasEmergencyFund = computed(() => store.savingsGoals.some(g => g.kind === 'emergency'))

// Fondo de emergencia: su total sale del sueldo; se crea aunque esté bloqueado
async function createEmergencyFund() {
  if (busy.value) return
  busy.value = true
  try {
    await store.addSavingsGoal({
      name: 'Fondo de emergencia',
      icon: '🛟',
      color: '#4a9eff',
      kind: 'emergency',
      months: 3,
      targetAmount: store.emergencyFund.target,
      startDate: today,
      targetDate: today,
      items: [],
      contributions: [],
      notes: '',
      active: true
    })
  } finally {
    busy.value = false
  }
}

async function setEmergencyMonths(goal: SavingsGoal, months: number) {
  await store.updateSavingsGoal(goal.id, { months })
}

const goalModal = ref(false)
const editingGoal = ref<SavingsGoal | null>(null)

function openGoal(goal: SavingsGoal | null) {
  editingGoal.value = goal
  goalModal.value = true
}

function badgeClass(st: GoalStatus) {
  if (st.done) return 'badge-green'
  if (st.late) return 'badge-amber'
  return st.started ? 'badge-green' : 'badge-blue'
}

function badgeText(goal: SavingsGoal, st: GoalStatus) {
  if (!goal.active) return 'Pausada'
  if (st.done) return '¡Lista!'
  return `${st.percent.toFixed(0)}%`
}

function sortedContributions(goal: SavingsGoal) {
  return [...goal.contributions].sort((a, b) => b.date.localeCompare(a.date))
}

async function removeGoal(goal: SavingsGoal) {
  if (!confirm(`¿Eliminar la meta "${goal.name}"? Se pierde el registro de sus abonos.`)) return
  await store.deleteSavingsGoal(goal.id)
}

const contributionGoal = ref<SavingsGoal | null>(null)
const contribution = reactive({ amount: 0, date: today, withdraw: false })

function openContribution(goal: SavingsGoal) {
  contributionGoal.value = goal
  Object.assign(contribution, { amount: goalStatus(goal, today, store.emergencyFund).perQuincena, date: today, withdraw: false })
}

async function saveContribution() {
  const goal = contributionGoal.value
  if (!goal || !contribution.amount || busy.value) return
  busy.value = true
  try {
    const amount = Math.abs(contribution.amount) * (contribution.withdraw ? -1 : 1)
    await store.updateSavingsGoal(goal.id, {
      contributions: [...goal.contributions, { id: `ab_${Date.now()}`, date: contribution.date, amount }]
    })
    contributionGoal.value = null
  } finally {
    busy.value = false
  }
}

async function removeContribution(goal: SavingsGoal, id: string) {
  if (!confirm('¿Quitar este abono?')) return
  await store.updateSavingsGoal(goal.id, { contributions: goal.contributions.filter(c => c.id !== id) })
}

// ---------------------------------------------------------------- Presupuestos

const showModal = ref(false)
const editItem = ref<{ id: string; categoryId: string; amount: number; month?: string } | null>(null)

const totalBudget = computed(() => store.budgetProgress.reduce((s, b) => s + b.amount, 0))
const totalSpent = computed(() => store.budgetProgress.reduce((s, b) => s + b.spent, 0))
const totalAvailable = computed(() => totalBudget.value - totalSpent.value)
const globalPercent = computed(() => totalBudget.value > 0 ? (totalSpent.value / totalBudget.value) * 100 : 0)

const defaultForm = () => ({ categoryId: '', amount: 0, scope: 'all' as 'all' | 'month' })
const form = reactive(defaultForm())

const averageFor = (categoryId: string) => Math.round(average.value[categoryId] || 0)

function openEdit(item: { id: string; categoryId: string; amount: number; month?: string }) {
  editItem.value = item
  form.categoryId = item.categoryId
  form.amount = item.amount
  form.scope = item.month ? 'month' : 'all'
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editItem.value = null
  Object.assign(form, defaultForm())
}

async function save() {
  const month = form.scope === 'month' ? store.selectedMonth : undefined
  // Si cambió de "todos los meses" a "solo este mes" (o al revés) se quita el anterior
  if (editItem.value && (editItem.value.month || '') !== (month || '') ) {
    await store.deleteBudget(editItem.value.id)
  }
  await store.saveBudget({ categoryId: form.categoryId, amount: form.amount, month })
  closeModal()
}

async function removeBudget(id: string) {
  if (!confirm('¿Eliminar este presupuesto?')) return
  await store.deleteBudget(id)
}

const showSuggestions = ref(false)
const suggestions = ref<{ categoryId: string; name: string; icon: string; average: number; amount: number; include: boolean }[]>([])

function openSuggestions() {
  const suggested = suggestBudgets(average.value, plan.value.free)
  suggestions.value = Object.entries(suggested)
    .map(([categoryId, amount]) => {
      const cat = store.getCategoryById(categoryId)
      return {
        categoryId,
        name: cat?.name || categoryId,
        icon: cat?.icon || '📦',
        average: Math.round(average.value[categoryId] || 0),
        amount,
        include: !store.budgets.some(b => b.categoryId === categoryId)
      }
    })
    // Intereses y comisiones no se controlan con presupuesto: se bajan pagando la deuda
    .filter(s => !/intereses/i.test(s.name))
    .sort((a, b) => b.average - a.average)
  showSuggestions.value = true
}

async function applySuggestions() {
  if (busy.value) return
  busy.value = true
  try {
    for (const s of suggestions.value.filter(s => s.include && s.amount > 0)) {
      await store.saveBudget({ categoryId: s.categoryId, amount: s.amount })
    }
    showSuggestions.value = false
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.budgets-page { display: flex; flex-direction: column; gap: 20px; }

.page-header { display: flex; justify-content: space-between; align-items: center; }
.subtitle { font-size: 13px; color: var(--text-muted); }

.btn-add {
  background: linear-gradient(135deg, var(--accent-green), #00b377);
  border: none; border-radius: 10px; padding: 10px 20px;
  color: #000; font-weight: 600; font-size: 13px;
  cursor: pointer; font-family: 'DM Sans', sans-serif;
}

.budget-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.overview-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 16px;
}

.overview-card.green { border-top: 3px solid var(--accent-green); }
.overview-card.red { border-top: 3px solid var(--accent-red); }

.ov-label { font-size: 11px; color: var(--text-muted); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
.ov-value { font-size: 20px; font-weight: 600; color: var(--text-primary); }

.ov-progress { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
.ov-bar { flex: 1; height: 6px; background: var(--bg-elevated); border-radius: 3px; overflow: hidden; }
.ov-fill { height: 100%; border-radius: 3px; transition: width 0.6s ease; }
.fill-green { background: var(--accent-green); }
.fill-amber { background: var(--accent-amber); }
.fill-red { background: var(--accent-red); }
.ov-pct { font-size: 12px; font-weight: 600; color: var(--text-primary); }

.budgets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.budget-item {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  transition: all 0.3s;
}

.budget-item:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(0,0,0,0.3); }
.budget-item.exceeded { border-color: rgba(255, 71, 87, 0.2); }

.budget-top { display: flex; align-items: center; gap: 12px; }

.cat-icon-lg {
  width: 44px; height: 44px;
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; flex-shrink: 0;
}

.budget-info { flex: 1; }
.budget-info h3 { font-size: 16px; font-weight: 700; color: var(--text-primary); }
.budget-period { font-size: 11px; color: var(--text-muted); margin-top: 2px; text-transform: capitalize; }

.budget-pct-badge {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 20px;
}

.badge-green { background: var(--accent-green-dim); color: var(--accent-green); }
.badge-amber { background: var(--accent-amber-dim); color: var(--accent-amber); }
.badge-red { background: var(--accent-red-dim); color: var(--accent-red); }

.budget-numbers {
  display: flex;
  justify-content: space-between;
  background: var(--bg-elevated);
  border-radius: 10px;
  padding: 12px;
}

.num-item { display: flex; flex-direction: column; gap: 3px; align-items: center; }
.num-item span { font-size: 10px; color: var(--text-muted); text-transform: uppercase; }
.num-item strong { font-family: 'JetBrains Mono', monospace; font-size: 13px; color: var(--text-primary); }

.budget-bar-wrap {}
.budget-bar-full {
  height: 8px;
  background: var(--bg-elevated);
  border-radius: 4px;
  overflow: hidden;
}

.budget-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.6s ease;
}

.budget-alert {
  background: var(--accent-red-dim);
  border: 1px solid rgba(255, 71, 87, 0.15);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 12px;
  color: var(--accent-red);
}

.budget-warning {
  background: var(--accent-amber-dim);
  border: 1px solid rgba(245, 158, 11, 0.15);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 12px;
  color: var(--accent-amber);
}

.budget-actions { display: flex; gap: 8px; }

.btn-edit {
  flex: 1; padding: 7px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 8px; font-size: 12px;
  cursor: pointer; color: var(--text-secondary);
  transition: all 0.2s; font-family: 'DM Sans', sans-serif;
}

.btn-edit:hover { border-color: var(--accent-blue); color: var(--accent-blue); }

.btn-delete {
  padding: 7px 14px;
  background: none;
  border: 1px solid var(--border);
  border-radius: 8px; font-size: 12px;
  cursor: pointer; color: var(--text-muted);
  transition: all 0.2s; font-family: 'DM Sans', sans-serif;
}

.btn-delete:hover { border-color: var(--accent-red); color: var(--accent-red); }

.budget-add-card {
  background: var(--bg-card);
  border: 2px dashed var(--border-light);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 200px;
  cursor: pointer;
  color: var(--text-muted);
  font-size: 14px;
  transition: all 0.2s;
}

.budget-add-card span { font-size: 28px; opacity: 0.5; }

.budget-add-card:hover {
  border-color: var(--accent-green);
  color: var(--accent-green);
  background: rgba(0, 214, 143, 0.04);
}

/* Modal */
.modal-backdrop {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(4px);
  z-index: 100;
  display: flex; align-items: center; justify-content: center;
  padding: 16px;
}

.modal {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 20px;
  width: 100%; max-width: 460px;
  /* Nunca más alto que la pantalla: el contenido se desplaza por dentro */
  max-height: calc(100dvh - 32px);
  display: flex; flex-direction: column;
  overflow: hidden;
  animation: fadeInUp 0.3s ease;
}

.modal-header {
  padding: 24px 24px 0;
  display: flex; justify-content: space-between; align-items: center;
}

.modal-header h2 { font-size: 20px; font-weight: 700; color: var(--text-primary); }
.modal-header button {
  background: var(--bg-elevated); border: 1px solid var(--border);
  border-radius: 8px; width: 32px; height: 32px;
  cursor: pointer; color: var(--text-secondary); font-size: 14px;
}

.modal-body { padding: 20px 24px; flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden; }
.form-grid { display: grid; grid-template-columns: 1fr; gap: 14px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group.full { grid-column: 1 / -1; }

.form-group label {
  font-size: 11px; color: var(--text-muted);
  text-transform: uppercase; letter-spacing: 0.5px; font-weight: 500;
}

.form-group input, .form-group select {
  background: var(--bg-elevated); border: 1px solid var(--border);
  border-radius: 10px; padding: 10px 12px;
  color: var(--text-primary); font-size: 14px;
  font-family: 'DM Sans', sans-serif; width: 100%;
}

.form-group input:focus, .form-group select:focus {
  outline: none; border-color: var(--accent-green);
}

.modal-footer {
  padding: 12px 24px 20px;
  display: flex; gap: 10px; justify-content: flex-end;
  flex-shrink: 0;
  border-top: 1px solid var(--border);
}

.btn-cancel {
  padding: 10px 20px; background: var(--bg-elevated);
  border: 1px solid var(--border); border-radius: 10px;
  color: var(--text-secondary); font-size: 14px;
  cursor: pointer; font-family: 'DM Sans', sans-serif;
}

.btn-save {
  padding: 10px 24px;
  background: linear-gradient(135deg, var(--accent-green), #00b377);
  border: none; border-radius: 10px;
  color: #000; font-size: 14px; font-weight: 600;
  cursor: pointer; font-family: 'DM Sans', sans-serif;
}

.btn-save:disabled { opacity: 0.4; cursor: not-allowed; }

.text-red { color: var(--accent-red) !important; }
.text-green { color: var(--accent-green) !important; }
.mono { font-family: 'JetBrains Mono', monospace; }
option { background: var(--bg-elevated); }

/* ---- Plan, asesor y metas ---- */
.block { display: flex; flex-direction: column; gap: 14px; }
.section-title { font-size: 17px; font-weight: 700; color: var(--text-primary); text-transform: none; }
.section-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; }
.head-actions { display: flex; gap: 8px; flex-wrap: wrap; }

.btn-ghost {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 14px;
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
}

.plan-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 12px;
}

.plan-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--bg-card);
}

.plan-card.red { border-top: 3px solid var(--accent-red); }
.plan-card.blue { border-top: 3px solid var(--accent-blue); }
.plan-card.green { border-top: 3px solid var(--accent-green); }
.plan-card span { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
.plan-card strong { font-family: 'JetBrains Mono', monospace; font-size: 19px; color: var(--text-primary); }
.plan-card small { font-size: 12px; color: var(--text-muted); }

.plan-bar { display: flex; height: 10px; border-radius: 5px; overflow: hidden; background: var(--bg-elevated); }
.seg { height: 100%; transition: width 0.5s ease; }
.seg-red { background: var(--accent-red); }
.seg-blue { background: var(--accent-blue); }
.seg-green { background: var(--accent-green); }

.plan-spent {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 10px;
  padding: 12px 14px;
  border-radius: 14px;
  background: var(--bg-elevated);
}

.plan-spent div { display: flex; flex-direction: column; gap: 2px; }
.plan-spent span { font-size: 12px; color: var(--text-muted); }
.plan-spent strong { font-family: 'JetBrains Mono', monospace; font-size: 15px; color: var(--text-primary); }

.advice-list { display: flex; flex-direction: column; gap: 10px; }

.advice {
  display: flex;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid var(--border);
  border-left: 4px solid var(--accent-blue);
  background: var(--bg-card);
}

.advice.danger { border-left-color: var(--accent-red); background: rgba(255, 71, 87, 0.06); }
.advice.warn { border-left-color: var(--accent-amber); }
.advice.good { border-left-color: var(--accent-green); }
.advice-icon { font-size: 22px; line-height: 1.2; }
.advice strong { font-size: 14px; color: var(--text-primary); }
.advice p { font-size: 13px; color: var(--text-secondary); margin-top: 3px; line-height: 1.45; }
.disclaimer { font-size: 11px; color: var(--text-muted); }

.goals-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.goal-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 18px;
  border-radius: 16px;
  border: 1px solid var(--border);
  background: var(--bg-card);
}

.goal-card.inactive { opacity: 0.6; }
.goal-top { display: flex; align-items: center; gap: 12px; }
.goal-icon { font-size: 30px; }
.goal-info { flex: 1; min-width: 0; }
.goal-info h3 { font-size: 16px; font-weight: 700; color: var(--text-primary); }
.goal-info p { font-size: 12px; color: var(--text-muted); margin-top: 2px; }

.goal-badge { padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; }
.badge-blue { background: rgba(74, 158, 255, 0.15); color: var(--accent-blue); }

.goal-amounts { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
.goal-amounts strong { font-family: 'JetBrains Mono', monospace; font-size: 20px; color: var(--accent-green); }
.goal-amounts span { font-size: 13px; color: var(--text-muted); }

.goal-note { font-size: 12px; color: var(--text-secondary); }
.goal-note.warn { color: var(--accent-amber); }
.goal-notes { font-size: 12px; color: var(--text-muted); white-space: pre-line; }

.goal-details summary { font-size: 13px; color: var(--text-secondary); cursor: pointer; }

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid var(--border);
  font-size: 13px;
  color: var(--text-secondary);
}

.mini-btn { background: none; border: none; color: var(--text-muted); cursor: pointer; }

.hint { font-size: 12px; color: var(--text-muted); }

.check { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-secondary); }
.check input { width: 16px; height: 16px; accent-color: var(--accent-green); }

.suggest-row {
  display: grid;
  grid-template-columns: 18px 1fr auto 120px;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
  font-size: 13px;
  color: var(--text-primary);
}

.suggest-row small { color: var(--text-muted); font-size: 11px; }

.suggest-amount {
  width: 100%;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 6px 8px;
  color: var(--text-primary);
}

.modal-body { display: flex; flex-direction: column; gap: 10px; }

@media (max-width: 480px) {
  .modal-backdrop { padding: 10px; align-items: flex-end; }
  .modal-header { padding: 18px 18px 0; }
  .modal-body { padding: 16px 18px; }
  .modal-footer { padding: 12px 18px 16px; }
}
.text-amber { color: var(--accent-amber) !important; }

.goal-lock {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.goal-lock strong { font-size: 13px; color: var(--accent-amber); }
.goal-lock p { font-size: 12px; color: var(--text-secondary); line-height: 1.4; }

.goal-note select {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-primary);
  padding: 2px 4px;
}

.section-help { font-size: 13px; color: var(--text-secondary); line-height: 1.5; margin-top: -6px; }
.budget-add-card small { font-size: 12px; color: var(--text-muted); }

@media (max-width: 480px) {
  .plan-grid, .plan-spent { grid-template-columns: 1fr 1fr; gap: 8px; }
  .plan-card { padding: 12px; }
  .plan-card strong { font-size: 16px; }
  .goals-grid { grid-template-columns: 1fr; }
  .budget-add-card { min-height: 90px; padding: 16px; }
  .suggest-row { grid-template-columns: 18px 1fr 100px; }
  .suggest-row small { display: none; }
}
</style>
