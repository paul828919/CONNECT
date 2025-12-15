'use client';

/**
 * Admin Refund Management Page
 *
 * Purpose: Process email-based refund requests from users
 *
 * Access Control: ADMIN or SUPER_ADMIN only
 *
 * Features:
 * 1. View all refund requests with status filtering
 * 2. Approve, reject, or complete refund requests
 * 3. Add internal notes for CS tracking
 * 4. View calculation breakdown and user details
 *
 * Workflow:
 * User emails support → Admin creates RefundRequest in DB →
 * Admin reviews here → Approve/Reject → Process via PG → Mark Complete
 */

import { useSession } from 'next-auth/react';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';

interface RefundRequest {
  id: string;
  userId: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  organization?: {
    id: string;
    name: string;
  } | null;
  processedBy?: {
    id: string;
    name: string | null;
  } | null;
  plan: 'FREE' | 'PRO' | 'TEAM';
  billingCycle: 'MONTHLY' | 'ANNUAL';
  amountPaid: number;
  purchaseDate: string;
  contractEndDate: string;
  usedDays: number;
  refundAmount: number;
  penalty: number;
  reasonCategory: string;
  calculationJson: any;
  isStatutory: boolean;
  reason: string;
  internalNotes: string | null;
  status: 'PENDING' | 'APPROVED' | 'PROCESSING' | 'COMPLETED' | 'REJECTED';
  requestedAt: string;
  approvedAt: string | null;
  processedAt: string | null;
  completedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
}

interface Stats {
  statusCounts: {
    PENDING: number;
    APPROVED: number;
    PROCESSING: number;
    COMPLETED: number;
    REJECTED: number;
  };
  todayCount: number;
  totalPendingAmount: number;
  totalCompletedAmount: number;
}

const STATUS_LABELS: Record<string, string> = {
  ALL: '전체',
  PENDING: '대기중',
  APPROVED: '승인됨',
  PROCESSING: '처리중',
  COMPLETED: '완료',
  REJECTED: '거절',
};

const REASON_LABELS: Record<string, string> = {
  CHANGE_OF_MIND: '단순 변심',
  SERVICE_ISSUE: '서비스 불만',
  BILLING_ERROR: '결제 오류',
  DUPLICATE_PAYMENT: '중복 결제',
  CONTRACT_MISMATCH: '계약 불일치',
  OTHER: '기타',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  PROCESSING: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

export default function AdminRefundManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [requests, setRequests] = useState<RefundRequest[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [reasonFilter, setReasonFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Detail modal
  const [selectedRequest, setSelectedRequest] = useState<RefundRequest | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [internalNotesInput, setInternalNotesInput] = useState('');
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');

  // Auth check
  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }
    const userRole = (session?.user as any)?.role;
    if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
      router.push('/dashboard');
      return;
    }
  }, [session, status, router]);

  // Fetch refund requests
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (reasonFilter !== 'ALL') params.append('reasonCategory', reasonFilter);
      if (searchQuery) params.append('search', searchQuery);
      params.append('limit', '50');

      const response = await fetch(`/api/admin/refund-requests?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch refund requests');
      }

      setRequests(data.refundRequests || []);
      setStats(data.stats || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, reasonFilter, searchQuery]);

  // Fetch on mount and filter change
  useEffect(() => {
    if (status !== 'authenticated') return;
    fetchRequests();
  }, [status, fetchRequests]);

  // Handle action (approve, reject, process, complete)
  const handleAction = async (action: string, requestId: string, extraData?: any) => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/refund-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          ...extraData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Action failed');
      }

      // Refresh list and close modal
      await fetchRequests();
      setShowDetailModal(false);
      setSelectedRequest(null);
      setInternalNotesInput('');
      setRejectionReasonInput('');
    } catch (err: any) {
      alert(`오류: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Open detail modal
  const openDetailModal = (request: RefundRequest) => {
    setSelectedRequest(request);
    setInternalNotesInput(request.internalNotes || '');
    setShowDetailModal(true);
  };

  // Format currency
  const formatKRW = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-red-800 font-bold mb-2">Error</h2>
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => fetchRequests()}
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
          <h1 className="text-3xl font-bold">환불 요청 관리</h1>
          <p className="text-muted-foreground">사용자 환불 요청 검토 및 처리</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-lg border border-yellow-200 p-4">
              <div className="text-sm text-yellow-700">대기중</div>
              <div className="text-3xl font-bold text-yellow-600 mt-1">
                {stats.statusCounts.PENDING}
              </div>
              <div className="text-xs text-yellow-600 mt-1">
                ₩{formatKRW(stats.totalPendingAmount)}
              </div>
            </div>
            <div className="bg-white rounded-lg border border-blue-200 p-4">
              <div className="text-sm text-blue-700">승인됨</div>
              <div className="text-3xl font-bold text-blue-600 mt-1">
                {stats.statusCounts.APPROVED}
              </div>
            </div>
            <div className="bg-white rounded-lg border border-purple-200 p-4">
              <div className="text-sm text-purple-700">처리중</div>
              <div className="text-3xl font-bold text-purple-600 mt-1">
                {stats.statusCounts.PROCESSING}
              </div>
            </div>
            <div className="bg-white rounded-lg border border-green-200 p-4">
              <div className="text-sm text-green-700">완료</div>
              <div className="text-3xl font-bold text-green-600 mt-1">
                {stats.statusCounts.COMPLETED}
              </div>
              <div className="text-xs text-green-600 mt-1">
                ₩{formatKRW(stats.totalCompletedAmount)}
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-sm text-gray-700">오늘 접수</div>
              <div className="text-3xl font-bold text-gray-900 mt-1">
                {stats.todayCount}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="p-6 bg-white rounded-lg border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                상태
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
              >
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Reason Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                환불 사유
              </label>
              <select
                value={reasonFilter}
                onChange={(e) => setReasonFilter(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="ALL">전체</option>
                {Object.entries(REASON_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                검색 (이름/이메일)
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="사용자 검색..."
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Requests List */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  사용자
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  플랜
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  결제액 / 환불액
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  사유
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  요청일
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  액션
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    환불 요청이 없습니다
                  </td>
                </tr>
              ) : (
                requests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {request.user.name || '이름 없음'}
                      </div>
                      <div className="text-sm text-gray-500">{request.user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{request.plan}</div>
                      <div className="text-xs text-gray-500">
                        {request.billingCycle === 'ANNUAL' ? '연간' : '월간'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        ₩{formatKRW(request.amountPaid)}
                      </div>
                      <div className="text-sm text-green-600 font-medium">
                        → ₩{formatKRW(request.refundAmount)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {REASON_LABELS[request.reasonCategory] || request.reasonCategory}
                      </div>
                      {request.isStatutory && (
                        <span className="text-xs text-blue-600">법정 환불</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          STATUS_COLORS[request.status]
                        }`}
                      >
                        {STATUS_LABELS[request.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(request.requestedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => openDetailModal(request)}
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                      >
                        상세 보기
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Detail Modal */}
        {showDetailModal && selectedRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                {/* Modal Header */}
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-xl font-bold">환불 요청 상세</h2>
                    <p className="text-sm text-gray-500">ID: {selectedRequest.id}</p>
                  </div>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* User Info */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h3 className="font-semibold text-gray-900 mb-2">사용자 정보</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">이름:</span>{' '}
                      {selectedRequest.user.name || '없음'}
                    </div>
                    <div>
                      <span className="text-gray-500">이메일:</span>{' '}
                      {selectedRequest.user.email}
                    </div>
                    {selectedRequest.organization && (
                      <div className="col-span-2">
                        <span className="text-gray-500">기관:</span>{' '}
                        {selectedRequest.organization.name}
                      </div>
                    )}
                  </div>
                </div>

                {/* Subscription Info */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h3 className="font-semibold text-gray-900 mb-2">구독 정보</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">플랜:</span>{' '}
                      {selectedRequest.plan} ({selectedRequest.billingCycle === 'ANNUAL' ? '연간' : '월간'})
                    </div>
                    <div>
                      <span className="text-gray-500">결제액:</span>{' '}
                      ₩{formatKRW(selectedRequest.amountPaid)}
                    </div>
                    <div>
                      <span className="text-gray-500">구매일:</span>{' '}
                      {formatDate(selectedRequest.purchaseDate)}
                    </div>
                    <div>
                      <span className="text-gray-500">사용일수:</span>{' '}
                      {selectedRequest.usedDays}일
                    </div>
                  </div>
                </div>

                {/* Refund Calculation */}
                <div className="bg-blue-50 rounded-lg p-4 mb-4">
                  <h3 className="font-semibold text-blue-900 mb-2">환불 계산</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-blue-700">환불 유형:</span>{' '}
                      <span className={selectedRequest.isStatutory ? 'text-green-600 font-semibold' : 'text-orange-600'}>
                        {selectedRequest.isStatutory ? '법정 (전액)' : '약관 (위약금 적용)'}
                      </span>
                    </div>
                    <div>
                      <span className="text-blue-700">위약금:</span>{' '}
                      ₩{formatKRW(selectedRequest.penalty)}
                    </div>
                    <div className="col-span-2 mt-2 pt-2 border-t border-blue-200">
                      <span className="text-blue-900 font-semibold text-lg">
                        환불 예정액: ₩{formatKRW(selectedRequest.refundAmount)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Reason */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h3 className="font-semibold text-gray-900 mb-2">환불 사유</h3>
                  <div className="text-sm">
                    <span className="inline-block px-2 py-1 bg-gray-200 rounded text-gray-700 mr-2">
                      {REASON_LABELS[selectedRequest.reasonCategory] || selectedRequest.reasonCategory}
                    </span>
                  </div>
                  {selectedRequest.reason && selectedRequest.reason !== selectedRequest.reasonCategory && (
                    <p className="mt-2 text-sm text-gray-600">{selectedRequest.reason}</p>
                  )}
                </div>

                {/* Status Timeline */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h3 className="font-semibold text-gray-900 mb-2">처리 현황</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center">
                      <span className={`w-3 h-3 rounded-full mr-2 bg-green-500`}></span>
                      <span>요청됨: {formatDate(selectedRequest.requestedAt)}</span>
                    </div>
                    {selectedRequest.approvedAt && (
                      <div className="flex items-center">
                        <span className={`w-3 h-3 rounded-full mr-2 bg-blue-500`}></span>
                        <span>승인됨: {formatDate(selectedRequest.approvedAt)}</span>
                      </div>
                    )}
                    {selectedRequest.processedAt && (
                      <div className="flex items-center">
                        <span className={`w-3 h-3 rounded-full mr-2 bg-purple-500`}></span>
                        <span>처리중: {formatDate(selectedRequest.processedAt)}</span>
                      </div>
                    )}
                    {selectedRequest.completedAt && (
                      <div className="flex items-center">
                        <span className={`w-3 h-3 rounded-full mr-2 bg-green-500`}></span>
                        <span>완료됨: {formatDate(selectedRequest.completedAt)}</span>
                      </div>
                    )}
                    {selectedRequest.rejectedAt && (
                      <div className="flex items-center">
                        <span className={`w-3 h-3 rounded-full mr-2 bg-red-500`}></span>
                        <span>거절됨: {formatDate(selectedRequest.rejectedAt)}</span>
                        {selectedRequest.rejectionReason && (
                          <span className="ml-2 text-red-600">({selectedRequest.rejectionReason})</span>
                        )}
                      </div>
                    )}
                    {selectedRequest.processedBy && (
                      <div className="text-gray-500 mt-2">
                        처리자: {selectedRequest.processedBy.name || 'Admin'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Internal Notes */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    내부 메모 (CS 용)
                  </label>
                  <textarea
                    value={internalNotesInput}
                    onChange={(e) => setInternalNotesInput(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                    placeholder="내부 메모를 입력하세요..."
                  />
                  <button
                    onClick={() => handleAction('update_notes', selectedRequest.id, { internalNotes: internalNotesInput })}
                    disabled={actionLoading}
                    className="mt-2 px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                  >
                    메모 저장
                  </button>
                </div>

                {/* Rejection Reason Input (if rejecting) */}
                {selectedRequest.status === 'PENDING' && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      거절 사유 (거절 시 필수)
                    </label>
                    <input
                      type="text"
                      value={rejectionReasonInput}
                      onChange={(e) => setRejectionReasonInput(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                      placeholder="거절 사유를 입력하세요..."
                    />
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 pt-4 border-t">
                  {selectedRequest.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => handleAction('approve', selectedRequest.id, { internalNotes: internalNotesInput })}
                        disabled={actionLoading}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                      >
                        {actionLoading ? '처리중...' : '승인'}
                      </button>
                      <button
                        onClick={() => {
                          if (!rejectionReasonInput.trim()) {
                            alert('거절 사유를 입력해주세요.');
                            return;
                          }
                          handleAction('reject', selectedRequest.id, {
                            rejectionReason: rejectionReasonInput,
                            internalNotes: internalNotesInput,
                          });
                        }}
                        disabled={actionLoading}
                        className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
                      >
                        거절
                      </button>
                    </>
                  )}
                  {selectedRequest.status === 'APPROVED' && (
                    <button
                      onClick={() => handleAction('process', selectedRequest.id, { internalNotes: internalNotesInput })}
                      disabled={actionLoading}
                      className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium"
                    >
                      {actionLoading ? '처리중...' : 'PG 처리 시작'}
                    </button>
                  )}
                  {selectedRequest.status === 'PROCESSING' && (
                    <button
                      onClick={() => handleAction('complete', selectedRequest.id, { internalNotes: internalNotesInput })}
                      disabled={actionLoading}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
                    >
                      {actionLoading ? '처리중...' : '환불 완료'}
                    </button>
                  )}
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                  >
                    닫기
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
