'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Send, CheckCircle } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type FeedbackCategory = 'BUG' | 'FEATURE_REQUEST' | 'POSITIVE' | 'COMPLAINT' | 'QUESTION';

interface FeedbackFormData {
  category: FeedbackCategory;
  title: string;
  description: string;
}

const CATEGORY_OPTIONS: {
  value: FeedbackCategory;
  label: string;
  description: string;
}[] = [
  {
    value: 'BUG',
    label: '버그 리포트',
    description: '오류, 작동하지 않는 기능, 예상치 못한 동작',
  },
  {
    value: 'FEATURE_REQUEST',
    label: '기능 제안',
    description: '새로운 기능 아이디어, 개선 제안',
  },
  {
    value: 'POSITIVE',
    label: '긍정적 피드백',
    description: '좋았던 점, 칭찬, 감사 메시지',
  },
  {
    value: 'COMPLAINT',
    label: '불만 사항',
    description: '불편한 점, 개선이 필요한 사항',
  },
  {
    value: 'QUESTION',
    label: '질문',
    description: '사용 방법, 기능 문의',
  },
];

export default function FeedbackPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const [formData, setFormData] = useState<FeedbackFormData>({
    category: 'BUG',
    title: '',
    description: '',
  });

  // Redirect to signin if not authenticated
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

  if (!session) {
    router.push('/auth/signin');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    if (formData.title.length < 5) {
      setErrorMessage('제목은 최소 5자 이상이어야 합니다.');
      return;
    }

    if (formData.description.length < 10) {
      setErrorMessage('상세 설명은 최소 10자 이상이어야 합니다.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category: formData.category,
          title: formData.title,
          description: formData.description,
          page: '/dashboard/feedback',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit feedback');
      }

      setSubmitStatus('success');

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (error: unknown) {
      console.error('Error submitting feedback:', error);
      setSubmitStatus('error');
      const errorMsg = error instanceof Error ? error.message : '피드백 제출에 실패했습니다. 다시 시도해 주세요.';
      setErrorMessage(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success state
  if (submitStatus === 'success') {
    return (
      <DashboardLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Card className="max-w-md w-full p-8 text-center">
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              피드백이 제출되었습니다!
            </h2>
            <p className="text-gray-600 mb-4">
              소중한 의견 감사합니다. 24시간 이내에 검토하겠습니다.
            </p>
            <p className="text-sm text-gray-500">
              잠시 후 대시보드로 이동합니다...
            </p>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">피드백 보내기</h1>
          <p className="mt-2 text-gray-600">
            버그 리포트, 기능 제안, 질문 등 무엇이든 공유해 주세요.
          </p>
        </div>

        {/* Form Card */}
        <Card className="p-6 mb-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Category Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                카테고리 <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {CATEGORY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, category: option.value })
                    }
                    className={`rounded-lg border-2 p-4 text-left transition-all ${
                      formData.category === option.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="font-semibold text-gray-900">{option.label}</div>
                    <div className="mt-1 text-sm text-gray-600">
                      {option.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Title Input */}
            <div>
              <label
                htmlFor="feedback-title"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                제목 <span className="text-red-500">*</span>
              </label>
              <input
                id="feedback-title"
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="간단한 제목을 입력하세요 (5-200자)"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                maxLength={200}
                required
              />
              <div className="mt-1 text-right text-xs text-gray-500">
                {formData.title.length} / 200
              </div>
            </div>

            {/* Description Textarea */}
            <div>
              <label
                htmlFor="feedback-description"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                상세 설명 <span className="text-red-500">*</span>
              </label>
              <textarea
                id="feedback-description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="자세한 내용을 입력하세요 (10-5000자)&#10;&#10;버그 리포트: 발생 상황, 예상 동작, 실제 동작&#10;기능 제안: 왜 필요한지, 어떻게 작동해야 하는지&#10;질문: 궁금한 점을 구체적으로"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                rows={8}
                maxLength={5000}
                required
              />
              <div className="mt-1 text-right text-xs text-gray-500">
                {formData.description.length} / 5000
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">
                {errorMessage}
              </div>
            )}

            {/* Submit Section */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                피드백은 익명으로도 제출 가능합니다.
                <br />
                답변을 원하시면 로그인 후 제출해 주세요.
              </p>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-6 py-3"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>제출 중...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5" />
                    <span>피드백 보내기</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>

        {/* Info Card */}
        <Card className="p-6 bg-gray-50">
          <h3 className="font-semibold text-gray-900 mb-3">피드백 처리 시간</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p>
              <span className="font-medium">Critical:</span> 2시간 이내 응답, 24시간 이내 해결
            </p>
            <p>
              <span className="font-medium">High:</span> 8시간 이내 응답, 3일 이내 해결
            </p>
            <p>
              <span className="font-medium">Medium:</span> 24시간 이내 응답, 1-2주 이내 해결
            </p>
            <p>
              <span className="font-medium">Low:</span> 48시간 이내 응답, 출시 후 백로그
            </p>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
