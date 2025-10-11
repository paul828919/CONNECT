'use client';

import { useState, useEffect } from 'react';
import { X, Rocket } from 'lucide-react';
import Link from 'next/link';

/**
 * Beta Launch Banner Component
 *
 * Dismissible banner announcing limited beta access (50 seats).
 * Uses localStorage to persist dismissal state.
 *
 * Features:
 * - Eye-catching orange gradient design
 * - Dismissible with X button
 * - Persistent dismissal state (localStorage)
 * - Mobile responsive
 * - Clear CTA to beta signup
 */
export default function BetaBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Check localStorage for dismissal state
    const dismissed = localStorage.getItem('betaBannerDismissed');
    if (!dismissed) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('betaBannerDismissed', 'true');
  };

  // Don't render until mounted (avoid hydration mismatch)
  if (!isMounted || !isVisible) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 text-white shadow-lg">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Icon + Message */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Rocket className="w-5 h-5 flex-shrink-0 animate-pulse" aria-hidden="true" />
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
              <span className="font-bold text-sm sm:text-base truncate">
                🚀 Limited Beta: 50 Seats Available
              </span>
              <span className="text-xs sm:text-sm text-orange-100 truncate">
                Join the Future of R&D Commercialization
              </span>
            </div>
          </div>

          {/* Right: CTA + Dismiss */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <Link
              href="/auth/signin"
              className="px-3 py-1.5 sm:px-4 sm:py-2 bg-white text-orange-600 font-semibold rounded-lg hover:bg-orange-50 transition-colors text-xs sm:text-sm whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-orange-600"
              aria-label="Apply for Beta Access"
            >
              Apply Now
            </Link>
            <button
              onClick={handleDismiss}
              className="p-1.5 hover:bg-orange-700 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white"
              aria-label="Dismiss banner"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
