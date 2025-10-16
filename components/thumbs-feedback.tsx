'use client';

/**
 * Thumbs Feedback Component
 * Simple thumbs up/down feedback for AI-generated content
 *
 * Week 6: AI Feature Polish
 *
 * Features:
 * - Thumbs up/down buttons
 * - Optimistic UI updates
 * - Success confirmation
 * - Error handling with retry
 * - Prevents duplicate submissions
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ThumbsFeedbackProps {
  serviceType: 'MATCH_EXPLANATION' | 'QA_CHAT';
  resourceId: string;
  size?: 'sm' | 'md';
  className?: string;
  onFeedbackSubmitted?: (rating: 'HELPFUL' | 'NOT_HELPFUL') => void;
}

export function ThumbsFeedback({
  serviceType,
  resourceId,
  size = 'sm',
  className,
  onFeedbackSubmitted,
}: ThumbsFeedbackProps) {
  const [rating, setRating] = useState<'HELPFUL' | 'NOT_HELPFUL' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const submitFeedback = async (newRating: 'HELPFUL' | 'NOT_HELPFUL') => {
    // Prevent duplicate submissions
    if (loading || submitted) {
      return;
    }

    setLoading(true);
    setError(null);
    setRating(newRating); // Optimistic update

    try {
      const response = await fetch('/api/ai-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serviceType,
          resourceId,
          rating: newRating,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '피드백 전송에 실패했습니다.');
      }

      // Success
      setSubmitted(true);
      onFeedbackSubmitted?.(newRating);
    } catch (err: any) {
      setError(err.message || '알 수 없는 오류가 발생했습니다.');
      setRating(null); // Revert optimistic update
      console.error('Feedback submission error:', err);
    } finally {
      setLoading(false);
    }
  };

  // If successfully submitted, show confirmation
  if (submitted && rating) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 text-muted-foreground',
          size === 'sm' ? 'text-xs' : 'text-sm',
          className
        )}
      >
        <Check className={cn('text-green-600', size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />
        <span>피드백 감사합니다!</span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Helpful button */}
      <Button
        variant={rating === 'HELPFUL' ? 'default' : 'ghost'}
        size={size === 'sm' ? 'sm' : 'default'}
        onClick={() => submitFeedback('HELPFUL')}
        disabled={loading || submitted}
        className={cn(
          'gap-1.5',
          size === 'sm' ? 'h-7 px-2' : 'h-9 px-3',
          rating === 'HELPFUL' && 'bg-green-600 hover:bg-green-700'
        )}
        title="도움이 됐어요"
      >
        {loading && rating === 'HELPFUL' ? (
          <Loader2 className={cn('animate-spin', size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />
        ) : (
          <ThumbsUp className={cn(size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />
        )}
        {size === 'md' && <span>도움됨</span>}
      </Button>

      {/* Not helpful button */}
      <Button
        variant={rating === 'NOT_HELPFUL' ? 'default' : 'ghost'}
        size={size === 'sm' ? 'sm' : 'default'}
        onClick={() => submitFeedback('NOT_HELPFUL')}
        disabled={loading || submitted}
        className={cn(
          'gap-1.5',
          size === 'sm' ? 'h-7 px-2' : 'h-9 px-3',
          rating === 'NOT_HELPFUL' && 'bg-red-600 hover:bg-red-700'
        )}
        title="도움이 안 됐어요"
      >
        {loading && rating === 'NOT_HELPFUL' ? (
          <Loader2 className={cn('animate-spin', size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />
        ) : (
          <ThumbsDown className={cn(size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />
        )}
        {size === 'md' && <span>아니요</span>}
      </Button>

      {/* Error message */}
      {error && (
        <span className={cn('text-red-600', size === 'sm' ? 'text-xs' : 'text-sm')}>
          {error}
        </span>
      )}
    </div>
  );
}

export default ThumbsFeedback;
