import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import AppHeader from "@/components/AppHeader";
import Sidebar from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  Bell, 
  Mail, 
  Clock,
  Moon,
  Save,
  Settings,
  InfoIcon,
  CheckCircle,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Package,
  Activity,
  MessageSquare,
  Volume,
  VolumeX,
  Smartphone,
  Monitor
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Notification preferences schema
const notificationPreferencesSchema = z.object({
  enableInAppNotifications: z.boolean(),
  inAppSeverityFilter: z.array(z.enum(['high', 'medium', 'low'])),
  enableEmailNotifications: z.boolean(),
  emailAddress: z.string().email().optional(),
  emailFrequency: z.enum(['immediate', 'hourly', 'daily', 'weekly', 'never']),
  emailSeverityFilter: z.array(z.enum(['high', 'medium', 'low'])),
  enableCriticalEmailAlerts: z.boolean(),
  enableDailyDigest: z.boolean(),
  enableWeeklyDigest: z.boolean(),
  doNotDisturbStart: z.string().optional(),
  doNotDisturbEnd: z.string().optional(),
  doNotDisturbTimezone: z.string().optional(),
  alertTypePreferences: z.object({
    performance_drop: z.boolean(),
    performance_spike: z.boolean(),
    inventory_low: z.boolean(),
    sales_trend: z.boolean()
  }),
  soundEnabled: z.boolean(),
  desktopNotifications: z.boolean(),
  mobileNotifications: z.boolean()
});

type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;

const alertTypeLabels = {
  performance_drop: {
    label: 'Performance Drop Alerts',
    description: 'When vendor sales or performance metrics decline significantly',
    icon: TrendingDown,
    color: 'text-red-600'
  },
  performance_spike: {
    label: 'Performance Spike Alerts',
    description: 'When vendor sales or performance metrics increase dramatically',
    icon: TrendingUp,
    color: 'text-green-600'
  },
  inventory_low: {
    label: 'Low Inventory Alerts',
    description: 'When product inventory levels become critically low',
    icon: Package,
    color: 'text-orange-600'
  },
  sales_trend: {
    label: 'Sales Trend Alerts',
    description: 'Notable changes in sales patterns and trends',
    icon: Activity,
    color: 'text-blue-600'
  }
};

const emailFrequencyOptions = [
  { value: 'immediate', label: 'Immediate', description: 'Send emails as soon as alerts are generated' },
  { value: 'hourly', label: 'Hourly Digest', description: 'Bundle alerts into hourly summary emails' },
  { value: 'daily', label: 'Daily Digest', description: 'Send one daily summary of all alerts' },
  { value: 'weekly', label: 'Weekly Digest', description: 'Send weekly summary reports' },
  { value: 'never', label: 'Never', description: 'Disable all email notifications' }
];

const timezoneOptions = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Central European Time (CET)' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET)' }
];

export default function NotificationPreferencesPage() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Check if using demo data
  const { data: stores } = useQuery({
    queryKey: ['/api/stores'],
    enabled: isAuthenticated
  });
  
  const isDemoMode = !stores || !Array.isArray(stores) || stores.length === 0 || stores[0]?.id === 'demo_store_1';

  // Fetch current notification preferences
  const { data: preferences, isLoading: preferencesLoading } = useQuery({
    queryKey: ['/api/notifications/preferences'],
    enabled: isAuthenticated,
    initialData: getDemoPreferences()
  });

  // Initialize form with current preferences
  const form = useForm<NotificationPreferences>({
    resolver: zodResolver(notificationPreferencesSchema),
    defaultValues: preferences || getDemoPreferences()
  });

  // Watch for form changes
  const watchedValues = form.watch();

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: (data: NotificationPreferences) => 
      apiRequest('PUT', '/api/notifications/preferences', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/preferences'] });
      setHasUnsavedChanges(false);
      toast({
        title: "Preferences updated",
        description: "Your notification preferences have been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error updating preferences",
        description: "There was a problem saving your preferences. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Test notification mutation
  const testNotificationMutation = useMutation({
    mutationFn: (type: 'email' | 'in-app') => 
      apiRequest('POST', '/api/notifications/test', { type }),
    onSuccess: (_, type) => {
      toast({
        title: "Test notification sent",
        description: `A test ${type} notification has been sent successfully.`,
      });
    }
  });

  const onSubmit = (data: NotificationPreferences) => {
    updatePreferencesMutation.mutate(data);
  };

  const handleTestNotification = (type: 'email' | 'in-app') => {
    testNotificationMutation.mutate(type);
  };

  // Handle permission requests for browser notifications
  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        toast({
          title: "Desktop notifications enabled",
          description: "You'll now receive desktop notifications for important alerts.",
        });
      }
    }
  };

  if (isLoading || preferencesLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-brand-600 mx-auto mb-4"></div>
          <h2 className="text-lg font-medium text-gray-900">Loading preferences...</h2>
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
                <strong>Demo Mode:</strong> You're viewing sample notification preferences. 
                <a href="/setup" className="underline ml-1 text-brand-700 hover:text-brand-900">
                  Connect your Shopify store
                </a> to access real notification settings.
              </AlertDescription>
            </Alert>
          )}

          {/* Unsaved Changes Alert */}
          {hasUnsavedChanges && (
            <Alert className="mb-6 bg-yellow-50 border-yellow-200" data-testid="unsaved-changes-alert">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                You have unsaved changes. Don't forget to save your notification preferences.
              </AlertDescription>
            </Alert>
          )}
          
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2" data-testid="text-page-title">
                  Notification Preferences
                </h1>
                <p className="text-gray-600" data-testid="text-page-description">
                  Customize how and when you receive notifications about your business alerts
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  onClick={() => handleTestNotification('in-app')}
                  disabled={testNotificationMutation.isPending}
                  data-testid="button-test-notification"
                >
                  <Bell className="mr-2 h-4 w-4" />
                  Test Notification
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleTestNotification('email')}
                  disabled={testNotificationMutation.isPending}
                  data-testid="button-test-email"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Test Email
                </Button>
              </div>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <Tabs defaultValue="in-app" className="space-y-6">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="in-app" data-testid="tab-in-app">
                    <Bell className="mr-2 h-4 w-4" />
                    In-App
                  </TabsTrigger>
                  <TabsTrigger value="email" data-testid="tab-email">
                    <Mail className="mr-2 h-4 w-4" />
                    Email
                  </TabsTrigger>
                  <TabsTrigger value="alert-types" data-testid="tab-alert-types">
                    <Settings className="mr-2 h-4 w-4" />
                    Alert Types
                  </TabsTrigger>
                  <TabsTrigger value="advanced" data-testid="tab-advanced">
                    <Clock className="mr-2 h-4 w-4" />
                    Advanced
                  </TabsTrigger>
                </TabsList>

                {/* In-App Notifications Tab */}
                <TabsContent value="in-app" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Smartphone className="h-5 w-5" />
                        In-App Notification Settings
                      </CardTitle>
                      <CardDescription>
                        Control how notifications appear within the BrandSight application
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <FormField
                        control={form.control}
                        name="enableInAppNotifications"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Enable In-App Notifications</FormLabel>
                              <FormDescription>
                                Show notifications in the notification bell and center
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={(checked) => {
                                  field.onChange(checked);
                                  setHasUnsavedChanges(true);
                                }}
                                data-testid="switch-enable-in-app"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="soundEnabled"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base flex items-center gap-2">
                                {field.value ? <Volume className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                                Notification Sounds
                              </FormLabel>
                              <FormDescription>
                                Play a sound when new notifications arrive
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={(checked) => {
                                  field.onChange(checked);
                                  setHasUnsavedChanges(true);
                                }}
                                data-testid="switch-sound-enabled"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="desktopNotifications"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base flex items-center gap-2">
                                <Monitor className="h-4 w-4" />
                                Desktop Notifications
                              </FormLabel>
                              <FormDescription>
                                Show browser notifications even when BrandSight is not active
                              </FormDescription>
                            </div>
                            <div className="flex items-center gap-2">
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={(checked) => {
                                    field.onChange(checked);
                                    setHasUnsavedChanges(true);
                                    if (checked) {
                                      requestNotificationPermission();
                                    }
                                  }}
                                  data-testid="switch-desktop-notifications"
                                />
                              </FormControl>
                            </div>
                          </FormItem>
                        )}
                      />

                      <div className="space-y-4">
                        <Label className="text-base font-medium">In-App Severity Filter</Label>
                        <FormDescription>
                          Choose which severity levels to show in the notification center
                        </FormDescription>
                        <div className="space-y-3">
                          {(['high', 'medium', 'low'] as const).map((severity) => (
                            <FormField
                              key={severity}
                              control={form.control}
                              name="inAppSeverityFilter"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                  <FormControl>
                                    <input
                                      type="checkbox"
                                      checked={field.value?.includes(severity) || false}
                                      onChange={(e) => {
                                        const updatedValue = e.target.checked
                                          ? [...(field.value || []), severity]
                                          : (field.value || []).filter(v => v !== severity);
                                        field.onChange(updatedValue);
                                        setHasUnsavedChanges(true);
                                      }}
                                      className="mt-1"
                                      data-testid={`checkbox-in-app-severity-${severity}`}
                                    />
                                  </FormControl>
                                  <FormLabel className="flex items-center gap-2 cursor-pointer">
                                    <Badge 
                                      variant={severity === 'high' ? 'destructive' : severity === 'medium' ? 'default' : 'secondary'}
                                      className="text-xs"
                                    >
                                      {severity.toUpperCase()}
                                    </Badge>
                                    {severity === 'high' && 'Critical alerts requiring immediate attention'}
                                    {severity === 'medium' && 'Important alerts that should be reviewed soon'}
                                    {severity === 'low' && 'Informational alerts and updates'}
                                  </FormLabel>
                                </FormItem>
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Email Notifications Tab */}
                <TabsContent value="email" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Mail className="h-5 w-5" />
                        Email Notification Settings
                      </CardTitle>
                      <CardDescription>
                        Configure email delivery preferences and frequency
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <FormField
                        control={form.control}
                        name="enableEmailNotifications"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Enable Email Notifications</FormLabel>
                              <FormDescription>
                                Receive notifications via email
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={(checked) => {
                                  field.onChange(checked);
                                  setHasUnsavedChanges(true);
                                }}
                                data-testid="switch-enable-email"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="emailAddress"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="your.email@example.com"
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e);
                                  setHasUnsavedChanges(true);
                                }}
                                data-testid="input-email-address"
                              />
                            </FormControl>
                            <FormDescription>
                              Where to send your notification emails
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="emailFrequency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Frequency</FormLabel>
                            <Select 
                              value={field.value} 
                              onValueChange={(value) => {
                                field.onChange(value);
                                setHasUnsavedChanges(true);
                              }}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-email-frequency">
                                  <SelectValue placeholder="Select frequency" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {emailFrequencyOptions.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    <div>
                                      <div className="font-medium">{option.label}</div>
                                      <div className="text-sm text-gray-500">{option.description}</div>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              How often to receive email notifications
                            </FormDescription>
                          </FormItem>
                        )}
                      />

                      <Separator />

                      <div className="space-y-4">
                        <Label className="text-base font-medium">Email Severity Filter</Label>
                        <FormDescription>
                          Choose which severity levels to include in email notifications
                        </FormDescription>
                        <div className="space-y-3">
                          {(['high', 'medium', 'low'] as const).map((severity) => (
                            <FormField
                              key={severity}
                              control={form.control}
                              name="emailSeverityFilter"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                  <FormControl>
                                    <input
                                      type="checkbox"
                                      checked={field.value?.includes(severity) || false}
                                      onChange={(e) => {
                                        const updatedValue = e.target.checked
                                          ? [...(field.value || []), severity]
                                          : (field.value || []).filter(v => v !== severity);
                                        field.onChange(updatedValue);
                                        setHasUnsavedChanges(true);
                                      }}
                                      className="mt-1"
                                      data-testid={`checkbox-email-severity-${severity}`}
                                    />
                                  </FormControl>
                                  <FormLabel className="flex items-center gap-2 cursor-pointer">
                                    <Badge 
                                      variant={severity === 'high' ? 'destructive' : severity === 'medium' ? 'default' : 'secondary'}
                                      className="text-xs"
                                    >
                                      {severity.toUpperCase()}
                                    </Badge>
                                    {severity === 'high' && 'Critical alerts requiring immediate attention'}
                                    {severity === 'medium' && 'Important alerts that should be reviewed soon'}
                                    {severity === 'low' && 'Informational alerts and updates'}
                                  </FormLabel>
                                </FormItem>
                              )}
                            />
                          ))}
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <Label className="text-base font-medium">Email Digest Options</Label>
                        
                        <FormField
                          control={form.control}
                          name="enableCriticalEmailAlerts"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                              <div className="space-y-0.5">
                                <FormLabel className="text-sm">Critical Alert Emails</FormLabel>
                                <FormDescription className="text-xs">
                                  Send immediate emails for high-severity alerts
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={(checked) => {
                                    field.onChange(checked);
                                    setHasUnsavedChanges(true);
                                  }}
                                  data-testid="switch-critical-email-alerts"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="enableDailyDigest"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                              <div className="space-y-0.5">
                                <FormLabel className="text-sm">Daily Digest</FormLabel>
                                <FormDescription className="text-xs">
                                  Daily summary of all notifications
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={(checked) => {
                                    field.onChange(checked);
                                    setHasUnsavedChanges(true);
                                  }}
                                  data-testid="switch-daily-digest"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="enableWeeklyDigest"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                              <div className="space-y-0.5">
                                <FormLabel className="text-sm">Weekly Digest</FormLabel>
                                <FormDescription className="text-xs">
                                  Weekly summary and analytics report
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={(checked) => {
                                    field.onChange(checked);
                                    setHasUnsavedChanges(true);
                                  }}
                                  data-testid="switch-weekly-digest"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Alert Types Tab */}
                <TabsContent value="alert-types" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Alert Type Preferences
                      </CardTitle>
                      <CardDescription>
                        Choose which types of business alerts you want to receive
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {Object.entries(alertTypeLabels).map(([key, config]) => (
                        <FormField
                          key={key}
                          control={form.control}
                          name={`alertTypePreferences.${key as keyof typeof alertTypeLabels}`}
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base flex items-center gap-2">
                                  <config.icon className={`h-4 w-4 ${config.color}`} />
                                  {config.label}
                                </FormLabel>
                                <FormDescription>
                                  {config.description}
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={(checked) => {
                                    field.onChange(checked);
                                    setHasUnsavedChanges(true);
                                  }}
                                  data-testid={`switch-alert-type-${key}`}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      ))}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Advanced Settings Tab */}
                <TabsContent value="advanced" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Moon className="h-5 w-5" />
                        Do Not Disturb Settings
                      </CardTitle>
                      <CardDescription>
                        Set quiet hours when you don't want to receive notifications
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="doNotDisturbStart"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Start Time</FormLabel>
                              <FormControl>
                                <Input
                                  type="time"
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(e);
                                    setHasUnsavedChanges(true);
                                  }}
                                  data-testid="input-dnd-start"
                                />
                              </FormControl>
                              <FormDescription>
                                When to start quiet hours
                              </FormDescription>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="doNotDisturbEnd"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>End Time</FormLabel>
                              <FormControl>
                                <Input
                                  type="time"
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(e);
                                    setHasUnsavedChanges(true);
                                  }}
                                  data-testid="input-dnd-end"
                                />
                              </FormControl>
                              <FormDescription>
                                When to end quiet hours
                              </FormDescription>
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="doNotDisturbTimezone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Timezone</FormLabel>
                            <Select 
                              value={field.value} 
                              onValueChange={(value) => {
                                field.onChange(value);
                                setHasUnsavedChanges(true);
                              }}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-timezone">
                                  <SelectValue placeholder="Select timezone" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {timezoneOptions.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Timezone for do not disturb hours
                            </FormDescription>
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Mobile Notifications</CardTitle>
                      <CardDescription>
                        Settings for mobile app notifications (when available)
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <FormField
                        control={form.control}
                        name="mobileNotifications"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base flex items-center gap-2">
                                <Smartphone className="h-4 w-4" />
                                Mobile Push Notifications
                              </FormLabel>
                              <FormDescription>
                                Enable notifications on mobile devices
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={(checked) => {
                                  field.onChange(checked);
                                  setHasUnsavedChanges(true);
                                }}
                                data-testid="switch-mobile-notifications"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              {/* Save Button */}
              <div className="flex items-center justify-between pt-6 border-t">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  {hasUnsavedChanges && (
                    <>
                      <InfoIcon className="h-4 w-4" />
                      You have unsaved changes
                    </>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      form.reset(preferences);
                      setHasUnsavedChanges(false);
                    }}
                    disabled={!hasUnsavedChanges}
                    data-testid="button-reset"
                  >
                    Reset
                  </Button>
                  <Button
                    type="submit"
                    disabled={updatePreferencesMutation.isPending || !hasUnsavedChanges}
                    data-testid="button-save-preferences"
                  >
                    {updatePreferencesMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Preferences
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </main>
      </div>
    </div>
  );
}

// Demo data function
function getDemoPreferences(): NotificationPreferences {
  return {
    enableInAppNotifications: true,
    inAppSeverityFilter: ['high', 'medium', 'low'],
    enableEmailNotifications: true,
    emailAddress: 'demo@example.com',
    emailFrequency: 'immediate',
    emailSeverityFilter: ['high', 'medium'],
    enableCriticalEmailAlerts: true,
    enableDailyDigest: false,
    enableWeeklyDigest: true,
    doNotDisturbStart: '22:00',
    doNotDisturbEnd: '08:00',
    doNotDisturbTimezone: 'America/New_York',
    alertTypePreferences: {
      performance_drop: true,
      performance_spike: true,
      inventory_low: true,
      sales_trend: true
    },
    soundEnabled: true,
    desktopNotifications: true,
    mobileNotifications: true
  };
}