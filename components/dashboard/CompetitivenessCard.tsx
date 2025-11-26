'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

interface CompetitivenessSummary {
  improvementCount: number;
  hasMatches: boolean;
  highPriorityCount: number;
}

interface CompetitivenessCardProps {
  organizationId: string;
}

/**
 * CompetitivenessCard Component
 *
 * Dashboard card that shows competitiveness analysis summary.
 * Three states:
 * 1. No matches: Prompt to generate matches first
 * 2. No improvements: Show success state
 * 3. Has improvements: Show improvement count with badge
 */
export function CompetitivenessCard({ organizationId }: CompetitivenessCardProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<CompetitivenessSummary | null>(null);

  const fetchSummary = useCallback(async () => {
    if (!organizationId) return;

    try {
      setLoading(true);
      setError(null);

      const res = await fetch(
        `/api/competitiveness/summary?organizationId=${organizationId}`
      );

      if (!res.ok) {
        throw new Error('Failed to fetch competitiveness summary');
      }

      const data = await res.json();
      setSummary(data.data);
    } catch (err) {
      console.error('Error fetching competitiveness summary:', err);
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Loading state
  if (loading) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <div className="animate-pulse">
          <div className="h-5 bg-gray-200 rounded w-3/4 mb-3"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h4 className="font-semibold text-gray-900 mb-1">📊 선정 경쟁력 분석</h4>
        <p className="text-sm text-red-600">{error}</p>
        <button
          onClick={fetchSummary}
          className="mt-2 text-sm text-blue-600 hover:text-blue-700"
        >
          다시 시도
        </button>
      </div>
    );
  }

  // No matches state
  if (!summary?.hasMatches) {
    return (
      <Link
        href="/dashboard"
        className="block rounded-xl bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
      >
        <h4 className="font-semibold text-gray-900 mb-2">📊 선정 경쟁력 분석</h4>
        <p className="text-sm text-gray-600 mb-3">먼저 매칭을 생성해주세요</p>
        <p className="text-xs text-gray-500">
          매칭된 연구과제가 있어야 경쟁력 분석이 가능합니다.
        </p>
        <div className="mt-4 text-sm text-blue-600 font-medium flex items-center">
          매칭 생성하기
          <svg
            className="ml-1 h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </Link>
    );
  }

  // No improvements state (optimal profile)
  if (summary.improvementCount === 0) {
    return (
      <Link
        href="/dashboard/competitiveness"
        className="block rounded-xl bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
      >
        <h4 className="font-semibold text-gray-900 mb-2">📊 선정 경쟁력 분석</h4>
        <div className="flex items-center text-green-600 mb-2">
          <svg
            className="h-5 w-5 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-sm font-medium">현재 프로필로 최대 경쟁력 확보</span>
        </div>
        <p className="text-xs text-gray-500">
          매칭된 연구과제에 대해 추가 개선점이 없습니다. 프로필이 잘 구성되어 있습니다.
        </p>
      </Link>
    );
  }

  // Standard state with improvement suggestions
  return (
    <Link
      href="/dashboard/competitiveness"
      className="block rounded-xl bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 mb-1">📊 선정 경쟁력 분석</h4>
          <p className="text-sm text-gray-600">
            매칭된 연구과제 선정 가능성을 높이기 위한 조직 프로필 개선점을 확인하세요
          </p>
        </div>
        {summary.highPriorityCount > 0 ? (
          <span className="bg-orange-100 text-orange-800 text-xs font-medium px-2.5 py-0.5 rounded-full whitespace-nowrap ml-2">
            💡 경쟁력 개선 {summary.improvementCount}건
          </span>
        ) : (
          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full whitespace-nowrap ml-2">
            💡 개선 제안 {summary.improvementCount}건
          </span>
        )}
      </div>
      <div className="mt-3 text-sm text-blue-600 font-medium flex items-center">
        보기
        <svg
          className="ml-1 h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </div>
    </Link>
  );
}

export default CompetitivenessCard;
