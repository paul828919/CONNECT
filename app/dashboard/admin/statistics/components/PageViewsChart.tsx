/**
 * Page Views Chart Component
 *
 * Bar chart showing daily/weekly/monthly page view trends.
 */

'use client';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import { DataPoint, TimePeriod } from '../hooks/useStatisticsData';

interface PageViewsChartProps {
  data: DataPoint[];
  period: TimePeriod;
}

export default function PageViewsChart({ data, period }: PageViewsChartProps) {
  // Format chart data
  const chartData = data.map((d) => ({
    date: d.date,
    '페이지 뷰': d.totalPageViews,
  }));

  // Format x-axis date
  const formatXAxis = (value: string) => {
    const date = new Date(value);
    return period === 'monthly' ? format(date, 'yyyy-MM') : format(date, 'MM/dd');
  };

  return (
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
              tickFormatter={formatXAxis}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
              }}
              formatter={(value: number) => [value.toLocaleString(), '페이지 뷰']}
              labelFormatter={(label) => format(new Date(label), 'yyyy-MM-dd')}
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
  );
}
