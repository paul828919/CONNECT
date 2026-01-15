/**
 * UTM Tracking Utilities
 *
 * Captures UTM parameters from URLs and stores them in cookies for attribution.
 * These are associated with users on signup for conversion tracking.
 *
 * UTM Parameters:
 * - utm_source: Where the traffic came from (e.g., "linkedin", "cold_email")
 * - utm_medium: Channel type (e.g., "email", "social", "cpc")
 * - utm_campaign: Campaign name (e.g., "jan2026_batch1")
 * - utm_term: Keyword for paid search (optional)
 * - utm_content: Differentiate ads/links (optional)
 *
 * Example URL:
 * https://connectplt.kr?utm_source=cold_email&utm_medium=email&utm_campaign=jan2026_batch1
 */

// UTM parameter names
export const UTM_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const;

// UTM cookie name (stores all UTM params as JSON)
export const UTM_COOKIE_NAME = 'connect_utm';

// Cookie expiration: 30 days (captures users who don't sign up immediately)
export const UTM_COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

/**
 * UTM data structure
 */
export interface UtmData {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  capturedAt?: string; // ISO timestamp when UTM was captured
}

/**
 * Extract UTM parameters from URL search params
 */
export function extractUtmFromUrl(searchParams: URLSearchParams): UtmData | null {
  const utmSource = searchParams.get('utm_source');
  const utmMedium = searchParams.get('utm_medium');
  const utmCampaign = searchParams.get('utm_campaign');
  const utmTerm = searchParams.get('utm_term');
  const utmContent = searchParams.get('utm_content');

  // Return null if no UTM params present
  if (!utmSource && !utmMedium && !utmCampaign) {
    return null;
  }

  return {
    utmSource: utmSource || undefined,
    utmMedium: utmMedium || undefined,
    utmCampaign: utmCampaign || undefined,
    utmTerm: utmTerm || undefined,
    utmContent: utmContent || undefined,
    capturedAt: new Date().toISOString(),
  };
}

/**
 * Parse UTM data from cookie value
 */
export function parseUtmCookie(cookieValue: string | undefined): UtmData | null {
  if (!cookieValue) return null;

  try {
    return JSON.parse(cookieValue) as UtmData;
  } catch {
    return null;
  }
}

/**
 * Serialize UTM data for cookie storage
 */
export function serializeUtmForCookie(utmData: UtmData): string {
  return JSON.stringify(utmData);
}

/**
 * Generate cookie string for setting UTM cookie
 * Used in server-side responses
 */
export function generateUtmCookieString(utmData: UtmData): string {
  const value = encodeURIComponent(serializeUtmForCookie(utmData));
  return `${UTM_COOKIE_NAME}=${value}; Path=/; Max-Age=${UTM_COOKIE_MAX_AGE}; SameSite=Lax`;
}

/**
 * Client-side function to set UTM cookie
 * Call this from layout or a client component
 */
export function setUtmCookieClient(utmData: UtmData): void {
  if (typeof document === 'undefined') return;

  const value = encodeURIComponent(serializeUtmForCookie(utmData));
  document.cookie = `${UTM_COOKIE_NAME}=${value}; path=/; max-age=${UTM_COOKIE_MAX_AGE}; samesite=lax`;
}

/**
 * Client-side function to get UTM cookie
 */
export function getUtmCookieClient(): UtmData | null {
  if (typeof document === 'undefined') return null;

  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === UTM_COOKIE_NAME && value) {
      return parseUtmCookie(decodeURIComponent(value));
    }
  }
  return null;
}
