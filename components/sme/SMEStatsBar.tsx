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

  const metrics = [
    {
      label: '전체 매칭',
      value: stats.totalMatches,
      accent: 'text-violet-700',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      ),
    },
    {
      label: '평균 적합도',
      value: `${stats.avgScore}점`,
      accent: 'text-violet-700',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      ),
    },
    {
      label: '자격 충족',
      value: stats.fullyEligibleCount,
      accent: 'text-emerald-700',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
        </svg>
      ),
    },
    {
      label: '긴급 마감',
      value: stats.urgentCount,
      accent: stats.urgentCount > 0 ? 'text-red-600' : 'text-gray-500',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

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

      {/* Metrics row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {metrics.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/60 backdrop-blur-sm"
          >
            <div className={`flex-shrink-0 ${item.accent}`}>
              {item.icon}
            </div>
            <div className="min-w-0">
              <div className={`text-base font-bold leading-tight tabular-nums ${item.accent}`}>
                {item.value}
              </div>
              <div className="text-[11px] text-gray-500 truncate">{item.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
