<template>
  <!-- Se muestra en lugar de una sección del plan Completo cuando el usuario tiene el plan Gratis -->
  <TpLayout>
    <div class="flex flex-col gap-5">
      <PlanLocked :feature="feature" :title="title" />
    </div>
  </TpLayout>
</template>

<script setup lang="ts">
import TpLayout from '@/layouts/TpLayout.vue'
import PlanLocked from '@/components/tp/PlanLocked.vue'
import type { ProFeature } from '@/services/plan.service'

defineProps<{ feature: ProFeature; title: string }>()
</script>
