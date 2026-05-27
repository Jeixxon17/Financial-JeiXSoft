<template>
  <div class="chart-container">
    <h3 class="chart-title">{{ title }}</h3>
    <div class="chart-wrap">
      <Doughnut v-if="hasData" :data="chartData" :options="chartOptions" />
      <div v-else class="empty-chart">
        <span>📊</span>
        <p>Sin datos para mostrar</p>
      </div>
    </div>
    <div class="legend" v-if="hasData">
      <div v-for="(item, i) in legendItems" :key="i" class="legend-item">
        <span class="legend-dot" :style="{ background: item.color }" />
        <span class="legend-label">{{ item.label }}</span>
        <span class="legend-value">{{ formatCurrency(item.value) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend
} from 'chart.js'
import { useFinanceStore } from '@/stores/finance'
import { formatCurrency } from '@/utils/formatters'

ChartJS.register(ArcElement, Tooltip, Legend)

const props = defineProps<{ title: string }>()
const store = useFinanceStore()

const legendItems = computed(() => {
  return Object.entries(store.expensesByCategory)
    .map(([catId, value]) => {
      const cat = store.getCategoryById(catId)
      return { label: cat ? `${cat.icon} ${cat.name}` : catId, value, color: cat?.color || '#6b7280' }
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)
})

const hasData = computed(() => legendItems.value.length > 0)

const chartData = computed(() => ({
  labels: legendItems.value.map(i => i.label),
  datasets: [{
    data: legendItems.value.map(i => i.value),
    backgroundColor: legendItems.value.map(i => i.color + 'cc'),
    borderColor: legendItems.value.map(i => i.color),
    borderWidth: 1,
    hoverOffset: 8
  }]
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: true,
  cutout: '68%',
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#1a2035',
      borderColor: '#232b3e',
      borderWidth: 1,
      titleColor: '#e8ecf5',
      bodyColor: '#7d8ba8',
      callbacks: {
        label: (ctx: any) => ` ${formatCurrency(ctx.raw)}`
      }
    }
  }
}
</script>

<style scoped>
.chart-container {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 20px;
}

.chart-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 16px;
}

.chart-wrap {
  max-width: 200px;
  margin: 0 auto 16px;
}

.empty-chart {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px;
  color: var(--text-muted);
  font-size: 13px;
}

.empty-chart span { font-size: 32px; opacity: 0.4; }

.legend {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-label {
  flex: 1;
  color: var(--text-secondary);
}

.legend-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--text-primary);
}
</style>
