<template>
  <!-- Botón para descargar la app de Google Play. Sin enlace (VITE_PLAY_STORE_URL vacío) dice "Muy pronto".
       No se dibuja el logo de Google Play (marca registrada): ícono propio y el nombre en texto. -->
  <component
    :is="PLAY_STORE_URL ? 'a' : 'span'"
    :href="PLAY_STORE_URL || undefined"
    :target="PLAY_STORE_URL ? '_blank' : undefined"
    :rel="PLAY_STORE_URL ? 'noopener' : undefined"
    class="inline-flex items-center gap-3 rounded-tile border px-4 py-2.5 text-left no-underline transition-colors [&_svg]:size-6"
    :class="PLAY_STORE_URL ? 'cursor-pointer border-line-strong bg-black text-ink hover:bg-surface-100' : 'border-line bg-surface-100/60 text-ink-muted'"
  >
    <Smartphone :stroke-width="1.75" aria-hidden="true" />
    <span class="flex flex-col">
      <span class="text-[11px]/[14px]" :class="PLAY_STORE_URL ? 'text-ink-muted' : 'text-ink-faint'">{{ PLAY_STORE_URL ? 'Descárgala en' : 'Muy pronto en' }}</span>
      <span class="text-[17px]/[22px] font-semibold">Google Play</span>
    </span>
  </component>
</template>

<script setup lang="ts">
import { Smartphone } from 'lucide-vue-next'

const PLAY_STORE_URL = (import.meta.env.VITE_PLAY_STORE_URL as string | undefined) || ''
</script>
