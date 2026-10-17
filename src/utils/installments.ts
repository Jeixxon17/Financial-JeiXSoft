// Cuotas como las cobra Bancolombia: el capital se divide en partes iguales y
// cada mes se cobra el interés mensual sobre el saldo que aún se debe.
// Las compras a 1 cuota no pagan interés.

export interface InstallmentRow {
  number: number
  capital: number
  interest: number
  total: number
  // Saldo de capital que queda después de pagar esta cuota
  balance: number
}

export function installmentSchedule(
  amount: number,
  installments: number,
  monthlyRatePct = 0
): InstallmentRow[] {
  const n = Math.max(1, Math.floor(installments || 1))
  const rate = n > 1 ? Math.max(0, monthlyRatePct || 0) / 100 : 0
  const capital = amount / n
  const rows: InstallmentRow[] = []
  let balance = amount

  for (let k = 1; k <= n; k++) {
    const interest = balance * rate
    balance = Math.max(0, balance - capital)
    rows.push({ number: k, capital, interest, total: capital + interest, balance })
  }

  return rows
}

// Capital e intereses de las primeras `count` cuotas
export function installmentsBilled(
  amount: number,
  installments: number,
  monthlyRatePct: number,
  count: number
): { capital: number; interest: number } {
  return installmentSchedule(amount, installments, monthlyRatePct)
    .slice(0, Math.max(0, count))
    .reduce(
      (sum, row) => ({ capital: sum.capital + row.capital, interest: sum.interest + row.interest }),
      { capital: 0, interest: 0 }
    )
}

// Tasa efectiva anual equivalente a una tasa mensual (en %)
export function effectiveAnnualRate(monthlyRatePct: number): number {
  return (Math.pow(1 + monthlyRatePct / 100, 12) - 1) * 100
}
