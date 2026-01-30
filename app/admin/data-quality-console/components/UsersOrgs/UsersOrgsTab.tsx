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

const API_ENDPOINT = '/api/admin/data-quality-console/users-orgs';
const PAGE_SIZE = 50;

const formatDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('ko-KR') : '\u2014';

const roleColor: Record<string, string> = {
  USER: 'bg-gray-100 text-gray-800',
  ADMIN: 'bg-blue-100 text-blue-800',
  SUPER_ADMIN: 'bg-purple-100 text-purple-800',
};

const planColor: Record<string, string> = {
  FREE: 'bg-gray-100 text-gray-800',
  PRO: 'bg-blue-100 text-blue-800',
  TEAM: 'bg-purple-100 text-purple-800',
};

const fieldGroups = [
  {
    title: '사용자정보',
    icon: '\uD83D\uDC64',
    fields: [
      { label: 'ID', key: 'id', type: 'text' as const },
      { label: '이메일', key: 'email', type: 'text' as const },
      { label: '이름', key: 'name', type: 'text' as const },
      { label: '역할', key: 'role', type: 'text' as const },
      { label: '이미지', key: 'image', type: 'url' as const },
      { label: '마지막 로그인', key: 'lastLoginAt', type: 'date' as const },
      { label: '이메일 인증일', key: 'emailVerified', type: 'date' as const },
      { label: '이메일 알림', key: 'emailNotifications', type: 'boolean' as const },
      { label: '주간 다이제스트', key: 'weeklyDigest', type: 'boolean' as const },
    ],
  },
  {
    title: '프로필',
    icon: '\uD83D\uDCDD',
    fields: [
      { label: 'LinkedIn URL', key: 'linkedinUrl', type: 'url' as const },
      { label: 'Remember URL', key: 'rememberUrl', type: 'url' as const },
      { label: '직책', key: 'position', type: 'text' as const },
      { label: '파트너 프로필 표시', key: 'showOnPartnerProfile', type: 'boolean' as const },
    ],
  },
  {
    title: '기업정보',
    icon: '\uD83C\uDFE2',
    fields: [
      { label: '기업명', key: 'organization.name', type: 'text' as const },
      { label: '기업유형', key: 'organization.type', type: 'text' as const },
      { label: '사업구조', key: 'organization.businessStructure', type: 'text' as const },
      { label: '설명', key: 'organization.description', type: 'text' as const },
      { label: '웹사이트', key: 'organization.website', type: 'url' as const },
      { label: '산업분야', key: 'organization.industrySector', type: 'text' as const },
      { label: '종업원수', key: 'organization.employeeCount', type: 'text' as const },
      { label: '매출규모', key: 'organization.revenueRange', type: 'text' as const },
      { label: 'R&D 경험', key: 'organization.rdExperience', type: 'boolean' as const },
      { label: '주소', key: 'organization.address', type: 'text' as const },
      { label: '주요 사업 도메인', key: 'organization.primaryBusinessDomain', type: 'text' as const },
      { label: '기업규모유형', key: 'organization.companyScaleType', type: 'text' as const },
      { label: '기업 프로필 설명', key: 'organization.companyProfileDescription', type: 'text' as const },
      { label: '프로필 완성', key: 'organization.profileCompleted', type: 'boolean' as const },
      { label: '프로필 점수', key: 'organization.profileScore', type: 'number' as const },
      { label: '상태', key: 'organization.status', type: 'text' as const },
    ],
  },
  {
    title: '기술정보',
    icon: '\uD83D\uDD2C',
    fields: [
      { label: 'TRL', key: 'organization.technologyReadinessLevel', type: 'number' as const },
      { label: '핵심기술', key: 'organization.keyTechnologies', type: 'array' as const },
      { label: '기술 도메인', key: 'organization.technologyDomainsSpecific', type: 'array' as const },
      { label: '연구 중점 분야', key: 'organization.researchFocusAreas', type: 'array' as const },
      { label: '인증', key: 'organization.certifications', type: 'array' as const },
      { label: '정부인증', key: 'organization.governmentCertifications', type: 'array' as const },
    ],
  },
  {
    title: '구독',
    icon: '\uD83D\uDCB3',
    fields: [
      { label: '플랜', key: 'subscriptions.plan', type: 'text' as const },
      { label: '상태', key: 'subscriptions.status', type: 'text' as const },
      { label: '결제주기', key: 'subscriptions.billingCycle', type: 'text' as const },
      { label: '시작일', key: 'subscriptions.startedAt', type: 'date' as const },
      { label: '만료일', key: 'subscriptions.expiresAt', type: 'date' as const },
    ],
  },
  {
    title: 'UTM',
    icon: '\uD83D\uDCE2',
    fields: [
      { label: 'Source', key: 'utmSource', type: 'text' as const },
      { label: 'Medium', key: 'utmMedium', type: 'text' as const },
      { label: 'Campaign', key: 'utmCampaign', type: 'text' as const },
      { label: 'Term', key: 'utmTerm', type: 'text' as const },
      { label: 'Content', key: 'utmContent', type: 'text' as const },
    ],
  },
  {
    title: '메타데이터',
    icon: '\uD83D\uDDC4\uFE0F',
    fields: [
      { label: '생성일', key: 'createdAt', type: 'date' as const },
      { label: '수정일', key: 'updatedAt', type: 'date' as const },
      { label: '기업 생성일', key: 'organization.createdAt', type: 'date' as const },
    ],
  },
];

export default function UsersOrgsTab() {
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
      console.error('UsersOrgsTab fetch error:', e);
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
      { accessorKey: 'name', header: '이름', size: 100 },
      { accessorKey: 'email', header: '이메일', size: 200 },
      {
        accessorKey: 'role',
        header: '역할',
        size: 80,
        cell: ({ getValue }) => {
          const v = getValue() as string;
          return (
            <Badge className={roleColor[v] || 'bg-gray-100 text-gray-800'} variant="secondary">
              {v}
            </Badge>
          );
        },
      },
      {
        accessorFn: (row) => row.organization?.name,
        id: 'orgName',
        header: '기업명',
        size: 150,
      },
      {
        accessorFn: (row) => row.organization?.type,
        id: 'orgType',
        header: '기업유형',
        size: 110,
      },
      {
        accessorFn: (row) => row.organization?.profileCompleted,
        id: 'profileCompleted',
        header: '프로필 완성',
        size: 100,
        cell: ({ getValue }) => (getValue() ? '\u2705' : '\u274C'),
      },
      {
        accessorFn: (row) => row.organization?.profileScore,
        id: 'profileScore',
        header: '프로필 점수',
        size: 90,
        cell: ({ getValue }) => {
          const v = getValue() as number | null;
          return v != null ? v : '\u2014';
        },
      },
      {
        accessorFn: (row) => row.subscriptions?.plan,
        id: 'plan',
        header: '구독',
        size: 80,
        cell: ({ getValue }) => {
          const v = getValue() as string;
          if (!v) return '\u2014';
          return (
            <Badge className={planColor[v] || 'bg-gray-100 text-gray-800'} variant="secondary">
              {v}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'profileCompleteness',
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
        accessorKey: 'lastLoginAt',
        header: '마지막 로그인',
        size: 120,
        cell: ({ getValue }) => formatDate(getValue() as string | null),
      },
    ],
    []
  );

  const statsItems = stats
    ? [
        { label: '전체 사용자', value: stats.totalUsers ?? 0 },
        { label: '관리자', value: stats.totalAdmins ?? 0 },
        { label: '전체 기업', value: stats.totalOrgs ?? 0 },
        { label: '프로필 완성율', value: `${stats.profileCompletedPercent ?? 0}%` },
        {
          label: '구독 현황',
          value: stats.totalUsers ?? 0,
          subLabel: stats.subscriptionBreakdown
            ? `FREE: ${stats.subscriptionBreakdown.FREE ?? 0} / PRO: ${stats.subscriptionBreakdown.PRO ?? 0} / TEAM: ${stats.subscriptionBreakdown.TEAM ?? 0}`
            : undefined,
        },
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
          placeholder="이름, 이메일 검색..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-64"
        />
        <Select
          value={filters.role || 'ALL'}
          onValueChange={(v) => handleFilterChange('role', v)}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="역할" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">전체 역할</SelectItem>
            <SelectItem value="USER">USER</SelectItem>
            <SelectItem value="ADMIN">ADMIN</SelectItem>
            <SelectItem value="SUPER_ADMIN">SUPER_ADMIN</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.orgType || 'ALL'}
          onValueChange={(v) => handleFilterChange('orgType', v)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="기업유형" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">전체 유형</SelectItem>
            <SelectItem value="COMPANY">COMPANY</SelectItem>
            <SelectItem value="RESEARCH_INSTITUTE">RESEARCH_INSTITUTE</SelectItem>
            <SelectItem value="UNIVERSITY">UNIVERSITY</SelectItem>
            <SelectItem value="PUBLIC_INSTITUTION">PUBLIC_INSTITUTION</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.profileCompleted || 'ALL'}
          onValueChange={(v) => handleFilterChange('profileCompleted', v)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="프로필 완성" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">전체 프로필</SelectItem>
            <SelectItem value="true">완성</SelectItem>
            <SelectItem value="false">미완성</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.subscriptionPlan || 'ALL'}
          onValueChange={(v) => handleFilterChange('subscriptionPlan', v)}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="구독" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">전체 구독</SelectItem>
            <SelectItem value="FREE">FREE</SelectItem>
            <SelectItem value="PRO">PRO</SelectItem>
            <SelectItem value="TEAM">TEAM</SelectItem>
          </SelectContent>
        </Select>
        <ExportCSV
          endpoint={API_ENDPOINT}
          filters={activeFilters}
          filename={`users_orgs_${new Date().toISOString().slice(0, 10)}`}
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
        title={selectedRow?.name ? `${selectedRow.name} 사용자 상세` : '사용자 상세'}
        data={selectedRow}
        fieldGroups={fieldGroups}
      />
    </div>
  );
}
