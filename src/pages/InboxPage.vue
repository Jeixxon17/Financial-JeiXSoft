<template>
  <TpLayout>
    <!-- ===== Encabezado ===== -->
    <div class="flex flex-wrap items-center gap-3">
      <div class="min-w-0 flex-[1_1_200px]">
        <h1 class="m-0 font-sans text-xl/[26px] font-semibold lg:text-[26px]/8 lg:tracking-[-0.3px]">Por confirmar</h1>
        <p class="mt-0.5 text-[13px]/[18px] text-ink-muted lg:text-sm">
          <TpSkeleton v-if="!ready" class="inline-block h-3.5 w-44 rounded-chip align-middle" />
          <template v-else>{{ subtitle }}</template>
        </p>
      </div>
      <span
        v-if="canReadNotifications && status"
        class="inline-flex items-center rounded-chip border border-line bg-primary-soft px-3 py-[5px] text-xs font-semibold"
        :class="allReady ? 'text-success' : 'text-warning'"
      >
        {{ allReady ? 'Lector activo' : 'Falta configurar' }}
      </span>
      <div v-if="canReadNotifications" class="hidden lg:block">
        <TpButton variant="secondary" @click="openSms">
          <MessageSquareText :stroke-width="1.75" aria-hidden="true" />
          Buscar SMS del banco
        </TpButton>
      </div>
    </div>

    <p
      v-if="smsSent"
      class="m-0 flex items-center gap-2.5 rounded-tile border border-line bg-surface-100 px-4 py-3 text-sm text-ink [&_svg]:size-[18px] [&_svg]:shrink-0 [&_svg]:text-success"
    >
      <CircleCheck :stroke-width="1.75" aria-hidden="true" />
      {{ smsSent === 1 ? 'Se recuperó 1 movimiento de los SMS' : `Se recuperaron ${smsSent} movimientos de los SMS` }}: confírmalos abajo.
    </p>

    <div class="grid grid-cols-[minmax(0,1fr)] items-start gap-[18px] lg:gap-6 min-[1100px]:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
      <!-- ===== Pendientes ===== -->
      <div class="flex min-w-0 flex-col gap-3">
        <!-- Celular: si falta configurar el lector, va primero -->
        <ReaderStatus
          v-if="canReadNotifications && status && !allReady"
          class="lg:hidden"
          :status="status"
          :all-ready="allReady"
        />

        <!-- Cargando -->
        <template v-if="!ready">
          <div v-for="n in 2" :key="n" :class="cardClass" aria-busy="true" aria-label="Cargando pendientes">
            <div class="flex justify-between">
              <TpSkeleton class="block h-3.5 w-16 rounded-chip" />
              <TpSkeleton class="block h-3 w-24 rounded-chip" />
            </div>
            <div class="flex items-end justify-between gap-3">
              <span class="flex flex-col gap-2">
                <TpSkeleton class="block h-4 w-44 rounded-chip" />
                <TpSkeleton class="block h-3 w-32 rounded-chip" />
              </span>
              <TpSkeleton class="block h-5 w-24 rounded-chip" />
            </div>
            <div class="grid grid-cols-2 gap-2">
              <TpSkeleton class="block h-11 rounded-full" />
              <TpSkeleton class="block h-11 rounded-full" />
            </div>
          </div>
        </template>

        <!-- Todo al día -->
        <div v-else-if="!items.length" class="flex flex-col items-center gap-2 rounded-card bg-surface-100 px-6 py-10 text-center">
          <span class="grid grid-cols-[minmax(0,1fr)] size-12 place-items-center rounded-full bg-surface-200 text-success [&_svg]:size-6">
            <Inbox :stroke-width="1.75" aria-hidden="true" />
          </span>
          <strong class="text-base font-semibold">Nada por confirmar</strong>
          <span class="max-w-[420px] text-sm text-ink-muted">
            Lo que el celular lea de las notificaciones y SMS del banco aparece aquí para que lo revises antes de registrarlo.
          </span>
        </div>

        <!-- Lista -->
        <template v-else>
        <article v-for="item in items" :key="item.id" :class="cardClass">
          <div class="flex items-center justify-between gap-3">
            <span class="inline-flex items-center gap-1.5 text-[13px]/[18px] font-semibold [&_svg]:size-4" :class="kindOf(item).class">
              <component :is="kindOf(item).icon" :stroke-width="1.75" aria-hidden="true" />
              {{ kindOf(item).label }}
            </span>
            <span class="text-xs text-ink-faint">{{ formatReceived(item.receivedAt) }}</span>
          </div>

          <div class="flex items-end justify-between gap-3">
            <div class="flex min-w-0 flex-col gap-0.5">
              <span class="truncate text-[15px]/[22px] font-semibold">{{ item.description || item.title || 'Movimiento' }}</span>
              <span class="text-xs text-ink-faint">{{ accountLabel(item) }}</span>
              <span v-if="suggestedCategory(item)" class="text-xs text-ink-faint">Categoría sugerida: {{ suggestedCategory(item) }}</span>
            </div>
            <span class="text-xl/[26px] font-semibold whitespace-nowrap tabular-nums" :class="{ 'text-success': item.type === 'income' }">
              {{ amountOf(item) }}
            </span>
          </div>

          <p v-if="item.type === 'expense' && item.productKind === 'credit'" class="m-0 text-[13px]/[19px] text-ink-muted">
            Compra con tarjeta de crédito: al confirmarla eliges en cuántas cuotas la diferiste.
          </p>

          <details class="group text-xs text-ink-faint">
            <summary class="cursor-pointer list-none hover:text-ink-muted">
              <span class="group-open:hidden">Ver mensaje del banco</span>
              <span class="hidden group-open:inline">Ocultar mensaje</span>
            </summary>
            <p class="mt-1.5 mb-0 rounded-chip bg-surface-200 px-3 py-2 leading-5 break-words">{{ item.title }} · {{ item.text }}</p>
          </details>

          <div class="grid grid-cols-2 gap-2 lg:flex lg:justify-end">
            <TpButton variant="secondary" size="sm" @click="toDiscard = item">Descartar</TpButton>
            <TpButton size="sm" @click="selected = item">Confirmar</TpButton>
          </div>
        </article>
        </template>

        <!-- Celular: recuperar SMS -->
        <div v-if="canReadNotifications" class="flex gap-3 rounded-tile border border-line bg-surface-100 p-4 lg:hidden">
          <span class="grid grid-cols-[minmax(0,1fr)] size-8 shrink-0 place-items-center rounded-full bg-primary-soft [&_svg]:size-4">
            <MessageSquareText :stroke-width="1.75" aria-hidden="true" />
          </span>
          <div class="flex flex-col gap-2.5">
            <div>
              <span class="block text-sm font-semibold">¿Faltó algún movimiento?</span>
              <span class="mt-0.5 block text-[13px]/[19px] text-ink-muted">Busca los SMS del banco de ciertos días y recupéralos.</span>
            </div>
            <TpButton variant="secondary" size="sm" class="self-start" @click="openSms">Buscar SMS del banco</TpButton>
          </div>
        </div>

        <!-- Celular: el lector ya está bien, va al final -->
        <ReaderStatus
          v-if="canReadNotifications && status && allReady"
          class="lg:hidden"
          :status="status"
          :all-ready="allReady"
        />
        <p v-if="!canReadNotifications" class="m-0 text-[13px]/[19px] text-ink-faint lg:hidden">
          Las notificaciones y SMS del banco se leen desde la app Android. Lo que llegue al celular aparece aquí también.
        </p>
      </div>

      <!-- ===== Escritorio: estado del lector ===== -->
      <div class="hidden min-w-0 flex-col gap-4 lg:flex">
        <ReaderStatus v-if="canReadNotifications && status" :status="status" :all-ready="allReady" />
        <div v-else class="flex flex-col gap-2 rounded-card border border-line bg-surface-100 p-5">
          <span class="text-sm font-medium text-ink-muted">Lector del celular</span>
          <p class="m-0 text-sm text-ink">Las notificaciones y SMS del banco se leen desde la app Android.</p>
          <p class="m-0 text-[13px]/[19px] text-ink-faint">Lo que llegue al celular aparece aquí también, para confirmarlo desde el computador.</p>
        </div>
      </div>
    </div>
  </TpLayout>

  <SmsImportModal v-if="showSms" @close="showSms = false" @sent="(n: number) => (smsSent = n)" />
  <!-- Autorización para buscar SMS (la primera vez) -->
  <ConsentSheet v-if="asking" :kind="asking" @accept="accepted" @cancel="cancelled" />

  <TxForm
    v-if="selected"
    :key="selected.id"
    title="Confirmar movimiento"
    :prefill="prefillFor(selected)"
    @saved="store.dismissPendingTransaction(selected!.id)"
    @close="selected = null"
  />

  <!-- Confirmación antes de descartar: evita borrar algo por un toque accidental -->
  <TpConfirm
    v-if="toDiscard"
    title="¿Descartar este movimiento?"
    text="Se quita de Por confirmar y no se registra. No se puede deshacer."
    confirm-label="Sí, descartar"
    busy-label="Descartando…"
    :busy="discarding"
    @cancel="toDiscard = null"
    @confirm="confirmDiscard"
  >
    <p class="m-0 flex justify-between gap-3 rounded-tile bg-surface-200 px-4 py-3 text-sm">
      <strong class="truncate font-semibold">{{ toDiscard.description || toDiscard.title || 'Movimiento' }}</strong>
      <span class="font-semibold whitespace-nowrap tabular-nums">{{ amountOf(toDiscard) }}</span>
    </p>
  </TpConfirm>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ArrowDownLeft, ArrowUpRight, CircleCheck, CircleHelp, Inbox, MessageSquareText } from 'lucide-vue-next'
import TpLayout from '@/layouts/TpLayout.vue'
import TpButton from '@/components/tp/TpButton.vue'
import TpConfirm from '@/components/tp/TpConfirm.vue'
import TpSkeleton from '@/components/tp/TpSkeleton.vue'
import TxForm from '@/components/tp/TxForm.vue'
import ReaderStatus from '@/components/tp/ReaderStatus.vue'
import SmsImportModal from '@/components/modals/SmsImportModal.vue'
import ConsentSheet from '@/components/legal/ConsentSheet.vue'
import { useConsent } from '@/services/consent.service'
import { plain } from '@/components/tp/format'
import { useFinanceStore } from '@/stores/finance'
import { toISODate } from '@/utils/dates'
import { parseBankNotification, type ParsedNotification } from '@/utils/bankNotifications'
import type { PendingTransaction, Transaction } from '@/interfaces'
import { canReadNotifications, flushNotifications, getNotificationStatus } from '@/services/notificationListener'

type PendingItem = PendingTransaction & ParsedNotification & { bank: 'bancolombia' | 'nu' }

const store = useFinanceStore()
const ready = computed(() => store.loaded.pending && store.loaded.accounts)
const selected = ref<PendingItem | null>(null)
const showSms = ref(false)
const { asking, withConsent, accepted, cancelled } = useConsent()
const openSms = () => withConsent('sms', () => (showSms.value = true))
const smsSent = ref(0)
const toDiscard = ref<PendingItem | null>(null)
const discarding = ref(false)

const cardClass = 'flex flex-col gap-3 rounded-card border border-line bg-surface-100 p-4 lg:p-5'

async function confirmDiscard() {
  if (!toDiscard.value) return
  discarding.value = true
  try {
    await store.dismissPendingTransaction(toDiscard.value.id)
    toDiscard.value = null
  } finally {
    discarding.value = false
  }
}

const status = ref<Awaited<ReturnType<typeof getNotificationStatus>>>(null)
const allReady = computed(() => !!status.value?.permission && !!status.value.battery && !!status.value.session)

// Se interpretan al mostrarlas: mejorar el intérprete no requiere reinstalar la app
const items = computed<PendingItem[]>(() =>
  store.pendingTransactions.map(p => {
    const bank = p.bank || (p.package === 'com.nu.production' ? 'nu' : 'bancolombia')
    return { ...p, bank, ...parseBankNotification(p.title, p.text, bank) }
  })
)

const subtitle = computed(() => {
  const n = items.value.length
  if (!n) return 'Todo al día'
  return n === 1 ? '1 movimiento leído del banco' : `${n} movimientos leídos del banco`
})

async function refresh() {
  status.value = await getNotificationStatus()
  await flushNotifications()
  await store.loadPendingTransactions()
}

// Al volver de Ajustes se revisa otra vez el estado
function onVisible() {
  if (!document.hidden) refresh()
}

onMounted(() => {
  store.loadAccounts()
  refresh()
  document.addEventListener('visibilitychange', onVisible)
})
onBeforeUnmount(() => document.removeEventListener('visibilitychange', onVisible))

function kindOf(item: PendingItem) {
  if (item.type === 'income') return { label: 'Ingreso', icon: ArrowDownLeft, class: 'text-success' }
  if (item.type === 'expense') return { label: 'Gasto', icon: ArrowUpRight, class: 'text-ink-muted' }
  return { label: 'Sin identificar', icon: CircleHelp, class: 'text-warning' }
}

function amountOf(item: PendingItem) {
  if (item.amount === null) return '—'
  if (item.type === 'income') return `+${plain(item.amount)}`
  if (item.type === 'expense') return `−${plain(item.amount)}`
  return plain(item.amount)
}

function accountFor(item: PendingItem) {
  return store.getAccountForNotification(item.last4, item.productKind, item.bank)
}

function accountLabel(item: PendingItem) {
  const account = accountFor(item)
  if (account) return `${account.name}${item.last4 ? ` · *${item.last4}` : ''}`
  return item.last4 ? `Cuenta *${item.last4} (sin asociar)` : 'Cuenta sin identificar'
}

function suggestedCategory(item: PendingItem) {
  return (item.suggestedCategory && store.getCategoryById(item.suggestedCategory)?.name) || ''
}

function formatReceived(iso: string) {
  const d = new Date(iso)
  const day = d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }).replace('.', '').replace(' de ', ' ')
  const time = d.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })
  return `${day} · ${time}`
}

function prefillFor(item: PendingItem): Partial<Transaction> {
  const category = item.suggestedCategory && store.getCategoryById(item.suggestedCategory) ? item.suggestedCategory : ''
  return {
    type: item.type || 'expense',
    amount: item.amount || 0,
    date: item.date || toISODate(new Date(item.receivedAt)),
    accountId: accountFor(item)?.id || '',
    description: item.description,
    category
  }
}
</script>
