<template>
  <!-- Estado del lector de notificaciones del celular (solo app Android) -->
  <div class="flex flex-col gap-1 rounded-card border border-line bg-surface-100 p-5">
    <div class="mb-1 flex items-center justify-between gap-2">
      <span class="text-sm font-medium text-ink-muted">Lector del celular</span>
      <span
        class="inline-flex items-center rounded-chip border border-line bg-primary-soft px-3 py-[5px] text-xs font-semibold"
        :class="allReady ? 'text-success' : 'text-warning'"
      >
        {{ allReady ? 'Activo' : 'Falta configurar' }}
      </span>
    </div>

    <div v-for="step in steps" :key="step.label" class="flex min-h-11 items-center gap-2.5 text-sm">
      <span
        class="grid grid-cols-[minmax(0,1fr)] size-[22px] shrink-0 place-items-center rounded-full [&_svg]:size-3"
        :class="step.ok ? 'bg-success text-bg-base' : 'border-2 border-line-strong'"
      >
        <Check v-if="step.ok" :stroke-width="3.5" aria-hidden="true" />
      </span>
      <span class="flex-1" :class="step.ok ? 'text-ink' : 'text-ink-muted'">{{ step.label }}</span>
      <TpButton v-if="!step.ok && step.action" size="sm" @click="step.action">{{ step.button }}</TpButton>
    </div>

    <p v-if="!status.permission" class="mt-1 mb-0 text-[13px]/[19px] text-ink-muted">
      En "Acceso a notificaciones" busca la app, actívala y vuelve.
    </p>
    <p class="mt-1 mb-0 text-xs/[17px] text-ink-faint">
      <template v-if="allReady">Se guardan y se suben solas, aunque la app esté cerrada.</template>
      <template v-if="status.queued"> {{ status.queued }} esperando internet.</template>
      <template v-if="!allReady && !status.queued">Lo que llegue al celular aparece aquí, para confirmarlo desde cualquier lado.</template>
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Check } from 'lucide-vue-next'
import TpButton from './TpButton.vue'
import { getNotificationStatus, openNotificationSettings, requestBatteryExemption } from '@/services/notificationListener'

type Status = NonNullable<Awaited<ReturnType<typeof getNotificationStatus>>>

const props = defineProps<{ status: Status; allReady: boolean }>()

const steps = computed(() => [
  { label: 'Acceso a notificaciones', ok: !!props.status.permission, button: 'Activar', action: openNotificationSettings },
  { label: 'Sin límite de batería', ok: !!props.status.battery, button: 'Permitir', action: requestBatteryExemption },
  { label: 'Subida automática', ok: !!props.status.session, button: '', action: null }
])
</script>
