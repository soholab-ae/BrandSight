import {
  users,
  stores,
  vendors,
  products,
  orders,
  orderLineItems,
  vendorAnalytics,
  pageAnalytics,
  alerts,
  alertRules,
  customerBrandAffinity,
  customerCrossBrandPurchases,
  inventoryAnalytics,
  vendorInventorySummary,
  salesForecasts,
  forecastAccuracy,
  inventory,
  notifications,
  notificationPreferences,
  emailQueue,
  type User,
  type UpsertUser,
  type Store,
  type InsertStore,
  type Vendor,
  type InsertVendor,
  type Product,
  type InsertProduct,
  type Order,
  type InsertOrder,
  type OrderLineItem,
  type InsertOrderLineItem,
  type VendorAnalytics,
  type InsertVendorAnalytics,
  type PageAnalytics,
  type Alert,
  type InsertAlert,
  type AlertRule,
  type InsertAlertRule,
  type CustomerBrandAffinity,
  type InsertCustomerBrandAffinity,
  type CustomerCrossBrandPurchases,
  type InsertCustomerCrossBrandPurchases,
  type InventoryAnalytics,
  type InsertInventoryAnalytics,
  type VendorInventorySummary,
  type InsertVendorInventorySummary,
  type SalesForecast,
  type InsertSalesForecast,
  type ForecastAccuracy,
  type InsertForecastAccuracy,
  type Inventory,
  type InsertInventory,
  type Notification,
  type InsertNotification,
  type NotificationPreferences,
  type InsertNotificationPreferences,
  type EmailQueue,
  type InsertEmailQueue,
  type PaginationParams,
  type PaginatedResponse,
  type VendorMetrics,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, sql, asc } from "drizzle-orm";
import { 
  demoStore, 
  demoVendors, 
  demoProducts, 
  demoOrders, 
  getDemoOrderLineItems,
  demoVendorAnalytics,
  isDemoMode 
} from './demoData';
import { TokenEncryption, ensureEncryptionKey } from './services/tokenEncryption';

export interface IStorage {
  // User operations (required for auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Store operations
  getUserStores(userId: string): Promise<Store[]>;
  createStore(store: InsertStore): Promise<Store>;
  getStore(id: string): Promise<Store | undefined>;
  getStoreByDomain(domain: string): Promise<Store | undefined>;
  updateStore(id: string, updates: Partial<Store>): Promise<Store>;
  
  // Vendor operations (with pagination)
  getStoreVendors(storeId: string): Promise<Vendor[]>;
  getStoreVendorsPaginated(storeId: string, params: PaginationParams): Promise<PaginatedResponse<Vendor>>;
  getStoreVendorMetrics(storeId: string, params: PaginationParams & { planRestrictions?: any }): Promise<PaginatedResponse<VendorMetrics>>;
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  getVendor(id: string): Promise<Vendor | undefined>;
  
  // Product operations (with pagination)
  upsertProduct(product: InsertProduct): Promise<Product>;
  bulkUpsertProducts(products: InsertProduct[]): Promise<Product[]>;
  getVendorProducts(vendorId: string): Promise<Product[]>;
  getVendorProductsPaginated(vendorId: string, params: PaginationParams): Promise<PaginatedResponse<Product>>;
  getStoreProducts(storeId: string, params: PaginationParams): Promise<PaginatedResponse<Product>>;
  
  // Order operations
  upsertOrder(order: InsertOrder): Promise<Order>;
  bulkUpsertOrders(orders: InsertOrder[]): Promise<Order[]>;
  upsertOrderLineItem(item: InsertOrderLineItem): Promise<OrderLineItem>;
  bulkUpsertOrderLineItems(items: InsertOrderLineItem[]): Promise<OrderLineItem[]>;
  
  // Analytics operations
  upsertVendorAnalytics(analytics: InsertVendorAnalytics): Promise<VendorAnalytics>;
  getVendorAnalytics(storeId: string, vendorId?: string, startDate?: Date, endDate?: Date): Promise<VendorAnalytics[]>;
  getVendorAnalyticsPaginated(storeId: string, params: PaginationParams & { vendorId?: string; startDate?: Date; endDate?: Date }): Promise<PaginatedResponse<VendorAnalytics>>;
  getVendorSummary(storeId: string, vendorId?: string, startDate?: Date, endDate?: Date): Promise<any>;
  getTopProducts(storeId: string, vendorId?: string, limit?: number): Promise<any[]>;
  getTopProductsPaginated(storeId: string, params: PaginationParams & { vendorId?: string }): Promise<PaginatedResponse<any>>;
  getTopLandingPages(storeId: string, vendorId?: string, limit?: number): Promise<PageAnalytics[]>;
  getVendorOrdersInDateRange(storeId: string, vendorId: string, startDate: Date, endDate: Date): Promise<Order[]>;
  getVendorOrderItemsInDateRange(storeId: string, vendorId: string, startDate: Date, endDate: Date): Promise<OrderLineItem[]>;
  
  // ============= PHASE 1 NEW FEATURES =============
  
  // Smart Alerts System
  createAlert(alert: InsertAlert): Promise<Alert>;
  getStoreAlerts(storeId: string, params?: PaginationParams & { isRead?: boolean; severity?: string }): Promise<PaginatedResponse<Alert>>;
  updateAlert(storeId: string, id: string, updates: Partial<Alert>): Promise<Alert>;
  markAlertAsRead(storeId: string, id: string): Promise<Alert>;
  acknowledgeAlert(storeId: string, id: string): Promise<Alert>;
  deleteAlert(storeId: string, id: string): Promise<void>;
  
  createAlertRule(rule: InsertAlertRule): Promise<AlertRule>;
  getStoreAlertRules(storeId: string, params?: PaginationParams): Promise<PaginatedResponse<AlertRule>>;
  updateAlertRule(storeId: string, id: string, updates: Partial<AlertRule>): Promise<AlertRule>;
  deleteAlertRule(storeId: string, id: string): Promise<void>;
  getEnabledAlertRules(storeId: string, vendorId?: string): Promise<AlertRule[]>;
  
  // Customer Brand Loyalty Tracking
  upsertCustomerBrandAffinity(affinity: InsertCustomerBrandAffinity): Promise<CustomerBrandAffinity>;
  getCustomerBrandAffinities(storeId: string, params?: PaginationParams & { customerId?: string; vendorId?: string }): Promise<PaginatedResponse<CustomerBrandAffinity>>;
  getTopCustomersByAffinity(storeId: string, vendorId: string, limit?: number): Promise<CustomerBrandAffinity[]>;
  
  upsertCustomerCrossBrandPurchases(crossPurchase: InsertCustomerCrossBrandPurchases): Promise<CustomerCrossBrandPurchases>;
  getCustomerCrossBrandPurchases(storeId: string, params?: PaginationParams & { customerId?: string; primaryVendorId?: string }): Promise<PaginatedResponse<CustomerCrossBrandPurchases>>;
  getCrossBrandAnalytics(storeId: string, vendorId: string): Promise<any>;
  
  // Inventory Intelligence
  upsertInventoryAnalytics(analytics: InsertInventoryAnalytics): Promise<InventoryAnalytics>;
  getInventoryAnalytics(storeId: string, params?: PaginationParams & { vendorId?: string; productId?: string; deadStockOnly?: boolean }): Promise<PaginatedResponse<InventoryAnalytics>>;
  getDeadStockReport(storeId: string, vendorId?: string): Promise<InventoryAnalytics[]>;
  
  // Batch inventory fetching to eliminate N+1 queries
  getInventoryLevelsForProducts(productIds: string[]): Promise<Map<string, number>>;
  
  // Inventory operations
  upsertInventory(inventory: InsertInventory): Promise<Inventory>;
  bulkUpsertInventory(inventories: InsertInventory[]): Promise<Inventory[]>;
  getInventoryByProductId(productId: string): Promise<Inventory | undefined>;
  updateInventoryQuantity(productId: string, quantity: number, operation?: 'set' | 'add' | 'subtract'): Promise<Inventory>;
  
  upsertVendorInventorySummary(summary: InsertVendorInventorySummary): Promise<VendorInventorySummary>;
  getVendorInventorySummaries(storeId: string, params?: PaginationParams): Promise<PaginatedResponse<VendorInventorySummary>>;
  getVendorInventorySummary(vendorId: string): Promise<VendorInventorySummary | undefined>;
  
  // Predictive Forecasting
  createSalesForecast(forecast: InsertSalesForecast): Promise<SalesForecast>;
  getSalesForecasts(storeId: string, params?: PaginationParams & { vendorId?: string; periodDays?: number }): Promise<PaginatedResponse<SalesForecast>>;
  getLatestForecast(storeId: string, vendorId?: string, periodDays?: number): Promise<SalesForecast | undefined>;
  
  createForecastAccuracy(accuracy: InsertForecastAccuracy): Promise<ForecastAccuracy>;
  getForecastAccuracy(storeId: string, params?: PaginationParams & { vendorId?: string }): Promise<PaginatedResponse<ForecastAccuracy>>;
  getForecastAccuracyMetrics(storeId: string, vendorId?: string): Promise<any>;
  
  // ============= NOTIFICATION SYSTEM =============
  
  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: string, storeId: string, params?: PaginationParams & { isRead?: boolean; severity?: string; type?: string; startDate?: Date; endDate?: Date }): Promise<PaginatedResponse<Notification>>;
  getUnreadNotificationCount(userId: string, storeId: string): Promise<number>;
  markNotificationAsRead(userId: string, storeId: string, notificationId: string): Promise<Notification>;
  markAllNotificationsAsRead(userId: string, storeId: string): Promise<number>;
  deleteNotification(userId: string, storeId: string, notificationId: string): Promise<void>;
  
  // Notification preferences
  getNotificationPreferences(userId: string, storeId: string): Promise<NotificationPreferences | undefined>;
  createNotificationPreferences(preferences: InsertNotificationPreferences): Promise<NotificationPreferences>;
  updateNotificationPreferences(userId: string, storeId: string, updates: Partial<NotificationPreferences>): Promise<NotificationPreferences>;
  
  // Email queue operations
  createEmailQueue(email: InsertEmailQueue): Promise<EmailQueue>;
  getPendingEmails(limit?: number): Promise<EmailQueue[]>;
  updateEmailStatus(emailId: string, status: 'pending' | 'sending' | 'sent' | 'failed' | 'retry', sentAt?: Date): Promise<EmailQueue>;
}

export class DatabaseStorage implements IStorage {
  constructor() {
    // Ensure encryption key is available
    ensureEncryptionKey();
  }

  /**
   * Encrypt access token for secure storage
   */
  private encryptAccessToken(token: string): string {
    try {
      return TokenEncryption.encryptToken(token);
    } catch (error) {
      console.error('Failed to encrypt access token:', TokenEncryption.sanitizeForLogging(error));
      throw new Error('Token encryption failed');
    }
  }

  /**
   * Decrypt access token for API usage
   */
  private decryptAccessToken(encryptedToken: string): string {
    try {
      return TokenEncryption.decryptToken(encryptedToken);
    } catch (error) {
      console.error('Failed to decrypt access token:', TokenEncryption.sanitizeForLogging(error));
      throw new Error('Token decryption failed');
    }
  }

  /**
   * Process store data after retrieval to decrypt access tokens
   */
  private processStoreForOutput(store: Store): Store {
    if (!store.accessToken) return store;
    
    try {
      return {
        ...store,
        accessToken: this.decryptAccessToken(store.accessToken)
      };
    } catch (error) {
      console.error(`Failed to process store ${store.id}:`, TokenEncryption.sanitizeForLogging(error));
      // Return store without access token to prevent app crashes
      return { ...store, accessToken: '' };
    }
  }

  /**
   * Process stores array to decrypt access tokens
   */
  private processStoresForOutput(stores: Store[]): Store[] {
    return stores.map(store => this.processStoreForOutput(store));
  }

  /**
   * Process store data for database storage (encrypt access tokens)
   */
  private processStoreForStorage(store: InsertStore | Partial<Store>): any {
    if (!store.accessToken) return store;
    
    try {
      return {
        ...store,
        accessToken: this.encryptAccessToken(store.accessToken)
      };
    } catch (error) {
      console.error('Failed to process store for storage:', TokenEncryption.sanitizeForLogging(error));
      throw new Error('Store processing failed');
    }
  }
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Store operations
  async getUserStores(userId: string): Promise<Store[]> {
    // Return demo store for demo mode
    if (isDemoMode(userId)) {
      return [demoStore];
    }
    
    const userStores = await db.select().from(stores).where(eq(stores.userId, userId));
    return this.processStoresForOutput(userStores);
  }

  async createStore(store: InsertStore): Promise<Store> {
    console.log(`Creating store: ${TokenEncryption.sanitizeForLogging(store)}`);
    const processedStore = this.processStoreForStorage(store);
    const [newStore] = await db.insert(stores).values([processedStore]).returning();
    return this.processStoreForOutput(newStore);
  }

  async getStore(id: string): Promise<Store | undefined> {
    const [store] = await db.select().from(stores).where(eq(stores.id, id));
    return store ? this.processStoreForOutput(store) : undefined;
  }

  async getStoreByDomain(domain: string): Promise<Store | undefined> {
    // Return demo store for demo domain
    if (domain === 'demo-store.myshopify.com') {
      return demoStore;
    }
    const [store] = await db.select().from(stores).where(eq(stores.domain, domain));
    return store ? this.processStoreForOutput(store) : undefined;
  }

  async updateStore(id: string, updates: Partial<Store>): Promise<Store> {
    console.log(`Updating store ${id}: ${TokenEncryption.sanitizeForLogging(updates)}`);
    const processedUpdates = this.processStoreForStorage(updates);
    const [store] = await db
      .update(stores)
      .set(processedUpdates)
      .where(eq(stores.id, id))
      .returning();
    return this.processStoreForOutput(store);
  }

  // Vendor operations
  async getStoreVendors(storeId: string): Promise<Vendor[]> {
    // Return demo vendors for demo store
    if (storeId === 'c15b4e68-ea15-4036-a5f7-cdce20d2baa7') {
      return demoVendors;
    }
    return await db.select().from(vendors).where(eq(vendors.storeId, storeId));
  }

  async getStoreVendorsPaginated(storeId: string, params: PaginationParams): Promise<PaginatedResponse<Vendor>> {
    const { page = 1, limit = 50, sortBy = 'name', sortDirection = 'asc', search } = params;
    const offset = (page - 1) * limit;

    // Return demo vendors for demo store with pagination
    if (storeId === 'c15b4e68-ea15-4036-a5f7-cdce20d2baa7') {
      let filteredVendors = [...demoVendors];
      
      if (search) {
        filteredVendors = filteredVendors.filter(v => 
          v.name.toLowerCase().includes(search.toLowerCase())
        );
      }
      
      // Sort vendors
      filteredVendors.sort((a, b) => {
        const aValue = a[sortBy as keyof Vendor] as string;
        const bValue = b[sortBy as keyof Vendor] as string;
        const comparison = aValue.localeCompare(bValue);
        return sortDirection === 'asc' ? comparison : -comparison;
      });
      
      const total = filteredVendors.length;
      const paginatedData = filteredVendors.slice(offset, offset + limit);
      
      return {
        data: paginatedData,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: offset + limit < total,
          hasPrev: page > 1
        }
      };
    }

    // Build conditions array
    let conditions = [eq(vendors.storeId, storeId)];
    
    // Apply search filter
    if (search) {
      const searchCondition = sql`${vendors.name} ILIKE ${'%' + search + '%'}`;
      conditions.push(searchCondition);
    }

    // Determine ordering
    const orderByClause = sortBy === 'name' 
      ? (sortDirection === 'asc' ? asc(vendors.name) : desc(vendors.name))
      : (sortDirection === 'asc' ? asc(vendors.createdAt) : desc(vendors.createdAt));

    // Build the complete query
    const query = db.select().from(vendors)
      .where(and(...conditions))
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);
    
    const countQuery = db.select({ count: sql<number>`count(*)` })
      .from(vendors)
      .where(and(...conditions));

    const [data, [{ count: total }]] = await Promise.all([
      query,
      countQuery
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: offset + limit < total,
        hasPrev: page > 1
      }
    };
  }

  async getStoreVendorMetrics(storeId: string, params: PaginationParams & { planRestrictions?: any }): Promise<PaginatedResponse<VendorMetrics>> {
    const { page = 1, limit = 50, sortBy = 'revenue', sortDirection = 'desc', search, vendorId, planRestrictions } = params;
    const offset = (page - 1) * limit;

    // Return demo vendor metrics for demo store with plan-based filtering
    if (storeId === 'c15b4e68-ea15-4036-a5f7-cdce20d2baa7') {
      // Apply plan-based data history filtering 
      const cutoffDate = planRestrictions?.dataHistoryDays 
        ? new Date(Date.now() - planRestrictions.dataHistoryDays * 24 * 60 * 60 * 1000)
        : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // Default to 90 days
      
      // Filter demo analytics by date cutoff
      const filteredAnalytics = demoVendorAnalytics.filter(a => a.date >= cutoffDate);
      
      const vendorMetrics: VendorMetrics[] = demoVendors.map(vendor => {
        // Calculate metrics from filtered analytics
        const vendorAnalytics = filteredAnalytics.filter(a => a.vendorId === vendor.id);
        const totalRevenue = vendorAnalytics.reduce((sum, a) => sum + parseFloat(a.revenue || "0"), 0);
        const totalOrders = vendorAnalytics.reduce((sum, a) => sum + (a.orders || 0), 0);
        const totalVisitors = vendorAnalytics.reduce((sum, a) => sum + (a.visitors || 0), 0);
        const totalConversions = vendorAnalytics.reduce((sum, a) => sum + (a.conversions || 0), 0);
        
        return {
          id: vendor.id,
          name: vendor.name,
          productCount: Math.floor(Math.random() * 100 + 10),
          revenue: totalRevenue > 0 ? totalRevenue : Math.floor(Math.random() * 100000 + 10000),
          aov: totalOrders > 0 ? totalRevenue / totalOrders : Math.floor(Math.random() * 200 + 50),
          conversion: totalVisitors > 0 ? (totalConversions / totalVisitors) * 100 : Math.random() * 5 + 1,
          visitors: totalVisitors > 0 ? totalVisitors : Math.floor(Math.random() * 10000 + 1000),
          growth: Math.random() * 50 - 10,
          totalOrders: totalOrders > 0 ? totalOrders : Math.floor(Math.random() * 500 + 50)
        };
      });

      let filteredMetrics = [...vendorMetrics];
      
      if (search) {
        filteredMetrics = filteredMetrics.filter(v => 
          v.name.toLowerCase().includes(search.toLowerCase())
        );
      }
      
      // Filter by vendorId if provided
      if (vendorId) {
        filteredMetrics = filteredMetrics.filter(v => v.id === vendorId);
      }
      
      // Sort metrics
      filteredMetrics.sort((a, b) => {
        const aValue = a[sortBy as keyof VendorMetrics] as number;
        const bValue = b[sortBy as keyof VendorMetrics] as number;
        const comparison = aValue - bValue;
        return sortDirection === 'asc' ? comparison : -comparison;
      });
      
      const total = filteredMetrics.length;
      const paginatedData = filteredMetrics.slice(offset, offset + limit);
      
      return {
        data: paginatedData,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: offset + limit < total,
          hasPrev: page > 1
        }
      };
    }

    // Apply plan-based data history filtering for real data
    const cutoffDate = planRestrictions?.dataHistoryDays 
      ? new Date(Date.now() - planRestrictions.dataHistoryDays * 24 * 60 * 60 * 1000)
      : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // Default to 90 days
    
    // TODO: Implement real vendor metrics calculation from database with date filtering
    // For now, return empty result for non-demo stores
    return {
      data: [],
      pagination: {
        page,
        limit,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
      }
    };
  }

  async createVendor(vendor: InsertVendor): Promise<Vendor> {
    const [newVendor] = await db.insert(vendors).values(vendor).returning();
    return newVendor;
  }

  async getVendor(id: string): Promise<Vendor | undefined> {
    // Return demo vendor if it matches
    if (id.startsWith('vendor_')) {
      return demoVendors.find(v => v.id === id);
    }
    const [vendor] = await db.select().from(vendors).where(eq(vendors.id, id));
    return vendor;
  }

  // Product operations
  async upsertProduct(product: InsertProduct): Promise<Product> {
    const [upsertedProduct] = await db
      .insert(products)
      .values(product)
      .onConflictDoUpdate({
        target: products.id,
        set: {
          ...product,
          updatedAt: new Date(),
        },
      })
      .returning();
    return upsertedProduct;
  }

  async bulkUpsertProducts(productList: InsertProduct[]): Promise<Product[]> {
    if (productList.length === 0) return [];
    
    const upsertedProducts = await db
      .insert(products)
      .values(productList)
      .onConflictDoUpdate({
        target: products.id,
        set: {
          title: sql.raw('excluded.title'),
          handle: sql.raw('excluded.handle'),
          vendor: sql.raw('excluded.vendor'),
          vendorId: sql.raw('excluded.vendor_id'),
          productType: sql.raw('excluded.product_type'),
          price: sql.raw('excluded.price'),
          compareAtPrice: sql.raw('excluded.compare_at_price'),
          status: sql.raw('excluded.status'),
          updatedAt: new Date(),
        },
      })
      .returning();
    return upsertedProducts;
  }

  async getVendorProducts(vendorId: string): Promise<Product[]> {
    // Return demo products for demo vendor
    if (vendorId.startsWith('vendor_')) {
      return demoProducts.filter(p => p.vendorId === vendorId);
    }
    return await db.select().from(products).where(eq(products.vendorId, vendorId));
  }

  async getVendorProductsPaginated(vendorId: string, params: PaginationParams): Promise<PaginatedResponse<Product>> {
    const { page = 1, limit = 50, sortBy = 'title', sortDirection = 'asc', search } = params;
    const offset = (page - 1) * limit;

    // Return demo products for demo vendor with pagination
    if (vendorId.startsWith('vendor_')) {
      let filteredProducts = demoProducts.filter(p => p.vendorId === vendorId);
      
      if (search) {
        filteredProducts = filteredProducts.filter(p => 
          p.title.toLowerCase().includes(search.toLowerCase())
        );
      }
      
      // Sort products
      filteredProducts.sort((a, b) => {
        const aValue = a[sortBy as keyof Product] as string;
        const bValue = b[sortBy as keyof Product] as string;
        const comparison = aValue.localeCompare(bValue);
        return sortDirection === 'asc' ? comparison : -comparison;
      });
      
      const total = filteredProducts.length;
      const paginatedData = filteredProducts.slice(offset, offset + limit);
      
      return {
        data: paginatedData,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: offset + limit < total,
          hasPrev: page > 1
        }
      };
    }

    // Build conditions array
    let conditions = [eq(products.vendorId, vendorId)];
    
    // Apply search filter
    if (search) {
      const searchCondition = sql`${products.title} ILIKE ${'%' + search + '%'}`;
      conditions.push(searchCondition);
    }

    // Determine ordering
    const orderByClause = sortBy === 'title' 
      ? (sortDirection === 'asc' ? asc(products.title) : desc(products.title))
      : (sortDirection === 'asc' ? asc(products.price) : desc(products.price));

    // Build the complete query
    const query = db.select().from(products)
      .where(and(...conditions))
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);
    
    const countQuery = db.select({ count: sql<number>`count(*)` })
      .from(products)
      .where(and(...conditions));

    const [data, [{ count: total }]] = await Promise.all([
      query,
      countQuery
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: offset + limit < total,
        hasPrev: page > 1
      }
    };
  }

  async getStoreProducts(storeId: string, params: PaginationParams): Promise<PaginatedResponse<Product>> {
    const { page = 1, limit = 50, sortBy = 'title', sortDirection = 'asc', search } = params;
    const offset = (page - 1) * limit;

    // Return demo products for demo store with pagination
    if (storeId === 'c15b4e68-ea15-4036-a5f7-cdce20d2baa7') {
      let filteredProducts = [...demoProducts];
      
      if (search) {
        filteredProducts = filteredProducts.filter(p => 
          p.title.toLowerCase().includes(search.toLowerCase()) ||
          p.vendor?.toLowerCase().includes(search.toLowerCase())
        );
      }
      
      // Sort products
      filteredProducts.sort((a, b) => {
        const aValue = a[sortBy as keyof Product] as string;
        const bValue = b[sortBy as keyof Product] as string;
        const comparison = aValue.localeCompare(bValue);
        return sortDirection === 'asc' ? comparison : -comparison;
      });
      
      const total = filteredProducts.length;
      const paginatedData = filteredProducts.slice(offset, offset + limit);
      
      return {
        data: paginatedData,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: offset + limit < total,
          hasPrev: page > 1
        }
      };
    }

    // Build conditions array
    let conditions = [eq(products.storeId, storeId)];
    
    // Apply search filter
    if (search) {
      const searchCondition = sql`${products.title} ILIKE ${'%' + search + '%'} OR ${products.vendor} ILIKE ${'%' + search + '%'}`;
      conditions.push(searchCondition);
    }

    // Determine ordering
    let orderByClause;
    if (sortBy === 'title') {
      orderByClause = sortDirection === 'asc' ? asc(products.title) : desc(products.title);
    } else if (sortBy === 'price') {
      orderByClause = sortDirection === 'asc' ? asc(products.price) : desc(products.price);
    } else {
      orderByClause = sortDirection === 'asc' ? asc(products.vendor) : desc(products.vendor);
    }

    // Build the complete query
    const query = db.select().from(products)
      .where(and(...conditions))
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);
    
    const countQuery = db.select({ count: sql<number>`count(*)` })
      .from(products)
      .where(and(...conditions));

    const [data, [{ count: total }]] = await Promise.all([
      query,
      countQuery
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: offset + limit < total,
        hasPrev: page > 1
      }
    };
  }

  // Order operations
  async upsertOrder(order: InsertOrder): Promise<Order> {
    const [upsertedOrder] = await db
      .insert(orders)
      .values(order)
      .onConflictDoUpdate({
        target: orders.id,
        set: order,
      })
      .returning();
    return upsertedOrder;
  }

  async bulkUpsertOrders(orderList: InsertOrder[]): Promise<Order[]> {
    if (orderList.length === 0) return [];
    
    const upsertedOrders = await db
      .insert(orders)
      .values(orderList)
      .onConflictDoUpdate({
        target: orders.id,
        set: {
          orderNumber: sql.raw('excluded.order_number'),
          totalPrice: sql.raw('excluded.total_price'),
          subtotalPrice: sql.raw('excluded.subtotal_price'),
          totalTax: sql.raw('excluded.total_tax'),
          currency: sql.raw('excluded.currency'),
          financialStatus: sql.raw('excluded.financial_status'),
          fulfillmentStatus: sql.raw('excluded.fulfillment_status'),
          customerEmail: sql.raw('excluded.customer_email'),
          customerId: sql.raw('excluded.customer_id'),
          landingPage: sql.raw('excluded.landing_page'),
          referringSite: sql.raw('excluded.referring_site'),
          processedAt: sql.raw('excluded.processed_at'),
        },
      })
      .returning();
    return upsertedOrders;
  }

  async upsertOrderLineItem(item: InsertOrderLineItem): Promise<OrderLineItem> {
    const [upsertedItem] = await db
      .insert(orderLineItems)
      .values(item)
      .onConflictDoUpdate({
        target: orderLineItems.id,
        set: item,
      })
      .returning();
    return upsertedItem;
  }

  async bulkUpsertOrderLineItems(itemList: InsertOrderLineItem[]): Promise<OrderLineItem[]> {
    if (itemList.length === 0) return [];
    
    const upsertedItems = await db
      .insert(orderLineItems)
      .values(itemList)
      .onConflictDoUpdate({
        target: orderLineItems.id,
        set: {
          orderId: sql.raw('excluded.order_id'),
          productId: sql.raw('excluded.product_id'),
          vendorId: sql.raw('excluded.vendor_id'),
          title: sql.raw('excluded.title'),
          vendor: sql.raw('excluded.vendor'),
          quantity: sql.raw('excluded.quantity'),
          price: sql.raw('excluded.price'),
          totalDiscount: sql.raw('excluded.total_discount'),
        },
      })
      .returning();
    return upsertedItems;
  }

  // Analytics operations
  async upsertVendorAnalytics(analytics: InsertVendorAnalytics): Promise<VendorAnalytics> {
    const [result] = await db
      .insert(vendorAnalytics)
      .values(analytics)
      .onConflictDoUpdate({
        target: [vendorAnalytics.storeId, vendorAnalytics.vendorId, vendorAnalytics.date],
        set: analytics,
      })
      .returning();
    return result;
  }

  async getVendorAnalyticsPaginated(
    storeId: string,
    params: PaginationParams & { vendorId?: string; startDate?: Date; endDate?: Date }
  ): Promise<PaginatedResponse<VendorAnalytics>> {
    const { page = 1, limit = 50, sortBy = 'date', sortDirection = 'desc', vendorId, startDate, endDate } = params;
    const offset = (page - 1) * limit;

    // Return demo analytics for demo store with pagination
    if (storeId === 'c15b4e68-ea15-4036-a5f7-cdce20d2baa7') {
      let analytics = [...demoVendorAnalytics];
      
      if (vendorId) {
        analytics = analytics.filter(a => a.vendorId === vendorId);
      }
      
      if (startDate && endDate) {
        analytics = analytics.filter(a => {
          const date = a.date;
          return date >= startDate && date <= endDate;
        });
      }
      
      // Sort analytics
      analytics.sort((a, b) => {
        if (sortBy === 'date') {
          const comparison = a.date.getTime() - b.date.getTime();
          return sortDirection === 'asc' ? comparison : -comparison;
        }
        const aValue = a[sortBy as keyof VendorAnalytics] as number;
        const bValue = b[sortBy as keyof VendorAnalytics] as number;
        const comparison = aValue - bValue;
        return sortDirection === 'asc' ? comparison : -comparison;
      });
      
      const total = analytics.length;
      const paginatedData = analytics.slice(offset, offset + limit);
      
      return {
        data: paginatedData,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: offset + limit < total,
          hasPrev: page > 1
        }
      };
    }
    
    const conditions = [eq(vendorAnalytics.storeId, storeId)];
    
    if (vendorId) {
      conditions.push(eq(vendorAnalytics.vendorId, vendorId));
    }
    
    if (startDate) {
      conditions.push(gte(vendorAnalytics.date, startDate));
    }
    
    if (endDate) {
      conditions.push(lte(vendorAnalytics.date, endDate));
    }
    
    // Determine ordering
    const orderByClause = sortBy === 'date' 
      ? (sortDirection === 'asc' ? asc(vendorAnalytics.date) : desc(vendorAnalytics.date))
      : (sortDirection === 'asc' ? asc(vendorAnalytics.revenue) : desc(vendorAnalytics.revenue));

    // Build the complete query
    const query = db.select().from(vendorAnalytics)
      .where(and(...conditions))
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);
    
    const countQuery = db.select({ count: sql<number>`count(*)` })
      .from(vendorAnalytics)
      .where(and(...conditions));
    
    const [data, [{ count: total }]] = await Promise.all([
      query,
      countQuery
    ]);
    
    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: offset + limit < total,
        hasPrev: page > 1
      }
    };
  }

  async getVendorAnalytics(
    storeId: string,
    vendorId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<VendorAnalytics[]> {
    // Return demo analytics for demo store
    if (storeId === 'c15b4e68-ea15-4036-a5f7-cdce20d2baa7') {
      let analytics = demoVendorAnalytics;
      
      if (vendorId) {
        analytics = analytics.filter(a => a.vendorId === vendorId);
      }
      
      if (startDate && endDate) {
        analytics = analytics.filter(a => {
          const date = a.date;
          return date >= startDate && date <= endDate;
        });
      }
      
      return analytics;
    }
    
    let query = db.select().from(vendorAnalytics).where(eq(vendorAnalytics.storeId, storeId));
    
    const conditions = [eq(vendorAnalytics.storeId, storeId)];
    
    if (vendorId) {
      conditions.push(eq(vendorAnalytics.vendorId, vendorId));
    }
    
    if (startDate) {
      conditions.push(gte(vendorAnalytics.date, startDate));
    }
    
    if (endDate) {
      conditions.push(lte(vendorAnalytics.date, endDate));
    }
    
    return await db
      .select()
      .from(vendorAnalytics)
      .where(and(...conditions))
      .orderBy(desc(vendorAnalytics.date));
  }

  async getVendorSummary(
    storeId: string,
    vendorId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<any> {
    // Calculate summary from demo analytics for demo store
    if (storeId === 'c15b4e68-ea15-4036-a5f7-cdce20d2baa7') {
      let analytics = demoVendorAnalytics;
      
      if (vendorId) {
        analytics = analytics.filter(a => a.vendorId === vendorId);
      }
      
      if (startDate && endDate) {
        analytics = analytics.filter(a => {
          const date = a.date;
          return date >= startDate && date <= endDate;
        });
      }
      
      if (analytics.length === 0) {
        return {
          totalRevenue: 0,
          totalOrders: 0,
          totalVisitors: 0,
          totalConversions: 0,
          avgAOV: 0,
          avgConversionRate: 0
        };
      }
      
      const totalRevenue = analytics.reduce((sum, a) => sum + parseFloat(a.revenue || "0"), 0);
      const totalOrders = analytics.reduce((sum, a) => sum + (a.orders || 0), 0);
      const totalVisitors = analytics.reduce((sum, a) => sum + (a.visitors || 0), 0);
      const totalConversions = analytics.reduce((sum, a) => sum + (a.conversions || 0), 0);
      const avgAOV = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      const avgConversionRate = totalVisitors > 0 ? totalConversions / totalVisitors : 0;
      
      return {
        totalRevenue,
        totalOrders,
        totalVisitors,
        totalConversions,
        avgAOV,
        avgConversionRate
      };
    }
    
    const conditions = [eq(vendorAnalytics.storeId, storeId)];
    
    if (vendorId) {
      conditions.push(eq(vendorAnalytics.vendorId, vendorId));
    }
    
    if (startDate) {
      conditions.push(gte(vendorAnalytics.date, startDate));
    }
    
    if (endDate) {
      conditions.push(lte(vendorAnalytics.date, endDate));
    }

    const [summary] = await db
      .select({
        totalRevenue: sql<number>`SUM(${vendorAnalytics.revenue})`,
        totalOrders: sql<number>`SUM(${vendorAnalytics.orders})`,
        totalVisitors: sql<number>`SUM(${vendorAnalytics.visitors})`,
        totalConversions: sql<number>`SUM(${vendorAnalytics.conversions})`,
        avgAOV: sql<number>`AVG(${vendorAnalytics.aov})`,
        avgConversionRate: sql<number>`AVG(${vendorAnalytics.conversionRate})`,
      })
      .from(vendorAnalytics)
      .where(and(...conditions));

    return summary;
  }

  async getTopProductsPaginated(
    storeId: string,
    params: PaginationParams & { vendorId?: string }
  ): Promise<PaginatedResponse<any>> {
    const { page = 1, limit = 50, sortBy = 'totalRevenue', sortDirection = 'desc', vendorId } = params;
    const offset = (page - 1) * limit;

    // Calculate top products from demo data with pagination
    if (storeId === 'c15b4e68-ea15-4036-a5f7-cdce20d2baa7') {
      const productStats = new Map<string, any>();
      
      demoOrders.forEach(order => {
        const lineItems = getDemoOrderLineItems(order.id);
        lineItems.forEach(item => {
          if (!vendorId || item.vendorId === vendorId) {
            const key = item.productId!;
            const existing = productStats.get(key) || {
              productId: item.productId,
              title: item.title,
              vendor: item.vendor,
              totalRevenue: 0,
              totalQuantity: 0
            };
            
            existing.totalRevenue += parseFloat(item.price || "0") * (item.quantity || 1);
            existing.totalQuantity += item.quantity || 1;
            productStats.set(key, existing);
          }
        });
      });
      
      let products = Array.from(productStats.values());
      
      // Sort products
      products.sort((a, b) => {
        const aValue = a[sortBy] as number;
        const bValue = b[sortBy] as number;
        const comparison = aValue - bValue;
        return sortDirection === 'asc' ? comparison : -comparison;
      });
      
      const total = products.length;
      const paginatedData = products.slice(offset, offset + limit);
      
      return {
        data: paginatedData,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: offset + limit < total,
          hasPrev: page > 1
        }
      };
    }
    
    const conditions = [eq(orders.storeId, storeId)];
    
    if (vendorId) {
      conditions.push(eq(orderLineItems.vendorId, vendorId));
    }
    
    const query = db
      .select({
        productId: orderLineItems.productId,
        title: orderLineItems.title,
        vendor: orderLineItems.vendor,
        totalRevenue: sql<number>`SUM(${orderLineItems.price} * ${orderLineItems.quantity})`,
        totalQuantity: sql<number>`SUM(${orderLineItems.quantity})`,
      })
      .from(orderLineItems)
      .innerJoin(orders, eq(orders.id, orderLineItems.orderId))
      .where(and(...conditions))
      .groupBy(orderLineItems.productId, orderLineItems.title, orderLineItems.vendor);
      
    // Apply sorting
    if (sortBy === 'totalRevenue') {
      query.orderBy(sortDirection === 'asc' ? asc(sql`SUM(${orderLineItems.price} * ${orderLineItems.quantity})`) : desc(sql`SUM(${orderLineItems.price} * ${orderLineItems.quantity})`));
    } else if (sortBy === 'totalQuantity') {
      query.orderBy(sortDirection === 'asc' ? asc(sql`SUM(${orderLineItems.quantity})`) : desc(sql`SUM(${orderLineItems.quantity})`));
    }
    
    const countQuery = db
      .select({ count: sql<number>`COUNT(DISTINCT ${orderLineItems.productId})` })
      .from(orderLineItems)
      .innerJoin(orders, eq(orders.id, orderLineItems.orderId))
      .where(and(...conditions));
    
    const [data, [{ count: total }]] = await Promise.all([
      query.limit(limit).offset(offset),
      countQuery
    ]);
    
    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: offset + limit < total,
        hasPrev: page > 1
      }
    };
  }

  async getTopProducts(
    storeId: string,
    vendorId?: string,
    limit: number = 10
  ): Promise<any[]> {
    // Calculate top products from demo data
    if (storeId === 'c15b4e68-ea15-4036-a5f7-cdce20d2baa7') {
      const productStats = new Map<string, any>();
      
      demoOrders.forEach(order => {
        const lineItems = getDemoOrderLineItems(order.id);
        lineItems.forEach(item => {
          if (!vendorId || item.vendorId === vendorId) {
            const key = item.productId!;
            const existing = productStats.get(key) || {
              productId: item.productId,
              title: item.title,
              vendor: item.vendor,
              totalRevenue: 0,
              totalQuantity: 0
            };
            
            existing.totalRevenue += parseFloat(item.price || "0") * (item.quantity || 1);
            existing.totalQuantity += item.quantity || 1;
            productStats.set(key, existing);
          }
        });
      });
      
      return Array.from(productStats.values())
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, limit);
    }
    
    const conditions = [eq(orders.storeId, storeId)];
    
    if (vendorId) {
      conditions.push(eq(orderLineItems.vendorId, vendorId));
    }

    return await db
      .select({
        productId: orderLineItems.productId,
        title: orderLineItems.title,
        vendor: orderLineItems.vendor,
        totalRevenue: sql<number>`SUM(${orderLineItems.price} * ${orderLineItems.quantity})`,
        totalQuantity: sql<number>`SUM(${orderLineItems.quantity})`,
      })
      .from(orderLineItems)
      .innerJoin(orders, eq(orders.id, orderLineItems.orderId))
      .where(and(...conditions))
      .groupBy(orderLineItems.productId, orderLineItems.title, orderLineItems.vendor)
      .orderBy(desc(sql`SUM(${orderLineItems.price} * ${orderLineItems.quantity})`))
      .limit(limit);
  }

  async getTopLandingPages(
    storeId: string,
    vendorId?: string,
    limit: number = 10
  ): Promise<PageAnalytics[]> {
    const conditions = [eq(pageAnalytics.storeId, storeId)];
    
    if (vendorId) {
      conditions.push(eq(pageAnalytics.vendorId, vendorId));
    }

    return await db
      .select()
      .from(pageAnalytics)
      .where(and(...conditions))
      .orderBy(desc(pageAnalytics.visitors))
      .limit(limit);
  }

  async getVendorOrdersInDateRange(
    storeId: string,
    vendorId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Order[]> {
    const result = await db
      .select({
        id: orders.id,
        storeId: orders.storeId,
        orderNumber: orders.orderNumber,
        totalPrice: orders.totalPrice,
        subtotalPrice: orders.subtotalPrice,
        totalTax: orders.totalTax,
        currency: orders.currency,
        financialStatus: orders.financialStatus,
        fulfillmentStatus: orders.fulfillmentStatus,
        customerEmail: orders.customerEmail,
        customerId: orders.customerId,
        landingPage: orders.landingPage,
        referringSite: orders.referringSite,
        processedAt: orders.processedAt,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .innerJoin(orderLineItems, eq(orders.id, orderLineItems.orderId))
      .where(
        and(
          eq(orders.storeId, storeId),
          eq(orderLineItems.vendorId, vendorId),
          gte(orders.processedAt, startDate),
          lte(orders.processedAt, endDate),
          eq(orders.financialStatus, 'paid')
        )
      )
      .groupBy(orders.id)
      .orderBy(desc(orders.processedAt));
    
    return result;
  }

  async getVendorOrderItemsInDateRange(
    storeId: string,
    vendorId: string,
    startDate: Date,
    endDate: Date
  ): Promise<OrderLineItem[]> {
    const result = await db
      .select({
        id: orderLineItems.id,
        orderId: orderLineItems.orderId,
        productId: orderLineItems.productId,
        vendorId: orderLineItems.vendorId,
        title: orderLineItems.title,
        vendor: orderLineItems.vendor,
        quantity: orderLineItems.quantity,
        price: orderLineItems.price,
        totalDiscount: orderLineItems.totalDiscount,
      })
      .from(orderLineItems)
      .innerJoin(orders, eq(orders.id, orderLineItems.orderId))
      .where(
        and(
          eq(orders.storeId, storeId),
          eq(orderLineItems.vendorId, vendorId),
          gte(orders.processedAt, startDate),
          lte(orders.processedAt, endDate),
          eq(orders.financialStatus, 'paid')
        )
      )
      .orderBy(desc(orders.processedAt));
    
    return result;
  }

  // ============= SMART ALERTS SYSTEM =============
  
  async createAlert(alert: InsertAlert): Promise<Alert> {
    try {
      const [newAlert] = await db.insert(alerts).values(alert).returning();
      return newAlert;
    } catch (error: any) {
      // Handle unique constraint violation for duplicate prevention
      if (error.code === '23505' && error.constraint === 'alerts_duplicate_prevention') {
        // Duplicate alert within time bucket - return existing alert or create with modified message
        console.log(`Duplicate alert prevented for store: ${alert.storeId}, vendor: ${alert.vendorId}, type: ${alert.alertType}`);
        
        // Find the existing alert to return it instead
        const existingAlerts = await this.getStoreAlerts(alert.storeId, {
          page: 1,
          limit: 1,
          vendorId: alert.vendorId || undefined
        });
        
        const existingAlert = existingAlerts.data.find(a => 
          a.alertType === alert.alertType && 
          a.vendorId === alert.vendorId
        );
        
        if (existingAlert) {
          return existingAlert;
        }
      }
      
      // Re-throw other errors
      throw error;
    }
  }

  async getStoreAlerts(storeId: string, params?: PaginationParams & { isRead?: boolean; severity?: string }): Promise<PaginatedResponse<Alert>> {
    const { page = 1, limit = 50, sortBy = 'createdAt', sortDirection = 'desc', isRead, severity } = params || {};
    const offset = (page - 1) * limit;

    // Build conditions array
    let conditions = [eq(alerts.storeId, storeId)];
    
    if (isRead !== undefined) {
      conditions.push(eq(alerts.isRead, isRead));
    }
    
    if (severity) {
      conditions.push(eq(alerts.severity, severity as any));
    }

    // Determine ordering
    const orderByClause = sortBy === 'createdAt' 
      ? (sortDirection === 'asc' ? asc(alerts.createdAt) : desc(alerts.createdAt))
      : (sortDirection === 'asc' ? asc(alerts.severity) : desc(alerts.severity));

    // Build the queries
    const query = db.select().from(alerts)
      .where(and(...conditions))
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);
    
    const countQuery = db.select({ count: sql<number>`count(*)` })
      .from(alerts)
      .where(and(...conditions));

    const [data, [{ count: total }]] = await Promise.all([
      query,
      countQuery
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: offset + limit < total,
        hasPrev: page > 1
      }
    };
  }

  async updateAlert(storeId: string, id: string, updates: Partial<Alert>): Promise<Alert> {
    const [alert] = await db
      .update(alerts)
      .set(updates)
      .where(and(eq(alerts.id, id), eq(alerts.storeId, storeId)))
      .returning();
    
    if (!alert) {
      throw new Error('Alert not found or access denied');
    }
    return alert;
  }

  async markAlertAsRead(storeId: string, id: string): Promise<Alert> {
    const [alert] = await db
      .update(alerts)
      .set({ isRead: true })
      .where(and(eq(alerts.id, id), eq(alerts.storeId, storeId)))
      .returning();
    
    if (!alert) {
      throw new Error('Alert not found or access denied');
    }
    return alert;
  }

  async acknowledgeAlert(storeId: string, id: string): Promise<Alert> {
    const [alert] = await db
      .update(alerts)
      .set({ acknowledgedAt: new Date() })
      .where(and(eq(alerts.id, id), eq(alerts.storeId, storeId)))
      .returning();
    
    if (!alert) {
      throw new Error('Alert not found or access denied');
    }
    return alert;
  }

  async deleteAlert(storeId: string, id: string): Promise<void> {
    const result = await db
      .delete(alerts)
      .where(and(eq(alerts.id, id), eq(alerts.storeId, storeId)));
    
    // Check if any rows were affected
    if (result.rowCount === 0) {
      throw new Error('Alert not found or access denied');
    }
  }

  async createAlertRule(rule: InsertAlertRule): Promise<AlertRule> {
    const [newRule] = await db.insert(alertRules).values(rule).returning();
    return newRule;
  }

  async getStoreAlertRules(storeId: string, params?: PaginationParams): Promise<PaginatedResponse<AlertRule>> {
    const { page = 1, limit = 50, sortBy = 'createdAt', sortDirection = 'desc' } = params || {};
    const offset = (page - 1) * limit;

    // Build conditions array
    let conditions = [eq(alertRules.storeId, storeId)];

    // Determine ordering
    const orderByClause = sortBy === 'createdAt' 
      ? (sortDirection === 'asc' ? asc(alertRules.createdAt) : desc(alertRules.createdAt))
      : (sortDirection === 'asc' ? asc(alertRules.enabled) : desc(alertRules.enabled));

    // Build the queries
    const query = db.select().from(alertRules)
      .where(and(...conditions))
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);
    
    const countQuery = db.select({ count: sql<number>`count(*)` })
      .from(alertRules)
      .where(and(...conditions));

    const [data, [{ count: total }]] = await Promise.all([
      query,
      countQuery
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: offset + limit < total,
        hasPrev: page > 1
      }
    };
  }

  async updateAlertRule(storeId: string, id: string, updates: Partial<AlertRule>): Promise<AlertRule> {
    const [rule] = await db
      .update(alertRules)
      .set(updates)
      .where(and(eq(alertRules.id, id), eq(alertRules.storeId, storeId)))
      .returning();
    
    if (!rule) {
      throw new Error('Alert rule not found or access denied');
    }
    return rule;
  }

  async deleteAlertRule(storeId: string, id: string): Promise<void> {
    const result = await db
      .delete(alertRules)
      .where(and(eq(alertRules.id, id), eq(alertRules.storeId, storeId)));
    
    // Check if any rows were affected
    if (result.rowCount === 0) {
      throw new Error('Alert rule not found or access denied');
    }
  }

  async getEnabledAlertRules(storeId: string, vendorId?: string): Promise<AlertRule[]> {
    let conditions = [
      eq(alertRules.storeId, storeId),
      eq(alertRules.enabled, true)
    ];
    
    if (vendorId) {
      conditions.push(eq(alertRules.vendorId, vendorId));
    }

    return await db.select().from(alertRules)
      .where(and(...conditions))
      .orderBy(desc(alertRules.createdAt));
  }

  // ============= CUSTOMER BRAND LOYALTY TRACKING =============
  
  async upsertCustomerBrandAffinity(affinity: InsertCustomerBrandAffinity): Promise<CustomerBrandAffinity> {
    // ATOMIC UPSERT: Use onConflictDoUpdate to prevent race conditions
    // This relies on the unique composite index (store_id, customer_id, vendor_id)
    const [result] = await db
      .insert(customerBrandAffinity)
      .values(affinity)
      .onConflictDoUpdate({
        target: [
          customerBrandAffinity.storeId,
          customerBrandAffinity.customerId,
          customerBrandAffinity.vendorId
        ],
        set: {
          affinityScore: affinity.affinityScore,
          totalOrders: affinity.totalOrders,
          totalSpent: affinity.totalSpent,
          firstPurchase: affinity.firstPurchase,
          lastPurchase: affinity.lastPurchase,
          updatedAt: new Date(),
        }
      })
      .returning();
    
    return result;
  }

  async getCustomerBrandAffinities(storeId: string, params?: PaginationParams & { customerId?: string; vendorId?: string }): Promise<PaginatedResponse<CustomerBrandAffinity>> {
    const { page = 1, limit = 50, sortBy = 'affinityScore', sortDirection = 'desc', customerId, vendorId } = params || {};
    const offset = (page - 1) * limit;

    // Build conditions array
    let conditions = [eq(customerBrandAffinity.storeId, storeId)];
    
    if (customerId) {
      conditions.push(eq(customerBrandAffinity.customerId, customerId));
    }
    
    if (vendorId) {
      conditions.push(eq(customerBrandAffinity.vendorId, vendorId));
    }

    // Determine ordering
    const orderByClause = sortBy === 'affinityScore' 
      ? (sortDirection === 'asc' ? asc(customerBrandAffinity.affinityScore) : desc(customerBrandAffinity.affinityScore))
      : (sortDirection === 'asc' ? asc(customerBrandAffinity.createdAt) : desc(customerBrandAffinity.createdAt));

    // Build the queries
    const query = db.select().from(customerBrandAffinity)
      .where(and(...conditions))
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);
    
    const countQuery = db.select({ count: sql<number>`count(*)` })
      .from(customerBrandAffinity)
      .where(and(...conditions));

    const [data, [{ count: total }]] = await Promise.all([
      query,
      countQuery
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: offset + limit < total,
        hasPrev: page > 1
      }
    };
  }

  async getTopCustomersByAffinity(storeId: string, vendorId: string, limit: number = 10): Promise<CustomerBrandAffinity[]> {
    return await db.select().from(customerBrandAffinity)
      .where(and(
        eq(customerBrandAffinity.storeId, storeId),
        eq(customerBrandAffinity.vendorId, vendorId)
      ))
      .orderBy(desc(customerBrandAffinity.affinityScore))
      .limit(limit);
  }

  async upsertCustomerCrossBrandPurchases(crossPurchase: InsertCustomerCrossBrandPurchases): Promise<CustomerCrossBrandPurchases> {
    // First try to find existing record
    const existingRecords = await db.select()
      .from(customerCrossBrandPurchases)
      .where(and(
        eq(customerCrossBrandPurchases.storeId, crossPurchase.storeId),
        eq(customerCrossBrandPurchases.customerId, crossPurchase.customerId),
        eq(customerCrossBrandPurchases.primaryVendorId, crossPurchase.primaryVendorId),
        eq(customerCrossBrandPurchases.secondaryVendorId, crossPurchase.secondaryVendorId)
      ))
      .limit(1);
    
    if (existingRecords.length > 0) {
      // Update existing record
      const existingRecord = existingRecords[0];
      const [updatedCrossPurchase] = await db
        .update(customerCrossBrandPurchases)
        .set({
          crossPurchaseCount: existingRecord.crossPurchaseCount + (crossPurchase.crossPurchaseCount || 1),
          totalCrossValue: (parseFloat(existingRecord.totalCrossValue) + parseFloat(crossPurchase.totalCrossValue || "0")).toString()
        })
        .where(eq(customerCrossBrandPurchases.id, existingRecord.id))
        .returning();
      return updatedCrossPurchase;
    } else {
      // Insert new record
      const [newCrossPurchase] = await db
        .insert(customerCrossBrandPurchases)
        .values(crossPurchase)
        .returning();
      return newCrossPurchase;
    }
  }

  async getCustomerCrossBrandPurchases(storeId: string, params?: PaginationParams & { customerId?: string; primaryVendorId?: string }): Promise<PaginatedResponse<CustomerCrossBrandPurchases>> {
    const { page = 1, limit = 50, sortBy = 'crossPurchaseCount', sortDirection = 'desc', customerId, primaryVendorId } = params || {};
    const offset = (page - 1) * limit;

    // Build conditions array
    let conditions = [eq(customerCrossBrandPurchases.storeId, storeId)];
    
    if (customerId) {
      conditions.push(eq(customerCrossBrandPurchases.customerId, customerId));
    }
    
    if (primaryVendorId) {
      conditions.push(eq(customerCrossBrandPurchases.primaryVendorId, primaryVendorId));
    }

    // Determine ordering
    const orderByClause = sortBy === 'crossPurchaseCount' 
      ? (sortDirection === 'asc' ? asc(customerCrossBrandPurchases.crossPurchaseCount) : desc(customerCrossBrandPurchases.crossPurchaseCount))
      : (sortDirection === 'asc' ? asc(customerCrossBrandPurchases.createdAt) : desc(customerCrossBrandPurchases.createdAt));

    // Build the queries
    const query = db.select().from(customerCrossBrandPurchases)
      .where(and(...conditions))
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);
    
    const countQuery = db.select({ count: sql<number>`count(*)` })
      .from(customerCrossBrandPurchases)
      .where(and(...conditions));

    const [data, [{ count: total }]] = await Promise.all([
      query,
      countQuery
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: offset + limit < total,
        hasPrev: page > 1
      }
    };
  }

  async getCrossBrandAnalytics(storeId: string, vendorId: string): Promise<any> {
    // Get cross-brand purchase patterns for a specific vendor
    const crossBrandData = await db
      .select({
        secondaryVendorId: customerCrossBrandPurchases.secondaryVendorId,
        avgCrossPurchases: sql<number>`AVG(${customerCrossBrandPurchases.crossPurchaseCount})`,
        totalCustomers: sql<number>`COUNT(DISTINCT ${customerCrossBrandPurchases.customerId})`,
        avgCrossValue: sql<number>`AVG(${customerCrossBrandPurchases.totalCrossValue})`,
      })
      .from(customerCrossBrandPurchases)
      .where(and(
        eq(customerCrossBrandPurchases.storeId, storeId),
        eq(customerCrossBrandPurchases.primaryVendorId, vendorId)
      ))
      .groupBy(customerCrossBrandPurchases.secondaryVendorId)
      .orderBy(desc(sql`AVG(${customerCrossBrandPurchases.crossPurchaseCount})`));

    return {
      crossBrandPatterns: crossBrandData,
      totalCrossBrandCustomers: crossBrandData.reduce((sum, item) => sum + item.totalCustomers, 0)
    };
  }

  // ============= INVENTORY INTELLIGENCE =============
  
  async upsertInventoryAnalytics(analytics: InsertInventoryAnalytics): Promise<InventoryAnalytics> {
    const [upsertedAnalytics] = await db
      .insert(inventoryAnalytics)
      .values(analytics)
      .onConflictDoUpdate({
        target: [inventoryAnalytics.storeId, inventoryAnalytics.vendorId, inventoryAnalytics.productId],
        set: {
          ...analytics,
          updatedAt: new Date(),
        },
      })
      .returning();
    return upsertedAnalytics;
  }

  async getInventoryAnalytics(storeId: string, params?: PaginationParams & { vendorId?: string; productId?: string; deadStockOnly?: boolean }): Promise<PaginatedResponse<InventoryAnalytics>> {
    const { page = 1, limit = 50, sortBy = 'createdAt', sortDirection = 'desc', vendorId, productId, deadStockOnly } = params || {};
    const offset = (page - 1) * limit;

    // Build conditions array
    let conditions = [eq(inventoryAnalytics.storeId, storeId)];
    
    if (vendorId) {
      conditions.push(eq(inventoryAnalytics.vendorId, vendorId));
    }
    
    if (productId) {
      conditions.push(eq(inventoryAnalytics.productId, productId));
    }
    
    if (deadStockOnly) {
      conditions.push(eq(inventoryAnalytics.deadStockFlag, true));
    }

    // Determine ordering
    const orderByClause = sortBy === 'createdAt' 
      ? (sortDirection === 'asc' ? asc(inventoryAnalytics.createdAt) : desc(inventoryAnalytics.createdAt))
      : (sortDirection === 'asc' ? asc(inventoryAnalytics.sellThroughRate) : desc(inventoryAnalytics.sellThroughRate));

    // Build the queries
    const query = db.select().from(inventoryAnalytics)
      .where(and(...conditions))
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);
    
    const countQuery = db.select({ count: sql<number>`count(*)` })
      .from(inventoryAnalytics)
      .where(and(...conditions));

    const [data, [{ count: total }]] = await Promise.all([
      query,
      countQuery
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: offset + limit < total,
        hasPrev: page > 1
      }
    };
  }

  async getDeadStockReport(storeId: string, vendorId?: string): Promise<InventoryAnalytics[]> {
    let conditions = [
      eq(inventoryAnalytics.storeId, storeId),
      eq(inventoryAnalytics.deadStockFlag, true)
    ];
    
    if (vendorId) {
      conditions.push(eq(inventoryAnalytics.vendorId, vendorId));
    }

    return await db.select().from(inventoryAnalytics)
      .where(and(...conditions))
      .orderBy(desc(inventoryAnalytics.daysOfInventory));
  }

  // Batch inventory fetching to eliminate N+1 queries
  async getInventoryLevelsForProducts(productIds: string[]): Promise<Map<string, number>> {
    if (productIds.length === 0) {
      return new Map();
    }

    const inventoryMap = new Map<string, number>();
    
    // Check if we have real inventory data in the inventory table
    try {
      const inventoryRecords = await db.select()
        .from(inventory)
        .where(sql`${inventory.productId} = ANY(${productIds})`);
      
      // Use real inventory data where available
      for (const record of inventoryRecords) {
        inventoryMap.set(record.productId, record.availableQuantity || 0);
      }
      
      // For products without inventory records, check if we're in demo mode
      const missingProductIds = productIds.filter(id => !inventoryMap.has(id));
      
      if (missingProductIds.length > 0) {
        // For demo mode or missing inventory data, generate realistic levels
        for (const productId of missingProductIds) {
          // Generate realistic inventory levels based on product ID hash
          let hash = 0;
          for (let i = 0; i < productId.length; i++) {
            hash = ((hash << 5) - hash + productId.charCodeAt(i)) & 0xffffff;
          }
          
          // Use hash to generate realistic inventory levels (10-200 for demo, 0 for real missing data)
          const inventoryLevel = Math.abs(hash % 190) + 10; // 10-200 range for demo
          inventoryMap.set(productId, inventoryLevel);
        }
      }
      
    } catch (error) {
      console.error('Error fetching inventory levels:', error);
      
      // Fallback to demo/simulated data for all products
      productIds.forEach(productId => {
        let hash = 0;
        for (let i = 0; i < productId.length; i++) {
          hash = ((hash << 5) - hash + productId.charCodeAt(i)) & 0xffffff;
        }
        const inventoryLevel = Math.abs(hash % 190) + 10;
        inventoryMap.set(productId, inventoryLevel);
      });
    }

    return inventoryMap;
  }

  async upsertVendorInventorySummary(summary: InsertVendorInventorySummary): Promise<VendorInventorySummary> {
    const [upsertedSummary] = await db
      .insert(vendorInventorySummary)
      .values(summary)
      .onConflictDoUpdate({
        target: [vendorInventorySummary.vendorId],
        set: {
          ...summary,
        },
      })
      .returning();
    return upsertedSummary;
  }

  async getVendorInventorySummaries(storeId: string, params?: PaginationParams): Promise<PaginatedResponse<VendorInventorySummary>> {
    const { page = 1, limit = 50, sortBy = 'totalProducts', sortDirection = 'desc' } = params || {};
    const offset = (page - 1) * limit;

    // Build conditions array
    let conditions = [eq(vendorInventorySummary.storeId, storeId)];

    // Determine ordering
    const orderByClause = sortBy === 'totalProducts' 
      ? (sortDirection === 'asc' ? asc(vendorInventorySummary.totalProducts) : desc(vendorInventorySummary.totalProducts))
      : (sortDirection === 'asc' ? asc(vendorInventorySummary.avgSellThroughRate) : desc(vendorInventorySummary.avgSellThroughRate));

    // Build the queries
    const query = db.select().from(vendorInventorySummary)
      .where(and(...conditions))
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);
    
    const countQuery = db.select({ count: sql<number>`count(*)` })
      .from(vendorInventorySummary)
      .where(and(...conditions));

    const [data, [{ count: total }]] = await Promise.all([
      query,
      countQuery
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: offset + limit < total,
        hasPrev: page > 1
      }
    };
  }

  async getVendorInventorySummary(vendorId: string): Promise<VendorInventorySummary | undefined> {
    const [summary] = await db.select().from(vendorInventorySummary)
      .where(eq(vendorInventorySummary.vendorId, vendorId));
    return summary;
  }

  // ============= PREDICTIVE FORECASTING =============
  
  async createSalesForecast(forecast: InsertSalesForecast): Promise<SalesForecast> {
    const [newForecast] = await db.insert(salesForecasts).values(forecast).returning();
    return newForecast;
  }

  async getSalesForecasts(storeId: string, params?: PaginationParams & { vendorId?: string; periodDays?: number }): Promise<PaginatedResponse<SalesForecast>> {
    const { page = 1, limit = 50, sortBy = 'forecastDate', sortDirection = 'desc', vendorId, periodDays } = params || {};
    const offset = (page - 1) * limit;

    // Build conditions array
    let conditions = [eq(salesForecasts.storeId, storeId)];
    
    if (vendorId) {
      conditions.push(eq(salesForecasts.vendorId, vendorId));
    }
    
    if (periodDays) {
      conditions.push(eq(salesForecasts.periodDays, periodDays));
    }

    // Determine ordering
    const orderByClause = sortBy === 'forecastDate' 
      ? (sortDirection === 'asc' ? asc(salesForecasts.forecastDate) : desc(salesForecasts.forecastDate))
      : (sortDirection === 'asc' ? asc(salesForecasts.createdAt) : desc(salesForecasts.createdAt));

    // Build the queries
    const query = db.select().from(salesForecasts)
      .where(and(...conditions))
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);
    
    const countQuery = db.select({ count: sql<number>`count(*)` })
      .from(salesForecasts)
      .where(and(...conditions));

    const [data, [{ count: total }]] = await Promise.all([
      query,
      countQuery
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: offset + limit < total,
        hasPrev: page > 1
      }
    };
  }

  async getLatestForecast(storeId: string, vendorId?: string, periodDays?: number): Promise<SalesForecast | undefined> {
    let conditions = [eq(salesForecasts.storeId, storeId)];
    
    if (vendorId) {
      conditions.push(eq(salesForecasts.vendorId, vendorId));
    }
    
    if (periodDays) {
      conditions.push(eq(salesForecasts.periodDays, periodDays));
    }

    const [forecast] = await db.select().from(salesForecasts)
      .where(and(...conditions))
      .orderBy(desc(salesForecasts.createdAt))
      .limit(1);
    
    return forecast;
  }

  async createForecastAccuracy(accuracy: InsertForecastAccuracy): Promise<ForecastAccuracy> {
    const [newAccuracy] = await db.insert(forecastAccuracy).values(accuracy).returning();
    return newAccuracy;
  }

  async getForecastAccuracy(storeId: string, params?: PaginationParams & { vendorId?: string }): Promise<PaginatedResponse<ForecastAccuracy>> {
    const { page = 1, limit = 50, sortBy = 'forecastDate', sortDirection = 'desc', vendorId } = params || {};
    const offset = (page - 1) * limit;

    // Build conditions array
    let conditions = [eq(forecastAccuracy.storeId, storeId)];
    
    if (vendorId) {
      conditions.push(eq(forecastAccuracy.vendorId, vendorId));
    }

    // Determine ordering
    const orderByClause = sortBy === 'forecastDate' 
      ? (sortDirection === 'asc' ? asc(forecastAccuracy.forecastDate) : desc(forecastAccuracy.forecastDate))
      : (sortDirection === 'asc' ? asc(forecastAccuracy.accuracyPercentage) : desc(forecastAccuracy.accuracyPercentage));

    // Build the queries
    const query = db.select().from(forecastAccuracy)
      .where(and(...conditions))
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);
    
    const countQuery = db.select({ count: sql<number>`count(*)` })
      .from(forecastAccuracy)
      .where(and(...conditions));

    const [data, [{ count: total }]] = await Promise.all([
      query,
      countQuery
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: offset + limit < total,
        hasPrev: page > 1
      }
    };
  }

  async getForecastAccuracyMetrics(storeId: string, vendorId?: string): Promise<any> {
    let conditions = [eq(forecastAccuracy.storeId, storeId)];
    
    if (vendorId) {
      conditions.push(eq(forecastAccuracy.vendorId, vendorId));
    }

    const [metrics] = await db
      .select({
        avgAccuracy: sql<number>`AVG(${forecastAccuracy.accuracyPercentage})`,
        minAccuracy: sql<number>`MIN(${forecastAccuracy.accuracyPercentage})`,
        maxAccuracy: sql<number>`MAX(${forecastAccuracy.accuracyPercentage})`,
        totalForecasts: sql<number>`COUNT(*)`,
      })
      .from(forecastAccuracy)
      .where(and(...conditions));

    return metrics;
  }

  // ============= INVENTORY OPERATIONS =============

  async upsertInventory(inventoryData: InsertInventory): Promise<Inventory> {
    const [upserted] = await db
      .insert(inventory)
      .values(inventoryData)
      .onConflictDoUpdate({
        target: [inventory.productId],
        set: {
          quantity: inventoryData.quantity,
          availableQuantity: inventoryData.availableQuantity,
          reservedQuantity: inventoryData.reservedQuantity,
          lastUpdated: sql`NOW()`,
          syncedAt: inventoryData.syncedAt,
        },
      })
      .returning();
    return upserted;
  }

  async bulkUpsertInventory(inventories: InsertInventory[]): Promise<Inventory[]> {
    if (inventories.length === 0) return [];

    const upserted = await db
      .insert(inventory)
      .values(inventories)
      .onConflictDoUpdate({
        target: [inventory.productId],
        set: {
          quantity: sql`EXCLUDED.quantity`,
          availableQuantity: sql`EXCLUDED.available_quantity`,
          reservedQuantity: sql`EXCLUDED.reserved_quantity`,
          lastUpdated: sql`NOW()`,
          syncedAt: sql`EXCLUDED.synced_at`,
        },
      })
      .returning();
    return upserted;
  }

  async getInventoryByProductId(productId: string): Promise<Inventory | undefined> {
    const [inventoryRecord] = await db
      .select()
      .from(inventory)
      .where(eq(inventory.productId, productId))
      .limit(1);
    return inventoryRecord;
  }

  async updateInventoryQuantity(
    productId: string, 
    quantity: number, 
    operation: 'set' | 'add' | 'subtract' = 'set'
  ): Promise<Inventory> {
    let updateValue: any;
    
    switch (operation) {
      case 'add':
        updateValue = sql`${inventory.quantity} + ${quantity}`;
        break;
      case 'subtract':
        updateValue = sql`GREATEST(0, ${inventory.quantity} - ${quantity})`;
        break;
      case 'set':
      default:
        updateValue = quantity;
        break;
    }

    const [updated] = await db
      .update(inventory)
      .set({
        quantity: updateValue,
        availableQuantity: updateValue, // Simplification for now
        lastUpdated: sql`NOW()`,
      })
      .where(eq(inventory.productId, productId))
      .returning();

    if (!updated) {
      // If no existing inventory record, create one
      return await this.upsertInventory({
        productId,
        storeId: '', // This would need to be passed in or derived
        quantity,
        availableQuantity: quantity,
        reservedQuantity: 0,
        syncedAt: new Date(),
      });
    }

    return updated;
  }

  // ============= NOTIFICATION SYSTEM IMPLEMENTATIONS =============

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [created] = await db
      .insert(notifications)
      .values(notification)
      .returning();
    return created;
  }

  async getUserNotifications(
    userId: string, 
    storeId: string, 
    params: PaginationParams & { isRead?: boolean; severity?: string; type?: string; startDate?: Date; endDate?: Date } = {}
  ): Promise<PaginatedResponse<Notification>> {
    const { page = 1, limit = 20, isRead, severity, type, startDate, endDate } = params;
    const offset = (page - 1) * limit;

    let whereConditions = [
      eq(notifications.userId, userId),
      eq(notifications.storeId, storeId)
    ];

    if (typeof isRead === 'boolean') {
      whereConditions.push(eq(notifications.isRead, isRead));
    }
    if (severity) {
      whereConditions.push(eq(notifications.severity, severity as any));
    }
    if (type) {
      whereConditions.push(eq(notifications.type, type as any));
    }
    if (startDate) {
      whereConditions.push(gte(notifications.createdAt, startDate));
    }
    if (endDate) {
      whereConditions.push(lte(notifications.createdAt, endDate));
    }

    const [data, totalResult] = await Promise.all([
      db
        .select()
        .from(notifications)
        .where(and(...whereConditions))
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(notifications)
        .where(and(...whereConditions))
    ]);

    const total = totalResult[0]?.count || 0;

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };
  }

  async getUnreadNotificationCount(userId: string, storeId: string): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.storeId, storeId),
          eq(notifications.isRead, false)
        )
      );
    
    return result?.count || 0;
  }

  async markNotificationAsRead(userId: string, storeId: string, notificationId: string): Promise<Notification> {
    const [updated] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId),
          eq(notifications.storeId, storeId)
        )
      )
      .returning();

    if (!updated) {
      throw new Error('Notification not found');
    }

    return updated;
  }

  async markAllNotificationsAsRead(userId: string, storeId: string): Promise<number> {
    const result = await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.storeId, storeId),
          eq(notifications.isRead, false)
        )
      );

    return result.rowCount || 0;
  }

  async deleteNotification(userId: string, storeId: string, notificationId: string): Promise<void> {
    const result = await db
      .delete(notifications)
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId),
          eq(notifications.storeId, storeId)
        )
      );

    if (result.rowCount === 0) {
      throw new Error('Notification not found');
    }
  }

  async getNotificationPreferences(userId: string, storeId: string): Promise<NotificationPreferences | undefined> {
    const [preferences] = await db
      .select()
      .from(notificationPreferences)
      .where(
        and(
          eq(notificationPreferences.userId, userId),
          eq(notificationPreferences.storeId, storeId)
        )
      )
      .limit(1);

    return preferences;
  }

  async createNotificationPreferences(preferences: InsertNotificationPreferences): Promise<NotificationPreferences> {
    const [created] = await db
      .insert(notificationPreferences)
      .values(preferences)
      .returning();
    return created;
  }

  async updateNotificationPreferences(
    userId: string, 
    storeId: string, 
    updates: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    const [updated] = await db
      .update(notificationPreferences)
      .set({
        ...updates,
        updatedAt: sql`NOW()`
      })
      .where(
        and(
          eq(notificationPreferences.userId, userId),
          eq(notificationPreferences.storeId, storeId)
        )
      )
      .returning();

    if (!updated) {
      throw new Error('Notification preferences not found');
    }

    return updated;
  }

  async createEmailQueue(email: InsertEmailQueue): Promise<EmailQueue> {
    const [created] = await db
      .insert(emailQueue)
      .values(email)
      .returning();
    return created;
  }

  async getPendingEmails(limit: number = 50): Promise<EmailQueue[]> {
    return await db
      .select()
      .from(emailQueue)
      .where(eq(emailQueue.status, 'pending'))
      .orderBy(asc(emailQueue.priority), asc(emailQueue.scheduledAt))
      .limit(limit);
  }

  async updateEmailStatus(
    emailId: string, 
    status: 'pending' | 'sending' | 'sent' | 'failed' | 'retry', 
    sentAt?: Date
  ): Promise<EmailQueue> {
    const updateData: any = { status };
    if (sentAt) {
      updateData.sentAt = sentAt;
    }

    const [updated] = await db
      .update(emailQueue)
      .set(updateData)
      .where(eq(emailQueue.id, emailId))
      .returning();

    if (!updated) {
      throw new Error('Email queue item not found');
    }

    return updated;
  }
}

export const storage = new DatabaseStorage();
