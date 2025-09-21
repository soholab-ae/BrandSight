import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { DateRange } from "react-day-picker";
import AppHeader from "@/components/AppHeader";
import Sidebar from "@/components/Sidebar";
import DateRangePicker from "@/components/DateRangePicker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Bell, 
  Search, 
  Filter, 
  Check, 
  CheckCircle, 
  X, 
  Eye,
  EyeOff,
  Trash2,
  Settings,
  InfoIcon,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Package,
  Activity,
  Mail,
  MessageSquare,
  Calendar,
  SortAsc,
  SortDesc
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format, formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  type: 'alert' | 'system' | 'marketing';
  isRead: boolean;
  dismissedAt?: string;
  createdAt: string;
  actionUrl?: string;
  metadata?: any;
}

const notificationTypeIcons = {
  alert: AlertTriangle,
  system: Settings,
  marketing: Mail
};

const severityIcons = {
  performance_drop: TrendingDown,
  performance_spike: TrendingUp,
  inventory_low: Package,
  sales_trend: Activity,
  default: Bell
};

const severityColors = {
  high: 'bg-red-50 text-red-800 border-red-200',
  medium: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  low: 'bg-blue-50 text-blue-800 border-blue-200'
};

const severityBadgeColors = {
  high: 'destructive',
  medium: 'default',
  low: 'secondary'
} as const;

export default function NotificationCenterPage() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  
  // Check if using demo data
  const { data: stores } = useQuery({
    queryKey: ['/api/stores'],
    enabled: isAuthenticated
  });
  
  const isDemoMode = !stores || !Array.isArray(stores) || stores.length === 0 || stores[0]?.id === 'demo_store_1';
  
  // State for filters and UI
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'read'>('all');

  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const today = new Date();
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { from: lastWeek, to: today };
  });

  // Fetch notifications with filters and pagination
  const { data: notificationsData, isLoading: notificationsLoading, refetch } = useQuery({
    queryKey: ['/api/notifications', {
      page: currentPage,
      limit: 20,
      type: selectedType !== 'all' ? selectedType : undefined,
      severity: selectedSeverity !== 'all' ? selectedSeverity : undefined,
      isRead: activeTab === 'read' ? true : activeTab === 'unread' ? false : undefined,
      search: searchQuery || undefined,
      sortBy: sortBy,
      dateRange: dateRange ? `${dateRange.from?.toISOString()}-${dateRange.to?.toISOString()}` : undefined
    }],
    enabled: isAuthenticated,
    initialData: isDemoMode ? getDemoNotificationsData() : undefined
  });

  // Fetch notification statistics
  const { data: stats } = useQuery({
    queryKey: ['/api/notifications/stats'],
    enabled: isAuthenticated,
    initialData: isDemoMode ? getDemoStatsData() : undefined
  });

  // Mark notification as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) => 
      apiRequest('POST', `/api/notifications/${notificationId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/stats'] });
    }
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/notifications/mark-all-read'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/stats'] });
      toast({
        title: "All notifications marked as read",
        description: "Your notification center has been updated.",
      });
    }
  });

  // Bulk actions mutation
  const bulkActionMutation = useMutation({
    mutationFn: ({ action, notificationIds }: { action: 'read' | 'dismiss'; notificationIds: string[] }) =>
      apiRequest('POST', `/api/notifications/bulk-${action}`, { notificationIds }),
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/stats'] });
      setSelectedNotifications([]);
      toast({
        title: `Bulk ${action} completed`,
        description: `${selectedNotifications.length} notifications have been updated.`,
      });
    }
  });

  // Dismiss notification mutation
  const dismissMutation = useMutation({
    mutationFn: (notificationId: string) => 
      apiRequest('DELETE', `/api/notifications/${notificationId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/stats'] });
    }
  });

  const notifications = notificationsData?.data || [];
  const pagination = notificationsData?.pagination || { total: 0, pages: 1, page: 1 };

  // Handle notification selection
  const handleSelectNotification = (notificationId: string, checked: boolean) => {
    if (checked) {
      setSelectedNotifications(prev => [...prev, notificationId]);
    } else {
      setSelectedNotifications(prev => prev.filter(id => id !== notificationId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedNotifications(notifications.map((n: Notification) => n.id));
    } else {
      setSelectedNotifications([]);
    }
  };

  // Handle individual notification actions
  const handleMarkAsRead = (notificationId: string) => {
    markAsReadMutation.mutate(notificationId);
  };

  const handleDismiss = (notificationId: string) => {
    dismissMutation.mutate(notificationId);
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
    
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  // Handle bulk actions
  const handleBulkAction = (action: 'read' | 'dismiss') => {
    if (selectedNotifications.length === 0) return;
    
    bulkActionMutation.mutate({ action, notificationIds: selectedNotifications });
  };

  // Reset filters
  const resetFilters = () => {
    setSearchQuery('');
    setSelectedType('all');
    setSelectedSeverity('all');
    setSortBy('newest');
    setShowUnreadOnly(false);
    setDateRange(undefined);
    setCurrentPage(1);
  };

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-brand-600 mx-auto mb-4"></div>
          <h2 className="text-lg font-medium text-gray-900">Loading notifications...</h2>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <AppHeader />
      
      <div className="flex">
        <Sidebar />
        
        <main className="flex-1 p-6">
          {/* Demo Mode Alert */}
          {isDemoMode && (
            <Alert className="mb-6 bg-brand-50 border-brand-200" data-testid="demo-alert">
              <InfoIcon className="h-4 w-4 text-brand-600" />
              <AlertDescription className="text-brand-800">
                <strong>Demo Mode:</strong> You're viewing sample notification data. 
                <a href="/setup" className="underline ml-1 text-brand-700 hover:text-brand-900">
                  Connect your Shopify store
                </a> to see your real notifications.
              </AlertDescription>
            </Alert>
          )}
          
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2" data-testid="text-page-title">
                  Notification Center
                </h1>
                <p className="text-gray-600" data-testid="text-page-description">
                  Manage your alerts and notifications in one place
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  onClick={() => refetch()}
                  disabled={notificationsLoading}
                  data-testid="button-refresh"
                >
                  <Bell className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
                <Button
                  variant="default"
                  onClick={() => window.location.href = '/notifications/preferences'}
                  data-testid="button-preferences"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Preferences
                </Button>
              </div>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card data-testid="card-total-notifications">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Notifications</CardTitle>
                <Bell className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.total || 0}</div>
                <p className="text-xs text-muted-foreground">All time</p>
              </CardContent>
            </Card>

            <Card data-testid="card-unread-notifications">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unread</CardTitle>
                <EyeOff className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{stats?.unread || 0}</div>
                <p className="text-xs text-muted-foreground">Needs attention</p>
              </CardContent>
            </Card>

            <Card data-testid="card-critical-notifications">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Critical</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats?.critical || 0}</div>
                <p className="text-xs text-muted-foreground">High priority</p>
              </CardContent>
            </Card>

            <Card data-testid="card-today-notifications">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today</CardTitle>
                <Calendar className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats?.today || 0}</div>
                <p className="text-xs text-muted-foreground">New today</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Search */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filters & Search
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search and primary filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search notifications..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                    data-testid="input-search"
                  />
                </div>
                
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger data-testid="select-type-filter">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="alert">Alerts</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
                  <SelectTrigger data-testid="select-severity-filter">
                    <SelectValue placeholder="All Severities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severities</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={(value: 'newest' | 'oldest') => setSortBy(value)}>
                  <SelectTrigger data-testid="select-sort">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">
                      <div className="flex items-center">
                        <SortDesc className="mr-2 h-4 w-4" />
                        Newest First
                      </div>
                    </SelectItem>
                    <SelectItem value="oldest">
                      <div className="flex items-center">
                        <SortAsc className="mr-2 h-4 w-4" />
                        Oldest First
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Additional filters */}
              <div className="flex flex-wrap items-center gap-4">
                <DateRangePicker
                  value={dateRange}
                  onChange={setDateRange}
                  placeholder="Select date range"
                />
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="unread-only"
                    checked={showUnreadOnly}
                    onCheckedChange={setShowUnreadOnly}
                    data-testid="checkbox-unread-only"
                  />
                  <label htmlFor="unread-only" className="text-sm font-medium">
                    Unread only
                  </label>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetFilters}
                  data-testid="button-reset-filters"
                >
                  Reset Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Notification Tabs */}
          <Tabs value={activeTab} onValueChange={(value: 'all' | 'unread' | 'read') => setActiveTab(value)} className="mb-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all" data-testid="tab-all">
                All ({stats?.total || 0})
              </TabsTrigger>
              <TabsTrigger value="unread" data-testid="tab-unread">
                Unread ({stats?.unread || 0})
              </TabsTrigger>
              <TabsTrigger value="read" data-testid="tab-read">
                Read ({(stats?.total || 0) - (stats?.unread || 0)})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Bulk Actions */}
          {selectedNotifications.length > 0 && (
            <Card className="mb-6 bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {selectedNotifications.length} notification{selectedNotifications.length !== 1 ? 's' : ''} selected
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleBulkAction('read')}
                      disabled={bulkActionMutation.isPending}
                      data-testid="button-bulk-read"
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Mark as Read
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleBulkAction('dismiss')}
                      disabled={bulkActionMutation.isPending}
                      data-testid="button-bulk-dismiss"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Dismiss
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedNotifications([])}
                      data-testid="button-clear-selection"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notifications List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Notifications</CardTitle>
                <div className="flex items-center gap-2">
                  {notifications.length > 0 && (
                    <>
                      <Checkbox
                        checked={selectedNotifications.length === notifications.length}
                        onCheckedChange={handleSelectAll}
                        data-testid="checkbox-select-all"
                      />
                      <label className="text-sm">Select all</label>
                    </>
                  )}
                  {stats?.unread > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAllAsReadMutation.mutate()}
                      disabled={markAllAsReadMutation.isPending}
                      data-testid="button-mark-all-read"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Mark all as read
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {notificationsLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto mb-4"></div>
                  <p>Loading notifications...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications found</h3>
                  <p className="text-gray-500">
                    {activeTab === 'unread' 
                      ? "You're all caught up! No unread notifications."
                      : "No notifications match your current filters."
                    }
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notification: Notification) => (
                    <NotificationListItem
                      key={notification.id}
                      notification={notification}
                      isSelected={selectedNotifications.includes(notification.id)}
                      onSelect={(checked) => handleSelectNotification(notification.id, checked)}
                      onMarkAsRead={() => handleMarkAsRead(notification.id)}
                      onDismiss={() => handleDismiss(notification.id)}
                      onClick={() => handleNotificationClick(notification)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                data-testid="button-prev-page"
              >
                Previous
              </Button>
              
              <span className="text-sm text-gray-600">
                Page {currentPage} of {pagination.pages}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(pagination.pages, prev + 1))}
                disabled={currentPage === pagination.pages}
                data-testid="button-next-page"
              >
                Next
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// Individual notification list item component
interface NotificationListItemProps {
  notification: Notification;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onMarkAsRead: () => void;
  onDismiss: () => void;
  onClick: () => void;
}

function NotificationListItem({ 
  notification, 
  isSelected, 
  onSelect, 
  onMarkAsRead, 
  onDismiss, 
  onClick 
}: NotificationListItemProps) {
  const TypeIcon = notificationTypeIcons[notification.type];
  const SeverityIcon = severityIcons[notification.metadata?.alertType] || severityIcons.default;

  return (
    <div 
      className={`p-4 hover:bg-gray-50 transition-colors ${
        !notification.isRead ? 'bg-blue-50/30 border-l-4 border-l-blue-500' : ''
      }`}
      data-testid={`notification-item-${notification.id}`}
    >
      <div className="flex items-start space-x-3">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
          onClick={(e) => e.stopPropagation()}
          data-testid={`checkbox-select-${notification.id}`}
        />
        
        <div className={`p-2 rounded-full flex-shrink-0 ${severityColors[notification.severity]}`}>
          <SeverityIcon size={16} />
        </div>
        
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onClick}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h4 className={`text-sm font-medium ${!notification.isRead ? 'font-semibold' : ''}`}>
                {notification.title}
              </h4>
              {!notification.isRead && (
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={severityBadgeColors[notification.severity]} className="text-xs">
                {notification.severity.toUpperCase()}
              </Badge>
              <Badge variant="outline" className="text-xs">
                <TypeIcon size={12} className="mr-1" />
                {notification.type}
              </Badge>
            </div>
          </div>
          
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {notification.message}
          </p>
          
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
            </span>
            <span>
              {format(new Date(notification.createdAt), 'MMM dd, yyyy HH:mm')}
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-1">
          {!notification.isRead && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onMarkAsRead();
              }}
              data-testid={`button-mark-read-${notification.id}`}
            >
              <Eye size={14} />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            data-testid={`button-dismiss-${notification.id}`}
          >
            <X size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Demo data functions
function getDemoNotificationsData() {
  return {
    data: [
      {
        id: 'notif_1',
        title: 'Critical Performance Drop Alert',
        message: 'Nike sales dropped by 25% compared to last week. Revenue fell from $15,450 to $11,590. This requires immediate attention.',
        severity: 'high' as const,
        type: 'alert' as const,
        isRead: false,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        actionUrl: '/alerts?alertId=alert_1',
        metadata: { vendorName: 'Nike', alertType: 'performance_drop' }
      },
      {
        id: 'notif_2',
        title: 'Low Inventory Warning',
        message: 'Adidas running shoes inventory is critically low. Only 5 units remaining across 3 popular products. Consider reordering soon.',
        severity: 'high' as const,
        type: 'alert' as const,
        isRead: false,
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        actionUrl: '/inventory?vendorId=vendor_2',
        metadata: { vendorName: 'Adidas', alertType: 'inventory_low' }
      },
      {
        id: 'notif_3',
        title: 'Positive Sales Trend Detected',
        message: 'Under Armour showing strong positive growth trend. 15% increase in conversion rate over the past 3 days.',
        severity: 'medium' as const,
        type: 'alert' as const,
        isRead: false,
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        actionUrl: '/vendors?vendorId=vendor_3',
        metadata: { vendorName: 'Under Armour', alertType: 'sales_trend' }
      },
      {
        id: 'notif_4',
        title: 'New Feature Release',
        message: 'Exciting new analytics features have been added to your BrandSight dashboard. Check out the improved vendor performance tracking and forecasting tools.',
        severity: 'low' as const,
        type: 'system' as const,
        isRead: true,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        actionUrl: '/dashboard',
        metadata: { updateType: 'feature_release' }
      },
      {
        id: 'notif_5',
        title: 'Performance Spike Alert',
        message: 'Puma products experiencing unexpected sales surge. Revenue increased by 45% in the last 24 hours. Great opportunity to capitalize!',
        severity: 'medium' as const,
        type: 'alert' as const,
        isRead: true,
        createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        actionUrl: '/vendors?vendorId=vendor_4',
        metadata: { vendorName: 'Puma', alertType: 'performance_spike' }
      },
      {
        id: 'notif_6',
        title: 'Weekly Analytics Report Ready',
        message: 'Your weekly analytics report is now available. Review key performance metrics and vendor insights for the past week.',
        severity: 'low' as const,
        type: 'system' as const,
        isRead: true,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        actionUrl: '/reports',
        metadata: { reportType: 'weekly_analytics' }
      }
    ],
    pagination: {
      page: 1,
      pages: 1,
      total: 6,
      limit: 20
    }
  };
}

function getDemoStatsData() {
  return {
    total: 6,
    unread: 3,
    critical: 2,
    today: 1
  };
}