/**
 * Consortium Detail Page
 *
 * Displays consortium project details including:
 * - Basic information
 * - Member organizations
 * - Target funding program (if any)
 * - Status and actions
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface OrganizationInfo {
  id: string;
  name: string;
  type: string;
  logoUrl?: string;
}

interface MemberInfo {
  id: string;
  role: string;
  status: string;
  organizations: OrganizationInfo;
  createdAt: string;
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
  status: string;
  createdAt: string;
  organizations: OrganizationInfo; // Lead organization
  funding_programs?: FundingProgramInfo;
  consortium_members: MemberInfo[];
}

export default function ConsortiumDetailPage() {
  const params = useParams();
  const router = useRouter();
  const consortiumId = params?.id as string;

  const [consortium, setConsortium] = useState<ConsortiumData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!consortiumId) return;

    const fetchConsortium = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/consortiums/${consortiumId}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError('컨소시엄을 찾을 수 없습니다');
          } else {
            setError('컨소시엄 정보를 불러오는데 실패했습니다');
          }
          return;
        }

        const data = await response.json();
        if (data.success) {
          setConsortium(data.consortium);
        } else {
          setError(data.error || '알 수 없는 오류가 발생했습니다');
        }
      } catch (err) {
        setError('서버 연결에 실패했습니다');
      } finally {
        setLoading(false);
      }
    };

    fetchConsortium();
  }, [consortiumId]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">컨소시엄 정보를 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !consortium) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-800 mb-4">{error || '컨소시엄을 찾을 수 없습니다'}</p>
          <Link
            href="/dashboard/consortiums"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            컨소시엄 목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      DRAFT: { label: '작성중', className: 'bg-gray-100 text-gray-800' },
      ACTIVE: { label: '활성', className: 'bg-green-100 text-green-800' },
      READY: { label: '준비완료', className: 'bg-blue-100 text-blue-800' },
      SUBMITTED: { label: '제출완료', className: 'bg-purple-100 text-purple-800' },
      APPROVED: { label: '승인됨', className: 'bg-green-100 text-green-800' },
      REJECTED: { label: '거절됨', className: 'bg-red-100 text-red-800' },
      COMPLETED: { label: '완료', className: 'bg-gray-100 text-gray-800' },
      CANCELLED: { label: '취소됨', className: 'bg-gray-100 text-gray-800' },
    };

    const { label, className } = statusMap[status] || statusMap.DRAFT;
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${className}`}>
        {label}
      </span>
    );
  };

  const getRoleBadge = (role: string) => {
    const roleMap: Record<string, { label: string; className: string }> = {
      LEAD: { label: '주관기관', className: 'bg-blue-100 text-blue-800' },
      PARTICIPANT: { label: '참여기관', className: 'bg-gray-100 text-gray-800' },
      SUBCONTRACTOR: { label: '협력기관', className: 'bg-purple-100 text-purple-800' },
    };

    const { label, className } = roleMap[role] || roleMap.PARTICIPANT;
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${className}`}>
        {label}
      </span>
    );
  };

  const getMemberStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      INVITED: { label: '초대됨', className: 'bg-yellow-100 text-yellow-800' },
      ACCEPTED: { label: '수락', className: 'bg-green-100 text-green-800' },
      DECLINED: { label: '거절', className: 'bg-red-100 text-red-800' },
      REMOVED: { label: '제외됨', className: 'bg-gray-100 text-gray-800' },
    };

    const { label, className } = statusMap[status] || statusMap.INVITED;
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${className}`}>
        {label}
      </span>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-2"
        >
          <span>←</span> 뒤로 가기
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{consortium.name}</h1>
            <p className="text-gray-600">{consortium.description || '설명이 없습니다'}</p>
          </div>
          <div>{getStatusBadge(consortium.status)}</div>
        </div>
      </div>

      {/* Lead Organization */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">주관기관</h2>
        <div className="flex items-center gap-4">
          {consortium.organizations.logoUrl && (
            <img
              src={consortium.organizations.logoUrl}
              alt={consortium.organizations.name}
              className="w-16 h-16 rounded-lg object-cover"
            />
          )}
          <div>
            <h3 className="font-medium text-gray-900">{consortium.organizations.name}</h3>
            <p className="text-sm text-gray-600">{consortium.organizations.type}</p>
          </div>
        </div>
      </div>

      {/* Target Funding Program */}
      {consortium.funding_programs && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">목표 과제</h2>
          <h3 className="font-medium text-gray-900 mb-1">{consortium.funding_programs.title}</h3>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>기관: {consortium.funding_programs.agencyId}</span>
            {consortium.funding_programs.deadline && (
              <span>마감: {new Date(consortium.funding_programs.deadline).toLocaleDateString('ko-KR')}</span>
            )}
          </div>
        </div>
      )}

      {/* Consortium Members */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          컨소시엄 구성원 ({consortium.consortium_members.length}명)
        </h2>

        <div className="space-y-4">
          {consortium.consortium_members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-4">
                {member.organizations.logoUrl && (
                  <img
                    src={member.organizations.logoUrl}
                    alt={member.organizations.name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                )}
                <div>
                  <h3 className="font-medium text-gray-900">{member.organizations.name}</h3>
                  <p className="text-sm text-gray-600">{member.organizations.type}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {getRoleBadge(member.role)}
                {getMemberStatusBadge(member.status)}
              </div>
            </div>
          ))}
        </div>

        {consortium.consortium_members.length === 0 && (
          <p className="text-center text-gray-500 py-8">아직 구성원이 없습니다</p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex gap-4">
        <Link
          href={`/dashboard/consortiums/${consortium.id}/edit`}
          className="flex-1 bg-blue-600 text-white text-center px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          컨소시엄 수정
        </Link>
        <Link
          href="/dashboard/consortiums"
          className="flex-1 bg-gray-100 text-gray-700 text-center px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium"
        >
          목록으로
        </Link>
      </div>
    </div>
  );
}
