/**
 * Feedback Widget Component
 *
 * Floating feedback button displayed on all pages.
 * Opens modal for submitting feedback (bugs, feature requests, etc.)
 */

'use client';

import { useState } from 'react';
import { X, MessageSquare, Send } from 'lucide-react';

type FeedbackCategory = 'BUG' | 'FEATURE_REQUEST' | 'POSITIVE' | 'COMPLAINT' | 'QUESTION';

interface FeedbackFormData {
  category: FeedbackCategory;
  title: string;
  description: string;
}

const CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  BUG: '🐛 버그 리포트',
  FEATURE_REQUEST: '💡 기능 제안',
  POSITIVE: '👍 긍정적 피드백',
  COMPLAINT: '👎 불만 사항',
  QUESTION: '❓ 질문',
};

const CATEGORY_DESCRIPTIONS: Record<FeedbackCategory, string> = {
  BUG: '오류, 작동하지 않는 기능, 예상치 못한 동작',
  FEATURE_REQUEST: '새로운 기능 아이디어, 개선 제안',
  POSITIVE: '좋았던 점, 칭찬, 감사 메시지',
  COMPLAINT: '불편한 점, 개선이 필요한 사항',
  QUESTION: '사용 방법, 기능 문의',
};

export function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const [formData, setFormData] = useState<FeedbackFormData>({
    category: 'BUG',
    title: '',
    description: '',
  });

  const resetForm = () => {
    setFormData({
      category: 'BUG',
      title: '',
      description: '',
    });
    setSubmitStatus('idle');
    setErrorMessage('');
  };

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
          page: window.location.pathname,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit feedback');
      }

      setSubmitStatus('success');

      // Close modal after 2 seconds
      setTimeout(() => {
        setIsOpen(false);
        resetForm();
      }, 2000);
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      setSubmitStatus('error');
      setErrorMessage(error.message || '피드백 제출에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-5 py-3 text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
        aria-label="피드백 보내기"
      >
        <MessageSquare className="h-5 w-5" />
        <span className="font-semibold">피드백</span>
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          onClick={() => {
            setIsOpen(false);
            resetForm();
          }}
        >
          {/* Modal Content */}
          <div
            className="relative w-full max-w-2xl rounded-lg bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 p-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">피드백 보내기</h2>
                <p className="mt-1 text-sm text-gray-600">
                  버그 리포트, 기능 제안, 질문 등 무엇이든 공유해 주세요.
                </p>
              </div>
              <button
                onClick={() => {
                  setIsOpen(false);
                  resetForm();
                }}
                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                aria-label="닫기"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6">
              {/* Category Selection */}
              <div className="mb-6">
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  카테고리 <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, category: value as FeedbackCategory })
                      }
                      className={`rounded-lg border-2 p-3 text-left transition-all ${
                        formData.category === value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="font-semibold text-gray-900">{label}</div>
                      <div className="mt-1 text-xs text-gray-600">
                        {CATEGORY_DESCRIPTIONS[value as FeedbackCategory]}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title Input */}
              <div className="mb-6">
                <label
                  htmlFor="feedback-title"
                  className="mb-2 block text-sm font-semibold text-gray-700"
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
              <div className="mb-6">
                <label
                  htmlFor="feedback-description"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  상세 설명 <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="feedback-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800">
                  {errorMessage}
                </div>
              )}

              {/* Success Message */}
              {submitStatus === 'success' && (
                <div className="mb-4 rounded-lg bg-green-50 p-4 text-sm text-green-800">
                  ✅ 피드백이 성공적으로 제출되었습니다! 24시간 이내에 검토하겠습니다.
                </div>
              )}

              {/* Submit Button */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  💡 피드백은 익명으로도 제출 가능합니다.
                  <br />
                  답변을 원하시면 로그인 후 제출해 주세요.
                </p>
                <button
                  type="submit"
                  disabled={isSubmitting || submitStatus === 'success'}
                  className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 font-semibold text-white transition-all hover:scale-105 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
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
                </button>
              </div>
            </form>

            {/* Footer */}
            <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
              <p className="text-xs text-gray-600">
                <strong>피드백 처리 시간:</strong>
                <br />
                🚨 Critical: 2시간 이내 응답, 24시간 이내 해결
                <br />
                ⚠️ High: 8시간 이내 응답, 3일 이내 해결
                <br />
                📝 Medium: 24시간 이내 응답, 1-2주 이내 해결
                <br />
                💡 Low: 48시간 이내 응답, 출시 후 백로그
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
