import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Store, 
  Database, 
  TrendingUp, 
  ArrowRight, 
  RefreshCw, 
  AlertCircle,
  Package,
  Users,
  ShoppingBag,
  BarChart3
} from "lucide-react";

interface EmptyStateProps {
  type: 'no-stores' | 'no-data' | 'syncing' | 'error';
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'secondary';
  };
  showSetupLink?: boolean;
}

export default function EmptyState({ 
  type, 
  title, 
  description, 
  action, 
  showSetupLink = true 
}: EmptyStateProps) {
  const getConfig = () => {
    switch (type) {
      case 'no-stores':
        return {
          icon: Store,
          iconBg: 'bg-brand-100',
          iconColor: 'text-brand-600',
          defaultTitle: 'No Store Connected',
          defaultDescription: 'Connect your Shopify store to start tracking vendor analytics and performance metrics.',
          actionCta: 'Connect Store',
          actionHref: '/setup'
        };
      case 'no-data':
        return {
          icon: Database,
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
          defaultTitle: 'No Data Available',
          defaultDescription: 'Your store is connected, but we need some time to collect and process your analytics data.',
          actionCta: 'Refresh Data',
          actionHref: null
        };
      case 'syncing':
        return {
          icon: RefreshCw,
          iconBg: 'bg-yellow-100',
          iconColor: 'text-yellow-600',
          defaultTitle: 'Data Syncing',
          defaultDescription: 'We\'re importing your store data and generating analytics. This usually takes a few minutes.',
          actionCta: 'View Sync Progress',
          actionHref: '/sync'
        };
      case 'error':
        return {
          icon: AlertCircle,
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          defaultTitle: 'Unable to Load Data',
          defaultDescription: 'There was an issue loading your analytics data. Please try refreshing or check your store connection.',
          actionCta: 'Retry',
          actionHref: null
        };
      default:
        return {
          icon: Database,
          iconBg: 'bg-gray-100',
          iconColor: 'text-gray-600',
          defaultTitle: 'No Data',
          defaultDescription: 'No data available to display.',
          actionCta: 'Refresh',
          actionHref: null
        };
    }
  };

  const config = getConfig();
  const IconComponent = config.icon;
  const finalTitle = title || config.defaultTitle;
  const finalDescription = description || config.defaultDescription;

  const handleAction = () => {
    if (action?.onClick) {
      action.onClick();
    } else if (config.actionHref) {
      window.location.href = config.actionHref;
    }
  };

  return (
    <Card className="border-dashed" data-testid={`empty-state-${type}`}>
      <CardContent className="flex flex-col items-center justify-center text-center p-8">
        <div className={`w-16 h-16 ${config.iconBg} rounded-full flex items-center justify-center mb-6`}>
          <IconComponent 
            className={`w-8 h-8 ${config.iconColor} ${type === 'syncing' ? 'animate-spin' : ''}`} 
          />
        </div>
        
        <h3 className="text-xl font-semibold text-gray-900 mb-3" data-testid="empty-state-title">
          {finalTitle}
        </h3>
        
        <p className="text-gray-600 mb-6 max-w-md" data-testid="empty-state-description">
          {finalDescription}
        </p>

        {type === 'no-stores' && (
          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            <div className="flex items-center space-x-2 text-gray-600" data-testid="feature-vendor-analytics">
              <TrendingUp className="w-4 h-4" />
              <span>Vendor Analytics</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600" data-testid="feature-aov-tracking">
              <BarChart3 className="w-4 h-4" />
              <span>AOV Tracking</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600" data-testid="feature-visitor-insights">
              <Users className="w-4 h-4" />
              <span>Visitor Insights</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600" data-testid="feature-product-performance">
              <ShoppingBag className="w-4 h-4" />
              <span>Product Performance</span>
            </div>
          </div>
        )}

        {action || config.actionHref ? (
          <Button 
            onClick={handleAction}
            variant={action?.variant || 'default'}
            className={action?.variant === 'default' || !action?.variant ? 'bg-brand-600 hover:bg-brand-700' : ''}
            data-testid="empty-state-action"
          >
            {action?.label || config.actionCta}
            {config.actionHref && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>
        ) : null}

        {showSetupLink && type !== 'no-stores' && (
          <div className="mt-4 text-center">
            <button 
              onClick={() => window.location.href = '/setup'}
              className="text-sm text-brand-600 hover:text-brand-700 underline"
              data-testid="link-setup"
            >
              Need to connect a different store?
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Specialized empty state components for specific use cases
export function NoStoresEmptyState() {
  return (
    <EmptyState 
      type="no-stores"
      action={{
        label: "Connect Your Store",
        onClick: () => window.location.href = '/setup'
      }}
      showSetupLink={false}
    />
  );
}

export function NoDataEmptyState({ onRefresh }: { onRefresh?: () => void }) {
  return (
    <EmptyState 
      type="no-data"
      action={onRefresh ? {
        label: "Refresh Data",
        onClick: onRefresh,
        variant: "outline"
      } : undefined}
    />
  );
}

export function SyncingEmptyState() {
  return (
    <EmptyState 
      type="syncing"
      action={{
        label: "View Progress",
        onClick: () => window.location.href = '/sync',
        variant: "outline"
      }}
    />
  );
}

export function ErrorEmptyState({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState 
      type="error"
      action={onRetry ? {
        label: "Try Again",
        onClick: onRetry,
        variant: "outline"
      } : undefined}
    />
  );
}