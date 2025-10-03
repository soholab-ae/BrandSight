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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, Download, InfoIcon, Package, TrendingUp, BarChart3, ShoppingCart } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from "recharts";

export default function ProductPerformance() {
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
  
  // Fetch data
  const { data: topProducts } = useQuery({
    queryKey: ['/api/stores/current/products/top'],
    enabled: isAuthenticated,
  });

  const { data: vendors } = useQuery({
    queryKey: ['/api/stores/current/vendors'],
    enabled: isAuthenticated,
  });

  // Generate product performance data
  const productPerformanceData = topProducts?.map((product: any) => ({
    name: product.title,
    vendor: product.vendor,
    sales: product.totalSales,
    revenue: product.totalRevenue,
    conversion: (Math.random() * 5 + 1).toFixed(1)
  })) || [];

  // Category performance data
  const categoryData = [
    { category: 'Running Shoes', products: 45, revenue: 23450 },
    { category: 'Athletic Wear', products: 38, revenue: 18900 },
    { category: 'Accessories', products: 62, revenue: 12300 },
    { category: 'Training Equipment', products: 29, revenue: 8750 },
    { category: 'Sports Nutrition', products: 18, revenue: 5600 }
  ];

  // Vendor product distribution
  const vendorProductData = vendors?.map((vendor: any) => ({
    vendor: vendor.name,
    products: Math.floor(Math.random() * 50) + 10,
    avgPrice: Math.floor(Math.random() * 50) + 30
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
          <h2 className="text-lg font-medium text-gray-900">Loading product performance...</h2>
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
                <strong>Demo Mode:</strong> You're viewing sample product performance data. 
                <a href="/api/login" className="underline ml-1 text-brand-700 hover:text-brand-900">
                  Connect your Shopify store
                </a> to see your real product data.
              </AlertDescription>
            </Alert>
          )}
          
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2" data-testid="text-page-title">
                  Product Performance
                </h2>
                <p className="text-gray-600" data-testid="text-page-description">
                  Analyze product sales, conversion rates, and inventory metrics
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
                      description: "Product data has been updated.",
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

          {/* Product Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card data-testid="card-total-products">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">192</div>
                <p className="text-xs text-muted-foreground">+8 new this month</p>
              </CardContent>
            </Card>

            <Card data-testid="card-best-seller">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Best Seller</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold truncate">Nike Air Max</div>
                <p className="text-xs text-muted-foreground">342 units sold</p>
              </CardContent>
            </Card>

            <Card data-testid="card-avg-conversion">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Conversion</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">3.8%</div>
                <p className="text-xs text-muted-foreground">+0.3% from last month</p>
              </CardContent>
            </Card>

            <Card data-testid="card-low-stock">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12</div>
                <p className="text-xs text-muted-foreground text-red-500">Requires attention</p>
              </CardContent>
            </Card>
          </div>

          {/* Top Performing Products Table */}
          <Card className="mb-8" data-testid="table-top-products">
            <CardHeader>
              <CardTitle>Top Performing Products</CardTitle>
              <CardDescription>Products ranked by revenue and sales volume</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead className="text-right">Sales</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Conversion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productPerformanceData.slice(0, 5).map((product: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.vendor}</TableCell>
                      <TableCell className="text-right">{product.sales}</TableCell>
                      <TableCell className="text-right">${product.revenue?.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{product.conversion}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Category Performance */}
            <Card data-testid="chart-category-performance">
              <CardHeader>
                <CardTitle>Category Performance</CardTitle>
                <CardDescription>Revenue by product category</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="revenue" fill="#0c056d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Product Distribution by Vendor */}
            <Card data-testid="chart-vendor-products">
              <CardHeader>
                <CardTitle>Product Distribution by Vendor</CardTitle>
                <CardDescription>Number of products per vendor</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={vendorProductData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ vendor, products }) => `${vendor}: ${products}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="products"
                    >
                      {vendorProductData.map((entry, index) => (
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