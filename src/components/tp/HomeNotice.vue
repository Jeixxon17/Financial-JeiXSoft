<template>
  <!-- Aviso del asesor (sin emojis: ícono de trazo según el nivel) -->
  <RouterLink
    to="/budgets"
    class="flex gap-3 rounded-tile border border-line bg-surface-100 p-4 text-ink no-underline transition-colors hover:border-line-strong"
  >
    <span
      class="grid grid-cols-[minmax(0,1fr)] size-8 shrink-0 place-items-center rounded-full bg-primary-soft [&_svg]:size-4"
      :class="tip.level === 'danger' ? 'text-danger' : 'text-warning'"
    >
      <TriangleAlert v-if="tip.level === 'danger'" :stroke-width="1.75" aria-hidden="true" />
      <CircleAlert v-else :stroke-width="1.75" aria-hidden="true" />
    </span>
    <span>
      <span class="block text-sm font-semibold">{{ tip.title }}</span>
      <span class="mt-0.5 block text-[13px]/[19px] text-ink-muted">{{ tip.text }}</span>
    </span>
  </RouterLink>
</template>

<script setup lang="ts">
import { CircleAlert, TriangleAlert } from 'lucide-vue-next'
import type { Advice } from '@/utils/plan'

defineProps<{ tip: Advice }>()
</script>
