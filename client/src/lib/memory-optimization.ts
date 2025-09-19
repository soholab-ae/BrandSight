import { queryClient } from '@/lib/queryClient';

// Memory optimization utilities for large datasets
export class MemoryOptimizer {
  private static cleanupInterval: NodeJS.Timeout | null = null;
  private static memoryThreshold = 50 * 1024 * 1024; // 50MB threshold
  
  /**
   * Initialize memory optimization with automatic cleanup
   * OPTIMIZED - Reduced frequency to prevent performance issues
   */
  static initialize() {
    // Only initialize once
    if (this.cleanupInterval) {
      return;
    }

    // Reduced frequency: cleanup every 15 minutes instead of 5
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, 15 * 60 * 1000);

    // Disabled memory pressure detection - was causing blocking operations
    // if ('memory' in performance) {
    //   this.monitorMemoryUsage();
    // }

    // Keep essential cleanup events only
    window.addEventListener('beforeunload', () => {
      this.performCleanup();
      this.cleanup();
    });
  }

  /**
   * Clean up React Query cache and remove stale data
   * OPTIMIZED - Reduced frequency and scope to prevent blocking
   */
  static performCleanup() {
    // Console logging completely disabled to prevent console spam
    
    // Less aggressive cleanup - only remove queries older than 30 minutes
    const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
    
    queryClient.getQueryCache().getAll().forEach(query => {
      const lastUpdated = query.state.dataUpdatedAt;
      
      if (lastUpdated < thirtyMinutesAgo) {
        queryClient.removeQueries({ queryKey: query.queryKey });
      }
    });

    // Only clear mutation cache if there are many mutations
    const mutations = queryClient.getMutationCache().getAll();
    if (mutations.length > 10) {
      queryClient.getMutationCache().clear();
    }

    // Remove forced garbage collection - was causing blocking
    
    // Console logging completely disabled to prevent console spam
  }

  /**
   * Monitor memory usage and trigger cleanup when needed
   * DISABLED - This was causing performance issues with frequent checks
   */
  private static monitorMemoryUsage() {
    // Disabled to fix performance issues - was running every 30 seconds
    // and triggering frequent cleanups that blocked the UI
    return;
  }

  /**
   * Optimize query cache for large datasets
   */
  static optimizeQueryCache() {
    queryClient.setDefaultOptions({
      queries: {
        // Reduce default stale time for large datasets
        staleTime: 2 * 60 * 1000, // 2 minutes
        // Reduce cache time to prevent memory buildup
        gcTime: 5 * 60 * 1000, // 5 minutes (previously cacheTime)
        // Limit retries for failed large data requests
        retry: 2,
        // Don't refetch on window focus for heavy queries
        refetchOnWindowFocus: false,
      },
      mutations: {
        // Clear failed mutations quickly
        gcTime: 0,
      },
    });
  }

  /**
   * Clear cache for specific data types
   */
  static clearDataTypeCache(dataType: 'vendors' | 'products' | 'analytics' | 'exports') {
    const patterns = {
      vendors: ['/api/vendors', '/api/vendor-performance'],
      products: ['/api/products', '/api/top-products'],
      analytics: ['/api/analytics', '/api/dashboard-metrics'],
      exports: ['/api/export']
    };

    patterns[dataType].forEach(pattern => {
      queryClient.removeQueries({ 
        queryKey: [pattern], 
        exact: false 
      });
    });

    // Console logging disabled to prevent spam
  }

  /**
   * Cleanup on app termination
   */
  static cleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get current memory usage stats
   */
  static getMemoryStats() {
    const queryCache = queryClient.getQueryCache();
    const mutationCache = queryClient.getMutationCache();
    
    const stats = {
      activeQueries: queryCache.getAll().length,
      activeMutations: mutationCache.getAll().length,
      memoryUsage: null as any,
      cacheSize: this.estimateCacheSize()
    };

    // Add memory info if available
    try {
      if ('memory' in performance) {
        stats.memoryUsage = (performance as any).memory;
      }
    } catch (e) {
      // Not supported
    }

    return stats;
  }

  /**
   * Estimate cache size (rough calculation)
   */
  private static estimateCacheSize(): number {
    const queries = queryClient.getQueryCache().getAll();
    let estimatedSize = 0;
    
    queries.forEach(query => {
      if (query.state.data) {
        // Rough estimate: JSON.stringify length as proxy for memory usage
        try {
          estimatedSize += JSON.stringify(query.state.data).length;
        } catch (e) {
          // Skip circular references
        }
      }
    });

    return estimatedSize;
  }
}

// Pagination utilities for large datasets
export class PaginationOptimizer {
  /**
   * Get optimal page size based on component type and viewport
   */
  static getOptimalPageSize(componentType: 'table' | 'cards' | 'list'): number {
    const viewportHeight = window.innerHeight;
    
    const itemHeights = {
      table: 73, // Height per table row
      cards: 200, // Height per card
      list: 60   // Height per list item
    };

    const headerFooterHeight = 200; // Approximate header/footer space
    const availableHeight = viewportHeight - headerFooterHeight;
    const itemsPerScreen = Math.floor(availableHeight / itemHeights[componentType]);
    
    // Return 2-3 screens worth of items for smooth scrolling
    return Math.max(20, Math.min(100, itemsPerScreen * 3));
  }

  /**
   * Preload next page when user is near bottom
   */
  static shouldPreloadNextPage(
    scrollPosition: number, 
    scrollHeight: number, 
    clientHeight: number,
    threshold: number = 0.8
  ): boolean {
    const scrollPercentage = (scrollPosition + clientHeight) / scrollHeight;
    return scrollPercentage > threshold;
  }
}

// Performance monitoring utilities
export class PerformanceMonitor {
  private static metrics: any = {};

  /**
   * Start measuring performance for a component
   * COMPLETELY DISABLED - This was causing 62+ second loading times
   */
  static startMeasure(name: string) {
    // Completely disabled to fix critical performance issue
    return;
  }

  /**
   * End measurement and log results
   * COMPLETELY DISABLED - This was causing critical performance issues
   */
  static endMeasure(name: string) {
    // Completely disabled to fix 62+ second loading times
    // The frequent console.log calls were causing significant blocking operations
    return;
  }

  /**
   * Get current memory usage
   */
  private static getCurrentMemory(): number {
    try {
      return (performance as any).memory?.usedJSHeapSize || 0;
    } catch (e) {
      return 0;
    }
  }

  /**
   * Monitor largest contentful paint and other Core Web Vitals
   */
  static monitorWebVitals() {
    // COMPLETELY DISABLED - All Web Vitals monitoring and console logging disabled to prevent spam
    // This was contributing to console noise and performance monitoring issues
    return;
  }
}