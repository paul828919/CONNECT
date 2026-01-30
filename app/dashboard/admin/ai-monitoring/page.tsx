/**
 * AI Cost Monitoring Dashboard
 *
 * Admin-only dashboard for monitoring AI usage, costs, and budget alerts
 *
 * Features:
 * - Real-time budget status with daily limit tracking
 * - 30-day cost trend visualization
 * - Service breakdown (Match Explanations vs Q&A Chat)
 * - Top users by cost
 * - Alert history timeline
 * - Test alert button for email verification
 */

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'react-hot-toast';
import {
  Loader2,
  RefreshCcw,
  DollarSign,
  TrendingUp,
  Users,
  AlertTriangle,
  Mail,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// Types
interface BudgetStats {
  budget: {
    dailyLimit: number;
    spent: number;
    remaining: number;
    percentage: number;
    resetTime: number;
  };
  stats: {
    dateRange: { start: string; end: string; days: number };
    totalCost: number;
    totalRequests: number;
    successRate: number;
    cacheHitRate: number;
    averageCost: number;
    averageDuration: number;
    byService: {
      MATCH_EXPLANATION: { count: number; cost: number; averageDuration: number };
      QA_CHAT: { count: number; cost: number; averageDuration: number };
      EXTRACTION?: { count: number; cost: number; averageDuration: number };
      DOCUMENT_EXTRACTION?: { count: number; cost: number; averageDuration: number };
    };
    byModel?: Record<string, {
      count: number;
      cost: number;
      inputTokens: number;
      outputTokens: number;
      averageDuration: number;
    }>;
  };
  timestamp: string;
}

interface DailyBreakdown {
  summary: {
    totalDays: number;
    totalCost: number;
    totalRequests: number;
    averageDailyCost: number;
    averageDailyRequests: number;
  };
  breakdown: Array<{
    date: string;
    totalCost: number;
    totalRequests: number;
    matchExplanationCost: number;
    qaChatCost: number;
  }>;
  timestamp: string;
}

interface TopUsers {
  dateRange: { start: string; end: string; days: number };
  summary: {
    totalUsers: number;
    totalCost: number;
    totalRequests: number;
  };
  topUsers: Array<{
    rank: number;
    userId: string;
    userName: string;
    userEmail: string;
    totalCost: number;
    totalRequests: number;
    averageCostPerRequest: number;
    percentOfTotal: number;
  }>;
  timestamp: string;
}

interface AlertHistory {
  dateRange: { start: string; end: string; days: number };
  summary: {
    totalAlerts: number;
    byThreshold: { '50%': number; '80%': number; '95%': number };
    bySeverity: { INFO: number; WARNING: number; CRITICAL: number };
    alertsSent: number;
    alertsPending: number;
  };
  alerts: Array<{
    id: string;
    date: string;
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
    threshold: number;
    amountSpent: number;
    dailyLimit: number;
    percentage: number;
    alertSent: boolean;
    alertSentAt: string | null;
    recipientEmails: string[];
    createdAt: string;
  }>;
  timestamp: string;
}

export default function AIMonitoringDashboard() {
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [days, setDays] = useState(30);
  const queryClient = useQueryClient();

  // Fetch budget stats
  const { data: budgetStats, isLoading: statsLoading } = useQuery<BudgetStats>({
    queryKey: ['ai-monitoring-stats', days],
    queryFn: async () => {
      const res = await fetch(`/api/admin/ai-monitoring/stats?days=${days}`);
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
    refetchInterval: isAutoRefresh ? 30000 : false, // Auto-refresh every 30 seconds
  });

  // Fetch daily breakdown
  const { data: dailyData, isLoading: dailyLoading } = useQuery<DailyBreakdown>({
    queryKey: ['ai-monitoring-daily', days],
    queryFn: async () => {
      const res = await fetch(`/api/admin/ai-monitoring/daily-breakdown?days=${days}`);
      if (!res.ok) throw new Error('Failed to fetch daily breakdown');
      return res.json();
    },
    refetchInterval: isAutoRefresh ? 60000 : false, // Auto-refresh every minute
  });

  // Fetch top users
  const { data: topUsersData, isLoading: usersLoading } = useQuery<TopUsers>({
    queryKey: ['ai-monitoring-top-users', days],
    queryFn: async () => {
      const res = await fetch(`/api/admin/ai-monitoring/top-users?limit=10&days=${days}`);
      if (!res.ok) throw new Error('Failed to fetch top users');
      return res.json();
    },
    refetchInterval: isAutoRefresh ? 60000 : false,
  });

  // Fetch alert history
  const { data: alertsData, isLoading: alertsLoading } = useQuery<AlertHistory>({
    queryKey: ['ai-monitoring-alerts', days],
    queryFn: async () => {
      const res = await fetch(`/api/admin/ai-monitoring/alert-history?days=${days}`);
      if (!res.ok) throw new Error('Failed to fetch alert history');
      return res.json();
    },
    refetchInterval: isAutoRefresh ? 60000 : false,
  });

  // Test alert mutation
  const testAlertMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/admin/ai-monitoring/test-alert', {
        method: 'POST',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.details || 'Failed to send test alert');
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(data.message);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Prepare pie chart data (all service types)
  const pieData = budgetStats
    ? [
        {
          name: '매칭 설명',
          value: budgetStats.stats.byService.MATCH_EXPLANATION?.cost || 0,
          count: budgetStats.stats.byService.MATCH_EXPLANATION?.count || 0,
        },
        {
          name: 'Q&A 채팅',
          value: budgetStats.stats.byService.QA_CHAT?.cost || 0,
          count: budgetStats.stats.byService.QA_CHAT?.count || 0,
        },
        {
          name: 'API 추출',
          value: budgetStats.stats.byService.EXTRACTION?.cost || 0,
          count: budgetStats.stats.byService.EXTRACTION?.count || 0,
        },
        {
          name: '문서 추출',
          value: budgetStats.stats.byService.DOCUMENT_EXTRACTION?.cost || 0,
          count: budgetStats.stats.byService.DOCUMENT_EXTRACTION?.count || 0,
        },
      ].filter((d) => d.value > 0 || d.count > 0)
    : [];

  const COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981']; // Blue, Purple, Amber, Green

  // Prepare model comparison data
  const modelData = budgetStats?.stats.byModel
    ? Object.entries(budgetStats.stats.byModel).map(([model, data]) => ({
        model: model.replace('claude-', '').replace(/-\d+$/, ''),
        ...data,
      }))
    : [];

  // Format currency
  const formatKRW = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Get severity badge
  const getSeverityBadge = (severity: 'INFO' | 'WARNING' | 'CRITICAL') => {
    const variants = {
      INFO: { className: 'bg-blue-500', icon: CheckCircle },
      WARNING: { className: 'bg-yellow-500', icon: AlertTriangle },
      CRITICAL: { className: 'bg-red-500', icon: XCircle },
    };
    const { className, icon: Icon } = variants[severity];
    return (
      <Badge className={className}>
        <Icon className="h-3 w-3 mr-1" />
        {severity}
      </Badge>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">AI 비용 모니터링</h1>
            <p className="text-muted-foreground">AI 사용량, 비용 및 예산 알림 모니터링</p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value))}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value={7}>최근 7일</option>
              <option value={30}>최근 30일</option>
              <option value={90}>최근 90일</option>
            </select>

            <Button
              variant={isAutoRefresh ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIsAutoRefresh(!isAutoRefresh)}
            >
              <RefreshCcw className={`h-4 w-4 mr-2 ${isAutoRefresh ? 'animate-spin' : ''}`} />
              {isAutoRefresh ? '자동 새로고침 켜짐' : '자동 새로고침 꺼짐'}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => testAlertMutation.mutate()}
              disabled={testAlertMutation.isPending}
            >
              {testAlertMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              알림 테스트
            </Button>
          </div>
        </div>

        {/* Budget Status Card */}
        <Card className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-semibold">일일 예산 현황</h2>
              <p className="text-sm text-muted-foreground">
                자정(KST)에 초기화
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-green-500" />
          </div>

          {statsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : budgetStats ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">일일 한도</div>
                  <div className="text-2xl font-bold">
                    {formatKRW(budgetStats.budget.dailyLimit)}
                  </div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">금일 사용</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatKRW(budgetStats.budget.spent)}
                  </div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">잔여</div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatKRW(budgetStats.budget.remaining)}
                  </div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">사용률 %</div>
                  <div className="text-2xl font-bold text-purple-600">
                    {budgetStats.budget.percentage.toFixed(1)}%
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>예산 진행률</span>
                  <span>{budgetStats.budget.percentage.toFixed(1)}%</span>
                </div>
                <Progress value={budgetStats.budget.percentage} className="h-3" />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>₩0</span>
                  <span className="text-yellow-600">50%</span>
                  <span className="text-orange-600">80%</span>
                  <span className="text-red-600">95%</span>
                  <span>{formatKRW(budgetStats.budget.dailyLimit)}</span>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                <div>
                  <div className="text-xs text-muted-foreground">총 요청 수</div>
                  <div className="text-lg font-semibold">{budgetStats.stats.totalRequests.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">성공률</div>
                  <div className="text-lg font-semibold text-green-600">{budgetStats.stats.successRate.toFixed(1)}%</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">캐시 적중률</div>
                  <div className="text-lg font-semibold text-purple-600">{budgetStats.stats.cacheHitRate.toFixed(1)}%</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">평균 처리 시간</div>
                  <div className="text-lg font-semibold">{budgetStats.stats.averageDuration.toFixed(0)}ms</div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">데이터 없음</p>
          )}
        </Card>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Cost Trend */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-blue-500" />
              일일 비용 추이
            </h2>
            {dailyLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : dailyData && dailyData.breakdown.length > 0 ? (
              <div>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailyData.breakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(date) => new Date(date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis tickFormatter={(value) => `₩${(value / 1000).toFixed(0)}K`} />
                    <Tooltip
                      formatter={(value: number) => formatKRW(value)}
                      labelFormatter={(date) => new Date(date).toLocaleDateString('ko-KR')}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="totalCost" stroke="#3b82f6" strokeWidth={2} name="총 비용" />
                    <Line type="monotone" dataKey="matchExplanationCost" stroke="#10b981" strokeWidth={1} name="매칭 설명" />
                    <Line type="monotone" dataKey="qaChatCost" stroke="#8b5cf6" strokeWidth={1} name="Q&A 채팅" />
                    <Line type="monotone" dataKey="extractionCost" stroke="#f59e0b" strokeWidth={1} name="API 추출" />
                    <Line type="monotone" dataKey="documentExtractionCost" stroke="#ef4444" strokeWidth={1} name="문서 추출" />
                  </LineChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
                  <div className="text-center">
                    <div className="text-muted-foreground">일평균 비용</div>
                    <div className="font-semibold">{formatKRW(dailyData.summary.averageDailyCost)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-muted-foreground">총 비용</div>
                    <div className="font-semibold text-blue-600">{formatKRW(dailyData.summary.totalCost)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-muted-foreground">총 요청 수</div>
                    <div className="font-semibold">{dailyData.summary.totalRequests.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">데이터 없음</p>
            )}
          </Card>

          {/* Service Breakdown */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">서비스별 분석</h2>
            {statsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : budgetStats && pieData.length > 0 ? (
              <div>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatKRW(value)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  {pieData.map((service, index) => (
                    <div key={service.name} className="text-center p-3 border rounded-lg">
                      <div className="flex items-center justify-center mb-1">
                        <div
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: COLORS[index] }}
                        />
                        <div className="text-sm font-medium">{service.name}</div>
                      </div>
                      <div className="text-lg font-bold">{formatKRW(service.value)}</div>
                      <div className="text-xs text-muted-foreground">{service.count} 요청</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">데이터 없음</p>
            )}
          </Card>
        </div>

        {/* Model Cost Comparison */}
        {modelData.length > 0 && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <DollarSign className="h-5 w-5 mr-2 text-amber-500" />
              모델별 비용 비교
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {modelData.map((m) => (
                <div key={m.model} className="p-4 border rounded-lg">
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    {m.model}
                  </div>
                  <div className="text-2xl font-bold">{formatKRW(m.cost)}</div>
                  <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-muted-foreground">
                    <div>
                      <div>요청 수</div>
                      <div className="text-sm font-semibold text-foreground">{m.count.toLocaleString()}</div>
                    </div>
                    <div>
                      <div>평균 처리</div>
                      <div className="text-sm font-semibold text-foreground">{Math.round(m.averageDuration)}ms</div>
                    </div>
                    <div>
                      <div>입력 토큰</div>
                      <div className="text-sm font-semibold text-foreground">{(m.inputTokens / 1000).toFixed(1)}K</div>
                    </div>
                    <div>
                      <div>출력 토큰</div>
                      <div className="text-sm font-semibold text-foreground">{(m.outputTokens / 1000).toFixed(1)}K</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Top Users */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Users className="h-5 w-5 mr-2 text-purple-500" />
            비용 상위 사용자
          </h2>
          {usersLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : topUsersData && topUsersData.topUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>순위</TableHead>
                    <TableHead>사용자</TableHead>
                    <TableHead>이메일</TableHead>
                    <TableHead className="text-right">총 비용</TableHead>
                    <TableHead className="text-right">요청 수</TableHead>
                    <TableHead className="text-right">요청당 평균</TableHead>
                    <TableHead className="text-right">전체 비율</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topUsersData.topUsers.map((user) => (
                    <TableRow key={user.userId}>
                      <TableCell className="font-medium">#{user.rank}</TableCell>
                      <TableCell>{user.userName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{user.userEmail}</TableCell>
                      <TableCell className="text-right font-semibold">{formatKRW(user.totalCost)}</TableCell>
                      <TableCell className="text-right">{user.totalRequests}</TableCell>
                      <TableCell className="text-right text-sm">{formatKRW(user.averageCostPerRequest)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">{user.percentOfTotal.toFixed(1)}%</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">사용자 데이터 없음</p>
          )}
        </Card>

        {/* Alert History */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-yellow-500" />
            예산 알림 내역
          </h2>
          {alertsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : alertsData ? (
            <div>
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-sm text-muted-foreground">총 알림 수</div>
                  <div className="text-2xl font-bold">{alertsData.summary.totalAlerts}</div>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-sm text-muted-foreground">INFO</div>
                  <div className="text-2xl font-bold text-blue-600">{alertsData.summary.bySeverity.INFO}</div>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-sm text-muted-foreground">WARNING</div>
                  <div className="text-2xl font-bold text-yellow-600">{alertsData.summary.bySeverity.WARNING}</div>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-sm text-muted-foreground">CRITICAL</div>
                  <div className="text-2xl font-bold text-red-600">{alertsData.summary.bySeverity.CRITICAL}</div>
                </div>
                <div className="text-center p-3 border rounded-lg bg-green-50">
                  <div className="text-sm text-muted-foreground">전송됨</div>
                  <div className="text-2xl font-bold text-green-600">{alertsData.summary.alertsSent}</div>
                </div>
              </div>

              {/* Alert Table */}
              {alertsData.alerts.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>날짜</TableHead>
                        <TableHead>심각도</TableHead>
                        <TableHead>임계값</TableHead>
                        <TableHead className="text-right">사용 금액</TableHead>
                        <TableHead className="text-right">비율</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead>전송 시간</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {alertsData.alerts.map((alert) => (
                        <TableRow key={alert.id}>
                          <TableCell className="font-medium">
                            {new Date(alert.date).toLocaleDateString('ko-KR')}
                          </TableCell>
                          <TableCell>{getSeverityBadge(alert.severity)}</TableCell>
                          <TableCell>{alert.threshold}%</TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatKRW(alert.amountSpent)}
                          </TableCell>
                          <TableCell className="text-right">{alert.percentage.toFixed(1)}%</TableCell>
                          <TableCell>
                            {alert.alertSent ? (
                              <Badge className="bg-green-500">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                전송됨
                              </Badge>
                            ) : (
                              <Badge variant="outline">
                                <Clock className="h-3 w-3 mr-1" />
                                대기 중
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {alert.alertSentAt
                              ? new Date(alert.alertSentAt).toLocaleString('ko-KR')
                              : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">선택 기간에 알림 없음</p>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">알림 데이터 없음</p>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
