'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ColumnDef, SortingState } from '@tanstack/react-table';
import { Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
import { DeleteConfirmDialog } from '../shared/DeleteConfirmDialog';
import { useDeleteRow } from '../shared/useDeleteRow';

const API_ENDPOINT = '/api/admin/data-quality-console/funding-programs';
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

const agencyColor: Record<string, string> = {
  IITP: 'bg-blue-100 text-blue-800',
  KEIT: 'bg-purple-100 text-purple-800',
  TIPA: 'bg-indigo-100 text-indigo-800',
  KIMST: 'bg-teal-100 text-teal-800',
  NTIS: 'bg-orange-100 text-orange-800',
};

const fieldGroups = [
  {
    title: '기본정보',
    icon: '\uD83D\uDCCB',
    fields: [
      { label: 'ID', key: 'id', type: 'text' as const },
      { label: '제목', key: 'title', type: 'text' as const },
      { label: '설명', key: 'description', type: 'text' as const },
      { label: '기관 ID', key: 'agencyId', type: 'text' as const },
      { label: '공고 URL', key: 'announcementUrl', type: 'url' as const },
      { label: '공고유형', key: 'announcementType', type: 'text' as const },
      { label: '공고기관', key: 'announcingAgency', type: 'text' as const },
      { label: '부처', key: 'ministry', type: 'text' as const },
      { label: '카테고리', key: 'category', type: 'text' as const },
      { label: '키워드', key: 'keywords', type: 'array' as const },
    ],
  },
  {
    title: '일정',
    icon: '\uD83D\uDCC5',
    fields: [
      { label: '마감일', key: 'deadline', type: 'date' as const },
      { label: '신청시작', key: 'applicationStart', type: 'date' as const },
      { label: '게시일', key: 'publishedAt', type: 'date' as const },
      { label: '수집일', key: 'scrapedAt', type: 'date' as const },
      { label: '최종확인', key: 'lastCheckedAt', type: 'date' as const },
    ],
  },
  {
    title: '예산',
    icon: '\uD83D\uDCB0',
    fields: [
      { label: '예산액', key: 'budgetAmount', type: 'number' as const },
      { label: '지원기간', key: 'fundingPeriod', type: 'text' as const },
    ],
  },
  {
    title: 'TRL',
    icon: '\uD83D\uDD2C',
    fields: [
      { label: '최소 TRL', key: 'minTrl', type: 'number' as const },
      { label: '최대 TRL', key: 'maxTrl', type: 'number' as const },
      { label: 'TRL 분류', key: 'trlClassification', type: 'json' as const },
      { label: 'TRL 신뢰도', key: 'trlConfidence', type: 'text' as const },
      { label: 'TRL 추론', key: 'trlInferred', type: 'boolean' as const },
    ],
  },
  {
    title: '자격요건',
    icon: '\uD83D\uDCCC',
    fields: [
      { label: '대상유형', key: 'targetType', type: 'array' as const },
      { label: '허용 사업구조', key: 'allowedBusinessStructures', type: 'array' as const },
      { label: '자격기준', key: 'eligibilityCriteria', type: 'json' as const },
      { label: '필수인증', key: 'requiredCertifications', type: 'array' as const },
      { label: '우대인증', key: 'preferredCertifications', type: 'array' as const },
      { label: '최소종업원', key: 'requiredMinEmployees', type: 'number' as const },
      { label: '최대종업원', key: 'requiredMaxEmployees', type: 'number' as const },
      { label: '최소매출', key: 'requiredMinRevenue', type: 'number' as const },
      { label: '최대매출', key: 'requiredMaxRevenue', type: 'number' as const },
      { label: '필수투자액', key: 'requiredInvestmentAmount', type: 'number' as const },
      { label: '필수업력', key: 'requiredOperatingYears', type: 'number' as const },
      { label: '최대업력', key: 'maxOperatingYears', type: 'number' as const },
      { label: '연구소 필수', key: 'requiresResearchInstitute', type: 'boolean' as const },
    ],
  },
  {
    title: '시맨틱 보강',
    icon: '\uD83E\uDDE0',
    fields: [
      { label: '주요 대상 산업', key: 'primaryTargetIndustry', type: 'text' as const },
      { label: '보조 대상 산업', key: 'secondaryTargetIndustries', type: 'array' as const },
      { label: '시맨틱 하위도메인', key: 'semanticSubDomain', type: 'json' as const },
      { label: '기술 도메인', key: 'technologyDomainsSpecific', type: 'array' as const },
      { label: '대상 기업 프로필', key: 'targetCompanyProfile', type: 'text' as const },
      { label: '프로그램 목적', key: 'programIntent', type: 'text' as const },
      { label: '시맨틱 신뢰도', key: 'semanticConfidence', type: 'number' as const },
      { label: '시맨틱 보강일', key: 'semanticEnrichedAt', type: 'date' as const },
      { label: '보강 모델', key: 'semanticEnrichmentModel', type: 'text' as const },
    ],
  },
  {
    title: '메타데이터',
    icon: '\uD83D\uDDC4\uFE0F',
    fields: [
      { label: '상태', key: 'status', type: 'text' as const },
      { label: '신뢰도', key: 'eligibilityConfidence', type: 'text' as const },
      { label: 'contentHash', key: 'contentHash', type: 'text' as const },
      { label: '수동검토 필요', key: 'manualReviewRequired', type: 'boolean' as const },
      { label: '수동검토 메모', key: 'manualReviewNotes', type: 'text' as const },
      { label: '수동검토 완료일', key: 'manualReviewCompletedAt', type: 'date' as const },
      { label: '생성일', key: 'createdAt', type: 'date' as const },
      { label: '수정일', key: 'updatedAt', type: 'date' as const },
      { label: '매칭 수', key: '_count.funding_matches', type: 'number' as const },
    ],
  },
];

export default function FundingProgramsTab() {
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
  const [rowToDelete, setRowToDelete] = useState<any>(null);
  const [deleteMatchCount, setDeleteMatchCount] = useState<number | undefined>(undefined);
  const { deleteRow, isDeleting } = useDeleteRow({
    tableName: 'funding-programs',
    onSuccess: () => fetchData(),
  });

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
      console.error('FundingProgramsTab fetch error:', e);
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
        accessorKey: 'agencyId',
        header: '기관',
        size: 70,
        cell: ({ getValue }) => {
          const v = getValue() as string;
          return (
            <Badge className={agencyColor[v] || 'bg-gray-100 text-gray-800'} variant="secondary">
              {v}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'title',
        header: '제목',
        size: 300,
        cell: ({ getValue }) => {
          const v = getValue() as string;
          return v && v.length > 60 ? v.slice(0, 60) + '...' : v || '\u2014';
        },
      },
      { accessorKey: 'announcementType', header: '공고유형', size: 100 },
      {
        accessorKey: 'deadline',
        header: '마감일',
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
      { accessorKey: 'programIntent', header: '프로그램 목적', size: 120 },
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
          return v?.funding_matches ?? 0;
        },
      },
      {
        accessorKey: 'scrapedAt',
        header: '수집일',
        size: 110,
        cell: ({ getValue }) => formatDate(getValue() as string | null),
      },
      {
        id: 'actions',
        header: '',
        size: 50,
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-gray-400 hover:text-red-600"
            onClick={(e) => {
              e.stopPropagation();
              const r = row.original;
              setDeleteMatchCount(r._count?.funding_matches ?? 0);
              setRowToDelete(r);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    []
  );

  const statsItems = stats
    ? [
        { label: '전체 프로그램', value: stats.total ?? 0 },
        {
          label: '기관별',
          value: stats.total ?? 0,
          subLabel: stats.byAgency
            ? Object.entries(stats.byAgency)
                .map(([k, v]) => `${k}: ${v}`)
                .join(' / ')
            : undefined,
        },
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
          placeholder="제목, 키워드 검색..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-64"
        />
        <Select
          value={filters.agencyId || 'ALL'}
          onValueChange={(v) => handleFilterChange('agencyId', v)}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="기관" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">전체 기관</SelectItem>
            <SelectItem value="IITP">IITP</SelectItem>
            <SelectItem value="KEIT">KEIT</SelectItem>
            <SelectItem value="TIPA">TIPA</SelectItem>
            <SelectItem value="KIMST">KIMST</SelectItem>
            <SelectItem value="NTIS">NTIS</SelectItem>
          </SelectContent>
        </Select>
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
          value={filters.announcementType || 'ALL'}
          onValueChange={(v) => handleFilterChange('announcementType', v)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="공고유형" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">전체 유형</SelectItem>
            <SelectItem value="R_D_PROJECT">R_D_PROJECT</SelectItem>
            <SelectItem value="SURVEY">SURVEY</SelectItem>
            <SelectItem value="EVENT">EVENT</SelectItem>
            <SelectItem value="NOTICE">NOTICE</SelectItem>
            <SelectItem value="UNKNOWN">UNKNOWN</SelectItem>
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
        <Select
          value={filters.programIntent || 'ALL'}
          onValueChange={(v) => handleFilterChange('programIntent', v)}
        >
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="프로그램 목적" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">전체 목적</SelectItem>
            <SelectItem value="BASIC_RESEARCH">BASIC_RESEARCH</SelectItem>
            <SelectItem value="APPLIED_RESEARCH">APPLIED_RESEARCH</SelectItem>
            <SelectItem value="COMMERCIALIZATION">COMMERCIALIZATION</SelectItem>
            <SelectItem value="INFRASTRUCTURE">INFRASTRUCTURE</SelectItem>
            <SelectItem value="POLICY_SUPPORT">POLICY_SUPPORT</SelectItem>
          </SelectContent>
        </Select>
        <ExportCSV
          endpoint={API_ENDPOINT}
          filters={activeFilters}
          filename={`funding_programs_${new Date().toISOString().slice(0, 10)}`}
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
        title={selectedRow?.title || 'Funding 프로그램 상세'}
        data={selectedRow}
        fieldGroups={fieldGroups}
        completeness={selectedRow?.completeness}
      />

      <DeleteConfirmDialog
        open={!!rowToDelete}
        onOpenChange={(open) => { if (!open) setRowToDelete(null); }}
        title={rowToDelete?.title || rowToDelete?.id || ''}
        matchCount={deleteMatchCount}
        isDeleting={isDeleting}
        onConfirm={async () => {
          if (rowToDelete) {
            await deleteRow(rowToDelete.id);
            setRowToDelete(null);
          }
        }}
      />
    </div>
  );
}
