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
} from 'lucide-react';
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
} from 'recharts';
import { format } from 'date-fns';

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
  generatedAt: string;
}

export default function AdminStatisticsDashboard() {
  const [period, setPeriod] = useState<TimePeriod>('daily');
  const [isExporting, setIsExporting] = useState(false);

  // Fetch analytics data
  const { data, isLoading, error } = useQuery<AnalyticsResponse>({
    queryKey: ['admin-statistics', period],
    queryFn: async () => {
      const res = await fetch(`/api/admin/statistics/users?period=${period}`);
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
      const res = await fetch(`/api/admin/statistics/users?period=${period}&format=csv`);

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

        {/* Period Selector */}
        <div className="flex gap-2 mb-6">
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
              {/* Total Users */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    총 사용자
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

              {/* Avg Daily Users */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    평균 일일 사용자
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

              {/* Peak Users */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    최고 사용자
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

            {/* Page Views Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">페이지 뷰 추이</CardTitle>
                <CardDescription>
                  {period === 'daily'
                    ? '일별'
                    : period === 'weekly'
                    ? '주별'
                    : '월별'}{' '}
                  페이지 뷰 및 사용자당 평균
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
                    <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 12 }}
                      domain={[0, 'auto']}
                    />
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
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="페이지 뷰"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="평균 페이지뷰/사용자"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      strokeDasharray="5 5"
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
