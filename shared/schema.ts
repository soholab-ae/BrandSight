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
  pgEnum,
  unique,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums for new features
export const alertTypeEnum = pgEnum('alert_type', ['performance_drop', 'performance_spike', 'inventory_low', 'sales_trend']);
export const severityEnum = pgEnum('severity', ['low', 'medium', 'high']);
export const thresholdTypeEnum = pgEnum('threshold_type', ['percentage', 'absolute']);

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
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: varchar("name").notNull(),
  domain: varchar("domain").notNull(),
  accessToken: varchar("access_token").notNull(),
  isActive: boolean("is_active").default(true),
  lastSyncAt: timestamp("last_sync_at"),
  lastProductSyncAt: timestamp("last_product_sync_at"),
  lastOrderSyncAt: timestamp("last_order_sync_at"),
  productSyncCursor: varchar("product_sync_cursor"),
  orderSyncCursor: varchar("order_sync_cursor"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Vendors/Brands
export const vendors = pgTable("vendors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  storeId: varchar("store_id").notNull().references(() => stores.id),
  name: varchar("name").notNull(),
  slug: varchar("slug").notNull(),
  // Cost and inventory management fields
  defaultMarginPercentage: decimal("default_margin_percentage", { precision: 5, scale: 2 }), // Default margin for this vendor's products
  leadTimeDays: integer("lead_time_days").default(14), // Lead time in days for this vendor
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_vendors_store_id").on(table.storeId),
]);

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
  // Cost fields for accurate profitability analysis
  cost: decimal("cost", { precision: 10, scale: 2 }), // Actual product cost
  marginPercentage: decimal("margin_percentage", { precision: 5, scale: 2 }), // Vendor-specific margin if cost not available
  status: varchar("status"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_products_store_id").on(table.storeId),
  index("IDX_products_vendor_id").on(table.vendorId),
]);

// Inventory tracking for real-time stock levels
export const inventory = pgTable("inventory", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull().references(() => products.id),
  storeId: varchar("store_id").notNull().references(() => stores.id),
  vendorId: varchar("vendor_id").references(() => vendors.id),
  quantity: integer("quantity").notNull().default(0),
  availableQuantity: integer("available_quantity").notNull().default(0),
  reservedQuantity: integer("reserved_quantity").notNull().default(0),
  lastUpdated: timestamp("last_updated").defaultNow(),
  syncedAt: timestamp("synced_at"),
}, (table) => [
  index("IDX_inventory_product_id").on(table.productId),
  index("IDX_inventory_store_id").on(table.storeId),
  index("IDX_inventory_vendor_id").on(table.vendorId),
  unique("UQ_inventory_product").on(table.productId), // One inventory record per product
]);

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
}, (table) => [
  index("IDX_orders_store_id").on(table.storeId),
  index("IDX_orders_store_id_processed_at").on(table.storeId, table.processedAt),
  index("IDX_orders_financial_status").on(table.financialStatus),
]);

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
}, (table) => [
  index("IDX_order_line_items_order_id").on(table.orderId),
  index("IDX_order_line_items_vendor_id").on(table.vendorId),
  index("IDX_order_line_items_product_id").on(table.productId),
]);

// Store subscriptions
export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  storeId: varchar("store_id").notNull().references(() => stores.id),
  shopifySubscriptionId: varchar("shopify_subscription_id"),
  planName: varchar("plan_name").notNull(), // 'Starter', 'Growth', 'Scale'
  status: varchar("status").notNull(), // 'active', 'cancelled', 'expired', 'trial'
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency").default("USD"),
  trialEndsAt: timestamp("trial_ends_at"),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelledAt: timestamp("cancelled_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_subscriptions_store_id").on(table.storeId),
  index("IDX_subscriptions_status").on(table.status),
  index("IDX_subscriptions_shopify_id").on(table.shopifySubscriptionId),
]);

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
}, (table) => [
  index("IDX_vendor_analytics_store_id").on(table.storeId),
  index("IDX_vendor_analytics_store_vendor_date").on(table.storeId, table.vendorId, table.date),
  index("IDX_vendor_analytics_date").on(table.date),
]);

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
}, (table) => [
  index("IDX_page_analytics_store_id").on(table.storeId),
  index("IDX_page_analytics_store_vendor_date").on(table.storeId, table.vendorId, table.date),
  index("IDX_page_analytics_path").on(table.path),
]);

// ============= PHASE 1 NEW FEATURES =============

// 1. Smart Alerts System
export const alerts = pgTable("alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  storeId: varchar("store_id").notNull().references(() => stores.id),
  alertType: alertTypeEnum("alert_type").notNull(),
  message: text("message").notNull(),
  thresholdValue: decimal("threshold_value", { precision: 10, scale: 2 }),
  currentValue: decimal("current_value", { precision: 10, scale: 2 }),
  severity: severityEnum("severity").notNull(),
  vendorId: varchar("vendor_id").references(() => vendors.id),
  createdAt: timestamp("created_at").defaultNow(),
  acknowledgedAt: timestamp("acknowledged_at"),
  isRead: boolean("is_read").default(false),
  // Time bucket for duplicate prevention (hour-based: YYYY-MM-DD-HH)
  timeBucket: varchar("time_bucket").notNull().default(sql`to_char(now(), 'YYYY-MM-DD-HH24')`),
}, (table) => [
  index("IDX_alerts_store_id").on(table.storeId),
  index("IDX_alerts_vendor_id").on(table.vendorId),
  index("IDX_alerts_created_at").on(table.createdAt),
  index("IDX_alerts_severity").on(table.severity),
  index("IDX_alerts_is_read").on(table.isRead),
  index("IDX_alerts_time_bucket").on(table.timeBucket),
  // Unique constraint to prevent duplicate alerts within the same time bucket
  unique("alerts_duplicate_prevention").on(table.storeId, table.vendorId, table.alertType, table.timeBucket),
]);

export const alertRules = pgTable("alert_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  storeId: varchar("store_id").notNull().references(() => stores.id),
  alertType: alertTypeEnum("alert_type").notNull(),
  vendorId: varchar("vendor_id").references(() => vendors.id),
  thresholdType: thresholdTypeEnum("threshold_type").notNull(),
  thresholdValue: decimal("threshold_value", { precision: 10, scale: 2 }).notNull(),
  enabled: boolean("enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_alert_rules_store_id").on(table.storeId),
  index("IDX_alert_rules_vendor_id").on(table.vendorId),
  index("IDX_alert_rules_created_at").on(table.createdAt),
  index("IDX_alert_rules_enabled").on(table.enabled),
]);

// 2. Customer Brand Loyalty Tracking
export const customerBrandAffinity = pgTable("customer_brand_affinity", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  storeId: varchar("store_id").notNull().references(() => stores.id),
  customerId: text("customer_id").notNull(),
  vendorId: varchar("vendor_id").notNull().references(() => vendors.id),
  affinityScore: decimal("affinity_score", { precision: 5, scale: 2 }).notNull(),
  totalOrders: integer("total_orders").default(0),
  totalSpent: decimal("total_spent", { precision: 10, scale: 2 }).default("0"),
  firstPurchase: timestamp("first_purchase"),
  lastPurchase: timestamp("last_purchase"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_customer_brand_affinity_store_id").on(table.storeId),
  index("IDX_customer_brand_affinity_vendor_id").on(table.vendorId),
  index("IDX_customer_brand_affinity_customer_id").on(table.customerId),
  index("IDX_customer_brand_affinity_created_at").on(table.createdAt),
  // CRITICAL: Unique composite index for atomic upserts and race condition prevention
  unique("customer_brand_affinity_unique_composite").on(table.storeId, table.customerId, table.vendorId),
]);

export const customerCrossBrandPurchases = pgTable("customer_cross_brand_purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  storeId: varchar("store_id").notNull().references(() => stores.id),
  customerId: text("customer_id").notNull(),
  primaryVendorId: varchar("primary_vendor_id").notNull().references(() => vendors.id),
  secondaryVendorId: varchar("secondary_vendor_id").notNull().references(() => vendors.id),
  crossPurchaseCount: integer("cross_purchase_count").default(0),
  totalCrossValue: decimal("total_cross_value", { precision: 10, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_customer_cross_brand_store_id").on(table.storeId),
  index("IDX_customer_cross_brand_customer_id").on(table.customerId),
  index("IDX_customer_cross_brand_primary_vendor").on(table.primaryVendorId),
  index("IDX_customer_cross_brand_secondary_vendor").on(table.secondaryVendorId),
  index("IDX_customer_cross_brand_created_at").on(table.createdAt),
  // Enhanced index coverage for cross-brand analysis optimization
  index("IDX_customer_cross_brand_analysis").on(table.storeId, table.primaryVendorId, table.secondaryVendorId),
]);

// 3. Inventory Intelligence
export const inventoryAnalytics = pgTable("inventory_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull().references(() => products.id),
  vendorId: varchar("vendor_id").notNull().references(() => vendors.id),
  storeId: varchar("store_id").notNull().references(() => stores.id),
  sellThroughRate: decimal("sell_through_rate", { precision: 5, scale: 4 }),
  daysOfInventory: integer("days_of_inventory"),
  reorderPoint: integer("reorder_point"),
  deadStockFlag: boolean("dead_stock_flag").default(false),
  marginPercentage: decimal("margin_percentage", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_inventory_analytics_store_id").on(table.storeId),
  index("IDX_inventory_analytics_vendor_id").on(table.vendorId),
  index("IDX_inventory_analytics_product_id").on(table.productId),
  index("IDX_inventory_analytics_created_at").on(table.createdAt),
  index("IDX_inventory_analytics_dead_stock").on(table.deadStockFlag),
]);

export const vendorInventorySummary = pgTable("vendor_inventory_summary", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorId: varchar("vendor_id").notNull().references(() => vendors.id),
  storeId: varchar("store_id").notNull().references(() => stores.id),
  totalProducts: integer("total_products").default(0),
  activeProducts: integer("active_products").default(0),
  deadStockCount: integer("dead_stock_count").default(0),
  avgSellThroughRate: decimal("avg_sell_through_rate", { precision: 5, scale: 4 }),
  totalInventoryValue: decimal("total_inventory_value", { precision: 12, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_vendor_inventory_summary_store_id").on(table.storeId),
  index("IDX_vendor_inventory_summary_vendor_id").on(table.vendorId),
  index("IDX_vendor_inventory_summary_created_at").on(table.createdAt),
]);

// 4. Predictive Forecasting
export const salesForecasts = pgTable("sales_forecasts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  storeId: varchar("store_id").notNull().references(() => stores.id),
  vendorId: varchar("vendor_id").references(() => vendors.id),
  forecastDate: timestamp("forecast_date").notNull(),
  periodDays: integer("period_days").notNull(), // 30, 60, or 90
  predictedSales: decimal("predicted_sales", { precision: 10, scale: 2 }).notNull(),
  predictedOrders: integer("predicted_orders"),
  confidenceScore: decimal("confidence_score", { precision: 5, scale: 4 }),
  modelUsed: varchar("model_used"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_sales_forecasts_store_id").on(table.storeId),
  index("IDX_sales_forecasts_vendor_id").on(table.vendorId),
  index("IDX_sales_forecasts_forecast_date").on(table.forecastDate),
  index("IDX_sales_forecasts_created_at").on(table.createdAt),
]);

export const forecastAccuracy = pgTable("forecast_accuracy", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  storeId: varchar("store_id").notNull().references(() => stores.id),
  vendorId: varchar("vendor_id").references(() => vendors.id),
  forecastPeriod: integer("forecast_period").notNull(),
  predictedValue: decimal("predicted_value", { precision: 10, scale: 2 }).notNull(),
  actualValue: decimal("actual_value", { precision: 10, scale: 2 }).notNull(),
  accuracyPercentage: decimal("accuracy_percentage", { precision: 5, scale: 2 }),
  forecastDate: timestamp("forecast_date").notNull(),
  recordedAt: timestamp("recorded_at").defaultNow(),
}, (table) => [
  index("IDX_forecast_accuracy_store_id").on(table.storeId),
  index("IDX_forecast_accuracy_vendor_id").on(table.vendorId),
  index("IDX_forecast_accuracy_forecast_date").on(table.forecastDate),
  index("IDX_forecast_accuracy_recorded_at").on(table.recordedAt),
]);

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

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVendorAnalyticsSchema = createInsertSchema(vendorAnalytics).omit({
  id: true,
  createdAt: true,
});

// New Phase 1 feature schemas
export const insertAlertSchema = createInsertSchema(alerts).omit({
  id: true,
  createdAt: true,
  acknowledgedAt: true,
  isRead: true,
  timeBucket: true, // Auto-generated, no need for manual input
});

export const insertAlertRuleSchema = createInsertSchema(alertRules).omit({
  id: true,
  createdAt: true,
});

export const insertCustomerBrandAffinitySchema = createInsertSchema(customerBrandAffinity).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCustomerCrossBrandPurchasesSchema = createInsertSchema(customerCrossBrandPurchases).omit({
  id: true,
  createdAt: true,
});

export const insertInventoryAnalyticsSchema = createInsertSchema(inventoryAnalytics).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInventorySchema = createInsertSchema(inventory).omit({
  id: true,
  lastUpdated: true,
});

export const insertVendorInventorySummarySchema = createInsertSchema(vendorInventorySummary).omit({
  id: true,
  createdAt: true,
});

export const insertSalesForecastSchema = createInsertSchema(salesForecasts).omit({
  id: true,
  createdAt: true,
});

export const insertForecastAccuracySchema = createInsertSchema(forecastAccuracy).omit({
  id: true,
  recordedAt: true,
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

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;

// New Phase 1 feature types
export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;

export type AlertRule = typeof alertRules.$inferSelect;
export type InsertAlertRule = z.infer<typeof insertAlertRuleSchema>;

export type CustomerBrandAffinity = typeof customerBrandAffinity.$inferSelect;
export type InsertCustomerBrandAffinity = z.infer<typeof insertCustomerBrandAffinitySchema>;

export type CustomerCrossBrandPurchases = typeof customerCrossBrandPurchases.$inferSelect;
export type InsertCustomerCrossBrandPurchases = z.infer<typeof insertCustomerCrossBrandPurchasesSchema>;

export type InventoryAnalytics = typeof inventoryAnalytics.$inferSelect;
export type InsertInventoryAnalytics = z.infer<typeof insertInventoryAnalyticsSchema>;

export type Inventory = typeof inventory.$inferSelect;
export type InsertInventory = z.infer<typeof insertInventorySchema>;

export type VendorInventorySummary = typeof vendorInventorySummary.$inferSelect;
export type InsertVendorInventorySummary = z.infer<typeof insertVendorInventorySummarySchema>;

export type SalesForecast = typeof salesForecasts.$inferSelect;
export type InsertSalesForecast = z.infer<typeof insertSalesForecastSchema>;

export type ForecastAccuracy = typeof forecastAccuracy.$inferSelect;
export type InsertForecastAccuracy = z.infer<typeof insertForecastAccuracySchema>;

// Pagination types
export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  search?: string;
  vendorId?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    nextCursor?: string;
    prevCursor?: string;
  };
}

// Subscription plan configurations
export interface PlanFeatures {
  vendorLimit: number; // -1 for unlimited
  dataHistoryDays: number;
  features: string[];
  displayFeatures: string[];
}

export interface PlanConfig {
  name: string;
  amount: number;
  currencyCode: string;
  trialDays: number;
  features: PlanFeatures;
}

// Plan restriction checker
export interface PlanRestrictions {
  canAddVendor: (currentCount: number) => boolean;
  canAccessData: (date: Date) => boolean;
  hasFeature: (feature: string) => boolean;
  vendorLimit: number;
  dataHistoryDays: number;
}

// Plan names enum
export const PLAN_NAMES = {
  STARTER: 'Starter',
  GROWTH: 'Growth', 
  SCALE: 'Scale'
} as const;

export type PlanName = typeof PLAN_NAMES[keyof typeof PLAN_NAMES];

// Subscription status enum
export const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
  TRIAL: 'trial'
} as const;

export type SubscriptionStatus = typeof SUBSCRIPTION_STATUS[keyof typeof SUBSCRIPTION_STATUS];

// Vendor metrics for optimized queries
export interface VendorMetrics {
  id: string;
  name: string;
  productCount: number;
  revenue: number;
  aov: number;
  conversion: number;
  visitors: number;
  growth: number;
  totalOrders: number;
}
