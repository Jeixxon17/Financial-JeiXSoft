<template>
  <!-- Documento legal dentro de la app (sin salir de la pantalla en la que estás) -->
  <TpSheet :title="doc.title" wide @close="emit('close')">
    <LegalDoc :doc="doc" hide-title />
    <template #footer>
      <TpButton block class="lg:w-auto lg:min-w-40" @click="emit('close')">Entendido</TpButton>
    </template>
  </TpSheet>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import TpSheet from '@/components/tp/TpSheet.vue'
import TpButton from '@/components/tp/TpButton.vue'
import LegalDoc from './LegalDoc.vue'
import { legalDocument, type LegalDocKey } from '@/legal/documents'

const props = defineProps<{ docKey: LegalDocKey }>()
const emit = defineEmits<{ close: [] }>()
const doc = computed(() => legalDocument(props.docKey))
</script>
