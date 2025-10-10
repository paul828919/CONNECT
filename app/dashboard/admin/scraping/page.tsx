/**
 * Admin Scraping Dashboard
 *
 * Monitoring and control interface for the scraping system:
 * - Manual trigger controls (per-agency + "Scrape All")
 * - Queue status monitoring (waiting/active/completed/failed jobs)
 * - Recent scraping logs table
 * - Statistics and trends
 */

'use client';

// Prevent static generation at build time
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

  const agencies = [
    { id: 'iitp', name: 'IITP (정보통신기획평가원)', color: 'bg-blue-500' },
    { id: 'keit', name: 'KEIT (한국산업기술평가관리원)', color: 'bg-green-500' },
    { id: 'tipa', name: 'TIPA (중소기업기술정보진흥원)', color: 'bg-purple-500' },
    { id: 'kimst', name: 'KIMST (해양수산과학기술진흥원)', color: 'bg-cyan-500' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Scraping Dashboard</h1>
          <p className="text-muted-foreground">Monitor and control funding program scraping</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={isAutoRefresh ? 'default' : 'outline'}
            size="sm"
            onClick={() => setIsAutoRefresh(!isAutoRefresh)}
          >
            <RefreshCcw className={`h-4 w-4 mr-2 ${isAutoRefresh ? 'animate-spin' : ''}`} />
            {isAutoRefresh ? 'Auto-Refresh ON' : 'Auto-Refresh OFF'}
          </Button>
        </div>
      </div>

      {/* Manual Trigger Controls */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Manual Scrape Triggers</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {agencies.map((agency) => (
            <Button
              key={agency.id}
              onClick={() => scrapeMutation.mutate(agency.id)}
              disabled={scrapeMutation.isPending}
              className="w-full"
            >
              {scrapeMutation.isPending && scrapeMutation.variables === agency.id ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <PlayCircle className="h-4 w-4 mr-2" />
              )}
              Scrape {agency.id.toUpperCase()}
            </Button>
          ))}

          <Button
            onClick={() => scrapeMutation.mutate()}
            disabled={scrapeMutation.isPending}
            variant="default"
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600"
          >
            {scrapeMutation.isPending && scrapeMutation.variables === undefined ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <PlayCircle className="h-4 w-4 mr-2" />
            )}
            Scrape All Agencies
          </Button>
        </div>
      </Card>

      {/* Queue Status */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Queue Status</h2>
        {statsLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : queueStats ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <Clock className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
              <div className="text-2xl font-bold">{queueStats.waiting}</div>
              <div className="text-sm text-muted-foreground">Waiting</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <Loader2 className="h-8 w-8 mx-auto mb-2 text-blue-500 animate-spin" />
              <div className="text-2xl font-bold">{queueStats.active}</div>
              <div className="text-sm text-muted-foreground">Active</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <div className="text-2xl font-bold">{queueStats.completed}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <XCircle className="h-8 w-8 mx-auto mb-2 text-red-500" />
              <div className="text-2xl font-bold">{queueStats.failed}</div>
              <div className="text-sm text-muted-foreground">Failed</div>
            </div>
            <div className="text-center p-4 border rounded-lg bg-primary/5">
              <div className="text-2xl font-bold">{queueStats.total}</div>
              <div className="text-sm text-muted-foreground">Total Jobs</div>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground">No queue stats available</p>
        )}
      </Card>

      {/* Recent Scraping Logs */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Scraping Logs</h2>
        {logsLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : logs && logs.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Found</TableHead>
                  <TableHead className="text-right">New</TableHead>
                  <TableHead className="text-right">Updated</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.slice(0, 20).map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.agencyId}</TableCell>
                    <TableCell>
                      {log.success ? (
                        <Badge variant="default" className="bg-green-500">Success</Badge>
                      ) : (
                        <Badge variant="destructive">Failed</Badge>
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
                      {(log.duration / 1000).toFixed(1)}s
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(log.completedAt).toLocaleString('ko-KR')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">No scraping logs available</p>
        )}
      </Card>
      </div>
    </DashboardLayout>
  );
}
