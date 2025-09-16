import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { DateRange } from "react-day-picker";
import AppHeader from "@/components/AppHeader";
import Sidebar from "@/components/Sidebar";
import DateRangePicker from "@/components/DateRangePicker";
import MetricsGrid from "@/components/MetricsGrid";
import VendorPerformanceChart from "@/components/VendorPerformanceChart";
import TopProducts from "@/components/TopProducts";
import VendorComparisonTable from "@/components/VendorComparisonTable";
import LandingPagesAnalysis from "@/components/LandingPagesAnalysis";
import { Button } from "@/components/ui/button";
import { RefreshCw, Download } from "lucide-react";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  
  // Date range state for filtering analytics
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const today = new Date();
    const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { from: lastMonth, to: today };
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

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
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-shopify-600 mx-auto mb-4"></div>
          <h2 className="text-lg font-medium text-gray-900">Loading dashboard...</h2>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <AppHeader />
      
      <div className="flex">
        <Sidebar />
        
        <main className="flex-1 p-6">
          {/* Enhanced Page Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2" data-testid="text-dashboard-title">
                  Vendor Analytics Dashboard
                </h2>
                <p className="text-gray-600" data-testid="text-dashboard-description">
                  Track performance metrics by brand and vendor across your store
                </p>
              </div>
              
              {/* Analytics Controls */}
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
                    // Simulate refresh delay
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    setIsRefreshing(false);
                    toast({
                      title: "Data refreshed",
                      description: "Analytics data has been updated with latest information.",
                    });
                  }}
                  disabled={isRefreshing}
                  data-testid="button-refresh-data"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </Button>
                <Button
                  variant="outline"
                  size="default"
                  onClick={() => {
                    toast({
                      title: "Export started",
                      description: "Your vendor analytics report is being generated...",
                    });
                  }}
                  data-testid="button-export-data"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            </div>
            
            {/* Date Range Display */}
            {dateRange?.from && (
              <div className="mt-4 p-3 bg-shopify-50 border border-shopify-200 rounded-lg">
                <p className="text-sm text-shopify-700" data-testid="text-active-date-range">
                  <span className="font-medium">Showing data for:</span> {' '}
                  {dateRange.to 
                    ? `${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`
                    : dateRange.from.toLocaleDateString()
                  }
                </p>
              </div>
            )}
          </div>

          {/* Key Metrics Cards */}
          <MetricsGrid />

          {/* Interactive Performance Chart */}
          <div className="mb-8">
            <VendorPerformanceChart dateRange={dateRange} />
          </div>

          {/* Top Products Card */}
          <div className="mb-8">
            <TopProducts />
          </div>

          {/* Vendor Comparison Table */}
          <VendorComparisonTable dateRange={dateRange} />

          {/* Landing Pages Analysis */}
          <LandingPagesAnalysis />
        </main>
      </div>
    </div>
  );
}
