/**
 * Refund Policy Page (환불 정책)
 * Comprehensive refund policy compliant with Korean e-commerce law
 */

'use client';

import Link from 'next/link';
import { FileText } from 'lucide-react';
import PublicHeader from '@/components/layout/PublicHeader';

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <PublicHeader />

      {/* Content */}
      <div className="container mx-auto px-4 pt-24 pb-12 max-w-4xl">
        <div className="bg-white rounded-lg shadow-lg p-8 md:p-12">
          {/* Title */}
          <header className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-10 h-10 text-blue-600" />
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">환불 정책</h1>
                <p className="text-sm text-gray-500">최종 업데이트: 2025-11-22 (KST)</p>
              </div>
            </div>
          </header>

          <div className="space-y-8 text-gray-700 leading-relaxed">
            {/* Section 1: Legal Notice */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. 법적 고지</h2>
              <div className="bg-amber-50 border-l-4 border-amber-600 p-4 mb-4">
                <p className="font-semibold text-amber-900 mb-2">⚖️ 법정 권리 우선 적용</p>
                <p className="text-sm text-amber-800">
                  본 환불 정책은 Connect의 자체 정책이며, 전자상거래법 등 관련 법령에서 보장하는
                  소비자의 권리(청약철회권, 계약해제권 등)는 본 정책과 무관하게 항상 우선 적용됩니다.
                  법정 권리와 본 정책이 다를 경우, 소비자에게 유리한 조건이 적용됩니다.
                </p>
              </div>
            </section>

            {/* Section 2: Monthly Plans */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. 월간 플랜 환불 정책</h2>
              <div className="overflow-x-auto mb-4">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-4 py-3 text-left">기간</th>
                      <th className="border border-gray-300 px-4 py-3 text-left">환불 금액</th>
                      <th className="border border-gray-300 px-4 py-3 text-left">근거</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 px-4 py-3">구독 후 0-7일 이내</td>
                      <td className="border border-gray-300 px-4 py-3 font-semibold text-green-600">
                        전액 환불 (1회 한정)
                      </td>
                      <td className="border border-gray-300 px-4 py-3">자체 우대 정책</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border border-gray-300 px-4 py-3">7일 경과 후</td>
                      <td className="border border-gray-300 px-4 py-3">환불 불가</td>
                      <td className="border border-gray-300 px-4 py-3">표준 약관 (법정 권리 제외)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-gray-600 italic">
                ※ 법정 청약철회·계약해제 사유(서비스 장애, 설명과 다른 서비스 제공 등)는 기간 무관 전액 환불
              </p>
            </section>

            {/* Section 3: Annual Plans */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. 연간 플랜 환불 정책</h2>
              <div className="overflow-x-auto mb-4">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-4 py-3 text-left">기간</th>
                      <th className="border border-gray-300 px-4 py-3 text-left">환불 계산식</th>
                      <th className="border border-gray-300 px-4 py-3 text-left">예시 (Pro ₩490,000, 30일 사용)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 px-4 py-3">0-7일 이내</td>
                      <td className="border border-gray-300 px-4 py-3 font-semibold">전액 환불</td>
                      <td className="border border-gray-300 px-4 py-3">₩490,000 (법정 청약철회)</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border border-gray-300 px-4 py-3">8일 ~ 50% 기간</td>
                      <td className="border border-gray-300 px-4 py-3">
                        총액 − 사용분 − (잔여 × 10%)
                      </td>
                      <td className="border border-gray-300 px-4 py-3">₩404,753 (계산 예시 아래 참조)</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-3">50% 기간 이후</td>
                      <td className="border border-gray-300 px-4 py-3">계산 결과</td>
                      <td className="border border-gray-300 px-4 py-3">사용 기간에 따라 ₩0일 수 있음</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-4">
                <p className="font-semibold text-blue-900 mb-2">💡 계산 예시 (Pro ₩490,000, 30일 사용)</p>
                <div className="text-sm text-blue-800 space-y-1">
                  <p>• 사용금액 = ₩490,000 × 30일 / 365일 = ₩40,274</p>
                  <p>• 잔여금액 = ₩490,000 − ₩40,274 = ₩449,726</p>
                  <p>• 위약금 = ₩449,726 × 10% = ₩44,973</p>
                  <p className="font-semibold">• 환불액 = ₩490,000 − ₩40,274 − ₩44,973 = ₩404,753</p>
                </div>
              </div>

              <p className="text-sm text-gray-600">
                ※ 모든 금액은 1원 단위에서 반올림(ROUND HALF UP)합니다.
              </p>
            </section>

            {/* Section 4: Statutory Rights */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. 법정 권리는 항상 적용</h2>
              <div className="bg-green-50 border-l-4 border-green-600 p-4 mb-4">
                <p className="font-semibold text-green-900 mb-3">
                  다음의 경우 위 정책과 무관하게 전액 환불:
                </p>
                <ul className="list-disc list-inside space-y-2 text-green-800">
                  <li>서비스 장애·오류로 이용 불가</li>
                  <li>계약 내용과 다르게 서비스 제공</li>
                  <li>중복 결제·빌링 오류</li>
                  <li>기타 전자상거래법상 계약해제 사유</li>
                </ul>
              </div>
              <p className="text-sm text-gray-600 italic">
                이 경우 위약금(10%)은 적용되지 않습니다.
              </p>
            </section>

            {/* Section 5: Digital Content Exception */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. 디지털 콘텐츠 예외</h2>
              <p className="mb-4">
                Connect는 디지털 서비스로서, 다음 조건 충족 시 7일 청약철회권이 제한될 수 있습니다
                (전자상거래법 제17조 제2항):
              </p>
              <ol className="list-decimal list-inside space-y-2 mb-4 ml-4">
                <li>Free 플랜을 통한 사전 체험 기회 제공</li>
                <li>유료 플랜 구독 전 본 제한 사항 명시·고지</li>
                <li>구독 시 고객의 명시적 동의 획득</li>
              </ol>
              <p className="text-sm text-gray-600 italic">
                단, 위 조건을 충족하지 못한 경우 청약철회권은 제한되지 않습니다.
              </p>
            </section>

            {/* Section 6: Refund Process */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. 환불 절차</h2>
              <ol className="list-decimal list-inside space-y-3 mb-4 ml-4">
                <li>
                  <Link href="/dashboard/subscription" className="text-blue-600 hover:text-blue-800 hover:underline font-semibold">
                    환불 요청:
                  </Link>{' '}
                  support@connectplt.kr 로 이메일 발송
                </li>
                <li>
                  <strong>검토 및 승인:</strong> 요청일 기준 1영업일 내 처리 (내부 목표)
                </li>
                <li>
                  <strong>환불 처리:</strong> 승인 후 3영업일 내 토스페이먼츠를 통해 환불 절차 진행
                </li>
                <li>
                  <strong>환급 완료:</strong> 실제 입금은 카드사·은행 처리 시간에 따라 달라질 수 있음
                </li>
              </ol>
              <div className="bg-red-50 border-l-4 border-red-600 p-4">
                <p className="text-sm text-red-800">
                  ⚠️ 전자상거래법 제18조: 환불 지연 시 연 15% 지연배상금 발생
                </p>
              </div>
            </section>

            {/* Section 7: Contact & Dispute Resolution */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. 문의 및 분쟁 해결</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">환불 문의</h3>
                  <p className="text-sm text-gray-700">
                    📧 support@connectplt.kr
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">소비자 분쟁</h3>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• 한국소비자원 1372</li>
                    <li>• 공정거래위원회</li>
                    <li>• 전자거래분쟁조정위원회</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Section 8: 요약 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. 환불 정책 요약</h2>
              <div className="prose prose-sm text-gray-600">
                <h3 className="text-lg font-semibold text-gray-800">핵심 내용 정리</h3>

                <p><strong>월간 플랜:</strong></p>
                <ul>
                  <li>7일 이내: 전액 환불 (1회 한정 우대 정책)</li>
                  <li>7일 경과 후: 환불 불가 (법정 권리 제외)</li>
                </ul>

                <p><strong>연간 플랜:</strong></p>
                <ul>
                  <li>7일 이내: 전액 환불 (법정 청약철회권)</li>
                  <li>8일 ~ 50% 기간: 총액 − 사용분 − (잔여 × 10% 위약금)</li>
                  <li>50% 이후: 계산된 금액 (₩0일 수 있음)</li>
                </ul>

                <p><strong>법정 권리 항상 적용:</strong></p>
                <ul>
                  <li>서비스 장애 또는 오류</li>
                  <li>계약 내용과 다른 서비스 제공</li>
                  <li>중복 결제 또는 빌링 오류</li>
                  <li>기타 법적 해지 사유</li>
                </ul>

                <p className="text-sm italic">
                  이 경우 10% 위약금이 적용되지 않으며, 기간과 무관하게 전액 환불됩니다.
                </p>

                <p><strong>환불 처리 절차:</strong></p>
                <ol>
                  <li>
                    <Link href="/dashboard/subscription" className="text-blue-600 hover:text-blue-800 hover:underline font-semibold">
                      환불 요청:
                    </Link>{' '}
                    support@connectplt.kr 로 이메일 발송
                  </li>
                  <li>검토: 1영업일 (케이스에 따라 2일 이상 소요될 수 있음)</li>
                  <li>처리: 토스페이먼츠를 통해 3영업일 내</li>
                  <li>완료: 실제 입금 시간은 금융기관에 따라 상이</li>
                </ol>

                <p className="text-xs text-gray-500">
                  전자상거래법에 따라 3영업일 초과 환불 지연 시 연 15% 지연배상금이 발생합니다.
                </p>
              </div>
            </section>

            {/* Footer Note */}
            <div className="border-t pt-6 mt-8">
              <p className="text-sm text-gray-500">
                본 환불 정책은 전자상거래법 제17조(청약철회), 제18조(환불 처리),
                소비자분쟁해결기준(10% 위약금)을 기반으로 작성되었습니다.
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="mt-8 pt-6 border-t flex justify-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              홈으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
