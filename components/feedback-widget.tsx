'use client';

import { useRouter } from 'next/navigation';
import { MessageSquare } from 'lucide-react';

/**
 * Feedback Widget Component
 *
 * Floating feedback button displayed on all pages.
 * Navigates to the dedicated feedback page for better mobile UX.
 */
export function FeedbackWidget() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push('/dashboard/feedback')}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-5 py-3 text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
      aria-label="피드백 보내기"
    >
      <MessageSquare className="h-5 w-5" />
      <span className="font-semibold">피드백</span>
    </button>
  );
}
