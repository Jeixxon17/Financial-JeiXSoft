<template>
  <TpSheet title="Cambiar PIN" @close="$emit('close')">
    <template v-if="step !== 'done'">
      <div class="flex gap-1.5" aria-hidden="true">
        <span v-for="(s, i) in ['current', 'new', 'confirm']" :key="s" class="h-1 flex-1 rounded-full" :class="stepIndex >= i ? 'bg-accent-light' : 'bg-surface-300'" />
      </div>
      <p class="m-0 text-center text-base text-ink-muted">{{ stepText }}</p>
      <div class="flex min-h-[420px] flex-col lg:min-h-0">
        <PinPad ref="pad" :key="step" :length="PIN_LENGTH" :disabled="busy" :error="error" @complete="onComplete" />
      </div>
    </template>

    <div v-else class="flex flex-col items-center gap-3 py-4 text-center">
      <span class="grid grid-cols-[minmax(0,1fr)] size-20 animate-pop place-items-center rounded-full bg-linear-135 from-accent-light to-primary motion-reduce:animate-none">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M5 12.5l4.5 4.5L19 7.5" class="animate-draw [stroke-dasharray:60] [stroke-dashoffset:60] motion-reduce:animate-none motion-reduce:[stroke-dashoffset:0]" />
        </svg>
      </span>
      <h3 class="m-0 font-sans text-xl font-semibold">Tu PIN cambió</h3>
      <p class="m-0 text-sm text-ink-muted">La próxima vez que entres usa el PIN nuevo.</p>
    </div>

    <template v-if="step === 'done'" #footer>
      <TpButton block class="lg:w-auto lg:min-w-40" @click="$emit('close')">Listo</TpButton>
    </template>
  </TpSheet>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import PinPad from './PinPad.vue'
import TpSheet from '@/components/tp/TpSheet.vue'
import TpButton from '@/components/tp/TpButton.vue'
import { PIN_LENGTH, changePin, pinErrorMessage } from '@/services/auth.service'

defineEmits(['close'])

type Step = 'current' | 'new' | 'confirm' | 'done'

const pad = ref<InstanceType<typeof PinPad> | null>(null)
const step = ref<Step>('current')
const error = ref('')
const busy = ref(false)
const currentPin = ref('')
const newPin = ref('')

const stepIndex = computed(() => ['current', 'new', 'confirm', 'done'].indexOf(step.value))

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
