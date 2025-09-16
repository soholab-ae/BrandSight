import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { shopifyService } from "./services/shopifyService";
import { insertStoreSchema } from "@shared/schema";

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
  }

  // Unified authentication middleware
  const authenticate = useShopifyAuth ? authenticateShopify : isAuthenticated;
  
  // Helper to get user ID from either auth system
  const getUserId = (req: any) => {
    if (useShopifyAuth) {
      const rawId = req.shopifyUser?.id || req.shopifySession?.shop;
      return rawId ? `shopify_${rawId}` : null;
    } else {
      return req.user?.claims?.sub;
    }
  };

  // Helper to get user's first store
  const getUserCurrentStore = async (req: any) => {
    const userId = getUserId(req);
    if (!userId) {
      throw new Error("No user ID found");
    }
    
    const stores = await storage.getUserStores(userId);
    if (stores.length === 0) {
      throw new Error("No stores found for user");
    }
    
    return stores[0];
  };

  // Auth routes
  app.get('/api/auth/user', authenticate, async (req: any, res) => {
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

  // Store routes
  app.get('/api/stores', authenticate, async (req: any, res) => {
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
  app.get('/api/stores/current/vendors', authenticate, async (req: any, res) => {
    try {
      const store = await getUserCurrentStore(req);
      const vendors = await storage.getStoreVendors(store.id);
      res.json(vendors);
    } catch (error) {
      console.error("Error fetching current store vendors:", error);
      if (error.message === "No stores found for user") {
        return res.status(404).json({ message: "No stores found for user" });
      }
      res.status(500).json({ message: "Failed to fetch vendors" });
    }
  });

  app.get('/api/stores/current/analytics/summary', authenticate, async (req: any, res) => {
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
      if (error.message === "No stores found for user") {
        return res.status(404).json({ message: "No stores found for user" });
      }
      res.status(500).json({ message: "Failed to fetch analytics summary" });
    }
  });

  app.get('/api/stores/current/products/top', authenticate, async (req: any, res) => {
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
      if (error.message === "No stores found for user") {
        return res.status(404).json({ message: "No stores found for user" });
      }
      res.status(500).json({ message: "Failed to fetch top products" });
    }
  });

  app.get('/api/stores/current/pages/top', authenticate, async (req: any, res) => {
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
      if (error.message === "No stores found for user") {
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

  const httpServer = createServer(app);
  return httpServer;
}
