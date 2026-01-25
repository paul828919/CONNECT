/**
 * Session Manager for Recommendation Tracking
 *
 * Manages session IDs for tracking user behavior across page views.
 * Sessions expire after 25 hours to match Redis TTL patterns.
 *
 * Design decisions:
 * - Browser sessionStorage for persistence within tab
 * - Fallback to localStorage with TTL for cross-tab consistency
 * - UUID v4 for globally unique session IDs
 * - 25-hour TTL matches active-user-tracking.ts pattern
 *
 * @module lib/personalization/session-manager
 */

import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Constants
// ============================================================================

const SESSION_KEY = 'connect_recommendation_session';
const SESSION_TTL_MS = 25 * 60 * 60 * 1000; // 25 hours (matches Redis TTL)

interface StoredSession {
  sessionId: string;
  createdAt: number;
  organizationId?: string;
}

// ============================================================================
// Session Manager Functions
// ============================================================================

/**
 * Get or create a session ID for recommendation tracking
 *
 * Priority:
 * 1. Use existing session from sessionStorage (same tab)
 * 2. Use existing session from localStorage (cross-tab, if not expired)
 * 3. Create new session
 *
 * @param organizationId - Optional org ID to validate session ownership
 * @returns Session ID (UUID v4)
 *
 * @example
 * ```ts
 * const sessionId = getSessionId('org-123');
 * // 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
 * ```
 */
export function getSessionId(organizationId?: string): string {
  if (typeof window === 'undefined') {
    // Server-side: Generate ephemeral session
    return uuidv4();
  }

  try {
    // 1. Check sessionStorage (current tab)
    const sessionData = sessionStorage.getItem(SESSION_KEY);
    if (sessionData) {
      const session: StoredSession = JSON.parse(sessionData);

      // Validate not expired and same org
      if (isSessionValid(session, organizationId)) {
        return session.sessionId;
      }
    }

    // 2. Check localStorage (cross-tab persistence)
    const localData = localStorage.getItem(SESSION_KEY);
    if (localData) {
      const session: StoredSession = JSON.parse(localData);

      if (isSessionValid(session, organizationId)) {
        // Copy to sessionStorage for faster access
        sessionStorage.setItem(SESSION_KEY, localData);
        return session.sessionId;
      }
    }

    // 3. Create new session
    return createNewSession(organizationId);
  } catch (error) {
    // Storage errors (e.g., private browsing mode)
    console.warn('[SESSION] Storage error, using ephemeral session:', error);
    return uuidv4();
  }
}

/**
 * Create a new session and persist it
 */
function createNewSession(organizationId?: string): string {
  const session: StoredSession = {
    sessionId: uuidv4(),
    createdAt: Date.now(),
    organizationId,
  };

  const sessionJson = JSON.stringify(session);

  try {
    sessionStorage.setItem(SESSION_KEY, sessionJson);
    localStorage.setItem(SESSION_KEY, sessionJson);
  } catch (error) {
    console.warn('[SESSION] Failed to persist session:', error);
  }

  return session.sessionId;
}

/**
 * Check if a session is valid (not expired, correct org)
 */
function isSessionValid(session: StoredSession, organizationId?: string): boolean {
  // Check expiration
  const age = Date.now() - session.createdAt;
  if (age > SESSION_TTL_MS) {
    return false;
  }

  // Check organization match (if provided)
  if (organizationId && session.organizationId && session.organizationId !== organizationId) {
    return false;
  }

  return true;
}

/**
 * Invalidate current session (call on logout or org change)
 */
export function invalidateSession(): void {
  if (typeof window === 'undefined') return;

  try {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
  } catch (error) {
    console.warn('[SESSION] Failed to invalidate session:', error);
  }
}

/**
 * Get session metadata (for debugging)
 */
export function getSessionMetadata(): StoredSession | null {
  if (typeof window === 'undefined') return null;

  try {
    const sessionData = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
    if (sessionData) {
      return JSON.parse(sessionData);
    }
  } catch (error) {
    console.warn('[SESSION] Failed to get session metadata:', error);
  }

  return null;
}

/**
 * Check if current session is still valid
 */
export function isCurrentSessionValid(organizationId?: string): boolean {
  const metadata = getSessionMetadata();
  if (!metadata) return false;
  return isSessionValid(metadata, organizationId);
}

/**
 * Refresh session (extend TTL by resetting createdAt)
 * Call this on significant user activity
 */
export function refreshSession(): void {
  if (typeof window === 'undefined') return;

  try {
    const sessionData = sessionStorage.getItem(SESSION_KEY);
    if (sessionData) {
      const session: StoredSession = JSON.parse(sessionData);
      session.createdAt = Date.now(); // Reset TTL

      const sessionJson = JSON.stringify(session);
      sessionStorage.setItem(SESSION_KEY, sessionJson);
      localStorage.setItem(SESSION_KEY, sessionJson);
    }
  } catch (error) {
    console.warn('[SESSION] Failed to refresh session:', error);
  }
}
