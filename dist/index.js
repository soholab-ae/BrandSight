var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  insertOrderLineItemSchema: () => insertOrderLineItemSchema,
  insertOrderSchema: () => insertOrderSchema,
  insertProductSchema: () => insertProductSchema,
  insertStoreSchema: () => insertStoreSchema,
  insertVendorAnalyticsSchema: () => insertVendorAnalyticsSchema,
  insertVendorSchema: () => insertVendorSchema,
  orderLineItems: () => orderLineItems,
  orders: () => orders,
  pageAnalytics: () => pageAnalytics,
  products: () => products,
  sessions: () => sessions,
  stores: () => stores,
  users: () => users,
  vendorAnalytics: () => vendorAnalytics,
  vendors: () => vendors
});
import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  decimal,
  integer,
  boolean
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var sessions, users, stores, vendors, products, orders, orderLineItems, vendorAnalytics, pageAnalytics, insertStoreSchema, insertVendorSchema, insertProductSchema, insertOrderSchema, insertOrderLineItemSchema, insertVendorAnalyticsSchema;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    sessions = pgTable(
      "sessions",
      {
        sid: varchar("sid").primaryKey(),
        sess: jsonb("sess").notNull(),
        expire: timestamp("expire").notNull()
      },
      (table) => [index("IDX_session_expire").on(table.expire)]
    );
    users = pgTable("users", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      email: varchar("email").unique(),
      firstName: varchar("first_name"),
      lastName: varchar("last_name"),
      profileImageUrl: varchar("profile_image_url"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    stores = pgTable("stores", {
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
      createdAt: timestamp("created_at").defaultNow()
    });
    vendors = pgTable("vendors", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      storeId: varchar("store_id").notNull().references(() => stores.id),
      name: varchar("name").notNull(),
      slug: varchar("slug").notNull(),
      createdAt: timestamp("created_at").defaultNow()
    }, (table) => [
      index("IDX_vendors_store_id").on(table.storeId)
    ]);
    products = pgTable("products", {
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
      updatedAt: timestamp("updated_at").defaultNow()
    }, (table) => [
      index("IDX_products_store_id").on(table.storeId),
      index("IDX_products_vendor_id").on(table.vendorId)
    ]);
    orders = pgTable("orders", {
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
      createdAt: timestamp("created_at").defaultNow()
    }, (table) => [
      index("IDX_orders_store_id").on(table.storeId),
      index("IDX_orders_store_id_processed_at").on(table.storeId, table.processedAt),
      index("IDX_orders_financial_status").on(table.financialStatus)
    ]);
    orderLineItems = pgTable("order_line_items", {
      id: varchar("id").primaryKey(),
      orderId: varchar("order_id").notNull().references(() => orders.id),
      productId: varchar("product_id").references(() => products.id),
      vendorId: varchar("vendor_id").references(() => vendors.id),
      title: varchar("title"),
      vendor: varchar("vendor"),
      quantity: integer("quantity"),
      price: decimal("price", { precision: 10, scale: 2 }),
      totalDiscount: decimal("total_discount", { precision: 10, scale: 2 })
    }, (table) => [
      index("IDX_order_line_items_order_id").on(table.orderId),
      index("IDX_order_line_items_vendor_id").on(table.vendorId),
      index("IDX_order_line_items_product_id").on(table.productId)
    ]);
    vendorAnalytics = pgTable("vendor_analytics", {
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
      createdAt: timestamp("created_at").defaultNow()
    }, (table) => [
      index("IDX_vendor_analytics_store_id").on(table.storeId),
      index("IDX_vendor_analytics_store_vendor_date").on(table.storeId, table.vendorId, table.date),
      index("IDX_vendor_analytics_date").on(table.date)
    ]);
    pageAnalytics = pgTable("page_analytics", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      storeId: varchar("store_id").notNull().references(() => stores.id),
      vendorId: varchar("vendor_id").references(() => vendors.id),
      path: varchar("path").notNull(),
      pageType: varchar("page_type"),
      // 'product', 'collection', 'page'
      visitors: integer("visitors").default(0),
      bounceRate: decimal("bounce_rate", { precision: 5, scale: 4 }),
      date: timestamp("date").notNull(),
      createdAt: timestamp("created_at").defaultNow()
    }, (table) => [
      index("IDX_page_analytics_store_id").on(table.storeId),
      index("IDX_page_analytics_store_vendor_date").on(table.storeId, table.vendorId, table.date),
      index("IDX_page_analytics_path").on(table.path)
    ]);
    insertStoreSchema = createInsertSchema(stores).omit({
      id: true,
      createdAt: true
    });
    insertVendorSchema = createInsertSchema(vendors).omit({
      id: true,
      createdAt: true
    });
    insertProductSchema = createInsertSchema(products).omit({
      createdAt: true,
      updatedAt: true
    });
    insertOrderSchema = createInsertSchema(orders).omit({
      createdAt: true
    });
    insertOrderLineItemSchema = createInsertSchema(orderLineItems);
    insertVendorAnalyticsSchema = createInsertSchema(vendorAnalytics).omit({
      id: true,
      createdAt: true
    });
  }
});

// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
var pool, db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    neonConfig.webSocketConstructor = ws;
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL must be set. Did you forget to provision a database?"
      );
    }
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle({ client: pool, schema: schema_exports });
  }
});

// server/demoData.ts
function generateDemoOrders() {
  const orders2 = [];
  const startDate = /* @__PURE__ */ new Date("2024-01-01");
  const endDate = /* @__PURE__ */ new Date();
  for (let i = 0; i < 250; i++) {
    const orderDate = new Date(
      startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime())
    );
    const vendorWeights = [
      { vendor: "Nike", weight: 0.35 },
      { vendor: "Adidas", weight: 0.25 },
      { vendor: "Under Armour", weight: 0.2 },
      { vendor: "Puma", weight: 0.12 },
      { vendor: "New Balance", weight: 0.08 }
    ];
    const random = Math.random();
    let cumulative = 0;
    let selectedVendor = "Nike";
    for (const { vendor, weight } of vendorWeights) {
      cumulative += weight;
      if (random < cumulative) {
        selectedVendor = vendor;
        break;
      }
    }
    const vendorAOV = {
      "Nike": 89.99,
      "Adidas": 75.5,
      "Under Armour": 95.25,
      "Puma": 68.4,
      "New Balance": 82.1
    };
    const baseAOV = vendorAOV[selectedVendor];
    const variance = (Math.random() - 0.5) * baseAOV * 0.6;
    const totalPrice = Math.max(25, baseAOV + variance);
    const subtotalPrice = totalPrice * 0.9;
    const totalTax = totalPrice * 0.1;
    orders2.push({
      id: `order_${i + 1}`,
      storeId: "demo_store_1",
      orderNumber: `#${1e3 + i}`,
      totalPrice: totalPrice.toFixed(2),
      subtotalPrice: subtotalPrice.toFixed(2),
      totalTax: totalTax.toFixed(2),
      currency: "USD",
      financialStatus: "paid",
      fulfillmentStatus: "fulfilled",
      customerEmail: `customer${i + 1}@example.com`,
      customerId: `customer_${i + 1}`,
      landingPage: i % 3 === 0 ? "/products" : i % 3 === 1 ? "/collections" : null,
      referringSite: i % 4 === 0 ? "google.com" : i % 4 === 1 ? "facebook.com" : null,
      processedAt: orderDate,
      createdAt: orderDate
    });
  }
  return orders2.sort((a, b) => (b.processedAt?.getTime() || 0) - (a.processedAt?.getTime() || 0));
}
function getDemoOrderLineItems(orderId) {
  const order = demoOrders.find((o) => o.id === orderId);
  if (!order) return [];
  const orderTotal = parseFloat(order.totalPrice || "0");
  let vendorName = "Nike";
  let vendorId = "vendor_1";
  if (orderTotal < 60) {
    vendorName = "Puma";
    vendorId = "vendor_4";
  } else if (orderTotal < 70) {
    vendorName = "Adidas";
    vendorId = "vendor_2";
  } else if (orderTotal < 85) {
    vendorName = "New Balance";
    vendorId = "vendor_5";
  } else if (orderTotal < 100) {
    vendorName = "Nike";
    vendorId = "vendor_1";
  } else {
    vendorName = "Under Armour";
    vendorId = "vendor_3";
  }
  const vendorProducts = demoProducts.filter((p) => p.vendor === vendorName);
  if (vendorProducts.length === 0) return [];
  const itemCount = Math.min(vendorProducts.length, 1 + Math.floor(Math.random() * 3));
  const lineItems = [];
  const selectedProducts = [...vendorProducts].sort(() => Math.random() - 0.5).slice(0, itemCount);
  let remainingTotal = parseFloat(order.totalPrice || "0");
  for (let i = 0; i < selectedProducts.length; i++) {
    const product = selectedProducts[i];
    const isLast = i === selectedProducts.length - 1;
    const price = isLast ? remainingTotal : remainingTotal * (0.3 + Math.random() * 0.4);
    const quantity = 1 + Math.floor(Math.random() * 2);
    const unitPrice = price / quantity;
    lineItems.push({
      id: `${orderId}_item_${i + 1}`,
      orderId,
      productId: product.id,
      vendorId,
      title: product.title,
      vendor: product.vendor,
      quantity,
      price: unitPrice.toFixed(2),
      totalDiscount: "0.00"
    });
    remainingTotal -= price;
  }
  return lineItems;
}
function generateVendorAnalytics() {
  const analytics = [];
  const startDate = /* @__PURE__ */ new Date("2024-01-01");
  const endDate = /* @__PURE__ */ new Date();
  demoVendors.forEach((vendor) => {
    const dailyOrders = /* @__PURE__ */ new Map();
    demoOrders.forEach((order) => {
      const lineItems = getDemoOrderLineItems(order.id);
      const hasVendorItem = lineItems.some((item) => item.vendorId === vendor.id);
      if (hasVendorItem && order.processedAt) {
        const dateKey = order.processedAt.toISOString().split("T")[0];
        const existing = dailyOrders.get(dateKey) || [];
        existing.push(order);
        dailyOrders.set(dateKey, existing);
      }
    });
    dailyOrders.forEach((orders2, dateStr) => {
      const date = new Date(dateStr);
      let totalRevenue = 0;
      orders2.forEach((order) => {
        const lineItems = getDemoOrderLineItems(order.id);
        lineItems.forEach((item) => {
          if (item.vendorId === vendor.id) {
            totalRevenue += parseFloat(item.price || "0") * (item.quantity || 1);
          }
        });
      });
      const orderCount = orders2.length;
      const aov = orderCount > 0 ? totalRevenue / orderCount : 0;
      const conversionRate = 0.025 + Math.random() * 0.02;
      const visitors = Math.floor(orderCount / conversionRate);
      const conversions = orderCount;
      analytics.push({
        id: `analytics_${vendor.id}_${dateStr}`,
        storeId: vendor.storeId,
        vendorId: vendor.id,
        date,
        revenue: totalRevenue.toFixed(2),
        orders: orderCount,
        visitors,
        conversions,
        aov: aov.toFixed(2),
        conversionRate: conversionRate.toFixed(4),
        createdAt: /* @__PURE__ */ new Date()
      });
    });
  });
  return analytics.sort((a, b) => b.date.getTime() - a.date.getTime());
}
function isDemoMode(userId) {
  return !userId || userId === "demo_user" || userId.startsWith("demo_");
}
var demoStore, demoVendors, demoProducts, demoOrders, demoVendorAnalytics;
var init_demoData = __esm({
  "server/demoData.ts"() {
    "use strict";
    demoStore = {
      id: "demo_store_1",
      userId: "demo_user",
      name: "Demo Store",
      domain: "demo-store.myshopify.com",
      accessToken: "demo_token",
      isActive: true,
      lastSyncAt: /* @__PURE__ */ new Date(),
      lastProductSyncAt: /* @__PURE__ */ new Date("2024-12-01"),
      lastOrderSyncAt: /* @__PURE__ */ new Date("2024-12-01"),
      productSyncCursor: null,
      orderSyncCursor: null,
      createdAt: /* @__PURE__ */ new Date("2024-01-01")
    };
    demoVendors = [
      {
        id: "vendor_1",
        storeId: "demo_store_1",
        name: "Nike",
        slug: "nike",
        createdAt: /* @__PURE__ */ new Date("2024-01-01")
      },
      {
        id: "vendor_2",
        storeId: "demo_store_1",
        name: "Adidas",
        slug: "adidas",
        createdAt: /* @__PURE__ */ new Date("2024-01-01")
      },
      {
        id: "vendor_3",
        storeId: "demo_store_1",
        name: "Under Armour",
        slug: "under-armour",
        createdAt: /* @__PURE__ */ new Date("2024-01-01")
      },
      {
        id: "vendor_4",
        storeId: "demo_store_1",
        name: "Puma",
        slug: "puma",
        createdAt: /* @__PURE__ */ new Date("2024-01-01")
      },
      {
        id: "vendor_5",
        storeId: "demo_store_1",
        name: "New Balance",
        slug: "new-balance",
        createdAt: /* @__PURE__ */ new Date("2024-01-01")
      }
    ];
    demoProducts = [
      // Nike products
      {
        id: "prod_nike_1",
        storeId: "demo_store_1",
        vendorId: "vendor_1",
        title: "Nike Air Max 270",
        handle: "nike-air-max-270",
        vendor: "Nike",
        productType: "Sneakers",
        price: "119.99",
        compareAtPrice: "149.99",
        status: "active",
        createdAt: /* @__PURE__ */ new Date("2024-01-15"),
        updatedAt: /* @__PURE__ */ new Date("2024-12-01")
      },
      {
        id: "prod_nike_2",
        storeId: "demo_store_1",
        vendorId: "vendor_1",
        title: "Nike Dri-FIT Training Shirt",
        handle: "nike-dri-fit-training-shirt",
        vendor: "Nike",
        productType: "Apparel",
        price: "34.99",
        compareAtPrice: "44.99",
        status: "active",
        createdAt: /* @__PURE__ */ new Date("2024-01-15"),
        updatedAt: /* @__PURE__ */ new Date("2024-12-01")
      },
      {
        id: "prod_nike_3",
        storeId: "demo_store_1",
        vendorId: "vendor_1",
        title: "Nike Pro Leggings",
        handle: "nike-pro-leggings",
        vendor: "Nike",
        productType: "Apparel",
        price: "54.99",
        compareAtPrice: null,
        status: "active",
        createdAt: /* @__PURE__ */ new Date("2024-01-15"),
        updatedAt: /* @__PURE__ */ new Date("2024-12-01")
      },
      // Adidas products
      {
        id: "prod_adidas_1",
        storeId: "demo_store_1",
        vendorId: "vendor_2",
        title: "Adidas Ultraboost 22",
        handle: "adidas-ultraboost-22",
        vendor: "Adidas",
        productType: "Sneakers",
        price: "179.99",
        compareAtPrice: "189.99",
        status: "active",
        createdAt: /* @__PURE__ */ new Date("2024-01-20"),
        updatedAt: /* @__PURE__ */ new Date("2024-12-01")
      },
      {
        id: "prod_adidas_2",
        storeId: "demo_store_1",
        vendorId: "vendor_2",
        title: "Adidas 3-Stripes Track Jacket",
        handle: "adidas-3-stripes-track-jacket",
        vendor: "Adidas",
        productType: "Apparel",
        price: "69.99",
        compareAtPrice: "89.99",
        status: "active",
        createdAt: /* @__PURE__ */ new Date("2024-01-20"),
        updatedAt: /* @__PURE__ */ new Date("2024-12-01")
      },
      // Under Armour products
      {
        id: "prod_ua_1",
        storeId: "demo_store_1",
        vendorId: "vendor_3",
        title: "Under Armour HOVR Phantom",
        handle: "under-armour-hovr-phantom",
        vendor: "Under Armour",
        productType: "Sneakers",
        price: "149.99",
        compareAtPrice: "159.99",
        status: "active",
        createdAt: /* @__PURE__ */ new Date("2024-02-01"),
        updatedAt: /* @__PURE__ */ new Date("2024-12-01")
      },
      {
        id: "prod_ua_2",
        storeId: "demo_store_1",
        vendorId: "vendor_3",
        title: "Under Armour HeatGear Compression Shirt",
        handle: "under-armour-heatgear-compression",
        vendor: "Under Armour",
        productType: "Apparel",
        price: "39.99",
        compareAtPrice: null,
        status: "active",
        createdAt: /* @__PURE__ */ new Date("2024-02-01"),
        updatedAt: /* @__PURE__ */ new Date("2024-12-01")
      },
      // Puma products
      {
        id: "prod_puma_1",
        storeId: "demo_store_1",
        vendorId: "vendor_4",
        title: "Puma RS-X\xB3",
        handle: "puma-rs-x3",
        vendor: "Puma",
        productType: "Sneakers",
        price: "109.99",
        compareAtPrice: "129.99",
        status: "active",
        createdAt: /* @__PURE__ */ new Date("2024-02-10"),
        updatedAt: /* @__PURE__ */ new Date("2024-12-01")
      },
      // New Balance products
      {
        id: "prod_nb_1",
        storeId: "demo_store_1",
        vendorId: "vendor_5",
        title: "New Balance 990v5",
        handle: "new-balance-990v5",
        vendor: "New Balance",
        productType: "Sneakers",
        price: "174.99",
        compareAtPrice: "184.99",
        status: "active",
        createdAt: /* @__PURE__ */ new Date("2024-02-15"),
        updatedAt: /* @__PURE__ */ new Date("2024-12-01")
      },
      {
        id: "prod_nb_2",
        storeId: "demo_store_1",
        vendorId: "vendor_5",
        title: "New Balance Fresh Foam 1080",
        handle: "new-balance-fresh-foam-1080",
        vendor: "New Balance",
        productType: "Sneakers",
        price: "159.99",
        compareAtPrice: null,
        status: "active",
        createdAt: /* @__PURE__ */ new Date("2024-02-15"),
        updatedAt: /* @__PURE__ */ new Date("2024-12-01")
      }
    ];
    demoOrders = generateDemoOrders();
    demoVendorAnalytics = generateVendorAnalytics();
  }
});

// server/services/tokenEncryption.ts
import crypto from "crypto";
function ensureEncryptionKey() {
  if (!process.env.TOKEN_ENCRYPTION_KEY) {
    if (process.env.NODE_ENV === "development") {
      console.warn("TOKEN_ENCRYPTION_KEY not set, generating one for development...");
      const key = TokenEncryption.generateEncryptionKey();
      process.env.TOKEN_ENCRYPTION_KEY = key;
      console.warn(`Add this to your .env file: TOKEN_ENCRYPTION_KEY=${key}`);
    } else {
      throw new Error("TOKEN_ENCRYPTION_KEY must be set in production environment. Please add this secret to your deployment configuration.");
    }
  }
}
var TokenEncryption;
var init_tokenEncryption = __esm({
  "server/services/tokenEncryption.ts"() {
    "use strict";
    TokenEncryption = class {
      static ALGORITHM = "aes-256-gcm";
      static IV_LENGTH = 16;
      // For AES, this is 16 bytes
      static TAG_LENGTH = 16;
      // For GCM, auth tag is 16 bytes
      static getEncryptionKey() {
        const key = process.env.TOKEN_ENCRYPTION_KEY;
        if (!key) {
          throw new Error("TOKEN_ENCRYPTION_KEY environment variable is required for token encryption");
        }
        if (key.length !== 64) {
          throw new Error("TOKEN_ENCRYPTION_KEY must be 64 hex characters (32 bytes)");
        }
        return Buffer.from(key, "hex");
      }
      /**
       * Generate a new encryption key (for setup)
       * This should be called once and the result stored in environment variables
       */
      static generateEncryptionKey() {
        return crypto.randomBytes(32).toString("hex");
      }
      /**
       * Encrypt a Shopify access token
       * Returns base64 encoded encrypted data with IV and auth tag
       */
      static encryptToken(token) {
        if (!token) {
          throw new Error("Token cannot be empty");
        }
        try {
          const key = this.getEncryptionKey();
          const iv = crypto.randomBytes(this.IV_LENGTH);
          const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);
          cipher.setAutoPadding(true);
          let encrypted = cipher.update(token, "utf8", "base64");
          encrypted += cipher.final("base64");
          const authTag = cipher.getAuthTag();
          const encryptedData = {
            encrypted,
            iv: iv.toString("base64"),
            authTag: authTag.toString("base64")
          };
          return Buffer.from(JSON.stringify(encryptedData)).toString("base64");
        } catch (error) {
          console.error("Token encryption failed:", this.sanitizeError(error));
          throw new Error("Failed to encrypt token");
        }
      }
      /**
       * Decrypt a Shopify access token
       * Accepts base64 encoded encrypted data
       */
      static decryptToken(encryptedToken) {
        if (!encryptedToken) {
          throw new Error("Encrypted token cannot be empty");
        }
        try {
          if (this.isPlaintextToken(encryptedToken)) {
            console.warn("Found plaintext token, migration needed");
            return encryptedToken;
          }
          const key = this.getEncryptionKey();
          const encryptedData = JSON.parse(
            Buffer.from(encryptedToken, "base64").toString("utf8")
          );
          const iv = Buffer.from(encryptedData.iv, "base64");
          const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
          decipher.setAuthTag(Buffer.from(encryptedData.authTag, "base64"));
          decipher.setAutoPadding(true);
          let decrypted = decipher.update(encryptedData.encrypted, "base64", "utf8");
          decrypted += decipher.final("utf8");
          return decrypted;
        } catch (error) {
          console.error("Token decryption failed:", this.sanitizeError(error));
          if (this.isPlaintextToken(encryptedToken)) {
            console.warn("Decrypt failed but token appears to be plaintext, using as-is for migration");
            return encryptedToken;
          }
          throw new Error("Failed to decrypt token");
        }
      }
      /**
       * Check if a token is already encrypted
       */
      static isEncryptedToken(token) {
        try {
          const decoded = Buffer.from(token, "base64").toString("utf8");
          const parsed = JSON.parse(decoded);
          return typeof parsed.encrypted === "string" && typeof parsed.iv === "string" && typeof parsed.authTag === "string";
        } catch {
          return false;
        }
      }
      /**
       * Check if a token appears to be plaintext (for migration)
       */
      static isPlaintextToken(token) {
        const shopifyTokenPattern = /^(shp[a-z]{2}_[a-zA-Z0-9_]+|[a-zA-Z0-9]{32,})$/;
        return shopifyTokenPattern.test(token) && !this.isEncryptedToken(token);
      }
      /**
       * Sanitize error messages to prevent token leakage in logs
       */
      static sanitizeError(error) {
        let message = error?.message || String(error);
        message = message.replace(/shp[a-z]{2}_[a-zA-Z0-9_]+/g, "[TOKEN_REDACTED]");
        message = message.replace(/[a-zA-Z0-9]{32,}/g, "[POTENTIAL_TOKEN_REDACTED]");
        return message;
      }
      /**
       * Sanitize any string to remove potential tokens for safe logging
       */
      static sanitizeForLogging(input) {
        if (typeof input !== "string") {
          input = JSON.stringify(input, null, 2);
        }
        return input.replace(/shp[a-z]{2}_[a-zA-Z0-9_]+/g, "[TOKEN_REDACTED]").replace(/"accessToken":\s*"[^"]+"/g, '"accessToken": "[TOKEN_REDACTED]"').replace(/"access_token":\s*"[^"]+"/g, '"access_token": "[TOKEN_REDACTED]"').replace(/accessToken:\s*[^\s,}]+/g, "accessToken: [TOKEN_REDACTED]").replace(/Bearer\s+[a-zA-Z0-9_-]+/gi, "Bearer [TOKEN_REDACTED]").replace(/[a-zA-Z0-9]{32,}/g, (match) => {
          if (match.length >= 32 && /^[a-zA-Z0-9_-]+$/.test(match)) {
            return "[POTENTIAL_TOKEN_REDACTED]";
          }
          return match;
        });
      }
      /**
       * Migrate a plaintext token to encrypted format
       * Returns the encrypted token if successful, or the original if already encrypted
       */
      static migrateToken(token) {
        if (this.isEncryptedToken(token)) {
          return token;
        }
        if (this.isPlaintextToken(token)) {
          return this.encryptToken(token);
        }
        try {
          return this.encryptToken(token);
        } catch (error) {
          console.error("Token migration failed:", this.sanitizeError(error));
          return token;
        }
      }
    };
  }
});

// server/storage.ts
import { eq, and, gte, lte, desc, sql as sql2, asc } from "drizzle-orm";
var DatabaseStorage, storage;
var init_storage = __esm({
  "server/storage.ts"() {
    "use strict";
    init_schema();
    init_db();
    init_demoData();
    init_tokenEncryption();
    DatabaseStorage = class {
      constructor() {
        ensureEncryptionKey();
      }
      /**
       * Encrypt access token for secure storage
       */
      encryptAccessToken(token) {
        try {
          return TokenEncryption.encryptToken(token);
        } catch (error) {
          console.error("Failed to encrypt access token:", TokenEncryption.sanitizeForLogging(error));
          throw new Error("Token encryption failed");
        }
      }
      /**
       * Decrypt access token for API usage
       */
      decryptAccessToken(encryptedToken) {
        try {
          return TokenEncryption.decryptToken(encryptedToken);
        } catch (error) {
          console.error("Failed to decrypt access token:", TokenEncryption.sanitizeForLogging(error));
          throw new Error("Token decryption failed");
        }
      }
      /**
       * Process store data after retrieval to decrypt access tokens
       */
      processStoreForOutput(store) {
        if (!store.accessToken) return store;
        try {
          return {
            ...store,
            accessToken: this.decryptAccessToken(store.accessToken)
          };
        } catch (error) {
          console.error(`Failed to process store ${store.id}:`, TokenEncryption.sanitizeForLogging(error));
          return { ...store, accessToken: "" };
        }
      }
      /**
       * Process stores array to decrypt access tokens
       */
      processStoresForOutput(stores2) {
        return stores2.map((store) => this.processStoreForOutput(store));
      }
      /**
       * Process store data for database storage (encrypt access tokens)
       */
      processStoreForStorage(store) {
        if (!store.accessToken) return store;
        try {
          return {
            ...store,
            accessToken: this.encryptAccessToken(store.accessToken)
          };
        } catch (error) {
          console.error("Failed to process store for storage:", TokenEncryption.sanitizeForLogging(error));
          throw new Error("Store processing failed");
        }
      }
      // User operations
      async getUser(id) {
        const [user] = await db.select().from(users).where(eq(users.id, id));
        return user;
      }
      async upsertUser(userData) {
        const [user] = await db.insert(users).values(userData).onConflictDoUpdate({
          target: users.id,
          set: {
            ...userData,
            updatedAt: /* @__PURE__ */ new Date()
          }
        }).returning();
        return user;
      }
      // Store operations
      async getUserStores(userId) {
        if (isDemoMode(userId)) {
          return [demoStore];
        }
        const userStores = await db.select().from(stores).where(eq(stores.userId, userId));
        return this.processStoresForOutput(userStores);
      }
      async createStore(store) {
        console.log(`Creating store: ${TokenEncryption.sanitizeForLogging(store)}`);
        const processedStore = this.processStoreForStorage(store);
        const [newStore] = await db.insert(stores).values([processedStore]).returning();
        return this.processStoreForOutput(newStore);
      }
      async getStore(id) {
        const [store] = await db.select().from(stores).where(eq(stores.id, id));
        return store ? this.processStoreForOutput(store) : void 0;
      }
      async getStoreByDomain(domain) {
        if (domain === "demo-store.myshopify.com") {
          return demoStore;
        }
        const [store] = await db.select().from(stores).where(eq(stores.domain, domain));
        return store ? this.processStoreForOutput(store) : void 0;
      }
      async updateStore(id, updates) {
        console.log(`Updating store ${id}: ${TokenEncryption.sanitizeForLogging(updates)}`);
        const processedUpdates = this.processStoreForStorage(updates);
        const [store] = await db.update(stores).set(processedUpdates).where(eq(stores.id, id)).returning();
        return this.processStoreForOutput(store);
      }
      // Vendor operations
      async getStoreVendors(storeId) {
        if (storeId === "demo_store_1") {
          return demoVendors;
        }
        return await db.select().from(vendors).where(eq(vendors.storeId, storeId));
      }
      async getStoreVendorsPaginated(storeId, params) {
        const { page = 1, limit = 50, sortBy = "name", sortDirection = "asc", search } = params;
        const offset = (page - 1) * limit;
        if (storeId === "demo_store_1") {
          let filteredVendors = [...demoVendors];
          if (search) {
            filteredVendors = filteredVendors.filter(
              (v) => v.name.toLowerCase().includes(search.toLowerCase())
            );
          }
          filteredVendors.sort((a, b) => {
            const aValue = a[sortBy];
            const bValue = b[sortBy];
            const comparison = aValue.localeCompare(bValue);
            return sortDirection === "asc" ? comparison : -comparison;
          });
          const total2 = filteredVendors.length;
          const paginatedData = filteredVendors.slice(offset, offset + limit);
          return {
            data: paginatedData,
            pagination: {
              page,
              limit,
              total: total2,
              totalPages: Math.ceil(total2 / limit),
              hasNext: offset + limit < total2,
              hasPrev: page > 1
            }
          };
        }
        let conditions = [eq(vendors.storeId, storeId)];
        if (search) {
          const searchCondition = sql2`${vendors.name} ILIKE ${"%" + search + "%"}`;
          conditions.push(searchCondition);
        }
        const orderByClause = sortBy === "name" ? sortDirection === "asc" ? asc(vendors.name) : desc(vendors.name) : sortDirection === "asc" ? asc(vendors.createdAt) : desc(vendors.createdAt);
        const query = db.select().from(vendors).where(and(...conditions)).orderBy(orderByClause).limit(limit).offset(offset);
        const countQuery = db.select({ count: sql2`count(*)` }).from(vendors).where(and(...conditions));
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
      async getStoreVendorMetrics(storeId, params) {
        const { page = 1, limit = 50, sortBy = "revenue", sortDirection = "desc", search } = params;
        const offset = (page - 1) * limit;
        if (storeId === "demo_store_1") {
          const vendorMetrics = demoVendors.map((vendor) => ({
            id: vendor.id,
            name: vendor.name,
            productCount: Math.floor(Math.random() * 100 + 10),
            revenue: Math.floor(Math.random() * 1e5 + 1e4),
            aov: Math.floor(Math.random() * 200 + 50),
            conversion: Math.random() * 5 + 1,
            visitors: Math.floor(Math.random() * 1e4 + 1e3),
            growth: Math.random() * 50 - 10,
            totalOrders: Math.floor(Math.random() * 500 + 50)
          }));
          let filteredMetrics = [...vendorMetrics];
          if (search) {
            filteredMetrics = filteredMetrics.filter(
              (v) => v.name.toLowerCase().includes(search.toLowerCase())
            );
          }
          filteredMetrics.sort((a, b) => {
            const aValue = a[sortBy];
            const bValue = b[sortBy];
            const comparison = aValue - bValue;
            return sortDirection === "asc" ? comparison : -comparison;
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
      async createVendor(vendor) {
        const [newVendor] = await db.insert(vendors).values(vendor).returning();
        return newVendor;
      }
      async getVendor(id) {
        if (id.startsWith("vendor_")) {
          return demoVendors.find((v) => v.id === id);
        }
        const [vendor] = await db.select().from(vendors).where(eq(vendors.id, id));
        return vendor;
      }
      // Product operations
      async upsertProduct(product) {
        const [upsertedProduct] = await db.insert(products).values(product).onConflictDoUpdate({
          target: products.id,
          set: {
            ...product,
            updatedAt: /* @__PURE__ */ new Date()
          }
        }).returning();
        return upsertedProduct;
      }
      async bulkUpsertProducts(productList) {
        if (productList.length === 0) return [];
        const upsertedProducts = await db.insert(products).values(productList).onConflictDoUpdate({
          target: products.id,
          set: {
            title: sql2.raw("excluded.title"),
            handle: sql2.raw("excluded.handle"),
            vendor: sql2.raw("excluded.vendor"),
            vendorId: sql2.raw("excluded.vendor_id"),
            productType: sql2.raw("excluded.product_type"),
            price: sql2.raw("excluded.price"),
            compareAtPrice: sql2.raw("excluded.compare_at_price"),
            status: sql2.raw("excluded.status"),
            updatedAt: /* @__PURE__ */ new Date()
          }
        }).returning();
        return upsertedProducts;
      }
      async getVendorProducts(vendorId) {
        if (vendorId.startsWith("vendor_")) {
          return demoProducts.filter((p) => p.vendorId === vendorId);
        }
        return await db.select().from(products).where(eq(products.vendorId, vendorId));
      }
      async getVendorProductsPaginated(vendorId, params) {
        const { page = 1, limit = 50, sortBy = "title", sortDirection = "asc", search } = params;
        const offset = (page - 1) * limit;
        if (vendorId.startsWith("vendor_")) {
          let filteredProducts = demoProducts.filter((p) => p.vendorId === vendorId);
          if (search) {
            filteredProducts = filteredProducts.filter(
              (p) => p.title.toLowerCase().includes(search.toLowerCase())
            );
          }
          filteredProducts.sort((a, b) => {
            const aValue = a[sortBy];
            const bValue = b[sortBy];
            const comparison = aValue.localeCompare(bValue);
            return sortDirection === "asc" ? comparison : -comparison;
          });
          const total2 = filteredProducts.length;
          const paginatedData = filteredProducts.slice(offset, offset + limit);
          return {
            data: paginatedData,
            pagination: {
              page,
              limit,
              total: total2,
              totalPages: Math.ceil(total2 / limit),
              hasNext: offset + limit < total2,
              hasPrev: page > 1
            }
          };
        }
        let conditions = [eq(products.vendorId, vendorId)];
        if (search) {
          const searchCondition = sql2`${products.title} ILIKE ${"%" + search + "%"}`;
          conditions.push(searchCondition);
        }
        const orderByClause = sortBy === "title" ? sortDirection === "asc" ? asc(products.title) : desc(products.title) : sortDirection === "asc" ? asc(products.price) : desc(products.price);
        const query = db.select().from(products).where(and(...conditions)).orderBy(orderByClause).limit(limit).offset(offset);
        const countQuery = db.select({ count: sql2`count(*)` }).from(products).where(and(...conditions));
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
      async getStoreProducts(storeId, params) {
        const { page = 1, limit = 50, sortBy = "title", sortDirection = "asc", search } = params;
        const offset = (page - 1) * limit;
        if (storeId === "demo_store_1") {
          let filteredProducts = [...demoProducts];
          if (search) {
            filteredProducts = filteredProducts.filter(
              (p) => p.title.toLowerCase().includes(search.toLowerCase()) || p.vendor?.toLowerCase().includes(search.toLowerCase())
            );
          }
          filteredProducts.sort((a, b) => {
            const aValue = a[sortBy];
            const bValue = b[sortBy];
            const comparison = aValue.localeCompare(bValue);
            return sortDirection === "asc" ? comparison : -comparison;
          });
          const total2 = filteredProducts.length;
          const paginatedData = filteredProducts.slice(offset, offset + limit);
          return {
            data: paginatedData,
            pagination: {
              page,
              limit,
              total: total2,
              totalPages: Math.ceil(total2 / limit),
              hasNext: offset + limit < total2,
              hasPrev: page > 1
            }
          };
        }
        let conditions = [eq(products.storeId, storeId)];
        if (search) {
          const searchCondition = sql2`${products.title} ILIKE ${"%" + search + "%"} OR ${products.vendor} ILIKE ${"%" + search + "%"}`;
          conditions.push(searchCondition);
        }
        let orderByClause;
        if (sortBy === "title") {
          orderByClause = sortDirection === "asc" ? asc(products.title) : desc(products.title);
        } else if (sortBy === "price") {
          orderByClause = sortDirection === "asc" ? asc(products.price) : desc(products.price);
        } else {
          orderByClause = sortDirection === "asc" ? asc(products.vendor) : desc(products.vendor);
        }
        const query = db.select().from(products).where(and(...conditions)).orderBy(orderByClause).limit(limit).offset(offset);
        const countQuery = db.select({ count: sql2`count(*)` }).from(products).where(and(...conditions));
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
      async upsertOrder(order) {
        const [upsertedOrder] = await db.insert(orders).values(order).onConflictDoUpdate({
          target: orders.id,
          set: order
        }).returning();
        return upsertedOrder;
      }
      async bulkUpsertOrders(orderList) {
        if (orderList.length === 0) return [];
        const upsertedOrders = await db.insert(orders).values(orderList).onConflictDoUpdate({
          target: orders.id,
          set: {
            orderNumber: sql2.raw("excluded.order_number"),
            totalPrice: sql2.raw("excluded.total_price"),
            subtotalPrice: sql2.raw("excluded.subtotal_price"),
            totalTax: sql2.raw("excluded.total_tax"),
            currency: sql2.raw("excluded.currency"),
            financialStatus: sql2.raw("excluded.financial_status"),
            fulfillmentStatus: sql2.raw("excluded.fulfillment_status"),
            customerEmail: sql2.raw("excluded.customer_email"),
            customerId: sql2.raw("excluded.customer_id"),
            landingPage: sql2.raw("excluded.landing_page"),
            referringSite: sql2.raw("excluded.referring_site"),
            processedAt: sql2.raw("excluded.processed_at")
          }
        }).returning();
        return upsertedOrders;
      }
      async upsertOrderLineItem(item) {
        const [upsertedItem] = await db.insert(orderLineItems).values(item).onConflictDoUpdate({
          target: orderLineItems.id,
          set: item
        }).returning();
        return upsertedItem;
      }
      async bulkUpsertOrderLineItems(itemList) {
        if (itemList.length === 0) return [];
        const upsertedItems = await db.insert(orderLineItems).values(itemList).onConflictDoUpdate({
          target: orderLineItems.id,
          set: {
            orderId: sql2.raw("excluded.order_id"),
            productId: sql2.raw("excluded.product_id"),
            vendorId: sql2.raw("excluded.vendor_id"),
            title: sql2.raw("excluded.title"),
            vendor: sql2.raw("excluded.vendor"),
            quantity: sql2.raw("excluded.quantity"),
            price: sql2.raw("excluded.price"),
            totalDiscount: sql2.raw("excluded.total_discount")
          }
        }).returning();
        return upsertedItems;
      }
      // Analytics operations
      async upsertVendorAnalytics(analytics) {
        const [result] = await db.insert(vendorAnalytics).values(analytics).onConflictDoUpdate({
          target: [vendorAnalytics.storeId, vendorAnalytics.vendorId, vendorAnalytics.date],
          set: analytics
        }).returning();
        return result;
      }
      async getVendorAnalyticsPaginated(storeId, params) {
        const { page = 1, limit = 50, sortBy = "date", sortDirection = "desc", vendorId, startDate, endDate } = params;
        const offset = (page - 1) * limit;
        if (storeId === "demo_store_1") {
          let analytics = [...demoVendorAnalytics];
          if (vendorId) {
            analytics = analytics.filter((a) => a.vendorId === vendorId);
          }
          if (startDate && endDate) {
            analytics = analytics.filter((a) => {
              const date = a.date;
              return date >= startDate && date <= endDate;
            });
          }
          analytics.sort((a, b) => {
            if (sortBy === "date") {
              const comparison2 = a.date.getTime() - b.date.getTime();
              return sortDirection === "asc" ? comparison2 : -comparison2;
            }
            const aValue = a[sortBy];
            const bValue = b[sortBy];
            const comparison = aValue - bValue;
            return sortDirection === "asc" ? comparison : -comparison;
          });
          const total2 = analytics.length;
          const paginatedData = analytics.slice(offset, offset + limit);
          return {
            data: paginatedData,
            pagination: {
              page,
              limit,
              total: total2,
              totalPages: Math.ceil(total2 / limit),
              hasNext: offset + limit < total2,
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
        const orderByClause = sortBy === "date" ? sortDirection === "asc" ? asc(vendorAnalytics.date) : desc(vendorAnalytics.date) : sortDirection === "asc" ? asc(vendorAnalytics.revenue) : desc(vendorAnalytics.revenue);
        const query = db.select().from(vendorAnalytics).where(and(...conditions)).orderBy(orderByClause).limit(limit).offset(offset);
        const countQuery = db.select({ count: sql2`count(*)` }).from(vendorAnalytics).where(and(...conditions));
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
      async getVendorAnalytics(storeId, vendorId, startDate, endDate) {
        if (storeId === "demo_store_1") {
          let analytics = demoVendorAnalytics;
          if (vendorId) {
            analytics = analytics.filter((a) => a.vendorId === vendorId);
          }
          if (startDate && endDate) {
            analytics = analytics.filter((a) => {
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
        return await db.select().from(vendorAnalytics).where(and(...conditions)).orderBy(desc(vendorAnalytics.date));
      }
      async getVendorSummary(storeId, vendorId, startDate, endDate) {
        if (storeId === "demo_store_1") {
          let analytics = demoVendorAnalytics;
          if (vendorId) {
            analytics = analytics.filter((a) => a.vendorId === vendorId);
          }
          if (startDate && endDate) {
            analytics = analytics.filter((a) => {
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
        const [summary] = await db.select({
          totalRevenue: sql2`SUM(${vendorAnalytics.revenue})`,
          totalOrders: sql2`SUM(${vendorAnalytics.orders})`,
          totalVisitors: sql2`SUM(${vendorAnalytics.visitors})`,
          totalConversions: sql2`SUM(${vendorAnalytics.conversions})`,
          avgAOV: sql2`AVG(${vendorAnalytics.aov})`,
          avgConversionRate: sql2`AVG(${vendorAnalytics.conversionRate})`
        }).from(vendorAnalytics).where(and(...conditions));
        return summary;
      }
      async getTopProductsPaginated(storeId, params) {
        const { page = 1, limit = 50, sortBy = "totalRevenue", sortDirection = "desc", vendorId } = params;
        const offset = (page - 1) * limit;
        if (storeId === "demo_store_1") {
          const productStats = /* @__PURE__ */ new Map();
          demoOrders.forEach((order) => {
            const lineItems = getDemoOrderLineItems(order.id);
            lineItems.forEach((item) => {
              if (!vendorId || item.vendorId === vendorId) {
                const key = item.productId;
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
          let products2 = Array.from(productStats.values());
          products2.sort((a, b) => {
            const aValue = a[sortBy];
            const bValue = b[sortBy];
            const comparison = aValue - bValue;
            return sortDirection === "asc" ? comparison : -comparison;
          });
          const total2 = products2.length;
          const paginatedData = products2.slice(offset, offset + limit);
          return {
            data: paginatedData,
            pagination: {
              page,
              limit,
              total: total2,
              totalPages: Math.ceil(total2 / limit),
              hasNext: offset + limit < total2,
              hasPrev: page > 1
            }
          };
        }
        const conditions = [eq(orders.storeId, storeId)];
        if (vendorId) {
          conditions.push(eq(orderLineItems.vendorId, vendorId));
        }
        const query = db.select({
          productId: orderLineItems.productId,
          title: orderLineItems.title,
          vendor: orderLineItems.vendor,
          totalRevenue: sql2`SUM(${orderLineItems.price} * ${orderLineItems.quantity})`,
          totalQuantity: sql2`SUM(${orderLineItems.quantity})`
        }).from(orderLineItems).innerJoin(orders, eq(orders.id, orderLineItems.orderId)).where(and(...conditions)).groupBy(orderLineItems.productId, orderLineItems.title, orderLineItems.vendor);
        if (sortBy === "totalRevenue") {
          query.orderBy(sortDirection === "asc" ? asc(sql2`SUM(${orderLineItems.price} * ${orderLineItems.quantity})`) : desc(sql2`SUM(${orderLineItems.price} * ${orderLineItems.quantity})`));
        } else if (sortBy === "totalQuantity") {
          query.orderBy(sortDirection === "asc" ? asc(sql2`SUM(${orderLineItems.quantity})`) : desc(sql2`SUM(${orderLineItems.quantity})`));
        }
        const countQuery = db.select({ count: sql2`COUNT(DISTINCT ${orderLineItems.productId})` }).from(orderLineItems).innerJoin(orders, eq(orders.id, orderLineItems.orderId)).where(and(...conditions));
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
      async getTopProducts(storeId, vendorId, limit = 10) {
        if (storeId === "demo_store_1") {
          const productStats = /* @__PURE__ */ new Map();
          demoOrders.forEach((order) => {
            const lineItems = getDemoOrderLineItems(order.id);
            lineItems.forEach((item) => {
              if (!vendorId || item.vendorId === vendorId) {
                const key = item.productId;
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
          return Array.from(productStats.values()).sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, limit);
        }
        const conditions = [eq(orders.storeId, storeId)];
        if (vendorId) {
          conditions.push(eq(orderLineItems.vendorId, vendorId));
        }
        return await db.select({
          productId: orderLineItems.productId,
          title: orderLineItems.title,
          vendor: orderLineItems.vendor,
          totalRevenue: sql2`SUM(${orderLineItems.price} * ${orderLineItems.quantity})`,
          totalQuantity: sql2`SUM(${orderLineItems.quantity})`
        }).from(orderLineItems).innerJoin(orders, eq(orders.id, orderLineItems.orderId)).where(and(...conditions)).groupBy(orderLineItems.productId, orderLineItems.title, orderLineItems.vendor).orderBy(desc(sql2`SUM(${orderLineItems.price} * ${orderLineItems.quantity})`)).limit(limit);
      }
      async getTopLandingPages(storeId, vendorId, limit = 10) {
        const conditions = [eq(pageAnalytics.storeId, storeId)];
        if (vendorId) {
          conditions.push(eq(pageAnalytics.vendorId, vendorId));
        }
        return await db.select().from(pageAnalytics).where(and(...conditions)).orderBy(desc(pageAnalytics.visitors)).limit(limit);
      }
      async getVendorOrdersInDateRange(storeId, vendorId, startDate, endDate) {
        const result = await db.select({
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
          createdAt: orders.createdAt
        }).from(orders).innerJoin(orderLineItems, eq(orders.id, orderLineItems.orderId)).where(
          and(
            eq(orders.storeId, storeId),
            eq(orderLineItems.vendorId, vendorId),
            gte(orders.processedAt, startDate),
            lte(orders.processedAt, endDate),
            eq(orders.financialStatus, "paid")
          )
        ).groupBy(orders.id).orderBy(desc(orders.processedAt));
        return result;
      }
      async getVendorOrderItemsInDateRange(storeId, vendorId, startDate, endDate) {
        const result = await db.select({
          id: orderLineItems.id,
          orderId: orderLineItems.orderId,
          productId: orderLineItems.productId,
          vendorId: orderLineItems.vendorId,
          title: orderLineItems.title,
          vendor: orderLineItems.vendor,
          quantity: orderLineItems.quantity,
          price: orderLineItems.price,
          totalDiscount: orderLineItems.totalDiscount
        }).from(orderLineItems).innerJoin(orders, eq(orders.id, orderLineItems.orderId)).where(
          and(
            eq(orders.storeId, storeId),
            eq(orderLineItems.vendorId, vendorId),
            gte(orders.processedAt, startDate),
            lte(orders.processedAt, endDate),
            eq(orders.financialStatus, "paid")
          )
        ).orderBy(desc(orders.processedAt));
        return result;
      }
    };
    storage = new DatabaseStorage();
  }
});

// server/services/cacheService.ts
var LRUCache, CacheKeyBuilder, CacheService, cacheService;
var init_cacheService = __esm({
  "server/services/cacheService.ts"() {
    "use strict";
    LRUCache = class {
      cache = /* @__PURE__ */ new Map();
      accessOrder = /* @__PURE__ */ new Map();
      maxSize;
      defaultTTL;
      accessCounter = 0;
      metrics;
      constructor(maxSize = 1e3, defaultTTL = 3e5) {
        this.maxSize = maxSize;
        this.defaultTTL = defaultTTL;
        this.metrics = {
          hits: 0,
          misses: 0,
          size: 0,
          maxSize,
          evictions: 0
        };
        setInterval(() => this.cleanupExpired(), 12e4);
      }
      /**
       * Get cached value if valid and not expired
       */
      get(key) {
        const entry = this.cache.get(key);
        if (!entry) {
          this.metrics.misses++;
          return void 0;
        }
        if (Date.now() - entry.timestamp > entry.ttl) {
          this.cache.delete(key);
          this.accessOrder.delete(key);
          this.metrics.misses++;
          this.metrics.size--;
          return void 0;
        }
        entry.accessCount++;
        entry.lastAccessed = Date.now();
        this.accessOrder.set(key, ++this.accessCounter);
        this.metrics.hits++;
        return entry.value;
      }
      /**
       * Set cache value with optional TTL
       */
      set(key, value, ttl) {
        const effectiveTTL = ttl || this.defaultTTL;
        if (!this.cache.has(key) && this.cache.size >= this.maxSize) {
          this.evictLRU();
        }
        const entry = {
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
      has(key) {
        return this.get(key) !== void 0;
      }
      /**
       * Delete specific key
       */
      delete(key) {
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
      deletePattern(pattern) {
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
      clear() {
        this.cache.clear();
        this.accessOrder.clear();
        this.metrics.size = 0;
        this.metrics.evictions = 0;
      }
      /**
       * Get cache metrics for monitoring
       */
      getMetrics() {
        return { ...this.metrics };
      }
      /**
       * Get cache hit rate as percentage
       */
      getHitRate() {
        const total = this.metrics.hits + this.metrics.misses;
        return total > 0 ? this.metrics.hits / total * 100 : 0;
      }
      /**
       * Evict least recently used entry
       */
      evictLRU() {
        let lruKey;
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
      cleanupExpired() {
        const now = Date.now();
        const expiredKeys = [];
        for (const [key, entry] of this.cache.entries()) {
          if (now - entry.timestamp > entry.ttl) {
            expiredKeys.push(key);
          }
        }
        expiredKeys.forEach((key) => {
          this.cache.delete(key);
          this.accessOrder.delete(key);
          this.metrics.size--;
        });
        if (expiredKeys.length > 0) {
          console.log(`Cache cleanup: removed ${expiredKeys.length} expired entries`);
        }
      }
    };
    CacheKeyBuilder = class {
      /**
       * Generate cache key for analytics data
       */
      static analytics(storeId, vendorId, startDate, endDate) {
        const parts = ["analytics", storeId];
        if (vendorId) parts.push(`vendor:${vendorId}`);
        if (startDate) parts.push(`start:${startDate.toISOString().split("T")[0]}`);
        if (endDate) parts.push(`end:${endDate.toISOString().split("T")[0]}`);
        return parts.join(":");
      }
      /**
       * Generate cache key for vendor data
       */
      static vendors(storeId) {
        return `vendors:${storeId}`;
      }
      /**
       * Generate cache key for vendor summary
       */
      static vendorSummary(storeId, vendorId, startDate, endDate) {
        const parts = ["summary", storeId];
        if (vendorId) parts.push(`vendor:${vendorId}`);
        if (startDate) parts.push(`start:${startDate.toISOString().split("T")[0]}`);
        if (endDate) parts.push(`end:${endDate.toISOString().split("T")[0]}`);
        return parts.join(":");
      }
      /**
       * Generate cache key for top products
       */
      static topProducts(storeId, vendorId, limit = 10) {
        const parts = ["products", storeId, `limit:${limit}`];
        if (vendorId) parts.push(`vendor:${vendorId}`);
        return parts.join(":");
      }
      /**
       * Generate cache key for landing pages
       */
      static landingPages(storeId, vendorId, limit = 10) {
        const parts = ["pages", storeId, `limit:${limit}`];
        if (vendorId) parts.push(`vendor:${vendorId}`);
        return parts.join(":");
      }
      /**
       * Generate cache key for Shopify object lookups during sync
       */
      static shopifyLookup(storeId, objectType, identifier) {
        return `shopify:${storeId}:${objectType}:${identifier}`;
      }
      /**
       * Generate pattern for cache invalidation
       */
      static storePattern(storeId) {
        return `${storeId}:`;
      }
      /**
       * Generate pattern for vendor-specific cache invalidation
       */
      static vendorPattern(storeId, vendorId) {
        return `${storeId}:vendor:${vendorId}`;
      }
    };
    CacheService = class {
      // Analytics cache with longer TTL (15 minutes)
      analyticsCache = new LRUCache(2e3, 9e5);
      // Vendor/object cache with medium TTL (10 minutes)  
      objectCache = new LRUCache(1e3, 6e5);
      // Sync cache with shorter TTL (5 minutes) but larger capacity
      syncCache = new LRUCache(3e3, 3e5);
      /**
       * Analytics caching methods
       */
      getAnalytics(key) {
        return this.analyticsCache.get(key);
      }
      setAnalytics(key, value, ttl) {
        this.analyticsCache.set(key, value, ttl);
      }
      /**
       * Object caching methods (vendors, products, etc.)
       */
      getObject(key) {
        return this.objectCache.get(key);
      }
      setObject(key, value, ttl) {
        this.objectCache.set(key, value, ttl);
      }
      /**
       * Sync operation caching methods
       */
      getSync(key) {
        return this.syncCache.get(key);
      }
      setSync(key, value, ttl) {
        this.syncCache.set(key, value, ttl);
      }
      /**
       * Cache invalidation methods
       */
      invalidateStore(storeId) {
        const pattern = CacheKeyBuilder.storePattern(storeId);
        const analyticsDeleted = this.analyticsCache.deletePattern(pattern);
        const objectDeleted = this.objectCache.deletePattern(pattern);
        const syncDeleted = this.syncCache.deletePattern(pattern);
        console.log(`Cache invalidation for store ${storeId}: ${analyticsDeleted + objectDeleted + syncDeleted} entries removed`);
      }
      invalidateVendor(storeId, vendorId) {
        const pattern = CacheKeyBuilder.vendorPattern(storeId, vendorId);
        const analyticsDeleted = this.analyticsCache.deletePattern(pattern);
        const objectDeleted = this.objectCache.deletePattern(pattern);
        const syncDeleted = this.syncCache.deletePattern(pattern);
        console.log(`Cache invalidation for vendor ${vendorId}: ${analyticsDeleted + objectDeleted + syncDeleted} entries removed`);
      }
      invalidateAnalytics(storeId) {
        const patterns = [
          `analytics:${storeId}`,
          `summary:${storeId}`,
          `products:${storeId}`,
          `pages:${storeId}`
        ];
        let totalDeleted = 0;
        patterns.forEach((pattern) => {
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
      clearAll() {
        this.analyticsCache.clear();
        this.objectCache.clear();
        this.syncCache.clear();
        console.log("All caches cleared");
      }
    };
    cacheService = new CacheService();
  }
});

// server/services/shopifyService.ts
var shopifyService_exports = {};
__export(shopifyService_exports, {
  ShopifyService: () => ShopifyService,
  shopifyService: () => shopifyService
});
var ShopifyService, shopifyService;
var init_shopifyService = __esm({
  "server/services/shopifyService.ts"() {
    "use strict";
    init_storage();
    init_cacheService();
    init_tokenEncryption();
    ShopifyService = class {
      rateLimitState = /* @__PURE__ */ new Map();
      retryConfig = {
        maxRetries: 3,
        baseDelay: 1e3,
        // 1 second
        maxDelay: 32e3,
        // 32 seconds
        jitterFactor: 0.1
      };
      async sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
      }
      getDelayWithJitter(baseDelay) {
        const jitter = (Math.random() - 0.5) * this.retryConfig.jitterFactor * baseDelay;
        return Math.min(baseDelay + jitter, this.retryConfig.maxDelay);
      }
      updateRateLimit(storeId, headers) {
        const callLimitHeader = headers.get("X-Shopify-Shop-Api-Call-Limit");
        if (callLimitHeader) {
          const [current, max] = callLimitHeader.split("/").map(Number);
          this.rateLimitState.set(storeId, {
            currentCallCount: current,
            maxCallCount: max,
            leakBucketLevel: current / max,
            lastResetTime: Date.now()
          });
        }
      }
      async checkRateLimit(storeId) {
        const rateLimitState = this.rateLimitState.get(storeId);
        if (!rateLimitState) return;
        if (rateLimitState.leakBucketLevel > 0.8) {
          const delay = Math.min(
            (rateLimitState.leakBucketLevel - 0.8) * 5e3,
            // Progressive delay up to 5s
            5e3
          );
          console.log(`Rate limit approaching for ${storeId}, waiting ${delay}ms`);
          await this.sleep(delay);
        }
      }
      async makeShopifyRequest(store, endpoint, params) {
        let retryCount = 0;
        while (retryCount <= this.retryConfig.maxRetries) {
          try {
            await this.checkRateLimit(store.id);
            const url = new URL(`https://${store.domain}/admin/api/2024-10/${endpoint}.json`);
            if (params) {
              Object.entries(params).forEach(([key, value]) => {
                url.searchParams.append(key, value);
              });
            }
            const response = await fetch(url.toString(), {
              headers: {
                "X-Shopify-Access-Token": store.accessToken,
                "Content-Type": "application/json"
              }
            });
            this.updateRateLimit(store.id, response.headers);
            if (response.status === 429 || response.status >= 500) {
              if (retryCount === this.retryConfig.maxRetries) {
                throw new Error(`Shopify API error after ${retryCount} retries: ${response.status} ${response.statusText}`);
              }
              let retryDelay = this.retryConfig.baseDelay * Math.pow(2, retryCount);
              const retryAfterHeader = response.headers.get("Retry-After");
              if (retryAfterHeader) {
                const retryAfterMs = parseInt(retryAfterHeader) * 1e3;
                retryDelay = Math.max(retryDelay, retryAfterMs);
              }
              retryDelay = this.getDelayWithJitter(retryDelay);
              console.log(`Shopify API ${response.status} error, retrying in ${retryDelay}ms (attempt ${retryCount + 1}/${this.retryConfig.maxRetries + 1})`);
              retryCount++;
              await this.sleep(retryDelay);
              continue;
            }
            if (!response.ok) {
              throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            return { data, headers: response.headers };
          } catch (error) {
            if (retryCount === this.retryConfig.maxRetries) {
              throw error;
            }
            const retryDelay = this.getDelayWithJitter(
              this.retryConfig.baseDelay * Math.pow(2, retryCount)
            );
            console.log(`Network error, retrying in ${retryDelay}ms (attempt ${retryCount + 1}/${this.retryConfig.maxRetries + 1}):`, TokenEncryption.sanitizeForLogging(error));
            retryCount++;
            await this.sleep(retryDelay);
          }
        }
        throw new Error(`Max retries exceeded for Shopify API request to ${endpoint}`);
      }
      async syncProducts(store, forceFullSync = false) {
        try {
          let hasNextPage = true;
          let pageInfo = "";
          let syncedCount = 0;
          const syncStartTime = /* @__PURE__ */ new Date();
          const lastSync = forceFullSync ? null : store.lastProductSyncAt;
          const isIncrementalSync = !forceFullSync && lastSync;
          console.log(
            `Starting ${isIncrementalSync ? "incremental" : "full"} product sync for ${store.domain}`,
            lastSync ? { lastSync: lastSync.toISOString() } : {}
          );
          const vendorCacheKey = CacheKeyBuilder.vendors(store.id);
          let existingVendors = cacheService.getSync(vendorCacheKey);
          if (!existingVendors) {
            existingVendors = await storage.getStoreVendors(store.id);
            cacheService.setSync(vendorCacheKey, existingVendors, 3e5);
            console.log(`Vendor cache miss for store ${store.id}, fetched ${existingVendors.length} vendors from DB`);
          } else {
            console.log(`Vendor cache hit for store ${store.id}, using ${existingVendors.length} cached vendors`);
          }
          const vendorMap = new Map(existingVendors.map((v) => [v.name, v]));
          const newVendorsToCreate = /* @__PURE__ */ new Set();
          while (hasNextPage) {
            const params = { limit: "250" };
            if (isIncrementalSync && lastSync) {
              params.updated_at_min = lastSync.toISOString();
            }
            if (pageInfo) {
              params.page_info = pageInfo;
            }
            const { data, headers } = await this.makeShopifyRequest(store, "products", params);
            const products2 = data.products;
            if (products2.length === 0) {
              console.log("No products to sync, breaking pagination loop");
              break;
            }
            for (const shopifyProduct of products2) {
              if (shopifyProduct.vendor && !vendorMap.has(shopifyProduct.vendor)) {
                newVendorsToCreate.add(shopifyProduct.vendor);
              }
            }
            for (const vendorName of Array.from(newVendorsToCreate)) {
              const newVendor = await storage.createVendor({
                storeId: store.id,
                name: vendorName,
                slug: vendorName.toLowerCase().replace(/\s+/g, "-")
              });
              vendorMap.set(vendorName, newVendor);
            }
            if (newVendorsToCreate.size > 0) {
              cacheService.invalidateStore(store.id);
              console.log(`Invalidated cache for store ${store.id} due to ${newVendorsToCreate.size} new vendors`);
            }
            newVendorsToCreate.clear();
            const productsToUpsert = [];
            for (const shopifyProduct of products2) {
              const vendor = vendorMap.get(shopifyProduct.vendor);
              const product = {
                id: shopifyProduct.id.toString(),
                storeId: store.id,
                vendorId: vendor?.id,
                title: shopifyProduct.title,
                handle: shopifyProduct.handle,
                vendor: shopifyProduct.vendor,
                productType: shopifyProduct.product_type,
                price: shopifyProduct.variants[0]?.price || "0",
                compareAtPrice: shopifyProduct.variants[0]?.compare_at_price,
                status: shopifyProduct.status
              };
              productsToUpsert.push(product);
            }
            if (productsToUpsert.length > 0) {
              await storage.bulkUpsertProducts(productsToUpsert);
              syncedCount += productsToUpsert.length;
            }
            const linkHeader = headers.get("link");
            hasNextPage = Boolean(linkHeader && linkHeader.includes('rel="next"'));
            if (hasNextPage && linkHeader) {
              const nextPageMatch = linkHeader.match(/<[^>]*page_info=([^&>]*).*>;\s*rel="next"/);
              pageInfo = nextPageMatch ? nextPageMatch[1] : "";
            }
            if (syncedCount % 1e3 === 0) {
              console.log(`Product sync progress: ${syncedCount} products processed`);
            }
          }
          await storage.updateStore(store.id, {
            lastSyncAt: syncStartTime,
            lastProductSyncAt: syncStartTime,
            productSyncCursor: pageInfo || null
          });
          console.log(`Product sync completed: ${syncedCount} products ${isIncrementalSync ? "updated" : "synced"}`);
        } catch (error) {
          console.error("Error syncing products:", TokenEncryption.sanitizeForLogging(error));
          throw error;
        }
      }
      async syncOrders(store, startDate, forceFullSync = false) {
        try {
          let hasNextPage = true;
          let pageInfo = "";
          let syncedCount = 0;
          const syncStartTime = /* @__PURE__ */ new Date();
          const lastSync = forceFullSync ? null : startDate || store.lastOrderSyncAt;
          const isIncrementalSync = !forceFullSync && lastSync;
          console.log(
            `Starting ${isIncrementalSync ? "incremental" : "full"} order sync for ${store.domain}`,
            lastSync ? { lastSync: lastSync.toISOString() } : {}
          );
          const existingVendors = await storage.getStoreVendors(store.id);
          const vendorMap = new Map(existingVendors.map((v) => [v.name, v]));
          while (hasNextPage) {
            const params = {
              limit: "250",
              status: "any",
              financial_status: "paid"
            };
            if (isIncrementalSync && lastSync) {
              params.updated_at_min = lastSync.toISOString();
            }
            if (pageInfo) {
              params.page_info = pageInfo;
            }
            const { data, headers } = await this.makeShopifyRequest(store, "orders", params);
            const orders2 = data.orders;
            if (orders2.length === 0) {
              console.log("No orders to sync, breaking pagination loop");
              break;
            }
            const ordersToUpsert = [];
            const lineItemsToUpsert = [];
            for (const shopifyOrder of orders2) {
              const order = {
                id: shopifyOrder.id.toString(),
                storeId: store.id,
                orderNumber: shopifyOrder.order_number,
                totalPrice: shopifyOrder.total_price,
                subtotalPrice: shopifyOrder.subtotal_price,
                totalTax: shopifyOrder.total_tax,
                currency: shopifyOrder.currency,
                financialStatus: shopifyOrder.financial_status,
                fulfillmentStatus: shopifyOrder.fulfillment_status,
                customerEmail: shopifyOrder.email,
                customerId: shopifyOrder.customer?.id?.toString(),
                landingPage: shopifyOrder.landing_site,
                referringSite: shopifyOrder.referring_site,
                processedAt: shopifyOrder.processed_at ? new Date(shopifyOrder.processed_at) : null
              };
              ordersToUpsert.push(order);
              for (const lineItem of shopifyOrder.line_items) {
                const vendor = vendorMap.get(lineItem.vendor);
                const orderLineItem = {
                  id: lineItem.id.toString(),
                  orderId: shopifyOrder.id.toString(),
                  productId: lineItem.product_id?.toString(),
                  vendorId: vendor?.id,
                  title: lineItem.title,
                  vendor: lineItem.vendor,
                  quantity: lineItem.quantity,
                  price: lineItem.price,
                  totalDiscount: lineItem.total_discount
                };
                lineItemsToUpsert.push(orderLineItem);
              }
            }
            if (ordersToUpsert.length > 0) {
              await storage.bulkUpsertOrders(ordersToUpsert);
              syncedCount += ordersToUpsert.length;
            }
            if (lineItemsToUpsert.length > 0) {
              await storage.bulkUpsertOrderLineItems(lineItemsToUpsert);
            }
            const linkHeader = headers.get("link");
            hasNextPage = Boolean(linkHeader && linkHeader.includes('rel="next"'));
            if (hasNextPage && linkHeader) {
              const nextPageMatch = linkHeader.match(/<[^>]*page_info=([^&>]*).*>;\s*rel="next"/);
              pageInfo = nextPageMatch ? nextPageMatch[1] : "";
            }
            if (syncedCount % 500 === 0) {
              console.log(`Order sync progress: ${syncedCount} orders processed`);
            }
          }
          await storage.updateStore(store.id, {
            lastSyncAt: syncStartTime,
            lastOrderSyncAt: syncStartTime,
            orderSyncCursor: pageInfo || null
          });
          console.log(`Order sync completed: ${syncedCount} orders ${isIncrementalSync ? "updated" : "synced"}`);
        } catch (error) {
          console.error("Error syncing orders:", TokenEncryption.sanitizeForLogging(error));
          throw error;
        }
      }
      async generateAnalytics(store, startDate, endDate) {
        try {
          const vendors2 = await storage.getStoreVendors(store.id);
          for (const vendor of vendors2) {
            const analytics = await this.calculateVendorAnalytics(store.id, vendor.id, startDate, endDate);
            await storage.upsertVendorAnalytics({
              storeId: store.id,
              vendorId: vendor.id,
              date: endDate,
              revenue: analytics.revenue,
              orders: analytics.orders,
              visitors: analytics.visitors,
              conversions: analytics.conversions,
              aov: analytics.aov,
              conversionRate: analytics.conversionRate
            });
          }
        } catch (error) {
          console.error("Error generating analytics:", TokenEncryption.sanitizeForLogging(error));
          throw error;
        }
      }
      async calculateVendorAnalytics(storeId, vendorId, startDate, endDate) {
        try {
          console.log(`Calculating analytics for vendor ${vendorId} from ${startDate.toISOString()} to ${endDate.toISOString()}`);
          const vendorOrders = await storage.getVendorOrdersInDateRange(storeId, vendorId, startDate, endDate);
          const vendorOrderItems = await storage.getVendorOrderItemsInDateRange(storeId, vendorId, startDate, endDate);
          const totalRevenue = vendorOrderItems.reduce((sum, item) => {
            const itemRevenue = parseFloat(item.price || "0") * (item.quantity || 0);
            return sum + itemRevenue;
          }, 0);
          const totalOrders = vendorOrders.length;
          const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;
          const estimatedVisitors = Math.max(Math.floor(totalOrders * 8), totalOrders);
          const conversions = totalOrders;
          const conversionRate = estimatedVisitors > 0 ? conversions / estimatedVisitors : 0;
          const analytics = {
            revenue: totalRevenue.toFixed(2),
            orders: totalOrders,
            visitors: estimatedVisitors,
            conversions,
            aov: aov.toFixed(2),
            conversionRate: (conversionRate * 100).toFixed(4)
          };
          console.log(`Analytics calculated for vendor ${vendorId}:`, TokenEncryption.sanitizeForLogging(analytics));
          return analytics;
        } catch (error) {
          console.error(`Error calculating vendor analytics for vendor ${vendorId}:`, TokenEncryption.sanitizeForLogging(error));
          return {
            revenue: "0",
            orders: 0,
            visitors: 0,
            conversions: 0,
            aov: "0",
            conversionRate: "0"
          };
        }
      }
      // Webhook handler for order creation/update
      async handleOrderWebhook(orderData, storeId) {
        try {
          console.log(`Processing order webhook for order ${orderData.id} in store ${storeId}`);
          const order = {
            id: orderData.id.toString(),
            storeId,
            orderNumber: orderData.order_number,
            totalPrice: orderData.total_price,
            subtotalPrice: orderData.subtotal_price,
            totalTax: orderData.total_tax,
            currency: orderData.currency,
            financialStatus: orderData.financial_status,
            fulfillmentStatus: orderData.fulfillment_status,
            customerEmail: orderData.email,
            customerId: orderData.customer?.id?.toString(),
            landingPage: orderData.landing_site,
            referringSite: orderData.referring_site,
            processedAt: orderData.processed_at ? new Date(orderData.processed_at) : null
          };
          await storage.upsertOrder(order);
          const affectedVendors = /* @__PURE__ */ new Set();
          for (const lineItem of orderData.line_items) {
            let vendor = await storage.getStoreVendors(storeId).then(
              (vendors2) => vendors2.find((v) => v.name === lineItem.vendor)
            );
            if (!vendor && lineItem.vendor) {
              vendor = await storage.createVendor({
                storeId,
                name: lineItem.vendor,
                slug: lineItem.vendor.toLowerCase().replace(/\s+/g, "-")
              });
            }
            if (vendor) {
              affectedVendors.add(vendor.id);
            }
            const orderLineItem = {
              id: lineItem.id.toString(),
              orderId: orderData.id.toString(),
              productId: lineItem.product_id?.toString(),
              vendorId: vendor?.id,
              title: lineItem.title,
              vendor: lineItem.vendor,
              quantity: lineItem.quantity,
              price: lineItem.price,
              totalDiscount: lineItem.total_discount
            };
            await storage.upsertOrderLineItem(orderLineItem);
          }
          const endDate = /* @__PURE__ */ new Date();
          const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1e3);
          for (const vendorId of Array.from(affectedVendors)) {
            const analytics = await this.calculateVendorAnalytics(storeId, vendorId, startDate, endDate);
            await storage.upsertVendorAnalytics({
              storeId,
              vendorId,
              date: endDate,
              revenue: analytics.revenue,
              orders: analytics.orders,
              visitors: analytics.visitors,
              conversions: analytics.conversions,
              aov: analytics.aov,
              conversionRate: analytics.conversionRate
            });
          }
          console.log(`Successfully processed order webhook for order ${orderData.id}`);
        } catch (error) {
          console.error(`Error handling order webhook for order ${orderData.id}:`, TokenEncryption.sanitizeForLogging(error));
          throw error;
        }
      }
      // Webhook handler for product creation/update
      async handleProductWebhook(productData, storeId) {
        try {
          console.log(`Processing product webhook for product ${productData.id} in store ${storeId}`);
          let vendor = await storage.getStoreVendors(storeId).then(
            (vendors2) => vendors2.find((v) => v.name === productData.vendor)
          );
          if (!vendor && productData.vendor) {
            vendor = await storage.createVendor({
              storeId,
              name: productData.vendor,
              slug: productData.vendor.toLowerCase().replace(/\s+/g, "-")
            });
          }
          const product = {
            id: productData.id.toString(),
            storeId,
            vendorId: vendor?.id,
            title: productData.title,
            handle: productData.handle,
            vendor: productData.vendor,
            productType: productData.product_type,
            price: productData.variants[0]?.price || "0",
            compareAtPrice: productData.variants[0]?.compare_at_price,
            status: productData.status
          };
          await storage.upsertProduct(product);
          console.log(`Successfully processed product webhook for product ${productData.id}`);
        } catch (error) {
          console.error(`Error handling product webhook for product ${productData.id}:`, TokenEncryption.sanitizeForLogging(error));
          throw error;
        }
      }
      // Webhook handler for customer creation
      async handleCustomerWebhook(customerData, storeId) {
        try {
          console.log(`Processing customer webhook for customer ${customerData.id} in store ${storeId}`);
          console.log(`New customer created: ${customerData.email} (ID: ${customerData.id})`);
          console.log(`Successfully processed customer webhook for customer ${customerData.id}`);
        } catch (error) {
          console.error(`Error handling customer webhook for customer ${customerData.id}:`, TokenEncryption.sanitizeForLogging(error));
          throw error;
        }
      }
      async getShopInfo(store) {
        try {
          const { data } = await this.makeShopifyRequest(store, "shop");
          return data.shop;
        } catch (error) {
          console.error("Error getting shop info:", TokenEncryption.sanitizeForLogging(error));
          throw error;
        }
      }
    };
    shopifyService = new ShopifyService();
  }
});

// server/shopifyAuth.ts
var shopifyAuth_exports = {};
__export(shopifyAuth_exports, {
  authenticateShopify: () => authenticateShopify,
  getShopifyAdminClient: () => getShopifyAdminClient,
  initializeShopify: () => initializeShopify,
  setupShopifyAuth: () => setupShopifyAuth,
  setupShopifyWebhooks: () => setupShopifyWebhooks,
  shopify: () => shopify,
  upsertShopifyUser: () => upsertShopifyUser
});
import { shopifyApp } from "@shopify/shopify-app-express";
import { MemorySessionStorage } from "@shopify/shopify-app-session-storage-memory";
import { ApiVersion } from "@shopify/shopify-api";
import express from "express";
import crypto2 from "crypto";
function initializeShopify() {
  if (!shopify) {
    shopify = shopifyApp({
      api: {
        apiKey: process.env.SHOPIFY_API_KEY,
        apiSecretKey: process.env.SHOPIFY_API_SECRET,
        scopes: (process.env.SCOPES || "").split(","),
        hostScheme: "https",
        hostName: process.env.HOST?.replace("https://", "").replace("http://", "") || "",
        apiVersion: ApiVersion.October24,
        isEmbeddedApp: true
        // Critical for embedded apps
      },
      auth: {
        path: "/api/auth",
        callbackPath: "/api/auth/callback"
      },
      webhooks: {
        path: "/api/webhooks"
      },
      sessionStorage: new MemorySessionStorage(),
      useOnlineTokens: true
    });
  }
  return shopify;
}
function validateShopifyConfig() {
  const requiredVars = [
    "SHOPIFY_API_KEY",
    "SHOPIFY_API_SECRET",
    "SCOPES",
    "HOST"
  ];
  const missing = requiredVars.filter((varName) => !process.env[varName]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}
async function upsertShopifyUser(session2) {
  const { shop, accessToken, onlineAccessInfo } = session2;
  let userId;
  if (onlineAccessInfo?.associated_user) {
    const user = onlineAccessInfo.associated_user;
    const savedUser = await storage.upsertUser({
      id: `shopify_${user.id}`,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      profileImageUrl: user.avatar || null
    });
    userId = savedUser.id;
  } else {
    const savedUser = await storage.upsertUser({
      id: `shopify_shop_${shop.replace(".myshopify.com", "")}`,
      email: null,
      firstName: null,
      lastName: null,
      profileImageUrl: null
    });
    userId = savedUser.id;
  }
  const existingStore = await storage.getStoreByDomain(shop);
  if (existingStore) {
    await storage.updateStore(existingStore.id, {
      accessToken,
      lastSyncAt: /* @__PURE__ */ new Date(),
      isActive: true
    });
  } else {
    await storage.createStore({
      userId,
      name: shop.replace(".myshopify.com", ""),
      domain: shop,
      accessToken,
      isActive: true,
      lastSyncAt: /* @__PURE__ */ new Date()
    });
  }
}
async function registerWebhooks(session2) {
  const webhookTopics = [
    // Business webhooks
    "orders/create",
    "orders/updated",
    "products/create",
    "products/update",
    "customers/create",
    // MANDATORY COMPLIANCE WEBHOOKS FOR APP STORE
    "customers/data_request",
    "customers/redact",
    "shop/redact",
    "app/uninstalled"
  ];
  const webhookUrl = `${process.env.HOST}/api/webhooks`;
  const apiVersion = "2024-10";
  try {
    const existingResponse = await fetch(`https://${session2.shop}/admin/api/${apiVersion}/webhooks.json`, {
      method: "GET",
      headers: {
        "X-Shopify-Access-Token": session2.accessToken,
        "Content-Type": "application/json"
      }
    });
    let existingWebhooks = [];
    if (existingResponse.ok) {
      const existingData = await existingResponse.json();
      existingWebhooks = existingData.webhooks || [];
    }
    const existingTopics = existingWebhooks.filter((webhook) => webhook.address === webhookUrl).map((webhook) => webhook.topic);
    console.log(`Found ${existingWebhooks.length} existing webhooks, ${existingTopics.length} for our URL`);
    for (const topic of webhookTopics) {
      if (existingTopics.includes(topic)) {
        console.log(`Webhook for ${topic} already exists, skipping`);
        continue;
      }
      try {
        const webhookData = {
          webhook: {
            topic,
            address: webhookUrl,
            format: "json"
          }
        };
        const response = await fetch(`https://${session2.shop}/admin/api/${apiVersion}/webhooks.json`, {
          method: "POST",
          headers: {
            "X-Shopify-Access-Token": session2.accessToken,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(webhookData)
        });
        if (response.ok) {
          const result = await response.json();
          console.log(`Successfully registered webhook for ${topic}:`, result.webhook?.id);
        } else {
          const error = await response.text();
          console.error(`Failed to register webhook for ${topic}:`, TokenEncryption.sanitizeForLogging(error));
        }
      } catch (error) {
        console.error(`Error registering webhook for ${topic}:`, TokenEncryption.sanitizeForLogging(error));
      }
    }
  } catch (error) {
    console.error("Error fetching existing webhooks:", TokenEncryption.sanitizeForLogging(error));
    console.log("Falling back to registering all webhooks...");
    for (const topic of webhookTopics) {
      try {
        const webhookData = {
          webhook: {
            topic,
            address: webhookUrl,
            format: "json"
          }
        };
        const response = await fetch(`https://${session2.shop}/admin/api/${apiVersion}/webhooks.json`, {
          method: "POST",
          headers: {
            "X-Shopify-Access-Token": session2.accessToken,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(webhookData)
        });
        if (response.ok) {
          const result = await response.json();
          console.log(`Successfully registered webhook for ${topic}:`, result.webhook?.id);
        } else {
          const error2 = await response.text();
          console.error(`Failed to register webhook for ${topic}:`, TokenEncryption.sanitizeForLogging(error2));
        }
      } catch (error2) {
        console.error(`Error registering webhook for ${topic}:`, TokenEncryption.sanitizeForLogging(error2));
      }
    }
  }
}
function verifyWebhookHMAC(secret) {
  return (req, res, next) => {
    const hmacHeader = req.get("X-Shopify-Hmac-Sha256");
    if (!hmacHeader) {
      console.log("Webhook verification failed: No HMAC header");
      return res.status(401).send("Unauthorized");
    }
    const rawBody = req.body;
    if (!rawBody || !Buffer.isBuffer(rawBody)) {
      console.log("Webhook verification failed: No raw body");
      return res.status(401).send("Unauthorized");
    }
    const hash = crypto2.createHmac("sha256", secret).update(rawBody).digest("base64");
    if (hash !== hmacHeader) {
      console.log("Webhook verification failed: HMAC mismatch");
      return res.status(401).send("Unauthorized");
    }
    try {
      req.body = JSON.parse(rawBody.toString("utf8"));
    } catch (error) {
      console.error("Failed to parse webhook body:", TokenEncryption.sanitizeForLogging(error));
      return res.status(400).send("Bad Request");
    }
    next();
  };
}
async function setupShopifyWebhooks(app2) {
  const requiredVars = ["SHOPIFY_API_KEY", "SHOPIFY_API_SECRET", "HOST"];
  const missingVars = requiredVars.filter((varName) => !process.env[varName]);
  if (missingVars.length > 0) {
    console.log(`Shopify webhook setup skipped - missing environment variables: ${missingVars.join(", ")}`);
    return;
  }
  try {
    await setupWebhookEndpoint(app2, "/api/webhooks");
    console.log("Shopify webhooks configured");
  } catch (error) {
    console.error("Error setting up Shopify webhooks:", TokenEncryption.sanitizeForLogging(error));
  }
}
async function setupWebhookEndpoint(app2, path4 = "/api/webhooks") {
  const webhookSecret = process.env.SHOPIFY_API_SECRET;
  const allWebhookHandlers = {
    ...gdprWebhookHandlers,
    "app/uninstalled": async (topic, shop, body, webhookId) => {
      try {
        console.log(`Received ${topic} webhook from ${shop} (ID: ${webhookId})`);
        const uninstallData = JSON.parse(body);
        const store = await storage.getStoreByDomain(shop);
        if (store) {
          console.log(`Processing app uninstall for store: ${store.id}`);
          await storage.updateStore(store.id, {
            isActive: false,
            lastSyncAt: /* @__PURE__ */ new Date()
          });
          console.log(`Successfully marked store ${store.id} as inactive`);
        } else {
          console.warn(`Store not found for uninstall webhook: ${shop}`);
        }
        console.log(`Successfully processed ${topic} webhook from ${shop}`);
      } catch (error) {
        console.error(`Error processing ${topic} webhook from ${shop}:`, TokenEncryption.sanitizeForLogging(error));
      }
    },
    "orders/create": async (topic, shop, body, webhookId) => {
      try {
        console.log(`Received ${topic} webhook from ${shop} (ID: ${webhookId})`);
        const orderData = JSON.parse(body);
        const store = await storage.getStoreByDomain(shop);
        if (!store) {
          console.error(`Store not found for shop domain: ${shop}`);
          return;
        }
        const { shopifyService: shopifyService2 } = await Promise.resolve().then(() => (init_shopifyService(), shopifyService_exports));
        await shopifyService2.handleOrderWebhook(orderData, store.id);
        console.log(`Successfully processed ${topic} webhook from ${shop}`);
      } catch (error) {
        console.error(`Error processing ${topic} webhook from ${shop}:`, TokenEncryption.sanitizeForLogging(error));
      }
    },
    "orders/updated": async (topic, shop, body, webhookId) => {
      try {
        console.log(`Received ${topic} webhook from ${shop} (ID: ${webhookId})`);
        const orderData = JSON.parse(body);
        const store = await storage.getStoreByDomain(shop);
        if (!store) {
          console.error(`Store not found for shop domain: ${shop}`);
          return;
        }
        const { shopifyService: shopifyService2 } = await Promise.resolve().then(() => (init_shopifyService(), shopifyService_exports));
        await shopifyService2.handleOrderWebhook(orderData, store.id);
        console.log(`Successfully processed ${topic} webhook from ${shop}`);
      } catch (error) {
        console.error(`Error processing ${topic} webhook from ${shop}:`, TokenEncryption.sanitizeForLogging(error));
      }
    },
    "products/create": async (topic, shop, body, webhookId) => {
      try {
        console.log(`Received ${topic} webhook from ${shop} (ID: ${webhookId})`);
        const productData = JSON.parse(body);
        const store = await storage.getStoreByDomain(shop);
        if (!store) {
          console.error(`Store not found for shop domain: ${shop}`);
          return;
        }
        const { shopifyService: shopifyService2 } = await Promise.resolve().then(() => (init_shopifyService(), shopifyService_exports));
        await shopifyService2.handleProductWebhook(productData, store.id);
        console.log(`Successfully processed ${topic} webhook from ${shop}`);
      } catch (error) {
        console.error(`Error processing ${topic} webhook from ${shop}:`, TokenEncryption.sanitizeForLogging(error));
      }
    },
    "products/update": async (topic, shop, body, webhookId) => {
      try {
        console.log(`Received ${topic} webhook from ${shop} (ID: ${webhookId})`);
        const productData = JSON.parse(body);
        const store = await storage.getStoreByDomain(shop);
        if (!store) {
          console.error(`Store not found for shop domain: ${shop}`);
          return;
        }
        const { shopifyService: shopifyService2 } = await Promise.resolve().then(() => (init_shopifyService(), shopifyService_exports));
        await shopifyService2.handleProductWebhook(productData, store.id);
        console.log(`Successfully processed ${topic} webhook from ${shop}`);
      } catch (error) {
        console.error(`Error processing ${topic} webhook from ${shop}:`, TokenEncryption.sanitizeForLogging(error));
      }
    },
    "customers/create": async (topic, shop, body, webhookId) => {
      try {
        console.log(`Received ${topic} webhook from ${shop} (ID: ${webhookId})`);
        const customerData = JSON.parse(body);
        const store = await storage.getStoreByDomain(shop);
        if (!store) {
          console.error(`Store not found for shop domain: ${shop}`);
          return;
        }
        const { shopifyService: shopifyService2 } = await Promise.resolve().then(() => (init_shopifyService(), shopifyService_exports));
        await shopifyService2.handleCustomerWebhook(customerData, store.id);
        console.log(`Successfully processed ${topic} webhook from ${shop}`);
      } catch (error) {
        console.error(`Error processing ${topic} webhook from ${shop}:`, TokenEncryption.sanitizeForLogging(error));
      }
    }
  };
  app2.post(
    path4,
    express.raw({ type: "application/json" }),
    verifyWebhookHMAC(webhookSecret),
    async (req, res) => {
      try {
        const topic = req.get("X-Shopify-Topic");
        const shop = req.get("X-Shopify-Shop-Domain");
        const webhookId = req.get("X-Shopify-Webhook-Id");
        console.log(`Processing webhook: ${topic} from ${shop}`);
        const handler = allWebhookHandlers[topic];
        if (handler) {
          await handler(topic, shop, JSON.stringify(req.body), webhookId);
          res.status(200).send("OK");
        } else {
          console.warn(`No handler for webhook topic: ${topic}`);
          res.status(200).send("OK");
        }
      } catch (error) {
        console.error("Error processing webhook:", TokenEncryption.sanitizeForLogging(error));
        res.status(200).send("OK");
      }
    }
  );
  console.log(`Webhook endpoint configured at ${path4}`);
}
async function setupShopifyAuth(app2) {
  validateShopifyConfig();
  const shopifyInstance = initializeShopify();
  app2.set("trust proxy", 1);
  app2.use(shopifyInstance.cspHeaders());
  app2.use((req, res, next) => {
    const shop = req.query.shop || req.headers["x-shopify-shop-domain"];
    if (shop || req.path === "/" || req.path.startsWith("/welcome") || req.path.startsWith("/dashboard")) {
      const existingCSP = res.getHeader("Content-Security-Policy") || "";
      let frameAncestors = "https://admin.shopify.com https://*.myshopify.com";
      if (shop) {
        frameAncestors = `https://${shop} https://admin.shopify.com`;
      }
      if (existingCSP) {
        const updatedCSP = existingCSP.replace(
          /frame-ancestors[^;]*(;|$)/,
          `frame-ancestors ${frameAncestors};`
        );
        if (updatedCSP === existingCSP) {
          res.setHeader("Content-Security-Policy", `${existingCSP} frame-ancestors ${frameAncestors};`);
        } else {
          res.setHeader("Content-Security-Policy", updatedCSP);
        }
      } else {
        res.setHeader(
          "Content-Security-Policy",
          `default-src 'self' https://*.myshopify.com; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.shopify.com; style-src 'self' 'unsafe-inline' https://cdn.shopify.com; img-src 'self' data: https:; font-src 'self' data: https:; connect-src 'self' https://*.myshopify.com; frame-ancestors ${frameAncestors};`
        );
      }
    }
    next();
  });
  app2.get("/api/login", (req, res) => {
    const shop = req.query.shop || process.env.DEFAULT_SHOP_DOMAIN || "";
    if (shop) {
      console.log(`Initiating OAuth for shop: ${shop}`);
      res.redirect(`/api/auth?shop=${shop}`);
    } else {
      const referer = req.get("referer") || "";
      const isEmbedded = referer.includes("admin.shopify.com") || req.query.embedded === "1";
      if (isEmbedded) {
        res.status(400).send(`
          <html>
            <body>
              <h2>Shop parameter required</h2>
              <p>Please access this app from your Shopify admin panel.</p>
            </body>
          </html>
        `);
      } else {
        res.redirect("/");
      }
    }
  });
  app2.get(shopifyInstance.config.auth.path, shopifyInstance.auth.begin());
  app2.get(
    shopifyInstance.config.auth.callbackPath,
    shopifyInstance.auth.callback(),
    async (req, res, next) => {
      try {
        const session2 = res.locals.shopify?.session;
        if (session2?.accessToken && session2?.shop) {
          await upsertShopifyUser(session2);
          await registerWebhooks(session2);
        }
        next();
      } catch (error) {
        console.error("Error in auth callback:", TokenEncryption.sanitizeForLogging(error));
        next();
      }
    },
    // Custom redirect to ensure proper embedded app loading
    async (req, res) => {
      const session2 = res.locals.shopify?.session;
      console.log("[OAUTH CALLBACK] Session data:", session2 ? { shop: session2.shop, hasAccessToken: !!session2.accessToken } : "No session");
      if (session2?.shop && session2?.accessToken) {
        const host = req.query.host;
        const shop = session2.shop;
        console.log(`[OAUTH CALLBACK] Auth successful for ${shop}, host: ${host}`);
        if (host || req.get("referer")?.includes("admin.shopify.com")) {
          const redirectUrl = `/dashboard?shop=${encodeURIComponent(shop)}${host ? `&host=${encodeURIComponent(host)}` : ""}`;
          console.log(`[OAUTH CALLBACK] Redirecting to embedded dashboard: ${redirectUrl}`);
          res.redirect(redirectUrl);
        } else {
          console.log(`[OAUTH CALLBACK] Redirecting to standalone dashboard`);
          res.redirect("/dashboard");
        }
      } else {
        console.error("[OAUTH CALLBACK] No valid session or shop found, redirecting to root");
        res.redirect("/");
      }
    }
  );
  await setupWebhookEndpoint(app2, shopifyInstance.config.webhooks.path);
  app2.use((req, res, next) => {
    const shop = req.query.shop || req.headers["x-shopify-shop-domain"];
    if (shop && !req.path.startsWith("/api/")) {
      res.removeHeader("X-Frame-Options");
    }
    next();
  });
  app2.use((req, res, next) => {
    if (req.path === "/api/auth" || req.path === "/api/auth/callback" || req.path === "/api/auth/user" || // Always skip for /api/auth/user - let route handler manage it
    req.path === "/api/login" || req.path === "/api/webhooks" || req.path === "/api/stores/manual-setup" || req.path.startsWith("/legal/")) {
      return next();
    }
    if (process.env.DEFAULT_SHOP_DOMAIN) {
      if (req.path === "/api/stores" || req.path.startsWith("/api/stores/")) {
        return next();
      }
    }
    if (req.path.startsWith("/api/")) {
      const shop = req.query.shop || req.headers["x-shopify-shop-domain"] || res.locals.shopify?.session?.shop;
      if (!shop) {
        return res.status(401).json({ message: "Unauthorized - Shop context required" });
      }
      return shopifyInstance.validateAuthenticatedSession()(req, res, next);
    }
    next();
  });
  console.log("Shopify authentication configured");
}
function getShopifyAdminClient(session2) {
  return {
    get: async (path4) => {
      throw new Error("Admin API client not implemented yet");
    },
    post: async (path4, data) => {
      throw new Error("Admin API client not implemented yet");
    }
  };
}
var shopify, authenticateShopify, gdprWebhookHandlers;
var init_shopifyAuth = __esm({
  "server/shopifyAuth.ts"() {
    "use strict";
    init_storage();
    init_tokenEncryption();
    shopify = null;
    authenticateShopify = async (req, res, next) => {
      try {
        const session2 = res.locals.shopify?.session;
        if (!session2 || !session2.accessToken) {
          return res.status(401).json({ message: "Unauthorized - No valid Shopify session" });
        }
        await upsertShopifyUser(session2);
        req.shopifySession = session2;
        req.shopifyUser = {
          id: session2.onlineAccessInfo?.associated_user?.id || session2.shop,
          shop: session2.shop,
          accessToken: session2.accessToken
        };
        next();
      } catch (error) {
        console.error("Shopify authentication error:", TokenEncryption.sanitizeForLogging(error));
        res.status(401).json({ message: "Unauthorized" });
      }
    };
    gdprWebhookHandlers = {
      "customers/data_request": async (topic, shop, body, webhookId) => {
        console.log(`Received GDPR ${topic} webhook from ${shop}`);
        const data = JSON.parse(body);
        console.log(`Customer data request for shop ${shop}:`, TokenEncryption.sanitizeForLogging(data));
      },
      "customers/redact": async (topic, shop, body, webhookId) => {
        console.log(`Received GDPR ${topic} webhook from ${shop}`);
        const data = JSON.parse(body);
        console.log(`Customer redaction request for shop ${shop}:`, TokenEncryption.sanitizeForLogging(data));
      },
      "shop/redact": async (topic, shop, body, webhookId) => {
        console.log(`Received GDPR ${topic} webhook from ${shop}`);
        const data = JSON.parse(body);
        console.log(`Shop redaction request for shop ${shop}:`, TokenEncryption.sanitizeForLogging(data));
        try {
          const store = await storage.getStoreByDomain(shop);
          if (store) {
            console.log(`Processing shop redaction for store: ${store.id}`);
          }
        } catch (error) {
          console.error(`Error processing shop redaction for ${shop}:`, TokenEncryption.sanitizeForLogging(error));
        }
      }
    };
  }
});

// server/index.ts
import express3 from "express";

// server/routes.ts
init_storage();
import { createServer } from "http";

// server/replitAuth.ts
init_storage();
import * as client from "openid-client";
import { Strategy } from "openid-client/passport";
import passport from "passport";
import session from "express-session";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}
var getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID
    );
  },
  { maxAge: 3600 * 1e3 }
);
function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1e3;
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions"
  });
  return session({
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl
    }
  });
}
function updateUserSession(user, tokens) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}
async function upsertUser(claims) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"]
  });
}
async function setupAuth(app2) {
  app2.set("trust proxy", 1);
  app2.use(getSession());
  app2.use(passport.initialize());
  app2.use(passport.session());
  const config = await getOidcConfig();
  const verify = async (tokens, verified) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };
  for (const domain of process.env.REPLIT_DOMAINS.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`
      },
      verify
    );
    passport.use(strategy);
  }
  passport.serializeUser((user, cb) => cb(null, user));
  passport.deserializeUser((user, cb) => cb(null, user));
  app2.get("/api/login", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"]
    })(req, res, next);
  });
  app2.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login"
    })(req, res, next);
  });
  app2.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`
        }).href
      );
    });
  });
}
var isAuthenticated = async (req, res, next) => {
  const user = req.user;
  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const now = Math.floor(Date.now() / 1e3);
  if (now <= user.expires_at) {
    return next();
  }
  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};

// server/routes.ts
init_shopifyService();
init_schema();

// server/shopifyBilling.ts
import { BillingInterval, BillingReplacementBehavior } from "@shopify/shopify-api";
var BILLING_CONFIG = {
  // Single paid plan: $69/month with 3-day free trial
  "BrandSight Premium": {
    amount: 69,
    currencyCode: "USD",
    interval: BillingInterval.Every30Days,
    trialDays: 3,
    replacementBehavior: BillingReplacementBehavior.ApplyImmediately,
    test: process.env.NODE_ENV === "development"
    // Use test mode in development
  }
};
async function createBillingSubscription(session2, planName = "BrandSight Premium") {
  try {
    const plan = BILLING_CONFIG[planName];
    if (!plan) {
      throw new Error(`Billing plan ${planName} not found`);
    }
    const client2 = new (await import("@shopify/shopify-api")).GraphqlClient({
      session: session2
    });
    const mutation = `
      mutation appSubscriptionCreate(
        $name: String!
        $returnUrl: URL!
        $trialDays: Int
        $test: Boolean
        $lineItems: [AppSubscriptionLineItemInput!]!
      ) {
        appSubscriptionCreate(
          name: $name
          returnUrl: $returnUrl
          trialDays: $trialDays
          test: $test
          lineItems: $lineItems
        ) {
          appSubscription {
            id
            status
            name
            test
            trialDays
            currentPeriodEnd
            createdAt
          }
          confirmationUrl
          userErrors {
            field
            message
          }
        }
      }
    `;
    const variables = {
      name: planName,
      returnUrl: `${process.env.HOST}/api/billing/callback`,
      trialDays: plan.trialDays,
      test: plan.test,
      lineItems: [
        {
          plan: {
            appRecurringPricingDetails: {
              price: {
                amount: plan.amount,
                currencyCode: plan.currencyCode
              },
              interval: plan.interval
            }
          }
        }
      ]
    };
    const response = await client2.request(mutation, { variables });
    if (response.data.appSubscriptionCreate.userErrors.length > 0) {
      console.error("Billing subscription errors:", response.data.appSubscriptionCreate.userErrors);
      throw new Error(response.data.appSubscriptionCreate.userErrors[0].message);
    }
    return {
      subscription: response.data.appSubscriptionCreate.appSubscription,
      confirmationUrl: response.data.appSubscriptionCreate.confirmationUrl
    };
  } catch (error) {
    console.error("Error creating billing subscription:", error);
    throw error;
  }
}
async function checkActiveSubscription(session2) {
  try {
    const client2 = new (await import("@shopify/shopify-api")).GraphqlClient({
      session: session2
    });
    const query = `
      query {
        currentAppInstallation {
          activeSubscriptions {
            id
            name
            status
            test
            trialDays
            currentPeriodEnd
            createdAt
            lineItems {
              id
              plan {
                pricingDetails {
                  ... on AppRecurringPricing {
                    price {
                      amount
                      currencyCode
                    }
                    interval
                  }
                }
              }
            }
          }
        }
      }
    `;
    const response = await client2.request(query);
    const subscriptions = response.data?.currentAppInstallation?.activeSubscriptions || [];
    const activeSubscription = subscriptions.find(
      (sub) => sub.status === "ACTIVE" && sub.name === "BrandSight Premium"
    );
    return {
      hasActiveSubscription: !!activeSubscription,
      subscription: activeSubscription,
      isInTrial: activeSubscription?.trialDays > 0 && new Date(activeSubscription.currentPeriodEnd) > /* @__PURE__ */ new Date()
    };
  } catch (error) {
    console.error("Error checking subscription status:", error);
    return {
      hasActiveSubscription: false,
      subscription: null,
      isInTrial: false
    };
  }
}
async function cancelSubscription(session2, subscriptionId) {
  try {
    const client2 = new (await import("@shopify/shopify-api")).GraphqlClient({
      session: session2
    });
    const mutation = `
      mutation appSubscriptionCancel($id: ID!) {
        appSubscriptionCancel(id: $id) {
          appSubscription {
            id
            status
            cancelledAt
          }
          userErrors {
            field
            message
          }
        }
      }
    `;
    const response = await client2.request(mutation, {
      variables: { id: subscriptionId }
    });
    if (response.data.appSubscriptionCancel.userErrors.length > 0) {
      throw new Error(response.data.appSubscriptionCancel.userErrors[0].message);
    }
    return response.data.appSubscriptionCancel.appSubscription;
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    throw error;
  }
}

// server/routes.ts
init_cacheService();
import * as csv from "fast-csv";
import * as XLSX from "xlsx";
async function streamVendorCSVExport(storeId, params, res, dateRange) {
  return new Promise(async (resolve, reject) => {
    try {
      const csvStream = csv.format({ headers: true });
      csvStream.pipe(res);
      if (dateRange) {
        csvStream.write({
          "Vendor Name": `Vendor Analytics Report - ${dateRange}`,
          "Revenue ($)": "",
          "Average Order Value ($)": "",
          "Conversion Rate (%)": "",
          "Visitors": "",
          "Product Count": "",
          "Growth Rate (%)": ""
        });
        csvStream.write({
          "Vendor Name": `Generated on: ${(/* @__PURE__ */ new Date()).toLocaleDateString()}`,
          "Revenue ($)": "",
          "Average Order Value ($)": "",
          "Conversion Rate (%)": "",
          "Visitors": "",
          "Product Count": "",
          "Growth Rate (%)": ""
        });
        csvStream.write({
          "Vendor Name": "",
          "Revenue ($)": "",
          "Average Order Value ($)": "",
          "Conversion Rate (%)": "",
          "Visitors": "",
          "Product Count": "",
          "Growth Rate (%)": ""
        });
      }
      let currentPage = 1;
      const batchSize = 100;
      let hasMoreData = true;
      while (hasMoreData) {
        const result = await storage.getStoreVendorMetrics(storeId, {
          page: currentPage,
          limit: batchSize,
          sortBy: params.sortBy,
          sortDirection: params.sortDirection,
          search: params.search
        });
        for (const vendor of result.data) {
          csvStream.write({
            "Vendor Name": vendor.name,
            "Revenue ($)": vendor.revenue,
            "Average Order Value ($)": vendor.aov.toFixed(2),
            "Conversion Rate (%)": vendor.conversion.toFixed(1),
            "Visitors": vendor.visitors,
            "Product Count": vendor.productCount,
            "Growth Rate (%)": vendor.growth.toFixed(1)
          });
        }
        hasMoreData = result.pagination.hasNext;
        currentPage++;
      }
      csvStream.end();
      csvStream.on("end", resolve);
      csvStream.on("error", reject);
    } catch (error) {
      reject(error);
    }
  });
}
async function streamVendorExcelExport(storeId, params, res, dateRange) {
  try {
    const allVendors = [];
    let currentPage = 1;
    const batchSize = 100;
    let hasMoreData = true;
    while (hasMoreData) {
      const result = await storage.getStoreVendorMetrics(storeId, {
        page: currentPage,
        limit: batchSize,
        sortBy: params.sortBy,
        sortDirection: params.sortDirection,
        search: params.search
      });
      allVendors.push(...result.data);
      hasMoreData = result.pagination.hasNext;
      currentPage++;
    }
    const workbook = XLSX.utils.book_new();
    const formattedData = allVendors.map((vendor) => ({
      "Vendor Name": vendor.name,
      "Revenue ($)": vendor.revenue,
      "Average Order Value ($)": parseFloat(vendor.aov.toFixed(2)),
      "Conversion Rate (%)": parseFloat(vendor.conversion.toFixed(1)),
      "Visitors": vendor.visitors,
      "Product Count": vendor.productCount,
      "Growth Rate (%)": parseFloat(vendor.growth.toFixed(1))
    }));
    const worksheet = XLSX.utils.aoa_to_sheet([]);
    if (dateRange) {
      XLSX.utils.sheet_add_aoa(worksheet, [
        [`Vendor Analytics Report - ${dateRange}`],
        [`Generated on: ${(/* @__PURE__ */ new Date()).toLocaleDateString()}`],
        [`Total Vendors: ${allVendors.length}`],
        []
        // Empty row
      ], { origin: "A1" });
      XLSX.utils.sheet_add_json(worksheet, formattedData, { origin: "A5", skipHeader: false });
    } else {
      XLSX.utils.sheet_add_json(worksheet, formattedData, { origin: "A1", skipHeader: false });
    }
    const colWidths = [
      { wch: 20 },
      // Vendor Name
      { wch: 15 },
      // Revenue
      { wch: 18 },
      // AOV
      { wch: 15 },
      // Conversion Rate
      { wch: 12 },
      // Visitors
      { wch: 12 },
      // Product Count
      { wch: 12 }
      // Growth Rate
    ];
    worksheet["!cols"] = colWidths;
    XLSX.utils.book_append_sheet(workbook, worksheet, "Vendor Analytics");
    const summaryData = [
      ["Summary Statistics", "", ""],
      ["Total Vendors", allVendors.length, ""],
      ["Total Revenue", allVendors.reduce((sum, v) => sum + v.revenue, 0), "$"],
      ["Average AOV", (allVendors.reduce((sum, v) => sum + v.aov, 0) / allVendors.length).toFixed(2), "$"],
      ["Average Conversion Rate", (allVendors.reduce((sum, v) => sum + v.conversion, 0) / allVendors.length).toFixed(1), "%"],
      ["Top Revenue Vendor", allVendors.sort((a, b) => b.revenue - a.revenue)[0]?.name || "N/A", ""],
      ["Highest Growth Vendor", allVendors.sort((a, b) => b.growth - a.growth)[0]?.name || "N/A", ""]
    ];
    const summaryWorksheet = XLSX.utils.aoa_to_sheet(summaryData);
    summaryWorksheet["!cols"] = [{ wch: 20 }, { wch: 15 }, { wch: 5 }];
    XLSX.utils.book_append_sheet(workbook, summaryWorksheet, "Summary");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    res.send(buffer);
  } catch (error) {
    throw error;
  }
}
async function registerRoutes(app2) {
  const useShopifyAuth = process.env.USE_SHOPIFY_AUTH === "true";
  let authenticateShopify2;
  if (useShopifyAuth) {
    const { setupShopifyAuth: setupShopifyAuth2, authenticateShopify: shopifyAuthMiddleware } = await Promise.resolve().then(() => (init_shopifyAuth(), shopifyAuth_exports));
    authenticateShopify2 = shopifyAuthMiddleware;
    await setupShopifyAuth2(app2);
  } else {
    await setupAuth(app2);
    const { setupShopifyWebhooks: setupShopifyWebhooks2 } = await Promise.resolve().then(() => (init_shopifyAuth(), shopifyAuth_exports));
    await setupShopifyWebhooks2(app2);
  }
  const authenticate = useShopifyAuth ? authenticateShopify2 : isAuthenticated;
  const authenticateOrDemo = (req, res, next) => {
    const userId = getUserId(req);
    if (userId) {
      next();
    } else {
      req.isDemoMode = true;
      req.user = {
        claims: { sub: "demo_user" },
        isDemoMode: true
      };
      next();
    }
  };
  const getUserId = (req) => {
    if (useShopifyAuth) {
      const rawId = req.shopifyUser?.id || req.shopifySession?.shop;
      return rawId ? `shopify_${rawId}` : null;
    } else {
      return req.user?.claims?.sub;
    }
  };
  const getUserCurrentStore = async (req) => {
    const userId = getUserId(req);
    if (!userId) {
      return {
        id: "demo_store_1",
        userId: "demo_user",
        name: "Demo Store",
        domain: "demo-store.myshopify.com",
        accessToken: "demo_token",
        isActive: true,
        lastSyncAt: /* @__PURE__ */ new Date(),
        createdAt: /* @__PURE__ */ new Date("2024-01-01")
      };
    }
    const stores2 = await storage.getUserStores(userId);
    if (stores2.length === 0) {
      return {
        id: "demo_store_1",
        userId,
        name: "Demo Store",
        domain: "demo-store.myshopify.com",
        accessToken: "demo_token",
        isActive: true,
        lastSyncAt: /* @__PURE__ */ new Date(),
        createdAt: /* @__PURE__ */ new Date("2024-01-01")
      };
    }
    return stores2[0];
  };
  app2.get("/legal/privacy", (_req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Privacy Policy - BrandSight</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.6; color: #333; }
    h1, h2 { color: #111; }
    h1 { border-bottom: 2px solid #e0e0e0; padding-bottom: 0.5rem; }
    h2 { margin-top: 2rem; }
    p { margin: 1rem 0; }
    ul { margin: 1rem 0; padding-left: 2rem; }
    .update-date { color: #666; font-style: italic; }
  </style>
</head>
<body>
  <h1>Privacy Policy</h1>
  <p class="update-date">Last Updated: January 2025</p>
  
  <h2>1. Information We Collect</h2>
  <p>BrandSight collects and processes the following data from your Shopify store:</p>
  <ul>
    <li>Product information including vendor/brand data</li>
    <li>Order and transaction data</li>
    <li>Customer analytics (aggregated, non-personally identifiable)</li>
    <li>Store configuration and settings</li>
  </ul>
  
  <h2>2. How We Use Your Data</h2>
  <p>We use your data exclusively to provide analytics services:</p>
  <ul>
    <li>Generate vendor/brand performance reports</li>
    <li>Calculate metrics like AOV, conversion rates, and revenue</li>
    <li>Provide insights and recommendations</li>
    <li>Improve our analytics algorithms</li>
  </ul>
  
  <h2>3. Data Security</h2>
  <p>We implement industry-standard security measures including:</p>
  <ul>
    <li>End-to-end encryption for data transmission</li>
    <li>Secure database storage with access controls</li>
    <li>Regular security audits and updates</li>
    <li>GDPR and CCPA compliance</li>
  </ul>
  
  <h2>4. Data Retention</h2>
  <p>We retain your data for as long as you maintain an active subscription. Upon cancellation, your data is deleted within 30 days unless legally required to retain it longer.</p>
  
  <h2>5. Your Rights</h2>
  <p>You have the right to:</p>
  <ul>
    <li>Access your data</li>
    <li>Request data correction or deletion</li>
    <li>Export your data</li>
    <li>Opt-out of certain data processing</li>
  </ul>
  
  <h2>6. Contact Us</h2>
  <p>For privacy concerns or data requests, contact us at: support@brandsight.app</p>
</body>
</html>`);
  });
  app2.get("/legal/terms", (_req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Terms of Service - BrandSight</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.6; color: #333; }
    h1, h2 { color: #111; }
    h1 { border-bottom: 2px solid #e0e0e0; padding-bottom: 0.5rem; }
    h2 { margin-top: 2rem; }
    p { margin: 1rem 0; }
    ul { margin: 1rem 0; padding-left: 2rem; }
    .update-date { color: #666; font-style: italic; }
  </style>
</head>
<body>
  <h1>Terms of Service</h1>
  <p class="update-date">Last Updated: January 2025</p>
  
  <h2>1. Service Description</h2>
  <p>BrandSight provides vendor and brand analytics services for Shopify stores. By using our service, you agree to these terms.</p>
  
  <h2>2. Acceptable Use</h2>
  <p>You agree to:</p>
  <ul>
    <li>Provide accurate store information</li>
    <li>Use the service only for legitimate business purposes</li>
    <li>Not attempt to access other users' data</li>
    <li>Comply with all applicable laws and Shopify's terms</li>
  </ul>
  
  <h2>3. Subscription and Billing</h2>
  <p>Subscription fees are billed monthly through Shopify's billing system. You may cancel at any time, with cancellation taking effect at the end of your current billing period.</p>
  
  <h2>4. Limitation of Liability</h2>
  <p>BrandSight is provided "as is" without warranties. We are not liable for any indirect, incidental, or consequential damages arising from your use of the service.</p>
  
  <h2>5. Data Processing</h2>
  <p>By using BrandSight, you authorize us to access and process your Shopify store data as described in our Privacy Policy.</p>
  
  <h2>6. Termination</h2>
  <p>We reserve the right to terminate or suspend access to our service for violations of these terms or for any other reason at our discretion.</p>
  
  <h2>7. Changes to Terms</h2>
  <p>We may update these terms at any time. Continued use of the service constitutes acceptance of the updated terms.</p>
  
  <h2>8. Governing Law</h2>
  <p>These terms are governed by the laws of Delaware, United States. Any disputes shall be resolved through binding arbitration.</p>
  
  <h2>9. Contact</h2>
  <p>For questions about these terms, contact us at: support@brandsight.app</p>
</body>
</html>`);
  });
  app2.get("/api/auth/user", async (req, res, next) => {
    console.log("[AUTH DEBUG] /api/auth/user called, useShopifyAuth:", useShopifyAuth);
    if (useShopifyAuth) {
      try {
        const shop = req.query.shop || req.headers["x-shopify-shop-domain"] || res.locals.shopify?.session?.shop;
        const host = req.query.host || req.headers["x-shopify-host"];
        console.log("[AUTH DEBUG] Shop:", shop, "Host:", host);
        if (!shop) {
          const loginUrl2 = `/api/login?${new URLSearchParams({
            ...host && { host }
          }).toString()}`;
          console.log("[AUTH DEBUG] No shop context, returning 401 with loginUrl:", loginUrl2);
          return res.status(401).json({ loginUrl: loginUrl2 });
        }
        let sessionValid = false;
        try {
          const { initializeShopify: initializeShopify2 } = await Promise.resolve().then(() => (init_shopifyAuth(), shopifyAuth_exports));
          const shopifyInstance = initializeShopify2();
          if (shopifyInstance && shopifyInstance.config) {
            await new Promise((resolve, reject) => {
              shopifyInstance.validateAuthenticatedSession()(req, res, (error) => {
                if (error) {
                  console.log("[AUTH DEBUG] Shopify session validation failed:", error.message);
                  reject(error);
                } else {
                  console.log("[AUTH DEBUG] Shopify session validation passed");
                  sessionValid = true;
                  resolve(true);
                }
              });
            });
          }
        } catch (error) {
          console.log("[AUTH DEBUG] Session validation failed:", error?.message || error);
          sessionValid = false;
        }
        if (sessionValid) {
          const session2 = res.locals.shopify?.session;
          if (session2 && session2.accessToken) {
            console.log("[AUTH DEBUG] Valid session found, upserting user for shop:", session2.shop);
            const { upsertShopifyUser: upsertShopifyUser2 } = await Promise.resolve().then(() => (init_shopifyAuth(), shopifyAuth_exports));
            await upsertShopifyUser2(session2);
            const userId = session2.onlineAccessInfo?.associated_user?.id ? `shopify_${session2.onlineAccessInfo.associated_user.id}` : `shopify_shop_${session2.shop.replace(".myshopify.com", "")}`;
            const user = await storage.getUser(userId);
            if (user) {
              console.log("[AUTH DEBUG] Returning authenticated user");
              return res.json(user);
            }
          }
        }
        console.log("[AUTH DEBUG] Checking if store exists and is active for shop:", shop);
        try {
          const store = await storage.getStoreByDomain(shop);
          if (store && store.isActive) {
            console.log("[AUTH DEBUG] Found active store, returning success");
            const user = await storage.getUser(store.userId);
            if (user) {
              return res.json(user);
            } else {
              const newUser = await storage.upsertUser({
                id: store.userId,
                email: `admin@${shop}`,
                firstName: "Store",
                lastName: "Admin",
                profileImageUrl: null
              });
              return res.json(newUser);
            }
          }
        } catch (error) {
          console.log("[AUTH DEBUG] Error checking store:", error);
        }
        const loginUrl = `/api/login?${new URLSearchParams({
          shop,
          ...host && { host }
        }).toString()}`;
        console.log("[AUTH DEBUG] No valid session or active store, returning 401 with loginUrl:", loginUrl);
        return res.status(401).json({ loginUrl });
      } catch (error) {
        console.error("[AUTH DEBUG] Unexpected error in auth/user:", error);
        const shop = req.query.shop || req.headers["x-shopify-shop-domain"];
        const host = req.query.host || req.headers["x-shopify-host"];
        const loginUrl = `/api/login?${new URLSearchParams({
          ...shop && { shop },
          ...host && { host }
        }).toString()}`;
        return res.status(401).json({ loginUrl });
      }
    }
    authenticate(req, res, async () => {
      try {
        const userId = getUserId(req);
        if (!userId) {
          return res.status(401).json({ message: "No user ID found" });
        }
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
        res.json(user);
      } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ message: "Failed to fetch user" });
      }
    });
  });
  app2.get("/api/stores", async (req, res, next) => {
    if (process.env.DEFAULT_SHOP_DOMAIN && !req.user && !req.shopifyUser) {
      try {
        const shopDomain = process.env.DEFAULT_SHOP_DOMAIN;
        const userId = `shopify_${shopDomain.replace(".myshopify.com", "")}`;
        const stores2 = await storage.getUserStores(userId);
        return res.json(stores2);
      } catch (error) {
        console.error("Error fetching default stores:", error);
        return res.json([]);
      }
    }
    authenticate(req, res, async () => {
      try {
        const userId = getUserId(req);
        if (!userId) {
          return res.status(401).json({ message: "No user ID found" });
        }
        const stores2 = await storage.getUserStores(userId);
        res.json(stores2);
      } catch (error) {
        console.error("Error fetching stores:", error);
        res.status(500).json({ message: "Failed to fetch stores" });
      }
    });
  });
  app2.post("/api/stores/manual-setup", async (req, res) => {
    try {
      const shopDomain = process.env.DEFAULT_SHOP_DOMAIN;
      const accessToken = req.body.accessToken || process.env.SHOPIFY_ACCESS_TOKEN || "";
      if (!shopDomain) {
        return res.status(400).json({ message: "No shop domain configured" });
      }
      const userId = `shopify_${shopDomain.replace(".myshopify.com", "")}`;
      const user = await storage.upsertUser({
        id: userId,
        email: `admin@${shopDomain}`,
        firstName: "Store",
        lastName: "Admin",
        profileImageUrl: null
      });
      const existingStore = await storage.getStoreByDomain(shopDomain);
      if (existingStore) {
        const updatedStore = await storage.updateStore(existingStore.id, {
          accessToken: accessToken || existingStore.accessToken,
          lastSyncAt: /* @__PURE__ */ new Date()
        });
        res.json({ store: updatedStore, message: "Store already exists - updated" });
      } else {
        const storeData = {
          userId: user.id,
          name: shopDomain.replace(".myshopify.com", ""),
          domain: shopDomain,
          accessToken
        };
        const store = await storage.createStore(storeData);
        try {
          await shopifyService.syncProducts(store);
          await shopifyService.syncOrders(store);
        } catch (syncError) {
          console.error("Error during initial sync:", syncError);
        }
        res.json({ store, message: "Store created successfully" });
      }
    } catch (error) {
      console.error("Error in manual store setup:", error);
      res.status(500).json({ message: "Failed to setup store manually" });
    }
  });
  app2.post("/api/stores", authenticate, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "No user ID found" });
      }
      const storeData = insertStoreSchema.parse({ ...req.body, userId });
      const store = await storage.createStore(storeData);
      try {
        await shopifyService.syncProducts(store);
        await shopifyService.syncOrders(store);
      } catch (syncError) {
        console.error("Error during initial sync:", syncError);
      }
      res.json(store);
    } catch (error) {
      console.error("Error creating store:", error);
      res.status(500).json({ message: "Failed to create store" });
    }
  });
  app2.get("/api/stores/current/vendors", authenticateOrDemo, async (req, res) => {
    try {
      const store = await getUserCurrentStore(req);
      const { page, limit, sortBy, sortDirection, search, paginated } = req.query;
      if (paginated === "true") {
        const paginationParams = {
          page: page ? parseInt(page) : 1,
          limit: limit ? parseInt(limit) : 50,
          sortBy: sortBy || "name",
          sortDirection: sortDirection || "asc",
          search
        };
        const result = await storage.getStoreVendorsPaginated(store.id, paginationParams);
        return res.json(result);
      }
      const cacheKey = CacheKeyBuilder.vendors(store.id);
      let vendors2 = cacheService.getObject(cacheKey);
      if (vendors2) {
        return res.json(vendors2);
      }
      vendors2 = await storage.getStoreVendors(store.id);
      cacheService.setObject(cacheKey, vendors2, 6e5);
      res.json(vendors2);
    } catch (error) {
      console.error("Error fetching current store vendors:", error);
      if (error instanceof Error && error.message === "No stores found for user") {
        return res.status(404).json({ message: "No stores found for user" });
      }
      res.status(500).json({ message: "Failed to fetch vendors" });
    }
  });
  app2.get("/api/stores/current/vendors/metrics", authenticateOrDemo, async (req, res) => {
    try {
      const store = await getUserCurrentStore(req);
      const { page, limit, sortBy, sortDirection, search } = req.query;
      const paginationParams = {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 50,
        sortBy: sortBy || "revenue",
        sortDirection: sortDirection || "desc",
        search
      };
      const result = await storage.getStoreVendorMetrics(store.id, paginationParams);
      res.json(result);
    } catch (error) {
      console.error("Error fetching vendor metrics:", error);
      res.status(500).json({ message: "Failed to fetch vendor metrics" });
    }
  });
  app2.get("/api/stores/current/vendors/export/csv", authenticateOrDemo, async (req, res) => {
    try {
      const store = await getUserCurrentStore(req);
      const { search, sortBy, sortDirection, dateRange } = req.query;
      const exportParams = {
        sortBy: sortBy || "revenue",
        sortDirection: sortDirection || "desc",
        search
      };
      const filename = `vendor-analytics-${dateRange || "all"}-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.csv`;
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Cache-Control", "no-cache");
      await streamVendorCSVExport(store.id, exportParams, res, dateRange);
    } catch (error) {
      console.error("Error exporting vendor CSV:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to export vendor data" });
      }
    }
  });
  app2.get("/api/stores/current/vendors/export/excel", authenticateOrDemo, async (req, res) => {
    try {
      const store = await getUserCurrentStore(req);
      const { search, sortBy, sortDirection, dateRange } = req.query;
      const exportParams = {
        sortBy: sortBy || "revenue",
        sortDirection: sortDirection || "desc",
        search
      };
      const filename = `vendor-analytics-${dateRange || "all"}-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.xlsx`;
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Cache-Control", "no-cache");
      await streamVendorExcelExport(store.id, exportParams, res, dateRange);
    } catch (error) {
      console.error("Error exporting vendor Excel:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to export vendor data" });
      }
    }
  });
  app2.get("/api/stores/current/exports/:jobId/status", authenticateOrDemo, async (req, res) => {
    try {
      const { jobId } = req.params;
      res.json({
        jobId,
        status: "completed",
        progress: 100,
        downloadUrl: `/api/stores/current/exports/${jobId}/download`
      });
    } catch (error) {
      console.error("Error checking export status:", error);
      res.status(500).json({ message: "Failed to check export status" });
    }
  });
  app2.get("/api/stores/current/analytics/summary", authenticateOrDemo, async (req, res) => {
    try {
      const store = await getUserCurrentStore(req);
      const { vendorId, startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1e3);
      const end = endDate ? new Date(endDate) : /* @__PURE__ */ new Date();
      const cacheKey = CacheKeyBuilder.vendorSummary(store.id, vendorId, start, end);
      let summary = cacheService.getAnalytics(cacheKey);
      if (summary) {
        return res.json(summary);
      }
      summary = await storage.getVendorSummary(
        store.id,
        vendorId,
        start,
        end
      );
      cacheService.setAnalytics(cacheKey, summary, 9e5);
      res.json(summary);
    } catch (error) {
      console.error("Error fetching current store analytics summary:", error);
      if (error instanceof Error && error.message === "No stores found for user") {
        return res.status(404).json({ message: "No stores found for user" });
      }
      res.status(500).json({ message: "Failed to fetch analytics summary" });
    }
  });
  app2.get("/api/stores/current/products/top", authenticateOrDemo, async (req, res) => {
    try {
      const store = await getUserCurrentStore(req);
      const { vendorId, limit, page, sortBy, sortDirection, paginated } = req.query;
      if (paginated === "true") {
        const paginationParams = {
          page: page ? parseInt(page) : 1,
          limit: limit ? parseInt(limit) : 50,
          sortBy: sortBy || "totalRevenue",
          sortDirection: sortDirection || "desc",
          vendorId
        };
        const result = await storage.getTopProductsPaginated(store.id, paginationParams);
        return res.json(result);
      }
      const limitNum = limit ? parseInt(limit) : 10;
      const cacheKey = CacheKeyBuilder.topProducts(store.id, vendorId, limitNum);
      let topProducts = cacheService.getAnalytics(cacheKey);
      if (topProducts) {
        return res.json(topProducts);
      }
      topProducts = await storage.getTopProducts(
        store.id,
        vendorId,
        limitNum
      );
      cacheService.setAnalytics(cacheKey, topProducts, 9e5);
      res.json(topProducts);
    } catch (error) {
      console.error("Error fetching current store top products:", error);
      if (error instanceof Error && error.message === "No stores found for user") {
        return res.status(404).json({ message: "No stores found for user" });
      }
      res.status(500).json({ message: "Failed to fetch top products" });
    }
  });
  app2.get("/api/stores/current/products", authenticateOrDemo, async (req, res) => {
    try {
      const store = await getUserCurrentStore(req);
      const { page, limit, sortBy, sortDirection, search } = req.query;
      const paginationParams = {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 50,
        sortBy: sortBy || "title",
        sortDirection: sortDirection || "asc",
        search
      };
      const result = await storage.getStoreProducts(store.id, paginationParams);
      res.json(result);
    } catch (error) {
      console.error("Error fetching store products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });
  app2.get("/api/stores/current/analytics/paginated", authenticateOrDemo, async (req, res) => {
    try {
      const store = await getUserCurrentStore(req);
      const { page, limit, sortBy, sortDirection, vendorId, startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1e3);
      const end = endDate ? new Date(endDate) : /* @__PURE__ */ new Date();
      const paginationParams = {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 50,
        sortBy: sortBy || "date",
        sortDirection: sortDirection || "desc",
        vendorId,
        startDate: start,
        endDate: end
      };
      const result = await storage.getVendorAnalyticsPaginated(store.id, paginationParams);
      res.json(result);
    } catch (error) {
      console.error("Error fetching paginated analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });
  app2.get("/api/stores/current/pages/top", authenticateOrDemo, async (req, res) => {
    try {
      const store = await getUserCurrentStore(req);
      const { vendorId, limit } = req.query;
      const limitNum = limit ? parseInt(limit) : 10;
      const cacheKey = CacheKeyBuilder.landingPages(store.id, vendorId, limitNum);
      let topPages = cacheService.getAnalytics(cacheKey);
      if (topPages) {
        return res.json(topPages);
      }
      topPages = await storage.getTopLandingPages(
        store.id,
        vendorId,
        limitNum
      );
      cacheService.setAnalytics(cacheKey, topPages, 9e5);
      res.json(topPages);
    } catch (error) {
      console.error("Error fetching current store top pages:", error);
      if (error instanceof Error && error.message === "No stores found for user") {
        return res.status(404).json({ message: "No stores found for user" });
      }
      res.status(500).json({ message: "Failed to fetch top pages" });
    }
  });
  app2.get("/api/stores/:storeId/vendors", authenticate, async (req, res) => {
    try {
      const { storeId } = req.params;
      const { page, limit, sortBy, sortDirection, search, paginated } = req.query;
      if (paginated === "true") {
        const paginationParams = {
          page: page ? parseInt(page) : 1,
          limit: limit ? parseInt(limit) : 50,
          sortBy: sortBy || "name",
          sortDirection: sortDirection || "asc",
          search
        };
        const result = await storage.getStoreVendorsPaginated(storeId, paginationParams);
        return res.json(result);
      }
      const cacheKey = CacheKeyBuilder.vendors(storeId);
      let vendors2 = cacheService.getObject(cacheKey);
      if (vendors2) {
        return res.json(vendors2);
      }
      vendors2 = await storage.getStoreVendors(storeId);
      cacheService.setObject(cacheKey, vendors2, 6e5);
      res.json(vendors2);
    } catch (error) {
      console.error("Error fetching vendors:", error);
      res.status(500).json({ message: "Failed to fetch vendors" });
    }
  });
  app2.get("/api/stores/:storeId/analytics", authenticate, async (req, res) => {
    try {
      const { storeId } = req.params;
      const { vendorId, startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1e3);
      const end = endDate ? new Date(endDate) : /* @__PURE__ */ new Date();
      const cacheKey = CacheKeyBuilder.analytics(storeId, vendorId, start, end);
      let analytics = cacheService.getAnalytics(cacheKey);
      if (analytics) {
        return res.json(analytics);
      }
      analytics = await storage.getVendorAnalytics(
        storeId,
        vendorId,
        start,
        end
      );
      cacheService.setAnalytics(cacheKey, analytics, 9e5);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });
  app2.get("/api/stores/:storeId/analytics/summary", authenticate, async (req, res) => {
    try {
      const { storeId } = req.params;
      const { vendorId, startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1e3);
      const end = endDate ? new Date(endDate) : /* @__PURE__ */ new Date();
      const cacheKey = CacheKeyBuilder.vendorSummary(storeId, vendorId, start, end);
      let summary = cacheService.getAnalytics(cacheKey);
      if (summary) {
        return res.json(summary);
      }
      summary = await storage.getVendorSummary(
        storeId,
        vendorId,
        start,
        end
      );
      cacheService.setAnalytics(cacheKey, summary, 9e5);
      res.json(summary);
    } catch (error) {
      console.error("Error fetching analytics summary:", error);
      res.status(500).json({ message: "Failed to fetch analytics summary" });
    }
  });
  app2.get("/api/stores/:storeId/products/top", authenticate, async (req, res) => {
    try {
      const { storeId } = req.params;
      const { vendorId, limit } = req.query;
      const limitNum = limit ? parseInt(limit) : 10;
      const cacheKey = CacheKeyBuilder.topProducts(storeId, vendorId, limitNum);
      let topProducts = cacheService.getAnalytics(cacheKey);
      if (topProducts) {
        return res.json(topProducts);
      }
      topProducts = await storage.getTopProducts(
        storeId,
        vendorId,
        limitNum
      );
      cacheService.setAnalytics(cacheKey, topProducts, 9e5);
      res.json(topProducts);
    } catch (error) {
      console.error("Error fetching top products:", error);
      res.status(500).json({ message: "Failed to fetch top products" });
    }
  });
  app2.get("/api/stores/:storeId/pages/top", authenticate, async (req, res) => {
    try {
      const { storeId } = req.params;
      const { vendorId, limit } = req.query;
      const limitNum = limit ? parseInt(limit) : 10;
      const cacheKey = CacheKeyBuilder.landingPages(storeId, vendorId, limitNum);
      let topPages = cacheService.getAnalytics(cacheKey);
      if (topPages) {
        return res.json(topPages);
      }
      topPages = await storage.getTopLandingPages(
        storeId,
        vendorId,
        limitNum
      );
      cacheService.setAnalytics(cacheKey, topPages, 9e5);
      res.json(topPages);
    } catch (error) {
      console.error("Error fetching top landing pages:", error);
      res.status(500).json({ message: "Failed to fetch top landing pages" });
    }
  });
  app2.post("/api/stores/:storeId/sync", authenticate, async (req, res) => {
    try {
      const { storeId } = req.params;
      const store = await storage.getStore(storeId);
      if (!store) {
        return res.status(404).json({ message: "Store not found" });
      }
      cacheService.invalidateAnalytics(storeId);
      console.log(`Cleared analytics cache for store ${storeId} before sync`);
      await shopifyService.syncProducts(store);
      await shopifyService.syncOrders(store);
      cacheService.invalidateStore(storeId);
      console.log(`Cleared all caches for store ${storeId} after sync completion`);
      res.json({ message: "Sync completed successfully" });
    } catch (error) {
      console.error("Error syncing store:", error);
      res.status(500).json({ message: "Failed to sync store" });
    }
  });
  app2.get("/api/cache/metrics", authenticate, (req, res) => {
    try {
      const metrics = cacheService.getMetrics();
      res.json({
        ...metrics,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        message: "Cache metrics retrieved successfully"
      });
    } catch (error) {
      console.error("Error fetching cache metrics:", error);
      res.status(500).json({ message: "Failed to fetch cache metrics" });
    }
  });
  app2.post("/api/cache/clear/:storeId", authenticate, (req, res) => {
    try {
      const { storeId } = req.params;
      cacheService.invalidateStore(storeId);
      res.json({
        message: `Cache cleared for store ${storeId}`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (error) {
      console.error("Error clearing cache:", error);
      res.status(500).json({ message: "Failed to clear cache" });
    }
  });
  if (useShopifyAuth) {
    app2.get("/api/billing/status", authenticate, async (req, res) => {
      try {
        const session2 = req.shopifySession;
        if (!session2) {
          return res.status(401).json({ message: "No Shopify session found" });
        }
        const subscriptionStatus = await checkActiveSubscription(session2);
        res.json(subscriptionStatus);
      } catch (error) {
        console.error("Error checking subscription status:", error);
        res.status(500).json({ message: "Failed to check subscription status" });
      }
    });
    app2.post("/api/billing/subscribe", authenticate, async (req, res) => {
      try {
        const session2 = req.shopifySession;
        if (!session2) {
          return res.status(401).json({ message: "No Shopify session found" });
        }
        const currentStatus = await checkActiveSubscription(session2);
        if (currentStatus.hasActiveSubscription) {
          return res.status(400).json({
            message: "Already have an active subscription",
            subscription: currentStatus.subscription
          });
        }
        const { subscription, confirmationUrl } = await createBillingSubscription(
          session2,
          req.body.planName || "BrandSight Premium"
        );
        res.json({
          subscription,
          confirmationUrl,
          message: "Subscription created. Redirect to confirmationUrl to complete."
        });
      } catch (error) {
        console.error("Error creating subscription:", error);
        res.status(500).json({ message: "Failed to create subscription" });
      }
    });
    app2.post("/api/billing/cancel", authenticate, async (req, res) => {
      try {
        const session2 = req.shopifySession;
        if (!session2) {
          return res.status(401).json({ message: "No Shopify session found" });
        }
        const { subscriptionId } = req.body;
        if (!subscriptionId) {
          return res.status(400).json({ message: "Subscription ID required" });
        }
        const cancelledSubscription = await cancelSubscription(session2, subscriptionId);
        res.json({
          subscription: cancelledSubscription,
          message: "Subscription cancelled successfully"
        });
      } catch (error) {
        console.error("Error cancelling subscription:", error);
        res.status(500).json({ message: "Failed to cancel subscription" });
      }
    });
    app2.get("/api/billing/callback", authenticate, async (req, res) => {
      try {
        const { charge_id } = req.query;
        res.redirect(`/?billing=success&charge_id=${charge_id}`);
      } catch (error) {
        console.error("Error in billing callback:", error);
        res.redirect("/?billing=error");
      }
    });
  }
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express2 from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express2.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
import fs2 from "fs";
import path3 from "path";
var app = express3();
app.use((req, res, next) => {
  if (req.path === "/api/webhooks") {
    next();
  } else {
    express3.json()(req, res, next);
  }
});
app.use(express3.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const shop = req.query.shop || req.headers["x-shopify-shop"] || process.env.DEFAULT_SHOP_DOMAIN;
  if (shop) {
    res.setHeader(
      "Content-Security-Policy",
      `frame-ancestors https://${shop} https://admin.shopify.com;`
    );
  } else {
    res.setHeader(
      "Content-Security-Policy",
      `frame-ancestors 'self';`
    );
  }
  res.removeHeader("X-Frame-Options");
  next();
});
app.use((req, res, next) => {
  const start = Date.now();
  const path4 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path4.startsWith("/api")) {
      let logLine = `${req.method} ${path4} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
});
if (app.get("env") === "development") {
  app.get("/__diag/static", (_req, res) => {
    const publicPath = path3.resolve(import.meta.dirname, "public");
    const assetsPath = path3.resolve(publicPath, "assets");
    res.json({
      staticPath: publicPath,
      assetsPath,
      publicExists: fs2.existsSync(publicPath),
      assetsExists: fs2.existsSync(assetsPath),
      assetCount: fs2.existsSync(assetsPath) ? fs2.readdirSync(assetsPath).length : 0,
      environment: app.get("env"),
      sampleAssets: fs2.existsSync(assetsPath) ? fs2.readdirSync(assetsPath).slice(0, 3) : []
    });
  });
}
if (app.get("env") === "development") {
  app.get("/", (_req, res) => {
    res.status(200).json({ status: "ok", message: "Server is running in development" });
  });
}
function ensureStaticDir() {
  const expectedPath = path3.resolve(import.meta.dirname, "public");
  const distPublicPath = path3.resolve(import.meta.dirname, "..", "dist", "public");
  const distAssetsPath = path3.resolve(distPublicPath, "assets");
  if (fs2.existsSync(distAssetsPath)) {
    if (fs2.existsSync(expectedPath)) {
      try {
        fs2.rmSync(expectedPath, { recursive: true, force: true });
        log(`Removed existing server/public to use fresh dist/public`);
      } catch (error) {
        log(`Warning: Could not remove existing server/public: ${error}`);
      }
    }
    try {
      fs2.symlinkSync(distPublicPath, expectedPath, "junction");
      log(`Created symlink: ${expectedPath} -> ${distPublicPath}`);
      log(`Assets directory contains: ${fs2.readdirSync(distAssetsPath).length} files`);
      return;
    } catch (error) {
      log(`Failed to create symlink: ${error}`);
    }
  }
  log(`Warning: Built assets not found at ${distAssetsPath}. Ensure 'npm run build' was run during deployment.`);
}
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  const isProduction = app.get("env") === "production" || app.get("env") === "development" && fs2.existsSync(path3.resolve(import.meta.dirname, "..", "dist", "public"));
  if (!isProduction) {
    await setupVite(app, server);
  } else {
    ensureStaticDir();
    serveStatic(app);
    log("Serving in production mode with static files");
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
