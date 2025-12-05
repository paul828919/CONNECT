'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

interface OrganizationInfo {
  name: string;
  type: string;
  currentMembers: number;
  maxMembers: number;
  remainingSlots: number;
}

interface InviteValidation {
  valid: boolean;
  error?: string;
  message?: string;
  organization?: OrganizationInfo;
  expiresAt?: string;
  remainingUses?: number;
}

export default function JoinPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const code = params.code as string;

  const [validation, setValidation] = useState<InviteValidation | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const validateCode = useCallback(async () => {
    try {
      const res = await fetch(`/api/team/join?code=${code}`);
      const data = await res.json();
      setValidation(data);
    } catch (err) {
      setValidation({
        valid: false,
        error: 'network_error',
        message: '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      });
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    if (code) {
      validateCode();
    }
  }, [code, validateCode]);

  const handleJoin = async () => {
    setJoining(true);
    setError(null);

    try {
      const res = await fetch('/api/team/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push(data.redirectUrl || '/dashboard');
        }, 2000);
      } else {
        setError(data.message || '팀 참여에 실패했습니다.');
      }
    } catch (err) {
      setError('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setJoining(false);
    }
  };

  const handleSignIn = (provider: 'kakao' | 'naver') => {
    signIn(provider, {
      callbackUrl: `/join/${code}`,
    });
  };

  // Loading state
  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12">
            <div className="flex flex-col items-center">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mb-4"></div>
              <p className="text-gray-600">초대 링크 확인 중...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invalid or expired link
  if (!validation?.valid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <CardTitle className="text-xl text-red-600">초대 링크 오류</CardTitle>
            <CardDescription className="text-base mt-2">
              {validation?.message || '이 초대 링크는 유효하지 않습니다.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                {validation?.error === 'link_expired' && '초대 링크가 만료되었습니다. 팀 관리자에게 새 링크를 요청해주세요.'}
                {validation?.error === 'link_deactivated' && '이 초대 링크는 비활성화되었습니다. 팀 관리자에게 문의해주세요.'}
                {validation?.error === 'link_exhausted' && '초대 링크의 사용 횟수가 모두 소진되었습니다.'}
                {validation?.error === 'team_full' && '팀이 이미 최대 인원에 도달했습니다.'}
                {validation?.error === 'invalid_code' && '유효하지 않은 초대 코드입니다. 링크를 다시 확인해주세요.'}
                {!validation?.error && '문제가 계속되면 팀 관리자에게 문의해주세요.'}
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Link href="/">
              <Button variant="outline">
                홈으로 돌아가기
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <CardTitle className="text-xl text-green-600">팀 참여 완료!</CardTitle>
            <CardDescription className="text-base mt-2">
              {validation.organization?.name} 팀에 성공적으로 참여했습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">
              잠시 후 대시보드로 이동합니다...
            </p>
            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 animate-pulse" style={{ width: '100%' }}></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User already has an organization
  if (session && (session.user as any)?.organizationId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-yellow-100 flex items-center justify-center">
              <svg className="h-8 w-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <CardTitle className="text-xl">이미 조직에 소속되어 있습니다</CardTitle>
            <CardDescription className="text-base mt-2">
              다른 팀에 참여하려면 현재 조직에서 먼저 나가야 합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-gray-600">
              현재 소속된 조직의 설정에서 탈퇴 후 다시 시도해주세요.
            </p>
          </CardContent>
          <CardFooter className="flex justify-center gap-3">
            <Link href="/dashboard">
              <Button>
                대시보드로 이동
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Main join page - user not logged in or logged in without organization
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {/* Logo */}
          <Link href="/" className="flex items-center justify-center gap-2 mb-4">
            <Image
              src="/logo.svg"
              alt="Connect Logo"
              width={32}
              height={32}
              className="w-8 h-8"
            />
            <span className="text-2xl font-bold text-blue-600">Connect</span>
          </Link>

          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
            <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>

          <CardTitle className="text-xl">팀 참여 초대</CardTitle>
          <CardDescription className="text-base mt-2">
            <span className="font-semibold text-blue-600">{validation.organization?.name}</span> 팀에서
            <br />
            초대를 보냈습니다.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Organization Info */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">조직 유형</span>
              <span className="font-medium">
                {validation.organization?.type === 'COMPANY' && '기업'}
                {validation.organization?.type === 'RESEARCH_INSTITUTE' && '연구기관'}
                {validation.organization?.type === 'UNIVERSITY' && '대학'}
                {validation.organization?.type === 'GOVERNMENT' && '정부기관'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">현재 팀원</span>
              <span className="font-medium">
                {validation.organization?.currentMembers} / {validation.organization?.maxMembers}명
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">남은 자리</span>
              <span className="font-medium text-green-600">
                {validation.organization?.remainingSlots}명
              </span>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Action buttons */}
          {session ? (
            // Logged in - show join button
            <Button
              onClick={handleJoin}
              disabled={joining}
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              {joining ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  참여 중...
                </>
              ) : (
                <>
                  <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  팀에 참여하기
                </>
              )}
            </Button>
          ) : (
            // Not logged in - show sign in options
            <div className="space-y-3">
              <p className="text-sm text-center text-gray-600 mb-4">
                팀에 참여하려면 먼저 로그인해주세요
              </p>
              <Button
                onClick={() => handleSignIn('kakao')}
                className="w-full bg-[#FEE500] hover:bg-[#FDD800] text-[#191919]"
                size="lg"
              >
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 3c-5.52 0-10 3.59-10 8 0 2.92 1.93 5.48 4.82 6.9-.16.56-.61 2.06-.7 2.38-.1.38.14.37.3.27.12-.08 1.94-1.32 2.72-1.86.88.13 1.8.2 2.75.2 5.52 0 10-3.59 10-8s-4.48-8-10-8z" />
                </svg>
                카카오로 로그인
              </Button>
              <Button
                onClick={() => handleSignIn('naver')}
                className="w-full bg-[#03C75A] hover:bg-[#02B350] text-white"
                size="lg"
              >
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z" />
                </svg>
                네이버로 로그인
              </Button>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-center">
          <p className="text-xs text-gray-500 text-center">
            참여 시 Connect의{' '}
            <Link href="/terms" className="text-blue-600 hover:underline">이용약관</Link>
            {' '}및{' '}
            <Link href="/privacy" className="text-blue-600 hover:underline">개인정보처리방침</Link>
            에 동의하게 됩니다.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
