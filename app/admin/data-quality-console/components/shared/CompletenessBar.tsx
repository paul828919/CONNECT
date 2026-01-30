'use client';

import { cn } from '@/lib/utils';

interface CompletenessBarProps {
  percent: number;
  populated?: number;
  total?: number;
  size?: 'sm' | 'md';
}

export function CompletenessBar({
  percent,
  populated,
  total,
  size = 'sm',
}: CompletenessBarProps) {
  const clampedPercent = Math.min(100, Math.max(0, percent));

  const barColor =
    clampedPercent <= 40
      ? 'bg-red-500'
      : clampedPercent <= 70
        ? 'bg-yellow-500'
        : 'bg-green-500';

  if (size === 'sm') {
    return (
      <div className="flex items-center gap-2">
        <div className="h-2 w-16 rounded-full bg-gray-200">
          <div
            className={cn('h-2 rounded-full transition-all', barColor)}
            style={{ width: `${clampedPercent}%` }}
          />
        </div>
        <span className="text-xs font-medium text-muted-foreground">
          {Math.round(clampedPercent)}%
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="h-3 flex-1 rounded-full bg-gray-200">
        <div
          className={cn('h-3 rounded-full transition-all', barColor)}
          style={{ width: `${clampedPercent}%` }}
        />
      </div>
      <span className="text-sm font-semibold">
        {Math.round(clampedPercent)}%
      </span>
      {populated !== undefined && total !== undefined && (
        <span className="text-sm text-muted-foreground">
          {populated}/{total} 필드
        </span>
      )}
    </div>
  );
}
