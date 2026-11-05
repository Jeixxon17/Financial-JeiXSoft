<template>
  <!-- Aviso del asesor al registrar un gasto (arriba en el celular, abajo a la derecha en escritorio) -->
  <Transition
    enter-active-class="transition duration-300 ease-out motion-reduce:transition-none"
    enter-from-class="opacity-0 translate-y-3"
    leave-active-class="transition duration-200 ease-in motion-reduce:transition-none"
    leave-to-class="opacity-0 translate-y-3"
  >
    <div
      v-if="advisorToast.visible"
      class="fixed inset-x-4 top-[calc(16px+env(safe-area-inset-top))] z-[90] flex flex-col gap-2 rounded-card border border-line bg-surface-200 p-3 font-sans text-ink shadow-float lg:top-auto lg:right-6 lg:bottom-6 lg:left-auto lg:w-[380px]"
      role="status"
    >
      <div class="flex items-center justify-between px-1 text-[11px]/[14px] font-semibold tracking-[0.5px] text-ink-faint uppercase">
        <span>Tu asesor</span>
        <button type="button" class="grid grid-cols-[minmax(0,1fr)] size-7 cursor-pointer place-items-center rounded-full hover:bg-surface-300 hover:text-ink [&_svg]:size-4" aria-label="Cerrar" @click="hideAdvice">
          <X :stroke-width="1.75" aria-hidden="true" />
        </button>
      </div>
      <AdviceItem v-for="(tip, i) in advisorToast.tips" :key="i" :tip="tip" />
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next'
import AdviceItem from '@/components/tp/AdviceItem.vue'
import { advisorToast, hideAdvice } from '@/services/advisorToast'
</script>