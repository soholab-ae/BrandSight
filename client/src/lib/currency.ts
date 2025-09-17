// Currency utility functions
export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'JPY' | 'CNY' | 'INR' | 'AED' | 'SGD' | string;

export interface CurrencyInfo {
  code: CurrencyCode;
  symbol: string;
  position: 'before' | 'after';
  decimalPlaces: number;
  thousandsSeparator: string;
  decimalSeparator: string;
}

// Currency configuration map
export const currencyConfig: Record<string, CurrencyInfo> = {
  USD: { code: 'USD', symbol: '$', position: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.' },
  EUR: { code: 'EUR', symbol: '€', position: 'before', decimalPlaces: 2, thousandsSeparator: '.', decimalSeparator: ',' },
  GBP: { code: 'GBP', symbol: '£', position: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.' },
  CAD: { code: 'CAD', symbol: 'C$', position: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.' },
  AUD: { code: 'AUD', symbol: 'A$', position: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.' },
  JPY: { code: 'JPY', symbol: '¥', position: 'before', decimalPlaces: 0, thousandsSeparator: ',', decimalSeparator: '.' },
  CNY: { code: 'CNY', symbol: '¥', position: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.' },
  INR: { code: 'INR', symbol: '₹', position: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.' },
  AED: { code: 'AED', symbol: 'د.إ', position: 'after', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.' },
  SGD: { code: 'SGD', symbol: 'S$', position: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.' },
};

// Get currency info with fallback to USD
export function getCurrencyInfo(code?: string): CurrencyInfo {
  if (!code) return currencyConfig.USD;
  return currencyConfig[code.toUpperCase()] || currencyConfig.USD;
}

// Format currency value
export function formatCurrency(
  value: number, 
  currencyCode?: string,
  options?: {
    showCode?: boolean;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  }
): string {
  const currency = getCurrencyInfo(currencyCode);
  
  // Use browser's Intl.NumberFormat for proper localization
  try {
    const formatter = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency.code,
      minimumFractionDigits: options?.minimumFractionDigits ?? currency.decimalPlaces,
      maximumFractionDigits: options?.maximumFractionDigits ?? currency.decimalPlaces,
    });
    
    const formatted = formatter.format(value);
    
    // Optionally append currency code
    if (options?.showCode) {
      return `${formatted} ${currency.code}`;
    }
    
    return formatted;
  } catch (error) {
    // Fallback formatting if Intl.NumberFormat fails
    const formattedValue = value.toFixed(currency.decimalPlaces);
    const parts = formattedValue.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, currency.thousandsSeparator);
    const result = parts.join(currency.decimalSeparator);
    
    if (currency.position === 'before') {
      return `${currency.symbol}${result}`;
    } else {
      return `${result} ${currency.symbol}`;
    }
  }
}

// Format large numbers with abbreviations
export function formatCompactCurrency(value: number, currencyCode?: string): string {
  const currency = getCurrencyInfo(currencyCode);
  
  if (value >= 1000000) {
    return formatCurrency(value / 1000000, currencyCode, { maximumFractionDigits: 1 }) + 'M';
  } else if (value >= 1000) {
    return formatCurrency(value / 1000, currencyCode, { maximumFractionDigits: 1 }) + 'K';
  } else {
    return formatCurrency(value, currencyCode);
  }
}

// Get currency symbol only
export function getCurrencySymbol(currencyCode?: string): string {
  return getCurrencyInfo(currencyCode).symbol;
}