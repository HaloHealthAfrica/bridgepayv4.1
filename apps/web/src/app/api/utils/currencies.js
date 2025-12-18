/**
 * Currency Utilities
 * Support for East African currencies
 */

/**
 * Supported currencies in the platform
 */
export const SUPPORTED_CURRENCIES = ['KES', 'UGX', 'TZS', 'RWF', 'ETB'];

/**
 * Default currency
 */
export const DEFAULT_CURRENCY = 'KES';

/**
 * Currency names mapping
 */
export const CURRENCY_NAMES = {
  KES: 'Kenyan Shilling',
  UGX: 'Ugandan Shilling',
  TZS: 'Tanzanian Shilling',
  RWF: 'Rwandan Franc',
  ETB: 'Ethiopian Birr',
};

/**
 * Currency symbols mapping
 */
export const CURRENCY_SYMBOLS = {
  KES: 'KSh',
  UGX: 'USh',
  TZS: 'TSh',
  RWF: 'RF',
  ETB: 'Br',
};

/**
 * Validate if a currency code is supported
 * @param {string} currency - Currency code to validate
 * @returns {boolean}
 */
export function isValidCurrency(currency) {
  if (!currency || typeof currency !== 'string') {
    return false;
  }
  return SUPPORTED_CURRENCIES.includes(currency.toUpperCase());
}

/**
 * Normalize currency code (uppercase, trim)
 * @param {string} currency - Currency code to normalize
 * @returns {string} Normalized currency code or DEFAULT_CURRENCY
 */
export function normalizeCurrency(currency) {
  if (!currency || typeof currency !== 'string') {
    return DEFAULT_CURRENCY;
  }
  const normalized = currency.toUpperCase().trim();
  return isValidCurrency(normalized) ? normalized : DEFAULT_CURRENCY;
}

/**
 * Get currency name
 * @param {string} currency - Currency code
 * @returns {string} Currency name
 */
export function getCurrencyName(currency) {
  const normalized = normalizeCurrency(currency);
  return CURRENCY_NAMES[normalized] || normalized;
}

/**
 * Get currency symbol
 * @param {string} currency - Currency code
 * @returns {string} Currency symbol
 */
export function getCurrencySymbol(currency) {
  const normalized = normalizeCurrency(currency);
  return CURRENCY_SYMBOLS[normalized] || normalized;
}

/**
 * Format amount with currency
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code
 * @param {object} options - Formatting options
 * @returns {string} Formatted amount
 */
export function formatCurrency(amount, currency = DEFAULT_CURRENCY, options = {}) {
  const {
    showSymbol = true,
    decimals = 2,
    locale = 'en-KE',
  } = options;

  const normalized = normalizeCurrency(currency);
  const symbol = showSymbol ? getCurrencySymbol(normalized) : '';
  
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);

  return symbol ? `${symbol} ${formatted}` : formatted;
}

