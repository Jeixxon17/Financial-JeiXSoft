<template>
  <TpLayout>
    <!-- ===== Encabezado ===== -->
    <div class="flex flex-wrap items-center gap-3">
      <div class="min-w-0 flex-[1_1_220px]">
        <h1 :class="pageTitle">Viajes y eventos</h1>
        <p class="mt-0.5 text-[13px]/[18px] text-ink-muted lg:text-sm">Cuánto gastaste en cada lugar o plan, sin importar la categoría.</p>
      </div>
      <button type="button" :class="[iconBtn, 'border-primary bg-primary text-white lg:hidden']" aria-label="Nuevo viaje o evento" @click="form = { event: undefined }">
        <Plus :stroke-width="1.75" aria-hidden="true" />
      </button>
      <div class="hidden lg:block">
        <TpButton @click="form = { event: undefined }">
          <Plus :stroke-width="1.75" aria-hidden="true" />
          Nuevo viaje o evento
        </TpButton>
      </div>
    </div>

    <!-- Cargando -->
    <div v-if="!ready" class="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-[repeat(auto-fill,minmax(300px,1fr))]" aria-busy="true" aria-label="Cargando">
      <TpSkeleton v-for="n in 3" :key="n" class="block h-[132px] rounded-card" />
    </div>

    <!-- Sin eventos -->
    <div v-else-if="!store.events.length" class="flex flex-col items-center gap-3 rounded-card border border-line bg-surface-100 px-6 py-10 text-center">
      <span class="grid size-14 place-items-center rounded-full bg-primary-soft text-accent-light [&_svg]:size-6">
        <MapPin :stroke-width="1.75" aria-hidden="true" />
      </span>
      <strong class="text-base font-semibold">¿Vas de viaje o tienes un plan?</strong>
      <p class="m-0 max-w-sm text-[13px]/[19px] text-ink-muted">
        Crea uno (ej: "Bogotá") y los gastos que registres esos días quedan ahí. Así sabes cuánto te costó, aparte de tus categorías.
      </p>
      <TpButton @click="form = { event: undefined }">
        <Plus :stroke-width="1.75" aria-hidden="true" />
        Crear el primero
      </TpButton>
    </div>

    <template v-else>
      <section v-for="group in groups" :key="group.title" class="flex flex-col gap-3" :aria-label="group.title">
        <h2 class="m-0 text-sm font-semibold text-ink-muted">{{ group.title }}</h2>
        <div class="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">
          <button
            v-for="card in group.items"
            :key="card.event.id"
            type="button"
            class="flex cursor-pointer flex-col gap-3 rounded-card border border-line bg-surface-100 p-4 text-left transition-colors hover:border-primary"
            @click="detailId = card.event.id"
          >
            <span class="flex items-center gap-3">
              <span class="grid size-10 shrink-0 place-items-center rounded-tile [&_svg]:size-5" :style="{ background: `${card.event.color}26`, color: card.event.color }">
                <component :is="eventIcon(card.event.icon)" :stroke-width="1.75" aria-hidden="true" />
              </span>
              <span class="flex min-w-0 flex-1 flex-col">
                <strong class="truncate text-[15px]/5 font-semibold">{{ card.event.name }}</strong>
                <small class="truncate text-xs text-ink-faint">{{ card.range }}</small>
              </span>
              <span v-if="card.ongoing" class="rounded-chip bg-primary-soft px-2.5 py-1 text-[11px] font-semibold text-accent-light">En curso</span>
            </span>
            <span class="flex items-end justify-between gap-3">
              <span class="flex flex-col">
                <span class="text-xs text-ink-faint">Gastaste</span>
                <strong class="text-[22px]/7 font-semibold tabular-nums">{{ money(card.total) }}</strong>
              </span>
              <span class="text-right text-xs text-ink-faint">
                {{ card.count }} {{ card.count === 1 ? 'gasto' : 'gastos' }}<template v-if="card.perDay"><br />{{ money(card.perDay) }} por día</template>
              </span>
            </span>
            <span v-if="card.event.budget" class="h-1.5 overflow-hidden rounded-full bg-surface-300">
              <span class="block h-full rounded-full" :class="card.over ? 'bg-warning' : 'bg-primary'" :style="{ width: `${card.pct}%` }" />
            </span>
          </button>
        </div>
      </section>
    </template>
  </TpLayout>

  <EventDetail
    v-if="detailEvent"
    :key="detailEvent.id"
    :event="detailEvent"
    @close="detailId = null"
    @edit="ev => { detailId = null; form = { event: ev } }"
    @open-tx="tx => (txDetail = tx)"
  />
  <EventForm v-if="form" :event="form.event" @close="form = null" @saved="id => { if (!form?.event) detailId = id }" />
  <TxDetail
    v-if="txDetail"
    :tx="txDetail"
    @close="txDetail = null"
    @edit="tx => { txDetail = null; txForm = { transaction: tx } }"
    @duplicate="prefill => { txDetail = null; txForm = { prefill } }"
  />
  <TxForm v-if="txForm" :transaction="txForm.transaction" :prefill="txForm.prefill" @close="txForm = null" />
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { MapPin, Plus } from 'lucide-vue-next'
import TpLayout from '@/layouts/TpLayout.vue'
import TpButton from '@/components/tp/TpButton.vue'
import TpSkeleton from '@/components/tp/TpSkeleton.vue'
import EventDetail from '@/components/tp/EventDetail.vue'
import EventForm from '@/components/tp/EventForm.vue'
import TxDetail from '@/components/tp/TxDetail.vue'
import TxForm from '@/components/tp/TxForm.vue'
import { eventIcon } from '@/components/tp/eventIcons'
import { eventDays, eventRange } from '@/components/tp/eventFormat'
import { money } from '@/components/tp/format'
import { useFinanceStore } from '@/stores/finance'
import type { SpendingEvent, Transaction } from '@/interfaces'

const store = useFinanceStore()
const ready = computed(() => store.loaded.events && store.loaded.transactions)

const pageTitle = 'm-0 font-sans text-xl/[26px] font-semibold lg:text-[26px]/8 lg:tracking-[-0.3px]'
const iconBtn =
  'relative grid size-10 shrink-0 cursor-pointer place-items-center rounded-full border border-line-strong text-ink transition-colors hover:bg-surface-200 [&_svg]:size-[18px]'

onMounted(() => {
  store.loadEvents()
  store.loadTransactions()
  store.loadCategories()
})

const cards = computed(() =>
  store.events.map(event => {
    const { total, count } = store.eventSummary(event.id)
    const days = eventDays(event)
    const pct = event.budget ? Math.min(100, Math.round((total / event.budget) * 100)) : 0
    return {
      event,
      total,
      count,
      ongoing: store.isEventOngoing(event),
      range: eventRange(event),
      perDay: days && total ? Math.round(total / days) : 0,
      pct,
      over: !!event.budget && total > event.budget
    }
  })
)

const groups = computed(() =>
  [
    { title: 'En curso', items: cards.value.filter(c => c.ongoing) },
    { title: 'Anteriores', items: cards.value.filter(c => !c.ongoing) }
  ].filter(g => g.items.length)
)

const detailId = ref<string | null>(null)
const detailEvent = computed(() => store.events.find(e => e.id === detailId.value) || null)
const form = ref<{ event: SpendingEvent | undefined } | null>(null)
const txDetail = ref<Transaction | null>(null)
const txForm = ref<{ transaction?: Transaction; prefill?: Partial<Transaction> } | null>(null)
</script>
