<template>
  <div class="budget-card">
    <div class="budget-header">
      <h3>Presupuestos</h3>
      <span class="month-tag">{{ formatMonth(store.selectedMonth) }}</span>
    </div>

    <div class="budget-list" v-if="store.budgetProgress.length">
      <div
        v-for="item in store.budgetProgress"
        :key="item.id"
        class="budget-item"
        :class="{ exceeded: item.exceeded }"
      >
        <div class="budget-item-header">
          <span class="budget-cat">
            {{ item.category?.icon }} {{ item.category?.name }}
          </span>
          <span class="budget-amounts">
            <span :class="item.exceeded ? 'text-red' : 'text-secondary'">
              {{ formatCurrency(item.spent) }}
            </span>
            <span class="text-muted"> / {{ formatCurrency(item.amount) }}</span>
          </span>
        </div>
        <div class="budget-bar">
          <div
            class="budget-fill"
            :style="{
              width: `${Math.min(item.percentage, 100)}%`,
              background: item.category?.color || '#6b7280'
            }"
            :class="{ exceeded: item.exceeded }"
          />
        </div>
        <div class="budget-footer">
          <span class="budget-pct" :style="{ color: item.exceeded ? 'var(--accent-red)' : 'var(--text-muted)' }">
            {{ item.percentage.toFixed(0) }}%
          </span>
          <span class="budget-remaining" v-if="!item.exceeded">
            {{ formatCurrency(item.amount - item.spent) }} restante
          </span>
          <span class="budget-over text-red" v-else>
            Excedido en {{ formatCurrency(item.spent - item.amount) }}
          </span>
        </div>
      </div>
    </div>

    <div class="budget-empty" v-else>
      <span>🎯</span>
      <p>No hay presupuestos configurados</p>
      <router-link to="/budgets" class="setup-link">Configurar presupuestos</router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useFinanceStore } from '@/stores/finance'
import { formatCurrency, formatMonth } from '@/utils/formatters'

const store = useFinanceStore()
</script>

<style scoped>
.budget-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 20px;
}

.budget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.budget-header h3 {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
}

.month-tag {
  font-size: 11px;
  color: var(--text-muted);
  background: var(--bg-elevated);
  padding: 3px 10px;
  border-radius: 20px;
  text-transform: capitalize;
}

.budget-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.budget-item {
  padding: 12px;
  background: var(--bg-elevated);
  border-radius: 10px;
  border: 1px solid var(--border);
  transition: all 0.2s;
}

.budget-item.exceeded {
  border-color: rgba(255, 71, 87, 0.2);
  background: rgba(255, 71, 87, 0.04);
}

.budget-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.budget-cat {
  font-size: 13px;
  color: var(--text-primary);
  font-weight: 500;
}

.budget-amounts {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
}

.budget-bar {
  height: 5px;
  background: var(--bg-card);
  border-radius: 2.5px;
  overflow: hidden;
  margin-bottom: 6px;
}

.budget-fill {
  height: 100%;
  border-radius: 2.5px;
  transition: width 0.6s ease;
}

.budget-fill.exceeded {
  background: var(--accent-red) !important;
}

.budget-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
}

.budget-pct { font-weight: 600; }
.budget-remaining { color: var(--text-muted); }
.budget-over { font-weight: 500; }

.text-red { color: var(--accent-red) !important; }
.text-secondary { color: var(--text-secondary); }
.text-muted { color: var(--text-muted); }

.budget-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px 0;
  color: var(--text-muted);
}

.budget-empty span { font-size: 32px; opacity: 0.4; }
.budget-empty p { font-size: 13px; }

.setup-link {
  font-size: 12px;
  color: var(--accent-blue);
  text-decoration: none;
  border: 1px solid var(--accent-blue-dim);
  padding: 5px 14px;
  border-radius: 20px;
  transition: all 0.2s;
}

.setup-link:hover { background: var(--accent-blue-dim); }
</style>
