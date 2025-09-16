import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface TopProduct {
  productId: string;
  title: string;
  vendor: string;
  totalRevenue: number;
  totalQuantity: number;
}

export default function TopProducts() {
  const { data: products, isLoading } = useQuery<TopProduct[]>({
    queryKey: ["/api/stores/current/products/top"],
  });

  // Mock data for demonstration
  const mockProducts: TopProduct[] = [
    {
      productId: "1",
      title: "Nike Air Max 270",
      vendor: "Nike",
      totalRevenue: 12450,
      totalQuantity: 245,
    },
    {
      productId: "2",
      title: "Adidas Ultraboost 22",
      vendor: "Adidas",
      totalRevenue: 9850,
      totalQuantity: 164,
    },
    {
      productId: "3",
      title: "Puma RS-X3 Puzzle",
      vendor: "Puma",
      totalRevenue: 7290,
      totalQuantity: 135,
    },
  ];

  const productImages = [
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?ixlib=rb-4.0.3&w=48&h=48&fit=crop",
    "https://images.unsplash.com/photo-1549298916-b41d501d3772?ixlib=rb-4.0.3&w=48&h=48&fit=crop",
    "https://images.unsplash.com/photo-1560769629-975ec94e6a86?ixlib=rb-4.0.3&w=48&h=48&fit=crop",
  ];

  if (isLoading) {
    return (
      <Card className="shadow-sm border border-gray-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-5 w-16" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="w-12 h-12 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border border-gray-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">
            Top Products by Vendor
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm"
            className="text-brand-600 hover:text-brand-700 font-medium"
            data-testid="button-view-all-products"
          >
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockProducts.map((product, index) => (
            <div 
              key={product.productId} 
              className="flex items-center space-x-4"
              data-testid={`product-${product.productId}`}
            >
              <img 
                src={productImages[index]} 
                alt={product.title}
                className="w-12 h-12 rounded-lg object-cover"
                data-testid={`img-product-${product.productId}`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate" data-testid={`text-product-title-${product.productId}`}>
                  {product.title}
                </p>
                <p className="text-sm text-gray-500" data-testid={`text-product-vendor-${product.productId}`}>
                  {product.vendor}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900" data-testid={`text-product-revenue-${product.productId}`}>
                  ${product.totalRevenue.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500" data-testid={`text-product-units-${product.productId}`}>
                  {product.totalQuantity} units
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
