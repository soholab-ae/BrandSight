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

// Type definitions for billing status
interface BillingSubscription {
  id: string;
  name: string;
  status: string;
  test: boolean;
  trialDays: number;
  currentPeriodEnd: string;
  createdAt: string;
}

interface BillingStatus {
  hasActiveSubscription: boolean;
  subscription: BillingSubscription | null;
  isInTrial: boolean;
}

export default function Billing() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  
  // Check if we're in Shopify mode
  const isShopifyMode = import.meta.env.VITE_USE_SHOPIFY_AUTH === 'true';
  
  // Fetch billing status
  const { data: billingStatus, isLoading, error } = useQuery<BillingStatus>({
    queryKey: ['/api/billing/status'],
    enabled: isShopifyMode && isAuthenticated,
    retry: 1,
  });
  
  // Selected plan state
  const [selectedPlan, setSelectedPlan] = useState('Starter');
  
  // Create subscription mutation
  const subscribeMutation = useMutation({
    mutationFn: async (planName: string) => {
      setIsProcessing(true);
      const response = await fetch('/api/billing/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planName }),
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

  // Plan configurations
  const plans = [
    {
      name: 'Starter',
      price: 49,
      description: 'Perfect for small stores getting started',
      popular: false,
      features: [
        'Up to 10 brands/vendors',
        '90-day data history',
        'Core analytics dashboard',
        'Email support',
        'CSV export'
      ]
    },
    {
      name: 'Growth',
      price: 99,
      description: 'Ideal for growing businesses',
      popular: true,
      features: [
        'Up to 50 brands/vendors',
        '1-year data history',
        'Advanced analytics',
        'Priority support',
        'Custom reports'
      ]
    },
    {
      name: 'Scale',
      price: 199,
      description: 'Built for enterprise and high-volume stores',
      popular: false,
      features: [
        'Unlimited brands/vendors',
        '5-year data history',
        'White-label reports',
        'Priority support',
        'Custom reports'
      ]
    }
  ];

  // Get current plan from billing status
  const getCurrentPlan = () => {
    if (!isShopifyMode) return null;
    if (!billingStatus?.subscription?.name) return null;
    return billingStatus.subscription.name;
  };

  const currentPlan = getCurrentPlan();

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
                    ) : billingStatus?.hasActiveSubscription ? (
                      /* Active Subscription */
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{currentPlan}</h3>
                            <p className="text-sm text-gray-600">
                              ${plans.find(p => p.name === currentPlan)?.price || 0}.00 per month • Billed through Shopify
                            </p>
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
                              {billingStatus?.subscription?.currentPeriodEnd 
                                ? new Date(billingStatus.subscription.currentPeriodEnd).toLocaleDateString('en-US', {
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
                              {billingStatus?.isInTrial ? 'Free Trial Active' : 'Subscription Active'}
                            </p>
                          </div>
                        </div>

                        {billingStatus?.isInTrial && (
                          <Alert>
                            <Clock className="h-4 w-4" />
                            <AlertDescription>
                              Your free trial ends on{' '}
                              {billingStatus.subscription?.currentPeriodEnd ? new Date(billingStatus.subscription.currentPeriodEnd).toLocaleDateString() : 'N/A'}.
                              You'll be automatically charged ${plans.find(p => p.name === currentPlan)?.price || 0}.00 through Shopify unless you cancel before then.
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
                                  Are you sure you want to cancel your {currentPlan} subscription? 
                                  You'll continue to have access until the end of your current billing period.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => billingStatus?.subscription?.id && handleCancelSubscription(billingStatus.subscription.id)}
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
                            Choose a plan below to start your 3-day free trial and unlock advanced vendor analytics
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

              </div>

            </div>

            {/* Pricing Plans */}
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Plan</h2>
                <p className="text-gray-600">
                  All plans include a 3-day free trial, automatic updates, and secure data encryption
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map((plan) => (
                  <Card key={plan.name} className={`relative ${
                    plan.popular ? 'ring-2 ring-brand-500 shadow-lg' : ''
                  } ${currentPlan === plan.name ? 'ring-2 ring-green-500' : ''}`}>
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <Badge className="bg-brand-600 text-white px-3 py-1">
                          Most Popular
                        </Badge>
                      </div>
                    )}
                    {currentPlan === plan.name && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <Badge className="bg-green-600 text-white px-3 py-1">
                          Current Plan
                        </Badge>
                      </div>
                    )}
                    
                    <CardHeader className="text-center pb-4">
                      <CardTitle className="text-xl">{plan.name}</CardTitle>
                      <CardDescription className="text-sm">{plan.description}</CardDescription>
                      <div className="py-4">
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
                          <span className="text-gray-600">/month</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">Billed through Shopify</p>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        {plan.features.map((feature, index) => (
                          <div key={index} className="flex items-start gap-3">
                            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-gray-700">{feature}</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="pt-4">
                        {currentPlan === plan.name ? (
                          <Button disabled className="w-full bg-green-100 text-green-800 hover:bg-green-100">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Current Plan
                          </Button>
                        ) : isShopifyMode && !currentPlan ? (
                          <Button
                            onClick={() => subscribeMutation.mutate(plan.name)}
                            disabled={subscribeMutation.isPending || isProcessing}
                            className={`w-full ${
                              plan.popular 
                                ? 'bg-brand-600 hover:bg-brand-700' 
                                : 'bg-gray-800 hover:bg-gray-900'
                            }`}
                            data-testid={`button-subscribe-${plan.name.toLowerCase()}`}
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
                        ) : !isShopifyMode ? (
                          <Button disabled className="w-full bg-purple-100 text-purple-800 hover:bg-purple-100">
                            Demo Mode
                          </Button>
                        ) : (
                          <Button
                            onClick={() => subscribeMutation.mutate(plan.name)}
                            disabled={subscribeMutation.isPending || isProcessing}
                            variant="outline"
                            className="w-full"
                            data-testid={`button-upgrade-${plan.name.toLowerCase()}`}
                          >
                            Upgrade to {plan.name}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {/* Additional Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      All Plans Include
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">3-day free trial</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Automatic updates</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Secure data encryption</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Cancel anytime</span>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Need Help?</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button variant="outline" size="sm" className="w-full justify-start" data-testid="button-contact-support">
                      <Shield className="h-4 w-4 mr-2" />
                      Contact Support
                    </Button>
                    <p className="text-sm text-gray-600">
                      Questions about plans or need a custom solution? Our team is here to help.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}