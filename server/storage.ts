import {
  users,
  stores,
  vendors,
  products,
  orders,
  orderLineItems,
  vendorAnalytics,
  pageAnalytics,
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
  getStoreVendorMetrics(storeId: string, params: PaginationParams): Promise<PaginatedResponse<VendorMetrics>>;
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
}

export class DatabaseStorage implements IStorage {
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
    return await db.select().from(stores).where(eq(stores.userId, userId));
  }

  async createStore(store: InsertStore): Promise<Store> {
    const [newStore] = await db.insert(stores).values([store]).returning();
    return newStore;
  }

  async getStore(id: string): Promise<Store | undefined> {
    const [store] = await db.select().from(stores).where(eq(stores.id, id));
    return store;
  }

  async getStoreByDomain(domain: string): Promise<Store | undefined> {
    // Return demo store for demo domain
    if (domain === 'demo-store.myshopify.com') {
      return demoStore;
    }
    const [store] = await db.select().from(stores).where(eq(stores.domain, domain));
    return store;
  }

  async updateStore(id: string, updates: Partial<Store>): Promise<Store> {
    const [store] = await db
      .update(stores)
      .set(updates)
      .where(eq(stores.id, id))
      .returning();
    return store;
  }

  // Vendor operations
  async getStoreVendors(storeId: string): Promise<Vendor[]> {
    // Return demo vendors for demo store
    if (storeId === 'demo_store_1') {
      return demoVendors;
    }
    return await db.select().from(vendors).where(eq(vendors.storeId, storeId));
  }

  async getStoreVendorsPaginated(storeId: string, params: PaginationParams): Promise<PaginatedResponse<Vendor>> {
    const { page = 1, limit = 50, sortBy = 'name', sortDirection = 'asc', search } = params;
    const offset = (page - 1) * limit;

    // Return demo vendors for demo store with pagination
    if (storeId === 'demo_store_1') {
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

    let query = db.select().from(vendors).where(eq(vendors.storeId, storeId));
    let countQuery = db.select({ count: sql<number>`count(*)` }).from(vendors).where(eq(vendors.storeId, storeId));

    // Apply search filter
    if (search) {
      const searchCondition = sql`${vendors.name} ILIKE ${'%' + search + '%'}`;
      query = query.where(and(eq(vendors.storeId, storeId), searchCondition));
      countQuery = countQuery.where(and(eq(vendors.storeId, storeId), searchCondition));
    }

    // Apply sorting
    if (sortBy === 'name') {
      query = query.orderBy(sortDirection === 'asc' ? asc(vendors.name) : desc(vendors.name));
    } else if (sortBy === 'createdAt') {
      query = query.orderBy(sortDirection === 'asc' ? asc(vendors.createdAt) : desc(vendors.createdAt));
    }

    // Apply pagination
    query = query.limit(limit).offset(offset);

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

  async getStoreVendorMetrics(storeId: string, params: PaginationParams): Promise<PaginatedResponse<VendorMetrics>> {
    const { page = 1, limit = 50, sortBy = 'revenue', sortDirection = 'desc', search } = params;
    const offset = (page - 1) * limit;

    // Return demo vendor metrics for demo store
    if (storeId === 'demo_store_1') {
      const vendorMetrics: VendorMetrics[] = demoVendors.map(vendor => ({
        id: vendor.id,
        name: vendor.name,
        productCount: Math.floor(Math.random() * 100 + 10),
        revenue: Math.floor(Math.random() * 100000 + 10000),
        aov: Math.floor(Math.random() * 200 + 50),
        conversion: Math.random() * 5 + 1,
        visitors: Math.floor(Math.random() * 10000 + 1000),
        growth: Math.random() * 50 - 10,
        totalOrders: Math.floor(Math.random() * 500 + 50)
      }));

      let filteredMetrics = [...vendorMetrics];
      
      if (search) {
        filteredMetrics = filteredMetrics.filter(v => 
          v.name.toLowerCase().includes(search.toLowerCase())
        );
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

    // TODO: Implement real vendor metrics calculation from database
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

    let query = db.select().from(products).where(eq(products.vendorId, vendorId));
    let countQuery = db.select({ count: sql<number>`count(*)` }).from(products).where(eq(products.vendorId, vendorId));

    // Apply search filter
    if (search) {
      const searchCondition = sql`${products.title} ILIKE ${'%' + search + '%'}`;
      query = query.where(and(eq(products.vendorId, vendorId), searchCondition));
      countQuery = countQuery.where(and(eq(products.vendorId, vendorId), searchCondition));
    }

    // Apply sorting
    if (sortBy === 'title') {
      query = query.orderBy(sortDirection === 'asc' ? asc(products.title) : desc(products.title));
    } else if (sortBy === 'price') {
      query = query.orderBy(sortDirection === 'asc' ? asc(products.price) : desc(products.price));
    }

    query = query.limit(limit).offset(offset);

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
    if (storeId === 'demo_store_1') {
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

    let query = db.select().from(products).where(eq(products.storeId, storeId));
    let countQuery = db.select({ count: sql<number>`count(*)` }).from(products).where(eq(products.storeId, storeId));

    // Apply search filter
    if (search) {
      const searchCondition = sql`${products.title} ILIKE ${'%' + search + '%'} OR ${products.vendor} ILIKE ${'%' + search + '%'}`;
      query = query.where(and(eq(products.storeId, storeId), searchCondition));
      countQuery = countQuery.where(and(eq(products.storeId, storeId), searchCondition));
    }

    // Apply sorting
    if (sortBy === 'title') {
      query = query.orderBy(sortDirection === 'asc' ? asc(products.title) : desc(products.title));
    } else if (sortBy === 'price') {
      query = query.orderBy(sortDirection === 'asc' ? asc(products.price) : desc(products.price));
    } else if (sortBy === 'vendor') {
      query = query.orderBy(sortDirection === 'asc' ? asc(products.vendor) : desc(products.vendor));
    }

    query = query.limit(limit).offset(offset);

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
    if (storeId === 'demo_store_1') {
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
    
    let query = db.select().from(vendorAnalytics).where(and(...conditions));
    let countQuery = db.select({ count: sql<number>`count(*)` }).from(vendorAnalytics).where(and(...conditions));
    
    // Apply sorting
    if (sortBy === 'date') {
      query = query.orderBy(sortDirection === 'asc' ? asc(vendorAnalytics.date) : desc(vendorAnalytics.date));
    } else if (sortBy === 'revenue') {
      query = query.orderBy(sortDirection === 'asc' ? asc(vendorAnalytics.revenue) : desc(vendorAnalytics.revenue));
    }
    
    query = query.limit(limit).offset(offset);
    
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
    if (storeId === 'demo_store_1') {
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
    if (storeId === 'demo_store_1') {
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
    if (storeId === 'demo_store_1') {
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
    if (storeId === 'demo_store_1') {
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
}

export const storage = new DatabaseStorage();
