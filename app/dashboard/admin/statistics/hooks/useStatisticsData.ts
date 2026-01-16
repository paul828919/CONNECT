/**
 * Statistics Data Fetching Hook
 *
 * Centralized data fetching for the admin statistics dashboard.
 * Uses TanStack Query for caching, refetching, and state management.
 */

'use client';

import { useQuery } from '@tanstack/react-query';

// Types
export type TimePeriod = 'daily' | 'weekly' | 'monthly';

export interface DataPoint {
  date: string;
  uniqueUsers: number;
  totalPageViews: number;
  avgPageViewsPerUser: number;
}

export interface SummaryStats {
  totalUsers: number;
  totalPageViews: number;
  avgDailyUsers: number;
  avgPageViewsPerUser: number;
  peakUsers: number;
  peakDate: string;
  growthRate: number;
  trend: 'up' | 'down' | 'stable';
}

/**
 * Visitor Statistics (방문자 지표) - Session-based from Redis
 * Counts all authenticated visits (may include same user multiple times across sessions)
 */
export interface VisitorStats {
  description: string;
  todayVisitors: number;      // Today's unique session count from Redis
  avgDailyVisitors: number;   // Average daily visitors from active_user_stats
  totalPageViews: number;     // Today's page views from Redis
  peakVisitors: number;       // Peak daily visitors in period
  peakDate: string;           // Date of peak visitors
  date: string;               // Current date
}

/**
 * Realtime/Engagement Statistics (참여자 지표) - Action-based from audit_logs
 * Counts users who took meaningful actions (match generation, profile completion, etc.)
 */
export interface RealtimeStats {
  description: string;
  engagedUsers: number;       // Today's distinct users from audit_logs (renamed from uniqueUsers)
  totalPageViews: number;     // Page views from audit_logs
  date: string;
}

/**
 * DAU/MAU Engagement Ratio (참여 고착도)
 */
export interface EngagementStats {
  description: string;
  excludeInternal?: boolean;  // Whether admin users are filtered out
  dau: number;
  mau: number;
  ratio: number;
  benchmark: string;
}

/**
 * Complete Analytics Response with separated visitor/engagement metrics
 */
export interface AnalyticsResponse {
  period: TimePeriod;
  startDate: string;
  endDate: string;
  dataPoints: DataPoint[];
  summary: SummaryStats;
  visitors: VisitorStats;     // NEW: Session-based visitor metrics (방문자 지표)
  realtime: RealtimeStats;    // Action-based engagement metrics (참여자 지표)
  engagement: EngagementStats;
  generatedAt: string;
}

export interface GrowthMetric {
  current: number;
  previous: number;
  growthRate: number;
  trend: 'up' | 'down' | 'stable';
}

export interface GrowthResponse {
  wow: GrowthMetric;
  mom: GrowthMetric;
  generatedAt: string;
}

export interface PlanSegment {
  plan: 'FREE' | 'PRO' | 'TEAM';
  userCount: number;
  percentage: number;
}

export interface SegmentationResponse {
  byPlan: PlanSegment[];
  total: number;
  generatedAt: string;
}

/**
 * Fetch main analytics data
 */
export function useAnalyticsData(period: TimePeriod, days: number) {
  return useQuery<AnalyticsResponse>({
    queryKey: ['admin-statistics', period, days],
    queryFn: async () => {
      const res = await fetch(`/api/admin/statistics/users?period=${period}&days=${days}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch statistics');
      }
      return res.json();
    },
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000, // Consider data fresh for 30 seconds
  });
}

/**
 * Fetch growth metrics (WoW/MoM)
 */
export function useGrowthData() {
  return useQuery<GrowthResponse>({
    queryKey: ['admin-statistics-growth'],
    queryFn: async () => {
      const res = await fetch('/api/admin/statistics/growth');
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch growth metrics');
      }
      return res.json();
    },
    refetchInterval: 300000, // Refetch every 5 minutes
    staleTime: 60000, // Consider data fresh for 1 minute
  });
}

/**
 * Fetch user segmentation data
 */
export function useSegmentationData() {
  return useQuery<SegmentationResponse>({
    queryKey: ['admin-statistics-segmentation'],
    queryFn: async () => {
      const res = await fetch('/api/admin/statistics/segmentation');
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch segmentation data');
      }
      return res.json();
    },
    refetchInterval: 300000, // Refetch every 5 minutes
    staleTime: 60000, // Consider data fresh for 1 minute
  });
}

/**
 * UTM Attribution Data Types
 */
export interface UtmSourceData {
  source: string;
  count: number;
}

export interface UtmCampaignData {
  campaign: string;
  count: number;
}

export interface UtmMediumData {
  medium: string;
  count: number;
}

export interface UtmRecentUser {
  id: string;
  email: string;
  name: string | null;
  source: string;
  medium: string | null;
  campaign: string | null;
  createdAt: string;
  plan: string;
}

export interface UtmResponse {
  period: {
    days: number;
    startDate: string;
    endDate: string;
  };
  summary: {
    totalUsersInPeriod: number;
    totalUsersWithUtm: number;
    attributionRate: string;
    convertedUsersWithUtm: number;
    conversionRate: string;
  };
  bySource: UtmSourceData[];
  byCampaign: UtmCampaignData[];
  byMedium: UtmMediumData[];
  recentUsers: UtmRecentUser[];
  generatedAt: string;
}

/**
 * Fetch UTM attribution data
 */
export function useUtmData(days: number = 30) {
  return useQuery<UtmResponse>({
    queryKey: ['admin-statistics-utm', days],
    queryFn: async () => {
      const res = await fetch(`/api/admin/statistics/utm?days=${days}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch UTM data');
      }
      return res.json();
    },
    refetchInterval: 300000, // Refetch every 5 minutes
    staleTime: 60000, // Consider data fresh for 1 minute
  });
}

/**
 * Export CSV handler
 */
export async function exportToCSV(period: TimePeriod, days: number): Promise<void> {
  const res = await fetch(`/api/admin/statistics/users?period=${period}&days=${days}&format=csv`);

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to export CSV');
  }

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
}
