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

export interface IStorage {
  // User operations (required for auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Store operations
  getUserStores(userId: string): Promise<Store[]>;
  createStore(store: InsertStore): Promise<Store>;
  getStore(id: string): Promise<Store | undefined>;
  updateStore(id: string, updates: Partial<Store>): Promise<Store>;
  
  // Vendor operations
  getStoreVendors(storeId: string): Promise<Vendor[]>;
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  getVendor(id: string): Promise<Vendor | undefined>;
  
  // Product operations
  createProduct(product: InsertProduct): Promise<Product>;
  getVendorProducts(vendorId: string): Promise<Product[]>;
  
  // Order operations
  createOrder(order: InsertOrder): Promise<Order>;
  createOrderLineItem(item: InsertOrderLineItem): Promise<OrderLineItem>;
  
  // Analytics operations
  upsertVendorAnalytics(analytics: InsertVendorAnalytics): Promise<VendorAnalytics>;
  getVendorAnalytics(storeId: string, vendorId?: string, startDate?: Date, endDate?: Date): Promise<VendorAnalytics[]>;
  getVendorSummary(storeId: string, vendorId?: string, startDate?: Date, endDate?: Date): Promise<any>;
  getTopProducts(storeId: string, vendorId?: string, limit?: number): Promise<any[]>;
  getTopLandingPages(storeId: string, vendorId?: string, limit?: number): Promise<PageAnalytics[]>;
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
    return await db.select().from(stores).where(eq(stores.userId, userId));
  }

  async createStore(store: InsertStore): Promise<Store> {
    const [newStore] = await db.insert(stores).values(store).returning();
    return newStore;
  }

  async getStore(id: string): Promise<Store | undefined> {
    const [store] = await db.select().from(stores).where(eq(stores.id, id));
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
    return await db.select().from(vendors).where(eq(vendors.storeId, storeId));
  }

  async createVendor(vendor: InsertVendor): Promise<Vendor> {
    const [newVendor] = await db.insert(vendors).values(vendor).returning();
    return newVendor;
  }

  async getVendor(id: string): Promise<Vendor | undefined> {
    const [vendor] = await db.select().from(vendors).where(eq(vendors.id, id));
    return vendor;
  }

  // Product operations
  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }

  async getVendorProducts(vendorId: string): Promise<Product[]> {
    return await db.select().from(products).where(eq(products.vendorId, vendorId));
  }

  // Order operations
  async createOrder(order: InsertOrder): Promise<Order> {
    const [newOrder] = await db.insert(orders).values(order).returning();
    return newOrder;
  }

  async createOrderLineItem(item: InsertOrderLineItem): Promise<OrderLineItem> {
    const [newItem] = await db.insert(orderLineItems).values(item).returning();
    return newItem;
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
    let query = db
      .select({
        productId: orderLineItems.productId,
        title: orderLineItems.title,
        vendor: orderLineItems.vendor,
        totalRevenue: sql<number>`SUM(${orderLineItems.price} * ${orderLineItems.quantity})`,
        totalQuantity: sql<number>`SUM(${orderLineItems.quantity})`,
      })
      .from(orderLineItems)
      .innerJoin(orders, eq(orders.id, orderLineItems.orderId))
      .where(eq(orders.storeId, storeId))
      .groupBy(orderLineItems.productId, orderLineItems.title, orderLineItems.vendor)
      .orderBy(desc(sql`SUM(${orderLineItems.price} * ${orderLineItems.quantity})`))
      .limit(limit);

    if (vendorId) {
      query = query.where(and(
        eq(orders.storeId, storeId),
        eq(orderLineItems.vendorId, vendorId)
      ));
    }

    return await query;
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
}

export const storage = new DatabaseStorage();
