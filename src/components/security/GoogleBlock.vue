<template>
  <!-- "o sigue con" + botón de Google (en la app Android aún no está disponible) -->
  <div class="flex flex-col gap-3">
    <div class="flex items-center gap-3 text-xs text-ink-faint" aria-hidden="true">
      <span class="h-px flex-1 bg-line" />o sigue con<span class="h-px flex-1 bg-line" />
    </div>
    <TpButton v-if="googleAvailable" variant="secondary" block :disabled="busy" @click="emit('google')">
      <!-- "G" de Google en un círculo blanco (la marca del botón de acceso) -->
      <span class="grid size-6 place-items-center rounded-full bg-white text-[13px] font-bold text-[#4285F4]" aria-hidden="true">G</span>
      {{ label || 'Continuar con Google' }}
    </TpButton>
    <p v-else class="m-0 rounded-tile border border-line bg-surface-100 px-4 py-3 text-center text-[13px] text-ink-faint">
      Google llega pronto a la app del celular. Por ahora entra con tu correo.
    </p>
  </div>
</template>

<script setup lang="ts">
import TpButton from '@/components/tp/TpButton.vue'
import { googleAvailable } from '@/services/auth.service'

defineProps<{ busy?: boolean; label?: string }>()
const emit = defineEmits<{ google: [] }>()
</script>
