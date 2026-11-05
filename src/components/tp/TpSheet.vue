<template>
  <!--
    Hoja del design system: abajo en el celular, modal centrado en escritorio.
    <TpSheet title="Registrar" @close="..."> contenido <template #footer>botones</template> </TpSheet>
  -->
  <Teleport to="body">
    <div class="fixed inset-0 z-[70] font-sans text-ink antialiased">
      <div
        class="absolute inset-0 animate-fade-in bg-[rgba(2,4,12,0.66)] backdrop-blur-[3px] motion-reduce:animate-none"
        @click="emit('close')"
      />
      <div
        ref="panel"
        :class="[
          'fixed inset-x-0 bottom-0 flex max-h-[92dvh] flex-col rounded-t-sheet border-t border-line bg-surface-100 shadow-float',
          'animate-sheet-in motion-reduce:animate-none',
          'lg:inset-x-auto lg:bottom-auto lg:top-1/2 lg:left-1/2 lg:max-h-[calc(100dvh-64px)] lg:-translate-x-1/2 lg:-translate-y-1/2',
          'lg:animate-modal-in lg:rounded-card lg:border',
          wide ? 'lg:w-[min(720px,calc(100%-32px))]' : 'lg:w-[min(520px,calc(100%-32px))]'
        ]"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
        tabindex="-1"
      >
        <div class="flex shrink-0 flex-col gap-3 px-5 pt-3 lg:px-7 lg:pt-6">
          <span class="h-1 w-10 self-center rounded-full bg-surface-300 lg:hidden" />
          <div v-if="title || $slots.head" class="flex items-center justify-between gap-3">
            <slot name="head">
              <h2 class="m-0 font-sans text-xl/[26px] font-semibold lg:text-[22px]/7">{{ title }}</h2>
            </slot>
            <button
              type="button"
              class="grid grid-cols-[minmax(0,1fr)] size-9 shrink-0 cursor-pointer place-items-center rounded-full border border-line-strong text-ink transition-colors hover:bg-surface-200 [&_svg]:size-[18px]"
              aria-label="Cerrar"
              @click="emit('close')"
            >
              <X :stroke-width="1.75" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pt-4 pb-5 lg:px-7">
          <slot />
        </div>

        <div
          v-if="$slots.footer"
          class="flex shrink-0 gap-2.5 border-t border-line px-5 pt-3 pb-[calc(16px+env(safe-area-inset-bottom))] lg:justify-end lg:px-7 lg:pb-6"
        >
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { X } from 'lucide-vue-next'

defineProps<{ title?: string; wide?: boolean }>()
const emit = defineEmits<{ close: [] }>()
const panel = ref<HTMLElement | null>(null)

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close')
}

// Mientras está abierta, la página de atrás no se desplaza
let previousOverflow = ''
onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  panel.value?.focus()
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = previousOverflow
})
</script>
