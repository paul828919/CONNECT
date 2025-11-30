/**
 * Admin Scraping Dashboard
 *
 * Monitoring and control interface for the scraping system:
 * - Manual trigger controls for NTIS scraping
 * - Queue status monitoring (waiting/active/completed/failed jobs)
 * - Recent scraping logs table
 * - Statistics and trends
 */

'use client';

import { useState, useEffect } from 'react';
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
import { Loader2, PlayCircle, RefreshCcw, CheckCircle, XCircle, Clock } from 'lucide-react';

interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  total: number;
}

interface ScrapingLog {
  id: string;
  agencyId: string;
  success: boolean;
  programsFound: number;
  programsNew: number;
  programsUpdated: number;
  errorMessage?: string;
  startedAt: Date;
  completedAt: Date;
  duration: number;
}

export default function AdminScrapingDashboard() {
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const LOGS_PER_PAGE = 10;
  const queryClient = useQueryClient();

  // Fetch queue stats
  const { data: queueStats, isLoading: statsLoading } = useQuery<QueueStats>({
    queryKey: ['scraping-queue-stats'],
    queryFn: async () => {
      const res = await fetch('/api/admin/scrape');
      if (!res.ok) throw new Error('Failed to fetch queue stats');
      const data = await res.json();
      return data.queueStats;
    },
    refetchInterval: isAutoRefresh ? 5000 : false, // Auto-refresh every 5 seconds
  });

  // Fetch scraping logs
  const { data: logs, isLoading: logsLoading } = useQuery<ScrapingLog[]>({
    queryKey: ['scraping-logs'],
    queryFn: async () => {
      const res = await fetch('/api/admin/scraping-logs');
      if (!res.ok) throw new Error('Failed to fetch scraping logs');
      return res.json();
    },
    refetchInterval: isAutoRefresh ? 10000 : false, // Auto-refresh every 10 seconds
  });

  // Manual scrape mutation
  const scrapeMutation = useMutation({
    mutationFn: async (agencyId?: string) => {
      const res = await fetch('/api/admin/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agencyId }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to trigger scrape');
      }
      return res.json();
    },
    onSuccess: (data, agencyId) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ['scraping-queue-stats'] });
      queryClient.invalidateQueries({ queryKey: ['scraping-logs'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // NTIS scraping - aggregates all Korean R&D programs
  const ntisSource = {
    id: 'ntis',
    name: 'NTIS (국가과학기술지식정보서비스)',
    description: '모든 한국 연구기관의 R&D 프로그램 통합 스크래핑'
  };

  // Pagination calculations
  const totalPages = logs ? Math.ceil(logs.length / LOGS_PER_PAGE) : 0;
  const startIndex = (currentPage - 1) * LOGS_PER_PAGE;
  const endIndex = startIndex + LOGS_PER_PAGE;
  const paginatedLogs = logs?.slice(startIndex, endIndex) || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">스크래핑 대시보드</h1>
          <p className="text-muted-foreground">연구 지원 프로그램 스크래핑 모니터링 및 제어</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={isAutoRefresh ? 'default' : 'outline'}
            size="sm"
            onClick={() => setIsAutoRefresh(!isAutoRefresh)}
          >
            <RefreshCcw className={`h-4 w-4 mr-2 ${isAutoRefresh ? 'animate-spin' : ''}`} />
            {isAutoRefresh ? '자동 새로고침 ON' : '자동 새로고침 OFF'}
          </Button>
        </div>
      </div>

      {/* Manual Trigger Controls */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">수동 스크래핑 트리거</h2>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {ntisSource.description}
          </p>
          <Button
            onClick={() => scrapeMutation.mutate(ntisSource.id)}
            disabled={scrapeMutation.isPending}
            variant="default"
            className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            size="lg"
          >
            {scrapeMutation.isPending ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <PlayCircle className="h-5 w-5 mr-2" />
            )}
            {ntisSource.name} 스크래핑 시작
          </Button>
        </div>
      </Card>

      {/* Queue Status */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">큐 상태</h2>
        {statsLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : queueStats ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <Clock className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
              <div className="text-2xl font-bold">{queueStats.waiting}</div>
              <div className="text-sm text-muted-foreground">대기 중</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <Loader2 className="h-8 w-8 mx-auto mb-2 text-blue-500 animate-spin" />
              <div className="text-2xl font-bold">{queueStats.active}</div>
              <div className="text-sm text-muted-foreground">실행 중</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <div className="text-2xl font-bold">{queueStats.completed}</div>
              <div className="text-sm text-muted-foreground">완료</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <XCircle className="h-8 w-8 mx-auto mb-2 text-red-500" />
              <div className="text-2xl font-bold">{queueStats.failed}</div>
              <div className="text-sm text-muted-foreground">실패</div>
            </div>
            <div className="text-center p-4 border rounded-lg bg-primary/5">
              <div className="text-2xl font-bold">{queueStats.total}</div>
              <div className="text-sm text-muted-foreground">전체 작업</div>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground">사용 가능한 큐 통계 없음</p>
        )}
      </Card>

      {/* Recent Scraping Logs */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">최근 스크래핑 로그</h2>
        {logsLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : logs && logs.length > 0 ? (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>소스</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead className="text-right">발견</TableHead>
                    <TableHead className="text-right">신규</TableHead>
                    <TableHead className="text-right">업데이트</TableHead>
                    <TableHead className="text-right">소요 시간</TableHead>
                    <TableHead>타임스탬프</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{log.agencyId.toUpperCase()}</TableCell>
                      <TableCell>
                        {log.success ? (
                          <Badge variant="default" className="bg-green-500">성공</Badge>
                        ) : (
                          <Badge variant="destructive">실패</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{log.programsFound}</TableCell>
                      <TableCell className="text-right font-semibold text-blue-600">
                        {log.programsNew}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {log.programsUpdated}
                      </TableCell>
                      <TableCell className="text-right">
                        {(log.duration / 1000).toFixed(1)}초
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(log.completedAt).toLocaleString('ko-KR')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t pt-4">
                <div className="text-sm text-muted-foreground">
                  총 {logs.length}개 중 {startIndex + 1}-{Math.min(endIndex, logs.length)}개 표시
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    이전
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <Button
                        key={page}
                        variant={currentPage === page ? 'default' : 'outline'}
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    다음
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">사용 가능한 스크래핑 로그 없음</p>
        )}
      </Card>
      </div>
    </DashboardLayout>
  );
}
