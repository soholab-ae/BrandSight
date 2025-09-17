import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuery } from "@tanstack/react-query";
import AppHeader from '@/components/AppHeader';
import Sidebar from '@/components/Sidebar';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Package, ShoppingBag, TrendingUp, Eye, DollarSign, Calendar, InfoIcon } from 'lucide-react';
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