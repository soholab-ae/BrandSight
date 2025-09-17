import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Link2, Globe, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

// Demo UTM referral data
const demoReferralData = [
  {
    source: "google",
    medium: "cpc",
    campaign: "summer_sale",
    visitors: 3420,
    revenue: 84500,
    conversionRate: 3.2,
    avgOrderValue: 78.50
  },
  {
    source: "facebook",
    medium: "social",
    campaign: "brand_awareness",
    visitors: 2850,
    revenue: 62300,
    conversionRate: 2.8,
    avgOrderValue: 72.30
  },
  {
    source: "instagram",
    medium: "social",
    campaign: "influencer_collab",
    visitors: 2100,
    revenue: 48900,
    conversionRate: 4.1,
    avgOrderValue: 56.80
  },
  {
    source: "email",
    medium: "newsletter",
    campaign: "weekly_digest",
    visitors: 1890,
    revenue: 45600,
    conversionRate: 5.2,
    avgOrderValue: 46.40
  },
  {
    source: "pinterest",
    medium: "social",
    campaign: "product_pins",
    visitors: 1230,
    revenue: 28700,
    conversionRate: 2.3,
    avgOrderValue: 101.50
  },
  {
    source: "tiktok",
    medium: "social",
    campaign: "viral_challenge",
    visitors: 980,
    revenue: 18900,
    conversionRate: 3.8,
    avgOrderValue: 50.70
  }
];

export default function ReferralSources() {
  // Simulate API call
  const { data: referralData, isLoading } = useQuery({
    queryKey: ['/api/stores/current/referrals'],
    initialData: demoReferralData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const getSourceIcon = (source: string) => {
    switch(source.toLowerCase()) {
      case 'google':
      case 'bing':
      case 'yahoo':
        return <Globe className="h-4 w-4 text-blue-500" />;
      case 'facebook':
      case 'instagram':
      case 'tiktok':
      case 'pinterest':
        return <Users className="h-4 w-4 text-purple-500" />;
      default:
        return <Link2 className="h-4 w-4 text-gray-500" />;
    }
  };

  const getMediumBadgeColor = (medium: string) => {
    switch(medium.toLowerCase()) {
      case 'cpc':
        return 'bg-blue-100 text-blue-800';
      case 'social':
        return 'bg-purple-100 text-purple-800';
      case 'organic':
        return 'bg-green-100 text-green-800';
      case 'email':
      case 'newsletter':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Top Referral Sources (UTM)</CardTitle>
          <CardDescription>Loading referral data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-brand-600" />
              Top Referral Sources (UTM)
            </CardTitle>
            <CardDescription>
              Track where your traffic and sales are coming from
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Source</TableHead>
              <TableHead>Campaign</TableHead>
              <TableHead className="text-right">Visitors</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">Conv. Rate</TableHead>
              <TableHead className="text-right">AOV</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {referralData?.map((item, index) => (
              <TableRow key={`${item.source}-${item.campaign}`}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getSourceIcon(item.source)}
                    <div>
                      <div className="font-medium capitalize">{item.source}</div>
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${getMediumBadgeColor(item.medium)}`}
                      >
                        {item.medium}
                      </Badge>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  {item.campaign.replace(/_/g, ' ')}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {item.visitors.toLocaleString()}
                </TableCell>
                <TableCell className="text-right font-medium">
                  ${item.revenue.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  <span className="text-green-600 font-medium">
                    {item.conversionRate}%
                  </span>
                </TableCell>
                <TableCell className="text-right font-medium">
                  ${item.avgOrderValue.toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {/* Summary Stats */}
        <div className="mt-6 pt-6 border-t border-gray-100">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-600 mb-1">Total Referral Traffic</p>
              <p className="text-lg font-bold text-gray-900">
                {referralData?.reduce((sum, item) => sum + item.visitors, 0).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Referral Revenue</p>
              <p className="text-lg font-bold text-green-600">
                ${referralData?.reduce((sum, item) => sum + item.revenue, 0).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Avg. Conv. Rate</p>
              <p className="text-lg font-bold text-blue-600">
                {(referralData?.reduce((sum, item) => sum + item.conversionRate, 0) / (referralData?.length || 1)).toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Best Performer</p>
              <p className="text-lg font-bold text-purple-600 capitalize">
                {referralData?.[0]?.source || 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}