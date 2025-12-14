/**
 * User Segmentation Component
 *
 * Displays user breakdown by subscription plan using a pie chart.
 */

'use client';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Loader2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { SegmentationResponse } from '../hooks/useStatisticsData';

interface UserSegmentationProps {
  data: SegmentationResponse | undefined;
  isLoading: boolean;
  error: Error | null;
}

// Color palette for pie chart
const COLORS = {
  FREE: '#94a3b8', // Gray
  PRO: '#3b82f6', // Blue
  TEAM: '#8b5cf6', // Purple
};

const PLAN_LABELS = {
  FREE: '무료',
  PRO: '프로',
  TEAM: '팀',
};

export default function UserSegmentation({ data, isLoading, error }: UserSegmentationProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">사용자 분포</CardTitle>
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
          <CardTitle className="text-lg">사용자 분포</CardTitle>
        </CardHeader>
        <CardContent className="py-4 text-center text-red-600">
          사용자 분포 데이터를 불러올 수 없습니다
        </CardContent>
      </Card>
    );
  }

  // Format data for pie chart
  const chartData = data.byPlan.map((segment) => ({
    name: PLAN_LABELS[segment.plan as keyof typeof PLAN_LABELS] || segment.plan,
    value: segment.userCount,
    percentage: segment.percentage,
    plan: segment.plan,
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const { name, value, percentage } = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-sm">
          <p className="font-medium text-gray-900">{name}</p>
          <p className="text-sm text-gray-600">
            {value.toLocaleString()}명 ({percentage.toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5 text-violet-600" />
          구독 플랜별 사용자 분포
        </CardTitle>
        <CardDescription>
          총 {data.total.toLocaleString()}명의 등록 사용자
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[entry.plan as keyof typeof COLORS]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend & Stats */}
          <div className="flex flex-col justify-center space-y-3">
            {data.byPlan.map((segment) => (
              <div
                key={segment.plan}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: COLORS[segment.plan as keyof typeof COLORS],
                    }}
                  />
                  <span className="text-sm font-medium">
                    {PLAN_LABELS[segment.plan as keyof typeof PLAN_LABELS] || segment.plan}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {segment.userCount.toLocaleString()}명
                  </Badge>
                  <span className="text-sm text-gray-500 w-14 text-right">
                    {segment.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
