import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, ShoppingCart, Users, Package, Download } from "lucide-react";
import { cn } from "@/lib/utils";

const navigationItems = [
  { path: "/", label: "Overview", icon: BarChart3 },
  { path: "/sales", label: "Sales Analytics", icon: ShoppingCart },
  { path: "/customers", label: "Customer Insights", icon: Users },
  { path: "/products", label: "Product Performance", icon: Package },
  { path: "/reports", label: "Export Reports", icon: Download },
];

export default function Sidebar() {
  const [location] = useLocation();
  const [selectedVendor, setSelectedVendor] = useState("all");
  const [dateRange, setDateRange] = useState("30d");

  return (
    <aside className="w-64 bg-white shadow-sm h-screen sticky top-0 border-r border-gray-200">
      <nav className="p-4">
        <div className="space-y-6">
          {/* Vendor Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Vendor
            </label>
            <Select value={selectedVendor} onValueChange={setSelectedVendor}>
              <SelectTrigger data-testid="select-vendor">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vendors</SelectItem>
                <SelectItem value="nike">Nike</SelectItem>
                <SelectItem value="adidas">Adidas</SelectItem>
                <SelectItem value="puma">Puma</SelectItem>
                <SelectItem value="under-armour">Under Armour</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Range
            </label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger data-testid="select-date-range">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="custom">Custom range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Navigation Menu */}
          <div className="space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path;
              
              return (
                <Link 
                  key={item.path} 
                  href={item.path}
                  className={cn(
                    "flex items-center space-x-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                    isActive 
                      ? "text-shopify-600 bg-shopify-50" 
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  )}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </aside>
  );
}
