import { memo } from "react";
import { List } from "react-window";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

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

interface VirtualizedVendorTableProps {
  vendors: VendorMetrics[];
  onVendorClick: (vendor: VendorMetrics) => void;
  sortField: keyof VendorMetrics;
  sortDirection: "asc" | "desc";
  onSort: (field: keyof VendorMetrics) => void;
  height?: number;
}

const vendorColors: Record<string, string> = {
  Nike: "from-red-500 to-red-600",
  Adidas: "from-blue-500 to-blue-600",
  Puma: "from-yellow-500 to-orange-600",
  "Under Armour": "from-gray-600 to-gray-700",
};

// Individual row component - memoized for performance
const VendorRow = memo(({ index, style, data }: { index: number; style: any; data: { vendors: VendorMetrics[]; onVendorClick: (vendor: VendorMetrics) => void } }) => {
  const vendor = data.vendors[index];
  
  if (!vendor) return null;

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
});

VendorRow.displayName = "VendorRow";

export default function VirtualizedVendorTable({
  vendors,
  onVendorClick,
  sortField,
  sortDirection,
  onSort,
  height = 400
}: VirtualizedVendorTableProps) {
  const getSortIcon = (field: keyof VendorMetrics) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    return sortDirection === "asc" ? <ArrowUp className="w-4 h-4 text-blue-600" /> : <ArrowDown className="w-4 h-4 text-blue-600" />;
  };

  const itemData = {
    vendors,
    onVendorClick
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Table Header */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="flex items-center px-6">
          {/* Vendor Header */}
          <div 
            className="w-1/4 py-3 pr-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none flex items-center justify-between"
            onClick={() => onSort("name")}
            data-testid="header-vendor-name"
          >
            <span>Vendor</span>
            {getSortIcon("name")}
          </div>

          {/* Revenue Header */}
          <div 
            className="w-1/6 py-3 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none flex items-center justify-between"
            onClick={() => onSort("revenue")}
            data-testid="header-revenue"
          >
            <span>Revenue</span>
            {getSortIcon("revenue")}
          </div>

          {/* AOV Header */}
          <div 
            className="w-1/6 py-3 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none flex items-center justify-between"
            onClick={() => onSort("aov")}
            data-testid="header-aov"
          >
            <span>AOV</span>
            {getSortIcon("aov")}
          </div>

          {/* Conversion Header */}
          <div 
            className="w-1/6 py-3 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none flex items-center justify-between"
            onClick={() => onSort("conversion")}
            data-testid="header-conversion"
          >
            <span>Conversion</span>
            {getSortIcon("conversion")}
          </div>

          {/* Visitors Header */}
          <div 
            className="w-1/6 py-3 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none flex items-center justify-between"
            onClick={() => onSort("visitors")}
            data-testid="header-visitors"
          >
            <span>Visitors</span>
            {getSortIcon("visitors")}
          </div>

          {/* Growth Header */}
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

      {/* Virtualized Table Body */}
      <div className="bg-white">
        <List
          height={height}
          itemCount={vendors.length}
          itemSize={73} // Height of each row
          itemData={itemData}
          overscanCount={5} // Render 5 extra items outside visible area for smooth scrolling
        >
          {VendorRow as any}
        </List>
      </div>

      {/* Empty State */}
      {vendors.length === 0 && (
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