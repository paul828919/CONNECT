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
import { CompletenessBar } from '../shared/CompletenessBar';
import { StatsBar } from '../shared/StatsBar';
import { ExportCSV } from '../shared/ExportCSV';

const API_ENDPOINT = '/api/admin/data-quality-console/sme-programs';
const PAGE_SIZE = 50;

const formatDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('ko-KR') : '\u2014';

const statusColor: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  EXPIRED: 'bg-gray-100 text-gray-800',
  ARCHIVED: 'bg-yellow-100 text-yellow-800',
};

const confidenceColor: Record<string, string> = {
  HIGH: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  LOW: 'bg-red-100 text-red-800',
};

const fieldGroups = [
  {
    title: '기본정보',
    icon: '\uD83D\uDCCB',
    fields: [
      { label: 'ID', key: 'id', type: 'text' as const },
      { label: '공고번호', key: 'pblancSeq', type: 'number' as const },
      { label: '제목', key: 'title', type: 'text' as const },
      { label: '세부사업명', key: 'detailBsnsNm', type: 'text' as const },
      { label: '사업개요', key: 'description', type: 'text' as const },
      { label: '지원규모', key: 'supportScale', type: 'text' as const },
      { label: '지원내용', key: 'supportContents', type: 'text' as const },
      { label: '지원대상', key: 'supportTarget', type: 'text' as const },
      { label: '신청방법', key: 'applicationMethod', type: 'text' as const },
    ],
  },
  {
    title: '기관 및 연락처',
    icon: '\uD83C\uDFE2',
    fields: [
      { label: '지원기관', key: 'supportInstitution', type: 'text' as const },
      { label: '문의처', key: 'contactInfo', type: 'text' as const },
      { label: '문의 URL', key: 'contactUrl', type: 'url' as const },
      { label: '문의부서', key: 'contactDept', type: 'text' as const },
      { label: '문의전화', key: 'contactTel', type: 'text' as const },
      { label: '연계기관', key: 'linkedInstitution', type: 'text' as const },
    ],
  },
  {
    title: 'URL 및 첨부',
    icon: '\uD83D\uDD17',
    fields: [
      { label: '상세 URL', key: 'detailUrl', type: 'url' as const },
      { label: '신청 URL', key: 'applicationUrl', type: 'url' as const },
      { label: '첨부파일', key: 'attachmentUrls', type: 'array' as const },
      { label: '첨부파일명', key: 'attachmentNames', type: 'array' as const },
      { label: '공고문 URL', key: 'announcementFileUrl', type: 'url' as const },
    ],
  },
  {
    title: '일정',
    icon: '\uD83D\uDCC5',
    fields: [
      { label: '신청시작', key: 'applicationStart', type: 'date' as const },
      { label: '신청마감', key: 'applicationEnd', type: 'date' as const },
      { label: 'API 등록일', key: 'apiCreatedAt', type: 'date' as const },
      { label: 'API 수정일', key: 'apiUpdatedAt', type: 'date' as const },
    ],
  },
  {
    title: '분류',
    icon: '\uD83C\uDFF7\uFE0F',
    fields: [
      { label: '사업유형', key: 'bizType', type: 'text' as const },
      { label: '지원유형', key: 'sportType', type: 'text' as const },
      { label: '생애주기', key: 'lifeCycle', type: 'array' as const },
    ],
  },
  {
    title: '자격요건',
    icon: '\uD83D\uDCCC',
    fields: [
      { label: '대상지역', key: 'targetRegions', type: 'array' as const },
      { label: '기업규모', key: 'targetCompanyScale', type: 'array' as const },
      { label: '매출범위', key: 'targetSalesRange', type: 'array' as const },
      { label: '최소매출', key: 'minSalesAmount', type: 'number' as const },
      { label: '최대매출', key: 'maxSalesAmount', type: 'number' as const },
      { label: '종업원수', key: 'targetEmployeeRange', type: 'array' as const },
      { label: '최소종업원', key: 'minEmployeeCount', type: 'number' as const },
      { label: '최대종업원', key: 'maxEmployeeCount', type: 'number' as const },
      { label: '업력', key: 'targetBusinessAge', type: 'array' as const },
      { label: '최소업력', key: 'minBusinessAge', type: 'number' as const },
      { label: '최대업력', key: 'maxBusinessAge', type: 'number' as const },
      { label: '대표자연령', key: 'targetCeoAge', type: 'number' as const },
      { label: '업종', key: 'targetIndustry', type: 'text' as const },
      { label: '필요인증', key: 'requiredCerts', type: 'array' as const },
    ],
  },
  {
    title: '지원금액',
    icon: '\uD83D\uDCB0',
    fields: [
      { label: '최소지원', key: 'minSupportAmount', type: 'number' as const },
      { label: '최대지원', key: 'maxSupportAmount', type: 'number' as const },
      { label: '최소금리', key: 'minInterestRate', type: 'number' as const },
      { label: '최대금리', key: 'maxInterestRate', type: 'number' as const },
    ],
  },
  {
    title: '특수조건',
    icon: '\u26A1',
    fields: [
      { label: '재창업', key: 'isRestart', type: 'boolean' as const },
      { label: '예비창업', key: 'isPreStartup', type: 'boolean' as const },
      { label: '여성대표', key: 'isFemaleOwner', type: 'boolean' as const },
    ],
  },
  {
    title: '메타데이터',
    icon: '\uD83D\uDDC4\uFE0F',
    fields: [
      { label: '상태', key: 'status', type: 'text' as const },
      { label: '신뢰도', key: 'eligibilityConfidence', type: 'text' as const },
      { label: 'contentHash', key: 'contentHash', type: 'text' as const },
      { label: '동기화일', key: 'syncedAt', type: 'date' as const },
      { label: '생성일', key: 'createdAt', type: 'date' as const },
      { label: '수정일', key: 'updatedAt', type: 'date' as const },
      { label: '상세페이지 스크랩일', key: 'detailPageScrapedAt', type: 'date' as const },
      { label: '매칭 수', key: '_count.matches', type: 'number' as const },
    ],
  },
];

export default function SmeProgramsTab() {
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
      console.error('SmeProgramsTab fetch error:', e);
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
      { accessorKey: 'pblancSeq', header: '공고번호', size: 90 },
      {
        accessorKey: 'title',
        header: '제목',
        size: 300,
        cell: ({ getValue }) => {
          const v = getValue() as string;
          return v && v.length > 60 ? v.slice(0, 60) + '...' : v || '\u2014';
        },
      },
      { accessorKey: 'supportInstitution', header: '지원기관', size: 120 },
      { accessorKey: 'bizType', header: '사업유형', size: 100 },
      {
        accessorKey: 'applicationEnd',
        header: '신청마감',
        size: 110,
        cell: ({ getValue }) => formatDate(getValue() as string | null),
      },
      {
        accessorKey: 'status',
        header: '상태',
        size: 80,
        cell: ({ getValue }) => {
          const v = getValue() as string;
          return (
            <Badge className={statusColor[v] || 'bg-gray-100 text-gray-800'} variant="secondary">
              {v}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'eligibilityConfidence',
        header: '신뢰도',
        size: 80,
        cell: ({ getValue }) => {
          const v = getValue() as string;
          return (
            <Badge className={confidenceColor[v] || 'bg-gray-100 text-gray-800'} variant="secondary">
              {v}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'completeness',
        header: '데이터 완성도',
        size: 130,
        cell: ({ getValue }) => {
          const v = getValue() as any;
          if (v == null) return '\u2014';
          const percent = typeof v === 'number' ? v : (v.percent ?? 0);
          return <CompletenessBar percent={percent} size="sm" />;
        },
      },
      {
        accessorKey: '_count',
        header: '매칭 수',
        size: 80,
        cell: ({ getValue }) => {
          const v = getValue() as any;
          return v?.matches ?? 0;
        },
      },
      {
        accessorKey: 'syncedAt',
        header: '동기화',
        size: 110,
        cell: ({ getValue }) => formatDate(getValue() as string | null),
      },
    ],
    []
  );

  const statsItems = stats
    ? [
        { label: '전체 프로그램', value: stats.total ?? 0 },
        { label: '활성', value: stats.active ?? 0, color: 'green' as const },
        { label: '만료', value: stats.expired ?? 0, color: 'default' as const },
        { label: '평균 완성도', value: `${stats.avgCompleteness ?? 0}%` },
        { label: '낮은 신뢰도', value: stats.lowConfidence ?? 0, color: 'red' as const },
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
          placeholder="제목, 공고번호 검색..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-64"
        />
        <Select
          value={filters.status || 'ALL'}
          onValueChange={(v) => handleFilterChange('status', v)}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">전체 상태</SelectItem>
            <SelectItem value="ACTIVE">ACTIVE</SelectItem>
            <SelectItem value="EXPIRED">EXPIRED</SelectItem>
            <SelectItem value="ARCHIVED">ARCHIVED</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.eligibilityConfidence || 'ALL'}
          onValueChange={(v) => handleFilterChange('eligibilityConfidence', v)}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="신뢰도" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">전체 신뢰도</SelectItem>
            <SelectItem value="HIGH">HIGH</SelectItem>
            <SelectItem value="MEDIUM">MEDIUM</SelectItem>
            <SelectItem value="LOW">LOW</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="사업유형"
          value={filters.bizType || ''}
          onChange={(e) => handleFilterChange('bizType', e.target.value)}
          className="w-40"
        />
        <Select
          value={filters.hasDetailPage || 'ALL'}
          onValueChange={(v) => handleFilterChange('hasDetailPage', v)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="상세페이지" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">상세페이지 전체</SelectItem>
            <SelectItem value="true">있음</SelectItem>
            <SelectItem value="false">없음</SelectItem>
          </SelectContent>
        </Select>
        <ExportCSV
          endpoint={API_ENDPOINT}
          filters={activeFilters}
          filename={`sme_programs_${new Date().toISOString().slice(0, 10)}`}
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
        title={selectedRow?.title || 'SME 프로그램 상세'}
        data={selectedRow}
        fieldGroups={fieldGroups}
        completeness={selectedRow?.completeness}
      />
    </div>
  );
}
