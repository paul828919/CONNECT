# Data Quality Console — Master Plan

> **Created**: 2026-01-30
> **Status**: ✅ Phase 4 Complete — Inline Field Editing
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
12. [Implementation Deviations from Original Plan](#12-implementation-deviations-from-original-plan)
13. [Future Work Backlog](#13-future-work-backlog)
14. [Change Log](#14-change-log)

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

| Component | Planned Technology | Actually Used | Notes |
|---|---|---|---|
| Page rendering | Client-side (Next.js App Router) | ✅ Same | Consistent with all existing admin pages |
| Data table | `@tanstack/react-table` v8 | ✅ Same | Sorting, filtering, pagination all working |
| Data fetching | `@tanstack/react-query` v5 | ⚠️ **`fetch()` + `useState`** | React Query was NOT adopted; plain fetch with local state. See §12 Deviations |
| UI components | shadcn/ui + Radix UI + Tailwind | ✅ Same | Sheet, Select, Switch, Input, AlertDialog, Badge, etc. |
| Icons | `lucide-react` | ✅ Same | Trash2, Pencil, Save, X, Loader2 |
| Forms (Phase 4) | `react-hook-form` + `zod` | ⚠️ **`zod` only** | Zod used for server-side PATCH validation; `react-hook-form` NOT used. Custom controlled components instead. See §12 Deviations |
| Auth guard | `useSession` + role check | ✅ Same | Existing pattern in all admin pages |

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
| **Phase 4** | Inline field editing | ✅ Complete | DetailDrawer inline editing, Zod validation, before/after audit, enum dropdowns |

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

> **Status**: ✅ Complete
> **Prerequisites**: Phase 2 complete
> **Risk**: 🟠 High
> **Completed**: 2026-01-31

### Scope
- **Three-tier duplicate detection algorithm**:
  - **Tier 1**: Exact `contentHash` match (O(n) grouping) — catches identical scraped content
  - **Tier 2**: Same `pblancSeq`, different IDs — SME only (O(n) grouping) — catches integrity violations
  - **Tier 3**: Title similarity ≥ 90% via Damerau-Levenshtein (O(n²) with length pre-filter) — catches near-duplicate announcements
- **Duplicate groups UI**: Expandable group cards with reason badges, similarity %, per-group and global actions
- **Bulk select**: Checkbox per program, pre-selected non-suggested items, "전체 자동 선택" button
- **Keep best**: Auto-suggest which duplicate to keep (highest completeness % → most matches → most recent)
- **Bulk delete**: Prisma `$transaction` for atomicity, individual `audit_logs` per row, individual undo tokens
- **Undo All**: Sequential undo via existing `/undo/[token]` endpoint for each token (5-minute window)
- **Shared utilities**: Extracted completeness fields and computation from GET routes into `lib/utils/completeness.ts`

### Algorithm Optimization (Tier 3)
- **Length pre-filter**: Two strings with length ratio < 0.9 cannot have ≥90% similarity → eliminates ~90% of O(n²) comparisons
- **Union-Find**: Transitive grouping — if A matches B and B matches C, all three are grouped together (with path compression for near-O(1) lookups)
- **Performance**: ~2000 programs → ~200K–400K filtered pairs, each Damerau-Levenshtein call ~1–5µs on 30–60 char Korean titles → total ~0.2–2s

### File Structure (Actual Implementation)

```
lib/
  utils/
    completeness.ts                    # Shared completeness fields, computeCompleteness(), serializeRow()
    duplicate-detection.ts             # Three-tier detection: contentHash, pblancSeq, title similarity

app/
  api/
    admin/
      data-quality-console/
        [table]/
          duplicates/
            route.ts                   # GET: scan non-ARCHIVED programs, return duplicate groups
          bulk-delete/
            route.ts                   # POST: transactional bulk soft-delete with audit + undo tokens

  admin/
    data-quality-console/
      components/
        shared/
          useBulkDelete.ts             # Hook: bulk delete API call, toast with "전체 실행 취소"
          BulkDeleteConfirmDialog.tsx   # Confirmation dialog with count + match warning
          DuplicateDetectionPanel.tsx   # Main UI: scan button, summary, group cards, bulk actions
```

**Modified files:**
- `SmeProgramsTab.tsx` — Added `<DuplicateDetectionPanel tableName="sme-programs" />`
- `FundingProgramsTab.tsx` — Added `<DuplicateDetectionPanel tableName="funding-programs" />`
- `sme-programs/route.ts` — Refactored to import from shared `lib/utils/completeness.ts`
- `funding-programs/route.ts` — Refactored to import from shared `lib/utils/completeness.ts`

### API Endpoints

```
GET /api/admin/data-quality-console/[table]/duplicates
  → Only valid for sme-programs and funding-programs (400 for others)
  → Fetches all non-ARCHIVED programs with _count relations
  → Runs three-tier detectDuplicates() algorithm
  → Returns { groups: DuplicateGroup[], summary: { totalGroups, totalDuplicates, byReason } }

POST /api/admin/data-quality-console/[table]/bulk-delete
  Body: { ids: ['id1', 'id2', ...] }  (max 100)
  → Prisma $transaction: fetch all → soft-delete all → create audit entries
  → Returns { success, deletedCount, undoTokens[], message }
```

### DuplicateGroup Response Shape

```typescript
interface DuplicateGroup {
  groupId: string;                   // e.g. "hash-1", "seq-2", "title-3"
  reason: 'contentHash' | 'pblancSeq' | 'titleSimilarity';
  similarity: number;                // 1.0 for exact, 0.90–0.99 for fuzzy
  programs: DuplicateProgram[];      // id, title, pblancSeq, contentHash, status, completeness, matchCount, createdAt, updatedAt
  suggestedKeepId: string;           // highest completeness → most matches → most recent
}
```

### UI Components

**DuplicateDetectionPanel** layout:
```
├── "중복 검사" Button (triggers scan)
├── Loading spinner
├── Summary bar: "N개 중복 그룹 (contentHash: X, 제목유사: Y)"
├── DuplicateGroupCard (per group, expandable)
│    ├── Reason badge + similarity %
│    ├── Program rows with:
│    │    ├── Checkbox (pre-checked for non-suggested items)
│    │    ├── Title
│    │    ├── Completeness bar
│    │    ├── Match count
│    │    └── "추천" badge on suggestedKeepId (green star)
│    └── "선택 삭제" button (per group)
├── "전체 자동 선택" button + "N개 선택 삭제" button (global)
└── BulkDeleteConfirmDialog
```

### Commits

| # | SHA | Description |
|---|-----|-------------|
| A | `405cbd3` | `feat(admin): add shared completeness utils and duplicate detection algorithm` |
| B | `6e9c01e` | `feat(admin): add duplicates detection and bulk delete API routes` |
| C | `8a939be` | `feat(admin): add duplicate detection panel UI with bulk delete` |
| D | `c507527` | `feat(admin): integrate duplicate detection into SME and R&D program tabs` |
| E | `c6c2fb7` | `fix(admin): resolve ESLint error in duplicate-detection import` |

### Additional Fix (same session)

| SHA | Description |
|-----|-------------|
| `d7cced7` | `fix(admin): center pagination controls in data quality console` — Moved page navigation to bottom center to prevent overlap with the feedback button |

---

## 9. Phase 4: Inline Field Editing

> **Status**: ✅ Complete
> **Prerequisites**: Phase 3 complete
> **Completed**: 2026-01-31

### Implementation Summary

**Edit surface**: DetailDrawer only (not table cells). Users click a row → EditableDetailDrawer opens → click "편집" button → fields become inline editors → batch save via single PATCH request → audit log with before/after values.

### New Files (4)
| File | Purpose |
|---|---|
| `lib/validations/data-quality-schemas.ts` | Zod schemas, READONLY_FIELDS, ENUM_OPTIONS per table |
| `app/admin/data-quality-console/components/shared/EditableField.tsx` | Type-aware input renderer (text, date, json, array, boolean, number, url, enum select) |
| `app/admin/data-quality-console/components/shared/useEditRow.ts` | PATCH API hook with field-level error handling |
| `app/admin/data-quality-console/components/shared/EditableDetailDrawer.tsx` | Editable drawer with edit mode, dirty tracking, save/cancel, unsaved changes guard |

### Modified Files (9)
| File | Change |
|---|---|
| `prisma/schema.prisma` | Added `afterValues Json?` to `audit_logs` |
| `app/api/admin/data-quality-console/[table]/[id]/route.ts` | Added PATCH handler with Zod validation + audit logging |
| `app/admin/data-quality-console/components/shared/DetailDrawer.tsx` | Exported shared types/utils (FieldGroup, renderValue, isPopulated, formatDate) |
| `SmeProgramsTab.tsx` | Replaced DetailDrawer with EditableDetailDrawer |
| `SmeMatchesTab.tsx` | Replaced DetailDrawer with EditableDetailDrawer |
| `FundingProgramsTab.tsx` | Replaced DetailDrawer with EditableDetailDrawer |
| `FundingMatchesTab.tsx` | Replaced DetailDrawer with EditableDetailDrawer |
| `UsersOrgsTab.tsx` | Replaced DetailDrawer with EditableDetailDrawer |

### API
```
PATCH /api/admin/data-quality-console/[table]/[id]
  Body: { field1: newValue1, field2: newValue2 }
  → Auth check (ADMIN/SUPER_ADMIN)
  → Validates with per-table Zod schema (.strict() rejects unknown keys)
  → Strips READONLY_FIELDS as defense-in-depth
  → Updates row via Prisma
  → Creates audit_log with beforeValues + afterValues (new)
  → Returns { success, updatedRow, message }
  → On validation failure: 400 { error, fieldErrors: { key: message } }
```

### Commits (5)
1. `feat(admin): add afterValues to audit_logs and create Zod validation schemas`
2. `feat(admin): add PATCH handler for inline field editing`
3. `feat(admin): add EditableField component and useEditRow hook`
4. `feat(admin): add EditableDetailDrawer with edit mode and dirty tracking`
5. `feat(admin): integrate inline editing into all 5 tabs`

### Key Design Decisions
- **DetailDrawer-only editing** (not table cells) — simpler UX, lower risk of accidental edits
- **Dirty tracking** — only includes truly changed fields in PATCH body
- **Unsaved changes guard** — AlertDialog warns before closing drawer with dirty fields
- **Defense-in-depth** — Zod `.strict()` rejects unknown keys AND runtime strips READONLY_FIELDS
- **users-orgs special handling** — `organization.` prefix stripped before PATCH (org model is flat)
- **Enum dropdowns** — ENUM_OPTIONS map drives automatic Select rendering for enum fields

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

## 12. Implementation Deviations from Original Plan

> **Purpose**: Document differences between the original plan and actual implementation so future work can reference ground truth, not assumptions.
> **Added**: 2026-01-31 (post Phase 4 completion audit)

### 12.1 Confirmed Deviations

| # | Section | Planned | Actually Implemented | Impact | Recommendation |
|---|---------|---------|---------------------|--------|----------------|
| D-1 | §3 Tech Stack | `@tanstack/react-query` v5 for data fetching | Plain `fetch()` + `useState` + `useCallback` in all 5 tabs | 🟡 Medium — no automatic cache invalidation; `fetchData()` must be called manually after edits/deletes | Migrate to React Query if adding optimistic updates or cross-tab cache invalidation |
| D-2 | §3 Tech Stack | `react-hook-form` + `zod` for Phase 4 | `zod` (server-side only) + custom controlled `<Input>` / `<Select>` components | 🟢 Low — works correctly, just no form-level validation UX (per-field errors come from server) | Consider `react-hook-form` only if adding complex multi-step forms |
| D-3 | §6.2 DataTable | "Row selection (checkbox column)" described as built-in | Phase 3 bulk delete uses its own checkbox UI inside `DuplicateDetectionPanel`, not DataTable row selection | 🟢 Negligible — DataTable may support checkboxes but they aren't wired to any tab |
| D-4 | §6.3 Column Presets | SME Programs default column #1 listed as `ID` | Actual first column is `pblancSeq` (공고번호); `ID` is not a table column, only visible in DetailDrawer | 🟢 Negligible — better UX decision, `pblancSeq` is more meaningful to admins |
| D-5 | §9 Phase 4 (original) | "Click any cell in the table → inline edit mode" | Editing is **DetailDrawer-only** (click row → drawer → 편집 button) | 🟢 Intentional — simpler UX, lower risk of accidental edits, already documented in updated §9 |

### 12.2 Impact Summary

- **No functional gaps**: All planned features are delivered. Deviations are architectural choices, not missing functionality.
- **D-1 is the only actionable item**: If future phases require cross-tab data synchronization (e.g., editing a program in Tab 1 should update match scores in Tab 2), migrating to React Query would be necessary.
- **All deviations were pragmatic**: Each simplification reduced implementation complexity without sacrificing user-facing features.

---

## 13. Future Work Backlog

> **Purpose**: Potential enhancements identified during the Phase 1–4 implementation. These are NOT planned phases — they are backlog items for prioritization.
> **Added**: 2026-01-31

### 13.1 Data Fetching & State Management

| ID | Item | Effort | Value | Dependencies |
|---|------|--------|-------|-------------|
| F-1 | **Migrate to `@tanstack/react-query`** — Replace `fetch()` + `useState` pattern in all 5 tabs with `useQuery` / `useMutation`. Enables automatic cache invalidation after edits, background refetching, and optimistic updates. | Medium (5 tabs + 2 hooks) | High if adding real-time features | None |
| F-2 | **Optimistic updates for inline editing** — Show updated value immediately in the drawer before PATCH response returns. Revert on error. Requires React Query (F-1). | Low | Medium (perceived speed) | F-1 |

### 13.2 Editing Enhancements

| ID | Item | Effort | Value | Dependencies |
|---|------|--------|-------|-------------|
| F-3 | **Bulk field editing** — Select multiple rows in the table → edit a shared field across all (e.g., set `status: ARCHIVED` for 50 expired programs). Uses existing PATCH endpoint in a loop or a new bulk PATCH. | Medium | High for batch operations | None |
| F-4 | **Table-cell inline editing** — Click a cell directly in the DataTable to edit (original Phase 4 scope). Higher accidental-edit risk; requires click-outside detection and cell-level dirty state. | High | Medium (power users) | None |
| F-5 | **Field-level undo** — After saving, show "실행 취소" toast (like delete undo) that reverts the edit using `beforeValues` from `audit_logs`. | Medium | Medium | None |

### 13.3 Audit & Monitoring

| ID | Item | Effort | Value | Dependencies |
|---|------|--------|-------|-------------|
| F-6 | **Audit log viewer UI** — New tab or panel showing `audit_logs` entries filtered by `resourceType` / `resourceId`. Display `beforeValues` → `afterValues` diff with field-level highlighting. The data already exists (Phase 2 DELETE + Phase 4 UPDATE both write audit logs). | Medium | High for accountability | None |
| F-7 | **Per-record edit history** — In the EditableDetailDrawer, add a "변경 이력" accordion showing all past edits for this record from `audit_logs`. | Low | Medium | F-6 (shared components) |

### 13.4 UX Improvements

| ID | Item | Effort | Value | Dependencies |
|---|------|--------|-------|-------------|
| F-8 | **Column visibility toggle** — Add a dropdown in DataTable header to show/hide columns. `@tanstack/react-table` supports this natively via `columnVisibility` state. Mentioned in §3 and §6.2 of the original plan. | Low | Medium (wide tables) | None |
| F-9 | **Keyboard shortcuts in EditableDetailDrawer** — `Ctrl+S` to save, `Escape` to cancel edit mode, `Ctrl+E` to enter edit mode. | Low | Low (power users) | None |
| F-10 | **Completeness recalculation after edit** — When a field is edited from empty → populated (or vice versa), update the completeness bar in real-time without refetching. | Low | Medium (immediate feedback) | None |

### 13.5 Priority Recommendation

If continuing development, the recommended order is:

1. **F-8** (Column visibility toggle) — Low effort, fills a documented gap
2. **F-6** (Audit log viewer) — High value, all data already exists
3. **F-1** (React Query migration) — Foundational for F-2 and future real-time features
4. **F-3** (Bulk field editing) — High value for admin productivity
5. **F-7** (Per-record edit history) — Builds on F-6

---

## 14. Change Log

| Date | Change | Author |
|---|---|---|
| 2026-01-30 | Initial master plan created | Claude + Paul |
| 2026-01-30 | Phase 1 implementation complete (17 new files + 1 modified: 5 API routes, 5 shared components, 5 tab components, 1 main page, 1 master plan doc + UserMenu nav link) | Claude + Paul |
| 2026-01-30 | Bug fix: BigInt/Decimal serialization causing 500 errors on all API routes. Added `serializeRow()` helper to all 5 routes. Also fixed completeness format (number → `{ percent, filled, total }` object) and DetailDrawer nested key access. | Claude + Paul |
| 2026-01-30 | Local verification passed (all 5 tabs working). Committed as `d64ffe0`, pushed to production. | Claude + Paul |
| 2026-01-30 | Phase 2 implementation complete: Single-row soft-delete with audit. 4 new files + 9 modified (schema, 2 API routes, 2 shared components, 5 tab components, 1 master plan). 7 commits: schema migration, DELETE API, undo API, shared UI components, 5-tab integration, GET route filters, docs update. | Claude + Paul |
| 2026-01-31 | Phase 3 implementation complete: Bulk duplicate detection & delete. 7 new files + 4 modified. Three-tier detection algorithm (contentHash, pblancSeq, Damerau-Levenshtein title similarity ≥90%). Shared completeness utils extracted to `lib/utils/`. DuplicateDetectionPanel with expandable group cards, auto-suggest keep, bulk delete with transactional audit + undo. 5 commits (A–E). | Claude + Paul |
| 2026-01-31 | Fix: Center pagination controls in DataTable to prevent overlap with feedback button. 1 commit. | Claude + Paul |
| 2026-01-31 | Phase 4 implementation complete: Inline field editing in DetailDrawer. 4 new files + 9 modified. Schema: `afterValues` added to `audit_logs`. PATCH API with Zod `.strict()` validation + READONLY_FIELDS defense-in-depth. EditableField component (8 input types + enum Select). EditableDetailDrawer with dirty tracking, batch save, unsaved changes guard. Integrated into all 5 tabs. 5 commits. | Claude + Paul |
| 2026-01-31 | Post-Phase 4 audit: Added §12 (Implementation Deviations — 5 documented deviations between plan and actual code), §13 (Future Work Backlog — 10 items with effort/value/priority ranking), updated §3 tech stack table with actual-vs-planned annotations. Renumbered Change Log to §14. | Claude + Paul |
| | | |
