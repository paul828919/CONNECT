# User Statistics Page Enhancement Plan

**Version**: 1.0
**Created**: 2025-12-14
**Author**: Connect's PM (PM Review Implementation)
**Status**: Pending Approval

---

## Executive Summary

This plan covers Phase 1 (pre-launch enhancements) and Phase 2 (complete rebuild) of the user statistics page. Phase 2 involves **deleting all existing features and UI elements** and implementing a clean, SaaS-focused statistics dashboard.

---

## Phase 1: Pre-Launch Safe Enhancements

**Timeline**: 1-2 days
**Risk Level**: Low
**Approach**: Modify existing implementation

### 1.1 Rename Confusing Metric Labels

**Current Problem**: Labels like "총 사용자 수" are misleading - they actually represent session counts, not unique users.

**Changes**:
| Current Label | New Label | Reason |
|--------------|-----------|--------|
| 총 사용자 수 | 총 활성 세션 수 | Clarifies these are session-based counts |
| 평균 일일 사용자 | 평균 일일 활성 사용자 (DAU) | Adds industry-standard term |
| 최고 사용자 수 | 일일 최고 활성 사용자 | Clarifies daily peak |

**Files to Modify**:
- `app/dashboard/admin/statistics/page.tsx` (lines ~180-220: KPI card labels)
- `lib/analytics/user-analytics.ts` (lines ~356-386: CSV export labels)

### 1.2 Add DAU/MAU Ratio Display

**Purpose**: Industry-standard engagement metric (benchmark: 20-25% is good for SaaS)

**Implementation**:
- Calculate MAU by summing unique users over 30-day rolling window
- Display ratio as percentage in new KPI card
- Add tooltip explaining the metric

**Files to Modify**:
- `app/api/admin/statistics/users/route.ts` (add MAU calculation)
- `app/dashboard/admin/statistics/page.tsx` (add new KPI card)
- `lib/analytics/user-analytics.ts` (add `getDAUMAURatio()` function)

### 1.3 Add Date Range Picker

**Purpose**: Allow admins to select custom date ranges instead of fixed periods

**Implementation**:
- Add shadcn/ui DateRangePicker component
- Replace current period selector with more flexible date picker
- Maintain backward compatibility with period presets (Last 7 days, Last 30 days, etc.)

**Files to Modify**:
- `app/dashboard/admin/statistics/page.tsx` (replace period selector)

**New Dependency**:
- `@radix-ui/react-popover` (already installed via shadcn/ui)

### 1.4 Separate Dual Y-Axis Charts

**Current Problem**: Single chart with two Y-axes is confusing and hard to interpret

**Implementation**:
- Split into two separate charts:
  1. Active Users chart (Area chart)
  2. Page Views chart (Bar chart)
- Each chart has its own Y-axis with proper scaling
- Maintain synchronized X-axis (dates)

**Files to Modify**:
- `app/dashboard/admin/statistics/page.tsx` (refactor chart section)

---

## Phase 2: Complete Rebuild

**Timeline**: 3-5 days
**Risk Level**: Medium (isolated feature)
**Approach**: Delete existing implementation, build fresh

### 2.1 Delete Existing Implementation

**Files to Delete**:
- `app/dashboard/admin/statistics/page.tsx` (entire file - 498 lines)

**Files to Preserve** (backend logic remains unchanged):
- `lib/analytics/active-user-tracking.ts` (tracking service)
- `lib/analytics/user-analytics.ts` (analytics library - will be extended)
- `app/api/admin/statistics/users/route.ts` (API endpoint - will be extended)
- `app/api/internal/track-user/route.ts` (internal API)
- `app/api/cron/aggregate-active-users/route.ts` (cron job)
- `prisma/schema.prisma` (active_user_stats model)

### 2.2 New Page Architecture

```
app/dashboard/admin/statistics/
├── page.tsx                    # Main dashboard (new)
├── components/
│   ├── StatisticsHeader.tsx    # Header with date picker & export
│   ├── KPICards.tsx            # Primary metrics cards
│   ├── ActiveUsersChart.tsx    # Users trend chart
│   ├── PageViewsChart.tsx      # Page views chart
│   ├── GrowthMetrics.tsx       # WoW/MoM growth indicators
│   └── UserSegmentation.tsx    # Breakdown by plan type
└── hooks/
    └── useStatisticsData.ts    # Data fetching hook
```

### 2.3 New Features to Implement

#### 2.3.1 Enhanced KPI Cards

| Metric | Description | Calculation |
|--------|-------------|-------------|
| DAU | Daily Active Users | Unique sessions today |
| WAU | Weekly Active Users | Unique sessions last 7 days |
| MAU | Monthly Active Users | Unique sessions last 30 days |
| DAU/MAU Ratio | Stickiness | DAU ÷ MAU × 100 |
| Avg Session Duration | Engagement | Future: requires additional tracking |

#### 2.3.2 Growth Metrics Panel

**WoW (Week-over-Week) Growth**:
```
Formula: ((This Week Users - Last Week Users) / Last Week Users) × 100
Display: Percentage with up/down arrow indicator
Color: Green (>0%), Red (<0%), Gray (0%)
```

**MoM (Month-over-Month) Growth**:
```
Formula: ((This Month Users - Last Month Users) / Last Month Users) × 100
Display: Percentage with trend indicator
```

#### 2.3.3 User Segmentation Chart

**Breakdown by Subscription Plan**:
- Free users
- Pro users
- Team users

**Implementation**:
- Requires joining `active_user_stats` with `User` and `Subscription` tables
- Pie chart or horizontal bar chart visualization

**Database Query** (new):
```sql
SELECT
  COALESCE(s.plan, 'FREE') as plan,
  COUNT(DISTINCT u.id) as user_count
FROM users u
LEFT JOIN subscriptions s ON u.id = s.user_id
WHERE u.last_active_at >= NOW() - INTERVAL '30 days'
GROUP BY s.plan
```

#### 2.3.4 Charts Redesign

**Active Users Chart** (Area Chart):
- X-axis: Date
- Y-axis: User count
- Fill: Gradient blue
- Hover: Tooltip with exact count

**Page Views Chart** (Bar Chart):
- X-axis: Date
- Y-axis: Page view count
- Color: Solid purple
- Hover: Tooltip with exact count

**Both charts**:
- Responsive sizing
- Synchronized date range from picker
- Animation on data load

### 2.4 API Extensions

**New Endpoint**: `GET /api/admin/statistics/growth`

```typescript
interface GrowthResponse {
  wow: {
    current: number;
    previous: number;
    growthRate: number;
    trend: 'up' | 'down' | 'stable';
  };
  mom: {
    current: number;
    previous: number;
    growthRate: number;
    trend: 'up' | 'down' | 'stable';
  };
}
```

**New Endpoint**: `GET /api/admin/statistics/segmentation`

```typescript
interface SegmentationResponse {
  byPlan: Array<{
    plan: 'FREE' | 'PRO' | 'TEAM';
    userCount: number;
    percentage: number;
  }>;
  generatedAt: string;
}
```

### 2.5 UI/UX Design Specifications

**Layout**:
- Responsive grid (1 column mobile, 2 columns tablet, 3 columns desktop)
- Card-based design with consistent shadows and borders
- White background with subtle gray accents

**Color Palette**:
- Primary: Blue (#2563EB) - users metrics
- Secondary: Purple (#7C3AED) - page views
- Success: Green (#10B981) - positive growth
- Danger: Red (#EF4444) - negative growth
- Neutral: Gray (#6B7280) - stable/no change

**Typography**:
- Metric values: text-3xl font-bold
- Labels: text-sm text-gray-500
- Growth indicators: text-sm font-medium

---

## Implementation Order

### Step 1: Phase 1 Changes (Day 1)
1. [ ] Rename metric labels in `page.tsx`
2. [ ] Update CSV export labels in `user-analytics.ts`
3. [ ] Add DAU/MAU ratio calculation
4. [ ] Add new KPI card for DAU/MAU ratio
5. [ ] Verify locally

### Step 2: Phase 1 Continued (Day 1-2)
6. [ ] Implement DateRangePicker component
7. [ ] Separate dual Y-axis chart into two charts
8. [ ] Test all Phase 1 changes locally
9. [ ] Commit Phase 1 (single commit)

### Step 3: Phase 2 - Delete & Setup (Day 3)
10. [ ] Create backup of existing `page.tsx`
11. [ ] Delete existing `page.tsx`
12. [ ] Create new directory structure
13. [ ] Create empty component files

### Step 4: Phase 2 - Backend (Day 3-4)
14. [ ] Implement `/api/admin/statistics/growth` endpoint
15. [ ] Implement `/api/admin/statistics/segmentation` endpoint
16. [ ] Test new API endpoints

### Step 5: Phase 2 - Frontend (Day 4-5)
17. [ ] Implement `useStatisticsData.ts` hook
18. [ ] Implement `StatisticsHeader.tsx`
19. [ ] Implement `KPICards.tsx`
20. [ ] Implement `ActiveUsersChart.tsx`
21. [ ] Implement `PageViewsChart.tsx`
22. [ ] Implement `GrowthMetrics.tsx`
23. [ ] Implement `UserSegmentation.tsx`
24. [ ] Implement main `page.tsx`

### Step 6: Phase 2 - Testing (Day 5)
25. [ ] Test all features locally
26. [ ] Test responsive design
27. [ ] Test CSV export
28. [ ] Verify admin role protection
29. [ ] Commit Phase 2 (single commit)

### Step 7: Deployment
30. [ ] Push to GitHub
31. [ ] Monitor GitHub Actions deployment
32. [ ] Verify production functionality

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| API endpoint changes break existing functionality | Low | Medium | Preserve existing endpoint, add new ones |
| Chart library compatibility issues | Low | Low | Recharts already in use, tested |
| Database query performance for segmentation | Low | Low | Add index if needed, query is simple |
| Date range picker edge cases | Medium | Low | Validate inputs, set reasonable limits |

---

## Rollback Plan

**Phase 1**:
- Git revert single commit
- No database changes required

**Phase 2**:
- Git revert single commit
- No database changes required
- Backup of original `page.tsx` available in git history

---

## Verification Checklist

### Phase 1 Verification
- [ ] All metric labels updated correctly
- [ ] DAU/MAU ratio displays correctly
- [ ] Date range picker works
- [ ] Two separate charts display correctly
- [ ] CSV export includes updated labels
- [ ] No TypeScript errors
- [ ] No console errors

### Phase 2 Verification
- [ ] All KPI cards display correct data
- [ ] WoW/MoM growth calculations are accurate
- [ ] User segmentation shows correct breakdown
- [ ] Charts render with proper data
- [ ] Responsive design works on all screen sizes
- [ ] Admin role protection enforced
- [ ] Export functionality works
- [ ] No TypeScript errors
- [ ] No console errors

---

## Dependencies

**No new npm packages required** - all components use existing dependencies:
- Recharts (charts)
- TanStack Query (data fetching)
- shadcn/ui (UI components)
- date-fns (date utilities)
- Tailwind CSS (styling)

---

## Approval

**Awaiting user approval before execution.**

Once approved, I will:
1. Execute Phase 1 changes first
2. Request verification before proceeding to Phase 2
3. Execute Phase 2 with complete rebuild
4. Commit after each phase completion
5. Push only after all phases verified

---

*End of Plan*
