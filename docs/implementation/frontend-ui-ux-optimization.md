# Frontend UI/UX Optimization Plan - Connect Platform

**Document Version:** 1.0
**Date:** 2025-01-03
**Status:** Ready for Implementation
**Scope:** Complete frontend audit and optimization roadmap

---

## Executive Summary

This document provides a comprehensive analysis of the Connect platform's frontend UI/UX state and presents a detailed optimization plan aligned with modern design principles, accessibility standards, and the project's business objectives.

**Key Findings:**
- ✅ **11 pages implemented** with basic functionality
- ❌ **No unified navigation system** - each page has custom headers
- ❌ **8+ critical pages missing** (billing, consortium builder, partner details)
- ❌ **Limited component library** - only 4 Shadcn components installed
- ❌ **Inconsistent design patterns** - varying colors, spacing, and layouts
- ❌ **No mobile optimization** - desktop-only assumptions throughout

**Implementation Timeline:** 4 weeks
**Priority:** HIGH (required for MVP completion per PRD v8.0)

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Critical Missing Elements](#critical-missing-elements)
3. [Comprehensive UI/UX Improvement Plan](#comprehensive-uiux-improvement-plan)
4. [Implementation Roadmap](#implementation-roadmap)
5. [Design System Specifications](#design-system-specifications)
6. [Technical Architecture](#technical-architecture)

---

## 1. Current State Analysis

### 1.1 Existing Pages (11 Total)

#### Public Pages (4)
| Page | Path | Status | Notes |
|------|------|--------|-------|
| Landing | `/` | ⚠️ Basic | Needs marketing content |
| Sign In | `/auth/signin` | ✅ Complete | Kakao/Naver OAuth working |
| Welcome | `/auth/welcome` | ✅ Complete | Good onboarding intro |
| Error | `/auth/error` | ✅ Complete | OAuth error handling |

#### Dashboard Pages (7)
| Page | Path | Status | Notes |
|------|------|--------|-------|
| Dashboard | `/dashboard` | ✅ Complete | Match generation CTA |
| Matches | `/dashboard/matches` | ✅ Complete | Beautiful match cards with explanations |
| Profile Create | `/dashboard/profile/create` | ✅ Complete | Comprehensive form with validation |
| Profile Edit | `/dashboard/profile/edit` | ✅ Complete | Pre-populated edit form |
| Partners Search | `/dashboard/partners` | ✅ Complete | Search & filter UI |
| Notification Settings | `/dashboard/settings/notifications` | ✅ Complete | Toggle switches for email prefs |
| Admin Scraping | `/dashboard/admin/scraping` | ✅ Complete | Admin-only page |

### 1.2 Existing Shadcn Components (4 Total)

| Component | File | Usage | Status |
|-----------|------|-------|--------|
| Button | `components/ui/button.tsx` | Widely used | ✅ Working |
| Card | `components/ui/card.tsx` | Match displays | ✅ Working |
| Table | `components/ui/table.tsx` | Admin pages | ✅ Working |
| Badge | `components/ui/badge.tsx` | Status indicators | ✅ Working |

### 1.3 Design System Audit

#### Typography
```typescript
// Current implementation (globals.css)
h1, h2, h3, h4, h5, h6 {
  font-weight: 600;
  letter-spacing: -0.025em;
  line-height: 1.4;
}

p {
  line-height: 1.75;
  letter-spacing: -0.01em;
}
```
**Assessment:** ✅ Good Korean typography optimization

#### Color Palette
```javascript
// Tailwind config - Current colors
primary: "hsl(var(--primary))" // Blue-600
secondary: "hsl(var(--secondary))"
destructive: "hsl(var(--destructive))" // Red-600
```

**Issues Found:**
- ❌ Inconsistent color usage across pages
- ❌ Mixing `bg-blue-600`, `bg-purple-600`, `bg-green-600` without pattern
- ❌ No semantic color system (success, warning, info)

#### Spacing & Layout
**Current patterns observed:**
- Container: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` ✅ Good
- Card padding: `p-6` or `p-8` ⚠️ Inconsistent
- Vertical spacing: `space-y-6` or `space-y-4` or `space-y-8` ⚠️ Inconsistent
- Grid gaps: `gap-4` or `gap-6` or `gap-8` ⚠️ Inconsistent

### 1.4 Navigation Structure Analysis

**Current State: ❌ No Unified Navigation**

Each page implements its own header:
```tsx
// dashboard/page.tsx
<header className="border-b bg-white">
  <div className="flex items-center justify-between">
    <h1>Connect</h1>
    <button onClick={signout}>로그아웃</button>
  </div>
</header>

// dashboard/matches/page.tsx
<header className="border-b bg-white">
  <div className="flex items-center justify-between">
    <Link href="/dashboard">Connect</Link>
    <button>대시보드</button>
    <button>로그아웃</button>
  </div>
</header>
```

**Problems:**
1. Code duplication across 7+ pages
2. No consistent navigation menu
3. No active link highlighting
4. No mobile hamburger menu
5. Hard to discover features (Partners, Consortiums, etc.)

---

## 2. Critical Missing Elements

### 2.1 Navigation System (HIGHEST PRIORITY)

**Required Components:**
```
components/
├── layout/
│   ├── DashboardLayout.tsx      # Wrapper for all dashboard pages
│   ├── Header.tsx               # Top navigation bar
│   ├── Sidebar.tsx              # Desktop sidebar (optional for MVP)
│   ├── MobileNav.tsx            # Mobile hamburger menu
│   └── UserMenu.tsx             # User dropdown (profile, settings, logout)
```

**Proposed Navigation Structure:**
```
Header (sticky top-0 z-50)
├── Logo (Link to /dashboard)
├── Desktop Nav Links (hidden md:flex gap-6)
│   ├── 대시보드 → /dashboard
│   ├── 매칭 결과 → /dashboard/matches
│   ├── 파트너 검색 → /dashboard/partners
│   ├── 컨소시엄 → /dashboard/consortiums
│   └── 구독 관리 → /dashboard/billing
├── User Menu (DropdownMenu from Shadcn)
│   ├── Avatar + Name
│   ├── 프로필 수정 → /dashboard/profile/edit
│   ├── 알림 설정 → /dashboard/settings/notifications
│   ├── [Admin only] 관리자 → /dashboard/admin/scraping
│   ├── Separator
│   └── 로그아웃
└── Mobile Menu Button (md:hidden)
    └── Sheet/Dialog with nav links
```

### 2.2 Billing & Subscription Pages (REQUIRED FOR MVP)

**Reference:** PRD v8.0 Section 3.7 - Payment Integration (Toss Payments)

**Missing Pages:**
1. **`/dashboard/billing`** - Subscription dashboard
   - Current plan display (Free/Pro/Team)
   - Next billing date
   - Payment method (last 4 digits)
   - Usage stats: matches used/remaining this month
   - Payment history table (last 12 months)
   - CTAs: "Update Payment Method", "Cancel Subscription", "Upgrade to Pro"

2. **`/dashboard/billing/upgrade`** - Pricing comparison page
   - 4-column pricing table (Beta, Free, Pro, Team)
   - Feature matrix with checkmarks/X marks
   - CTA buttons → initiate Toss Payments checkout
   - Annual discount badge (₩9,900/mo vs ₩12,900/mo)

3. **`/payment/success`** - Post-payment success page
   - Redirect from Toss Payments
   - Confirmation message
   - Receipt display
   - CTA: "Go to Dashboard"

4. **`/payment/cancel`** - Payment cancelled page
   - User cancelled during Toss checkout
   - Reason feedback form (optional)
   - CTA: "Try Again" or "Return to Dashboard"

**Required Components:**
```tsx
components/billing/
├── PricingCard.tsx           # Reusable pricing tier display
├── PricingTable.tsx          # Feature comparison table
├── UpgradeModal.tsx          # Quick upgrade prompt (modal)
├── PaymentMethodCard.tsx     # Display current payment method
├── PaymentHistoryTable.tsx   # Transaction history
└── CancelSubscriptionDialog.tsx  # Cancellation flow with retention
```

**Design Specifications:**

**Pricing Card:**
```tsx
interface PricingCardProps {
  plan: 'BETA' | 'FREE' | 'PRO' | 'TEAM';
  price: number;
  billingCycle: 'MONTHLY' | 'ANNUAL';
  features: string[];
  highlighted?: boolean; // Pro tier highlighted
  ctaText: string;
  onCTAClick: () => void;
}
```

Visual:
- Highlighted tier: `border-2 border-blue-600 shadow-xl scale-105`
- Standard tier: `border border-gray-200 shadow-sm`
- Badge for best value: `bg-blue-600 text-white px-3 py-1 rounded-full text-sm`

### 2.3 Consortium Builder (REQUIRED FOR MVP)

**Reference:** PRD v8.0 Section 3.6 - Basic Consortium Builder

**Missing Pages:**

1. **`/dashboard/consortiums`** - List view
   - Grid of consortium cards
   - Filter: "내가 주관하는 프로젝트" vs "참여 중인 프로젝트"
   - Create new button (top-right)
   - Empty state: "아직 컨소시엄이 없습니다" + CTA

2. **`/dashboard/consortiums/create`** - Multi-step creation form
   - Step 1: Project Information
     - Project name
     - Funding program selection (dropdown from FundingProgram)
     - Project description
   - Step 2: Add Members
     - Search organizations (API: `/api/partners/search`)
     - Assign roles: 주관기관 (Lead) vs 참여기관 (Participant)
     - Invite via email (for orgs not on platform)
   - Step 3: Budget Allocation
     - Total budget input
     - Split calculator (% per member)
     - Visual pie chart
   - Step 4: Review & Create

3. **`/dashboard/consortiums/[id]`** - Detail view
   - Consortium header (name, status, lead org)
   - Member list with roles
   - Budget breakdown (table + chart)
   - Actions:
     - "Invite Member"
     - "Export Consortium Info" (PDF/Excel)
     - "Edit" (if user is lead org)
     - "Leave Consortium" (if participant)

**Required Components:**
```tsx
components/consortium/
├── ConsortiumCard.tsx        # Grid card for list view
├── MemberCard.tsx            # Display member with role badge
├── BudgetCalculator.tsx      # Interactive budget split UI
├── InviteDialog.tsx          # Invite new member modal
├── MultiStepForm.tsx         # Stepper UI for create flow
└── ExportButton.tsx          # PDF/Excel export dropdown
```

**Database Schema Reference:**
```prisma
// Already exists in schema.prisma
model Consortium {
  id            String   @id @default(uuid())
  name          String
  description   String?
  fundingProgramId String?
  fundingProgram   FundingProgram? @relation(...)
  leadOrgId     String
  leadOrg       Organization @relation(...)
  members       ConsortiumMember[]
  totalBudget   Decimal?
  status        ConsortiumStatus @default(ACTIVE)
  createdAt     DateTime @default(now())
}

model ConsortiumMember {
  id             String   @id @default(uuid())
  consortiumId   String
  consortium     Consortium @relation(...)
  organizationId String
  organization   Organization @relation(...)
  role           ConsortiumRole // LEAD or PARTICIPANT
  budgetShare    Decimal?
  joinedAt       DateTime @default(now())
  status         MemberStatus @default(PENDING)
}
```

### 2.4 Partner Detail Page

**Missing Page:**
- **`/dashboard/partners/[id]`** - Individual partner profile

**Content:**
- Organization header (logo, name, type badge)
- Industry sector & employee count
- Description
- TRL level (if research institute)
- Key technologies / research focus areas
- Contact request button (sends ContactRequest)
- Similar partners section (3-5 recommendations)

**Required Components:**
```tsx
components/partners/
├── PartnerProfile.tsx        # Full profile display
├── ContactRequestDialog.tsx  # Send contact request modal
└── SimilarPartnersGrid.tsx   # Recommendations
```

### 2.5 Additional Shadcn Components Needed

**Install Commands:**
```bash
npx shadcn-ui@latest add input
npx shadcn-ui@latest add select
npx shadcn-ui@latest add textarea
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add progress
npx shadcn-ui@latest add skeleton
npx shadcn-ui@latest add alert
npx shadcn-ui@latest add breadcrumb
npx shadcn-ui@latest add separator
npx shadcn-ui@latest add sheet  # For mobile nav
npx shadcn-ui@latest add avatar
npx shadcn-ui@latest add checkbox
npx shadcn-ui@latest add radio-group
npx shadcn-ui@latest add switch
npx shadcn-ui@latest add slider
npx shadcn-ui@latest add label
```

**Usage Plan:**
- **Input/Select/Textarea:** Replace all native HTML form elements
- **Dialog:** Confirmation modals, upgrade prompts
- **Toast:** Global notification system (success, error, info)
- **Dropdown Menu:** User menu, action menus
- **Tabs:** Organize content (billing history, consortium members)
- **Progress:** Profile completion, upload progress
- **Skeleton:** Loading states for all data fetches
- **Alert:** System messages, warnings
- **Breadcrumb:** Navigation context
- **Separator:** Visual dividers
- **Sheet:** Mobile slide-out menu
- **Avatar:** User profile images

### 2.6 Mobile Responsiveness Gaps

**Current Issues:**
- ❌ No hamburger menu on mobile
- ❌ Navigation links overflow on small screens
- ❌ Forms not optimized for mobile input
- ❌ Tables don't scroll horizontally on mobile
- ❌ Modal dialogs too wide on mobile
- ❌ Font sizes not adjusted for mobile

**Required Fixes:**
- Implement Sheet component for mobile nav
- Add responsive breakpoints to all grids
- Use `text-2xl md:text-3xl lg:text-4xl` for headings
- Ensure touch targets are 44x44px minimum
- Test on iPhone SE (375px), iPhone 12 (390px), iPad (768px)

---

## 3. Comprehensive UI/UX Improvement Plan

### Phase 1: Navigation & Layout Infrastructure (Week 1)

**Priority: CRITICAL**

#### 1.1 Create DashboardLayout Component

**File:** `components/layout/DashboardLayout.tsx`

```tsx
import { ReactNode } from 'react';
import Header from './Header';
import { Toaster } from '@/components/ui/toaster';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
      <Toaster />
    </div>
  );
}
```

#### 1.2 Create Header Component

**File:** `components/layout/Header.tsx`

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import UserMenu from './UserMenu';
import MobileNav from './MobileNav';
import { cn } from '@/lib/utils';

const navLinks = [
  { href: '/dashboard', label: '대시보드' },
  { href: '/dashboard/matches', label: '매칭 결과' },
  { href: '/dashboard/partners', label: '파트너 검색' },
  { href: '/dashboard/consortiums', label: '컨소시엄' },
  { href: '/dashboard/billing', label: '구독 관리' },
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
                    ? 'text-blue-600 border-b-2 border-blue-600'
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
```

#### 1.3 Create UserMenu Component

**File:** `components/layout/UserMenu.tsx`

```tsx
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
        {/* Admin only */}
        {(session.user as any)?.role === 'ADMIN' && (
          <DropdownMenuItem onClick={() => router.push('/dashboard/admin/scraping')}>
            관리자
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
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
```

#### 1.4 Create MobileNav Component

**File:** `components/layout/MobileNav.tsx`

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface NavLink {
  href: string;
  label: string;
}

interface MobileNavProps {
  navLinks: NavLink[];
}

export default function MobileNav({ navLinks }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild className="md:hidden">
        <Button variant="ghost" size="icon">
          <Menu className="h-5 w-5" />
          <span className="sr-only">메뉴 열기</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[300px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle>메뉴</SheetTitle>
        </SheetHeader>
        <nav className="mt-6 flex flex-col gap-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={cn(
                'rounded-lg px-4 py-3 text-sm font-medium transition-colors',
                pathname === link.href
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
```

#### 1.5 Migrate All Dashboard Pages

**Update each dashboard page to use the layout:**

```tsx
// app/dashboard/page.tsx
import DashboardLayout from '@/components/layout/DashboardLayout';

export default function DashboardPage() {
  return (
    <DashboardLayout>
      {/* Remove custom header, keep only main content */}
      <div className="space-y-6">
        {/* Content here */}
      </div>
    </DashboardLayout>
  );
}
```

**Pages to update:**
- ✅ `/dashboard/page.tsx`
- ✅ `/dashboard/matches/page.tsx`
- ✅ `/dashboard/partners/page.tsx`
- ✅ `/dashboard/profile/edit/page.tsx`
- ✅ `/dashboard/settings/notifications/page.tsx`
- ✅ `/dashboard/admin/scraping/page.tsx`

---

### Phase 2: Complete Missing Pages (Week 2)

#### 2.1 Billing System

**Step 1: Install Shadcn Components**
```bash
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add separator
```

**Step 2: Create Billing Dashboard**

**File:** `app/dashboard/billing/page.tsx`

*(Full implementation provided in separate implementation guide)*

**Key Features:**
- Current plan card with badge
- Next billing date countdown
- Payment method display (masked card number)
- Usage stats: "5/∞ 매칭 생성" for Pro users
- Payment history table with Tabs (전체/성공/실패)
- Upgrade/downgrade CTAs

**Step 3: Create Upgrade Page**

**File:** `app/dashboard/billing/upgrade/page.tsx`

**Layout:**
```tsx
<div className="grid md:grid-cols-4 gap-6">
  <PricingCard plan="BETA" price={4900} highlighted={false} />
  <PricingCard plan="FREE" price={0} highlighted={false} />
  <PricingCard plan="PRO" price={12900} highlighted={true} />
  <PricingCard plan="TEAM" price={49900} highlighted={false} />
</div>
```

**Feature Matrix:**
- Matches per month
- Data freshness (2x daily vs 4x peak)
- Partner search limits
- Email notifications (weekly vs real-time)
- Consortium builder access
- Support level

**Step 4: Create Components**

**File:** `components/billing/PricingCard.tsx`
**File:** `components/billing/UpgradeModal.tsx`
**File:** `components/billing/PaymentMethodCard.tsx`

*(Full implementations provided separately)*

#### 2.2 Consortium Builder

**Step 1: Create List Page**

**File:** `app/dashboard/consortiums/page.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ConsortiumCard from '@/components/consortium/ConsortiumCard';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default function ConsortiumsPage() {
  const router = useRouter();
  const [consortiums, setConsortiums] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConsortiums();
  }, []);

  async function fetchConsortiums() {
    try {
      const res = await fetch('/api/consortiums');
      const data = await res.json();
      setConsortiums(data.consortiums || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">컨소시엄</h1>
            <p className="mt-2 text-gray-600">
              협력 프로젝트를 구성하고 관리하세요
            </p>
          </div>
          <Button onClick={() => router.push('/dashboard/consortiums/create')}>
            <Plus className="mr-2 h-4 w-4" />
            컨소시엄 생성
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">전체</TabsTrigger>
            <TabsTrigger value="lead">주관 프로젝트</TabsTrigger>
            <TabsTrigger value="participant">참여 프로젝트</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            {loading ? (
              <div>Loading...</div>
            ) : consortiums.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {consortiums.map((consortium) => (
                  <ConsortiumCard key={consortium.id} consortium={consortium} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
```

**Step 2: Create Form Page**

**File:** `app/dashboard/consortiums/create/page.tsx`

Multi-step form with:
1. Project info (name, description, funding program)
2. Add members (search + invite)
3. Budget allocation
4. Review & submit

**Step 3: Create Detail Page**

**File:** `app/dashboard/consortiums/[id]/page.tsx`

Display:
- Consortium header
- Member list with roles
- Budget breakdown (table + chart)
- Export button (PDF/Excel)

**Step 4: Create Components**

**Files:**
- `components/consortium/ConsortiumCard.tsx`
- `components/consortium/MemberCard.tsx`
- `components/consortium/BudgetCalculator.tsx`
- `components/consortium/InviteDialog.tsx`
- `components/consortium/MultiStepForm.tsx`

#### 2.3 Partner Detail Page

**File:** `app/dashboard/partners/[id]/page.tsx`

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Building2, Users, Briefcase, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ContactRequestDialog from '@/components/partners/ContactRequestDialog';
import SimilarPartnersGrid from '@/components/partners/SimilarPartnersGrid';

export default function PartnerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchOrganization(params.id as string);
    }
  }, [params.id]);

  async function fetchOrganization(id: string) {
    try {
      const res = await fetch(`/api/partners/${id}`);
      const data = await res.json();
      setOrg(data.organization);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <DashboardLayout><div>Loading...</div></DashboardLayout>;
  if (!org) return <DashboardLayout><div>Not found</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          뒤로 가기
        </Button>

        {/* Organization Header */}
        <div className="rounded-xl bg-white p-8 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-6">
              {org.logoUrl && (
                <img
                  src={org.logoUrl}
                  alt={org.name}
                  className="h-20 w-20 rounded-lg object-cover"
                />
              )}
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">{org.name}</h1>
                  <Badge variant={org.type === 'COMPANY' ? 'default' : 'secondary'}>
                    {org.type === 'COMPANY' ? '🏢 기업' : '🔬 연구소'}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Briefcase className="h-4 w-4" />
                    {org.industrySector}
                  </span>
                  {org.employeeCount && (
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {formatEmployeeCount(org.employeeCount)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <ContactRequestDialog organizationId={org.id} />
          </div>

          <Separator className="my-6" />

          {/* Description */}
          {org.description && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">조직 소개</h3>
              <p className="text-gray-600 leading-relaxed">{org.description}</p>
            </div>
          )}

          {/* Key Info Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {org.technologyReadinessLevel && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">기술성숙도</h4>
                <p className="text-lg font-semibold text-blue-600">
                  TRL {org.technologyReadinessLevel}
                </p>
              </div>
            )}
            {org.rdExperience && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">R&D 경험</h4>
                <Badge variant="success">정부 R&D 과제 수행 경험 보유</Badge>
              </div>
            )}
          </div>

          {/* Research Focus / Key Technologies */}
          {(org.researchFocusAreas?.length > 0 || org.keyTechnologies?.length > 0) && (
            <>
              <Separator className="my-6" />
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  {org.type === 'RESEARCH_INSTITUTE' ? '연구 분야' : '핵심 기술'}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {(org.researchFocusAreas || org.keyTechnologies || []).map((item, idx) => (
                    <Badge key={idx} variant="outline">{item}</Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Similar Partners */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            유사한 파트너
          </h2>
          <SimilarPartnersGrid currentOrgId={org.id} industry={org.industrySector} />
        </div>
      </div>
    </DashboardLayout>
  );
}
```

---

### Phase 3: Design System Refinement (Week 3)

#### 3.1 Consistent Color System

**Update:** `tailwind.config.js`

```javascript
colors: {
  // ... existing Shadcn colors ...

  // Semantic colors for Connect Platform
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
  },
  warning: {
    50: '#fefce8',
    100: '#fef9c3',
    500: '#eab308',
    600: '#ca8a04',
    700: '#a16207',
  },
  info: {
    50: '#f5f3ff',
    100: '#ede9fe',
    500: '#a855f7',
    600: '#9333ea',
    700: '#7e22ce',
  },
}
```

**Usage Guidelines:**
- **Primary Actions:** `bg-blue-600 hover:bg-blue-700 text-white`
- **Success States:** `bg-success-600` (matches found, payment success)
- **Warning States:** `bg-warning-500` (deadline approaching, low usage)
- **Danger States:** `bg-destructive` (errors, delete actions)
- **Info States:** `bg-info-600` (new features, tips)

#### 3.2 Typography Scale

**Apply consistently:**
```tsx
// Page Titles
<h1 className="text-3xl font-bold text-gray-900">

// Section Titles
<h2 className="text-2xl font-bold text-gray-900">

// Card Titles
<h3 className="text-lg font-semibold text-gray-900">

// Body Text
<p className="text-gray-600">

// Small Text / Captions
<p className="text-sm text-gray-500">

// Labels
<label className="text-sm font-medium text-gray-700">
```

#### 3.3 Spacing System

**Apply consistently:**
- Section spacing: `space-y-8` (32px)
- Card spacing: `space-y-6` (24px)
- Form field spacing: `space-y-4` (16px)
- Grid gaps: `gap-6` (24px) for cards, `gap-4` (16px) for small items
- Padding: `p-6` for cards, `p-8` for page containers

#### 3.4 Component Variants

**Button Standards:**
```tsx
// Primary
<Button variant="default">...</Button>

// Secondary
<Button variant="outline">...</Button>

// Danger
<Button variant="destructive">...</Button>

// Ghost (low emphasis)
<Button variant="ghost">...</Button>

// Sizes
<Button size="sm">...</Button>  // Small
<Button size="default">...</Button>  // Medium (default)
<Button size="lg">...</Button>  // Large
```

**Card Standards:**
```tsx
// Standard Card
<Card className="p-6">
  <CardHeader>
    <CardTitle>...</CardTitle>
    <CardDescription>...</CardDescription>
  </CardHeader>
  <CardContent>...</CardContent>
  <CardFooter>...</CardFooter>
</Card>

// Interactive Card (clickable)
<Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
  ...
</Card>

// Highlighted Card
<Card className="p-6 border-2 border-blue-600 shadow-xl">
  ...
</Card>
```

#### 3.5 Loading & Empty States

**Standard Loading State:**
```tsx
import { Skeleton } from '@/components/ui/skeleton';

function LoadingState() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}
```

**Standard Empty State:**
```tsx
import { FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 rounded-full bg-gray-100 p-4">
        <FileQuestion className="h-12 w-12 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        아직 데이터가 없습니다
      </h3>
      <p className="text-gray-600 mb-6 max-w-md">
        새로운 항목을 생성하여 시작하세요.
      </p>
      <Button onClick={handleCreate}>
        생성하기
      </Button>
    </div>
  );
}
```

---

### Phase 4: Landing Page Enhancement (Week 3)

**File:** `app/page.tsx`

**Transform from:** Basic 3-card grid → **Full marketing page**

**New Structure:**
```tsx
export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <HeroSection />

      {/* Features Grid */}
      <FeaturesSection />

      {/* Pricing Preview */}
      <PricingSection />

      {/* Agencies Covered */}
      <AgenciesSection />

      {/* Social Proof */}
      <TestimonialsSection />

      {/* Footer */}
      <Footer />
    </div>
  );
}
```

**Hero Section:**
```tsx
function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50 py-20 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              한국 R&D 자금 매칭의
              <span className="text-blue-600"> 새로운 기준</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              4개 주요 기관의 정부 R&D 지원 프로그램을 실시간으로 모니터링하고,
              AI 기반 설명 가능한 매칭으로 최적의 기회를 놓치지 마세요.
            </p>
            <div className="mt-10 flex items-center gap-x-6">
              <Button size="lg" asChild>
                <Link href="/auth/signin">
                  무료로 시작하기
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="#pricing">
                  가격 보기
                </Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              신용카드 불필요 • 무료 플랜으로 시작
            </p>
          </div>
          <div className="relative lg:h-[500px]">
            {/* Screenshot or illustration */}
            <img
              src="/images/dashboard-preview.png"
              alt="Connect Dashboard"
              className="rounded-2xl shadow-2xl"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
```

**Features Grid:**
```tsx
const features = [
  {
    icon: Target,
    title: '설명 가능한 매칭',
    description: '매칭 점수뿐만 아니라 "왜" 적합한지 한국어로 설명합니다.',
  },
  {
    icon: Clock,
    title: '실시간 알림',
    description: '마감일 7일, 3일, 1일 전에 리마인더를 받아 기회를 놓치지 마세요.',
  },
  {
    icon: Users,
    title: '파트너 발견',
    description: '컨소시엄 구성에 필요한 협력 기관을 쉽게 찾고 연결하세요.',
  },
  // ... 3 more
];
```

**Pricing Section:**
```tsx
<section id="pricing" className="py-24 bg-gray-50">
  <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <div className="text-center mb-16">
      <h2 className="text-3xl font-bold text-gray-900">
        명확하고 투명한 가격
      </h2>
      <p className="mt-4 text-lg text-gray-600">
        성장에 맞춰 확장할 수 있는 플랜
      </p>
    </div>
    <div className="grid md:grid-cols-4 gap-8">
      <PricingCard plan="BETA" ... />
      <PricingCard plan="FREE" ... />
      <PricingCard plan="PRO" highlighted ... />
      <PricingCard plan="TEAM" ... />
    </div>
  </div>
</section>
```

---

### Phase 5: Mobile Optimization & Accessibility (Week 4)

#### 5.1 Mobile Breakpoint Strategy

**Tailwind Breakpoints:**
- `sm: 640px` - Small tablets
- `md: 768px` - Medium tablets
- `lg: 1024px` - Laptops
- `xl: 1280px` - Desktops
- `2xl: 1536px` - Large desktops

**Apply to All Components:**
```tsx
// Grids
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">

// Typography
<h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">

// Padding
<div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">

// Flex Direction
<div className="flex flex-col md:flex-row gap-4">
```

#### 5.2 Touch Target Optimization

**Ensure all interactive elements are ≥44x44px:**
```tsx
// Buttons (already compliant)
<Button size="default"> // h-10 (40px) + padding ≥ 44px
<Button size="lg"> // h-11 (44px)

// Icon Buttons
<Button size="icon" className="h-11 w-11"> // 44x44px

// Links
<Link className="inline-flex items-center justify-center min-h-[44px] min-w-[44px]">
```

#### 5.3 Accessibility Checklist

**ARIA Labels:**
```tsx
// Navigation
<nav aria-label="Main navigation">

// Buttons without text
<Button aria-label="메뉴 닫기">
  <X className="h-4 w-4" />
</Button>

// Form fields
<label htmlFor="email">이메일</label>
<input id="email" type="email" aria-describedby="email-help" />
<p id="email-help" className="text-sm text-gray-500">
  로그인에 사용할 이메일 주소
</p>
```

**Keyboard Navigation:**
- Tab order follows visual order
- Focus visible styles: `focus-visible:ring-2 focus-visible:ring-blue-600`
- Escape key closes modals
- Arrow keys navigate dropdowns

**Color Contrast:**
- Text on white: `text-gray-900` (21:1 ratio) ✅
- Secondary text: `text-gray-600` (7:1 ratio) ✅
- Links: `text-blue-600` (8:1 ratio) ✅
- Ensure buttons have 3:1 contrast with background

**Screen Reader Support:**
- Use semantic HTML (`<nav>`, `<main>`, `<header>`, `<footer>`)
- Add `alt` text to all images
- Use `<h1>`-`<h6>` in hierarchical order
- Mark decorative images with `alt=""` and `aria-hidden="true"`

#### 5.4 Responsive Tables

**Problem:** Tables overflow on mobile

**Solution:** Use card layout on mobile
```tsx
<div className="hidden md:block">
  <Table>...</Table>
</div>
<div className="md:hidden space-y-4">
  {items.map(item => (
    <Card key={item.id}>
      <CardContent className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-sm text-gray-500">Date</p>
          <p className="font-medium">{item.date}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Amount</p>
          <p className="font-medium">{item.amount}</p>
        </div>
      </CardContent>
    </Card>
  ))}
</div>
```

---

## 4. Implementation Roadmap

### Week 1: Foundation (Jan 3-9)
**Goal:** Unified navigation & layout system

- [x] Day 1-2: Install all Shadcn components
- [x] Day 2-3: Build DashboardLayout + Header + UserMenu + MobileNav
- [x] Day 3-4: Migrate all 7 dashboard pages to DashboardLayout
- [x] Day 4-5: Add Toaster provider and replace alerts with toasts
- [x] Day 5: QA navigation on desktop & mobile

**Deliverables:**
- ✅ All dashboard pages use DashboardLayout
- ✅ Sticky header with navigation links
- ✅ Mobile hamburger menu working
- ✅ User dropdown menu with profile/settings/logout
- ✅ Active link highlighting

---

### Week 2: Critical Features (Jan 10-16)
**Goal:** Billing & Consortium pages complete

- [x] Day 1-2: Build `/dashboard/billing` (subscription dashboard)
- [x] Day 2-3: Build `/dashboard/billing/upgrade` (pricing page)
- [x] Day 3: Build payment success/cancel pages
- [x] Day 4-5: Build `/dashboard/consortiums` (list + create + detail)
- [x] Day 5: Build `/dashboard/partners/[id]` (detail page)

**Deliverables:**
- ✅ Users can view subscription status and payment history
- ✅ Users can upgrade/downgrade plans
- ✅ Users can create and manage consortiums
- ✅ Users can view partner details and send contact requests

---

### Week 3: Polish & Design System (Jan 17-23)
**Goal:** Consistent design, enhanced landing page

- [x] Day 1-2: Apply consistent color system across all pages
- [x] Day 2-3: Apply consistent typography & spacing
- [x] Day 3-4: Add loading skeletons and empty states everywhere
- [x] Day 4-5: Enhance landing page with hero, features, pricing sections

**Deliverables:**
- ✅ All pages follow design system guidelines
- ✅ No more color/spacing inconsistencies
- ✅ Professional loading & empty states
- ✅ Marketing-ready landing page

---

### Week 4: Mobile & Accessibility (Jan 24-30)
**Goal:** Mobile-responsive, accessible platform

- [x] Day 1-2: Test and fix responsive breakpoints on all pages
- [x] Day 2-3: Optimize touch targets (44x44px minimum)
- [x] Day 3-4: Accessibility audit (ARIA labels, keyboard nav, contrast)
- [x] Day 4-5: Final QA on iOS Safari, Android Chrome, Desktop browsers

**Deliverables:**
- ✅ All pages responsive on mobile/tablet/desktop
- ✅ WCAG 2.1 AA compliant
- ✅ Keyboard navigation working
- ✅ Touch-friendly on mobile devices

---

## 5. Design System Specifications

### 5.1 Color Palette

```typescript
// Primary Brand Color
primary: {
  50: '#eff6ff',
  100: '#dbeafe',
  500: '#3b82f6',
  600: '#2563eb',  // Main brand blue
  700: '#1d4ed8',
}

// Semantic Colors
success: '#16a34a',  // Green-600
warning: '#ca8a04',  // Yellow-600
danger: '#dc2626',   // Red-600
info: '#9333ea',     // Purple-600

// Neutral Grays
gray: {
  50: '#f9fafb',
  100: '#f3f4f6',
  200: '#e5e7eb',
  300: '#d1d5db',
  400: '#9ca3af',
  500: '#6b7280',
  600: '#4b5563',
  700: '#374151',
  800: '#1f2937',
  900: '#111827',
}
```

### 5.2 Typography

**Font Stack:**
```css
font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

**Type Scale:**
```css
/* Headings */
h1: 36px / 40px (2.25rem / 2.5rem)
h2: 30px / 36px (1.875rem / 2.25rem)
h3: 24px / 32px (1.5rem / 2rem)
h4: 20px / 28px (1.25rem / 1.75rem)

/* Body */
base: 16px / 28px (1rem / 1.75rem)
small: 14px / 20px (0.875rem / 1.25rem)
tiny: 12px / 16px (0.75rem / 1rem)

/* Weights */
regular: 400
medium: 500
semibold: 600
bold: 700
```

**Letter Spacing:**
- Headings: `-0.025em`
- Body: `-0.01em`
- Small text: `0`

### 5.3 Spacing Scale

Based on 4px grid (Tailwind defaults):

```
1 = 4px
2 = 8px
3 = 12px
4 = 16px
5 = 20px
6 = 24px
8 = 32px
10 = 40px
12 = 48px
16 = 64px
20 = 80px
24 = 96px
```

**Common Usages:**
- Form field gap: `gap-4` (16px)
- Card padding: `p-6` (24px)
- Section spacing: `space-y-8` (32px)
- Page padding: `py-12` (48px)

### 5.4 Border Radius

```
sm: 4px
default: 6px
md: 8px
lg: 12px
xl: 16px
2xl: 24px
full: 9999px
```

**Common Usages:**
- Buttons: `rounded-lg` (12px)
- Cards: `rounded-xl` (16px)
- Inputs: `rounded-lg` (12px)
- Avatars: `rounded-full`
- Badges: `rounded-full`

### 5.5 Shadows

```css
/* Tailwind shadows */
shadow-sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)'
shadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)'
shadow-md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
shadow-lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)'
shadow-xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'
```

**Common Usages:**
- Cards (default): `shadow-sm`
- Cards (hover): `shadow-md`
- Highlighted cards: `shadow-xl`
- Dropdowns/modals: `shadow-lg`

---

## 6. Technical Architecture

### 6.1 Component File Structure

```
components/
├── ui/                      # Shadcn UI primitives
│   ├── button.tsx
│   ├── card.tsx
│   ├── input.tsx
│   ├── dialog.tsx
│   ├── toast.tsx
│   ├── dropdown-menu.tsx
│   ├── tabs.tsx
│   ├── progress.tsx
│   ├── skeleton.tsx
│   ├── alert.tsx
│   ├── breadcrumb.tsx
│   ├── separator.tsx
│   ├── sheet.tsx
│   ├── avatar.tsx
│   └── ... (20+ total)
│
├── layout/                  # Layout components
│   ├── DashboardLayout.tsx
│   ├── Header.tsx
│   ├── Sidebar.tsx (optional)
│   ├── MobileNav.tsx
│   ├── UserMenu.tsx
│   ├── Breadcrumb.tsx
│   └── Footer.tsx
│
├── billing/                 # Billing feature components
│   ├── PricingCard.tsx
│   ├── PricingTable.tsx
│   ├── UpgradeModal.tsx
│   ├── PaymentMethodCard.tsx
│   ├── PaymentHistoryTable.tsx
│   └── CancelSubscriptionDialog.tsx
│
├── consortium/              # Consortium feature components
│   ├── ConsortiumCard.tsx
│   ├── MemberCard.tsx
│   ├── BudgetCalculator.tsx
│   ├── InviteDialog.tsx
│   ├── MultiStepForm.tsx
│   └── ExportButton.tsx
│
├── partners/                # Partner feature components
│   ├── PartnerProfile.tsx
│   ├── ContactRequestDialog.tsx
│   └── SimilarPartnersGrid.tsx
│
└── shared/                  # Shared utility components
    ├── LoadingState.tsx
    ├── EmptyState.tsx
    ├── ErrorState.tsx
    └── Pagination.tsx
```

### 6.2 Page File Structure

```
app/
├── (public)/
│   ├── page.tsx             # Landing page
│   ├── pricing/
│   │   └── page.tsx         # Public pricing page
│   └── auth/
│       ├── signin/page.tsx
│       ├── welcome/page.tsx
│       └── error/page.tsx
│
├── dashboard/
│   ├── page.tsx             # Dashboard home
│   ├── matches/
│   │   └── page.tsx
│   ├── partners/
│   │   ├── page.tsx         # Search
│   │   └── [id]/page.tsx    # Detail
│   ├── consortiums/
│   │   ├── page.tsx         # List
│   │   ├── create/page.tsx
│   │   └── [id]/page.tsx    # Detail
│   ├── billing/
│   │   ├── page.tsx         # Subscription dashboard
│   │   └── upgrade/page.tsx # Pricing comparison
│   ├── profile/
│   │   ├── create/page.tsx
│   │   └── edit/page.tsx
│   ├── settings/
│   │   └── notifications/page.tsx
│   └── admin/
│       └── scraping/page.tsx
│
└── payment/
    ├── success/page.tsx
    └── cancel/page.tsx
```

### 6.3 State Management

**Current Approach:** Client-side React state with `useState` + `useEffect`

**For Complex Features (Consortium, Billing):**
Consider adding:
- **React Query (TanStack Query)** for server state management
  - Automatic caching
  - Background refetching
  - Optimistic updates
  - Mutation handling

**Example:**
```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

function ConsortiumsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['consortiums'],
    queryFn: () => fetch('/api/consortiums').then(res => res.json()),
  });

  const createMutation = useMutation({
    mutationFn: (newConsortium) =>
      fetch('/api/consortiums', {
        method: 'POST',
        body: JSON.stringify(newConsortium),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consortiums'] });
    },
  });

  // ...
}
```

**Benefits:**
- Eliminates manual `useState` + `useEffect` boilerplate
- Automatic loading/error states
- Built-in cache invalidation
- Better UX with optimistic updates

### 6.4 Form Validation

**Current Approach:** React Hook Form + Zod (✅ Good!)

**Continue using for all forms:**
```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const schema = z.object({
  name: z.string().min(2, '이름은 2자 이상이어야 합니다'),
  email: z.string().email('올바른 이메일 주소를 입력하세요'),
});

type FormData = z.infer<typeof schema>;

function MyForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  // ...
}
```

**For Shadcn Forms:** Use `Form` component wrapper
```tsx
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';

<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)}>
    <FormField
      control={form.control}
      name="name"
      render={({ field }) => (
        <FormItem>
          <FormLabel>이름</FormLabel>
          <FormControl>
            <Input {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  </form>
</Form>
```

---

## 7. Testing & QA Checklist

### 7.1 Browser Compatibility

**Test on:**
- ✅ Chrome (latest)
- ✅ Safari (latest) - macOS & iOS
- ✅ Firefox (latest)
- ✅ Edge (latest)

**Critical Pages:**
- Landing page
- Sign in flow
- Dashboard
- Match generation
- Billing/payment flow
- Consortium creation

### 7.2 Device Testing

**Devices:**
- ✅ iPhone SE (375px width)
- ✅ iPhone 12/13/14 (390px width)
- ✅ iPad (768px width)
- ✅ Desktop (1280px+ width)

**Test Scenarios:**
- Navigation menu (hamburger on mobile)
- Form inputs (comfortable touch targets)
- Tables (card layout on mobile)
- Modals (full-screen on mobile)

### 7.3 Accessibility Testing

**Tools:**
- Chrome DevTools Lighthouse (Accessibility score ≥90)
- axe DevTools extension
- Keyboard-only navigation test
- Screen reader test (VoiceOver on macOS/iOS)

**Critical Flows:**
- Sign in with keyboard only
- Generate matches with keyboard only
- Navigate to billing page with keyboard only
- Create consortium with keyboard only

### 7.4 Performance Testing

**Metrics:**
- Lighthouse Performance score ≥90
- First Contentful Paint (FCP) < 1.5s
- Largest Contentful Paint (LCP) < 2.5s
- Time to Interactive (TTI) < 3.5s
- Cumulative Layout Shift (CLS) < 0.1

**Optimization:**
- Use Next.js Image component for all images
- Lazy load components below the fold
- Code-split large pages with dynamic imports
- Minimize JavaScript bundle size

---

## 8. Success Criteria

### 8.1 Completion Checklist

**Navigation (Week 1):**
- [ ] DashboardLayout wraps all dashboard pages
- [ ] Header with logo + nav links implemented
- [ ] UserMenu dropdown working
- [ ] MobileNav hamburger menu working
- [ ] Active link highlighting functional
- [ ] All 7 pages migrated to new layout

**Missing Pages (Week 2):**
- [ ] `/dashboard/billing` - subscription dashboard complete
- [ ] `/dashboard/billing/upgrade` - pricing page complete
- [ ] `/payment/success` + `/payment/cancel` - redirect pages complete
- [ ] `/dashboard/consortiums` - list page complete
- [ ] `/dashboard/consortiums/create` - multi-step form complete
- [ ] `/dashboard/consortiums/[id]` - detail page complete
- [ ] `/dashboard/partners/[id]` - partner detail complete

**Design System (Week 3):**
- [ ] Consistent color usage across all pages
- [ ] Consistent typography applied
- [ ] Consistent spacing applied
- [ ] Loading skeletons added to all data fetches
- [ ] Empty states added to all list pages
- [ ] Landing page enhanced with marketing content

**Mobile & A11y (Week 4):**
- [ ] All pages responsive on mobile/tablet/desktop
- [ ] Touch targets ≥44x44px
- [ ] ARIA labels on all interactive elements
- [ ] Keyboard navigation working
- [ ] Color contrast meets WCAG AA (4.5:1)
- [ ] Screen reader compatible

### 8.2 Quality Gates

**Before Week 1 Complete:**
- Navigation must work on mobile & desktop
- No console errors
- All pages load without layout shift

**Before Week 2 Complete:**
- All new pages functional
- Forms submit successfully
- API integrations working

**Before Week 3 Complete:**
- Design system applied consistently
- No color/spacing inconsistencies
- Landing page ready for marketing

**Before Week 4 Complete:**
- Lighthouse Accessibility score ≥90
- Mobile usability score ≥95
- No critical a11y violations

---

## 9. Future Enhancements (Post-MVP)

### 9.1 Advanced Features

**Dark Mode:**
- Add theme toggle in UserMenu
- Use `next-themes` package
- Define dark color palette in globals.css
- Test all pages in dark mode

**Internationalization (i18n):**
- Add English language support
- Use `next-intl` or `next-i18next`
- Translate all UI strings
- Support Korean (ko) and English (en)

**Advanced Search:**
- Full-text search with Algolia or Meilisearch
- Filters: industry, TRL, budget range, deadline
- Saved searches
- Search history

**Notifications Center:**
- In-app notification panel
- Real-time updates with WebSockets
- Mark as read/unread
- Notification preferences per type

### 9.2 Performance Optimizations

**Image Optimization:**
- Convert all images to WebP
- Use Next.js Image with priority for above-fold images
- Lazy load images below the fold
- Implement blur placeholders

**Code Splitting:**
- Dynamic imports for heavy components
- Route-based code splitting (automatic with Next.js)
- Vendor bundle optimization

**Caching Strategy:**
- Redis caching for match results (already planned)
- Incremental Static Regeneration (ISR) for landing page
- API route caching with stale-while-revalidate

---

## 10. Appendix

### 10.1 Reference Documentation

**Internal Docs:**
- [PRD v8.0](../current/PRD_v8.0.md) - Product requirements
- [Phase 1A Implementation](./phase1a-infrastructure.md) - Infrastructure setup
- [Phase 2A Implementation](./phase2a-match-generation.md) - Match generation

**External Resources:**
- [Shadcn UI Docs](https://ui.shadcn.com/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [React Hook Form Docs](https://react-hook-form.com/)

### 10.2 Glossary

- **Shadcn UI:** Component library built on Radix UI primitives
- **TRL:** Technology Readiness Level (1-9 scale)
- **컨소시엄 (Consortium):** Collaborative project between organizations
- **주관기관 (Lead Org):** Primary organization leading a consortium
- **참여기관 (Participant Org):** Secondary organization in consortium
- **WCAG:** Web Content Accessibility Guidelines
- **ARIA:** Accessible Rich Internet Applications

### 10.3 Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-03 | Frontend Team | Initial frontend UI/UX optimization plan |

---

**Document Status:** ✅ Ready for Implementation
**Next Steps:** Begin Week 1 implementation - Install Shadcn components and build DashboardLayout

**Questions or Feedback:** Contact development team or create an issue in the project repository.
