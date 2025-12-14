/**
 * Admin User Statistics Dashboard
 *
 * Admin-only dashboard for viewing user activity analytics
 *
 * Features:
 * - Time-series charts (daily, weekly, monthly)
 * - KPI cards (total users, growth rate, peak activity)
 * - Trend indicators with growth percentages
 * - Real-time today's stats
 * - CSV export for offline analysis
 * - Responsive design with Recharts visualizations
 *
 * Data Source: active_user_stats table (populated by cron job)
 */

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-hot-toast';
import {
  Loader2,
  Download,
  TrendingUp,
  TrendingDown,
  Users,
  Eye,
  Activity,
  Calendar,
  ArrowUp,
  ArrowDown,
  Minus,
  Percent,
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format, differenceInDays, subDays } from 'date-fns';

// Types
type TimePeriod = 'daily' | 'weekly' | 'monthly';

interface DataPoint {
  date: string;
  uniqueUsers: number;
  totalPageViews: number;
  avgPageViewsPerUser: number;
}

interface SummaryStats {
  totalUsers: number;
  totalPageViews: number;
  avgDailyUsers: number;
  avgPageViewsPerUser: number;
  peakUsers: number;
  peakDate: string;
  growthRate: number;
  trend: 'up' | 'down' | 'stable';
}

interface AnalyticsResponse {
  period: TimePeriod;
  startDate: string;
  endDate: string;
  dataPoints: DataPoint[];
  summary: SummaryStats;
  realtime: {
    description: string;
    uniqueUsers: number;
    totalPageViews: number;
    date: string;
  };
  engagement: {
    description: string;
    dau: number;
    mau: number;
    ratio: number;
    benchmark: string;
  };
  generatedAt: string;
}

// Preset periods in days
const PRESET_PERIODS = {
  '7': '최근 7일',
  '14': '최근 14일',
  '30': '최근 30일',
  '90': '최근 90일',
  'custom': '사용자 지정',
} as const;

export default function AdminStatisticsDashboard() {
  const [period, setPeriod] = useState<TimePeriod>('daily');
  const [days, setDays] = useState<number>(30);
  const [selectedPreset, setSelectedPreset] = useState<string>('30');
  const [customStartDate, setCustomStartDate] = useState<string>(
    format(subDays(new Date(), 30), 'yyyy-MM-dd')
  );
  const [customEndDate, setCustomEndDate] = useState<string>(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [isExporting, setIsExporting] = useState(false);

  // Handle preset period selection
  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    if (preset !== 'custom') {
      const numDays = parseInt(preset, 10);
      setDays(numDays);
      setCustomStartDate(format(subDays(new Date(), numDays), 'yyyy-MM-dd'));
      setCustomEndDate(format(new Date(), 'yyyy-MM-dd'));
    }
  };

  // Handle custom date range change
  const handleCustomDateChange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const calculatedDays = differenceInDays(endDate, startDate);

    if (calculatedDays > 0 && calculatedDays <= 365) {
      setDays(calculatedDays);
      setCustomStartDate(start);
      setCustomEndDate(end);
    } else {
      toast.error('날짜 범위는 1일에서 365일 사이여야 합니다');
    }
  };

  // Fetch analytics data
  const { data, isLoading, error } = useQuery<AnalyticsResponse>({
    queryKey: ['admin-statistics', period, days],
    queryFn: async () => {
      const res = await fetch(`/api/admin/statistics/users?period=${period}&days=${days}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch statistics');
      }
      return res.json();
    },
    refetchInterval: 60000, // Refetch every minute for real-time stats
  });

  // Export CSV
  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      const res = await fetch(`/api/admin/statistics/users?period=${period}&days=${days}&format=csv`);

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to export CSV');
      }

      // Download CSV file
      const blob = await res.blob();
      const contentDisposition = res.headers.get('Content-Disposition');
      const filename =
        contentDisposition?.split('filename=')[1]?.replace(/"/g, '') ||
        `user-statistics-${period}-${Date.now()}.csv`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('CSV 파일이 다운로드되었습니다');
    } catch (err) {
      console.error('[EXPORT] Error:', err);
      toast.error(err instanceof Error ? err.message : 'CSV 내보내기 실패');
    } finally {
      setIsExporting(false);
    }
  };

  // Format chart data for Recharts
  const chartData = data?.dataPoints.map((d) => ({
    date: d.date,
    '활성 사용자': d.uniqueUsers,
    '페이지 뷰': d.totalPageViews,
    '평균 페이지뷰/사용자': parseFloat(d.avgPageViewsPerUser.toFixed(1)),
  }));

  // Get trend icon and color
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

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">📊 사용자 통계</h1>
            <p className="text-sm text-gray-600 mt-1">
              플랫폼 활성 사용자 분석 및 트렌드 확인
            </p>
          </div>

          {/* Export Button */}
          <Button
            onClick={handleExportCSV}
            disabled={isExporting || isLoading}
            variant="outline"
            className="flex items-center gap-2"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                내보내는 중...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                CSV 다운로드
              </>
            )}
          </Button>
        </div>

        {/* Date Range & Period Selector */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
              {/* Aggregation Period */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600 whitespace-nowrap">집계 단위:</span>
                <div className="flex gap-1">
                  {(['daily', 'weekly', 'monthly'] as TimePeriod[]).map((p) => (
                    <Button
                      key={p}
                      onClick={() => setPeriod(p)}
                      variant={period === p ? 'default' : 'outline'}
                      size="sm"
                    >
                      {p === 'daily' ? '일간' : p === 'weekly' ? '주간' : '월간'}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="hidden lg:block h-8 w-px bg-gray-200" />

              {/* Date Range Presets */}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-600 whitespace-nowrap">기간:</span>
                <div className="flex gap-1 flex-wrap">
                  {Object.entries(PRESET_PERIODS).map(([key, label]) => (
                    <Button
                      key={key}
                      onClick={() => handlePresetChange(key)}
                      variant={selectedPreset === key ? 'default' : 'outline'}
                      size="sm"
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Custom Date Range (visible when custom is selected) */}
              {selectedPreset === 'custom' && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => handleCustomDateChange(e.target.value, customEndDate)}
                    className="w-36 text-sm"
                    max={customEndDate}
                  />
                  <span className="text-gray-500">~</span>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => handleCustomDateChange(customStartDate, e.target.value)}
                    className="w-36 text-sm"
                    min={customStartDate}
                    max={format(new Date(), 'yyyy-MM-dd')}
                  />
                  <span className="text-xs text-gray-500">
                    ({days}일)
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
            <span className="ml-3 text-gray-600">데이터 로딩 중...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="py-8 text-center">
              <p className="text-red-600">
                ⚠️ {error instanceof Error ? error.message : '데이터 로드 실패'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        {data && (
          <div className="space-y-6">
            {/* KPI Cards Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Active Sessions */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    총 활성 세션 수
                  </CardTitle>
                  <Users className="h-5 w-5 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">
                    {data.summary.totalUsers.toLocaleString()}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {data.startDate} ~ {data.endDate}
                  </p>
                </CardContent>
              </Card>

              {/* Daily Active Users (DAU) */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    평균 일일 활성 사용자 (DAU)
                  </CardTitle>
                  <Activity className="h-5 w-5 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">
                    {data.summary.avgDailyUsers.toFixed(1)}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {(() => {
                      const trend = getTrendDisplay(
                        data.summary.trend,
                        data.summary.growthRate
                      );
                      const Icon = trend.icon;
                      return (
                        <>
                          <Badge
                            className={`${trend.bgColor} ${trend.color} border-0 px-2 py-0.5`}
                          >
                            <Icon className="h-3 w-3 inline mr-1" />
                            {trend.label}
                          </Badge>
                        </>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>

              {/* Daily Peak Active Users */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    일일 최고 활성 사용자
                  </CardTitle>
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">
                    {data.summary.peakUsers.toLocaleString()}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{data.summary.peakDate}</p>
                </CardContent>
              </Card>

              {/* Avg Page Views per User */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    평균 페이지뷰/사용자
                  </CardTitle>
                  <Eye className="h-5 w-5 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">
                    {data.summary.avgPageViewsPerUser.toFixed(1)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    총 {data.summary.totalPageViews.toLocaleString()} 페이지뷰
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* DAU/MAU Engagement Card */}
            {data.engagement && (
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
                        {data.engagement.dau.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">MAU (30일)</p>
                      <p className="text-2xl font-bold text-indigo-600">
                        {data.engagement.mau.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">DAU/MAU 비율</p>
                      <p className="text-2xl font-bold text-indigo-600">
                        {data.engagement.ratio.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Badge
                      className={`${
                        data.engagement.ratio >= 25
                          ? 'bg-green-100 text-green-700'
                          : data.engagement.ratio >= 20
                          ? 'bg-blue-100 text-blue-700'
                          : data.engagement.ratio >= 10
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      } border-0`}
                    >
                      {data.engagement.benchmark}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      업계 기준: 20-25%가 양호
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Real-time Stats Card */}
            {data.realtime && (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-600 animate-pulse" />
                    실시간 통계 (오늘)
                  </CardTitle>
                  <CardDescription>{data.realtime.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">활성 사용자</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {data.realtime.uniqueUsers.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">페이지 뷰</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {data.realtime.totalPageViews.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    마지막 업데이트: {new Date(data.generatedAt).toLocaleString('ko-KR')}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Active Users Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">활성 사용자 추이</CardTitle>
                <CardDescription>
                  {period === 'daily'
                    ? '일별'
                    : period === 'weekly'
                    ? '주별'
                    : '월별'}{' '}
                  활성 사용자 수
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return period === 'daily'
                          ? format(date, 'MM/dd')
                          : period === 'weekly'
                          ? format(date, 'MM/dd')
                          : format(date, 'yyyy-MM');
                      }}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                      }}
                      formatter={(value: any) => [
                        typeof value === 'number' ? value.toLocaleString() : value,
                      ]}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="활성 사용자"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fill="url(#colorUsers)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Page Views Chart (Bar Chart) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">페이지 뷰 추이</CardTitle>
                <CardDescription>
                  {period === 'daily'
                    ? '일별'
                    : period === 'weekly'
                    ? '주별'
                    : '월별'}{' '}
                  총 페이지 뷰 수
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <defs>
                      <linearGradient id="colorPageViews" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.4} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return period === 'daily'
                          ? format(date, 'MM/dd')
                          : period === 'weekly'
                          ? format(date, 'MM/dd')
                          : format(date, 'yyyy-MM');
                      }}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                      }}
                      formatter={(value: any) => [
                        typeof value === 'number' ? value.toLocaleString() : value,
                      ]}
                    />
                    <Legend />
                    <Bar
                      dataKey="페이지 뷰"
                      fill="url(#colorPageViews)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Average Page Views per User Chart (Line Chart) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">사용자당 평균 페이지뷰</CardTitle>
                <CardDescription>
                  {period === 'daily'
                    ? '일별'
                    : period === 'weekly'
                    ? '주별'
                    : '월별'}{' '}
                  사용자 참여도 지표
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return period === 'daily'
                          ? format(date, 'MM/dd')
                          : period === 'weekly'
                          ? format(date, 'MM/dd')
                          : format(date, 'yyyy-MM');
                      }}
                    />
                    <YAxis tick={{ fontSize: 12 }} domain={[0, 'auto']} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                      }}
                      formatter={(value: any) => [
                        typeof value === 'number' ? value.toFixed(1) : value,
                      ]}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="평균 페이지뷰/사용자"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={{ r: 4, fill: '#f59e0b' }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
