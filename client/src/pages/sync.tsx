import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { 
  BarChart3, 
  CheckCircle, 
  Database, 
  TrendingUp, 
  Users, 
  ShoppingBag, 
  Loader2,
  Store,
  Package,
  FileText,
  BarChart,
  AlertCircle
} from "lucide-react";

interface SyncStep {
  id: string;
  title: string;
  description: string;
  icon: any;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  duration?: number;
}

export default function Sync() {
  const { toast } = useToast();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [overallProgress, setOverallProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user has stores (to detect when sync is complete)
  const { data: stores, isError: storesError } = useQuery({
    queryKey: ['/api/stores'],
    refetchInterval: isComplete ? false : 2000, // Poll every 2 seconds until complete
    retry: 3
  });

  const syncSteps: SyncStep[] = [
    {
      id: 'connection',
      title: 'Establishing Connection',
      description: 'Connecting to your Shopify store securely...',
      icon: Store,
      status: 'pending'
    },
    {
      id: 'products',
      title: 'Importing Products',
      description: 'Fetching your product catalog and organizing by vendor...',
      icon: Package,
      status: 'pending'
    },
    {
      id: 'orders',
      title: 'Importing Orders',
      description: 'Analyzing order history and customer data...',
      icon: FileText,
      status: 'pending'
    },
    {
      id: 'analytics',
      title: 'Generating Analytics',
      description: 'Calculating vendor performance metrics...',
      icon: BarChart,
      status: 'pending'
    }
  ];

  // Simulate sync progress
  useEffect(() => {
    if (isComplete || error) return;

    const timer = setTimeout(() => {
      if (currentStepIndex < syncSteps.length - 1) {
        setCurrentStepIndex(prev => prev + 1);
        setOverallProgress(prev => Math.min(prev + 25, 90));
      } else {
        // Check if we actually have stores
        if (stores && Array.isArray(stores) && stores.length > 0) {
          setOverallProgress(100);
          setIsComplete(true);
          toast({
            title: "Sync completed!",
            description: "Your store analytics are ready. Redirecting to dashboard...",
          });
          // Redirect to dashboard after success
          setTimeout(() => {
            window.location.href = "/";
          }, 2000);
        }
      }
    }, 3000 + Math.random() * 2000); // 3-5 seconds per step

    return () => clearTimeout(timer);
  }, [currentStepIndex, isComplete, error, stores, toast]);

  // Handle errors
  useEffect(() => {
    if (storesError) {
      setError("Failed to connect to your store. Please check your credentials.");
    }
  }, [storesError]);

  const handleRetry = () => {
    setError(null);
    setCurrentStepIndex(0);
    setOverallProgress(0);
    setIsComplete(false);
  };

  const handleGoToDashboard = () => {
    window.location.href = "/";
  };

  // Update step statuses based on current progress
  const stepsWithStatus = syncSteps.map((step, index) => ({
    ...step,
    status: error ? 'error' : 
           index < currentStepIndex ? 'completed' :
           index === currentStepIndex ? 'in_progress' : 'pending'
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-shopify-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-shopify-500 rounded-lg flex items-center justify-center">
                <BarChart3 className="text-white" size={20} />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Vendorlytics</h1>
            </div>
            <div className="flex items-center space-x-3">
              <Badge 
                variant={isComplete ? "default" : error ? "destructive" : "secondary"} 
                className={isComplete ? "bg-green-100 text-green-700" : ""}
                data-testid="badge-sync-status"
              >
                {isComplete ? (
                  <>
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Sync Complete
                  </>
                ) : error ? (
                  <>
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Sync Error
                  </>
                ) : (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Syncing Data
                  </>
                )}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Main Sync Card */}
        <Card className="mb-8">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-shopify-100 rounded-full flex items-center justify-center mx-auto mb-4">
              {isComplete ? (
                <CheckCircle className="w-8 h-8 text-green-600" />
              ) : error ? (
                <AlertCircle className="w-8 h-8 text-red-600" />
              ) : (
                <Database className="w-8 h-8 text-shopify-600" />
              )}
            </div>
            <CardTitle className="text-2xl" data-testid="heading-sync-status">
              {isComplete ? "Sync Complete!" : error ? "Sync Error" : "Syncing Your Store Data"}
            </CardTitle>
            <p className="text-gray-600 mt-2" data-testid="text-sync-description">
              {isComplete 
                ? "Your store analytics are ready! You'll be redirected to your dashboard shortly."
                : error
                ? "We encountered an issue while syncing your store data."
                : "We're importing your store data and generating vendor analytics. This usually takes 2-5 minutes."
              }
            </p>
          </CardHeader>
          <CardContent>
            {/* Overall Progress */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700" data-testid="text-overall-progress">
                  Overall Progress
                </span>
                <span className="text-sm text-gray-500" data-testid="text-progress-percentage">
                  {Math.round(overallProgress)}%
                </span>
              </div>
              <Progress value={overallProgress} className="w-full h-3" data-testid="progress-overall" />
            </div>

            {/* Sync Steps */}
            <div className="space-y-4">
              {stepsWithStatus.map((step, index) => {
                const IconComponent = step.icon;
                return (
                  <div 
                    key={step.id} 
                    className={`flex items-center space-x-4 p-4 rounded-lg border ${
                      step.status === 'completed' ? 'bg-green-50 border-green-200' :
                      step.status === 'in_progress' ? 'bg-shopify-50 border-shopify-200' :
                      step.status === 'error' ? 'bg-red-50 border-red-200' :
                      'bg-gray-50 border-gray-200'
                    }`}
                    data-testid={`sync-step-${step.id}`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      step.status === 'completed' ? 'bg-green-100' :
                      step.status === 'in_progress' ? 'bg-shopify-100' :
                      step.status === 'error' ? 'bg-red-100' :
                      'bg-gray-100'
                    }`}>
                      {step.status === 'completed' ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : step.status === 'in_progress' ? (
                        <Loader2 className="w-5 h-5 text-shopify-600 animate-spin" />
                      ) : step.status === 'error' ? (
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      ) : (
                        <IconComponent className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-semibold ${
                        step.status === 'completed' ? 'text-green-900' :
                        step.status === 'in_progress' ? 'text-shopify-900' :
                        step.status === 'error' ? 'text-red-900' :
                        'text-gray-500'
                      }`} data-testid={`step-title-${step.id}`}>
                        {step.title}
                      </h3>
                      <p className={`text-sm ${
                        step.status === 'completed' ? 'text-green-700' :
                        step.status === 'in_progress' ? 'text-shopify-700' :
                        step.status === 'error' ? 'text-red-700' :
                        'text-gray-500'
                      }`} data-testid={`step-description-${step.id}`}>
                        {step.status === 'completed' ? 'Completed successfully' :
                         step.status === 'error' ? 'Failed - will retry' :
                         step.description
                        }
                      </p>
                    </div>
                    {step.status === 'completed' && (
                      <Badge variant="secondary" className="bg-green-100 text-green-700" data-testid={`badge-completed-${step.id}`}>
                        Done
                      </Badge>
                    )}
                    {step.status === 'in_progress' && (
                      <Badge variant="secondary" className="bg-shopify-100 text-shopify-700" data-testid={`badge-processing-${step.id}`}>
                        Processing...
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Error Actions */}
            {error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-red-900 mb-1" data-testid="heading-error">
                      Sync Failed
                    </h4>
                    <p className="text-red-700 text-sm mb-3" data-testid="text-error-message">
                      {error}
                    </p>
                    <div className="flex space-x-3">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleRetry}
                        className="border-red-200 text-red-700 hover:bg-red-50"
                        data-testid="button-retry-sync"
                      >
                        Retry Sync
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.location.href = "/setup"}
                        className="border-red-200 text-red-700 hover:bg-red-50"
                        data-testid="button-back-setup"
                      >
                        Back to Setup
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Success Actions */}
            {isComplete && (
              <div className="mt-6 text-center">
                <Button 
                  onClick={handleGoToDashboard}
                  size="lg"
                  className="bg-shopify-600 hover:bg-shopify-700 px-8 py-3"
                  data-testid="button-go-dashboard"
                >
                  Go to Dashboard
                  <BarChart3 className="w-5 h-5 ml-2" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* What's Happening Behind the Scenes */}
        {!isComplete && !error && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg" data-testid="heading-behind-scenes">
                What's happening behind the scenes?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div className="space-y-2" data-testid="info-data-import">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto">
                    <Package className="w-6 h-6 text-blue-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900">Data Import</h4>
                  <p className="text-gray-600 text-sm">
                    Securely importing your products, orders, and customer data
                  </p>
                </div>
                <div className="space-y-2" data-testid="info-vendor-analysis">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900">Vendor Analysis</h4>
                  <p className="text-gray-600 text-sm">
                    Organizing products by vendor and calculating performance metrics
                  </p>
                </div>
                <div className="space-y-2" data-testid="info-dashboard-prep">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto">
                    <BarChart className="w-6 h-6 text-purple-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900">Dashboard Prep</h4>
                  <p className="text-gray-600 text-sm">
                    Preparing your personalized analytics dashboard
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}