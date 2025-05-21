/**
 * Format a number as Indian Rupees
 * @param amount - The amount to format
 * @param minimumFractionDigits - Minimum number of decimal places (default: 0)
 * @param maximumFractionDigits - Maximum number of decimal places (default: 0)
 * @returns Formatted currency string
 */
export const formatCurrency = (
  amount: number, 
  minimumFractionDigits = 0, 
  maximumFractionDigits = 0
): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits,
    maximumFractionDigits
  }).format(amount);
}; 