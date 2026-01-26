'use client';

interface SMEDeadlineBadgeProps {
  deadline: string | null;
  className?: string;
}

function getDaysUntil(deadline: string): number {
  const deadlineDate = new Date(deadline);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  deadlineDate.setHours(0, 0, 0, 0);
  return Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function SMEDeadlineBadge({ deadline, className = '' }: SMEDeadlineBadgeProps) {
  if (!deadline) {
    return (
      <span className={`inline-flex items-center text-xs text-gray-400 ${className}`}>
        미정
      </span>
    );
  }

  const days = getDaysUntil(deadline);

  // Expired
  if (days < 0) {
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-400 line-through ${className}`}>
        마감됨
      </span>
    );
  }

  // Today
  if (days === 0) {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700 ${className}`}>
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-600" />
        </span>
        오늘 마감
      </span>
    );
  }

  // D-1 to D-3: Red
  if (days <= 3) {
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700 ${className}`}>
        D-{days}
      </span>
    );
  }

  // D-4 to D-7: Orange
  if (days <= 7) {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-700 ${className}`}>
        마감 임박 D-{days}
      </span>
    );
  }

  // D-8 to D-30: Yellow
  if (days <= 30) {
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 ${className}`}>
        D-{days}
      </span>
    );
  }

  // D-30+: Gray
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500 ${className}`}>
      D-{days}
    </span>
  );
}
