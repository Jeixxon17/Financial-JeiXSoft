import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

import type {
  Account,
  Transaction,
  Category,
  Paycheck,
  Budget
} from '@/interfaces'

import {
  getCurrentMonth,
  getMonthRange
} from '@/utils/formatters'

import {
  getAccountsService,
  createAccountService,
  updateAccountService,
  deleteAccountService
} from '@/services/account.service'

import {
  getTransactionsService,
  createTransactionService,
  updateTransactionService,
  deleteTransactionService
} from '@/services/transaction.service'

export const useFinanceStore = defineStore('finance', () => {

  // =========================================
  // STATE
  // =========================================
  const defaultCategories: Category[] = [
  {
    id: 'salary',
    name: 'Salario',
    color: '#22c55e',
    icon: '💼',
    type: 'income'
  },
  {
    id: 'freelance',
    name: 'Freelance',
    color: '#06b6d4',
    icon: '🧑‍💻',
    type: 'income'
  },
  {
    id: 'food',
    name: 'Comida',
    color: '#f97316',
    icon: '🍔',
    type: 'expense'
  },
  {
    id: 'transport',
    name: 'Transporte',
    color: '#3b82f6',
    icon: '🚗',
    type: 'expense'
  },
  {
    id: 'shopping',
    name: 'Compras',
    color: '#ec4899',
    icon: '🛍️',
    type: 'expense'
  },
  {
    id: 'services',
    name: 'Servicios',
    color: '#a855f7',
    icon: '📄',
    type: 'expense'
  },
  {
    id: 'entertainment',
    name: 'Entretenimiento',
    color: '#eab308',
    icon: '🎮',
    type: 'expense'
  },
  {
    id: 'health',
    name: 'Salud',
    color: '#ef4444',
    icon: '🏥',
    type: 'expense'
  },
  {
    id: 'education',
    name: 'Educación',
    color: '#14b8a6',
    icon: '📚',
    type: 'expense'
  },
  {
    id: 'other',
    name: 'Otros',
    color: '#6b7280',
    icon: '📦',
    type: 'both'
  }
]

  const loading = ref(false)

  const accounts = ref<Account[]>([])
  const transactions = ref<Transaction[]>([])
  const categories = ref<Category[]>(defaultCategories)
  const paychecks = ref<Paycheck[]>([])
  const budgets = ref<Budget[]>([])

  const selectedMonth = ref<string>(
    getCurrentMonth()
  )

  

  // =========================================
  // LOADERS
  // =========================================

  async function loadAccounts() {

    try {

      loading.value = true

      accounts.value = await getAccountsService()

    } catch (error) {

      console.error(
        'Error loading accounts',
        error
      )

    } finally {

      loading.value = false

    }
  }

  async function loadTransactions() {

  try {

    loading.value = true

    transactions.value =
      await getTransactionsService()

  } catch (error) {

    console.error(
      'Error loading transactions',
      error
    )

  } finally {

    loading.value = false

  }
}

  // =========================================
  // COMPUTED
  // =========================================

  const monthTransactions = computed(() => {

    const {
      start,
      end
    } = getMonthRange(selectedMonth.value)

    return transactions.value.filter(
      t => t.date >= start && t.date <= end
    )
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
      .reduce(
        (sum, a) => sum + (a.usedCredit || 0),
        0
      )

  )

  const availableCredit = computed(() =>

    accounts.value
      .filter(a => a.type === 'credit')
      .reduce((sum, a) => {

        return sum + (
          (a.creditLimit || 0) -
          (a.usedCredit || 0)
        )

      }, 0)

  )

  const savings = computed(() =>
    totalBalance.value - monthExpenses.value
  )

  const remaining = computed(() =>
    monthIncome.value - monthExpenses.value
  )

  const savingsRate = computed(() =>

    monthIncome.value > 0
      ? (remaining.value / monthIncome.value) * 100
      : 0

  )

  // =========================================
  // EXPENSES BY CATEGORY
  // =========================================

  const expensesByCategory = computed(() => {

    const map: Record<string, number> = {}

    monthTransactions.value
      .filter(t => t.type === 'expense')
      .forEach(t => {

        map[t.category] =
          (map[t.category] || 0) + t.amount

      })

    return map
  })

  // =========================================
  // BUDGET PROGRESS
  // =========================================

  const budgetProgress = computed(() => {

    return budgets.value
      .filter(
        b => b.month === selectedMonth.value
      )
      .map(b => {

        const category =
          categories.value.find(
            c => c.id === b.categoryId
          )

        const spent =
          expensesByCategory.value[
            b.categoryId
          ] || 0

        return {
          ...b,
          category,
          spent,
          percentage: Math.min(
            (spent / b.amount) * 100,
            100
          ),
          exceeded: spent > b.amount
        }
      })
  })

  // =========================================
  // FINANCIAL HEALTH
  // =========================================

  const financialHealth = computed(() => {

    let score = 100

    if (savingsRate.value < 10)
      score -= 30

    else if (savingsRate.value < 20)
      score -= 15

    const debtRatio =
      monthIncome.value > 0
        ? totalDebt.value / monthIncome.value
        : 0

    if (debtRatio > 0.5)
      score -= 25

    else if (debtRatio > 0.3)
      score -= 10

    const exceededBudgets =
      budgetProgress.value.filter(
        b => b.exceeded
      ).length

    score -= exceededBudgets * 5

    return Math.max(
      0,
      Math.min(100, score)
    )
  })

  // =========================================
  // MONTHLY TREND
  // =========================================

  const monthlyTrend = computed(() => {

    const months: {
      month: string
      income: number
      expenses: number
    }[] = []

    for (let i = 5; i >= 0; i--) {

      const d = new Date()

      d.setMonth(
        d.getMonth() - i
      )

      const month =
        d.toISOString().slice(0, 7)

      const {
        start,
        end
      } = getMonthRange(month)

      const txs =
        transactions.value.filter(
          t =>
            t.date >= start &&
            t.date <= end
        )

      months.push({
        month,

        income:
          txs
            .filter(
              t => t.type === 'income'
            )
            .reduce(
              (s, t) => s + t.amount,
              0
            ),

        expenses:
          txs
            .filter(
              t => t.type === 'expense'
            )
            .reduce(
              (s, t) => s + t.amount,
              0
            )
      })
    }

    return months
  })

  // =========================================
  // TRANSACTIONS
  // =========================================

  async function addTransaction(
  tx: Omit<Transaction, 'id'>
) {

  try {

    await createTransactionService(tx)

    await loadTransactions()

  } catch (error) {

    console.error(
      'Error creating transaction',
      error
    )
  }
}

async function updateTransaction(
  id: string,
  updates: Partial<Transaction>
) {

  try {

    await updateTransactionService(
      id,
      updates
    )

    await loadTransactions()

  } catch (error) {

    console.error(
      'Error updating transaction',
      error
    )
  }
}

async function deleteTransaction(
  id: string
) {

  try {

    await deleteTransactionService(id)

    transactions.value =
      transactions.value.filter(
        t => t.id !== id
      )

  } catch (error) {

    console.error(
      'Error deleting transaction',
      error
    )
  }
}

  // =========================================
  // ACCOUNTS
  // =========================================

  async function addAccount(
    acc: Omit<Account, 'id'>
  ) {

    try {

      await createAccountService(acc)

      await loadAccounts()

    } catch (error) {

      console.error(
        'Error creating account',
        error
      )
    }
  }

  async function updateAccount(
    id: string,
    updates: Partial<Account>
  ) {

    try {

      await updateAccountService(
        id,
        updates
      )

      await loadAccounts()

    } catch (error) {

      console.error(
        'Error updating account',
        error
      )
    }
  }

  async function deleteAccount(
    id: string
  ) {

    try {

      await deleteAccountService(id)

      accounts.value =
        accounts.value.filter(
          a => a.id !== id
        )

    } catch (error) {

      console.error(
        'Error deleting account',
        error
      )
    }
  }

  // =========================================
  // CATEGORIES
  // =========================================

  async function addCategory(
    cat: Omit<Category, 'id'>
  ) {

    console.log(
      'TODO FIREBASE CATEGORY CREATE',
      cat
    )
  }

  // =========================================
  // PAYCHECKS
  // =========================================

  async function addPaycheck(
    pay: Omit<Paycheck, 'id'>
  ) {

    console.log(
      'TODO FIREBASE PAYCHECK CREATE',
      pay
    )
  }

  async function updatePaycheck(
    id: string,
    updates: Partial<Paycheck>
  ) {

    console.log(
      'TODO FIREBASE PAYCHECK UPDATE',
      id,
      updates
    )
  }

  async function deletePaycheck(
    id: string
  ) {

    console.log(
      'TODO FIREBASE PAYCHECK DELETE',
      id
    )
  }

  // =========================================
  // BUDGETS
  // =========================================

  async function saveBudget(
    bud: Omit<Budget, 'id'>
  ) {

    console.log(
      'TODO FIREBASE BUDGET SAVE',
      bud
    )
  }

  // =========================================
  // HELPERS
  // =========================================

  function getCategoryById(
    id: string
  ): Category | undefined {

    return categories.value.find(
      c => c.id === id
    )
  }

  function getAccountById(
    id: string
  ): Account | undefined {

    return accounts.value.find(
      a => a.id === id
    )
  }


  function calculateAccountBalance(accountId: string) {

  const account = accounts.value.find(
    a => a.id === accountId
  )

  if (!account) {

    return {
      balance: 0,
      usedCredit: 0,
      availableCredit: 0
    }
  }

  const accountTransactions = transactions.value.filter(
    t => t.accountId === accountId
  )

  // TARJETAS DE CRÉDITO
  if (account.type === 'credit') {

    let usedCredit = 0

    accountTransactions.forEach(tx => {

      if (tx.type === 'expense') {
        usedCredit += tx.amount
      }

      if (tx.type === 'income') {
        usedCredit -= tx.amount
      }

    })

    if (usedCredit < 0) {
      usedCredit = 0
    }

    return {
      usedCredit,
      availableCredit: (account.creditLimit || 0) - usedCredit,
      balance: 0
    }
  }

  // CUENTAS NORMALES
  let balance = account.balance || 0

  accountTransactions.forEach(tx => {

    if (tx.type === 'income') {
      balance += tx.amount
    }

    if (tx.type === 'expense') {
      balance -= tx.amount
    }

  })

  return {
    balance,
    usedCredit: 0,
    availableCredit: 0
  }
}

  // =========================================
  // RETURN
  // =========================================

  return {

    // STATE
    loading,

    accounts,
    transactions,
    categories,
    paychecks,
    budgets,
    selectedMonth,

    // LOADERS
    loadAccounts,
    loadTransactions,

    // COMPUTED
    monthTransactions,
    monthIncome,
    monthExpenses,
    totalBalance,
    totalDebt,
    availableCredit,
    savings,
    remaining,
    savingsRate,
    expensesByCategory,
    budgetProgress,
    financialHealth,
    monthlyTrend,

    // TRANSACTIONS
    addTransaction,
    updateTransaction,
    deleteTransaction,
    

    // ACCOUNTS
    addAccount,
    updateAccount,
    deleteAccount,

    // CATEGORIES
    addCategory,

    // PAYCHECKS
    addPaycheck,
    updatePaycheck,
    deletePaycheck,

    // BUDGETS
    saveBudget,
    calculateAccountBalance,
    // HELPERS
    getCategoryById,
    getAccountById
  }
})