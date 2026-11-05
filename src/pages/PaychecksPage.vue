<template>
  <TpLayout>
    <!-- ===== Encabezado ===== -->
    <div class="flex flex-wrap items-center gap-3">
      <div class="min-w-0 flex-[1_1_220px]">
        <h1 :class="pageTitle">Quincenas</h1>
        <p class="mt-0.5 text-[13px]/[18px] text-ink-muted lg:text-sm">
          <TpSkeleton v-if="!ready" class="inline-block h-3.5 w-56 rounded-chip align-middle" />
          <template v-else-if="monthlySalary">Salario {{ money(monthlySalary) }} · por quincena {{ money(quincenaAmount) }}</template>
          <template v-else>Escribe tu salario para armar las quincenas</template>
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <TpButton size="sm" variant="secondary" @click="openSalary">Salario</TpButton>
        <TpButton size="sm" variant="secondary" @click="showDeductions = true">Deducciones</TpButton>
        <TpButton size="sm" @click="openItem(null)">
          <Plus :stroke-width="1.75" aria-hidden="true" />
          Obligación
        </TpButton>
      </div>
    </div>

    <!-- ===== Resumen del mes ===== -->
    <div class="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3">
      <div v-for="stat in stats" :key="stat.label" class="flex flex-col gap-1 rounded-card border bg-surface-100 px-4 py-3.5" :class="stat.border">
        <span class="text-xs text-ink-faint">{{ stat.label }}</span>
        <TpSkeleton v-if="!ready" class="my-0.5 block h-5 w-24 rounded-chip" />
        <strong v-else class="text-lg/6 font-semibold tabular-nums lg:text-[22px]/7" :class="stat.class">{{ stat.value }}</strong>
      </div>
    </div>

    <p v-if="ready && !monthlySalary" class="m-0 flex flex-wrap items-center gap-3 rounded-tile border border-line bg-surface-100 px-4 py-3 text-sm text-ink-muted">
      Aún no tienes salario. Con él calculamos cuánto te llega cada quincena y si alcanza para tus obligaciones.
      <TpButton size="sm" @click="openSalary">Escribir salario</TpButton>
    </p>

    <!-- ===== Las dos quincenas ===== -->
    <div class="grid grid-cols-[minmax(0,1fr)] items-start gap-[18px] lg:grid-cols-2 lg:gap-5">
      <section v-for="q in quincenas" :key="q.key" class="flex flex-col gap-3 rounded-card border border-line bg-surface-100 p-5">
        <div class="flex items-center justify-between gap-2">
          <h2 class="m-0 font-sans text-lg/6 font-semibold">Quincena del {{ q.key }}</h2>
          <TpSkeleton v-if="!ready" class="block h-6 w-24 rounded-chip" />
          <span v-else :class="[chip, q.balance < 0 ? 'text-danger' : 'text-success']">
            {{ q.balance < 0 ? `Falta ${money(-q.balance)}` : `Sobra ${money(q.balance)}` }}
          </span>
        </div>

        <div class="h-2 overflow-hidden rounded-full bg-surface-300">
          <span
            class="block h-full rounded-full"
            :class="q.balance < 0 ? 'bg-danger' : q.percent > 85 ? 'bg-warning' : 'bg-linear-to-r from-accent-light to-accent-glow'"
            :style="{ width: `${Math.min(q.percent, 100)}%` }"
          />
        </div>
        <div class="flex justify-between text-xs text-ink-faint">
          <span>Comprometido {{ money(q.total) }}</span>
          <span>{{ q.percent.toFixed(0) }} % de {{ money(quincenaAmount) }}</span>
        </div>

        <template v-if="!ready">
          <TpSkeleton v-for="n in 3" :key="n" class="block h-14 rounded-tile" />
        </template>
        <template v-else>
          <button
            v-for="item in q.items"
            :key="item.id"
            type="button"
            class="flex w-full cursor-pointer items-center gap-3 rounded-tile border border-line bg-surface-200/60 px-3.5 py-3 text-left transition-colors hover:border-line-strong"
            @click="openItem(item)"
          >
            <span class="grid grid-cols-[minmax(0,1fr)] size-9 shrink-0 place-items-center rounded-full bg-surface-300 text-accent-light [&_svg]:size-4">
              <ReceiptText :stroke-width="1.75" aria-hidden="true" />
            </span>
            <span class="flex min-w-0 flex-1 flex-col">
              <strong class="truncate text-sm font-semibold">{{ item.name }}</strong>
              <small class="truncate text-xs text-ink-faint">{{ item.category || 'Sin categoría' }}</small>
            </span>
            <strong class="text-sm font-semibold whitespace-nowrap tabular-nums">{{ money(item.amount) }}</strong>
          </button>

          <RouterLink
            v-if="savingsHalf > 0"
            to="/budgets"
            class="flex items-center gap-3 rounded-tile border border-dashed border-line-strong px-3.5 py-3 text-ink no-underline transition-colors hover:border-accent-light"
          >
            <span class="grid grid-cols-[minmax(0,1fr)] size-9 shrink-0 place-items-center rounded-full bg-primary-soft text-accent-light [&_svg]:size-4">
              <PiggyBank :stroke-width="1.75" aria-hidden="true" />
            </span>
            <span class="flex min-w-0 flex-1 flex-col">
              <strong class="text-sm font-semibold">Ahorro de metas</strong>
              <small class="truncate text-xs text-ink-faint">{{ goalNames }}</small>
            </span>
            <strong class="text-sm font-semibold whitespace-nowrap tabular-nums">{{ money(savingsHalf) }}</strong>
          </RouterLink>

          <p v-if="!q.items.length" class="m-0 rounded-tile bg-surface-200/40 px-4 py-5 text-center text-sm text-ink-faint">
            Sin obligaciones en esta quincena.
          </p>
        </template>
      </section>
    </div>

    <!-- ===== Deducciones ===== -->
    <section v-if="ready && deductions.length" class="flex flex-col gap-1 rounded-card border border-line bg-surface-100 p-5">
      <div class="mb-1 flex items-center justify-between">
        <span class="text-sm font-medium text-ink-muted">Deducciones por quincena</span>
        <button type="button" class="cursor-pointer text-[13px] font-medium text-ink hover:text-accent-light" @click="showDeductions = true">Editar</button>
      </div>
      <div v-for="d in deductions" :key="d.id" class="flex justify-between gap-3 border-b border-line py-2.5 text-sm text-ink-muted last:border-b-0">
        <span>{{ d.name }}</span><strong class="font-semibold text-ink tabular-nums">{{ money(d.amount) }}</strong>
      </div>
    </section>
  </TpLayout>

  <!-- Obligación -->
  <TpSheet v-if="itemSheet" :title="editingItem ? 'Editar obligación' : 'Nueva obligación'" @close="closeItem">
    <p class="m-0 text-sm text-ink-muted">Un pago que sale de una quincena: arriendo, cuota, aporte a la casa.</p>
    <label class="flex flex-col gap-1.5">
      <span :class="fieldLabel">Nombre</span>
      <input v-model="form.name" :class="fieldInput" placeholder="Ej: Arriendo" />
    </label>
    <label class="flex flex-col gap-1.5">
      <span :class="fieldLabel">Monto</span>
      <input v-model.number="form.amount" type="number" min="0" :class="fieldInput" placeholder="0" />
    </label>
    <div class="flex flex-col gap-1.5">
      <span :class="fieldLabel">¿De qué quincena sale?</span>
      <div class="grid grid-cols-2 gap-1 rounded-full bg-surface-200 p-1">
        <button
          v-for="opt in ['15', '30'] as const"
          :key="opt"
          type="button"
          class="min-h-10 cursor-pointer rounded-full text-sm font-medium"
          :class="form.quincena === opt ? 'bg-ink text-on-inverse' : 'text-ink-muted'"
          @click="form.quincena = opt"
        >
          Del {{ opt }}
        </button>
      </div>
    </div>
    <label class="flex flex-col gap-1.5">
      <span :class="fieldLabel">Categoría</span>
      <input v-model="form.category" list="paycheck-categories" :class="fieldInput" placeholder="Si la dejas vacía se usa el nombre" />
      <datalist id="paycheck-categories">
        <option v-for="cat in expenseCategoryNames" :key="cat" :value="cat" />
      </datalist>
    </label>
    <p v-if="itemWarning" class="m-0 rounded-tile border border-line bg-surface-200 px-4 py-3 text-[13px]/[19px] text-warning">{{ itemWarning }}</p>
    <template #footer>
      <TpButton v-if="editingItem" variant="danger" @click="toConfirm = { kind: 'item', id: editingItem.id, name: editingItem.name }">Eliminar</TpButton>
      <div class="hidden lg:block"><TpButton variant="ghost" @click="closeItem">Cancelar</TpButton></div>
      <TpButton block class="lg:w-auto lg:min-w-40" :disabled="!form.name.trim() || !form.amount || busy" @click="saveItem">Guardar</TpButton>
    </template>
  </TpSheet>

  <!-- Deducciones -->
  <TpSheet v-if="showDeductions" title="Deducciones por quincena" @close="closeDeductions">
    <p class="m-0 text-sm text-ink-muted">Lo que te descuentan cada quincena (salud, pensión…), como sale en el desprendible.</p>
    <div v-for="d in deductions" :key="d.id" class="flex items-center gap-3 rounded-tile bg-surface-200/50 px-4 py-2.5 text-sm">
      <span class="flex-1">{{ d.name }}</span>
      <strong class="font-semibold tabular-nums">{{ money(d.amount) }}</strong>
      <button type="button" class="grid grid-cols-[minmax(0,1fr)] size-8 cursor-pointer place-items-center rounded-full text-ink-faint hover:bg-surface-200 hover:text-danger [&_svg]:size-4" aria-label="Quitar" @click="toConfirm = { kind: 'deduction', id: d.id, name: d.name }">
        <Trash2 :stroke-width="1.75" aria-hidden="true" />
      </button>
    </div>
    <div class="grid grid-cols-[minmax(0,1fr)_140px] gap-2">
      <input v-model="deductionForm.name" :class="fieldInput" placeholder="Ej: Salud" aria-label="Nombre" />
      <input v-model.number="deductionForm.amount" type="number" min="0" :class="fieldInput" placeholder="0" aria-label="Valor por quincena" />
    </div>
    <template #footer>
      <div class="hidden lg:block"><TpButton variant="ghost" @click="closeDeductions">Cerrar</TpButton></div>
      <TpButton block class="lg:w-auto lg:min-w-40" :disabled="!deductionForm.name.trim() || !deductionForm.amount || busy" @click="saveDeduction">Agregar</TpButton>
    </template>
  </TpSheet>

  <!-- Salario -->
  <TpSheet v-if="showSalary" title="Salario mensual" @close="showSalary = false">
    <p class="m-0 text-sm text-ink-muted">El salario bruto del mes. Las deducciones se restan por quincena.</p>
    <label class="flex flex-col gap-1.5">
      <span :class="fieldLabel">Salario mensual</span>
      <input v-model.number="salaryForm" type="number" min="0" :class="fieldInput" placeholder="0" />
    </label>
    <template #footer>
      <div class="hidden lg:block"><TpButton variant="ghost" @click="showSalary = false">Cancelar</TpButton></div>
      <TpButton block class="lg:w-auto lg:min-w-40" :disabled="busy || salaryForm < 0" @click="saveSalary">Guardar</TpButton>
    </template>
  </TpSheet>

  <TpConfirm
    v-if="toConfirm"
    :title="toConfirm.kind === 'item' ? `¿Eliminar ${toConfirm.name}?` : `¿Quitar la deducción ${toConfirm.name}?`"
    :text="toConfirm.kind === 'item' ? 'Deja de contar en la quincena. No se puede deshacer.' : 'Tu quincena se recalcula sin ella.'"
    :busy="busy"
    @cancel="toConfirm = null"
    @confirm="confirmRemove"
  />
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { PiggyBank, Plus, ReceiptText, Trash2 } from 'lucide-vue-next'
import TpLayout from '@/layouts/TpLayout.vue'
import TpButton from '@/components/tp/TpButton.vue'
import TpSheet from '@/components/tp/TpSheet.vue'
import TpConfirm from '@/components/tp/TpConfirm.vue'
import TpSkeleton from '@/components/tp/TpSkeleton.vue'
import { fieldInput, fieldLabel, money } from '@/components/tp/format'
import { useFinanceStore } from '@/stores/finance'
import { getCurrentMonth } from '@/utils/formatters'
import type { PaycheckDebt } from '@/interfaces'

const store = useFinanceStore()
const busy = ref(false)
const ready = computed(() => store.loaded.paychecks && store.loaded.goals)

const pageTitle = 'm-0 font-sans text-xl/[26px] font-semibold lg:text-[26px]/8 lg:tracking-[-0.3px]'
const chip = 'inline-flex shrink-0 items-center rounded-chip border border-line bg-primary-soft px-2.5 py-1 text-xs font-semibold'

onMounted(async () => {
  await store.loadPaychecks()
  // Primera vez: se crea el registro del salario vacío (el salario se escribe en "Salario")
  if (!store.currentPaycheck) {
    await store.addPaycheck({
      label: 'Salario principal',
      monthlySalary: 0,
      amount: 0,
      date: new Date().toISOString(),
      description: '',
      status: 'received',
      spent: 0,
      deductions: [],
      debts: []
    })
    await store.loadPaychecks()
  }
})

const paycheck = computed(() => store.currentPaycheck)
const monthlySalary = computed(() => paycheck.value?.monthlySalary || 0)
const deductions = computed(() => paycheck.value?.deductions || [])
const quincenaAmount = computed(() => store.quincenaValue)

// Ahorro de las metas del mes, repartido en las dos quincenas
const savingsHalf = computed(() => Math.round(store.goalsSavingsFor(getCurrentMonth()) / 2))
const goalNames = computed(() => store.savingsGoals.filter(g => g.active).map(g => g.name).join(' · '))

const quincenas = computed(() =>
  [
    { key: '15', items: store.quincena15Debts as PaycheckDebt[], total: store.quincena15Total + savingsHalf.value },
    { key: '30', items: store.quincena30Debts as PaycheckDebt[], total: store.quincena30Total + savingsHalf.value }
  ].map(q => ({
    ...q,
    balance: quincenaAmount.value - q.total,
    percent: quincenaAmount.value ? (q.total / quincenaAmount.value) * 100 : 0
  }))
)

const stats = computed(() => {
  const month = quincenaAmount.value * 2
  const obligations = quincenas.value.reduce((s, q) => s + q.total, 0) - savingsHalf.value * 2
  const left = month - obligations - savingsHalf.value * 2
  return [
    { label: 'Te llega al mes', value: money(month), class: '', border: 'border-line' },
    { label: 'Obligaciones del mes', value: money(obligations), class: '', border: 'border-line' },
    {
      label: left < 0 ? 'Falta conseguir' : 'Te sobra',
      value: money(Math.abs(left)),
      class: left < 0 ? 'text-danger' : 'text-success',
      border: left < 0 ? 'border-danger/40' : 'border-line'
    },
    { label: 'Ahorro de metas', value: money(savingsHalf.value * 2), class: '', border: 'border-line' }
  ]
})

// Si se deja vacía, la obligación usa su nombre como categoría (se crea al guardar)
const expenseCategoryNames = computed(() =>
  store.categories.filter(c => c.type === 'expense' || c.type === 'both').map(c => c.name)
)

// ---------- Obligaciones ----------
const itemSheet = ref(false)
const editingItem = ref<PaycheckDebt | null>(null)
const form = reactive({ name: '', amount: 0, quincena: '15' as '15' | '30', category: '' })

// Aviso si con esta obligación la quincena queda en rojo
const itemWarning = computed(() => {
  if (!form.amount || !quincenaAmount.value) return ''
  const q = quincenas.value.find(x => x.key === form.quincena)
  if (!q) return ''
  const previous = editingItem.value?.quincena === form.quincena ? editingItem.value.amount : 0
  const after = q.balance + previous - form.amount
  return after < 0 ? `La quincena del ${form.quincena} quedaría en ${money(after)}. Considera pasarla a la otra quincena.` : ''
})

function openItem(item: PaycheckDebt | null) {
  editingItem.value = item
  Object.assign(form, item ? { name: item.name, amount: item.amount, quincena: item.quincena, category: item.category } : { name: '', amount: 0, quincena: '15', category: '' })
  itemSheet.value = true
}

function closeItem() {
  itemSheet.value = false
  editingItem.value = null
}

async function saveItem() {
  if (!paycheck.value || busy.value) return
  busy.value = true
  try {
    const debts = [...(paycheck.value.debts || [])]
    const data: PaycheckDebt = {
      id: editingItem.value?.id || crypto.randomUUID(),
      name: form.name.trim(),
      amount: form.amount,
      quincena: form.quincena,
      category: form.category.trim(),
      paid: editingItem.value?.paid || false,
      icon: editingItem.value?.icon || '💳'
    }
    const index = editingItem.value ? debts.findIndex(d => d.id === editingItem.value!.id) : -1
    if (index !== -1) debts[index] = data
    else debts.push(data)
    await store.updatePaycheck(paycheck.value.id, { debts })
    // La obligación también queda disponible como categoría de gasto
    await store.ensureDebtCategory(data.category || data.name, data.icon)
    closeItem()
  } finally {
    busy.value = false
  }
}

// ---------- Deducciones ----------
const showDeductions = ref(false)
const deductionForm = reactive({ name: '', amount: 0 })

function closeDeductions() {
  showDeductions.value = false
  Object.assign(deductionForm, { name: '', amount: 0 })
}

async function saveDeduction() {
  if (!paycheck.value || busy.value) return
  busy.value = true
  try {
    const list = [...(paycheck.value.deductions || []), { id: crypto.randomUUID(), name: deductionForm.name.trim(), amount: deductionForm.amount }]
    await store.updatePaycheck(paycheck.value.id, { deductions: list })
    Object.assign(deductionForm, { name: '', amount: 0 })
  } finally {
    busy.value = false
  }
}

// ---------- Salario ----------
const showSalary = ref(false)
const salaryForm = ref(0)

function openSalary() {
  salaryForm.value = monthlySalary.value
  showSalary.value = true
}

async function saveSalary() {
  if (!paycheck.value || busy.value) return
  busy.value = true
  try {
    await store.updatePaycheck(paycheck.value.id, { monthlySalary: salaryForm.value || 0, amount: salaryForm.value || 0 })
    showSalary.value = false
  } finally {
    busy.value = false
  }
}

// ---------- Eliminar ----------
const toConfirm = ref<{ kind: 'item' | 'deduction'; id: string; name: string } | null>(null)

async function confirmRemove() {
  const p = toConfirm.value
  if (!p || !paycheck.value || busy.value) return
  busy.value = true
  try {
    if (p.kind === 'item') {
      await store.updatePaycheck(paycheck.value.id, { debts: paycheck.value.debts.filter(d => d.id !== p.id) })
      closeItem()
    } else {
      await store.updatePaycheck(paycheck.value.id, { deductions: paycheck.value.deductions.filter(d => d.id !== p.id) })
    }
    toConfirm.value = null
  } finally {
    busy.value = false
  }
}
</script>
