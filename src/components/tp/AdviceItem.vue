<template>
  <!-- Un consejo del asesor; el ícono y su color dicen qué tan importante es -->
  <div class="flex gap-3 rounded-tile border border-line bg-surface-100 p-4">
    <span class="grid grid-cols-[minmax(0,1fr)] size-8 shrink-0 place-items-center rounded-full bg-primary-soft [&_svg]:size-4" :class="look.class">
      <component :is="look.icon" :stroke-width="1.75" aria-hidden="true" />
    </span>
    <span class="min-w-0">
      <span class="block text-sm font-semibold">{{ tip.title }}</span>
      <span class="mt-0.5 block text-[13px]/[19px] text-ink-muted">{{ tip.text }}</span>
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-vue-next'
import type { Advice } from '@/utils/plan'

const props = defineProps<{ tip: Advice }>()

const look = computed(() => {
  switch (props.tip.level) {
    case 'danger':
      return { icon: TriangleAlert, class: 'text-danger' }
    case 'warn':
      return { icon: CircleAlert, class: 'text-warning' }
    case 'good':
      return { icon: CircleCheck, class: 'text-success' }
    default:
      return { icon: Info, class: 'text-accent-light' }
  }
})
</script>
