import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

// Chart skeleton with multiple chart types
export function ChartSkeleton({ height = "h-64" }: { height?: string }) {
  return (
    <Card className="shadow-sm border border-gray-200">
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48" />
          <div className="flex space-x-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Chart area with loading pattern */}
        <div className={`${height} bg-gray-50 rounded-lg flex flex-col justify-between p-6 border-2 border-dashed border-gray-200`}>
          {/* Y-axis labels */}
          <div className="flex flex-col justify-between h-full w-8">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-3 w-6" />
            ))}
          </div>
          
          {/* Chart bars/lines area */}
          <div className="flex items-end justify-between h-32 px-4 space-x-2 mt-4">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="flex flex-col items-center space-y-2 flex-1">
                <div 
                  className="bg-gray-300 rounded-t w-full animate-pulse"
                  style={{ height: `${Math.random() * 80 + 20}px` }}
                />
                <Skeleton className="h-3 w-8" />
              </div>
            ))}
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex justify-center items-center space-x-4 mt-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center space-x-2">
              <Skeleton className="w-3 h-3 rounded-full" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Table skeleton for large data tables
export function TableSkeleton({ 
  rows = 5, 
  columns = 6, 
  hasHeader = true, 
  hasActions = true,
  showSearch = true,
  showFilters = true
}: { 
  rows?: number; 
  columns?: number; 
  hasHeader?: boolean; 
  hasActions?: boolean;
  showSearch?: boolean;
  showFilters?: boolean;
}) {
  return (
    <Card className="shadow-sm border border-gray-200">
      <CardContent className="p-0">
        {/* Search and Filter Bar */}
        {(showSearch || showFilters) && (
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
              {showSearch && (
                <div className="relative flex-1 max-w-sm">
                  <Skeleton className="h-10 w-full rounded-md" />
                </div>
              )}
              {showFilters && (
                <div className="flex items-center space-x-3">
                  <Skeleton className="h-10 w-24" />
                  <Skeleton className="h-10 w-32" />
                  {hasActions && <Skeleton className="h-10 w-20" />}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Table Header */}
        {hasHeader && (
          <div className="bg-gray-50 border-b border-gray-200 px-6">
            <div className="flex items-center py-3">
              {Array.from({ length: columns }).map((_, i) => (
                <div 
                  key={i} 
                  className={`${i === 0 ? 'flex-1' : 'w-1/6'} pr-3`}
                >
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Table Rows */}
        <div className="divide-y divide-gray-200 bg-white">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={rowIndex} className="flex items-center hover:bg-gray-50 px-6 py-4">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <div 
                  key={colIndex} 
                  className={`${colIndex === 0 ? 'flex-1' : 'w-1/6'} pr-3`}
                >
                  {colIndex === 0 ? (
                    // First column with avatar and name
                    <div className="flex items-center">
                      <Skeleton className="w-10 h-10 rounded-lg mr-3" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-24 mb-1" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                  ) : (
                    // Other columns with data
                    <Skeleton className="h-4 w-16" />
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
        
        {/* Pagination Skeleton */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
            <div className="flex items-center space-x-2">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
            </div>
            <div className="flex items-center space-x-2">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Card list skeleton for products, vendors etc
export function CardListSkeleton({ 
  count = 6, 
  columns = 3, 
  hasImages = true,
  hasActions = true
}: { 
  count?: number; 
  columns?: number;
  hasImages?: boolean;
  hasActions?: boolean;
}) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
  }[columns] || 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';

  return (
    <div className={`grid ${gridCols} gap-6`}>
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="shadow-sm border border-gray-200">
          <CardContent className="p-6">
            {hasImages && (
              <Skeleton className="h-48 w-full rounded-lg mb-4" />
            )}
            
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                {!hasImages && <Skeleton className="w-10 h-10 rounded-full" />}
                <div className="flex-1">
                  <Skeleton className="h-5 w-32 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Skeleton className="h-3 w-12 mb-1" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <div>
                  <Skeleton className="h-3 w-10 mb-1" />
                  <Skeleton className="h-4 w-14" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Skeleton className="h-3 w-16 mb-1" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <div>
                  <Skeleton className="h-3 w-14 mb-1" />
                  <Skeleton className="h-4 w-18" />
                </div>
              </div>
            </div>
            
            {hasActions && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-8 rounded" />
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Metrics card skeleton
export function MetricsCardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="shadow-sm border border-gray-200">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="w-8 h-8 rounded-lg" />
            </div>
            
            <Skeleton className="h-8 w-20 mb-2" />
            
            <div className="flex items-center">
              <Skeleton className="h-4 w-12 mr-2" />
              <Skeleton className="h-3 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Export progress skeleton
export function ExportSkeleton() {
  return (
    <Card className="shadow-sm border border-gray-200">
      <CardContent className="p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <Skeleton className="h-5 w-32 mx-auto mb-2" />
          <Skeleton className="h-3 w-48 mx-auto mb-4" />
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '45%' }}></div>
          </div>
          <Skeleton className="h-3 w-16 mx-auto mt-2" />
        </div>
      </CardContent>
    </Card>
  );
}

// Virtualized table skeleton for react-window
export function VirtualizedTableSkeleton({ 
  height = 400,
  itemHeight = 73
}: { 
  height?: number;
  itemHeight?: number; 
}) {
  const visibleItems = Math.ceil(height / itemHeight);
  
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Table Header */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="flex items-center px-6 py-3">
          <div className="w-1/4 pr-6">
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="w-1/6 px-3">
            <Skeleton className="h-4 w-12" />
          </div>
          <div className="w-1/6 px-3">
            <Skeleton className="h-4 w-8" />
          </div>
          <div className="w-1/6 px-3">
            <Skeleton className="h-4 w-14" />
          </div>
          <div className="w-1/6 px-3">
            <Skeleton className="h-4 w-10" />
          </div>
          <div className="w-1/6 px-3">
            <Skeleton className="h-4 w-12" />
          </div>
        </div>
      </div>

      {/* Virtualized rows */}
      <div className="bg-white" style={{ height: `${height}px` }}>
        {Array.from({ length: visibleItems }).map((_, index) => (
          <div 
            key={index} 
            className="flex items-center border-b border-gray-200 px-6"
            style={{ height: `${itemHeight}px` }}
          >
            <div className="w-1/4 py-4 pr-6">
              <div className="flex items-center">
                <Skeleton className="w-8 h-8 rounded-lg mr-3" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            </div>
            <div className="w-1/6 py-4 px-3">
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="w-1/6 py-4 px-3">
              <Skeleton className="h-4 w-12" />
            </div>
            <div className="w-1/6 py-4 px-3">
              <Skeleton className="h-4 w-12" />
            </div>
            <div className="w-1/6 py-4 px-3">
              <Skeleton className="h-4 w-14" />
            </div>
            <div className="w-1/6 py-4 px-3">
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}