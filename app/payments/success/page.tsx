'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';

function PaymentSuccessContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showConfetti, setShowConfetti] = useState(false);

  const subscriptionId = searchParams.get('subscriptionId');
  const plan = searchParams.get('plan');

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/auth/signin?callbackUrl=/dashboard');
      return;
    }

    // Trigger confetti animation
    setShowConfetti(true);
    const timer = setTimeout(() => setShowConfetti(false), 5000);

    return () => clearTimeout(timer);
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null; // Will redirect
  }

  const getPlanName = (planKey: string | null) => {
    if (!planKey) return '플랜';
    const plans: Record<string, string> = {
      PRO: 'Pro',
      TEAM: 'Team',
    };
    return plans[planKey] || planKey;
  };

  const getPlanFeatures = (planKey: string | null) => {
    if (planKey === 'PRO') {
      return [
        '무제한 매칭 생성',
        '상세 매칭 설명',
        '실시간 업데이트',
        '우선 기술 지원',
      ];
    } else if (planKey === 'TEAM') {
      return [
        'Pro 플랜의 모든 기능',
        '최대 5명 팀 멤버',
        '무제한 Warm Intro',
        '전담 고객 성공 매니저',
      ];
    }
    return [];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4 relative overflow-hidden">
      {/* Confetti Effect (CSS-based) */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-10px',
                width: '10px',
                height: '10px',
                backgroundColor: ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'][
                  Math.floor(Math.random() * 5)
                ],
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 2}s`,
                opacity: Math.random(),
                transform: `rotate(${Math.random() * 360}deg)`,
              }}
            />
          ))}
        </div>
      )}

      <div className="max-w-2xl mx-auto">
        {/* Success Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 text-center">
          {/* Success Icon */}
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full mb-6 animate-bounce-slow">
            <svg className="h-12 w-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          {/* Success Message */}
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            결제가 완료되었습니다! 🎉
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            {getPlanName(plan)} 플랜 구독이 성공적으로 활성화되었습니다.
          </p>

          {/* Plan Details */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-xl font-bold text-gray-900">
                {getPlanName(plan)} 플랜 활성화
              </h2>
            </div>

            <div className="space-y-3">
              {getPlanFeatures(plan).map((feature, idx) => (
                <div key={idx} className="flex items-center justify-center gap-2">
                  <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">{feature}</span>
                </div>
              ))}
            </div>

            {subscriptionId && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  구독 ID: <span className="font-mono text-gray-800">{subscriptionId}</span>
                </p>
              </div>
            )}
          </div>

          {/* What's Next */}
          <div className="bg-gray-50 rounded-2xl p-6 mb-8 text-left">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              다음 단계
            </h3>
            <ol className="space-y-3 text-gray-700">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 inline-flex items-center justify-center w-6 h-6 bg-blue-600 text-white text-sm font-bold rounded-full">
                  1
                </span>
                <span>대시보드로 이동하여 <strong>무제한 매칭</strong>을 생성하세요</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 inline-flex items-center justify-center w-6 h-6 bg-blue-600 text-white text-sm font-bold rounded-full">
                  2
                </span>
                <span>프로필을 최적화하여 더 정확한 매칭을 받으세요</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 inline-flex items-center justify-center w-6 h-6 bg-blue-600 text-white text-sm font-bold rounded-full">
                  3
                </span>
                <span>실시간 업데이트로 새로운 펀딩 기회를 놓치지 마세요</span>
              </li>
            </ol>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/dashboard"
              className="flex-1 inline-flex items-center justify-center px-8 py-4 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105 active:scale-95"
            >
              <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              대시보드로 이동
            </Link>
            <Link
              href="/dashboard/matches"
              className="flex-1 inline-flex items-center justify-center px-8 py-4 rounded-xl bg-white border-2 border-blue-600 text-blue-600 font-semibold hover:bg-blue-50 transition-all transform hover:scale-105 active:scale-95"
            >
              <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              매칭 생성하기
            </Link>
          </div>

          {/* Support Info */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              궁금한 점이 있으신가요?{' '}
              <Link href="/contact" className="text-blue-600 hover:text-blue-700 underline font-medium">
                고객 지원팀에 문의하기
              </Link>
            </p>
          </div>
        </div>

        {/* Thank You Note */}
        <div className="text-center mt-8">
          <p className="text-gray-600">
            Connect를 선택해주셔서 감사합니다! 🙏
          </p>
        </div>
      </div>

      {/* Add confetti animation styles */}
      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(-10px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }

        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .animate-confetti {
          animation: confetti-fall linear infinite;
        }

        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
