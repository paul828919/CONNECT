'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';

interface Organization {
  id: string;
  type: string;
  name: string;
  description: string | null;
  industrySector: string | null;
  employeeCount: string | null;
  technologyReadinessLevel: number | null;
  rdExperience: boolean;
  researchFocusAreas: string[];
  keyTechnologies: string[];
  logoUrl: string | null;
}

export default function PartnersPage() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch partners
  useEffect(() => {
    async function fetchPartners() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: '12',
          ...(searchQuery && { q: searchQuery }),
          ...(typeFilter && { type: typeFilter }),
          ...(industryFilter && { industry: industryFilter }),
        });

        const response = await fetch(`/api/partners/search?${params}`);
        const data = await response.json();

        if (data.success) {
          setOrganizations(data.data.organizations);
          setTotalPages(data.data.pagination.totalPages);
        }
      } catch (error) {
        console.error('Failed to fetch partners:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPartners();
  }, [searchQuery, typeFilter, industryFilter, page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset to page 1 on new search
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">파트너 검색</h1>
          <p className="mt-2 text-gray-600">
            협력 가능한 기업 및 연구기관을 검색하세요
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
          <form onSubmit={handleSearch} className="space-y-4">
            {/* Search Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                검색어
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="기관명, 산업 분야, 키워드 검색..."
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  기관 유형
                </label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">전체</option>
                  <option value="COMPANY">기업</option>
                  <option value="RESEARCH_INSTITUTE">연구기관</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  산업 분야
                </label>
                <input
                  type="text"
                  value={industryFilter}
                  onChange={(e) => setIndustryFilter(e.target.value)}
                  placeholder="예: ICT, 바이오, 제조..."
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
            >
              검색
            </button>
          </form>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          </div>
        ) : organizations.length === 0 ? (
          <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
            <p className="text-gray-600">검색 결과가 없습니다</p>
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-gray-600">
              {organizations.length}개 기관 발견
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {organizations.map((org) => (
                <div
                  key={org.id}
                  className="cursor-pointer rounded-2xl bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                  onClick={() => router.push(`/dashboard/partners/${org.id}`)}
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{org.name}</h3>
                      <p className="text-sm text-gray-600">
                        {org.type === 'COMPANY' ? '기업' : '연구기관'}
                      </p>
                    </div>
                  </div>

                  {org.industrySector && (
                    <div className="mb-2">
                      <span className="inline-block rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700">
                        {org.industrySector}
                      </span>
                    </div>
                  )}

                  {org.description && (
                    <p className="mb-4 line-clamp-2 text-sm text-gray-600">
                      {org.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                    {org.technologyReadinessLevel && (
                      <span>TRL {org.technologyReadinessLevel}</span>
                    )}
                    {org.rdExperience && <span>• R&D 경험</span>}
                  </div>

                  {(org.researchFocusAreas?.length > 0 || org.keyTechnologies?.length > 0) && (
                    <div className="mt-4 border-t border-gray-100 pt-4">
                      <p className="text-xs text-gray-500">
                        {org.researchFocusAreas?.join(', ') || org.keyTechnologies?.join(', ')}
                      </p>
                    </div>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/dashboard/partners/${org.id}`);
                    }}
                    className="mt-4 w-full rounded-lg border border-blue-600 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
                  >
                    프로필 보기
                  </button>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  이전
                </button>
                <span className="flex items-center px-4 py-2 text-sm text-gray-700">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  다음
                </button>
              </div>
            )}
          </>
        )}
    </DashboardLayout>
  );
}
