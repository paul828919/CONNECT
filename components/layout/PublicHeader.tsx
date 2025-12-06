'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import UserMenu from './UserMenu';
import MobileNav from './MobileNav';
import { cn } from '@/lib/utils';

const publicNavLinks = [
  { href: '/pricing', label: '요금제' },
  { href: '/refund-policy', label: '환불 정책' },
  { href: '/support', label: '고객 지원' },
  { href: '/faq', label: 'FAQ' },
  { href: '/terms', label: '이용약관' },
  { href: '/privacy', label: '개인정보처리방침' },
];

export default function PublicHeader() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-gray-200 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
        {/* Logo - Left */}
        <Link href="/" className="flex items-center gap-1">
          <Image
            src="/logo.svg"
            alt="Connect Logo"
            width={24}
            height={24}
            className="w-6 h-6 -rotate-45"
          />
          <span className="text-2xl font-bold text-indigo-500">Connect</span>
        </Link>

        {/* Navigation - Center */}
        <nav className="hidden md:flex items-center gap-6 absolute left-1/2 transform -translate-x-1/2">
          {publicNavLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'text-sm font-medium transition-colors hover:text-blue-600 whitespace-nowrap',
                pathname === link.href
                  ? 'text-blue-600 border-b-2 border-blue-600 pb-1'
                  : 'text-gray-600'
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Auth & Mobile - Right */}
        <div className="flex items-center gap-4">
          {status === 'loading' ? (
            <div className="w-16 h-8 bg-gray-100 rounded-md animate-pulse" />
          ) : session ? (
            <UserMenu />
          ) : (
            <Link
              href="/auth/signin"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md px-3 py-2"
            >
              로그인
            </Link>
          )}
          <MobileNav navLinks={publicNavLinks} isLoggedIn={!!session} />
        </div>
      </div>
    </nav>
  );
}
