<template>
  <AppLayout>
    <div class="dashboard">
      <!-- Alert banners -->
      <div class="alerts" v-if="alerts.length">
        <div
          v-for="alert in alerts"
          :key="alert.id"
          class="alert-banner"
          :class="`alert-${alert.type}`"
        >
          <span>{{ alert.icon }}</span>
          <p>{{ alert.message }}</p>
          <button @click="dismissAlert(alert.id)">✕</button>
        </div>
      </div>

      <!-- KPI Cards -->
      <div class="kpi-grid">
        <StatCard
          label="Balance Total"
          :value="store.totalBalance"
          icon="💰"
          color="green"
          :delay="0"
          :trend="4.2"
        />
        <StatCard
          label="Ingresos del mes"
          :value="store.monthIncome"
          icon="📈"
          color="blue"
          :delay="50"
          :trend="2.1"
        />
        <StatCard
          label="Gastos del mes"
          :value="store.monthExpenses"
          icon="📉"
          color="red"
          :delay="100"
          :trend="-8.5"
        />
        <StatCard
          label="Dinero restante"
          :value="store.remaining"
          icon="💵"
          :color="store.remaining >= 0 ? 'green' : 'red'"
          :delay="150"
          :badge="store.savingsRate.toFixed(0) + '% ahorro'"
          :badge-type="
            store.savingsRate >= 20
              ? 'success'
              : store.savingsRate >= 10
                ? 'warning'
                : 'danger'
          "
        />
        <StatCard
          label="Deuda total"
          :value="store.totalDebt"
          icon="💳"
          color="purple"
          :delay="200"
          :negative="true"
        />
        <StatCard
          label="Cupo disponible"
          :value="store.availableCredit"
          icon="🏦"
          color="amber"
          :delay="250"
        />
      </div>

      <!-- Charts row -->
      <div class="charts-grid">
        <IncomeExpenseBar />
        <ExpenseDonut title="Gastos por categoría" />
      </div>

      <!-- Recent transactions + budgets -->
      <div class="bottom-grid">
        <!-- Recent transactions -->
        <div class="transactions-card">
          <div class="card-header">
            <h3>Movimientos recientes</h3>
            <router-link to="/transactions" class="view-all"
              >Ver todos →</router-link
            >
          </div>
          <div class="tx-list">
            <div v-for="tx in recentTransactions" :key="tx.id" class="tx-row">
              <div
                class="tx-icon"
                :style="{
                  background: getCategoryColor(tx.category) + '22',
                  color: getCategoryColor(tx.category),
                }"
              >
                {{ getCategoryIcon(tx.category) }}
              </div>
              <div class="tx-info">
                <p class="tx-desc">
                  {{ tx.description || getCategoryName(tx.category) }}
                </p>
                <p class="tx-meta">
                  {{ formatDate(tx.date) }} · {{ getAccountName(tx.accountId) }}
                </p>
              </div>
              <span
                class="tx-amount"
                :class="tx.type === 'income' ? 'income' : 'expense'"
              >
                {{ tx.type === "income" ? "+" : "-"
                }}{{ formatCurrency(tx.amount) }}
              </span>
            </div>
            <div class="tx-empty" v-if="!recentTransactions.length">
              <span>📭</span>
              <p>Sin movimientos este mes</p>
            </div>
          </div>
        </div>

        <BudgetProgress />
      </div>

      <!-- Accounts quick view -->
      <div class="accounts-strip">
        <div class="strip-header">
          <h3>Mis cuentas</h3>
          <router-link to="/accounts" class="view-all">Gestionar →</router-link>
        </div>
        <div class="accounts-scroll">
          <div
            v-for="acc in store.accounts"
            :key="acc.id"
            class="mini-account"
            :style="{ borderColor: acc.color + '44', '--acc-color': acc.color }"
          >
            <span class="mini-icon">{{ acc.icon }}</span>
            <p class="mini-name">{{ acc.name }}</p>
            <p
              class="mini-balance"
              :class="acc.type === 'credit' ? 'text-purple' : 'text-green'"
            >
              {{
                acc.type === "credit"
                  ? formatCurrency(
                      store.calculateAccountBalance(acc.id).availableCredit,
                    )
                  : formatCurrency(
                      store.calculateAccountBalance(acc.id).balance,
                    )
              }}
            </p>
            <p class="mini-type">
              {{ acc.type === "credit" ? "disponible" : typeLabel(acc.type) }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import AppLayout from "@/layouts/AppLayout.vue";
import StatCard from "@/components/cards/StatCard.vue";
import BudgetProgress from "@/components/cards/BudgetProgress.vue";
import ExpenseDonut from "@/components/charts/ExpenseDonut.vue";
import IncomeExpenseBar from "@/components/charts/IncomeExpenseBar.vue";
import { useFinanceStore } from "@/stores/finance";
import { formatCurrency, formatDate } from "@/utils/formatters";
import AccountCard from "@/components/cards/AccountCard.vue";

const store = useFinanceStore();

const recentTransactions = computed(() => store.monthTransactions.slice(0, 8));

function getCategoryColor(catId: string) {
  return store.getCategoryById(catId)?.color || "#6b7280";
}
function getCategoryIcon(catId: string) {
  return store.getCategoryById(catId)?.icon || "📦";
}
function getCategoryName(catId: string) {
  return store.getCategoryById(catId)?.name || "Otro";
}
function getAccountName(accId: string) {
  return store.getAccountById(accId)?.name || "";
}

const typeLabels: Record<string, string> = {
  debit: "Débito",
  credit: "Crédito",
  savings: "Ahorro",
  cash: "Efectivo",
};
function typeLabel(type: string) {
  return typeLabels[type] || type;
}

interface Alert {
  id: number;
  type: "warning" | "danger" | "info";
  icon: string;
  message: string;
}

const dismissedAlerts = ref<number[]>([]);
const allAlerts = computed<Alert[]>(() => {
  const list: Alert[] = [];
  if (store.savingsRate < 10) {
    list.push({
      id: 1,
      type: "warning",
      icon: "⚠️",
      message: `Tu tasa de ahorro es del ${store.savingsRate.toFixed(1)}%. Intenta reducir gastos para mejorarla.`,
    });
  }
  store.budgetProgress
    .filter((b) => b.exceeded)
    .forEach((b, i) => {
      list.push({
        id: 100 + i,
        type: "danger",
        icon: "🚨",
        message: `Presupuesto de ${b.category?.name} excedido en ${formatCurrency(b.spent - b.amount)}.`,
      });
    });
  store.accounts
    .filter(
      (a) =>
        a.type === "credit" && (a.usedCredit || 0) / (a.creditLimit || 1) > 0.8,
    )
    .forEach((a, i) => {
      list.push({
        id: 200 + i,
        type: "warning",
        icon: "💳",
        message: `${a.name} está al ${(((a.usedCredit || 0) / (a.creditLimit || 1)) * 100).toFixed(0)}% de su cupo.`,
      });
    });
  return list.filter((a) => !dismissedAlerts.value.includes(a.id));
});

onMounted(async () => {
  await Promise.all([store.loadAccounts(), store.loadTransactions()]);
});

const alerts = allAlerts;
function dismissAlert(id: number) {
  dismissedAlerts.value.push(id);
}
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Alerts */
.alerts {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.alert-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 13px;
  animation: fadeIn 0.3s ease;
}

.alert-banner p {
  flex: 1;
}

.alert-warning {
  background: var(--accent-amber-dim);
  border: 1px solid rgba(245, 158, 11, 0.2);
  color: var(--accent-amber);
}

.alert-danger {
  background: var(--accent-red-dim);
  border: 1px solid rgba(255, 71, 87, 0.2);
  color: var(--accent-red);
}

.alert-info {
  background: var(--accent-blue-dim);
  border: 1px solid rgba(74, 158, 255, 0.2);
  color: var(--accent-blue);
}

.alert-banner button {
  background: none;
  border: none;
  cursor: pointer;
  opacity: 0.7;
  font-size: 12px;
  color: inherit;
  padding: 2px 4px;
}

/* KPI Grid */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

@media (min-width: 640px) {
  .kpi-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1280px) {
  .kpi-grid {
    grid-template-columns: repeat(6, 1fr);
  }
}

/* Charts grid */
.charts-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

@media (min-width: 768px) {
  .charts-grid {
    display: grid;
    grid-template-columns: 2fr 1fr;
  }
}

/* Bottom grid */
.bottom-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

@media (min-width: 768px) {
  .bottom-grid {
    display: grid;
    grid-template-columns: 1fr 2fr;
  }
}

/* Transactions card */
.transactions-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 20px;

}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.card-header h3 {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
}

.view-all {
  font-size: 12px;
  color: var(--accent-blue);
  text-decoration: none;
  transition: opacity 0.2s;
}

.view-all:hover {
  opacity: 0.7;
}

.tx-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tx-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 8px;
  border-radius: 10px;
  transition: background 0.2s;
}

.tx-row:hover {
  background: var(--bg-elevated);
}

.tx-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.tx-info {
  flex: 1;
  min-width: 0;
}

.tx-desc {
  font-size: 13px;
  color: var(--text-primary);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tx-meta {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 1px;
}

.tx-amount {
  font-family: "JetBrains Mono", monospace;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

.tx-amount.income {
  color: var(--accent-green);
}
.tx-amount.expense {
  color: var(--accent-red);
}

.tx-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px 0;
  color: var(--text-muted);
  font-size: 13px;
}

.tx-empty span {
  font-size: 32px;
  opacity: 0.4;
}

/* Accounts strip */
.accounts-strip {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 20px;
}

.strip-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.strip-header h3 {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
}

.accounts-scroll {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.mini-account {
  flex-shrink: 0;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 14px 16px;
  min-width: 140px;
  transition: all 0.2s;
  cursor: default;
  border-left: 3px solid var(--acc-color);
}

.mini-account:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
}

.mini-icon {
  font-size: 20px;
  display: block;
  margin-bottom: 8px;
}

.mini-name {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
  font-weight: 500;
}

.mini-balance {
  font-family: "JetBrains Mono", monospace;
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 2px;
}

.mini-type {
  font-size: 10px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.text-green {
  color: var(--accent-green);
}
.text-purple {
  color: var(--accent-purple);
}
</style>
