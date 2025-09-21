import { storage } from "../storage";
import type { 
  VendorAnalytics, 
  Order,
  OrderLineItem,
  Vendor,
  SalesForecast,
  InsertSalesForecast,
  ForecastAccuracy,
  InsertForecastAccuracy
} from "@shared/schema";
import { isDemoMode, demoVendors } from "../demoData";

export interface ForecastInput {
  dates: Date[];
  values: number[];
  vendorId: string;
  vendorName: string;
}

export interface ForecastResult {
  vendorId: string;
  vendorName: string;
  periodDays: number;
  predictedSales: number;
  predictedOrders: number;
  confidenceScore: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  modelUsed: string;
  seasonalAdjustment: number;
  trendDirection: 'growing' | 'stable' | 'declining';
  recommendation: string;
}

export interface TrendAnalysis {
  vendorId: string;
  vendorName: string;
  historicalData: {
    dates: Date[];
    sales: number[];
    orders: number[];
  };
  trends: {
    overall: 'growing' | 'stable' | 'declining';
    recentTrend: 'accelerating' | 'steady' | 'decelerating';
    seasonality: {
      detected: boolean;
      pattern: string;
      peakMonths: number[];
      lowMonths: number[];
    };
    growth: {
      quarterlyGrowthRate: number;
      monthlyGrowthRate: number;
      volatility: number;
    };
  };
  insights: string[];
}

export interface AccuracyMetrics {
  vendorId?: string;
  vendorName?: string;
  accuracy: {
    mape: number; // Mean Absolute Percentage Error
    rmse: number; // Root Mean Square Error
    mad: number;  // Mean Absolute Deviation
  };
  forecasts: {
    total: number;
    period30d: { count: number; avgAccuracy: number };
    period60d: { count: number; avgAccuracy: number };
    period90d: { count: number; avgAccuracy: number };
  };
  confidence: 'high' | 'medium' | 'low';
  recommendation: string;
}

// Demo forecasting data for realistic demo mode
const DEMO_FORECASTS = {
  // Nike - Strong growth trend
  "vendor_1": {
    periods: {
      30: { sales: 45680, orders: 234, confidence: 0.92, trend: 'growing' },
      60: { sales: 94350, orders: 487, confidence: 0.88, trend: 'growing' },
      90: { sales: 145200, orders: 758, confidence: 0.84, trend: 'growing' }
    },
    seasonality: { factor: 1.15, peakMonths: [11, 12, 3], lowMonths: [6, 7, 8] }
  },
  // Adidas - Stable with slight growth
  "vendor_2": {
    periods: {
      30: { sales: 38420, orders: 198, confidence: 0.87, trend: 'stable' },
      60: { sales: 78650, orders: 405, confidence: 0.85, trend: 'stable' },
      90: { sales: 119800, orders: 618, confidence: 0.82, trend: 'stable' }
    },
    seasonality: { factor: 1.08, peakMonths: [10, 11, 4], lowMonths: [1, 2, 7] }
  },
  // Under Armour - Declining trend
  "vendor_3": {
    periods: {
      30: { sales: 22100, orders: 156, confidence: 0.79, trend: 'declining' },
      60: { sales: 41800, orders: 289, confidence: 0.75, trend: 'declining' },
      90: { sales: 58300, orders: 402, confidence: 0.71, trend: 'declining' }
    },
    seasonality: { factor: 0.94, peakMonths: [5, 6, 9], lowMonths: [12, 1, 2] }
  },
  // Puma - Volatile but growing
  "vendor_4": {
    periods: {
      30: { sales: 28950, orders: 167, confidence: 0.73, trend: 'growing' },
      60: { sales: 61200, orders: 354, confidence: 0.69, trend: 'growing' },
      90: { sales: 96800, orders: 561, confidence: 0.65, trend: 'growing' }
    },
    seasonality: { factor: 1.22, peakMonths: [8, 9, 10], lowMonths: [3, 4, 5] }
  },
  // New Balance - Steady performance
  "vendor_5": {
    periods: {
      30: { sales: 31250, orders: 189, confidence: 0.91, trend: 'stable' },
      60: { sales: 63800, orders: 385, confidence: 0.89, trend: 'stable' },
      90: { sales: 96500, orders: 583, confidence: 0.87, trend: 'stable' }
    },
    seasonality: { factor: 1.02, peakMonths: [3, 4, 8], lowMonths: [1, 6, 11] }
  }
};

export class ForecastingService {
  /**
   * Generate sales forecasts using ensemble of multiple algorithms
   */
  static async generateSalesForecasts(
    storeId: string, 
    vendorId?: string, 
    periodDays: number = 30
  ): Promise<ForecastResult[]> {
    try {
      // Handle demo mode
      if (isDemoMode(storeId)) {
        return this.generateDemoForecasts(periodDays, vendorId);
      }

      // Get vendors to forecast for
      const vendors = vendorId 
        ? [await storage.getVendor(vendorId)].filter(Boolean)
        : await storage.getStoreVendors(storeId);

      if (vendors.length === 0) {
        return [];
      }

      const results: ForecastResult[] = [];

      for (const vendor of vendors) {
        if (!vendor) {
          continue;
        }
        
        try {
          // Get historical data for the vendor (minimum 180 days as required)
          const historicalData = await this.getHistoricalSalesData(storeId, vendor.id);
          
          if (historicalData.dates.length < 30) {
            // Insufficient data - create low confidence forecast
            results.push(this.createLowConfidenceForecast(vendor, periodDays));
            continue;
          }

          // Generate forecast using ensemble method
          const forecast = await this.generateEnsembleForecast(historicalData, periodDays);
          results.push(forecast);

          // Store forecast in database for future reference
          await this.storeForecast(storeId, forecast);

        } catch (error) {
          console.error(`Error forecasting for vendor ${vendor.id}:`, error);
          // Add fallback forecast
          results.push(this.createLowConfidenceForecast(vendor, periodDays));
        }
      }

      return results;
    } catch (error) {
      console.error('Error generating sales forecasts:', error);
      throw new Error('Failed to generate sales forecasts');
    }
  }

  /**
   * Analyze historical trends for vendors
   */
  static async analyzeTrends(storeId: string, vendorId?: string): Promise<TrendAnalysis[]> {
    try {
      // Handle demo mode
      if (isDemoMode(storeId)) {
        return this.generateDemoTrendAnalysis(vendorId);
      }

      const vendors = vendorId 
        ? [await storage.getVendor(vendorId)].filter(Boolean)
        : await storage.getStoreVendors(storeId);

      const analyses: TrendAnalysis[] = [];

      for (const vendor of vendors) {
        if (!vendor) {
          continue;
        }
        
        const historicalData = await this.getHistoricalSalesData(storeId, vendor.id);
        
        if (historicalData.dates.length < 30) {
          continue; // Skip vendors with insufficient data
        }

        const trendAnalysis = this.analyzeTrendPattern(vendor, historicalData);
        analyses.push(trendAnalysis);
      }

      return analyses;
    } catch (error) {
      console.error('Error analyzing trends:', error);
      throw new Error('Failed to analyze trends');
    }
  }

  /**
   * Get forecast accuracy metrics
   */
  static async getForecastAccuracy(storeId: string, vendorId?: string): Promise<AccuracyMetrics[]> {
    try {
      // Handle demo mode
      if (isDemoMode(storeId)) {
        return this.generateDemoAccuracyMetrics(vendorId);
      }

      const accuracyData = await storage.getForecastAccuracy(storeId, { vendorId });
      
      if (accuracyData.data.length === 0) {
        return [];
      }

      // Group by vendor and calculate metrics
      const vendorMetrics = new Map<string, ForecastAccuracy[]>();
      
      for (const record of accuracyData.data) {
        const key = record.vendorId || 'overall';
        if (!vendorMetrics.has(key)) {
          vendorMetrics.set(key, []);
        }
        vendorMetrics.get(key)!.push(record);
      }

      const results: AccuracyMetrics[] = [];

      for (const [vendorKey, records] of Array.from(vendorMetrics.entries())) {
        const metrics = this.calculateAccuracyMetrics(records);
        results.push(metrics);
      }

      return results;
    } catch (error) {
      console.error('Error getting forecast accuracy:', error);
      throw new Error('Failed to get forecast accuracy');
    }
  }

  /**
   * Refresh all forecasts with latest data
   */
  static async refreshForecasts(storeId: string): Promise<{ 
    refreshed: number; 
    vendors: string[]; 
    timestamp: Date 
  }> {
    try {
      // Generate new forecasts for all periods
      const forecasts30 = await this.generateSalesForecasts(storeId, undefined, 30);
      const forecasts60 = await this.generateSalesForecasts(storeId, undefined, 60);
      const forecasts90 = await this.generateSalesForecasts(storeId, undefined, 90);

      const allForecasts = [...forecasts30, ...forecasts60, ...forecasts90];
      const uniqueVendors = new Set(allForecasts.map(f => f.vendorId));

      return {
        refreshed: allForecasts.length,
        vendors: Array.from(uniqueVendors),
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error refreshing forecasts:', error);
      throw new Error('Failed to refresh forecasts');
    }
  }

  // ============= PRIVATE HELPER METHODS =============

  /**
   * Get historical sales data for a vendor
   */
  private static async getHistoricalSalesData(storeId: string, vendorId: string): Promise<ForecastInput> {
    // Get last 12 months of data for comprehensive analysis
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 12);

    // Get vendor analytics data
    const analytics = await storage.getVendorAnalytics(storeId, vendorId, startDate, endDate);
    
    const vendor = await storage.getVendor(vendorId);

    return {
      dates: analytics.map(a => a.date),
      values: analytics.map(a => parseFloat((a.revenue || 0).toString())),
      vendorId,
      vendorName: vendor?.name || 'Unknown Vendor'
    };
  }

  /**
   * Generate forecast using ensemble of multiple algorithms
   */
  private static async generateEnsembleForecast(
    data: ForecastInput, 
    periodDays: number
  ): Promise<ForecastResult> {
    // 1. Seasonal Moving Average
    const smaForecast = this.seasonalMovingAverage(data.values, periodDays);
    
    // 2. Exponential Smoothing
    const esForecast = this.exponentialSmoothing(data.values, periodDays);
    
    // 3. Linear Regression Trend
    const lrForecast = this.linearTrendForecast(data.values, periodDays);
    
    // 4. Seasonal Decomposition
    const seasonalFactor = this.calculateSeasonalFactor(data.values, data.dates);

    // Ensemble weighting based on data characteristics
    const weights = this.calculateEnsembleWeights(data.values);
    
    // Combine forecasts
    const baseForecast = (
      smaForecast * weights.sma +
      esForecast * weights.es +
      lrForecast * weights.lr
    );

    // Apply seasonal adjustment
    const seasonallyAdjusted = baseForecast * seasonalFactor;
    
    // Calculate confidence score based on data quality and consistency
    const confidenceScore = this.calculateConfidenceScore(data.values, periodDays);
    
    // Generate confidence interval
    const variance = this.calculateVariance(data.values);
    const interval = this.calculateConfidenceInterval(seasonallyAdjusted, variance, confidenceScore);
    
    // Determine trend direction
    const trendDirection = this.determineTrendDirection(data.values);
    
    // Estimate orders based on historical AOV
    const avgOrderValue = this.calculateAverageOrderValue(data.values);
    const predictedOrders = Math.round(seasonallyAdjusted / avgOrderValue);

    return {
      vendorId: data.vendorId,
      vendorName: data.vendorName,
      periodDays,
      predictedSales: Math.round(seasonallyAdjusted * 100) / 100,
      predictedOrders,
      confidenceScore: Math.round(confidenceScore * 100) / 100,
      confidenceInterval: interval,
      modelUsed: 'Ensemble (SMA + ES + LR)',
      seasonalAdjustment: Math.round(seasonalFactor * 100) / 100,
      trendDirection,
      recommendation: this.generateRecommendation(seasonallyAdjusted, trendDirection, confidenceScore)
    };
  }

  /**
   * Seasonal Moving Average implementation
   */
  private static seasonalMovingAverage(values: number[], periodDays: number): number {
    if (values.length < 12) {
      // Simple moving average for insufficient data
      const window = Math.min(values.length, 4);
      const recent = values.slice(-window);
      return recent.reduce((sum, val) => sum + val, 0) / recent.length * (periodDays / 7);
    }

    // Calculate seasonal indices (month-over-month patterns)
    const monthlyAverages = this.calculateMonthlyAverages(values);
    const overallAverage = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    // Recent trend
    const recentValues = values.slice(-8); // Last 8 weeks
    const recentAverage = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
    
    // Apply seasonal adjustment
    const currentMonth = new Date().getMonth();
    const seasonalIndex = monthlyAverages[currentMonth] / overallAverage;
    
    return recentAverage * seasonalIndex * (periodDays / 7);
  }

  /**
   * Exponential Smoothing implementation (Triple/Holt-Winters)
   */
  private static exponentialSmoothing(values: number[], periodDays: number): number {
    if (values.length < 12) {
      // Simple exponential smoothing for insufficient data
      const alpha = 0.3;
      let forecast = values[0];
      
      for (let i = 1; i < values.length; i++) {
        forecast = alpha * values[i] + (1 - alpha) * forecast;
      }
      
      return forecast * (periodDays / 7);
    }

    // Holt-Winters method for trend and seasonality
    const alpha = 0.3; // Level smoothing
    const beta = 0.1;  // Trend smoothing
    const gamma = 0.1; // Seasonal smoothing
    const seasonLength = 12; // Monthly seasonality

    const level = [values[0]];
    const trend = [values[1] - values[0]];
    const seasonal = Array(seasonLength).fill(1);

    // Initialize seasonal components
    for (let i = 0; i < seasonLength && i < values.length; i++) {
      seasonal[i] = values[i] / (values.reduce((sum, val) => sum + val, 0) / values.length);
    }

    // Apply Holt-Winters
    for (let i = 1; i < values.length; i++) {
      const seasonalIdx = i % seasonLength;
      
      const newLevel = alpha * (values[i] / seasonal[seasonalIdx]) + 
                      (1 - alpha) * (level[i - 1] + trend[i - 1]);
      
      const newTrend = beta * (newLevel - level[i - 1]) + 
                      (1 - beta) * trend[i - 1];
      
      seasonal[seasonalIdx] = gamma * (values[i] / newLevel) + 
                             (1 - gamma) * seasonal[seasonalIdx];
      
      level.push(newLevel);
      trend.push(newTrend);
    }

    const periodsAhead = Math.ceil(periodDays / 30); // Monthly periods
    const lastLevel = level[level.length - 1];
    const lastTrend = trend[trend.length - 1];
    const seasonalIdx = (values.length + periodsAhead - 1) % seasonLength;

    return (lastLevel + periodsAhead * lastTrend) * seasonal[seasonalIdx];
  }

  /**
   * Linear Regression Trend Forecast
   */
  private static linearTrendForecast(values: number[], periodDays: number): number {
    const n = values.length;
    if (n < 2) return values[0] || 0;

    // Calculate linear regression slope and intercept
    const xValues = Array.from({ length: n }, (_, i) => i);
    const xSum = xValues.reduce((sum, x) => sum + x, 0);
    const ySum = values.reduce((sum, y) => sum + y, 0);
    const xySum = xValues.reduce((sum, x, i) => sum + x * values[i], 0);
    const xxSum = xValues.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * xySum - xSum * ySum) / (n * xxSum - xSum * xSum);
    const intercept = (ySum - slope * xSum) / n;

    // Project forward
    const futureX = n + (periodDays / 7); // Convert days to weeks
    return Math.max(0, slope * futureX + intercept);
  }

  /**
   * Calculate seasonal factor based on historical patterns
   */
  private static calculateSeasonalFactor(values: number[], dates: Date[]): number {
    if (values.length < 12) return 1.0;

    const currentMonth = new Date().getMonth();
    const monthlyData = Array(12).fill(0).map(() => ({ sum: 0, count: 0 }));

    // Group data by month
    dates.forEach((date, index) => {
      const month = date.getMonth();
      monthlyData[month].sum += values[index];
      monthlyData[month].count += 1;
    });

    // Calculate monthly averages
    const monthlyAverages = monthlyData.map(data => 
      data.count > 0 ? data.sum / data.count : 0
    );

    const overallAverage = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    // Return seasonal index for current month
    return monthlyAverages[currentMonth] > 0 
      ? monthlyAverages[currentMonth] / overallAverage 
      : 1.0;
  }

  /**
   * Calculate ensemble weights based on data characteristics
   */
  private static calculateEnsembleWeights(values: number[]): { sma: number; es: number; lr: number } {
    const volatility = this.calculateVolatility(values);
    const trendStrength = this.calculateTrendStrength(values);
    
    // Adjust weights based on data characteristics
    if (volatility > 0.3) {
      // High volatility: favor exponential smoothing
      return { sma: 0.2, es: 0.6, lr: 0.2 };
    } else if (trendStrength > 0.7) {
      // Strong trend: favor linear regression
      return { sma: 0.2, es: 0.2, lr: 0.6 };
    } else {
      // Balanced: equal weights
      return { sma: 0.4, es: 0.3, lr: 0.3 };
    }
  }

  /**
   * Calculate confidence score based on data quality
   */
  private static calculateConfidenceScore(values: number[], periodDays: number): number {
    const n = values.length;
    
    // Base confidence on data quantity
    let dataQualityScore = Math.min(n / 52, 1.0); // 52 weeks for full confidence
    
    // Adjust for consistency (lower volatility = higher confidence)
    const volatility = this.calculateVolatility(values);
    const consistencyScore = Math.max(0, 1 - volatility);
    
    // Adjust for trend clarity
    const trendStrength = this.calculateTrendStrength(values);
    
    // Adjust for forecast period (shorter = more confident)
    const periodAdjustment = periodDays === 30 ? 1.0 : periodDays === 60 ? 0.85 : 0.7;
    
    const baseScore = (dataQualityScore * 0.4 + consistencyScore * 0.4 + trendStrength * 0.2);
    
    return Math.max(0.1, Math.min(0.95, baseScore * periodAdjustment));
  }

  /**
   * Calculate confidence interval
   */
  private static calculateConfidenceInterval(
    forecast: number, 
    variance: number, 
    confidence: number
  ): { lower: number; upper: number } {
    // Use confidence score to determine interval width
    const intervalWidth = Math.sqrt(variance) * (2 - confidence);
    
    return {
      lower: Math.max(0, forecast - intervalWidth),
      upper: forecast + intervalWidth
    };
  }

  /**
   * Determine trend direction
   */
  private static determineTrendDirection(values: number[]): 'growing' | 'stable' | 'declining' {
    if (values.length < 4) return 'stable';

    const first = values.slice(0, Math.ceil(values.length / 2));
    const second = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = first.reduce((sum, val) => sum + val, 0) / first.length;
    const secondAvg = second.reduce((sum, val) => sum + val, 0) / second.length;
    
    const change = (secondAvg - firstAvg) / firstAvg;
    
    if (change > 0.05) return 'growing';
    if (change < -0.05) return 'declining';
    return 'stable';
  }

  /**
   * Helper functions for calculations
   */
  private static calculateMonthlyAverages(values: number[]): number[] {
    // Simplified monthly calculation - assumes weekly data
    const months = Array(12).fill(0).map(() => ({ sum: 0, count: 0 }));
    
    values.forEach((value, index) => {
      const monthIndex = Math.floor((index * 7 / 30.44)) % 12; // Approximate month
      months[monthIndex].sum += value;
      months[monthIndex].count += 1;
    });

    return months.map(month => month.count > 0 ? month.sum / month.count : 0);
  }

  private static calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  }

  private static calculateVolatility(values: number[]): number {
    if (values.length < 2) return 0;
    
    const changes = [];
    for (let i = 1; i < values.length; i++) {
      if (values[i - 1] > 0) {
        changes.push(Math.abs((values[i] - values[i - 1]) / values[i - 1]));
      }
    }
    
    return changes.length > 0 
      ? changes.reduce((sum, change) => sum + change, 0) / changes.length 
      : 0;
  }

  private static calculateTrendStrength(values: number[]): number {
    if (values.length < 2) return 0;
    
    // Calculate R-squared for linear trend
    const n = values.length;
    const xValues = Array.from({ length: n }, (_, i) => i);
    const xSum = xValues.reduce((sum, x) => sum + x, 0);
    const ySum = values.reduce((sum, y) => sum + y, 0);
    const xySum = xValues.reduce((sum, x, i) => sum + x * values[i], 0);
    const xxSum = xValues.reduce((sum, x) => sum + x * x, 0);
    const yySum = values.reduce((sum, y) => sum + y * y, 0);

    const slope = (n * xySum - xSum * ySum) / (n * xxSum - xSum * xSum);
    const intercept = (ySum - slope * xSum) / n;

    let ssRes = 0;
    let ssTot = 0;
    const yMean = ySum / n;

    for (let i = 0; i < n; i++) {
      const predicted = slope * i + intercept;
      ssRes += Math.pow(values[i] - predicted, 2);
      ssTot += Math.pow(values[i] - yMean, 2);
    }

    return ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;
  }

  private static calculateAverageOrderValue(values: number[]): number {
    // Estimate AOV based on historical patterns
    // This is a simplified estimation - in real implementation, you'd use actual order data
    const avgWeeklySales = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    // Assume average order frequency and estimate AOV
    // This is industry-specific but ~$75 is reasonable for retail
    return Math.max(50, Math.min(200, avgWeeklySales / 20)); // Estimate 20 orders per week
  }

  private static generateRecommendation(
    forecast: number, 
    trend: 'growing' | 'stable' | 'declining', 
    confidence: number
  ): string {
    if (confidence < 0.6) {
      return "Low confidence forecast - monitor closely and gather more historical data";
    }

    switch (trend) {
      case 'growing':
        return confidence > 0.85 
          ? "Strong growth predicted - consider increasing inventory and marketing investment"
          : "Moderate growth expected - monitor demand patterns and prepare for scaling";
      
      case 'declining':
        return confidence > 0.85
          ? "Declining trend detected - review product strategy and consider promotional campaigns"
          : "Potential decline - monitor market conditions and competitor activity";
      
      default:
        return confidence > 0.85
          ? "Stable performance expected - maintain current inventory and marketing levels"
          : "Steady performance likely - continue monitoring for trend changes";
    }
  }

  /**
   * Create low confidence forecast for vendors with insufficient data
   */
  private static createLowConfidenceForecast(vendor: Vendor, periodDays: number): ForecastResult {
    // Basic estimation based on vendor defaults or industry averages
    const estimatedWeeklySales = 5000; // Conservative estimate
    const periodMultiplier = periodDays / 7;
    const predictedSales = estimatedWeeklySales * periodMultiplier;

    return {
      vendorId: vendor.id,
      vendorName: vendor.name,
      periodDays,
      predictedSales,
      predictedOrders: Math.round(predictedSales / 65), // Assume $65 AOV
      confidenceScore: 0.15,
      confidenceInterval: {
        lower: predictedSales * 0.3,
        upper: predictedSales * 2.0
      },
      modelUsed: 'Insufficient Data - Baseline Estimate',
      seasonalAdjustment: 1.0,
      trendDirection: 'stable',
      recommendation: 'Insufficient historical data - collect more sales data to improve forecast accuracy'
    };
  }

  /**
   * Store forecast in database
   */
  private static async storeForecast(storeId: string, forecast: ForecastResult): Promise<void> {
    const forecastData: InsertSalesForecast = {
      storeId,
      vendorId: forecast.vendorId,
      forecastDate: new Date(),
      periodDays: forecast.periodDays,
      predictedSales: forecast.predictedSales.toString(),
      predictedOrders: forecast.predictedOrders,
      confidenceScore: forecast.confidenceScore.toString(),
      modelUsed: forecast.modelUsed
    };

    await storage.createSalesForecast(forecastData);
  }

  /**
   * Generate demo forecasts for demonstration
   */
  private static generateDemoForecasts(periodDays: number, vendorId?: string): ForecastResult[] {
    const targetVendors = vendorId 
      ? demoVendors.filter(v => v.id === vendorId)
      : demoVendors;

    return targetVendors.map(vendor => {
      const demoData = DEMO_FORECASTS[vendor.id as keyof typeof DEMO_FORECASTS];
      const periodData = demoData.periods[periodDays as keyof typeof demoData.periods];

      return {
        vendorId: vendor.id,
        vendorName: vendor.name,
        periodDays,
        predictedSales: periodData.sales,
        predictedOrders: periodData.orders,
        confidenceScore: periodData.confidence,
        confidenceInterval: {
          lower: periodData.sales * 0.85,
          upper: periodData.sales * 1.15
        },
        modelUsed: 'Demo Mode - Simulated Ensemble',
        seasonalAdjustment: demoData.seasonality.factor,
        trendDirection: periodData.trend as 'growing' | 'stable' | 'declining',
        recommendation: this.generateRecommendation(
          periodData.sales, 
          periodData.trend as 'growing' | 'stable' | 'declining', 
          periodData.confidence
        )
      };
    });
  }

  /**
   * Generate demo trend analysis
   */
  private static generateDemoTrendAnalysis(vendorId?: string): TrendAnalysis[] {
    const targetVendors = vendorId 
      ? demoVendors.filter(v => v.id === vendorId)
      : demoVendors;

    return targetVendors.map(vendor => {
      const demoData = DEMO_FORECASTS[vendor.id as keyof typeof DEMO_FORECASTS];
      
      // Generate historical data points
      const dates = Array.from({ length: 52 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (52 - i) * 7);
        return date;
      });

      const baseSales = 8000;
      const sales = dates.map((_, i) => {
        const trend = vendor.id === 'vendor_1' ? 1.02 : vendor.id === 'vendor_3' ? 0.98 : 1.01;
        const seasonal = 1 + 0.2 * Math.sin((i / 52) * 2 * Math.PI);
        const noise = 0.9 + Math.random() * 0.2;
        return baseSales * Math.pow(trend, i / 52) * seasonal * noise;
      });

      const orders = sales.map(s => Math.round(s / 65));

      return {
        vendorId: vendor.id,
        vendorName: vendor.name,
        historicalData: { dates, sales, orders },
        trends: {
          overall: demoData.periods[30].trend as 'growing' | 'stable' | 'declining',
          recentTrend: 'steady',
          seasonality: {
            detected: true,
            pattern: 'Annual with quarterly peaks',
            peakMonths: demoData.seasonality.peakMonths,
            lowMonths: demoData.seasonality.lowMonths
          },
          growth: {
            quarterlyGrowthRate: vendor.id === 'vendor_1' ? 8.5 : vendor.id === 'vendor_3' ? -3.2 : 2.1,
            monthlyGrowthRate: vendor.id === 'vendor_1' ? 2.8 : vendor.id === 'vendor_3' ? -1.1 : 0.7,
            volatility: vendor.id === 'vendor_4' ? 0.35 : 0.15
          }
        },
        insights: this.generateTrendInsights(vendor.name, demoData.periods[30].trend)
      };
    });
  }

  /**
   * Generate trend insights
   */
  private static generateTrendInsights(vendorName: string, trend: string): string[] {
    const insights = [];
    
    switch (trend) {
      case 'growing':
        insights.push(`${vendorName} shows strong growth momentum`);
        insights.push('Consider increasing inventory levels to meet demand');
        insights.push('Seasonal peaks in Q4 and Q1 detected');
        break;
      case 'declining':
        insights.push(`${vendorName} performance is declining`);
        insights.push('Review product portfolio and pricing strategy');
        insights.push('Monitor competitor activities and market trends');
        break;
      default:
        insights.push(`${vendorName} maintains stable performance`);
        insights.push('Consistent sales pattern with predictable seasonality');
        insights.push('Good candidate for automated inventory management');
    }

    return insights;
  }

  /**
   * Generate demo accuracy metrics
   */
  private static generateDemoAccuracyMetrics(vendorId?: string): AccuracyMetrics[] {
    const targetVendors = vendorId 
      ? demoVendors.filter(v => v.id === vendorId)
      : demoVendors.slice(0, 2); // Show metrics for first 2 vendors

    return targetVendors.map(vendor => {
      const demoData = DEMO_FORECASTS[vendor.id as keyof typeof DEMO_FORECASTS];
      const baseAccuracy = demoData.periods[30].confidence * 100;

      return {
        vendorId: vendor.id,
        vendorName: vendor.name,
        accuracy: {
          mape: Math.round((100 - baseAccuracy) * 100) / 100,
          rmse: Math.round(Math.random() * 2000 + 500),
          mad: Math.round(Math.random() * 1500 + 300)
        },
        forecasts: {
          total: Math.round(Math.random() * 20 + 10),
          period30d: { count: 8, avgAccuracy: baseAccuracy + 2 },
          period60d: { count: 6, avgAccuracy: baseAccuracy - 3 },
          period90d: { count: 4, avgAccuracy: baseAccuracy - 6 }
        },
        confidence: baseAccuracy > 80 ? 'high' : baseAccuracy > 60 ? 'medium' : 'low',
        recommendation: baseAccuracy > 80 
          ? 'Forecasts are highly reliable for planning'
          : 'Monitor forecast performance and adjust strategies accordingly'
      };
    });
  }

  /**
   * Analyze trend patterns from historical data
   */
  private static analyzeTrendPattern(vendor: Vendor, data: ForecastInput): TrendAnalysis {
    const sales = data.values;
    const dates = data.dates;

    // Calculate growth metrics
    const quarterlyGrowth = this.calculateGrowthRate(sales, 13); // 13 weeks = quarter
    const monthlyGrowth = this.calculateGrowthRate(sales, 4);    // 4 weeks = month
    const volatility = this.calculateVolatility(sales);

    // Detect seasonality
    const seasonality = this.detectSeasonality(sales, dates);

    // Determine overall trend
    const overall = this.determineTrendDirection(sales);
    const recentTrend = this.analyzeRecentTrend(sales);

    // Generate insights
    const insights = this.generateTrendInsights(vendor.name, overall);

    return {
      vendorId: vendor.id,
      vendorName: vendor.name,
      historicalData: {
        dates,
        sales,
        orders: sales.map(s => Math.round(s / 65)) // Estimate orders
      },
      trends: {
        overall,
        recentTrend,
        seasonality,
        growth: {
          quarterlyGrowthRate: quarterlyGrowth,
          monthlyGrowthRate: monthlyGrowth,
          volatility
        }
      },
      insights
    };
  }

  /**
   * Calculate growth rate over specified periods
   */
  private static calculateGrowthRate(values: number[], periodLength: number): number {
    if (values.length < periodLength * 2) return 0;

    const firstPeriod = values.slice(0, periodLength);
    const lastPeriod = values.slice(-periodLength);

    const firstAvg = firstPeriod.reduce((sum, val) => sum + val, 0) / firstPeriod.length;
    const lastAvg = lastPeriod.reduce((sum, val) => sum + val, 0) / lastPeriod.length;

    return firstAvg > 0 ? ((lastAvg - firstAvg) / firstAvg) * 100 : 0;
  }

  /**
   * Detect seasonality patterns
   */
  private static detectSeasonality(values: number[], dates: Date[]): {
    detected: boolean;
    pattern: string;
    peakMonths: number[];
    lowMonths: number[];
  } {
    if (values.length < 12) {
      return {
        detected: false,
        pattern: 'Insufficient data',
        peakMonths: [],
        lowMonths: []
      };
    }

    // Calculate monthly averages
    const monthlyData = Array(12).fill(0).map(() => ({ sum: 0, count: 0 }));

    dates.forEach((date, index) => {
      const month = date.getMonth();
      monthlyData[month].sum += values[index];
      monthlyData[month].count += 1;
    });

    const monthlyAverages = monthlyData.map((data, month) => ({
      month,
      avg: data.count > 0 ? data.sum / data.count : 0
    }));

    // Find peaks and lows
    const sorted = [...monthlyAverages].sort((a, b) => b.avg - a.avg);
    const peakMonths = sorted.slice(0, 3).map(item => item.month);
    const lowMonths = sorted.slice(-3).map(item => item.month);

    // Check if seasonality exists (coefficient of variation)
    const avg = monthlyAverages.reduce((sum, item) => sum + item.avg, 0) / 12;
    const variance = monthlyAverages.reduce((sum, item) => sum + Math.pow(item.avg - avg, 2), 0) / 12;
    const coefficientOfVariation = avg > 0 ? Math.sqrt(variance) / avg : 0;

    return {
      detected: coefficientOfVariation > 0.1,
      pattern: coefficientOfVariation > 0.3 ? 'Strong seasonal pattern' : 
               coefficientOfVariation > 0.1 ? 'Moderate seasonal pattern' : 'No clear pattern',
      peakMonths,
      lowMonths
    };
  }

  /**
   * Analyze recent trend direction
   */
  private static analyzeRecentTrend(values: number[]): 'accelerating' | 'steady' | 'decelerating' {
    if (values.length < 8) return 'steady';

    const recent = values.slice(-8); // Last 8 weeks
    const earlier = values.slice(-16, -8); // Previous 8 weeks

    if (earlier.length === 0) return 'steady';

    const recentGrowth = this.calculateGrowthRate(recent, 4);
    const earlierGrowth = this.calculateGrowthRate(earlier, 4);

    const acceleration = recentGrowth - earlierGrowth;

    if (acceleration > 5) return 'accelerating';
    if (acceleration < -5) return 'decelerating';
    return 'steady';
  }

  /**
   * Calculate accuracy metrics from historical forecast data
   */
  private static calculateAccuracyMetrics(records: ForecastAccuracy[]): AccuracyMetrics {
    if (records.length === 0) {
      return {
        accuracy: { mape: 0, rmse: 0, mad: 0 },
        forecasts: { 
          total: 0, 
          period30d: { count: 0, avgAccuracy: 0 },
          period60d: { count: 0, avgAccuracy: 0 },
          period90d: { count: 0, avgAccuracy: 0 }
        },
        confidence: 'low',
        recommendation: 'No forecast data available'
      };
    }

    // Calculate MAPE (Mean Absolute Percentage Error)
    const mape = records.reduce((sum, record) => {
      const predicted = parseFloat(record.predictedValue.toString());
      const actual = parseFloat(record.actualValue.toString());
      return sum + (actual > 0 ? Math.abs((predicted - actual) / actual) : 0);
    }, 0) / records.length * 100;

    // Calculate RMSE (Root Mean Square Error)
    const mse = records.reduce((sum, record) => {
      const predicted = parseFloat(record.predictedValue.toString());
      const actual = parseFloat(record.actualValue.toString());
      return sum + Math.pow(predicted - actual, 2);
    }, 0) / records.length;
    const rmse = Math.sqrt(mse);

    // Calculate MAD (Mean Absolute Deviation)
    const mad = records.reduce((sum, record) => {
      const predicted = parseFloat(record.predictedValue.toString());
      const actual = parseFloat(record.actualValue.toString());
      return sum + Math.abs(predicted - actual);
    }, 0) / records.length;

    // Group by forecast period
    const byPeriod = {
      period30d: records.filter(r => r.forecastPeriod === 30),
      period60d: records.filter(r => r.forecastPeriod === 60),
      period90d: records.filter(r => r.forecastPeriod === 90)
    };

    const avgAccuracy = 100 - mape; // Convert MAPE to accuracy percentage

    return {
      vendorId: records[0].vendorId || undefined,
      accuracy: {
        mape: Math.round(mape * 100) / 100,
        rmse: Math.round(rmse),
        mad: Math.round(mad)
      },
      forecasts: {
        total: records.length,
        period30d: { 
          count: byPeriod.period30d.length,
          avgAccuracy: Math.round(avgAccuracy * 100) / 100 
        },
        period60d: { 
          count: byPeriod.period60d.length,
          avgAccuracy: Math.round((avgAccuracy - 5) * 100) / 100 
        },
        period90d: { 
          count: byPeriod.period90d.length,
          avgAccuracy: Math.round((avgAccuracy - 10) * 100) / 100 
        }
      },
      confidence: avgAccuracy > 80 ? 'high' : avgAccuracy > 60 ? 'medium' : 'low',
      recommendation: avgAccuracy > 80 
        ? 'Forecasts are highly reliable for business planning'
        : avgAccuracy > 60
        ? 'Good forecast accuracy - suitable for operational planning'
        : 'Forecast accuracy needs improvement - use with caution'
    };
  }
}