# Frontend Week 1 Execution Plan - Navigation & Layout System

**Start Date:** 2025-01-03
**End Date:** 2025-01-09
**Status:** 🟡 Ready to Start
**Goal:** Unified navigation system and layout infrastructure

**Reference:** See [Frontend UI/UX Optimization Plan](../implementation/frontend-ui-ux-optimization.md) for complete details

---

## 📊 Progress Overview

**Overall Progress:** 0% (0/8 tasks complete)

- [ ] **Phase 1:** Install Shadcn Components (0%)
- [ ] **Phase 2:** Build Navigation Components (0%)
- [ ] **Phase 3:** Migrate Existing Pages (0%)
- [ ] **Phase 4:** Toast System Setup (0%)

---

## Phase 1: Install Shadcn Components

**Estimated Time:** 30 minutes
**Status:** ⬜ Not Started

### Tasks

- [ ] **1.1** Install form components
  ```bash
  npx shadcn-ui@latest add input
  npx shadcn-ui@latest add select
  npx shadcn-ui@latest add textarea
  npx shadcn-ui@latest add label
  ```

- [ ] **1.2** Install interaction components
  ```bash
  npx shadcn-ui@latest add dialog
  npx shadcn-ui@latest add dropdown-menu
  npx shadcn-ui@latest add sheet
  npx shadcn-ui@latest add tabs
  ```

- [ ] **1.3** Install feedback components
  ```bash
  npx shadcn-ui@latest add toast
  npx shadcn-ui@latest add alert
  npx shadcn-ui@latest add skeleton
  npx shadcn-ui@latest add progress
  ```

- [ ] **1.4** Install utility components
  ```bash
  npx shadcn-ui@latest add avatar
  npx shadcn-ui@latest add separator
  npx shadcn-ui@latest add breadcrumb
  npx shadcn-ui@latest add checkbox
  npx shadcn-ui@latest add radio-group
  npx shadcn-ui@latest add switch
  npx shadcn-ui@latest add slider
  ```

**Completion Criteria:**
- ✅ All components installed in `components/ui/`
- ✅ No installation errors
- ✅ All imports compile successfully

---

## Phase 2: Build Navigation Components

**Estimated Time:** 4-6 hours
**Status:** ⬜ Not Started

### Task 2.1: Create DashboardLayout Component

**File:** `components/layout/DashboardLayout.tsx`

**Status:** ⬜ Not Started

**Implementation Checklist:**
- [ ] Create file structure
- [ ] Import Header component
- [ ] Add Toaster component
- [ ] Implement children wrapper with max-w-7xl container
- [ ] Add TypeScript types for props
- [ ] Test basic rendering

**Code Reference:**
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

**Testing:**
- [ ] Component renders without errors
- [ ] Container has correct max-width
- [ ] Background color applied correctly

---

### Task 2.2: Create Header Component

**File:** `components/layout/Header.tsx`

**Status:** ⬜ Not Started

**Implementation Checklist:**
- [ ] Create file structure
- [ ] Define navigation links array
- [ ] Implement sticky header (sticky top-0 z-50)
- [ ] Add logo (Link to /dashboard)
- [ ] Add desktop navigation (hidden md:flex)
- [ ] Integrate UserMenu component
- [ ] Integrate MobileNav component
- [ ] Implement active link highlighting using usePathname
- [ ] Add backdrop blur effect (bg-white/95 backdrop-blur)

**Navigation Links:**
```tsx
const navLinks = [
  { href: '/dashboard', label: '대시보드' },
  { href: '/dashboard/matches', label: '매칭 결과' },
  { href: '/dashboard/partners', label: '파트너 검색' },
  { href: '/dashboard/consortiums', label: '컨소시엄' },
  { href: '/dashboard/billing', label: '구독 관리' },
];
```

**Styling Requirements:**
- [ ] Sticky header with backdrop blur
- [ ] Border bottom (border-b)
- [ ] Height: h-16
- [ ] Active link: blue-600 with border-b-2
- [ ] Inactive link: gray-600 with hover:text-blue-600

**Testing:**
- [ ] Header sticks to top on scroll
- [ ] Active link highlights correctly
- [ ] Desktop nav visible on ≥768px
- [ ] Desktop nav hidden on <768px
- [ ] Logo links to /dashboard

---

### Task 2.3: Create UserMenu Component

**File:** `components/layout/UserMenu.tsx`

**Status:** ⬜ Not Started

**Implementation Checklist:**
- [ ] Create file structure
- [ ] Import DropdownMenu from Shadcn
- [ ] Import Avatar from Shadcn
- [ ] Get session using useSession()
- [ ] Calculate user initials from name
- [ ] Implement dropdown trigger with avatar
- [ ] Add menu items: Profile Edit, Notification Settings
- [ ] Add admin menu item (conditional on role)
- [ ] Add separator before logout
- [ ] Implement logout handler with signOut()

**Menu Items:**
1. **Label:** "내 계정"
2. **Item:** 프로필 수정 → /dashboard/profile/edit
3. **Item:** 알림 설정 → /dashboard/settings/notifications
4. **Item (Admin only):** 관리자 → /dashboard/admin/scraping
5. **Separator**
6. **Item (red):** 로그아웃

**Testing:**
- [ ] Dropdown opens on click
- [ ] Avatar shows user image or initials
- [ ] All menu items navigate correctly
- [ ] Admin item only shows for ADMIN role
- [ ] Logout redirects to /auth/signin
- [ ] Dropdown closes after selection

---

### Task 2.4: Create MobileNav Component

**File:** `components/layout/MobileNav.tsx`

**Status:** ⬜ Not Started

**Implementation Checklist:**
- [ ] Create file structure
- [ ] Import Sheet from Shadcn
- [ ] Import Menu icon from lucide-react
- [ ] Accept navLinks as props
- [ ] Implement Sheet trigger (hamburger button)
- [ ] Style trigger: visible on mobile, hidden on desktop (md:hidden)
- [ ] Implement Sheet content with nav links
- [ ] Add active link highlighting in mobile menu
- [ ] Close sheet on link click
- [ ] Set proper sheet width (300px on sm, 400px on md)

**Styling Requirements:**
- [ ] Sheet slides from right
- [ ] Mobile only: className="md:hidden"
- [ ] Active link: bg-blue-50 text-blue-600
- [ ] Inactive link: text-gray-600 hover:bg-gray-100
- [ ] Proper padding and spacing

**Testing:**
- [ ] Hamburger icon visible on mobile (<768px)
- [ ] Hamburger icon hidden on desktop (≥768px)
- [ ] Sheet opens from right
- [ ] Links navigate correctly
- [ ] Sheet closes after link click
- [ ] Active link highlighted in mobile menu

---

### Task 2.5: Create Breadcrumb Component (Optional)

**File:** `components/layout/Breadcrumb.tsx`

**Status:** ⬜ Not Started (Optional for Week 1)

**Implementation Checklist:**
- [ ] Create file structure
- [ ] Import Breadcrumb from Shadcn
- [ ] Parse pathname to generate breadcrumbs
- [ ] Map paths to Korean labels
- [ ] Render breadcrumb trail

**Testing:**
- [ ] Breadcrumbs display correctly
- [ ] Links work on all segments except last
- [ ] Mobile: show only current page

---

## Phase 3: Migrate Existing Pages

**Estimated Time:** 2-3 hours
**Status:** ⬜ Not Started

### Task 3.1: Wrap Dashboard Home

**File:** `app/dashboard/page.tsx`

**Status:** ⬜ Not Started

**Changes:**
- [ ] Import DashboardLayout
- [ ] Wrap content with `<DashboardLayout>`
- [ ] Remove custom header code (lines 117-143)
- [ ] Keep only main content (lines 146-256)
- [ ] Test page renders correctly

**Before:**
```tsx
export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header>...</header>
      <main>...</main>
    </div>
  );
}
```

**After:**
```tsx
import DashboardLayout from '@/components/layout/DashboardLayout';

export default function DashboardPage() {
  return (
    <DashboardLayout>
      {/* Main content only */}
    </DashboardLayout>
  );
}
```

**Testing:**
- [ ] Page loads without errors
- [ ] Header shows correct navigation
- [ ] Content displays properly
- [ ] No layout shift

---

### Task 3.2: Wrap Matches Page

**File:** `app/dashboard/matches/page.tsx`

**Status:** ⬜ Not Started

**Changes:**
- [ ] Import DashboardLayout
- [ ] Wrap content with `<DashboardLayout>`
- [ ] Remove custom header code (lines 134-160)
- [ ] Keep only main content (lines 163-339)
- [ ] Remove "대시보드" button (replaced by nav)
- [ ] Test page renders correctly

**Testing:**
- [ ] Page loads without errors
- [ ] Match cards display properly
- [ ] Matches link active in header
- [ ] No duplicate headers

---

### Task 3.3: Wrap Partners Search Page

**File:** `app/dashboard/partners/page.tsx`

**Status:** ⬜ Not Started

**Changes:**
- [ ] Import DashboardLayout
- [ ] Wrap content with `<DashboardLayout>`
- [ ] Remove "← 대시보드로 돌아가기" button (lines 70-75)
- [ ] Keep search, filters, and results
- [ ] Test page renders correctly

**Testing:**
- [ ] Page loads without errors
- [ ] Search functionality works
- [ ] Partners link active in header
- [ ] Pagination works

---

### Task 3.4: Wrap Profile Edit Page

**File:** `app/dashboard/profile/edit/page.tsx`

**Status:** ⬜ Not Started

**Changes:**
- [ ] Import DashboardLayout
- [ ] Wrap content with `<DashboardLayout>`
- [ ] Keep form and all functionality
- [ ] Test page renders correctly

**Testing:**
- [ ] Page loads without errors
- [ ] Form loads user data
- [ ] Form submission works
- [ ] Redirect to /dashboard after save

---

### Task 3.5: Wrap Notification Settings Page

**File:** `app/dashboard/settings/notifications/page.tsx`

**Status:** ⬜ Not Started

**Changes:**
- [ ] Import DashboardLayout
- [ ] Wrap content with `<DashboardLayout>`
- [ ] Remove "← 대시보드로 돌아가기" button (lines 97-102)
- [ ] Keep settings form
- [ ] Test page renders correctly

**Testing:**
- [ ] Page loads without errors
- [ ] Settings load correctly
- [ ] Toggle switches work
- [ ] Save functionality works

---

### Task 3.6: Wrap Admin Scraping Page

**File:** `app/dashboard/admin/scraping/page.tsx`

**Status:** ⬜ Not Started

**Changes:**
- [ ] Import DashboardLayout
- [ ] Wrap content with `<DashboardLayout>`
- [ ] Remove custom header if present
- [ ] Test page renders correctly
- [ ] Verify admin-only access

**Testing:**
- [ ] Page loads for ADMIN users
- [ ] Page redirects for non-admin users
- [ ] Scraping controls work
- [ ] Admin menu item visible in UserMenu

---

## Phase 4: Toast System Setup

**Estimated Time:** 30 minutes
**Status:** ⬜ Not Started

### Task 4.1: Configure Toast Provider

**File:** `components/layout/DashboardLayout.tsx` (already included)

**Status:** ⬜ Not Started

**Implementation:**
- [x] Toaster already added to DashboardLayout
- [ ] Verify toast positioning (bottom-right)
- [ ] Test toast appearance

---

### Task 4.2: Create Toast Utility Hook

**File:** `lib/hooks/useToast.ts` (Shadcn auto-generated)

**Status:** ⬜ Not Started

**Verification:**
- [ ] Hook available after Shadcn toast install
- [ ] Can import from `@/components/ui/use-toast`

---

### Task 4.3: Replace Alert with Toast (Example)

**File:** `app/dashboard/page.tsx`

**Status:** ⬜ Not Started (Optional for Week 1)

**Example Migration:**

**Before:**
```tsx
{error && (
  <div className="rounded-xl bg-red-50 border border-red-200 p-4">
    <p className="text-sm text-red-600">{error}</p>
  </div>
)}
```

**After:**
```tsx
import { useToast } from '@/components/ui/use-toast';

const { toast } = useToast();

// On error:
toast({
  variant: "destructive",
  title: "오류 발생",
  description: error,
});
```

**Pages to Update (Optional):**
- [ ] Dashboard page errors
- [ ] Matches page errors
- [ ] Profile form success/error
- [ ] Settings save success

---

## Testing & QA Checklist

### Desktop Testing (≥1280px)

- [ ] **Navigation**
  - [ ] All 5 nav links visible in header
  - [ ] Active link highlighted correctly
  - [ ] Logo links to /dashboard
  - [ ] UserMenu dropdown works

- [ ] **All Pages Load Correctly**
  - [ ] /dashboard
  - [ ] /dashboard/matches
  - [ ] /dashboard/partners
  - [ ] /dashboard/profile/edit
  - [ ] /dashboard/settings/notifications
  - [ ] /dashboard/admin/scraping (admin only)

- [ ] **No Console Errors**
  - [ ] No React warnings
  - [ ] No TypeScript errors
  - [ ] No 404s for components

---

### Mobile Testing (<768px)

- [ ] **Navigation**
  - [ ] Desktop nav hidden
  - [ ] Hamburger menu visible
  - [ ] Sheet opens from right
  - [ ] All nav links present in sheet
  - [ ] Active link highlighted
  - [ ] Sheet closes after link click

- [ ] **Responsive Layout**
  - [ ] Header fits within viewport
  - [ ] Content doesn't overflow
  - [ ] Touch targets ≥44px (UserMenu, hamburger)

- [ ] **All Pages Mobile-Friendly**
  - [ ] Dashboard displays correctly
  - [ ] Match cards stack vertically
  - [ ] Forms are touch-friendly

---

### Tablet Testing (768px-1024px)

- [ ] **Navigation**
  - [ ] Desktop nav visible
  - [ ] UserMenu visible
  - [ ] Layout adapts smoothly

- [ ] **Content**
  - [ ] Cards display in 2-column grid
  - [ ] No horizontal scroll

---

### Cross-Browser Testing

- [ ] **Chrome** (latest)
  - [ ] All features work
  - [ ] No layout issues

- [ ] **Safari** (macOS/iOS)
  - [ ] Backdrop blur works
  - [ ] Navigation functional
  - [ ] No webkit-specific bugs

- [ ] **Firefox** (latest)
  - [ ] All features work
  - [ ] Dropdown works correctly

---

## Acceptance Criteria

**Week 1 is complete when:**

✅ **Navigation System**
- All dashboard pages have unified header
- Desktop navigation with 5 links working
- Mobile hamburger menu working
- UserMenu dropdown functional
- Active link highlighting correct

✅ **Code Quality**
- No custom headers in dashboard pages
- No code duplication
- TypeScript compiles without errors
- No console warnings/errors

✅ **Responsive Design**
- Works on mobile (375px+)
- Works on tablet (768px+)
- Works on desktop (1280px+)

✅ **Functionality**
- All existing features still work
- Navigation between pages seamless
- User can logout from any page
- Admin can access admin page

---

## Blockers & Issues

**Blockers:**
- None currently identified

**Issues Log:**
| Date | Issue | Status | Resolution |
|------|-------|--------|------------|
| - | - | - | - |

---

## Notes & Decisions

**Design Decisions:**
- Using Sheet component for mobile nav (slide-in from right)
- Header height: 64px (h-16)
- Active link style: blue-600 with bottom border
- Backdrop blur for modern glassmorphism effect

**Technical Decisions:**
- DashboardLayout as wrapper component (not in app/dashboard/layout.tsx)
- This allows flexibility for pages that don't need the layout
- Client components for Header/UserMenu/MobileNav (need hooks)

**Future Considerations:**
- Add breadcrumbs in Week 2-3
- Consider sidebar for desktop in future
- Dark mode support in future enhancement

---

## Time Tracking

**Phase 1 - Install Components:**
- Estimated: 30 min
- Actual: ___

**Phase 2 - Build Navigation:**
- Estimated: 4-6 hours
- Actual: ___

**Phase 3 - Migrate Pages:**
- Estimated: 2-3 hours
- Actual: ___

**Phase 4 - Toast Setup:**
- Estimated: 30 min
- Actual: ___

**Total Week 1:**
- Estimated: 7.5-10 hours
- Actual: ___

---

## Next Week Preview

**Week 2: Build Missing Pages**
- Billing dashboard (`/dashboard/billing`)
- Billing upgrade page (`/dashboard/billing/upgrade`)
- Payment success/cancel pages
- Consortium pages (list, create, detail)
- Partner detail page (`/dashboard/partners/[id]`)

**Preparation:**
- Review PRD Section 3.6 (Consortium Builder)
- Review PRD Section 3.7 (Payment Integration)
- Familiarize with Toss Payments API

---

**Document Status:** ✅ Ready for Implementation
**Last Updated:** 2025-01-03
**Next Review:** End of Week 1 (2025-01-09)
