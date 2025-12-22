'use client';

/**
 * Account Management Page
 *
 * Allows users to:
 * - View linked OAuth accounts (Kakao, Naver)
 * - Link additional OAuth providers
 * - Unlink OAuth providers (if more than one is linked)
 */

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import LinkedAccounts from '@/components/LinkedAccounts';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Info } from 'lucide-react';

export default function AccountManagementPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const linkedProvider = searchParams.get('linked');

  // Show success message if account was just linked
  useEffect(() => {
    if (linkedProvider) {
      // Clear the URL parameter after showing the message
      const timer = setTimeout(() => {
        router.replace('/dashboard/accounts', { scroll: false });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [linkedProvider, router]);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">계정 관리</h1>
          <p className="mt-2 text-gray-600">
            소셜 계정을 연동하여 여러 방법으로 로그인할 수 있습니다
          </p>
        </div>

        {/* Success message for newly linked account */}
        {linkedProvider && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {linkedProvider === 'kakao' ? 'Kakao' : 'Naver'} 계정이 성공적으로
              연동되었습니다!
            </AlertDescription>
          </Alert>
        )}

        {/* Linked Accounts Section */}
        <div className="rounded-2xl bg-white p-8 shadow-sm">
          <LinkedAccounts />
        </div>

        {/* Info Card */}
        <div className="mt-6 rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div>
              <p className="font-medium">소셜 계정 연동이란?</p>
              <ul className="mt-2 ml-4 list-disc space-y-1">
                <li>
                  여러 소셜 계정(Naver, Kakao)을 연동하면 어떤 방법으로든
                  로그인하여 동일한 계정에 접근할 수 있습니다
                </li>
                <li>
                  예: Naver로 가입 후 Kakao를 연동하면, 이후 Kakao로도 로그인
                  가능합니다
                </li>
                <li>
                  최소 1개의 로그인 방법이 필요하므로, 마지막 남은 계정은 연동
                  해제할 수 없습니다
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
