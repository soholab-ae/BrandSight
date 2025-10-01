import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { DateRange } from "react-day-picker";
import AppHeader from "@/components/AppHeader";
import Sidebar from "@/components/Sidebar";
import DateRangePicker from "@/components/DateRangePicker";
import MetricsGrid from "@/components/MetricsGrid";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RefreshCw, Download, InfoIcon, AlertTriangle, Heart, TrendingUp, Brain, CheckCircle, ArrowRight, Target, Zap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { format } from "date-fns";

// Lazy-loaded components for progressive loading
import {
  LazyVendorPerformanceChart,
  LazyVendorComparisonTable,
  LazyTopProducts,
  LazyLandingPagesAnalysis,
  LazyReferralSources
} from "@/components/LazyComponents";
import LazyWrapper from "@/components/LazyWrapper";

// Performance monitoring hooks - DISABLED for performance fix
// import { usePerformanceMonitor, useMemoryStats, useDatasetOptimization } from "@/hooks/use-performance";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  
  // Performance monitoring - DISABLED to fix 62+ second loading times
  // usePerformanceMonitor('Dashboard');
  // useMemoryStats();
  // const { clearCache, performCleanup } = useDatasetOptimization();
  
  // Check if using demo data - always fetch stores to detect real vs demo mode
  const { data: stores } = useQuery({
    queryKey: ['/api/stores'],
    retry: 1
  });
  
  const isDemoMode = !stores || !Array.isArray(stores) || stores.length === 0 || stores[0]?.id === 'demo_store_1';
  
  // Date range state for filtering analytics
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const today = new Date();
    const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { from: lastMonth, to: today };
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Phase 1 Data Fetching for Dashboard Integration
  // Fetch recent alerts for AlertsSummary
  const { data: alertsData } = useQuery({
    queryKey: ['/api/alerts', { limit: 5, severity: 'high' }],
    enabled: !isDemoMode,
    initialData: isDemoMode ? { data: getDemoAlertsData() } : undefined
  });

  // Fetch brand loyalty data for TopPerformingBrands
  const { data: loyaltyData } = useQuery({
    queryKey: ['/api/brand-loyalty/affinity'],
    enabled: !isDemoMode,
    initialData: isDemoMode ? getDemoBrandLoyaltyData() : undefined
  });

  // Fetch forecasting data for predictions
  const { data: forecastingData } = useQuery({
    queryKey: ['/api/forecasts/sales', { period: 30 }],
    enabled: !isDemoMode,
    initialData: isDemoMode ? { data: getDemoForecastingData(), summary: getDemoForecastingSummary() } : undefined
  });

  // Fetch inventory overview for QuickStats
  const { data: inventoryData } = useQuery({
    queryKey: ['/api/inventory/overview'],
    enabled: !isDemoMode,
    initialData: isDemoMode ? getDemoInventoryData() : undefined
  });

  // Fetch alert statistics for QuickStats
  const { data: alertStatsData } = useQuery({
    queryKey: ['/api/alerts/stats'],
    enabled: !isDemoMode,
    initialData: isDemoMode ? getDemoAlertStatsData() : undefined
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-brand-600 mx-auto mb-4"></div>
          <h2 className="text-lg font-medium text-gray-900">Loading dashboard...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <div className="flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader mobileMenuButton={<Sidebar />} />
          
          <main className="flex-1 p-4 sm:p-6 max-w-full">
          {/* Demo Mode Alert */}
          {isDemoMode && (
            <Alert className="mb-6 bg-brand-50 border-brand-200">
              <InfoIcon className="h-4 w-4 text-brand-600" />
              <AlertDescription className="text-brand-800">
                <strong>Demo Mode:</strong> You're viewing sample analytics data for popular athletic brands. 
                <a href="/setup" className="underline ml-1 text-brand-700 hover:text-brand-900">
                  Connect your Shopify store
                </a> to see your real vendor analytics.
              </AlertDescription>
            </Alert>
          )}
          
          {/* Enhanced Page Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2" data-testid="text-dashboard-title">
                  Vendor Analytics Dashboard
                </h2>
                <p className="text-sm sm:text-base text-gray-600" data-testid="text-dashboard-description">
                  Track performance metrics by brand and vendor across your store
                </p>
              </div>
              
              {/* Analytics Controls */}
              <div className="flex flex-col w-full sm:w-auto sm:flex-row gap-2 sm:gap-3">
                <DateRangePicker
                  value={dateRange}
                  onChange={setDateRange}
                  placeholder="Select date range"
                />
                <div className="flex flex-row gap-2 sm:gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 sm:flex-none"
                    onClick={async () => {
                      setIsRefreshing(true);
                      // Simulate refresh delay
                      await new Promise(resolve => setTimeout(resolve, 1000));
                      setIsRefreshing(false);
                      toast({
                        title: "Data refreshed",
                        description: "Analytics data has been updated with latest information.",
                      });
                    }}
                    disabled={isRefreshing}
                    data-testid="button-refresh-data"
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
                    <span className="sm:hidden">{isRefreshing ? '...' : 'Refresh'}</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 sm:flex-none"
                    onClick={() => {
                      toast({
                        title: "Export started",
                        description: "Your vendor analytics report is being generated...",
                      });
                    }}
                    data-testid="button-export-data"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Export</span>
                    <span className="sm:hidden">Export</span>
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Date Range Display */}
            {dateRange?.from && (
              <div className="mt-4 p-3 bg-brand-50 border border-brand-200 rounded-lg">
                <p className="text-xs sm:text-sm text-brand-700" data-testid="text-active-date-range">
                  <span className="font-medium">Showing data for:</span> {' '}
                  <span className="block sm:inline mt-1 sm:mt-0">
                    {dateRange.to 
                      ? `${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`
                      : dateRange.from.toLocaleDateString()
                    }
                  </span>
                </p>
              </div>
            )}
          </div>

          {/* Key Metrics Cards - Load immediately for key metrics */}
          <MetricsGrid />

          {/* Phase 1 Enhanced Metrics - BrandSight Intelligence */}
          <div className="mb-6 sm:mb-8">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">BrandSight Intelligence</h3>
              <p className="text-gray-600">AI-powered insights across all business areas</p>
            </div>
            <PhaseOneQuickStats 
              alertsData={alertStatsData}
              loyaltyData={loyaltyData}
              inventoryData={inventoryData}
              forecastingData={forecastingData?.summary}
            />
          </div>

          {/* Critical Alerts Summary */}
          {alertsData?.data && alertsData.data.length > 0 && (
            <div className="mb-6 sm:mb-8">
              <AlertsSummaryDashboard alerts={alertsData.data} />
            </div>
          )}

          {/* Top Performing Brands */}
          <div className="mb-6 sm:mb-8">
            <TopPerformingBrandsDashboard 
              loyaltyData={loyaltyData}
              forecastingData={forecastingData?.data}
            />
          </div>

          {/* Actionable Insights */}
          <div className="mb-6 sm:mb-8">
            <ActionableInsightsDashboard 
              alertsData={alertsData?.data}
              loyaltyData={loyaltyData}
              inventoryData={inventoryData}
              forecastingData={forecastingData?.data}
            />
          </div>

          {/* Interactive Performance Chart - Progressive loading */}
          <div className="mb-6 sm:mb-8">
            <LazyWrapper 
              fallbackType="chart"
              minHeight="400px" 
              rootMargin="100px"
              skeletonProps={{ height: "h-80" }}
              data-testid="vendor-performance-chart-wrapper"
            >
              <LazyVendorPerformanceChart dateRange={dateRange} />
            </LazyWrapper>
          </div>

          {/* Top Products Card - Progressive loading */}
          <div className="mb-6 sm:mb-8">
            <LazyWrapper 
              fallbackType="cards"
              minHeight="300px" 
              rootMargin="150px"
              skeletonProps={{ count: 3, columns: 1, hasImages: true }}
              data-testid="top-products-wrapper"
            >
              <LazyTopProducts />
            </LazyWrapper>
          </div>

          {/* Vendor Comparison Table - Progressive loading with virtualization */}
          <LazyWrapper 
            fallbackType="virtualized"
            minHeight="500px" 
            rootMargin="200px"
            className="mb-6 sm:mb-8"
            skeletonProps={{ height: 500, itemHeight: 73 }}
            data-testid="vendor-comparison-table-wrapper"
          >
            <LazyVendorComparisonTable dateRange={dateRange} />
          </LazyWrapper>

          {/* Top Referral Sources - Progressive loading */}
          <LazyWrapper 
            fallbackType="table"
            minHeight="400px" 
            rootMargin="250px"
            className="mb-6 sm:mb-8"
            skeletonProps={{ rows: 6, columns: 5, showSearch: false, showFilters: false }}
            data-testid="referral-sources-wrapper"
          >
            <LazyReferralSources />
          </LazyWrapper>

          {/* Landing Pages Analysis - Progressive loading */}
          <LazyWrapper 
            fallbackType="cards"
            minHeight="400px" 
            rootMargin="300px"
            skeletonProps={{ count: 4, columns: 2, hasImages: false }}
            data-testid="landing-pages-analysis-wrapper"
          >
            <LazyLandingPagesAnalysis />
          </LazyWrapper>
          </main>
        </div>
      </div>
    </div>
  );
}

// Phase 1 Dashboard Components

// Enhanced QuickStats Component
interface PhaseOneQuickStatsProps {
  alertsData: any;
  loyaltyData: any;
  inventoryData: any;
  forecastingData: any;
}

function PhaseOneQuickStats({ alertsData, loyaltyData, inventoryData, forecastingData }: PhaseOneQuickStatsProps) {
  const quickStats = [
    {
      title: "Active Alerts",
      value: alertsData?.activeAlerts || 0,
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-50",
      link: "/alerts"
    },
    {
      title: "Avg Loyalty Score",
      value: loyaltyData ? (loyaltyData.reduce((sum: number, item: any) => sum + item.affinityScore, 0) / loyaltyData.length).toFixed(1) : "0.0",
      icon: Heart,
      color: "text-pink-600",
      bgColor: "bg-pink-50",
      link: "/brand-loyalty"
    },
    {
      title: "Inventory Value",
      value: inventoryData?.totalInventoryValue ? `$${(inventoryData.totalInventoryValue / 1000).toFixed(0)}K` : "$0",
      icon: Target,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      link: "/inventory"
    },
    {
      title: "Forecast Confidence",
      value: forecastingData?.avgConfidence ? `${forecastingData.avgConfidence.toFixed(0)}%` : "0%",
      icon: Brain,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      link: "/forecasting"
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {quickStats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Link key={index} href={stat.link}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer" data-testid={`phase1-stat-${index}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

// Alerts Summary Component
interface AlertsSummaryDashboardProps {
  alerts: any[];
}

function AlertsSummaryDashboard({ alerts }: AlertsSummaryDashboardProps) {
  const criticalAlerts = alerts.filter(alert => alert.severity === 'high').slice(0, 3);

  if (criticalAlerts.length === 0) return null;

  return (
    <Card data-testid="alerts-summary-dashboard">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <CardTitle>Critical Alerts</CardTitle>
          </div>
          <Link href="/alerts">
            <Button variant="ghost" size="sm" className="text-brand-600 hover:text-brand-700">
              View All <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
        <CardDescription>Issues requiring immediate attention</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {criticalAlerts.map((alert, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex-1">
                <p className="font-medium text-red-900">{alert.vendorName || 'System'}</p>
                <p className="text-sm text-red-700 line-clamp-2">{alert.message}</p>
              </div>
              <Badge variant="destructive">
                {alert.severity.toUpperCase()}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Top Performing Brands Component
interface TopPerformingBrandsDashboardProps {
  loyaltyData: any[];
  forecastingData: any[];
}

function TopPerformingBrandsDashboard({ loyaltyData, forecastingData }: TopPerformingBrandsDashboardProps) {
  // Combine loyalty and forecasting data to determine top performers
  const topBrands = loyaltyData?.slice(0, 4).map((brand, index) => {
    const forecast = forecastingData?.find(f => f.vendorName === brand.vendorName);
    return {
      ...brand,
      predictedGrowth: forecast?.growthPrediction || 0,
      confidence: forecast?.confidenceScore || 0
    };
  }) || [];

  return (
    <Card data-testid="top-performing-brands-dashboard">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            <CardTitle>Top Performing Brands</CardTitle>
          </div>
          <Link href="/brand-loyalty">
            <Button variant="ghost" size="sm" className="text-brand-600 hover:text-brand-700">
              View Analysis <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
        <CardDescription>Based on loyalty scores and growth predictions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {topBrands.map((brand, index) => (
            <div key={index} className="p-4 border rounded-lg bg-gradient-to-r from-green-50 to-blue-50">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-900">{brand.vendorName}</h4>
                <Badge variant="default" className="bg-green-100 text-green-800">
                  #{index + 1}
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Loyalty Score:</span>
                  <span className="font-medium">{brand.affinityScore?.toFixed(1)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Predicted Growth:</span>
                  <span className={`font-medium ${brand.predictedGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {brand.predictedGrowth >= 0 ? '+' : ''}{brand.predictedGrowth?.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Customers:</span>
                  <span className="font-medium">{brand.totalCustomers}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Actionable Insights Component
interface ActionableInsightsDashboardProps {
  alertsData: any[];
  loyaltyData: any[];
  inventoryData: any;
  forecastingData: any[];
}

function ActionableInsightsDashboard({ alertsData, loyaltyData, inventoryData, forecastingData }: ActionableInsightsDashboardProps) {
  const insights = [];

  // Generate insights based on data
  if (alertsData && alertsData.length > 0) {
    insights.push({
      type: 'alert',
      title: 'Critical Alerts Require Attention',
      description: `${alertsData.length} active alerts need resolution`,
      action: 'Review Alerts',
      link: '/alerts',
      urgency: 'high'
    });
  }

  if (inventoryData?.reorderNeeded > 0) {
    insights.push({
      type: 'inventory',
      title: 'Inventory Reorder Needed',
      description: `${inventoryData.reorderNeeded} products below reorder point`,
      action: 'Review Inventory',
      link: '/inventory',
      urgency: 'medium'
    });
  }

  if (loyaltyData && loyaltyData.length > 0) {
    const topBrand = loyaltyData[0];
    insights.push({
      type: 'loyalty',
      title: 'Loyalty Leader Opportunity',
      description: `${topBrand.vendorName} shows highest loyalty (${topBrand.affinityScore?.toFixed(1)}) - consider expanding`,
      action: 'View Brand Analysis',
      link: '/brand-loyalty',
      urgency: 'low'
    });
  }

  if (forecastingData && forecastingData.length > 0) {
    const growthBrand = forecastingData.find(f => f.growthPrediction > 20);
    if (growthBrand) {
      insights.push({
        type: 'forecast',
        title: 'High Growth Prediction',
        description: `${growthBrand.vendorName} forecasted +${growthBrand.growthPrediction?.toFixed(1)}% growth`,
        action: 'View Forecasts',
        link: '/forecasting',
        urgency: 'medium'
      });
    }
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'border-red-200 bg-red-50';
      case 'medium': return 'border-yellow-200 bg-yellow-50';
      case 'low': return 'border-blue-200 bg-blue-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const getUrgencyIcon = (type: string) => {
    switch (type) {
      case 'alert': return AlertTriangle;
      case 'inventory': return Target;
      case 'loyalty': return Heart;
      case 'forecast': return Brain;
      default: return Zap;
    }
  };

  if (insights.length === 0) {
    return (
      <Card data-testid="actionable-insights-dashboard">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <CardTitle>All Systems Optimal</CardTitle>
          </div>
          <CardDescription>No critical actions needed at this time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
            <p className="text-gray-600">Your business metrics are performing well across all areas.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="actionable-insights-dashboard">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-yellow-500" />
          <CardTitle>Actionable Insights</CardTitle>
        </div>
        <CardDescription>Priority recommendations across all business areas</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {insights.slice(0, 4).map((insight, index) => {
            const Icon = getUrgencyIcon(insight.type);
            return (
              <div key={index} className={`p-4 border rounded-lg ${getUrgencyColor(insight.urgency)}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <Icon className="h-5 w-5 mt-0.5 text-gray-600" />
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 mb-1">{insight.title}</h4>
                      <p className="text-sm text-gray-700 mb-2">{insight.description}</p>
                    </div>
                  </div>
                  <Link href={insight.link}>
                    <Button variant="outline" size="sm">
                      {insight.action}
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// Demo Data Functions for Dashboard Integration
function getDemoAlertsData() {
  return [
    {
      id: 'alert_1',
      alertType: 'performance_drop',
      message: 'Nike sales dropped by 25% compared to last week',
      severity: 'high',
      vendorName: 'Nike',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      isRead: false
    },
    {
      id: 'alert_2',
      alertType: 'inventory_low',
      message: 'Adidas running shoes inventory critically low',
      severity: 'high',
      vendorName: 'Adidas',
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      isRead: false
    }
  ];
}

function getDemoBrandLoyaltyData() {
  return [
    {
      vendorId: 'vendor_1',
      vendorName: 'Nike',
      affinityScore: 8.2,
      totalCustomers: 234,
      totalSpent: 89450,
      averageOrderValue: 125.30
    },
    {
      vendorId: 'vendor_2',
      vendorName: 'Adidas',
      affinityScore: 7.8,
      totalCustomers: 198,
      totalSpent: 72340,
      averageOrderValue: 118.90
    },
    {
      vendorId: 'vendor_3',
      vendorName: 'Under Armour',
      affinityScore: 6.9,
      totalCustomers: 156,
      totalSpent: 51230,
      averageOrderValue: 108.50
    },
    {
      vendorId: 'vendor_4',
      vendorName: 'Puma',
      affinityScore: 6.4,
      totalCustomers: 142,
      totalSpent: 43890,
      averageOrderValue: 95.20
    }
  ];
}

function getDemoForecastingData() {
  return [
    {
      vendorId: 'vendor_1',
      vendorName: 'Nike',
      predictedRevenue: 45000,
      growthPrediction: 18.5,
      confidenceScore: 85.2
    },
    {
      vendorId: 'vendor_2',
      vendorName: 'Adidas',
      predictedRevenue: 38000,
      growthPrediction: 12.3,
      confidenceScore: 78.9
    },
    {
      vendorId: 'vendor_3',
      vendorName: 'Under Armour',
      predictedRevenue: 28000,
      growthPrediction: 8.7,
      confidenceScore: 72.4
    }
  ];
}

function getDemoForecastingSummary() {
  return {
    totalForecastedRevenue: 145670,
    avgConfidence: 78.5,
    avgGrowthRate: 12.3,
    totalVendors: 4
  };
}

function getDemoInventoryData() {
  return {
    totalProducts: 156,
    totalInventoryValue: 487230,
    avgSellThroughRate: 18.5,
    deadStockValue: 23450,
    deadStockCount: 8,
    fastMovingProducts: 45,
    slowMovingProducts: 23,
    outOfStockProducts: 5,
    lowStockProducts: 12,
    reorderNeeded: 18
  };
}

function getDemoAlertStatsData() {
  return {
    totalAlerts: 12,
    activeAlerts: 4,
    highPriorityAlerts: 2,
    resolvedToday: 3,
    newAlertsLast24h: 2
  };
}
