'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';

interface NotificationSettings {
  newMatchNotifications: boolean;
  deadlineReminders: boolean;
  weeklyDigest: boolean;
  minimumMatchScore: number;
  emailEnabled: boolean;
}

export default function NotificationSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  // Fetch current settings
  useEffect(() => {
    async function fetchSettings() {
      try {
        const response = await fetch('/api/settings/notifications');
        const data = await response.json();

        if (data.success) {
          setSettings(data.settings);
        } else {
          setMessage({ type: 'error', text: '설정을 불러올 수 없습니다' });
        }
      } catch (error) {
        setMessage({ type: 'error', text: '설정을 불러오는 중 오류가 발생했습니다' });
      } finally {
        setIsLoading(false);
      }
    }

    fetchSettings();
  }, []);

  // Save settings
  const handleSave = async () => {
    if (!settings) return;

    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/settings/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: '알림 설정이 저장되었습니다' });
      } else {
        setMessage({ type: 'error', text: data.error || '저장에 실패했습니다' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '저장 중 오류가 발생했습니다' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">설정 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-red-600">설정을 불러올 수 없습니다</p>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">알림 설정</h1>
          <p className="mt-2 text-gray-600">
            이메일 알림을 맞춤 설정하세요
          </p>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-6 rounded-lg p-4 ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800'
                : 'bg-red-50 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Settings Card */}
        <div className="rounded-2xl bg-white p-8 shadow-sm">
          <div className="space-y-6">
            {/* Master Email Toggle */}
            <div className="rounded-lg border border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    이메일 알림 활성화
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">
                    모든 이메일 알림을 켜거나 끕니다
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={settings.emailEnabled}
                    onChange={(e) =>
                      setSettings({ ...settings, emailEnabled: e.target.checked })
                    }
                  />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300"></div>
                </label>
              </div>
            </div>

            {/* Individual Notification Types */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">알림 유형</h3>

              {/* New Match Notifications */}
              <div className="flex items-start justify-between rounded-lg border border-gray-200 p-4">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">🎯</div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">새로운 매칭 알림</p>
                    <p className="mt-1 text-sm text-gray-600">
                      새로운 펀딩 과제가 매칭되면 즉시 이메일로 알려드립니다
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={settings.newMatchNotifications}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        newMatchNotifications: e.target.checked,
                      })
                    }
                    disabled={!settings.emailEnabled}
                  />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-disabled:cursor-not-allowed peer-disabled:opacity-50"></div>
                </label>
              </div>

              {/* Deadline Reminders */}
              <div className="flex items-start justify-between rounded-lg border border-gray-200 p-4">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">⏰</div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">마감일 리마인더</p>
                    <p className="mt-1 text-sm text-gray-600">
                      7일, 3일, 1일 전에 마감일을 알려드립니다
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={settings.deadlineReminders}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        deadlineReminders: e.target.checked,
                      })
                    }
                    disabled={!settings.emailEnabled}
                  />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-disabled:cursor-not-allowed peer-disabled:opacity-50"></div>
                </label>
              </div>

              {/* Weekly Digest */}
              <div className="flex items-start justify-between rounded-lg border border-gray-200 p-4">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">📊</div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">주간 리포트</p>
                    <p className="mt-1 text-sm text-gray-600">
                      매주 일요일 오전 8시에 한 주간의 요약을 받아보세요
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={settings.weeklyDigest}
                    onChange={(e) =>
                      setSettings({ ...settings, weeklyDigest: e.target.checked })
                    }
                    disabled={!settings.emailEnabled}
                  />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-disabled:cursor-not-allowed peer-disabled:opacity-50"></div>
                </label>
              </div>
            </div>

            {/* Minimum Match Score */}
            <div className="rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900">
                최소 매칭 점수
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                이 점수 이상의 매칭만 알림을 받습니다 (현재: {settings.minimumMatchScore}점)
              </p>
              <div className="mt-4 flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="10"
                  value={settings.minimumMatchScore}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      minimumMatchScore: parseInt(e.target.value),
                    })
                  }
                  disabled={!settings.emailEnabled}
                  className="w-full accent-blue-600 disabled:opacity-50"
                />
                <div className="flex w-16 items-center justify-center rounded-lg bg-blue-50 px-3 py-2 text-center font-semibold text-blue-600">
                  {settings.minimumMatchScore}
                </div>
              </div>
              <div className="mt-2 flex justify-between text-xs text-gray-500">
                <span>모든 매칭 (0점)</span>
                <span>높은 매칭만 (100점)</span>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="mt-8 flex justify-end gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              disabled={isSaving}
              className="rounded-lg border border-gray-300 px-6 py-3 font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="h-5 w-5 animate-spin"
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
                  저장 중...
                </span>
              ) : (
                '변경사항 저장'
              )}
            </button>
          </div>
        </div>

        {/* Info Card */}
        <div className="mt-6 rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
          <p className="font-medium">💡 알림 최적화 Tip</p>
          <ul className="mt-2 ml-4 list-disc space-y-1">
            <li>최소 매칭 점수를 70점 이상으로 설정하면 질 높은 매칭만 받습니다</li>
            <li>마감일 리마인더는 지원 준비 시간을 확보하는데 도움이 됩니다</li>
            <li>주간 리포트는 놓친 기회를 확인할 수 있는 좋은 방법입니다</li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}
