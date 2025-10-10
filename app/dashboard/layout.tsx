/**
 * Dashboard Layout
 *
 * Forces dynamic rendering for all dashboard pages to prevent
 * build-time static generation issues with middleware.
 */

import { ReactNode } from 'react';

// Force all dashboard pages to be dynamic (no static generation)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}
