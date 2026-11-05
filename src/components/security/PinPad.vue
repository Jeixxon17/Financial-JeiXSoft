<template>
  <!-- También se usa en el modal de cambiar PIN de la v1 -->
  <div class="flex w-full flex-1 flex-col items-center font-sans lg:flex-none">
    <div
      class="flex gap-3.5 lg:gap-2.5"
      :class="{ 'animate-shake': shaking }"
      role="status"
      :aria-label="`${pin.length} de ${length} dígitos`"
    >
      <span v-for="i in length" :key="i" :class="slotClass(i)" />
    </div>

    <p
      class="mt-3.5 min-h-5 text-center text-[13px]/5 font-medium text-danger"
      :class="{ invisible: !error }"
      aria-live="assertive"
    >
      {{ error || '·' }}
    </p>

    <!-- Celular: teclado en pantalla. En escritorio se escribe con el teclado físico -->
    <div class="mt-auto grid w-full max-w-[300px] grid-cols-3 gap-x-7 gap-y-2.5 pt-6 lg:hidden">
      <button v-for="key in digits" :key="key" type="button" :class="keyClass" :disabled="disabled" @click="press(key)">
        {{ key }}
      </button>

      <!-- Abajo a la izquierda: huella cuando esté disponible -->
      <slot name="extra-key">
        <span aria-hidden="true" />
      </slot>

      <button type="button" :class="keyClass" :disabled="disabled" @click="press('0')">0</button>
      <button type="button" :class="keyClass" :disabled="disabled || !pin.length" aria-label="Borrar" @click="erase">
        <Delete :size="26" :stroke-width="1.75" aria-hidden="true" />
      </button>
    </div>

    <p class="mt-1 hidden text-[13px]/[18px] text-ink-faint lg:block">Escríbelo con el teclado</p>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Delete } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  length?: number
  disabled?: boolean
  error?: string
}>(), {
  length: 6,
  disabled: false,
  error: ''
})

const emit = defineEmits<{ complete: [pin: string] }>()

const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9']
const pin = ref('')
const shaking = ref(false)

const keyClass =
  'grid h-[62px] cursor-pointer place-items-center rounded-full bg-transparent text-[26px] leading-none font-semibold text-ink tabular-nums transition-colors ' +
  'enabled:hover:bg-surface-200 enabled:active:bg-surface-300 disabled:cursor-default disabled:opacity-40 ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-light'

// Celular: puntos. Escritorio: casillas con un punto adentro y la actual resaltada
function slotClass(i: number) {
  const on = i <= pin.value.length
  const current = i === pin.value.length + 1 && !props.disabled
  return [
    'box-border size-3.5 rounded-full border-2 transition-[background-color,border-color,transform] duration-150',
    'lg:grid lg:h-[60px] lg:w-[52px] lg:scale-100 lg:place-items-center lg:rounded-tile lg:border-[1.5px] lg:bg-surface-200',
    on
      ? 'scale-110 border-accent-light bg-accent-light lg:border-accent-light lg:after:size-3 lg:after:rounded-full lg:after:bg-ink lg:after:content-[""]'
      : 'border-line-strong lg:border-line',
    current && 'lg:border-primary lg:shadow-[0_0_0_3px_var(--color-primary-soft)]'
  ]
}

function press(key: string) {
  if (props.disabled || !/^\d$/.test(key) || pin.value.length >= props.length) return
  pin.value += key
  if (pin.value.length === props.length) emit('complete', pin.value)
}

function erase() {
  if (props.disabled) return
  pin.value = pin.value.slice(0, -1)
}

function reset() {
  pin.value = ''
}

// Un error nuevo limpia lo escrito y sacude los espacios
watch(() => props.error, error => {
  if (!error) return
  reset()
  shaking.value = true
  setTimeout(() => (shaking.value = false), 400)
})

// En escritorio se escribe con el teclado físico
function onKeydown(event: KeyboardEvent) {
  if (event.ctrlKey || event.metaKey || event.altKey) return
  if (/^\d$/.test(event.key)) press(event.key)
  else if (event.key === 'Backspace') erase()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

defineExpose({ reset })
</script>
