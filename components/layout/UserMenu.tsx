'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function UserMenu() {
  const { data: session } = useSession();
  const router = useRouter();

  if (!session?.user) return null;

  const userInitials = session.user.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || 'U';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg hover:bg-gray-100 p-2 transition-colors">
        <Avatar className="h-8 w-8">
          <AvatarImage src={session.user.image || undefined} />
          <AvatarFallback>{userInitials}</AvatarFallback>
        </Avatar>
        <span className="hidden md:block text-sm font-medium">
          {session.user.name}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>내 계정</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push('/dashboard/profile/edit')}>
          프로필 수정
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push('/dashboard/settings/notifications')}>
          알림 설정
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push('/dashboard/subscription')}>
          구독 관리
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push('/dashboard/team')}>
          팀 관리
        </DropdownMenuItem>
        {/* Admin only */}
        {((session.user as any)?.role === 'ADMIN' || (session.user as any)?.role === 'SUPER_ADMIN') && (
          <>
            <DropdownMenuItem onClick={() => router.push('/dashboard/admin/scraping')}>
              스크래핑 관리
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/admin/eligibility-review')}>
              자격 요건 검토
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/dashboard/admin/feedback')}>
              피드백 관리
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/dashboard/admin/statistics')}>
              사용자 통계
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/dashboard/admin/ai-monitoring')}>
              AI 비용 모니터링
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/admin/refund-management')}>
              환불 관리
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => router.push('/dashboard/settings/withdrawal')}
          className="text-gray-600"
        >
          회원 탈퇴
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => signOut({ callbackUrl: '/auth/signin' })}
          className="text-red-600 focus:text-red-600"
        >
          로그아웃
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
