export interface Account {
  id: string
  name: string
  type: 'debit' | 'credit' | 'savings' | 'cash'
  balance: number
  color: string
  icon: string
  // Credit card specific
  creditLimit?: number
  usedCredit?: number
  cutoffDate?: number
  paymentDate?: number
  minimumPayment?: number
  totalToPay?: number
}

export interface Transaction {
  id: string
  type: 'income' | 'expense' | 'transfer'
  category: string
  accountId: string
  amount: number
  date: string
  description: string
  tags: string[]
  paymentMethod: string
}

export interface Category {
  id: string
  name: string
  color: string
  icon: string
  type: 'income' | 'expense' | 'both'
  budget?: number
}

export interface Paycheck {
  id: string
  label: string
  amount: number
  date: string
  description: string
  status: 'received' | 'pending' | 'partial'
  spent: number
}

export interface Budget {
  id: string
  categoryId: string
  amount: number
  month: string
  spent: number
}

export interface FinancialSummary {
  totalBalance: number
  totalIncome: number
  totalExpenses: number
  totalSavings: number
  remaining: number
  totalDebt: number
  availableCredit: number
  savingsRate: number
}
