import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  RefreshCw, 
  Download, 
  InfoIcon, 
  AlertTriangle, 
  CheckCircle, 
  X, 
  Eye,
  Filter,
  TrendingDown,
  TrendingUp,
  Package,
  Activity
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

interface AlertData {
  id: string;
  alertType: 'performance_drop' | 'performance_spike' | 'inventory_low' | 'sales_trend';
  message: string;
  thresholdValue?: number;
  currentValue?: number;
  severity: 'low' | 'medium' | 'high';
  vendorId?: string;
  vendorName?: string;
  createdAt: string;
  acknowledgedAt?: string;
  isRead: boolean;
}

const alertTypeIcons = {
  performance_drop: TrendingDown,
  performance_spike: TrendingUp,
  inventory_low: Package,
  sales_trend: Activity
};

const alertTypeLabels = {
  performance_drop: 'Performance Drop',
  performance_spike: 'Performance Spike',
  inventory_low: 'Low Inventory',
  sales_trend: 'Sales Trend'
};

const severityColors = {
  high: 'bg-red-100 text-red-800 border-red-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-blue-100 text-blue-800 border-blue-200'
};

const severityBadgeColors = {
  high: 'destructive',
  medium: 'default',
  low: 'secondary'
} as const;

export default function AlertsPage() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  
  // Check if using demo data
  const { data: stores } = useQuery({
    queryKey: ['/api/stores'],
    enabled: isAuthenticated
  });
  
  const isDemoMode = !stores || !Array.isArray(stores) || stores.length === 0 || stores[0]?.id === 'demo_store_1';
  
  // State for filters
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const today = new Date();
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { from: lastWeek, to: today };
  });
  
  const [selectedVendor, setSelectedVendor] = useState<string>('all');
  const [selectedAlertType, setSelectedAlertType] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('active');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch vendors for filter dropdown
  const { data: vendors } = useQuery({
    queryKey: ['/api/stores/current/vendors'],
    enabled: isAuthenticated
  });

  // Fetch alerts with filters
  const { data: alertsData, isLoading: alertsLoading, refetch: refetchAlerts } = useQuery({
    queryKey: ['/api/alerts', {
      vendorId: selectedVendor !== 'all' ? selectedVendor : undefined,
      alertType: selectedAlertType !== 'all' ? selectedAlertType : undefined,
      severity: selectedSeverity !== 'all' ? selectedSeverity : undefined,
      dateRange: dateRange ? `${dateRange.from?.toISOString()}-${dateRange.to?.toISOString()}` : undefined,
      acknowledged: activeTab === 'acknowledged'
    }],
    enabled: isAuthenticated,
    initialData: isDemoMode ? getDemoAlertsData() : undefined
  });

  // Fetch alert statistics
  const { data: alertStats } = useQuery({
    queryKey: ['/api/alerts/stats'],
    enabled: isAuthenticated,
    initialData: isDemoMode ? getDemoStatsData() : undefined
  });

  // Mark alert as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (alertId: string) => apiRequest('POST', `/api/alerts/${alertId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alerts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/alerts/stats'] });
    }
  });

  // Acknowledge alert mutation
  const acknowledgeMutation = useMutation({
    mutationFn: (alertId: string) => apiRequest('POST', `/api/alerts/${alertId}/acknowledge`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alerts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/alerts/stats'] });
      toast({
        title: "Alert acknowledged",
        description: "The alert has been marked as resolved.",
      });
    }
  });

  // Delete alert mutation
  const deleteAlertMutation = useMutation({
    mutationFn: (alertId: string) => apiRequest('DELETE', `/api/alerts/${alertId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alerts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/alerts/stats'] });
      toast({
        title: "Alert deleted",
        description: "The alert has been removed.",
      });
    }
  });

  // Process new alerts mutation
  const processAlertsMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/alerts/process'),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/alerts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/alerts/stats'] });
      toast({
        title: "Alerts processed",
        description: response.message || "New alerts have been generated.",
      });
    }
  });

  // Handle alert actions
  const handleMarkAsRead = async (alertId: string) => {
    markAsReadMutation.mutate(alertId);
  };

  const handleAcknowledge = async (alertId: string) => {
    acknowledgeMutation.mutate(alertId);
  };

  const handleDelete = async (alertId: string) => {
    deleteAlertMutation.mutate(alertId);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetchAlerts();
    if (isDemoMode) {
      await processAlertsMutation.mutateAsync();
    }
    setIsRefreshing(false);
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
          <h2 className="text-lg font-medium text-gray-900">Loading alerts...</h2>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const alerts = alertsData?.data || [];
  const activeAlerts = alerts.filter((alert: AlertData) => !alert.acknowledgedAt);
  const acknowledgedAlerts = alerts.filter((alert: AlertData) => alert.acknowledgedAt);

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
                <strong>Demo Mode:</strong> You're viewing sample alert data. 
                <a href="/setup" className="underline ml-1 text-brand-700 hover:text-brand-900">
                  Connect your Shopify store
                </a> to see your real alerts.
              </AlertDescription>
            </Alert>
          )}
          
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2" data-testid="text-page-title">
                  Smart Alerts
                </h2>
                <p className="text-gray-600" data-testid="text-page-description">
                  Monitor your business with intelligent alerts and notifications
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <DateRangePicker
                  value={dateRange}
                  onChange={setDateRange}
                  placeholder="Select date range"
                />
                <Button
                  variant="outline"
                  size="default"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  data-testid="button-refresh-alerts"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Processing...' : 'Refresh'}
                </Button>
                <Button variant="default" size="default" data-testid="button-export">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            </div>
          </div>

          {/* Alert Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card data-testid="card-total-alerts">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{alertStats?.totalAlerts || 0}</div>
                <p className="text-xs text-muted-foreground">All time</p>
              </CardContent>
            </Card>

            <Card data-testid="card-active-alerts">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
                <Activity className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{alertStats?.activeAlerts || 0}</div>
                <p className="text-xs text-muted-foreground">Requiring attention</p>
              </CardContent>
            </Card>

            <Card data-testid="card-high-priority">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">High Priority</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{alertStats?.highPriorityAlerts || 0}</div>
                <p className="text-xs text-muted-foreground">Critical issues</p>
              </CardContent>
            </Card>

            <Card data-testid="card-resolved-today">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Resolved Today</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{alertStats?.resolvedToday || 0}</div>
                <p className="text-xs text-muted-foreground">Alerts handled</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filter Alerts
              </CardTitle>
              <CardDescription>
                Refine your view with filters and search
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Vendor</label>
                  <Select value={selectedVendor} onValueChange={setSelectedVendor}>
                    <SelectTrigger data-testid="select-vendor-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Vendors</SelectItem>
                      {vendors?.map((vendor: any) => (
                        <SelectItem key={vendor.id} value={vendor.id}>
                          {vendor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Alert Type</label>
                  <Select value={selectedAlertType} onValueChange={setSelectedAlertType}>
                    <SelectTrigger data-testid="select-alert-type-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="performance_drop">Performance Drop</SelectItem>
                      <SelectItem value="performance_spike">Performance Spike</SelectItem>
                      <SelectItem value="inventory_low">Low Inventory</SelectItem>
                      <SelectItem value="sales_trend">Sales Trend</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Severity</label>
                  <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
                    <SelectTrigger data-testid="select-severity-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Severities</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Alerts Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="active" data-testid="tab-active-alerts">
                Active Alerts ({activeAlerts.length})
              </TabsTrigger>
              <TabsTrigger value="acknowledged" data-testid="tab-acknowledged-alerts">
                Resolved ({acknowledgedAlerts.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="active" className="mt-6">
              <AlertsList 
                alerts={activeAlerts}
                onMarkAsRead={handleMarkAsRead}
                onAcknowledge={handleAcknowledge}
                onDelete={handleDelete}
                isLoading={alertsLoading}
                showActions={true}
              />
            </TabsContent>
            
            <TabsContent value="acknowledged" className="mt-6">
              <AlertsList 
                alerts={acknowledgedAlerts}
                onMarkAsRead={handleMarkAsRead}
                onAcknowledge={handleAcknowledge}
                onDelete={handleDelete}
                isLoading={alertsLoading}
                showActions={false}
              />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}

// Alerts List Component
interface AlertsListProps {
  alerts: AlertData[];
  onMarkAsRead: (id: string) => void;
  onAcknowledge: (id: string) => void;
  onDelete: (id: string) => void;
  isLoading: boolean;
  showActions: boolean;
}

function AlertsList({ alerts, onMarkAsRead, onAcknowledge, onDelete, isLoading, showActions }: AlertsListProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
            <span className="ml-2">Loading alerts...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (alerts.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No alerts found</h3>
          <p className="text-gray-500">
            {showActions ? "Great! You have no active alerts at the moment." : "No resolved alerts in the selected time period."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {alerts.map((alert) => (
        <AlertCard
          key={alert.id}
          alert={alert}
          onMarkAsRead={onMarkAsRead}
          onAcknowledge={onAcknowledge}
          onDelete={onDelete}
          showActions={showActions}
        />
      ))}
    </div>
  );
}

// Alert Card Component
interface AlertCardProps {
  alert: AlertData;
  onMarkAsRead: (id: string) => void;
  onAcknowledge: (id: string) => void;
  onDelete: (id: string) => void;
  showActions: boolean;
}

function AlertCard({ alert, onMarkAsRead, onAcknowledge, onDelete, showActions }: AlertCardProps) {
  const IconComponent = alertTypeIcons[alert.alertType];
  
  return (
    <Card className={`${severityColors[alert.severity]} ${!alert.isRead && showActions ? 'ring-2 ring-brand-200' : ''}`} data-testid={`alert-card-${alert.id}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4 flex-1">
            <div className={`p-2 rounded-lg ${alert.severity === 'high' ? 'bg-red-100' : alert.severity === 'medium' ? 'bg-yellow-100' : 'bg-blue-100'}`}>
              <IconComponent className={`h-5 w-5 ${alert.severity === 'high' ? 'text-red-600' : alert.severity === 'medium' ? 'text-yellow-600' : 'text-blue-600'}`} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-2">
                <Badge variant={severityBadgeColors[alert.severity]}>{alert.severity.toUpperCase()}</Badge>
                <Badge variant="outline">{alertTypeLabels[alert.alertType]}</Badge>
                {alert.vendorName && (
                  <Badge variant="outline">{alert.vendorName}</Badge>
                )}
                {!alert.isRead && showActions && (
                  <Badge variant="secondary">New</Badge>
                )}
              </div>
              
              <p className="text-gray-900 font-medium mb-2">{alert.message}</p>
              
              {(alert.thresholdValue || alert.currentValue) && (
                <div className="text-sm text-gray-600 mb-2">
                  {alert.thresholdValue && <span>Threshold: {alert.thresholdValue}</span>}
                  {alert.thresholdValue && alert.currentValue && <span className="mx-2">•</span>}
                  {alert.currentValue && <span>Current: {alert.currentValue}</span>}
                </div>
              )}
              
              <div className="text-sm text-gray-500">
                Created: {format(new Date(alert.createdAt), 'MMM dd, yyyy HH:mm')}
                {alert.acknowledgedAt && (
                  <span className="ml-4">
                    Resolved: {format(new Date(alert.acknowledgedAt), 'MMM dd, yyyy HH:mm')}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {showActions && (
            <div className="flex items-center space-x-2 ml-4">
              {!alert.isRead && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onMarkAsRead(alert.id)}
                  data-testid={`button-mark-read-${alert.id}`}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAcknowledge(alert.id)}
                data-testid={`button-acknowledge-${alert.id}`}
              >
                <CheckCircle className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(alert.id)}
                data-testid={`button-delete-${alert.id}`}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Demo data functions
function getDemoAlertsData() {
  return {
    data: [
      {
        id: 'alert_1',
        alertType: 'performance_drop' as const,
        message: 'Nike sales dropped by 25% compared to last week. Revenue fell from $15,450 to $11,590.',
        thresholdValue: 20,
        currentValue: 25,
        severity: 'high' as const,
        vendorId: 'vendor_1',
        vendorName: 'Nike',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        isRead: false
      },
      {
        id: 'alert_2',
        alertType: 'inventory_low' as const,
        message: 'Adidas running shoes inventory is critically low. Only 5 units remaining across 3 popular products.',
        thresholdValue: 10,
        currentValue: 5,
        severity: 'high' as const,
        vendorId: 'vendor_2',
        vendorName: 'Adidas',
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        isRead: false
      },
      {
        id: 'alert_3',
        alertType: 'performance_spike' as const,
        message: 'Under Armour experienced a 40% increase in sales over the past 3 days. Consider increasing inventory.',
        thresholdValue: 30,
        currentValue: 40,
        severity: 'medium' as const,
        vendorId: 'vendor_3',
        vendorName: 'Under Armour',
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        isRead: true
      },
      {
        id: 'alert_4',
        alertType: 'sales_trend' as const,
        message: 'Puma products showing consistent upward trend for 7 days straight. Revenue up 18% week-over-week.',
        thresholdValue: 15,
        currentValue: 18,
        severity: 'low' as const,
        vendorId: 'vendor_4',
        vendorName: 'Puma',
        createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        isRead: true
      },
      {
        id: 'alert_5',
        alertType: 'performance_drop' as const,
        message: 'New Balance conversion rate decreased from 3.2% to 2.1% this week.',
        thresholdValue: 15,
        currentValue: 34,
        severity: 'medium' as const,
        vendorId: 'vendor_5',
        vendorName: 'New Balance',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        acknowledgedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        isRead: true
      }
    ],
    pagination: {
      page: 1,
      limit: 10,
      total: 5,
      totalPages: 1,
      hasNext: false,
      hasPrev: false
    }
  };
}

function getDemoStatsData() {
  return {
    totalAlerts: 5,
    activeAlerts: 4,
    highPriorityAlerts: 2,
    resolvedToday: 1,
    newAlertsLast24h: 3
  };
}