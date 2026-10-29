// Extracto de tarjeta de crédito leído de un PDF del banco

export type StatementMovementKind = 'purchase' | 'payment' | 'fee' | 'interest'

export interface StatementMovement {
  kind: StatementMovementKind
  date: string // YYYY-MM-DD
  description: string
  amount: number
  installments: number
  // Interés mensual (%) de la compra a cuotas, si el banco lo muestra
  interestRate: number
  // Movimiento de un periodo anterior que aún tiene saldo (ej: compra a cuotas)
  previous: boolean
}

export interface ParsedStatement {
  bank: 'nu' | 'bancolombia'
  // Último día del periodo facturado: es la fecha de corte de la app
  cutoffDate: string
  periodStart: string
  dueDate: string
  minimumPayment: number
  // Deuda total hasta el corte
  totalDebt: number
  interest: number
  conversionFees: number
  movements: StatementMovement[]
}
