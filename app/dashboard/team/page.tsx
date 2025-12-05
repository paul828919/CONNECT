'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/lib/hooks/use-toast';
import Link from 'next/link';

interface TeamMember {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  createdAt: string;
  lastLoginAt: string | null;
}

interface TeamLimits {
  plan: string;
  maxMembers: number;
  currentMembers: number;
  canAddMore: boolean;
  remainingSlots: number;
}

export default function TeamPage() {
  const { data: session } = useSession();
  const { toast } = useToast();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [limits, setLimits] = useState<TeamLimits | null>(null);
  const [organizationName, setOrganizationName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Invite modal state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviting, setInviting] = useState(false);

  // Remove confirmation state
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);
  const [removing, setRemoving] = useState(false);

  const fetchTeamMembers = useCallback(async () => {
    try {
      const res = await fetch('/api/team/members');
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
        setLimits(data.limits || null);
        setOrganizationName(data.organization?.name || '');
      } else if (res.status === 403) {
        // Not a Team plan user
        setLimits({ plan: 'FREE', maxMembers: 1, currentMembers: 1, canAddMore: false, remainingSlots: 0 });
      }
    } catch (error) {
      console.error('Failed to fetch team members:', error);
      toast({
        title: '팀 정보를 불러오지 못했습니다',
        description: '잠시 후 다시 시도해주세요.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (session) {
      fetchTeamMembers();
    }
  }, [session, fetchTeamMembers]);

  const handleInvite = async () => {
    if (!inviteEmail) {
      toast({
        title: '이메일을 입력해주세요',
        variant: 'destructive',
      });
      return;
    }

    setInviting(true);
    try {
      const res = await fetch('/api/team/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, name: inviteName }),
      });

      const data = await res.json();

      if (res.ok) {
        toast({
          title: '팀원이 추가되었습니다',
          description: data.message,
        });
        setInviteOpen(false);
        setInviteEmail('');
        setInviteName('');
        fetchTeamMembers();
      } else {
        toast({
          title: '팀원 추가 실패',
          description: data.message || data.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: '네트워크 오류',
        description: '잠시 후 다시 시도해주세요.',
        variant: 'destructive',
      });
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async () => {
    if (!memberToRemove) return;

    setRemoving(true);
    try {
      const res = await fetch(`/api/team/members/${memberToRemove.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (res.ok) {
        toast({
          title: '팀원이 제외되었습니다',
          description: data.message,
        });
        setMemberToRemove(null);
        fetchTeamMembers();
      } else {
        toast({
          title: '팀원 제외 실패',
          description: data.message || data.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: '네트워크 오류',
        description: '잠시 후 다시 시도해주세요.',
        variant: 'destructive',
      });
    } finally {
      setRemoving(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '로그인 기록 없음';
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  // Show upgrade prompt for non-Team users
  if (limits && limits.plan !== 'TEAM') {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">팀 멤버 관리</CardTitle>
              <CardDescription>
                Team 플랜으로 업그레이드하여 최대 5명의 팀 멤버와 함께 사용하세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 border border-purple-200">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <svg className="h-8 w-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Team 플랜의 팀 관리 기능
                    </h3>
                    <ul className="space-y-2 text-gray-600 mb-4">
                      <li className="flex items-center">
                        <svg className="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        최대 5명의 팀 멤버 추가
                      </li>
                      <li className="flex items-center">
                        <svg className="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        이메일로 간편하게 초대
                      </li>
                      <li className="flex items-center">
                        <svg className="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        조직 내 협업 및 공유
                      </li>
                    </ul>
                    <Link href="/pricing">
                      <Button className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700">
                        Team 플랜으로 업그레이드
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>

              <div className="text-center text-sm text-gray-500">
                현재 플랜: <span className="font-semibold">{limits.plan}</span> (1명 제한)
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">팀 멤버 관리</h1>
            <p className="text-gray-600">{organizationName}</p>
          </div>

          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button
                disabled={!limits?.canAddMore}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                팀원 초대
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>팀원 초대</DialogTitle>
                <DialogDescription>
                  초대할 팀원의 이메일 주소를 입력해주세요.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">이메일 주소 *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="team@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">이름 (선택)</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="홍길동"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setInviteOpen(false)}>
                  취소
                </Button>
                <Button onClick={handleInvite} disabled={inviting}>
                  {inviting ? '초대 중...' : '초대하기'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Team Limit Info */}
        {limits && (
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="text-gray-700">
                    팀 멤버: <span className="font-semibold">{limits.currentMembers}</span> / {limits.maxMembers}명
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  {limits.canAddMore ? (
                    <span className="text-green-600">{limits.remainingSlots}명 추가 가능</span>
                  ) : (
                    <span className="text-orange-600">한도 도달</span>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all"
                  style={{ width: `${(limits.currentMembers / limits.maxMembers) * 100}%` }}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Members List */}
        <Card>
          <CardHeader>
            <CardTitle>팀 멤버 목록</CardTitle>
            <CardDescription>
              조직에 소속된 모든 팀원을 확인하고 관리할 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-gray-100">
              {members.map((member) => (
                <div key={member.id} className="py-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                      {member.name?.[0]?.toUpperCase() || member.email?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {member.name || '이름 미설정'}
                        {member.id === (session?.user as any)?.id && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                            나
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{member.email}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right text-sm text-gray-500">
                      <div>{member.role === 'ADMIN' ? '관리자' : '멤버'}</div>
                      <div className="text-xs">
                        마지막 로그인: {formatDate(member.lastLoginAt)}
                      </div>
                    </div>

                    {member.id !== (session?.user as any)?.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setMemberToRemove(member)}
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {members.length === 0 && (
                <div className="py-8 text-center text-gray-500">
                  팀 멤버가 없습니다. 첫 번째 팀원을 초대해보세요!
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Remove Confirmation Dialog */}
        <AlertDialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>팀원 제외 확인</AlertDialogTitle>
              <AlertDialogDescription>
                <span className="font-semibold">{memberToRemove?.name || memberToRemove?.email}</span>
                님을 팀에서 제외하시겠습니까?
                <br />
                제외된 멤버는 더 이상 조직의 매칭 결과에 접근할 수 없습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={removing}>취소</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRemove}
                disabled={removing}
                className="bg-red-600 hover:bg-red-700"
              >
                {removing ? '처리 중...' : '제외하기'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
