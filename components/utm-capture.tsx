'use client';

/**
 * UTM Capture Component
 *
 * Silently captures UTM parameters from URL and stores in cookie.
 * Include this in the root layout to capture UTM on any landing page.
 *
 * Example: User lands on https://connectplt.kr?utm_source=cold_email&utm_campaign=jan2026
 * → UTM params stored in cookie for 30 days
 * → On signup, UTM is associated with the user account
 */

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { extractUtmFromUrl, setUtmCookieClient, getUtmCookieClient } from '@/lib/analytics/utm-tracking';

export function UtmCapture() {
  const searchParams = useSearchParams();

  useEffect(() => {
    // Extract UTM from URL
    const utmFromUrl = extractUtmFromUrl(searchParams);

    if (utmFromUrl) {
      // New UTM params in URL - always overwrite existing cookie
      // (latest attribution wins - last touch model)
      setUtmCookieClient(utmFromUrl);
      console.log('[UTM] Captured from URL:', utmFromUrl);
    }
  }, [searchParams]);

  // This component renders nothing - it only captures UTM
  return null;
}

export default UtmCapture;
