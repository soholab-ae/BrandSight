import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, Percent, Eye, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface MetricsSummary {
  totalRevenue: number;
  totalOrders: number;
  totalVisitors: number;
  totalConversions: number;
  avgAOV: number;
  avgConversionRate: number;
}

export default function MetricsGrid() {
  const { data: summary, isLoading } = useQuery<MetricsSummary>({
    queryKey: ["/api/stores/current/analytics/summary"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-6">
            <Skeleton className="h-4 w-24 mb-4" />
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-4 w-20" />
          </Card>
        ))}
      </div>
    );
  }

  const metrics = [
    {
      title: "Average Order Value",
      value: summary?.avgAOV ? `$${summary.avgAOV.toFixed(2)}` : "$0.00",
      change: "+12.5%",
      changeType: "positive" as const,
      icon: DollarSign,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      testId: "metric-aov",
    },
    {
      title: "Conversion Rate",
      value: summary?.avgConversionRate ? `${(summary.avgConversionRate * 100).toFixed(2)}%` : "0.00%",
      change: "+0.8%",
      changeType: "positive" as const,
      icon: Percent,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      testId: "metric-conversion-rate",
    },
    {
      title: "Unique Visitors",
      value: summary?.totalVisitors ? summary.totalVisitors.toLocaleString() : "0",
      change: "-2.1%",
      changeType: "negative" as const,
      icon: Eye,
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
      testId: "metric-visitors",
    },
    {
      title: "Total Revenue",
      value: summary?.totalRevenue ? `$${summary.totalRevenue.toLocaleString()}` : "$0",
      change: "+18.2%",
      changeType: "positive" as const,
      icon: TrendingUp,
      iconBg: "bg-shopify-100",
      iconColor: "text-shopify-600",
      testId: "metric-revenue",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <Card key={metric.title} className="shadow-sm border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-600">{metric.title}</h3>
                <div className={`w-8 h-8 ${metric.iconBg} rounded-lg flex items-center justify-center`}>
                  <Icon className={`${metric.iconColor}`} size={16} />
                </div>
              </div>
              <div className="mb-2">
                <span 
                  className="text-2xl font-bold text-gray-900"
                  data-testid={`${metric.testId}-value`}
                >
                  {metric.value}
                </span>
              </div>
              <div className="flex items-center text-sm">
                <span 
                  className={`font-medium ${
                    metric.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                  }`}
                  data-testid={`${metric.testId}-change`}
                >
                  {metric.change}
                </span>
                <span className="text-gray-600 ml-1">vs last period</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
