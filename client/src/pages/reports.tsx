import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import AppHeader from "@/components/AppHeader";
import Sidebar from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { InfoIcon, FileDown, FileSpreadsheet, FileText, Calendar, Package, Users, ShoppingCart } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function ExportReports() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  
  // Check if using demo data
  const { data: stores } = useQuery({
    queryKey: ['/api/stores'],
    enabled: isAuthenticated
  });
  
  const isDemoMode = !stores || !Array.isArray(stores) || stores.length === 0 || stores[0]?.id === 'demo_store_1';
  
  // Export settings
  const [reportType, setReportType] = useState("all");
  const [dateRange, setDateRange] = useState("30d");
  const [format, setFormat] = useState("csv");
  const [includeOptions, setIncludeOptions] = useState({
    vendors: true,
    products: true,
    customers: true,
    orders: true,
    analytics: true
  });

  // Export loading state
  const [isExporting, setIsExporting] = useState(false);
  
  const handleExport = async (reportType?: string, exportFormat?: string) => {
    setIsExporting(true);
    
    try {
      const actualFormat = exportFormat || format;
      const actualReportType = reportType || 'vendor-performance';
      
      // Build export URL based on format
      const exportUrl = actualFormat === 'csv' 
        ? '/api/stores/current/vendors/export/csv'
        : '/api/stores/current/vendors/export/excel';
      
      // Add query parameters for filtering
      const params = new URLSearchParams({
        dateRange,
        sortBy: 'revenue',
        sortDirection: 'desc'
      });
      
      // Create a temporary link element to trigger download
      const link = document.createElement('a');
      link.href = `${exportUrl}?${params.toString()}`;
      link.download = `brandsight-${actualReportType}-${new Date().toISOString().split('T')[0]}.${actualFormat}`;
      
      // Set headers for download
      const response = await fetch(`${exportUrl}?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Accept': actualFormat === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
      });
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      // Get the blob and create download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      link.href = url;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Export completed",
        description: `Your ${actualFormat.toUpperCase()} report has been downloaded successfully.`,
      });
      
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: "Unable to export report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
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
          <h2 className="text-lg font-medium text-gray-900">Loading export options...</h2>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const reportTemplates = [
    {
      id: "vendor-performance",
      title: "Vendor Performance Report",
      description: "Complete vendor analytics including sales, products, and customer metrics",
      icon: <ShoppingCart className="h-8 w-8 text-brand-600" />,
    },
    {
      id: "product-analysis",
      title: "Product Analysis Report",
      description: "Detailed product performance, conversion rates, and inventory levels",
      icon: <Package className="h-8 w-8 text-brand-600" />,
    },
    {
      id: "customer-insights",
      title: "Customer Insights Report",
      description: "Customer segmentation, purchase patterns, and lifetime value analysis",
      icon: <Users className="h-8 w-8 text-brand-600" />,
    },
    {
      id: "monthly-summary",
      title: "Monthly Summary Report",
      description: "Comprehensive monthly overview of all key metrics and trends",
      icon: <Calendar className="h-8 w-8 text-brand-600" />,
    },
  ];

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
                <strong>Demo Mode:</strong> Export functionality is limited in demo mode. 
                <a href="/setup" className="underline ml-1 text-brand-700 hover:text-brand-900">
                  Connect your Shopify store
                </a> to export your real data.
              </AlertDescription>
            </Alert>
          )}
          
          {/* Page Header */}
          <div className="mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2" data-testid="text-page-title">
                Export Reports
              </h2>
              <p className="text-gray-600" data-testid="text-page-description">
                Generate and download comprehensive analytics reports
              </p>
            </div>
          </div>

          {/* Report Templates */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">Quick Export Templates</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {reportTemplates.map((template) => (
                <Card 
                  key={template.id} 
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  data-testid={`template-${template.id}`}
                >
                  <CardHeader>
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">{template.icon}</div>
                      <div className="flex-1">
                        <CardTitle className="text-lg">{template.title}</CardTitle>
                        <CardDescription className="mt-1">{template.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      className="w-full" 
                      onClick={() => handleExport(template.id, 'csv')}
                      disabled={isExporting}
                      data-testid={`button-export-${template.id}`}
                    >
                      <FileDown className="mr-2 h-4 w-4" />
                      {isExporting ? 'Generating...' : 'Generate Report'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Custom Export Settings */}
          <Card data-testid="card-custom-export">
            <CardHeader>
              <CardTitle>Custom Export</CardTitle>
              <CardDescription>Configure your own custom report with specific data and date ranges</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Report Type */}
                <div className="space-y-2">
                  <Label htmlFor="report-type">Report Type</Label>
                  <Select value={reportType} onValueChange={setReportType}>
                    <SelectTrigger id="report-type" data-testid="select-report-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Data</SelectItem>
                      <SelectItem value="vendors">Vendors Only</SelectItem>
                      <SelectItem value="products">Products Only</SelectItem>
                      <SelectItem value="customers">Customers Only</SelectItem>
                      <SelectItem value="orders">Orders Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Range */}
                <div className="space-y-2">
                  <Label htmlFor="date-range">Date Range</Label>
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger id="date-range" data-testid="select-date-range">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">Last 7 days</SelectItem>
                      <SelectItem value="30d">Last 30 days</SelectItem>
                      <SelectItem value="90d">Last 90 days</SelectItem>
                      <SelectItem value="1y">Last year</SelectItem>
                      <SelectItem value="all">All time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Export Format */}
                <div className="space-y-2">
                  <Label htmlFor="format">Export Format</Label>
                  <Select value={format} onValueChange={setFormat}>
                    <SelectTrigger id="format" data-testid="select-format">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                      <SelectItem value="json">JSON</SelectItem>
                      <SelectItem value="pdf">PDF Report</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Include Options */}
                <div className="space-y-2">
                  <Label>Include in Export</Label>
                  <div className="space-y-2">
                    {Object.entries(includeOptions).map(([key, value]) => (
                      <div key={key} className="flex items-center space-x-2">
                        <Checkbox
                          id={key}
                          checked={value}
                          onCheckedChange={(checked) =>
                            setIncludeOptions({ ...includeOptions, [key]: checked as boolean })
                          }
                          data-testid={`checkbox-${key}`}
                        />
                        <Label htmlFor={key} className="capitalize">
                          {key}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Export Button */}
                <Button 
                  className="w-full" 
                  size="lg" 
                  onClick={() => handleExport('custom', format)}
                  disabled={isExporting}
                  data-testid="button-custom-export"
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  {isExporting ? 'Generating...' : 'Generate Custom Report'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Exports */}
          <Card className="mt-8" data-testid="card-recent-exports">
            <CardHeader>
              <CardTitle>Recent Exports</CardTitle>
              <CardDescription>Download your previously generated reports</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-gray-600" />
                    <div>
                      <p className="font-medium">Vendor Performance Report</p>
                      <p className="text-sm text-gray-500">Generated 2 hours ago</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" data-testid="button-download-recent-1">
                    Download
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileSpreadsheet className="h-5 w-5 text-gray-600" />
                    <div>
                      <p className="font-medium">Monthly Summary - August 2024</p>
                      <p className="text-sm text-gray-500">Generated yesterday</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" data-testid="button-download-recent-2">
                    Download
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-gray-600" />
                    <div>
                      <p className="font-medium">Product Analysis Report</p>
                      <p className="text-sm text-gray-500">Generated 3 days ago</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" data-testid="button-download-recent-3">
                    Download
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}