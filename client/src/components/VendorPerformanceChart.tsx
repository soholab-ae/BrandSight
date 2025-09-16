import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DateRange } from "react-day-picker";
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  TooltipProps 
} from "recharts";
import { TrendingUp, TrendingDown, BarChart3, Activity } from "lucide-react";

interface VendorPerformanceData {
  date: string;
  nike: { revenue: number; aov: number; conversion: number; };
  adidas: { revenue: number; aov: number; conversion: number; };
  puma: { revenue: number; aov: number; conversion: number; };
  underArmour: { revenue: number; aov: number; conversion: number; };
}

type MetricType = 'revenue' | 'aov' | 'conversion';

interface VendorPerformanceChartProps {
  dateRange?: DateRange;
}

export default function VendorPerformanceChart({ dateRange }: VendorPerformanceChartProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('revenue');
  const [chartType, setChartType] = useState<'line' | 'area'>('area');

  // Mock time series data - in production this would come from your API
  const performanceData: VendorPerformanceData[] = [
    {
      date: '2024-08-15',
      nike: { revenue: 12500, aov: 125.5, conversion: 3.8 },
      adidas: { revenue: 9800, aov: 110.2, conversion: 3.2 },
      puma: { revenue: 6200, aov: 89.1, conversion: 2.9 },
      underArmour: { revenue: 3400, aov: 78.5, conversion: 2.5 }
    },
    {
      date: '2024-08-22',
      nike: { revenue: 14200, aov: 128.3, conversion: 4.1 },
      adidas: { revenue: 11100, aov: 115.8, conversion: 3.5 },
      puma: { revenue: 7800, aov: 92.4, conversion: 3.1 },
      underArmour: { revenue: 4100, aov: 82.1, conversion: 2.8 }
    },
    {
      date: '2024-08-29',
      nike: { revenue: 15800, aov: 132.1, conversion: 4.3 },
      adidas: { revenue: 10500, aov: 112.5, conversion: 3.4 },
      puma: { revenue: 6900, aov: 88.9, conversion: 2.8 },
      underArmour: { revenue: 3800, aov: 79.8, conversion: 2.6 }
    },
    {
      date: '2024-09-05',
      nike: { revenue: 18200, aov: 138.7, conversion: 4.5 },
      adidas: { revenue: 12800, aov: 119.3, conversion: 3.7 },
      puma: { revenue: 8500, aov: 95.2, conversion: 3.2 },
      underArmour: { revenue: 4500, aov: 85.4, conversion: 2.9 }
    },
    {
      date: '2024-09-12',
      nike: { revenue: 16900, aov: 135.2, conversion: 4.2 },
      adidas: { revenue: 11900, aov: 116.7, conversion: 3.6 },
      puma: { revenue: 7700, aov: 91.8, conversion: 3.0 },
      underArmour: { revenue: 4200, aov: 83.2, conversion: 2.7 }
    }
  ];

  const vendorColors = {
    nike: '#dc2626', // red
    adidas: '#2563eb', // blue  
    puma: '#f59e0b', // amber
    underArmour: '#6b7280' // gray
  };

  // Filter data based on date range
  const filteredData = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return performanceData;
    
    return performanceData.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate >= dateRange.from! && itemDate <= dateRange.to!;
    });
  }, [dateRange]);

  const formatChartData = () => {
    return filteredData.map(item => ({
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      Nike: item.nike[selectedMetric],
      Adidas: item.adidas[selectedMetric],
      Puma: item.puma[selectedMetric],
      'Under Armour': item.underArmour[selectedMetric]
    }));
  };

  const formatTooltipValue = (value: number) => {
    switch (selectedMetric) {
      case 'revenue':
        return `$${value.toLocaleString()}`;
      case 'aov':
        return `$${value.toFixed(2)}`;
      case 'conversion':
        return `${value.toFixed(1)}%`;
      default:
        return value.toString();
    }
  };

  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-md">
          <p className="font-medium text-gray-900 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-600">{entry.dataKey}:</span>
              <span className="font-medium">{formatTooltipValue(entry.value || 0)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const getMetricInfo = () => {
    switch (selectedMetric) {
      case 'revenue':
        return { title: 'Revenue Trends', icon: TrendingUp, unit: '$' };
      case 'aov':
        return { title: 'Average Order Value', icon: BarChart3, unit: '$' };
      case 'conversion':
        return { title: 'Conversion Rates', icon: Activity, unit: '%' };
    }
  };

  const metricInfo = getMetricInfo();
  const Icon = metricInfo.icon;

  return (
    <Card className="shadow-sm border border-gray-200">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-brand-600" />
            <CardTitle className="text-lg font-semibold text-gray-900">
              {metricInfo.title} by Vendor
            </CardTitle>
          </div>
          
          {/* Chart Controls */}
          <div className="flex flex-wrap gap-2">
            {/* Metric Selector */}
            <div className="flex gap-1">
              <Button
                variant={selectedMetric === 'revenue' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedMetric('revenue')}
                className={selectedMetric === 'revenue' ? 'bg-brand-600 hover:bg-brand-700' : ''}
                data-testid="button-metric-revenue"
              >
                Revenue
              </Button>
              <Button
                variant={selectedMetric === 'aov' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedMetric('aov')}
                className={selectedMetric === 'aov' ? 'bg-brand-600 hover:bg-brand-700' : ''}
                data-testid="button-metric-aov"
              >
                AOV
              </Button>
              <Button
                variant={selectedMetric === 'conversion' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedMetric('conversion')}
                className={selectedMetric === 'conversion' ? 'bg-brand-600 hover:bg-brand-700' : ''}
                data-testid="button-metric-conversion"
              >
                Conversion
              </Button>
            </div>
            
            {/* Chart Type Toggle */}
            <div className="flex gap-1">
              <Button
                variant={chartType === 'area' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('area')}
                className={chartType === 'area' ? 'bg-gray-600 hover:bg-gray-700' : ''}
                data-testid="button-chart-area"
              >
                Area
              </Button>
              <Button
                variant={chartType === 'line' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('line')}
                className={chartType === 'line' ? 'bg-gray-600 hover:bg-gray-700' : ''}
                data-testid="button-chart-line"
              >
                Line
              </Button>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-4">
          {Object.entries(vendorColors).map(([vendor, color]) => (
            <div key={vendor} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: color }}
              />
              <span className="text-sm font-medium text-gray-700 capitalize">
                {vendor === 'underArmour' ? 'Under Armour' : vendor}
              </span>
            </div>
          ))}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'area' ? (
              <AreaChart data={formatChartData()} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis 
                  dataKey="date" 
                  stroke="#6b7280" 
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis 
                  stroke="#6b7280" 
                  fontSize={12}
                  tickLine={false}
                  tickFormatter={(value) => selectedMetric === 'revenue' ? `$${(value / 1000).toFixed(0)}k` : value.toString()}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="Nike"
                  stackId="1"
                  stroke={vendorColors.nike}
                  fill={vendorColors.nike}
                  fillOpacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="Adidas"
                  stackId="1"
                  stroke={vendorColors.adidas}
                  fill={vendorColors.adidas}
                  fillOpacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="Puma"
                  stackId="1"
                  stroke={vendorColors.puma}
                  fill={vendorColors.puma}
                  fillOpacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="Under Armour"
                  stackId="1"
                  stroke={vendorColors.underArmour}
                  fill={vendorColors.underArmour}
                  fillOpacity={0.6}
                />
              </AreaChart>
            ) : (
              <LineChart data={formatChartData()} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis 
                  dataKey="date" 
                  stroke="#6b7280" 
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis 
                  stroke="#6b7280" 
                  fontSize={12}
                  tickLine={false}
                  tickFormatter={(value) => selectedMetric === 'revenue' ? `$${(value / 1000).toFixed(0)}k` : value.toString()}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="Nike"
                  stroke={vendorColors.nike}
                  strokeWidth={3}
                  dot={{ r: 4, fill: vendorColors.nike }}
                />
                <Line
                  type="monotone"
                  dataKey="Adidas"
                  stroke={vendorColors.adidas}
                  strokeWidth={3}
                  dot={{ r: 4, fill: vendorColors.adidas }}
                />
                <Line
                  type="monotone"
                  dataKey="Puma"
                  stroke={vendorColors.puma}
                  strokeWidth={3}
                  dot={{ r: 4, fill: vendorColors.puma }}
                />
                <Line
                  type="monotone"
                  dataKey="Under Armour"
                  stroke={vendorColors.underArmour}
                  strokeWidth={3}
                  dot={{ r: 4, fill: vendorColors.underArmour }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-200">
          {['Nike', 'Adidas', 'Puma', 'Under Armour'].map((vendor) => {
            if (filteredData.length < 2) {
              return (
                <div key={vendor} className="text-center">
                  <p className="text-sm font-medium text-gray-900">{vendor}</p>
                  <p className="text-lg font-bold text-gray-700">
                    {formatTooltipValue((filteredData[0]?.[vendor.toLowerCase().replace(' ', '') as keyof Omit<VendorPerformanceData, 'date'>] as any)?.[selectedMetric] || 0)}
                  </p>
                  <Badge variant="secondary">No comparison</Badge>
                </div>
              );
            }

            const latestData = filteredData[filteredData.length - 1];
            const previousData = filteredData[filteredData.length - 2];
            
            const vendorKey = vendor.toLowerCase().replace(' ', '') as keyof Omit<VendorPerformanceData, 'date'>;
            const currentValue = (latestData[vendorKey] as any)[selectedMetric];
            const previousValue = (previousData[vendorKey] as any)[selectedMetric];
            
            // Handle divide by zero and null values
            let change = 0;
            if (previousValue && previousValue !== 0) {
              change = ((currentValue - previousValue) / previousValue) * 100;
            }
            
            return (
              <div key={vendor} className="text-center">
                <p className="text-sm font-medium text-gray-900">{vendor}</p>
                <p className="text-lg font-bold text-gray-700">
                  {formatTooltipValue(currentValue)}
                </p>
                <Badge 
                  variant={change >= 0 ? "default" : "destructive"}
                  className={change >= 0 ? "bg-green-100 text-green-800 hover:bg-green-200" : ""}
                >
                  {change >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                  {Math.abs(change).toFixed(1)}%
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}