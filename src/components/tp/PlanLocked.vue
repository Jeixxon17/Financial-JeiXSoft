<template>
  <!-- Sección del plan Completo vista con el plan Gratis: vista previa borrosa y qué gana el usuario -->
  <div class="flex flex-wrap items-center gap-3">
    <div class="min-w-0 flex-[1_1_220px]">
      <h1 class="m-0 font-sans text-xl/[26px] font-semibold lg:text-[26px]/8 lg:tracking-[-0.3px]">{{ title }}</h1>
    </div>
    <span class="inline-flex items-center gap-1.5 rounded-chip border border-line bg-primary-soft px-3 py-[5px] text-xs font-semibold text-accent-light [&_svg]:size-3.5">
      <Lock :stroke-width="2.4" aria-hidden="true" />
      Plan Completo
    </span>
  </div>

  <!-- Vista previa y bloqueo en la misma celda: la página crece con el que sea más alto -->
  <div class="grid grid-cols-[minmax(0,1fr)] pb-6">
    <!-- Vista previa borrosa -->
    <div class="pointer-events-none flex flex-col gap-2.5 opacity-50 blur-[3px] [grid-area:1/1]" aria-hidden="true">
      <div v-for="n in 5" :key="n" class="flex items-center gap-3 rounded-tile border border-line bg-surface-100 px-4 py-3">
        <span class="size-10 shrink-0 rounded-full bg-surface-300" />
        <span class="flex flex-1 flex-col gap-2">
          <span class="h-2.5 rounded-full bg-surface-300" :style="{ width: `${40 + ((n * 13) % 35)}%` }" />
          <span class="h-2 w-1/3 rounded-full bg-surface-300" />
        </span>
        <span class="h-3 w-16 rounded-full bg-surface-300" />
      </div>
    </div>

    <!-- Bloqueo -->
    <div
      class="relative z-10 mx-auto mt-6 flex w-full max-w-[460px] self-start [grid-area:1/1] flex-col items-center gap-3 rounded-card border border-line bg-surface-100 px-5 py-6 text-center shadow-float lg:px-7"
    >
      <span class="grid size-14 place-items-center rounded-full bg-linear-135 from-accent-light to-primary text-white [&_svg]:size-[26px]">
        <Lock :stroke-width="2" aria-hidden="true" />
      </span>
      <h2 class="m-0 font-sans text-[21px]/[27px] font-semibold">{{ info.title }}</h2>
      <p class="m-0 text-sm text-ink-muted">{{ info.text }}</p>
      <div class="flex flex-col gap-2 self-stretch px-1 pt-1 text-left">
        <span v-for="p in info.points" :key="p" class="flex items-start gap-2.5 text-sm text-ink-muted [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-success">
          <Check :stroke-width="2.4" aria-hidden="true" />
          {{ p }}
        </span>
      </div>
      <TpButton block class="mt-1" @click="openUpgrade(feature)">Desbloquear todo · {{ money(PLAN_PRICE) }}</TpButton>
      <span class="text-xs font-medium text-ink-faint">Un solo pago, para siempre. Sin mensualidades.</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Check, Lock } from 'lucide-vue-next'
import TpButton from './TpButton.vue'
import { money } from './format'
import { PLAN_PRICE, openUpgrade, proFeatures, type ProFeature } from '@/services/plan.service'

const props = defineProps<{ feature: ProFeature; title: string }>()
const info = computed(() => proFeatures[props.feature])
</script>
