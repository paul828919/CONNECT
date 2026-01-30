'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Trash2, Star, ChevronDown, ChevronUp } from 'lucide-react';
import { CompletenessBar } from './CompletenessBar';
import { BulkDeleteConfirmDialog } from './BulkDeleteConfirmDialog';
import { useBulkDelete } from './useBulkDelete';

interface DuplicateProgram {
  id: string;
  title: string;
  pblancSeq?: number | null;
  contentHash?: string | null;
  status: string;
  completeness: { percent: number; filled: number; total: number };
  matchCount: number;
  createdAt: string;
  updatedAt: string;
}

interface DuplicateGroup {
  groupId: string;
  reason: 'contentHash' | 'pblancSeq' | 'titleSimilarity';
  similarity: number;
  programs: DuplicateProgram[];
  suggestedKeepId: string;
}

interface DuplicateDetectionResult {
  groups: DuplicateGroup[];
  summary: {
    totalGroups: number;
    totalDuplicates: number;
    byReason: Record<string, number>;
  };
}

const REASON_LABELS: Record<string, string> = {
  contentHash: 'contentHash 일치',
  pblancSeq: '공고번호 일치',
  titleSimilarity: '제목 유사',
};

const REASON_COLORS: Record<string, string> = {
  contentHash: 'bg-red-100 text-red-800',
  pblancSeq: 'bg-orange-100 text-orange-800',
  titleSimilarity: 'bg-yellow-100 text-yellow-800',
};

interface DuplicateDetectionPanelProps {
  tableName: 'sme-programs' | 'funding-programs';
  onRefreshData: () => void;
}

export function DuplicateDetectionPanel({
  tableName,
  onRefreshData,
}: DuplicateDetectionPanelProps) {
  const [result, setResult] = useState<DuplicateDetectionResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showConfirm, setShowConfirm] = useState(false);

  const { bulkDelete, isDeleting } = useBulkDelete({
    tableName,
    onSuccess: () => {
      setSelectedIds(new Set());
      setResult(null);
      setScanned(false);
      onRefreshData();
    },
  });

  const scan = useCallback(async () => {
    setIsScanning(true);
    setResult(null);
    setSelectedIds(new Set());
    try {
      const res = await fetch(
        `/api/admin/data-quality-console/${tableName}/duplicates`
      );
      if (!res.ok) {
        console.error('Duplicate scan failed:', await res.text());
        return;
      }
      const data: DuplicateDetectionResult = await res.json();
      setResult(data);
      setScanned(true);

      // Auto-expand all groups and pre-select non-suggested items
      const allGroupIds = new Set(data.groups.map((g) => g.groupId));
      setExpandedGroups(allGroupIds);

      const preSelected = new Set<string>();
      for (const group of data.groups) {
        for (const p of group.programs) {
          if (p.id !== group.suggestedKeepId) {
            preSelected.add(p.id);
          }
        }
      }
      setSelectedIds(preSelected);
    } catch (error) {
      console.error('Duplicate scan error:', error);
    } finally {
      setIsScanning(false);
    }
  }, [tableName]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const selectAutoCleanup = () => {
    if (!result) return;
    const autoSelected = new Set<string>();
    for (const group of result.groups) {
      for (const p of group.programs) {
        if (p.id !== group.suggestedKeepId) {
          autoSelected.add(p.id);
        }
      }
    }
    setSelectedIds(autoSelected);
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    await bulkDelete(ids);
    setShowConfirm(false);
  };

  const totalMatchCount = result
    ? result.groups.reduce((sum, g) => {
        return (
          sum +
          g.programs
            .filter((p) => selectedIds.has(p.id))
            .reduce((s, p) => s + p.matchCount, 0)
        );
      }, 0)
    : 0;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('ko-KR');

  return (
    <div className="space-y-4">
      {/* Scan Button */}
      <div className="flex items-center gap-3">
        <Button
          onClick={scan}
          disabled={isScanning}
          variant="outline"
          size="sm"
        >
          {isScanning ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Search className="mr-2 h-4 w-4" />
          )}
          {isScanning ? '검사 중...' : '중복 검사'}
        </Button>

        {scanned && result && result.groups.length === 0 && (
          <span className="text-sm text-green-600 font-medium">
            ✓ 중복이 발견되지 않았습니다
          </span>
        )}
      </div>

      {/* Results */}
      {result && result.groups.length > 0 && (
        <div className="space-y-4 rounded-lg border border-orange-200 bg-orange-50/50 p-4">
          {/* Summary bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-orange-800">
                {result.summary.totalGroups}개 중복 그룹
              </span>
              <span className="text-orange-600">
                ({result.summary.totalDuplicates}개 중복 항목)
              </span>
              {Object.entries(result.summary.byReason).map(([reason, count]) => (
                <Badge
                  key={reason}
                  className={REASON_COLORS[reason] || 'bg-gray-100 text-gray-800'}
                  variant="secondary"
                >
                  {REASON_LABELS[reason] || reason}: {count}
                </Badge>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={selectAutoCleanup}
                variant="outline"
                size="sm"
              >
                전체 자동 선택
              </Button>
              <Button
                onClick={() => setShowConfirm(true)}
                disabled={selectedIds.size === 0 || isDeleting}
                variant="destructive"
                size="sm"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {selectedIds.size}개 선택 삭제
              </Button>
            </div>
          </div>

          {/* Duplicate Groups */}
          <div className="space-y-3">
            {result.groups.map((group) => {
              const isExpanded = expandedGroups.has(group.groupId);
              const groupSelectedCount = group.programs.filter((p) =>
                selectedIds.has(p.id)
              ).length;

              return (
                <div
                  key={group.groupId}
                  className="rounded-md border border-orange-200 bg-white"
                >
                  {/* Group Header */}
                  <button
                    onClick={() => toggleGroup(group.groupId)}
                    className="flex w-full items-center justify-between p-3 text-left hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-2">
                      <Badge
                        className={REASON_COLORS[group.reason] || 'bg-gray-100'}
                        variant="secondary"
                      >
                        {REASON_LABELS[group.reason] || group.reason}
                      </Badge>
                      {group.reason === 'titleSimilarity' && (
                        <span className="text-xs text-muted-foreground">
                          유사도: {Math.round(group.similarity * 100)}%
                        </span>
                      )}
                      <span className="text-sm text-muted-foreground">
                        {group.programs.length}개 항목
                      </span>
                      {groupSelectedCount > 0 && (
                        <Badge variant="secondary" className="bg-red-50 text-red-700">
                          {groupSelectedCount}개 선택됨
                        </Badge>
                      )}
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>

                  {/* Group Body */}
                  {isExpanded && (
                    <div className="border-t border-orange-100">
                      {group.programs.map((program) => {
                        const isSuggested = program.id === group.suggestedKeepId;
                        const isSelected = selectedIds.has(program.id);

                        return (
                          <div
                            key={program.id}
                            className={`flex items-center gap-3 px-3 py-2 border-b border-gray-100 last:border-b-0 ${
                              isSuggested ? 'bg-green-50/50' : isSelected ? 'bg-red-50/30' : ''
                            }`}
                          >
                            {/* Checkbox */}
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(program.id)}
                              className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                            />

                            {/* Keep badge */}
                            {isSuggested && (
                              <Badge className="bg-green-100 text-green-800 shrink-0" variant="secondary">
                                <Star className="mr-1 h-3 w-3" />
                                추천
                              </Badge>
                            )}

                            {/* Title */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {program.title || '(제목 없음)'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                ID: {program.id.slice(0, 8)}...
                                {program.pblancSeq != null && (
                                  <> &middot; 공고번호: {program.pblancSeq}</>
                                )}
                                {' '}&middot; 생성: {formatDate(program.createdAt)}
                              </p>
                            </div>

                            {/* Completeness */}
                            <div className="shrink-0 w-28">
                              <CompletenessBar percent={program.completeness.percent} size="sm" />
                            </div>

                            {/* Match count */}
                            <span className="shrink-0 text-xs text-muted-foreground w-16 text-right">
                              매칭 {program.matchCount}
                            </span>

                            {/* Status */}
                            <Badge
                              variant="secondary"
                              className={
                                program.status === 'ACTIVE'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }
                            >
                              {program.status}
                            </Badge>
                          </div>
                        );
                      })}

                      {/* Per-group delete button */}
                      <div className="flex justify-end p-2 bg-gray-50/50">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          disabled={
                            group.programs.filter((p) => selectedIds.has(p.id)).length === 0
                          }
                          onClick={() => setShowConfirm(true)}
                        >
                          <Trash2 className="mr-1 h-3 w-3" />
                          선택 삭제
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bulk Delete Confirm Dialog */}
      <BulkDeleteConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        count={selectedIds.size}
        totalMatchCount={totalMatchCount}
        isDeleting={isDeleting}
        onConfirm={handleBulkDelete}
      />
    </div>
  );
}
