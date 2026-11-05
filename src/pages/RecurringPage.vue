<template>
  <TpLayout>
    <!-- ===== Encabezado ===== -->
    <div class="flex flex-wrap items-center gap-3">
      <div class="min-w-0 flex-[1_1_220px]">
        <h1 :class="pageTitle">Gastos automáticos</h1>
        <p class="mt-0.5 text-[13px]/[18px] text-ink-muted lg:text-sm">Suscripciones y pagos fijos que se registran solos el día del cobro.</p>
      </div>
      <button type="button" :class="[iconBtn, 'border-primary bg-primary text-white lg:hidden']" aria-label="Nuevo gasto automático" @click="openNew">
        <Plus :stroke-width="1.75" aria-hidden="true" />
      </button>
      <div class="hidden lg:block">
        <TpButton @click="openNew">
          <Plus :stroke-width="1.75" aria-hidden="true" />
          Nuevo automático
        </TpButton>
      </div>
    </div>

    <!-- ===== Resumen ===== -->
    <div class="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3">
      <div v-for="stat in stats" :key="stat.label" class="flex min-w-0 flex-col gap-1 rounded-card border border-line bg-surface-100 px-4 py-3.5">
        <span class="text-xs text-ink-faint">{{ stat.label }}</span>
        <TpSkeleton v-if="!ready" class="my-0.5 block h-5 w-24 rounded-chip" />
        <strong v-else class="truncate text-lg/6 font-semibold tabular-nums">{{ stat.value }}</strong>
      </div>
    </div>

    <!-- ===== Lista ===== -->
    <div class="flex flex-col gap-2.5">
      <template v-if="!ready">
        <TpSkeleton v-for="n in 3" :key="n" class="block h-[72px] rounded-tile" />
      </template>

      <div v-else-if="!sortedRecurring.length" class="flex flex-col items-center gap-2 rounded-card bg-surface-100 px-6 py-10 text-center">
        <span class="grid grid-cols-[minmax(0,1fr)] size-12 place-items-center rounded-full bg-surface-200 text-accent-light [&_svg]:size-6"><Repeat :stroke-width="1.75" aria-hidden="true" /></span>
        <strong class="text-base font-semibold">Aún no tienes gastos automáticos</strong>
        <span class="max-w-[420px] text-sm text-ink-muted">Agrega tus suscripciones (música, video, nube…) y se registran solas el día del cobro.</span>
        <TpButton class="mt-2" @click="openNew">Agregar el primero</TpButton>
      </div>

      <div
        v-for="rec in sortedRecurring"
        v-else
        :key="rec.id"
        class="flex items-center gap-3 rounded-tile border border-line bg-surface-100 px-4 py-3"
        :class="{ 'opacity-60': !rec.active }"
      >
        <button type="button" class="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left" @click="openEdit(rec)">
          <span class="grid grid-cols-[minmax(0,1fr)] size-10 shrink-0 place-items-center rounded-full bg-surface-300 text-accent-light [&_svg]:size-[18px]">
            <Repeat :stroke-width="1.75" aria-hidden="true" />
          </span>
          <span class="flex min-w-0 flex-1 flex-col gap-0.5">
            <strong class="text-[15px]/5 font-semibold">{{ rec.name }}</strong>
            <span class="text-xs text-ink-faint">
              <span v-if="rec.currency === 'USD'" class="mr-1 inline-flex rounded-chip border border-line bg-primary-soft px-1.5 py-px text-[11px] font-semibold text-ink">USD {{ rec.amountUsd }}</span>
              Día {{ rec.dayOfMonth }} · {{ accountName(rec.accountId) }} · {{ categoryName(rec.category) }}
            </span>
            <span class="text-xs text-ink-faint">{{ rec.active ? `Próximo cobro: ${mediumDate(parseISO(store.nextRecurringDate(rec)))}` : 'Pausado' }}</span>
          </span>
          <span class="text-base font-semibold whitespace-nowrap tabular-nums">−{{ plain(rec.amount) }}</span>
        </button>
        <button
          type="button"
          role="switch"
          :aria-checked="rec.active"
          :aria-label="rec.active ? `Pausar ${rec.name}` : `Activar ${rec.name}`"
          class="relative h-7 w-[46px] shrink-0 cursor-pointer rounded-full transition-colors"
          :class="rec.active ? 'bg-primary' : 'bg-surface-300'"
          @click="toggleActive(rec)"
        >
          <span class="absolute top-[3px] left-[3px] size-[22px] rounded-full transition-transform" :class="rec.active ? 'translate-x-[18px] bg-white' : 'bg-ink-muted'" />
        </button>
      </div>
    </div>

    <p class="m-0 flex gap-2.5 rounded-tile border border-line bg-surface-100 px-4 py-3 text-[13px]/[19px] text-ink-muted [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-accent-light">
      <Info :stroke-width="1.75" aria-hidden="true" />
      Los cobros en dólares usan la TRM del día anterior al cobro, más la comisión de la tarjeta, que se registra como gasto aparte.
    </p>
  </TpLayout>

  <TpSheet v-if="showSheet" :title="editing ? 'Editar gasto automático' : 'Nuevo gasto automático'" @close="closeSheet">
    <label class="flex flex-col gap-1.5">
      <span :class="fieldLabel">Nombre</span>
      <input v-model="form.name" :class="fieldInput" placeholder="Ej: Plan de celular" />
    </label>

    <div class="grid grid-cols-2 gap-1 rounded-full bg-surface-200 p-1">
      <button
        v-for="c in [{ v: 'COP', l: 'En pesos' }, { v: 'USD', l: 'En dólares' }]"
        :key="c.v"
        type="button"
        class="min-h-10 cursor-pointer rounded-full text-sm font-medium"
        :class="form.currency === c.v ? 'bg-ink text-on-inverse' : 'text-ink-muted'"
        @click="form.currency = c.v as 'COP' | 'USD'"
      >
        {{ c.l }}
      </button>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <label v-if="form.currency === 'USD'" class="flex flex-col gap-1.5">
        <span :class="fieldLabel">Monto en dólares</span>
        <input v-model.number="form.amountUsd" type="number" min="0" step="0.01" :class="fieldInput" placeholder="20" />
      </label>
      <label v-else class="flex flex-col gap-1.5">
        <span :class="fieldLabel">Monto</span>
        <input v-model.number="form.amount" type="number" min="0" step="1000" :class="fieldInput" placeholder="0" />
      </label>
      <label class="flex flex-col gap-1.5">
        <span :class="fieldLabel">Día del cobro</span>
        <input v-model.number="form.dayOfMonth" type="number" min="1" max="31" :class="fieldInput" />
      </label>
    </div>

    <p v-if="form.currency === 'USD'" class="m-0 text-xs/[17px] text-ink-faint">
      <template v-if="trmToday && form.amountUsd > 0">≈ {{ money(usdToCop(form.amountUsd, trmToday)) }} con la TRM de hoy ({{ trmToday }}). </template>
      Cada cobro se convierte con la TRM del día anterior<template v-if="feeRate > 0"> y se agrega la comisión del {{ feeRate }} % de la tarjeta</template>.
    </p>

    <label class="flex flex-col gap-1.5">
      <span :class="fieldLabel">Cuenta o tarjeta</span>
      <select v-model="form.accountId" :class="fieldInput">
        <option value="" disabled>Elige la cuenta</option>
        <option v-for="acc in store.accounts" :key="acc.id" :value="acc.id">{{ acc.name }}</option>
      </select>
    </label>
    <div class="flex flex-col gap-1.5">
      <span :class="fieldLabel">Categoría</span>
      <TpCategorySelect v-model="form.category" type="expense" />
    </div>
    <label class="flex flex-col gap-1.5">
      <span :class="fieldLabel">Primer cobro desde</span>
      <input v-model="form.startDate" type="date" :class="fieldInput" />
      <small class="text-xs text-ink-faint">Si pones una fecha pasada, se agregan los cobros que ya ocurrieron.</small>
    </label>

    <template #footer>
      <TpButton v-if="editing" variant="danger" @click="confirming = true">Eliminar</TpButton>
      <div class="hidden lg:block"><TpButton variant="ghost" @click="closeSheet">Cancelar</TpButton></div>
      <TpButton block class="lg:w-auto lg:min-w-40" :disabled="!isValid || isSaving" @click="save">{{ isSaving ? 'Guardando…' : 'Guardar' }}</TpButton>
    </template>
  </TpSheet>

  <TpConfirm
    v-if="confirming && editing"
    :title="`¿Eliminar ${editing.name}?`"
    text="Deja de registrarse solo. Los movimientos que ya se registraron se conservan."
    :busy="isSaving"
    @cancel="confirming = false"
    @confirm="remove"
  />
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Info, Plus, Repeat } from 'lucide-vue-next'
import TpLayout from '@/layouts/TpLayout.vue'
import TpButton from '@/components/tp/TpButton.vue'
import TpSheet from '@/components/tp/TpSheet.vue'
import TpConfirm from '@/components/tp/TpConfirm.vue'
import TpSkeleton from '@/components/tp/TpSkeleton.vue'
import TpCategorySelect from '@/components/tp/TpCategorySelect.vue'
import { fieldInput, fieldLabel, mediumDate, money, parseISO, plain, shortDate } from '@/components/tp/format'
import { useFinanceStore } from '@/stores/finance'
import { addDaysISO, todayISO } from '@/utils/dates'
import { trmForCharge, usdToCop } from '@/utils/exchange'
import type { RecurringExpense } from '@/interfaces'

const store = useFinanceStore()
const ready = computed(() => store.loaded.recurring && store.loaded.accounts)

const pageTitle = 'm-0 font-sans text-xl/[26px] font-semibold lg:text-[26px]/8 lg:tracking-[-0.3px]'
const iconBtn =
  'relative grid size-10 shrink-0 cursor-pointer place-items-center rounded-full border border-line-strong text-ink transition-colors hover:bg-surface-200 [&_svg]:size-[18px]'

// TRM de hoy para mostrar el valor aproximado en pesos de los cobros en USD
const trmToday = ref<number | null>(null)

onMounted(async () => {
  await Promise.all([store.loadAccounts(), store.loadRecurringExpenses()])
  trmToday.value = await trmForCharge(todayISO())
})

const accountName = (id: string) => store.getAccountById(id)?.name || 'Sin cuenta'
const categoryName = (id: string) => store.getCategoryById(id)?.name || 'Sin categoría'

const sortedRecurring = computed(() =>
  [...store.recurringExpenses].sort((a, b) => Number(b.active) - Number(a.active) || a.dayOfMonth - b.dayOfMonth)
)

const nextCharge = computed(
  () =>
    store.recurringExpenses
      .filter(r => r.active)
      .map(rec => ({ rec, date: store.nextRecurringDate(rec) }))
      .sort((a, b) => a.date.localeCompare(b.date))[0]
)

const stats = computed(() => {
  const active = store.recurringExpenses.filter(r => r.active).length
  return [
    { label: 'Al mes', value: money(store.recurringMonthlyTotal) },
    { label: 'Activos', value: `${active} de ${store.recurringExpenses.length}` },
    { label: 'Próximo cobro', value: nextCharge.value ? `${nextCharge.value.rec.name} · ${shortDate(parseISO(nextCharge.value.date))}` : '—' },
    { label: 'En dólares', value: String(store.recurringExpenses.filter(r => r.currency === 'USD').length) }
  ]
})

// ---------- Formulario ----------
const showSheet = ref(false)
const isSaving = ref(false)
const confirming = ref(false)
const editing = ref<RecurringExpense | null>(null)

const defaultForm = () => ({
  name: '',
  amount: 0,
  dayOfMonth: new Date().getDate(),
  accountId: '',
  category: '',
  icon: '🔁',
  startDate: todayISO(),
  currency: 'COP' as 'COP' | 'USD',
  amountUsd: 0
})

const form = reactive(defaultForm())
const feeRate = computed(() => store.getAccountById(form.accountId)?.fxFeeRate || 0)

const isValid = computed(
  () =>
    !!form.name.trim() &&
    (form.currency === 'USD' ? form.amountUsd > 0 : form.amount > 0) &&
    Number.isInteger(form.dayOfMonth) &&
    form.dayOfMonth >= 1 &&
    form.dayOfMonth <= 31 &&
    !!form.accountId &&
    !!form.category &&
    !!form.startDate
)

function openNew() {
  editing.value = null
  Object.assign(form, defaultForm())
  showSheet.value = true
}

function openEdit(rec: RecurringExpense) {
  editing.value = rec
  Object.assign(form, {
    name: rec.name,
    amount: rec.amount,
    dayOfMonth: rec.dayOfMonth,
    accountId: rec.accountId,
    category: rec.category,
    icon: rec.icon,
    startDate: rec.startDate,
    currency: rec.currency || 'COP',
    amountUsd: rec.amountUsd || 0
  })
  showSheet.value = true
}

function closeSheet() {
  showSheet.value = false
  confirming.value = false
  editing.value = null
}

async function save() {
  if (!isValid.value || isSaving.value) return
  isSaving.value = true
  try {
    const data = { ...form, name: form.name.trim() }
    // En USD, el monto en pesos es un estimado con la TRM de hoy (para el total
    // mensual); cada cobro real se convierte con la TRM de su fecha
    if (data.currency === 'USD') {
      const trm = trmToday.value || (await trmForCharge(todayISO()))
      if (trm) data.amount = usdToCop(data.amountUsd, trm)
    } else {
      data.amountUsd = 0
    }

    if (editing.value) {
      const updates: Partial<RecurringExpense> = { ...data }
      // Si cambia la fecha de inicio, se vuelve a revisar desde esa fecha
      if (data.startDate !== editing.value.startDate) updates.lastRunDate = addDaysISO(data.startDate, -1)
      await store.updateRecurringExpense(editing.value.id, updates)
    } else {
      await store.addRecurringExpense({ ...data, active: true })
    }
    closeSheet()
  } finally {
    isSaving.value = false
  }
}

async function toggleActive(rec: RecurringExpense) {
  const updates: Partial<RecurringExpense> = { active: !rec.active }
  // Al reactivar no se cobran los meses que estuvo pausado
  if (!rec.active) updates.lastRunDate = addDaysISO(todayISO(), -1)
  await store.updateRecurringExpense(rec.id, updates)
}

async function remove() {
  if (!editing.value || isSaving.value) return
  isSaving.value = true
  try {
    await store.deleteRecurringExpense(editing.value.id)
    closeSheet()
  } finally {
    isSaving.value = false
  }
}
</script>
