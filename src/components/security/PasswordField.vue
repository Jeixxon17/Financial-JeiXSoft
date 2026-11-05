<template>
  <!-- Contraseña con botón para mostrarla -->
  <label class="flex flex-col gap-1.5">
    <span :class="fieldLabel">{{ label }}</span>
    <span class="relative flex">
      <input
        :value="modelValue"
        :type="visible ? 'text' : 'password'"
        :autocomplete="autocomplete"
        required
        :class="[fieldInput, 'pr-12']"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
      <button
        type="button"
        class="absolute inset-y-0 right-1 grid w-11 cursor-pointer place-items-center rounded-full text-ink-faint hover:text-ink [&_svg]:size-[18px]"
        :aria-label="visible ? 'Ocultar contraseña' : 'Mostrar contraseña'"
        @click="visible = !visible"
      >
        <EyeOff v-if="visible" :stroke-width="1.75" aria-hidden="true" />
        <Eye v-else :stroke-width="1.75" aria-hidden="true" />
      </button>
    </span>
  </label>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Eye, EyeOff } from 'lucide-vue-next'
import { fieldInput, fieldLabel } from '@/components/tp/format'

defineProps<{ modelValue: string; label: string; autocomplete?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const visible = ref(false)
</script>
