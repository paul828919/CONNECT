'use client';

import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface StatItem {
  label: string;
  value: string | number;
  subLabel?: string;
  color?: 'default' | 'green' | 'yellow' | 'red' | 'blue';
}

interface StatsBarProps {
  stats: StatItem[];
  isLoading?: boolean;
}

const colorMap: Record<string, string> = {
  default: 'text-gray-900',
  green: 'text-green-600',
  yellow: 'text-yellow-600',
  red: 'text-red-600',
  blue: 'text-blue-600',
};

export function StatsBar({ stats, isLoading }: StatsBarProps) {
  if (isLoading) {
    return (
      <div className="flex flex-wrap gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 min-w-[160px] rounded-lg border bg-white p-4 shadow-sm"
          >
            <Skeleton className="h-8 w-20 mb-2" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-4">
      {stats.map((stat, i) => (
        <div
          key={i}
          className="flex-1 min-w-[160px] rounded-lg border bg-white p-4 shadow-sm"
        >
          <div
            className={cn(
              'text-2xl font-bold',
              colorMap[stat.color || 'default']
            )}
          >
            {typeof stat.value === 'number'
              ? stat.value.toLocaleString()
              : stat.value}
          </div>
          <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
          {stat.subLabel && (
            <div className="text-xs text-muted-foreground mt-0.5">
              {stat.subLabel}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
