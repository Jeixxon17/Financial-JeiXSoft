<template>
  <!--
    Distintivo propio de cada banco: sus iniciales sobre su color, con un brillo
    suave. No es el logo oficial del banco (marca registrada).
  -->
  <span
    class="relative grid shrink-0 place-items-center overflow-hidden rounded-[30%] font-sans leading-none font-extrabold tracking-[-0.02em] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)]"
    :style="{
      width: `${size}px`,
      height: `${size}px`,
      fontSize: `${fontSize}px`,
      background: `radial-gradient(120% 90% at 25% 15%, rgba(255,255,255,0.28), transparent 55%), ${look.color}`,
      color: look.ink
    }"
    :aria-label="label ? look.name : undefined"
    :aria-hidden="label ? undefined : 'true'"
    :role="label ? 'img' : undefined"
  >
    <Landmark v-if="!look.mark" :size="size * 0.5" :stroke-width="1.9" aria-hidden="true" />
    <template v-else>{{ look.mark }}</template>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Landmark } from 'lucide-vue-next'
import { otherBank, type Bank } from './banks'

const props = withDefaults(defineProps<{ bank?: Bank; size?: number; label?: boolean }>(), { size: 32, label: false })

const look = computed(() => props.bank || otherBank)
// Las iniciales largas (BBVA, BdB) van más pequeñas para que quepan
const fontSize = computed(() => {
  const n = look.value.mark.length
  const scale = n >= 4 ? 0.28 : n === 3 ? 0.33 : n === 2 ? 0.4 : 0.5
  return Math.round(props.size * scale)
})
</script>
