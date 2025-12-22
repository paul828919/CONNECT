'use client';

/**
 * Linked Accounts Component
 *
 * Displays a list of OAuth providers and their linking status.
 * Allows users to:
 * - Link new OAuth providers (using signIn from next-auth/react)
 * - Unlink existing providers (if more than one is linked)
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Loader2, Link2, Unlink, AlertCircle, CheckCircle } from 'lucide-react';

interface ProviderInfo {
  id: string;
  provider: string;
  providerAccountId: string;
}

interface ProvidersState {
  naver: ProviderInfo | null;
  kakao: ProviderInfo | null;
}

interface AccountsData {
  success: boolean;
  accounts: ProviderInfo[];
  providers: ProvidersState;
  userEmail: string | null;
  totalAccounts: number;
}

// Provider display info
const PROVIDERS = {
  naver: {
    name: 'Naver',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z" />
      </svg>
    ),
    color: 'bg-[#03C75A]',
    textColor: 'text-[#03C75A]',
  },
  kakao: {
    name: 'Kakao',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 01-1.727-.11l-4.408 2.883c-.501.265-.678.236-.472-.413l.892-3.678c-2.88-1.46-4.785-3.99-4.785-6.866C1.5 6.665 6.201 3 12 3z" />
      </svg>
    ),
    color: 'bg-[#FEE500]',
    textColor: 'text-[#3C1E1E]',
  },
} as const;

export default function LinkedAccounts() {
  const router = useRouter();
  const [data, setData] = useState<AccountsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Fetch linked accounts
  const fetchAccounts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/settings/accounts');
      const result = await response.json();

      if (result.success) {
        setData(result);
      } else {
        setError(result.error || 'Failed to fetch accounts');
      }
    } catch (err) {
      setError('계정 정보를 불러올 수 없습니다');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Link a new provider using next-auth/react signIn
  const handleLink = async (provider: 'naver' | 'kakao') => {
    try {
      setActionLoading(provider);
      setMessage(null);

      // Step 1: Create linking request in database
      const response = await fetch('/api/settings/accounts/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });

      const result = await response.json();

      if (!result.success) {
        setMessage({ type: 'error', text: result.error || '연동 시작 실패' });
        setActionLoading(null);
        return;
      }

      console.log('[LinkedAccounts] Starting OAuth for linking:', provider);

      // Step 2: Initiate OAuth using next-auth/react signIn
      // The callbackUrl will bring the user back to accounts page with success message
      const callbackUrl = `${window.location.origin}/dashboard/accounts?linked=${provider}`;

      // This will redirect the user to the OAuth provider
      await signIn(provider, {
        callbackUrl,
        redirect: true,
      });

      // Note: The code below won't run because signIn redirects the page
    } catch (err) {
      console.error('[LinkedAccounts] Error:', err);
      setMessage({ type: 'error', text: '연동을 시작할 수 없습니다' });
      setActionLoading(null);
    }
  };

  // Unlink a provider
  const handleUnlink = async (provider: 'naver' | 'kakao') => {
    try {
      setActionLoading(provider);
      setMessage(null);

      const response = await fetch('/api/settings/accounts/unlink', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage({
          type: 'success',
          text: result.message || '연동이 해제되었습니다',
        });
        // Refresh the list
        await fetchAccounts();
      } else {
        setMessage({ type: 'error', text: result.error || '연동 해제 실패' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: '연동 해제를 할 수 없습니다' });
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
          <p className="mt-4 text-gray-600">계정 정보 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">소셜 계정 연동</h2>
        <p className="mt-1 text-sm text-gray-600">
          연동된 소셜 계정으로 Connect에 로그인할 수 있습니다
        </p>
      </div>

      {/* Message */}
      {message && (
        <Alert
          className={
            message.type === 'success'
              ? 'border-green-200 bg-green-50'
              : 'border-red-200 bg-red-50'
          }
        >
          {message.type === 'success' ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600" />
          )}
          <AlertDescription
            className={
              message.type === 'success' ? 'text-green-800' : 'text-red-800'
            }
          >
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      {/* Provider List */}
      <div className="space-y-4">
        {(Object.keys(PROVIDERS) as Array<'naver' | 'kakao'>).map((provider) => {
          const providerConfig = PROVIDERS[provider];
          const isLinked = data?.providers[provider] !== null;
          const canUnlink = (data?.totalAccounts || 0) > 1;

          return (
            <div
              key={provider}
              className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
            >
              <div className="flex items-center gap-4">
                {/* Provider Icon */}
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${providerConfig.color} ${
                    provider === 'kakao' ? 'text-[#3C1E1E]' : 'text-white'
                  }`}
                >
                  {providerConfig.icon}
                </div>

                {/* Provider Info */}
                <div>
                  <p className="font-medium text-gray-900">
                    {providerConfig.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {isLinked ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="h-3.5 w-3.5" />
                        연결됨
                      </span>
                    ) : (
                      '연결되지 않음'
                    )}
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <div>
                {isLinked ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!canUnlink || actionLoading === provider}
                        className={!canUnlink ? 'cursor-not-allowed opacity-50' : ''}
                      >
                        {actionLoading === provider ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Unlink className="mr-2 h-4 w-4" />
                        )}
                        연동 해제
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>연동 해제 확인</AlertDialogTitle>
                        <AlertDialogDescription>
                          정말로 {providerConfig.name} 계정 연동을 해제하시겠습니까?
                          <br />
                          해제 후에는 {providerConfig.name}로 로그인할 수 없습니다.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleUnlink(provider)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          연동 해제
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleLink(provider)}
                    disabled={actionLoading === provider}
                  >
                    {actionLoading === provider ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Link2 className="mr-2 h-4 w-4" />
                    )}
                    연동하기
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Warning for last account */}
      {data?.totalAccounts === 1 && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            최소 1개의 로그인 방법이 필요합니다. 연동 해제를 원하시면 먼저 다른
            소셜 계정을 연동해 주세요.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
