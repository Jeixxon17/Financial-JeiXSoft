<template>
  <Transition name="toast">
    <div v-if="advisorToast.visible" class="advisor-toast" role="status">
      <div class="toast-head">
        <span>🤖 Tu asesor</span>
        <button aria-label="Cerrar" @click="hideAdvice">✕</button>
      </div>
      <div v-for="(tip, i) in advisorToast.tips" :key="i" class="tip" :class="tip.level">
        <span class="tip-icon">{{ tip.icon }}</span>
        <div>
          <strong>{{ tip.title }}</strong>
          <p>{{ tip.text }}</p>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { advisorToast, hideAdvice } from '@/services/advisorToast'
</script>

<style scoped>
.advisor-toast {
  position: fixed;
  z-index: 200;
  right: 16px;
  bottom: 16px;
  width: min(380px, calc(100vw - 32px));
  max-height: 60dvh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 16px;
  border: 1px solid var(--border-light);
  background: var(--bg-surface);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
}

.toast-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.toast-head button { background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 14px; }

.tip {
  display: flex;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  border-left: 4px solid var(--accent-blue);
  background: var(--bg-card);
}

.tip.danger { border-left-color: var(--accent-red); background: rgba(255, 71, 87, 0.08); }
.tip.warn { border-left-color: var(--accent-amber); }
.tip.good { border-left-color: var(--accent-green); }
.tip-icon { font-size: 20px; line-height: 1.2; }
.tip strong { font-size: 13px; color: var(--text-primary); }
.tip p { font-size: 12px; color: var(--text-secondary); margin-top: 2px; line-height: 1.4; }

.toast-enter-active,
.toast-leave-active { transition: all 0.25s ease; }

.toast-enter-from,
.toast-leave-to { opacity: 0; transform: translateY(16px); }

@media (max-width: 768px) {
  /* Encima de la barra inferior del celular */
  .advisor-toast { left: 16px; right: 16px; bottom: 84px; width: auto; }
}
</style>
