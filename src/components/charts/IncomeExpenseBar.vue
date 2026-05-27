<template>
  <div class="chart-container">
    <h3 class="chart-title">Ingresos vs Gastos</h3>
    <p class="chart-subtitle">Últimos 6 meses</p>
    <div class="chart-wrap">
      <Bar :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend
} from 'chart.js'
import { useFinanceStore } from '@/stores/finance'
import { formatCurrency } from '@/utils/formatters'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const store = useFinanceStore()

const chartData = computed(() => ({
  labels: store.monthlyTrend.map(m => {
    const [y, mo] = m.month.split('-')
    const d = new Date(parseInt(y), parseInt(mo) - 1)
    return d.toLocaleDateString('es-CO', { month: 'short' })
  }),
  datasets: [
    {
      label: 'Ingresos',
      data: store.monthlyTrend.map(m => m.income),
      backgroundColor: 'rgba(0, 214, 143, 0.3)',
      borderColor: '#00d68f',
      borderWidth: 2,
      borderRadius: 6,
      borderSkipped: false
    },
    {
      label: 'Gastos',
      data: store.monthlyTrend.map(m => m.expenses),
      backgroundColor: 'rgba(255, 71, 87, 0.3)',
      borderColor: '#ff4757',
      borderWidth: 2,
      borderRadius: 6,
      borderSkipped: false
    }
  ]
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
      labels: {
        color: '#7d8ba8',
        font: { size: 11, family: 'DM Sans' },
        usePointStyle: true,
        pointStyleWidth: 8
      }
    },
    tooltip: {
      backgroundColor: '#1a2035',
      borderColor: '#232b3e',
      borderWidth: 1,
      titleColor: '#e8ecf5',
      bodyColor: '#7d8ba8',
      callbacks: {
        label: (ctx: any) => ` ${ctx.dataset.label}: ${formatCurrency(ctx.raw)}`
      }
    }
  },
  scales: {
    x: {
      grid: { color: '#232b3e', drawBorder: false },
      ticks: { color: '#7d8ba8', font: { size: 11 } }
    },
    y: {
      grid: { color: '#232b3e', drawBorder: false },
      ticks: {
        color: '#7d8ba8',
        font: { size: 11 },
        callback: (v: any) => `$${(v / 1000000).toFixed(1)}M`
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
  margin-bottom: 2px;
}

.chart-subtitle {
  font-size: 11px;
  color: var(--text-muted);
  margin-bottom: 16px;
}

.chart-wrap {
  height: 220px;
}
</style>
