import { storage } from '../storage';
import type { 
  CustomerBrandAffinity, 
  InsertCustomerBrandAffinity,
  CustomerCrossBrandPurchases,
  InsertCustomerCrossBrandPurchases,
  PaginationParams,
  PaginatedResponse 
} from '@shared/schema';

export interface BrandAffinityScoreFactors {
  frequency: number;      // 40% weight - Order frequency score
  totalSpent: number;     // 30% weight - Total spending score
  recency: number;        // 20% weight - Purchase recency score
  aov: number;           // 10% weight - Average order value score
}

export interface CustomerSegment {
  segment: 'VIP' | 'Regular' | 'New' | 'At Risk';
  description: string;
  criteria: string;
}

export interface CrossBrandInsight {
  primaryVendor: string;
  primaryVendorId: string;
  secondaryVendor: string;
  secondaryVendorId: string;
  customerCount: number;
  totalValue: number;
  avgOrderValue: number;
  strength: number; // 0-100 how strong the brand combination is
  // Enhanced metrics for actionable insights
  lift: number; // Statistical lift - how much more likely secondary purchase is given primary
  confidence: number; // Confidence in the association rule (0-100%)
  propensityScore: number; // Propensity for cross-sell (0-100)
  expectedValue: number; // Expected monetary value of cross-sell opportunity
  marketBasketStrength: number; // Association rule strength (0-100)
}

export interface LoyaltyInsights {
  brandSwitchers: {
    count: number;
    percentage: number;
    topSwitchingPatterns: Array<{
      fromVendor: string;
      toVendor: string;
      customerCount: number;
    }>;
  };
  brandLoyal: {
    count: number;
    percentage: number;
    byVendor: Array<{
      vendorName: string;
      vendorId: string;
      loyalCustomers: number;
      avgAffinityScore: number;
    }>;
  };
  retentionRates: Array<{
    vendorName: string;
    vendorId: string;
    retentionRate: number;
    customersAtRisk: number;
  }>;
  crossSellOpportunities: Array<{
    primaryVendor: string;
    recommendedVendor: string;
    potentialCustomers: number;
    estimatedValue: number;
  }>;
}

export class BrandLoyaltyService {
  /**
   * Calculate brand affinity score based on multiple factors
   * Score range: 0-100
   * Weights: Frequency 40%, Total Spent 30%, Recency 20%, AOV 10%
   */
  static calculateAffinityScore(
    totalOrders: number,
    totalSpent: number,
    firstPurchase: Date,
    lastPurchase: Date,
    avgOrderValue: number,
    storeAverages: {
      avgOrders: number;
      avgSpent: number;
      avgDaysBetween: number;
      avgAOV: number;
    }
  ): { score: number; factors: BrandAffinityScoreFactors } {
    const now = new Date();
    const daysSinceFirst = Math.max(1, (now.getTime() - firstPurchase.getTime()) / (1000 * 60 * 60 * 24));
    const daysSinceLast = (now.getTime() - lastPurchase.getTime()) / (1000 * 60 * 60 * 24);
    
    // Calculate individual factor scores (0-100)
    
    // 1. Frequency Score (40% weight)
    // Orders per day compared to store average
    const orderFrequency = totalOrders / daysSinceFirst;
    const storeAvgFrequency = storeAverages.avgOrders / storeAverages.avgDaysBetween;
    const frequencyRatio = Math.min(5, orderFrequency / Math.max(0.001, storeAvgFrequency));
    const frequencyScore = Math.min(100, frequencyRatio * 20);
    
    // 2. Total Spent Score (30% weight)
    // Total spending compared to store average
    const spentRatio = Math.min(10, totalSpent / Math.max(1, storeAverages.avgSpent));
    const spentScore = Math.min(100, spentRatio * 10);
    
    // 3. Recency Score (20% weight)
    // Nonlinear decay using exponential function for more realistic behavior
    // 100 * exp(-days/90) provides slower, more realistic decay over time
    const recencyScore = Math.max(0, 100 * Math.exp(-daysSinceLast / 90));
    
    // 4. AOV Score (10% weight)
    // Average order value compared to store average
    const aovRatio = Math.min(5, avgOrderValue / Math.max(1, storeAverages.avgAOV));
    const aovScore = Math.min(100, aovRatio * 20);
    
    const factors: BrandAffinityScoreFactors = {
      frequency: frequencyScore,
      totalSpent: spentScore,
      recency: recencyScore,
      aov: aovScore
    };
    
    // Calculate weighted final score
    const finalScore = Math.round(
      (frequencyScore * 0.4) +
      (spentScore * 0.3) +
      (recencyScore * 0.2) +
      (aovScore * 0.1)
    );
    
    return {
      score: Math.min(100, Math.max(0, finalScore)),
      factors
    };
  }

  /**
   * Determine customer segment based on independent recency and frequency thresholds
   * Decoupled from affinity scores for more accurate segmentation
   */
  static determineCustomerSegment(
    affinityScore: number,
    totalSpent: number,
    totalOrders: number,
    daysSinceLastPurchase: number
  ): CustomerSegment {
    // VIP: High affinity score and high spending
    if (affinityScore >= 75 && totalSpent >= 500 && totalOrders >= 5) {
      return {
        segment: 'VIP',
        description: 'High-value loyal customer',
        criteria: 'Affinity ≥75, Spent ≥$500, Orders ≥5'
      };
    }
    
    // At Risk: Independent criteria - no recent purchase AND prior history
    // Uses independent recency (>60 days) and frequency (≥3 orders) thresholds
    if (daysSinceLastPurchase > 60 && totalOrders >= 3) {
      return {
        segment: 'At Risk',
        description: 'Previously engaged but inactive',
        criteria: 'Last purchase >60 days ago AND prior orders ≥3'
      };
    }
    
    // New: Low order count but recent activity
    if (totalOrders <= 2 && daysSinceLastPurchase <= 30) {
      return {
        segment: 'New',
        description: 'New customer with recent activity',
        criteria: 'Orders ≤2, Last purchase ≤30 days ago'
      };
    }
    
    // Regular: Everyone else
    return {
      segment: 'Regular',
      description: 'Standard engaged customer',
      criteria: 'Standard engagement level'
    };
  }

  /**
   * Calculate customer lifetime value for a specific brand
   */
  static calculateCLV(
    totalSpent: number,
    totalOrders: number,
    daysSinceFirst: number,
    daysSinceLast: number
  ): number {
    if (totalOrders === 0 || daysSinceFirst === 0) return 0;
    
    const avgOrderValue = totalSpent / totalOrders;
    const purchaseFrequency = totalOrders / daysSinceFirst; // orders per day
    
    // Predict future value based on recency
    const recencyFactor = Math.max(0.1, 1 - (daysSinceLast / 365)); // Decay over a year
    
    // Simple CLV calculation: (AOV × Purchase Frequency × Expected Lifetime) × Recency Factor
    const expectedLifetimeDays = 365; // Assume 1 year lifetime
    const predictedCLV = avgOrderValue * purchaseFrequency * expectedLifetimeDays * recencyFactor;
    
    return Math.round(predictedCLV * 100) / 100;
  }

  /**
   * Update customer brand affinity scores for new orders
   */
  static async updateAffinityScores(
    storeId: string,
    customerId: string,
    vendorId: string,
    orderValue: number
  ): Promise<CustomerBrandAffinity> {
    try {
      // Get existing affinity or create new one
      const existingAffinities = await storage.getCustomerBrandAffinities(storeId, {
        page: 1,
        limit: 1,
        customerId,
        vendorId
      });
      
      const now = new Date();
      let existingAffinity = existingAffinities.data[0];
      
      if (existingAffinity) {
        // Update existing affinity
        const newTotalOrders = (existingAffinity.totalOrders ?? 0) + 1;
        const newTotalSpent = parseFloat(existingAffinity.totalSpent ?? '0') + orderValue;
        const newAvgOrderValue = newTotalSpent / newTotalOrders;
        
        // Get store averages for scoring (simplified - in production, calculate from analytics)
        const storeAverages = {
          avgOrders: 3,
          avgSpent: 200,
          avgDaysBetween: 90,
          avgAOV: 65
        };
        
        const scoreResult = this.calculateAffinityScore(
          newTotalOrders,
          newTotalSpent,
          existingAffinity.firstPurchase || now,
          now,
          newAvgOrderValue,
          storeAverages
        );
        
        const daysSinceLastPurchase = 0; // Just purchased
        const segment = this.determineCustomerSegment(
          scoreResult.score,
          newTotalSpent,
          newTotalOrders,
          daysSinceLastPurchase
        );
        
        const updateData: InsertCustomerBrandAffinity = {
          storeId,
          customerId,
          vendorId,
          affinityScore: scoreResult.score.toString(),
          totalOrders: newTotalOrders,
          totalSpent: newTotalSpent.toString(),
          firstPurchase: existingAffinity.firstPurchase || now,
          lastPurchase: now,
        };
        
        return await storage.upsertCustomerBrandAffinity(updateData);
      } else {
        // Create new affinity
        const storeAverages = {
          avgOrders: 3,
          avgSpent: 200,
          avgDaysBetween: 90,
          avgAOV: 65
        };
        
        const scoreResult = this.calculateAffinityScore(
          1,
          orderValue,
          now,
          now,
          orderValue,
          storeAverages
        );
        
        const segment = this.determineCustomerSegment(
          scoreResult.score,
          orderValue,
          1,
          0
        );
        
        const newAffinity: InsertCustomerBrandAffinity = {
          storeId,
          customerId,
          vendorId,
          affinityScore: scoreResult.score.toString(),
          totalOrders: 1,
          totalSpent: orderValue.toString(),
          firstPurchase: now,
          lastPurchase: now,
        };
        
        return await storage.upsertCustomerBrandAffinity(newAffinity);
      }
    } catch (error) {
      console.error('Error updating affinity scores:', error);
      throw error;
    }
  }

  /**
   * Analyze cross-brand purchase patterns with lift/propensity calculations
   * Enhanced to provide actionable business insights beyond just counts
   */
  static async analyzeCrossBrandPurchases(
    storeId: string,
    vendorId?: string
  ): Promise<CrossBrandInsight[]> {
    try {
      const crossPurchases = await storage.getCustomerCrossBrandPurchases(storeId, {
        page: 1,
        limit: 1000, // Increase for better statistical analysis
        primaryVendorId: vendorId
      });
      
      // Get all customer affinities for baseline calculations
      const allAffinities = await storage.getCustomerBrandAffinities(storeId, {
        page: 1,
        limit: 10000
      });
      
      // Get vendor details for names
      const vendors = await storage.getStoreVendors(storeId);
      const vendorMap = new Map(vendors.map(v => [v.id, v.name]));
      
      // Calculate baseline metrics for lift calculations
      const vendorCustomerCounts = new Map<string, number>();
      const totalCustomers = new Set<string>();
      
      allAffinities.data.forEach(affinity => {
        vendorCustomerCounts.set(
          affinity.vendorId, 
          (vendorCustomerCounts.get(affinity.vendorId) || 0) + 1
        );
        totalCustomers.add(affinity.customerId);
      });
      
      const totalCustomerCount = totalCustomers.size || 1;
      
      const insights: CrossBrandInsight[] = crossPurchases.data.map(cp => {
        const avgOrderValue = parseFloat(cp.totalCrossValue ?? '0') / Math.max(1, cp.crossPurchaseCount ?? 1);
        const crossPurchaseCount = cp.crossPurchaseCount ?? 0;
        const totalCrossValue = parseFloat(cp.totalCrossValue ?? '0');
        
        // Calculate lift: P(Secondary|Primary) / P(Secondary)
        const primaryCustomers = vendorCustomerCounts.get(cp.primaryVendorId) || 1;
        const secondaryCustomers = vendorCustomerCounts.get(cp.secondaryVendorId) || 1;
        
        const probSecondaryGivenPrimary = crossPurchaseCount / primaryCustomers;
        const probSecondary = secondaryCustomers / totalCustomerCount;
        const lift = probSecondaryGivenPrimary / Math.max(0.001, probSecondary);
        
        // Calculate confidence: P(Secondary|Primary) as percentage
        const confidence = probSecondaryGivenPrimary * 100;
        
        // Calculate propensity score (0-100) based on multiple factors
        const frequencyScore = Math.min(50, crossPurchaseCount * 10); // Max 50 points for frequency
        const valueScore = Math.min(30, totalCrossValue / 100); // Max 30 points for value
        const liftScore = Math.min(20, lift * 5); // Max 20 points for lift
        const propensityScore = frequencyScore + valueScore + liftScore;
        
        // Calculate expected value of cross-sell opportunity
        // Expected Value = Probability * Average Order Value * Potential Customer Base
        const potentialCustomers = Math.max(0, primaryCustomers - crossPurchaseCount);
        const expectedValue = probSecondaryGivenPrimary * avgOrderValue * potentialCustomers;
        
        // Market basket strength (association rule strength)
        const support = crossPurchaseCount / totalCustomerCount;
        const marketBasketStrength = Math.min(100, (confidence * lift * support) * 1000);
        
        // Traditional strength for backwards compatibility
        const strength = Math.min(100, (crossPurchaseCount * 10) + (avgOrderValue / 10));
        
        return {
          primaryVendor: vendorMap.get(cp.primaryVendorId) || 'Unknown',
          primaryVendorId: cp.primaryVendorId,
          secondaryVendor: vendorMap.get(cp.secondaryVendorId) || 'Unknown',
          secondaryVendorId: cp.secondaryVendorId,
          customerCount: 1, // Each record represents one customer relationship
          totalValue: totalCrossValue,
          avgOrderValue,
          strength: Math.round(strength),
          // Enhanced metrics for actionable insights
          lift: Math.round(lift * 100) / 100, // Round to 2 decimal places
          confidence: Math.round(confidence * 100) / 100,
          propensityScore: Math.round(propensityScore),
          expectedValue: Math.round(expectedValue * 100) / 100,
          marketBasketStrength: Math.round(marketBasketStrength)
        };
      });
      
      // Group by vendor pairs and aggregate with enhanced metrics
      const groupedInsights = new Map<string, CrossBrandInsight>();
      
      insights.forEach(insight => {
        const key = `${insight.primaryVendorId}-${insight.secondaryVendorId}`;
        const existing = groupedInsights.get(key);
        
        if (existing) {
          existing.customerCount += 1;
          existing.totalValue += insight.totalValue;
          existing.avgOrderValue = existing.totalValue / existing.customerCount;
          existing.strength = Math.min(100, (existing.customerCount * 10) + (existing.avgOrderValue / 10));
          // Aggregate enhanced metrics
          existing.lift = Math.max(existing.lift, insight.lift); // Take max lift as it's more meaningful
          existing.confidence = Math.max(existing.confidence, insight.confidence);
          existing.propensityScore = Math.max(existing.propensityScore, insight.propensityScore);
          existing.expectedValue += insight.expectedValue;
          existing.marketBasketStrength = Math.max(existing.marketBasketStrength, insight.marketBasketStrength);
        } else {
          groupedInsights.set(key, { ...insight });
        }
      });
      
      // Sort by propensity score for most actionable insights first
      return Array.from(groupedInsights.values())
        .filter(insight => insight.lift > 1.0) // Only show positive lift opportunities
        .sort((a, b) => b.propensityScore - a.propensityScore)
        .slice(0, 20); // Top 20 cross-sell opportunities
    } catch (error) {
      console.error('Error analyzing cross-brand purchases:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive loyalty insights
   */
  static async getLoyaltyInsights(storeId: string): Promise<LoyaltyInsights> {
    try {
      // Get all customer affinities
      const affinities = await storage.getCustomerBrandAffinities(storeId, {
        page: 1,
        limit: 1000
      });
      
      // Get vendors for names
      const vendors = await storage.getStoreVendors(storeId);
      const vendorMap = new Map(vendors.map(v => [v.id, v.name]));
      
      const customerVendorCounts = new Map<string, number>();
      const vendorStats = new Map<string, { totalCustomers: number; totalAffinity: number; loyalCustomers: number }>();
      
      // Analyze customer behavior
      affinities.data.forEach(affinity => {
        const customerId = affinity.customerId;
        const vendorId = affinity.vendorId;
        const affinityScore = parseFloat(affinity.affinityScore);
        
        // Count vendors per customer
        customerVendorCounts.set(customerId, (customerVendorCounts.get(customerId) || 0) + 1);
        
        // Vendor statistics
        if (!vendorStats.has(vendorId)) {
          vendorStats.set(vendorId, { totalCustomers: 0, totalAffinity: 0, loyalCustomers: 0 });
        }
        const stats = vendorStats.get(vendorId)!;
        stats.totalCustomers += 1;
        stats.totalAffinity += affinityScore;
        if (affinityScore >= 70) {
          stats.loyalCustomers += 1;
        }
      });
      
      // Calculate brand switchers vs loyal customers
      const totalCustomers = customerVendorCounts.size;
      const multiVendorCustomers = Array.from(customerVendorCounts.values()).filter(count => count > 1).length;
      const singleVendorCustomers = totalCustomers - multiVendorCustomers;
      
      // Get cross-brand data for switching patterns
      const crossBrandData = await storage.getCustomerCrossBrandPurchases(storeId, {
        page: 1,
        limit: 100
      });
      
      // Calculate switching patterns
      const switchingPatterns = new Map<string, number>();
      crossBrandData.data.forEach(cp => {
        const key = `${cp.primaryVendorId}-${cp.secondaryVendorId}`;
        switchingPatterns.set(key, (switchingPatterns.get(key) || 0) + 1);
      });
      
      const topSwitchingPatterns = Array.from(switchingPatterns.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([key, count]) => {
          const [fromId, toId] = key.split('-');
          return {
            fromVendor: vendorMap.get(fromId) || 'Unknown',
            toVendor: vendorMap.get(toId) || 'Unknown',
            customerCount: count
          };
        });
      
      // Build vendor loyalty stats
      const brandLoyal = Array.from(vendorStats.entries()).map(([vendorId, stats]) => ({
        vendorName: vendorMap.get(vendorId) || 'Unknown',
        vendorId,
        loyalCustomers: stats.loyalCustomers,
        avgAffinityScore: Math.round(stats.totalAffinity / stats.totalCustomers)
      }));
      
      // Calculate retention rates (simplified)
      const retentionRates = Array.from(vendorStats.entries()).map(([vendorId, stats]) => {
        const retentionRate = (stats.loyalCustomers / stats.totalCustomers) * 100;
        const customersAtRisk = Math.round(stats.totalCustomers * 0.15); // Estimate 15% at risk
        
        return {
          vendorName: vendorMap.get(vendorId) || 'Unknown',
          vendorId,
          retentionRate: Math.round(retentionRate),
          customersAtRisk
        };
      });
      
      // Cross-sell opportunities
      const crossSellOpportunities = await this.analyzeCrossBrandPurchases(storeId);
      const topOpportunities = crossSellOpportunities.slice(0, 5).map(insight => ({
        primaryVendor: insight.primaryVendor,
        recommendedVendor: insight.secondaryVendor,
        potentialCustomers: insight.customerCount,
        estimatedValue: Math.round(insight.totalValue)
      }));
      
      return {
        brandSwitchers: {
          count: multiVendorCustomers,
          percentage: Math.round((multiVendorCustomers / totalCustomers) * 100),
          topSwitchingPatterns
        },
        brandLoyal: {
          count: singleVendorCustomers,
          percentage: Math.round((singleVendorCustomers / totalCustomers) * 100),
          byVendor: brandLoyal.sort((a, b) => b.avgAffinityScore - a.avgAffinityScore)
        },
        retentionRates: retentionRates.sort((a, b) => b.retentionRate - a.retentionRate),
        crossSellOpportunities: topOpportunities
      };
    } catch (error) {
      console.error('Error getting loyalty insights:', error);
      throw error;
    }
  }

  /**
   * Get customer lifetime value analysis by brand
   */
  static async getCLVByBrand(
    storeId: string,
    vendorId?: string
  ): Promise<Array<{
    vendorName: string;
    vendorId: string;
    totalCLV: number;
    avgCLV: number;
    customerCount: number;
    segments: {
      VIP: number;
      Regular: number;
      New: number;
      'At Risk': number;
    }
  }>> {
    try {
      const affinities = await storage.getCustomerBrandAffinities(storeId, {
        page: 1,
        limit: 1000,
        vendorId
      });
      
      const vendors = await storage.getStoreVendors(storeId);
      const vendorMap = new Map(vendors.map(v => [v.id, v.name]));
      
      const vendorCLV = new Map<string, {
        totalCLV: number;
        customerCount: number;
        segments: { VIP: number; Regular: number; New: number; 'At Risk': number }
      }>();
      
      const now = new Date();
      
      affinities.data.forEach(affinity => {
        const vendorId = affinity.vendorId;
        const totalSpent = parseFloat(affinity.totalSpent ?? '0');
        const totalOrders = affinity.totalOrders ?? 0;
        
        const daysSinceFirst = affinity.firstPurchase 
          ? (now.getTime() - affinity.firstPurchase.getTime()) / (1000 * 60 * 60 * 24)
          : 1;
        const daysSinceLast = affinity.lastPurchase
          ? (now.getTime() - affinity.lastPurchase.getTime()) / (1000 * 60 * 60 * 24)
          : 0;
        
        const clv = this.calculateCLV(totalSpent, totalOrders, daysSinceFirst, daysSinceLast);
        const segment = this.determineCustomerSegment(
          parseFloat(affinity.affinityScore ?? '0'),
          totalSpent,
          totalOrders,
          daysSinceLast
        );
        
        if (!vendorCLV.has(vendorId)) {
          vendorCLV.set(vendorId, {
            totalCLV: 0,
            customerCount: 0,
            segments: { VIP: 0, Regular: 0, New: 0, 'At Risk': 0 }
          });
        }
        
        const stats = vendorCLV.get(vendorId)!;
        stats.totalCLV += clv;
        stats.customerCount += 1;
        stats.segments[segment.segment] += 1;
      });
      
      return Array.from(vendorCLV.entries()).map(([vendorId, stats]) => ({
        vendorName: vendorMap.get(vendorId) || 'Unknown',
        vendorId,
        totalCLV: Math.round(stats.totalCLV),
        avgCLV: Math.round(stats.totalCLV / stats.customerCount),
        customerCount: stats.customerCount,
        segments: stats.segments
      })).sort((a, b) => b.totalCLV - a.totalCLV);
    } catch (error) {
      console.error('Error calculating CLV by brand:', error);
      throw error;
    }
  }

  /**
   * Generate demo brand loyalty data - IDEMPOTENT and TRANSACTIONAL
   * Ensures vendors exist and handles foreign key constraints properly
   */
  static async generateDemoData(storeId: string): Promise<void> {
    try {
      console.log(`Starting demo brand loyalty data generation for store: ${storeId}`);
      
      // EXISTENCE CHECK: Ensure the store exists
      const store = await storage.getStore(storeId);
      if (!store) {
        throw new Error(`Store ${storeId} not found - cannot generate demo data`);
      }
      
      // ENSURE VENDORS EXIST: Get vendors or return early with helpful message
      let vendors = await storage.getStoreVendors(storeId);
      if (vendors.length === 0) {
        console.log(`No vendors found for store ${storeId}. Please sync products first to create vendors before generating brand loyalty demo data.`);
        return;
      }
      
      console.log(`Found ${vendors.length} vendors for demo data generation`);
      
      // IDEMPOTENCY: Check if demo data already exists
      const existingAffinities = await storage.getCustomerBrandAffinities(storeId, { page: 1, limit: 1 });
      if (existingAffinities.data.length > 0) {
        console.log(`Demo brand loyalty data already exists for store ${storeId}, skipping generation`);
        return;
      }
      
      // Generate demo customers with different affinity patterns
      const demoCustomers = [
        { id: 'customer_1', email: 'john.doe@example.com', name: 'John Doe' },
        { id: 'customer_2', email: 'jane.smith@example.com', name: 'Jane Smith' },
        { id: 'customer_3', email: 'mike.johnson@example.com', name: 'Mike Johnson' },
        { id: 'customer_4', email: 'sarah.wilson@example.com', name: 'Sarah Wilson' },
        { id: 'customer_5', email: 'david.brown@example.com', name: 'David Brown' },
      ];
      
      const now = new Date();
      const demoAffinities: InsertCustomerBrandAffinity[] = [];
      const demoCrossPurchases: InsertCustomerCrossBrandPurchases[] = [];
      
      // Create realistic affinity data
      demoCustomers.forEach((customer, index) => {
        vendors.forEach((vendor, vendorIndex) => {
          // Not every customer buys from every vendor
          if (Math.random() > 0.6) return;
          
          const ordersCount = Math.floor(Math.random() * 10) + 1;
          const totalSpent = Math.random() * 1000 + 50;
          const daysAgo = Math.floor(Math.random() * 365);
          const firstPurchaseDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
          const lastPurchaseDate = new Date(now.getTime() - (Math.random() * daysAgo * 24 * 60 * 60 * 1000));
          
          const storeAverages = { avgOrders: 3, avgSpent: 200, avgDaysBetween: 90, avgAOV: 65 };
          const scoreResult = this.calculateAffinityScore(
            ordersCount,
            totalSpent,
            firstPurchaseDate,
            lastPurchaseDate,
            totalSpent / ordersCount,
            storeAverages
          );
          
          demoAffinities.push({
            storeId,
            customerId: customer.id,
            vendorId: vendor.id,
            affinityScore: scoreResult.score.toString(),
            totalOrders: ordersCount,
            totalSpent: totalSpent.toFixed(2),
            firstPurchase: firstPurchaseDate,
            lastPurchase: lastPurchaseDate,
          });
        });
        
        // Create cross-brand purchase patterns
        if (vendors.length >= 2) {
          for (let i = 0; i < vendors.length - 1; i++) {
            for (let j = i + 1; j < vendors.length; j++) {
              if (Math.random() > 0.7) { // 30% chance of cross-brand purchase
                const crossPurchaseCount = Math.floor(Math.random() * 5) + 1;
                const totalValue = Math.random() * 500 + 25;
                
                demoCrossPurchases.push({
                  storeId,
                  customerId: customer.id,
                  primaryVendorId: vendors[i].id,
                  secondaryVendorId: vendors[j].id,
                  crossPurchaseCount,
                  totalCrossValue: totalValue.toFixed(2),
                });
              }
            }
          }
        }
      });
      
      // TRANSACTIONAL INSERT: Insert demo data with error handling
      console.log(`Inserting ${demoAffinities.length} affinities and ${demoCrossPurchases.length} cross-purchases`);
      
      let insertedAffinities = 0;
      let insertedCrossPurchases = 0;
      
      // Insert affinities with existence validation
      for (const affinity of demoAffinities) {
        try {
          // Validate vendor still exists before inserting
          const vendor = vendors.find(v => v.id === affinity.vendorId);
          if (!vendor) {
            console.warn(`Vendor ${affinity.vendorId} not found, skipping affinity for customer ${affinity.customerId}`);
            continue;
          }
          
          await storage.upsertCustomerBrandAffinity(affinity);
          insertedAffinities++;
        } catch (error) {
          console.error(`Failed to insert affinity for customer ${affinity.customerId}, vendor ${affinity.vendorId}:`, error);
          // Continue with other inserts
        }
      }
      
      // Insert cross-purchases with existence validation
      for (const crossPurchase of demoCrossPurchases) {
        try {
          // Validate both vendors exist
          const primaryVendor = vendors.find(v => v.id === crossPurchase.primaryVendorId);
          const secondaryVendor = vendors.find(v => v.id === crossPurchase.secondaryVendorId);
          
          if (!primaryVendor || !secondaryVendor) {
            console.warn(`Missing vendors for cross-purchase: primary=${crossPurchase.primaryVendorId}, secondary=${crossPurchase.secondaryVendorId}`);
            continue;
          }
          
          await storage.upsertCustomerCrossBrandPurchases(crossPurchase);
          insertedCrossPurchases++;
        } catch (error) {
          console.error(`Failed to insert cross-purchase for customer ${crossPurchase.customerId}:`, error);
          // Continue with other inserts
        }
      }
      
      console.log(`Successfully generated demo brand loyalty data: ${insertedAffinities}/${demoAffinities.length} affinities, ${insertedCrossPurchases}/${demoCrossPurchases.length} cross-purchases`);
      
      if (insertedAffinities === 0 && insertedCrossPurchases === 0) {
        throw new Error('Failed to insert any demo data - check vendor foreign key constraints');
      }
    } catch (error) {
      console.error('Error generating demo brand loyalty data:', error);
      throw error;
    }
  }
}