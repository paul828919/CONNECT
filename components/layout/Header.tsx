'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import UserMenu from './UserMenu';
import MobileNav from './MobileNav';
import { cn } from '@/lib/utils';

const navLinks = [
  { href: '/', label: '홈' },
  { href: '/dashboard', label: '대시보드' },
  { href: '/dashboard/matches', label: '매칭 결과' },
  { href: '/dashboard/partners', label: '파트너 검색' },
  { href: '/dashboard/consortiums', label: '컨소시엄' },
  { href: '/dashboard/messages', label: '메시지' },
  { href: '/dashboard/help', label: 'AI 어시스턴트' },
];

export default function Header() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  return (
    <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-1">
            <Image
              src="/logo.svg"
              alt="Connect Logo"
              width={24}
              height={24}
              className="w-6 h-6"
            />
            <span className="text-2xl font-bold text-blue-600">Connect</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'text-sm font-medium transition-colors hover:text-blue-600',
                  pathname === link.href
                    ? 'text-blue-600 border-b-2 border-blue-600 pb-1'
                    : 'text-gray-600'
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-4">
            {status === 'loading' ? (
              <div className="w-20 h-8 bg-gray-100 rounded-md animate-pulse" />
            ) : session ? (
              <UserMenu />
            ) : (
              <Link
                href="/auth/signin"
                className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors rounded-md px-4 py-2"
              >
                로그인
              </Link>
            )}
            <MobileNav navLinks={navLinks} isLoggedIn={!!session} />
          </div>
        </div>
      </div>
    </header>
  );
}
