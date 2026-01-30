# Data Quality Console — Master Plan

> **Created**: 2026-01-30
> **Status**: ✅ Phase 1 Complete — Deployed to production
> **Route**: `/admin/data-quality-console`
> **Page Name**: Data Quality Console (데이터 품질 콘솔)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Problem Statement](#2-problem-statement)
3. [Architecture Decisions](#3-architecture-decisions)
4. [Data Domains (5 Tabs)](#4-data-domains-5-tabs)
5. [Phase Overview](#5-phase-overview)
6. [Phase 1: Read-Only Data Browser](#6-phase-1-read-only-data-browser)
7. [Phase 2: Single-Row Delete with Audit](#7-phase-2-single-row-delete-with-audit)
8. [Phase 3: Bulk Duplicate Detection & Delete](#8-phase-3-bulk-duplicate-detection--delete)
9. [Phase 4: Inline Field Editing](#9-phase-4-inline-field-editing)
10. [Database Schema Reference](#10-database-schema-reference)
11. [Existing Admin Patterns Reference](#11-existing-admin-patterns-reference)
12. [Change Log](#12-change-log)

---

## 1. Project Overview

### What Is This?

A **unified admin data browser and management interface** providing direct visibility and CRUD operations across all core database tables that affect matching quality. It serves as the single source of truth for administrators to:

- Monitor data extraction progress across all program announcements
- Identify data gaps (NULL/empty fields) for supplementation tasks
- Detect and remove duplicate announcements
- Verify matching status between programs and users
- Ensure matching accuracy quality control

### Why Not 7 Tabs?

The original proposal listed 7 data domains. Analysis revealed 3 are redundant:

| Original Proposal | Resolution |
|---|---|
| 1. SME Programs table | ✅ **Tab 1: SME Programs** |
| 2. SME Match table | ✅ **Tab 2: SME Matches** |
| 3. Funding Programs table | ✅ **Tab 3: R&D Programs** |
| 4. Funding Match table | ✅ **Tab 4: R&D Matches** |
| 5. User Profile table | ✅ **Tab 5: Users & Organizations** |
| 6. Each user's funding match table | ❌ **Redundant** — Same as Tab 4 with org filter |
| 7. Each user's SME match table | ❌ **Redundant** — Same as Tab 2 with org filter |

The match tables (`funding_matches`, `sme_program_matches`) already contain `organizationId`. Filtering by organization within the existing match tabs provides identical functionality without duplicate views.

---

## 2. Problem Statement

### Current State (Before)

To inspect or manage data quality, an admin must:

1. SSH into the production server (`ssh -i ~/.ssh/id_ed25519_connect user@59.21.170.6`)
2. Enter the Docker container (`docker exec -it connect-app bash`)
3. Run raw SQL queries against PostgreSQL
4. Manually interpret results in a terminal

### Risks of Current Approach

- **Dangerous**: One wrong `DELETE` without `WHERE` can destroy production data
- **Slow**: Each investigation requires SSH + SQL + mental parsing
- **No audit trail**: No record of who deleted/modified what
- **No visualization**: Can't see data completeness at a glance
- **Expert-only**: Requires SQL knowledge; limits who can perform QA

### Target State (After)

- **Safe**: UI-driven operations with confirmation dialogs and soft-delete
- **Fast**: Browser-based with search, filter, sort in seconds
- **Audited**: Every write operation logged to `audit_logs` table
- **Visual**: Data completeness badges, color-coded status, field grouping
- **Accessible**: Any admin can perform QA without SQL knowledge

---

## 3. Architecture Decisions

### Tech Stack (Aligned with Existing Codebase)

| Component | Technology | Rationale |
|---|---|---|
| Page rendering | Client-side (Next.js App Router) | Consistent with all existing admin pages |
| Data table | `@tanstack/react-table` v8 | Already installed; supports sorting, filtering, pagination, column visibility |
| Data fetching | `@tanstack/react-query` v5 | Already installed; handles caching, refetching, loading states |
| UI components | shadcn/ui + Radix UI + Tailwind | Existing component library |
| Icons | `lucide-react` | Already installed |
| Forms (Phase 4) | `react-hook-form` + `zod` | Already installed |
| Auth guard | `useSession` + role check | Existing pattern in all admin pages |

### UX Pattern: Smart Column Presets

Tables with 60-70+ columns are unusable when all displayed simultaneously. Solution:

- **Default view**: 8-10 most critical columns per tab
- **Column visibility toggle**: Dropdown to show/hide any column (TanStack Table native feature)
- **Detail drawer**: Click any row → side panel shows ALL fields grouped by category
- **Category groups**: 기본정보, 자격요건, 매칭정보, 데이터 수집, 메타데이터

### API Pattern

```
GET /api/admin/data-quality-console/[table]
  ?page=1
  &limit=50
  &search=keyword
  &sortBy=field
  &sortOrder=asc|desc
  &filter[status]=ACTIVE
  &filter[confidence]=LOW
  &fields=id,title,status (optional sparse fieldset)
```

Response:
```json
{
  "data": [...],
  "totalCount": 1234,
  "page": 1,
  "limit": 50,
  "completenessStats": {
    "totalFields": 70,
    "populatedAvg": 45,
    "populatedPercent": 64.3
  }
}
```

---

## 4. Data Domains (5 Tabs)

### Tab 1: SME Programs (`sme_programs`)

- **Row count**: ~2,000+ (grows daily via API sync)
- **Column count**: ~70 fields
- **Key filters**: status, bizType, sportType, eligibilityConfidence, lifeCycle, targetRegions
- **Key indicators**: Field completeness, detailPageText presence, applicationEnd deadline
- **Duplicate detection**: By `pblancSeq` (unique), `contentHash`, or title similarity

### Tab 2: SME Matches (`sme_program_matches`)

- **Row count**: ~10,000+ (grows per match session)
- **Column count**: ~18 fields
- **Key filters**: organizationId, score range, eligibilityLevel, sessionId, viewed/saved
- **Key indicators**: Score distribution, eligibility level, failed/met criteria
- **Related data**: Links to SME Program (title) and Organization (name)

### Tab 3: R&D Programs (`funding_programs`)

- **Row count**: ~500+ (grows via multi-agency scraping)
- **Column count**: ~60 fields
- **Key filters**: agencyId, status, announcementType, eligibilityConfidence, programIntent
- **Key indicators**: Field completeness, semantic enrichment status, TRL classification
- **Duplicate detection**: By `contentHash` or title + agency combination

### Tab 4: R&D Matches (`funding_matches`)

- **Row count**: ~5,000+ (grows per match generation)
- **Column count**: ~14 fields
- **Key filters**: organizationId, score range, viewed/saved, notificationSent
- **Key indicators**: Score distribution, personalization status
- **Related data**: Links to Funding Program (title) and Organization (name)

### Tab 5: Users & Organizations (`User` + `organizations`)

- **Row count**: ~200+ users, ~150+ organizations
- **Column count**: ~30 user fields + ~60 org fields
- **Key filters**: role, org type, profileCompleted, status, subscriptionPlan
- **Key indicators**: Profile completeness score, verification status, subscription status
- **Related data**: Subscription details, match counts

---

## 5. Phase Overview

| Phase | Scope | Risk | Deliverables |
|---|---|---|---|
| **Phase 1** | Read-only data browser | 🟢 Low | 5 tabs, search, filters, sort, pagination, column toggle, detail drawer, completeness badges, CSV export |
| **Phase 2** | Single-row delete | 🟡 Medium | Soft-delete with confirmation dialog, audit log integration, undo within 5 minutes |
| **Phase 3** | Bulk duplicate detection & delete | 🟠 High | Auto-detection by contentHash/title, bulk select, bulk soft-delete |
| **Phase 4** | Inline field editing | 🔴 Very High | Click-to-edit cells, change history, field-level validation |

**Phase 1 solves ~70% of the stated need** — monitoring data extraction progress and determining data supplementation tasks requires seeing the data, not editing it.

---

## 6. Phase 1: Read-Only Data Browser

> **Status**: ✅ Complete — Deployed (commit `d64ffe0`)
> **Files created**: 17 new files + 1 modified
> **Risk**: 🟢 Low (no write operations)

### 6.1 File Structure (Actual Implementation)

```
app/
  admin/
    data-quality-console/
      page.tsx                          # Main page with 5-tab navigation + auth guard
      components/
        SmePrograms/
          SmeProgramsTab.tsx            # Tab: columns, filters, search, detail drawer (default export)
        SmeMatches/
          SmeMatchesTab.tsx
        FundingPrograms/
          FundingProgramsTab.tsx
        FundingMatches/
          FundingMatchesTab.tsx
        UsersOrgs/
          UsersOrgsTab.tsx
        shared/
          DataTable.tsx                 # Generic TanStack Table wrapper (named export)
          DetailDrawer.tsx              # Right-side Sheet panel with field groups (named export)
          CompletenessBar.tsx           # Color-coded progress bar: red/yellow/green (named export)
          StatsBar.tsx                  # Horizontal stat cards with loading skeletons (named export)
          ExportCSV.tsx                 # UTF-8 BOM CSV export for Korean (named export)

  api/
    admin/
      data-quality-console/
        sme-programs/
          route.ts                      # GET: pagination, search, filters, completeness, stats
        sme-matches/
          route.ts                      # GET: pagination, filters, org/program relations
        funding-programs/
          route.ts                      # GET: pagination, search, filters, completeness, stats
        funding-matches/
          route.ts                      # GET: pagination, filters, org/program relations
        users-orgs/
          route.ts                      # GET: pagination, search, filters, profile completeness

components/
  layout/
    UserMenu.tsx                        # Modified: added "데이터 품질 콘솔" admin menu link
```

**Design decisions vs. original plan:**
- Columns, filters, and field groups are co-located inside each Tab component (not split into separate files) — reduces file count from ~25 to 17 while keeping each tab self-contained
- Shared components use **named exports**; tab components use **default exports** — consistent with codebase conventions
- `StatsBar` replaces the planned `StatusBadge` — stats are displayed as a horizontal card row, not individual badges
- All API routes include a `serializeRow()` helper to convert `BigInt`/`Decimal` fields to JSON-safe types (critical Prisma + Next.js fix)

### 6.2 Shared DataTable Component

A reusable wrapper around `@tanstack/react-table` used by all 5 tabs:

**Features:**
- Server-side pagination (page, limit)
- Server-side sorting (sortBy, sortOrder)
- Client-side column visibility toggle
- Row selection (checkbox column, for future Phase 2/3 use)
- Click row → open DetailDrawer
- Loading skeleton state
- Empty state message
- Row count display

**Props Interface (conceptual):**
```typescript
interface DataTableProps<T> {
  columns: ColumnDef<T>[]
  data: T[]
  totalCount: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onSortChange: (sortBy: string, order: 'asc' | 'desc') => void
  onRowClick: (row: T) => void
  isLoading: boolean
}
```

### 6.3 Default Column Presets Per Tab

#### SME Programs (Default 10 of ~70)
| # | Column | Field | Why Default |
|---|--------|-------|-------------|
| 1 | ID | `id` | Row identifier |
| 2 | 공고번호 | `pblancSeq` | Unique announcement ID |
| 3 | 제목 | `title` | Primary identifier |
| 4 | 지원기관 | `supportInstitution` | Key categorization |
| 5 | 사업유형 | `bizType` | Business type filter |
| 6 | 신청마감 | `applicationEnd` | Urgency indicator |
| 7 | 상태 | `status` | Active/Expired/Archived |
| 8 | 신뢰도 | `eligibilityConfidence` | Data quality signal |
| 9 | 데이터 완성도 | (computed) | % of non-null fields |
| 10 | 동기화 | `syncedAt` | Last sync timestamp |

#### SME Matches (Default 8 of ~18)
| # | Column | Field | Why Default |
|---|--------|-------|-------------|
| 1 | ID | `id` | Row identifier |
| 2 | 기업명 | org.name (joined) | Which organization |
| 3 | 공고 제목 | program.title (joined) | Which program |
| 4 | 점수 | `score` | Match quality |
| 5 | 자격수준 | `eligibilityLevel` | Eligibility result |
| 6 | 조회 | `viewed` | User engagement |
| 7 | 저장 | `saved` | User interest |
| 8 | 생성일 | `createdAt` | When matched |

#### R&D Programs (Default 10 of ~60)
| # | Column | Field | Why Default |
|---|--------|-------|-------------|
| 1 | ID | `id` | Row identifier |
| 2 | 기관 | `agencyId` | IITP/KEIT/TIPA etc. |
| 3 | 제목 | `title` | Primary identifier |
| 4 | 공고유형 | `announcementType` | R_D vs NOTICE etc. |
| 5 | 마감일 | `deadline` | Urgency |
| 6 | 상태 | `status` | Active/Expired/Archived |
| 7 | 신뢰도 | `eligibilityConfidence` | Data quality |
| 8 | 프로그램 목적 | `programIntent` | Classification |
| 9 | 데이터 완성도 | (computed) | % of non-null fields |
| 10 | 수집일 | `scrapedAt` | Last scraped |

#### R&D Matches (Default 8 of ~14)
| # | Column | Field | Why Default |
|---|--------|-------|-------------|
| 1 | ID | `id` | Row identifier |
| 2 | 기업명 | org.name (joined) | Which organization |
| 3 | 공고 제목 | program.title (joined) | Which program |
| 4 | 점수 | `score` | Match quality |
| 5 | 개인화 점수 | `personalizedScore` | Personalized score |
| 6 | 조회 | `viewed` | User engagement |
| 7 | 저장 | `saved` | User interest |
| 8 | 생성일 | `createdAt` | When matched |

#### Users & Organizations (Default 10 of ~90)
| # | Column | Field | Why Default |
|---|--------|-------|-------------|
| 1 | User ID | `user.id` | Row identifier |
| 2 | 이름 | `user.name` | User identity |
| 3 | 이메일 | `user.email` | Contact |
| 4 | 역할 | `user.role` | USER/ADMIN |
| 5 | 기업명 | `org.name` | Organization |
| 6 | 기업유형 | `org.type` | COMPANY etc. |
| 7 | 프로필 완성 | `org.profileCompleted` | Profile status |
| 8 | 프로필 점수 | `org.profileScore` | Completeness |
| 9 | 구독 | `subscription.plan` | FREE/PRO/TEAM |
| 10 | 마지막 로그인 | `user.lastLoginAt` | Activity |

### 6.4 Detail Drawer Layout

When a row is clicked, a right-side drawer (Sheet component) opens showing ALL fields grouped:

```
┌─────────────────────────────────────────┐
│ [X] SME Program Detail                  │
├─────────────────────────────────────────┤
│                                         │
│ 📋 기본정보                              │
│ ┌─────────────┬───────────────────────┐ │
│ │ ID          │ clx2abc...            │ │
│ │ 공고번호     │ 2024-1234      🟢     │ │
│ │ 제목        │ 중소기업 R&D... 🟢     │ │
│ │ 상세사업명   │ (없음)          🔴     │ │
│ └─────────────┴───────────────────────┘ │
│                                         │
│ 📌 자격요건                              │
│ ┌─────────────┬───────────────────────┐ │
│ │ 대상기업규모  │ 중소기업       🟢     │ │
│ │ 매출범위     │ (없음)         🔴     │ │
│ │ ...         │                       │ │
│ └─────────────┴───────────────────────┘ │
│                                         │
│ 🔗 매칭정보                              │
│ ┌─────────────┬───────────────────────┐ │
│ │ 매칭 수      │ 42                    │ │
│ │ 평균 점수    │ 72.5                  │ │
│ └─────────────┴───────────────────────┘ │
│                                         │
│ 🗄️ 메타데이터                            │
│ ┌─────────────┬───────────────────────┐ │
│ │ 동기화일     │ 2026-01-29     🟢     │ │
│ │ contentHash │ sha256:abc...  🟢     │ │
│ └─────────────┴───────────────────────┘ │
│                                         │
│ 데이터 완성도: ████████░░ 78% (55/70)   │
└─────────────────────────────────────────┘
```

Legend: 🟢 = field populated, 🔴 = field NULL/empty

### 6.5 Data Completeness Calculation

Each row gets a computed "completeness" object (server-side):

```typescript
// Returns { percent, filled, total } for display in table + detail drawer
function computeCompleteness(row: any): { percent: number; filled: number; total: number } {
  let filled = 0;
  for (const field of COMPLETENESS_FIELDS) {
    const value = row[field];
    if (value === null || value === undefined) continue;
    if (Array.isArray(value)) { if (value.length > 0) filled++; }
    else { filled++; }
  }
  return { percent: Math.round((filled / TOTAL_FIELDS) * 100), filled, total: TOTAL_FIELDS };
}
```

- **SME Programs**: 23 fields checked
- **R&D Programs**: 18 fields checked
- **Users/Orgs**: 15 organization fields checked
- Displayed as a progress bar in the table column (`CompletenessBar`)
- Color-coded: 🔴 0-40%, 🟡 41-70%, 🟢 71-100%
- Detail drawer shows per-field green/red dot indicator

**Important**: All API responses pass through `serializeRow()` to convert Prisma's `BigInt`/`Decimal` types to `Number`, preventing `"Do not know how to serialize a BigInt"` errors from `NextResponse.json()`.

### 6.6 CSV Export

Each tab has an "CSV 내보내기" button (`ExportCSV` component) that:
- Fetches data matching current filters (client-side JSON → CSV conversion)
- Includes UTF-8 BOM (`\uFEFF`) for proper Korean character display in Excel
- Filename format: `{table}_{YYYY-MM-DD}.csv` (e.g., `sme_programs_2026-01-30.csv`)
- Downloads via `Blob` + `URL.createObjectURL` pattern

### 6.7 API Endpoints (Phase 1)

All endpoints require ADMIN or SUPER_ADMIN role.

#### `GET /api/admin/data-quality-console/sme-programs`

Query params:
- `page` (default: 1)
- `limit` (default: 50, max: 200)
- `search` (searches: title, supportInstitution, pblancSeq)
- `sortBy` (any field, default: createdAt)
- `sortOrder` (asc/desc, default: desc)
- `status` (ACTIVE/EXPIRED/ARCHIVED)
- `bizType` (filter)
- `eligibilityConfidence` (HIGH/MEDIUM/LOW)
- `hasDetailPage` (true/false — whether detailPageText is populated)
- `completenessMin` (0-100 — minimum completeness %)
- `export` (csv — triggers CSV download instead of JSON)

#### `GET /api/admin/data-quality-console/sme-matches`

Query params:
- `page`, `limit`, `sortBy`, `sortOrder` (standard)
- `organizationId` (filter by specific org — replaces "user's SME match" tab)
- `programId` (filter by specific program)
- `scoreMin`, `scoreMax` (score range)
- `eligibilityLevel` (FULLY_ELIGIBLE/CONDITIONALLY_ELIGIBLE)
- `viewed` (true/false)
- `saved` (true/false)
- `sessionId` (filter by match session)

#### `GET /api/admin/data-quality-console/funding-programs`

Query params:
- `page`, `limit`, `search`, `sortBy`, `sortOrder` (standard)
- `agencyId` (IITP/KEIT/TIPA/KIMST/NTIS)
- `status` (ACTIVE/EXPIRED/ARCHIVED)
- `announcementType` (R_D_PROJECT/SURVEY/EVENT/NOTICE/UNKNOWN)
- `eligibilityConfidence` (HIGH/MEDIUM/LOW)
- `programIntent` (BASIC_RESEARCH/APPLIED_RESEARCH/COMMERCIALIZATION/INFRASTRUCTURE/POLICY_SUPPORT)
- `completenessMin` (0-100)
- `export` (csv)

#### `GET /api/admin/data-quality-console/funding-matches`

Query params:
- `page`, `limit`, `sortBy`, `sortOrder` (standard)
- `organizationId` (filter by specific org — replaces "user's funding match" tab)
- `programId` (filter by specific program)
- `scoreMin`, `scoreMax` (score range)
- `viewed` (true/false)
- `saved` (true/false)

#### `GET /api/admin/data-quality-console/users-orgs`

Query params:
- `page`, `limit`, `search` (searches: name, email, org.name), `sortBy`, `sortOrder`
- `role` (USER/ADMIN/SUPER_ADMIN)
- `orgType` (COMPANY/RESEARCH_INSTITUTE/UNIVERSITY/PUBLIC_INSTITUTION)
- `profileCompleted` (true/false)
- `subscriptionPlan` (FREE/PRO/TEAM)
- `status` (ACTIVE/PENDING_VERIFICATION/SUSPENDED/DEACTIVATED)

### 6.8 Summary Stats Bar

Each tab displays a summary stats bar at the top:

**SME Programs** (actual data as of 2026-01-30):
- 전체 프로그램: 2,067
- 활성: 1,244 | 만료: 823
- 평균 완성도: 49%
- 낮은 신뢰도: 2,059

**SME Matches:**
- 전체 매칭: 100
- 평균 점수: 71.08
- 조회율: 99% | 저장율: 0%
- 고유 기업: 1

**R&D Programs:**
- 전체 프로그램: 1,905
- 기관별: NTIS 1,904 / KEIT 1
- 평균 완성도: 63%
- 낮은 신뢰도: 194

**R&D Matches:**
- 전체 매칭: 8
- 평균 점수: 76.38
- 조회율: 0% | 저장율: 0%
- 개인화 적용: 8
- 고유 기업: 1

**Users & Orgs:**
- 전체 사용자: 18 | 관리자: 1
- 전체 기업: 71
- 프로필 완성율: 100%
- 구독 현황: FREE 0 / PRO 0 / TEAM 1

---

## 7. Phase 2: Single-Row Delete with Audit

> **Status**: ✅ Complete
> **Prerequisites**: Phase 1 complete
> **Risk**: 🟡 Medium
> **Completed**: 2026-01-30

### Scope
- Add "Delete" button per row (trash icon) in all 5 tabs
- Confirmation dialog with row title/identifier shown
- **Soft-delete pattern**: Set `status: 'ARCHIVED'` (programs) or create `deletedAt` field
- Log every deletion to `audit_logs` table (userId, action: 'DELETE', resourceType, resourceId)
- "Undo" button in toast notification (5-minute window to reverse)
- Programs with existing matches show warning: "This program has N active matches"

### API Additions
```
DELETE /api/admin/data-quality-console/[table]/[id]
  → Sets status to ARCHIVED (soft delete)
  → Creates audit_log entry
  → Returns { success: true, undoToken: 'xxx' }

POST /api/admin/data-quality-console/undo/[undoToken]
  → Reverses the soft delete within 5-minute window
```

---

## 8. Phase 3: Bulk Duplicate Detection & Delete

> **Status**: 📋 Not Started
> **Prerequisites**: Phase 2 complete
> **Risk**: 🟠 High

### Scope
- **Auto-detection**: Run duplicate scan based on:
  - Exact `contentHash` match
  - Title similarity > 90% (Levenshtein or n-gram)
  - Same `pblancSeq` with different IDs (should not happen, but catch it)
- **Duplicate groups UI**: Show grouped duplicates with diff highlight
- **Bulk select**: Checkbox selection + "Delete Selected" action
- **Keep best**: Auto-suggest which duplicate to keep (highest completeness %)
- All bulk deletes logged individually to `audit_logs`

### API Additions
```
GET /api/admin/data-quality-console/[table]/duplicates
  → Returns grouped duplicates with similarity scores

POST /api/admin/data-quality-console/[table]/bulk-delete
  Body: { ids: ['id1', 'id2', ...] }
  → Soft-deletes all, creates audit entries
```

---

## 9. Phase 4: Inline Field Editing

> **Status**: 📋 Not Started
> **Prerequisites**: Phase 3 complete
> **Risk**: 🔴 Very High

### Scope
- Click any cell in the table → inline edit mode
- Or edit from the Detail Drawer
- Field-level validation using `zod` schemas
- **Change history**: Every edit creates a changelog entry (old value → new value)
- **Restricted fields**: `id`, `createdAt`, computed fields are read-only
- **Batch save**: Multiple field edits collected, single save operation
- Real-time validation feedback

### API Additions
```
PATCH /api/admin/data-quality-console/[table]/[id]
  Body: { field1: newValue1, field2: newValue2 }
  → Validates with zod
  → Updates row
  → Creates audit_log with before/after values
  → Returns updated row
```

---

## 10. Database Schema Reference

### Key Models and Field Counts

| Model | Prisma Name | Approx. Fields | Primary Key |
|---|---|---|---|
| SME Programs | `sme_programs` | ~70 | `id` (cuid) |
| SME Matches | `sme_program_matches` | ~18 | `id` (cuid) |
| R&D Programs | `funding_programs` | ~60 | `id` (cuid) |
| R&D Matches | `funding_matches` | ~14 | `id` (cuid) |
| Users | `User` | ~30 | `id` (cuid) |
| Organizations | `organizations` | ~60 | `id` (cuid) |
| Subscriptions | `subscriptions` | ~15 | `id` (cuid) |

### Key Relationships

```
User (1) ──── (1) Organization
Organization (1) ──── (N) funding_matches
Organization (1) ──── (N) sme_program_matches
Organization (1) ──── (N) sme_match_sessions
funding_programs (1) ──── (N) funding_matches
sme_programs (1) ──── (N) sme_program_matches
User (1) ──── (1) subscriptions
```

### Key Enums

- **Status**: ACTIVE, EXPIRED, ARCHIVED
- **AgencyId**: IITP, KEIT, TIPA, KIMST, NTIS
- **AnnouncementType**: R_D_PROJECT, SURVEY, EVENT, NOTICE, UNKNOWN
- **EligibilityConfidence**: HIGH, MEDIUM, LOW
- **ProgramIntent**: BASIC_RESEARCH, APPLIED_RESEARCH, COMMERCIALIZATION, INFRASTRUCTURE, POLICY_SUPPORT
- **OrganizationType**: COMPANY, RESEARCH_INSTITUTE, UNIVERSITY, PUBLIC_INSTITUTION
- **UserRole**: USER, ADMIN, SUPER_ADMIN
- **SubscriptionPlan**: FREE, PRO, TEAM

---

## 11. Existing Admin Patterns Reference

### Auth Guard Pattern (Use in page.tsx)

```tsx
'use client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DataQualityConsolePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }
    if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'SUPER_ADMIN') {
      router.push('/dashboard');
      return;
    }
  }, [session, status, router]);

  if (status === 'loading') return <LoadingSkeleton />;
  // ... render content
}
```

### API Route Auth Pattern (Use in route.ts)

```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userRole = (session.user as any).role;
  if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }
  // ... handle request
}
```

### Existing Admin Navigation

Admin pages are accessible via sidebar or direct URL. Check `components/layout/Sidebar.tsx` or equivalent for the admin menu section to add the new page link.

---

## 12. Change Log

| Date | Change | Author |
|---|---|---|
| 2026-01-30 | Initial master plan created | Claude + Paul |
| 2026-01-30 | Phase 1 implementation complete (17 new files + 1 modified: 5 API routes, 5 shared components, 5 tab components, 1 main page, 1 master plan doc + UserMenu nav link) | Claude + Paul |
| 2026-01-30 | Bug fix: BigInt/Decimal serialization causing 500 errors on all API routes. Added `serializeRow()` helper to all 5 routes. Also fixed completeness format (number → `{ percent, filled, total }` object) and DetailDrawer nested key access. | Claude + Paul |
| 2026-01-30 | Local verification passed (all 5 tabs working). Committed as `d64ffe0`, pushed to production. | Claude + Paul |
| 2026-01-30 | Phase 2 implementation complete: Single-row soft-delete with audit. 4 new files + 9 modified (schema, 2 API routes, 2 shared components, 5 tab components, 1 master plan). 7 commits: schema migration, DELETE API, undo API, shared UI components, 5-tab integration, GET route filters, docs update. | Claude + Paul |
| | | |
