import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { CheckCircle, Sparkles, Clock, CreditCard, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function BillingStatus() {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Check if we're in Shopify mode
  const isShopifyMode = import.meta.env.VITE_USE_SHOPIFY_AUTH === 'true';
  
  // Fetch billing status
  const { data: billingStatus, isLoading, error } = useQuery({
    queryKey: ['/api/billing/status'],
    enabled: isShopifyMode,
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
      toast({
        title: "Subscription Cancelled",
        description: "Your subscription has been cancelled successfully.",
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
  
  // For non-Shopify mode or demo mode, show demo billing info
  if (!isShopifyMode) {
    return (
      <Card className="mb-6 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                Demo Mode Active
              </CardTitle>
              <CardDescription>
                Explore all premium features with sample data
              </CardDescription>
            </div>
            <Badge className="bg-purple-100 text-purple-800">
              DEMO
            </Badge>
          </div>
        </CardHeader>
      </Card>
    );
  }
  
  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardContent className="py-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    // Don't show error in demo mode or if API doesn't exist
    return null;
  }
  
  // Active subscription
  if (billingStatus?.hasActiveSubscription) {
    const isInTrial = billingStatus.isInTrial;
    const subscription = billingStatus.subscription;
    const endDate = subscription?.currentPeriodEnd 
      ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
      : null;
    
    return (
      <Card className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                BrandSight Premium
              </CardTitle>
              <CardDescription>
                {isInTrial 
                  ? `Free trial ends on ${endDate}`
                  : `Next billing date: ${endDate}`
                }
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {isInTrial && (
                <Badge className="bg-blue-100 text-blue-800">
                  TRIAL
                </Badge>
              )}
              <Badge className="bg-green-100 text-green-800">
                ACTIVE
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-600 mb-4">
            You have access to all premium features:
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Unlimited vendors</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Advanced analytics</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Export reports</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Priority support</span>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-200">
            <Button
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-700"
              onClick={() => subscription?.id && cancelMutation.mutate(subscription.id)}
              disabled={cancelMutation.isPending}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Cancel Subscription
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // No active subscription - show upgrade prompt
  return (
    <Alert className="mb-6 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
      <Sparkles className="h-5 w-5 text-purple-600" />
      <AlertDescription>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-900 mb-1">
              Upgrade to BrandSight Premium
            </p>
            <p className="text-sm text-gray-600 mb-3">
              Get full access to all vendor analytics and advanced features
            </p>
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1">
                <CreditCard className="h-4 w-4 text-gray-500" />
                <strong>$49/month</strong>
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="text-blue-600 font-medium">3-day free trial</span>
              </span>
            </div>
          </div>
          <Button 
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            onClick={() => subscribeMutation.mutate()}
            disabled={isProcessing || subscribeMutation.isPending}
          >
            {isProcessing ? "Processing..." : "Start Free Trial"}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}