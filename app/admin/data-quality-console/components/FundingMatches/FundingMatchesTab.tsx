'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ColumnDef, SortingState } from '@tanstack/react-table';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '../shared/DataTable';
import { DetailDrawer } from '../shared/DetailDrawer';
import { StatsBar } from '../shared/StatsBar';
import { ExportCSV } from '../shared/ExportCSV';

const API_ENDPOINT = '/api/admin/data-quality-console/funding-matches';
const PAGE_SIZE = 50;

const formatDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('ko-KR') : '\u2014';

const scoreColor = (score: number) => {
  if (score >= 80) return 'bg-green-100 text-green-800';
  if (score >= 60) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
};

const fieldGroups = [
  {
    title: '매칭정보',
    icon: '\uD83D\uDD17',
    fields: [
      { label: 'ID', key: 'id', type: 'text' as const },
      { label: '기업명', key: 'organizations.name', type: 'text' as const },
      { label: '기업 유형', key: 'organizations.type', type: 'text' as const },
      { label: '공고 제목', key: 'funding_programs.title', type: 'text' as const },
      { label: '기관', key: 'funding_programs.agencyId', type: 'text' as const },
      { label: '공고 상태', key: 'funding_programs.status', type: 'text' as const },
    ],
  },
  {
    title: '점수',
    icon: '\uD83D\uDCCA',
    fields: [
      { label: '총점', key: 'score', type: 'number' as const },
      { label: '개인화 점수', key: 'personalizedScore', type: 'number' as const },
      { label: '개인화일', key: 'personalizedAt', type: 'date' as const },
      { label: '설명', key: 'explanation', type: 'json' as const },
    ],
  },
  {
    title: '사용자 행동',
    icon: '\uD83D\uDC64',
    fields: [
      { label: '조회', key: 'viewed', type: 'boolean' as const },
      { label: '조회일', key: 'viewedAt', type: 'date' as const },
      { label: '저장', key: 'saved', type: 'boolean' as const },
      { label: '저장일', key: 'savedAt', type: 'date' as const },
      { label: '알림발송', key: 'notificationSent', type: 'boolean' as const },
      { label: '알림일', key: 'notifiedAt', type: 'date' as const },
    ],
  },
  {
    title: '메타데이터',
    icon: '\uD83D\uDDC4\uFE0F',
    fields: [
      { label: '생성일', key: 'createdAt', type: 'date' as const },
    ],
  },
];

export default function FundingMatchesTab() {
  const [data, setData] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'createdAt', desc: true },
  ]);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(PAGE_SIZE));
      if (search) params.set('search', search);
      if (sorting.length > 0) {
        params.set('sortBy', sorting[0].id);
        params.set('sortOrder', sorting[0].desc ? 'desc' : 'asc');
      }
      Object.entries(filters).forEach(([k, v]) => {
        if (v && v !== 'ALL') params.set(k, v);
      });

      const res = await fetch(`${API_ENDPOINT}?${params}`);
      const json = await res.json();
      setData(json.data || []);
      setTotalCount(json.totalCount || 0);
      setStats(json.stats || null);
    } catch (e) {
      console.error('FundingMatchesTab fetch error:', e);
    }
    setIsLoading(false);
  }, [page, sorting, search, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleRowClick = (row: any) => {
    setSelectedRow(row);
    setDrawerOpen(true);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const columns: ColumnDef<any>[] = useMemo(
    () => [
      {
        accessorKey: 'id',
        header: 'ID',
        size: 80,
        cell: ({ getValue }) => {
          const v = getValue() as string;
          return v && v.length > 8 ? v.slice(0, 8) + '...' : v || '\u2014';
        },
      },
      {
        accessorFn: (row) => row.organizations?.name,
        id: 'orgName',
        header: '기업명',
        size: 150,
      },
      {
        accessorFn: (row) => row.funding_programs?.title,
        id: 'programTitle',
        header: '공고 제목',
        size: 250,
        cell: ({ getValue }) => {
          const v = getValue() as string;
          return v && v.length > 50 ? v.slice(0, 50) + '...' : v || '\u2014';
        },
      },
      {
        accessorKey: 'score',
        header: '점수',
        size: 70,
        cell: ({ getValue }) => {
          const v = getValue() as number;
          return (
            <Badge className={scoreColor(v)} variant="secondary">
              {v}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'personalizedScore',
        header: '개인화 점수',
        size: 100,
        cell: ({ getValue }) => {
          const v = getValue() as number | null;
          return v != null ? v : '\u2014';
        },
      },
      {
        accessorKey: 'viewed',
        header: '조회',
        size: 60,
        cell: ({ getValue }) => (getValue() ? '\u2705' : '\u274C'),
      },
      {
        accessorKey: 'saved',
        header: '저장',
        size: 60,
        cell: ({ getValue }) => (getValue() ? '\u2705' : '\u274C'),
      },
      {
        accessorKey: 'createdAt',
        header: '생성일',
        size: 110,
        cell: ({ getValue }) => formatDate(getValue() as string | null),
      },
    ],
    []
  );

  const statsItems = stats
    ? [
        { label: '전체 매칭', value: stats.total ?? 0 },
        { label: '평균 점수', value: stats.avgScore ?? 0 },
        { label: '조회율', value: `${stats.viewedPercent ?? 0}%` },
        { label: '저장율', value: `${stats.savedPercent ?? 0}%` },
        { label: '개인화 적용', value: stats.personalizedCount ?? 0, color: 'blue' as const },
        { label: '고유 기업', value: stats.uniqueOrgs ?? 0 },
      ]
    : [];

  const activeFilters = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v && v !== 'ALL')
  );

  return (
    <div className="space-y-6">
      <StatsBar stats={statsItems} isLoading={isLoading && !stats} />

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="기업명, 공고 검색..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-64"
        />
        <Input
          placeholder="기업 ID로 필터"
          value={filters.organizationId || ''}
          onChange={(e) => handleFilterChange('organizationId', e.target.value)}
          className="w-48"
        />
        <Input
          placeholder="최소 점수"
          type="number"
          value={filters.scoreMin || ''}
          onChange={(e) => handleFilterChange('scoreMin', e.target.value)}
          className="w-28"
        />
        <Input
          placeholder="최대 점수"
          type="number"
          value={filters.scoreMax || ''}
          onChange={(e) => handleFilterChange('scoreMax', e.target.value)}
          className="w-28"
        />
        <Select
          value={filters.viewed || 'ALL'}
          onValueChange={(v) => handleFilterChange('viewed', v)}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="조회" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">전체 조회</SelectItem>
            <SelectItem value="true">조회함</SelectItem>
            <SelectItem value="false">미조회</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.saved || 'ALL'}
          onValueChange={(v) => handleFilterChange('saved', v)}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="저장" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">전체 저장</SelectItem>
            <SelectItem value="true">저장함</SelectItem>
            <SelectItem value="false">미저장</SelectItem>
          </SelectContent>
        </Select>
        <ExportCSV
          endpoint={API_ENDPOINT}
          filters={activeFilters}
          filename={`funding_matches_${new Date().toISOString().slice(0, 10)}`}
        />
      </div>

      <DataTable
        columns={columns}
        data={data}
        totalCount={totalCount}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        sorting={sorting}
        onSortingChange={setSorting}
        onRowClick={handleRowClick}
        isLoading={isLoading}
      />

      <DetailDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={
          selectedRow?.organizations?.name
            ? `${selectedRow.organizations.name} Funding 매칭 상세`
            : 'Funding 매칭 상세'
        }
        data={selectedRow}
        fieldGroups={fieldGroups}
      />
    </div>
  );
}
