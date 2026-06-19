<template>
  <div class="stat-card" :class="`stat-card--${color}`" :style="{ animationDelay: `${delay}ms` }">
    <div class="card-top">
      <span class="card-icon">{{ icon }}</span>
      <span class="card-badge" v-if="badge" :class="`badge--${badgeType}`">{{ badge }}</span>
    </div>
    <div class="card-value">
      <span class="value-text mono" :class="negative ? 'text-red' : ''">
        {{ prefix }}{{ formattedValue }}
      </span>
    </div>
    <p class="card-label">{{ label }}</p>
    <div class="card-trend" v-if="trend !== undefined">
      <span :class="trend >= 0 ? 'trend-up' : 'trend-down'">
        {{ trend >= 0 ? '↑' : '↓' }} {{ Math.abs(trend).toFixed(1) }}%
      </span>
      <span class="trend-label">vs mes anterior</span>
    </div>
    <div class="card-glow" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatCurrency } from '@/utils/formatters'

const props = defineProps<{
  label: string
  value: number
  icon: string
  color?: 'green' | 'red' | 'blue' | 'purple' | 'amber' | 'default'
  delay?: number
  trend?: number
  badge?: string
  badgeType?: 'success' | 'warning' | 'danger'
  negative?: boolean
  prefix?: string
}>()

const formattedValue = computed(() => formatCurrency(props.value))
</script>

<style scoped>
.stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 20px;
  position: relative;
  overflow: hidden;
  cursor: default;
  transition: all 0.3s ease;
  animation: fadeInUp 0.5s ease both;
}

.stat-card:hover {
  border-color: var(--border-light);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.3);
}

.card-glow {
  position: absolute;
  top: -40px;
  right: -40px;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  opacity: 0.06;
  transition: opacity 0.3s;
  pointer-events: none;
}

.stat-card:hover .card-glow { opacity: 0.1; }

.stat-card--green .card-glow { background: var(--accent-green); }
.stat-card--red .card-glow { background: var(--accent-red); }
.stat-card--blue .card-glow { background: var(--accent-blue); }
.stat-card--purple .card-glow { background: var(--accent-purple); }
.stat-card--amber .card-glow { background: var(--accent-amber); }

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.card-icon {
  font-size: 22px;
  display: block;
  line-height: 1;
}

.card-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 20px;
  letter-spacing: 0.4px;
}

.badge--success {
  background: var(--accent-green-dim);
  color: var(--accent-green);
}

.badge--warning {
  background: var(--accent-amber-dim);
  color: var(--accent-amber);
}

.badge--danger {
  background: var(--accent-red-dim);
  color: var(--accent-red);
}

.card-value {
  margin-bottom: 4px;
}

.value-text {
  font-size: clamp(15px, 2vw, 20px);
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.5px;
  display: block;
}

.stat-card--green .value-text { color: var(--accent-green); }
.stat-card--red .value-text { color: var(--accent-red); }
.stat-card--blue .value-text { color: var(--accent-blue); }
.stat-card--purple .value-text { color: var(--accent-purple); }
.stat-card--amber .value-text { color: var(--accent-amber); }

.text-red { color: var(--accent-red) !important; }

.card-label {
  font-size: 12px;
  color: var(--text-muted);
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 0.6px;
}

.card-trend {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  font-size: 11px;
}

.trend-up { color: var(--accent-green); font-weight: 600; }
.trend-down { color: var(--accent-red); font-weight: 600; }
.trend-label { color: var(--text-muted); }
</style>
