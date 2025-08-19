import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Filter } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface VendorMetrics {
  id: string;
  name: string;
  productCount: number;
  revenue: number;
  aov: number;
  conversion: number;
  visitors: number;
  growth: number;
}

export default function VendorComparisonTable() {
  const { data: vendors, isLoading } = useQuery<VendorMetrics[]>({
    queryKey: ["/api/stores/current/vendors"],
  });

  if (isLoading) {
    return (
      <Card className="shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-6 w-48" />
          <div className="flex space-x-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center space-x-4 py-3">
              <Skeleton className="w-8 h-8 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  // Mock data for demonstration since we don't have real data yet
  const mockVendors: VendorMetrics[] = [
    {
      id: "nike",
      name: "Nike",
      productCount: 89,
      revenue: 45230,
      aov: 135.50,
      conversion: 4.2,
      visitors: 12450,
      growth: 22.5,
    },
    {
      id: "adidas",
      name: "Adidas",
      productCount: 67,
      revenue: 32180,
      aov: 118.90,
      conversion: 3.8,
      visitors: 9230,
      growth: 15.2,
    },
    {
      id: "puma",
      name: "Puma",
      productCount: 42,
      revenue: 21050,
      aov: 95.40,
      conversion: 3.1,
      visitors: 6890,
      growth: -3.1,
    },
    {
      id: "under-armour",
      name: "Under Armour",
      productCount: 28,
      revenue: 9960,
      aov: 89.20,
      conversion: 2.7,
      visitors: 4120,
      growth: 8.9,
    },
  ];

  const vendorColors: Record<string, string> = {
    Nike: "from-red-500 to-red-600",
    Adidas: "from-blue-500 to-blue-600",
    Puma: "from-yellow-500 to-orange-600",
    "Under Armour": "from-gray-600 to-gray-700",
  };

  return (
    <Card className="shadow-sm border border-gray-200 p-6 mb-8">
      <CardHeader className="px-0 pb-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">
            Vendor Performance Comparison
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              className="text-gray-700 hover:bg-gray-50"
              data-testid="button-export-vendors"
            >
              <Download size={16} className="mr-1" />
              Export
            </Button>
            <Button 
              size="sm"
              className="bg-shopify-600 hover:bg-shopify-700"
              data-testid="button-filter-vendors"
            >
              <Filter size={16} className="mr-1" />
              Filter
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="px-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  AOV
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Conversion
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Visitors
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Growth
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {mockVendors.map((vendor) => (
                <tr key={vendor.id} className="hover:bg-gray-50" data-testid={`row-vendor-${vendor.id}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`w-8 h-8 bg-gradient-to-br ${vendorColors[vendor.name]} rounded-lg flex items-center justify-center text-white font-bold text-sm`}>
                        {vendor.name[0]}
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900" data-testid={`text-vendor-name-${vendor.id}`}>
                          {vendor.name}
                        </div>
                        <div className="text-sm text-gray-500" data-testid={`text-product-count-${vendor.id}`}>
                          {vendor.productCount} products
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-testid={`text-revenue-${vendor.id}`}>
                    ${vendor.revenue.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-testid={`text-aov-${vendor.id}`}>
                    ${vendor.aov.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-testid={`text-conversion-${vendor.id}`}>
                    {vendor.conversion.toFixed(1)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-testid={`text-visitors-${vendor.id}`}>
                    {vendor.visitors.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge 
                      variant={vendor.growth >= 0 ? "default" : "destructive"}
                      className={vendor.growth >= 0 ? "bg-green-100 text-green-800 hover:bg-green-200" : ""}
                      data-testid={`badge-growth-${vendor.id}`}
                    >
                      {vendor.growth >= 0 ? "+" : ""}{vendor.growth.toFixed(1)}%
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
