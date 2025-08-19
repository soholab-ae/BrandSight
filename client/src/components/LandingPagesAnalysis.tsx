import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface LandingPage {
  id: string;
  path: string;
  pageType: string;
  visitors: number;
  vendor?: string;
}

export default function LandingPagesAnalysis() {
  const { data: pages, isLoading } = useQuery<LandingPage[]>({
    queryKey: ["/api/stores/current/pages/top"],
  });

  // Mock data for demonstration
  const mockPages: LandingPage[] = [
    {
      id: "1",
      path: "/collections/nike-running-shoes",
      pageType: "Nike Collection",
      visitors: 2450,
      vendor: "Nike",
    },
    {
      id: "2",
      path: "/products/adidas-ultraboost-22",
      pageType: "Adidas Product",
      visitors: 1890,
      vendor: "Adidas",
    },
    {
      id: "3",
      path: "/collections/puma-lifestyle",
      pageType: "Puma Collection",
      visitors: 1230,
      vendor: "Puma",
    },
  ];

  const customerSegments = [
    { name: "New Customers", percentage: 64, color: "bg-blue-500" },
    { name: "Returning Customers", percentage: 36, color: "bg-green-500" },
    { name: "VIP Customers", percentage: 12, color: "bg-yellow-500" },
  ];

  const customerValues = [
    { type: "New", value: 89.50 },
    { type: "Returning", value: 156.20 },
    { type: "VIP", value: 312.80 },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <Card key={i} className="shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-5 w-16" />
            </div>
            <div className="space-y-4">
              {[1, 2, 3].map((j) => (
                <Skeleton key={j} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Top Landing Pages */}
      <Card className="shadow-sm border border-gray-200 p-6">
        <CardHeader className="px-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-gray-900">
              Top Landing Pages
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm"
              className="text-shopify-600 hover:text-shopify-700 font-medium"
              data-testid="button-view-all-pages"
            >
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <div className="space-y-4">
            {mockPages.map((page) => (
              <div 
                key={page.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                data-testid={`landing-page-${page.id}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate" data-testid={`text-page-url-${page.id}`}>
                    {page.path}
                  </p>
                  <p className="text-sm text-gray-500" data-testid={`text-page-type-${page.id}`}>
                    {page.pageType}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900" data-testid={`text-page-visitors-${page.id}`}>
                    {page.visitors.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">visitors</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Customer Segments */}
      <Card className="shadow-sm border border-gray-200 p-6">
        <CardHeader className="px-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-gray-900">
              Customer Segments
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600">
              <MoreHorizontal size={18} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <div className="space-y-4">
            {customerSegments.map((segment) => (
              <div key={segment.name} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 ${segment.color} rounded-full`}></div>
                  <span className="text-sm font-medium text-gray-900" data-testid={`text-segment-${segment.name.toLowerCase().replace(/\s+/g, '-')}`}>
                    {segment.name}
                  </span>
                </div>
                <span className="text-sm text-gray-600" data-testid={`text-percentage-${segment.name.toLowerCase().replace(/\s+/g, '-')}`}>
                  {segment.percentage}%
                </span>
              </div>
            ))}
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Average Customer Value</h4>
            <div className="space-y-2">
              {customerValues.map((customer) => (
                <div key={customer.type} className="flex justify-between text-sm">
                  <span className="text-gray-600" data-testid={`text-customer-type-${customer.type.toLowerCase()}`}>
                    {customer.type}
                  </span>
                  <span className="font-medium text-gray-900" data-testid={`text-customer-value-${customer.type.toLowerCase()}`}>
                    ${customer.value.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
