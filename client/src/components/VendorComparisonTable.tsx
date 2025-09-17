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

interface DateRange {
  from?: Date;
  to?: Date;
}

interface VendorComparisonTableProps {
  dateRange?: DateRange;
}

export default function VendorComparisonTable({ dateRange }: VendorComparisonTableProps) {
  const { data: vendors, isLoading } = useQuery<VendorMetrics[]>({
    queryKey: ["/api/stores/current/vendors"],
  });

  const [selectedVendor, setSelectedVendor] = useState<VendorMetrics | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filtering and sorting states
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<keyof VendorMetrics>("revenue");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [revenueFilter, setRevenueFilter] = useState<string>("all");
  const [growthFilter, setGrowthFilter] = useState<string>("all");

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

  const handleExportCSV = () => {
    const exportData: VendorExportData[] = filteredAndSortedVendors.map(vendor => ({
      id: vendor.id,
      name: vendor.name,
      revenue: vendor.revenue,
      aov: vendor.aov,
      conversion: vendor.conversion,
      visitors: vendor.visitors,
      productCount: vendor.productCount,
      growth: vendor.growth
    }));

    exportToCSV(exportData, {
      filename: 'vendor-analytics-comparison',
      dateRange: formatDateRange()
    });
  };

  const handleExportExcel = () => {
    const exportData: VendorExportData[] = filteredAndSortedVendors.map(vendor => ({
      id: vendor.id,
      name: vendor.name,
      revenue: vendor.revenue,
      aov: vendor.aov,
      conversion: vendor.conversion,
      visitors: vendor.visitors,
      productCount: vendor.productCount,
      growth: vendor.growth
    }));

    exportToExcel(exportData, {
      filename: 'vendor-analytics-comparison',
      dateRange: formatDateRange()
    });
  };

  const handleSort = (field: keyof VendorMetrics) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const getSortIcon = (field: keyof VendorMetrics) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    return sortDirection === "asc" ? <ArrowUp className="w-4 h-4 text-blue-600" /> : <ArrowDown className="w-4 h-4 text-blue-600" />;
  };

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

  // Filter and sort vendors
  const filteredAndSortedVendors = useMemo(() => {
    let filtered = mockVendors;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(vendor =>
        vendor.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply revenue filter
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

    // Apply growth filter
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

    // Apply sorting - make a copy to avoid mutating the original array
    const sorted = [...filtered].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      let comparison = 0;
      if (typeof aValue === "string" && typeof bValue === "string") {
        comparison = aValue.localeCompare(bValue);
      } else {
        comparison = (aValue as number) - (bValue as number);
      }
      
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [searchTerm, revenueFilter, growthFilter, sortField, sortDirection]);

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
                    className="w-full justify-start text-gray-700 hover:bg-gray-50"
                    data-testid="button-export-csv"
                  >
                    <FileSpreadsheet size={16} className="mr-2" />
                    Export as CSV
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleExportExcel}
                    className="w-full justify-start text-gray-700 hover:bg-gray-50"
                    data-testid="button-export-excel"
                  >
                    <FileSpreadsheet size={16} className="mr-2" />
                    Export as Excel
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
            onChange={(e) => setSearchTerm(e.target.value)}
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
                  onClick={() => setSearchTerm("")}
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
        <div className="mt-3">
          <span className="text-sm text-gray-600" data-testid="vendor-count">
            Showing {filteredAndSortedVendors.length} of {mockVendors.length} vendors
          </span>
        </div>
      </CardHeader>
      
      <CardContent className="px-0">
        {/* Mobile Card View - Hidden on desktop */}
        <div className="block sm:hidden space-y-3">
          {filteredAndSortedVendors.map((vendor) => (
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
              {filteredAndSortedVendors.map((vendor) => (
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
