/**
 * Admin Feedback Dashboard
 *
 * Admin-only dashboard for viewing and managing user feedback
 *
 * Features:
 * - List view with filtering by category, priority, status
 * - Search functionality
 * - Detailed view for each feedback item
 * - Status update functionality
 * - Admin notes capability
 * - Pagination
 */

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { toast } from 'react-hot-toast';
import {
  Loader2,
  MessageSquare,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle,
  Clock,
  AlertTriangle,
  Info,
  Bug,
  Lightbulb,
  ThumbsUp,
  HelpCircle,
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

// Types
interface FeedbackUser {
  id: string;
  name: string | null;
  email: string | null;
}

interface Feedback {
  id: string;
  userId: string | null;
  organizationId: string | null;
  category: 'BUG' | 'FEATURE_REQUEST' | 'POSITIVE' | 'COMPLAINT' | 'QUESTION';
  title: string;
  description: string;
  page: string | null;
  userAgent: string | null;
  screenshotUrl: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'NEW' | 'IN_REVIEW' | 'PLANNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  adminNotes: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: FeedbackUser | null;
}

interface FeedbackListResponse {
  feedback: Feedback[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasMore: boolean;
  };
  stats: {
    NEW: number;
    IN_REVIEW: number;
    PLANNED: number;
    IN_PROGRESS: number;
    RESOLVED: number;
    CLOSED: number;
  };
  timestamp: string;
}

export default function AdminFeedbackDashboard() {
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [category, setCategory] = useState<string>('');
  const [priority, setPriority] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState(1);
  const [editingNotes, setEditingNotes] = useState<string>('');
  const [editingStatus, setEditingStatus] = useState<string>('');
  const [editingPriority, setEditingPriority] = useState<string>('');

  const queryClient = useQueryClient();
  const limit = 50;

  // Build query params
  const buildQueryParams = () => {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (priority) params.append('priority', priority);
    if (status) params.append('status', status);
    if (search) params.append('search', search);
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    return params.toString();
  };

  // Fetch feedback list
  const { data, isLoading, error } = useQuery<FeedbackListResponse>({
    queryKey: ['admin-feedback', category, priority, status, search, page],
    queryFn: async () => {
      const res = await fetch(`/api/admin/feedback?${buildQueryParams()}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch feedback');
      }
      return res.json();
    },
  });

  // Update feedback mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      priority,
      adminNotes,
    }: {
      id: string;
      status?: string;
      priority?: string;
      adminNotes?: string;
    }) => {
      const res = await fetch(`/api/admin/feedback/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, priority, adminNotes }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update feedback');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('피드백이 성공적으로 업데이트되었습니다');
      queryClient.invalidateQueries({ queryKey: ['admin-feedback'] });
      setSelectedFeedback(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Handle detail view
  const handleViewDetail = (feedback: Feedback) => {
    setSelectedFeedback(feedback);
    setEditingNotes(feedback.adminNotes || '');
    setEditingStatus(feedback.status);
    setEditingPriority(feedback.priority);
  };

  // Handle update
  const handleUpdate = () => {
    if (!selectedFeedback) return;

    updateMutation.mutate({
      id: selectedFeedback.id,
      status: editingStatus,
      priority: editingPriority,
      adminNotes: editingNotes,
    });
  };

  // Get category icon and color
  const getCategoryDisplay = (category: string) => {
    const displays = {
      BUG: { icon: Bug, label: '버그 신고', color: 'bg-red-500' },
      FEATURE_REQUEST: { icon: Lightbulb, label: '기능 요청', color: 'bg-blue-500' },
      POSITIVE: { icon: ThumbsUp, label: '긍정적 피드백', color: 'bg-green-500' },
      COMPLAINT: { icon: AlertTriangle, label: '불만사항', color: 'bg-orange-500' },
      QUESTION: { icon: HelpCircle, label: '문의', color: 'bg-purple-500' },
    };
    return displays[category as keyof typeof displays];
  };

  // Get priority badge
  const getPriorityBadge = (priority: string) => {
    const colors = {
      CRITICAL: 'bg-red-600',
      HIGH: 'bg-orange-600',
      MEDIUM: 'bg-yellow-600',
      LOW: 'bg-gray-600',
    };
    return (
      <Badge className={colors[priority as keyof typeof colors]}>
        {priority}
      </Badge>
    );
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const variants = {
      NEW: { color: 'bg-blue-500', icon: Info },
      IN_REVIEW: { color: 'bg-purple-500', icon: Clock },
      PLANNED: { color: 'bg-indigo-500', icon: Clock },
      IN_PROGRESS: { color: 'bg-yellow-500', icon: Clock },
      RESOLVED: { color: 'bg-green-500', icon: CheckCircle },
      CLOSED: { color: 'bg-gray-500', icon: X },
    };
    const { color, icon: Icon } = variants[status as keyof typeof variants];
    return (
      <Badge className={color}>
        <Icon className="h-3 w-3 mr-1" />
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">피드백 관리</h1>
          <p className="text-muted-foreground">사용자 피드백 제출 내역 조회 및 관리</p>
        </div>

        {/* Stats Overview */}
        {data && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">신규</div>
              <div className="text-2xl font-bold text-blue-600">{data.stats.NEW}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">검토 중</div>
              <div className="text-2xl font-bold text-purple-600">{data.stats.IN_REVIEW}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">계획됨</div>
              <div className="text-2xl font-bold text-indigo-600">{data.stats.PLANNED}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">진행 중</div>
              <div className="text-2xl font-bold text-yellow-600">{data.stats.IN_PROGRESS}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">해결됨</div>
              <div className="text-2xl font-bold text-green-600">{data.stats.RESOLVED}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">종료됨</div>
              <div className="text-2xl font-bold text-gray-600">{data.stats.CLOSED}</div>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="피드백 검색..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm"
              />
            </div>

            {/* Category Filter */}
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">모든 카테고리</option>
              <option value="BUG">버그 신고</option>
              <option value="FEATURE_REQUEST">기능 요청</option>
              <option value="POSITIVE">긍정적 피드백</option>
              <option value="COMPLAINT">불만사항</option>
              <option value="QUESTION">문의</option>
            </select>

            {/* Priority Filter */}
            <select
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value);
                setPage(1);
              }}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">모든 우선순위</option>
              <option value="CRITICAL">긴급</option>
              <option value="HIGH">높음</option>
              <option value="MEDIUM">보통</option>
              <option value="LOW">낮음</option>
            </select>

            {/* Status Filter */}
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">모든 상태</option>
              <option value="NEW">신규</option>
              <option value="IN_REVIEW">검토 중</option>
              <option value="PLANNED">계획됨</option>
              <option value="IN_PROGRESS">진행 중</option>
              <option value="RESOLVED">해결됨</option>
              <option value="CLOSED">종료됨</option>
            </select>
          </div>
        </Card>

        {/* Feedback List */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <MessageSquare className="h-5 w-5 mr-2 text-blue-500" />
            피드백 제출 목록
            {data && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                (총 {data.pagination.totalCount}건)
              </span>
            )}
          </h2>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600">{(error as Error).message}</p>
            </div>
          ) : data && data.feedback.length > 0 ? (
            <div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>날짜</TableHead>
                      <TableHead>카테고리</TableHead>
                      <TableHead>제목</TableHead>
                      <TableHead>사용자</TableHead>
                      <TableHead>우선순위</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.feedback.map((feedback) => {
                      const categoryDisplay = getCategoryDisplay(feedback.category);
                      const CategoryIcon = categoryDisplay.icon;

                      return (
                        <TableRow key={feedback.id}>
                          <TableCell className="text-sm">
                            {new Date(feedback.createdAt).toLocaleDateString('ko-KR', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </TableCell>
                          <TableCell>
                            <Badge className={categoryDisplay.color}>
                              <CategoryIcon className="h-3 w-3 mr-1" />
                              {categoryDisplay.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate font-medium">
                            {feedback.title}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {feedback.user?.name || '익명'}
                            {feedback.user?.email && (
                              <div className="text-xs">{feedback.user.email}</div>
                            )}
                          </TableCell>
                          <TableCell>{getPriorityBadge(feedback.priority)}</TableCell>
                          <TableCell>{getStatusBadge(feedback.status)}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewDetail(feedback)}
                            >
                              보기
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  {data.pagination.page}/{data.pagination.totalPages} 페이지 •{' '}
                  총 {data.pagination.totalCount}건의 피드백
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    이전
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!data.pagination.hasMore}
                  >
                    다음
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-12">피드백이 없습니다</p>
          )}
        </Card>

        {/* Detail Modal */}
        {selectedFeedback && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold">피드백 상세</h2>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedFeedback(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                {/* Metadata */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">카테고리</div>
                    <div className="mt-1">
                      {(() => {
                        const categoryDisplay = getCategoryDisplay(selectedFeedback.category);
                        const CategoryIcon = categoryDisplay.icon;
                        return (
                          <Badge className={categoryDisplay.color}>
                            <CategoryIcon className="h-3 w-3 mr-1" />
                            {categoryDisplay.label}
                          </Badge>
                        );
                      })()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">제출일</div>
                    <div className="mt-1">
                      {new Date(selectedFeedback.createdAt).toLocaleString('ko-KR')}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">사용자</div>
                    <div className="mt-1">
                      {selectedFeedback.user?.name || '익명'}
                      {selectedFeedback.user?.email && (
                        <div className="text-sm text-muted-foreground">
                          {selectedFeedback.user.email}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">페이지</div>
                    <div className="mt-1 text-sm">
                      {selectedFeedback.page || '미지정'}
                    </div>
                  </div>
                </div>

                {/* Title & Description */}
                <div>
                  <div className="text-sm text-muted-foreground">제목</div>
                  <div className="mt-1 font-semibold text-lg">{selectedFeedback.title}</div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground">설명</div>
                  <div className="mt-1 p-3 bg-gray-50 rounded-lg whitespace-pre-wrap">
                    {selectedFeedback.description}
                  </div>
                </div>

                {/* Admin Controls */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">관리자 컨트롤</h3>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-sm text-muted-foreground">우선순위</label>
                      <select
                        value={editingPriority}
                        onChange={(e) => setEditingPriority(e.target.value)}
                        className="w-full mt-1 border rounded-lg px-3 py-2"
                      >
                        <option value="CRITICAL">긴급</option>
                        <option value="HIGH">높음</option>
                        <option value="MEDIUM">보통</option>
                        <option value="LOW">낮음</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-sm text-muted-foreground">상태</label>
                      <select
                        value={editingStatus}
                        onChange={(e) => setEditingStatus(e.target.value)}
                        className="w-full mt-1 border rounded-lg px-3 py-2"
                      >
                        <option value="NEW">신규</option>
                        <option value="IN_REVIEW">검토 중</option>
                        <option value="PLANNED">계획됨</option>
                        <option value="IN_PROGRESS">진행 중</option>
                        <option value="RESOLVED">해결됨</option>
                        <option value="CLOSED">종료됨</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground">관리자 메모</label>
                    <Textarea
                      value={editingNotes}
                      onChange={(e) => setEditingNotes(e.target.value)}
                      placeholder="이 피드백에 대한 내부 메모를 추가하세요..."
                      className="mt-1"
                      rows={4}
                    />
                  </div>

                  <div className="flex justify-end gap-2 mt-4">
                    <Button
                      variant="outline"
                      onClick={() => setSelectedFeedback(null)}
                      disabled={updateMutation.isPending}
                    >
                      취소
                    </Button>
                    <Button
                      onClick={handleUpdate}
                      disabled={updateMutation.isPending}
                    >
                      {updateMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          업데이트 중...
                        </>
                      ) : (
                        '피드백 업데이트'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
