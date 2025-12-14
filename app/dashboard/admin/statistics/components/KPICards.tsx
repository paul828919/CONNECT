/**
 * KPI Cards Component
 *
 * Displays key performance indicators:
 * - DAU (Daily Active Users)
 * - WAU (Weekly Active Users)
 * - MAU (Monthly Active Users)
 * - DAU/MAU Ratio (Stickiness)
 */

'use client';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  TrendingUp,
  Activity,
  Percent,
  ArrowUp,
  ArrowDown,
  Minus,
} from 'lucide-react';
import { SummaryStats, EngagementStats, RealtimeStats } from '../hooks/useStatisticsData';

interface KPICardsProps {
  summary: SummaryStats;
  engagement: EngagementStats;
  realtime: RealtimeStats;
  startDate: string;
  endDate: string;
}

export default function KPICards({
  summary,
  engagement,
  realtime,
  startDate,
  endDate,
}: KPICardsProps) {
  // Get trend display properties
  const getTrendDisplay = (trend: 'up' | 'down' | 'stable', growthRate: number) => {
    if (trend === 'up') {
      return {
        icon: ArrowUp,
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        label: `${growthRate.toFixed(1)}% 증가`,
      };
    } else if (trend === 'down') {
      return {
        icon: ArrowDown,
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        label: `${Math.abs(growthRate).toFixed(1)}% 감소`,
      };
    }
    return {
      icon: Minus,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      label: '안정',
    };
  };

  const trend = getTrendDisplay(summary.trend, summary.growthRate);
  const TrendIcon = trend.icon;

  return (
    <div className="space-y-6">
      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* DAU Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              DAU (오늘)
            </CardTitle>
            <Users className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {realtime.uniqueUsers.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">실시간 활성 사용자</p>
          </CardContent>
        </Card>

        {/* Average DAU Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              평균 DAU
            </CardTitle>
            <Activity className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {summary.avgDailyUsers.toFixed(1)}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={`${trend.bgColor} ${trend.color} border-0 px-2 py-0.5`}>
                <TrendIcon className="h-3 w-3 inline mr-1" />
                {trend.label}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Peak Users Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              최고 일일 사용자
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {summary.peakUsers.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">{summary.peakDate}</p>
          </CardContent>
        </Card>

        {/* Total Sessions Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              총 활성 세션
            </CardTitle>
            <Users className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {summary.totalUsers.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {startDate} ~ {endDate}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* DAU/MAU Engagement Card */}
      <Card className="border-indigo-200 bg-indigo-50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Percent className="h-5 w-5 text-indigo-600" />
            사용자 참여도 (DAU/MAU)
          </CardTitle>
          <CardDescription>
            사용자 고착도를 측정하는 SaaS 업계 표준 지표
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">DAU (오늘)</p>
              <p className="text-2xl font-bold text-indigo-600">
                {engagement.dau.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">MAU (30일)</p>
              <p className="text-2xl font-bold text-indigo-600">
                {engagement.mau.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">DAU/MAU 비율</p>
              <p className="text-2xl font-bold text-indigo-600">
                {engagement.ratio.toFixed(1)}%
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Badge
              className={`${
                engagement.ratio >= 25
                  ? 'bg-green-100 text-green-700'
                  : engagement.ratio >= 20
                  ? 'bg-blue-100 text-blue-700'
                  : engagement.ratio >= 10
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-red-100 text-red-700'
              } border-0`}
            >
              {engagement.benchmark}
            </Badge>
            <span className="text-xs text-gray-500">업계 기준: 20-25%가 양호</span>
          </div>
        </CardContent>
      </Card>

      {/* Realtime Stats Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600 animate-pulse" />
            실시간 통계 (오늘)
          </CardTitle>
          <CardDescription>{realtime.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">활성 사용자</p>
              <p className="text-2xl font-bold text-blue-600">
                {realtime.uniqueUsers.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">페이지 뷰</p>
              <p className="text-2xl font-bold text-blue-600">
                {realtime.totalPageViews.toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
