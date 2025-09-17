import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { BarChart3, ShoppingCart, Users, Package, Download, TrendingUp, Menu, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

const navigationItems = [
  { path: "/", label: "Overview", icon: BarChart3 },
  { path: "/vendors", label: "Vendor Performance", icon: TrendingUp },
  { path: "/sales", label: "Sales Analytics", icon: ShoppingCart },
  { path: "/customers", label: "Customer Insights", icon: Users },
  { path: "/products", label: "Product Performance", icon: Package },
  { path: "/reports", label: "Export Reports", icon: Download },
  { path: "/billing", label: "Billing & Subscription", icon: CreditCard },
];

interface SidebarProps {
  onMobileMenuClick?: () => void;
}

export default function Sidebar({ onMobileMenuClick }: SidebarProps) {
  const [location] = useLocation();
  const [selectedVendor, setSelectedVendor] = useState("all");
  const [dateRange, setDateRange] = useState("30d");
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const sidebarContent = (
    <nav className="p-4 h-full">
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
                  "flex items-center space-x-3 px-3 py-3 text-sm font-medium rounded-lg transition-colors touch-manipulation",
                  isActive 
                    ? "text-brand-600 bg-brand-50" 
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                )}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => isMobile && setOpen(false)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );

  if (isMobile) {
    return (
      <>
        {/* Mobile Menu Button */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              data-testid="button-mobile-menu"
            >
              <Menu size={20} />
              <span className="sr-only">Open menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 bg-white">
            {sidebarContent}
          </SheetContent>
        </Sheet>
      </>
    );
  }

  // Desktop sidebar
  return (
    <aside className="w-64 bg-white shadow-sm h-screen sticky top-0 border-r border-gray-200 hidden md:block">
      {sidebarContent}
    </aside>
  );
}
