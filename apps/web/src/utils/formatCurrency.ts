/**
 * Format amount with currency code (matching mockup design)
 * @param amount - Amount to format
 * @param currency - Currency code (default: KES)
 * @returns Formatted string like "KES 1,234.56"
 */
export function formatCurrency(amount: number, currency: string = 'KES'): string {
  return `${currency} ${amount.toLocaleString('en-KE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

