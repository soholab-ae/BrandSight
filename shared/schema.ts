import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  decimal,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Shopify stores
export const stores = pgTable("stores", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: varchar("name").notNull(),
  domain: varchar("domain").notNull(),
  accessToken: varchar("access_token").notNull(),
  isActive: boolean("is_active").default(true),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Vendors/Brands
export const vendors = pgTable("vendors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  storeId: varchar("store_id").notNull().references(() => stores.id),
  name: varchar("name").notNull(),
  slug: varchar("slug").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Products
export const products = pgTable("products", {
  id: varchar("id").primaryKey(),
  storeId: varchar("store_id").notNull().references(() => stores.id),
  vendorId: varchar("vendor_id").references(() => vendors.id),
  title: varchar("title").notNull(),
  handle: varchar("handle").notNull(),
  vendor: varchar("vendor"),
  productType: varchar("product_type"),
  price: decimal("price", { precision: 10, scale: 2 }),
  compareAtPrice: decimal("compare_at_price", { precision: 10, scale: 2 }),
  status: varchar("status"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Orders
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey(),
  storeId: varchar("store_id").notNull().references(() => stores.id),
  orderNumber: varchar("order_number"),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }),
  subtotalPrice: decimal("subtotal_price", { precision: 10, scale: 2 }),
  totalTax: decimal("total_tax", { precision: 10, scale: 2 }),
  currency: varchar("currency"),
  financialStatus: varchar("financial_status"),
  fulfillmentStatus: varchar("fulfillment_status"),
  customerEmail: varchar("customer_email"),
  customerId: varchar("customer_id"),
  landingPage: varchar("landing_page"),
  referringSite: varchar("referring_site"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Order line items
export const orderLineItems = pgTable("order_line_items", {
  id: varchar("id").primaryKey(),
  orderId: varchar("order_id").notNull().references(() => orders.id),
  productId: varchar("product_id").references(() => products.id),
  vendorId: varchar("vendor_id").references(() => vendors.id),
  title: varchar("title"),
  vendor: varchar("vendor"),
  quantity: integer("quantity"),
  price: decimal("price", { precision: 10, scale: 2 }),
  totalDiscount: decimal("total_discount", { precision: 10, scale: 2 }),
});

// Analytics aggregated data
export const vendorAnalytics = pgTable("vendor_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  storeId: varchar("store_id").notNull().references(() => stores.id),
  vendorId: varchar("vendor_id").references(() => vendors.id),
  date: timestamp("date").notNull(),
  revenue: decimal("revenue", { precision: 10, scale: 2 }).default("0"),
  orders: integer("orders").default(0),
  visitors: integer("visitors").default(0),
  conversions: integer("conversions").default(0),
  aov: decimal("aov", { precision: 10, scale: 2 }).default("0"),
  conversionRate: decimal("conversion_rate", { precision: 5, scale: 4 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Page analytics
export const pageAnalytics = pgTable("page_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  storeId: varchar("store_id").notNull().references(() => stores.id),
  vendorId: varchar("vendor_id").references(() => vendors.id),
  path: varchar("path").notNull(),
  pageType: varchar("page_type"), // 'product', 'collection', 'page'
  visitors: integer("visitors").default(0),
  bounceRate: decimal("bounce_rate", { precision: 5, scale: 4 }),
  date: timestamp("date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Schema exports
export const insertStoreSchema = createInsertSchema(stores).omit({
  id: true,
  createdAt: true,
});

export const insertVendorSchema = createInsertSchema(vendors).omit({
  id: true,
  createdAt: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  createdAt: true,
});

export const insertOrderLineItemSchema = createInsertSchema(orderLineItems);

export const insertVendorAnalyticsSchema = createInsertSchema(vendorAnalytics).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type Store = typeof stores.$inferSelect;
export type InsertStore = z.infer<typeof insertStoreSchema>;

export type Vendor = typeof vendors.$inferSelect;
export type InsertVendor = z.infer<typeof insertVendorSchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type OrderLineItem = typeof orderLineItems.$inferSelect;
export type InsertOrderLineItem = z.infer<typeof insertOrderLineItemSchema>;

export type VendorAnalytics = typeof vendorAnalytics.$inferSelect;
export type InsertVendorAnalytics = z.infer<typeof insertVendorAnalyticsSchema>;

export type PageAnalytics = typeof pageAnalytics.$inferSelect;
