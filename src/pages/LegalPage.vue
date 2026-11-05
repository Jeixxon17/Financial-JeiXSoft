<template>
  <!-- Página pública de un documento legal (#/terminos, #/privacidad, #/eliminar-cuenta).
       Se ve sin iniciar sesión: Google Play pide los enlaces a la política y a eliminar la cuenta. -->
  <div class="min-h-dvh bg-desk font-sans text-ink antialiased">
    <nav class="mx-auto flex max-w-[860px] items-center justify-between gap-4 px-4 pt-[calc(20px+env(safe-area-inset-top))] sm:px-8">
      <button type="button" class="flex cursor-pointer items-center gap-2.5 text-xl font-extrabold tracking-[-0.4px] text-ink" @click="home">
        <img :src="appIcon" alt="" width="36" height="36" class="size-9 rounded-chip" />
        <span>TuPlata<span class="text-accent-light">AlDia</span></span>
      </button>
      <TpButton variant="ghost" size="sm" @click="home"><ArrowLeft :stroke-width="1.75" aria-hidden="true" />Volver</TpButton>
    </nav>
    <main class="mx-auto max-w-[860px] px-4 pt-10 pb-16 sm:px-8">
      <div class="rounded-sheet border border-line bg-surface-100/70 p-6 sm:p-10">
        <LegalDoc :doc="doc" />
      </div>
      <div class="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[13px]">
        <RouterLink v-for="l in legalLinks" :key="l.to" :to="l.to" class="text-ink-muted no-underline hover:text-accent-light">{{ l.label }}</RouterLink>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'
import TpButton from '@/components/tp/TpButton.vue'
import LegalDoc from '@/components/legal/LegalDoc.vue'
import { legalDocument, type LegalDocKey } from '@/legal/documents'
import { legalLinks } from '@/legal/links'
import appIcon from '@/assets/brand/tuplata-app-icon.svg'

const route = useRoute()
const router = useRouter()
const doc = computed(() => legalDocument(route.meta.legal as LegalDocKey))

// Vuelve a la pantalla anterior; si se abrió directo (enlace de Google Play), a la landing
function home() {
  if (window.history.state?.back) router.back()
  else router.replace('/')
}
</script>
