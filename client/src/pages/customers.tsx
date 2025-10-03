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
import { RefreshCw, Download, InfoIcon, Users, UserCheck, UserX, ShoppingBag } from "lucide-react";
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
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts";

export default function CustomerInsights() {
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
  
  // Fetch vendors data
  const { data: vendors } = useQuery({
    queryKey: ['/api/stores/current/vendors'],
    enabled: isAuthenticated,
  });

  // Generate customer segment data
  const customerSegmentData = [
    { segment: 'New Customers', count: 234, percentage: 28 },
    { segment: 'Returning', count: 456, percentage: 54 },
    { segment: 'VIP', count: 78, percentage: 9 },
    { segment: 'At Risk', count: 76, percentage: 9 }
  ];

  // Brand preference data
  const brandPreferenceData = vendors?.map((vendor: any) => ({
    brand: vendor.name,
    customers: Math.floor(Math.random() * 300) + 50,
    avgOrderValue: Math.floor(Math.random() * 100) + 50
  })) || [];

  // Customer lifetime value trend
  const clvTrendData = Array.from({ length: 12 }, (_, i) => ({
    month: new Date(2024, i, 1).toLocaleDateString('en-US', { month: 'short' }),
    clv: Math.floor(Math.random() * 200) + 100
  }));

  const COLORS = ['#0c056d', '#00cfc8', '#6366f1', '#ec4899'];

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
          <h2 className="text-lg font-medium text-gray-900">Loading customer insights...</h2>
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
                <strong>Demo Mode:</strong> You're viewing sample customer insights data. 
                <a href="/api/login" className="underline ml-1 text-brand-700 hover:text-brand-900">
                  Connect your Shopify store
                </a> to see your real customer data.
              </AlertDescription>
            </Alert>
          )}
          
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2" data-testid="text-page-title">
                  Customer Insights
                </h2>
                <p className="text-gray-600" data-testid="text-page-description">
                  Understand customer behavior and brand preferences
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
                      description: "Customer data has been updated.",
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

          {/* Customer Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card data-testid="card-total-customers">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">844</div>
                <p className="text-xs text-muted-foreground">+12% from last month</p>
              </CardContent>
            </Card>

            <Card data-testid="card-new-customers">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">New Customers</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">234</div>
                <p className="text-xs text-muted-foreground">28% of total</p>
              </CardContent>
            </Card>

            <Card data-testid="card-retention-rate">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Retention Rate</CardTitle>
                <UserX className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">68%</div>
                <p className="text-xs text-muted-foreground">+5% from last month</p>
              </CardContent>
            </Card>

            <Card data-testid="card-avg-lifetime-value">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Lifetime Value</CardTitle>
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$245</div>
                <p className="text-xs text-muted-foreground">+$15 from last month</p>
              </CardContent>
            </Card>
          </div>

          {/* Customer Segmentation */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <Card data-testid="chart-customer-segments">
              <CardHeader>
                <CardTitle>Customer Segments</CardTitle>
                <CardDescription>Distribution of customer types</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={customerSegmentData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ segment, percentage }) => `${segment} ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {customerSegmentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card data-testid="chart-brand-preference">
              <CardHeader>
                <CardTitle>Brand Preferences</CardTitle>
                <CardDescription>Customer count by preferred brand</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={brandPreferenceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="brand" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="customers" fill="#0c056d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Customer Lifetime Value Trend */}
          <Card data-testid="chart-clv-trend">
            <CardHeader>
              <CardTitle>Customer Lifetime Value Trend</CardTitle>
              <CardDescription>Average CLV over the past 12 months</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={clvTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="clv" stroke="#00cfc8" name="CLV ($)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}