import { storage } from "../storage";
import { NotificationService } from "./notificationService";
import type { 
  VendorAnalytics, 
  Alert, 
  AlertRule, 
  InsertAlert, 
  Vendor,
  VendorMetrics 
} from "@shared/schema";

export interface PerformanceMetrics {
  vendorId: string;
  vendorName: string;
  currentWeek: {
    revenue: number;
    orders: number;
    aov: number;
    conversionRate: number;
    visitors: number;
  };
  previousWeek: {
    revenue: number;
    orders: number;
    aov: number;
    conversionRate: number;
    visitors: number;
  };
  changes: {
    revenueChange: number;
    ordersChange: number;
    aovChange: number;
    conversionChange: number;
    visitorsChange: number;
  };
  percentageChanges: {
    revenuePercentChange: number;
    ordersPercentChange: number;
    aovPercentChange: number;
    conversionPercentChange: number;
    visitorsPercentChange: number;
  };
}

export interface AlertCondition {
  alertType: 'performance_drop' | 'performance_spike' | 'inventory_low' | 'sales_trend';
  vendorId?: string;
  thresholdType: 'percentage' | 'absolute';
  thresholdValue: number;
  severity: 'low' | 'medium' | 'high';
}

export class AlertService {
  /**
   * Analyze vendor performance by comparing current week vs previous week
   * OPTIMIZED: Uses batched queries instead of N+1 queries for better performance
   */
  static async analyzeVendorPerformance(storeId: string, vendorId?: string): Promise<PerformanceMetrics[]> {
    try {
      const currentWeekStart = new Date();
      currentWeekStart.setDate(currentWeekStart.getDate() - 7);
      const currentWeekEnd = new Date();
      
      const previousWeekStart = new Date(currentWeekStart);
      previousWeekStart.setDate(previousWeekStart.getDate() - 7);
      const previousWeekEnd = new Date(currentWeekStart);

      // Get vendors for the store
      const vendors = await storage.getStoreVendors(storeId);
      const targetVendors = vendorId ? vendors.filter(v => v.id === vendorId) : vendors;

      if (targetVendors.length === 0) {
        return [];
      }

      // PERFORMANCE FIX: Batch retrieve analytics data for all vendors in 2 queries instead of 2*N queries
      const [currentWeekAllAnalytics, previousWeekAllAnalytics] = await Promise.all([
        storage.getVendorAnalytics(storeId, undefined, currentWeekStart, currentWeekEnd),
        storage.getVendorAnalytics(storeId, undefined, previousWeekStart, previousWeekEnd)
      ]);

      // Group analytics by vendorId for efficient lookup
      const currentWeekByVendor = this.groupAnalyticsByVendor(currentWeekAllAnalytics);
      const previousWeekByVendor = this.groupAnalyticsByVendor(previousWeekAllAnalytics);

      const performanceMetrics: PerformanceMetrics[] = [];

      // Process each vendor's data in-memory (much faster than individual DB queries)
      for (const vendor of targetVendors) {
        try {
          const currentWeekVendorData = currentWeekByVendor.get(vendor.id) || [];
          const previousWeekVendorData = previousWeekByVendor.get(vendor.id) || [];

          // Aggregate metrics for each period
          const currentWeekMetrics = this.aggregateAnalytics(currentWeekVendorData);
          const previousWeekMetrics = this.aggregateAnalytics(previousWeekVendorData);

          // Calculate changes and percentage changes
          const changes = {
            revenueChange: currentWeekMetrics.revenue - previousWeekMetrics.revenue,
            ordersChange: currentWeekMetrics.orders - previousWeekMetrics.orders,
            aovChange: currentWeekMetrics.aov - previousWeekMetrics.aov,
            conversionChange: currentWeekMetrics.conversionRate - previousWeekMetrics.conversionRate,
            visitorsChange: currentWeekMetrics.visitors - previousWeekMetrics.visitors
          };

          const percentageChanges = {
            revenuePercentChange: this.calculatePercentageChange(previousWeekMetrics.revenue, currentWeekMetrics.revenue),
            ordersPercentChange: this.calculatePercentageChange(previousWeekMetrics.orders, currentWeekMetrics.orders),
            aovPercentChange: this.calculatePercentageChange(previousWeekMetrics.aov, currentWeekMetrics.aov),
            conversionPercentChange: this.calculatePercentageChange(previousWeekMetrics.conversionRate, currentWeekMetrics.conversionRate),
            visitorsPercentChange: this.calculatePercentageChange(previousWeekMetrics.visitors, currentWeekMetrics.visitors)
          };

          performanceMetrics.push({
            vendorId: vendor.id,
            vendorName: vendor.name,
            currentWeek: currentWeekMetrics,
            previousWeek: previousWeekMetrics,
            changes,
            percentageChanges
          });
        } catch (error) {
          console.error(`Error analyzing performance for vendor ${vendor.id}:`, error);
          // Continue with other vendors if one fails
        }
      }

      return performanceMetrics;
    } catch (error) {
      console.error('Error in analyzeVendorPerformance:', error);
      throw new Error('Failed to analyze vendor performance');
    }
  }

  /**
   * Group analytics data by vendor ID for efficient in-memory processing
   */
  private static groupAnalyticsByVendor(analytics: VendorAnalytics[]): Map<string, VendorAnalytics[]> {
    const grouped = new Map<string, VendorAnalytics[]>();
    
    for (const item of analytics) {
      // Skip items without vendorId
      if (!item.vendorId) continue;
      
      if (!grouped.has(item.vendorId)) {
        grouped.set(item.vendorId, []);
      }
      grouped.get(item.vendorId)!.push(item);
    }
    
    return grouped;
  }

  /**
   * Aggregate analytics data for a time period
   */
  private static aggregateAnalytics(analytics: VendorAnalytics[]): {
    revenue: number;
    orders: number;
    aov: number;
    conversionRate: number;
    visitors: number;
  } {
    if (analytics.length === 0) {
      return {
        revenue: 0,
        orders: 0,
        aov: 0,
        conversionRate: 0,
        visitors: 0
      };
    }

    const totals = analytics.reduce((acc, item) => ({
      revenue: acc.revenue + Number(item.revenue || 0),
      orders: acc.orders + (item.orders || 0),
      visitors: acc.visitors + (item.visitors || 0),
      conversions: acc.conversions + (item.conversions || 0)
    }), { revenue: 0, orders: 0, visitors: 0, conversions: 0 });

    return {
      revenue: totals.revenue,
      orders: totals.orders,
      aov: totals.orders > 0 ? totals.revenue / totals.orders : 0,
      conversionRate: totals.visitors > 0 ? (totals.conversions / totals.visitors) * 100 : 0,
      visitors: totals.visitors
    };
  }

  /**
   * Calculate percentage change between two values
   */
  private static calculatePercentageChange(oldValue: number, newValue: number): number {
    if (oldValue === 0) {
      return newValue > 0 ? 100 : 0;
    }
    return ((newValue - oldValue) / oldValue) * 100;
  }

  /**
   * Check alert rules against performance metrics and generate alerts
   */
  static async processAlerts(storeId: string, userId: string, vendorId?: string): Promise<Alert[]> {
    try {
      // Get enabled alert rules for the store
      const alertRules = await storage.getEnabledAlertRules(storeId, vendorId);
      
      if (alertRules.length === 0) {
        return [];
      }

      // Get performance metrics
      const performanceMetrics = await this.analyzeVendorPerformance(storeId, vendorId);
      
      const generatedAlerts: Alert[] = [];

      for (const rule of alertRules) {
        for (const metrics of performanceMetrics) {
          // Skip if rule is vendor-specific and doesn't match
          if (rule.vendorId && rule.vendorId !== metrics.vendorId) {
            continue;
          }

          const alertsForRule = await this.checkRuleAgainstMetrics(
            rule, 
            metrics, 
            storeId, 
            userId
          );
          
          generatedAlerts.push(...alertsForRule);
        }
      }

      // Filter out duplicate alerts (same type, vendor, within 24 hours)
      const deduplicatedAlerts = await this.deduplicateAlerts(generatedAlerts, storeId);

      return deduplicatedAlerts;
    } catch (error) {
      console.error('Error in processAlerts:', error);
      throw new Error('Failed to process alerts');
    }
  }

  /**
   * Check a specific rule against performance metrics
   */
  private static async checkRuleAgainstMetrics(
    rule: AlertRule, 
    metrics: PerformanceMetrics,
    storeId: string,
    userId: string
  ): Promise<Alert[]> {
    const alerts: Alert[] = [];

    try {
      const thresholdValue = Number(rule.thresholdValue);
      
      switch (rule.alertType) {
        case 'performance_drop':
          alerts.push(...await this.checkPerformanceDropAlerts(rule, metrics, storeId, userId, thresholdValue));
          break;
        
        case 'performance_spike':
          alerts.push(...await this.checkPerformanceSpikeAlerts(rule, metrics, storeId, userId, thresholdValue));
          break;
        
        case 'inventory_low':
          alerts.push(...await this.checkInventoryLowAlerts(rule, metrics, storeId, userId, thresholdValue));
          break;
        
        case 'sales_trend':
          alerts.push(...await this.checkSalesTrendAlerts(rule, metrics, storeId, userId, thresholdValue));
          break;
      }
    } catch (error) {
      console.error(`Error checking rule ${rule.id} against metrics:`, error);
    }

    return alerts;
  }

  /**
   * Check for performance drop alerts
   */
  private static async checkPerformanceDropAlerts(
    rule: AlertRule,
    metrics: PerformanceMetrics,
    storeId: string,
    userId: string,
    thresholdValue: number
  ): Promise<Alert[]> {
    const alerts: Alert[] = [];

    // Check revenue drop
    if (rule.thresholdType === 'percentage' && metrics.percentageChanges.revenuePercentChange <= -thresholdValue) {
      alerts.push(await this.createAlert({
        userId,
        storeId,
        alertType: 'performance_drop',
        message: this.generatePerformanceDropMessage(metrics, 'revenue', metrics.percentageChanges.revenuePercentChange),
        thresholdValue: rule.thresholdValue,
        currentValue: metrics.percentageChanges.revenuePercentChange.toString(),
        severity: this.determineSeverity(Math.abs(metrics.percentageChanges.revenuePercentChange), thresholdValue),
        vendorId: metrics.vendorId
      }));
    }

    // Check orders drop
    if (rule.thresholdType === 'percentage' && metrics.percentageChanges.ordersPercentChange <= -thresholdValue) {
      alerts.push(await this.createAlert({
        userId,
        storeId,
        alertType: 'performance_drop',
        message: this.generatePerformanceDropMessage(metrics, 'orders', metrics.percentageChanges.ordersPercentChange),
        thresholdValue: rule.thresholdValue,
        currentValue: metrics.percentageChanges.ordersPercentChange.toString(),
        severity: this.determineSeverity(Math.abs(metrics.percentageChanges.ordersPercentChange), thresholdValue),
        vendorId: metrics.vendorId
      }));
    }

    // Check conversion rate drop
    if (rule.thresholdType === 'percentage' && metrics.percentageChanges.conversionPercentChange <= -thresholdValue) {
      alerts.push(await this.createAlert({
        userId,
        storeId,
        alertType: 'performance_drop',
        message: this.generatePerformanceDropMessage(metrics, 'conversion rate', metrics.percentageChanges.conversionPercentChange),
        thresholdValue: rule.thresholdValue,
        currentValue: metrics.percentageChanges.conversionPercentChange.toString(),
        severity: this.determineSeverity(Math.abs(metrics.percentageChanges.conversionPercentChange), thresholdValue),
        vendorId: metrics.vendorId
      }));
    }

    return alerts;
  }

  /**
   * Check for performance spike alerts
   */
  private static async checkPerformanceSpikeAlerts(
    rule: AlertRule,
    metrics: PerformanceMetrics,
    storeId: string,
    userId: string,
    thresholdValue: number
  ): Promise<Alert[]> {
    const alerts: Alert[] = [];

    // Check revenue spike
    if (rule.thresholdType === 'percentage' && metrics.percentageChanges.revenuePercentChange >= thresholdValue) {
      alerts.push(await this.createAlert({
        userId,
        storeId,
        alertType: 'performance_spike',
        message: this.generatePerformanceSpikeMessage(metrics, 'revenue', metrics.percentageChanges.revenuePercentChange),
        thresholdValue: rule.thresholdValue,
        currentValue: metrics.percentageChanges.revenuePercentChange.toString(),
        severity: 'low', // Spikes are generally positive
        vendorId: metrics.vendorId
      }));
    }

    // Check orders spike
    if (rule.thresholdType === 'percentage' && metrics.percentageChanges.ordersPercentChange >= thresholdValue) {
      alerts.push(await this.createAlert({
        userId,
        storeId,
        alertType: 'performance_spike',
        message: this.generatePerformanceSpikeMessage(metrics, 'orders', metrics.percentageChanges.ordersPercentChange),
        thresholdValue: rule.thresholdValue,
        currentValue: metrics.percentageChanges.ordersPercentChange.toString(),
        severity: 'low',
        vendorId: metrics.vendorId
      }));
    }

    return alerts;
  }

  /**
   * Check for inventory low alerts
   */
  private static async checkInventoryLowAlerts(
    rule: AlertRule,
    metrics: PerformanceMetrics,
    storeId: string,
    userId: string,
    thresholdValue: number
  ): Promise<Alert[]> {
    const alerts: Alert[] = [];

    try {
      // Get inventory analytics for the vendor
      const inventoryData = await storage.getInventoryAnalytics(storeId, {
        page: 1,
        limit: 1000,
        vendorId: metrics.vendorId
      });

      // Get vendor inventory summary for additional context
      const vendorSummary = await storage.getVendorInventorySummary(metrics.vendorId);

      let lowInventoryItems = 0;
      let criticalItems: string[] = [];
      let totalProducts = inventoryData.data.length;

      for (const item of inventoryData.data) {
        let isLowInventory = false;

        // Check days of inventory threshold
        if (rule.thresholdType === 'absolute' && item.daysOfInventory && item.daysOfInventory < thresholdValue) {
          isLowInventory = true;
        }
        
        // Check reorder point threshold
        if (item.reorderPoint && item.daysOfInventory && item.daysOfInventory <= item.reorderPoint) {
          isLowInventory = true;
        }

        // Check percentage-based threshold (percentage of products below threshold)
        if (rule.thresholdType === 'percentage' && item.daysOfInventory && item.daysOfInventory < 30) {
          isLowInventory = true;
        }

        if (isLowInventory) {
          lowInventoryItems++;
          if (criticalItems.length < 5) { // Only track first 5 for alert message
            criticalItems.push(`${item.productId} (${item.daysOfInventory || 0} days)`);
          }
        }
      }

      // Determine if we should generate an alert
      let shouldAlert = false;
      let severity: 'low' | 'medium' | 'high' = 'low';

      if (rule.thresholdType === 'percentage') {
        const percentageLow = totalProducts > 0 ? (lowInventoryItems / totalProducts) * 100 : 0;
        if (percentageLow >= thresholdValue) {
          shouldAlert = true;
          severity = percentageLow >= 50 ? 'high' : percentageLow >= 25 ? 'medium' : 'low';
        }
      } else {
        // Absolute threshold - alert if any items are low
        if (lowInventoryItems > 0) {
          shouldAlert = true;
          severity = lowInventoryItems >= 10 ? 'high' : lowInventoryItems >= 5 ? 'medium' : 'low';
        }
      }

      if (shouldAlert) {
        const message = this.generateInventoryLowMessage(
          metrics, 
          lowInventoryItems, 
          totalProducts, 
          criticalItems, 
          rule.thresholdType, 
          thresholdValue,
          vendorSummary?.deadStockCount || 0
        );

        alerts.push(await this.createAlert({
          userId,
          storeId,
          alertType: 'inventory_low',
          message,
          thresholdValue: rule.thresholdValue,
          currentValue: rule.thresholdType === 'percentage' 
            ? ((lowInventoryItems / totalProducts) * 100).toString()
            : lowInventoryItems.toString(),
          severity,
          vendorId: metrics.vendorId
        }));
      }

    } catch (error) {
      console.error(`Error checking inventory low alerts for vendor ${metrics.vendorId}:`, error);
    }

    return alerts;
  }

  /**
   * Check for sales trend alerts
   */
  private static async checkSalesTrendAlerts(
    rule: AlertRule,
    metrics: PerformanceMetrics,
    storeId: string,
    userId: string,
    thresholdValue: number
  ): Promise<Alert[]> {
    const alerts: Alert[] = [];

    // Check for significant trend changes (either direction)
    const revenueChangeAbs = Math.abs(metrics.percentageChanges.revenuePercentChange);
    
    if (rule.thresholdType === 'percentage' && revenueChangeAbs >= thresholdValue) {
      const trendDirection = metrics.percentageChanges.revenuePercentChange > 0 ? 'increase' : 'decrease';
      
      alerts.push(await this.createAlert({
        userId,
        storeId,
        alertType: 'sales_trend',
        message: this.generateSalesTrendMessage(metrics, trendDirection, metrics.percentageChanges.revenuePercentChange),
        thresholdValue: rule.thresholdValue,
        currentValue: metrics.percentageChanges.revenuePercentChange.toString(),
        severity: this.determineSeverity(revenueChangeAbs, thresholdValue),
        vendorId: metrics.vendorId
      }));
    }

    return alerts;
  }

  /**
   * Generate dynamic alert messages
   */
  private static generatePerformanceDropMessage(
    metrics: PerformanceMetrics, 
    metric: string, 
    percentChange: number
  ): string {
    const formattedChange = Math.abs(percentChange).toFixed(1);
    return `⚠️ ${metrics.vendorName} ${metric} dropped ${formattedChange}% this week vs last week. Consider reviewing marketing campaigns or product availability.`;
  }

  private static generatePerformanceSpikeMessage(
    metrics: PerformanceMetrics, 
    metric: string, 
    percentChange: number
  ): string {
    const formattedChange = percentChange.toFixed(1);
    return `🚀 ${metrics.vendorName} ${metric} increased ${formattedChange}% this week! Great opportunity to capitalize on this trend.`;
  }

  private static generateSalesTrendMessage(
    metrics: PerformanceMetrics, 
    direction: string, 
    percentChange: number
  ): string {
    const formattedChange = Math.abs(percentChange).toFixed(1);
    return `📈 ${metrics.vendorName} shows significant sales trend: ${formattedChange}% ${direction} in revenue this week.`;
  }

  private static generateInventoryLowMessage(
    metrics: PerformanceMetrics,
    lowInventoryItems: number,
    totalProducts: number,
    criticalItems: string[],
    thresholdType: 'percentage' | 'absolute',
    thresholdValue: number,
    deadStockCount: number
  ): string {
    const deadStockInfo = deadStockCount > 0 ? ` (${deadStockCount} dead stock items)` : '';
    
    if (thresholdType === 'percentage') {
      const percentageLow = totalProducts > 0 ? ((lowInventoryItems / totalProducts) * 100).toFixed(1) : '0';
      return `📦 ${lowInventoryItems} of ${totalProducts} products (${percentageLow}%) for ${metrics.vendorName} are running low on inventory${deadStockInfo}. Review reorder points and consider restocking.`;
    } else {
      const criticalList = criticalItems.slice(0, 3).join(', ') + (criticalItems.length > 3 ? '...' : '');
      return `📦 ${lowInventoryItems} products for ${metrics.vendorName} are running low on inventory${deadStockInfo}. Critical items: ${criticalList}. Consider immediate restocking.`;
    }
  }

  /**
   * Determine alert severity based on percentage change
   */
  private static determineSeverity(changePercent: number, threshold: number): 'low' | 'medium' | 'high' {
    if (changePercent >= threshold * 2) {
      return 'high';
    } else if (changePercent >= threshold * 1.5) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Create and store alert, and create corresponding notification
   */
  private static async createAlert(alertData: Omit<InsertAlert, 'id' | 'createdAt' | 'timeBucket'>): Promise<Alert> {
    try {
      // Create the alert in the database
      const alert = await storage.createAlert(alertData);
      
      // Create a notification for the alert asynchronously (don't block alert creation)
      this.createNotificationForAlert(alert).catch(error => {
        console.error(`Failed to create notification for alert ${alert.id}:`, error);
      });
      
      return alert;
    } catch (error) {
      console.error('Error creating alert:', error);
      throw error;
    }
  }

  /**
   * Create a notification for a generated alert
   */
  private static async createNotificationForAlert(alert: Alert): Promise<void> {
    try {
      // Don't create notifications for demo mode alerts
      if (alert.userId === 'demo_user' || alert.storeId === 'demo_store_1') {
        return;
      }

      // Get vendor information for better notification content
      let vendorName = 'Unknown Vendor';
      if (alert.vendorId) {
        try {
          const vendor = await storage.getVendor(alert.vendorId);
          if (vendor) {
            vendorName = vendor.name;
          }
        } catch (error) {
          console.error(`Error fetching vendor ${alert.vendorId}:`, error);
        }
      }

      // Generate notification title and enhanced message
      const { title, enhancedMessage } = this.generateNotificationContent(alert, vendorName);

      // Create the notification
      await NotificationService.createNotification(
        alert.userId,
        alert.storeId,
        {
          alertId: alert.id,
          type: 'alert',
          title,
          message: enhancedMessage,
          severity: alert.severity,
          actionUrl: `/alerts?alertId=${alert.id}`,
          metadata: {
            alertType: alert.alertType,
            vendorId: alert.vendorId,
            vendorName,
            thresholdValue: alert.thresholdValue,
            currentValue: alert.currentValue
          }
        },
        {
          alert,
          sendEmail: alert.severity === 'high', // Send email for critical alerts
          emailTemplate: alert.severity === 'high' ? 'critical_alert' : 'default_alert'
        }
      );

      console.log(`Created notification for alert ${alert.id} (${alert.severity} severity)`);
    } catch (error) {
      console.error(`Error creating notification for alert ${alert.id}:`, error);
      // Don't throw error to avoid breaking alert creation
    }
  }

  /**
   * Generate notification content based on alert data
   */
  private static generateNotificationContent(alert: Alert, vendorName: string): { title: string; enhancedMessage: string } {
    const alertTypeMap = {
      performance_drop: {
        title: 'Performance Drop Alert',
        emoji: '📉',
        urgency: alert.severity === 'high' ? 'Critical' : 'Important'
      },
      performance_spike: {
        title: 'Performance Spike Alert',
        emoji: '📈',
        urgency: 'Notable'
      },
      inventory_low: {
        title: 'Low Inventory Alert',
        emoji: '📦',
        urgency: alert.severity === 'high' ? 'Critical' : 'Important'
      },
      sales_trend: {
        title: 'Sales Trend Alert',
        emoji: '📊',
        urgency: 'Notable'
      }
    };

    const config = alertTypeMap[alert.alertType] || {
      title: 'Business Alert',
      emoji: '🔔',
      urgency: 'Important'
    };

    const title = `${config.emoji} ${config.title}`;
    
    // Enhance the message with more context
    let enhancedMessage = alert.message;
    
    if (alert.severity === 'high') {
      enhancedMessage = `🚨 ${config.urgency}: ${enhancedMessage}`;
    } else if (alert.severity === 'medium') {
      enhancedMessage = `⚠️ ${config.urgency}: ${enhancedMessage}`;
    } else {
      enhancedMessage = `ℹ️ ${config.urgency}: ${enhancedMessage}`;
    }

    // Add action guidance
    const actionGuidance = this.getActionGuidance(alert.alertType, alert.severity);
    if (actionGuidance) {
      enhancedMessage += ` ${actionGuidance}`;
    }

    return { title, enhancedMessage };
  }

  /**
   * Get action guidance based on alert type and severity
   */
  private static getActionGuidance(alertType: string, severity: string): string {
    const actionMap = {
      performance_drop: {
        high: 'Immediate review recommended.',
        medium: 'Consider investigating causes.',
        low: 'Monitor for continued trends.'
      },
      performance_spike: {
        high: 'Great opportunity to capitalize!',
        medium: 'Consider increasing inventory.',
        low: 'Positive trend to monitor.'
      },
      inventory_low: {
        high: 'Restock immediately to avoid stockouts.',
        medium: 'Consider reordering soon.',
        low: 'Plan for upcoming restock.'
      },
      sales_trend: {
        high: 'Significant trend detected.',
        medium: 'Trend worth monitoring.',
        low: 'Minor trend observed.'
      }
    };

    return actionMap[alertType]?.[severity] || '';
  }

  /**
   * Remove duplicate alerts within 24 hours
   */
  private static async deduplicateAlerts(alerts: Alert[], storeId: string): Promise<Alert[]> {
    try {
      // Get existing alerts from last 24 hours
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const existingAlerts = await storage.getStoreAlerts(storeId, {
        page: 1,
        limit: 1000 // Get all recent alerts
      });

      const recentAlerts = existingAlerts.data.filter(alert => 
        alert.createdAt && new Date(alert.createdAt) >= yesterday
      );

      // Filter out alerts that match recent ones
      const uniqueAlerts = alerts.filter(newAlert => {
        return !recentAlerts.some(existingAlert => 
          existingAlert.alertType === newAlert.alertType &&
          existingAlert.vendorId === newAlert.vendorId &&
          existingAlert.severity === newAlert.severity
        );
      });

      return uniqueAlerts;
    } catch (error) {
      console.error('Error in deduplicateAlerts:', error);
      // Return all alerts if deduplication fails
      return alerts;
    }
  }

  /**
   * Background job to process alerts for all stores
   */
  static async runDailyAlertCheck(): Promise<void> {
    try {
      console.log('Starting daily alert check...');
      
      // This would typically be called by a cron job or background task
      // For now, we'll focus on the store-specific processing
      
      console.log('Daily alert check completed');
    } catch (error) {
      console.error('Error in daily alert check:', error);
    }
  }

  /**
   * Process alerts for a specific store and user with optional vendor filtering
   * This is the main entry point for alert processing
   */
  static async processStoreAlerts(storeId: string, userId: string, vendorId?: string): Promise<Alert[]> {
    try {
      console.log(`Processing alerts for store: ${storeId}${vendorId ? ` (vendor: ${vendorId})` : ''}`);
      
      const alerts = await this.processAlerts(storeId, userId, vendorId);
      
      console.log(`Generated ${alerts.length} new alerts for store ${storeId}${vendorId ? ` (vendor: ${vendorId})` : ''}`);
      
      return alerts;
    } catch (error) {
      console.error(`Error processing alerts for store ${storeId}:`, error);
      throw error;
    }
  }

  /**
   * Get alert statistics for a store
   */
  static async getAlertStats(storeId: string): Promise<{
    total: number;
    unread: number;
    unacknowledged: number;
    bySeverity: { low: number; medium: number; high: number };
    byType: { performance_drop: number; performance_spike: number; inventory_low: number; sales_trend: number };
  }> {
    try {
      const alerts = await storage.getStoreAlerts(storeId, {
        page: 1,
        limit: 1000 // Get all alerts for stats
      });

      const allAlerts = alerts.data;
      
      const stats = {
        total: allAlerts.length,
        unread: allAlerts.filter(a => !a.isRead).length,
        unacknowledged: allAlerts.filter(a => !a.acknowledgedAt).length,
        bySeverity: {
          low: allAlerts.filter(a => a.severity === 'low').length,
          medium: allAlerts.filter(a => a.severity === 'medium').length,
          high: allAlerts.filter(a => a.severity === 'high').length
        },
        byType: {
          performance_drop: allAlerts.filter(a => a.alertType === 'performance_drop').length,
          performance_spike: allAlerts.filter(a => a.alertType === 'performance_spike').length,
          inventory_low: allAlerts.filter(a => a.alertType === 'inventory_low').length,
          sales_trend: allAlerts.filter(a => a.alertType === 'sales_trend').length
        }
      };

      return stats;
    } catch (error) {
      console.error('Error getting alert stats:', error);
      throw new Error('Failed to get alert statistics');
    }
  }
}

export default AlertService;