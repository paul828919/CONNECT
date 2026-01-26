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

export function SMEStatsBar({ stats, bizTypeCounts = [], activeBizType = '', onBizTypeClick }: SMEStatsBarProps) {
  // Build a lookup map for quick access
  const countMap = new Map(bizTypeCounts.map((b) => [b.category, b.count]));

  // Sort pills by fixed order, include all categories even if count is 0
  const sortedPills = BIZ_TYPE_ORDER.map((category) => ({
    category,
    count: countMap.get(category) || 0,
  }));

  const totalCount = stats.totalMatches;

  const handlePillClick = (category: string) => {
    if (!onBizTypeClick) return;
    onBizTypeClick(category);
  };

  return (
    <div className="rounded-xl border border-violet-100 bg-gradient-to-r from-violet-50/80 via-purple-50/50 to-fuchsia-50/30 p-4 space-y-3">
      {/* BizType pill navigation */}
      {bizTypeCounts.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">사업유형별 매칭 현황</h3>
          <div className="flex flex-wrap gap-1.5">
            {/* 전체 pill */}
            <button
              type="button"
              onClick={() => handlePillClick('')}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeBizType === ''
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-violet-50'
              }`}
            >
              전체
              <span className={`tabular-nums ${activeBizType === '' ? 'text-violet-200' : 'text-gray-400'}`}>
                {totalCount}
              </span>
            </button>

            {/* Category pills in fixed order */}
            {sortedPills.map(({ category, count }) => {
              const isActive = activeBizType === category;
              const isZero = count === 0;

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => handlePillClick(category)}
                  disabled={isZero}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-violet-600 text-white shadow-sm'
                      : isZero
                        ? 'bg-white border border-gray-200 text-gray-400 opacity-40 cursor-not-allowed'
                        : 'bg-white border border-gray-200 text-gray-700 hover:bg-violet-50'
                  }`}
                >
                  {category}
                  <span className={`tabular-nums ${isActive ? 'text-violet-200' : 'text-gray-400'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
