import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency, formatCompactCurrency, getCurrencySymbol, CurrencyCode } from '@/lib/currency';

interface CurrencyContextType {
  currencyCode: CurrencyCode;
  setCurrencyCode: (code: CurrencyCode) => void;
  format: (value: number, options?: { compact?: boolean; showCode?: boolean }) => string;
  symbol: string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currencyCode, setCurrencyCode] = useState<CurrencyCode>('USD');
  
  // Fetch store settings to get base currency
  const { data: storeSettings } = useQuery({
    queryKey: ['/api/stores/current/settings'],
    retry: 1,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
  
  // Update currency when store settings load
  useEffect(() => {
    if (storeSettings?.currency) {
      setCurrencyCode(storeSettings.currency);
    } else {
      // Check if we're in demo mode or have a store with currency info
      const storedCurrency = localStorage.getItem('app_currency');
      if (storedCurrency) {
        setCurrencyCode(storedCurrency as CurrencyCode);
      }
    }
  }, [storeSettings]);
  
  // Save currency preference to localStorage
  useEffect(() => {
    localStorage.setItem('app_currency', currencyCode);
  }, [currencyCode]);
  
  const format = (value: number, options?: { compact?: boolean; showCode?: boolean }) => {
    if (options?.compact) {
      return formatCompactCurrency(value, currencyCode);
    }
    return formatCurrency(value, currencyCode, { showCode: options?.showCode });
  };
  
  const symbol = getCurrencySymbol(currencyCode);
  
  const contextValue: CurrencyContextType = {
    currencyCode,
    setCurrencyCode,
    format,
    symbol,
  };
  
  return (
    <CurrencyContext.Provider value={contextValue}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}