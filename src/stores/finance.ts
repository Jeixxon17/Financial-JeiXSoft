import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Account, Transaction, Category, Paycheck, Budget } from '@/interfaces'
import { mockAccounts, mockCategories, mockTransactions, mockPaychecks, mockBudgets } from '@/utils/mockData'
import { generateId, getCurrentMonth, getMonthRange } from '@/utils/formatters'

const STORAGE_KEY = 'financeapp_data'

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY}_${key}`)
    return stored ? JSON.parse(stored) : fallback
  } catch {
    return fallback
  }
}

function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(`${STORAGE_KEY}_${key}`, JSON.stringify(data))
  } catch { /* */ }
}

export const useFinanceStore = defineStore('finance', () => {
  const accounts = ref<Account[]>(loadFromStorage('accounts', mockAccounts))
  const transactions = ref<Transaction[]>(loadFromStorage('transactions', mockTransactions))
  const categories = ref<Category[]>(loadFromStorage('categories', mockCategories))
  const paychecks = ref<Paycheck[]>(loadFromStorage('paychecks', mockPaychecks))
  const budgets = ref<Budget[]>(loadFromStorage('budgets', mockBudgets))
  const selectedMonth = ref<string>(getCurrentMonth())

  // Persist changes
  function persist() {
    saveToStorage('accounts', accounts.value)
    saveToStorage('transactions', transactions.value)
    saveToStorage('categories', categories.value)
    saveToStorage('paychecks', paychecks.value)
    saveToStorage('budgets', budgets.value)
  }

  // Filtered transactions for selected month
  const monthTransactions = computed(() => {
    const { start, end } = getMonthRange(selectedMonth.value)
    return transactions.value.filter(t => t.date >= start && t.date <= end)
  })

  const monthIncome = computed(() =>
    monthTransactions.value
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)
  )

  const monthExpenses = computed(() =>
    monthTransactions.value
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)
  )

  const totalBalance = computed(() =>
    accounts.value
      .filter(a => a.type !== 'credit')
      .reduce((sum, a) => sum + a.balance, 0)
  )

  const totalDebt = computed(() =>
    accounts.value
      .filter(a => a.type === 'credit')
      .reduce((sum, a) => sum + (a.usedCredit || 0), 0)
  )

  const availableCredit = computed(() =>
    accounts.value
      .filter(a => a.type === 'credit')
      .reduce((sum, a) => sum + ((a.creditLimit || 0) - (a.usedCredit || 0)), 0)
  )

  const savings = computed(() => totalBalance.value - monthExpenses.value)
  const remaining = computed(() => monthIncome.value - monthExpenses.value)
  const savingsRate = computed(() =>
    monthIncome.value > 0 ? (remaining.value / monthIncome.value) * 100 : 0
  )

  // Expenses by category for the month
  const expensesByCategory = computed(() => {
    const map: Record<string, number> = {}
    monthTransactions.value
      .filter(t => t.type === 'expense')
      .forEach(t => {
        map[t.category] = (map[t.category] || 0) + t.amount
      })
    return map
  })

  // Budget progress
  const budgetProgress = computed(() => {
    return budgets.value
      .filter(b => b.month === selectedMonth.value)
      .map(b => {
        const category = categories.value.find(c => c.id === b.categoryId)
        const spent = expensesByCategory.value[b.categoryId] || 0
        return {
          ...b,
          category,
          spent,
          percentage: Math.min((spent / b.amount) * 100, 100),
          exceeded: spent > b.amount
        }
      })
  })

  // Financial health score
  const financialHealth = computed(() => {
    let score = 100
    if (savingsRate.value < 10) score -= 30
    else if (savingsRate.value < 20) score -= 15
    const debtRatio = monthIncome.value > 0 ? totalDebt.value / monthIncome.value : 0
    if (debtRatio > 0.5) score -= 25
    else if (debtRatio > 0.3) score -= 10
    const exceededBudgets = budgetProgress.value.filter(b => b.exceeded).length
    score -= exceededBudgets * 5
    return Math.max(0, Math.min(100, score))
  })

  // Monthly trend (last 6 months)
  const monthlyTrend = computed(() => {
    const months: { month: string; income: number; expenses: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const month = d.toISOString().slice(0, 7)
      const { start, end } = getMonthRange(month)
      const txs = transactions.value.filter(t => t.date >= start && t.date <= end)
      months.push({
        month,
        income: txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
        expenses: txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
      })
    }
    return months
  })

  // CRUD operations
  function addTransaction(tx: Omit<Transaction, 'id'>) {
    transactions.value.unshift({ ...tx, id: generateId() })
    persist()
  }

  function updateTransaction(id: string, updates: Partial<Transaction>) {
    const idx = transactions.value.findIndex(t => t.id === id)
    if (idx !== -1) {
      transactions.value[idx] = { ...transactions.value[idx], ...updates }
      persist()
    }
  }

  function deleteTransaction(id: string) {
    transactions.value = transactions.value.filter(t => t.id !== id)
    persist()
  }

  function addAccount(acc: Omit<Account, 'id'>) {
    accounts.value.push({ ...acc, id: generateId() })
    persist()
  }

  function updateAccount(id: string, updates: Partial<Account>) {
    const idx = accounts.value.findIndex(a => a.id === id)
    if (idx !== -1) {
      accounts.value[idx] = { ...accounts.value[idx], ...updates }
      persist()
    }
  }

  function deleteAccount(id: string) {
    accounts.value = accounts.value.filter(a => a.id !== id)
    persist()
  }

  function addCategory(cat: Omit<Category, 'id'>) {
    categories.value.push({ ...cat, id: generateId() })
    persist()
  }

  function addPaycheck(pay: Omit<Paycheck, 'id'>) {
    paychecks.value.unshift({ ...pay, id: generateId() })
    persist()
  }

  function updatePaycheck(id: string, updates: Partial<Paycheck>) {
    const idx = paychecks.value.findIndex(p => p.id === id)
    if (idx !== -1) {
      paychecks.value[idx] = { ...paychecks.value[idx], ...updates }
      persist()
    }
  }

  function deletePaycheck(id: string) {
    paychecks.value = paychecks.value.filter(p => p.id !== id)
    persist()
  }

  function saveBudget(bud: Omit<Budget, 'id'>) {
    const existing = budgets.value.findIndex(
      b => b.categoryId === bud.categoryId && b.month === bud.month
    )
    if (existing !== -1) {
      budgets.value[existing] = { ...budgets.value[existing], ...bud }
    } else {
      budgets.value.push({ ...bud, id: generateId() })
    }
    persist()
  }

  function getCategoryById(id: string): Category | undefined {
    return categories.value.find(c => c.id === id)
  }

  function getAccountById(id: string): Account | undefined {
    return accounts.value.find(a => a.id === id)
  }

  return {
    accounts, transactions, categories, paychecks, budgets, selectedMonth,
    monthTransactions, monthIncome, monthExpenses, totalBalance, totalDebt,
    availableCredit, savings, remaining, savingsRate, expensesByCategory,
    budgetProgress, financialHealth, monthlyTrend,
    addTransaction, updateTransaction, deleteTransaction,
    addAccount, updateAccount, deleteAccount,
    addCategory, addPaycheck, updatePaycheck, deletePaycheck,
    saveBudget, getCategoryById, getAccountById
  }
})
