/**
 * Comprehensive LRU cache service with TTL support and memory management
 * Provides caching for analytics endpoints and Shopify object lookups
 */

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

interface CacheMetrics {
  hits: number;
  misses: number;
  size: number;
  maxSize: number;
  evictions: number;
}

export class LRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private accessOrder = new Map<string, number>();
  private maxSize: number;
  private defaultTTL: number;
  private accessCounter = 0;
  private metrics: CacheMetrics;

  constructor(maxSize = 1000, defaultTTL = 300000) { // 5 minutes default TTL
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
    this.metrics = {
      hits: 0,
      misses: 0,
      size: 0,
      maxSize,
      evictions: 0
    };

    // Cleanup expired entries every 2 minutes
    setInterval(() => this.cleanupExpired(), 120000);
  }

  /**
   * Get cached value if valid and not expired
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.metrics.misses++;
      return undefined;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      this.metrics.misses++;
      this.metrics.size--;
      return undefined;
    }

    // Update access tracking for LRU
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.accessOrder.set(key, ++this.accessCounter);
    
    this.metrics.hits++;
    return entry.value;
  }

  /**
   * Set cache value with optional TTL
   */
  set(key: string, value: T, ttl?: number): void {
    const effectiveTTL = ttl || this.defaultTTL;
    
    // If at max capacity and this is a new key, evict LRU
    if (!this.cache.has(key) && this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      ttl: effectiveTTL,
      accessCount: 1,
      lastAccessed: Date.now()
    };

    const wasNewKey = !this.cache.has(key);
    this.cache.set(key, entry);
    this.accessOrder.set(key, ++this.accessCounter);
    
    if (wasNewKey) {
      this.metrics.size++;
    }
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Delete specific key
   */
  delete(key: string): boolean {
    const existed = this.cache.delete(key);
    if (existed) {
      this.accessOrder.delete(key);
      this.metrics.size--;
    }
    return existed;
  }

  /**
   * Delete all keys matching pattern (prefix)
   */
  deletePattern(pattern: string): number {
    let deleted = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(pattern)) {
        this.delete(key);
        deleted++;
      }
    }
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
    this.metrics.size = 0;
    this.metrics.evictions = 0;
  }

  /**
   * Get cache metrics for monitoring
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Get cache hit rate as percentage
   */
  getHitRate(): number {
    const total = this.metrics.hits + this.metrics.misses;
    return total > 0 ? (this.metrics.hits / total) * 100 : 0;
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let lruKey: string | undefined;
    let oldestAccess = Infinity;

    for (const [key, accessOrder] of this.accessOrder.entries()) {
      if (accessOrder < oldestAccess) {
        oldestAccess = accessOrder;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      this.accessOrder.delete(lruKey);
      this.metrics.evictions++;
      this.metrics.size--;
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      this.metrics.size--;
    });

    if (expiredKeys.length > 0) {
      console.log(`Cache cleanup: removed ${expiredKeys.length} expired entries`);
    }
  }
}

/**
 * Cache key generators for different types of data
 */
export class CacheKeyBuilder {
  /**
   * Generate cache key for analytics data
   */
  static analytics(
    storeId: string, 
    vendorId?: string, 
    startDate?: Date, 
    endDate?: Date
  ): string {
    const parts = ['analytics', storeId];
    
    if (vendorId) parts.push(`vendor:${vendorId}`);
    if (startDate) parts.push(`start:${startDate.toISOString().split('T')[0]}`);
    if (endDate) parts.push(`end:${endDate.toISOString().split('T')[0]}`);
    
    return parts.join(':');
  }

  /**
   * Generate cache key for vendor data
   */
  static vendors(storeId: string): string {
    return `vendors:${storeId}`;
  }

  /**
   * Generate cache key for vendor summary
   */
  static vendorSummary(
    storeId: string, 
    vendorId?: string, 
    startDate?: Date, 
    endDate?: Date
  ): string {
    const parts = ['summary', storeId];
    
    if (vendorId) parts.push(`vendor:${vendorId}`);
    if (startDate) parts.push(`start:${startDate.toISOString().split('T')[0]}`);
    if (endDate) parts.push(`end:${endDate.toISOString().split('T')[0]}`);
    
    return parts.join(':');
  }

  /**
   * Generate cache key for top products
   */
  static topProducts(storeId: string, vendorId?: string, limit = 10): string {
    const parts = ['products', storeId, `limit:${limit}`];
    if (vendorId) parts.push(`vendor:${vendorId}`);
    return parts.join(':');
  }

  /**
   * Generate cache key for landing pages
   */
  static landingPages(storeId: string, vendorId?: string, limit = 10): string {
    const parts = ['pages', storeId, `limit:${limit}`];
    if (vendorId) parts.push(`vendor:${vendorId}`);
    return parts.join(':');
  }

  /**
   * Generate cache key for Shopify object lookups during sync
   */
  static shopifyLookup(storeId: string, objectType: string, identifier: string): string {
    return `shopify:${storeId}:${objectType}:${identifier}`;
  }

  /**
   * Generate pattern for cache invalidation
   */
  static storePattern(storeId: string): string {
    return `${storeId}:`;
  }

  /**
   * Generate pattern for vendor-specific cache invalidation
   */
  static vendorPattern(storeId: string, vendorId: string): string {
    return `${storeId}:vendor:${vendorId}`;
  }
}

/**
 * Main cache service with different cache instances for different data types
 */
export class CacheService {
  // Analytics cache with longer TTL (15 minutes)
  private analyticsCache = new LRUCache<any>(2000, 900000);
  
  // Vendor/object cache with medium TTL (10 minutes)  
  private objectCache = new LRUCache<any>(1000, 600000);
  
  // Sync cache with shorter TTL (5 minutes) but larger capacity
  private syncCache = new LRUCache<any>(3000, 300000);

  /**
   * Analytics caching methods
   */
  getAnalytics(key: string): any {
    return this.analyticsCache.get(key);
  }

  setAnalytics(key: string, value: any, ttl?: number): void {
    this.analyticsCache.set(key, value, ttl);
  }

  /**
   * Object caching methods (vendors, products, etc.)
   */
  getObject<T>(key: string): T | undefined {
    return this.objectCache.get(key);
  }

  setObject<T>(key: string, value: T, ttl?: number): void {
    this.objectCache.set(key, value, ttl);
  }

  /**
   * Sync operation caching methods
   */
  getSync<T>(key: string): T | undefined {
    return this.syncCache.get(key);
  }

  setSync<T>(key: string, value: T, ttl?: number): void {
    this.syncCache.set(key, value, ttl);
  }

  /**
   * Cache invalidation methods
   */
  invalidateStore(storeId: string): void {
    const pattern = CacheKeyBuilder.storePattern(storeId);
    
    const analyticsDeleted = this.analyticsCache.deletePattern(pattern);
    const objectDeleted = this.objectCache.deletePattern(pattern);
    const syncDeleted = this.syncCache.deletePattern(pattern);
    
    console.log(`Cache invalidation for store ${storeId}: ${analyticsDeleted + objectDeleted + syncDeleted} entries removed`);
  }

  invalidateVendor(storeId: string, vendorId: string): void {
    const pattern = CacheKeyBuilder.vendorPattern(storeId, vendorId);
    
    const analyticsDeleted = this.analyticsCache.deletePattern(pattern);
    const objectDeleted = this.objectCache.deletePattern(pattern);
    const syncDeleted = this.syncCache.deletePattern(pattern);
    
    console.log(`Cache invalidation for vendor ${vendorId}: ${analyticsDeleted + objectDeleted + syncDeleted} entries removed`);
  }

  invalidateAnalytics(storeId: string): void {
    const patterns = [
      `analytics:${storeId}`,
      `summary:${storeId}`, 
      `products:${storeId}`,
      `pages:${storeId}`
    ];
    
    let totalDeleted = 0;
    patterns.forEach(pattern => {
      totalDeleted += this.analyticsCache.deletePattern(pattern);
    });
    
    console.log(`Analytics cache invalidation for store ${storeId}: ${totalDeleted} entries removed`);
  }

  /**
   * Cache metrics and monitoring
   */
  getMetrics() {
    return {
      analytics: this.analyticsCache.getMetrics(),
      objects: this.objectCache.getMetrics(),
      sync: this.syncCache.getMetrics(),
      hitRates: {
        analytics: this.analyticsCache.getHitRate(),
        objects: this.objectCache.getHitRate(),
        sync: this.syncCache.getHitRate()
      }
    };
  }

  /**
   * Clear all caches (for debugging)
   */
  clearAll(): void {
    this.analyticsCache.clear();
    this.objectCache.clear();
    this.syncCache.clear();
    console.log('All caches cleared');
  }
}

// Singleton instance
export const cacheService = new CacheService();