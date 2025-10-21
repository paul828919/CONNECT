'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { QAChat } from '@/components/qa-chat';

/**
 * AI Chat Help Page
 * Interactive Q&A interface for government R&D funding questions
 */
export default function HelpPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/auth/signin');
      return;
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">AI 어시스턴트</h1>
        <p className="mt-2 text-gray-600">
          정부 R&D 과제에 대해 궁금한 점을 물어보세요. AI가 실시간으로 답변해드립니다.
        </p>
      </div>

      <div className="max-w-4xl">
        <QAChat autoFocus={true} />
      </div>

      {/* Help Tips */}
      <div className="mt-8 max-w-4xl">
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-6">
          <h3 className="font-semibold text-blue-900 mb-3">💡 활용 팁</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>구체적인 질문일수록 정확한 답변을 받을 수 있습니다.</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>TRL 단계, 인증 요건, 신청 절차 등 다양한 주제를 질문해보세요.</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>대화 내용은 자동으로 저장되며, 이전 대화를 참고하여 답변합니다.</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span className="font-semibold">중요: AI 답변은 참고용이며, 최종 신청 전 반드시 공고문을 직접 확인하세요.</span>
            </li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}
