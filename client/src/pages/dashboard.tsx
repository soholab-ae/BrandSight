import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import AppHeader from "@/components/AppHeader";
import Sidebar from "@/components/Sidebar";
import MetricsGrid from "@/components/MetricsGrid";
import RevenueChart from "@/components/RevenueChart";
import TopProducts from "@/components/TopProducts";
import VendorComparisonTable from "@/components/VendorComparisonTable";
import LandingPagesAnalysis from "@/components/LandingPagesAnalysis";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

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
          {/* Page Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2" data-testid="text-dashboard-title">
              Vendor Analytics Dashboard
            </h2>
            <p className="text-gray-600" data-testid="text-dashboard-description">
              Track performance metrics by brand and vendor across your store
            </p>
          </div>

          {/* Key Metrics Cards */}
          <MetricsGrid />

          {/* Charts and Products */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <RevenueChart />
            <TopProducts />
          </div>

          {/* Vendor Comparison Table */}
          <VendorComparisonTable />

          {/* Landing Pages Analysis */}
          <LandingPagesAnalysis />
        </main>
      </div>
    </div>
  );
}
