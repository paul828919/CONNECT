/**
 * Consortium Header Component
 *
 * Shared header for all consortium pages with tab navigation:
 * - 컨소시엄 목록 (Consortium List)
 * - 컨소시엄 상세 (Consortium Details)
 * - 컨소시엄 설정 (Consortium Settings)
 */

'use client';

import Link from 'next/link';

type TabType = 'list' | 'detail' | 'settings';

interface ConsortiumHeaderProps {
  activeTab: TabType;
  consortiumId?: string;
  consortiumName?: string;
}

export default function ConsortiumHeader({
  activeTab,
  consortiumId,
  consortiumName
}: ConsortiumHeaderProps) {
  const tabs = [
    {
      id: 'list' as TabType,
      label: '컨소시엄 목록',
      href: '/dashboard/consortiums',
      requiresConsortium: false,
    },
    {
      id: 'detail' as TabType,
      label: '컨소시엄 상세',
      href: consortiumId ? `/dashboard/consortiums/${consortiumId}` : '#',
      requiresConsortium: true,
    },
    {
      id: 'settings' as TabType,
      label: '컨소시엄 설정',
      href: consortiumId ? `/dashboard/consortiums/${consortiumId}/edit` : '#',
      requiresConsortium: true,
    },
  ];

  return (
    <div className="mb-8">
      {/* Main Title - matching partner search spacing */}
      <h1 className="text-3xl font-bold text-gray-900">컨소시엄</h1>
      <p className="mt-2 text-gray-600">
        {consortiumName || '컨소시엄 프로젝트를 생성하고 관리하세요'}
      </p>

      {/* Tab Navigation */}
      <div className="mt-6 border-b border-gray-200">
        <nav className="flex gap-0" aria-label="Consortium tabs">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const isDisabled = tab.requiresConsortium && !consortiumId;

            // Disabled state - show as grayed out span
            if (isDisabled) {
              return (
                <span
                  key={tab.id}
                  className="px-6 py-3 text-base font-medium text-gray-300 border-b-2 border-transparent cursor-not-allowed"
                  title="목록에서 컨소시엄을 선택하세요"
                >
                  {tab.label}
                </span>
              );
            }

            // Enabled state - clickable link
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`px-6 py-3 text-base font-medium transition-colors border-b-2 ${
                  isActive
                    ? 'text-blue-600 border-blue-500'
                    : 'text-gray-500 border-transparent hover:text-blue-600 hover:border-blue-300'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
