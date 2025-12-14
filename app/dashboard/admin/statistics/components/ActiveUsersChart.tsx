/**
 * Active Users Chart Component
 *
 * Area chart showing daily/weekly/monthly active user trends.
 */

'use client';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import {
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
import { DataPoint, TimePeriod } from '../hooks/useStatisticsData';

interface ActiveUsersChartProps {
  data: DataPoint[];
  period: TimePeriod;
}

export default function ActiveUsersChart({ data, period }: ActiveUsersChartProps) {
  // Format chart data
  const chartData = data.map((d) => ({
    date: d.date,
    '활성 사용자': d.uniqueUsers,
  }));

  // Format x-axis date
  const formatXAxis = (value: string) => {
    const date = new Date(value);
    return period === 'monthly' ? format(date, 'yyyy-MM') : format(date, 'MM/dd');
  };

  return (
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
              tickFormatter={formatXAxis}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
              }}
              formatter={(value: number) => [value.toLocaleString(), '활성 사용자']}
              labelFormatter={(label) => format(new Date(label), 'yyyy-MM-dd')}
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
  );
}
