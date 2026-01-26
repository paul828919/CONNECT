'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface FilterState {
  bizType: string;
  eligibility: string;
  region: string;
  urgentOnly: boolean;
  sort: string;
}

export const DEFAULT_FILTERS: FilterState = {
  bizType: '',
  eligibility: '',
  region: '',
  urgentOnly: false,
  sort: 'score',
};

interface SMEFilterBarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
}

const BIZ_TYPES = [
  { value: '', label: '전체 사업유형' },
  { value: '기술', label: '기술개발' },
  { value: '금융', label: '금융지원' },
  { value: '창업', label: '창업지원' },
  { value: '수출', label: '수출지원' },
  { value: '인력', label: '인력지원' },
  { value: '내수', label: '내수판로' },
];

const ELIGIBILITY_OPTIONS = [
  { value: '', label: '전체 자격수준' },
  { value: 'FULLY_ELIGIBLE', label: '완전 적합' },
  { value: 'CONDITIONALLY_ELIGIBLE', label: '조건부 적합' },
];

const REGIONS = [
  { value: '', label: '전체 지역' },
  { value: '서울', label: '서울' },
  { value: '경기', label: '경기' },
  { value: '인천', label: '인천' },
  { value: '부산', label: '부산' },
  { value: '대구', label: '대구' },
  { value: '광주', label: '광주' },
  { value: '대전', label: '대전' },
  { value: '울산', label: '울산' },
  { value: '세종', label: '세종' },
  { value: '강원', label: '강원' },
  { value: '충북', label: '충북' },
  { value: '충남', label: '충남' },
  { value: '전북', label: '전북' },
  { value: '전남', label: '전남' },
  { value: '경북', label: '경북' },
  { value: '경남', label: '경남' },
  { value: '제주', label: '제주' },
];

const SORT_OPTIONS = [
  { value: 'score', label: '적합도순' },
  { value: 'deadline', label: '마감일순' },
  { value: 'amount', label: '지원금액순' },
  { value: 'created', label: '최신순' },
];

export function SMEFilterBar({ filters, onFilterChange }: SMEFilterBarProps) {
  const update = (partial: Partial<FilterState>) => {
    onFilterChange({ ...filters, ...partial });
  };

  const activeFilterCount = [
    filters.bizType,
    filters.eligibility,
    filters.region,
    filters.urgentOnly,
  ].filter(Boolean).length;

  const handleReset = () => {
    onFilterChange({ ...DEFAULT_FILTERS });
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <Select
            value={filters.bizType || '__all__'}
            onValueChange={(v) => update({ bizType: v === '__all__' ? '' : v })}
          >
            <SelectTrigger className="w-[140px] h-9 text-sm border-gray-200">
              <SelectValue placeholder="사업유형" />
            </SelectTrigger>
            <SelectContent>
              {BIZ_TYPES.map((opt) => (
                <SelectItem key={opt.value || '__all__'} value={opt.value || '__all__'}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.eligibility || '__all__'}
            onValueChange={(v) => update({ eligibility: v === '__all__' ? '' : v })}
          >
            <SelectTrigger className="w-[140px] h-9 text-sm border-gray-200">
              <SelectValue placeholder="자격수준" />
            </SelectTrigger>
            <SelectContent>
              {ELIGIBILITY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value || '__all__'} value={opt.value || '__all__'}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.region || '__all__'}
            onValueChange={(v) => update({ region: v === '__all__' ? '' : v })}
          >
            <SelectTrigger className="w-[120px] h-9 text-sm border-gray-200">
              <SelectValue placeholder="지역" />
            </SelectTrigger>
            <SelectContent>
              {REGIONS.map((opt) => (
                <SelectItem key={opt.value || '__all__'} value={opt.value || '__all__'}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Urgent toggle */}
          <button
            type="button"
            onClick={() => update({ urgentOnly: !filters.urgentOnly })}
            className={`inline-flex items-center gap-1.5 px-3 h-9 rounded-md border text-sm font-medium transition-colors ${
              filters.urgentOnly
                ? 'border-red-300 bg-red-50 text-red-700'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            마감임박
          </button>

          {/* Reset */}
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 px-2.5 h-9 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              초기화
            </button>
          )}
        </div>

        {/* Sort (right-aligned) */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">정렬</span>
          <Select
            value={filters.sort}
            onValueChange={(v) => update({ sort: v })}
          >
            <SelectTrigger className="w-[120px] h-9 text-sm border-gray-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
