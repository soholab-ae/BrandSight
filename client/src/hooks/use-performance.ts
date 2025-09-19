import { useEffect } from 'react';
import { PerformanceMonitor, MemoryOptimizer, PaginationOptimizer } from '@/lib/memory-optimization';

/**
 * Hook to monitor component performance and memory usage
 * DISABLED - This was causing runaway performance monitoring every 3 seconds
 */
export function usePerformanceMonitor(componentName: string, enabled: boolean = false) {
  useEffect(() => {
    // COMPLETELY DISABLED - Performance monitoring was causing console spam every 3 seconds
    // All console logging and performance measurement removed to fix critical issue
    return;
  }, []); // Remove dependencies to prevent re-runs
}

/**
 * Hook to get optimal pagination settings based on component type
 */
export function useOptimalPagination(componentType: 'table' | 'cards' | 'list') {
  const optimalPageSize = PaginationOptimizer.getOptimalPageSize(componentType);
  
  return {
    pageSize: optimalPageSize,
    shouldPreloadNextPage: PaginationOptimizer.shouldPreloadNextPage
  };
}

/**
 * Hook to monitor and display memory statistics (dev mode)
 * DISABLED - This was contributing to performance issues
 */
export function useMemoryStats() {
  useEffect(() => {
    // Memory stats monitoring disabled to fix performance issues
    // The frequent console logging was contributing to blocking operations
    return;
  }, []);
}

/**
 * Hook to optimize large dataset rendering
 */
export function useDatasetOptimization() {
  return {
    clearCache: (dataType: 'vendors' | 'products' | 'analytics' | 'exports') => {
      MemoryOptimizer.clearDataTypeCache(dataType);
    },
    getMemoryStats: () => MemoryOptimizer.getMemoryStats(),
    performCleanup: () => MemoryOptimizer.performCleanup(),
  };
}