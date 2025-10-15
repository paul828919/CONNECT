'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams?.get('error');

  const getErrorMessage = (errorCode: string | null) => {
    switch (errorCode) {
      case 'Configuration':
        return {
          title: '설정 오류',
          message: '서버 설정에 문제가 있습니다. 잠시 후 다시 시도해주세요.',
          action: '잠시 후 다시 시도',
        };
      case 'AccessDenied':
        return {
          title: '접근 거부',
          message: '로그인 권한이 거부되었습니다. 관리자에게 문의하세요.',
          action: '다시 시도',
        };
      case 'Verification':
        return {
          title: '인증 실패',
          message: '이메일 인증에 실패했습니다. 링크가 만료되었거나 잘못되었습니다.',
          action: '새 인증 링크 요청',
        };
      case 'OAuthSignin':
        return {
          title: 'OAuth 로그인 오류',
          message: 'OAuth 서비스에 연결할 수 없습니다. Kakao 또는 Naver 서비스 상태를 확인해주세요.',
          action: '다른 방법으로 로그인',
        };
      case 'OAuthCallback':
        return {
          title: 'OAuth 콜백 오류',
          message: 'OAuth 인증 과정에서 문제가 발생했습니다. 다시 시도해주세요.',
          action: '다시 로그인',
        };
      case 'OAuthCreateAccount':
        return {
          title: '계정 생성 오류',
          message: 'OAuth 계정 생성에 실패했습니다. 이미 사용 중인 이메일일 수 있습니다.',
          action: '다른 계정으로 시도',
        };
      case 'EmailCreateAccount':
        return {
          title: '이메일 계정 생성 오류',
          message: '이메일로 계정을 생성할 수 없습니다.',
          action: '다시 시도',
        };
      case 'Callback':
        return {
          title: '콜백 오류',
          message: '인증 콜백 처리 중 오류가 발생했습니다.',
          action: '다시 시도',
        };
      case 'OAuthAccountNotLinked':
        return {
          title: '계정 연결 오류',
          message: '이미 다른 로그인 방법으로 등록된 이메일입니다. 기존 방법으로 로그인해주세요.',
          action: '다른 방법으로 로그인',
        };
      case 'SessionRequired':
        return {
          title: '로그인 필요',
          message: '이 페이지에 접근하려면 로그인이 필요합니다.',
          action: '로그인하기',
        };
      default:
        return {
          title: '로그인 오류',
          message: '알 수 없는 오류가 발생했습니다. 다시 시도해주세요.',
          action: '다시 시도',
        };
    }
  };

  const errorInfo = getErrorMessage(error);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        {/* Error Icon */}
        <div className="mb-6 mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
          <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        {/* Error Message */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {errorInfo.title}
          </h1>
          <p className="text-gray-600">
            {errorInfo.message}
          </p>
        </div>

        {/* Error Code */}
        {error && (
          <div className="mb-6 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 text-center">
              오류 코드: <span className="font-mono font-semibold text-gray-700">{error}</span>
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <Link
            href="/auth/signin"
            className="block w-full py-3 px-6 bg-blue-600 text-white text-center font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            {errorInfo.action}
          </Link>
          <Link
            href="/"
            className="block w-full py-3 px-6 bg-gray-100 text-gray-700 text-center font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            홈으로 돌아가기
          </Link>
        </div>

        {/* Help Link */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-500">
            문제가 계속되면{' '}
            <a href="mailto:support@connectplt.kr" className="text-blue-600 hover:underline">
              고객 지원팀
            </a>
            에 문의하세요
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ErrorPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    }>
      <ErrorContent />
    </Suspense>
  );
}
