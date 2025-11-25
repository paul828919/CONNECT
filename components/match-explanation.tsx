'use client';

/**
 * Match Explanation Component
 * Displays AI-powered Korean explanations for funding program matches
 *
 * Features:
 * - Claude Sonnet 4.5 powered explanations
 * - Beautiful card-based UI with shadcn/ui
 * - Loading states with skeleton
 * - Error handling with retry
 *
 * Week 3-4: AI Integration (Day 16-17)
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

interface ParsedMatchExplanation {
  summary: string;
  reasons: string[];
  cautions?: string;
  recommendation: string;
}

interface MatchExplanationMetadata {
  cached: boolean;
  cost: number;
  responseTime: number;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

interface MatchInfo {
  score: number;
  programTitle: string;
  agency: string;
  deadline?: string;
}

export interface MatchExplanationProps {
  matchId: string;
  autoLoad?: boolean; // Auto-load on mount (default: false, click to load for cost savings)
}

export function MatchExplanation({ matchId, autoLoad = false }: MatchExplanationProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<ParsedMatchExplanation | null>(null);
  const [metadata, setMetadata] = useState<MatchExplanationMetadata | null>(null);
  const [matchInfo, setMatchInfo] = useState<MatchInfo | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadExplanation = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/matches/${matchId}/explanation`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '설명을 불러올 수 없습니다.');
      }

      setExplanation(data.explanation);
      setMetadata(data.metadata);
      setMatchInfo(data.match);
      setHasLoaded(true);
    } catch (err: any) {
      setError(err.message || '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    if (autoLoad && !hasLoaded) {
      loadExplanation();
    }
  }, [autoLoad, hasLoaded, matchId, loadExplanation]);

  // Initial state: Click to load
  if (!hasLoaded && !loading) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="rounded-full bg-primary/10 p-4">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="font-semibold text-lg">AI 매칭 설명 보기</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Claude AI가 이 과제가 귀사에 적합한 이유를 상세히 설명해드립니다.
            </p>
          </div>
          <Button onClick={loadExplanation} size="lg" className="gap-2">
            <Sparkles className="h-4 w-4" />
            설명 생성하기
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="space-y-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={loadExplanation} className="gap-2">
            <RefreshCw className="h-3 w-3" />
            다시 시도
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Success state: Display explanation
  if (!explanation) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Main explanation card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl">AI 매칭 설명</CardTitle>
              <CardDescription>{matchInfo?.programTitle}</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadExplanation}
              className="gap-2 h-7 text-xs"
            >
              <RefreshCw className="h-3 w-3" />
              새로고침
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Summary */}
          <div className="rounded-lg bg-primary/5 p-4 border-l-4 border-primary">
            <p className="font-medium text-primary">{explanation.summary}</p>
          </div>

          {/* Reasons */}
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              적합한 이유
            </h4>
            <ul className="space-y-2">
              {explanation.reasons.map((reason, index) => (
                <li
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-md bg-green-50 border border-green-200"
                >
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-600 text-white text-xs flex items-center justify-center font-semibold mt-0.5">
                    {index + 1}
                  </span>
                  <span className="text-sm text-green-900">{reason}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Cautions (if any) */}
          {explanation.cautions && (
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                주의사항
              </h4>
              <div className="p-4 rounded-md bg-yellow-50 border border-yellow-200">
                <p className="text-sm text-yellow-900">{explanation.cautions}</p>
              </div>
            </div>
          )}

          {/* Recommendation */}
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-blue-600" />
              다음 단계
            </h4>
            <div className="p-4 rounded-md bg-blue-50 border border-blue-200">
              <p className="text-sm text-blue-900">{explanation.recommendation}</p>
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Match info card (optional, shows score and deadline) */}
      {matchInfo && (
        <Card className="bg-muted/50">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-xs text-muted-foreground">매칭 점수</p>
                <p className="text-2xl font-bold text-primary">{matchInfo.score}/100</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">주관 기관</p>
                <p className="text-sm font-medium">{matchInfo.agency}</p>
              </div>
              {matchInfo.deadline && (
                <div>
                  <p className="text-xs text-muted-foreground">마감일</p>
                  <p className="text-sm font-medium">
                    {new Date(matchInfo.deadline).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default MatchExplanation;
