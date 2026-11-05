<template>
  <!-- Confirmación antes de algo que no se puede deshacer (eliminar, descartar) -->
  <Teleport to="body">
    <div class="fixed inset-0 z-[80] grid place-items-center p-5 font-sans text-ink antialiased">
      <div class="absolute inset-0 animate-fade-in bg-[rgba(2,4,12,0.66)] backdrop-blur-[3px] motion-reduce:animate-none" @click="emit('cancel')" />
      <div
        class="relative flex w-full max-w-[400px] animate-modal-in flex-col items-center gap-3 rounded-card border border-line bg-surface-100 px-5 pt-6 pb-5 text-center shadow-float motion-reduce:animate-none"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-text"
      >
        <span class="grid grid-cols-[minmax(0,1fr)] size-12 place-items-center rounded-full bg-primary-soft text-danger [&_svg]:size-[22px]">
          <Trash2 :stroke-width="1.75" aria-hidden="true" />
        </span>
        <h2 id="confirm-title" class="m-0 font-sans text-xl/[26px] font-semibold">{{ title }}</h2>
        <div v-if="$slots.default" class="w-full"><slot /></div>
        <p id="confirm-text" class="m-0 text-sm text-ink-muted">{{ text }}</p>
        <div class="mt-2 grid w-full grid-cols-2 gap-2.5">
          <TpButton variant="secondary" :disabled="busy" @click="emit('cancel')">Cancelar</TpButton>
          <TpButton variant="danger" :disabled="busy" @click="emit('confirm')">{{ busy ? busyLabel : confirmLabel }}</TpButton>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { Trash2 } from 'lucide-vue-next'
import TpButton from './TpButton.vue'

withDefaults(defineProps<{
  title: string
  text: string
  confirmLabel?: string
  busyLabel?: string
  busy?: boolean
}>(), {
  confirmLabel: 'Sí, eliminar',
  busyLabel: 'Eliminando…',
  busy: false
})

const emit = defineEmits<{ confirm: []; cancel: [] }>()

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('cancel')
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>
