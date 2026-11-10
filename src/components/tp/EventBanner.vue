<template>
  <!-- Inicio: el viaje o evento en curso y cuánto lleva -->
  <RouterLink
    v-if="current"
    to="/events"
    class="flex items-center gap-3 rounded-tile border border-line bg-surface-100 p-4 text-ink no-underline transition-colors hover:border-line-strong"
  >
    <span class="grid size-9 shrink-0 place-items-center rounded-full [&_svg]:size-[18px]" :style="{ background: `${current.event.color}26`, color: current.event.color }">
      <component :is="eventIcon(current.event.icon)" :stroke-width="1.75" aria-hidden="true" />
    </span>
    <span class="min-w-0 flex-1">
      <span class="block truncate text-sm font-semibold">{{ current.event.name }}</span>
      <span class="mt-0.5 block text-[13px]/[19px] text-ink-muted">
        Llevas {{ money(current.total) }}<template v-if="current.days > 1"> en {{ current.days }} días</template>
      </span>
    </span>
    <ArrowRight class="size-[18px] shrink-0 text-ink-faint" :stroke-width="1.75" aria-hidden="true" />
  </RouterLink>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ArrowRight } from 'lucide-vue-next'
import { eventIcon } from './eventIcons'
import { eventDays } from './eventFormat'
import { money } from './format'
import { useFinanceStore } from '@/stores/finance'
import { hasFullPlan } from '@/services/plan.service'
import { todayISO } from '@/utils/dates'

const store = useFinanceStore()

const current = computed(() => {
  if (!hasFullPlan.value) return null
  const event = store.eventForDate(todayISO())
  if (!event) return null
  return { event, total: store.eventSummary(event.id).total, days: eventDays(event) }
})
</script>
