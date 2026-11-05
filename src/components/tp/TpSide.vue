<template>
  <!-- Escritorio: menú lateral fijo de 248px -->
  <aside
    class="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col gap-1 overflow-y-auto border-r border-line bg-[rgba(7,11,25,0.85)] px-4 py-6 lg:flex"
    aria-label="Menú principal"
  >
    <RouterLink to="/dashboard" class="flex items-center gap-2.5 px-2.5 pb-6 text-[19px] leading-none font-extrabold tracking-[-0.4px] text-ink no-underline">
      <img :src="symbol" alt="" width="30" height="30" />
      <span>TuPlata<span class="text-accent-light">AlDia</span></span>
    </RouterLink>

    <RouterLink
      v-for="link in mainLinks"
      :key="link.to"
      :to="link.to"
      :class="[itemClass, isActive(link.to) ? activeClass : idleClass]"
    >
      <component :is="link.icon" :stroke-width="1.75" aria-hidden="true" />
      {{ link.label }}
      <Lock v-if="link.pro && !hasFullPlan" :class="lockClass" :stroke-width="2" aria-label="Plan Completo" />
      <span
        v-else-if="link.to === '/inbox' && pending > 0"
        class="ml-auto min-w-[22px] rounded-full bg-primary px-[7px] py-0.5 text-center text-[11px]/[14px] font-bold text-white"
      >
        {{ pending }}
      </span>
    </RouterLink>

    <span class="px-3.5 pt-4 pb-1.5 text-[11px]/[14px] font-semibold tracking-[0.6px] text-ink-faint uppercase">Más</span>
    <RouterLink
      v-for="link in moreLinks"
      :key="link.to"
      :to="link.to"
      :class="[itemClass, isActive(link.to) ? activeClass : idleClass]"
    >
      <component :is="link.icon" :stroke-width="1.75" aria-hidden="true" />
      {{ link.label }}
      <Lock v-if="link.pro && !hasFullPlan" :class="lockClass" :stroke-width="2" aria-label="Plan Completo" />
    </RouterLink>

    <!-- Plan Gratis: invitación a desbloquear todo -->
    <button
      v-if="!hasFullPlan"
      type="button"
      class="mx-1 mt-4 flex cursor-pointer flex-col gap-1 rounded-tile border border-line bg-primary-soft px-3.5 py-3 text-left transition-colors hover:border-line-strong"
      @click="openUpgrade()"
    >
      <span class="text-[13px] font-semibold text-ink">Desbloquea todo</span>
      <span class="text-xs text-accent-light">{{ money(PLAN_PRICE) }} · pago único</span>
    </button>

    <div class="mt-auto flex items-center gap-2.5 border-t border-line px-2.5 pt-3 text-[13px]/[18px] font-medium">
      <span class="grid grid-cols-[minmax(0,1fr)] size-10 shrink-0 place-items-center rounded-full bg-surface-300">
        <CircleUser :size="20" :stroke-width="1.75" aria-hidden="true" />
      </span>
      <RouterLink to="/profile" class="min-w-0 flex-1 text-ink no-underline hover:text-accent-light">
        <span class="block truncate">{{ authState.name || 'Mi cuenta' }}</span>
        <small class="block text-xs text-ink-faint">TuPlataAlDia v{{ appVersion }}</small>
      </RouterLink>
      <button
        type="button"
        class="grid grid-cols-[minmax(0,1fr)] size-9 cursor-pointer place-items-center rounded-full border border-line text-ink-muted transition-colors hover:bg-surface-200 hover:text-ink [&_svg]:size-[18px]"
        aria-label="Bloquear la app"
        title="Bloquear"
        @click="lockApp"
      >
        <LockKeyhole :stroke-width="1.75" aria-hidden="true" />
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import { CircleUser, Lock, LockKeyhole } from 'lucide-vue-next'
import symbol from '@/assets/brand/tuplata-symbol-dark.svg'
import { authState, lockApp } from '@/services/auth.service'
import { PLAN_PRICE, hasFullPlan, openUpgrade } from '@/services/plan.service'
import { money } from './format'
import { mainLinks, moreLinks } from './navigation'

defineProps<{ pending: number }>()
const route = useRoute()
const appVersion = __APP_VERSION__

const isActive = (to: string) => route.path.startsWith(to)
const itemClass =
  'flex min-h-11 items-center gap-3 rounded-xl px-3.5 text-sm font-medium no-underline transition-colors [&_svg]:size-5 [&_svg]:shrink-0'
const activeClass = 'bg-surface-200 text-ink [&_svg]:text-accent-light'
const idleClass = 'text-ink-muted hover:bg-surface-100 hover:text-ink'
const lockClass = 'ml-auto size-3.5! text-ink-faint'
</script>
