'use client';

const BIZ_TYPE_ORDER = ['기술', '금융', '창업', '수출', '인력', '내수', '경영', '소상공인', '중견', '기타'];

interface BizTypeCount {
  category: string;
  count: number;
  percentage: number;
}

interface SMEStatsBarProps {
  stats: {
    totalMatches: number;
    avgScore: number;
    fullyEligibleCount: number;
    urgentCount: number;
  };
  bizTypeCounts?: BizTypeCount[];
  activeBizType?: string;
  onBizTypeClick?: (bizType: string) => void;
}

export function SMEStatsBar({
  stats,
  bizTypeCounts = [],
  activeBizType = '',
  onBizTypeClick,
}: SMEStatsBarProps) {
  const countMap = new Map(bizTypeCounts.map((b) => [b.category, b.count]));

  const categories = BIZ_TYPE_ORDER.map((category) => ({
    category,
    count: countMap.get(category) || 0,
  }));

  const totalCount = stats.totalMatches;

  const handleClick = (category: string) => {
    onBizTypeClick?.(category);
  };

  if (bizTypeCounts.length === 0) return null;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-3 text-[13px]">
        <button
          type="button"
          onClick={() => handleClick('')}
          className={`px-1 pb-0.5 border-b-2 transition-colors duration-150 ${
            activeBizType === ''
              ? 'border-gray-900 font-semibold text-gray-900'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          전체 <span className={`tabular-nums ${activeBizType === '' ? 'text-gray-400' : 'text-gray-400'}`}>{totalCount}</span>
        </button>

        {categories.map(({ category, count }) => {
          const isActive = activeBizType === category;
          const isZero = count === 0;

          return (
            <button
              key={category}
              type="button"
              onClick={() => handleClick(category)}
              disabled={isZero}
              className={`px-1 pb-0.5 border-b-2 transition-colors duration-150 ${
                isActive
                  ? 'border-gray-900 font-semibold text-gray-900'
                  : isZero
                    ? 'border-transparent text-gray-300 cursor-not-allowed'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {category}{' '}
              <span
                className={`tabular-nums ${
                  isActive ? 'text-gray-400' : isZero ? 'text-gray-200' : 'text-gray-400'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
