import { storage } from "../storage";
import type { 
  InventoryAnalytics, 
  InsertInventoryAnalytics,
  VendorInventorySummary,
  InsertVendorInventorySummary,
  Product,
  Order,
  OrderLineItem,
  Vendor,
  PaginationParams 
} from "@shared/schema";
import { isDemoMode } from "../demoData";

// Time period constants for analysis
export const TIME_PERIODS = {
  THIRTY_DAYS: 30,
  SIXTY_DAYS: 60,
  NINETY_DAYS: 90,
  ONE_TWENTY_DAYS: 120
} as const;

// Inventory velocity thresholds
export const VELOCITY_THRESHOLDS = {
  FAST_MOVING: 0.8, // 80%+ sell-through rate
  MODERATE: 0.4,    // 40-80% sell-through rate
  SLOW_MOVING: 0.2, // 20-40% sell-through rate
  DEAD_STOCK: 0     // 0% sell-through rate
} as const;

// Safety stock factors by seasonality
export const SAFETY_STOCK_FACTORS = {
  HIGH_SEASON: 2.0,     // Peak demand periods
  MEDIUM_SEASON: 1.5,   // Normal demand
  LOW_SEASON: 1.0,      // Low demand periods
  CLEARANCE: 0.5        // End of season/clearance
} as const;

// Lead time defaults by vendor type
export const DEFAULT_LEAD_TIMES = {
  'Nike': 14,
  'Adidas': 14,
  'Under Armour': 10,
  'Puma': 12,
  'New Balance': 10,
  'Default': 14
} as const;

export interface SellThroughAnalysis {
  vendorId: string;
  vendorName: string;
  period: number;
  sellThroughRate: number;
  totalUnitsAvailable: number;
  totalUnitsSold: number;
  inventoryVelocity: 'fast' | 'moderate' | 'slow' | 'dead';
  topPerformingProducts: Array<{
    productId: string;
    title: string;
    sellThroughRate: number;
    unitsSold: number;
    unitsAvailable: number;
  }>;
  worstPerformingProducts: Array<{
    productId: string;
    title: string;
    sellThroughRate: number;
    unitsSold: number;
    unitsAvailable: number;
  }>;
}

export interface DeadStockAnalysis {
  vendorId: string;
  vendorName: string;
  deadStockProducts: Array<{
    productId: string;
    title: string;
    daysInStock: number;
    currentInventory: number;
    costValue: number;
    lastSaleDate?: Date;
    recommendedAction: 'clearance' | 'liquidate' | 'return_to_vendor';
  }>;
  totalDeadStockValue: number;
  deadStockPercentage: number;
  recommendations: string[];
}

export interface ReorderRecommendation {
  productId: string;
  vendorId: string;
  productTitle: string;
  currentInventory: number;
  reorderPoint: number;
  recommendedOrderQuantity: number;
  daysOfInventoryRemaining: number;
  safetyStock: number;
  averageDailySales: number;
  leadTimeDays: number;
  urgency: 'critical' | 'urgent' | 'moderate' | 'good';
  estimatedStockoutDate?: Date;
}

export interface ProfitabilityAnalysis {
  vendorId: string;
  vendorName: string;
  totalInventoryValue: number;
  totalInventoryCost: number;
  averageMarginPercentage: number;
  inventoryTurnRate: number;
  roiPercentage: number;
  deadStockCost: number;
  carryingCostPerDay: number;
  monthlyCarryingCost: number;
  profitabilityScore: number; // 0-100 composite score
  recommendations: Array<{
    type: 'reorder' | 'clearance' | 'pricing' | 'discontinue';
    message: string;
    impact: number; // Estimated financial impact
  }>;
  categoryBreakdown: Array<{
    productType: string;
    inventoryValue: number;
    marginPercentage: number;
    turnRate: number;
  }>;
}

export class InventoryService {
  
  /**
   * COST HIERARCHY CALCULATION
   * Implements priority: actual_cost > vendor_margin_based > price_proxy_fallback
   */
  private calculateProductCost(product: Product, vendor?: Vendor): number {
    const price = parseFloat(product.price || "0");
    
    // 1. First try actual product cost (highest priority)
    if (product.cost && parseFloat(product.cost) > 0) {
      return parseFloat(product.cost);
    }
    
    // 2. Try product-specific margin if available
    if (product.marginPercentage && parseFloat(product.marginPercentage) > 0) {
      const marginDecimal = parseFloat(product.marginPercentage) / 100;
      return price * (1 - marginDecimal);
    }
    
    // 3. Try vendor default margin if available
    if (vendor?.defaultMarginPercentage && parseFloat(vendor.defaultMarginPercentage) > 0) {
      const marginDecimal = parseFloat(vendor.defaultMarginPercentage) / 100;
      return price * (1 - marginDecimal);
    }
    
    // 4. Fallback to price proxy (40% margin assumption)
    return price * 0.6;
  }

  /**
   * CALCULATE MARGIN PERCENTAGE
   * Returns the effective margin percentage for a product
   */
  private calculateMarginPercentage(product: Product, vendor?: Vendor): number {
    const price = parseFloat(product.price || "0");
    const cost = this.calculateProductCost(product, vendor);
    
    if (price <= 0) return 0;
    return ((price - cost) / price) * 100;
  }

  /**
   * GET VENDOR LEAD TIME
   * Returns vendor-specific lead time or default based on vendor name
   */
  private getVendorLeadTime(vendor: Vendor): number {
    // 1. Use vendor-specific lead time if set
    if (vendor.leadTimeDays && vendor.leadTimeDays > 0) {
      return vendor.leadTimeDays;
    }
    
    // 2. Use defaults based on vendor name
    return DEFAULT_LEAD_TIMES[vendor.name as keyof typeof DEFAULT_LEAD_TIMES] || DEFAULT_LEAD_TIMES.Default;
  }
  
  /**
   * 1. SELL-THROUGH RATE ANALYSIS
   */
  async getSellThroughAnalysis(
    storeId: string, 
    vendorId?: string, 
    period: number = TIME_PERIODS.THIRTY_DAYS,
    userId?: string
  ): Promise<SellThroughAnalysis[]> {
    // Check for demo mode and return demo data
    if (isDemoMode(userId) || storeId === "c15b4e68-ea15-4036-a5f7-cdce20d2baa7") {
      return this.getDemoSellThroughAnalysis(vendorId, period);
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - period);

    // Get vendors to analyze - batch fetch for performance
    const vendors = vendorId 
      ? [await storage.getVendor(vendorId)].filter(Boolean)
      : await storage.getStoreVendors(storeId);

    // PERFORMANCE FIX: Collect all product IDs upfront to eliminate N+1 queries
    const allProducts = new Map<string, Product[]>();
    const allProductIds: string[] = [];
    
    for (const vendor of vendors) {
      if (!vendor) continue;
      const products = await storage.getVendorProducts(vendor.id);
      allProducts.set(vendor.id, products);
      allProductIds.push(...products.map(p => p.id));
    }

    // PERFORMANCE FIX: Batch fetch all inventory levels at once
    const inventoryLevels = await storage.getInventoryLevelsForProducts(allProductIds);

    const analysisResults: SellThroughAnalysis[] = [];

    for (const vendor of vendors) {
      if (!vendor) continue;

      const products = allProducts.get(vendor.id) || [];
      
      // Get sales data for the period
      const orderItems = await storage.getVendorOrderItemsInDateRange(
        storeId, 
        vendor.id, 
        startDate, 
        endDate
      );

      // Calculate sell-through metrics
      let totalUnitsAvailable = 0;
      let totalUnitsSold = 0;
      const productMetrics: Array<{
        productId: string;
        title: string;
        sellThroughRate: number;
        unitsSold: number;
        unitsAvailable: number;
      }> = [];

      for (const product of products) {
        // PERFORMANCE FIX: Use batch-fetched inventory level (no await in loop)
        const currentInventory = inventoryLevels.get(product.id) || 0;
        
        // Get units sold for this product in period
        const productSales = orderItems
          .filter(item => item.productId === product.id)
          .reduce((sum, item) => sum + (item.quantity || 0), 0);

        // Calculate units available (current + sold during period)
        const unitsAvailable = currentInventory + productSales;
        const sellThroughRate = unitsAvailable > 0 ? (productSales / unitsAvailable) : 0;

        totalUnitsAvailable += unitsAvailable;
        totalUnitsSold += productSales;

        productMetrics.push({
          productId: product.id,
          title: product.title,
          sellThroughRate: sellThroughRate,
          unitsSold: productSales,
          unitsAvailable: unitsAvailable
        });
      }

      // Sort products by performance
      productMetrics.sort((a, b) => b.sellThroughRate - a.sellThroughRate);

      const overallSellThroughRate = totalUnitsAvailable > 0 
        ? (totalUnitsSold / totalUnitsAvailable) 
        : 0;

      // Determine inventory velocity
      let velocity: 'fast' | 'moderate' | 'slow' | 'dead';
      if (overallSellThroughRate >= VELOCITY_THRESHOLDS.FAST_MOVING) {
        velocity = 'fast';
      } else if (overallSellThroughRate >= VELOCITY_THRESHOLDS.MODERATE) {
        velocity = 'moderate';
      } else if (overallSellThroughRate >= VELOCITY_THRESHOLDS.SLOW_MOVING) {
        velocity = 'slow';
      } else {
        velocity = 'dead';
      }

      analysisResults.push({
        vendorId: vendor.id,
        vendorName: vendor.name,
        period,
        sellThroughRate: overallSellThroughRate,
        totalUnitsAvailable,
        totalUnitsSold,
        inventoryVelocity: velocity,
        topPerformingProducts: productMetrics.slice(0, 5),
        worstPerformingProducts: productMetrics.slice(-5).reverse()
      });
    }

    return analysisResults;
  }

  /**
   * 2. DEAD STOCK IDENTIFICATION
   */
  async getDeadStockAnalysis(
    storeId: string, 
    vendorId?: string, 
    deadStockPeriod: number = TIME_PERIODS.NINETY_DAYS,
    userId?: string
  ): Promise<DeadStockAnalysis[]> {
    // Check for demo mode and return demo data
    if (isDemoMode(userId) || storeId === "c15b4e68-ea15-4036-a5f7-cdce20d2baa7") {
      return this.getDemoDeadStockAnalysis(vendorId, deadStockPeriod);
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - deadStockPeriod);

    // Get vendors to analyze - batch fetch for performance
    const vendors = vendorId 
      ? [await storage.getVendor(vendorId)].filter(Boolean)
      : await storage.getStoreVendors(storeId);

    // PERFORMANCE FIX: Collect all product IDs upfront to eliminate N+1 queries
    const allProducts = new Map<string, Product[]>();
    const allProductIds: string[] = [];
    
    for (const vendor of vendors) {
      if (!vendor) continue;
      const products = await storage.getVendorProducts(vendor.id);
      allProducts.set(vendor.id, products);
      allProductIds.push(...products.map(p => p.id));
    }

    // PERFORMANCE FIX: Batch fetch all inventory levels at once
    const inventoryLevels = await storage.getInventoryLevelsForProducts(allProductIds);

    const deadStockResults: DeadStockAnalysis[] = [];

    for (const vendor of vendors) {
      if (!vendor) continue;

      const products = allProducts.get(vendor.id) || [];
      
      // Get sales data since cutoff date
      const recentOrderItems = await storage.getVendorOrderItemsInDateRange(
        storeId, 
        vendor.id, 
        cutoffDate, 
        new Date()
      );

      const deadStockProducts: DeadStockAnalysis['deadStockProducts'] = [];
      let totalDeadStockValue = 0;
      let totalInventoryValue = 0;

      for (const product of products) {
        // PERFORMANCE FIX: Use batch-fetched inventory level (no await in loop)
        const currentInventory = inventoryLevels.get(product.id) || 0;
        
        // ACCURACY FIX: Use cost hierarchy instead of hardcoded 0.6 multiplier
        const productCost = this.calculateProductCost(product, vendor);
        const inventoryValue = currentInventory * productCost;
        
        totalInventoryValue += inventoryValue;

        // Check if product had sales in the period
        const productSales = recentOrderItems
          .filter(item => item.productId === product.id)
          .reduce((sum, item) => sum + (item.quantity || 0), 0);

        // If no sales and has inventory, it's dead stock
        if (productSales === 0 && currentInventory > 0) {
          const daysInStock = await this.getDaysInStock(product.id);
          const lastSaleDate = await this.getLastSaleDate(product.id);
          
          let recommendedAction: 'clearance' | 'liquidate' | 'return_to_vendor';
          if (daysInStock > 180) {
            recommendedAction = 'liquidate';
          } else if (daysInStock > 120) {
            recommendedAction = 'return_to_vendor';
          } else {
            recommendedAction = 'clearance';
          }

          deadStockProducts.push({
            productId: product.id,
            title: product.title,
            daysInStock,
            currentInventory,
            costValue: inventoryValue,
            lastSaleDate,
            recommendedAction
          });

          totalDeadStockValue += inventoryValue;
        }
      }

      const deadStockPercentage = totalInventoryValue > 0 
        ? (totalDeadStockValue / totalInventoryValue) * 100 
        : 0;

      // Generate recommendations
      const recommendations: string[] = [];
      if (deadStockPercentage > 20) {
        recommendations.push("High dead stock detected - consider aggressive clearance pricing");
      }
      if (deadStockProducts.filter(p => p.recommendedAction === 'liquidate').length > 0) {
        recommendations.push("Some products should be liquidated immediately to recover capital");
      }
      if (deadStockProducts.length > 10) {
        recommendations.push("Review purchasing patterns and demand forecasting processes");
      }

      deadStockResults.push({
        vendorId: vendor.id,
        vendorName: vendor.name,
        deadStockProducts,
        totalDeadStockValue,
        deadStockPercentage,
        recommendations
      });
    }

    return deadStockResults;
  }

  /**
   * 3. REORDER POINT RECOMMENDATIONS
   */
  async getReorderRecommendations(
    storeId: string,
    vendorId?: string,
    userId?: string
  ): Promise<ReorderRecommendation[]> {
    // Check for demo mode and return demo data
    if (isDemoMode(userId) || storeId === "c15b4e68-ea15-4036-a5f7-cdce20d2baa7") {
      return this.getDemoReorderRecommendations(vendorId);
    }
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - TIME_PERIODS.NINETY_DAYS); // Use 90 days for sales velocity

    // Get vendors to analyze
    const vendors = vendorId 
      ? [await storage.getVendor(vendorId)].filter(Boolean)
      : await storage.getStoreVendors(storeId);

    // PERFORMANCE FIX: Collect all product IDs upfront to eliminate N+1 queries
    const allProducts = new Map<string, Product[]>();
    const allProductIds: string[] = [];
    
    for (const vendor of vendors) {
      if (!vendor) continue;
      const products = await storage.getVendorProducts(vendor.id);
      allProducts.set(vendor.id, products);
      allProductIds.push(...products.map(p => p.id));
    }

    // PERFORMANCE FIX: Batch fetch all inventory levels at once
    const inventoryLevels = await storage.getInventoryLevelsForProducts(allProductIds);

    const recommendations: ReorderRecommendation[] = [];

    for (const vendor of vendors) {
      if (!vendor) continue;

      const products = allProducts.get(vendor.id) || [];
      const orderItems = await storage.getVendorOrderItemsInDateRange(
        storeId, 
        vendor.id, 
        startDate, 
        endDate
      );

      // INTEGRATION FIX: Use new vendor-specific lead time method
      const leadTimeDays = this.getVendorLeadTime(vendor);

      for (const product of products) {
        // PERFORMANCE FIX: Use batch-fetched inventory level (no await in loop)
        const currentInventory = inventoryLevels.get(product.id) || 0;
        
        // Calculate average daily sales
        const productSales = orderItems
          .filter(item => item.productId === product.id)
          .reduce((sum, item) => sum + (item.quantity || 0), 0);
        
        const averageDailySales = productSales / TIME_PERIODS.NINETY_DAYS;
        
        // Skip if no sales history
        if (averageDailySales === 0) continue;

        // INTEGRATION FIX: Proper seasonality integration with current date
        const safetyStockFactor = this.getSafetyStockFactor(new Date());
        const safetyStock = Math.ceil(averageDailySales * 7 * safetyStockFactor); // 1 week of safety stock

        // Calculate reorder point using vendor-specific lead time and seasonal safety stock
        const reorderPoint = Math.ceil((averageDailySales * leadTimeDays) + safetyStock);
        
        // Calculate days of inventory remaining
        const daysOfInventoryRemaining = averageDailySales > 0 
          ? Math.floor(currentInventory / averageDailySales) 
          : 999;

        // Determine urgency based on reorder point
        let urgency: 'critical' | 'urgent' | 'moderate' | 'good';
        if (currentInventory <= reorderPoint * 0.5) {
          urgency = 'critical';
        } else if (currentInventory <= reorderPoint) {
          urgency = 'urgent';
        } else if (currentInventory <= reorderPoint * 1.5) {
          urgency = 'moderate';
        } else {
          urgency = 'good';
        }

        // Calculate recommended order quantity (Economic Order Quantity simplified)
        // Consider lead time and safety factors in order quantity
        const recommendedOrderQuantity = Math.max(
          Math.ceil(averageDailySales * (leadTimeDays + 30)), // Lead time + 30 days worth
          reorderPoint
        );

        // Estimate stockout date
        let estimatedStockoutDate: Date | undefined;
        if (averageDailySales > 0 && currentInventory <= reorderPoint) {
          estimatedStockoutDate = new Date();
          estimatedStockoutDate.setDate(estimatedStockoutDate.getDate() + daysOfInventoryRemaining);
        }

        recommendations.push({
          productId: product.id,
          vendorId: vendor.id,
          productTitle: product.title,
          currentInventory,
          reorderPoint,
          recommendedOrderQuantity,
          daysOfInventoryRemaining,
          safetyStock,
          averageDailySales,
          leadTimeDays,
          urgency,
          estimatedStockoutDate
        });
      }
    }

    // Sort by urgency (critical first)
    const urgencyOrder = { critical: 0, urgent: 1, moderate: 2, good: 3 };
    recommendations.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

    return recommendations;
  }

  /**
   * 4. PROFITABILITY INTELLIGENCE
   */
  async getProfitabilityAnalysis(
    storeId: string,
    vendorId?: string,
    userId?: string
  ): Promise<ProfitabilityAnalysis[]> {
    // Check for demo mode and return demo data
    if (isDemoMode(userId) || storeId === "c15b4e68-ea15-4036-a5f7-cdce20d2baa7") {
      return this.getDemoProfitabilityAnalysis(vendorId);
    }
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - TIME_PERIODS.NINETY_DAYS);

    // Get vendors to analyze
    const vendors = vendorId 
      ? [await storage.getVendor(vendorId)].filter(Boolean)
      : await storage.getStoreVendors(storeId);

    const profitabilityResults: ProfitabilityAnalysis[] = [];

    for (const vendor of vendors) {
      if (!vendor) continue;

      const products = await storage.getVendorProducts(vendor.id);
      const orderItems = await storage.getVendorOrderItemsInDateRange(
        storeId, 
        vendor.id, 
        startDate, 
        endDate
      );

      // Calculate inventory metrics
      let totalInventoryValue = 0;
      let totalInventoryCost = 0;
      let totalSalesValue = 0;
      let totalCOGS = 0;
      const categoryBreakdown: Map<string, {
        inventoryValue: number;
        marginPercentage: number;
        turnRate: number;
        salesValue: number;
        cogs: number;
      }> = new Map();

      for (const product of products) {
        const currentInventory = await this.getCurrentInventory(product.id);
        const productPrice = parseFloat(product.price || "0");
        const productCost = productPrice * 0.6; // Assume 40% margin for demo
        const inventoryValue = currentInventory * productPrice;
        const inventoryCost = currentInventory * productCost;

        totalInventoryValue += inventoryValue;
        totalInventoryCost += inventoryCost;

        // Calculate sales for this product
        const productSales = orderItems
          .filter(item => item.productId === product.id)
          .reduce((sum, item) => {
            const itemPrice = parseFloat(item.price || "0");
            const quantity = item.quantity || 0;
            return sum + (itemPrice * quantity);
          }, 0);

        const productCOGS = productSales * 0.6; // Same margin assumption
        totalSalesValue += productSales;
        totalCOGS += productCOGS;

        // Category breakdown
        const category = product.productType || 'Uncategorized';
        const existing = categoryBreakdown.get(category) || {
          inventoryValue: 0,
          marginPercentage: 0,
          turnRate: 0,
          salesValue: 0,
          cogs: 0
        };

        existing.inventoryValue += inventoryValue;
        existing.salesValue += productSales;
        existing.cogs += productCOGS;
        categoryBreakdown.set(category, existing);
      }

      // Calculate profitability metrics
      const averageMarginPercentage = totalSalesValue > 0 
        ? ((totalSalesValue - totalCOGS) / totalSalesValue) * 100 
        : 0;

      const inventoryTurnRate = totalInventoryCost > 0 
        ? (totalCOGS / totalInventoryCost) * (365 / TIME_PERIODS.NINETY_DAYS) // Annualized
        : 0;

      const roiPercentage = totalInventoryCost > 0 
        ? ((totalSalesValue - totalCOGS) / totalInventoryCost) * 100 * (365 / TIME_PERIODS.NINETY_DAYS) // Annualized
        : 0;

      // Dead stock cost calculation
      const deadStockAnalysis = await this.getDeadStockAnalysis(storeId, vendor.id);
      const deadStockCost = deadStockAnalysis[0]?.totalDeadStockValue || 0;

      // Carrying cost (2% per month is industry average)
      const carryingCostPerDay = totalInventoryValue * 0.02 / 30;
      const monthlyCarryingCost = carryingCostPerDay * 30;

      // Profitability score (0-100)
      const profitabilityScore = Math.min(100, Math.max(0, 
        (averageMarginPercentage * 0.4) + 
        (Math.min(inventoryTurnRate * 10, 50) * 0.4) + 
        (Math.max(0, 100 - (deadStockCost / totalInventoryValue * 100)) * 0.2)
      ));

      // Generate recommendations
      const recommendations: ProfitabilityAnalysis['recommendations'] = [];
      
      if (inventoryTurnRate < 4) {
        recommendations.push({
          type: 'reorder',
          message: 'Low inventory turnover - consider reducing order quantities',
          impact: monthlyCarryingCost * 0.3
        });
      }
      
      if (deadStockCost > totalInventoryValue * 0.15) {
        recommendations.push({
          type: 'clearance',
          message: 'High dead stock levels - implement clearance strategy',
          impact: deadStockCost * 0.7
        });
      }
      
      if (averageMarginPercentage < 25) {
        recommendations.push({
          type: 'pricing',
          message: 'Low margins - review pricing strategy or supplier costs',
          impact: totalSalesValue * 0.1
        });
      }

      // Calculate category metrics
      const categoryBreakdownArray = Array.from(categoryBreakdown.entries()).map(([category, data]) => {
        const marginPercentage = data.salesValue > 0 
          ? ((data.salesValue - data.cogs) / data.salesValue) * 100 
          : 0;
        const turnRate = data.inventoryValue > 0 
          ? (data.cogs / (data.inventoryValue * 0.6)) * (365 / TIME_PERIODS.NINETY_DAYS)
          : 0;

        return {
          productType: category,
          inventoryValue: data.inventoryValue,
          marginPercentage,
          turnRate
        };
      });

      profitabilityResults.push({
        vendorId: vendor.id,
        vendorName: vendor.name,
        totalInventoryValue,
        totalInventoryCost,
        averageMarginPercentage,
        inventoryTurnRate,
        roiPercentage,
        deadStockCost,
        carryingCostPerDay,
        monthlyCarryingCost,
        profitabilityScore,
        recommendations,
        categoryBreakdown: categoryBreakdownArray
      });
    }

    return profitabilityResults;
  }

  /**
   * UPDATE INVENTORY ANALYTICS
   * Process and update inventory analytics data
   */
  async updateInventoryAnalytics(storeId: string, userId?: string): Promise<{ processed: number; updated: number }> {
    // In demo mode, simulate the update process
    if (isDemoMode(userId) || storeId === "c15b4e68-ea15-4036-a5f7-cdce20d2baa7") {
      return { processed: 25, updated: 25 }; // Simulate processing demo products
    }
    const vendors = await storage.getStoreVendors(storeId);
    let processed = 0;
    let updated = 0;

    for (const vendor of vendors) {
      const products = await storage.getVendorProducts(vendor.id);
      
      // Calculate vendor summary
      let totalProducts = products.length;
      let activeProducts = 0;
      let deadStockCount = 0;
      let totalSellThroughRate = 0;
      let totalInventoryValue = 0;

      for (const product of products) {
        processed++;

        // Get current metrics
        const sellThroughRate = await this.calculateProductSellThroughRate(
          storeId, 
          product.id, 
          TIME_PERIODS.THIRTY_DAYS
        );
        
        const daysOfInventory = await this.calculateDaysOfInventory(product.id);
        const reorderPoint = await this.calculateReorderPoint(storeId, product.id);
        const currentInventory = await this.getCurrentInventory(product.id);
        const deadStockFlag = sellThroughRate === 0 && currentInventory > 0;
        const marginPercentage = 40; // Demo value

        // Update individual product analytics
        await storage.upsertInventoryAnalytics({
          productId: product.id,
          vendorId: vendor.id,
          storeId: storeId,
          sellThroughRate: sellThroughRate.toString(),
          daysOfInventory,
          reorderPoint,
          deadStockFlag,
          marginPercentage: marginPercentage.toString()
        });

        // Accumulate for vendor summary
        if (currentInventory > 0) activeProducts++;
        if (deadStockFlag) deadStockCount++;
        totalSellThroughRate += sellThroughRate;
        totalInventoryValue += currentInventory * parseFloat(product.price || "0");
        updated++;
      }

      // Update vendor inventory summary
      await storage.upsertVendorInventorySummary({
        vendorId: vendor.id,
        storeId: storeId,
        totalProducts,
        activeProducts,
        deadStockCount,
        avgSellThroughRate: products.length > 0 ? (totalSellThroughRate / products.length).toString() : "0",
        totalInventoryValue: totalInventoryValue.toString()
      });
    }

    return { processed, updated };
  }

  // Helper methods
  private async getCurrentInventory(productId: string): Promise<number> {
    // In demo mode, return simulated inventory levels
    if (isDemoMode()) {
      // Generate consistent but varied inventory levels based on product ID
      const hash = this.hashCode(productId);
      return Math.abs(hash % 200) + 10; // 10-209 units
    }
    
    // In real implementation, this would query actual inventory levels
    // from Shopify or inventory management system
    return 50; // Placeholder for real implementation
  }

  private async getDaysInStock(productId: string): Promise<number> {
    // Demo implementation - in reality would track actual stock dates
    const hash = this.hashCode(productId);
    return Math.abs(hash % 365) + 30; // 30-394 days
  }

  private async getLastSaleDate(productId: string): Promise<Date | undefined> {
    // Demo implementation - in reality would query last sale from orders
    const daysAgo = Math.floor(Math.random() * 120) + 30; // 30-149 days ago
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date;
  }

  private getSafetyStockFactor(date: Date): number {
    const month = date.getMonth();
    // Seasonal adjustments (November-December high season for retail)
    if (month >= 10 || month <= 1) return SAFETY_STOCK_FACTORS.HIGH_SEASON;
    if (month >= 2 && month <= 4) return SAFETY_STOCK_FACTORS.LOW_SEASON;
    return SAFETY_STOCK_FACTORS.MEDIUM_SEASON;
  }

  private async calculateProductSellThroughRate(
    storeId: string, 
    productId: string, 
    periodDays: number
  ): Promise<number> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - periodDays);

    // Get product from storage
    const inventoryAnalytics = await storage.getInventoryAnalytics(storeId, {
      productId,
      page: 1,
      limit: 1
    });

    if (inventoryAnalytics.data.length > 0) {
      return parseFloat(inventoryAnalytics.data[0].sellThroughRate || "0");
    }

    // Calculate if not cached - this is a simplified version
    const currentInventory = await this.getCurrentInventory(productId);
    const simulatedSales = Math.floor(Math.random() * currentInventory * 0.5); // Demo logic
    const totalAvailable = currentInventory + simulatedSales;
    
    return totalAvailable > 0 ? simulatedSales / totalAvailable : 0;
  }

  private async calculateDaysOfInventory(productId: string): Promise<number> {
    const currentInventory = await this.getCurrentInventory(productId);
    const avgDailySales = Math.max(1, Math.floor(Math.random() * 5) + 1); // Demo: 1-5 units/day
    return Math.floor(currentInventory / avgDailySales);
  }

  private async calculateReorderPoint(storeId: string, productId: string): Promise<number> {
    try {
      // Get all products and filter for this specific product ID
      // TODO: Add getProduct(id) method to storage for better performance
      const allProducts = await storage.getStoreProducts(storeId, { page: 1, limit: 1000 });
      const product = allProducts.data.find(p => p.id === productId);
      
      let vendor: any = null;
      if (product && product.vendorId) {
        vendor = await storage.getVendor(product.vendorId);
      }
      
      // Calculate average daily sales from order history (last 60 days)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 60);
      
      const orderItems = await storage.getVendorOrderItemsInDateRange(
        storeId, 
        product?.vendorId || '', 
        startDate, 
        endDate
      );
      
      const productSales = orderItems
        .filter(item => item.productId === productId)
        .reduce((sum, item) => sum + (item.quantity || 0), 0);
      
      const daysPeriod = 60;
      const avgDailySales = Math.max(0.1, productSales / daysPeriod);
      
      // Get vendor-specific lead time or use default
      const leadTimeDays = this.getVendorLeadTime(vendor) || DEFAULT_LEAD_TIMES.Default;
      
      // Apply seasonal safety stock factors based on current month
      const safetyStockFactor = this.getSafetyStockFactor();
      const baseSafetyStock = avgDailySales * 7; // 1 week base safety stock
      const seasonalSafetyStock = Math.ceil(baseSafetyStock * safetyStockFactor);
      
      // Calculate reorder point: (avg daily sales × lead time) + seasonal safety stock
      const reorderPoint = Math.ceil((avgDailySales * leadTimeDays) + seasonalSafetyStock);
      
      return Math.max(1, reorderPoint); // Ensure minimum of 1
    } catch (error) {
      console.error('Error calculating reorder point:', error);
      // Fallback to reasonable default
      return 20;
    }
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }

  // ============= DEMO DATA METHODS =============
  
  private getDemoSellThroughAnalysis(vendorId?: string, period: number = TIME_PERIODS.THIRTY_DAYS): SellThroughAnalysis[] {
    const demoVendors = vendorId 
      ? [{ id: vendorId, name: 'Demo Vendor' }]
      : [
          { id: 'vendor_1', name: 'Nike' },
          { id: 'vendor_2', name: 'Adidas' },
          { id: 'vendor_3', name: 'Under Armour' },
          { id: 'vendor_4', name: 'Puma' },
          { id: 'vendor_5', name: 'New Balance' }
        ];

    return demoVendors.map((vendor, index) => {
      const baseRate = 0.3 + (index * 0.15); // Vary performance by vendor
      const totalUnitsAvailable = 500 + (index * 200);
      const totalUnitsSold = Math.floor(totalUnitsAvailable * baseRate);
      
      let velocity: 'fast' | 'moderate' | 'slow' | 'dead';
      if (baseRate >= VELOCITY_THRESHOLDS.FAST_MOVING) velocity = 'fast';
      else if (baseRate >= VELOCITY_THRESHOLDS.MODERATE) velocity = 'moderate';
      else if (baseRate >= VELOCITY_THRESHOLDS.SLOW_MOVING) velocity = 'slow';
      else velocity = 'dead';

      const topProducts = [
        { productId: `prod_${vendor.id}_1`, title: `${vendor.name} Air Max`, sellThroughRate: baseRate + 0.2, unitsSold: 45, unitsAvailable: 60 },
        { productId: `prod_${vendor.id}_2`, title: `${vendor.name} Training Shirt`, sellThroughRate: baseRate + 0.1, unitsSold: 38, unitsAvailable: 50 },
        { productId: `prod_${vendor.id}_3`, title: `${vendor.name} Leggings`, sellThroughRate: baseRate, unitsSold: 30, unitsAvailable: 45 },
      ];

      const worstProducts = [
        { productId: `prod_${vendor.id}_10`, title: `${vendor.name} Old Model`, sellThroughRate: 0.1, unitsSold: 5, unitsAvailable: 50 },
        { productId: `prod_${vendor.id}_11`, title: `${vendor.name} Clearance Item`, sellThroughRate: 0.05, unitsSold: 2, unitsAvailable: 40 },
      ];

      return {
        vendorId: vendor.id,
        vendorName: vendor.name,
        period,
        sellThroughRate: baseRate,
        totalUnitsAvailable,
        totalUnitsSold,
        inventoryVelocity: velocity,
        topPerformingProducts: topProducts,
        worstPerformingProducts: worstProducts
      };
    });
  }

  private getDemoDeadStockAnalysis(vendorId?: string, deadStockPeriod: number = TIME_PERIODS.NINETY_DAYS): DeadStockAnalysis[] {
    const demoVendors = vendorId 
      ? [{ id: vendorId, name: 'Demo Vendor' }]
      : [
          { id: 'vendor_1', name: 'Nike' },
          { id: 'vendor_2', name: 'Adidas' },
          { id: 'vendor_3', name: 'Under Armour' },
          { id: 'vendor_4', name: 'Puma' },
          { id: 'vendor_5', name: 'New Balance' }
        ];

    return demoVendors.map((vendor, index) => {
      const deadStockProducts = [
        {
          productId: `prod_${vendor.id}_dead_1`,
          title: `${vendor.name} Discontinued Model`,
          daysInStock: 180 + (index * 30),
          currentInventory: 25,
          costValue: 1250.0,
          lastSaleDate: new Date(Date.now() - ((180 + index * 30) * 24 * 60 * 60 * 1000)),
          recommendedAction: 'liquidate' as const
        },
        {
          productId: `prod_${vendor.id}_dead_2`,
          title: `${vendor.name} Seasonal Item`,
          daysInStock: 120,
          currentInventory: 15,
          costValue: 675.0,
          lastSaleDate: new Date(Date.now() - (120 * 24 * 60 * 60 * 1000)),
          recommendedAction: 'clearance' as const
        }
      ];

      const totalDeadStockValue = deadStockProducts.reduce((sum, product) => sum + product.costValue, 0);
      const deadStockPercentage = 15 + (index * 5); // Vary by vendor

      return {
        vendorId: vendor.id,
        vendorName: vendor.name,
        deadStockProducts,
        totalDeadStockValue,
        deadStockPercentage,
        recommendations: [
          'Consider liquidation sales for items over 6 months old',
          'Review purchasing patterns to avoid future dead stock',
          'Implement automated reorder points'
        ]
      };
    });
  }

  private getDemoReorderRecommendations(vendorId?: string): ReorderRecommendation[] {
    const demoProducts = [
      {
        productId: 'prod_nike_1',
        vendorId: 'vendor_1',
        productTitle: 'Nike Air Max 270',
        currentInventory: 12,
        reorderPoint: 25,
        recommendedOrderQuantity: 100,
        daysOfInventoryRemaining: 8,
        safetyStock: 15,
        averageDailySales: 1.5,
        leadTimeDays: 14,
        urgency: 'critical' as const,
        estimatedStockoutDate: new Date(Date.now() + (8 * 24 * 60 * 60 * 1000))
      },
      {
        productId: 'prod_adidas_1',
        vendorId: 'vendor_2',
        productTitle: 'Adidas Ultraboost 22',
        currentInventory: 35,
        reorderPoint: 30,
        recommendedOrderQuantity: 75,
        daysOfInventoryRemaining: 23,
        safetyStock: 20,
        averageDailySales: 1.2,
        leadTimeDays: 14,
        urgency: 'urgent' as const,
        estimatedStockoutDate: new Date(Date.now() + (23 * 24 * 60 * 60 * 1000))
      },
      {
        productId: 'prod_puma_1',
        vendorId: 'vendor_4',
        productTitle: 'Puma RS-X',
        currentInventory: 45,
        reorderPoint: 40,
        recommendedOrderQuantity: 60,
        daysOfInventoryRemaining: 37,
        safetyStock: 25,
        averageDailySales: 1.0,
        leadTimeDays: 12,
        urgency: 'moderate' as const
      }
    ];

    return vendorId 
      ? demoProducts.filter(product => product.vendorId === vendorId)
      : demoProducts;
  }

  private getDemoProfitabilityAnalysis(vendorId?: string): ProfitabilityAnalysis[] {
    const demoVendors = vendorId 
      ? [{ id: vendorId, name: 'Demo Vendor' }]
      : [
          { id: 'vendor_1', name: 'Nike' },
          { id: 'vendor_2', name: 'Adidas' },
          { id: 'vendor_3', name: 'Under Armour' },
          { id: 'vendor_4', name: 'Puma' },
          { id: 'vendor_5', name: 'New Balance' }
        ];

    return demoVendors.map((vendor, index) => {
      const totalInventoryValue = 50000 + (index * 15000);
      const totalInventoryCost = totalInventoryValue * 0.6; // 40% margin
      const averageMarginPercentage = 38 + (index * 2); // Vary margins
      const inventoryTurnRate = 4.2 + (index * 0.3);
      const roiPercentage = (averageMarginPercentage * inventoryTurnRate) / 100;
      const deadStockCost = totalInventoryCost * (0.05 + index * 0.02);
      const carryingCostPerDay = totalInventoryValue * 0.0003; // 11% annual carrying cost
      const monthlyCarryingCost = carryingCostPerDay * 30;
      const profitabilityScore = Math.min(100, roiPercentage * 10 + averageMarginPercentage);

      return {
        vendorId: vendor.id,
        vendorName: vendor.name,
        totalInventoryValue,
        totalInventoryCost,
        averageMarginPercentage,
        inventoryTurnRate,
        roiPercentage,
        deadStockCost,
        carryingCostPerDay,
        monthlyCarryingCost,
        profitabilityScore,
        recommendations: [
          {
            type: 'reorder' as const,
            message: `Increase order frequency for fast-moving ${vendor.name} products`,
            impact: 2500
          },
          {
            type: 'clearance' as const,
            message: `Clear slow-moving inventory to reduce carrying costs`,
            impact: 1200
          }
        ],
        categoryBreakdown: [
          {
            productType: 'Sneakers',
            inventoryValue: totalInventoryValue * 0.6,
            marginPercentage: averageMarginPercentage + 5,
            turnRate: inventoryTurnRate + 1
          },
          {
            productType: 'Apparel',
            inventoryValue: totalInventoryValue * 0.4,
            marginPercentage: averageMarginPercentage - 3,
            turnRate: inventoryTurnRate - 0.5
          }
        ]
      };
    });
  }
}

export const inventoryService = new InventoryService();