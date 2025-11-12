'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import UserMenu from './UserMenu';
import MobileNav from './MobileNav';
import { cn } from '@/lib/utils';

const navLinks = [
  { href: '/dashboard', label: '대시보드' },
  { href: '/dashboard/matches', label: '매칭 결과' },
  { href: '/dashboard/partners', label: '파트너 검색' },
  { href: '/dashboard/consortiums', label: '컨소시엄' },
  { href: '/dashboard/messages', label: '메시지' },
  { href: '/dashboard/help', label: 'AI 어시스턴트' },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="text-2xl font-bold text-blue-600">Connect</div>
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
            <UserMenu />
            <MobileNav navLinks={navLinks} />
          </div>
        </div>
      </div>
    </header>
  );
}
