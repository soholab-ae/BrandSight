import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { shopifyService } from "./services/shopifyService";
import { insertStoreSchema } from "@shared/schema";
import { createBillingSubscription, checkActiveSubscription, cancelSubscription } from "./shopifyBilling";
import { cacheService, CacheKeyBuilder } from "./services/cacheService";
import * as csv from 'fast-csv';
import * as XLSX from 'xlsx';
import archiver from 'archiver';
import type { Response } from "express";

// Streaming export functions
async function streamVendorCSVExport(
  storeId: string,
  params: { sortBy: string; sortDirection: 'asc' | 'desc'; search?: string },
  res: Response,
  dateRange?: string
) {
  return new Promise(async (resolve, reject) => {
    try {
      // Create CSV stream
      const csvStream = csv.format({ headers: true });
      csvStream.pipe(res);
      
      // Add metadata header if dateRange provided
      if (dateRange) {
        csvStream.write({
          'Vendor Name': `Vendor Analytics Report - ${dateRange}`,
          'Revenue ($)': '',
          'Average Order Value ($)': '',
          'Conversion Rate (%)': '',
          'Visitors': '',
          'Product Count': '',
          'Growth Rate (%)': ''
        });
        csvStream.write({
          'Vendor Name': `Generated on: ${new Date().toLocaleDateString()}`,
          'Revenue ($)': '',
          'Average Order Value ($)': '',
          'Conversion Rate (%)': '',
          'Visitors': '',
          'Product Count': '',
          'Growth Rate (%)': ''
        });
        csvStream.write({
          'Vendor Name': '',
          'Revenue ($)': '',
          'Average Order Value ($)': '',
          'Conversion Rate (%)': '',
          'Visitors': '',
          'Product Count': '',
          'Growth Rate (%)': ''
        });
      }
      
      // Stream data in batches to avoid memory issues
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
        
        // Write batch data to CSV
        for (const vendor of result.data) {
          csvStream.write({
            'Vendor Name': vendor.name,
            'Revenue ($)': vendor.revenue,
            'Average Order Value ($)': vendor.aov.toFixed(2),
            'Conversion Rate (%)': vendor.conversion.toFixed(1),
            'Visitors': vendor.visitors,
            'Product Count': vendor.productCount,
            'Growth Rate (%)': vendor.growth.toFixed(1)
          });
        }
        
        hasMoreData = result.pagination.hasNext;
        currentPage++;
      }
      
      csvStream.end();
      csvStream.on('end', resolve);
      csvStream.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
}

async function streamVendorExcelExport(
  storeId: string,
  params: { sortBy: string; sortDirection: 'asc' | 'desc'; search?: string },
  res: Response,
  dateRange?: string
) {
  try {
    // For Excel, we need to collect all data first, then generate the file
    // In a production environment, you might want to use streaming Excel libraries
    const allVendors: any[] = [];
    let currentPage = 1;
    const batchSize = 100;
    let hasMoreData = true;
    
    // Collect all data in batches
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
    
    // Create workbook
    const workbook = XLSX.utils.book_new();
    
    // Format data for Excel
    const formattedData = allVendors.map(vendor => ({
      'Vendor Name': vendor.name,
      'Revenue ($)': vendor.revenue,
      'Average Order Value ($)': parseFloat(vendor.aov.toFixed(2)),
      'Conversion Rate (%)': parseFloat(vendor.conversion.toFixed(1)),
      'Visitors': vendor.visitors,
      'Product Count': vendor.productCount,
      'Growth Rate (%)': parseFloat(vendor.growth.toFixed(1))
    }));
    
    // Create main data worksheet
    const worksheet = XLSX.utils.aoa_to_sheet([]);
    
    if (dateRange) {
      // Add metadata
      XLSX.utils.sheet_add_aoa(worksheet, [
        [`Vendor Analytics Report - ${dateRange}`],
        [`Generated on: ${new Date().toLocaleDateString()}`],
        [`Total Vendors: ${allVendors.length}`],
        [] // Empty row
      ], { origin: 'A1' });
      
      // Add data starting from A5
      XLSX.utils.sheet_add_json(worksheet, formattedData, { origin: 'A5', skipHeader: false });
    } else {
      XLSX.utils.sheet_add_json(worksheet, formattedData, { origin: 'A1', skipHeader: false });
    }
    
    // Auto-size columns
    const colWidths = [
      { wch: 20 }, // Vendor Name
      { wch: 15 }, // Revenue
      { wch: 18 }, // AOV
      { wch: 15 }, // Conversion Rate
      { wch: 12 }, // Visitors
      { wch: 12 }, // Product Count
      { wch: 12 }  // Growth Rate
    ];
    worksheet['!cols'] = colWidths;
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Vendor Analytics');
    
    // Create summary worksheet
    const summaryData = [
      ['Summary Statistics', '', ''],
      ['Total Vendors', allVendors.length, ''],
      ['Total Revenue', allVendors.reduce((sum, v) => sum + v.revenue, 0), '$'],
      ['Average AOV', (allVendors.reduce((sum, v) => sum + v.aov, 0) / allVendors.length).toFixed(2), '$'],
      ['Average Conversion Rate', (allVendors.reduce((sum, v) => sum + v.conversion, 0) / allVendors.length).toFixed(1), '%'],
      ['Top Revenue Vendor', allVendors.sort((a, b) => b.revenue - a.revenue)[0]?.name || 'N/A', ''],
      ['Highest Growth Vendor', allVendors.sort((a, b) => b.growth - a.growth)[0]?.name || 'N/A', '']
    ];
    
    const summaryWorksheet = XLSX.utils.aoa_to_sheet(summaryData);
    summaryWorksheet['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 5 }];
    XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Summary');
    
    // Write to response stream
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.send(buffer);
  } catch (error) {
    throw error;
  }
}

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

  // Auth routes - with proper Shopify session handling
  app.get('/api/auth/user', async (req: any, res, next) => {
    console.log('[AUTH DEBUG] /api/auth/user called, useShopifyAuth:', useShopifyAuth);
    console.log('[AUTH DEBUG] req.shopifyUser:', req.shopifyUser);
    console.log('[AUTH DEBUG] req.user:', req.user);
    console.log('[AUTH DEBUG] res.locals.shopify?.session:', !!res.locals.shopify?.session);
    
    // For Shopify auth, check session first
    if (useShopifyAuth) {
      try {
        // Extract shop from multiple sources as specified
        const shop = req.query.shop || req.headers['x-shopify-shop-domain'] || res.locals.shopify?.session?.shop;
        
        console.log('[AUTH DEBUG] Extracted shop from req.query.shop, headers, or session:', shop);
        
        // If shop is missing, return 401 JSON instead of calling validation
        if (!shop) {
          console.log('[AUTH DEBUG] No shop context found, returning 401 JSON');
          return res.status(401).json({ message: "Unauthorized - Shop context required" });
        }
        
        // Check if we're in a Shopify context (has shop parameter or embedded)
        const isEmbeddedContext = req.get('referer')?.includes('admin.shopify.com') || 
                                req.get('user-agent')?.includes('Shopify Mobile') ||
                                req.headers['x-shopify-shop-domain'];
        
        console.log('[AUTH DEBUG] Shop:', shop, 'Embedded context:', isEmbeddedContext);
        
        // Only call validateAuthenticatedSession when we have a valid shop
        // Import the initializeShopify function
        const { initializeShopify } = await import("./shopifyAuth");
        const shopifyInstance = initializeShopify();
        
        if (shopifyInstance && shopifyInstance.config) {
          await new Promise((resolve, reject) => {
            shopifyInstance.validateAuthenticatedSession()(req, res, (error: any) => {
              if (error) {
                console.log('[AUTH DEBUG] Shopify session validation failed:', error.message);
                reject(error);
              } else {
                console.log('[AUTH DEBUG] Shopify session validation passed');
                resolve(true);
              }
            });
          });
        }
        
        // If we have a valid Shopify session, extract user info
        const session = res.locals.shopify?.session;
        if (session && session.accessToken) {
          console.log('[AUTH DEBUG] Valid Shopify session found for shop:', session.shop);
          
          // Upsert user from Shopify session
          const { upsertShopifyUser } = await import("./shopifyAuth");
          await upsertShopifyUser(session);
          
          // Get user ID based on session
          const userId = session.onlineAccessInfo?.associated_user?.id 
            ? `shopify_${session.onlineAccessInfo.associated_user.id}`
            : `shopify_shop_${session.shop.replace('.myshopify.com', '')}`;
            
          console.log('[AUTH DEBUG] Using userId:', userId);
          
          const user = await storage.getUser(userId);
          if (user) {
            console.log('[AUTH DEBUG] User found, returning user data');
            return res.json(user);
          } else {
            console.log('[AUTH DEBUG] User not found in database');
            return res.status(404).json({ message: "User not found" });
          }
        } else {
          // No valid session found, return 401 JSON instead of redirecting
          console.log('[AUTH DEBUG] No valid Shopify session found, returning 401');
          return res.status(401).json({ message: "Unauthorized - No valid Shopify session" });
        }
      } catch (error: any) {
        console.log('[AUTH DEBUG] Shopify auth failed:', error?.message || error);
        // Return 401 JSON instead of falling through to cause redirects
        return res.status(401).json({ message: "Unauthorized - Shopify authentication failed" });
      }
    }
    
    // If we have a default shop domain, create/return a default user
    if (process.env.DEFAULT_SHOP_DOMAIN && !req.user && !req.shopifyUser) {
      try {
        const shopDomain = process.env.DEFAULT_SHOP_DOMAIN;
        const userId = `shopify_${shopDomain.replace('.myshopify.com', '')}`;
        
        console.log('[AUTH DEBUG] Using default shop domain:', shopDomain, 'userId:', userId);
        
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
        console.log('[AUTH DEBUG] Fallback authentication, userId:', userId);
        
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
      const { page, limit, sortBy, sortDirection, search, paginated } = req.query;
      
      // Check if pagination is requested
      if (paginated === 'true') {
        const paginationParams = {
          page: page ? parseInt(page as string) : 1,
          limit: limit ? parseInt(limit as string) : 50,
          sortBy: sortBy as string || 'name',
          sortDirection: (sortDirection as 'asc' | 'desc') || 'asc',
          search: search as string
        };
        
        const result = await storage.getStoreVendorsPaginated(store.id, paginationParams);
        return res.json(result);
      }
      
      const cacheKey = CacheKeyBuilder.vendors(store.id);
      
      // Check cache first
      let vendors = cacheService.getObject(cacheKey);
      if (vendors) {
        return res.json(vendors);
      }
      
      // Cache miss - fetch from database
      vendors = await storage.getStoreVendors(store.id);
      
      // Cache the result (10 minute TTL for vendor data)
      cacheService.setObject(cacheKey, vendors, 600000);
      
      res.json(vendors);
    } catch (error) {
      console.error("Error fetching current store vendors:", error);
      if (error instanceof Error && error.message === "No stores found for user") {
        return res.status(404).json({ message: "No stores found for user" });
      }
      res.status(500).json({ message: "Failed to fetch vendors" });
    }
  });

  // Paginated vendor metrics endpoint
  app.get('/api/stores/current/vendors/metrics', authenticateOrDemo, async (req: any, res) => {
    try {
      const store = await getUserCurrentStore(req);
      const { page, limit, sortBy, sortDirection, search } = req.query;
      
      const paginationParams = {
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 50,
        sortBy: sortBy as string || 'revenue',
        sortDirection: (sortDirection as 'asc' | 'desc') || 'desc',
        search: search as string
      };
      
      const result = await storage.getStoreVendorMetrics(store.id, paginationParams);
      res.json(result);
    } catch (error) {
      console.error("Error fetching vendor metrics:", error);
      res.status(500).json({ message: "Failed to fetch vendor metrics" });
    }
  });

  // Server-side CSV export for vendor metrics
  app.get('/api/stores/current/vendors/export/csv', authenticateOrDemo, async (req: any, res) => {
    try {
      const store = await getUserCurrentStore(req);
      const { search, sortBy, sortDirection, dateRange } = req.query;
      
      const exportParams = {
        sortBy: sortBy as string || 'revenue',
        sortDirection: (sortDirection as 'asc' | 'desc') || 'desc',
        search: search as string
      };
      
      // Set response headers for file download
      const filename = `vendor-analytics-${dateRange || 'all'}-${new Date().toISOString().split('T')[0]}.csv`;
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Cache-Control', 'no-cache');
      
      // Stream CSV data
      await streamVendorCSVExport(store.id, exportParams, res, dateRange as string);
    } catch (error) {
      console.error("Error exporting vendor CSV:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to export vendor data" });
      }
    }
  });

  // Server-side Excel export for vendor metrics
  app.get('/api/stores/current/vendors/export/excel', authenticateOrDemo, async (req: any, res) => {
    try {
      const store = await getUserCurrentStore(req);
      const { search, sortBy, sortDirection, dateRange } = req.query;
      
      const exportParams = {
        sortBy: sortBy as string || 'revenue',
        sortDirection: (sortDirection as 'asc' | 'desc') || 'desc',
        search: search as string
      };
      
      // Set response headers for file download
      const filename = `vendor-analytics-${dateRange || 'all'}-${new Date().toISOString().split('T')[0]}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Cache-Control', 'no-cache');
      
      // Stream Excel data
      await streamVendorExcelExport(store.id, exportParams, res, dateRange as string);
    } catch (error) {
      console.error("Error exporting vendor Excel:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to export vendor data" });
      }
    }
  });

  // Export job status endpoint for large exports
  app.get('/api/stores/current/exports/:jobId/status', authenticateOrDemo, async (req: any, res) => {
    try {
      const { jobId } = req.params;
      // In a real implementation, you'd track export jobs in Redis or database
      // For now, return a simple status
      res.json({
        jobId,
        status: 'completed',
        progress: 100,
        downloadUrl: `/api/stores/current/exports/${jobId}/download`
      });
    } catch (error) {
      console.error("Error checking export status:", error);
      res.status(500).json({ message: "Failed to check export status" });
    }
  });

  app.get('/api/stores/current/analytics/summary', authenticateOrDemo, async (req: any, res) => {
    try {
      const store = await getUserCurrentStore(req);
      const { vendorId, startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();
      
      const cacheKey = CacheKeyBuilder.vendorSummary(store.id, vendorId as string, start, end);
      
      // Check cache first
      let summary = cacheService.getAnalytics(cacheKey);
      if (summary) {
        return res.json(summary);
      }
      
      // Cache miss - fetch from database
      summary = await storage.getVendorSummary(
        store.id,
        vendorId as string,
        start,
        end
      );
      
      // Cache the result (15 minute TTL for analytics data)
      cacheService.setAnalytics(cacheKey, summary, 900000);
      
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
      const { vendorId, limit, page, sortBy, sortDirection, paginated } = req.query;
      
      // Check if pagination is requested
      if (paginated === 'true') {
        const paginationParams = {
          page: page ? parseInt(page as string) : 1,
          limit: limit ? parseInt(limit as string) : 50,
          sortBy: sortBy as string || 'totalRevenue',
          sortDirection: (sortDirection as 'asc' | 'desc') || 'desc',
          vendorId: vendorId as string
        };
        
        const result = await storage.getTopProductsPaginated(store.id, paginationParams);
        return res.json(result);
      }
      
      const limitNum = limit ? parseInt(limit as string) : 10;
      
      const cacheKey = CacheKeyBuilder.topProducts(store.id, vendorId as string, limitNum);
      
      // Check cache first
      let topProducts = cacheService.getAnalytics(cacheKey);
      if (topProducts) {
        return res.json(topProducts);
      }
      
      // Cache miss - fetch from database
      topProducts = await storage.getTopProducts(
        store.id,
        vendorId as string,
        limitNum
      );
      
      // Cache the result (15 minute TTL for analytics data)
      cacheService.setAnalytics(cacheKey, topProducts, 900000);
      
      res.json(topProducts);
    } catch (error) {
      console.error("Error fetching current store top products:", error);
      if (error instanceof Error && error.message === "No stores found for user") {
        return res.status(404).json({ message: "No stores found for user" });
      }
      res.status(500).json({ message: "Failed to fetch top products" });
    }
  });

  // Paginated products endpoint
  app.get('/api/stores/current/products', authenticateOrDemo, async (req: any, res) => {
    try {
      const store = await getUserCurrentStore(req);
      const { page, limit, sortBy, sortDirection, search } = req.query;
      
      const paginationParams = {
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 50,
        sortBy: sortBy as string || 'title',
        sortDirection: (sortDirection as 'asc' | 'desc') || 'asc',
        search: search as string
      };
      
      const result = await storage.getStoreProducts(store.id, paginationParams);
      res.json(result);
    } catch (error) {
      console.error("Error fetching store products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  // Paginated vendor analytics endpoint
  app.get('/api/stores/current/analytics/paginated', authenticateOrDemo, async (req: any, res) => {
    try {
      const store = await getUserCurrentStore(req);
      const { page, limit, sortBy, sortDirection, vendorId, startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();
      
      const paginationParams = {
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 50,
        sortBy: sortBy as string || 'date',
        sortDirection: (sortDirection as 'asc' | 'desc') || 'desc',
        vendorId: vendorId as string,
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

  app.get('/api/stores/current/pages/top', authenticateOrDemo, async (req: any, res) => {
    try {
      const store = await getUserCurrentStore(req);
      const { vendorId, limit } = req.query;
      const limitNum = limit ? parseInt(limit as string) : 10;
      
      const cacheKey = CacheKeyBuilder.landingPages(store.id, vendorId as string, limitNum);
      
      // Check cache first
      let topPages = cacheService.getAnalytics(cacheKey);
      if (topPages) {
        return res.json(topPages);
      }
      
      // Cache miss - fetch from database
      topPages = await storage.getTopLandingPages(
        store.id,
        vendorId as string,
        limitNum
      );
      
      // Cache the result (15 minute TTL for analytics data)
      cacheService.setAnalytics(cacheKey, topPages, 900000);
      
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
      const { page, limit, sortBy, sortDirection, search, paginated } = req.query;
      
      // Check if pagination is requested
      if (paginated === 'true') {
        const paginationParams = {
          page: page ? parseInt(page as string) : 1,
          limit: limit ? parseInt(limit as string) : 50,
          sortBy: sortBy as string || 'name',
          sortDirection: (sortDirection as 'asc' | 'desc') || 'asc',
          search: search as string
        };
        
        const result = await storage.getStoreVendorsPaginated(storeId, paginationParams);
        return res.json(result);
      }
      
      const cacheKey = CacheKeyBuilder.vendors(storeId);
      
      // Check cache first
      let vendors = cacheService.getObject(cacheKey);
      if (vendors) {
        return res.json(vendors);
      }
      
      // Cache miss - fetch from database
      vendors = await storage.getStoreVendors(storeId);
      
      // Cache the result (10 minute TTL for vendor data)
      cacheService.setObject(cacheKey, vendors, 600000);
      
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
      
      const cacheKey = CacheKeyBuilder.analytics(storeId, vendorId as string, start, end);
      
      // Check cache first
      let analytics = cacheService.getAnalytics(cacheKey);
      if (analytics) {
        return res.json(analytics);
      }
      
      // Cache miss - fetch from database
      analytics = await storage.getVendorAnalytics(
        storeId,
        vendorId as string,
        start,
        end
      );
      
      // Cache the result (15 minute TTL for analytics data)
      cacheService.setAnalytics(cacheKey, analytics, 900000);
      
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
      
      const cacheKey = CacheKeyBuilder.vendorSummary(storeId, vendorId as string, start, end);
      
      // Check cache first
      let summary = cacheService.getAnalytics(cacheKey);
      if (summary) {
        return res.json(summary);
      }
      
      // Cache miss - fetch from database
      summary = await storage.getVendorSummary(
        storeId,
        vendorId as string,
        start,
        end
      );
      
      // Cache the result (15 minute TTL for analytics data)
      cacheService.setAnalytics(cacheKey, summary, 900000);
      
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
      const limitNum = limit ? parseInt(limit as string) : 10;
      
      const cacheKey = CacheKeyBuilder.topProducts(storeId, vendorId as string, limitNum);
      
      // Check cache first
      let topProducts = cacheService.getAnalytics(cacheKey);
      if (topProducts) {
        return res.json(topProducts);
      }
      
      // Cache miss - fetch from database
      topProducts = await storage.getTopProducts(
        storeId,
        vendorId as string,
        limitNum
      );
      
      // Cache the result (15 minute TTL for analytics data)
      cacheService.setAnalytics(cacheKey, topProducts, 900000);
      
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
      const limitNum = limit ? parseInt(limit as string) : 10;
      
      const cacheKey = CacheKeyBuilder.landingPages(storeId, vendorId as string, limitNum);
      
      // Check cache first
      let topPages = cacheService.getAnalytics(cacheKey);
      if (topPages) {
        return res.json(topPages);
      }
      
      // Cache miss - fetch from database
      topPages = await storage.getTopLandingPages(
        storeId,
        vendorId as string,
        limitNum
      );
      
      // Cache the result (15 minute TTL for analytics data)
      cacheService.setAnalytics(cacheKey, topPages, 900000);
      
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
      
      // Clear analytics cache before sync to ensure fresh data
      cacheService.invalidateAnalytics(storeId);
      console.log(`Cleared analytics cache for store ${storeId} before sync`);
      
      await shopifyService.syncProducts(store);
      await shopifyService.syncOrders(store);
      
      // Clear all caches after sync to ensure fresh data for next requests
      cacheService.invalidateStore(storeId);
      console.log(`Cleared all caches for store ${storeId} after sync completion`);
      
      res.json({ message: "Sync completed successfully" });
    } catch (error) {
      console.error("Error syncing store:", error);
      res.status(500).json({ message: "Failed to sync store" });
    }
  });

  // Cache management and metrics routes (for debugging and monitoring)
  app.get('/api/cache/metrics', authenticate, (req: any, res) => {
    try {
      const metrics = cacheService.getMetrics();
      res.json({
        ...metrics,
        timestamp: new Date().toISOString(),
        message: 'Cache metrics retrieved successfully'
      });
    } catch (error) {
      console.error("Error fetching cache metrics:", error);
      res.status(500).json({ message: "Failed to fetch cache metrics" });
    }
  });

  app.post('/api/cache/clear/:storeId', authenticate, (req: any, res) => {
    try {
      const { storeId } = req.params;
      cacheService.invalidateStore(storeId);
      res.json({ 
        message: `Cache cleared for store ${storeId}`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error clearing cache:", error);
      res.status(500).json({ message: "Failed to clear cache" });
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
