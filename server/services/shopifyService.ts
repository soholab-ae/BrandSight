import { storage } from "../storage";
import type { Store, InsertProduct, InsertOrder, InsertOrderLineItem } from "@shared/schema";

// Rate limiting and retry configuration
interface RateLimitState {
  currentCallCount: number;
  maxCallCount: number;
  leakBucketLevel: number;
  lastResetTime: number;
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  jitterFactor: number;
}

interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  vendor: string;
  product_type: string;
  variants: Array<{
    id: number;
    price: string;
    compare_at_price?: string;
  }>;
  status: string;
  created_at: string;
  updated_at: string;
}

interface ShopifyOrder {
  id: number;
  order_number: string;
  total_price: string;
  subtotal_price: string;
  total_tax: string;
  currency: string;
  financial_status: string;
  fulfillment_status?: string;
  email: string;
  customer?: { id: number };
  landing_site?: string;
  referring_site?: string;
  processed_at: string;
  created_at: string;
  line_items: Array<{
    id: number;
    product_id: number;
    title: string;
    vendor: string;
    quantity: number;
    price: string;
    total_discount: string;
  }>;
}

export class ShopifyService {
  private rateLimitState: Map<string, RateLimitState> = new Map();
  private readonly retryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 32000, // 32 seconds
    jitterFactor: 0.1
  };
  
  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  private getDelayWithJitter(baseDelay: number): number {
    const jitter = (Math.random() - 0.5) * this.retryConfig.jitterFactor * baseDelay;
    return Math.min(baseDelay + jitter, this.retryConfig.maxDelay);
  }
  
  private updateRateLimit(storeId: string, headers: Headers): void {
    const callLimitHeader = headers.get('X-Shopify-Shop-Api-Call-Limit');
    if (callLimitHeader) {
      const [current, max] = callLimitHeader.split('/').map(Number);
      
      this.rateLimitState.set(storeId, {
        currentCallCount: current,
        maxCallCount: max,
        leakBucketLevel: current / max,
        lastResetTime: Date.now()
      });
    }
  }
  
  private async checkRateLimit(storeId: string): Promise<void> {
    const rateLimitState = this.rateLimitState.get(storeId);
    if (!rateLimitState) return;
    
    // If we're approaching the rate limit (>80%), add delay
    if (rateLimitState.leakBucketLevel > 0.8) {
      const delay = Math.min(
        (rateLimitState.leakBucketLevel - 0.8) * 5000, // Progressive delay up to 5s
        5000
      );
      
      console.log(`Rate limit approaching for ${storeId}, waiting ${delay}ms`);
      await this.sleep(delay);
    }
  }

  private async makeShopifyRequest(store: Store, endpoint: string, params?: Record<string, string>): Promise<{data: any, headers: Headers}> {
    let retryCount = 0;
    
    while (retryCount <= this.retryConfig.maxRetries) {
      try {
        // Check and respect rate limits before making request
        await this.checkRateLimit(store.id);
        
        const url = new URL(`https://${store.domain}/admin/api/2024-10/${endpoint}.json`);
        
        if (params) {
          Object.entries(params).forEach(([key, value]) => {
            url.searchParams.append(key, value);
          });
        }

        const response = await fetch(url.toString(), {
          headers: {
            'X-Shopify-Access-Token': store.accessToken,
            'Content-Type': 'application/json',
          },
        });
        
        // Update rate limit tracking with response headers
        this.updateRateLimit(store.id, response.headers);

        // Handle rate limiting (429) and server errors (5xx) with retry
        if (response.status === 429 || response.status >= 500) {
          if (retryCount === this.retryConfig.maxRetries) {
            throw new Error(`Shopify API error after ${retryCount} retries: ${response.status} ${response.statusText}`);
          }
          
          let retryDelay = this.retryConfig.baseDelay * Math.pow(2, retryCount);
          
          // Respect Retry-After header if present
          const retryAfterHeader = response.headers.get('Retry-After');
          if (retryAfterHeader) {
            const retryAfterMs = parseInt(retryAfterHeader) * 1000;
            retryDelay = Math.max(retryDelay, retryAfterMs);
          }
          
          // Add jitter to prevent thundering herd
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
        
        // Retry on network errors with exponential backoff
        const retryDelay = this.getDelayWithJitter(
          this.retryConfig.baseDelay * Math.pow(2, retryCount)
        );
        
        console.log(`Network error, retrying in ${retryDelay}ms (attempt ${retryCount + 1}/${this.retryConfig.maxRetries + 1}):`, error);
        
        retryCount++;
        await this.sleep(retryDelay);
      }
    }
    
    throw new Error(`Max retries exceeded for Shopify API request to ${endpoint}`);
  }

  async syncProducts(store: Store, forceFullSync = false): Promise<void> {
    try {
      let hasNextPage = true;
      let pageInfo = '';
      let syncedCount = 0;
      const syncStartTime = new Date();
      
      // Determine if this should be incremental or full sync
      const lastSync = forceFullSync ? null : store.lastProductSyncAt;
      const isIncrementalSync = !forceFullSync && lastSync;
      
      console.log(`Starting ${isIncrementalSync ? 'incremental' : 'full'} product sync for ${store.domain}`, 
                  lastSync ? { lastSync: lastSync.toISOString() } : {});
      
      // Prefetch all vendors once to eliminate N+1 queries (O(1) lookups)
      const existingVendors = await storage.getStoreVendors(store.id);
      const vendorMap = new Map(existingVendors.map(v => [v.name, v]));
      
      // Track new vendors to create in bulk
      const newVendorsToCreate = new Set<string>();

      while (hasNextPage) {
        const params: Record<string, string> = { limit: '250' };
        
        // Use incremental sync with updated_at_min for efficiency
        if (isIncrementalSync && lastSync) {
          params.updated_at_min = lastSync.toISOString();
        }
        
        if (pageInfo) {
          params.page_info = pageInfo;
        }

        const { data, headers } = await this.makeShopifyRequest(store, 'products', params);
        const products: ShopifyProduct[] = data.products;
        
        if (products.length === 0) {
          console.log('No products to sync, breaking pagination loop');
          break;
        }
        
        // First pass: collect new vendor names
        for (const shopifyProduct of products) {
          if (shopifyProduct.vendor && !vendorMap.has(shopifyProduct.vendor)) {
            newVendorsToCreate.add(shopifyProduct.vendor);
          }
        }
        
        // Create new vendors in bulk
        for (const vendorName of Array.from(newVendorsToCreate)) {
          const newVendor = await storage.createVendor({
            storeId: store.id,
            name: vendorName,
            slug: vendorName.toLowerCase().replace(/\s+/g, '-'),
          });
          vendorMap.set(vendorName, newVendor);
        }
        newVendorsToCreate.clear();

        // Second pass: prepare products for bulk upsert with O(1) vendor lookups
        const productsToUpsert: InsertProduct[] = [];
        
        for (const shopifyProduct of products) {
          const vendor = vendorMap.get(shopifyProduct.vendor);

          const product: InsertProduct = {
            id: shopifyProduct.id.toString(),
            storeId: store.id,
            vendorId: vendor?.id,
            title: shopifyProduct.title,
            handle: shopifyProduct.handle,
            vendor: shopifyProduct.vendor,
            productType: shopifyProduct.product_type,
            price: shopifyProduct.variants[0]?.price || '0',
            compareAtPrice: shopifyProduct.variants[0]?.compare_at_price,
            status: shopifyProduct.status,
          };

          productsToUpsert.push(product);
        }
        
        // Bulk upsert products for better performance
        if (productsToUpsert.length > 0) {
          await storage.bulkUpsertProducts(productsToUpsert);
          syncedCount += productsToUpsert.length;
        }

        // Fix pagination - read headers from response, not parsed data
        const linkHeader = headers.get('link');
        hasNextPage = Boolean(linkHeader && linkHeader.includes('rel="next"'));
        if (hasNextPage && linkHeader) {
          const nextPageMatch = linkHeader.match(/<[^>]*page_info=([^&>]*).*>;\s*rel="next"/);
          pageInfo = nextPageMatch ? nextPageMatch[1] : '';
        }
        
        // Progress logging for large syncs
        if (syncedCount % 1000 === 0) {
          console.log(`Product sync progress: ${syncedCount} products processed`);
        }
      }

      // Update sync timestamps
      await storage.updateStore(store.id, { 
        lastSyncAt: syncStartTime,
        lastProductSyncAt: syncStartTime,
        productSyncCursor: pageInfo || null
      });
      
      console.log(`Product sync completed: ${syncedCount} products ${isIncrementalSync ? 'updated' : 'synced'}`);
    } catch (error) {
      console.error('Error syncing products:', error);
      throw error;
    }
  }

  async syncOrders(store: Store, startDate?: Date, forceFullSync = false): Promise<void> {
    try {
      let hasNextPage = true;
      let pageInfo = '';
      let syncedCount = 0;
      const syncStartTime = new Date();
      
      // Determine sync strategy
      const lastSync = forceFullSync ? null : (startDate || store.lastOrderSyncAt);
      const isIncrementalSync = !forceFullSync && lastSync;
      
      console.log(`Starting ${isIncrementalSync ? 'incremental' : 'full'} order sync for ${store.domain}`, 
                  lastSync ? { lastSync: lastSync.toISOString() } : {});
      
      // Prefetch vendors for order line items
      const existingVendors = await storage.getStoreVendors(store.id);
      const vendorMap = new Map(existingVendors.map(v => [v.name, v]));

      while (hasNextPage) {
        const params: Record<string, string> = { 
          limit: '250',
          status: 'any',
          financial_status: 'paid',
        };
        
        // Use incremental sync with updated_at_min for efficiency
        if (isIncrementalSync && lastSync) {
          params.updated_at_min = lastSync.toISOString();
        }
        
        if (pageInfo) {
          params.page_info = pageInfo;
        }

        const { data, headers } = await this.makeShopifyRequest(store, 'orders', params);
        const orders: ShopifyOrder[] = data.orders;
        
        if (orders.length === 0) {
          console.log('No orders to sync, breaking pagination loop');
          break;
        }

        // Prepare orders and line items for bulk operations
        const ordersToUpsert: InsertOrder[] = [];
        const lineItemsToUpsert: InsertOrderLineItem[] = [];
        
        for (const shopifyOrder of orders) {
          // Prepare order
          const order: InsertOrder = {
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
            processedAt: shopifyOrder.processed_at ? new Date(shopifyOrder.processed_at) : null,
          };

          ordersToUpsert.push(order);

          // Prepare line items with optimized vendor lookups
          for (const lineItem of shopifyOrder.line_items) {
            const vendor = vendorMap.get(lineItem.vendor);

            const orderLineItem: InsertOrderLineItem = {
              id: lineItem.id.toString(),
              orderId: shopifyOrder.id.toString(),
              productId: lineItem.product_id?.toString(),
              vendorId: vendor?.id,
              title: lineItem.title,
              vendor: lineItem.vendor,
              quantity: lineItem.quantity,
              price: lineItem.price,
              totalDiscount: lineItem.total_discount,
            };

            lineItemsToUpsert.push(orderLineItem);
          }
        }
        
        // Bulk upsert orders and line items for better performance
        if (ordersToUpsert.length > 0) {
          await storage.bulkUpsertOrders(ordersToUpsert);
          syncedCount += ordersToUpsert.length;
        }
        
        if (lineItemsToUpsert.length > 0) {
          await storage.bulkUpsertOrderLineItems(lineItemsToUpsert);
        }

        // Fix pagination - read headers from response, not parsed data
        const linkHeader = headers.get('link');
        hasNextPage = Boolean(linkHeader && linkHeader.includes('rel="next"'));
        if (hasNextPage && linkHeader) {
          const nextPageMatch = linkHeader.match(/<[^>]*page_info=([^&>]*).*>;\s*rel="next"/);
          pageInfo = nextPageMatch ? nextPageMatch[1] : '';
        }
        
        // Progress logging for large syncs
        if (syncedCount % 500 === 0) {
          console.log(`Order sync progress: ${syncedCount} orders processed`);
        }
      }
      
      // Update sync timestamps
      await storage.updateStore(store.id, { 
        lastSyncAt: syncStartTime,
        lastOrderSyncAt: syncStartTime,
        orderSyncCursor: pageInfo || null
      });
      
      console.log(`Order sync completed: ${syncedCount} orders ${isIncrementalSync ? 'updated' : 'synced'}`);
    } catch (error) {
      console.error('Error syncing orders:', error);
      throw error;
    }
  }

  async generateAnalytics(store: Store, startDate: Date, endDate: Date): Promise<void> {
    try {
      const vendors = await storage.getStoreVendors(store.id);
      
      for (const vendor of vendors) {
        // Calculate analytics for this vendor
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
          conversionRate: analytics.conversionRate,
        });
      }
    } catch (error) {
      console.error('Error generating analytics:', error);
      throw error;
    }
  }

  private async calculateVendorAnalytics(storeId: string, vendorId: string, startDate: Date, endDate: Date) {
    try {
      console.log(`Calculating analytics for vendor ${vendorId} from ${startDate.toISOString()} to ${endDate.toISOString()}`);
      
      // Get vendor data from the date range
      const vendorOrders = await storage.getVendorOrdersInDateRange(storeId, vendorId, startDate, endDate);
      const vendorOrderItems = await storage.getVendorOrderItemsInDateRange(storeId, vendorId, startDate, endDate);
      
      // Calculate revenue from order line items
      const totalRevenue = vendorOrderItems.reduce((sum, item) => {
        const itemRevenue = parseFloat(item.price || '0') * (item.quantity || 0);
        return sum + itemRevenue;
      }, 0);
      
      const totalOrders = vendorOrders.length;
      const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      
      // Conservative estimates for visitors and conversions based on industry standards
      // In production, integrate with Shopify Analytics API or Google Analytics
      const estimatedVisitors = Math.max(Math.floor(totalOrders * 8), totalOrders); // Assume ~12.5% conversion rate
      const conversions = totalOrders; // Each order is a conversion
      const conversionRate = estimatedVisitors > 0 ? (conversions / estimatedVisitors) : 0;
      
      const analytics = {
        revenue: totalRevenue.toFixed(2),
        orders: totalOrders,
        visitors: estimatedVisitors,
        conversions: conversions,
        aov: aov.toFixed(2),
        conversionRate: (conversionRate * 100).toFixed(4),
      };
      
      console.log(`Analytics calculated for vendor ${vendorId}:`, analytics);
      return analytics;
    } catch (error) {
      console.error(`Error calculating vendor analytics for vendor ${vendorId}:`, error);
      return {
        revenue: "0",
        orders: 0,
        visitors: 0,
        conversions: 0,
        aov: "0",
        conversionRate: "0",
      };
    }
  }

  // Webhook handler for order creation/update
  async handleOrderWebhook(orderData: ShopifyOrder, storeId: string): Promise<void> {
    try {
      console.log(`Processing order webhook for order ${orderData.id} in store ${storeId}`);
      
      // Create or update the order
      const order: InsertOrder = {
        id: orderData.id.toString(),
        storeId: storeId,
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
        processedAt: orderData.processed_at ? new Date(orderData.processed_at) : null,
      };

      await storage.upsertOrder(order);

      // Create order line items and track affected vendors
      const affectedVendors = new Set<string>();
      for (const lineItem of orderData.line_items) {
        // Ensure vendor exists
        let vendor = await storage.getStoreVendors(storeId).then(vendors => 
          vendors.find(v => v.name === lineItem.vendor)
        );

        if (!vendor && lineItem.vendor) {
          vendor = await storage.createVendor({
            storeId: storeId,
            name: lineItem.vendor,
            slug: lineItem.vendor.toLowerCase().replace(/\s+/g, '-'),
          });
        }

        if (vendor) {
          affectedVendors.add(vendor.id);
        }

        const orderLineItem: InsertOrderLineItem = {
          id: lineItem.id.toString(),
          orderId: orderData.id.toString(),
          productId: lineItem.product_id?.toString(),
          vendorId: vendor?.id,
          title: lineItem.title,
          vendor: lineItem.vendor,
          quantity: lineItem.quantity,
          price: lineItem.price,
          totalDiscount: lineItem.total_discount,
        };

        await storage.upsertOrderLineItem(orderLineItem);
      }

      // Regenerate analytics for all affected vendors
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // Last 30 days

      for (const vendorId of Array.from(affectedVendors)) {
        const analytics = await this.calculateVendorAnalytics(storeId, vendorId, startDate, endDate);
        
        await storage.upsertVendorAnalytics({
          storeId: storeId,
          vendorId: vendorId,
          date: endDate,
          revenue: analytics.revenue,
          orders: analytics.orders,
          visitors: analytics.visitors,
          conversions: analytics.conversions,
          aov: analytics.aov,
          conversionRate: analytics.conversionRate,
        });
      }

      console.log(`Successfully processed order webhook for order ${orderData.id}`);
    } catch (error) {
      console.error(`Error handling order webhook for order ${orderData.id}:`, error);
      throw error;
    }
  }

  // Webhook handler for product creation/update
  async handleProductWebhook(productData: ShopifyProduct, storeId: string): Promise<void> {
    try {
      console.log(`Processing product webhook for product ${productData.id} in store ${storeId}`);
      
      // Create or update vendor if needed
      let vendor = await storage.getStoreVendors(storeId).then(vendors => 
        vendors.find(v => v.name === productData.vendor)
      );

      if (!vendor && productData.vendor) {
        vendor = await storage.createVendor({
          storeId: storeId,
          name: productData.vendor,
          slug: productData.vendor.toLowerCase().replace(/\s+/g, '-'),
        });
      }

      // Create or update product
      const product: InsertProduct = {
        id: productData.id.toString(),
        storeId: storeId,
        vendorId: vendor?.id,
        title: productData.title,
        handle: productData.handle,
        vendor: productData.vendor,
        productType: productData.product_type,
        price: productData.variants[0]?.price || '0',
        compareAtPrice: productData.variants[0]?.compare_at_price,
        status: productData.status,
      };

      await storage.upsertProduct(product);
      
      console.log(`Successfully processed product webhook for product ${productData.id}`);
    } catch (error) {
      console.error(`Error handling product webhook for product ${productData.id}:`, error);
      throw error;
    }
  }

  // Webhook handler for customer creation
  async handleCustomerWebhook(customerData: any, storeId: string): Promise<void> {
    try {
      console.log(`Processing customer webhook for customer ${customerData.id} in store ${storeId}`);
      
      // For now, just log customer creation. In a full implementation, you might:
      // 1. Store customer data for analytics
      // 2. Update visitor/customer metrics
      // 3. Integrate with customer analytics platforms
      
      console.log(`New customer created: ${customerData.email} (ID: ${customerData.id})`);
      
      // You could store customer data or update analytics here
      // This is a placeholder for future customer analytics features
      
      console.log(`Successfully processed customer webhook for customer ${customerData.id}`);
    } catch (error) {
      console.error(`Error handling customer webhook for customer ${customerData.id}:`, error);
      throw error;
    }
  }

  async getShopInfo(store: Store) {
    try {
      const { data } = await this.makeShopifyRequest(store, 'shop');
      return data.shop;
    } catch (error) {
      console.error('Error getting shop info:', error);
      throw error;
    }
  }
}

export const shopifyService = new ShopifyService();
