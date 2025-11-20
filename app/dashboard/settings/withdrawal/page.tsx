'use client';

/**
 * Account Withdrawal Page (PIPA Article 21 - Right to Delete)
 *
 * 5-Step Withdrawal Flow:
 * 1. Warning: Show consequences of account deletion
 * 2. Data Export: Offer CSV download before deletion
 * 3. Request Code: Send 6-digit verification code to email
 * 4. Verify Code: User enters code from email
 * 5. Final Confirmation: Checkbox + delete button
 *
 * Security:
 * - Requires email verification (15-minute code)
 * - Irreversible operation (no undo)
 * - Clear warnings throughout the flow
 * - Rate limiting on code requests (1 per 5 minutes)
 *
 * UX:
 * - Progressive disclosure (step-by-step)
 * - Clear visual hierarchy (red warnings)
 * - Accessible form controls
 * - Loading states and error handling
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  AlertCircle,
  AlertTriangle,
  Shield,
  Loader2,
  CheckCircle,
  Mail,
  Trash2,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import DataExportButton from '@/components/settings/DataExportButton';

type WithdrawalStep = 1 | 2 | 3 | 4 | 5;

export default function WithdrawalPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<WithdrawalStep>(1);

  // Step 3: Request deletion code
  const [isRequestingCode, setIsRequestingCode] = useState(false);
  const [codeRequested, setCodeRequested] = useState(false);
  const [codeExpiresAt, setCodeExpiresAt] = useState<string | null>(null);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);

  // Step 4: Verify code
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // Step 5: Final confirmation
  const [finalConfirmation, setFinalConfirmation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletionError, setDeletionError] = useState<string | null>(null);

  /**
   * Step 3: Request deletion verification code
   */
  const handleRequestCode = async () => {
    try {
      setIsRequestingCode(true);
      setRateLimitError(null);

      const response = await fetch('/api/users/request-deletion-code', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 429) {
          const errorData = await response.json();
          setRateLimitError(
            `${errorData.error} (${Math.ceil(errorData.waitSeconds / 60)}분 후 재시도 가능)`
          );
          throw new Error(errorData.error);
        }

        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '인증 코드 발송 실패');
      }

      const data = await response.json();
      setCodeRequested(true);
      setCodeExpiresAt(data.expiresAt);
      console.log('[WITHDRAWAL] Verification code sent to:', data.email);

      // Move to step 4 after short delay
      setTimeout(() => setCurrentStep(4), 1500);
    } catch (err) {
      console.error('[WITHDRAWAL] Code request error:', err);
      // Error already set in rateLimitError state
    } finally {
      setIsRequestingCode(false);
    }
  };

  /**
   * Step 4: Verify deletion code and move to final confirmation
   */
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!verificationCode || verificationCode.length !== 6) {
      setVerificationError('6자리 인증 코드를 입력해 주세요.');
      return;
    }

    try {
      setIsVerifying(true);
      setVerificationError(null);

      // NOTE: We don't actually validate the code here (API doesn't have separate validation endpoint)
      // Instead, we'll validate it during final deletion in Step 5
      // This step just checks format and moves to confirmation
      console.log('[WITHDRAWAL] Code entered:', verificationCode);

      // Move to step 5 (final confirmation)
      setCurrentStep(5);
    } catch (err) {
      console.error('[WITHDRAWAL] Verification error:', err);
      setVerificationError(err instanceof Error ? err.message : '코드 검증 실패');
    } finally {
      setIsVerifying(false);
    }
  };

  /**
   * Step 5: Final account deletion
   */
  const handleFinalDeletion = async () => {
    if (!finalConfirmation) {
      setDeletionError('위 내용을 확인하고 체크박스를 선택해 주세요.');
      return;
    }

    if (!verificationCode) {
      setDeletionError('인증 코드가 없습니다. 처음부터 다시 시작해 주세요.');
      return;
    }

    try {
      setIsDeleting(true);
      setDeletionError(null);

      const response = await fetch('/api/users/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          verificationCode,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '계정 삭제 실패');
      }

      const data = await response.json();
      console.log('[WITHDRAWAL] Account deleted successfully:', data);

      // Show success message for 2 seconds, then sign out
      setTimeout(() => {
        signOut({ callbackUrl: '/auth/signin?deleted=true' });
      }, 2000);

      // Note: currentStep will show "completed" state while waiting
    } catch (err) {
      console.error('[WITHDRAWAL] Deletion error:', err);
      setDeletionError(err instanceof Error ? err.message : '계정 삭제 중 오류 발생');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          뒤로 가기
        </Button>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">회원 탈퇴</h1>
        <p className="text-gray-600">
          Connect 서비스를 이용해 주셔서 감사합니다. 탈퇴 전 아래 내용을 꼭 확인해 주세요.
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="mb-8 flex items-center justify-center space-x-2">
        {[1, 2, 3, 4, 5].map((step) => (
          <div
            key={step}
            className={`h-2 w-12 rounded-full transition-colors ${
              step <= currentStep ? 'bg-red-500' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

      {/* Step 1: Warning */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2 text-amber-600">
              <AlertTriangle className="h-6 w-6" />
              <CardTitle>⚠️ 계정 삭제 경고</CardTitle>
            </div>
            <CardDescription>
              계정을 삭제하면 모든 데이터가 영구적으로 삭제되며 복구할 수 없습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Warning Boxes */}
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>삭제되는 데이터:</strong>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>• 개인정보 (이름, 이메일, OAuth 연동)</li>
                  <li>• 조직 정보 및 프로필</li>
                  <li>• AI 매칭 결과 및 저장한 과제</li>
                  <li>• 컨소시엄 참여 기록</li>
                  <li>• 협업 요청 및 메시지</li>
                  <li>• 구독 및 결제 정보 (자동 결제 취소)</li>
                </ul>
              </AlertDescription>
            </Alert>

            <Alert className="border-amber-200 bg-amber-50">
              <Shield className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <strong>재가입 제한:</strong> 동일한 이메일 주소로 재가입이 불가능합니다.
                다른 이메일 주소로만 신규 가입할 수 있습니다.
              </AlertDescription>
            </Alert>

            <Alert className="border-blue-200 bg-blue-50">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>PIPA 준수:</strong> 개인정보 보호법 제31조에 따라 감사 로그는 익명화된
                형태로 3년간 보관됩니다. (계정 식별 정보는 포함되지 않음)
              </AlertDescription>
            </Alert>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                onClick={() => router.back()}
                variant="outline"
                className="flex-1"
              >
                취소하고 돌아가기
              </Button>
              <Button
                onClick={() => setCurrentStep(2)}
                variant="destructive"
                className="flex-1"
              >
                계속 진행
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Data Export Offer */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2 text-blue-600">
              <CheckCircle className="h-6 w-6" />
              <CardTitle>📦 데이터 내보내기 (선택사항)</CardTitle>
            </div>
            <CardDescription>
              탈퇴 전에 내 데이터를 다운로드하실 수 있습니다. (개인정보 보호법 제35조)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-700">
              Connect에 저장된 모든 개인 데이터를 CSV 파일로 다운로드할 수 있습니다. 탈퇴 후에는
              데이터를 다운로드할 수 없습니다.
            </p>

            {/* Data Export Button */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <DataExportButton />
            </div>

            <Alert className="border-gray-200">
              <AlertCircle className="h-4 w-4 text-gray-600" />
              <AlertDescription>
                <strong>포함되는 데이터:</strong> 계정 정보, 조직 프로필, 매칭 결과, 컨소시엄
                참여 기록, 협업 요청, AI 피드백 등
              </AlertDescription>
            </Alert>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                onClick={() => setCurrentStep(1)}
                variant="outline"
                className="flex-1"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                이전 단계
              </Button>
              <Button
                onClick={() => setCurrentStep(3)}
                variant="destructive"
                className="flex-1"
              >
                다음: 인증 코드 받기
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Request Deletion Code */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2 text-purple-600">
              <Mail className="h-6 w-6" />
              <CardTitle>📧 이메일 인증</CardTitle>
            </div>
            <CardDescription>
              본인 확인을 위해 이메일로 인증 코드를 발송합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!codeRequested && (
              <>
                <Alert className="border-purple-200 bg-purple-50">
                  <Shield className="h-4 w-4 text-purple-600" />
                  <AlertDescription className="text-purple-800">
                    <strong>보안 조치:</strong> 계정 삭제는 되돌릴 수 없는 작업입니다. 본인 확인을
                    위해 이메일로 발송되는 6자리 인증 코드가 필요합니다. 코드는 15분간 유효합니다.
                  </AlertDescription>
                </Alert>

                {rateLimitError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{rateLimitError}</AlertDescription>
                  </Alert>
                )}

                <Button
                  onClick={handleRequestCode}
                  disabled={isRequestingCode || !!rateLimitError}
                  variant="default"
                  size="lg"
                  className="w-full"
                >
                  {isRequestingCode ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      코드 발송 중...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      인증 코드 받기
                    </>
                  )}
                </Button>
              </>
            )}

            {codeRequested && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>코드 발송 완료!</strong> 이메일을 확인해 주세요.
                  <br />
                  <span className="text-sm text-green-600">
                    유효 시간: 15분 (만료 시각:{' '}
                    {codeExpiresAt ? new Date(codeExpiresAt).toLocaleTimeString('ko-KR') : 'N/A'})
                  </span>
                </AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                onClick={() => setCurrentStep(2)}
                variant="outline"
                className="flex-1"
                disabled={isRequestingCode}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                이전 단계
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Enter Verification Code */}
      {currentStep === 4 && (
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2 text-purple-600">
              <Shield className="h-6 w-6" />
              <CardTitle>🔐 인증 코드 입력</CardTitle>
            </div>
            <CardDescription>
              이메일로 받은 6자리 인증 코드를 입력해 주세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                  인증 코드 (6자리 숫자)
                </label>
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => {
                    setVerificationCode(e.target.value.replace(/\D/g, ''));
                    setVerificationError(null);
                  }}
                  placeholder="123456"
                  className="text-center text-2xl font-mono tracking-widest"
                  disabled={isVerifying}
                  required
                />
                <p className="mt-2 text-sm text-gray-500">
                  이메일을 확인하고 6자리 숫자를 입력하세요.
                </p>
              </div>

              {verificationError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{verificationError}</AlertDescription>
                </Alert>
              )}

              <Alert className="border-amber-200 bg-amber-50">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  코드를 받지 못하셨나요? 이메일 스팸함을 확인하거나 이전 단계로 돌아가 다시
                  요청해 주세요. (5분마다 1회 요청 가능)
                </AlertDescription>
              </Alert>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  type="button"
                  onClick={() => {
                    setCurrentStep(3);
                    setVerificationCode('');
                    setVerificationError(null);
                  }}
                  variant="outline"
                  className="flex-1"
                  disabled={isVerifying}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  코드 재발송
                </Button>
                <Button
                  type="submit"
                  variant="default"
                  className="flex-1"
                  disabled={isVerifying || verificationCode.length !== 6}
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      확인 중...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      코드 확인
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Final Confirmation */}
      {currentStep === 5 && (
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2 text-red-600">
              <Trash2 className="h-6 w-6" />
              <CardTitle>🚨 최종 확인</CardTitle>
            </div>
            <CardDescription>
              정말로 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>⚠️ 마지막 경고:</strong>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>• 모든 개인정보와 서비스 데이터가 즉시 삭제됩니다</li>
                  <li>• 삭제된 데이터는 복구할 수 없습니다</li>
                  <li>• 구독 중인 서비스가 자동으로 취소됩니다</li>
                  <li>• 동일한 이메일로 재가입할 수 없습니다</li>
                </ul>
              </AlertDescription>
            </Alert>

            {/* Final Confirmation Checkbox */}
            <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
              <Checkbox
                id="final-confirmation"
                checked={finalConfirmation}
                onCheckedChange={(checked) => {
                  setFinalConfirmation(checked === true);
                  setDeletionError(null);
                }}
                disabled={isDeleting}
              />
              <label
                htmlFor="final-confirmation"
                className="text-sm font-medium text-gray-900 cursor-pointer"
              >
                위 내용을 모두 확인했으며, 계정 삭제에 동의합니다. 삭제된 데이터는 복구할 수
                없으며, 재가입이 제한된다는 것을 이해했습니다.
              </label>
            </div>

            {deletionError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{deletionError}</AlertDescription>
              </Alert>
            )}

            {/* Success State */}
            {isDeleting && !deletionError && (
              <Alert className="border-green-200 bg-green-50">
                <Loader2 className="h-4 w-4 animate-spin text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>계정 삭제 중...</strong>
                  <br />
                  잠시만 기다려 주세요. 완료 후 자동으로 로그아웃됩니다.
                </AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                onClick={() => router.push('/dashboard')}
                variant="outline"
                className="flex-1"
                disabled={isDeleting}
              >
                취소하고 대시보드로
              </Button>
              <Button
                onClick={handleFinalDeletion}
                variant="destructive"
                className="flex-1"
                disabled={!finalConfirmation || isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    삭제 중...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    계정 영구 삭제
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
