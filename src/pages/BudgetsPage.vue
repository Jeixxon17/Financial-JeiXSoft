<template>
  <TpLayout>
    <!-- ===== Encabezado ===== -->
    <div class="flex flex-wrap items-center gap-3">
      <div class="min-w-0 flex-[1_1_220px]">
        <h1 :class="pageTitle">Presupuesto y ahorro</h1>
        <p class="mt-0.5 text-[13px]/[18px] text-ink-muted lg:text-sm">Tu plan del mes, tus metas y los consejos del asesor.</p>
      </div>
      <TpMonthPicker />
    </div>

    <div class="grid grid-cols-[minmax(0,1fr)] items-start gap-[18px] lg:gap-6 min-[1100px]:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
      <div class="flex min-w-0 flex-col gap-[18px] lg:gap-6">
        <!-- ===== Plan del mes ===== -->
        <section :class="panel">
          <div class="flex items-center justify-between gap-2">
            <span class="text-sm font-medium text-ink-muted">Plan de {{ monthLabel }}</span>
            <span v-if="ready && plan.income > 0" class="text-xs text-ink-faint">2 quincenas de {{ money(store.quincenaValue) }}</span>
          </div>

          <template v-if="!ready">
            <TpSkeleton class="block h-9 w-48 rounded-chip" />
            <TpSkeleton class="block h-2.5 rounded-full" />
            <div class="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <TpSkeleton v-for="n in 4" :key="n" class="block h-16 rounded-tile" />
            </div>
          </template>
          <template v-else>
            <div class="flex flex-col gap-0.5">
              <span class="text-xs text-ink-faint">Libre para gastar</span>
              <span class="text-[32px]/10 font-semibold tracking-[-0.5px] tabular-nums" :class="plan.free < 0 ? 'text-danger' : 'text-ink'">
                {{ money(plan.free) }}
              </span>
              <span class="text-[13px] text-ink-muted">Comida, transporte, salidas… después de pagar y ahorrar.</span>
            </div>

            <div v-if="plan.income > 0" class="flex h-2.5 overflow-hidden rounded-full bg-surface-300" title="Obligaciones · Ahorro · Libre">
              <span class="h-full bg-warning" :style="{ width: `${barPart(plan.obligations)}%` }" />
              <span class="h-full bg-accent-light" :style="{ width: `${barPart(plan.savings)}%` }" />
              <span class="h-full bg-success" :style="{ width: `${barPart(Math.max(0, plan.free))}%` }" />
            </div>

            <div class="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <div v-for="item in planItems" :key="item.label" class="flex flex-col gap-0.5 rounded-tile bg-surface-200/60 px-3 py-2.5">
                <span class="flex items-center gap-1.5 text-[11px]/[14px] text-ink-faint">
                  <span v-if="item.dot" class="size-2 rounded-full" :class="item.dot" />
                  {{ item.label }}
                </span>
                <strong class="text-[15px]/5 font-semibold tabular-nums" :class="item.class">{{ item.value }}</strong>
                <small class="text-[11px]/[14px] text-ink-faint">{{ item.hint }}</small>
              </div>
            </div>
          </template>
        </section>

        <!-- ===== Metas de ahorro ===== -->
        <section class="flex flex-col gap-3">
          <div class="flex items-baseline justify-between gap-3">
            <h2 :class="sectionTitle">Metas de ahorro</h2>
            <button type="button" :class="sectionLink" @click="openGoal(null)">Nueva meta</button>
          </div>

          <div class="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
            <template v-if="!ready">
              <TpSkeleton v-for="n in 2" :key="n" class="block h-52 rounded-card" />
            </template>
            <template v-else>
              <article v-for="{ goal, st } in goalCards" :key="goal.id" :class="[panel, 'gap-3!']" :style="{ opacity: goal.active ? 1 : 0.6 }">
                <div class="flex items-center gap-3">
                  <span class="grid grid-cols-[minmax(0,1fr)] size-11 shrink-0 place-items-center rounded-full bg-primary-soft text-accent-light [&_svg]:size-5">
                    <component :is="goalIcon(goal.icon)" :stroke-width="1.75" aria-hidden="true" />
                  </span>
                  <span class="flex min-w-0 flex-1 flex-col">
                    <strong class="truncate text-[15px]/5 font-semibold">{{ goal.name }}</strong>
                    <small class="text-xs text-ink-faint">
                      {{ goal.kind === 'emergency' ? `Para imprevistos · ${store.emergencyFund.months} meses de sueldo` : `Para el ${mediumDate(parseISO(goal.targetDate))}` }}
                    </small>
                  </span>
                  <span :class="[chip, badge(goal, st).class]">{{ badge(goal, st).text }}</span>
                </div>

                <div class="flex items-baseline gap-1.5">
                  <strong class="text-[22px]/7 font-semibold tabular-nums">{{ money(st.saved) }}</strong>
                  <span class="text-[13px] text-ink-muted">de {{ money(goal.kind === 'emergency' ? store.emergencyFund.target : goal.targetAmount) }}</span>
                </div>
                <div class="h-2 overflow-hidden rounded-full bg-surface-300">
                  <span class="block h-full rounded-full bg-linear-to-r from-accent-light to-accent-glow" :style="{ width: `${Math.min(100, st.percent)}%` }" />
                </div>

                <div v-if="goal.kind === 'emergency' && store.emergencyFund.locked" class="rounded-tile border border-line bg-surface-200/50 px-3 py-2.5 text-[13px]/[19px]">
                  <strong class="flex items-center gap-1.5 font-semibold [&_svg]:size-4"><LockKeyhole :stroke-width="1.75" aria-hidden="true" />Aún no se puede ahorrar para emergencias</strong>
                  <p class="mt-1 mb-0 text-ink-muted">{{ store.emergencyFund.reason }}</p>
                  <p class="mt-1 mb-0 text-ink-faint">
                    Cuando la deuda baje de {{ money(store.emergencyFund.debtLimit) }} y las quincenas alcancen, arranca solo con
                    {{ money(store.emergencyFund.monthly / 2) }} por quincena.
                  </p>
                </div>

                <div class="grid grid-cols-3 gap-2">
                  <div v-for="n in [['Al mes', st.monthly], ['Por quincena', st.perQuincena], ['Faltan', st.remaining]]" :key="n[0]" class="flex flex-col">
                    <span class="text-[11px]/[14px] text-ink-faint">{{ n[0] }}</span>
                    <strong class="text-sm font-semibold tabular-nums">{{ money(Number(n[1])) }}</strong>
                  </div>
                </div>

                <label v-if="goal.kind === 'emergency'" class="flex flex-wrap items-center gap-2 text-[13px] text-ink-muted">
                  Cubrir
                  <select
                    :value="store.emergencyFund.months"
                    class="min-h-9 cursor-pointer rounded-full border border-line bg-surface-200 px-3 font-sans text-[13px] text-ink [color-scheme:dark] focus:border-primary focus:outline-none"
                    @change="setEmergencyMonths(goal, Number(($event.target as HTMLSelectElement).value))"
                  >
                    <option :value="3">3 meses</option>
                    <option :value="4">4 meses</option>
                    <option :value="6">6 meses</option>
                  </select>
                  de sueldo neto · se ahorra el 10 % del sueldo
                </label>
                <p v-else-if="!st.started" class="m-0 text-[13px] text-ink-muted">Empieza el {{ mediumDate(parseISO(goal.startDate)) }} · {{ st.monthsLeft }} meses de ahorro</p>
                <p v-else-if="st.late" class="m-0 text-[13px] text-warning">Vas atrasado: deberías llevar {{ money(st.expectedNow) }}</p>

                <details v-if="goal.items.length" class="group text-[13px]">
                  <summary class="cursor-pointer list-none font-medium text-accent-light">Desglose ({{ goal.items.length }})</summary>
                  <div v-for="item in goal.items" :key="item.id" class="flex justify-between gap-3 border-b border-line py-1.5 text-ink-muted last:border-b-0">
                    <span>{{ item.name }}</span><span class="text-ink tabular-nums">{{ money(item.amount) }}</span>
                  </div>
                </details>
                <details v-if="goal.contributions.length" class="group text-[13px]">
                  <summary class="cursor-pointer list-none font-medium text-accent-light">Abonos ({{ goal.contributions.length }})</summary>
                  <div v-for="c in sortedContributions(goal)" :key="c.id" class="flex items-center justify-between gap-3 border-b border-line py-1 text-ink-muted last:border-b-0">
                    <span>{{ mediumDate(parseISO(c.date)) }}</span>
                    <span class="ml-auto tabular-nums" :class="c.amount < 0 ? 'text-ink' : 'text-success'">{{ c.amount < 0 ? '−' : '+' }}{{ money(Math.abs(c.amount)) }}</span>
                    <button type="button" class="grid grid-cols-[minmax(0,1fr)] size-8 cursor-pointer place-items-center rounded-full text-ink-faint hover:bg-surface-200 hover:text-danger [&_svg]:size-3.5" aria-label="Quitar abono" @click="toConfirm = { kind: 'contribution', goal, id: c.id }">
                      <X :stroke-width="2" aria-hidden="true" />
                    </button>
                  </div>
                </details>

                <p v-if="goal.notes" class="m-0 text-[13px]/[19px] text-ink-faint">{{ goal.notes }}</p>

                <div class="mt-auto flex flex-wrap gap-2">
                  <TpButton size="sm" @click="openContribution(goal)">Abonar</TpButton>
                  <TpButton v-if="goal.kind !== 'emergency'" size="sm" variant="secondary" @click="openGoal(goal)">Editar</TpButton>
                  <TpButton size="sm" variant="ghost" @click="toConfirm = { kind: 'goal', goal }">Eliminar</TpButton>
                </div>
              </article>

              <button v-if="!hasEmergencyFund" type="button" :class="addCard" :disabled="busy" @click="createEmergencyFund">
                <span class="grid grid-cols-[minmax(0,1fr)] size-11 place-items-center rounded-full bg-surface-200 text-accent-light [&_svg]:size-5"><LifeBuoy :stroke-width="1.75" aria-hidden="true" /></span>
                <strong class="text-[15px] font-semibold">Crear fondo de emergencia</strong>
                <small class="text-xs text-ink-faint">{{ store.emergencyFund.months }} meses de sueldo · {{ money(store.emergencyFund.target) }}</small>
              </button>
              <button type="button" :class="addCard" @click="openGoal(null)">
                <span class="grid grid-cols-[minmax(0,1fr)] size-11 place-items-center rounded-full bg-primary text-white [&_svg]:size-5"><Plus :stroke-width="2" aria-hidden="true" /></span>
                <strong class="text-[15px] font-semibold">Crear meta de ahorro</strong>
                <small class="text-xs text-ink-faint">Un viaje, un carro, tu casa…</small>
              </button>
            </template>
          </div>
        </section>

        <!-- ===== Topes de gasto ===== -->
        <section class="flex flex-col gap-3">
          <div class="flex flex-wrap items-baseline justify-between gap-3">
            <h2 :class="sectionTitle">Topes de gasto por categoría</h2>
            <div class="flex gap-4">
              <button type="button" :class="sectionLink" @click="openSuggestions">Sugerir con mi historial</button>
              <button type="button" :class="sectionLink" @click="openBudget(null)">Nuevo tope</button>
            </div>
          </div>
          <p class="m-0 text-[13px]/[19px] text-ink-muted">
            Un tope es lo máximo que te permites gastar al mes en algo. Te avisamos al llegar al 80 % y si te pasas, también justo al
            registrar el gasto.
          </p>

          <div v-if="ready && store.budgetProgress.length" class="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <div v-for="item in budgetTotals" :key="item.label" class="flex flex-col gap-0.5 rounded-tile border border-line bg-surface-100 px-3 py-2.5">
              <span class="text-[11px]/[14px] text-ink-faint">{{ item.label }}</span>
              <strong class="text-[15px]/5 font-semibold tabular-nums" :class="item.class">{{ item.value }}</strong>
            </div>
          </div>

          <div class="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
            <template v-if="!ready">
              <TpSkeleton v-for="n in 2" :key="n" class="block h-32 rounded-card" />
            </template>
            <template v-else>
              <article v-for="item in store.budgetProgress" :key="item.id" :class="[panel, 'gap-3!']">
                <div class="flex items-center gap-3">
                  <span class="size-3 shrink-0 rounded-full" :style="{ background: item.category?.color || 'var(--color-ink-faint)' }" />
                  <span class="flex min-w-0 flex-1 flex-col">
                    <strong class="truncate text-[15px]/5 font-semibold">{{ item.category?.name || 'Categoría' }}</strong>
                    <small class="text-xs text-ink-faint">{{ item.month ? `Solo ${monthName(item.month)}` : 'Todos los meses' }}</small>
                  </span>
                  <span :class="[chip, item.exceeded ? 'text-danger' : item.percentage > 70 ? 'text-warning' : 'text-success']">{{ item.percentage.toFixed(0) }} %</span>
                </div>
                <div class="h-2 overflow-hidden rounded-full bg-surface-300">
                  <span
                    class="block h-full rounded-full"
                    :class="item.exceeded ? 'bg-danger' : item.percentage > 70 ? 'bg-warning' : 'bg-linear-to-r from-accent-light to-accent-glow'"
                    :style="{ width: `${Math.min(item.percentage, 100)}%` }"
                  />
                </div>
                <div class="flex justify-between text-[13px] text-ink-muted">
                  <span>Gastado <strong class="text-ink tabular-nums">{{ money(item.spent) }}</strong></span>
                  <span>de <strong class="text-ink tabular-nums">{{ money(item.amount) }}</strong></span>
                </div>
                <p v-if="item.exceeded" class="m-0 text-[13px] text-danger">Te pasaste por {{ money(item.spent - item.amount) }}</p>
                <p v-else-if="item.percentage > 80" class="m-0 text-[13px] text-warning">Casi al límite: te quedan {{ money(item.amount - item.spent) }}</p>
                <p v-else class="m-0 text-[13px] text-ink-faint">Te quedan {{ money(item.amount - item.spent) }}</p>
                <div class="flex gap-2">
                  <TpButton size="sm" variant="secondary" @click="openBudget(item)">Editar</TpButton>
                  <TpButton size="sm" variant="ghost" @click="toConfirm = { kind: 'budget', id: item.id, name: item.category?.name || '' }">Eliminar</TpButton>
                </div>
              </article>
              <button type="button" :class="addCard" @click="openBudget(null)">
                <span class="grid grid-cols-[minmax(0,1fr)] size-11 place-items-center rounded-full bg-surface-200 text-accent-light [&_svg]:size-5"><Plus :stroke-width="2" aria-hidden="true" /></span>
                <strong class="text-[15px] font-semibold">Agregar tope de gasto</strong>
                <small class="text-xs text-ink-faint">Ej: 400.000 en Comida</small>
              </button>
            </template>
          </div>
        </section>
      </div>

      <!-- ===== Asesor ===== -->
      <aside class="flex min-w-0 flex-col gap-3 min-[1100px]:sticky min-[1100px]:top-6">
        <h2 :class="sectionTitle">Tu asesor</h2>
        <template v-if="!tipsReady">
          <TpSkeleton v-for="n in 3" :key="n" class="block h-20 rounded-tile" />
        </template>
        <template v-else>
          <AdviceItem v-for="(tip, i) in store.advisorTips" :key="i" :tip="tip" />
          <p v-if="!store.advisorTips.length" class="m-0 text-sm text-ink-faint">Sin consejos por ahora: vas bien.</p>
        </template>
        <p class="m-0 text-xs/[17px] text-ink-faint">
          Sugerencias automáticas calculadas con tus datos. No reemplazan la asesoría de un profesional financiero.
        </p>
      </aside>
    </div>
  </TpLayout>

  <!-- Tope de gasto -->
  <TpSheet v-if="budgetSheet" :title="editItem ? 'Editar tope de gasto' : 'Nuevo tope de gasto'" @close="closeBudget">
    <div class="flex flex-col gap-1.5">
      <span :class="fieldLabel">Categoría</span>
      <TpCategorySelect v-model="form.categoryId" type="expense" />
    </div>
    <label class="flex flex-col gap-1.5">
      <span :class="fieldLabel">Máximo al mes</span>
      <input v-model.number="form.amount" type="number" min="0" :class="fieldInput" placeholder="0" />
      <small v-if="averageFor(form.categoryId)" class="text-xs text-ink-faint">Tu promedio de los últimos 3 meses: {{ money(averageFor(form.categoryId)) }}</small>
    </label>
    <div class="flex flex-col gap-1.5">
      <span :class="fieldLabel">Aplica</span>
      <div class="grid grid-cols-2 gap-1 rounded-full bg-surface-200 p-1">
        <button
          v-for="opt in [{ v: 'all', l: 'Todos los meses' }, { v: 'month', l: `Solo ${monthLabel}` }]"
          :key="opt.v"
          type="button"
          class="min-h-10 cursor-pointer rounded-full text-sm font-medium"
          :class="form.scope === opt.v ? 'bg-ink text-on-inverse' : 'text-ink-muted'"
          @click="form.scope = opt.v as 'all' | 'month'"
        >
          {{ opt.l }}
        </button>
      </div>
    </div>
    <template #footer>
      <div class="hidden lg:block"><TpButton variant="ghost" @click="closeBudget">Cancelar</TpButton></div>
      <TpButton block class="lg:w-auto lg:min-w-40" :disabled="!form.categoryId || !form.amount || busy" @click="saveBudget">Guardar</TpButton>
    </template>
  </TpSheet>

  <!-- Topes sugeridos -->
  <TpSheet v-if="showSuggestions" title="Topes sugeridos" @close="showSuggestions = false">
    <p class="m-0 text-[13px]/[19px] text-ink-muted">
      Según lo que gastaste en promedio los últimos 3 meses<template v-if="plan.free > 0">, ajustado para que quepa en lo libre del mes ({{ money(plan.free) }})</template><template v-else>. Como este mes no queda dinero libre, se propone la mitad de lo que sueles gastar</template>. Se guardan para todos los meses.
    </p>
    <p v-if="!suggestions.length" class="m-0 text-sm text-ink-faint">Aún no hay suficientes movimientos para sugerir.</p>
    <label v-for="s in suggestions" :key="s.categoryId" class="flex items-center gap-3 rounded-tile bg-surface-200/50 px-3 py-2" :class="{ 'opacity-60': !s.include }">
      <input v-model="s.include" type="checkbox" class="size-4 shrink-0 accent-primary" />
      <span class="flex min-w-0 flex-1 flex-col">
        <strong class="truncate text-sm font-semibold">{{ s.name }}</strong>
        <small class="text-xs text-ink-faint">promedio {{ money(s.average) }}</small>
      </span>
      <input v-model.number="s.amount" type="number" min="0" :class="[fieldInput, 'max-w-36']" aria-label="Tope" />
    </label>
    <template #footer>
      <div class="hidden lg:block"><TpButton variant="ghost" @click="showSuggestions = false">Cancelar</TpButton></div>
      <TpButton block class="lg:w-auto lg:min-w-40" :disabled="busy || !suggestions.some(s => s.include)" @click="applySuggestions">
        {{ busy ? 'Guardando…' : 'Guardar topes' }}
      </TpButton>
    </template>
  </TpSheet>

  <!-- Abonar o retirar -->
  <TpSheet v-if="contributionGoal" :title="`Abonar a ${contributionGoal.name}`" @close="contributionGoal = null">
    <p class="m-0 text-sm text-ink-muted">
      Llevas {{ money(goalStatus(contributionGoal, today, store.emergencyFund).saved) }} ({{ goalStatus(contributionGoal, today, store.emergencyFund).percent.toFixed(0) }} %).
    </p>
    <div class="grid grid-cols-2 gap-1 rounded-full bg-surface-200 p-1">
      <button type="button" class="min-h-10 cursor-pointer rounded-full text-sm font-medium" :class="!contribution.withdraw ? 'bg-ink text-on-inverse' : 'text-ink-muted'" @click="contribution.withdraw = false">Abonar</button>
      <button type="button" class="min-h-10 cursor-pointer rounded-full text-sm font-medium" :class="contribution.withdraw ? 'bg-ink text-on-inverse' : 'text-ink-muted'" @click="contribution.withdraw = true">Retirar</button>
    </div>
    <label class="flex flex-col gap-1.5">
      <span :class="fieldLabel">Monto</span>
      <input v-model.number="contribution.amount" type="number" min="0" :class="fieldInput" placeholder="0" />
      <small class="text-xs text-ink-faint">Sugerido por quincena: {{ money(goalStatus(contributionGoal, today, store.emergencyFund).perQuincena) }}</small>
    </label>
    <label class="flex flex-col gap-1.5">
      <span :class="fieldLabel">Fecha</span>
      <input v-model="contribution.date" type="date" :class="fieldInput" />
    </label>
    <template #footer>
      <div class="hidden lg:block"><TpButton variant="ghost" @click="contributionGoal = null">Cancelar</TpButton></div>
      <TpButton block class="lg:w-auto lg:min-w-40" :disabled="busy || !contribution.amount" @click="saveContribution">
        {{ busy ? 'Guardando…' : contribution.withdraw ? 'Retirar' : 'Abonar' }}
      </TpButton>
    </template>
  </TpSheet>

  <SavingsGoalModal v-if="goalModal" :goal="editingGoal" @close="goalModal = false" />

  <TpConfirm
    v-if="toConfirm"
    :title="confirmTitle"
    :text="confirmText"
    :confirm-label="toConfirm.kind === 'contribution' ? 'Sí, quitar' : 'Sí, eliminar'"
    :busy="busy"
    @cancel="toConfirm = null"
    @confirm="confirmRemove"
  />
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { LifeBuoy, LockKeyhole, Plus, X } from 'lucide-vue-next'
import TpLayout from '@/layouts/TpLayout.vue'
import TpButton from '@/components/tp/TpButton.vue'
import TpSheet from '@/components/tp/TpSheet.vue'
import TpConfirm from '@/components/tp/TpConfirm.vue'
import TpSkeleton from '@/components/tp/TpSkeleton.vue'
import TpMonthPicker from '@/components/tp/TpMonthPicker.vue'
import TpCategorySelect from '@/components/tp/TpCategorySelect.vue'
import AdviceItem from '@/components/tp/AdviceItem.vue'
import SavingsGoalModal from '@/components/modals/SavingsGoalModal.vue'
import { fieldInput, fieldLabel, mediumDate, money, parseISO } from '@/components/tp/format'
import { goalIcon } from '@/components/tp/goalIcons'
import { useFinanceStore } from '@/stores/finance'
import { todayISO } from '@/utils/dates'
import { averageSpending, goalStatus, suggestBudgets, type GoalStatus } from '@/utils/plan'
import type { SavingsGoal } from '@/interfaces'

const store = useFinanceStore()
const today = todayISO()
const busy = ref(false)

// ---------- Clases que se repiten ----------
const pageTitle = 'm-0 font-sans text-xl/[26px] font-semibold lg:text-[26px]/8 lg:tracking-[-0.3px]'
const sectionTitle = 'm-0 font-sans text-xl/[26px] font-semibold'
const sectionLink = 'cursor-pointer text-[13px]/[18px] font-medium text-ink no-underline hover:text-accent-light'
const panel = 'flex flex-col gap-4 rounded-card border border-line bg-surface-100 p-5'
const chip = 'inline-flex shrink-0 items-center rounded-chip border border-line bg-primary-soft px-2.5 py-1 text-xs font-semibold'
const addCard =
  'flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-card border-[1.5px] border-dashed border-line-strong bg-surface-100/40 p-5 text-center text-ink transition-colors hover:border-accent-light disabled:cursor-default'

// ---------- Carga ----------
const ready = computed(
  () => store.loaded.accounts && store.loaded.transactions && store.loaded.paychecks && store.loaded.goals && store.loaded.budgets && store.loaded.categories
)
const tipsReady = ready

const monthName = (key: string) => {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('es-CO', { month: 'long' })
}
const monthLabel = computed(() => monthName(store.selectedMonth))

// ---------- Plan del mes ----------
const plan = computed(() => store.currentPlan)

// Partes de la barra: sobre el ingreso, o sobre el total si las obligaciones lo pasan
function barPart(value: number) {
  const base = Math.max(plan.value.income, plan.value.obligations + plan.value.savings + Math.max(0, plan.value.free))
  return base > 0 ? (value / base) * 100 : 0
}

const planItems = computed(() => [
  { label: 'Ingreso neto', value: money(plan.value.income), hint: 'Lo que te llega', class: '', dot: '' },
  { label: 'Obligaciones', value: `−${money(plan.value.obligations)}`, hint: 'Lo de las quincenas', class: '', dot: 'bg-warning' },
  { label: 'Ahorro de metas', value: `−${money(plan.value.savings)}`, hint: `${money(plan.value.savings / 2)} por quincena`, class: '', dot: 'bg-accent-light' },
  {
    label: 'Te queda para gastar',
    value: money(plan.value.leftToSpend),
    hint: `Gastado ${money(plan.value.spentCash)} · con tarjeta ${money(plan.value.spentCredit)}`,
    class: plan.value.leftToSpend < 0 ? 'text-danger' : 'text-success',
    dot: 'bg-success'
  }
])

// ---------- Metas ----------
const goalCards = computed(() => store.savingsGoals.map(goal => ({ goal, st: goalStatus(goal, today, store.emergencyFund) })))
const hasEmergencyFund = computed(() => store.savingsGoals.some(g => g.kind === 'emergency'))

function badge(goal: SavingsGoal, st: GoalStatus) {
  if (!goal.active) return { text: 'Pausada', class: 'text-ink-muted' }
  if (st.done) return { text: '¡Lista!', class: 'text-success' }
  if (st.late) return { text: `${st.percent.toFixed(0)} %`, class: 'text-warning' }
  return { text: st.started ? `${st.percent.toFixed(0)} %` : 'Sin empezar', class: st.started ? 'text-success' : 'text-accent-light' }
}

// Fondo de emergencia: su total sale del sueldo; se crea aunque esté bloqueado
async function createEmergencyFund() {
  if (busy.value) return
  busy.value = true
  try {
    await store.addSavingsGoal({
      name: 'Fondo de emergencia',
      icon: '🛟',
      color: '#4f6fdc',
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

const sortedContributions = (goal: SavingsGoal) => [...goal.contributions].sort((a, b) => b.date.localeCompare(a.date))

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

// ---------- Topes de gasto ----------
type BudgetItem = { id: string; categoryId: string; amount: number; month?: string }

const budgetSheet = ref(false)
const editItem = ref<BudgetItem | null>(null)

const totalBudget = computed(() => store.budgetProgress.reduce((s, b) => s + b.amount, 0))
const totalSpent = computed(() => store.budgetProgress.reduce((s, b) => s + b.spent, 0))
const globalPercent = computed(() => (totalBudget.value > 0 ? (totalSpent.value / totalBudget.value) * 100 : 0))

const budgetTotals = computed(() => [
  { label: 'Topes del mes', value: money(totalBudget.value), class: '' },
  { label: 'Gastado', value: money(totalSpent.value), class: '' },
  { label: 'Disponible', value: money(totalBudget.value - totalSpent.value), class: totalBudget.value - totalSpent.value < 0 ? 'text-danger' : 'text-success' },
  { label: 'Uso total', value: `${globalPercent.value.toFixed(0)} %`, class: globalPercent.value > 90 ? 'text-danger' : globalPercent.value > 70 ? 'text-warning' : '' }
])

const average = computed(() => averageSpending(store.transactions, store.selectedMonth))
const averageFor = (categoryId: string) => Math.round(average.value[categoryId] || 0)

const defaultForm = () => ({ categoryId: '', amount: 0, scope: 'all' as 'all' | 'month' })
const form = reactive(defaultForm())

function openBudget(item: BudgetItem | null) {
  editItem.value = item
  Object.assign(form, defaultForm())
  if (item) {
    form.categoryId = item.categoryId
    form.amount = item.amount
    form.scope = item.month ? 'month' : 'all'
  }
  budgetSheet.value = true
}

function closeBudget() {
  budgetSheet.value = false
  editItem.value = null
}

async function saveBudget() {
  if (busy.value) return
  busy.value = true
  try {
    const month = form.scope === 'month' ? store.selectedMonth : undefined
    // Si cambió de "todos los meses" a "solo este mes" (o al revés) se quita el anterior
    if (editItem.value && (editItem.value.month || '') !== (month || '')) await store.deleteBudget(editItem.value.id)
    await store.saveBudget({ categoryId: form.categoryId, amount: form.amount, month })
    closeBudget()
  } finally {
    busy.value = false
  }
}

const showSuggestions = ref(false)
const suggestions = ref<{ categoryId: string; name: string; average: number; amount: number; include: boolean }[]>([])

function openSuggestions() {
  const suggested = suggestBudgets(average.value, plan.value.free)
  suggestions.value = Object.entries(suggested)
    .map(([categoryId, amount]) => ({
      categoryId,
      name: store.getCategoryById(categoryId)?.name || categoryId,
      average: Math.round(average.value[categoryId] || 0),
      amount,
      include: !store.budgets.some(b => b.categoryId === categoryId)
    }))
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

// ---------- Confirmaciones ----------
type Pending =
  | { kind: 'goal'; goal: SavingsGoal }
  | { kind: 'contribution'; goal: SavingsGoal; id: string }
  | { kind: 'budget'; id: string; name: string }

const toConfirm = ref<Pending | null>(null)

const confirmTitle = computed(() => {
  const p = toConfirm.value
  if (!p) return ''
  if (p.kind === 'goal') return `¿Eliminar la meta "${p.goal.name}"?`
  if (p.kind === 'contribution') return '¿Quitar este abono?'
  return `¿Eliminar el tope de ${p.name}?`
})

const confirmText = computed(() => {
  const p = toConfirm.value
  if (!p) return ''
  if (p.kind === 'goal') return 'Se pierde el registro de sus abonos. No se puede deshacer.'
  if (p.kind === 'contribution') return 'El ahorrado de la meta se recalcula sin él.'
  return 'Ya no te avisaremos cuando gastes en esa categoría.'
})

async function confirmRemove() {
  const p = toConfirm.value
  if (!p || busy.value) return
  busy.value = true
  try {
    if (p.kind === 'goal') await store.deleteSavingsGoal(p.goal.id)
    else if (p.kind === 'contribution') {
      await store.updateSavingsGoal(p.goal.id, { contributions: p.goal.contributions.filter(c => c.id !== p.id) })
    } else await store.deleteBudget(p.id)
    toConfirm.value = null
  } finally {
    busy.value = false
  }
}
</script>
