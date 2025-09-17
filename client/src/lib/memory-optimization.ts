import { queryClient } from '@/lib/queryClient';

// Memory optimization utilities for large datasets
export class MemoryOptimizer {
  private static cleanupInterval: NodeJS.Timeout | null = null;
  private static memoryThreshold = 50 * 1024 * 1024; // 50MB threshold
  
  /**
   * Initialize memory optimization with automatic cleanup
   */
  static initialize() {
    // Set up automatic cache cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, 5 * 60 * 1000);

    // Add memory pressure detection
    if ('memory' in performance) {
      this.monitorMemoryUsage();
    }

    // Clean up on page visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.performCleanup();
      }
    });

    // Clean up before page unload
    window.addEventListener('beforeunload', () => {
      this.performCleanup();
      this.cleanup();
    });
  }

  /**
   * Clean up React Query cache and remove stale data
   */
  static performCleanup() {
    console.log('[MemoryOptimizer] Performing cache cleanup...');
    
    // Remove queries older than 10 minutes
    queryClient.getQueryCache().getAll().forEach(query => {
      const lastUpdated = query.state.dataUpdatedAt;
      const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
      
      if (lastUpdated < tenMinutesAgo) {
        queryClient.removeQueries({ queryKey: query.queryKey });
      }
    });

    // Clear mutation cache
    queryClient.getMutationCache().clear();

    // Force garbage collection if available (dev environment)
    if (typeof window !== 'undefined' && 'gc' in window) {
      try {
        (window as any).gc();
      } catch (e) {
        // Ignore if not available
      }
    }

    console.log('[MemoryOptimizer] Cache cleanup completed');
  }

  /**
   * Monitor memory usage and trigger cleanup when needed
   */
  private static monitorMemoryUsage() {
    setInterval(() => {
      try {
        const memInfo = (performance as any).memory;
        if (memInfo && memInfo.usedJSHeapSize > this.memoryThreshold) {
          console.warn('[MemoryOptimizer] High memory usage detected, triggering cleanup');
          this.performCleanup();
        }
      } catch (e) {
        // Memory API not supported
      }
    }, 30000); // Check every 30 seconds
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

    console.log(`[MemoryOptimizer] Cleared ${dataType} cache`);
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
   */
  static startMeasure(name: string) {
    this.metrics[name] = {
      startTime: performance.now(),
      startMemory: this.getCurrentMemory()
    };
  }

  /**
   * End measurement and log results
   */
  static endMeasure(name: string) {
    if (!this.metrics[name]) return;

    const endTime = performance.now();
    const endMemory = this.getCurrentMemory();
    
    const duration = endTime - this.metrics[name].startTime;
    const memoryDelta = endMemory - this.metrics[name].startMemory;

    console.log(`[Performance] ${name}:`, {
      duration: `${duration.toFixed(2)}ms`,
      memoryDelta: memoryDelta ? `${(memoryDelta / 1024 / 1024).toFixed(2)}MB` : 'N/A'
    });

    delete this.metrics[name];
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
    // Monitor LCP
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      entries.forEach((entry: any) => {
        console.log('[WebVitals] LCP:', entry.startTime);
      });
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // Monitor FID
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      entries.forEach((entry: any) => {
        console.log('[WebVitals] FID:', entry.processingStart - entry.startTime);
      });
    }).observe({ entryTypes: ['first-input'] });

    // Monitor CLS
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      let clsValue = 0;
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      });
      if (clsValue > 0) {
        console.log('[WebVitals] CLS:', clsValue);
      }
    }).observe({ entryTypes: ['layout-shift'] });
  }
}