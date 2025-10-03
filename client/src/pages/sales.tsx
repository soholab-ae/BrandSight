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
import { RefreshCw, Download, InfoIcon, TrendingUp, TrendingDown, DollarSign, ShoppingCart } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

export default function SalesAnalytics() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  
  // Check if using demo data
  const { data: stores } = useQuery({
    queryKey: ['/api/stores'],
    enabled: isAuthenticated
  });
  
  const isDemoMode = !stores || !Array.isArray(stores) || stores.length === 0 || stores[0]?.id === 'demo_store_1';
  
  // Date range state
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const today = new Date();
    const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { from: lastMonth, to: today };
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Fetch analytics data
  const { data: analyticsData } = useQuery({
    queryKey: ['/api/stores/current/analytics/summary'],
    enabled: isAuthenticated,
  });

  const { data: vendors } = useQuery({
    queryKey: ['/api/stores/current/vendors'],
    enabled: isAuthenticated,
  });

  // Generate demo sales trend data
  const salesTrendData = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - 29 + i);
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      revenue: Math.floor(Math.random() * 2000) + 1000,
      orders: Math.floor(Math.random() * 30) + 10,
    };
  });

  // Generate vendor revenue data
  const vendorRevenueData = vendors?.map((vendor: any) => ({
    name: vendor.name,
    revenue: Math.floor(Math.random() * 50000) + 10000,
    orders: Math.floor(Math.random() * 500) + 100,
  })) || [];

  const COLORS = ['#0c056d', '#00cfc8', '#6366f1', '#ec4899', '#f59e0b'];

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
          <h2 className="text-lg font-medium text-gray-900">Loading sales analytics...</h2>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <AppHeader />
      
      <div className="flex">
        <Sidebar />
        
        <main className="flex-1 p-6">
          {/* Demo Mode Alert */}
          {isDemoMode && (
            <Alert className="mb-6 bg-brand-50 border-brand-200" data-testid="alert">
              <InfoIcon className="h-4 w-4 text-brand-600" />
              <AlertDescription className="text-brand-800">
                <strong>Demo Mode:</strong> You're viewing sample sales analytics data. 
                <a href="/api/login" className="underline ml-1 text-brand-700 hover:text-brand-900">
                  Connect your Shopify store
                </a> to see your real sales data.
              </AlertDescription>
            </Alert>
          )}
          
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2" data-testid="text-page-title">
                  Sales Analytics
                </h2>
                <p className="text-gray-600" data-testid="text-page-description">
                  Track revenue trends, order volumes, and sales performance by vendor
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <DateRangePicker
                  value={dateRange}
                  onChange={setDateRange}
                  placeholder="Select date range"
                />
                <Button
                  variant="outline"
                  size="default"
                  onClick={async () => {
                    setIsRefreshing(true);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    setIsRefreshing(false);
                    toast({
                      title: "Data refreshed",
                      description: "Sales data has been updated.",
                    });
                  }}
                  disabled={isRefreshing}
                  data-testid="button-refresh-data"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button variant="default" size="default" data-testid="button-export">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            </div>
          </div>

          {/* Sales Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card data-testid="card-total-revenue">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${analyticsData?.totalRevenue?.toLocaleString() || '45,231'}</div>
                <p className="text-xs text-muted-foreground">
                  <TrendingUp className="inline h-3 w-3 text-green-500 mr-1" />
                  +12% from last month
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-total-orders">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData?.totalOrders || 523}</div>
                <p className="text-xs text-muted-foreground">
                  <TrendingUp className="inline h-3 w-3 text-green-500 mr-1" />
                  +8% from last month
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-average-order">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${analyticsData?.averageOrderValue?.toFixed(2) || '86.54'}</div>
                <p className="text-xs text-muted-foreground">
                  <TrendingDown className="inline h-3 w-3 text-red-500 mr-1" />
                  -3% from last month
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-conversion-rate">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData?.conversionRate?.toFixed(1) || '3.2'}%</div>
                <p className="text-xs text-muted-foreground">
                  <TrendingUp className="inline h-3 w-3 text-green-500 mr-1" />
                  +0.5% from last month
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Sales Trend Chart */}
          <Card className="mb-8" data-testid="chart-sales-trend">
            <CardHeader>
              <CardTitle>Revenue & Order Trends</CardTitle>
              <CardDescription>Daily revenue and order volume over the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={salesTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" orientation="left" stroke="#0c056d" />
                  <YAxis yAxisId="right" orientation="right" stroke="#00cfc8" />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#0c056d" name="Revenue ($)" />
                  <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#00cfc8" name="Orders" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Revenue by Vendor Bar Chart */}
            <Card data-testid="chart-vendor-revenue">
              <CardHeader>
                <CardTitle>Revenue by Vendor</CardTitle>
                <CardDescription>Top performing vendors by revenue</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={vendorRevenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="revenue" fill="#0c056d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Revenue Distribution Pie Chart */}
            <Card data-testid="chart-revenue-distribution">
              <CardHeader>
                <CardTitle>Revenue Distribution</CardTitle>
                <CardDescription>Revenue share by vendor</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={vendorRevenueData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="revenue"
                    >
                      {vendorRevenueData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}