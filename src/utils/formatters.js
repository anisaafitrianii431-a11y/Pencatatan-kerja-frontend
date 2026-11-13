const CURRENCY_FORMATTER = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

/**
 * Format numeric IDR currency for worker UI display.
 */
export function formatCurrency(value) {
  if (value == null || value === '') return '—'
  const numeric = Number(value)
  return Number.isNaN(numeric) ? '—' : CURRENCY_FORMATTER.format(numeric)
}

