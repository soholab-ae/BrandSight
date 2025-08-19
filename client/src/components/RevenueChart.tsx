import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, TrendingUp } from "lucide-react";

export default function RevenueChart() {
  return (
    <Card className="shadow-sm border border-gray-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">
            Revenue Trend by Vendor
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600">
            <MoreHorizontal size={18} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Chart placeholder */}
        <div 
          className="h-64 bg-gray-50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-200"
          data-testid="chart-revenue-placeholder"
        >
          <div className="text-center">
            <TrendingUp className="text-gray-400 mx-auto mb-2" size={32} />
            <p className="text-gray-500 text-sm max-w-xs">
              Revenue trend chart will be implemented with Chart.js showing vendor performance over time
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
