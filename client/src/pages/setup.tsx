import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertStoreSchema } from "@shared/schema";
import { z } from "zod";
import { 
  BarChart3, 
  Store, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle, 
  TrendingUp, 
  Users, 
  ShoppingBag, 
  Zap,
  Database,
  BarChart,
  AlertCircle,
  ExternalLink
} from "lucide-react";

// Extended form schema with validation
const setupFormSchema = insertStoreSchema.extend({
  name: z.string().min(1, "Store name is required"),
  domain: z.string().min(1, "Store domain is required").refine((domain) => {
    // Remove protocol and trailing slashes, then validate
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    return cleanDomain.includes('.myshopify.com') || cleanDomain.includes('.');
  }, "Please enter a valid store domain (e.g., yourstore.myshopify.com)"),
  accessToken: z.string().min(1, "Access token is required")
});

type SetupFormData = z.infer<typeof setupFormSchema>;

export default function Setup() {
  const [currentStep, setCurrentStep] = useState(1);
  const { toast } = useToast();
  const totalSteps = 4;

  const form = useForm<SetupFormData>({
    resolver: zodResolver(setupFormSchema),
    defaultValues: {
      name: "",
      domain: "",
      accessToken: ""
    }
  });

  // Store creation mutation
  const createStoreMutation = useMutation({
    mutationFn: (data: SetupFormData) => apiRequest('POST', '/api/stores', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stores'] });
      toast({
        title: "Store connected successfully!",
        description: "We're now syncing your data. This will take a few minutes.",
      });
      // Move to loading state
      window.location.href = "/sync";
    },
    onError: (error: any) => {
      toast({
        title: "Connection failed",
        description: error.response?.data?.message || "Failed to connect store. Please check your credentials.",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: SetupFormData) => {
    createStoreMutation.mutate(data);
  };

  const handleNextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleBackToWelcome = () => {
    window.location.href = "/welcome";
  };

  const stepProgress = (currentStep / totalSteps) * 100;

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
              <Badge variant="outline" data-testid="badge-setup-progress">
                Setup: Step {currentStep} of {totalSteps}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700" data-testid="text-progress">
              Setup Progress
            </span>
            <span className="text-sm text-gray-500" data-testid="text-step-counter">
              {currentStep} of {totalSteps}
            </span>
          </div>
          <Progress value={stepProgress} className="w-full" data-testid="progress-setup" />
        </div>

        {/* Step 1: Store Connection */}
        {currentStep === 1 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2" data-testid="heading-connect-store">
                <Store className="w-6 h-6" />
                <span>Connect Your Shopify Store</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel data-testid="label-store-name">Store Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="My Awesome Store" 
                            {...field} 
                            data-testid="input-store-name"
                          />
                        </FormControl>
                        <FormDescription>
                          This is how your store will appear in the dashboard.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="domain"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel data-testid="label-store-domain">Store Domain</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="yourstore.myshopify.com" 
                            {...field} 
                            data-testid="input-store-domain"
                          />
                        </FormControl>
                        <FormDescription>
                          Your Shopify store's domain (e.g., yourstore.myshopify.com).
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="accessToken"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel data-testid="label-access-token">Access Token</FormLabel>
                        <FormControl>
                          <Input 
                            type="password"
                            placeholder="Enter your Shopify access token" 
                            {...field} 
                            data-testid="input-access-token"
                          />
                        </FormControl>
                        <FormDescription className="flex items-center space-x-1">
                          <span>Need help getting your access token?</span>
                          <a 
                            href="https://help.shopify.com/en/manual/apps/private-apps" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-shopify-600 hover:text-shopify-700 inline-flex items-center"
                            data-testid="link-token-help"
                          >
                            View guide
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </a>
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-900 mb-1" data-testid="heading-security-note">
                          Your data is secure
                        </h4>
                        <p className="text-blue-700 text-sm" data-testid="text-security-description">
                          We use industry-standard encryption to protect your store credentials. 
                          Your access token is only used to fetch analytics data and is never shared.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleBackToWelcome}
                      data-testid="button-back-welcome"
                    >
                      <ChevronLeft className="w-4 h-4 mr-2" />
                      Back to Welcome
                    </Button>
                    <Button 
                      type="button" 
                      onClick={handleNextStep}
                      className="bg-shopify-600 hover:bg-shopify-700"
                      data-testid="button-next-step"
                    >
                      Next: Learn About Features
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Feature Overview */}
        {currentStep === 2 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2" data-testid="heading-feature-overview">
                <BarChart className="w-6 h-6" />
                <span>Your Analytics Dashboard</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-gray-600" data-testid="text-feature-intro">
                Once your store is connected, you'll have access to these powerful analytics features:
              </p>

              <div className="grid gap-4">
                <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg" data-testid="feature-vendor-metrics">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Vendor Performance Metrics</h3>
                    <p className="text-gray-600 text-sm">
                      Track AOV, conversion rates, and revenue for each brand. Compare performance 
                      across different vendors to identify your top performers.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg" data-testid="feature-visitor-analytics">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Visitor Analytics</h3>
                    <p className="text-gray-600 text-sm">
                      Understand which vendors drive the most traffic to your store and 
                      how visitors interact with different brand pages.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg" data-testid="feature-product-insights">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Product & Landing Page Insights</h3>
                    <p className="text-gray-600 text-sm">
                      Identify top-performing products by vendor and discover which landing 
                      pages convert best for each brand.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <Button 
                  variant="outline" 
                  onClick={handlePrevStep}
                  data-testid="button-prev-step"
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>
                <Button 
                  onClick={handleNextStep}
                  className="bg-shopify-600 hover:bg-shopify-700"
                  data-testid="button-next-sync"
                >
                  Next: Data Sync Process
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Sync Process Explanation */}
        {currentStep === 3 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2" data-testid="heading-sync-process">
                <Database className="w-6 h-6" />
                <span>Data Synchronization</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-gray-600" data-testid="text-sync-intro">
                Here's what happens when you connect your store:
              </p>

              <div className="space-y-4">
                <div className="flex items-start space-x-4" data-testid="sync-step-1">
                  <div className="w-8 h-8 bg-shopify-100 rounded-full flex items-center justify-center">
                    <span className="text-shopify-600 font-bold text-sm">1</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Import Products & Orders</h3>
                    <p className="text-gray-600 text-sm">
                      We'll securely fetch your product catalog and order history to build your vendor database.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4" data-testid="sync-step-2">
                  <div className="w-8 h-8 bg-shopify-100 rounded-full flex items-center justify-center">
                    <span className="text-shopify-600 font-bold text-sm">2</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Organize by Vendor</h3>
                    <p className="text-gray-600 text-sm">
                      Products are automatically grouped by vendor/brand to create meaningful analytics segments.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4" data-testid="sync-step-3">
                  <div className="w-8 h-8 bg-shopify-100 rounded-full flex items-center justify-center">
                    <span className="text-shopify-600 font-bold text-sm">3</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Generate Analytics</h3>
                    <p className="text-gray-600 text-sm">
                      Performance metrics are calculated for each vendor, including AOV, conversion rates, and more.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Zap className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-900 mb-1" data-testid="heading-sync-time">
                      Sync Time
                    </h4>
                    <p className="text-yellow-700 text-sm" data-testid="text-sync-duration">
                      Initial sync typically takes 2-5 minutes depending on your store size. 
                      You'll see real-time progress updates during the process.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <Button 
                  variant="outline" 
                  onClick={handlePrevStep}
                  data-testid="button-prev-features"
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>
                <Button 
                  onClick={handleNextStep}
                  className="bg-shopify-600 hover:bg-shopify-700"
                  data-testid="button-next-final"
                >
                  Next: Ready to Connect
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Final Step & Connect */}
        {currentStep === 4 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2" data-testid="heading-ready-connect">
                <CheckCircle className="w-6 h-6" />
                <span>Ready to Connect</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2" data-testid="heading-all-set">
                  You're All Set!
                </h3>
                <p className="text-gray-600 mb-6" data-testid="text-final-description">
                  Click the button below to connect your store and start the data sync process. 
                  You'll be redirected to a progress screen where you can watch the sync in real-time.
                </p>
              </div>

              <div className="bg-shopify-50 border border-shopify-200 rounded-lg p-6">
                <h4 className="font-semibold text-shopify-900 mb-3" data-testid="heading-what-happens">
                  What happens next:
                </h4>
                <ul className="space-y-2 text-sm text-shopify-700">
                  <li className="flex items-center space-x-2" data-testid="list-item-1">
                    <CheckCircle className="w-4 h-4" />
                    <span>Store connection is established securely</span>
                  </li>
                  <li className="flex items-center space-x-2" data-testid="list-item-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>Product and order data is synchronized</span>
                  </li>
                  <li className="flex items-center space-x-2" data-testid="list-item-3">
                    <CheckCircle className="w-4 h-4" />
                    <span>Vendor analytics are generated</span>
                  </li>
                  <li className="flex items-center space-x-2" data-testid="list-item-4">
                    <CheckCircle className="w-4 h-4" />
                    <span>You're redirected to your analytics dashboard</span>
                  </li>
                </ul>
              </div>

              <div className="flex justify-between">
                <Button 
                  variant="outline" 
                  onClick={handlePrevStep}
                  data-testid="button-prev-sync"
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>
                <Button 
                  onClick={form.handleSubmit(onSubmit)}
                  disabled={createStoreMutation.isPending}
                  className="bg-shopify-600 hover:bg-shopify-700"
                  data-testid="button-connect-store"
                >
                  {createStoreMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Connecting...
                    </>
                  ) : (
                    <>
                      Connect My Store
                      <CheckCircle className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}