import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useAppBridge } from "@/contexts/AppBridgeContext";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Setup from "@/pages/setup";
import Sync from "@/pages/sync";
import Dashboard from "@/pages/dashboard";
import VendorPerformance from "@/pages/vendors";
import SalesAnalytics from "@/pages/sales";
import CustomerInsights from "@/pages/customers";
import ProductPerformance from "@/pages/products";
import ExportReports from "@/pages/reports";
import Billing from "@/pages/billing";
import AlertsPage from "@/pages/alerts";
import BrandLoyaltyPage from "@/pages/brand-loyalty";
import InventoryPage from "@/pages/inventory";
import ForecastingPage from "@/pages/forecasting";

function OnboardingRouter() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { isEmbedded, shop, host } = useAppBridge();

  // For embedded apps, skip store fetching and go directly to dashboard when authenticated
  // For non-embedded apps, fetch stores to determine onboarding state
  const { data: stores, isLoading: storesLoading } = useQuery({
    queryKey: ['/api/stores'],
    enabled: isAuthenticated && !isEmbedded, // Skip for embedded apps
    retry: 1
  });

  // Show loading state while checking authentication
  // For embedded apps, only wait for auth, not stores
  if (authLoading || (isAuthenticated && !isEmbedded && storesLoading)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" data-testid="loading-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-brand-600 mx-auto mb-4"></div>
          <h2 className="text-lg font-medium text-gray-900">Loading...</h2>
        </div>
      </div>
    );
  }

  // Not authenticated - show landing page
  // For embedded contexts that are not authenticated, the useAuth hook will handle redirection
  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/welcome" component={Landing} />
        <Route path="/setup" component={Landing} />
        <Route path="/sync" component={Landing} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  // Authenticated users - for embedded apps, go directly to dashboard
  // For non-embedded apps, allow access to setup/sync if they want to connect additional stores
  
  return (
    <Switch>
      {/* For non-embedded apps, allow direct access to onboarding pages */}
      {!isEmbedded && <Route path="/setup" component={Setup} />}
      {!isEmbedded && <Route path="/sync" component={Sync} />}
      
      {/* Main dashboard and analytics pages - accessible for all authenticated users */}
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/alerts" component={AlertsPage} />
      <Route path="/brand-loyalty" component={BrandLoyaltyPage} />
      <Route path="/inventory" component={InventoryPage} />
      <Route path="/forecasting" component={ForecastingPage} />
      <Route path="/vendors" component={VendorPerformance} />
      <Route path="/sales" component={SalesAnalytics} />
      <Route path="/customers" component={CustomerInsights} />
      <Route path="/products" component={ProductPerformance} />
      <Route path="/reports" component={ExportReports} />
      <Route path="/billing" component={Billing} />
      <Route path="/vendor/:vendorSlug" component={Dashboard} />
      
      {/* Fallback - show dashboard (important for embedded apps) */}
      <Route component={Dashboard} />
    </Switch>
  );
}

function Router() {
  return <OnboardingRouter />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
