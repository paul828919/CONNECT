'use client';

/**
 * Admin Program Enrichment Queue
 *
 * Purpose: Display programs needing manual data enrichment via Claude Web
 *
 * Access Control: ADMIN or SUPER_ADMIN only
 *
 * Features:
 * 1. Queue of LOW/MEDIUM confidence programs sorted by deadline urgency
 * 2. Filter by confidence level and agency
 * 3. Direct link to enrichment form for each program
 * 4. Link to original announcement PDF
 *
 * Workflow:
 * 1. Admin opens PDF in Hancom Docs
 * 2. Uploads to Claude Web with 12-field prompt
 * 3. Pastes markdown output into enrichment form
 * 4. Form auto-parses and saves to database
 */

import { useSession } from 'next-auth/react';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/lib/hooks/use-toast';

interface EnrichmentQueueProgram {
  id: string;
  title: string;
  agencyId: string;
  announcementUrl: string;
  attachmentUrls: string[];
  eligibilityConfidence: 'LOW' | 'MEDIUM' | 'HIGH';
  deadline: string | null;
  applicationStart: string | null;
  budgetAmount: number | null;
  scrapedAt: string;
  daysUntilDeadline: number | null;
  source: 'NTIS' | 'SME24';
}

interface QueueStats {
  total: number;
  low: number;
  medium: number;
  urgent: number; // deadline within 7 days
}

export default function EnrichmentQueuePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [programs, setPrograms] = useState<EnrichmentQueueProgram[]>([]);
  const [stats, setStats] = useState<QueueStats>({ total: 0, low: 0, medium: 0, urgent: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [confidenceFilter, setConfidenceFilter] = useState<string>('ALL');
  const [sourceFilter, setSourceFilter] = useState<string>('NTIS'); // NTIS or SME24
  const [statusFilter, setStatusFilter] = useState<string>('ALL'); // ALL, OPEN, CLOSED
  const [sortBy, setSortBy] = useState<string>('deadline'); // deadline, scraped, confidence

  // Delete confirmation state
  const { toast } = useToast();
  const [programToDelete, setProgramToDelete] = useState<EnrichmentQueueProgram | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Auth check
  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }
    if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'SUPER_ADMIN') {
      router.push('/dashboard');
      return;
    }
  }, [session, status, router]);

  // Fetch programs
  const fetchPrograms = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (confidenceFilter !== 'ALL') params.append('confidence', confidenceFilter);
      params.append('source', sourceFilter);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      params.append('sortBy', sortBy);

      const response = await fetch(`/api/admin/enrich-program?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch programs');
      }

      setPrograms(data.programs || []);
      setStats(data.stats || { total: 0, low: 0, medium: 0, urgent: 0 });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [confidenceFilter, sourceFilter, statusFilter, sortBy]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetchPrograms();
  }, [status, fetchPrograms]);

  // Format deadline display
  const formatDeadline = (deadline: string | null, daysUntil: number | null) => {
    if (!deadline) return '마감일 미정';
    const date = new Date(deadline);
    const formatted = date.toLocaleDateString('ko-KR', {
      month: 'long',
      day: 'numeric',
    });
    if (daysUntil !== null) {
      if (daysUntil < 0) return `${formatted} (마감됨)`;
      if (daysUntil === 0) return `${formatted} (오늘 마감)`;
      if (daysUntil <= 7) return `${formatted} (D-${daysUntil})`;
      return formatted;
    }
    return formatted;
  };

  // Get urgency badge color
  const getUrgencyBadge = (daysUntil: number | null) => {
    if (daysUntil === null) return null;
    if (daysUntil < 0) return { text: '마감됨', class: 'bg-gray-100 text-gray-600' };
    if (daysUntil === 0) return { text: '오늘 마감', class: 'bg-red-100 text-red-800' };
    if (daysUntil <= 3) return { text: `D-${daysUntil}`, class: 'bg-red-100 text-red-800' };
    if (daysUntil <= 7) return { text: `D-${daysUntil}`, class: 'bg-orange-100 text-orange-800' };
    return null;
  };

  // Delete program handler
  const handleDeleteProgram = async () => {
    if (!programToDelete) return;

    setDeleting(true);
    try {
      const source = programToDelete.source || sourceFilter;
      const response = await fetch(
        `/api/admin/enrich-program/${programToDelete.id}?source=${source}`,
        { method: 'DELETE' }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete program');
      }

      // Optimistic UI update - remove from local state
      setPrograms((prev) => prev.filter((p) => p.id !== programToDelete.id));

      // Update stats
      setStats((prev) => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
        low: programToDelete.eligibilityConfidence === 'LOW' ? Math.max(0, prev.low - 1) : prev.low,
        medium: programToDelete.eligibilityConfidence === 'MEDIUM' ? Math.max(0, prev.medium - 1) : prev.medium,
        urgent: programToDelete.daysUntilDeadline !== null && programToDelete.daysUntilDeadline >= 0 && programToDelete.daysUntilDeadline <= 7
          ? Math.max(0, prev.urgent - 1)
          : prev.urgent,
      }));

      toast({
        title: '삭제 완료',
        description: data.message,
      });
    } catch (err: any) {
      toast({
        title: '삭제 실패',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
      setProgramToDelete(null);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-red-800 font-bold mb-2">오류</h2>
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => fetchPrograms()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold">프로그램 데이터 보강</h1>
          <p className="text-muted-foreground">
            Claude Web 추출 결과를 입력하여 데이터 품질을 개선합니다
          </p>
        </div>

        {/* Workflow Guide */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 mb-2">
                보강 워크플로우
              </p>
              <ol className="text-sm text-blue-800 list-decimal list-inside space-y-1">
                <li>아래 목록에서 프로그램 선택 → &quot;보강하기&quot; 클릭</li>
                <li>PDF 첨부파일을 다운로드하여 Hancom Docs에서 열기</li>
                <li>Claude Web에 PDF 업로드 + 12필드 추출 프롬프트 입력</li>
                <li>Claude의 마크다운 출력을 복사하여 보강 폼에 붙여넣기</li>
                <li>&quot;저장 & 다음&quot;으로 빠르게 다음 프로그램 진행</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <div className="text-sm text-gray-600">보강 필요</div>
            <div className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</div>
          </div>
          <div className="bg-white rounded-lg border border-red-200 p-4 text-center">
            <div className="text-sm text-red-700">낮은 신뢰도</div>
            <div className="text-3xl font-bold text-red-600 mt-1">{stats.low}</div>
          </div>
          <div className="bg-white rounded-lg border border-yellow-200 p-4 text-center">
            <div className="text-sm text-yellow-700">중간 신뢰도</div>
            <div className="text-3xl font-bold text-yellow-600 mt-1">{stats.medium}</div>
          </div>
          <div className="bg-white rounded-lg border border-orange-200 p-4 text-center">
            <div className="text-sm text-orange-700">마감 임박 (7일 이내)</div>
            <div className="text-3xl font-bold text-orange-600 mt-1">{stats.urgent}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="p-6 bg-white rounded-lg border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Confidence Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                신뢰도 수준
              </label>
              <select
                value={confidenceFilter}
                onChange={(e) => setConfidenceFilter(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="ALL">모든 수준</option>
                <option value="LOW">낮음 (우선)</option>
                <option value="MEDIUM">보통</option>
              </select>
            </div>

            {/* Source Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                데이터 출처
              </label>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="NTIS">연구과제 공고_ntis</option>
                <option value="SME24">중소벤처스타트업 지원사업 공고_smes</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                접수 상태
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="ALL">전체</option>
                <option value="OPEN">접수 중</option>
                <option value="CLOSED">마감됨</option>
              </select>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                정렬 기준
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="deadline">마감일 임박순</option>
                <option value="scraped">최근 수집순</option>
                <option value="confidence">낮은 신뢰도 순</option>
              </select>
            </div>
          </div>
        </div>

        {/* Program List */}
        <div className="space-y-4">
          {programs.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <div className="text-4xl mb-4">🎉</div>
              <p className="text-gray-600 text-lg">보강이 필요한 프로그램이 없습니다!</p>
              <p className="text-gray-500 text-sm mt-2">
                모든 프로그램의 데이터 품질이 양호합니다.
              </p>
            </div>
          ) : (
            programs.map((program) => {
              const urgency = getUrgencyBadge(program.daysUntilDeadline);
              return (
                <div
                  key={program.id}
                  className="bg-white rounded-lg border border-gray-200 p-6 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Title and Badges */}
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="text-lg font-bold text-gray-900 truncate">
                          {program.title}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            program.eligibilityConfidence === 'LOW'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {program.eligibilityConfidence === 'LOW' ? '낮음' : '보통'}
                        </span>
                        {urgency && (
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${urgency.class}`}>
                            {urgency.text}
                          </span>
                        )}
                        <span className="text-xs text-gray-500">{program.agencyId}</span>
                      </div>

                      {/* Program Info */}
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>
                          <span className="font-medium">마감일:</span>{' '}
                          {formatDeadline(program.deadline, program.daysUntilDeadline)}
                        </p>
                        {program.budgetAmount && (
                          <p>
                            <span className="font-medium">예산:</span>{' '}
                            {(program.budgetAmount / 100_000_000).toFixed(1)}억원
                          </p>
                        )}
                        {program.attachmentUrls && program.attachmentUrls.length > 0 && (
                          <p className="text-blue-600">
                            📎 첨부파일 {program.attachmentUrls.length}개
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2">
                      <Link
                        href={`/admin/enrich-program/${program.id}?source=${program.source || sourceFilter}`}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors text-center"
                      >
                        보강하기
                      </Link>
                      <a
                        href={program.announcementUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors text-center inline-flex items-center justify-center"
                      >
                        원본 공고
                        <svg
                          className="ml-1 w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                      </a>
                      <button
                        onClick={() => setProgramToDelete(program)}
                        className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium transition-colors text-center border border-red-200"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!programToDelete} onOpenChange={(open) => !open && setProgramToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>프로그램 삭제 확인</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <span className="block">
                  다음 프로그램을 삭제하시겠습니까?
                </span>
                <span className="block font-medium text-gray-900">
                  &quot;{programToDelete?.title}&quot;
                </span>
                <span className="block text-red-600">
                  이 작업은 되돌릴 수 없습니다. 관련된 매칭 결과도 함께 삭제됩니다.
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>취소</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteProgram}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              >
                {deleting ? '삭제 중...' : '삭제'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
