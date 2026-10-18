<template>
  <div class="pin-pad" :class="{ shake: shaking }">
    <div class="pin-dots" aria-live="polite" :aria-label="`${pin.length} de ${length} dígitos`">
      <span v-for="i in length" :key="i" class="pin-dot" :class="{ filled: i <= pin.length }" />
    </div>

    <p class="pin-error" :class="{ visible: !!error }">{{ error || '·' }}</p>

    <div class="pin-keys">
      <button
        v-for="key in keys"
        :key="key"
        type="button"
        class="pin-key"
        :class="{ ghost: key === '' }"
        :disabled="disabled || key === ''"
        :aria-label="key === '⌫' ? 'Borrar' : key"
        @click="press(key)"
      >
        {{ key }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

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

const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']
const pin = ref('')
const shaking = ref(false)

function press(key: string) {
  if (props.disabled) return

  if (key === '⌫') {
    pin.value = pin.value.slice(0, -1)
    return
  }

  if (!/^\d$/.test(key) || pin.value.length >= props.length) return

  pin.value += key
  if (pin.value.length === props.length) emit('complete', pin.value)
}

function reset() {
  pin.value = ''
}

// Un error nuevo limpia lo escrito y sacude los puntos
watch(() => props.error, error => {
  if (!error) return
  reset()
  shaking.value = true
  setTimeout(() => (shaking.value = false), 400)
})

// También se puede escribir con el teclado físico
function onKeydown(event: KeyboardEvent) {
  if (/^\d$/.test(event.key)) press(event.key)
  else if (event.key === 'Backspace') press('⌫')
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

defineExpose({ reset })
</script>

<style scoped>
.pin-pad {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.pin-dots {
  display: flex;
  gap: 14px;
  margin-bottom: 10px;
}

.pin-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid var(--border-light);
  transition: all 0.15s ease;
}

.pin-dot.filled {
  background: var(--accent-green);
  border-color: var(--accent-green);
  box-shadow: 0 0 10px rgba(0, 214, 143, 0.4);
}

.pin-error {
  min-height: 20px;
  font-size: 13px;
  color: var(--accent-red);
  text-align: center;
  visibility: hidden;
  margin-bottom: 16px;
}

.pin-error.visible { visibility: visible; }

.pin-keys {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  width: 100%;
  max-width: 280px;
}

.pin-key {
  aspect-ratio: 1;
  max-height: 72px;
  justify-self: center;
  width: 100%;
  max-width: 72px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--bg-card);
  color: var(--text-primary);
  font-family: 'JetBrains Mono', monospace;
  font-size: 24px;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.1s ease;
  -webkit-tap-highlight-color: transparent;
}

.pin-key:active:not(:disabled) {
  transform: scale(0.94);
  background: var(--bg-card-hover);
}

.pin-key:disabled { cursor: default; opacity: 0.5; }

.pin-key.ghost {
  visibility: hidden;
}

.shake { animation: shake 0.4s ease; }

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-8px); }
  75% { transform: translateX(8px); }
}
</style>
