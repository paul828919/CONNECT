'use client';

/**
 * Data Export Button Component (PIPA Article 35 - Data Portability)
 *
 * Allows users to download their personal data as CSV file.
 * Calls GET /api/users/export-data endpoint created in Session 2.
 *
 * Features:
 * - One-click CSV download
 * - Rate limiting: 1 export per hour (enforced by API)
 * - Loading state with spinner
 * - Error handling with toast notifications
 * - Download progress feedback
 */

import { useState } from 'react';
import { Download, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DataExportButtonProps {
  className?: string;
}

export default function DataExportButton({ className }: DataExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimit, setRateLimit] = useState<{ resetTime: string; waitSeconds: number } | null>(null);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setError(null);
      setRateLimit(null);

      const response = await fetch('/api/users/export-data', {
        method: 'GET',
        credentials: 'include', // Include session cookie
      });

      if (!response.ok) {
        // Handle rate limit error (429)
        if (response.status === 429) {
          const errorData = await response.json();
          setRateLimit({
            resetTime: errorData.resetTime,
            waitSeconds: Math.ceil((new Date(errorData.resetTime).getTime() - Date.now()) / 1000),
          });
          throw new Error(errorData.error || '데이터 내보내기 횟수 제한을 초과했습니다.');
        }

        // Handle other errors
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: 데이터 내보내기 실패`);
      }

      // Success: Download CSV file
      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `connect-data-export-${new Date().toISOString().split('T')[0]}.csv`;

      // Trigger file download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      console.log('[EXPORT] CSV file downloaded:', filename);
    } catch (err) {
      console.error('[EXPORT] Error:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={className}>
      <Button
        onClick={handleExport}
        disabled={isExporting}
        variant="outline"
        size="default"
        className="w-full sm:w-auto"
      >
        {isExporting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            내보내는 중...
          </>
        ) : (
          <>
            <Download className="mr-2 h-4 w-4" />
            내 데이터 다운로드 (CSV)
          </>
        )}
      </Button>

      {/* Error Message */}
      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Rate Limit Warning */}
      {rateLimit && (
        <Alert className="mt-4 border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>내보내기 횟수 제한:</strong> 1시간에 1회만 내보낼 수 있습니다.
            <br />
            <span className="text-sm text-amber-600">
              {Math.floor(rateLimit.waitSeconds / 60)}분 {rateLimit.waitSeconds % 60}초 후에 다시 시도해 주세요.
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* Help Text */}
      {!error && !rateLimit && (
        <p className="mt-2 text-sm text-gray-600">
          회원가입 정보, 조직 정보, 매칭 결과, 컨소시엄 데이터를 CSV 파일로 다운로드합니다.
          <br />
          <span className="text-xs text-gray-500">
            (개인정보 보호법 제35조 - 데이터 이동권 보장)
          </span>
        </p>
      )}
    </div>
  );
}
