'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Legacy payments success page - redirects to dashboard
 *
 * The payment success flow now uses /billing/success with inline success UI.
 * This page exists as a fallback for:
 * - Bookmarked URLs
 * - Direct navigation attempts
 * - Legacy links
 */
export default function PaymentSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard immediately
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="text-center">
        <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
        <p className="text-gray-600">대시보드로 이동 중...</p>
      </div>
    </div>
  );
}
