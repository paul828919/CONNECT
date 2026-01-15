/**
 * UTM Analytics Component
 *
 * Displays UTM attribution data for cold email campaigns:
 * - Summary metrics (attribution rate, conversion rate)
 * - Source breakdown (bar chart)
 * - Campaign performance table
 * - Recent UTM users list
 */

'use client';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Link2, Mail, TrendingUp, Users, ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { UtmResponse } from '../hooks/useStatisticsData';

interface UtmAnalyticsProps {
  data: UtmResponse | undefined;
  isLoading: boolean;
  error: Error | null;
}

// Color palette for charts
const SOURCE_COLORS: Record<string, string> = {
  cold_email: '#3b82f6', // Blue
  linkedin: '#0077b5', // LinkedIn blue
  google: '#ea4335', // Google red
  newsletter: '#10b981', // Green
  partner: '#8b5cf6', // Purple
  referral: '#f59e0b', // Amber
  direct: '#6b7280', // Gray
};

const getSourceColor = (source: string): string => {
  return SOURCE_COLORS[source.toLowerCase()] || '#94a3b8';
};

const getSourceLabel = (source: string): string => {
  const labels: Record<string, string> = {
    cold_email: '콜드 이메일',
    linkedin: 'LinkedIn',
    google: 'Google',
    newsletter: '뉴스레터',
    partner: '파트너',
    referral: '추천',
    direct: '직접 유입',
  };
  return labels[source.toLowerCase()] || source;
};

const getPlanBadgeColor = (plan: string): string => {
  switch (plan) {
    case 'PRO':
      return 'bg-blue-100 text-blue-700';
    case 'TEAM':
      return 'bg-purple-100 text-purple-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

export default function UtmAnalytics({ data, isLoading, error }: UtmAnalyticsProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">UTM 유입 분석</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-lg">UTM 유입 분석</CardTitle>
        </CardHeader>
        <CardContent className="py-6 text-center text-red-600">
          UTM 데이터를 불러올 수 없습니다
        </CardContent>
      </Card>
    );
  }

  const hasUtmData = data.summary.totalUsersWithUtm > 0;

  // Custom tooltip for bar chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const { source, count } = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-sm">
          <p className="font-medium text-gray-900">{getSourceLabel(source)}</p>
          <p className="text-sm text-gray-600">{count}명 유입</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* UTM Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Link2 className="h-5 w-5 text-blue-600" />
            UTM 캠페인 분석
          </CardTitle>
          <CardDescription>
            콜드 이메일 및 마케팅 캠페인 성과 추적
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Summary Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-600 font-medium">총 유입</p>
              <p className="text-2xl font-bold text-blue-700">
                {data.summary.totalUsersWithUtm}명
              </p>
              <p className="text-xs text-blue-500">
                전체 대비 {data.summary.attributionRate}%
              </p>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-green-600 font-medium">유료 전환</p>
              <p className="text-2xl font-bold text-green-700">
                {data.summary.convertedUsersWithUtm}명
              </p>
              <p className="text-xs text-green-500">
                전환율 {data.summary.conversionRate}%
              </p>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-sm text-purple-600 font-medium">활성 소스</p>
              <p className="text-2xl font-bold text-purple-700">
                {data.bySource.length}개
              </p>
              <p className="text-xs text-purple-500">유입 채널</p>
            </div>

            <div className="bg-orange-50 rounded-lg p-4">
              <p className="text-sm text-orange-600 font-medium">캠페인</p>
              <p className="text-2xl font-bold text-orange-700">
                {data.byCampaign.length}개
              </p>
              <p className="text-xs text-orange-500">진행 중</p>
            </div>
          </div>

          {!hasUtmData ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <Mail className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-2">아직 UTM 유입 데이터가 없습니다</p>
              <p className="text-sm text-gray-400">
                콜드 이메일에 UTM 링크를 포함하여 발송하세요
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Source Bar Chart */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">소스별 유입</h4>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.bySource}
                      layout="vertical"
                      margin={{ left: 80, right: 20 }}
                    >
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="source"
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => getSourceLabel(value)}
                        width={75}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {data.bySource.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={getSourceColor(entry.source)}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Campaign Table */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">캠페인별 성과</h4>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {data.byCampaign.length > 0 ? (
                    data.byCampaign.map((campaign, index) => (
                      <div
                        key={campaign.campaign}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-500">
                            #{index + 1}
                          </span>
                          <span className="text-sm font-medium text-gray-900 truncate max-w-[150px]">
                            {campaign.campaign}
                          </span>
                        </div>
                        <Badge variant="secondary">
                          {campaign.count}명
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">
                      캠페인 데이터 없음
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent UTM Users */}
      {hasUtmData && data.recentUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              최근 UTM 유입 사용자
            </CardTitle>
            <CardDescription>
              최근 {data.period.days}일간 UTM 링크로 가입한 사용자
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 font-medium text-gray-600">사용자</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600">소스</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600">캠페인</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600">플랜</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600">가입일</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentUsers.slice(0, 10).map((user) => (
                    <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-2">
                        <div>
                          <p className="font-medium text-gray-900">
                            {user.name || '이름 없음'}
                          </p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <Badge
                          variant="outline"
                          style={{
                            borderColor: getSourceColor(user.source),
                            color: getSourceColor(user.source),
                          }}
                        >
                          {getSourceLabel(user.source)}
                        </Badge>
                      </td>
                      <td className="py-3 px-2">
                        <span className="text-gray-700 text-xs">
                          {user.campaign || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getPlanBadgeColor(user.plan)}`}>
                          {user.plan}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-gray-500 text-xs">
                        {new Date(user.createdAt).toLocaleDateString('ko-KR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conversion Funnel */}
      {hasUtmData && (
        <Card className="bg-gradient-to-r from-blue-50 to-green-50">
          <CardContent className="py-6">
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {data.summary.totalUsersInPeriod}
                </p>
                <p className="text-xs text-gray-600">전체 가입</p>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400" />
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">
                  {data.summary.totalUsersWithUtm}
                </p>
                <p className="text-xs text-gray-600">UTM 유입</p>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400" />
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {data.summary.convertedUsersWithUtm}
                </p>
                <p className="text-xs text-gray-600">유료 전환</p>
              </div>
              <div className="ml-4 px-4 py-2 bg-white rounded-lg border border-green-200">
                <p className="text-lg font-bold text-green-700">
                  {data.summary.conversionRate}%
                </p>
                <p className="text-xs text-green-600">전환율</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
