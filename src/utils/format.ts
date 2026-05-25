const ZAR = new Intl.NumberFormat('en-ZA', {
  style: 'currency',
  currency: 'ZAR',
  minimumFractionDigits: 2,
})

export function formatCurrency(amount: number): string {
  return ZAR.format(amount)
}

export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateStr))
}

export const VAT_RATE = 0.15

export function calcVat(subtotal: number): number {
  return Math.round(subtotal * VAT_RATE * 100) / 100
}

export function calcTotal(subtotal: number): number {
  return Math.round((subtotal + calcVat(subtotal)) * 100) / 100
}
