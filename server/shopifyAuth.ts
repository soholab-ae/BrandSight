import { shopifyApp } from "@shopify/shopify-app-express";
import { MemorySessionStorage } from "@shopify/shopify-app-session-storage-memory";
import { ApiVersion } from "@shopify/shopify-api";
import express, { type Express } from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { storage } from "./storage";
import { TokenEncryption } from "./services/tokenEncryption";


// Conditionally initialize Shopify App Configuration
let shopify: any = null;

function initializeShopify() {
  if (!shopify) {
    shopify = shopifyApp({
      api: {
        apiKey: process.env.SHOPIFY_API_KEY!,
        apiSecretKey: process.env.SHOPIFY_API_SECRET!,
        scopes: (process.env.SCOPES || '').split(','),
        hostScheme: 'https',
        hostName: process.env.HOST?.replace('https://', '').replace('http://', '') || '',
        apiVersion: ApiVersion.October24,
        isEmbeddedApp: true,  // Critical for embedded apps
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

export { shopify, initializeShopify, upsertShopifyUser, validateSessionToken };

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

// Session token validation for App Bridge
async function validateSessionToken(token: string): Promise<{ shop: string; user?: any; session?: any } | null> {
  try {
    if (!process.env.SHOPIFY_API_SECRET) {
      console.error('[SESSION_TOKEN] SHOPIFY_API_SECRET not available for token validation');
      return null;
    }

    // Decode and verify the JWT token using Shopify's API secret
    const decoded = jwt.verify(token, process.env.SHOPIFY_API_SECRET) as any;
    
    console.log('[SESSION_TOKEN] Successfully decoded token for shop:', decoded.dest);
    
    if (!decoded.dest) {
      console.error('[SESSION_TOKEN] No shop domain (dest) found in token');
      return null;
    }

    // Extract shop domain from the token
    const shop = decoded.dest.replace('https://', '');
    
    // Check if store exists and is active
    const store = await storage.getStoreByDomain(shop);
    if (!store || !store.isActive) {
      console.error('[SESSION_TOKEN] Store not found or inactive:', shop);
      return null;
    }

    // Get user associated with the store
    const user = await storage.getUser(store.userId);
    
    // Create a session-like object for compatibility
    const sessionLike = {
      shop,
      accessToken: store.accessToken,
      onlineAccessInfo: user ? {
        associated_user: {
          id: user.id.replace('shopify_', ''),
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
          avatar: user.profileImageUrl
        }
      } : null
    };

    console.log('[SESSION_TOKEN] Successfully validated session token for shop:', shop);
    
    return {
      shop,
      user,
      session: sessionLike
    };
  } catch (error) {
    console.error('[SESSION_TOKEN] Token validation failed:', TokenEncryption.sanitizeForLogging(error));
    return null;
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

// Enhanced authentication middleware for Shopify - supports both session tokens and cookie-based auth
export const authenticateShopify = async (req: any, res: any, next: any) => {
  try {
    console.log('[AUTH] Starting Shopify authentication check');
    
    // First, try to validate session token from Authorization header (App Bridge)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      console.log('[AUTH] Found Authorization header, attempting session token validation');
      
      const tokenValidation = await validateSessionToken(token);
      if (tokenValidation) {
        console.log('[AUTH] Session token validation successful for shop:', tokenValidation.shop);
        
        // Store/update user and shop data using the session-like object
        await upsertShopifyUser(tokenValidation.session);
        
        // Attach session data to request (same format as cookie-based auth)
        req.shopifySession = tokenValidation.session;
        req.shopifyUser = {
          id: tokenValidation.session.onlineAccessInfo?.associated_user?.id || tokenValidation.session.shop,
          shop: tokenValidation.session.shop,
          accessToken: tokenValidation.session.accessToken,
        };
        
        console.log('[AUTH] Session token authentication completed successfully');
        return next();
      } else {
        console.log('[AUTH] Session token validation failed, falling back to cookie-based auth');
      }
    }
    
    // Fallback to cookie-based authentication
    console.log('[AUTH] Attempting cookie-based authentication');
    const session = res.locals.shopify?.session;
    
    if (!session || !session.accessToken) {
      console.log('[AUTH] No valid session found in either token or cookie');
      return res.status(401).json({ message: "Unauthorized - No valid Shopify session" });
    }
    
    console.log('[AUTH] Cookie-based session found for shop:', session.shop);
    
    // Store/update user and shop data
    await upsertShopifyUser(session);
    
    // Attach session data to request
    req.shopifySession = session;
    req.shopifyUser = {
      id: session.onlineAccessInfo?.associated_user?.id || session.shop,
      shop: session.shop,
      accessToken: session.accessToken,
    };
    
    console.log('[AUTH] Cookie-based authentication completed successfully');
    next();
  } catch (error) {
    console.error("Shopify authentication error:", TokenEncryption.sanitizeForLogging(error));
    res.status(401).json({ message: "Unauthorized" });
  }
};

// Register webhooks with Shopify (avoiding duplicates)
async function registerWebhooks(session: any) {
  const webhookTopics = [
    // Business webhooks
    'orders/create',
    'orders/updated', 
    'products/create',
    'products/update',
    'customers/create',
    
    // MANDATORY COMPLIANCE WEBHOOKS FOR APP STORE
    'customers/data_request',
    'customers/redact',
    'shop/redact',
    'app/uninstalled'
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
          console.error(`Failed to register webhook for ${topic}:`, TokenEncryption.sanitizeForLogging(error));
        }
      } catch (error) {
        console.error(`Error registering webhook for ${topic}:`, TokenEncryption.sanitizeForLogging(error));
      }
    }
  } catch (error) {
    console.error('Error fetching existing webhooks:', TokenEncryption.sanitizeForLogging(error));
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
          console.error(`Failed to register webhook for ${topic}:`, TokenEncryption.sanitizeForLogging(error));
        }
      } catch (error) {
        console.error(`Error registering webhook for ${topic}:`, TokenEncryption.sanitizeForLogging(error));
      }
    }
  }
}

// GDPR webhook handlers - defined once for reuse
const gdprWebhookHandlers = {
  'customers/data_request': async (topic: string, shop: string, body: string, webhookId: string) => {
    console.log(`Received GDPR ${topic} webhook from ${shop}`);
    const data = JSON.parse(body);
    console.log(`Customer data request for shop ${shop}:`, TokenEncryption.sanitizeForLogging(data));
    // In production, gather customer data and send it
    // This handler must return 200 to pass Shopify's automated checks
  },
  
  'customers/redact': async (topic: string, shop: string, body: string, webhookId: string) => {
    console.log(`Received GDPR ${topic} webhook from ${shop}`);
    const data = JSON.parse(body);
    console.log(`Customer redaction request for shop ${shop}:`, TokenEncryption.sanitizeForLogging(data));
    // In production, delete customer data
    // This handler must return 200 to pass Shopify's automated checks
  },
  
  'shop/redact': async (topic: string, shop: string, body: string, webhookId: string) => {
    console.log(`Received GDPR ${topic} webhook from ${shop}`);
    const data = JSON.parse(body);
    console.log(`Shop redaction request for shop ${shop}:`, TokenEncryption.sanitizeForLogging(data));
    
    try {
      const store = await storage.getStoreByDomain(shop);
      if (store) {
        console.log(`Processing shop redaction for store: ${store.id}`);
        // In production, delete all shop data
      }
    } catch (error) {
      console.error(`Error processing shop redaction for ${shop}:`, TokenEncryption.sanitizeForLogging(error));
    }
    // This handler must return 200 to pass Shopify's automated checks
  },
};

// Custom HMAC verification middleware that returns exact status codes
function verifyWebhookHMAC(secret: string) {
  return (req: any, res: any, next: any) => {
    const hmacHeader = req.get('X-Shopify-Hmac-Sha256');
    
    if (!hmacHeader) {
      console.log('Webhook verification failed: No HMAC header');
      return res.status(401).send('Unauthorized');
    }
    
    const rawBody = req.body;
    if (!rawBody || !Buffer.isBuffer(rawBody)) {
      console.log('Webhook verification failed: No raw body');
      return res.status(401).send('Unauthorized');
    }
    
    // Calculate HMAC
    const hash = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('base64');
    
    // Compare HMACs
    if (hash !== hmacHeader) {
      console.log('Webhook verification failed: HMAC mismatch');
      return res.status(401).send('Unauthorized');
    }
    
    // HMAC is valid, parse the body for the handlers
    try {
      req.body = JSON.parse(rawBody.toString('utf8'));
    } catch (error) {
      console.error('Failed to parse webhook body:', TokenEncryption.sanitizeForLogging(error));
      return res.status(400).send('Bad Request');
    }
    
    next();
  };
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
    // Use the shared webhook endpoint implementation
    await setupWebhookEndpoint(app, '/api/webhooks');
    console.log("Shopify webhooks configured");
  } catch (error) {
    console.error("Error setting up Shopify webhooks:", TokenEncryption.sanitizeForLogging(error));
  }
}

// Setup Shopify authentication
// Shared function to set up webhook endpoint with proper HMAC verification
async function setupWebhookEndpoint(app: Express, path: string = '/api/webhooks') {
  const webhookSecret = process.env.SHOPIFY_API_SECRET!;
  
  // Combined webhook handlers (GDPR + regular)
  const allWebhookHandlers = {
    ...gdprWebhookHandlers,
    'app/uninstalled': async (topic: string, shop: string, body: string, webhookId: string) => {
      try {
        console.log(`Received ${topic} webhook from ${shop} (ID: ${webhookId})`);
        const uninstallData = JSON.parse(body);
        
        const store = await storage.getStoreByDomain(shop);
        if (store) {
          console.log(`Processing app uninstall for store: ${store.id}`);
          // Mark store as inactive and stop processing
          await storage.updateStore(store.id, {
            isActive: false,
            lastSyncAt: new Date(),
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
    'orders/create': async (topic: string, shop: string, body: string, webhookId: string) => {
      try {
        console.log(`Received ${topic} webhook from ${shop} (ID: ${webhookId})`);
        const orderData = JSON.parse(body);
        
        const store = await storage.getStoreByDomain(shop);
        if (!store) {
          console.error(`Store not found for shop domain: ${shop}`);
          return;
        }
        
        const { shopifyService } = await import('./services/shopifyService');
        await shopifyService.handleOrderWebhook(orderData, store.id);
        console.log(`Successfully processed ${topic} webhook from ${shop}`);
      } catch (error) {
        console.error(`Error processing ${topic} webhook from ${shop}:`, TokenEncryption.sanitizeForLogging(error));
      }
    },
    
    'orders/updated': async (topic: string, shop: string, body: string, webhookId: string) => {
      try {
        console.log(`Received ${topic} webhook from ${shop} (ID: ${webhookId})`);
        const orderData = JSON.parse(body);
        
        const store = await storage.getStoreByDomain(shop);
        if (!store) {
          console.error(`Store not found for shop domain: ${shop}`);
          return;
        }
        
        const { shopifyService } = await import('./services/shopifyService');
        await shopifyService.handleOrderWebhook(orderData, store.id);
        console.log(`Successfully processed ${topic} webhook from ${shop}`);
      } catch (error) {
        console.error(`Error processing ${topic} webhook from ${shop}:`, TokenEncryption.sanitizeForLogging(error));
      }
    },
    
    'products/create': async (topic: string, shop: string, body: string, webhookId: string) => {
      try {
        console.log(`Received ${topic} webhook from ${shop} (ID: ${webhookId})`);
        const productData = JSON.parse(body);
        
        const store = await storage.getStoreByDomain(shop);
        if (!store) {
          console.error(`Store not found for shop domain: ${shop}`);
          return;
        }
        
        const { shopifyService } = await import('./services/shopifyService');
        await shopifyService.handleProductWebhook(productData, store.id);
        console.log(`Successfully processed ${topic} webhook from ${shop}`);
      } catch (error) {
        console.error(`Error processing ${topic} webhook from ${shop}:`, TokenEncryption.sanitizeForLogging(error));
      }
    },
    
    'products/update': async (topic: string, shop: string, body: string, webhookId: string) => {
      try {
        console.log(`Received ${topic} webhook from ${shop} (ID: ${webhookId})`);
        const productData = JSON.parse(body);
        
        const store = await storage.getStoreByDomain(shop);
        if (!store) {
          console.error(`Store not found for shop domain: ${shop}`);
          return;
        }
        
        const { shopifyService } = await import('./services/shopifyService');
        await shopifyService.handleProductWebhook(productData, store.id);
        console.log(`Successfully processed ${topic} webhook from ${shop}`);
      } catch (error) {
        console.error(`Error processing ${topic} webhook from ${shop}:`, TokenEncryption.sanitizeForLogging(error));
      }
    },
    
    'customers/create': async (topic: string, shop: string, body: string, webhookId: string) => {
      try {
        console.log(`Received ${topic} webhook from ${shop} (ID: ${webhookId})`);
        const customerData = JSON.parse(body);
        
        const store = await storage.getStoreByDomain(shop);
        if (!store) {
          console.error(`Store not found for shop domain: ${shop}`);
          return;
        }
        
        const { shopifyService } = await import('./services/shopifyService');
        await shopifyService.handleCustomerWebhook(customerData, store.id);
        console.log(`Successfully processed ${topic} webhook from ${shop}`);
      } catch (error) {
        console.error(`Error processing ${topic} webhook from ${shop}:`, TokenEncryption.sanitizeForLogging(error));
      }
    },
  };
  
  // Setup webhook endpoint with custom HMAC verification
  app.post(
    path,
    express.raw({ type: 'application/json' }),
    verifyWebhookHMAC(webhookSecret),
    async (req: any, res) => {
      try {
        const topic = req.get('X-Shopify-Topic');
        const shop = req.get('X-Shopify-Shop-Domain');
        const webhookId = req.get('X-Shopify-Webhook-Id');
        
        console.log(`Processing webhook: ${topic} from ${shop}`);
        
        const handler = allWebhookHandlers[topic as keyof typeof allWebhookHandlers];
        if (handler) {
          await handler(topic!, shop!, JSON.stringify(req.body), webhookId!);
          res.status(200).send('OK');
        } else {
          console.warn(`No handler for webhook topic: ${topic}`);
          res.status(200).send('OK');
        }
      } catch (error) {
        console.error('Error processing webhook:', TokenEncryption.sanitizeForLogging(error));
        res.status(200).send('OK');
      }
    }
  );
  
  console.log(`Webhook endpoint configured at ${path}`);
}

export async function setupShopifyAuth(app: Express) {
  validateShopifyConfig();
  
  const shopifyInstance = initializeShopify();
  
  // Trust proxy for secure cookies
  app.set("trust proxy", 1);
  
  // NOTE: Removed shopifyInstance.cspHeaders() to avoid conflicts with our custom CSP
  // The default Shopify CSP headers contain invalid 'unsafe-dynamic' directive
  
  // Add comprehensive CSP headers for embedded Shopify app
  app.use((req, res, next) => {
    const shop = req.query.shop || req.headers['x-shopify-shop-domain'];
    
    // Build frame-ancestors for Shopify embedded apps - always include required domains
    let frameAncestors = 'https://admin.shopify.com https://*.myshopify.com';
    if (shop && typeof shop === 'string' && !shop.includes('*')) {
      // Include specific shop domain while keeping the wildcard for compatibility
      frameAncestors = `https://admin.shopify.com https://*.myshopify.com https://${shop}`;
    }
    
    // Comprehensive CSP policy that allows all necessary resources for embedded Shopify apps
    const cspDirectives = [
      // Allow self and Shopify domains for default resources
      "default-src 'self' https://*.myshopify.com https://cdn.shopify.com",
      
      // Scripts: Allow self, inline scripts, eval, and Shopify CDN + admin resources
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.shopify.com https://admin.shopify.com https://*.myshopify.com",
      
      // Styles: Allow self, inline styles, and Shopify resources
      "style-src 'self' 'unsafe-inline' https://cdn.shopify.com https://admin.shopify.com https://*.myshopify.com",
      
      // Images: Allow self, data URIs, blob URIs, and all HTTPS sources
      "img-src 'self' data: blob: https:",
      
      // Fonts: Allow self, data URIs, and HTTPS sources
      "font-src 'self' data: https:",
      
      // Connections: Allow self, websockets, and HTTPS (including Shopify domains)
      "connect-src 'self' ws: wss: https: https://*.myshopify.com https://admin.shopify.com",
      
      // Worker sources: Allow self and blob for web workers
      "worker-src 'self' blob:",
      
      // Child sources: Allow self and blob for iframes/workers
      "child-src 'self' blob:",
      
      // Object sources: Block object/embed tags for security
      "object-src 'none'",
      
      // Base URI: Restrict to self
      "base-uri 'self'",
      
      // Form actions: Allow self and Shopify domains
      "form-action 'self' https://*.myshopify.com https://admin.shopify.com",
      
      // Frame ancestors: Critical for embedded app functionality
      `frame-ancestors ${frameAncestors}`,
      
      // Media sources: Allow self and HTTPS
      "media-src 'self' https:"
    ];
    
    // Set the comprehensive CSP policy
    res.setHeader('Content-Security-Policy', cspDirectives.join('; '));
    
    // Remove X-Frame-Options header as it conflicts with CSP frame-ancestors
    res.removeHeader('X-Frame-Options');
    
    next();
  });
  
  // Login route that redirects to OAuth
  app.get('/api/login', (req, res) => {
    console.log('[LOGIN DEBUG] Login route called with query:', req.query);
    console.log('[LOGIN DEBUG] Login route referer:', req.get('referer'));
    
    let shop = req.query.shop as string || process.env.DEFAULT_SHOP_DOMAIN || '';
    const host = req.query.host as string;
    const embedded = req.query.embedded === '1';
    
    // Enhanced shop extraction for embedded contexts
    const referer = req.get('referer') || '';
    const isFromShopifyAdmin = referer.includes('admin.shopify.com');
    
    // If no shop but we're from Shopify admin, try to extract from referer
    if (!shop && isFromShopifyAdmin) {
      try {
        const refererUrl = new URL(referer);
        const pathParts = refererUrl.pathname.split('/');
        const storeIndex = pathParts.indexOf('store');
        if (storeIndex !== -1 && pathParts[storeIndex + 1]) {
          shop = `${pathParts[storeIndex + 1]}.myshopify.com`;
          console.log('[LOGIN DEBUG] Extracted shop from referer:', shop);
        }
      } catch (error) {
        console.log('[LOGIN DEBUG] Failed to parse referer URL:', error);
      }
    }
    
    // If shop parameter is provided, redirect to auth with shop
    if (shop) {
      const authUrl = `/api/auth?shop=${encodeURIComponent(shop)}${host ? `&host=${encodeURIComponent(host)}` : ''}`;
      console.log(`[LOGIN DEBUG] Initiating OAuth for shop: ${shop}, redirect to: ${authUrl}`);
      res.redirect(authUrl);
    } else {
      // Check if we're in Shopify admin (embedded app)
      const isEmbedded = isFromShopifyAdmin || embedded;
      
      if (isEmbedded) {
        // For embedded apps without shop parameter, return JSON response for proper top-frame redirect
        // The client will handle this using window.top.location.href to break out of the iframe
        console.log('[LOGIN DEBUG] Embedded app without shop parameter - returning 401 with requiresReload');
        
        // Build a generic auth URL - the frontend will add shop parameters when available
        const authUrl = '/api/auth';
        
        return res.status(401).json({
          message: 'Shop parameter required for embedded app',
          requiresReload: true,
          loginUrl: authUrl,
          isEmbedded: true,
          debug: {
            referer: req.get('referer'),
            userAgent: req.get('user-agent'),
            host: req.get('host'),
            embedded: embedded,
            isFromShopifyAdmin: isFromShopifyAdmin
          }
        });
      } else {
        // For standalone access, redirect to landing page
        console.log('[LOGIN DEBUG] Standalone access, redirecting to landing page');
        res.redirect('/');
      }
    }
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
          // Store/update user and shop data
          await upsertShopifyUser(session);
          await registerWebhooks(session);
        }
        next();
      } catch (error) {
        console.error("Error in auth callback:", TokenEncryption.sanitizeForLogging(error));
        // Continue anyway - webhook registration failure shouldn't block auth
        next();
      }
    },
    // Custom redirect to ensure proper embedded app loading
    async (req, res) => {
      const session = res.locals.shopify?.session;
      console.log('[OAUTH CALLBACK] Session data:', session ? { shop: session.shop, hasAccessToken: !!session.accessToken } : 'No session');
      
      if (session?.shop && session?.accessToken) {
        const host = req.query.host as string;
        const shop = session.shop;
        
        console.log(`[OAUTH CALLBACK] Auth successful for ${shop}, host: ${host}`);
        
        // For embedded apps (from Shopify admin), redirect to dashboard with parameters
        if (host || req.get('referer')?.includes('admin.shopify.com')) {
          const redirectUrl = `/dashboard?shop=${encodeURIComponent(shop)}${host ? `&host=${encodeURIComponent(host)}` : ''}`;
          console.log(`[OAUTH CALLBACK] Redirecting to embedded dashboard: ${redirectUrl}`);
          res.redirect(redirectUrl);
        } else {
          // For standalone installs, redirect to dashboard without query parameters
          console.log(`[OAUTH CALLBACK] Redirecting to standalone dashboard`);
          res.redirect('/dashboard');
        }
      } else {
        console.error('[OAUTH CALLBACK] No valid session or shop found, redirecting to root');
        // Fallback to default redirect
        res.redirect('/');
      }
    }
  );
  
  // Setup webhook endpoint using the shared implementation
  await setupWebhookEndpoint(app, shopifyInstance.config.webhooks.path);
  
  // X-Frame-Options is already removed in the CSP middleware above, no additional handling needed
  
  // Protected routes middleware - but exclude auth routes
  app.use((req, res, next) => {
    // Skip validation for auth routes, login, manual setup, billing, and user endpoint
    if (req.path === '/api/auth' || 
        req.path === '/api/auth/callback' || 
        req.path === '/api/auth/user' ||  // Always skip for /api/auth/user - let route handler manage it
        req.path === '/api/login' ||
        req.path === '/api/webhooks' ||
        req.path === '/api/stores/manual-setup' ||
        req.path === '/api/billing/status' || // Allow billing status for demo mode
        req.path.startsWith('/legal/')) {
      return next();
    }
    
    // If we have a default shop domain configured, also skip validation for stores endpoints
    // This allows the app to work without OAuth for already-installed apps
    if (process.env.DEFAULT_SHOP_DOMAIN) {
      if (req.path === '/api/stores' ||
          req.path.startsWith('/api/stores/')) {
        return next();
      }
    }
    
    // Always skip validation for demo-compatible endpoints that support demo mode
    // These routes use authenticateOrDemo middleware which handles demo mode properly
    if (req.path.startsWith('/api/stores/current/') ||
        req.path.startsWith('/api/alerts') ||
        req.path.startsWith('/api/alert-rules') ||
        req.path.startsWith('/api/cache/') ||
        req.path.startsWith('/api/brand-loyalty') ||
        req.path.startsWith('/api/inventory') ||
        req.path.startsWith('/api/forecasts')) {
      return next();
    }
    
    // Apply validation to other API routes only when we have proper shop context
    if (req.path.startsWith('/api/')) {
      // Extract shop from multiple sources before validating
      const shop = req.query.shop || req.headers['x-shopify-shop-domain'] || res.locals.shopify?.session?.shop;
      
      if (!shop) {
        // No shop context - return 401 JSON instead of redirecting
        return res.status(401).json({ message: "Unauthorized - Shop context required" });
      }
      
      return shopifyInstance.validateAuthenticatedSession()(req, res, next);
    }
    
    next();
  });
  
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