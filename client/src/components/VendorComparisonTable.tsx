import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Download, Filter, Search, ArrowUpDown, ArrowUp, ArrowDown, FileSpreadsheet } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import VendorDetailModal from "@/components/VendorDetailModal";
import { exportToCSV, exportToExcel, VendorExportData } from "@/utils/exportUtils";
import DataPagination, { usePagination, type PaginationData } from "@/components/DataPagination";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import VirtualizedVendorTable from "@/components/VirtualizedVendorTable";
import InfiniteVendorTable from "@/components/InfiniteVendorTable";
import { Switch } from "@/components/ui/switch";

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

interface PaginatedVendorResponse {
  data: VendorMetrics[];
  pagination: PaginationData;
}

interface DateRange {
  from?: Date;
  to?: Date;
}

interface VendorComparisonTableProps {
  dateRange?: DateRange;
}

export default function VendorComparisonTable({ dateRange }: VendorComparisonTableProps) {
  // Pagination state
  const { page, limit, setPage, setLimit } = usePagination(1, 25);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<keyof VendorMetrics>("revenue");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [revenueFilter, setRevenueFilter] = useState<string>("all");
  const [growthFilter, setGrowthFilter] = useState<string>("all");
  
  // Debounced search to avoid too many API calls
  const debouncedSearch = useDebouncedValue(searchTerm, 300);
  
  // Virtualization toggle
  const [useVirtualization, setUseVirtualization] = useState(false);
  const [useInfiniteScroll, setUseInfiniteScroll] = useState(false);
  
  // Modal states
  const [selectedVendor, setSelectedVendor] = useState<VendorMetrics | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Query paginated vendor metrics
  const { data: vendorResponse, isLoading } = useQuery<PaginatedVendorResponse>({
    queryKey: ["/api/stores/current/vendors/metrics", page, limit, sortField, sortDirection, debouncedSearch],
  });

  const vendors = vendorResponse?.data || [];
  const paginationData = vendorResponse?.pagination;
  
  // Auto-enable virtualization for large datasets
  const shouldUseVirtualization = paginationData && paginationData.total > 100;
  const effectiveVirtualization = useVirtualization || shouldUseVirtualization;

  const handleVendorClick = (vendor: VendorMetrics) => {
    setSelectedVendor(vendor);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedVendor(null);
  };

  const formatDateRange = () => {
    if (dateRange?.from && dateRange?.to) {
      const fromDate = dateRange.from.toLocaleDateString();
      const toDate = dateRange.to.toLocaleDateString();
      return `${fromDate} - ${toDate}`;
    }
    return 'All time';
  };

  // Server-side export handlers with progress tracking
  const [exportProgress, setExportProgress] = useState<{ type: string; progress: number } | null>(null);

  const handleServerExport = async (format: 'csv' | 'excel') => {
    try {
      setExportProgress({ type: format, progress: 0 });
      
      // Build export URL with current filters
      const params = new URLSearchParams({
        search: debouncedSearch || '',
        sortBy: sortField,
        sortDirection: sortDirection,
        dateRange: formatDateRange() || 'all'
      });
      
      const url = `/api/stores/current/vendors/export/${format}?${params.toString()}`;
      
      setExportProgress({ type: format, progress: 50 });
      
      // Create invisible link for download
      const link = document.createElement('a');
      link.href = url;
      link.download = `vendor-analytics-${format === 'csv' ? 'csv' : 'xlsx'}`;
      link.target = '_blank';
      
      // Add to DOM and click
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setExportProgress({ type: format, progress: 100 });
      
      // Clear progress after a delay
      setTimeout(() => setExportProgress(null), 1500);
      
    } catch (error) {
      console.error(`Error exporting ${format}:`, error);
      setExportProgress(null);
      // You might want to show a toast error here
    }
  };

  const handleExportCSV = () => {
    handleServerExport('csv');
  };

  const handleExportExcel = () => {
    handleServerExport('excel');
  };

  const handleSort = (field: keyof VendorMetrics) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
    // Reset to first page when sorting changes
    setPage(1);
  };

  // Handle pagination changes
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
  };

  const getSortIcon = (field: keyof VendorMetrics) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    return sortDirection === "asc" ? <ArrowUp className="w-4 h-4 text-blue-600" /> : <ArrowDown className="w-4 h-4 text-blue-600" />;
  };

  // Filter vendors for client-side filters (revenue, growth)
  // Search and sorting are now handled server-side
  const filteredVendors = useMemo(() => {
    let filtered = vendors;

    // Apply revenue filter (client-side for simplicity)
    if (revenueFilter !== "all") {
      switch (revenueFilter) {
        case "high":
          filtered = filtered.filter(vendor => vendor.revenue >= 30000);
          break;
        case "medium":
          filtered = filtered.filter(vendor => vendor.revenue >= 15000 && vendor.revenue < 30000);
          break;
        case "low":
          filtered = filtered.filter(vendor => vendor.revenue < 15000);
          break;
      }
    }

    // Apply growth filter (client-side for simplicity)
    if (growthFilter !== "all") {
      switch (growthFilter) {
        case "growing":
          filtered = filtered.filter(vendor => vendor.growth > 0);
          break;
        case "declining":
          filtered = filtered.filter(vendor => vendor.growth <= 0);
          break;
      }
    }

    return filtered;
  }, [vendors, revenueFilter, growthFilter]);

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

  const vendorColors: Record<string, string> = {
    Nike: "from-red-500 to-red-600",
    Adidas: "from-blue-500 to-blue-600",
    Puma: "from-yellow-500 to-orange-600",
    "Under Armour": "from-gray-600 to-gray-700",
  };

  return (
    <Card className="shadow-sm border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8">
      <CardHeader className="px-0 pb-4 sm:pb-6">
        <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base sm:text-lg font-semibold text-gray-900">
            Vendor Performance Comparison
          </CardTitle>
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            {/* Virtualization Controls */}
            <div className="flex items-center space-x-4 text-sm">
              {paginationData && paginationData.total > 50 && (
                <>
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="virtualization"
                      checked={effectiveVirtualization}
                      onCheckedChange={setUseVirtualization}
                      disabled={shouldUseVirtualization}
                    />
                    <label htmlFor="virtualization" className="text-gray-600">
                      Virtualization {shouldUseVirtualization && "(Auto)"}
                    </label>
                  </div>
                  
                  {effectiveVirtualization && (
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="infinite-scroll"
                        checked={useInfiniteScroll}
                        onCheckedChange={setUseInfiniteScroll}
                      />
                      <label htmlFor="infinite-scroll" className="text-gray-600">
                        Infinite Scroll
                      </label>
                    </div>
                  )}
                </>
              )}
            </div>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-gray-700 hover:bg-gray-50 flex-1 sm:flex-none touch-manipulation"
                  data-testid="button-export-vendors"
                >
                  <Download size={16} className="mr-1" />
                  <span className="hidden sm:inline">Export</span>
                  <span className="sm:hidden">Export</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2">
                <div className="space-y-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleExportCSV}
                    disabled={exportProgress?.type === 'csv'}
                    className="w-full justify-start text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    data-testid="button-export-csv"
                  >
                    {exportProgress?.type === 'csv' ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                        Exporting... {exportProgress.progress}%
                      </div>
                    ) : (
                      <>
                        <FileSpreadsheet size={16} className="mr-2" />
                        Export as CSV
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleExportExcel}
                    disabled={exportProgress?.type === 'excel'}
                    className="w-full justify-start text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    data-testid="button-export-excel"
                  >
                    {exportProgress?.type === 'excel' ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                        Exporting... {exportProgress.progress}%
                      </div>
                    ) : (
                      <>
                        <FileSpreadsheet size={16} className="mr-2" />
                        Export as Excel
                      </>
                    )}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  size="sm"
                  variant="outline"
                  className="text-gray-700 hover:bg-gray-50 flex-1 sm:flex-none touch-manipulation"
                  data-testid="button-filter-vendors"
                >
                  <Filter size={16} className="mr-1" />
                  <span className="hidden sm:inline">Filter</span>
                  <span className="sm:hidden">Filter</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Revenue Range</label>
                    <Select value={revenueFilter} onValueChange={setRevenueFilter}>
                      <SelectTrigger data-testid="select-revenue-filter">
                        <SelectValue placeholder="All revenue ranges" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All revenue ranges</SelectItem>
                        <SelectItem value="high">High ($30k+)</SelectItem>
                        <SelectItem value="medium">Medium ($15k-$30k)</SelectItem>
                        <SelectItem value="low">Low (&lt;$15k)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Growth Status</label>
                    <Select value={growthFilter} onValueChange={setGrowthFilter}>
                      <SelectTrigger data-testid="select-growth-filter">
                        <SelectValue placeholder="All vendors" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All vendors</SelectItem>
                        <SelectItem value="growing">Growing vendors</SelectItem>
                        <SelectItem value="declining">Declining vendors</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search vendors..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1); // Reset to first page on search
            }}
            className="pl-10"
            data-testid="input-search-vendors"
          />
        </div>

        {/* Active Filters Display */}
        {(searchTerm || revenueFilter !== "all" || growthFilter !== "all") && (
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="text-xs sm:text-sm text-gray-600">Active filters:</span>
            {searchTerm && (
              <Badge variant="secondary" className="gap-1">
                Search: "{searchTerm}"
                <button 
                  onClick={() => {
                    setSearchTerm("");
                    setPage(1);
                  }}
                  className="ml-1 text-gray-500 hover:text-gray-700"
                  data-testid="clear-search-filter"
                >
                  ×
                </button>
              </Badge>
            )}
            {revenueFilter !== "all" && (
              <Badge variant="secondary" className="gap-1">
                Revenue: {revenueFilter}
                <button 
                  onClick={() => setRevenueFilter("all")}
                  className="ml-1 text-gray-500 hover:text-gray-700"
                  data-testid="clear-revenue-filter"
                >
                  ×
                </button>
              </Badge>
            )}
            {growthFilter !== "all" && (
              <Badge variant="secondary" className="gap-1">
                Growth: {growthFilter}
                <button 
                  onClick={() => setGrowthFilter("all")}
                  className="ml-1 text-gray-500 hover:text-gray-700"
                  data-testid="clear-growth-filter"
                >
                  ×
                </button>
              </Badge>
            )}
          </div>
        )}

        {/* Results Count */}
        {paginationData && (
          <div className="mt-3">
            <span className="text-sm text-gray-600" data-testid="vendor-count">
              Showing {filteredVendors.length} of {paginationData.total} vendors
            </span>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="px-0">
        {effectiveVirtualization ? (
          // Use virtualized tables for large datasets
          <div className="hidden sm:block">
            {useInfiniteScroll ? (
              <InfiniteVendorTable
                searchTerm={debouncedSearch}
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
                onVendorClick={handleVendorClick}
                height={600}
              />
            ) : (
              <VirtualizedVendorTable
                vendors={filteredVendors}
                onVendorClick={handleVendorClick}
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
                height={600}
              />
            )}
            
            {/* Mobile view still shows cards for virtualized mode */}
            <div className="block sm:hidden space-y-3">
              {filteredVendors.slice(0, 20).map((vendor) => (
                <div 
                  key={vendor.id} 
                  className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors touch-manipulation"
                  data-testid={`card-vendor-${vendor.id}`}
                  onClick={() => handleVendorClick(vendor)}
                >
                  <div className="flex items-center mb-3">
                    <div className={`w-10 h-10 bg-gradient-to-br ${vendorColors[vendor.name]} rounded-lg flex items-center justify-center text-white font-bold text-sm mr-3`}>
                      {vendor.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate" data-testid={`text-vendor-name-${vendor.id}`}>
                        {vendor.name}
                      </h3>
                      <p className="text-xs text-gray-500" data-testid={`text-product-count-${vendor.id}`}>
                        {vendor.productCount} products
                      </p>
                    </div>
                    <Badge 
                      variant={vendor.growth >= 0 ? "default" : "destructive"}
                      className={`text-xs ${vendor.growth >= 0 ? "bg-green-100 text-green-800" : ""}`}
                      data-testid={`badge-growth-${vendor.id}`}
                    >
                      {vendor.growth >= 0 ? "+" : ""}{vendor.growth.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-gray-500 block">Revenue</span>
                      <span className="font-medium text-gray-900" data-testid={`text-revenue-${vendor.id}`}>
                        ${vendor.revenue.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">AOV</span>
                      <span className="font-medium text-gray-900" data-testid={`text-aov-${vendor.id}`}>
                        ${vendor.aov.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Conversion</span>
                      <span className="font-medium text-gray-900" data-testid={`text-conversion-${vendor.id}`}>
                        {vendor.conversion.toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Visitors</span>
                      <span className="font-medium text-gray-900" data-testid={`text-visitors-${vendor.id}`}>
                        {vendor.visitors.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {filteredVendors.length > 20 && (
                <div className="text-center p-4 text-gray-500">
                  Showing first 20 items on mobile. Use desktop for full list.
                </div>
              )}
            </div>
          </div>
        ) : (
          // Regular table view for smaller datasets
          <>
            {/* Mobile Card View - Hidden on desktop */}
            <div className="block sm:hidden space-y-3">
              {filteredVendors.map((vendor) => (
                <div 
                  key={vendor.id} 
                  className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors touch-manipulation"
                  data-testid={`card-vendor-${vendor.id}`}
                  onClick={() => handleVendorClick(vendor)}
                >
                  <div className="flex items-center mb-3">
                    <div className={`w-10 h-10 bg-gradient-to-br ${vendorColors[vendor.name]} rounded-lg flex items-center justify-center text-white font-bold text-sm mr-3`}>
                      {vendor.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate" data-testid={`text-vendor-name-${vendor.id}`}>
                        {vendor.name}
                      </h3>
                      <p className="text-xs text-gray-500" data-testid={`text-product-count-${vendor.id}`}>
                        {vendor.productCount} products
                      </p>
                    </div>
                    <Badge 
                      variant={vendor.growth >= 0 ? "default" : "destructive"}
                      className={`text-xs ${vendor.growth >= 0 ? "bg-green-100 text-green-800" : ""}`}
                      data-testid={`badge-growth-${vendor.id}`}
                    >
                      {vendor.growth >= 0 ? "+" : ""}{vendor.growth.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-gray-500 block">Revenue</span>
                      <span className="font-medium text-gray-900" data-testid={`text-revenue-${vendor.id}`}>
                        ${vendor.revenue.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">AOV</span>
                      <span className="font-medium text-gray-900" data-testid={`text-aov-${vendor.id}`}>
                        ${vendor.aov.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Conversion</span>
                      <span className="font-medium text-gray-900" data-testid={`text-conversion-${vendor.id}`}>
                        {vendor.conversion.toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Visitors</span>
                      <span className="font-medium text-gray-900" data-testid={`text-visitors-${vendor.id}`}>
                        {vendor.visitors.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Desktop Table View - Hidden on mobile */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort("name")}
                      data-testid="header-vendor-name"
                    >
                      <div className="flex items-center justify-between">
                        Vendor
                        {getSortIcon("name")}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort("revenue")}
                      data-testid="header-revenue"
                    >
                      <div className="flex items-center justify-between">
                        Revenue
                        {getSortIcon("revenue")}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort("aov")}
                      data-testid="header-aov"
                    >
                      <div className="flex items-center justify-between">
                        AOV
                        {getSortIcon("aov")}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort("conversion")}
                      data-testid="header-conversion"
                    >
                      <div className="flex items-center justify-between">
                        Conversion
                        {getSortIcon("conversion")}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort("visitors")}
                      data-testid="header-visitors"
                    >
                      <div className="flex items-center justify-between">
                        Visitors
                        {getSortIcon("visitors")}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort("growth")}
                      data-testid="header-growth"
                    >
                      <div className="flex items-center justify-between">
                        Growth
                        {getSortIcon("growth")}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredVendors.map((vendor) => (
                    <tr 
                      key={vendor.id} 
                      className="hover:bg-gray-50 cursor-pointer transition-colors duration-200" 
                      data-testid={`row-vendor-${vendor.id}`}
                      onClick={() => handleVendorClick(vendor)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`w-8 h-8 bg-gradient-to-br ${vendorColors[vendor.name]} rounded-lg flex items-center justify-center text-white font-bold text-sm`}>
                            {vendor.name[0]}
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900 hover:text-brand-600 transition-colors" data-testid={`text-vendor-name-${vendor.id}`}>
                              {vendor.name}
                            </div>
                            <div className="text-sm text-gray-500" data-testid={`text-product-count-${vendor.id}`}>
                              {vendor.productCount} products • Click for details
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
          </>
        )}
        
        
        {/* Pagination Controls - Only show for non-infinite scroll mode */}
        {paginationData && !useInfiniteScroll && (
          <DataPagination
            pagination={paginationData}
            onPageChange={handlePageChange}
            onLimitChange={handleLimitChange}
            showSizeSelector={true}
            showInfo={true}
            isLoading={isLoading}
            className="mt-6"
          />
        )}
        
        {/* Infinite scroll info */}
        {useInfiniteScroll && effectiveVirtualization && (
          <div className="mt-6 text-center text-sm text-gray-500">
            Scroll to load more vendors automatically
          </div>
        )}
      </CardContent>

      {/* Vendor Detail Modal */}
      <VendorDetailModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        vendor={selectedVendor}
      />
    </Card>
  );
}
