import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Welcome from "@/pages/welcome";
import Setup from "@/pages/setup";
import Sync from "@/pages/sync";
import Dashboard from "@/pages/dashboard";

function OnboardingRouter() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  // Fetch stores data to determine onboarding state
  const { data: stores, isLoading: storesLoading, isError: storesError } = useQuery({
    queryKey: ['/api/stores'],
    enabled: isAuthenticated, // Only fetch if authenticated
    retry: 1 // Reduce retries to speed up error detection
  });

  // Show loading state while checking authentication or stores
  if (authLoading || (isAuthenticated && storesLoading)) {
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

  // Authenticated user routing based on onboarding state
  const hasStores = stores && Array.isArray(stores) && stores.length > 0;
  const hasError = storesError;

  return (
    <Switch>
      {/* Allow direct access to specific onboarding pages */}
      <Route path="/welcome" component={Welcome} />
      <Route path="/setup" component={Setup} />
      <Route path="/sync" component={Sync} />
      
      {/* Main route logic - redirect based on user state */}
      <Route path="/">
        {() => {
          // Skip welcome screen if there's an error - go straight to setup
          if (hasError) {
            return <Setup />;
          }
          
          // If user has no stores, go straight to setup (skip welcome)
          if (!hasStores) {
            return <Setup />;
          }
          
          // User has stores - show dashboard
          return <Dashboard />;
        }}
      </Route>
      
      {/* Fallback for any other route when authenticated */}
      <Route>
        {() => {
          if (hasError || !hasStores) {
            return <Setup />;
          }
          return <Dashboard />;
        }}
      </Route>
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
