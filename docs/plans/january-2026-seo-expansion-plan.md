# Connect SEO Expansion Plan - January 2026

## Overview

**Objective**: Expand SEO foundation with program previews, additional landing pages, and IndexNow automation  
**Timeline**: January 2026 (after Connect launch stabilization)  
**Prerequisites**: Launch-week SEO foundation deployed and verified  
**Connect Launch**: December 24, 2025

---

## Why January (Not Launch Week)

| Risk Factor | Launch Week | January |
|-------------|-------------|---------|
| Connect stability | Critical priority | Stable |
| Time available | 4-5 days | Flexible |
| Failure impact | High (launch at risk) | Low (isolated) |
| Debugging capacity | Limited | Full |
| Database query additions | Risky | Safe |

---

## Phase 1: Program Preview Pages (Week 1)

### 1.1 Overview

Create public preview pages for funding programs at `/programs/[id]` that are:
- Read-only (no authentication required)
- SEO-optimized (structured data, meta tags)
- Lightweight (no heavy dashboard components)
- Safe (read-only database access)

### 1.2 File Structure

```
app/
└── programs/
    └── [id]/
        └── page.tsx              # Public program preview

lib/
└── seo/
    ├── public-programs.ts        # Read-only program queries
    └── program-structured-data.ts # JSON-LD generator
```

### 1.3 Implementation

**File**: `lib/seo/public-programs.ts`

```typescript
import { prisma } from '@/lib/prisma';

// Define public fields explicitly - exclude internal data
const PUBLIC_PROGRAM_FIELDS = {
  id: true,
  title: true,
  agency: true,
  description: true,
  deadline: true,
  budget: true,
  eligibility: true,
  status: true,
  sourceUrl: true,
  createdAt: true,
  updatedAt: true,
  // Exclude: contentHash, internalNotes, rawScrapedData
};

export async function getPublicProgram(id: string) {
  try {
    const program = await prisma.fundingProgram.findUnique({
      where: { id },
      select: PUBLIC_PROGRAM_FIELDS,
    });

    if (!program || program.status !== 'ACTIVE') {
      return null;
    }

    return program;
  } catch (error) {
    console.error('Failed to fetch public program:', error);
    return null;
  }
}

export async function getPublicProgramList(options: {
  limit?: number;
  offset?: number;
  agency?: string;
}) {
  const { limit = 50, offset = 0, agency } = options;

  // Hard cap to prevent abuse
  const safeLimit = Math.min(limit, 100);

  try {
    const programs = await prisma.fundingProgram.findMany({
      where: {
        status: 'ACTIVE',
        ...(agency && { agency }),
      },
      select: {
        id: true,
        title: true,
        agency: true,
        deadline: true,
        updatedAt: true,
      },
      take: safeLimit,
      skip: offset,
      orderBy: { deadline: 'asc' },
    });

    return programs;
  } catch (error) {
    console.error('Failed to fetch public program list:', error);
    return [];
  }
}
```

**File**: `lib/seo/program-structured-data.ts`

```typescript
type PublicProgram = {
  id: string;
  title: string;
  agency: string;
  description: string | null;
  deadline: Date | null;
  budget: string | null;
  eligibility: string | null;
  sourceUrl: string | null;
};

export function generateProgramStructuredData(program: PublicProgram) {
  return {
    '@context': 'https://schema.org',
    '@type': 'GovernmentService',
    name: program.title,
    provider: {
      '@type': 'GovernmentOrganization',
      name: program.agency,
    },
    description: program.description || undefined,
    url: `https://connectplt.kr/programs/${program.id}`,
    ...(program.sourceUrl && {
      mainEntityOfPage: program.sourceUrl,
    }),
  };
}

export function generateBreadcrumbData(program: PublicProgram) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: '홈',
        item: 'https://connectplt.kr',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: '연구과제 공고',
        item: 'https://connectplt.kr/seo/research-grants',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: program.title,
        item: `https://connectplt.kr/programs/${program.id}`,
      },
    ],
  };
}
```

**File**: `app/programs/[id]/page.tsx`

```typescript
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPublicProgram } from '@/lib/seo/public-programs';
import {
  generateProgramStructuredData,
  generateBreadcrumbData,
} from '@/lib/seo/program-structured-data';

type Props = {
  params: { id: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const program = await getPublicProgram(params.id);

  if (!program) {
    return {
      title: '공고를 찾을 수 없습니다 - Connect',
    };
  }

  return {
    title: `${program.title} | ${program.agency} - Connect`,
    description:
      program.description?.slice(0, 160) ||
      `${program.agency}에서 공고한 ${program.title} 연구과제 정보를 확인하세요.`,
    openGraph: {
      title: program.title,
      description: program.description?.slice(0, 160) || '',
      locale: 'ko_KR',
      type: 'article',
    },
    alternates: {
      canonical: `https://connectplt.kr/programs/${params.id}`,
    },
  };
}

export default async function ProgramPreviewPage({ params }: Props) {
  const program = await getPublicProgram(params.id);

  if (!program) {
    notFound();
  }

  const structuredData = generateProgramStructuredData(program);
  const breadcrumbData = generateBreadcrumbData(program);

  const isExpired = program.deadline && new Date(program.deadline) < new Date();
  const daysUntilDeadline = program.deadline
    ? Math.ceil(
        (new Date(program.deadline).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }}
      />

      <main className="min-h-screen bg-white py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <nav className="text-sm text-gray-500 mb-6">
            <Link href="/" className="hover:text-blue-600">
              홈
            </Link>
            <span className="mx-2">/</span>
            <Link href="/seo/research-grants" className="hover:text-blue-600">
              연구과제 공고
            </Link>
            <span className="mx-2">/</span>
            <span className="text-gray-700">{program.title}</span>
          </nav>

          {/* Header */}
          <header className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <span className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded">
                {program.agency}
              </span>
              {isExpired ? (
                <span className="bg-gray-100 text-gray-600 text-sm px-3 py-1 rounded">
                  마감됨
                </span>
              ) : daysUntilDeadline !== null && daysUntilDeadline <= 7 ? (
                <span className="bg-red-100 text-red-800 text-sm px-3 py-1 rounded">
                  D-{daysUntilDeadline}
                </span>
              ) : null}
            </div>

            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              {program.title}
            </h1>
          </header>

          {/* Key Info */}
          <section className="bg-gray-50 rounded-lg p-6 mb-8">
            <h2 className="sr-only">주요 정보</h2>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {program.deadline && (
                <div>
                  <dt className="text-sm text-gray-500">마감일</dt>
                  <dd className="font-semibold text-gray-900">
                    {new Date(program.deadline).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </dd>
                </div>
              )}
              {program.budget && (
                <div>
                  <dt className="text-sm text-gray-500">지원 규모</dt>
                  <dd className="font-semibold text-gray-900">
                    {program.budget}
                  </dd>
                </div>
              )}
            </dl>
          </section>

          {/* Description */}
          {program.description && (
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                과제 개요
              </h2>
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                {program.description}
              </p>
            </section>
          )}

          {/* Eligibility */}
          {program.eligibility && (
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                지원 자격
              </h2>
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                {program.eligibility}
              </p>
            </section>
          )}

          {/* Official Link */}
          {program.sourceUrl && (
            <section className="mb-8 p-4 border border-blue-200 bg-blue-50 rounded-lg">
              <h2 className="text-sm font-semibold text-blue-900 mb-2">
                공식 공고 링크
              </h2>
              <a
                href={program.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline break-all"
              >
                {program.sourceUrl}
              </a>
              <p className="text-xs text-blue-700 mt-2">
                ※ 정확한 정보는 공식 공고문을 확인하세요.
              </p>
            </section>
          )}

          {/* CTA */}
          <section className="text-center py-8 border-t border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              이 과제에 관심이 있으신가요?
            </h2>
            <p className="text-gray-600 mb-6">
              Connect에서 AI 매칭으로 더 많은 맞춤 과제를 찾아보세요.
            </p>
            <Link
              href="/auth/signup"
              className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              무료로 시작하기
            </Link>
          </section>
        </div>
      </main>
    </>
  );
}
```

**File**: `app/programs/[id]/not-found.tsx`

```typescript
import Link from 'next/link';

export default function ProgramNotFound() {
  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          공고를 찾을 수 없습니다
        </h1>
        <p className="text-gray-600 mb-8">
          요청하신 연구과제 공고가 존재하지 않거나 마감되었습니다.
        </p>
        <Link
          href="/seo/research-grants"
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          다른 공고 보기
        </Link>
      </div>
    </main>
  );
}
```

### 1.4 Database Security (Recommended)

Create a read-only PostgreSQL user for SEO queries:

```sql
-- Run in production PostgreSQL
CREATE USER connect_readonly WITH PASSWORD 'secure_password_here';
GRANT CONNECT ON DATABASE connect TO connect_readonly;
GRANT USAGE ON SCHEMA public TO connect_readonly;
GRANT SELECT ON funding_programs TO connect_readonly;

-- Prevent any write operations
REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM connect_readonly;
```

Then create a separate Prisma client for SEO queries (optional but recommended):

```typescript
// lib/seo/prisma-readonly.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prismaReadonly: PrismaClient };

export const prismaReadonly =
  globalForPrisma.prismaReadonly ||
  new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_READONLY_URL,
      },
    },
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prismaReadonly = prismaReadonly;
}
```

---

## Phase 2: Additional Korean Landing Pages (Week 2)

### 2.1 Overview

Add two more keyword-targeted landing pages to complement the existing pillar page.

### 2.2 Landing Pages

| Route | Target Keywords | Focus |
|-------|----------------|-------|
| `/seo/government-rnd` | 국가 R&D, 정부 연구개발 | Government R&D programs |
| `/seo/sme-funding` | 중소기업 R&D, 정부지원사업 | SME/startup funding |

### 2.3 Implementation

**File**: `app/seo/government-rnd/page.tsx`

```typescript
import { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = {
  title: '국가 R&D 공고 | 정부 연구개발 지원사업 - Connect',
  description:
    '산업부, 과기부, 중기부 등 정부 부처별 국가 R&D 공고를 한 곳에서 검색하세요.',
  keywords: ['국가 R&D', '정부 연구개발', '국가연구개발사업', 'R&D 과제'],
  openGraph: {
    title: '국가 R&D 공고 | Connect',
    description: '정부 연구개발 지원사업 통합 검색',
    locale: 'ko_KR',
  },
  alternates: {
    canonical: 'https://connectplt.kr/seo/government-rnd',
  },
};

async function getAgencyStats() {
  try {
    const agencies = await prisma.fundingProgram.groupBy({
      by: ['agency'],
      where: { status: 'ACTIVE' },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });
    return agencies;
  } catch {
    return [];
  }
}

export default async function GovernmentRndPage() {
  const agencyStats = await getAgencyStats();

  return (
    <main className="min-h-screen bg-white">
      <section className="py-16 px-4 max-w-4xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
          국가 R&D 공고
        </h1>

        <p className="text-lg text-gray-700 mb-8 leading-relaxed">
          산업통상자원부, 과학기술정보통신부, 중소벤처기업부 등 
          정부 부처별 국가 연구개발 사업 공고를 통합 검색하세요.
        </p>

        {/* Agency breakdown */}
        {agencyStats.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              기관별 공고 현황
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {agencyStats.map((agency) => (
                <div
                  key={agency.agency}
                  className="bg-white p-3 rounded border text-center"
                >
                  <div className="text-sm text-gray-600">{agency.agency}</div>
                  <div className="text-xl font-bold text-blue-600">
                    {agency._count.id}건
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <Link
          href="/auth/signup"
          className="inline-block bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          무료로 시작하기
        </Link>
      </section>

      {/* Additional content sections similar to research-grants page */}
      {/* ... */}
    </main>
  );
}
```

**File**: `app/seo/sme-funding/page.tsx`

```typescript
import { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = {
  title: '중소기업 R&D 지원사업 | 정부과제 공고 - Connect',
  description:
    '중소기업과 스타트업을 위한 정부 R&D 지원사업을 찾아보세요. TIPA, 중기부 과제 통합 검색.',
  keywords: ['중소기업 R&D', '정부지원사업', '스타트업 지원', 'TIPA'],
  openGraph: {
    title: '중소기업 R&D 지원사업 | Connect',
    description: '중소기업 정부과제 통합 검색',
    locale: 'ko_KR',
  },
  alternates: {
    canonical: 'https://connectplt.kr/seo/sme-funding',
  },
};

async function getSmeStats() {
  try {
    const count = await prisma.fundingProgram.count({
      where: {
        status: 'ACTIVE',
        OR: [
          { agency: { contains: '중소' } },
          { agency: { contains: 'TIPA' } },
          { title: { contains: '중소기업' } },
          { title: { contains: '스타트업' } },
        ],
      },
    });
    return count;
  } catch {
    return 0;
  }
}

export default async function SmeFundingPage() {
  const smeCount = await getSmeStats();

  return (
    <main className="min-h-screen bg-white">
      <section className="py-16 px-4 max-w-4xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
          중소기업 R&D 지원사업
        </h1>

        <p className="text-lg text-gray-700 mb-8 leading-relaxed">
          중소기업과 스타트업을 위한 정부 R&D 지원사업을 한 곳에서 검색하세요.
          TIPA, 중기부 등 중소기업 전문 지원기관의 과제를 모았습니다.
        </p>

        {smeCount > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
            <p className="text-green-900 text-lg">
              현재{' '}
              <span className="font-bold text-2xl">
                {smeCount.toLocaleString()}
              </span>
              개 중소기업 대상 과제 공고 중
            </p>
          </div>
        )}

        <Link
          href="/auth/signup"
          className="inline-block bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          무료로 시작하기
        </Link>
      </section>

      {/* Additional content sections */}
      {/* ... */}
    </main>
  );
}
```

### 2.4 Update Sitemap

Add new landing pages to the sitemap:

```typescript
// app/sitemap.xml/route.ts - update staticPages array
const staticPages = [
  { url: baseUrl, priority: '1.0', changefreq: 'daily' },
  { url: `${baseUrl}/seo/research-grants`, priority: '0.9', changefreq: 'daily' },
  { url: `${baseUrl}/seo/government-rnd`, priority: '0.9', changefreq: 'daily' },
  { url: `${baseUrl}/seo/sme-funding`, priority: '0.9', changefreq: 'daily' },
];
```

---

## Phase 3: IndexNow Automation (Week 3)

### 3.1 Overview

Automatically submit new program URLs to search engines when the scraper discovers them.

### 3.2 Implementation

**File**: `lib/seo/indexnow.ts`

```typescript
const INDEXNOW_KEY = process.env.INDEXNOW_KEY;
const INDEXNOW_ENDPOINTS = [
  'https://api.indexnow.org/indexnow',
  'https://www.bing.com/indexnow',
  'https://searchadvisor.naver.com/indexnow',
];

type IndexNowResult = {
  endpoint: string;
  success: boolean;
  status?: number;
  error?: string;
};

export async function submitToIndexNow(
  urls: string[]
): Promise<IndexNowResult[]> {
  if (!INDEXNOW_KEY) {
    console.warn('IndexNow: INDEXNOW_KEY not configured');
    return [];
  }

  if (urls.length === 0) {
    return [];
  }

  // IndexNow supports up to 10,000 URLs per request
  const batchSize = Math.min(urls.length, 10000);
  const batch = urls.slice(0, batchSize);

  const results: IndexNowResult[] = [];

  for (const endpoint of INDEXNOW_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host: 'connectplt.kr',
          key: INDEXNOW_KEY,
          keyLocation: `https://connectplt.kr/${INDEXNOW_KEY}.txt`,
          urlList: batch,
        }),
      });

      results.push({
        endpoint,
        success: response.ok,
        status: response.status,
      });

      if (response.ok) {
        console.log(`IndexNow: Submitted ${batch.length} URLs to ${endpoint}`);
      } else {
        console.warn(
          `IndexNow: Failed to submit to ${endpoint}, status: ${response.status}`
        );
      }
    } catch (error) {
      results.push({
        endpoint,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      console.error(`IndexNow: Error submitting to ${endpoint}:`, error);
    }
  }

  return results;
}

export async function submitSingleUrl(url: string): Promise<IndexNowResult[]> {
  return submitToIndexNow([url]);
}
```

**File**: `lib/seo/indexnow-queue.ts`

```typescript
// Simple in-memory queue with batching
// For production, consider using Redis queue

const pendingUrls: Set<string> = new Set();
let flushTimeout: NodeJS.Timeout | null = null;

const BATCH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function queueUrlForIndexing(url: string): void {
  pendingUrls.add(url);

  // Schedule batch submission if not already scheduled
  if (!flushTimeout) {
    flushTimeout = setTimeout(flushQueue, BATCH_INTERVAL_MS);
  }
}

async function flushQueue(): Promise<void> {
  flushTimeout = null;

  if (pendingUrls.size === 0) {
    return;
  }

  const urls = Array.from(pendingUrls);
  pendingUrls.clear();

  const { submitToIndexNow } = await import('./indexnow');
  await submitToIndexNow(urls);
}

// Force flush (for testing or shutdown)
export async function forceFlush(): Promise<void> {
  if (flushTimeout) {
    clearTimeout(flushTimeout);
    flushTimeout = null;
  }
  await flushQueue();
}
```

### 3.3 Scraper Integration

Add IndexNow queue trigger to the scraper worker:

**File**: `lib/scraping/worker.ts` (modification)

```typescript
// Add import at top of file
import { queueUrlForIndexing } from '@/lib/seo/indexnow-queue';

// After creating a new funding program (approximately line 335)
// Find the section where new programs are created and add:

// After: await prisma.fundingProgram.create({ ... })
// Add:
const programUrl = `https://connectplt.kr/programs/${newProgram.id}`;
queueUrlForIndexing(programUrl);
console.log(`Scraper: Queued ${programUrl} for IndexNow submission`);
```

### 3.4 Testing

```bash
# Test IndexNow submission manually
curl -X POST https://api.indexnow.org/indexnow \
  -H "Content-Type: application/json" \
  -d '{
    "host": "connectplt.kr",
    "key": "YOUR_INDEXNOW_KEY",
    "keyLocation": "https://connectplt.kr/YOUR_INDEXNOW_KEY.txt",
    "urlList": ["https://connectplt.kr/seo/research-grants"]
  }'
```

---

## Phase 4: INNOWAVE Subdomain Evaluation (Week 4)

### 4.1 Decision Framework

After 30 days of data, evaluate whether to implement the INNOWAVE subdomain:

| Metric | Threshold for Subdomain | Action |
|--------|-------------------------|--------|
| Connect stability | No major incidents | Proceed |
| SEO pages indexed | 50+ in Naver | Proceed |
| Organic traffic | 500+ sessions | Proceed |
| Click-through to signup | 2%+ conversion | Proceed |

### 4.2 If Proceeding with Subdomain

If metrics are positive and you want stronger brand separation:

1. Create `innowave.connectplt.kr` DNS record
2. Implement host-based middleware routing
3. Move SEO pages to `(innowave)` route group
4. Set up separate Naver Search Advisor registration
5. Implement canonical URLs pointing to subdomain
6. Monitor for any negative SEO impact

### 4.3 Alternative: Korean URL Aliases

Instead of a subdomain, add Korean URL aliases to existing pages:

```typescript
// next.config.js
async redirects() {
  return [
    {
      source: '/연구과제-공고',
      destination: '/seo/research-grants',
      permanent: true,
    },
    {
      source: '/국가-rnd-공고',
      destination: '/seo/government-rnd',
      permanent: true,
    },
    {
      source: '/정부과제-공고',
      destination: '/seo/sme-funding',
      permanent: true,
    },
  ];
}
```

This provides Korean URL discoverability without subdomain complexity.

---

## Phase 5: Analytics & Measurement (Ongoing)

### 5.1 Cross-Domain Tracking

Add UTM parameters to all CTAs pointing to Connect signup:

```typescript
// Example CTA link with UTM
<Link
  href="/auth/signup?utm_source=seo&utm_medium=organic&utm_campaign=research-grants"
>
  무료로 시작하기
</Link>
```

### 5.2 Key Metrics Dashboard

Track these metrics in your analytics:

| Metric | Tool | Goal |
|--------|------|------|
| Pages indexed (Naver) | Naver Search Advisor | 50+ |
| Pages indexed (Google) | Google Search Console | 50+ |
| Organic sessions | GA4 | 500+/month |
| CTR from SEO pages | GA4 | 2%+ |
| Signups from SEO | GA4 + UTM | 10+/month |

### 5.3 Naver Search Advisor Monitoring

Check weekly:
- "사이트 현황" → indexing status
- "검색 통계" → keyword rankings
- "오류" → crawl errors

---

## Timeline Summary

| Week | Phase | Deliverables |
|------|-------|--------------|
| Week 1 | Program Previews | `/programs/[id]` pages live |
| Week 2 | Landing Pages | 2 additional Korean pages |
| Week 3 | IndexNow | Automated URL submission |
| Week 4 | Evaluation | Subdomain decision |
| Ongoing | Analytics | Measurement & optimization |

---

## Files Summary

### Phase 1: Program Previews
| File | Action |
|------|--------|
| `lib/seo/public-programs.ts` | Create |
| `lib/seo/program-structured-data.ts` | Create |
| `app/programs/[id]/page.tsx` | Create |
| `app/programs/[id]/not-found.tsx` | Create |

### Phase 2: Landing Pages
| File | Action |
|------|--------|
| `app/seo/government-rnd/page.tsx` | Create |
| `app/seo/sme-funding/page.tsx` | Create |
| `app/sitemap.xml/route.ts` | Modify |

### Phase 3: IndexNow
| File | Action |
|------|--------|
| `lib/seo/indexnow.ts` | Create |
| `lib/seo/indexnow-queue.ts` | Create |
| `lib/scraping/worker.ts` | Modify |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Database load from previews | Read-only queries + ISR caching |
| Scraper disruption | Async IndexNow queue (non-blocking) |
| SEO cannibalization | Distinct keyword targeting per page |
| Build failures | Feature branch + CI testing |

---

## Success Criteria (30 Days Post-Phase 3)

| Metric | Target |
|--------|--------|
| Program preview pages indexed | 100+ |
| Landing pages indexed | 3/3 |
| IndexNow submissions/week | 50+ |
| Organic traffic growth | 20%+ MoM |
| Signup conversion from SEO | 10+ signups |
