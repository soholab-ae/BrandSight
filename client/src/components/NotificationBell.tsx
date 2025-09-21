import { useState, useEffect } from "react";
import { Bell, X, Check, Eye, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { Link, useLocation } from "wouter";

interface Notification {
  id: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  type: 'alert' | 'system' | 'marketing';
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
  metadata?: any;
}

interface NotificationBellProps {
  className?: string;
}

export default function NotificationBell({ className = "" }: NotificationBellProps) {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  // Fetch unread notification count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['/api/notifications/count'],
    enabled: isAuthenticated,
    refetchInterval: 30000, // Refresh every 30 seconds
    initialData: getDemoUnreadCount() // Demo data fallback
  });

  // Fetch recent notifications for dropdown
  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['/api/notifications', { limit: 10, page: 1 }],
    enabled: isAuthenticated && isOpen,
    initialData: getDemoNotifications() // Demo data fallback
  });

  // Mark notification as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) => 
      apiRequest('POST', `/api/notifications/${notificationId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/count'] });
    }
  });

  // Mark all notifications as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/notifications/mark-all-read'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/count'] });
    }
  });

  // Dismiss notification mutation
  const dismissMutation = useMutation({
    mutationFn: (notificationId: string) => 
      apiRequest('DELETE', `/api/notifications/${notificationId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/count'] });
    }
  });

  const notifications = notificationsData?.data || [];
  const unreadNotifications = notifications.filter((n: Notification) => !n.isRead);

  const handleMarkAsRead = (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    markAsReadMutation.mutate(notificationId);
  };

  const handleDismiss = (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    dismissMutation.mutate(notificationId);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
    setIsOpen(false);
    
    // Navigate to action URL if available using wouter navigation
    if (notification.actionUrl) {
      setLocation(notification.actionUrl);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSeverityBadgeVariant = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive' as const;
      case 'medium': return 'default' as const;
      case 'low': return 'secondary' as const;
      default: return 'outline' as const;
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={`relative p-2 text-gray-400 hover:text-gray-600 ${className}`}
          data-testid="button-notifications"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
              data-testid="badge-unread-count"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-96 p-0" 
        align="end" 
        sideOffset={5}
        data-testid="notifications-dropdown"
      >
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg" data-testid="text-notifications-title">
                Notifications
              </h3>
              <div className="flex items-center space-x-2">
                {unreadNotifications.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleMarkAllAsRead}
                    disabled={markAllAsReadMutation.isPending}
                    data-testid="button-mark-all-read"
                  >
                    <Check size={14} className="mr-1" />
                    Mark all read
                  </Button>
                )}
                <Link href="/notifications">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setIsOpen(false)}
                    data-testid="button-view-all"
                  >
                    <ArrowRight size={14} className="mr-1" />
                    View all
                  </Button>
                </Link>
              </div>
            </div>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-500" data-testid="text-unread-summary">
                You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </p>
            )}
          </CardHeader>
          
          <Separator />
          
          <CardContent className="p-0">
            <ScrollArea className="h-96">
              {isLoading ? (
                <div className="p-4 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-500">Loading notifications...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <h4 className="font-medium text-gray-900 mb-1">No notifications</h4>
                  <p className="text-sm text-gray-500">You're all caught up!</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notification: Notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={handleMarkAsRead}
                      onDismiss={handleDismiss}
                      onClick={handleNotificationClick}
                      getSeverityColor={getSeverityColor}
                      getSeverityBadgeVariant={getSeverityBadgeVariant}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}

// Individual notification item component
interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string, e: React.MouseEvent) => void;
  onDismiss: (id: string, e: React.MouseEvent) => void;
  onClick: (notification: Notification) => void;
  getSeverityColor: (severity: string) => string;
  getSeverityBadgeVariant: (severity: string) => "default" | "destructive" | "outline" | "secondary";
}

function NotificationItem({ 
  notification, 
  onMarkAsRead, 
  onDismiss, 
  onClick,
  getSeverityColor,
  getSeverityBadgeVariant
}: NotificationItemProps) {
  return (
    <div 
      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
        !notification.isRead ? 'bg-blue-50/50 border-l-4 border-l-blue-500' : ''
      }`}
      onClick={() => onClick(notification)}
      data-testid={`notification-item-${notification.id}`}
    >
      <div className="flex items-start space-x-3">
        <div className={`p-2 rounded-full flex-shrink-0 ${getSeverityColor(notification.severity)}`}>
          <Bell size={14} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className={`text-sm font-medium ${!notification.isRead ? 'font-semibold' : ''}`}>
              {notification.title}
            </h4>
            <div className="flex items-center space-x-1">
              <Badge 
                variant={getSeverityBadgeVariant(notification.severity)}
                className="text-xs"
              >
                {notification.severity.toUpperCase()}
              </Badge>
              {!notification.isRead && (
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              )}
            </div>
          </div>
          
          <p className="text-sm text-gray-600 line-clamp-2 mb-2">
            {notification.message}
          </p>
          
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">
              {format(new Date(notification.createdAt), 'MMM dd, HH:mm')}
            </span>
            
            <div className="flex items-center space-x-1">
              {!notification.isRead && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={(e) => onMarkAsRead(notification.id, e)}
                  data-testid={`button-mark-read-${notification.id}`}
                >
                  <Eye size={12} />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={(e) => onDismiss(notification.id, e)}
                data-testid={`button-dismiss-${notification.id}`}
              >
                <X size={12} />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Demo data functions
function getDemoUnreadCount(): number {
  return 3;
}

function getDemoNotifications() {
  return {
    data: [
      {
        id: 'notif_1',
        title: 'Performance Alert',
        message: 'Nike sales dropped by 25% compared to last week. Revenue fell from $15,450 to $11,590.',
        severity: 'high' as const,
        type: 'alert' as const,
        isRead: false,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        actionUrl: '/alerts?alertId=alert_1',
        metadata: { vendorName: 'Nike', alertType: 'performance_drop' }
      },
      {
        id: 'notif_2',
        title: 'Low Inventory Alert',
        message: 'Adidas running shoes inventory is critically low. Only 5 units remaining across 3 popular products.',
        severity: 'high' as const,
        type: 'alert' as const,
        isRead: false,
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        actionUrl: '/inventory?vendorId=vendor_2',
        metadata: { vendorName: 'Adidas', alertType: 'inventory_low' }
      },
      {
        id: 'notif_3',
        title: 'Sales Trend Alert',
        message: 'Under Armour showing positive growth trend. 15% increase in conversion rate over the past 3 days.',
        severity: 'medium' as const,
        type: 'alert' as const,
        isRead: false,
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        actionUrl: '/vendors?vendorId=vendor_3',
        metadata: { vendorName: 'Under Armour', alertType: 'sales_trend' }
      },
      {
        id: 'notif_4',
        title: 'System Update',
        message: 'New features have been added to your BrandSight dashboard. Check out the improved analytics.',
        severity: 'low' as const,
        type: 'system' as const,
        isRead: true,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        actionUrl: '/dashboard',
        metadata: { updateType: 'feature_release' }
      },
      {
        id: 'notif_5',
        title: 'Performance Spike',
        message: 'Puma products experiencing unexpected sales surge. Revenue increased by 45% in the last 24 hours.',
        severity: 'medium' as const,
        type: 'alert' as const,
        isRead: true,
        createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        actionUrl: '/vendors?vendorId=vendor_4',
        metadata: { vendorName: 'Puma', alertType: 'performance_spike' }
      }
    ]
  };
}