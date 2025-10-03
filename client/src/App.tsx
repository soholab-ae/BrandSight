import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useAppBridge } from "@/contexts/AppBridgeContext";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
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
import NotificationCenterPage from "@/pages/notifications";
import NotificationPreferencesPage from "@/pages/notification-preferences";

function OnboardingRouter() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { isEmbedded } = useAppBridge();

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" data-testid="loading-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-brand-600 mx-auto mb-4"></div>
          <h2 className="text-lg font-medium text-gray-900">Loading...</h2>
        </div>
      </div>
    );
  }

  // All users (authenticated and unauthenticated) can access the dashboard
  // Dashboard will show demo mode if no store is connected
  // This eliminates the landing/welcome page entirely
  
  return (
    <Switch>
      {/* Sync page for OAuth callback progress tracking */}
      <Route path="/sync" component={Sync} />
      
      {/* Main dashboard and analytics pages - accessible for all users */}
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/alerts" component={AlertsPage} />
      <Route path="/notifications" component={NotificationCenterPage} />
      <Route path="/notifications/preferences" component={NotificationPreferencesPage} />
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
      
      {/* Fallback - show dashboard */}
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
