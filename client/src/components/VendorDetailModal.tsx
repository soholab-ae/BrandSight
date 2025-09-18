import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart, 
  Eye, 
  Users,
  Package,
  Target,
  BarChart3,
  Download,
  ExternalLink
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart, 
  Pie, 
  Cell 
} from "recharts";

interface VendorDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendor: {
    id: string;
    name: string;
    revenue: number;
    aov: number;
    conversion: number;
    visitors: number;
    productCount: number;
    growth: number;
  } | null;
}

export default function VendorDetailModal({ isOpen, onClose, vendor }: VendorDetailModalProps) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  
  if (!vendor) return null;
  
  // Export handler for vendor-specific data
  const handleVendorExport = async (format: 'csv' | 'excel' = 'csv') => {
    setIsExporting(true);
    
    try {
      // Build export URL based on format
      const exportUrl = format === 'csv' 
        ? '/api/stores/current/vendors/export/csv'
        : '/api/stores/current/vendors/export/excel';
      
      // Add query parameters for vendor-specific filtering
      const params = new URLSearchParams({
        vendorId: vendor.id,
        dateRange: '30d',
        sortBy: 'revenue',
        sortDirection: 'desc'
      });
      
      // Fetch the export data
      const response = await fetch(`${exportUrl}?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Accept': format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
      });
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      // Get the blob and create download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = `brandsight-${vendor.name.toLowerCase().replace(/\s+/g, '-')}-analytics-${new Date().toISOString().split('T')[0]}.${format}`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Export completed",
        description: `${vendor.name} analytics exported successfully as ${format.toUpperCase()}.`,
      });
      
    } catch (error) {
      console.error('Vendor export error:', error);
      toast({
        title: "Export failed",
        description: `Unable to export ${vendor.name} analytics. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Mock detailed data for the vendor
  const vendorDetails = {
    overview: {
      totalRevenue: vendor.revenue,
      totalOrders: Math.floor(vendor.revenue / vendor.aov),
      avgOrderValue: vendor.aov,
      conversionRate: vendor.conversion,
      totalVisitors: vendor.visitors,
      productCount: vendor.productCount,
      customerRetention: 68.5,
      avgSessionDuration: "4m 32s"
    },
    monthlyTrends: [
      { month: 'Jul', revenue: vendor.revenue * 0.7, orders: 45, visitors: vendor.visitors * 0.8 },
      { month: 'Aug', revenue: vendor.revenue * 0.85, orders: 52, visitors: vendor.visitors * 0.9 },
      { month: 'Sep', revenue: vendor.revenue, orders: Math.floor(vendor.revenue / vendor.aov), visitors: vendor.visitors },
    ],
    topProducts: [
      { name: `${vendor.name} Air Max`, revenue: vendor.revenue * 0.3, units: 45, growth: 12.5 },
      { name: `${vendor.name} Runner`, revenue: vendor.revenue * 0.25, units: 38, growth: 8.2 },
      { name: `${vendor.name} Classic`, revenue: vendor.revenue * 0.2, units: 32, growth: -2.1 },
      { name: `${vendor.name} Sport`, revenue: vendor.revenue * 0.15, units: 28, growth: 15.8 },
    ],
    customerSegments: [
      { name: 'New Customers', value: 35, color: '#3b82f6' },
      { name: 'Returning', value: 45, color: '#10b981' },
      { name: 'VIP/Frequent', value: 20, color: '#f59e0b' },
    ],
    trafficSources: [
      { source: 'Organic Search', visitors: vendor.visitors * 0.4, conversion: 4.2 },
      { source: 'Paid Ads', visitors: vendor.visitors * 0.3, conversion: 3.8 },
      { source: 'Social Media', visitors: vendor.visitors * 0.2, conversion: 2.9 },
      { source: 'Direct', visitors: vendor.visitors * 0.1, conversion: 5.1 },
    ]
  };

  const getVendorColor = (vendorName: string) => {
    const colors: Record<string, string> = {
      'Nike': 'from-red-500 to-red-600',
      'Adidas': 'from-blue-500 to-blue-600',
      'Puma': 'from-yellow-500 to-orange-600',
      'Under Armour': 'from-gray-600 to-gray-700',
    };
    return colors[vendorName] || 'from-gray-500 to-gray-600';
  };

  const formatCurrency = (value: number) => `$${value.toLocaleString()}`;
  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 bg-gradient-to-br ${getVendorColor(vendor.name)} rounded-xl flex items-center justify-center text-white font-bold text-lg`}>
                {vendor.name[0]}
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-gray-900">
                  {vendor.name} Analytics
                </DialogTitle>
                <p className="text-gray-600">Comprehensive vendor performance insights</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleVendorExport('csv')}
                disabled={isExporting}
                data-testid="button-export-vendor-data"
              >
                <Download className="w-4 h-4 mr-2" />
                {isExporting ? 'Exporting...' : 'Export Data'}
              </Button>
              <Button variant="outline" size="sm" data-testid="button-view-products">
                <ExternalLink className="w-4 h-4 mr-2" />
                View Products
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 pb-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
              <TabsTrigger value="products" data-testid="tab-products">Top Products</TabsTrigger>
              <TabsTrigger value="customers" data-testid="tab-customers">Customers</TabsTrigger>
              <TabsTrigger value="traffic" data-testid="tab-traffic">Traffic</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                        <p className="text-2xl font-bold text-gray-900" data-testid="metric-total-revenue">
                          {formatCurrency(vendorDetails.overview.totalRevenue)}
                        </p>
                      </div>
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <DollarSign className="w-4 h-4 text-blue-600" />
                      </div>
                    </div>
                    <Badge 
                      variant={vendor.growth >= 0 ? "default" : "destructive"}
                      className={vendor.growth >= 0 ? "bg-green-100 text-green-800 mt-2" : "mt-2"}
                    >
                      {vendor.growth >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                      {formatPercentage(Math.abs(vendor.growth))}
                    </Badge>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Orders</p>
                        <p className="text-2xl font-bold text-gray-900" data-testid="metric-total-orders">
                          {vendorDetails.overview.totalOrders.toLocaleString()}
                        </p>
                      </div>
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <ShoppingCart className="w-4 h-4 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                        <p className="text-2xl font-bold text-gray-900" data-testid="metric-conversion-rate">
                          {formatPercentage(vendorDetails.overview.conversionRate)}
                        </p>
                      </div>
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Target className="w-4 h-4 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Avg Order Value</p>
                        <p className="text-2xl font-bold text-gray-900" data-testid="metric-aov">
                          {formatCurrency(vendorDetails.overview.avgOrderValue)}
                        </p>
                      </div>
                      <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                        <BarChart3 className="w-4 h-4 text-amber-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Monthly Trends Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">3-Month Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={vendorDetails.monthlyTrends}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                        <YAxis stroke="#6b7280" fontSize={12} />
                        <Tooltip 
                          labelStyle={{ color: '#374151' }}
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stroke="#3b82f6"
                          fill="#3b82f6"
                          fillOpacity={0.2}
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="products" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Top Performing Products</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {vendorDetails.topProducts.map((product, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                            <Package className="w-5 h-5 text-gray-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900" data-testid={`product-name-${index}`}>
                              {product.name}
                            </p>
                            <p className="text-sm text-gray-600">
                              {product.units} units sold
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900" data-testid={`product-revenue-${index}`}>
                            {formatCurrency(product.revenue)}
                          </p>
                          <Badge 
                            variant={product.growth >= 0 ? "default" : "destructive"}
                            className={product.growth >= 0 ? "bg-green-100 text-green-800" : ""}
                          >
                            {product.growth >= 0 ? '+' : ''}{formatPercentage(product.growth)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="customers" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Customer Segments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={vendorDetails.customerSegments}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {vendorDetails.customerSegments.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => `${value}%`} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap gap-4 mt-4">
                      {vendorDetails.customerSegments.map((segment, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: segment.color }}
                          />
                          <span className="text-sm text-gray-600">
                            {segment.name}: {segment.value}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Customer Metrics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Users className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="font-medium text-gray-900">Total Visitors</span>
                      </div>
                      <span className="font-bold text-gray-900" data-testid="customer-total-visitors">
                        {vendorDetails.overview.totalVisitors.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                          <Target className="w-4 h-4 text-green-600" />
                        </div>
                        <span className="font-medium text-gray-900">Customer Retention</span>
                      </div>
                      <span className="font-bold text-gray-900" data-testid="customer-retention">
                        {formatPercentage(vendorDetails.overview.customerRetention)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                          <Eye className="w-4 h-4 text-purple-600" />
                        </div>
                        <span className="font-medium text-gray-900">Avg Session Duration</span>
                      </div>
                      <span className="font-bold text-gray-900" data-testid="avg-session-duration">
                        {vendorDetails.overview.avgSessionDuration}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="traffic" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Traffic Sources</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {vendorDetails.trafficSources.map((source, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900" data-testid={`traffic-source-${index}`}>
                            {source.source}
                          </p>
                          <p className="text-sm text-gray-600">
                            {source.visitors.toLocaleString()} visitors
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            {formatPercentage(source.conversion)}
                          </p>
                          <p className="text-sm text-gray-600">conversion</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}