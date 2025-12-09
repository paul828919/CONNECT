/**
 * Consortium Settings Page (Phase 7 - Priority 2)
 *
 * Comprehensive consortium management interface
 * Features:
 * - Basic Information (name, description)
 * - Lead Organization Management
 * - Member Role Assignment (Co-research, Commissioned research)
 * - Target Funding Program Selection
 * - Individual Budget Allocation
 * - Timeline Management
 * - Status Workflow
 *
 * Access: Lead organization only
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ConsortiumHeader from '@/components/consortium/ConsortiumHeader';

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
  budgetPercent?: number;
  responsibilities?: string;
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

// Member budget state type
interface MemberBudgetState {
  [memberId: string]: {
    budgetShare: string;
    role: string;
  };
}

const ROLE_OPTIONS = [
  { value: 'LEAD', label: '주관기관', description: '프로젝트를 총괄하는 기관' },
  { value: 'PARTICIPANT', label: '공동연구기관', description: '공동으로 연구를 수행하는 기관' },
  { value: 'SUBCONTRACTOR', label: '위탁연구기관', description: '특정 연구를 위탁받아 수행하는 기관' },
];

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
  const { data: session } = useSession();
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
  const [leadOrganizationId, setLeadOrganizationId] = useState('');

  // State: Member budgets and roles
  const [memberBudgets, setMemberBudgets] = useState<MemberBudgetState>({});
  const [savingMembers, setSavingMembers] = useState(false);

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
          setLeadOrganizationId(c.leadOrganizationId || '');

          // Initialize member budgets and roles
          const initialBudgets: MemberBudgetState = {};
          c.consortium_members.forEach((member: MemberInfo) => {
            initialBudgets[member.id] = {
              budgetShare: member.budgetShare || '',
              role: member.role || 'PARTICIPANT',
            };
          });
          setMemberBudgets(initialBudgets);
        }

        // Fetch available funding programs from matches
        // The API requires organizationId parameter
        const orgId = (session?.user as any)?.organizationId;
        if (orgId) {
          const matchesRes = await fetch(`/api/matches?organizationId=${orgId}`);
          if (matchesRes.ok) {
            const matchesData = await matchesRes.json();
            if (matchesData.success && matchesData.matches) {
              const programs = matchesData.matches.map((match: any) => ({
                id: match.program.id,
                title: match.program.title,
                agencyId: match.program.agencyId,
                deadline: match.program.deadline,
              }));
              // Remove duplicates by program ID
              const uniquePrograms = programs.filter(
                (program: FundingProgramInfo, index: number, self: FundingProgramInfo[]) =>
                  index === self.findIndex((p) => p.id === program.id)
              );
              setAvailablePrograms(uniquePrograms);
            }
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
  }, [consortiumId, session]);

  // Helper: Update member budget
  const handleMemberBudgetChange = (memberId: string, value: string) => {
    setMemberBudgets((prev) => ({
      ...prev,
      [memberId]: {
        ...prev[memberId],
        budgetShare: value,
      },
    }));
  };

  // Helper: Update member role
  const handleMemberRoleChange = (memberId: string, role: string) => {
    setMemberBudgets((prev) => ({
      ...prev,
      [memberId]: {
        ...prev[memberId],
        role,
      },
    }));
  };

  // Helper: Calculate total allocated budget
  const calculateAllocatedBudget = () => {
    return Object.values(memberBudgets).reduce((sum, member) => {
      const budget = parseInt(member.budgetShare) || 0;
      return sum + budget;
    }, 0);
  };

  // Helper: Get remaining budget
  const getRemainingBudget = () => {
    const total = parseInt(totalBudget) || 0;
    const allocated = calculateAllocatedBudget();
    return total - allocated;
  };

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
        leadOrganizationId: leadOrganizationId || undefined,
        memberUpdates: Object.entries(memberBudgets).map(([memberId, data]) => ({
          memberId,
          budgetShare: data.budgetShare ? parseInt(data.budgetShare) : null,
          role: data.role,
        })),
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
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Shared Header with Tab Navigation */}
        <ConsortiumHeader
          activeTab="settings"
          consortiumId={consortiumId}
          consortiumName={consortium?.name}
        />

        {/* Page Subtitle */}
        <p className="text-gray-600 mb-6">
          컨소시엄 정보와 구성원을 관리하세요
        </p>

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
          {/* 1. Basic Information */}
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

          {/* 2. Target Funding Program */}
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

          {/* 3. Budget Planning (Total Budget) */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">총 예산 설정</h2>

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
          </div>

          {/* 4. Member Roles & Budget Allocation */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">구성원 역할 및 예산 배분</h2>

            {/* Budget Summary */}
            {totalBudget && (
              <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">총 예산</span>
                  <span className="font-semibold text-gray-900">
                    {parseInt(totalBudget).toLocaleString('ko-KR')}원
                  </span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">배분된 예산</span>
                  <span className="font-semibold text-blue-600">
                    {calculateAllocatedBudget().toLocaleString('ko-KR')}원
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">잔여 예산</span>
                  <span className={`font-semibold ${getRemainingBudget() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {getRemainingBudget().toLocaleString('ko-KR')}원
                  </span>
                </div>
                {/* Progress bar */}
                <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      getRemainingBudget() >= 0 ? 'bg-blue-500' : 'bg-red-500'
                    }`}
                    style={{
                      width: `${Math.min(100, (calculateAllocatedBudget() / parseInt(totalBudget)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Member List */}
            <div className="space-y-4">
              {/* Existing consortium members */}
              {consortium && consortium.consortium_members.map((member) => (
                <div
                  key={member.id}
                  className="p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                        <span className="text-sm font-bold text-gray-500">
                          {member.organizations.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{member.organizations.name}</p>
                        <p className="text-sm text-gray-500">{member.organizations.type}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      member.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                      member.status === 'INVITED' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {member.status === 'ACCEPTED' ? '수락됨' :
                       member.status === 'INVITED' ? '초대됨' :
                       member.status === 'DECLINED' ? '거절됨' : '제외됨'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Role Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        기관 역할
                      </label>
                      <select
                        value={memberBudgets[member.id]?.role || 'PARTICIPANT'}
                        onChange={(e) => handleMemberRoleChange(member.id, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      >
                        {ROLE_OPTIONS.map((role) => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Budget Allocation */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        배분 예산 (원)
                      </label>
                      <input
                        type="number"
                        value={memberBudgets[member.id]?.budgetShare || ''}
                        onChange={(e) => handleMemberBudgetChange(member.id, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder="예: 100000000"
                        min="0"
                      />
                      {memberBudgets[member.id]?.budgetShare && (
                        <p className="text-xs text-gray-500 mt-1">
                          {parseInt(memberBudgets[member.id].budgetShare).toLocaleString('ko-KR')}원
                          {totalBudget && (
                            <span className="ml-2 text-blue-600">
                              ({((parseInt(memberBudgets[member.id].budgetShare) / parseInt(totalBudget)) * 100).toFixed(1)}%)
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Placeholder slots to fill up to 3 members minimum */}
              {(() => {
                const currentMemberCount = consortium?.consortium_members?.length || 0;
                const placeholdersNeeded = Math.max(0, 3 - currentMemberCount);
                const placeholders = [
                  { icon: '기', label: '기업', type: 'COMPANY', role: '주관기관', bgClass: 'bg-blue-100', textClass: 'text-blue-600' },
                  { icon: '대', label: '대학교', type: 'UNIVERSITY', role: '공동연구기관', bgClass: 'bg-green-100', textClass: 'text-green-600' },
                  { icon: '연', label: '연구기관', type: 'RESEARCH_INSTITUTE', role: '위탁연구기관', bgClass: 'bg-purple-100', textClass: 'text-purple-600' },
                ];

                // Skip placeholders for types that already exist
                const existingTypes = consortium?.consortium_members?.map(m => m.organizations.type) || [];
                const availablePlaceholders = placeholders.filter(p => !existingTypes.includes(p.type));

                return availablePlaceholders.slice(0, placeholdersNeeded).map((placeholder, index) => (
                  <div key={`placeholder-${index}`} className="p-4 border border-dashed border-gray-300 rounded-lg bg-gray-50">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg ${placeholder.bgClass} flex items-center justify-center`}>
                          <span className={`text-sm font-bold ${placeholder.textClass}`}>{placeholder.icon}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-400">{placeholder.label} (파트너 검색에서 추가)</p>
                          <p className="text-sm text-gray-400">{placeholder.type}</p>
                        </div>
                      </div>
                      <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-500">
                        미지정
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">기관 역할</label>
                        <select disabled className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-400 text-sm">
                          <option>{placeholder.role}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">배분 예산 (원)</label>
                        <input type="text" disabled className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-400 text-sm" placeholder="예: 100000000" />
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* 5. Timeline */}
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

          {/* 6. Status Management */}
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
    </DashboardLayout>
  );
}
