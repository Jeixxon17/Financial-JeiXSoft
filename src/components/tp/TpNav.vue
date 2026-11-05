<template>
  <!-- Celular: navegación flotante con las 5 secciones -->
  <nav
    class="fixed bottom-[calc(16px+env(safe-area-inset-bottom))] left-1/2 z-40 flex w-[min(390px,calc(100%-32px))] -translate-x-1/2 justify-between gap-2 rounded-full border border-line bg-surface-200 p-2 shadow-float lg:hidden"
    aria-label="Navegación principal"
  >
    <RouterLink
      v-for="link in mainLinks"
      :key="link.to"
      :to="link.to"
      class="relative grid size-12 place-items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-light [&_svg]:size-[22px]"
      :class="isActive(link.to) ? 'bg-ink text-on-inverse' : 'bg-surface-300 text-ink-muted'"
      :aria-label="link.label"
      :aria-current="isActive(link.to) ? 'page' : undefined"
    >
      <component :is="link.icon" :stroke-width="1.75" aria-hidden="true" />
      <span
        v-if="link.pro && !hasFullPlan"
        class="absolute top-0 right-0 grid size-[18px] place-items-center rounded-full border-2 border-surface-200 bg-surface-300 text-ink-muted [&_svg]:size-2.5"
      >
        <Lock :stroke-width="2.6" aria-hidden="true" />
      </span>
      <span
        v-else-if="link.to === '/inbox' && pending > 0"
        class="absolute top-0.5 right-0 min-w-[18px] rounded-full border-2 border-surface-200 bg-primary px-[5px] py-px text-center text-[10px]/[14px] font-bold text-white"
      >
        {{ pending > 9 ? '9+' : pending }}
      </span>
    </RouterLink>
  </nav>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import { Lock } from 'lucide-vue-next'
import { mainLinks } from './navigation'
import { hasFullPlan } from '@/services/plan.service'

defineProps<{ pending: number }>()
const route = useRoute()
const isActive = (to: string) => route.path.startsWith(to)
</script>
