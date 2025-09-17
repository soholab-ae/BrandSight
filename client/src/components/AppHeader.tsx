import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Bell, ChevronDown, Store, Menu } from "lucide-react";
import logoUrl from "@/assets/logo.png";
import { useIsMobile } from "@/hooks/use-mobile";

interface AppHeaderProps {
  onMobileMenuClick?: () => void;
  mobileMenuButton?: React.ReactNode;
}

export default function AppHeader({ onMobileMenuClick, mobileMenuButton }: AppHeaderProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            {/* Mobile menu button */}
            {isMobile && mobileMenuButton}
            <div className="flex items-center space-x-3">
              <img src={logoUrl} alt="BrandSight" className="h-6 w-auto sm:h-8" />
            </div>
            <div className="hidden md:flex items-center space-x-2 text-sm text-gray-600">
              <Store size={16} />
              <span data-testid="text-store-name">My Awesome Store</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Button 
              variant="ghost" 
              size="sm" 
              className="p-2 text-gray-400 hover:text-gray-600 hidden sm:inline-flex"
              data-testid="button-notifications"
            >
              <Bell size={18} />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="flex items-center space-x-2 hover:bg-gray-50"
                  data-testid="button-user-menu"
                >
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={(user as any)?.profileImageUrl || undefined} />
                    <AvatarFallback className="bg-brand-100 text-brand-600">
                      {(user as any)?.firstName ? (user as any).firstName[0].toUpperCase() : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:block text-sm font-medium text-gray-700" data-testid="text-user-name">
                    {(user as any)?.firstName ? `${(user as any).firstName} ${(user as any)?.lastName || ''}`.trim() : 'User'}
                  </span>
                  <ChevronDown className="text-gray-400 hidden sm:block" size={14} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleLogout} data-testid="button-logout">
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
