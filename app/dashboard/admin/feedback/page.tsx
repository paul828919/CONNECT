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
      toast.success('Feedback updated successfully');
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
      BUG: { icon: Bug, label: 'Bug Report', color: 'bg-red-500' },
      FEATURE_REQUEST: { icon: Lightbulb, label: 'Feature Request', color: 'bg-blue-500' },
      POSITIVE: { icon: ThumbsUp, label: 'Positive Feedback', color: 'bg-green-500' },
      COMPLAINT: { icon: AlertTriangle, label: 'Complaint', color: 'bg-orange-500' },
      QUESTION: { icon: HelpCircle, label: 'Question', color: 'bg-purple-500' },
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
          <h1 className="text-3xl font-bold">Feedback Management</h1>
          <p className="text-muted-foreground">View and manage user feedback submissions</p>
        </div>

        {/* Stats Overview */}
        {data && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">New</div>
              <div className="text-2xl font-bold text-blue-600">{data.stats.NEW}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">In Review</div>
              <div className="text-2xl font-bold text-purple-600">{data.stats.IN_REVIEW}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Planned</div>
              <div className="text-2xl font-bold text-indigo-600">{data.stats.PLANNED}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">In Progress</div>
              <div className="text-2xl font-bold text-yellow-600">{data.stats.IN_PROGRESS}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Resolved</div>
              <div className="text-2xl font-bold text-green-600">{data.stats.RESOLVED}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Closed</div>
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
                placeholder="Search feedback..."
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
              <option value="">All Categories</option>
              <option value="BUG">Bug Report</option>
              <option value="FEATURE_REQUEST">Feature Request</option>
              <option value="POSITIVE">Positive Feedback</option>
              <option value="COMPLAINT">Complaint</option>
              <option value="QUESTION">Question</option>
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
              <option value="">All Priorities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
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
              <option value="">All Statuses</option>
              <option value="NEW">New</option>
              <option value="IN_REVIEW">In Review</option>
              <option value="PLANNED">Planned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
        </Card>

        {/* Feedback List */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <MessageSquare className="h-5 w-5 mr-2 text-blue-500" />
            Feedback Submissions
            {data && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({data.pagination.totalCount} total)
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
                      <TableHead>Date</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
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
                            {feedback.user?.name || 'Anonymous'}
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
                              View
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
                  Page {data.pagination.page} of {data.pagination.totalPages} •{' '}
                  {data.pagination.totalCount} total feedback
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!data.pagination.hasMore}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-12">No feedback found</p>
          )}
        </Card>

        {/* Detail Modal */}
        {selectedFeedback && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold">Feedback Detail</h2>
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
                    <div className="text-sm text-muted-foreground">Category</div>
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
                    <div className="text-sm text-muted-foreground">Submitted</div>
                    <div className="mt-1">
                      {new Date(selectedFeedback.createdAt).toLocaleString('ko-KR')}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">User</div>
                    <div className="mt-1">
                      {selectedFeedback.user?.name || 'Anonymous'}
                      {selectedFeedback.user?.email && (
                        <div className="text-sm text-muted-foreground">
                          {selectedFeedback.user.email}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Page</div>
                    <div className="mt-1 text-sm">
                      {selectedFeedback.page || 'Not specified'}
                    </div>
                  </div>
                </div>

                {/* Title & Description */}
                <div>
                  <div className="text-sm text-muted-foreground">Title</div>
                  <div className="mt-1 font-semibold text-lg">{selectedFeedback.title}</div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground">Description</div>
                  <div className="mt-1 p-3 bg-gray-50 rounded-lg whitespace-pre-wrap">
                    {selectedFeedback.description}
                  </div>
                </div>

                {/* Admin Controls */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Admin Controls</h3>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-sm text-muted-foreground">Priority</label>
                      <select
                        value={editingPriority}
                        onChange={(e) => setEditingPriority(e.target.value)}
                        className="w-full mt-1 border rounded-lg px-3 py-2"
                      >
                        <option value="CRITICAL">Critical</option>
                        <option value="HIGH">High</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="LOW">Low</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-sm text-muted-foreground">Status</label>
                      <select
                        value={editingStatus}
                        onChange={(e) => setEditingStatus(e.target.value)}
                        className="w-full mt-1 border rounded-lg px-3 py-2"
                      >
                        <option value="NEW">New</option>
                        <option value="IN_REVIEW">In Review</option>
                        <option value="PLANNED">Planned</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="RESOLVED">Resolved</option>
                        <option value="CLOSED">Closed</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground">Admin Notes</label>
                    <Textarea
                      value={editingNotes}
                      onChange={(e) => setEditingNotes(e.target.value)}
                      placeholder="Add internal notes about this feedback..."
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
                      Cancel
                    </Button>
                    <Button
                      onClick={handleUpdate}
                      disabled={updateMutation.isPending}
                    >
                      {updateMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        'Update Feedback'
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
