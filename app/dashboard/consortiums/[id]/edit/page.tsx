/**
 * Consortium Edit Page (Phase 7 - Priority 2)
 *
 * Comprehensive consortium management interface
 * Features:
 * - Basic Information (name, description)
 * - Target Funding Program Selection
 * - Budget Planning
 * - Timeline Management
 * - Status Workflow
 *
 * Access: Lead organization only
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
  budgetShare?: string;
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
  targetProgramId?: string;
  totalBudget?: string;
  projectDuration?: string;
  startDate?: string;
  endDate?: string;
  leadOrganizationId: string;
  createdAt: string;
  organizations: OrganizationInfo;
  funding_programs?: FundingProgramInfo;
  consortium_members: MemberInfo[];
}

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: '초안', color: 'bg-gray-100 text-gray-700' },
  { value: 'ACTIVE', label: '활성', color: 'bg-green-100 text-green-700' },
  { value: 'READY', label: '제출 준비', color: 'bg-blue-100 text-blue-700' },
  { value: 'SUBMITTED', label: '제출 완료', color: 'bg-purple-100 text-purple-700' },
  { value: 'APPROVED', label: '승인됨', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'REJECTED', label: '거절됨', color: 'bg-red-100 text-red-700' },
  { value: 'COMPLETED', label: '완료', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'CANCELLED', label: '취소됨', color: 'bg-gray-100 text-gray-700' },
];

export default function ConsortiumEditPage() {
  const params = useParams();
  const router = useRouter();
  const consortiumId = params?.id as string;

  // State: Data
  const [consortium, setConsortium] = useState<ConsortiumData | null>(null);
  const [availablePrograms, setAvailablePrograms] = useState<FundingProgramInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // State: Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetProgramId, setTargetProgramId] = useState('');
  const [totalBudget, setTotalBudget] = useState('');
  const [projectDuration, setProjectDuration] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('DRAFT');

  // Fetch consortium data and available programs
  useEffect(() => {
    if (!consortiumId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch consortium details
        const consortiumRes = await fetch(`/api/consortiums/${consortiumId}`);
        if (!consortiumRes.ok) {
          if (consortiumRes.status === 403) {
            setError('수정 권한이 없습니다. Lead organization만 수정할 수 있습니다.');
          } else if (consortiumRes.status === 404) {
            setError('컨소시엄을 찾을 수 없습니다');
          } else {
            setError('컨소시엄 정보를 불러오는데 실패했습니다');
          }
          return;
        }

        const consortiumData = await consortiumRes.json();
        if (consortiumData.success && consortiumData.consortium) {
          const c = consortiumData.consortium;
          setConsortium(c);

          // Initialize form fields
          setName(c.name || '');
          setDescription(c.description || '');
          setTargetProgramId(c.targetProgramId || '');
          setTotalBudget(c.totalBudget || '');
          setProjectDuration(c.projectDuration || '');
          setStartDate(c.startDate ? new Date(c.startDate).toISOString().split('T')[0] : '');
          setEndDate(c.endDate ? new Date(c.endDate).toISOString().split('T')[0] : '');
          setStatus(c.status || 'DRAFT');
        }

        // Fetch available funding programs (workaround: fetch directly from matches)
        // Since /api/funding-programs is not implemented, we'll show programs from matches
        const matchesRes = await fetch('/api/matches');
        if (matchesRes.ok) {
          const matchesData = await matchesRes.json();
          if (matchesData.success && matchesData.matches) {
            const programs = matchesData.matches.map((match: any) => ({
              id: match.funding_programs.id,
              title: match.funding_programs.title,
              agencyId: match.funding_programs.agencyId,
              deadline: match.funding_programs.deadline,
            }));
            // Remove duplicates by program ID
            const uniquePrograms = programs.filter(
              (program: FundingProgramInfo, index: number, self: FundingProgramInfo[]) =>
                index === self.findIndex((p) => p.id === program.id)
            );
            setAvailablePrograms(uniquePrograms);
          }
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError('데이터를 불러오는데 실패했습니다');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [consortiumId]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('컨소시엄 이름은 필수입니다');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const updateData: any = {
        name: name.trim(),
        description: description.trim() || null,
        targetProgramId: targetProgramId || null,
        totalBudget: totalBudget ? parseInt(totalBudget) : null,
        projectDuration: projectDuration.trim() || null,
        startDate: startDate || null,
        endDate: endDate || null,
        status,
      };

      const response = await fetch(`/api/consortiums/${consortiumId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || '저장에 실패했습니다');
        return;
      }

      if (data.success) {
        setSuccessMessage('컨소시엄이 성공적으로 업데이트되었습니다');

        // Update local state with response data
        if (data.consortium) {
          setConsortium(data.consortium);
        }

        // Redirect to detail page after 1.5 seconds
        setTimeout(() => {
          router.push(`/dashboard/consortiums/${consortiumId}`);
        }, 1500);
      } else {
        setError(data.error || '저장에 실패했습니다');
      }
    } catch (err) {
      console.error('Failed to update consortium:', err);
      setError('서버 연결에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">컨소시엄 정보를 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !consortium) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-700 mb-4">{error}</p>
          <Link
            href="/dashboard/consortiums"
            className="inline-block bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            컨소시엄 목록으로
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
          <Link href="/dashboard" className="hover:text-blue-600">
            대시보드
          </Link>
          <span>/</span>
          <Link href="/dashboard/consortiums" className="hover:text-blue-600">
            컨소시엄
          </Link>
          <span>/</span>
          <Link href={`/dashboard/consortiums/${consortiumId}`} className="hover:text-blue-600">
            상세
          </Link>
          <span>/</span>
          <span className="text-gray-900">수정</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">컨소시엄 수정</h1>
        <p className="text-gray-600 mt-2">컨소시엄 정보를 업데이트합니다</p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-700 text-center font-medium">{successMessage}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 text-center">{error}</p>
        </div>
      )}

      {/* Edit Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* A. Basic Information */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">기본 정보</h2>

          <div className="space-y-4">
            {/* Consortium Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                컨소시엄 이름 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="예: AI 기반 스마트 제조 컨소시엄"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                설명
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="컨소시엄의 목적과 목표를 설명해주세요"
              />
            </div>
          </div>
        </div>

        {/* B. Target Funding Program */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">목표 과제 선택</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              과제 선택
            </label>
            <select
              value={targetProgramId}
              onChange={(e) => setTargetProgramId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- 과제를 선택하세요 --</option>
              {availablePrograms.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.title} ({program.agencyId})
                  {program.deadline && ` - 마감: ${new Date(program.deadline).toLocaleDateString('ko-KR')}`}
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-500 mt-1">
              매칭된 과제 목록에서 선택할 수 있습니다
            </p>
          </div>
        </div>

        {/* C. Budget Planning */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">예산 계획</h2>

          <div className="space-y-4">
            {/* Total Budget */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                총 예산 (원)
              </label>
              <input
                type="number"
                value={totalBudget}
                onChange={(e) => setTotalBudget(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="예: 500000000"
                min="0"
              />
              {totalBudget && (
                <p className="text-sm text-gray-600 mt-1">
                  {parseInt(totalBudget).toLocaleString('ko-KR')}원
                </p>
              )}
            </div>

            {/* Budget Distribution Info */}
            {consortium && consortium.consortium_members.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-2">
                  구성원 예산 분배 ({consortium.consortium_members.length}개 기관)
                </h3>
                <div className="space-y-2">
                  {consortium.consortium_members.map((member) => (
                    <div key={member.id} className="flex justify-between text-sm">
                      <span className="text-gray-700">{member.organizations.name}</span>
                      <span className="text-gray-900 font-medium">
                        {member.budgetShare ? `${parseInt(member.budgetShare).toLocaleString('ko-KR')}원` : '미정'}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  ℹ️ 개별 예산은 구성원 관리에서 설정할 수 있습니다
                </p>
              </div>
            )}
          </div>
        </div>

        {/* D. Timeline */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">프로젝트 일정</h2>

          <div className="space-y-4">
            {/* Project Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                프로젝트 기간
              </label>
              <input
                type="text"
                value={projectDuration}
                onChange={(e) => setProjectDuration(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="예: 12개월, 2년"
              />
            </div>

            {/* Start and End Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  시작일
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  종료일
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* E. Status Management */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">상태 관리</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              컨소시엄 상태
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setStatus(option.value)}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    status === option.value
                      ? `${option.color} ring-2 ring-blue-500`
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* F. Member Management Info */}
        {consortium && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">구성원 관리</h2>
            <p className="text-gray-700 mb-3">
              현재 {consortium.consortium_members.length}개 기관이 컨소시엄에 참여하고 있습니다.
            </p>
            <p className="text-sm text-gray-600">
              구성원 추가/제거 및 역할 변경은 파트너 검색 페이지에서 {'"'}컨소시엄 초대{'"'}를 통해 관리할 수 있습니다.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? '저장 중...' : '변경사항 저장'}
          </button>
          <Link
            href={`/dashboard/consortiums/${consortiumId}`}
            className="flex-1 bg-gray-100 text-gray-700 text-center px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            취소
          </Link>
        </div>
      </form>
    </div>
  );
}
