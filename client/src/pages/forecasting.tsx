import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { DateRange } from "react-day-picker";
import AppHeader from "@/components/AppHeader";
import Sidebar from "@/components/Sidebar";
import DateRangePicker from "@/components/DateRangePicker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { 
  RefreshCw, 
  Download, 
  InfoIcon, 
  TrendingUp,
  TrendingDown,
  BarChart3,
  Target,
  Calendar,
  DollarSign,
  Activity,
  Zap,
  Brain,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format, addDays, parseISO } from "date-fns";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  ComposedChart,
  Scatter,
  ScatterChart,
  ReferenceLine
} from "recharts";

interface SalesForecastData {
  vendorId: string;
  vendorName: string;
  forecastPeriod: 30 | 60 | 90;
  periodStartDate: string;
  periodEndDate: string;
  predictedRevenue: number;
  predictedOrders: number;
  confidenceScore: number;
  historicalAverage: number;
  growthPrediction: number;
  seasonalityFactor: number;
  modelUsed: string;
  dailyForecasts: Array<{
    date: string;
    predictedSales: number;
    confidenceLow: number;
    confidenceHigh: number;
  }>;
}

interface TrendAnalysisData {
  vendorId: string;
  vendorName: string;
  period: string;
  historicalData: Array<{
    date: string;
    actualSales: number;
    trend: number;
    seasonal: number;
  }>;
  trendDirection: 'up' | 'down' | 'stable';
  seasonalPatterns: Array<{
    month: string;
    seasonalityIndex: number;
  }>;
  growthRate: number;
  volatility: number;
}

interface AccuracyData {
  vendorId: string;
  vendorName: string;
  modelType: string;
  period: 30 | 60 | 90;
  accuracy: number;
  mape: number; // Mean Absolute Percentage Error
  rmse: number; // Root Mean Square Error
  bias: number;
  lastUpdated: string;
  forecastCount: number;
  successfulPredictions: number;
}

interface ForecastInsight {
  type: 'growth' | 'decline' | 'seasonal' | 'anomaly';
  vendorName: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  recommendation: string;
  value: number;
}

const CONFIDENCE_COLORS = {
  high: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-red-100 text-red-800'
};

const TREND_COLORS = {
  up: '#10b981',
  down: '#ef4444',
  stable: '#6b7280'
};

export default function ForecastingPage() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  
  // Check if using demo data
  const { data: stores } = useQuery({
    queryKey: ['/api/stores'],
    enabled: isAuthenticated
  });
  
  const isDemoMode = !stores || !Array.isArray(stores) || stores.length === 0 || stores[0]?.id === 'demo_store_1';
  
  // State for filters
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const today = new Date();
    const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { from: lastMonth, to: today };
  });
  
  const [selectedVendor, setSelectedVendor] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('30');
  const [selectedModel, setSelectedModel] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('forecasts');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch vendors for filter dropdown
  const { data: vendors } = useQuery({
    queryKey: ['/api/stores/current/vendors'],
    enabled: isAuthenticated
  });

  // Fetch sales forecasts
  const { data: forecastsData, isLoading: forecastsLoading, refetch: refetchForecasts } = useQuery({
    queryKey: ['/api/forecasts/sales', {
      vendorId: selectedVendor !== 'all' ? selectedVendor : undefined,
      period: selectedPeriod !== 'all' ? parseInt(selectedPeriod) : 30,
      startDate: dateRange?.from?.toISOString(),
      endDate: dateRange?.to?.toISOString()
    }],
    enabled: isAuthenticated,
    initialData: isDemoMode ? { data: getDemoForecastsData(), summary: getDemoForecastsSummary() } : undefined
  });

  // Fetch trend analysis
  const { data: trendsData, isLoading: trendsLoading } = useQuery({
    queryKey: ['/api/forecasts/trends', {
      vendorId: selectedVendor !== 'all' ? selectedVendor : undefined,
      period: selectedPeriod !== 'all' ? parseInt(selectedPeriod) : 30,
      startDate: dateRange?.from?.toISOString(),
      endDate: dateRange?.to?.toISOString()
    }],
    enabled: isAuthenticated,
    initialData: isDemoMode ? getDemoTrendsData() : undefined
  });

  // Fetch accuracy metrics
  const { data: accuracyData, isLoading: accuracyLoading } = useQuery({
    queryKey: ['/api/forecasts/accuracy', {
      vendorId: selectedVendor !== 'all' ? selectedVendor : undefined,
      period: selectedPeriod !== 'all' ? parseInt(selectedPeriod) : undefined,
      modelType: selectedModel !== 'all' ? selectedModel : undefined
    }],
    enabled: isAuthenticated,
    initialData: isDemoMode ? getDemoAccuracyData() : undefined
  });

  // Refresh forecasts mutation
  const refreshForecastsMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/forecasts/refresh'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/forecasts'] });
      toast({
        title: "Forecasts updated",
        description: "All forecasting models have been refreshed with latest data.",
      });
    }
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetchForecasts();
    if (!isDemoMode) {
      await refreshForecastsMutation.mutateAsync();
    }
    setIsRefreshing(false);
  };

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-brand-600 mx-auto mb-4"></div>
          <h2 className="text-lg font-medium text-gray-900">Loading predictive forecasting...</h2>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const forecastsSummary = forecastsData?.summary || {};

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <AppHeader />
      
      <div className="flex">
        <Sidebar />
        
        <main className="flex-1 p-6">
          {/* Demo Mode Alert */}
          {isDemoMode && (
            <Alert className="mb-6 bg-brand-50 border-brand-200" data-testid="demo-alert">
              <InfoIcon className="h-4 w-4 text-brand-600" />
              <AlertDescription className="text-brand-800">
                <strong>Demo Mode:</strong> You're viewing sample forecasting data. 
                <a href="/api/login" className="underline ml-1 text-brand-700 hover:text-brand-900">
                  Connect your Shopify store
                </a> to see your real predictive analytics.
              </AlertDescription>
            </Alert>
          )}
          
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2" data-testid="text-page-title">
                  Predictive Forecasting
                </h2>
                <p className="text-gray-600" data-testid="text-page-description">
                  AI-powered sales predictions and trend analysis for strategic planning
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <DateRangePicker
                  value={dateRange}
                  onChange={setDateRange}
                  placeholder="Historical data range"
                />
                <Button
                  variant="outline"
                  size="default"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  data-testid="button-refresh-forecasts"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Updating...' : 'Refresh Models'}
                </Button>
                <Button variant="default" size="default" data-testid="button-export">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            </div>
          </div>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card data-testid="card-total-forecasted-revenue">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Forecasted Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  ${forecastsSummary.totalForecastedRevenue?.toLocaleString() || '0'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Next {selectedPeriod} days
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-avg-confidence">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
                <Brain className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {forecastsSummary.avgConfidence?.toFixed(1) || '0.0'}%
                </div>
                <p className="text-xs text-muted-foreground">Model accuracy</p>
              </CardContent>
            </Card>

            <Card data-testid="card-predicted-growth">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Predicted Growth</CardTitle>
                <TrendingUp className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {forecastsSummary.avgGrowthRate?.toFixed(1) || '0.0'}%
                </div>
                <p className="text-xs text-muted-foreground">vs historical average</p>
              </CardContent>
            </Card>

            <Card data-testid="card-active-forecasts">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Forecasts</CardTitle>
                <Activity className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {forecastsSummary.totalVendors || 0}
                </div>
                <p className="text-xs text-muted-foreground">Vendor predictions</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Forecast Settings
              </CardTitle>
              <CardDescription>
                Customize forecast parameters and analysis scope
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Vendor</label>
                  <Select value={selectedVendor} onValueChange={setSelectedVendor}>
                    <SelectTrigger data-testid="select-vendor-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Vendors</SelectItem>
                      {vendors?.map((vendor: any) => (
                        <SelectItem key={vendor.id} value={vendor.id}>
                          {vendor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Forecast Period</label>
                  <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                    <SelectTrigger data-testid="select-period-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 Days</SelectItem>
                      <SelectItem value="60">60 Days</SelectItem>
                      <SelectItem value="90">90 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Model Type</label>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger data-testid="select-model-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Models</SelectItem>
                      <SelectItem value="linear_regression">Linear Regression</SelectItem>
                      <SelectItem value="arima">ARIMA</SelectItem>
                      <SelectItem value="prophet">Prophet</SelectItem>
                      <SelectItem value="ensemble">Ensemble</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Analytics Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="forecasts" data-testid="tab-sales-forecasts">
                Sales Forecasts
              </TabsTrigger>
              <TabsTrigger value="trends" data-testid="tab-trend-analysis">
                Trend Analysis
              </TabsTrigger>
              <TabsTrigger value="accuracy" data-testid="tab-forecast-accuracy">
                Model Accuracy
              </TabsTrigger>
              <TabsTrigger value="insights" data-testid="tab-predictive-insights">
                Insights
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="forecasts" className="mt-6">
              <SalesForecastsTab data={forecastsData?.data || []} isLoading={forecastsLoading} />
            </TabsContent>
            
            <TabsContent value="trends" className="mt-6">
              <TrendAnalysisTab data={trendsData || []} isLoading={trendsLoading} />
            </TabsContent>
            
            <TabsContent value="accuracy" className="mt-6">
              <AccuracyTab data={accuracyData || []} isLoading={accuracyLoading} />
            </TabsContent>
            
            <TabsContent value="insights" className="mt-6">
              <InsightsTab 
                forecastsData={forecastsData?.data || []} 
                trendsData={trendsData || []}
                isLoading={forecastsLoading || trendsLoading} 
              />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}

// Sales Forecasts Tab Component
interface SalesForecastsTabProps {
  data: SalesForecastData[];
  isLoading: boolean;
}

function SalesForecastsTab({ data, isLoading }: SalesForecastsTabProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
            <span className="ml-2">Loading sales forecasts...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare combined chart data for all vendors
  const chartData = data[0]?.dailyForecasts?.map((day, index) => {
    const dataPoint: any = {
      date: format(parseISO(day.date), 'MMM dd'),
      dateValue: day.date
    };

    data.forEach((vendor, vendorIndex) => {
      if (vendor.dailyForecasts[index]) {
        dataPoint[`${vendor.vendorName}_predicted`] = vendor.dailyForecasts[index].predictedSales;
        dataPoint[`${vendor.vendorName}_low`] = vendor.dailyForecasts[index].confidenceLow;
        dataPoint[`${vendor.vendorName}_high`] = vendor.dailyForecasts[index].confidenceHigh;
      }
    });

    return dataPoint;
  }) || [];

  const colors = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Forecast Chart */}
      <Card data-testid="chart-sales-forecasts" className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Sales Forecast Trends</CardTitle>
          <CardDescription>Daily predictions with confidence intervals</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip 
                labelFormatter={(label) => `Date: ${label}`}
                formatter={(value: number, name: string) => [
                  `$${value.toLocaleString()}`,
                  name.replace('_predicted', ' Forecast').replace('_', ' ')
                ]}
              />
              <Legend />
              {data.map((vendor, index) => (
                <Area
                  key={vendor.vendorId}
                  type="monotone"
                  dataKey={`${vendor.vendorName}_predicted`}
                  stackId="1"
                  stroke={colors[index % colors.length]}
                  fill={colors[index % colors.length]}
                  fillOpacity={0.3}
                  name={vendor.vendorName}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Forecast Summary */}
      <Card data-testid="table-forecast-summary">
        <CardHeader>
          <CardTitle>Forecast Summary</CardTitle>
          <CardDescription>Key predictions by vendor</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.map((forecast) => (
              <div key={forecast.vendorId} className="p-4 border rounded-lg bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">{forecast.vendorName}</h4>
                  <Badge 
                    variant={
                      forecast.confidenceScore >= 80 ? 'default' :
                      forecast.confidenceScore >= 60 ? 'secondary' : 'outline'
                    }
                  >
                    {forecast.confidenceScore.toFixed(0)}% confidence
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-600">Predicted Revenue</p>
                    <p className="font-bold text-green-600">
                      ${forecast.predictedRevenue.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Growth Rate</p>
                    <p className={`font-bold ${forecast.growthPrediction >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {forecast.growthPrediction >= 0 ? '+' : ''}{forecast.growthPrediction.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Orders</p>
                    <p className="font-bold">{forecast.predictedOrders}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Model</p>
                    <p className="font-medium text-blue-600">{forecast.modelUsed}</p>
                  </div>
                </div>
                
                {/* Progress bar for growth */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>Growth vs Historical</span>
                    <span>{forecast.growthPrediction.toFixed(1)}%</span>
                  </div>
                  <Progress 
                    value={Math.max(0, Math.min(100, forecast.growthPrediction + 50))} 
                    className="h-2"
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Trend Analysis Tab Component
interface TrendAnalysisTabProps {
  data: TrendAnalysisData[];
  isLoading: boolean;
}

function TrendAnalysisTab({ data, isLoading }: TrendAnalysisTabProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
            <span className="ml-2">Loading trend analysis...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Historical Trends Chart */}
      <Card data-testid="chart-historical-trends">
        <CardHeader>
          <CardTitle>Historical Sales Trends</CardTitle>
          <CardDescription>Actual sales with trend decomposition</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={data[0]?.historicalData || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="actualSales" 
                fill="#8b5cf6" 
                fillOpacity={0.3}
                stroke="#8b5cf6"
                name="Actual Sales"
              />
              <Line 
                type="monotone" 
                dataKey="trend" 
                stroke="#10b981" 
                strokeWidth={3}
                name="Trend Line"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Trend Summary */}
      <Card data-testid="table-trend-summary">
        <CardHeader>
          <CardTitle>Trend Analysis Summary</CardTitle>
          <CardDescription>Key trend indicators by vendor</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead className="text-right">Growth Rate</TableHead>
                <TableHead className="text-right">Volatility</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((trend) => (
                <TableRow key={trend.vendorId}>
                  <TableCell className="font-medium">{trend.vendorName}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {trend.trendDirection === 'up' && <TrendingUp className="h-4 w-4 text-green-500" />}
                      {trend.trendDirection === 'down' && <TrendingDown className="h-4 w-4 text-red-500" />}
                      {trend.trendDirection === 'stable' && <Activity className="h-4 w-4 text-gray-500" />}
                      <Badge 
                        variant={
                          trend.trendDirection === 'up' ? 'default' :
                          trend.trendDirection === 'down' ? 'destructive' : 'secondary'
                        }
                      >
                        {trend.trendDirection}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={trend.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {trend.growthRate >= 0 ? '+' : ''}{trend.growthRate.toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={trend.volatility > 50 ? 'destructive' : trend.volatility > 25 ? 'default' : 'secondary'}>
                      {trend.volatility.toFixed(1)}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Seasonal Patterns */}
      <Card data-testid="chart-seasonal-patterns" className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Seasonal Patterns</CardTitle>
          <CardDescription>Monthly seasonality index across vendors</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data[0]?.seasonalPatterns || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <ReferenceLine y={100} stroke="#6b7280" strokeDasharray="3 3" />
              <Bar 
                dataKey="seasonalityIndex" 
                fill="#8b5cf6"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

// Model Accuracy Tab Component
interface AccuracyTabProps {
  data: AccuracyData[];
  isLoading: boolean;
}

function AccuracyTab({ data, isLoading }: AccuracyTabProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
            <span className="ml-2">Loading accuracy metrics...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const avgAccuracy = data.length > 0 ? data.reduce((sum, item) => sum + item.accuracy, 0) / data.length : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Accuracy Overview */}
      <Card data-testid="card-accuracy-overview">
        <CardHeader>
          <CardTitle>Model Performance Overview</CardTitle>
          <CardDescription>Overall accuracy metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600 mb-2">
                {avgAccuracy.toFixed(1)}%
              </div>
              <p className="text-gray-600">Average Model Accuracy</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {data.reduce((sum, item) => sum + item.forecastCount, 0)}
                </div>
                <p className="text-sm text-blue-700">Total Forecasts</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {data.reduce((sum, item) => sum + item.successfulPredictions, 0)}
                </div>
                <p className="text-sm text-green-700">Successful Predictions</p>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">Model Types Performance</h4>
              <div className="space-y-2">
                {['linear_regression', 'arima', 'prophet', 'ensemble'].map((model) => {
                  const modelData = data.filter(item => item.modelType === model);
                  const modelAccuracy = modelData.length > 0 
                    ? modelData.reduce((sum, item) => sum + item.accuracy, 0) / modelData.length 
                    : 0;
                  
                  return (
                    <div key={model} className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">
                        {model.replace('_', ' ')}
                      </span>
                      <div className="flex items-center gap-2">
                        <Progress value={modelAccuracy} className="w-20 h-2" />
                        <span className="text-sm font-medium w-12">
                          {modelAccuracy.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Accuracy Table */}
      <Card data-testid="table-accuracy-details">
        <CardHeader>
          <CardTitle>Detailed Model Metrics</CardTitle>
          <CardDescription>Performance breakdown by vendor and model</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor</TableHead>
                <TableHead>Model</TableHead>
                <TableHead className="text-right">Accuracy</TableHead>
                <TableHead className="text-right">MAPE</TableHead>
                <TableHead className="text-right">Predictions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((accuracy) => (
                <TableRow key={`${accuracy.vendorId}-${accuracy.modelType}`}>
                  <TableCell className="font-medium">{accuracy.vendorName}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {accuracy.modelType.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge 
                      variant={
                        accuracy.accuracy >= 80 ? 'default' :
                        accuracy.accuracy >= 60 ? 'secondary' : 'destructive'
                      }
                    >
                      {accuracy.accuracy.toFixed(1)}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {accuracy.mape.toFixed(2)}%
                  </TableCell>
                  <TableCell className="text-right">
                    {accuracy.successfulPredictions}/{accuracy.forecastCount}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// Predictive Insights Tab Component
interface InsightsTabProps {
  forecastsData: SalesForecastData[];
  trendsData: TrendAnalysisData[];
  isLoading: boolean;
}

function InsightsTab({ forecastsData, trendsData, isLoading }: InsightsTabProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
            <span className="ml-2">Generating insights...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Generate insights from forecast and trend data
  const insights: ForecastInsight[] = [];

  // Growth opportunities
  forecastsData.forEach(forecast => {
    if (forecast.growthPrediction > 15) {
      insights.push({
        type: 'growth',
        vendorName: forecast.vendorName,
        description: `Strong growth predicted for ${forecast.vendorName}`,
        confidence: forecast.confidenceScore,
        impact: forecast.growthPrediction > 25 ? 'high' : 'medium',
        recommendation: `Consider increasing inventory and marketing investment for ${forecast.vendorName}`,
        value: forecast.predictedRevenue
      });
    }
  });

  // Decline warnings
  forecastsData.forEach(forecast => {
    if (forecast.growthPrediction < -10) {
      insights.push({
        type: 'decline',
        vendorName: forecast.vendorName,
        description: `Potential decline forecasted for ${forecast.vendorName}`,
        confidence: forecast.confidenceScore,
        impact: forecast.growthPrediction < -20 ? 'high' : 'medium',
        recommendation: `Review pricing and promotional strategies for ${forecast.vendorName}`,
        value: Math.abs(forecast.predictedRevenue * (forecast.growthPrediction / 100))
      });
    }
  });

  // High volatility warnings
  trendsData.forEach(trend => {
    if (trend.volatility > 40) {
      insights.push({
        type: 'anomaly',
        vendorName: trend.vendorName,
        description: `High volatility detected in ${trend.vendorName} sales`,
        confidence: 85,
        impact: 'medium',
        recommendation: `Monitor ${trend.vendorName} closely and consider demand smoothing strategies`,
        value: trend.volatility
      });
    }
  });

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'growth': return <TrendingUp className="h-5 w-5 text-green-500" />;
      case 'decline': return <TrendingDown className="h-5 w-5 text-red-500" />;
      case 'seasonal': return <Calendar className="h-5 w-5 text-blue-500" />;
      case 'anomaly': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default: return <Zap className="h-5 w-5 text-purple-500" />;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'growth': return 'border-green-200 bg-green-50';
      case 'decline': return 'border-red-200 bg-red-50';
      case 'seasonal': return 'border-blue-200 bg-blue-50';
      case 'anomaly': return 'border-yellow-200 bg-yellow-50';
      default: return 'border-purple-200 bg-purple-50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Insights Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Growth Opportunities</p>
                <p className="text-2xl font-bold text-green-600">
                  {insights.filter(i => i.type === 'growth').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Risk Alerts</p>
                <p className="text-2xl font-bold text-red-600">
                  {insights.filter(i => i.type === 'decline' || i.type === 'anomaly').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">High Impact</p>
                <p className="text-2xl font-bold text-blue-600">
                  {insights.filter(i => i.impact === 'high').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Confidence</p>
                <p className="text-2xl font-bold text-purple-600">
                  {insights.length > 0 ? Math.round(insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length) : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights List */}
      <Card data-testid="list-predictive-insights">
        <CardHeader>
          <CardTitle>AI-Generated Insights</CardTitle>
          <CardDescription>
            Actionable recommendations based on forecast analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          {insights.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Critical Insights</h3>
              <p className="text-gray-500">
                Your forecasts are looking stable with no immediate action items.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {insights.map((insight, index) => (
                <div 
                  key={index}
                  className={`p-4 rounded-lg border-2 ${getInsightColor(insight.type)}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">
                      {getInsightIcon(insight.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{insight.description}</h4>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={insight.impact === 'high' ? 'destructive' : insight.impact === 'medium' ? 'default' : 'secondary'}
                          >
                            {insight.impact} impact
                          </Badge>
                          <Badge variant="outline">
                            {insight.confidence.toFixed(0)}% confidence
                          </Badge>
                        </div>
                      </div>
                      <p className="text-gray-700 mb-3">{insight.recommendation}</p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Vendor: {insight.vendorName}</span>
                        <span className="font-medium">
                          Value: ${insight.value.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Demo data functions
function getDemoForecastsData(): SalesForecastData[] {
  const vendors = [
    { id: 'vendor_1', name: 'Nike' },
    { id: 'vendor_2', name: 'Adidas' },
    { id: 'vendor_3', name: 'Under Armour' },
    { id: 'vendor_4', name: 'Puma' }
  ];

  return vendors.map((vendor, index) => ({
    vendorId: vendor.id,
    vendorName: vendor.name,
    forecastPeriod: 30 as const,
    periodStartDate: new Date().toISOString(),
    periodEndDate: addDays(new Date(), 30).toISOString(),
    predictedRevenue: Math.floor(Math.random() * 50000) + 20000,
    predictedOrders: Math.floor(Math.random() * 200) + 50,
    confidenceScore: Math.random() * 30 + 65,
    historicalAverage: Math.floor(Math.random() * 40000) + 15000,
    growthPrediction: (Math.random() - 0.5) * 40,
    seasonalityFactor: Math.random() * 0.4 + 0.8,
    modelUsed: ['linear_regression', 'arima', 'prophet', 'ensemble'][index],
    dailyForecasts: Array.from({ length: 30 }, (_, day) => {
      const baseValue = Math.random() * 2000 + 500;
      return {
        date: addDays(new Date(), day).toISOString(),
        predictedSales: baseValue,
        confidenceLow: baseValue * 0.8,
        confidenceHigh: baseValue * 1.2
      };
    })
  }));
}

function getDemoForecastsSummary() {
  return {
    totalForecastedRevenue: 145670,
    avgConfidence: 78.5,
    avgGrowthRate: 12.3,
    totalVendors: 4
  };
}

function getDemoTrendsData(): TrendAnalysisData[] {
  return [
    {
      vendorId: 'vendor_1',
      vendorName: 'Nike',
      period: '90d',
      historicalData: Array.from({ length: 30 }, (_, i) => ({
        date: format(addDays(new Date(), -30 + i), 'MMM dd'),
        actualSales: Math.random() * 3000 + 1000 + (i * 20),
        trend: 1200 + (i * 25),
        seasonal: Math.sin(i * 0.2) * 200 + 1200
      })),
      trendDirection: 'up' as const,
      seasonalPatterns: Array.from({ length: 12 }, (_, i) => ({
        month: format(new Date(2024, i), 'MMM'),
        seasonalityIndex: Math.random() * 40 + 80
      })),
      growthRate: 18.5,
      volatility: 25.3
    }
  ];
}

function getDemoAccuracyData(): AccuracyData[] {
  const vendors = ['Nike', 'Adidas', 'Under Armour', 'Puma'];
  const models = ['linear_regression', 'arima', 'prophet', 'ensemble'];
  
  return vendors.flatMap((vendor, vendorIndex) =>
    models.map((model, modelIndex) => ({
      vendorId: `vendor_${vendorIndex + 1}`,
      vendorName: vendor,
      modelType: model,
      period: 30 as const,
      accuracy: Math.random() * 30 + 60,
      mape: Math.random() * 15 + 5,
      rmse: Math.random() * 1000 + 500,
      bias: (Math.random() - 0.5) * 10,
      lastUpdated: new Date().toISOString(),
      forecastCount: Math.floor(Math.random() * 50) + 20,
      successfulPredictions: Math.floor(Math.random() * 40) + 15
    }))
  );
}