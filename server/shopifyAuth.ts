import { shopifyApp } from "@shopify/shopify-app-express";
import { MemorySessionStorage } from "@shopify/shopify-app-session-storage-memory";
import { ApiVersion } from "@shopify/shopify-api";
import type { Express } from "express";
import { storage } from "./storage";

// Shopify App Configuration
export const shopify = shopifyApp({
  api: {
    apiVersion: ApiVersion.October24,
    restResources: import("@shopify/shopify-api/rest/admin/2024-10"),
  },
  auth: {
    path: "/api/auth",
    callbackPath: "/api/auth/callback",
  },
  webhooks: {
    path: "/api/webhooks",
  },
  sessionStorage: new MemorySessionStorage(),
  useOnlineTokens: true,
});

// Environment variables validation
function validateShopifyConfig() {
  const requiredVars = [
    'SHOPIFY_API_KEY',
    'SHOPIFY_API_SECRET',
    'SCOPES',
    'HOST'
  ];
  
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Shopify-compatible user storage
async function upsertShopifyUser(session: any) {
  const { shop, accessToken, onlineAccessInfo } = session;
  
  if (onlineAccessInfo?.associated_user) {
    const user = onlineAccessInfo.associated_user;
    await storage.upsertUser({
      id: `shopify_${user.id}`,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      profileImageUrl: user.avatar || null,
    });
  }
  
  // Store shop information (will implement store storage method if needed)
}

// Authentication middleware for Shopify
export const authenticateShopify = async (req: any, res: any, next: any) => {
  try {
    const session = res.locals.shopify?.session;
    
    if (!session || !session.accessToken) {
      return res.status(401).json({ message: "Unauthorized - No valid Shopify session" });
    }
    
    // Store/update user and shop data
    await upsertShopifyUser(session);
    
    // Attach session data to request
    req.shopifySession = session;
    req.shopifyUser = {
      id: session.onlineAccessInfo?.associated_user?.id || session.shop,
      shop: session.shop,
      accessToken: session.accessToken,
    };
    
    next();
  } catch (error) {
    console.error("Shopify authentication error:", error);
    res.status(401).json({ message: "Unauthorized" });
  }
};

// Setup Shopify authentication
export async function setupShopifyAuth(app: Express) {
  validateShopifyConfig();
  
  // Trust proxy for secure cookies
  app.set("trust proxy", 1);
  
  // Apply Shopify middleware
  app.use(shopify.cspHeaders());
  
  // Auth routes
  app.get(shopify.config.auth.path, shopify.auth.begin());
  app.get(shopify.config.auth.callbackPath, shopify.auth.callback(), shopify.redirectToShopifyOrAppRoot());
  
  // Webhook handlers
  const webhookHandlers = {
    'orders/create': async (topic: string, shop: string, body: string, webhookId: string) => {
      try {
        console.log(`Received ${topic} webhook from ${shop} (ID: ${webhookId})`);
        const orderData = JSON.parse(body);
        
        // Find the store by shop domain
        const stores = await storage.getUserStores(`shopify_${shop}`);
        const store = stores.find(s => s.domain === shop);
        
        if (!store) {
          console.error(`Store not found for shop domain: ${shop}`);
          return;
        }
        
        // Import and use ShopifyService
        const { shopifyService } = await import('./services/shopifyService');
        await shopifyService.handleOrderWebhook(orderData, store.id);
        
        console.log(`Successfully processed ${topic} webhook from ${shop}`);
      } catch (error) {
        console.error(`Error processing ${topic} webhook from ${shop}:`, error);
      }
    },
    
    'orders/updated': async (topic: string, shop: string, body: string, webhookId: string) => {
      try {
        console.log(`Received ${topic} webhook from ${shop} (ID: ${webhookId})`);
        const orderData = JSON.parse(body);
        
        // Find the store by shop domain
        const stores = await storage.getUserStores(`shopify_${shop}`);
        const store = stores.find(s => s.domain === shop);
        
        if (!store) {
          console.error(`Store not found for shop domain: ${shop}`);
          return;
        }
        
        // Import and use ShopifyService
        const { shopifyService } = await import('./services/shopifyService');
        await shopifyService.handleOrderWebhook(orderData, store.id);
        
        console.log(`Successfully processed ${topic} webhook from ${shop}`);
      } catch (error) {
        console.error(`Error processing ${topic} webhook from ${shop}:`, error);
      }
    },
    
    'products/create': async (topic: string, shop: string, body: string, webhookId: string) => {
      try {
        console.log(`Received ${topic} webhook from ${shop} (ID: ${webhookId})`);
        const productData = JSON.parse(body);
        
        // Find the store by shop domain
        const stores = await storage.getUserStores(`shopify_${shop}`);
        const store = stores.find(s => s.domain === shop);
        
        if (!store) {
          console.error(`Store not found for shop domain: ${shop}`);
          return;
        }
        
        // Import and use ShopifyService
        const { shopifyService } = await import('./services/shopifyService');
        await shopifyService.handleProductWebhook(productData, store.id);
        
        console.log(`Successfully processed ${topic} webhook from ${shop}`);
      } catch (error) {
        console.error(`Error processing ${topic} webhook from ${shop}:`, error);
      }
    },
    
    'products/update': async (topic: string, shop: string, body: string, webhookId: string) => {
      try {
        console.log(`Received ${topic} webhook from ${shop} (ID: ${webhookId})`);
        const productData = JSON.parse(body);
        
        // Find the store by shop domain
        const stores = await storage.getUserStores(`shopify_${shop}`);
        const store = stores.find(s => s.domain === shop);
        
        if (!store) {
          console.error(`Store not found for shop domain: ${shop}`);
          return;
        }
        
        // Import and use ShopifyService
        const { shopifyService } = await import('./services/shopifyService');
        await shopifyService.handleProductWebhook(productData, store.id);
        
        console.log(`Successfully processed ${topic} webhook from ${shop}`);
      } catch (error) {
        console.error(`Error processing ${topic} webhook from ${shop}:`, error);
      }
    },
    
    'customers/create': async (topic: string, shop: string, body: string, webhookId: string) => {
      try {
        console.log(`Received ${topic} webhook from ${shop} (ID: ${webhookId})`);
        const customerData = JSON.parse(body);
        
        // Find the store by shop domain
        const stores = await storage.getUserStores(`shopify_${shop}`);
        const store = stores.find(s => s.domain === shop);
        
        if (!store) {
          console.error(`Store not found for shop domain: ${shop}`);
          return;
        }
        
        // Import and use ShopifyService
        const { shopifyService } = await import('./services/shopifyService');
        await shopifyService.handleCustomerWebhook(customerData, store.id);
        
        console.log(`Successfully processed ${topic} webhook from ${shop}`);
      } catch (error) {
        console.error(`Error processing ${topic} webhook from ${shop}:`, error);
      }
    },
  };

  // Webhook endpoint
  app.post(shopify.config.webhooks.path, shopify.processWebhooks({ webhookHandlers }));
  
  // Protected routes middleware
  app.use("/api/*", shopify.validateAuthenticatedSession());
  
  console.log("Shopify authentication configured");
}

// Helper to get Shopify Admin API client
export function getShopifyAdminClient(session: any) {
  // Will be implemented once we have proper session management
  // For now, return a placeholder that can be used for API calls
  return {
    get: async (path: string) => { throw new Error("Admin API client not implemented yet"); },
    post: async (path: string, data: any) => { throw new Error("Admin API client not implemented yet"); },
  };
}

// Types for better TypeScript support
declare global {
  namespace Express {
    interface Request {
      shopifySession?: any;
      shopifyUser?: {
        id: string;
        shop: string;
        accessToken: string;
      };
    }
  }
}