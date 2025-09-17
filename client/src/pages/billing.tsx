import { useState } from 'react';
import { useAuth } from "@/hooks/useAuth";
import AppHeader from "@/components/AppHeader";
import Sidebar from "@/components/Sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { CheckCircle, Sparkles, Clock, CreditCard, XCircle, Star, Zap, Shield, Download, Calendar, AlertTriangle, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Billing() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  
  // Check if we're in Shopify mode
  const isShopifyMode = import.meta.env.VITE_USE_SHOPIFY_AUTH === 'true';
  
  // Fetch billing status
  const { data: billingStatus, isLoading, error } = useQuery({
    queryKey: ['/api/billing/status'],
    enabled: isShopifyMode && isAuthenticated,
    retry: 1,
  });
  
  // Create subscription mutation
  const subscribeMutation = useMutation({
    mutationFn: async () => {
      setIsProcessing(true);
      const response = await fetch('/api/billing/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planName: 'BrandSight Premium' }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create subscription');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      // Redirect to Shopify billing confirmation page
      if (data.confirmationUrl) {
        window.location.href = data.confirmationUrl;
      }
    },
    onError: () => {
      setIsProcessing(false);
      toast({
        title: "Subscription Error",
        description: "Failed to create subscription. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Cancel subscription mutation  
  const cancelMutation = useMutation({
    mutationFn: async (subscriptionId: string) => {
      const response = await fetch('/api/billing/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/billing/status'] });
      setShowCancelDialog(false);
      toast({
        title: "Subscription Cancelled",
        description: "Your subscription has been cancelled successfully. You'll continue to have access until the end of your billing period.",
      });
    },
    onError: () => {
      toast({
        title: "Cancellation Error",
        description: "Failed to cancel subscription. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCancelSubscription = (subscriptionId: string) => {
    cancelMutation.mutate(subscriptionId);
  };

  // Demo features list
  const premiumFeatures = [
    { icon: Zap, text: "Unlimited vendor tracking", included: true },
    { icon: Star, text: "Advanced analytics & insights", included: true },
    { icon: Download, text: "Export detailed reports", included: true },
    { icon: Shield, text: "Priority customer support", included: true },
    { icon: Calendar, text: "Historical data (12+ months)", included: true },
    { icon: CreditCard, text: "Revenue attribution tracking", included: true },
  ];

  // Future plans (for display purposes)
  // Single BrandSight Premium plan - $69/month billed through Shopify
  const currentPlan = {
    name: "BrandSight Premium",
    price: 69,
    period: "month",
    description: "Advanced vendor analytics for your Shopify store",
    features: premiumFeatures
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              Please sign in to access your billing information.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900" data-testid="page-title">
                  Billing & Subscription
                </h1>
                <p className="text-gray-600 mt-1">
                  Manage your BrandSight subscription and billing details
                </p>
              </div>
            </div>

            {/* Current Subscription Status */}
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Current Subscription
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!isShopifyMode ? (
                      /* Demo Mode */
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">Demo Mode Active</h3>
                            <p className="text-sm text-gray-600">Explore all premium features with sample data</p>
                          </div>
                          <Badge className="bg-purple-100 text-purple-800" data-testid="status-badge">
                            DEMO
                          </Badge>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg">
                          <div className="flex items-start gap-3">
                            <Sparkles className="h-5 w-5 text-purple-600 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-purple-900">
                                You're using BrandSight in demo mode
                              </p>
                              <p className="text-sm text-purple-700 mt-1">
                                All features are available with sample data. Connect your Shopify store to access real analytics.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : isLoading ? (
                      /* Loading State */
                      <div className="animate-pulse space-y-4">
                        <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    ) : error ? (
                      /* Error State */
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          Unable to load billing information. Please try again later.
                        </AlertDescription>
                      </Alert>
                    ) : (billingStatus as any)?.hasActiveSubscription ? (
                      /* Active Subscription */
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">BrandSight Premium</h3>
                            <p className="text-sm text-gray-600">$69.00 per month • Billed through Shopify</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {(billingStatus as any)?.isInTrial && (
                              <Badge className="bg-blue-100 text-blue-800">
                                FREE TRIAL
                              </Badge>
                            )}
                            <Badge className="bg-green-100 text-green-800" data-testid="status-badge">
                              ACTIVE
                            </Badge>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-700">Next Billing Date</p>
                            <p className="text-sm text-gray-900" data-testid="next-billing-date">
                              {(billingStatus as any)?.subscription?.currentPeriodEnd 
                                ? new Date((billingStatus as any).subscription.currentPeriodEnd).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long', 
                                    day: 'numeric'
                                  })
                                : 'N/A'
                              }
                            </p>
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-700">Status</p>
                            <p className="text-sm text-gray-900">
                              {(billingStatus as any)?.isInTrial ? 'Free Trial Active' : 'Subscription Active'}
                            </p>
                          </div>
                        </div>

                        {(billingStatus as any)?.isInTrial && (
                          <Alert>
                            <Clock className="h-4 w-4" />
                            <AlertDescription>
                              Your free trial ends on{' '}
                              {new Date((billingStatus as any)?.subscription?.currentPeriodEnd).toLocaleDateString()}.
                              You'll be automatically charged $69.00 through Shopify unless you cancel before then.
                            </AlertDescription>
                          </Alert>
                        )}

                        <div className="pt-4 border-t border-gray-200">
                          <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-red-600 hover:text-red-700"
                                data-testid="button-cancel-subscription"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Cancel Subscription
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to cancel your BrandSight Premium subscription? 
                                  You'll continue to have access until the end of your current billing period.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => billingStatus.subscription?.id && handleCancelSubscription(billingStatus.subscription.id)}
                                  disabled={cancelMutation.isPending}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Subscription'}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ) : (
                      /* No Active Subscription */
                      <div className="space-y-4">
                        <div className="text-center py-6">
                          <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Subscription</h3>
                          <p className="text-gray-600 mb-4">
                            Subscribe to BrandSight Premium ($69/month) through Shopify to unlock advanced vendor analytics
                          </p>
                          <Button
                            onClick={() => subscribeMutation.mutate()}
                            disabled={subscribeMutation.isPending || isProcessing}
                            className="bg-brand-600 hover:bg-brand-700"
                            data-testid="button-subscribe"
                          >
                            {subscribeMutation.isPending || isProcessing ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Processing...
                              </>
                            ) : (
                              <>
                                <Star className="h-4 w-4 mr-2" />
                                Start Free Trial
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Billing History */}
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Billing History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-gray-500">
                      <Calendar className="h-8 w-8 mx-auto mb-3 text-gray-400" />
                      <p className="text-sm">No billing history available</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Past invoices and payments will appear here
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Plan Details & Features */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-center">
                      Premium Features
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {premiumFeatures.map((feature, index) => {
                        const Icon = feature.icon;
                        return (
                          <div key={index} className="flex items-center gap-3">
                            <div className="flex-shrink-0">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            </div>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4 text-gray-600" />
                              <span className="text-sm text-gray-700">{feature.text}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Need Help?</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button variant="outline" size="sm" className="w-full justify-start" data-testid="button-contact-support">
                      <Shield className="h-4 w-4 mr-2" />
                      Contact Support
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start" data-testid="button-view-docs">
                      <Download className="h-4 w-4 mr-2" />
                      Download Invoice
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Billing Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-center">
                  {currentPlan.name}
                </CardTitle>
                <CardDescription className="text-center">
                  {currentPlan.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-6">
                  <div className="flex items-baseline justify-center gap-1 mb-2">
                    <span className="text-3xl font-bold text-gray-900">
                      ${currentPlan.price}
                    </span>
                    <span className="text-gray-600">/{currentPlan.period}</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Billed through Shopify • 3-day free trial included
                  </p>
                </div>

                <div className="max-w-md mx-auto">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">What's included:</h4>
                  <div className="space-y-2">
                    {currentPlan.features.slice(0, 6).map((feature, index) => {
                      const Icon = feature.icon;
                      return (
                        <div key={index} className="flex items-center gap-3">
                          <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-gray-600" />
                            <span className="text-sm text-gray-700">{feature.text}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}