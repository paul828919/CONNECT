/**
 * Admin User Directory
 *
 * Admin-only page for viewing all registered users with their
 * organization, subscription, and billing information
 *
 * Features:
 * - Searchable user list (name, email, organization)
 * - Filter by subscription plan
 * - Summary cards showing user distribution by plan
 * - Pagination
 */

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  Search,
  Users,
  ChevronLeft,
  ChevronRight,
  Building2,
  CreditCard,
  UserCheck,
} from 'lucide-react';

// Types
interface UserOrganization {
  id: string;
  name: string;
  type: 'COMPANY' | 'RESEARCH_INSTITUTE' | 'UNIVERSITY' | 'PUBLIC_INSTITUTION';
}

interface UserSubscription {
  plan: 'FREE' | 'PRO' | 'TEAM';
  status: string | null;
  startedAt: string | null;
  expiresAt: string | null;
  nextBillingDate: string | null;
  billingCycle: 'MONTHLY' | 'ANNUAL' | null;
}

interface DirectoryUser {
  id: string;
  name: string | null;
  email: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  organization: UserOrganization | null;
  subscription: UserSubscription;
}

interface UserDirectoryResponse {
  users: DirectoryUser[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasMore: boolean;
  };
  summary: {
    total: number;
    FREE: number;
    PRO: number;
    TEAM: number;
  };
  timestamp: string;
}

// Plan display configuration
const PLAN_CONFIG = {
  FREE: { label: '무료', color: 'bg-gray-100 text-gray-700' },
  PRO: { label: '프로', color: 'bg-blue-100 text-blue-700' },
  TEAM: { label: '팀', color: 'bg-purple-100 text-purple-700' },
};

// Organization type labels
const ORG_TYPE_LABELS = {
  COMPANY: '기업',
  RESEARCH_INSTITUTE: '연구기관',
  UNIVERSITY: '대학',
  PUBLIC_INSTITUTION: '공공기관',
};

export default function AdminUserDirectory() {
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 50;

  // Build query params
  const buildQueryParams = () => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (planFilter) params.append('plan', planFilter);
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    return params.toString();
  };

  // Fetch users
  const { data, isLoading, error } = useQuery<UserDirectoryResponse>({
    queryKey: ['admin-users', search, planFilter, page],
    queryFn: async () => {
      const res = await fetch(`/api/admin/users?${buildQueryParams()}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch users');
      }
      return res.json();
    },
  });

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  // Handle search with debounce reset to page 1
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  // Handle plan filter change
  const handlePlanFilterChange = (value: string) => {
    setPlanFilter(value);
    setPage(1);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">사용자 관리</h1>
          <p className="text-muted-foreground">
            전체 등록 사용자 조회 및 관리
          </p>
        </div>

        {/* Summary Cards */}
        {data && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Users className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">전체 사용자</p>
                  <p className="text-2xl font-bold">{data.summary.total}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <UserCheck className="h-5 w-5 text-gray-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">무료</p>
                  <p className="text-2xl font-bold">{data.summary.FREE}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">프로</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {data.summary.PRO}
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Building2 className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">팀</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {data.summary.TEAM}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="이름, 이메일, 소속으로 검색..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Plan Filter */}
            <select
              value={planFilter}
              onChange={(e) => handlePlanFilterChange(e.target.value)}
              className="pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[140px] appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg%20xmlns%3d%22http%3a%2f%2fwww.w3.org%2f2000%2fsvg%22%20width%3d%2224%22%20height%3d%2224%22%20viewBox%3d%220%200%2024%2024%22%20fill%3d%22none%22%20stroke%3d%22%236b7280%22%20stroke-width%3d%222%22%20stroke-linecap%3d%22round%22%20stroke-linejoin%3d%22round%22%3e%3cpolyline%20points%3d%226%209%2012%2015%2018%209%22%3e%3c%2fpolyline%3e%3c%2fsvg%3e')] bg-[length:20px] bg-[right_0.5rem_center] bg-no-repeat"
            >
              <option value="">모든 플랜</option>
              <option value="FREE">무료</option>
              <option value="PRO">프로</option>
              <option value="TEAM">팀</option>
            </select>
          </div>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <Card className="p-12 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-3 text-gray-500">사용자 목록 로딩 중...</span>
          </Card>
        )}

        {/* Error State */}
        {error && (
          <Card className="p-6 bg-red-50 border-red-200">
            <p className="text-red-600">
              사용자 목록을 불러오는 데 실패했습니다: {error.message}
            </p>
          </Card>
        )}

        {/* Users Table */}
        {data && !isLoading && (
          <>
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">이름</TableHead>
                    <TableHead className="w-[180px]">소속</TableHead>
                    <TableHead className="w-[220px]">이메일</TableHead>
                    <TableHead className="w-[100px] text-center">
                      구독 플랜
                    </TableHead>
                    <TableHead className="w-[120px] text-center">
                      가입일
                    </TableHead>
                    <TableHead className="w-[120px] text-center">
                      결제일
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.users.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-12 text-gray-500"
                      >
                        {search || planFilter
                          ? '검색 결과가 없습니다'
                          : '등록된 사용자가 없습니다'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.users.map((user) => (
                      <TableRow key={user.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">
                          {user.name || '-'}
                        </TableCell>
                        <TableCell>
                          {user.organization ? (
                            <div>
                              <span className="block truncate max-w-[160px]">
                                {user.organization.name}
                              </span>
                              <span className="text-xs text-gray-400">
                                {ORG_TYPE_LABELS[user.organization.type]}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400">미설정</span>
                          )}
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {user.email || '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            className={PLAN_CONFIG[user.subscription.plan].color}
                          >
                            {PLAN_CONFIG[user.subscription.plan].label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-gray-600">
                          {formatDate(user.createdAt)}
                        </TableCell>
                        <TableCell className="text-center text-gray-600">
                          {formatDate(user.subscription.nextBillingDate)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>

            {/* Pagination */}
            {data.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  {data.pagination.page}/{data.pagination.totalPages} 페이지 •
                  총 {data.pagination.totalCount}명의 사용자
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    이전
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!data.pagination.hasMore}
                  >
                    다음
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
