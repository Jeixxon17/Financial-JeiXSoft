<template>
  <!-- Botón del design system: con `to` es un enlace, si no un <button> -->
  <RouterLink v-if="to" :to="to" :class="classes"><slot /></RouterLink>
  <button v-else :type="type" :class="classes" :disabled="disabled"><slot /></button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

const props = withDefaults(defineProps<{
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  // sm: botones dentro de tarjetas y listas
  size?: 'md' | 'sm'
  to?: RouteLocationRaw
  block?: boolean
  disabled?: boolean
  type?: 'button' | 'submit'
}>(), {
  variant: 'primary',
  size: 'md',
  block: false,
  disabled: false,
  type: 'button'
})

// Cada variante pone su propio color de borde (dos border-* juntos chocan)
const variants = {
  primary: 'border-transparent bg-primary text-white hover:bg-primary-hover',
  secondary: 'border-line bg-surface-100 text-ink hover:bg-surface-200',
  ghost: 'border-transparent bg-transparent text-ink hover:bg-surface-100',
  // Solo para confirmar algo que no se puede deshacer (el rojo es para alertas)
  danger: 'border-danger/40 bg-danger/15 text-danger hover:bg-danger/25'
}

// Para ocultar un botón en un tamaño de pantalla, envolverlo (hidden + inline-flex chocan)
const classes = computed(() => [
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border',
  props.size === 'sm' ? 'min-h-10 px-4 text-[13px]/[18px]' : 'min-h-12 px-6 text-[15px]/5',
  'font-sans font-medium no-underline transition-[background-color,transform] duration-150',
  'active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-light',
  'disabled:cursor-default disabled:opacity-50 disabled:active:scale-100 [&_svg]:size-5',
  variants[props.variant],
  props.block && 'w-full'
])
</script>
