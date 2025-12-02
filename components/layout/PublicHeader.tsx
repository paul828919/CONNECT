'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import UserMenu from './UserMenu';
import MobileNav from './MobileNav';

const publicNavLinks = [
  { href: '/pricing', label: '요금제' },
  { href: '/support', label: '고객 지원' },
  { href: '/faq', label: 'FAQ' },
];

export default function PublicHeader() {
  const { data: session, status } = useSession();

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-gray-200 z-50">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
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
        <div className="flex items-center gap-6">
          {publicNavLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hidden md:block text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              {link.label}
            </Link>
          ))}
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
