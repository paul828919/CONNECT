'use client';

import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export interface UpgradePromptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: string;
  description: string;
  benefits: string[];
  ctaText?: string;
  cancelText?: string;
}

/**
 * Reusable upgrade prompt modal for gated features
 *
 * Usage:
 * <UpgradePromptModal
 *   open={showUpgradeModal}
 *   onOpenChange={setShowUpgradeModal}
 *   feature="파트너 연결 요청"
 *   description="Pro 플랜으로 업그레이드하여 파트너에게 직접 협력 요청을 보내세요."
 *   benefits={['무제한 연결 요청', '우선 응답 처리', '실시간 알림']}
 * />
 */
export function UpgradePromptModal({
  open,
  onOpenChange,
  feature,
  description,
  benefits,
  ctaText = 'Pro 플랜 시작하기',
  cancelText = '나중에',
}: UpgradePromptModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader className="text-center">
          {/* Lock/Upgrade Icon */}
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-blue-100">
            <svg
              className="h-8 w-8 text-purple-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <DialogTitle className="text-xl font-bold text-gray-900">
            {feature}
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            {description}
          </DialogDescription>
        </DialogHeader>

        {/* Benefits List */}
        <div className="my-4 rounded-xl bg-gradient-to-br from-purple-50 to-blue-50 p-4">
          <h4 className="mb-3 text-sm font-semibold text-gray-900">
            Pro 플랜 혜택
          </h4>
          <ul className="space-y-2">
            {benefits.map((benefit, index) => (
              <li key={index} className="flex items-center gap-2 text-sm text-gray-700">
                <svg
                  className="h-4 w-4 flex-shrink-0 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                {benefit}
              </li>
            ))}
          </ul>
        </div>

        <DialogFooter className="flex flex-col gap-3 sm:flex-col">
          <Link
            href="/pricing"
            className="inline-flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-3 font-semibold text-white shadow-lg transition-all hover:from-purple-700 hover:to-blue-700 hover:shadow-xl"
          >
            {ctaText}
            <svg
              className="ml-2 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </Link>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-full rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            {cancelText}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Inline upgrade banner for pages (non-modal)
 * Use this when you want to show an upgrade CTA inline on the page
 */
export function UpgradePromptBanner({
  feature,
  description,
  className = '',
}: {
  feature: string;
  description: string;
  className?: string;
}) {
  return (
    <div className={`rounded-xl bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 border border-purple-200 p-4 ${className}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 p-2">
            <svg
              className="h-5 w-5 text-purple-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-purple-900">{feature}</h3>
            <p className="text-sm text-purple-700">{description}</p>
          </div>
        </div>
        <Link
          href="/pricing"
          className="inline-flex items-center justify-center whitespace-nowrap rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow transition-all hover:from-purple-700 hover:to-blue-700 hover:shadow-md"
        >
          Pro 업그레이드
          <svg
            className="ml-1.5 h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 7l5 5m0 0l-5 5m5-5H6"
            />
          </svg>
        </Link>
      </div>
    </div>
  );
}
