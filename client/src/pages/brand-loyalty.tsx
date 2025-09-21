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
  Heart, 
  Users, 
  TrendingUp,
  Star,
  ShoppingBag,
  BarChart3,
  PieChart,
  Activity
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
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from "recharts";

interface BrandAffinityData {
  vendorId: string;
  vendorName: string;
  affinityScore: number;
  totalCustomers: number;
  totalSpent: number;
  averageOrderValue: number;
  repeatCustomerRate: number;
  lastPurchaseAvg: number;
}

interface CrossBrandData {
  primaryVendor: string;
  secondaryVendor: string;
  crossPurchaseCount: number;
  totalCrossValue: number;
  conversionRate: number;
}

interface CustomerSegmentData {
  segment: string;
  vendorId: string;
  vendorName: string;
  customerCount: number;
  totalSpent: number;
  averageOrders: number;
}

interface TopCustomerData {
  customerId: string;
  customerEmail: string;
  totalSpent: number;
  orderCount: number;
  favoriteVendor: string;
  loyaltyScore: number;
}

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
const SEGMENT_COLORS = {
  'High Loyalty': '#10b981',
  'Medium Loyalty': '#f59e0b', 
  'Low Loyalty': '#ef4444',
  'New Customer': '#06b6d4'
};

export default function BrandLoyaltyPage() {
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
  const [selectedSegment, setSelectedSegment] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('affinity');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch vendors for filter dropdown
  const { data: vendors } = useQuery({
    queryKey: ['/api/stores/current/vendors'],
    enabled: isAuthenticated
  });

  // Fetch brand affinity data
  const { data: affinityData, isLoading: affinityLoading, refetch: refetchAffinity } = useQuery({
    queryKey: ['/api/brand-loyalty/affinity', {
      vendorId: selectedVendor !== 'all' ? selectedVendor : undefined,
      dateRange: dateRange ? `${dateRange.from?.toISOString()}-${dateRange.to?.toISOString()}` : undefined
    }],
    enabled: isAuthenticated,
    initialData: isDemoMode ? getDemoBrandAffinityData() : undefined
  });

  // Fetch cross-brand purchasing data
  const { data: crossBrandData, isLoading: crossBrandLoading } = useQuery({
    queryKey: ['/api/brand-loyalty/cross-brand', {
      vendorId: selectedVendor !== 'all' ? selectedVendor : undefined,
      dateRange: dateRange ? `${dateRange.from?.toISOString()}-${dateRange.to?.toISOString()}` : undefined
    }],
    enabled: isAuthenticated,
    initialData: isDemoMode ? getDemoCrossBrandData() : undefined
  });

  // Fetch top customers data
  const { data: topCustomersData, isLoading: topCustomersLoading } = useQuery({
    queryKey: ['/api/brand-loyalty/top-customers', {
      vendorId: selectedVendor !== 'all' ? selectedVendor : undefined,
      segment: selectedSegment !== 'all' ? selectedSegment : undefined,
      limit: 10
    }],
    enabled: isAuthenticated,
    initialData: isDemoMode ? getDemoTopCustomersData() : undefined
  });

  // Fetch loyalty insights
  const { data: loyaltyInsights, isLoading: insightsLoading } = useQuery({
    queryKey: ['/api/brand-loyalty/insights', {
      dateRange: dateRange ? `${dateRange.from?.toISOString()}-${dateRange.to?.toISOString()}` : undefined
    }],
    enabled: isAuthenticated,
    initialData: isDemoMode ? getDemoLoyaltyInsights() : undefined
  });

  // Update loyalty data mutation
  const updateLoyaltyMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/brand-loyalty/update'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/brand-loyalty'] });
      toast({
        title: "Loyalty data updated",
        description: "Customer loyalty analytics have been refreshed.",
      });
    }
  });

  // Generate demo data mutation
  const generateDemoMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/brand-loyalty/generate-demo'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/brand-loyalty'] });
      toast({
        title: "Demo data generated",
        description: "Sample loyalty data has been created.",
      });
    }
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetchAffinity();
    if (isDemoMode) {
      await generateDemoMutation.mutateAsync();
    } else {
      await updateLoyaltyMutation.mutateAsync();
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
          <h2 className="text-lg font-medium text-gray-900">Loading brand loyalty analytics...</h2>
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
                <strong>Demo Mode:</strong> You're viewing sample brand loyalty data. 
                <a href="/setup" className="underline ml-1 text-brand-700 hover:text-brand-900">
                  Connect your Shopify store
                </a> to see your real customer loyalty analytics.
              </AlertDescription>
            </Alert>
          )}
          
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2" data-testid="text-page-title">
                  Brand Loyalty Analytics
                </h2>
                <p className="text-gray-600" data-testid="text-page-description">
                  Understand customer brand preferences and loyalty patterns
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
                  data-testid="button-refresh-loyalty"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Processing...' : 'Refresh'}
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
            <Card data-testid="card-avg-loyalty-score">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Loyalty Score</CardTitle>
                <Heart className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {loyaltyInsights?.averageLoyaltyScore?.toFixed(1) || '0.0'}
                </div>
                <p className="text-xs text-muted-foreground">Out of 10.0</p>
              </CardContent>
            </Card>

            <Card data-testid="card-repeat-customers">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Repeat Customers</CardTitle>
                <Users className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {loyaltyInsights?.repeatCustomers || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {loyaltyInsights?.repeatCustomerRate?.toFixed(1) || '0'}% of total
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-cross-brand-purchases">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cross-Brand Purchases</CardTitle>
                <ShoppingBag className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {loyaltyInsights?.crossBrandPurchases || 0}
                </div>
                <p className="text-xs text-muted-foreground">Multi-brand orders</p>
              </CardContent>
            </Card>

            <Card data-testid="card-loyalty-revenue">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Loyalty Revenue</CardTitle>
                <TrendingUp className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  ${loyaltyInsights?.loyaltyRevenue?.toLocaleString() || '0'}
                </div>
                <p className="text-xs text-muted-foreground">From repeat customers</p>
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
                Customize your loyalty analytics view
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
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Customer Segment</label>
                  <Select value={selectedSegment} onValueChange={setSelectedSegment}>
                    <SelectTrigger data-testid="select-segment-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Segments</SelectItem>
                      <SelectItem value="high">High Loyalty</SelectItem>
                      <SelectItem value="medium">Medium Loyalty</SelectItem>
                      <SelectItem value="low">Low Loyalty</SelectItem>
                      <SelectItem value="new">New Customers</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Analytics Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="affinity" data-testid="tab-brand-affinity">
                Brand Affinity
              </TabsTrigger>
              <TabsTrigger value="cross-brand" data-testid="tab-cross-brand">
                Cross-Brand Analysis
              </TabsTrigger>
              <TabsTrigger value="segments" data-testid="tab-customer-segments">
                Customer Segments
              </TabsTrigger>
              <TabsTrigger value="top-customers" data-testid="tab-top-customers">
                Top Customers
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="affinity" className="mt-6">
              <BrandAffinityTab data={affinityData} isLoading={affinityLoading} />
            </TabsContent>
            
            <TabsContent value="cross-brand" className="mt-6">
              <CrossBrandTab data={crossBrandData} isLoading={crossBrandLoading} />
            </TabsContent>
            
            <TabsContent value="segments" className="mt-6">
              <CustomerSegmentsTab data={affinityData} isLoading={affinityLoading} />
            </TabsContent>
            
            <TabsContent value="top-customers" className="mt-6">
              <TopCustomersTab data={topCustomersData} isLoading={topCustomersLoading} />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}

// Brand Affinity Tab Component
interface BrandAffinityTabProps {
  data: BrandAffinityData[];
  isLoading: boolean;
}

function BrandAffinityTab({ data, isLoading }: BrandAffinityTabProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
            <span className="ml-2">Loading brand affinity data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Brand Affinity Chart */}
      <Card data-testid="chart-brand-affinity">
        <CardHeader>
          <CardTitle>Brand Affinity Scores</CardTitle>
          <CardDescription>Customer loyalty scores by brand (0-10 scale)</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="vendorName" angle={-45} textAnchor="end" height={60} />
              <YAxis />
              <Tooltip formatter={(value: number) => [value.toFixed(1), 'Affinity Score']} />
              <Bar dataKey="affinityScore" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Brand Performance Table */}
      <Card data-testid="table-brand-performance">
        <CardHeader>
          <CardTitle>Brand Performance Metrics</CardTitle>
          <CardDescription>Detailed loyalty metrics by brand</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Brand</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead className="text-right">Customers</TableHead>
                <TableHead className="text-right">AOV</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.map((brand) => (
                <TableRow key={brand.vendorId}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {brand.vendorName}
                      {brand.affinityScore >= 8 && (
                        <Star className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={brand.affinityScore >= 7 ? 'default' : brand.affinityScore >= 5 ? 'secondary' : 'outline'}>
                      {brand.affinityScore.toFixed(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{brand.totalCustomers}</TableCell>
                  <TableCell className="text-right">${brand.averageOrderValue.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Loyalty Distribution */}
      <Card data-testid="chart-loyalty-distribution" className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Customer Loyalty Distribution</CardTitle>
          <CardDescription>How customers are distributed across loyalty levels</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
              <Pie
                data={data?.map(brand => ({
                  name: brand.vendorName,
                  value: brand.totalCustomers,
                  loyaltyLevel: brand.affinityScore >= 7 ? 'High' : brand.affinityScore >= 5 ? 'Medium' : 'Low'
                }))}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data?.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </RechartsPieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

// Cross-Brand Analysis Tab Component
interface CrossBrandTabProps {
  data: CrossBrandData[];
  isLoading: boolean;
}

function CrossBrandTab({ data, isLoading }: CrossBrandTabProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
            <span className="ml-2">Loading cross-brand data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Cross-Purchase Patterns */}
      <Card data-testid="chart-cross-purchase-patterns">
        <CardHeader>
          <CardTitle>Cross-Purchase Patterns</CardTitle>
          <CardDescription>Brand combinations purchased together</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <ScatterChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="crossPurchaseCount" name="Purchase Count" />
              <YAxis dataKey="totalCrossValue" name="Total Value" />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white p-3 border rounded shadow">
                        <p className="font-medium">{data.primaryVendor} → {data.secondaryVendor}</p>
                        <p>Purchases: {data.crossPurchaseCount}</p>
                        <p>Value: ${data.totalCrossValue.toLocaleString()}</p>
                        <p>Conversion: {data.conversionRate.toFixed(1)}%</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Scatter name="Cross-purchases" dataKey="totalCrossValue" fill="#8b5cf6" />
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Cross-Brand Combinations */}
      <Card data-testid="table-cross-brand-combinations">
        <CardHeader>
          <CardTitle>Top Cross-Brand Combinations</CardTitle>
          <CardDescription>Most successful brand pairings</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Brand Combination</TableHead>
                <TableHead className="text-right">Purchases</TableHead>
                <TableHead className="text-right">Total Value</TableHead>
                <TableHead className="text-right">Conversion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.slice(0, 8).map((combo, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-1">
                      <span>{combo.primaryVendor}</span>
                      <span className="text-gray-400">→</span>
                      <span>{combo.secondaryVendor}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{combo.crossPurchaseCount}</TableCell>
                  <TableCell className="text-right">${combo.totalCrossValue.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={combo.conversionRate >= 20 ? 'default' : 'secondary'}>
                      {combo.conversionRate.toFixed(1)}%
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

// Customer Segments Tab Component
interface CustomerSegmentsTabProps {
  data: BrandAffinityData[];
  isLoading: boolean;
}

function CustomerSegmentsTab({ data, isLoading }: CustomerSegmentsTabProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
            <span className="ml-2">Loading customer segments...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Process data for segmentation
  const segmentData = data?.map(brand => ({
    vendorName: brand.vendorName,
    highLoyalty: Math.round(brand.totalCustomers * (brand.affinityScore >= 7 ? 0.3 : 0.15)),
    mediumLoyalty: Math.round(brand.totalCustomers * 0.4),
    lowLoyalty: Math.round(brand.totalCustomers * 0.3),
    newCustomers: Math.round(brand.totalCustomers * 0.25)
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Loyalty Segments by Brand */}
      <Card data-testid="chart-loyalty-segments">
        <CardHeader>
          <CardTitle>Loyalty Segments by Brand</CardTitle>
          <CardDescription>Customer distribution across loyalty levels</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={segmentData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="vendorName" angle={-45} textAnchor="end" height={60} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="highLoyalty" stackId="a" fill="#10b981" name="High Loyalty" />
              <Bar dataKey="mediumLoyalty" stackId="a" fill="#f59e0b" name="Medium Loyalty" />
              <Bar dataKey="lowLoyalty" stackId="a" fill="#ef4444" name="Low Loyalty" />
              <Bar dataKey="newCustomers" stackId="a" fill="#06b6d4" name="New Customers" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Segment Performance Metrics */}
      <Card data-testid="table-segment-performance">
        <CardHeader>
          <CardTitle>Segment Performance</CardTitle>
          <CardDescription>Revenue and metrics by loyalty segment</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {['High Loyalty', 'Medium Loyalty', 'Low Loyalty', 'New Customers'].map((segment, index) => {
              const color = Object.values(SEGMENT_COLORS)[index];
              const customerCount = segmentData?.reduce((sum, brand) => 
                sum + (index === 0 ? brand.highLoyalty : 
                       index === 1 ? brand.mediumLoyalty :
                       index === 2 ? brand.lowLoyalty : 
                       brand.newCustomers), 0) || 0;
              
              const percentage = data ? (customerCount / data.reduce((sum, brand) => sum + brand.totalCustomers, 0) * 100) : 0;
              
              return (
                <div key={segment} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: color }}
                    />
                    <div>
                      <p className="font-medium">{segment}</p>
                      <p className="text-sm text-gray-600">{customerCount} customers</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{percentage.toFixed(1)}%</p>
                    <Progress value={percentage} className="w-20 h-2" />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Top Customers Tab Component
interface TopCustomersTabProps {
  data: TopCustomerData[];
  isLoading: boolean;
}

function TopCustomersTab({ data, isLoading }: TopCustomersTabProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
            <span className="ml-2">Loading top customers...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="table-top-customers">
      <CardHeader>
        <CardTitle>Top Loyal Customers</CardTitle>
        <CardDescription>Your most valuable and loyal customers</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">Total Spent</TableHead>
              <TableHead className="text-right">Orders</TableHead>
              <TableHead>Favorite Brand</TableHead>
              <TableHead className="text-right">Loyalty Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.map((customer, index) => (
              <TableRow key={customer.customerId}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-brand-400 to-brand-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      #{index + 1}
                    </div>
                    <div>
                      <p>{customer.customerEmail}</p>
                      <p className="text-sm text-gray-500">ID: {customer.customerId.slice(-8)}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium">
                  ${customer.totalSpent.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">{customer.orderCount}</TableCell>
                <TableCell>
                  <Badge variant="outline">{customer.favoriteVendor}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <Progress value={customer.loyaltyScore * 10} className="w-16 h-2" />
                    <span className="font-medium">{customer.loyaltyScore.toFixed(1)}</span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// Demo data functions
function getDemoBrandAffinityData(): BrandAffinityData[] {
  return [
    {
      vendorId: 'vendor_1',
      vendorName: 'Nike',
      affinityScore: 8.2,
      totalCustomers: 234,
      totalSpent: 89450,
      averageOrderValue: 125.30,
      repeatCustomerRate: 68.5,
      lastPurchaseAvg: 18
    },
    {
      vendorId: 'vendor_2',
      vendorName: 'Adidas',
      affinityScore: 7.8,
      totalCustomers: 198,
      totalSpent: 72340,
      averageOrderValue: 118.90,
      repeatCustomerRate: 64.2,
      lastPurchaseAvg: 22
    },
    {
      vendorId: 'vendor_3',
      vendorName: 'Under Armour',
      affinityScore: 6.9,
      totalCustomers: 156,
      totalSpent: 51230,
      averageOrderValue: 108.50,
      repeatCustomerRate: 58.7,
      lastPurchaseAvg: 28
    },
    {
      vendorId: 'vendor_4',
      vendorName: 'Puma',
      affinityScore: 6.4,
      totalCustomers: 142,
      totalSpent: 43890,
      averageOrderValue: 95.20,
      repeatCustomerRate: 52.1,
      lastPurchaseAvg: 31
    },
    {
      vendorId: 'vendor_5',
      vendorName: 'New Balance',
      affinityScore: 5.8,
      totalCustomers: 118,
      totalSpent: 34560,
      averageOrderValue: 87.40,
      repeatCustomerRate: 48.3,
      lastPurchaseAvg: 35
    }
  ];
}

function getDemoCrossBrandData(): CrossBrandData[] {
  return [
    {
      primaryVendor: 'Nike',
      secondaryVendor: 'Adidas',
      crossPurchaseCount: 45,
      totalCrossValue: 12400,
      conversionRate: 19.2
    },
    {
      primaryVendor: 'Adidas',
      secondaryVendor: 'Nike',
      crossPurchaseCount: 38,
      totalCrossValue: 10890,
      conversionRate: 16.8
    },
    {
      primaryVendor: 'Nike',
      secondaryVendor: 'Under Armour',
      crossPurchaseCount: 32,
      totalCrossValue: 8760,
      conversionRate: 13.7
    },
    {
      primaryVendor: 'Under Armour',
      secondaryVendor: 'Nike',
      crossPurchaseCount: 29,
      totalCrossValue: 7890,
      conversionRate: 18.6
    },
    {
      primaryVendor: 'Puma',
      secondaryVendor: 'Nike',
      crossPurchaseCount: 23,
      totalCrossValue: 6340,
      conversionRate: 16.2
    },
    {
      primaryVendor: 'Adidas',
      secondaryVendor: 'Puma',
      crossPurchaseCount: 21,
      totalCrossValue: 5670,
      conversionRate: 10.6
    }
  ];
}

function getDemoTopCustomersData(): TopCustomerData[] {
  return [
    {
      customerId: 'cust_1',
      customerEmail: 'sarah.johnson@email.com',
      totalSpent: 2450.50,
      orderCount: 18,
      favoriteVendor: 'Nike',
      loyaltyScore: 9.2
    },
    {
      customerId: 'cust_2',
      customerEmail: 'michael.chen@email.com',
      totalSpent: 2240.75,
      orderCount: 16,
      favoriteVendor: 'Adidas',
      loyaltyScore: 8.8
    },
    {
      customerId: 'cust_3',
      customerEmail: 'jennifer.williams@email.com',
      totalSpent: 1980.30,
      orderCount: 14,
      favoriteVendor: 'Nike',
      loyaltyScore: 8.5
    },
    {
      customerId: 'cust_4',
      customerEmail: 'david.martinez@email.com',
      totalSpent: 1850.90,
      orderCount: 12,
      favoriteVendor: 'Under Armour',
      loyaltyScore: 8.2
    },
    {
      customerId: 'cust_5',
      customerEmail: 'amanda.taylor@email.com',
      totalSpent: 1720.45,
      orderCount: 11,
      favoriteVendor: 'Puma',
      loyaltyScore: 7.9
    },
    {
      customerId: 'cust_6',
      customerEmail: 'robert.anderson@email.com',
      totalSpent: 1650.20,
      orderCount: 10,
      favoriteVendor: 'Adidas',
      loyaltyScore: 7.6
    },
    {
      customerId: 'cust_7',
      customerEmail: 'lisa.thompson@email.com',
      totalSpent: 1580.75,
      orderCount: 9,
      favoriteVendor: 'Nike',
      loyaltyScore: 7.4
    },
    {
      customerId: 'cust_8',
      customerEmail: 'james.garcia@email.com',
      totalSpent: 1490.30,
      orderCount: 8,
      favoriteVendor: 'New Balance',
      loyaltyScore: 7.1
    }
  ];
}

function getDemoLoyaltyInsights() {
  return {
    averageLoyaltyScore: 7.2,
    repeatCustomers: 548,
    repeatCustomerRate: 61.3,
    crossBrandPurchases: 188,
    loyaltyRevenue: 291970,
    newCustomersThisMonth: 67,
    churningCustomers: 23
  };
}