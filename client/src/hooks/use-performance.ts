import { useEffect } from 'react';
import { PerformanceMonitor, MemoryOptimizer, PaginationOptimizer } from '@/lib/memory-optimization';

/**
 * Hook to monitor component performance and memory usage
 */
export function usePerformanceMonitor(componentName: string, enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;
    
    PerformanceMonitor.startMeasure(componentName);
    
    return () => {
      PerformanceMonitor.endMeasure(componentName);
    };
  }, [componentName, enabled]);
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
 */
export function useMemoryStats() {
  useEffect(() => {
    const isDev = process.env.NODE_ENV === 'development';
    if (!isDev) return;
    
    const interval = setInterval(() => {
      const stats = MemoryOptimizer.getMemoryStats();
      console.group('[Memory Stats]');
      console.log('Active Queries:', stats.activeQueries);
      console.log('Active Mutations:', stats.activeMutations);
      console.log('Estimated Cache Size:', `${(stats.cacheSize / 1024 / 1024).toFixed(2)}MB`);
      if (stats.memoryUsage) {
        console.log('Heap Size:', `${(stats.memoryUsage.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
      }
      console.groupEnd();
    }, 10000); // Every 10 seconds
    
    return () => clearInterval(interval);
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