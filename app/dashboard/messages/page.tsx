/**
 * Messages Inbox Page (Phase 7 - Priority 1)
 *
 * Displays collaboration requests and consortium invitations
 * Features:
 * - Received Tab: View and respond to incoming requests
 * - Sent Tab: Track outgoing requests and view responses
 */

'use client';

import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type ContactRequestStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
type ContactRequestType = 'COLLABORATION' | 'CONSORTIUM_INVITE' | 'RESEARCH_PARTNER' | 'TECHNOLOGY_TRANSFER' | 'OTHER';

interface OrganizationInfo {
  id: string;
  name: string;
  type: string;
  logoUrl?: string;
}

interface UserInfo {
  id: string;
  name: string;
  email: string;
}

interface ContactRequest {
  id: string;
  type: ContactRequestType;
  subject: string;
  message: string;
  status: ContactRequestStatus;
  createdAt: string;
  respondedAt?: string;
  responseMessage?: string;
  // For received messages
  sender?: UserInfo;
  organizations_contact_requests_senderOrgIdToorganizations?: OrganizationInfo;
  // For sent messages
  organizations_contact_requests_receiverOrgIdToorganizations?: OrganizationInfo;
}

const typeLabels: Record<ContactRequestType, string> = {
  COLLABORATION: '협업 제안',
  CONSORTIUM_INVITE: '컨소시엄 초대',
  RESEARCH_PARTNER: '연구 파트너',
  TECHNOLOGY_TRANSFER: '기술 이전',
  OTHER: '기타',
};

const statusLabels: Record<ContactRequestStatus, { label: string; className: string }> = {
  PENDING: { label: '대기중', className: 'bg-yellow-100 text-yellow-800' },
  ACCEPTED: { label: '수락됨', className: 'bg-green-100 text-green-800' },
  DECLINED: { label: '거절됨', className: 'bg-red-100 text-red-800' },
  EXPIRED: { label: '만료됨', className: 'bg-gray-100 text-gray-800' },
};

export default function MessagesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
  const [receivedRequests, setReceivedRequests] = useState<ContactRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<ContactRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseMessage, setResponseMessage] = useState('');

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/contact-requests');
      if (!response.ok) {
        throw new Error('Failed to fetch requests');
      }

      const data = await response.json();
      if (data.success) {
        setReceivedRequests(data.received || []);
        setSentRequests(data.sent || []);
      }
    } catch (err) {
      console.error('Error fetching requests:', err);
      setError('메시지를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchRequests();
    }
  }, [status, fetchRequests]);

  const handleRespond = async (requestId: string, action: 'accept' | 'decline') => {
    try {
      setRespondingTo(requestId);

      const response = await fetch(`/api/contact-requests/${requestId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          responseMessage: responseMessage || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Response failed');
      }

      const data = await response.json();

      // Update local state
      setReceivedRequests((prev) =>
        prev.map((req) =>
          req.id === requestId
            ? {
                ...req,
                status: data.contactRequest.status,
                respondedAt: data.contactRequest.respondedAt,
                responseMessage: data.contactRequest.responseMessage,
              }
            : req
        )
      );

      // Clear response form
      setResponseMessage('');
      setRespondingTo(null);

      // Show success message
      alert(data.message);
    } catch (err: any) {
      console.error('Error responding to request:', err);
      alert(err.message || '응답 처리 중 오류가 발생했습니다');
    } finally {
      setRespondingTo(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;

    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (status === 'loading' || loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">메시지를 불러오는 중...</p>
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
            onClick={fetchRequests}
            className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  const currentRequests = activeTab === 'received' ? receivedRequests : sentRequests;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">메시지함</h1>
        <p className="text-gray-600">협력 요청 및 컨소시엄 초대를 관리하세요</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab('received')}
            className={`pb-4 px-1 relative ${
              activeTab === 'received'
                ? 'text-blue-600 font-medium'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            받은 요청
            {receivedRequests.filter((r) => r.status === 'PENDING').length > 0 && (
              <span className="ml-2 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                {receivedRequests.filter((r) => r.status === 'PENDING').length}
              </span>
            )}
            {activeTab === 'received' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`pb-4 px-1 relative ${
              activeTab === 'sent'
                ? 'text-blue-600 font-medium'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            보낸 요청
            {activeTab === 'sent' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
            )}
          </button>
        </div>
      </div>

      {/* Messages List */}
      {currentRequests.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-gray-500 text-lg mb-2">
            {activeTab === 'received' ? '받은 요청이 없습니다' : '보낸 요청이 없습니다'}
          </p>
          <p className="text-gray-400 text-sm">
            {activeTab === 'received'
              ? '다른 조직으로부터 협력 요청을 받으면 여기에 표시됩니다'
              : '파트너 검색에서 조직을 찾아 협력을 요청해보세요'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {currentRequests.map((request) => {
            const senderOrg =
              request.organizations_contact_requests_senderOrgIdToorganizations;
            const receiverOrg =
              request.organizations_contact_requests_receiverOrgIdToorganizations;
            const displayOrg = activeTab === 'received' ? senderOrg : receiverOrg;

            return (
              <div
                key={request.id}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                {/* Header Row */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4 flex-1">
                    {/* Organization Logo */}
                    {displayOrg?.logoUrl && (
                      <img
                        src={displayOrg.logoUrl}
                        alt={displayOrg.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    )}
                    {!displayOrg?.logoUrl && (
                      <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                        <span className="text-xl font-bold text-gray-400">
                          {displayOrg?.name?.charAt(0) || '?'}
                        </span>
                      </div>
                    )}

                    {/* Organization Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">
                          {displayOrg?.name || '알 수 없는 조직'}
                        </h3>
                        <span className="text-xs text-gray-500">
                          {displayOrg?.type === 'COMPANY' ? '기업' : '연구기관'}
                        </span>
                      </div>
                      {activeTab === 'received' && request.sender && (
                        <p className="text-sm text-gray-600">
                          {request.sender.name} ({request.sender.email})
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(request.createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* Status & Type Badges */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
                      {typeLabels[request.type]}
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded font-medium ${
                        statusLabels[request.status].className
                      }`}
                    >
                      {statusLabels[request.status].label}
                    </span>
                  </div>
                </div>

                {/* Subject & Message */}
                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">{request.subject}</h4>
                  <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">
                    {request.message}
                  </p>
                </div>

                {/* Response Section (for received requests) */}
                {activeTab === 'received' && request.status === 'PENDING' && (
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        답변 메시지 (선택사항)
                      </label>
                      <textarea
                        value={respondingTo === request.id ? responseMessage : ''}
                        onChange={(e) => {
                          setRespondingTo(request.id);
                          setResponseMessage(e.target.value);
                        }}
                        placeholder="답변 메시지를 입력하세요..."
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleRespond(request.id, 'accept')}
                        disabled={respondingTo === request.id}
                        className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                      >
                        ✓ 수락
                      </button>
                      <button
                        onClick={() => handleRespond(request.id, 'decline')}
                        disabled={respondingTo === request.id}
                        className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                      >
                        ✗ 거절
                      </button>
                    </div>
                  </div>
                )}

                {/* Response Display (for already responded requests) */}
                {request.status !== 'PENDING' && request.respondedAt && (
                  <div className="border-t border-gray-200 pt-4 mt-4 bg-gray-50 -mx-6 -mb-6 px-6 pb-6 rounded-b-lg">
                    <div className="flex items-start gap-2 mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        {request.status === 'ACCEPTED' ? '✓ 수락됨' : '✗ 거절됨'}
                      </span>
                      <span className="text-xs text-gray-500">
                        · {formatDate(request.respondedAt)}
                      </span>
                    </div>
                    {request.responseMessage && (
                      <p className="text-sm text-gray-600 mt-2">
                        {'"'}{request.responseMessage}{'"'}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
