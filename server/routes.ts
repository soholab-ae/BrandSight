import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { shopifyService } from "./services/shopifyService";
import { insertStoreSchema } from "@shared/schema";
import { createBillingSubscription, checkActiveSubscription, cancelSubscription } from "./shopifyBilling";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware - support both Replit and Shopify auth
  const useShopifyAuth = process.env.USE_SHOPIFY_AUTH === 'true';
  
  let authenticateShopify: any;
  
  if (useShopifyAuth) {
    // Dynamically import Shopify auth only when needed
    const { setupShopifyAuth, authenticateShopify: shopifyAuthMiddleware } = await import("./shopifyAuth");
    authenticateShopify = shopifyAuthMiddleware;
    await setupShopifyAuth(app);
  } else {
    await setupAuth(app);
    
    // Even if not using Shopify auth as main auth, we still need webhook handlers
    // for Shopify integration to work properly
    const { setupShopifyWebhooks } = await import("./shopifyAuth");
    await setupShopifyWebhooks(app);
  }

  // Unified authentication middleware with demo mode support
  const authenticate = useShopifyAuth ? authenticateShopify : isAuthenticated;
  
  // Flexible authentication that allows demo mode
  const authenticateOrDemo = (req: any, res: any, next: any) => {
    // Check if user is authenticated
    const userId = getUserId(req);
    
    // If authenticated normally, proceed
    if (userId) {
      next();
    } else {
      // Not authenticated - enable demo mode
      req.isDemoMode = true;
      req.user = { 
        claims: { sub: 'demo_user' },
        isDemoMode: true 
      };
      next();
    }
  };
  
  // Helper to get user ID from either auth system
  const getUserId = (req: any) => {
    if (useShopifyAuth) {
      const rawId = req.shopifyUser?.id || req.shopifySession?.shop;
      return rawId ? `shopify_${rawId}` : null;
    } else {
      return req.user?.claims?.sub;
    }
  };

  // Helper to get user's first store (includes demo store for demo mode)
  const getUserCurrentStore = async (req: any) => {
    const userId = getUserId(req);
    if (!userId) {
      // If no user ID, return demo store for easy-access demo
      return {
        id: "demo_store_1",
        userId: "demo_user",
        name: "Demo Store",
        domain: "demo-store.myshopify.com",
        accessToken: "demo_token",
        isActive: true,
        lastSyncAt: new Date(),
        createdAt: new Date('2024-01-01')
      };
    }
    
    const stores = await storage.getUserStores(userId);
    if (stores.length === 0) {
      // Return demo store if user has no stores connected
      return {
        id: "demo_store_1",
        userId: userId,
        name: "Demo Store",
        domain: "demo-store.myshopify.com",
        accessToken: "demo_token",
        isActive: true,
        lastSyncAt: new Date(),
        createdAt: new Date('2024-01-01')
      };
    }
    
    return stores[0];
  };

  // Legal documents - publicly accessible
  app.get('/legal/privacy', (_req, res) => {
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
  
  app.get('/legal/terms', (_req, res) => {
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

  // Auth routes
  app.get('/api/auth/user', async (req: any, res, next) => {
    // If we have a default shop domain, create/return a default user
    if (process.env.DEFAULT_SHOP_DOMAIN && !req.user && !req.shopifyUser) {
      try {
        const shopDomain = process.env.DEFAULT_SHOP_DOMAIN;
        const userId = `shopify_${shopDomain.replace('.myshopify.com', '')}`;
        
        // Create or get the default user
        const user = await storage.upsertUser({
          id: userId,
          email: `admin@${shopDomain}`,
          firstName: 'Store',
          lastName: 'Admin',
          profileImageUrl: null
        });
        
        return res.json(user);
      } catch (error) {
        console.error("Error creating default user:", error);
      }
    }
    
    // Otherwise, use normal authentication
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

  // Store routes
  app.get('/api/stores', async (req: any, res, next) => {
    // If we have a default shop domain and no auth, return empty array or default stores
    if (process.env.DEFAULT_SHOP_DOMAIN && !req.user && !req.shopifyUser) {
      try {
        const shopDomain = process.env.DEFAULT_SHOP_DOMAIN;
        const userId = `shopify_${shopDomain.replace('.myshopify.com', '')}`;
        
        const stores = await storage.getUserStores(userId);
        return res.json(stores);
      } catch (error) {
        console.error("Error fetching default stores:", error);
        return res.json([]); // Return empty array if no stores yet
      }
    }
    
    // Otherwise, use normal authentication
    authenticate(req, res, async () => {
      try {
        const userId = getUserId(req);
        if (!userId) {
          return res.status(401).json({ message: "No user ID found" });
        }
        
        const stores = await storage.getUserStores(userId);
        res.json(stores);
      } catch (error) {
        console.error("Error fetching stores:", error);
        res.status(500).json({ message: "Failed to fetch stores" });
      }
    });
  });

  // Manual store setup endpoint - for already installed apps
  app.post('/api/stores/manual-setup', async (req: any, res) => {
    try {
      // Use the default shop domain from environment
      const shopDomain = process.env.DEFAULT_SHOP_DOMAIN;
      const accessToken = req.body.accessToken || process.env.SHOPIFY_ACCESS_TOKEN || '';
      
      if (!shopDomain) {
        return res.status(400).json({ message: "No shop domain configured" });
      }
      
      // Create a default user ID for the store
      const userId = `shopify_${shopDomain.replace('.myshopify.com', '')}`;
      
      // Create or update the user
      const user = await storage.upsertUser({
        id: userId,
        email: `admin@${shopDomain}`,
        firstName: 'Store',
        lastName: 'Admin',
        profileImageUrl: null
      });
      
      // Check if store already exists
      const existingStore = await storage.getStoreByDomain(shopDomain);
      
      if (existingStore) {
        // Update existing store
        const updatedStore = await storage.updateStore(existingStore.id, {
          accessToken: accessToken || existingStore.accessToken,
          lastSyncAt: new Date()
        });
        
        res.json({ store: updatedStore, message: "Store already exists - updated" });
      } else {
        // Create new store
        const storeData = {
          userId: user.id,
          name: shopDomain.replace('.myshopify.com', ''),
          domain: shopDomain,
          accessToken: accessToken
        };
        
        const store = await storage.createStore(storeData);
        
        // Start initial sync
        try {
          await shopifyService.syncProducts(store);
          await shopifyService.syncOrders(store);
        } catch (syncError) {
          console.error("Error during initial sync:", syncError);
          // Don't fail store creation if sync fails
        }
        
        res.json({ store, message: "Store created successfully" });
      }
    } catch (error) {
      console.error("Error in manual store setup:", error);
      res.status(500).json({ message: "Failed to setup store manually" });
    }
  });

  app.post('/api/stores', authenticate, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "No user ID found" });
      }
      
      const storeData = insertStoreSchema.parse({ ...req.body, userId });
      
      const store = await storage.createStore(storeData);
      
      // Start initial sync
      try {
        await shopifyService.syncProducts(store);
        await shopifyService.syncOrders(store);
      } catch (syncError) {
        console.error("Error during initial sync:", syncError);
        // Don't fail store creation if sync fails
      }
      
      res.json(store);
    } catch (error) {
      console.error("Error creating store:", error);
      res.status(500).json({ message: "Failed to create store" });
    }
  });

  // Current store routes (automatically use user's first store)
  app.get('/api/stores/current/vendors', authenticateOrDemo, async (req: any, res) => {
    try {
      const store = await getUserCurrentStore(req);
      const vendors = await storage.getStoreVendors(store.id);
      res.json(vendors);
    } catch (error) {
      console.error("Error fetching current store vendors:", error);
      if (error instanceof Error && error.message === "No stores found for user") {
        return res.status(404).json({ message: "No stores found for user" });
      }
      res.status(500).json({ message: "Failed to fetch vendors" });
    }
  });

  app.get('/api/stores/current/analytics/summary', authenticateOrDemo, async (req: any, res) => {
    try {
      const store = await getUserCurrentStore(req);
      const { vendorId, startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();
      
      const summary = await storage.getVendorSummary(
        store.id,
        vendorId as string,
        start,
        end
      );
      
      res.json(summary);
    } catch (error) {
      console.error("Error fetching current store analytics summary:", error);
      if (error instanceof Error && error.message === "No stores found for user") {
        return res.status(404).json({ message: "No stores found for user" });
      }
      res.status(500).json({ message: "Failed to fetch analytics summary" });
    }
  });

  app.get('/api/stores/current/products/top', authenticateOrDemo, async (req: any, res) => {
    try {
      const store = await getUserCurrentStore(req);
      const { vendorId, limit } = req.query;
      
      const topProducts = await storage.getTopProducts(
        store.id,
        vendorId as string,
        limit ? parseInt(limit as string) : 10
      );
      
      res.json(topProducts);
    } catch (error) {
      console.error("Error fetching current store top products:", error);
      if (error instanceof Error && error.message === "No stores found for user") {
        return res.status(404).json({ message: "No stores found for user" });
      }
      res.status(500).json({ message: "Failed to fetch top products" });
    }
  });

  app.get('/api/stores/current/pages/top', authenticateOrDemo, async (req: any, res) => {
    try {
      const store = await getUserCurrentStore(req);
      const { vendorId, limit } = req.query;
      
      const topPages = await storage.getTopLandingPages(
        store.id,
        vendorId as string,
        limit ? parseInt(limit as string) : 10
      );
      
      res.json(topPages);
    } catch (error) {
      console.error("Error fetching current store top pages:", error);
      if (error instanceof Error && error.message === "No stores found for user") {
        return res.status(404).json({ message: "No stores found for user" });
      }
      res.status(500).json({ message: "Failed to fetch top pages" });
    }
  });

  // Vendor routes
  app.get('/api/stores/:storeId/vendors', authenticate, async (req: any, res) => {
    try {
      const { storeId } = req.params;
      const vendors = await storage.getStoreVendors(storeId);
      res.json(vendors);
    } catch (error) {
      console.error("Error fetching vendors:", error);
      res.status(500).json({ message: "Failed to fetch vendors" });
    }
  });

  // Analytics routes
  app.get('/api/stores/:storeId/analytics', authenticate, async (req: any, res) => {
    try {
      const { storeId } = req.params;
      const { vendorId, startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();
      
      const analytics = await storage.getVendorAnalytics(
        storeId,
        vendorId as string,
        start,
        end
      );
      
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  app.get('/api/stores/:storeId/analytics/summary', authenticate, async (req: any, res) => {
    try {
      const { storeId } = req.params;
      const { vendorId, startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();
      
      const summary = await storage.getVendorSummary(
        storeId,
        vendorId as string,
        start,
        end
      );
      
      res.json(summary);
    } catch (error) {
      console.error("Error fetching analytics summary:", error);
      res.status(500).json({ message: "Failed to fetch analytics summary" });
    }
  });

  app.get('/api/stores/:storeId/products/top', authenticate, async (req: any, res) => {
    try {
      const { storeId } = req.params;
      const { vendorId, limit } = req.query;
      
      const topProducts = await storage.getTopProducts(
        storeId,
        vendorId as string,
        limit ? parseInt(limit as string) : 10
      );
      
      res.json(topProducts);
    } catch (error) {
      console.error("Error fetching top products:", error);
      res.status(500).json({ message: "Failed to fetch top products" });
    }
  });

  app.get('/api/stores/:storeId/pages/top', authenticate, async (req: any, res) => {
    try {
      const { storeId } = req.params;
      const { vendorId, limit } = req.query;
      
      const topPages = await storage.getTopLandingPages(
        storeId,
        vendorId as string,
        limit ? parseInt(limit as string) : 10
      );
      
      res.json(topPages);
    } catch (error) {
      console.error("Error fetching top landing pages:", error);
      res.status(500).json({ message: "Failed to fetch top landing pages" });
    }
  });

  // Sync routes
  app.post('/api/stores/:storeId/sync', authenticate, async (req: any, res) => {
    try {
      const { storeId } = req.params;
      const store = await storage.getStore(storeId);
      
      if (!store) {
        return res.status(404).json({ message: "Store not found" });
      }
      
      await shopifyService.syncProducts(store);
      await shopifyService.syncOrders(store);
      
      res.json({ message: "Sync completed successfully" });
    } catch (error) {
      console.error("Error syncing store:", error);
      res.status(500).json({ message: "Failed to sync store" });
    }
  });

  // Billing routes (only for Shopify auth)
  if (useShopifyAuth) {
    // Check subscription status
    app.get('/api/billing/status', authenticate, async (req: any, res) => {
      try {
        const session = req.shopifySession;
        if (!session) {
          return res.status(401).json({ message: "No Shopify session found" });
        }
        
        const subscriptionStatus = await checkActiveSubscription(session);
        res.json(subscriptionStatus);
      } catch (error) {
        console.error("Error checking subscription status:", error);
        res.status(500).json({ message: "Failed to check subscription status" });
      }
    });
    
    // Create subscription
    app.post('/api/billing/subscribe', authenticate, async (req: any, res) => {
      try {
        const session = req.shopifySession;
        if (!session) {
          return res.status(401).json({ message: "No Shopify session found" });
        }
        
        // Check if already subscribed
        const currentStatus = await checkActiveSubscription(session);
        if (currentStatus.hasActiveSubscription) {
          return res.status(400).json({ 
            message: "Already have an active subscription",
            subscription: currentStatus.subscription
          });
        }
        
        // Create new subscription
        const { subscription, confirmationUrl } = await createBillingSubscription(
          session,
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
    
    // Cancel subscription
    app.post('/api/billing/cancel', authenticate, async (req: any, res) => {
      try {
        const session = req.shopifySession;
        if (!session) {
          return res.status(401).json({ message: "No Shopify session found" });
        }
        
        const { subscriptionId } = req.body;
        if (!subscriptionId) {
          return res.status(400).json({ message: "Subscription ID required" });
        }
        
        const cancelledSubscription = await cancelSubscription(session, subscriptionId);
        res.json({ 
          subscription: cancelledSubscription,
          message: "Subscription cancelled successfully"
        });
      } catch (error) {
        console.error("Error cancelling subscription:", error);
        res.status(500).json({ message: "Failed to cancel subscription" });
      }
    });
    
    // Billing callback (after merchant approves subscription)
    app.get('/api/billing/callback', authenticate, async (req: any, res) => {
      try {
        const { charge_id } = req.query;
        
        // Redirect to dashboard with success message
        res.redirect(`/?billing=success&charge_id=${charge_id}`);
      } catch (error) {
        console.error("Error in billing callback:", error);
        res.redirect('/?billing=error');
      }
    });
  }

  const httpServer = createServer(app);
  return httpServer;
}
