/**
 * Consortium List Page
 *
 * Displays all consortium projects where the user's organization
 * is either the lead organization or a member.
 */

'use client';

import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';

type ConsortiumStatus = 'DRAFT' | 'ACTIVE' | 'READY' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';
type MemberStatus = 'INVITED' | 'ACCEPTED' | 'DECLINED' | 'REMOVED';
type ConsortiumRole = 'LEAD' | 'PARTICIPANT' | 'SUBCONTRACTOR';

interface OrganizationInfo {
  id: string;
  name: string;
  type: string;
  logoUrl?: string;
}

interface MemberInfo {
  id: string;
  organizationId: string;
  role: ConsortiumRole;
  status: MemberStatus;
  organizations: OrganizationInfo;
}

interface FundingProgramInfo {
  id: string;
  title: string;
  agencyId: string;
  deadline?: string;
}

interface ConsortiumData {
  id: string;
  name: string;
  description?: string;
  status: ConsortiumStatus;
  leadOrganizationId: string;
  createdAt: string;
  updatedAt: string;
  organizations: OrganizationInfo; // Lead organization
  funding_programs?: FundingProgramInfo;
  consortium_members: MemberInfo[];
  _count?: {
    consortium_members: number;
  };
}

const statusLabels: Record<ConsortiumStatus, { label: string; className: string }> = {
  DRAFT: { label: '작성중', className: 'bg-gray-100 text-gray-800' },
  ACTIVE: { label: '활성', className: 'bg-blue-100 text-blue-800' },
  READY: { label: '준비완료', className: 'bg-green-100 text-green-800' },
  SUBMITTED: { label: '제출됨', className: 'bg-purple-100 text-purple-800' },
  APPROVED: { label: '승인됨', className: 'bg-green-100 text-green-800' },
  REJECTED: { label: '반려됨', className: 'bg-red-100 text-red-800' },
  COMPLETED: { label: '완료됨', className: 'bg-gray-100 text-gray-800' },
  CANCELLED: { label: '취소됨', className: 'bg-gray-100 text-gray-800' },
};

const memberStatusLabels: Record<MemberStatus, { label: string; className: string }> = {
  INVITED: { label: '초대됨', className: 'bg-yellow-100 text-yellow-800' },
  ACCEPTED: { label: '수락', className: 'bg-green-100 text-green-800' },
  DECLINED: { label: '거절', className: 'bg-red-100 text-red-800' },
  REMOVED: { label: '제외됨', className: 'bg-gray-100 text-gray-800' },
};

export default function ConsortiumsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [consortiums, setConsortiums] = useState<ConsortiumData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [consortiumToDelete, setConsortiumToDelete] = useState<ConsortiumData | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  const fetchConsortiums = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/consortiums');
      if (!response.ok) {
        throw new Error('Failed to fetch consortiums');
      }

      const data = await response.json();
      if (data.success) {
        setConsortiums(data.consortiums || []);
      }
    } catch (err) {
      console.error('Error fetching consortiums:', err);
      setError('컨소시엄 목록을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchConsortiums();
    }
  }, [status, fetchConsortiums]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Get user's membership status in a consortium
  const getUserMemberStatus = (consortium: ConsortiumData): { role: string; status: string } | null => {
    if (!session?.user) return null;

    const userId = (session.user as any).id;
    const userOrgId = (session.user as any).organizationId;

    // Check if user is from lead organization
    if (consortium.leadOrganizationId === userOrgId) {
      return { role: 'LEAD', status: 'ACCEPTED' };
    }

    // Check if user is a member
    const membership = consortium.consortium_members.find(
      (member) => member.organizationId === userOrgId
    );

    return membership ? { role: membership.role, status: membership.status } : null;
  };

  // Handle delete consortium
  const handleDeleteClick = (consortium: ConsortiumData, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setConsortiumToDelete(consortium);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!consortiumToDelete) return;

    try {
      setDeletingId(consortiumToDelete.id);
      const response = await fetch(`/api/consortiums/${consortiumToDelete.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete consortium');
      }

      // Remove from local state
      setConsortiums((prev) => prev.filter((c) => c.id !== consortiumToDelete.id));
      setShowDeleteConfirm(false);
      setConsortiumToDelete(null);
    } catch (err: any) {
      console.error('Error deleting consortium:', err);
      alert(err.message || '컨소시엄 삭제에 실패했습니다');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
    setConsortiumToDelete(null);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">컨소시엄 목록을 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-800">{error}</p>
          <button
            onClick={fetchConsortiums}
            className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">내 컨소시엄</h1>
          <p className="text-gray-600">
            참여 중인 컨소시엄 프로젝트를 관리하세요
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">
            총 <span className="font-semibold text-blue-600">{consortiums.length}</span>개
          </span>
        </div>
      </div>

      {/* Consortiums List */}
      {consortiums.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-gray-500 text-lg mb-2">참여 중인 컨소시엄이 없습니다</p>
            <p className="text-gray-400 text-sm mb-6">
              파트너 검색에서 조직을 찾아 컨소시엄을 구성해보세요
            </p>
            <Link
              href="/dashboard/partners"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              파트너 찾기
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-6">
          {consortiums.map((consortium) => {
            const memberStatus = getUserMemberStatus(consortium);
            const memberCount = consortium._count?.consortium_members || consortium.consortium_members.length;
            const statusInfo = statusLabels[consortium.status];
            const isLeadOrg = session?.user && consortium.leadOrganizationId === (session.user as any).organizationId;

            return (
              <div key={consortium.id} className="relative">
                <Link
                  href={`/dashboard/consortiums/${consortium.id}`}
                  className="block bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-all hover:border-blue-300"
                >
                  {/* Header Row */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-gray-900">
                          {consortium.name}
                        </h3>
                        <span className={`text-xs px-2 py-1 rounded font-medium ${statusInfo.className}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                      {consortium.description && (
                        <p className="text-gray-600 text-sm line-clamp-2">
                          {consortium.description}
                        </p>
                      )}
                    </div>
                    {/* Delete Button - Only for Lead Organization */}
                    {isLeadOrg && (
                      <button
                        onClick={(e) => handleDeleteClick(consortium, e)}
                        disabled={deletingId === consortium.id}
                        className="ml-4 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="컨소시엄 삭제"
                      >
                        {deletingId === consortium.id ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    )}
                  </div>

                {/* Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {/* Lead Organization */}
                  <div>
                    <p className="text-xs text-gray-500 mb-1">주관기관</p>
                    <div className="flex items-center gap-2">
                      {consortium.organizations.logoUrl && (
                        <img
                          src={consortium.organizations.logoUrl}
                          alt={consortium.organizations.name}
                          className="w-8 h-8 rounded object-cover"
                        />
                      )}
                      {!consortium.organizations.logoUrl && (
                        <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center">
                          <span className="text-sm font-bold text-gray-400">
                            {consortium.organizations.name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <span className="text-sm font-medium text-gray-900">
                        {consortium.organizations.name}
                      </span>
                    </div>
                  </div>

                  {/* Member Count */}
                  <div>
                    <p className="text-xs text-gray-500 mb-1">참여기관</p>
                    <p className="text-sm font-medium text-gray-900">
                      {memberCount}개 기관
                    </p>
                  </div>

                  {/* User's Role & Status */}
                  {memberStatus && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">내 역할</p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {memberStatus.role === 'LEAD' ? '주관기관' : '참여기관'}
                        </span>
                        {memberStatus.status !== 'ACCEPTED' && (
                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                            memberStatusLabels[memberStatus.status as MemberStatus].className
                          }`}>
                            {memberStatusLabels[memberStatus.status as MemberStatus].label}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Target Program (if any) */}
                {consortium.funding_programs && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <p className="text-xs text-blue-700 mb-1">목표 과제</p>
                    <p className="text-sm font-medium text-blue-900">
                      {consortium.funding_programs.title}
                    </p>
                    {consortium.funding_programs.deadline && (
                      <p className="text-xs text-blue-600 mt-1">
                        마감일: {formatDate(consortium.funding_programs.deadline)}
                      </p>
                    )}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    생성일: {formatDate(consortium.createdAt)}
                  </p>
                  <span className="text-sm text-blue-600 font-medium flex items-center gap-1">
                    자세히 보기
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && consortiumToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  컨소시엄 삭제
                </h3>
                <p className="text-gray-600 mb-1">
                  <span className="font-medium text-gray-900">{consortiumToDelete.name}</span>을(를) 삭제하시겠습니까?
                </p>
                <p className="text-sm text-red-600 mt-3">
                  ⚠️ 이 작업은 되돌릴 수 없습니다. 모든 참여기관 정보가 함께 삭제됩니다.
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={handleDeleteCancel}
                disabled={!!deletingId}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={!!deletingId}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {deletingId ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    삭제 중...
                  </>
                ) : (
                  '삭제'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </DashboardLayout>
  );
}
