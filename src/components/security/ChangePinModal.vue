<template>
  <Teleport to="body">
    <div class="modal-overlay" @click.self="$emit('close')">
      <div class="modal">
        <div class="modal-header">
          <h2>Cambiar PIN</h2>
          <button class="modal-close" @click="$emit('close')">✕</button>
        </div>

        <div class="modal-body">
          <template v-if="step !== 'done'">
            <p class="step-text">{{ stepText }}</p>
            <PinPad
              ref="pad"
              :key="step"
              :length="PIN_LENGTH"
              :disabled="busy"
              :error="error"
              @complete="onComplete"
            />
          </template>

          <div v-else class="done">
            <span>✅</span>
            <p>Tu PIN se cambió correctamente</p>
            <button class="btn-done" @click="$emit('close')">Listo</button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import PinPad from './PinPad.vue'
import { PIN_LENGTH, changePin, pinErrorMessage } from '@/services/auth.service'

defineEmits(['close'])

type Step = 'current' | 'new' | 'confirm' | 'done'

const pad = ref<InstanceType<typeof PinPad> | null>(null)
const step = ref<Step>('current')
const error = ref('')
const busy = ref(false)
const currentPin = ref('')
const newPin = ref('')

const stepText = computed(() => ({
  current: 'Escribe tu PIN actual',
  new: 'Escribe el PIN nuevo',
  confirm: 'Confirma el PIN nuevo'
}[step.value as 'current' | 'new' | 'confirm']))

async function onComplete(pin: string) {
  error.value = ''

  if (step.value === 'current') {
    currentPin.value = pin
    step.value = 'new'
    return
  }

  if (step.value === 'new') {
    newPin.value = pin
    step.value = 'confirm'
    return
  }

  if (pin !== newPin.value) {
    step.value = 'new'
    error.value = 'Los PIN no coinciden. Escribe el nuevo otra vez'
    return
  }

  busy.value = true
  try {
    await changePin(currentPin.value, newPin.value)
    step.value = 'done'
  } catch (e) {
    // Si el actual estaba mal, se vuelve a empezar
    step.value = 'current'
    pad.value?.reset()
    error.value = pinErrorMessage(e) === 'PIN incorrecto' ? 'El PIN actual es incorrecto' : pinErrorMessage(e)
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.modal {
  width: 100%;
  max-width: 380px;
  max-height: calc(100dvh - 32px);
  overflow-y: auto;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 20px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 20px;
  border-bottom: 1px solid var(--border);
}

.modal-header h2 {
  font-size: 18px;
  color: var(--text-primary);
}

.modal-close {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 16px;
  cursor: pointer;
}

.modal-body {
  padding: 20px;
}

.step-text {
  text-align: center;
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 18px;
}

.done {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
  color: var(--text-primary);
}

.done span { font-size: 40px; }

.btn-done {
  background: linear-gradient(135deg, var(--accent-green), #00b377);
  border: none;
  border-radius: 10px;
  padding: 10px 28px;
  color: #000;
  font-weight: 600;
  cursor: pointer;
}
</style>
