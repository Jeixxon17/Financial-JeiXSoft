import type { Account, Transaction, Category, Paycheck, Budget } from '@/interfaces'

export const mockAccounts: Account[] = [
  {
    id: 'acc-1',
    name: 'Bancolombia',
    type: 'debit',
    balance: 1850000,
    color: '#FFD700',
    icon: '🏦'
  },
  {
    id: 'acc-2',
    name: 'Nu',
    type: 'credit',
    balance: -289600,
    color: '#820AD1',
    icon: '💜',
    creditLimit: 1000000,
    usedCredit: 289600,
    cutoffDate: 15,
    paymentDate: 25,
    minimumPayment: 28960,
    totalToPay: 289600
  },
  {
    id: 'acc-3',
    name: 'Lulo Bank',
    type: 'savings',
    balance: 620000,
    color: '#00C9A7',
    icon: '🟢'
  },
  {
    id: 'acc-4',
    name: 'Nequi',
    type: 'debit',
    balance: 340000,
    color: '#6C63FF',
    icon: '💜'
  },
  {
    id: 'acc-5',
    name: 'Efectivo',
    type: 'cash',
    balance: 150000,
    color: '#4CAF50',
    icon: '💵'
  }
]

export const mockCategories: Category[] = [
  { id: 'cat-1', name: 'Salario', color: '#00d68f', icon: '💼', type: 'income' },
  { id: 'cat-2', name: 'Bono', color: '#4a9eff', icon: '🎁', type: 'income' },
  { id: 'cat-3', name: 'Extra', color: '#00d68f', icon: '💰', type: 'income' },
  { id: 'cat-4', name: 'Casa', color: '#ff4757', icon: '🏠', type: 'expense', budget: 800000 },
  { id: 'cat-5', name: 'Transporte', color: '#ffa502', icon: '🚌', type: 'expense', budget: 200000 },
  { id: 'cat-6', name: 'Moto', color: '#ff6b35', icon: '🏍️', type: 'expense', budget: 300000 },
  { id: 'cat-7', name: 'Parqueadero', color: '#ff7f50', icon: '🅿️', type: 'expense', budget: 100000 },
  { id: 'cat-8', name: 'Streaming', color: '#a855f7', icon: '🎬', type: 'expense', budget: 80000 },
  { id: 'cat-9', name: 'Servicios', color: '#3b82f6', icon: '⚡', type: 'expense', budget: 200000 },
  { id: 'cat-10', name: 'Mercado', color: '#f59e0b', icon: '🛒', type: 'expense', budget: 500000 },
  { id: 'cat-11', name: 'Deudas', color: '#ef4444', icon: '💳', type: 'expense' },
  { id: 'cat-12', name: 'Tarjetas', color: '#8b5cf6', icon: '💳', type: 'expense' },
  { id: 'cat-13', name: 'Salud', color: '#06b6d4', icon: '🏥', type: 'expense', budget: 150000 },
  { id: 'cat-14', name: 'Ocio', color: '#ec4899', icon: '🎉', type: 'expense', budget: 200000 },
  { id: 'cat-15', name: 'Otros', color: '#6b7280', icon: '📦', type: 'expense' }
]

const today = new Date()
const thisMonth = today.toISOString().slice(0, 7)
const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1).toISOString().slice(0, 7)

export const mockTransactions: Transaction[] = [
  // Current month incomes
  {
    id: 'tx-1',
    type: 'income',
    category: 'cat-1',
    accountId: 'acc-1',
    amount: 2500000,
    date: `${thisMonth}-01`,
    description: 'Primera quincena mayo',
    tags: ['quincena', 'salario'],
    paymentMethod: 'Transferencia'
  },
  {
    id: 'tx-2',
    type: 'income',
    category: 'cat-1',
    accountId: 'acc-1',
    amount: 2500000,
    date: `${thisMonth}-16`,
    description: 'Segunda quincena mayo',
    tags: ['quincena', 'salario'],
    paymentMethod: 'Transferencia'
  },
  {
    id: 'tx-3',
    type: 'income',
    category: 'cat-2',
    accountId: 'acc-1',
    amount: 300000,
    date: `${thisMonth}-10`,
    description: 'Bono de desempeño',
    tags: ['bono'],
    paymentMethod: 'Transferencia'
  },
  // Current month expenses
  {
    id: 'tx-4',
    type: 'expense',
    category: 'cat-4',
    accountId: 'acc-1',
    amount: 750000,
    date: `${thisMonth}-05`,
    description: 'Arriendo mayo',
    tags: ['fijo', 'casa'],
    paymentMethod: 'Transferencia'
  },
  {
    id: 'tx-5',
    type: 'expense',
    category: 'cat-6',
    accountId: 'acc-1',
    amount: 180000,
    date: `${thisMonth}-03`,
    description: 'Cuota moto Honda CB190',
    tags: ['fijo', 'moto'],
    paymentMethod: 'Débito automático'
  },
  {
    id: 'tx-6',
    type: 'expense',
    category: 'cat-7',
    accountId: 'acc-4',
    amount: 90000,
    date: `${thisMonth}-02`,
    description: 'Parqueadero mensual',
    tags: ['fijo'],
    paymentMethod: 'Nequi'
  },
  {
    id: 'tx-7',
    type: 'expense',
    category: 'cat-8',
    accountId: 'acc-2',
    amount: 19900,
    date: `${thisMonth}-07`,
    description: 'Netflix',
    tags: ['streaming', 'fijo'],
    paymentMethod: 'Nu'
  },
  {
    id: 'tx-8',
    type: 'expense',
    category: 'cat-8',
    accountId: 'acc-2',
    amount: 8900,
    date: `${thisMonth}-07`,
    description: 'Spotify',
    tags: ['streaming', 'fijo'],
    paymentMethod: 'Nu'
  },
  {
    id: 'tx-9',
    type: 'expense',
    category: 'cat-9',
    accountId: 'acc-1',
    amount: 85000,
    date: `${thisMonth}-08`,
    description: 'Electricidad',
    tags: ['servicios'],
    paymentMethod: 'PSE'
  },
  {
    id: 'tx-10',
    type: 'expense',
    category: 'cat-10',
    accountId: 'acc-5',
    amount: 320000,
    date: `${thisMonth}-12`,
    description: 'Mercado quincenal',
    tags: ['mercado'],
    paymentMethod: 'Efectivo'
  },
  {
    id: 'tx-11',
    type: 'expense',
    category: 'cat-5',
    accountId: 'acc-4',
    amount: 120000,
    date: `${thisMonth}-15`,
    description: 'Transporte urbano',
    tags: ['transporte'],
    paymentMethod: 'Nequi'
  },
  {
    id: 'tx-12',
    type: 'expense',
    category: 'cat-14',
    accountId: 'acc-2',
    amount: 85000,
    date: `${thisMonth}-20`,
    description: 'Restaurante con amigos',
    tags: ['ocio', 'social'],
    paymentMethod: 'Nu'
  },
  {
    id: 'tx-13',
    type: 'expense',
    category: 'cat-12',
    accountId: 'acc-1',
    amount: 289600,
    date: `${thisMonth}-22`,
    description: 'Pago tarjeta Nu',
    tags: ['tarjeta', 'deuda'],
    paymentMethod: 'PSE'
  },
  // Last month
  {
    id: 'tx-14',
    type: 'income',
    category: 'cat-1',
    accountId: 'acc-1',
    amount: 2500000,
    date: `${lastMonth}-01`,
    description: 'Primera quincena abril',
    tags: ['quincena', 'salario'],
    paymentMethod: 'Transferencia'
  },
  {
    id: 'tx-15',
    type: 'income',
    category: 'cat-1',
    accountId: 'acc-1',
    amount: 2500000,
    date: `${lastMonth}-16`,
    description: 'Segunda quincena abril',
    tags: ['quincena', 'salario'],
    paymentMethod: 'Transferencia'
  },
  {
    id: 'tx-16',
    type: 'expense',
    category: 'cat-4',
    accountId: 'acc-1',
    amount: 750000,
    date: `${lastMonth}-05`,
    description: 'Arriendo abril',
    tags: ['fijo', 'casa'],
    paymentMethod: 'Transferencia'
  },
  {
    id: 'tx-17',
    type: 'expense',
    category: 'cat-10',
    accountId: 'acc-5',
    amount: 290000,
    date: `${lastMonth}-14`,
    description: 'Mercado quincenal',
    tags: ['mercado'],
    paymentMethod: 'Efectivo'
  }
]

export const mockPaychecks: Paycheck[] = [
  {
    id: '1',

    label: 'Salario Principal',

    monthlySalary: 2887696,

    amount: 2887696,

    date: '2026-01-15',

    description: 'Pago mensual',

    status: 'received',

    spent: 1200000,

    deductions: [
      {
        id: 'ded-1',
        name: 'Salud',
        amount: 120000
      },
      {
        id: 'ded-2',
        name: 'Pensión',
        amount: 120000
      }
    ],

    debts: [
      {
        id: 'debt-1',
        name: 'Arriendo',
        amount: 900000,
        category: 'Hogar',
        quincena: '15',
        paid: false,
        icon: '🏠'
      },
      {
        id: 'debt-2',
        name: 'Internet',
        amount: 120000,
        category: 'Servicios',
        quincena: '30',
        paid: false,
        icon: '🌐'
      }
    ]
  }
]

export const mockBudgets: Budget[] = [
  { id: 'bud-1', categoryId: 'cat-4', amount: 800000, month: thisMonth, spent: 750000 },
  { id: 'bud-2', categoryId: 'cat-5', amount: 200000, month: thisMonth, spent: 120000 },
  { id: 'bud-3', categoryId: 'cat-6', amount: 300000, month: thisMonth, spent: 180000 },
  { id: 'bud-4', categoryId: 'cat-7', amount: 100000, month: thisMonth, spent: 90000 },
  { id: 'bud-5', categoryId: 'cat-8', amount: 80000, month: thisMonth, spent: 28800 },
  { id: 'bud-6', categoryId: 'cat-9', amount: 200000, month: thisMonth, spent: 85000 },
  { id: 'bud-7', categoryId: 'cat-10', amount: 500000, month: thisMonth, spent: 320000 },
  { id: 'bud-8', categoryId: 'cat-14', amount: 200000, month: thisMonth, spent: 85000 }
]
