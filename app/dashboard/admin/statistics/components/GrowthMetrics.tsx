/**
 * Growth Metrics Component
 *
 * Displays WoW (Week-over-Week) and MoM (Month-over-Month) growth indicators.
 */

'use client';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';
import { GrowthResponse } from '../hooks/useStatisticsData';

interface GrowthMetricsProps {
  data: GrowthResponse | undefined;
  isLoading: boolean;
  error: Error | null;
}

export default function GrowthMetrics({ data, isLoading, error }: GrowthMetricsProps) {
  // Get trend display properties
  const getTrendDisplay = (trend: 'up' | 'down' | 'stable', rate: number) => {
    if (trend === 'up') {
      return {
        Icon: TrendingUp,
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        borderColor: 'border-green-200',
        label: `+${rate.toFixed(1)}%`,
      };
    } else if (trend === 'down') {
      return {
        Icon: TrendingDown,
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        borderColor: 'border-red-200',
        label: `${rate.toFixed(1)}%`,
      };
    }
    return {
      Icon: Minus,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      borderColor: 'border-gray-200',
      label: '0%',
    };
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">성장 지표</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-lg">성장 지표</CardTitle>
        </CardHeader>
        <CardContent className="py-4 text-center text-red-600">
          성장 지표를 불러올 수 없습니다
        </CardContent>
      </Card>
    );
  }

  const wow = getTrendDisplay(data.wow.trend, data.wow.growthRate);
  const mom = getTrendDisplay(data.mom.trend, data.mom.growthRate);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-emerald-600" />
          성장 지표
        </CardTitle>
        <CardDescription>주간 및 월간 사용자 성장률</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* WoW Growth */}
          <div className={`p-4 rounded-lg ${wow.bgColor} ${wow.borderColor} border`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">주간 성장률 (WoW)</span>
              <wow.Icon className={`h-5 w-5 ${wow.color}`} />
            </div>
            <div className={`text-3xl font-bold ${wow.color}`}>{wow.label}</div>
            <div className="mt-2 text-xs text-gray-600">
              <span className="font-medium">{data.wow.current.toLocaleString()}</span>
              <span className="mx-1">vs</span>
              <span>{data.wow.previous.toLocaleString()}</span>
              <span className="ml-1">지난주</span>
            </div>
          </div>

          {/* MoM Growth */}
          <div className={`p-4 rounded-lg ${mom.bgColor} ${mom.borderColor} border`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">월간 성장률 (MoM)</span>
              <mom.Icon className={`h-5 w-5 ${mom.color}`} />
            </div>
            <div className={`text-3xl font-bold ${mom.color}`}>{mom.label}</div>
            <div className="mt-2 text-xs text-gray-600">
              <span className="font-medium">{data.mom.current.toLocaleString()}</span>
              <span className="mx-1">vs</span>
              <span>{data.mom.previous.toLocaleString()}</span>
              <span className="ml-1">지난달</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
