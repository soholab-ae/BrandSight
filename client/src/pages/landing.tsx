import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Users, ShoppingBag } from "lucide-react";
import logoUrl from "@/assets/logo.png";

export default function Landing() {
  const handleLogin = () => {
    // Check if we have a shop parameter in the URL (from Shopify admin)
    const urlParams = new URLSearchParams(window.location.search);
    const shop = urlParams.get('shop');
    
    if (shop) {
      // If we have a shop parameter, pass it to the login route
      window.location.href = `/api/login?shop=${shop}`;
    } else {
      window.location.href = "/api/login";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <img src={logoUrl} alt="BrandSight" className="h-10 w-auto" />
            </div>
            <Button 
              onClick={handleLogin}
              className="bg-brand-600 hover:bg-brand-700"
              data-testid="button-login"
            >
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Deep Brand Analytics for Your Shopify Store
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Get detailed insights by brand and vendor that Shopify's native analytics don't provide. 
            Track AOV, conversion rates, visitor metrics, and more for each brand in your store.
          </p>
          <Button 
            onClick={handleLogin}
            size="lg"
            className="bg-brand-600 hover:bg-brand-700 px-8 py-3 text-lg"
            data-testid="button-hero-login"
          >
            Connect Your Store
          </Button>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="text-blue-600" size={24} />
              </div>
              <CardTitle className="text-lg">AOV by Brand</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-sm">
                Track average order values for each brand to optimize pricing strategies.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="text-green-600" size={24} />
              </div>
              <CardTitle className="text-lg">Visitor Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-sm">
                Understand which vendors drive the most traffic and engagement.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="text-purple-600" size={24} />
              </div>
              <CardTitle className="text-lg">Conversion Rates</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-sm">
                Compare conversion performance across different brands and products.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="text-brand-600" size={24} />
              </div>
              <CardTitle className="text-lg">Landing Pages</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-sm">
                Identify top-performing landing pages by vendor and collection.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-brand-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-3xl font-bold mb-4">
            Ready to unlock brand-specific insights?
          </h3>
          <p className="text-xl mb-8 text-brand-100">
            Connect your Shopify store in minutes and start analyzing your brand performance.
          </p>
          <Button 
            onClick={handleLogin}
            size="lg"
            variant="secondary"
            className="bg-white text-brand-600 hover:bg-gray-100 px-8 py-3 text-lg"
            data-testid="button-cta-login"
          >
            Get Started Now
          </Button>
        </div>
      </div>
    </div>
  );
}
