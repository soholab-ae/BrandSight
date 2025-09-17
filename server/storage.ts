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
  
  // Vendor operations
  getStoreVendors(storeId: string): Promise<Vendor[]>;
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  getVendor(id: string): Promise<Vendor | undefined>;
  
  // Product operations
  upsertProduct(product: InsertProduct): Promise<Product>;
  bulkUpsertProducts(products: InsertProduct[]): Promise<Product[]>;
  getVendorProducts(vendorId: string): Promise<Product[]>;
  
  // Order operations
  upsertOrder(order: InsertOrder): Promise<Order>;
  bulkUpsertOrders(orders: InsertOrder[]): Promise<Order[]>;
  upsertOrderLineItem(item: InsertOrderLineItem): Promise<OrderLineItem>;
  bulkUpsertOrderLineItems(items: InsertOrderLineItem[]): Promise<OrderLineItem[]>;
  
  // Analytics operations
  upsertVendorAnalytics(analytics: InsertVendorAnalytics): Promise<VendorAnalytics>;
  getVendorAnalytics(storeId: string, vendorId?: string, startDate?: Date, endDate?: Date): Promise<VendorAnalytics[]>;
  getVendorSummary(storeId: string, vendorId?: string, startDate?: Date, endDate?: Date): Promise<any>;
  getTopProducts(storeId: string, vendorId?: string, limit?: number): Promise<any[]>;
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
