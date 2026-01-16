/**
 * KPI Cards Component - Redesigned with Separated Metrics
 *
 * Two distinct metric categories:
 * 1. 방문자 지표 (Visitor Metrics) - Session-based from Redis
 *    - Counts all authenticated visits
 *    - May include same user across multiple sessions
 *
 * 2. 참여자 지표 (Engagement Metrics) - Action-based from audit_logs
 *    - Counts users who took meaningful actions
 *    - Match generation, profile completion, etc.
 *
 * This separation eliminates cognitive dissonance from mixing different metric definitions.
 */

'use client';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Users,
  TrendingUp,
  Activity,
  Percent,
  ArrowUp,
  ArrowDown,
  Minus,
  Info,
  Eye,
  Target,
} from 'lucide-react';
import { SummaryStats, EngagementStats, RealtimeStats, VisitorStats } from '../hooks/useStatisticsData';

interface KPICardsProps {
  summary: SummaryStats;
  visitors: VisitorStats;     // NEW: Session-based visitor metrics
  engagement: EngagementStats;
  realtime: RealtimeStats;
  startDate: string;
  endDate: string;
}

export default function KPICards({
  summary,
  visitors,
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
    <TooltipProvider>
      <div className="space-y-6">
        {/* ================================================== */}
        {/* SECTION 1: 방문자 지표 (Visitor Metrics) - Session-based */}
        {/* ================================================== */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Eye className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-700">방문자 지표</h3>
            <Badge className="bg-blue-100 text-blue-700 border-0">세션 기반</Badge>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <p className="text-sm">
                  로그인한 모든 사용자를 세션 기반으로 집계합니다.
                  한 사용자가 여러 기기에서 접속하면 중복 카운트될 수 있습니다.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Today's Visitors Card */}
            <Card className="border-blue-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  오늘 방문자
                </CardTitle>
                <Users className="h-5 w-5 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {visitors.todayVisitors.toLocaleString()}
                </div>
                <p className="text-xs text-gray-500 mt-1">로그인 세션 수</p>
              </CardContent>
            </Card>

            {/* Average Daily Visitors Card */}
            <Card className="border-blue-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  평균 일일 방문자
                </CardTitle>
                <Activity className="h-5 w-5 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">
                  {visitors.avgDailyVisitors.toFixed(1)}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={`${trend.bgColor} ${trend.color} border-0 px-2 py-0.5`}>
                    <TrendIcon className="h-3 w-3 inline mr-1" />
                    {trend.label}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Peak Visitors Card */}
            <Card className="border-blue-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  최고 일일 방문자
                </CardTitle>
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">
                  {visitors.peakVisitors.toLocaleString()}
                </div>
                <p className="text-xs text-gray-500 mt-1">{visitors.peakDate}</p>
              </CardContent>
            </Card>

            {/* Total Sessions Card */}
            <Card className="border-blue-200">
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
        </div>

        {/* ================================================== */}
        {/* SECTION 2: 참여자 지표 (Engagement Metrics) - Action-based */}
        {/* ================================================== */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-5 w-5 text-indigo-600" />
            <h3 className="text-lg font-semibold text-gray-700">참여자 지표</h3>
            <Badge className="bg-indigo-100 text-indigo-700 border-0">행동 기반</Badge>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <p className="text-sm">
                  매칭 생성, 프로그램 저장, 프로필 완성, 컨설팅 신청 등
                  핵심 행동을 수행한 고유 사용자만 집계합니다.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Today's Engaged Users Card */}
            <Card className="border-indigo-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  오늘 참여자
                </CardTitle>
                <Activity className="h-5 w-5 text-indigo-600 animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-indigo-600">
                  {realtime.engagedUsers.toLocaleString()}
                </div>
                <p className="text-xs text-gray-500 mt-1">매칭/저장 등 행동 수행</p>
              </CardContent>
            </Card>

            {/* MAU Card */}
            <Card className="border-indigo-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  월간 참여자 (MAU)
                </CardTitle>
                <Users className="h-5 w-5 text-indigo-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-indigo-600">
                  {engagement.mau.toLocaleString()}
                </div>
                <p className="text-xs text-gray-500 mt-1">최근 30일 기준</p>
              </CardContent>
            </Card>

            {/* DAU/MAU Ratio Card */}
            <Card className="border-indigo-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  참여 고착도
                </CardTitle>
                <Percent className="h-5 w-5 text-indigo-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-indigo-600">
                  {engagement.ratio.toFixed(1)}%
                </div>
                <Badge
                  className={`mt-1 ${
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
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ================================================== */}
        {/* SECTION 3: DAU/MAU Explanation Card */}
        {/* ================================================== */}
        <Card className="border-indigo-200 bg-indigo-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Percent className="h-5 w-5 text-indigo-600" />
              참여자 고착도 (DAU/MAU)
            </CardTitle>
            <CardDescription>
              실제 행동을 수행한 사용자 기준의 SaaS 업계 표준 지표
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">DAU (오늘 참여자)</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {engagement.dau.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">MAU (30일 참여자)</p>
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

            {/* Explanation box */}
            <div className="mt-4 p-3 bg-white rounded-lg border border-indigo-100">
              <p className="text-xs text-gray-600">
                <strong>참여 행동 기준:</strong> 매칭 생성, 프로그램 저장, 프로필 수정,
                컨설팅 신청 등 실제 플랫폼 기능을 사용한 사용자만 집계됩니다.
                단순 페이지 방문은 포함되지 않습니다.
              </p>
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

        {/* ================================================== */}
        {/* SECTION 4: Today's Page Views Card */}
        {/* ================================================== */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600 animate-pulse" />
              실시간 페이지 뷰 (오늘)
            </CardTitle>
            <CardDescription>
              오늘 발생한 전체 페이지 조회 수
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">방문자 페이지 뷰</p>
                <p className="text-2xl font-bold text-blue-600">
                  {visitors.totalPageViews.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">Redis 실시간 집계</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">참여자 페이지 뷰</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {realtime.totalPageViews.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">audit_logs 기록</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
