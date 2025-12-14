/**
 * Admin User Statistics Dashboard
 *
 * Comprehensive analytics dashboard for platform administrators.
 *
 * Features:
 * - KPI cards with DAU, WAU, MAU, and DAU/MAU ratio
 * - WoW and MoM growth metrics
 * - User segmentation by subscription plan
 * - Active users trend chart (Area)
 * - Page views trend chart (Bar)
 * - Custom date range selection
 * - CSV export functionality
 * - 60-second auto-refresh for real-time data
 *
 * Architecture:
 * - Modular component structure for maintainability
 * - TanStack Query for data fetching with caching
 * - Parallel API calls for optimal performance
 */

'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

// Import custom hooks
import {
  useAnalyticsData,
  useGrowthData,
  useSegmentationData,
  TimePeriod,
} from './hooks/useStatisticsData';

// Import components
import StatisticsHeader from './components/StatisticsHeader';
import KPICards from './components/KPICards';
import GrowthMetrics from './components/GrowthMetrics';
import UserSegmentation from './components/UserSegmentation';
import ActiveUsersChart from './components/ActiveUsersChart';
import PageViewsChart from './components/PageViewsChart';

export default function AdminStatisticsDashboard() {
  // State for filters
  const [period, setPeriod] = useState<TimePeriod>('daily');
  const [days, setDays] = useState<number>(30);

  // Fetch data using custom hooks
  const {
    data: analyticsData,
    isLoading: isAnalyticsLoading,
    error: analyticsError,
  } = useAnalyticsData(period, days);

  const {
    data: growthData,
    isLoading: isGrowthLoading,
    error: growthError,
  } = useGrowthData();

  const {
    data: segmentationData,
    isLoading: isSegmentationLoading,
    error: segmentationError,
  } = useSegmentationData();

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 px-4">
        {/* Header with Date Range Picker */}
        <StatisticsHeader
          period={period}
          setPeriod={setPeriod}
          days={days}
          setDays={setDays}
        />

        {/* Loading State */}
        {isAnalyticsLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
            <span className="ml-3 text-gray-600">데이터 로딩 중...</span>
          </div>
        )}

        {/* Error State */}
        {analyticsError && (
          <Card className="border-red-200 bg-red-50 mt-6">
            <CardContent className="py-8 text-center">
              <p className="text-red-600">
                {analyticsError instanceof Error
                  ? analyticsError.message
                  : '데이터 로드 실패'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        {analyticsData && (
          <div className="space-y-6 mt-6">
            {/* KPI Cards */}
            <KPICards
              summary={analyticsData.summary}
              engagement={analyticsData.engagement}
              realtime={analyticsData.realtime}
              startDate={analyticsData.startDate}
              endDate={analyticsData.endDate}
            />

            {/* Growth Metrics & User Segmentation Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GrowthMetrics
                data={growthData}
                isLoading={isGrowthLoading}
                error={growthError}
              />
              <UserSegmentation
                data={segmentationData}
                isLoading={isSegmentationLoading}
                error={segmentationError}
              />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ActiveUsersChart
                data={analyticsData.dataPoints}
                period={period}
              />
              <PageViewsChart
                data={analyticsData.dataPoints}
                period={period}
              />
            </div>

            {/* Last Updated Timestamp */}
            <p className="text-xs text-gray-500 text-right">
              마지막 업데이트: {new Date(analyticsData.generatedAt).toLocaleString('ko-KR')}
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
