<template>
  <!-- Autorización previa a una función con datos privados (extractos, notificaciones, SMS).
       Se pide una vez por versión del texto y queda guardada en el perfil con la fecha. -->
  <TpSheet :title="info.title" @close="!busy && emit('cancel')">
    <div class="flex gap-3 rounded-tile border border-line bg-surface-200/40 p-4 text-sm/[21px] text-ink-muted [&_svg]:size-5 [&_svg]:shrink-0 [&_svg]:text-accent-light">
      <ShieldCheck :stroke-width="1.75" aria-hidden="true" />
      <span>{{ info.intro }}</span>
    </div>
    <ul class="m-0 flex list-none flex-col gap-3 p-0 text-sm/[21px] text-ink-muted">
      <li v-for="p in info.points" :key="p" class="flex gap-2.5 [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-success">
        <Check :stroke-width="2.25" aria-hidden="true" />{{ p }}
      </li>
    </ul>
    <label class="flex cursor-pointer items-start gap-3 text-sm/5 text-ink">
      <input v-model="agreed" type="checkbox" class="mt-0.5 size-4 shrink-0 accent-primary" />
      <span>
        Autorizo este tratamiento de mis datos, según la
        <button type="button" class="cursor-pointer p-0 font-semibold text-accent-light hover:underline" @click.prevent="showPolicy = true">Política de datos</button>.
      </span>
    </label>
    <p v-if="error" role="alert" class="m-0 text-sm text-danger">{{ error }}</p>
    <template #footer>
      <div class="hidden lg:block"><TpButton variant="ghost" :disabled="busy" @click="emit('cancel')">Ahora no</TpButton></div>
      <TpButton block class="lg:w-auto lg:min-w-40" :disabled="busy || !agreed" @click="accept">{{ busy ? 'Guardando…' : 'Autorizar y seguir' }}</TpButton>
    </template>
  </TpSheet>
  <LegalSheet v-if="showPolicy" doc-key="privacidad" @close="showPolicy = false" />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Check, ShieldCheck } from 'lucide-vue-next'
import TpSheet from '@/components/tp/TpSheet.vue'
import TpButton from '@/components/tp/TpButton.vue'
import LegalSheet from './LegalSheet.vue'
import { featureConsents } from '@/legal/legal'
import { saveConsents } from '@/services/consent.service'

const props = defineProps<{ kind: 'statements' | 'notifications' | 'sms' }>()
const emit = defineEmits<{ accept: []; cancel: [] }>()

const info = computed(() => featureConsents[props.kind])
const agreed = ref(false)
const showPolicy = ref(false)
const busy = ref(false)
const error = ref('')

async function accept() {
  busy.value = true
  error.value = ''
  try {
    await saveConsents([props.kind])
    emit('accept')
  } catch {
    error.value = 'No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.'
  } finally {
    busy.value = false
  }
}
</script>
