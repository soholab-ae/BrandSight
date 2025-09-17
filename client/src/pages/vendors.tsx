import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuery } from "@tanstack/react-query";
import AppHeader from '@/components/AppHeader';
import Sidebar from '@/components/Sidebar';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Package, ShoppingBag, TrendingUp, Eye, DollarSign, Calendar, InfoIcon, PieChart as PieChartIcon, Download, FileSpreadsheet } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from "@/components/ui/button";
import DateRangePicker from "@/components/DateRangePicker";
import { addDays } from "date-fns";
import type { DateRange } from "react-day-picker";

const COLORS = ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe'];

// Demo data
const demoVendors = [
  { id: 'vendor_1', name: 'Nike', totalRevenue: 485790, orderCount: 89, productCount: 28 },
  { id: 'vendor_2', name: 'Adidas', totalRevenue: 398450, orderCount: 72, productCount: 23 },
  { id: 'vendor_3', name: 'Under Armour', totalRevenue: 267340, orderCount: 51, productCount: 18 },
  { id: 'vendor_4', name: 'Puma', totalRevenue: 189230, orderCount: 38, productCount: 15 },
  { id: 'vendor_5', name: 'New Balance', totalRevenue: 156890, orderCount: 29, productCount: 12 }
];

// Generate demo data based on selected vendor
const generateVendorData = (vendorId: string) => {
  const vendor = demoVendors.find(v => v.id === vendorId);
  if (!vendor) return null;

  // Top 10 Products
  const products = Array.from({ length: 10 }, (_, i) => ({
    id: `prod_${vendorId}_${i + 1}`,
    name: `${vendor.name} Product ${String.fromCharCode(65 + i)}`,
    sales: Math.floor(Math.random() * 50 + 20),
    revenue: Math.floor(Math.random() * 15000 + 5000),
    units: Math.floor(Math.random() * 100 + 30),
    conversionRate: (Math.random() * 5 + 1).toFixed(2)
  })).sort((a, b) => b.revenue - a.revenue);

  // Top 5 Product Types
  const productTypes = [
    { name: 'Running Shoes', count: 145, revenue: Math.floor(vendor.totalRevenue * 0.35) },
    { name: 'Athletic Apparel', count: 112, revenue: Math.floor(vendor.totalRevenue * 0.28) },
    { name: 'Training Equipment', count: 89, revenue: Math.floor(vendor.totalRevenue * 0.18) },
    { name: 'Casual Wear', count: 67, revenue: Math.floor(vendor.totalRevenue * 0.12) },
    { name: 'Accessories', count: 45, revenue: Math.floor(vendor.totalRevenue * 0.07) }
  ];

  // Performance over time (last 30 days)
  const performanceData = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    return {
      date: format(date, 'MMM dd'),
      sales: Math.floor(Math.random() * 30000 + 10000),
      orders: Math.floor(Math.random() * 20 + 5),
      visitors: Math.floor(Math.random() * 500 + 200)
    };
  });

  // Total stats
  const totalItemsSold = products.reduce((sum, p) => sum + p.units, 0);
  const totalVisitors = Math.floor(Math.random() * 10000 + 5000);

  return {
    vendor,
    products,
    productTypes,
    performanceData,
    totalItemsSold,
    totalVisitors
  };
};

export default function VendorPerformance() {
  const [selectedVendor, setSelectedVendor] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });

  // Export functionality for vendor contribution data
  const exportVendorContribution = (format: 'csv' | 'excel') => {
    if (!vendors) return;

    const totalRevenue = vendors.reduce((sum, v) => sum + v.totalRevenue, 0);
    const exportData = vendors.map((vendor, index) => ({
      rank: index + 1,
      vendor: vendor.name,
      revenue: vendor.totalRevenue,
      percentage: ((vendor.totalRevenue / totalRevenue) * 100).toFixed(1),
      productCount: vendor.productCount,
      orderCount: vendor.orderCount
    }));

    const dateRangeStr = dateRange?.from && dateRange?.to 
      ? `${format(dateRange.from, 'yyyy-MM-dd')}_to_${format(dateRange.to, 'yyyy-MM-dd')}`
      : 'all_time';

    if (format === 'csv') {
      const csvContent = [
        ['Rank', 'Vendor', 'Revenue ($)', 'Percentage (%)', 'Product Count', 'Order Count'],
        ...exportData.map(row => [
          row.rank,
          row.vendor,
          row.revenue,
          row.percentage,
          row.productCount,
          row.orderCount
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `vendor_contribution_${dateRangeStr}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (format === 'excel') {
      // Basic Excel export functionality (would need xlsx library for full functionality)
      const csvContent = [
        ['Rank', 'Vendor', 'Revenue ($)', 'Percentage (%)', 'Product Count', 'Order Count'],
        ...exportData.map(row => [
          row.rank,
          row.vendor,
          row.revenue,
          row.percentage,
          row.productCount,
          row.orderCount
        ])
      ].map(row => row.join('\t')).join('\n');

      const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `vendor_contribution_${dateRangeStr}.xls`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Fetch vendors
  const { data: vendors } = useQuery({
    queryKey: ['/api/stores/current/vendors'],
    initialData: demoVendors
  });

  // Set initial vendor when vendors are loaded
  useEffect(() => {
    if (vendors && vendors.length > 0 && !selectedVendor) {
      setSelectedVendor(vendors[0].id);
    }
  }, [vendors, selectedVendor]);

  const vendorData = selectedVendor ? generateVendorData(selectedVendor) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />
      <div className="flex">
        <Sidebar />
        
        <main className="flex-1 overflow-y-auto">
          <div className="p-8">
            {/* Demo Mode Alert */}
            <Alert className="mb-6 bg-brand-50 border-brand-200" data-testid="demo-alert">
              <InfoIcon className="h-4 w-4 text-brand-600" />
              <AlertDescription className="text-brand-800">
                <strong>Demo Mode:</strong> You're viewing sample vendor performance data. 
                <Button variant="link" className="p-0 h-auto font-semibold text-brand-700" data-testid="button-connect-store">
                  Connect your Shopify store
                </Button> to see real vendor analytics.
              </AlertDescription>
            </Alert>
            {/* Header Section */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Vendor Performance</h1>
              <p className="text-gray-600">Deep dive into individual vendor analytics and performance metrics</p>
            </div>

            {/* Vendor Contribution to Overall Sales */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <PieChartIcon className="h-5 w-5 text-brand-600" />
                    <CardTitle>Vendor Contribution to Overall Sales</CardTitle>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => exportVendorContribution('csv')}
                      data-testid="button-export-csv"
                      className="flex-1 sm:flex-none"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      <span className="hidden sm:inline">CSV</span>
                      <span className="sm:hidden">Export CSV</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => exportVendorContribution('excel')}
                      data-testid="button-export-excel"
                      className="flex-1 sm:flex-none"
                    >
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      <span className="hidden sm:inline">Excel</span>
                      <span className="sm:hidden">Export Excel</span>
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  Revenue contribution breakdown by vendor for {dateRange?.from ? format(dateRange.from, 'MMM dd, yyyy') : 'all time'} - {dateRange?.to ? format(dateRange.to, 'MMM dd, yyyy') : 'today'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Pie Chart */}
                  <div>
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Sales Distribution</h4>
                      <p className="text-xs text-gray-500">
                        Total Sales: <span className="font-semibold text-gray-900">
                          ${vendors?.reduce((sum, v) => sum + v.totalRevenue, 0).toLocaleString()}
                        </span>
                      </p>
                    </div>
                    <ResponsiveContainer width="100%" height={320}>
                      <PieChart>
                        <Pie
                          data={vendors?.map((vendor, index) => ({
                            ...vendor,
                            percentage: ((vendor.totalRevenue / vendors.reduce((sum, v) => sum + v.totalRevenue, 0)) * 100).toFixed(1)
                          }))}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percentage }) => `${name}: ${percentage}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="totalRevenue"
                        >
                          {vendors?.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number, name: string) => [
                            `$${value.toLocaleString()}`,
                            'Revenue'
                          ]}
                          labelFormatter={(label) => `${label}`}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Detailed Breakdown Table */}
                  <div>
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Detailed Breakdown</h4>
                      <p className="text-xs text-gray-500">Vendors ranked by total revenue contribution</p>
                    </div>
                    <div className="space-y-3">
                      {vendors?.map((vendor, index) => {
                        const totalRevenue = vendors.reduce((sum, v) => sum + v.totalRevenue, 0);
                        const percentage = ((vendor.totalRevenue / totalRevenue) * 100).toFixed(1);
                        const isTopContributor = index === 0;
                        
                        return (
                          <div 
                            key={vendor.id} 
                            className={`flex items-center justify-between p-3 rounded-lg border ${
                              isTopContributor ? 'border-brand-200 bg-brand-50' : 'border-gray-200 bg-gray-50'
                            }`}
                            data-testid={`vendor-contribution-${vendor.id}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                />
                                <span className="text-xs text-gray-500">#{index + 1}</span>
                              </div>
                              <div>
                                <p className={`font-semibold ${isTopContributor ? 'text-brand-700' : 'text-gray-900'}`}>
                                  {vendor.name}
                                  {isTopContributor && (
                                    <span className="ml-2 text-xs bg-brand-100 text-brand-700 px-2 py-1 rounded-full">
                                      Top Contributor
                                    </span>
                                  )}
                                </p>
                                <p className="text-xs text-gray-600">{vendor.productCount} products</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-gray-900">${vendor.totalRevenue.toLocaleString()}</p>
                              <p className="text-xs text-gray-500">{percentage}% of total</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Summary Stats */}
                    <div className="mt-6 p-4 bg-gray-100 rounded-lg">
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                          <p className="text-2xl font-bold text-gray-900" data-testid="total-vendors">
                            {vendors?.length}
                          </p>
                          <p className="text-xs text-gray-600">Total Vendors</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-gray-900" data-testid="avg-revenue">
                            ${vendors ? Math.round(vendors.reduce((sum, v) => sum + v.totalRevenue, 0) / vendors.length).toLocaleString() : 0}
                          </p>
                          <p className="text-xs text-gray-600">Avg Revenue</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Vendor Selection */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Select Vendor</CardTitle>
                <CardDescription>Choose a vendor to view detailed performance analytics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4">
                  <Select value={selectedVendor} onValueChange={setSelectedVendor} data-testid="select-vendor">
                    <SelectTrigger className="w-[300px]">
                      <SelectValue placeholder="Select a vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors?.map((vendor) => (
                        <SelectItem key={vendor.id} value={vendor.id} data-testid={`vendor-option-${vendor.id}`}>
                          {vendor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <DateRangePicker
                    value={dateRange}
                    onChange={setDateRange}
                    placeholder="Select date range"
                  />
                  
                  <Button variant="outline" data-testid="button-refresh">
                    <Calendar className="mr-2 h-4 w-4" />
                    Refresh
                  </Button>
                </div>
              </CardContent>
            </Card>

            {vendorData && (
              <>
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 text-green-500 mr-2" />
                        <p className="text-2xl font-bold" data-testid="metric-revenue">
                          ${vendorData.vendor.totalRevenue.toLocaleString()}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">Total Items Sold</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center">
                        <ShoppingBag className="h-4 w-4 text-blue-500 mr-2" />
                        <p className="text-2xl font-bold" data-testid="metric-items-sold">
                          {vendorData.totalItemsSold.toLocaleString()}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">Total Visitors</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center">
                        <Eye className="h-4 w-4 text-purple-500 mr-2" />
                        <p className="text-2xl font-bold" data-testid="metric-visitors">
                          {vendorData.totalVisitors.toLocaleString()}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">Products Listed</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center">
                        <Package className="h-4 w-4 text-orange-500 mr-2" />
                        <p className="text-2xl font-bold" data-testid="metric-products">
                          {vendorData.vendor.productCount}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Performance Chart */}
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Brand Performance Over Time</CardTitle>
                    <CardDescription>Daily sales performance for the selected period</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={vendorData.performanceData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="sales" 
                          stroke="#8b5cf6" 
                          name="Sales ($)"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Top 10 Products */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Top 10 Products</CardTitle>
                      <CardDescription>Best performing products for {vendorData.vendor.name}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead className="text-right">Revenue</TableHead>
                            <TableHead className="text-right">Units</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {vendorData.products.map((product, index) => (
                            <TableRow key={product.id}>
                              <TableCell className="font-medium">
                                <div className="flex items-center">
                                  <span className="text-xs text-gray-500 mr-2">#{index + 1}</span>
                                  {product.name}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                ${product.revenue.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right">{product.units}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  {/* Top 5 Product Types */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Top 5 Product Types</CardTitle>
                      <CardDescription>Product categories driving the most revenue</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={vendorData.productTypes}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={(entry) => `${entry.name}: $${(entry.revenue/1000).toFixed(0)}k`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="revenue"
                          >
                            {vendorData.productTypes.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                        </PieChart>
                      </ResponsiveContainer>
                      
                      {/* Legend */}
                      <div className="mt-4 space-y-2">
                        {vendorData.productTypes.map((type, index) => (
                          <div key={type.name} className="flex items-center justify-between text-sm">
                            <div className="flex items-center">
                              <div 
                                className="w-3 h-3 rounded mr-2" 
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                              />
                              <span>{type.name}</span>
                            </div>
                            <span className="text-gray-600">{type.count} items</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}