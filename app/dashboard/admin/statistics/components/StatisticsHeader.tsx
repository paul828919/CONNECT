/**
 * Statistics Header Component
 *
 * Contains title, date range picker, and export functionality.
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Download, Calendar } from 'lucide-react';
import { format, differenceInDays, subDays } from 'date-fns';
import { toast } from 'react-hot-toast';
import { TimePeriod, exportToCSV } from '../hooks/useStatisticsData';

// Preset periods
const PRESET_PERIODS = {
  '7': '최근 7일',
  '14': '최근 14일',
  '30': '최근 30일',
  '90': '최근 90일',
  'custom': '사용자 지정',
} as const;

interface StatisticsHeaderProps {
  period: TimePeriod;
  setPeriod: (period: TimePeriod) => void;
  days: number;
  setDays: (days: number) => void;
}

export default function StatisticsHeader({
  period,
  setPeriod,
  days,
  setDays,
}: StatisticsHeaderProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>('30');
  const [customStartDate, setCustomStartDate] = useState<string>(
    format(subDays(new Date(), 30), 'yyyy-MM-dd')
  );
  const [customEndDate, setCustomEndDate] = useState<string>(
    format(new Date(), 'yyyy-MM-dd')
  );

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

  // Handle CSV export
  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      await exportToCSV(period, days);
      toast.success('CSV 파일이 다운로드되었습니다');
    } catch (err) {
      console.error('[EXPORT] Error:', err);
      toast.error(err instanceof Error ? err.message : 'CSV 내보내기 실패');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">사용자 통계</h1>
          <p className="text-sm text-gray-600 mt-1">
            플랫폼 활성 사용자 분석 및 트렌드 확인
          </p>
        </div>

        {/* Export Button */}
        <Button
          onClick={handleExportCSV}
          disabled={isExporting}
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
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
            {/* Aggregation Period */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600 whitespace-nowrap">
                집계 단위:
              </span>
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
              <span className="text-sm font-medium text-gray-600 whitespace-nowrap">
                기간:
              </span>
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

            {/* Custom Date Range */}
            {selectedPreset === 'custom' && (
              <div className="flex items-center gap-2 flex-wrap">
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) =>
                    handleCustomDateChange(e.target.value, customEndDate)
                  }
                  className="w-36 text-sm"
                  max={customEndDate}
                />
                <span className="text-gray-500">~</span>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) =>
                    handleCustomDateChange(customStartDate, e.target.value)
                  }
                  className="w-36 text-sm"
                  min={customStartDate}
                  max={format(new Date(), 'yyyy-MM-dd')}
                />
                <span className="text-xs text-gray-500">({days}일)</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
