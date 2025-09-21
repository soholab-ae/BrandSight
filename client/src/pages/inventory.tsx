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
  Package, 
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  ShoppingCart,
  Calendar,
  DollarSign,
  BarChart3,
  Target,
  Clock
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import {
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
  Cell,
  LineChart,
  Line,
  ComposedChart,
  Area,
  AreaChart
} from "recharts";

interface InventoryOverviewData {
  totalProducts: number;
  totalInventoryValue: number;
  avgSellThroughRate: number;
  deadStockValue: number;
  deadStockCount: number;
  fastMovingProducts: number;
  slowMovingProducts: number;
  outOfStockProducts: number;
  lowStockProducts: number;
  reorderNeeded: number;
}

interface SellThroughData {
  productId: string;
  productTitle: string;
  vendorId: string;
  vendorName: string;
  sellThroughRate: number;
  daysOfInventory: number;
  currentStock: number;
  soldThisPeriod: number;
  category: 'fast' | 'medium' | 'slow';
  inventoryValue: number;
}

interface DeadStockData {
  productId: string;
  productTitle: string;
  vendorId: string;
  vendorName: string;
  daysStagnant: number;
  currentStock: number;
  inventoryValue: number;
  lastSaleDate: string | null;
  recommendedAction: 'clearance' | 'liquidation' | 'discontinue';
  potentialLoss: number;
}

interface ReorderData {
  productId: string;
  productTitle: string;
  vendorId: string;
  vendorName: string;
  currentStock: number;
  reorderPoint: number;
  recommendedOrderQuantity: number;
  leadTimeDays: number;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  estimatedCost: number;
  estimatedRunoutDate: string;
}

interface ProfitabilityData {
  vendorId: string;
  vendorName: string;
  totalInventoryValue: number;
  totalMargin: number;
  avgMarginPercentage: number;
  profitability: 'high' | 'medium' | 'low';
  turnoverRate: number;
  roi: number;
}

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6b7280'];
const URGENCY_COLORS = {
  critical: 'bg-red-100 text-red-800 border-red-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-blue-100 text-blue-800 border-blue-200'
};

const URGENCY_BADGE_COLORS = {
  critical: 'destructive',
  high: 'default',
  medium: 'default',
  low: 'secondary'
} as const;

export default function InventoryPage() {
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
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch vendors for filter dropdown
  const { data: vendors } = useQuery({
    queryKey: ['/api/stores/current/vendors'],
    enabled: isAuthenticated
  });

  // Fetch inventory overview
  const { data: overviewData, isLoading: overviewLoading, refetch: refetchOverview } = useQuery({
    queryKey: ['/api/inventory/overview', {
      vendorId: selectedVendor !== 'all' ? selectedVendor : undefined,
      dateRange: dateRange ? `${dateRange.from?.toISOString()}-${dateRange.to?.toISOString()}` : undefined
    }],
    enabled: isAuthenticated,
    initialData: isDemoMode ? getDemoOverviewData() : undefined
  });

  // Fetch sell-through analysis
  const { data: sellThroughData, isLoading: sellThroughLoading } = useQuery({
    queryKey: ['/api/inventory/sell-through', {
      vendorId: selectedVendor !== 'all' ? selectedVendor : undefined,
      category: selectedCategory !== 'all' ? selectedCategory : undefined,
      dateRange: dateRange ? `${dateRange.from?.toISOString()}-${dateRange.to?.toISOString()}` : undefined
    }],
    enabled: isAuthenticated,
    initialData: isDemoMode ? getDemoSellThroughData() : undefined
  });

  // Fetch dead stock analysis
  const { data: deadStockData, isLoading: deadStockLoading } = useQuery({
    queryKey: ['/api/inventory/dead-stock', {
      vendorId: selectedVendor !== 'all' ? selectedVendor : undefined,
      minDays: 30,
      dateRange: dateRange ? `${dateRange.from?.toISOString()}-${dateRange.to?.toISOString()}` : undefined
    }],
    enabled: isAuthenticated,
    initialData: isDemoMode ? getDemoDeadStockData() : undefined
  });

  // Fetch reorder recommendations
  const { data: reorderData, isLoading: reorderLoading } = useQuery({
    queryKey: ['/api/inventory/reorder-recommendations', {
      vendorId: selectedVendor !== 'all' ? selectedVendor : undefined,
      urgency: 'all'
    }],
    enabled: isAuthenticated,
    initialData: isDemoMode ? getDemoReorderData() : undefined
  });

  // Fetch profitability analysis
  const { data: profitabilityData, isLoading: profitabilityLoading } = useQuery({
    queryKey: ['/api/inventory/profitability', {
      vendorId: selectedVendor !== 'all' ? selectedVendor : undefined,
      dateRange: dateRange ? `${dateRange.from?.toISOString()}-${dateRange.to?.toISOString()}` : undefined
    }],
    enabled: isAuthenticated,
    initialData: isDemoMode ? getDemoProfitabilityData() : undefined
  });

  // Update inventory analytics mutation
  const updateInventoryMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/inventory/update'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
      toast({
        title: "Inventory updated",
        description: "Inventory analytics have been refreshed with latest data.",
      });
    }
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetchOverview();
    if (!isDemoMode) {
      await updateInventoryMutation.mutateAsync();
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
          <h2 className="text-lg font-medium text-gray-900">Loading inventory intelligence...</h2>
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
            <Alert className="mb-6 bg-brand-50 border-brand-200" data-testid="demo-alert">
              <InfoIcon className="h-4 w-4 text-brand-600" />
              <AlertDescription className="text-brand-800">
                <strong>Demo Mode:</strong> You're viewing sample inventory data. 
                <a href="/setup" className="underline ml-1 text-brand-700 hover:text-brand-900">
                  Connect your Shopify store
                </a> to see your real inventory analytics.
              </AlertDescription>
            </Alert>
          )}
          
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2" data-testid="text-page-title">
                  Inventory Intelligence
                </h2>
                <p className="text-gray-600" data-testid="text-page-description">
                  Optimize your inventory with smart analytics and actionable insights
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
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  data-testid="button-refresh-inventory"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Updating...' : 'Refresh'}
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
            <Card data-testid="card-total-inventory-value">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Inventory Value</CardTitle>
                <DollarSign className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  ${overviewData?.totalInventoryValue?.toLocaleString() || '0'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {overviewData?.totalProducts || 0} products
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-avg-sell-through">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Sell-Through Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {overviewData?.avgSellThroughRate?.toFixed(1) || '0.0'}%
                </div>
                <p className="text-xs text-muted-foreground">Last 30 days</p>
              </CardContent>
            </Card>

            <Card data-testid="card-dead-stock-value">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Dead Stock Value</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  ${overviewData?.deadStockValue?.toLocaleString() || '0'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {overviewData?.deadStockCount || 0} products
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-reorder-needed">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Reorder Needed</CardTitle>
                <Package className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {overviewData?.reorderNeeded || 0}
                </div>
                <p className="text-xs text-muted-foreground">Products below threshold</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Filter Analysis
              </CardTitle>
              <CardDescription>
                Customize your inventory analytics view
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Category</label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger data-testid="select-category-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="fast">Fast Moving</SelectItem>
                      <SelectItem value="medium">Medium Moving</SelectItem>
                      <SelectItem value="slow">Slow Moving</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Analytics Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview" data-testid="tab-inventory-overview">
                Overview
              </TabsTrigger>
              <TabsTrigger value="sell-through" data-testid="tab-sell-through">
                Sell-Through Analysis
              </TabsTrigger>
              <TabsTrigger value="dead-stock" data-testid="tab-dead-stock">
                Dead Stock
              </TabsTrigger>
              <TabsTrigger value="reorder" data-testid="tab-reorder">
                Reorder Recommendations
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="mt-6">
              <InventoryOverviewTab 
                overviewData={overviewData} 
                profitabilityData={profitabilityData}
                isLoading={overviewLoading || profitabilityLoading} 
              />
            </TabsContent>
            
            <TabsContent value="sell-through" className="mt-6">
              <SellThroughTab data={sellThroughData} isLoading={sellThroughLoading} />
            </TabsContent>
            
            <TabsContent value="dead-stock" className="mt-6">
              <DeadStockTab data={deadStockData} isLoading={deadStockLoading} />
            </TabsContent>
            
            <TabsContent value="reorder" className="mt-6">
              <ReorderTab data={reorderData} isLoading={reorderLoading} />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}

// Inventory Overview Tab Component
interface InventoryOverviewTabProps {
  overviewData: InventoryOverviewData;
  profitabilityData: ProfitabilityData[];
  isLoading: boolean;
}

function InventoryOverviewTab({ overviewData, profitabilityData, isLoading }: InventoryOverviewTabProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
            <span className="ml-2">Loading inventory overview...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const inventoryHealthData = [
    { name: 'Fast Moving', value: overviewData?.fastMovingProducts || 0, color: '#10b981' },
    { name: 'Medium Moving', value: (overviewData?.totalProducts || 0) - (overviewData?.fastMovingProducts || 0) - (overviewData?.slowMovingProducts || 0), color: '#f59e0b' },
    { name: 'Slow Moving', value: overviewData?.slowMovingProducts || 0, color: '#ef4444' },
    { name: 'Dead Stock', value: overviewData?.deadStockCount || 0, color: '#6b7280' }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Inventory Health Distribution */}
      <Card data-testid="chart-inventory-health">
        <CardHeader>
          <CardTitle>Inventory Health Distribution</CardTitle>
          <CardDescription>Product performance breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={inventoryHealthData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {inventoryHealthData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Stock Level Summary */}
      <Card data-testid="table-stock-levels">
        <CardHeader>
          <CardTitle>Stock Level Summary</CardTitle>
          <CardDescription>Current inventory status overview</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-900">In Stock</p>
                  <p className="text-sm text-green-700">Well-stocked products</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-green-900">
                  {(overviewData?.totalProducts || 0) - (overviewData?.outOfStockProducts || 0) - (overviewData?.lowStockProducts || 0)}
                </p>
                <p className="text-sm text-green-700">Products</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="font-medium text-yellow-900">Low Stock</p>
                  <p className="text-sm text-yellow-700">Below recommended levels</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-yellow-900">{overviewData?.lowStockProducts || 0}</p>
                <p className="text-sm text-yellow-700">Products</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center gap-3">
                <X className="h-5 w-5 text-red-600" />
                <div>
                  <p className="font-medium text-red-900">Out of Stock</p>
                  <p className="text-sm text-red-700">No inventory available</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-red-900">{overviewData?.outOfStockProducts || 0}</p>
                <p className="text-sm text-red-700">Products</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vendor Profitability Analysis */}
      <Card data-testid="chart-vendor-profitability" className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Vendor Profitability Analysis</CardTitle>
          <CardDescription>ROI and margin analysis by vendor</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={profitabilityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="vendorName" angle={-45} textAnchor="end" height={60} />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="totalInventoryValue" fill="#8b5cf6" name="Inventory Value ($)" />
              <Line yAxisId="right" type="monotone" dataKey="avgMarginPercentage" stroke="#10b981" strokeWidth={3} name="Margin %" />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

// Sell-Through Analysis Tab Component
interface SellThroughTabProps {
  data: SellThroughData[];
  isLoading: boolean;
}

function SellThroughTab({ data, isLoading }: SellThroughTabProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
            <span className="ml-2">Loading sell-through analysis...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Sell-Through Rate Chart */}
      <Card data-testid="chart-sell-through-rates">
        <CardHeader>
          <CardTitle>Sell-Through Rates by Product</CardTitle>
          <CardDescription>Performance of top 15 products</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data?.slice(0, 15)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="productTitle" 
                angle={-45} 
                textAnchor="end" 
                height={100}
                tick={{ fontSize: 10 }}
              />
              <YAxis />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  `${value.toFixed(1)}%`, 
                  'Sell-Through Rate'
                ]}
                labelFormatter={(label) => `Product: ${label}`}
              />
              <Bar 
                dataKey="sellThroughRate" 
                fill="#8b5cf6"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Performance Categories */}
      <Card data-testid="table-performance-categories">
        <CardHeader>
          <CardTitle>Performance Categories</CardTitle>
          <CardDescription>Products grouped by velocity</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Category</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.slice(0, 10).map((product) => (
                <TableRow key={product.productId}>
                  <TableCell className="font-medium">
                    <div className="max-w-[150px] truncate">
                      {product.productTitle}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{product.vendorName}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge 
                      variant={
                        product.sellThroughRate >= 20 ? 'default' : 
                        product.sellThroughRate >= 10 ? 'secondary' : 'outline'
                      }
                    >
                      {product.sellThroughRate.toFixed(1)}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{product.currentStock}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={
                        product.category === 'fast' ? 'default' :
                        product.category === 'medium' ? 'secondary' : 'outline'
                      }
                      className={
                        product.category === 'fast' ? 'bg-green-100 text-green-800' :
                        product.category === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }
                    >
                      {product.category}
                    </Badge>
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

// Dead Stock Tab Component
interface DeadStockTabProps {
  data: DeadStockData[];
  isLoading: boolean;
}

function DeadStockTab({ data, isLoading }: DeadStockTabProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
            <span className="ml-2">Loading dead stock analysis...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Dead Stock Found</h3>
          <p className="text-gray-500">
            Great! You currently have no products identified as dead stock.
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalDeadStockValue = data.reduce((sum, item) => sum + item.inventoryValue, 0);

  return (
    <div className="space-y-6">
      {/* Dead Stock Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Dead Stock Items</p>
                <p className="text-2xl font-bold text-red-600">{data.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Value</p>
                <p className="text-2xl font-bold text-red-600">${totalDeadStockValue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Potential Loss</p>
                <p className="text-2xl font-bold text-red-600">
                  ${data.reduce((sum, item) => sum + item.potentialLoss, 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dead Stock Table */}
      <Card data-testid="table-dead-stock">
        <CardHeader>
          <CardTitle>Dead Stock Products</CardTitle>
          <CardDescription>Products requiring immediate attention</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead className="text-right">Days Stagnant</TableHead>
                <TableHead className="text-right">Stock Value</TableHead>
                <TableHead className="text-right">Potential Loss</TableHead>
                <TableHead>Recommended Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((product) => (
                <TableRow key={product.productId}>
                  <TableCell className="font-medium">
                    <div className="max-w-[200px] truncate">
                      {product.productTitle}
                    </div>
                    <div className="text-sm text-gray-500">
                      Stock: {product.currentStock}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{product.vendorName}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge 
                      variant={product.daysStagnant >= 90 ? 'destructive' : 'default'}
                    >
                      {product.daysStagnant} days
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ${product.inventoryValue.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-medium text-red-600">
                    ${product.potentialLoss.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={
                        product.recommendedAction === 'liquidation' ? 'destructive' :
                        product.recommendedAction === 'clearance' ? 'default' : 'secondary'
                      }
                    >
                      {product.recommendedAction}
                    </Badge>
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

// Reorder Recommendations Tab Component
interface ReorderTabProps {
  data: ReorderData[];
  isLoading: boolean;
}

function ReorderTab({ data, isLoading }: ReorderTabProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
            <span className="ml-2">Loading reorder recommendations...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Reorders Needed</h3>
          <p className="text-gray-500">
            All products are currently well-stocked above their reorder points.
          </p>
        </CardContent>
      </Card>
    );
  }

  const criticalReorders = data.filter(item => item.urgency === 'critical');
  const totalReorderCost = data.reduce((sum, item) => sum + item.estimatedCost, 0);

  return (
    <div className="space-y-6">
      {/* Reorder Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Reorders</p>
                <p className="text-2xl font-bold text-orange-600">{data.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Critical</p>
                <p className="text-2xl font-bold text-red-600">{criticalReorders.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Cost</p>
                <p className="text-2xl font-bold text-green-600">${totalReorderCost.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Lead Time</p>
                <p className="text-2xl font-bold text-blue-600">
                  {Math.round(data.reduce((sum, item) => sum + item.leadTimeDays, 0) / data.length)} days
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reorder Recommendations Table */}
      <Card data-testid="table-reorder-recommendations">
        <CardHeader>
          <CardTitle>Reorder Recommendations</CardTitle>
          <CardDescription>Products that need restocking</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead className="text-right">Current Stock</TableHead>
                <TableHead className="text-right">Recommended Qty</TableHead>
                <TableHead className="text-right">Estimated Cost</TableHead>
                <TableHead className="text-right">Lead Time</TableHead>
                <TableHead>Urgency</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((product) => (
                <TableRow key={product.productId}>
                  <TableCell className="font-medium">
                    <div className="max-w-[200px] truncate">
                      {product.productTitle}
                    </div>
                    <div className="text-sm text-gray-500">
                      Reorder point: {product.reorderPoint}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{product.vendorName}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge 
                      variant={product.currentStock <= product.reorderPoint ? 'destructive' : 'secondary'}
                    >
                      {product.currentStock}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {product.recommendedOrderQuantity}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ${product.estimatedCost.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {product.leadTimeDays} days
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={URGENCY_BADGE_COLORS[product.urgency]}
                      className={URGENCY_COLORS[product.urgency]}
                    >
                      {product.urgency}
                    </Badge>
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

// Demo data functions
function getDemoOverviewData(): InventoryOverviewData {
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

function getDemoSellThroughData(): SellThroughData[] {
  const products = [
    'Nike Air Max 270', 'Adidas Ultraboost 22', 'Under Armour HOVR Phantom', 'Puma RS-X',
    'New Balance Fresh Foam', 'Nike React Infinity', 'Adidas Gazelle', 'Under Armour Curry 9',
    'Puma Suede Classic', 'New Balance 990v5', 'Nike Dunk Low', 'Adidas Stan Smith',
    'Under Armour Charged Assert', 'Puma Cali Sport', 'New Balance 574'
  ];

  const vendors = ['Nike', 'Adidas', 'Under Armour', 'Puma', 'New Balance'];

  return products.map((product, index) => ({
    productId: `prod_${index + 1}`,
    productTitle: product,
    vendorId: `vendor_${Math.floor(index / 3) + 1}`,
    vendorName: vendors[Math.floor(index / 3)],
    sellThroughRate: Math.random() * 40 + 5,
    daysOfInventory: Math.floor(Math.random() * 60) + 15,
    currentStock: Math.floor(Math.random() * 100) + 10,
    soldThisPeriod: Math.floor(Math.random() * 50) + 5,
    category: (Math.random() * 100) > 70 ? 'fast' : (Math.random() * 100) > 40 ? 'medium' : 'slow' as 'fast' | 'medium' | 'slow',
    inventoryValue: Math.floor(Math.random() * 15000) + 2000
  }));
}

function getDemoDeadStockData(): DeadStockData[] {
  return [
    {
      productId: 'prod_dead_1',
      productTitle: 'Nike Air Force 1 Vintage',
      vendorId: 'vendor_1',
      vendorName: 'Nike',
      daysStagnant: 95,
      currentStock: 23,
      inventoryValue: 6890,
      lastSaleDate: '2024-02-15',
      recommendedAction: 'liquidation' as const,
      potentialLoss: 3445
    },
    {
      productId: 'prod_dead_2',
      productTitle: 'Adidas Originals Retro',
      vendorId: 'vendor_2',
      vendorName: 'Adidas',
      daysStagnant: 67,
      currentStock: 18,
      inventoryValue: 4320,
      lastSaleDate: '2024-03-10',
      recommendedAction: 'clearance' as const,
      potentialLoss: 2160
    },
    {
      productId: 'prod_dead_3',
      productTitle: 'Puma Classic Leather',
      vendorId: 'vendor_4',
      vendorName: 'Puma',
      daysStagnant: 123,
      currentStock: 31,
      inventoryValue: 7750,
      lastSaleDate: '2024-01-28',
      recommendedAction: 'liquidation' as const,
      potentialLoss: 5425
    }
  ];
}

function getDemoReorderData(): ReorderData[] {
  return [
    {
      productId: 'prod_reorder_1',
      productTitle: 'Nike Air Max 270 Black',
      vendorId: 'vendor_1',
      vendorName: 'Nike',
      currentStock: 5,
      reorderPoint: 15,
      recommendedOrderQuantity: 50,
      leadTimeDays: 14,
      urgency: 'critical' as const,
      estimatedCost: 6250,
      estimatedRunoutDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      productId: 'prod_reorder_2',
      productTitle: 'Adidas Ultraboost 22 White',
      vendorId: 'vendor_2',
      vendorName: 'Adidas',
      currentStock: 12,
      reorderPoint: 20,
      recommendedOrderQuantity: 40,
      leadTimeDays: 10,
      urgency: 'high' as const,
      estimatedCost: 5600,
      estimatedRunoutDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      productId: 'prod_reorder_3',
      productTitle: 'Under Armour HOVR Phantom 2',
      vendorId: 'vendor_3',
      vendorName: 'Under Armour',
      currentStock: 8,
      reorderPoint: 12,
      recommendedOrderQuantity: 30,
      leadTimeDays: 16,
      urgency: 'medium' as const,
      estimatedCost: 3900,
      estimatedRunoutDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];
}

function getDemoProfitabilityData(): ProfitabilityData[] {
  return [
    {
      vendorId: 'vendor_1',
      vendorName: 'Nike',
      totalInventoryValue: 125340,
      totalMargin: 45120,
      avgMarginPercentage: 36.2,
      profitability: 'high' as const,
      turnoverRate: 4.2,
      roi: 85.6
    },
    {
      vendorId: 'vendor_2',
      vendorName: 'Adidas',
      totalInventoryValue: 98760,
      totalMargin: 32890,
      avgMarginPercentage: 33.3,
      profitability: 'high' as const,
      turnoverRate: 3.8,
      roi: 78.2
    },
    {
      vendorId: 'vendor_3',
      vendorName: 'Under Armour',
      totalInventoryValue: 76540,
      totalMargin: 22960,
      avgMarginPercentage: 30.0,
      profitability: 'medium' as const,
      turnoverRate: 3.2,
      roi: 65.4
    },
    {
      vendorId: 'vendor_4',
      vendorName: 'Puma',
      totalInventoryValue: 54320,
      totalMargin: 14590,
      avgMarginPercentage: 26.8,
      profitability: 'medium' as const,
      turnoverRate: 2.9,
      roi: 58.7
    },
    {
      vendorId: 'vendor_5',
      vendorName: 'New Balance',
      totalInventoryValue: 43270,
      totalMargin: 10820,
      avgMarginPercentage: 25.0,
      profitability: 'low' as const,
      turnoverRate: 2.1,
      roi: 42.3
    }
  ];
}