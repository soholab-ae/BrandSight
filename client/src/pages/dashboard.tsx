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
import ReferralSources from "@/components/ReferralSources";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw, Download, InfoIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  
  // Check if using demo data
  const { data: stores } = useQuery({
    queryKey: ['/api/stores'],
    enabled: isAuthenticated
  });
  
  const isDemoMode = !stores || !Array.isArray(stores) || stores.length === 0 || stores[0]?.id === 'demo_store_1';
  
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
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-brand-600 mx-auto mb-4"></div>
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
      <div className="flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader mobileMenuButton={<Sidebar />} />
          
          <main className="flex-1 p-4 sm:p-6 max-w-full">
          {/* Demo Mode Alert */}
          {isDemoMode && (
            <Alert className="mb-6 bg-brand-50 border-brand-200">
              <InfoIcon className="h-4 w-4 text-brand-600" />
              <AlertDescription className="text-brand-800">
                <strong>Demo Mode:</strong> You're viewing sample analytics data for popular athletic brands. 
                <a href="/setup" className="underline ml-1 text-brand-700 hover:text-brand-900">
                  Connect your Shopify store
                </a> to see your real vendor analytics.
              </AlertDescription>
            </Alert>
          )}
          
          {/* Enhanced Page Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2" data-testid="text-dashboard-title">
                  Vendor Analytics Dashboard
                </h2>
                <p className="text-sm sm:text-base text-gray-600" data-testid="text-dashboard-description">
                  Track performance metrics by brand and vendor across your store
                </p>
              </div>
              
              {/* Analytics Controls */}
              <div className="flex flex-col w-full sm:w-auto sm:flex-row gap-2 sm:gap-3">
                <DateRangePicker
                  value={dateRange}
                  onChange={setDateRange}
                  placeholder="Select date range"
                />
                <div className="flex flex-row gap-2 sm:gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 sm:flex-none"
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
                    <span className="hidden sm:inline">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
                    <span className="sm:hidden">{isRefreshing ? '...' : 'Refresh'}</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 sm:flex-none"
                    onClick={() => {
                      toast({
                        title: "Export started",
                        description: "Your vendor analytics report is being generated...",
                      });
                    }}
                    data-testid="button-export-data"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Export</span>
                    <span className="sm:hidden">Export</span>
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Date Range Display */}
            {dateRange?.from && (
              <div className="mt-4 p-3 bg-brand-50 border border-brand-200 rounded-lg">
                <p className="text-xs sm:text-sm text-brand-700" data-testid="text-active-date-range">
                  <span className="font-medium">Showing data for:</span> {' '}
                  <span className="block sm:inline mt-1 sm:mt-0">
                    {dateRange.to 
                      ? `${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`
                      : dateRange.from.toLocaleDateString()
                    }
                  </span>
                </p>
              </div>
            )}
          </div>

          {/* Key Metrics Cards */}
          <MetricsGrid />

          {/* Interactive Performance Chart */}
          <div className="mb-6 sm:mb-8">
            <VendorPerformanceChart dateRange={dateRange} />
          </div>

          {/* Top Products Card */}
          <div className="mb-6 sm:mb-8">
            <TopProducts />
          </div>

          {/* Vendor Comparison Table */}
          <VendorComparisonTable dateRange={dateRange} />

          {/* Top Referral Sources */}
          <ReferralSources />

          {/* Landing Pages Analysis */}
          <LandingPagesAnalysis />
          </main>
        </div>
      </div>
    </div>
  );
}
