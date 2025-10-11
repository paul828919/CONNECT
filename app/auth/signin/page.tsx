'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';

function SignInContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const error = searchParams.get('error');
  const [isLoading, setIsLoading] = useState(false);

  const handleKakaoSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn('kakao', { callbackUrl });
    } catch (err) {
      console.error('Sign in error:', err);
      setIsLoading(false);
    }
  };

  const handleNaverSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn('naver', { callbackUrl });
    } catch (err) {
      console.error('Sign in error:', err);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo and Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900">Connect</h1>
          <p className="mt-2 text-lg text-gray-600">
            한국 R&D 생태계 매칭 플랫폼
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Korea's Innovation Ecosystem Matching Platform
          </p>
        </div>

        {/* Sign In Card */}
        <div className="rounded-2xl bg-white p-8 shadow-xl ring-1 ring-gray-900/5">
          <div className="space-y-6">
            <div className="space-y-2 text-center">
              <h2 className="text-2xl font-semibold text-gray-900">
                시작하기
              </h2>
              <p className="text-sm text-gray-600" suppressHydrationWarning>
                카카오 또는 네이버 계정으로 빠르게 시작하세요
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">
                {error === 'OAuthSignin' && '로그인 중 오류가 발생했습니다.'}
                {error === 'OAuthCallback' && '인증 처리 중 오류가 발생했습니다.'}
                {error === 'OAuthCreateAccount' && '계정 생성 중 오류가 발생했습니다.'}
                {error === 'EmailCreateAccount' && '이메일 계정을 생성할 수 없습니다.'}
                {error === 'Callback' && '콜백 처리 중 오류가 발생했습니다.'}
                {error === 'Default' && '로그인에 실패했습니다. 다시 시도해주세요.'}
              </div>
            )}

            {/* Kakao Sign In Button */}
            <button
              onClick={handleKakaoSignIn}
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#FEE500] px-4 py-3.5 font-medium text-[#000000] transition-all hover:bg-[#FDD835] focus:outline-none focus:ring-4 focus:ring-[#FEE500]/50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <svg
                    className="h-5 w-5 animate-spin text-gray-800"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>로그인 중...</span>
                </>
              ) : (
                <>
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M12 3C6.477 3 2 6.523 2 10.833c0 2.445 1.455 4.62 3.698 6.042l-.864 3.125 3.125-.864C9.382 19.477 10.627 19.833 12 19.833c5.523 0 10-3.523 10-7.833S17.523 3 12 3z" />
                  </svg>
                  <span>카카오로 시작하기</span>
                </>
              )}
            </button>

            {/* Naver Sign In Button */}
            <button
              onClick={handleNaverSignIn}
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#03C75A] px-4 py-3.5 font-medium text-white transition-all hover:bg-[#02B350] focus:outline-none focus:ring-4 focus:ring-[#03C75A]/50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <svg
                    className="h-5 w-5 animate-spin text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>로그인 중...</span>
                </>
              ) : (
                <>
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M13.5 3H10.5v8.5L6 3H3v18h3v-8.5L10.5 21h3V3z" />
                  </svg>
                  <span>네이버로 시작하기</span>
                </>
              )}
            </button>
          </div>

          {/* Terms */}
          <div className="mt-6 text-center text-xs text-gray-500">
            로그인하면{' '}
            <a href="/terms" className="underline hover:text-gray-700">
              이용약관
            </a>{' '}
            및{' '}
            <a href="/privacy" className="underline hover:text-gray-700">
              개인정보처리방침
            </a>
            에 동의하는 것으로 간주됩니다.
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <div className="text-2xl font-bold text-blue-600">55%</div>
            <div className="text-xs text-gray-600">R&D 예산 커버리지</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-purple-600">4개</div>
            <div className="text-xs text-gray-600">주요 기관 실시간 수집</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-green-600">AI</div>
            <div className="text-xs text-gray-600">설명 가능한 매칭</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    }>
      <SignInContent />
    </Suspense>
  );
}