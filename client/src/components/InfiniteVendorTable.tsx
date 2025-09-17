import { useState, useCallback, useMemo, useEffect } from "react";
import { List as ReactWindowList, ListProps } from "react-window";
import { InfiniteLoader } from "react-window-infinite-loader";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { PaginationData } from "@/components/DataPagination";

interface VendorMetrics {
  id: string;
  name: string;
  productCount: number;
  revenue: number;
  aov: number;
  conversion: number;
  visitors: number;
  growth: number;
  totalOrders: number;
}

interface VendorResponse {
  data: VendorMetrics[];
  pagination: PaginationData;
}

interface InfiniteVendorTableProps {
  searchTerm: string;
  sortField: keyof VendorMetrics;
  sortDirection: "asc" | "desc";
  onSort: (field: keyof VendorMetrics) => void;
  onVendorClick: (vendor: VendorMetrics) => void;
  height?: number;
}

const VENDOR_ROW_HEIGHT = 73;
const ITEMS_PER_PAGE = 50;

const vendorColors: Record<string, string> = {
  Nike: "from-red-500 to-red-600",
  Adidas: "from-blue-500 to-blue-600",
  Puma: "from-yellow-500 to-orange-600",
  "Under Armour": "from-gray-600 to-gray-700",
};

// Loading row component
const LoadingRow = ({ style }: { style: any }) => (
  <div style={style} className="flex items-center px-6 py-4 border-b border-gray-200">
    <div className="w-1/4 pr-6">
      <div className="flex items-center">
        <Skeleton className="w-8 h-8 rounded-lg" />
        <div className="ml-3 flex-1">
          <Skeleton className="h-4 w-24 mb-1" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </div>
    <div className="w-1/6 px-3">
      <Skeleton className="h-4 w-16" />
    </div>
    <div className="w-1/6 px-3">
      <Skeleton className="h-4 w-12" />
    </div>
    <div className="w-1/6 px-3">
      <Skeleton className="h-4 w-12" />
    </div>
    <div className="w-1/6 px-3">
      <Skeleton className="h-4 w-12" />
    </div>
    <div className="w-1/6 px-3">
      <Skeleton className="h-6 w-16" />
    </div>
  </div>
);

// Vendor row component
const VendorRow = ({ 
  index, 
  style, 
  data 
}: { 
  index: number; 
  style: any; 
  data: { 
    vendors: (VendorMetrics | undefined)[];
    onVendorClick: (vendor: VendorMetrics) => void;
    isItemLoaded: (index: number) => boolean;
  } 
}) => {
  const vendor = data.vendors[index];
  
  if (!data.isItemLoaded(index) || !vendor) {
    return <LoadingRow style={style} />;
  }

  return (
    <div
      style={style}
      className="flex items-center hover:bg-gray-50 cursor-pointer transition-colors duration-200 border-b border-gray-200 px-6"
      data-testid={`row-vendor-${vendor.id}`}
      onClick={() => data.onVendorClick(vendor)}
    >
      {/* Vendor Column */}
      <div className="w-1/4 py-4 pr-6">
        <div className="flex items-center">
          <div className={`w-8 h-8 bg-gradient-to-br ${vendorColors[vendor.name] || vendorColors["Under Armour"]} rounded-lg flex items-center justify-center text-white font-bold text-sm`}>
            {vendor.name[0]}
          </div>
          <div className="ml-3 min-w-0 flex-1">
            <div className="text-sm font-medium text-gray-900 hover:text-brand-600 transition-colors truncate" data-testid={`text-vendor-name-${vendor.id}`}>
              {vendor.name}
            </div>
            <div className="text-sm text-gray-500" data-testid={`text-product-count-${vendor.id}`}>
              {vendor.productCount} products • Click for details
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Column */}
      <div className="w-1/6 py-4 px-3">
        <div className="text-sm text-gray-900 font-medium" data-testid={`text-revenue-${vendor.id}`}>
          ${vendor.revenue.toLocaleString()}
        </div>
      </div>

      {/* AOV Column */}
      <div className="w-1/6 py-4 px-3">
        <div className="text-sm text-gray-900" data-testid={`text-aov-${vendor.id}`}>
          ${vendor.aov.toFixed(2)}
        </div>
      </div>

      {/* Conversion Column */}
      <div className="w-1/6 py-4 px-3">
        <div className="text-sm text-gray-900" data-testid={`text-conversion-${vendor.id}`}>
          {vendor.conversion.toFixed(1)}%
        </div>
      </div>

      {/* Visitors Column */}
      <div className="w-1/6 py-4 px-3">
        <div className="text-sm text-gray-900" data-testid={`text-visitors-${vendor.id}`}>
          {vendor.visitors.toLocaleString()}
        </div>
      </div>

      {/* Growth Column */}
      <div className="w-1/6 py-4 px-3">
        <Badge 
          variant={vendor.growth >= 0 ? "default" : "destructive"}
          className={vendor.growth >= 0 ? "bg-green-100 text-green-800 hover:bg-green-200" : ""}
          data-testid={`badge-growth-${vendor.id}`}
        >
          {vendor.growth >= 0 ? "+" : ""}{vendor.growth.toFixed(1)}%
        </Badge>
      </div>
    </div>
  );
};

export default function InfiniteVendorTable({
  searchTerm,
  sortField,
  sortDirection,
  onSort,
  onVendorClick,
  height = 500
}: InfiniteVendorTableProps) {
  const [vendorPages, setVendorPages] = useState<Map<number, VendorMetrics[]>>(new Map());
  const [totalItems, setTotalItems] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(true);

  // Fetch vendors for a specific page
  const { data, isLoading: isLoadingPage } = useQuery<VendorResponse>({
    queryKey: ["/api/stores/current/vendors/metrics", 1, ITEMS_PER_PAGE, sortField, sortDirection, searchTerm]
  });

  // Handle data when it loads
  useMemo(() => {
    if (data) {
      setVendorPages(new Map([[1, data.data]]));
      setTotalItems(data.pagination.total);
      setHasNextPage(data.pagination.hasNext);
    }
  }, [data]);

  // Create a flat list of vendors with placeholders for unloaded items
  const vendors = useMemo(() => {
    const result: (VendorMetrics | undefined)[] = new Array(totalItems);
    
    vendorPages.forEach((pageVendors, pageNumber) => {
      const startIndex = (pageNumber - 1) * ITEMS_PER_PAGE;
      pageVendors.forEach((vendor, index) => {
        result[startIndex + index] = vendor;
      });
    });
    
    return result;
  }, [vendorPages, totalItems]);

  // Check if item at index is loaded
  const isItemLoaded = useCallback((index: number) => {
    return !!vendors[index];
  }, [vendors]);

  // Load more items when scrolling
  const loadMoreItems = useCallback(async (startIndex: number, stopIndex: number) => {
    const pageToLoad = Math.ceil((startIndex + 1) / ITEMS_PER_PAGE);
    
    if (vendorPages.has(pageToLoad)) {
      return; // Already loaded or loading
    }

    try {
      const response = await fetch(
        `/api/stores/current/vendors/metrics?page=${pageToLoad}&limit=${ITEMS_PER_PAGE}&sortBy=${sortField}&sortDirection=${sortDirection}&search=${searchTerm}`
      );
      
      if (response.ok) {
        const data: VendorResponse = await response.json();
        setVendorPages(prev => new Map(prev).set(pageToLoad, data.data));
        setHasNextPage(data.pagination.hasNext);
      }
    } catch (error) {
      console.error("Error loading vendors:", error);
    }
  }, [vendorPages, sortField, sortDirection, searchTerm]);

  const getSortIcon = (field: keyof VendorMetrics) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    return sortDirection === "asc" ? <ArrowUp className="w-4 h-4 text-blue-600" /> : <ArrowDown className="w-4 h-4 text-blue-600" />;
  };

  const itemData = {
    vendors,
    onVendorClick,
    isItemLoaded
  };

  // Calculate the total count including items that need to be loaded
  const itemCount = hasNextPage ? totalItems + 1 : totalItems;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Table Header */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="flex items-center px-6">
          <div 
            className="w-1/4 py-3 pr-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none flex items-center justify-between"
            onClick={() => onSort("name")}
            data-testid="header-vendor-name"
          >
            <span>Vendor</span>
            {getSortIcon("name")}
          </div>

          <div 
            className="w-1/6 py-3 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none flex items-center justify-between"
            onClick={() => onSort("revenue")}
            data-testid="header-revenue"
          >
            <span>Revenue</span>
            {getSortIcon("revenue")}
          </div>

          <div 
            className="w-1/6 py-3 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none flex items-center justify-between"
            onClick={() => onSort("aov")}
            data-testid="header-aov"
          >
            <span>AOV</span>
            {getSortIcon("aov")}
          </div>

          <div 
            className="w-1/6 py-3 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none flex items-center justify-between"
            onClick={() => onSort("conversion")}
            data-testid="header-conversion"
          >
            <span>Conversion</span>
            {getSortIcon("conversion")}
          </div>

          <div 
            className="w-1/6 py-3 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none flex items-center justify-between"
            onClick={() => onSort("visitors")}
            data-testid="header-visitors"
          >
            <span>Visitors</span>
            {getSortIcon("visitors")}
          </div>

          <div 
            className="w-1/6 py-3 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none flex items-center justify-between"
            onClick={() => onSort("growth")}
            data-testid="header-growth"
          >
            <span>Growth</span>
            {getSortIcon("growth")}
          </div>
        </div>
      </div>

      {/* Virtualized Table Body with Infinite Loading */}
      <div className="bg-white">
        <InfiniteLoader
          isItemLoaded={isItemLoaded}
          itemCount={itemCount}
          loadMoreItems={loadMoreItems}
          threshold={10}
        >
          {({ onItemsRendered, ref }: any) => (
            <ReactWindowList
              ref={ref}
              height={height}
              itemCount={itemCount}
              itemSize={VENDOR_ROW_HEIGHT}
              itemData={itemData}
              onItemsRendered={onItemsRendered}
              overscanCount={5}
            >
              {VendorRow as any}
            </ReactWindowList>
          )}
        </InfiniteLoader>
      </div>

      {/* Empty State */}
      {totalItems === 0 && !isLoadingPage && (
        <div className="bg-white p-12 text-center">
          <div className="text-gray-500">
            <p className="text-lg font-medium">No vendors found</p>
            <p className="text-sm mt-1">Try adjusting your search or filter criteria.</p>
          </div>
        </div>
      )}
    </div>
  );
}