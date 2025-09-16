import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, BarChart3, TrendingUp, Users, ShoppingBag, ArrowRight, Store, Zap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function Welcome() {
  const { user } = useAuth();

  const handleContinueToSetup = () => {
    window.location.href = "/setup";
  };

  const features = [
    {
      icon: TrendingUp,
      title: "AOV by Vendor",
      description: "Track average order values for each brand to optimize pricing strategies.",
      color: "bg-blue-100 text-blue-600"
    },
    {
      icon: Users,
      title: "Visitor Analytics", 
      description: "Understand which vendors drive the most traffic and engagement.",
      color: "bg-green-100 text-green-600"
    },
    {
      icon: ShoppingBag,
      title: "Conversion Rates",
      description: "Compare conversion performance across different brands and products.",
      color: "bg-purple-100 text-purple-600"
    },
    {
      icon: BarChart3,
      title: "Landing Pages",
      description: "Identify top-performing landing pages by vendor and collection.",
      color: "bg-shopify-100 text-shopify-600"
    }
  ];

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
              <Badge variant="secondary" className="bg-green-100 text-green-700" data-testid="badge-connection-status">
                <CheckCircle className="w-3 h-3 mr-1" />
                Connected
              </Badge>
              {user && (user as any).firstName && (
                <div className="flex items-center space-x-2">
                  <img 
                    src={(user as any).profileImageUrl || `https://ui-avatars.com/api/?name=${(user as any).firstName}+${(user as any).lastName}&background=shopify-600&color=fff`}
                    alt={`${(user as any).firstName} ${(user as any).lastName}`}
                    className="w-8 h-8 rounded-full"
                    data-testid="img-user-avatar"
                  />
                  <span className="text-sm font-medium text-gray-700" data-testid="text-user-name">
                    {(user as any).firstName} {(user as any).lastName}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Hero */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4" data-testid="heading-welcome">
            Welcome to Vendorlytics!
          </h1>
          <p className="text-xl text-gray-600 mb-6" data-testid="text-welcome-description">
            You've successfully connected your account. Now let's set up your store analytics 
            to unlock deep vendor insights that Shopify's native analytics don't provide.
          </p>
          <Badge variant="outline" className="mb-8" data-testid="badge-setup-status">
            <Zap className="w-4 h-4 mr-2" />
            Quick Setup - Takes 2 minutes
          </Badge>
        </div>

        {/* What You'll Get Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-center text-2xl" data-testid="heading-features">
              What You'll Get
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {features.map((feature, index) => {
                const IconComponent = feature.icon;
                return (
                  <div key={index} className="flex items-start space-x-4" data-testid={`feature-${index}`}>
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${feature.color}`}>
                      <IconComponent size={24} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2" data-testid={`feature-title-${index}`}>
                        {feature.title}
                      </h3>
                      <p className="text-gray-600 text-sm" data-testid={`feature-description-${index}`}>
                        {feature.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card className="mb-8 border-shopify-200 bg-shopify-50">
          <CardHeader>
            <CardTitle className="text-center flex items-center justify-center space-x-2" data-testid="heading-next-steps">
              <Store className="w-5 h-5" />
              <span>Next: Connect Your Shopify Store</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-700 mb-6" data-testid="text-setup-explanation">
              We'll guide you through connecting your Shopify store and explain how each analytics 
              feature works. Your data will be synchronized automatically, and you'll start seeing 
              insights within minutes.
            </p>
            
            <div className="flex items-center justify-center space-x-6 mb-6">
              <div className="text-center">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm">
                  <span className="text-shopify-600 font-bold">1</span>
                </div>
                <span className="text-sm text-gray-600">Connect Store</span>
              </div>
              <ArrowRight className="text-gray-400" size={20} />
              <div className="text-center">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm">
                  <span className="text-shopify-600 font-bold">2</span>
                </div>
                <span className="text-sm text-gray-600">Sync Data</span>
              </div>
              <ArrowRight className="text-gray-400" size={20} />
              <div className="text-center">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm">
                  <span className="text-shopify-600 font-bold">3</span>
                </div>
                <span className="text-sm text-gray-600">View Insights</span>
              </div>
            </div>

            <Button 
              onClick={handleContinueToSetup}
              size="lg"
              className="bg-shopify-600 hover:bg-shopify-700 px-8 py-3 text-lg"
              data-testid="button-continue-setup"
            >
              Continue to Setup
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </CardContent>
        </Card>

        {/* Support Note */}
        <div className="text-center text-sm text-gray-500" data-testid="text-support-note">
          Need help? Our setup wizard will guide you through each step. 
          You can always return to these analytics later from your dashboard.
        </div>
      </div>
    </div>
  );
}