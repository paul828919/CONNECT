'use client';

/**
 * React Query (TanStack Query) Provider
 *
 * Wraps the application with QueryClientProvider to enable
 * useQuery, useMutation, and useQueryClient hooks.
 *
 * Required for admin dashboards that use React Query for data fetching.
 */

import { QueryClient, QueryClientProvider as TanStackQueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

export default function QueryClientProvider({ children }: { children: ReactNode }) {
  // Create QueryClient instance with useState to ensure it's only created once per component mount
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Disable automatic refetching on window focus (can be re-enabled per-query)
            refetchOnWindowFocus: false,
            // Retry failed queries 1 time
            retry: 1,
            // Cache data for 5 minutes
            staleTime: 5 * 60 * 1000,
          },
        },
      })
  );

  return <TanStackQueryClientProvider client={queryClient}>{children}</TanStackQueryClientProvider>;
}
