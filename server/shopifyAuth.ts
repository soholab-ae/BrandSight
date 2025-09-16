import { shopifyApp } from "@shopify/shopify-app-express";
import { MemorySessionStorage } from "@shopify/shopify-app-session-storage-memory";
import { ApiVersion } from "@shopify/shopify-api";
import type { Express } from "express";
import { storage } from "./storage";

// Conditionally initialize Shopify App Configuration
let shopify: any = null;

function initializeShopify() {
  if (!shopify) {
    shopify = shopifyApp({
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
  }
  return shopify;
}

export { shopify };

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

// Shopify-compatible user and store storage
async function upsertShopifyUser(session: any) {
  const { shop, accessToken, onlineAccessInfo } = session;
  
  let userId: string;
  
  if (onlineAccessInfo?.associated_user) {
    const user = onlineAccessInfo.associated_user;
    const savedUser = await storage.upsertUser({
      id: `shopify_${user.id}`,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      profileImageUrl: user.avatar || null,
    });
    userId = savedUser.id;
  } else {
    // For stores without associated users, create a user based on shop info
    const savedUser = await storage.upsertUser({
      id: `shopify_shop_${shop.replace('.myshopify.com', '')}`,
      email: null,
      firstName: null,
      lastName: null,
      profileImageUrl: null,
    });
    userId = savedUser.id;
  }
  
  // Always save/update store information
  const existingStore = await storage.getStoreByDomain(shop);
  
  if (existingStore) {
    // Update existing store with new access token
    await storage.updateStore(existingStore.id, {
      accessToken,
      lastSyncAt: new Date(),
      isActive: true,
    });
  } else {
    // Create new store
    await storage.createStore({
      userId,
      name: shop.replace('.myshopify.com', ''),
      domain: shop,
      accessToken,
      isActive: true,
      lastSyncAt: new Date(),
    });
  }
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

// Register webhooks with Shopify (avoiding duplicates)
async function registerWebhooks(session: any) {
  const webhookTopics = [
    'orders/create',
    'orders/updated',
    'products/create',
    'products/update',
    'customers/create'
  ];

  const webhookUrl = `${process.env.HOST}/api/webhooks`;
  const apiVersion = '2024-10'; // Use consistent API version

  try {
    // First, get existing webhooks
    const existingResponse = await fetch(`https://${session.shop}/admin/api/${apiVersion}/webhooks.json`, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': session.accessToken,
        'Content-Type': 'application/json',
      },
    });

    let existingWebhooks = [];
    if (existingResponse.ok) {
      const existingData = await existingResponse.json();
      existingWebhooks = existingData.webhooks || [];
    }

    // Check which webhooks already exist for our URL
    const existingTopics = existingWebhooks
      .filter((webhook: any) => webhook.address === webhookUrl)
      .map((webhook: any) => webhook.topic);

    console.log(`Found ${existingWebhooks.length} existing webhooks, ${existingTopics.length} for our URL`);

    for (const topic of webhookTopics) {
      // Skip if webhook already exists
      if (existingTopics.includes(topic)) {
        console.log(`Webhook for ${topic} already exists, skipping`);
        continue;
      }

      try {
        const webhookData = {
          webhook: {
            topic,
            address: webhookUrl,
            format: 'json',
          },
        };

        const response = await fetch(`https://${session.shop}/admin/api/${apiVersion}/webhooks.json`, {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': session.accessToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(webhookData),
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`Successfully registered webhook for ${topic}:`, result.webhook?.id);
        } else {
          const error = await response.text();
          console.error(`Failed to register webhook for ${topic}:`, error);
        }
      } catch (error) {
        console.error(`Error registering webhook for ${topic}:`, error);
      }
    }
  } catch (error) {
    console.error('Error fetching existing webhooks:', error);
    // Fallback: try to register all webhooks anyway
    console.log('Falling back to registering all webhooks...');
    
    for (const topic of webhookTopics) {
      try {
        const webhookData = {
          webhook: {
            topic,
            address: webhookUrl,
            format: 'json',
          },
        };

        const response = await fetch(`https://${session.shop}/admin/api/${apiVersion}/webhooks.json`, {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': session.accessToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(webhookData),
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`Successfully registered webhook for ${topic}:`, result.webhook?.id);
        } else {
          const error = await response.text();
          console.error(`Failed to register webhook for ${topic}:`, error);
        }
      } catch (error) {
        console.error(`Error registering webhook for ${topic}:`, error);
      }
    }
  }
}

// Setup webhook handlers only (for use with non-Shopify auth)
export async function setupShopifyWebhooks(app: Express) {
  // Check if we have the necessary environment variables for webhook processing
  const requiredVars = ['SHOPIFY_API_KEY', 'SHOPIFY_API_SECRET', 'HOST'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.log(`Shopify webhook setup skipped - missing environment variables: ${missingVars.join(', ')}`);
    return;
  }
  
  try {
    const shopifyInstance = initializeShopify();
    
    // Webhook handlers
    const webhookHandlers = {
      'orders/create': async (topic: string, shop: string, body: string, webhookId: string) => {
        try {
          console.log(`Received ${topic} webhook from ${shop} (ID: ${webhookId})`);
          const orderData = JSON.parse(body);
          
          // Find the store by shop domain
          const store = await storage.getStoreByDomain(shop);
          
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
          const store = await storage.getStoreByDomain(shop);
          
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
          const store = await storage.getStoreByDomain(shop);
          
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
          const store = await storage.getStoreByDomain(shop);
          
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
          const store = await storage.getStoreByDomain(shop);
          
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

    // Webhook endpoint with HMAC verification
    app.post(shopifyInstance.config.webhooks.path, shopifyInstance.processWebhooks({ webhookHandlers }));
    
    console.log("Shopify webhooks configured");
  } catch (error) {
    console.error("Error setting up Shopify webhooks:", error);
  }
}

// Setup Shopify authentication
export async function setupShopifyAuth(app: Express) {
  validateShopifyConfig();
  
  const shopifyInstance = initializeShopify();
  
  // Trust proxy for secure cookies
  app.set("trust proxy", 1);
  
  // Apply Shopify middleware
  app.use(shopifyInstance.cspHeaders());
  
  // Add dynamic CSP headers for embedded app
  app.use((req, res, next) => {
    const shop = req.query.shop || req.headers['x-shopify-shop-domain'];
    
    if (shop || req.path === '/' || req.path.startsWith('/welcome')) {
      // Modify only the frame-ancestors directive, keeping other CSP rules
      const existingCSP = res.getHeader('Content-Security-Policy') as string || '';
      
      // Build frame-ancestors based on shop
      let frameAncestors = 'https://admin.shopify.com https://*.myshopify.com';
      if (shop) {
        frameAncestors = `https://${shop} https://admin.shopify.com`;
      }
      
      // If there's an existing CSP, update frame-ancestors; otherwise set a complete policy
      if (existingCSP) {
        // Replace frame-ancestors directive if it exists, otherwise append it
        const updatedCSP = existingCSP.replace(
          /frame-ancestors[^;]*(;|$)/,
          `frame-ancestors ${frameAncestors};`
        );
        
        // If no frame-ancestors was found, append it
        if (updatedCSP === existingCSP) {
          res.setHeader('Content-Security-Policy', `${existingCSP} frame-ancestors ${frameAncestors};`);
        } else {
          res.setHeader('Content-Security-Policy', updatedCSP);
        }
      } else {
        // Set a complete CSP if none exists
        res.setHeader(
          'Content-Security-Policy',
          `default-src 'self' https://*.myshopify.com; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.shopify.com; style-src 'self' 'unsafe-inline' https://cdn.shopify.com; img-src 'self' data: https:; font-src 'self' data: https:; connect-src 'self' https://*.myshopify.com; frame-ancestors ${frameAncestors};`
        );
      }
    }
    
    next();
  });
  
  // Auth routes
  app.get(shopifyInstance.config.auth.path, shopifyInstance.auth.begin());
  app.get(
    shopifyInstance.config.auth.callbackPath, 
    shopifyInstance.auth.callback(),
    async (req, res, next) => {
      try {
        const session = res.locals.shopify?.session;
        if (session?.accessToken && session?.shop) {
          await registerWebhooks(session);
        }
        next();
      } catch (error) {
        console.error("Error registering webhooks:", error);
        // Continue anyway - webhook registration failure shouldn't block auth
        next();
      }
    },
    shopifyInstance.redirectToShopifyOrAppRoot()
  );
  
  // Webhook handlers
  const webhookHandlers = {
    'orders/create': async (topic: string, shop: string, body: string, webhookId: string) => {
      try {
        console.log(`Received ${topic} webhook from ${shop} (ID: ${webhookId})`);
        const orderData = JSON.parse(body);
        
        // Find the store by shop domain
        const store = await storage.getStoreByDomain(shop);
        
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
        const store = await storage.getStoreByDomain(shop);
        
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
        const store = await storage.getStoreByDomain(shop);
        
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
        const store = await storage.getStoreByDomain(shop);
        
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
        const store = await storage.getStoreByDomain(shop);
        
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
  app.post(shopifyInstance.config.webhooks.path, shopifyInstance.processWebhooks({ webhookHandlers }));
  
  // Ensure the app can be embedded
  app.use((req, res, next) => {
    // Add X-Frame-Options header for specific routes
    const shop = req.query.shop || req.headers['x-shopify-shop-domain'];
    
    if (shop && !req.path.startsWith('/api/')) {
      // Remove X-Frame-Options to allow embedding
      res.removeHeader('X-Frame-Options');
    }
    
    next();
  });
  
  // Protected routes middleware
  app.use("/api/*", shopifyInstance.validateAuthenticatedSession());
  
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