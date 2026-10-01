import { defineStore } from "pinia";
import { ref, computed } from "vue";

import type {
  Account,
  Transaction,
  Category,
  Paycheck,
  Budget,
  RecurringExpense,
} from "@/interfaces";

import { getCurrentMonth, getMonthRange } from "@/utils/formatters";
import { calculateCreditStatement } from "@/utils/creditStatement";
import {
  addDaysISO,
  dateInMonth,
  monthIndexOf,
  parseISODate,
  toISODate,
  todayISO,
} from "@/utils/dates";

import {
  getAccountsService,
  createAccountService,
  updateAccountService,
  deleteAccountService,
} from "@/services/account.service";

import {
  getTransactionsService,
  createTransactionService,
  setTransactionService,
  updateTransactionService,
  deleteTransactionService,
} from "@/services/transaction.service";

import {
  getPaychecksService,
  createPaycheckService,
  updatePaycheckService,
  deletePaycheckService,
} from "@/services/paychecks.service";

import {
  getRecurringExpensesService,
  createRecurringExpenseService,
  updateRecurringExpenseService,
  deleteRecurringExpenseService,
} from "@/services/recurring.service";

import {
  getCategoriesService,
  createCategoryService,
  setCategoryService,
  updateCategoryService,
  deleteCategoryService,
} from "@/services/category.service";

const DEBT_PREFIX = "debt-";

const CATEGORY_COLORS = [
  "#f43f5e",
  "#8b5cf6",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#d946ef",
  "#84cc16",
  "#fb7185",
];

function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function debtCategoryId(name: string): string {
  return DEBT_PREFIX + normalizeName(name).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function colorFor(key: string): string {
  let hash = 0;
  for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return CATEGORY_COLORS[hash % CATEGORY_COLORS.length];
}

// Categorías que antes venían fijas en el código. Solo se usan para migrar
// a Firestore las que ya usan tus movimientos; ya no se muestran por defecto.
const LEGACY_CATEGORIES: Category[] = [
  {
    id: "salary",
    name: "Salario",
    color: "#22c55e",
    icon: "💼",
    type: "income",
  },
  {
    id: "freelance",
    name: "Freelance",
    color: "#06b6d4",
    icon: "🧑‍💻",
    type: "income",
  },
  {
    id: "food",
    name: "Comida",
    color: "#f97316",
    icon: "🍔",
    type: "expense",
  },
  {
    id: "transport",
    name: "Transporte",
    color: "#3b82f6",
    icon: "🚗",
    type: "expense",
  },
  {
    id: "shopping",
    name: "Compras",
    color: "#ec4899",
    icon: "🛍️",
    type: "expense",
  },
  {
    id: "services",
    name: "Servicios",
    color: "#a855f7",
    icon: "📄",
    type: "expense",
  },
  {
    id: "entertainment",
    name: "Entretenimiento",
    color: "#eab308",
    icon: "🎮",
    type: "expense",
  },
  {
    id: "health",
    name: "Salud",
    color: "#ef4444",
    icon: "🏥",
    type: "expense",
  },
  {
    id: "education",
    name: "Educación",
    color: "#14b8a6",
    icon: "📚",
    type: "expense",
  },
  {
    id: "other",
    name: "Otros",
    color: "#6b7280",
    icon: "📦",
    type: "both",
  },
];

export const useFinanceStore = defineStore("finance", () => {
  // =========================================
  // STATE
  // =========================================

  const loading = ref(false);

  const accounts = ref<Account[]>([]);
  const transactions = ref<Transaction[]>([]);
  const categories = ref<Category[]>([]);
  const paychecks = ref<Paycheck[]>([]);
  const budgets = ref<Budget[]>([]);
  const recurringExpenses = ref<RecurringExpense[]>([]);
  const selectedMonth = ref<string>(getCurrentMonth());

  // =========================================
  // LOADERS
  // =========================================

  async function loadAccounts() {
    try {
      loading.value = true;

      accounts.value = await getAccountsService();
    } catch (error) {
      console.error("Error loading accounts", error);
    } finally {
      loading.value = false;
    }
  }

  async function loadTransactions() {
    try {
      loading.value = true;

      transactions.value = await getTransactionsService();
    } catch (error) {
      console.error("Error loading transactions", error);
    } finally {
      loading.value = false;
    }
  }

  async function loadPaychecks() {
    try {
      loading.value = true;

      paychecks.value = await getPaychecksService();
    } catch (error) {
      console.error("Error loading paychecks", error);
    } finally {
      loading.value = false;
    }
  }

  async function loadRecurringExpenses() {
    try {
      recurringExpenses.value = await getRecurringExpensesService();
    } catch (error) {
      console.error("Error loading recurring expenses", error);
    }
  }

  /* =========================================
COMPUTED
========================================= */

  const currentPaycheck = computed(() => {
    return paychecks.value[0];
  });

  const totalSalaryDeductions = computed(() => {
    return (
      currentPaycheck.value?.deductions?.reduce(
        (sum, item) => sum + item.amount,
        0,
      ) || 0
    );
  });

  const netSalary = computed(() => {
    return (
      (currentPaycheck.value?.monthlySalary || 0) - totalSalaryDeductions.value
    );
  });

  const quincenaValue = computed(() => {
    return netSalary.value / 2;
  });

  const quincena15Debts = computed(() => {
    return (
      currentPaycheck.value?.debts?.filter((item) => item.quincena === "15") ||
      []
    );
  });

  const quincena30Debts = computed(() => {
    return (
      currentPaycheck.value?.debts?.filter((item) => item.quincena === "30") ||
      []
    );
  });

  const quincena15Total = computed(() => {
    return quincena15Debts.value.reduce((sum, item) => sum + item.amount, 0);
  });

  const quincena30Total = computed(() => {
    return quincena30Debts.value.reduce((sum, item) => sum + item.amount, 0);
  });

  /* =========================================
PAYCHECKS
========================================= */

  async function loadFinanceData() {
    await Promise.all([loadAccounts(), loadTransactions(), loadPaychecks()]);
  }

  async function addPaycheck(pay: Omit<Paycheck, "id">) {
    try {
      await createPaycheckService(pay);

      await loadPaychecks();
    } catch (error) {
      console.error("Error creating paycheck", error);
    }
  }

  async function updatePaycheck(id: string, updates: Partial<Paycheck>) {
    try {
      await updatePaycheckService(id, updates);

      await loadPaychecks();
    } catch (error) {
      console.error("Error updating paycheck", error);
    }
  }

  async function deletePaycheck(id: string) {
    try {
      await deletePaycheckService(id);

      paychecks.value = paychecks.value.filter((p) => p.id !== id);
    } catch (error) {
      console.error("Error deleting paycheck", error);
    }
  }

  // =========================================
  // COMPUTED
  // =========================================

  const monthTransactions = computed(() => {
    const { start, end } = getMonthRange(selectedMonth.value);

    return transactions.value.filter((t) => t.date >= start && t.date <= end);
  });

  const monthIncome = computed(() =>
    monthTransactions.value
      .filter((t) => t.type === "income" && t.category !== "transfer")
      .reduce((sum, t) => sum + t.amount, 0),
  );

  const monthExpenses = computed(() =>
    monthTransactions.value
      .filter((t) => t.type === "expense" && t.category !== "transfer")
      .reduce((sum, t) => sum + t.amount, 0),
  );

const totalBalance = computed(() =>
  accounts.value
    .filter((a) => a.type !== "credit")
    .reduce((sum, a) => {
      return (
        sum +
        calculateAccountBalance(a.id).balance
      );
    }, 0)
);

const totalDebt = computed(() =>
  accounts.value
    .filter((a) => a.type === "credit")
    .reduce((sum, a) => {
      return (
        sum +
        calculateAccountBalance(a.id).usedCredit
      );
    }, 0)
);

const availableCredit = computed(() =>
  accounts.value
    .filter((a) => a.type === "credit")
    .reduce((sum, a) => {
      return (
        sum +
        calculateAccountBalance(a.id).availableCredit
      );
    }, 0)
);

  const savings = computed(() => totalBalance.value - monthExpenses.value);

const remaining = computed(() =>
  accounts.value
    .filter(
      (a) =>
        a.type === "debit" ||
        a.type === "cash"
    )
    .reduce((sum, a) => {
      return (
        sum +
        calculateAccountBalance(a.id).balance
      );
    }, 0)
);

  const savingsRate = computed(() =>
    monthIncome.value > 0 ? (remaining.value / monthIncome.value) * 100 : 0,
  );

  // =========================================
  // EXPENSES BY CATEGORY
  // =========================================

  const expensesByCategory = computed(() => {
    const map: Record<string, number> = {};

    monthTransactions.value
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        map[t.category] = (map[t.category] || 0) + t.amount;
      });

    return map;
  });

  // =========================================
  // BUDGET PROGRESS
  // =========================================

  const budgetProgress = computed(() => {
    return budgets.value
      .filter((b) => b.month === selectedMonth.value)
      .map((b) => {
        const category = categories.value.find((c) => c.id === b.categoryId);

        const spent = expensesByCategory.value[b.categoryId] || 0;

        return {
          ...b,
          category,
          spent,
          percentage: Math.min((spent / b.amount) * 100, 100),
          exceeded: spent > b.amount,
        };
      });
  });

  // =========================================
  // FINANCIAL HEALTH
  // =========================================

  const financialHealth = computed(() => {
    let score = 100;

    if (savingsRate.value < 10) score -= 30;
    else if (savingsRate.value < 20) score -= 15;

    const debtRatio =
      monthIncome.value > 0 ? totalDebt.value / monthIncome.value : 0;

    if (debtRatio > 0.5) score -= 25;
    else if (debtRatio > 0.3) score -= 10;

    const exceededBudgets = budgetProgress.value.filter(
      (b) => b.exceeded,
    ).length;

    score -= exceededBudgets * 5;

    return Math.max(0, Math.min(100, score));
  });

  // =========================================
  // MONTHLY TREND
  // =========================================

  const monthlyTrend = computed(() => {
    const months: {
      month: string;
      income: number;
      expenses: number;
    }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date();

      d.setMonth(d.getMonth() - i);

      const month = d.toISOString().slice(0, 7);

      const { start, end } = getMonthRange(month);

      const txs = transactions.value.filter(
        (t) => t.date >= start && t.date <= end,
      );

      months.push({
        month,

        income: txs
          .filter((t) => t.type === "income")
          .reduce((s, t) => s + t.amount, 0),

        expenses: txs
          .filter((t) => t.type === "expense")
          .reduce((s, t) => s + t.amount, 0),
      });
    }

    return months;
  });

  // =========================================
  // TRANSACTIONS
  // =========================================

  async function addTransaction(tx: Omit<Transaction, "id">) {
    try {
      await createTransactionService(tx);

      await loadTransactions();
    } catch (error) {
      console.error("Error creating transaction", error);
    }
  }

  async function updateTransaction(id: string, updates: Partial<Transaction>) {
    try {
      await updateTransactionService(id, updates);

      await loadTransactions();
    } catch (error) {
      console.error("Error updating transaction", error);
    }
  }

  async function deleteTransaction(id: string) {
    try {
      await deleteTransactionService(id);

      transactions.value = transactions.value.filter((t) => t.id !== id);
    } catch (error) {
      console.error("Error deleting transaction", error);
    }
  }

  // =========================================
  // ACCOUNTS
  // =========================================

  async function addAccount(acc: Omit<Account, "id">) {
    try {
      await createAccountService(acc);

      await loadAccounts();
    } catch (error) {
      console.error("Error creating account", error);
    }
  }

  async function updateAccount(id: string, updates: Partial<Account>) {
    try {
      await updateAccountService(id, updates);

      await loadAccounts();
    } catch (error) {
      console.error("Error updating account", error);
    }
  }

  async function deleteAccount(id: string) {
    try {
      await deleteAccountService(id);

      accounts.value = accounts.value.filter((a) => a.id !== id);
    } catch (error) {
      console.error("Error deleting account", error);
    }
  }

  // =========================================
  // RECURRING EXPENSES
  // =========================================

  // Fechas de cobro entre `from` y `to` (inclusive)
  function recurringOccurrences(
    rec: RecurringExpense,
    from: string,
    to: string,
  ): string[] {
    const start = parseISODate(from);
    const end = parseISODate(to);
    const dates: string[] = [];

    for (let idx = monthIndexOf(start); idx <= monthIndexOf(end); idx++) {
      const occ = dateInMonth(Math.floor(idx / 12), idx % 12, rec.dayOfMonth);
      if (occ >= start && occ <= end) dates.push(toISODate(occ));
    }

    return dates;
  }

  function nextRecurringDate(rec: RecurringExpense): string {
    const candidates = [todayISO(), rec.startDate];
    if (rec.lastRunDate) candidates.push(addDaysISO(rec.lastRunDate, 1));
    const from = candidates.sort().at(-1)!;
    const [y, m] = from.split("-").map(Number);
    const limit = toISODate(new Date(y, m + 1, 28));

    return recurringOccurrences(rec, from, limit)[0];
  }

  const recurringMonthlyTotal = computed(() =>
    recurringExpenses.value
      .filter((r) => r.active)
      .reduce((sum, r) => sum + r.amount, 0),
  );

  let processingRecurring: Promise<void> | null = null;

  // Genera los movimientos pendientes de cada gasto automático hasta hoy.
  // El id del movimiento es fijo (rec_<id>_<fecha>), así nunca se duplica.
  function processRecurringExpenses() {
    if (processingRecurring) return processingRecurring;

    processingRecurring = (async () => {
      try {
        const today = todayISO();
        let created = 0;

        for (const rec of recurringExpenses.value) {
          if (!rec.active) continue;

          const from = rec.lastRunDate
            ? addDaysISO(rec.lastRunDate, 1)
            : rec.startDate;

          if (from > today) continue;

          const account = getAccountById(rec.accountId);
          const isCredit = account?.type === "credit";

          for (const date of recurringOccurrences(rec, from, today)) {
            const txId = `rec_${rec.id}_${date}`;
            if (transactions.value.some((t) => t.id === txId)) continue;

            const tx: Omit<Transaction, "id"> = {
              type: "expense",
              amount: rec.amount,
              date,
              category: rec.category,
              accountId: rec.accountId,
              description: rec.name,
              paymentMethod: isCredit ? "Crédito" : "Débito automático",
              tags: ["automático"],
              recurringId: rec.id,
            };

            if (isCredit) {
              tx.installments = 1;
              tx.interestRate = 0;
              tx.installmentAmount = rec.amount;
            }

            await setTransactionService(txId, tx);
            created++;
          }

          await updateRecurringExpenseService(rec.id, { lastRunDate: today });
          rec.lastRunDate = today;
        }

        if (created > 0) await loadTransactions();
      } catch (error) {
        console.error("Error processing recurring expenses", error);
      } finally {
        processingRecurring = null;
      }
    })();

    return processingRecurring;
  }

  // Carga inicial de la app: datos, migración de categorías y gastos automáticos
  async function initApp() {
    await Promise.all([
      loadAccounts(),
      loadTransactions(),
      loadRecurringExpenses(),
      loadPaychecks(),
      loadCategories(),
    ]);
    await migrateCategories(categories.value.length === 0);
    await processRecurringExpenses();
  }

  async function addRecurringExpense(rec: Omit<RecurringExpense, "id">) {
    try {
      await createRecurringExpenseService(rec);
      await loadRecurringExpenses();
      await processRecurringExpenses();
    } catch (error) {
      console.error("Error creating recurring expense", error);
    }
  }

  async function updateRecurringExpense(
    id: string,
    updates: Partial<RecurringExpense>,
  ) {
    try {
      await updateRecurringExpenseService(id, updates);
      await loadRecurringExpenses();
      await processRecurringExpenses();
    } catch (error) {
      console.error("Error updating recurring expense", error);
    }
  }

  async function deleteRecurringExpense(id: string) {
    try {
      await deleteRecurringExpenseService(id);
      recurringExpenses.value = recurringExpenses.value.filter(
        (r) => r.id !== id,
      );
    } catch (error) {
      console.error("Error deleting recurring expense", error);
    }
  }

  // =========================================
  // CATEGORIES
  // =========================================

  async function loadCategories() {
    try {
      categories.value = await getCategoriesService();
    } catch (error) {
      console.error("Error loading categories", error);
    }
  }

  function findCategoryByName(name: string): Category | undefined {
    const key = normalizeName(name);
    return categories.value.find((c) => normalizeName(c.name) === key);
  }

  async function addCategory(cat: Omit<Category, "id">): Promise<string | null> {
    const existing = findCategoryByName(cat.name);
    if (existing) return existing.id;

    try {
      const id = await createCategoryService(cat);
      categories.value.push({ ...cat, id });
      return id;
    } catch (error) {
      console.error("Error creating category", error);
      return null;
    }
  }

  async function updateCategory(id: string, updates: Partial<Category>) {
    try {
      await updateCategoryService(id, updates);
      await loadCategories();
    } catch (error) {
      console.error("Error updating category", error);
    }
  }

  // Cuántos movimientos y gastos automáticos usan la categoría
  function categoryUsage(id: string) {
    return (
      transactions.value.filter((t) => t.category === id).length +
      recurringExpenses.value.filter((r) => r.category === id).length
    );
  }

  async function deleteCategory(id: string) {
    if (categoryUsage(id) > 0) return false;

    try {
      await deleteCategoryService(id);
      categories.value = categories.value.filter((c) => c.id !== id);
      return true;
    } catch (error) {
      console.error("Error deleting category", error);
      return false;
    }
  }

  // Obligación de quincena → categoría con el mismo nombre (la crea si no existe)
  async function ensureDebtCategory(name: string, icon?: string) {
    const clean = name.trim();
    if (!clean || findCategoryByName(clean)) return;

    const cat: Omit<Category, "id"> = {
      name: clean,
      icon: icon || "💳",
      color: colorFor(normalizeName(clean)),
      type: "expense",
    };
    const id = debtCategoryId(clean);

    try {
      await setCategoryService(id, cat);
      categories.value.push({ ...cat, id });
    } catch (error) {
      console.error("Error creating debt category", error);
    }
  }

  // Pasa a Firestore las categorías que los movimientos ya usan pero que no
  // existen en la colección (antes estaban fijas en el código). La primera
  // vez también crea las de las obligaciones de las quincenas.
  async function migrateCategories(isFirstRun: boolean) {
    const missing = new Set<string>();

    [...transactions.value, ...recurringExpenses.value].forEach((item) => {
      const id = item.category;
      if (id && id !== "transfer" && !categories.value.some((c) => c.id === id)) {
        missing.add(id);
      }
    });

    for (const id of missing) {
      const debtName = (currentPaycheck.value?.debts || [])
        .map((d) => (d.category || d.name || "").trim())
        .find((n) => n && debtCategoryId(n) === id);

      const source = debtName
        ? { name: debtName, icon: "💳", color: colorFor(normalizeName(debtName)), type: "expense" as const }
        : getCategoryById(id);

      if (!source) continue;

      const data: Omit<Category, "id"> = {
        name: source.name,
        icon: source.icon,
        color: source.color,
        type: source.type,
      };

      try {
        await setCategoryService(id, data);
        categories.value.push({ ...data, id });
      } catch (error) {
        console.error("Error migrating category", id, error);
      }
    }

    if (isFirstRun) {
      for (const debt of currentPaycheck.value?.debts || []) {
        await ensureDebtCategory(debt.category || debt.name, debt.icon);
      }
    }
  }

  // =========================================
  // BUDGETS
  // =========================================

  async function saveBudget(bud: Omit<Budget, "id">) {
    console.log("TODO FIREBASE BUDGET SAVE", bud);
  }

  // =========================================
  // HELPERS
  // =========================================

  function getCategoryById(id: string): Category | undefined {
    const found = categories.value.find((c) => c.id === id);
    if (found) return found;

    const legacy = LEGACY_CATEGORIES.find((c) => c.id === id);
    if (legacy) return legacy;
    if (!id.startsWith(DEBT_PREFIX)) return undefined;

    // La obligación ya no existe: se conserva el nombre para los movimientos viejos
    const name = id.slice(DEBT_PREFIX.length).replace(/-/g, " ");
    return {
      id,
      name: name.charAt(0).toUpperCase() + name.slice(1),
      icon: "💳",
      color: colorFor(name),
      type: "expense",
    };
  }

  function getAccountById(id: string): Account | undefined {
    return accounts.value.find((a) => a.id === id);
  }

  function getCreditStatement(accountId: string) {
    const account = getAccountById(accountId);
    if (!account) return null;

    return calculateCreditStatement(account, transactions.value);
  }

  function calculateAccountBalance(accountId: string) {
    const account = accounts.value.find((a) => a.id === accountId);

    if (!account) {
      return {
        balance: 0,
        usedCredit: 0,
        availableCredit: 0,
      };
    }

    const accountTransactions = transactions.value.filter(
      (t) => t.accountId === accountId,
    );

    // TARJETAS DE CRÉDITO
    if (account.type === "credit") {
      let usedCredit = 0;

      accountTransactions.forEach((tx) => {
        if (tx.type === "expense") {
          usedCredit += tx.amount;
        }

        if (tx.type === "income") {
          usedCredit -= tx.amount;
        }
      });

      if (usedCredit < 0) {
        usedCredit = 0;
      }

      return {
        usedCredit,
        availableCredit: (account.creditLimit || 0) - usedCredit,
        balance: 0,
      };
    }

    // CUENTAS NORMALES
    let balance = account.balance || 0;

    accountTransactions.forEach((tx) => {
      if (tx.type === "income") {
        balance += tx.amount;
      }

      if (tx.type === "expense") {
        balance -= tx.amount;
      }
    });

    return {
      balance,
      usedCredit: 0,
      availableCredit: 0,
    };
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
    recurringExpenses,
    selectedMonth,

    // LOADERS
    loadAccounts,
    loadTransactions,
    loadPaychecks, 
    loadFinanceData,

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
    loadCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    categoryUsage,
    ensureDebtCategory,

    // PAYCHECKS
    addPaycheck,
    updatePaycheck,
    deletePaycheck,

    // BUDGETS
    saveBudget,

    // RECURRING EXPENSES
    loadRecurringExpenses,
    initApp,
    processRecurringExpenses,
    addRecurringExpense,
    updateRecurringExpense,
    deleteRecurringExpense,
    nextRecurringDate,
    recurringMonthlyTotal,

    calculateAccountBalance,
    getCreditStatement,
    // HELPERS
    getCategoryById,
    getAccountById,

    currentPaycheck, 
    totalSalaryDeductions, 
    netSalary, 
    quincenaValue, 
    quincena15Debts, 
    quincena30Debts, 
    quincena15Total, 
    quincena30Total
  };
});
