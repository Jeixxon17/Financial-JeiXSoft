<template>
  <!-- Un documento legal (términos, privacidad, eliminar cuenta) -->
  <article class="flex flex-col gap-6 text-[15px]/[25px] text-ink-muted">
    <header class="flex flex-col gap-2">
      <h1 v-if="!hideTitle" class="m-0 font-sans text-[28px]/[34px] font-bold tracking-[-0.5px] text-ink sm:text-[34px]/[40px]">{{ doc.title }}</h1>
      <span class="text-[13px] text-ink-faint">Última actualización: {{ doc.updated }}</span>
      <p class="m-0">{{ doc.intro }}</p>
    </header>
    <section v-for="s in doc.sections" :key="s.title" class="flex flex-col gap-2.5">
      <h2 class="m-0 font-sans text-[17px]/6 font-semibold text-ink">{{ s.title }}</h2>
      <p v-if="s.lead" class="m-0">{{ s.lead }}</p>
      <ul v-if="s.bullets" class="m-0 flex list-disc flex-col gap-2 pl-5 marker:text-accent-light">
        <li v-for="b in s.bullets" :key="b">{{ b }}</li>
      </ul>
      <p v-for="p in s.paragraphs" :key="p" class="m-0">{{ p }}</p>
    </section>
  </article>
</template>

<script setup lang="ts">
import type { LegalDocument } from '@/legal/documents'

defineProps<{ doc: LegalDocument; hideTitle?: boolean }>()
</script>
