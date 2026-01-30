'use client';

/**
 * Data Quality Console (데이터 품질 콘솔)
 *
 * Admin-only page for monitoring and managing data quality across all core tables.
 * Phase 1: Read-only data browser with 5 tabs.
 *
 * Route: /admin/data-quality-console
 * Access: ADMIN or SUPER_ADMIN only
 */

import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import SmeProgramsTab from './components/SmePrograms/SmeProgramsTab';
import SmeMatchesTab from './components/SmeMatches/SmeMatchesTab';
import FundingProgramsTab from './components/FundingPrograms/FundingProgramsTab';
import FundingMatchesTab from './components/FundingMatches/FundingMatchesTab';
import UsersOrgsTab from './components/UsersOrgs/UsersOrgsTab';

export default function DataQualityConsolePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }
    if (
      (session?.user as any)?.role !== 'ADMIN' &&
      (session?.user as any)?.role !== 'SUPER_ADMIN'
    ) {
      router.push('/dashboard');
      return;
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
        </div>
      </DashboardLayout>
    );
  }

  if (
    (session?.user as any)?.role !== 'ADMIN' &&
    (session?.user as any)?.role !== 'SUPER_ADMIN'
  ) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            데이터 품질 콘솔
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            프로그램, 매칭, 사용자 데이터의 저장 상태를 모니터링하고 품질을 관리합니다.
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="sme-programs" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="sme-programs">SME 프로그램</TabsTrigger>
            <TabsTrigger value="sme-matches">SME 매칭</TabsTrigger>
            <TabsTrigger value="funding-programs">R&D 프로그램</TabsTrigger>
            <TabsTrigger value="funding-matches">R&D 매칭</TabsTrigger>
            <TabsTrigger value="users-orgs">사용자 · 기업</TabsTrigger>
          </TabsList>

          <TabsContent value="sme-programs">
            <SmeProgramsTab />
          </TabsContent>

          <TabsContent value="sme-matches">
            <SmeMatchesTab />
          </TabsContent>

          <TabsContent value="funding-programs">
            <FundingProgramsTab />
          </TabsContent>

          <TabsContent value="funding-matches">
            <FundingMatchesTab />
          </TabsContent>

          <TabsContent value="users-orgs">
            <UsersOrgsTab />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
