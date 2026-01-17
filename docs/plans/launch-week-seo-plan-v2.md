# Connect Launch-Week SEO Execution Plan (v2)

## Overview

**Objective**: Implement minimal SEO foundation on `connectplt.kr` (same host) before Connect launch  
**Timeline**: 1 day (December 19-20, 2025)  
**Connect Launch**: December 24, 2025  
**Core Principle**: Zero modifications to existing Connect routes, middleware, or Nginx configuration

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| v1 | Dec 19, 2025 | Initial plan |
| v2 | Dec 20, 2025 | Fixed sitemap (no non-existent URLs), corrected IndexNow key example, removed conflicting cache settings, added schema verification step |

---

## Why Same-Host Instead of INNOWAVE Subdomain

| Factor | Subdomain Approach | Same-Host Approach |
|--------|-------------------|-------------------|
| middleware.ts changes | Required | **Not required** |
| Nginx server block | Required | **Not required** |
| Host-based routing | Required | **Not required** |
| Verification complexity | Higher (new host) | **Lower** |
| Failure surface area | Larger | **Smaller** |
| Time to implement | 5-6 days | **1 day** |

The subdomain approach paradoxically touches more Connect infrastructure than simply adding isolated public pages.

---

## Scope: What We Will Implement

| Item | Priority | Estimated Time |
|------|----------|----------------|
| Schema verification (pre-step) | Critical | 15 minutes |
| Naver Search Advisor verification | Critical | 30 minutes |
| IndexNow key file (static) | Critical | 15 minutes |
| Static sitemap.xml (live URLs only) | Critical | 1 hour |
| One Korean pillar page | High | 4-6 hours |
| Google Search Console setup | Medium | 30 minutes |

**Total: ~8 hours of focused work**

---

## Scope: What We Will NOT Implement (Deferred to January)

- ❌ Program preview pages (`/programs/[id]`)
- ❌ Program URLs in sitemap (pages don't exist yet)
- ❌ Multiple Korean landing pages
- ❌ IndexNow scraper integration
- ❌ Complex structured data (JSON-LD)
- ❌ Any middleware.ts changes
- ❌ Any Nginx configuration changes
- ❌ INNOWAVE subdomain routing
- ❌ Database queries in sitemap

---

## File Structure (Isolated from Connect Core)

```
app/
├── (existing Connect routes - UNTOUCHED)
│
├── seo/                          # NEW: Isolated SEO directory
│   └── research-grants/
│       └── page.tsx              # Korean pillar page (ASCII URL)
│
├── sitemap.xml/
│   └── route.ts                  # Static sitemap (no DB queries)
│
└── robots.txt/
    └── route.ts                  # Robots.txt with sitemap reference

public/
└── <INDEXNOW_KEY>.txt            # Static IndexNow verification file
```

**Key Design Decisions**:
1. Use `/seo/research-grants` (ASCII) instead of `/연구과제-공고` (Korean) to avoid URL encoding issues during launch week
2. All SEO files are in isolated directories that don't touch existing routes
3. No modifications to `middleware.ts` or `config/nginx/`
4. Sitemap contains ONLY URLs that exist and return HTTP 200

---

## Implementation Steps

### Step 0: Schema Verification (Pre-Step) — 15 minutes

**CRITICAL**: Before writing any Prisma queries, verify the actual schema.

**Action**: Check `prisma/schema.prisma` for:

```bash
# Run in project root
grep -A 20 "model FundingProgram" prisma/schema.prisma
# Or the actual model name if different
```

**Verify these fields exist with exact names**:
- Model name: `FundingProgram` or `fundingProgram` or `funding_programs`?
- Status field: `status` or `programStatus`?
- Deadline field: `deadline` or `endDate` or `applicationDeadline`?
- Count method: Confirm `prisma.fundingProgram.count()` works

**Document actual field names here before proceeding**:
```
Model name: ________________
Status field: ________________
Deadline field: ________________
Active status value: ________________
```

**Why this matters**: The work rule states "Prevent schema field name mismatches: When modifying or updating Prisma schemas, do not assume field naming conventions."

---

### Step 1: Naver Search Advisor Registration (30 minutes)

**Action**: Register `connectplt.kr` at https://searchadvisor.naver.com

1. Go to Naver Search Advisor
2. Add site: `https://connectplt.kr`
3. Choose **HTML meta tag** verification method
4. Copy the verification code

**File to modify**: `app/layout.tsx`

```typescript
// Add to <head> section - DO NOT use JS redirects or meta refresh
<meta name="naver-site-verification" content="YOUR_VERIFICATION_CODE" />
```

**Critical Warning**: Naver verification fails if:
- The meta tag is rendered via JavaScript
- There are redirects on the page
- The page uses meta refresh
- Cookies or authentication affect the response

**Verification**: 
```bash
# Must see meta tag in raw HTML output
curl -sS https://connectplt.kr | grep "naver-site-verification"
```

---

### Step 2: IndexNow Key File (15 minutes)

**Action**: Create static verification file

1. Generate a 32-character hexadecimal key:
```bash
openssl rand -hex 16
# Example valid output: 4a7b9c2d8e1f6a3b5c0d9e8f7a6b4c2d
```

**Note**: The output contains ONLY characters 0-9 and a-f (hexadecimal).

2. Create the key file:

**File**: `public/4a7b9c2d8e1f6a3b5c0d9e8f7a6b4c2d.txt`

```
4a7b9c2d8e1f6a3b5c0d9e8f7a6b4c2d
```

The file contains only the key value itself, no other content, no newline at end.

3. Add to environment:

**File**: `.env.production`
```
INDEXNOW_KEY=4a7b9c2d8e1f6a3b5c0d9e8f7a6b4c2d
```

**Verification**: After deployment:
```bash
curl -sS https://connectplt.kr/4a7b9c2d8e1f6a3b5c0d9e8f7a6b4c2d.txt
# Should return exactly: 4a7b9c2d8e1f6a3b5c0d9e8f7a6b4c2d
```

---

### Step 3: Static Sitemap (1 hour)

**IMPORTANT**: Launch-week sitemap includes ONLY URLs that:
1. Exist right now
2. Are publicly accessible
3. Return HTTP 200

**NO database queries. NO placeholder URLs.**

**File**: `app/sitemap.xml/route.ts`

```typescript
import { NextResponse } from 'next/server';

const BASE_URL = 'https://connectplt.kr';

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

export async function GET() {
  const today = getToday();

  // ✅ Launch-week rule: ONLY include URLs that exist and return 200
  // ❌ Do NOT include /programs/{id} - those pages don't exist yet
  const urls = [
    {
      loc: `${BASE_URL}/`,
      lastmod: today,
      changefreq: 'daily',
      priority: '1.0',
    },
    {
      loc: `${BASE_URL}/seo/research-grants`,
      lastmod: today,
      changefreq: 'daily',
      priority: '0.9',
    },
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      // Simple caching: short TTL for quick updates after deploy
      'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=600',
    },
  });
}
```

**Why no `dynamic` or `revalidate` exports**: These Next.js directives can conflict. For launch week, simple HTTP Cache-Control headers are sufficient and less error-prone.

**Verification checklist**:
```bash
# 1. Check HTTP 200
curl -I https://connectplt.kr/sitemap.xml

# 2. Validate XML syntax
curl -sS https://connectplt.kr/sitemap.xml | xmllint --noout -

# 3. Confirm cache header exists
curl -I https://connectplt.kr/sitemap.xml | grep -i cache-control

# 4. Confirm only real URLs are included (no /programs/)
curl -sS https://connectplt.kr/sitemap.xml | grep -c "programs"
# Should return: 0
```

---

### Step 4: Robots.txt (15 minutes)

**File**: `app/robots.txt/route.ts`

```typescript
import { NextResponse } from 'next/server';

export async function GET() {
  const robotsTxt = `User-agent: *
Allow: /
Allow: /seo/
Disallow: /api/
Disallow: /dashboard/
Disallow: /admin/
Disallow: /auth/

Sitemap: https://connectplt.kr/sitemap.xml
`;

  return new NextResponse(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
```

---

### Step 5: Korean Pillar Page (4-6 hours)

**File**: `app/seo/research-grants/page.tsx`

```typescript
import { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = {
  title: '연구과제 공고 | 정부 R&D 지원사업 통합 검색 - Connect',
  description:
    'NTIS, KEIT, IITP, TIPA 등 정부 연구과제 공고를 한 곳에서 검색하세요. AI 매칭으로 우리 기업에 맞는 R&D 지원사업을 찾아드립니다.',
  keywords: [
    '연구과제 공고',
    '정부과제',
    'R&D 지원사업',
    '국가연구개발사업',
    'NTIS',
    '중소기업 R&D',
  ],
  openGraph: {
    title: '연구과제 공고 | Connect',
    description: '정부 R&D 지원사업 통합 검색 플랫폼',
    locale: 'ko_KR',
    type: 'website',
  },
  alternates: {
    canonical: 'https://connectplt.kr/seo/research-grants',
  },
};

// ⚠️ IMPORTANT: Verify field names match your actual Prisma schema (Step 0)
// Replace 'status', 'ACTIVE', 'deadline' with actual field names if different
async function getProgramStats() {
  try {
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const now = new Date();

    const [totalCount, urgentCount] = await Promise.all([
      prisma.fundingProgram.count({
        where: { status: 'ACTIVE' },
      }),
      prisma.fundingProgram.count({
        where: {
          status: 'ACTIVE',
          deadline: {
            lte: sevenDaysFromNow,
            gte: now,
          },
        },
      }),
    ]);
    return { totalCount, urgentCount };
  } catch (error) {
    console.error('Failed to fetch program stats:', error);
    // Graceful fallback - page still renders without stats
    return { totalCount: 0, urgentCount: 0 };
  }
}

export default async function ResearchGrantsPage() {
  const { totalCount, urgentCount } = await getProgramStats();

  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="py-16 px-4 max-w-4xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
          연구과제 공고
        </h1>

        <p className="text-lg text-gray-700 mb-8 leading-relaxed">
          정부 R&D 지원사업 공고를 한 곳에서 검색하고, AI 매칭으로 우리 기업에
          딱 맞는 연구과제를 찾아보세요.
        </p>

        {/* Live Stats - only show if we have data */}
        {totalCount > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <p className="text-blue-900 text-lg">
              현재{' '}
              <span className="font-bold text-2xl">
                {totalCount.toLocaleString()}
              </span>
              개 연구과제 공고 중
              {urgentCount > 0 && (
                <span className="ml-2 text-red-600">
                  (마감 임박 {urgentCount}건)
                </span>
              )}
            </p>
          </div>
        )}

        {/* CTA */}
        <Link
          href="/auth/signup"
          className="inline-block bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          무료로 시작하기
        </Link>
      </section>

      {/* Pain Points Section */}
      <section className="py-12 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            기존 연구과제 검색의 문제점
          </h2>

          <div className="space-y-4 text-gray-700">
            <p>
              NTIS, KEIT, IITP, TIPA, KIMST 등 각 부처별 공고 사이트를 일일이
              확인해야 합니다.
            </p>
            <p>
              공고마다 지원 자격, 신청 기간, 지원 규모가 다르고, 우리 기업에 맞는
              과제를 찾기 어렵습니다.
            </p>
            <p>
              마감일을 놓치면 1년을 기다려야 하는 경우도 많습니다.
            </p>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Connect가 해결합니다
          </h2>

          <div className="space-y-4 text-gray-700">
            <p className="flex items-start">
              <span className="text-blue-600 mr-3 flex-shrink-0">✓</span>
              <span>모든 정부 R&D 공고를 한 곳에서 통합 검색</span>
            </p>
            <p className="flex items-start">
              <span className="text-blue-600 mr-3 flex-shrink-0">✓</span>
              <span>AI가 기업 프로필 기반으로 맞춤 과제 추천</span>
            </p>
            <p className="flex items-start">
              <span className="text-blue-600 mr-3 flex-shrink-0">✓</span>
              <span>마감 임박 알림으로 기회를 놓치지 않음</span>
            </p>
            <p className="flex items-start">
              <span className="text-blue-600 mr-3 flex-shrink-0">✓</span>
              <span>지원 자격 자동 필터링으로 시간 절약</span>
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-12 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            자주 묻는 질문
          </h2>

          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Connect는 무료인가요?
              </h3>
              <p className="text-gray-700">
                기본 검색과 공고 확인은 무료입니다. AI 매칭과 알림 기능은 유료
                플랜에서 제공됩니다.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                어떤 기관의 공고가 포함되나요?
              </h3>
              <p className="text-gray-700">
                NTIS, KEIT, IITP, TIPA, KIMST 등 주요 정부 R&D 지원기관의 공고를
                통합하여 제공합니다.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                공고 정보는 얼마나 자주 업데이트되나요?
              </h3>
              <p className="text-gray-700">
                매일 자동으로 각 기관 사이트를 확인하여 새로운 공고를
                업데이트합니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            지금 바로 시작하세요
          </h2>
          <p className="text-gray-700 mb-8">
            우리 기업에 맞는 정부 R&D 지원사업을 찾아보세요.
          </p>
          <Link
            href="/auth/signup"
            className="inline-block bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            무료로 시작하기
          </Link>
        </div>
      </section>
    </main>
  );
}
```

**Important**: The pillar page DOES use Prisma for live stats, but:
- It's isolated in a new file (not modifying existing code)
- It has error handling with graceful fallback
- Field names must be verified in Step 0

---

### Step 6: Submit to Search Engines (30 minutes)

**After deployment, complete these manual steps:**

#### Naver Search Advisor
1. Verify ownership (should already be done via meta tag)
2. Go to "요청" → "사이트맵 제출"
3. Submit: `https://connectplt.kr/sitemap.xml`
4. Go to "요청" → "웹 페이지 수집"
5. Request indexing for: `https://connectplt.kr/seo/research-grants`

#### Google Search Console
1. Add property: `https://connectplt.kr`
2. Verify via HTML meta tag or DNS
3. Submit sitemap: `https://connectplt.kr/sitemap.xml`
4. Request indexing for pillar page via URL Inspection tool

#### Bing Webmaster Tools
1. Add site: `https://connectplt.kr`
2. Verify ownership
3. Submit sitemap

---

## Deployment Checklist

### Pre-Deployment
- [ ] **Step 0 completed**: Prisma schema field names verified and documented
- [ ] Naver verification meta tag added to `app/layout.tsx`
- [ ] IndexNow key file created in `public/` (valid hex characters only)
- [ ] `INDEXNOW_KEY` added to `.env.production`
- [ ] Sitemap route created (static URLs only, no DB queries)
- [ ] Robots.txt route created
- [ ] Pillar page created with correct field names
- [ ] Local build passes: `npm run build`
- [ ] Docker build passes: `docker buildx build --platform linux/amd64 -f Dockerfile.production -t connect:latest . --no-cache`

### Deployment
- [ ] Commit all changes (no push yet)
- [ ] Push to trigger CI/CD
- [ ] Monitor Grafana during deployment

### Post-Deployment Verification
- [ ] `https://connectplt.kr/sitemap.xml` returns valid XML
- [ ] `https://connectplt.kr/sitemap.xml` contains NO `/programs/` URLs
- [ ] `https://connectplt.kr/robots.txt` returns correct content
- [ ] `https://connectplt.kr/<INDEXNOW_KEY>.txt` returns the key
- [ ] `https://connectplt.kr/seo/research-grants` loads correctly
- [ ] View source shows Naver verification meta tag (in raw HTML, not JS-rendered)
- [ ] All existing Connect routes still work

### Search Engine Submission
- [ ] Naver Search Advisor: sitemap submitted
- [ ] Naver Search Advisor: pillar page indexing requested
- [ ] Google Search Console: sitemap submitted
- [ ] Bing Webmaster Tools: sitemap submitted

---

## Files Summary

| File | Action | Risk Level |
|------|--------|------------|
| `app/layout.tsx` | Add meta tag | Very Low |
| `public/<KEY>.txt` | Create new | None |
| `.env.production` | Add variable | Very Low |
| `app/sitemap.xml/route.ts` | Create new (static, no DB) | Very Low |
| `app/robots.txt/route.ts` | Create new | Very Low |
| `app/seo/research-grants/page.tsx` | Create new | Low |

**Total files modified**: 1 (layout.tsx - meta tag only)  
**Total files created**: 5  
**Middleware changes**: None  
**Nginx changes**: None  
**Sitemap database queries**: None (deferred to January)  
**Risk to Connect**: Minimal

---

## Key Differences from v1

| Aspect | v1 (Original) | v2 (Updated) |
|--------|---------------|--------------|
| Sitemap URLs | Included `/programs/{id}` | Only live URLs |
| Sitemap DB queries | Yes (Prisma) | No |
| IndexNow key example | Invalid hex chars | Valid hex only |
| Caching strategy | Conflicting settings | HTTP headers only |
| Schema verification | Not included | Added as Step 0 |

---

## Success Criteria

After implementation, verify:

1. **Sitemap valid**: Returns XML with ONLY existing URLs (no `/programs/`)
2. **Verification working**: View source shows Naver meta tag in raw HTML
3. **IndexNow ready**: Key file accessible and contains valid hex key
4. **Pillar page live**: Korean content renders (with or without stats)
5. **Connect unaffected**: All existing routes function normally

---

## Timeline

| Time | Task |
|------|------|
| 0:00 - 0:15 | Step 0: Schema verification |
| 0:15 - 0:45 | Step 1: Naver Search Advisor registration + meta tag |
| 0:45 - 1:00 | Step 2: IndexNow key file creation |
| 1:00 - 2:00 | Step 3: Static sitemap implementation |
| 2:00 - 2:15 | Step 4: Robots.txt |
| 2:15 - 6:15 | Step 5: Korean pillar page development |
| 6:15 - 7:15 | Local testing + Docker build |
| 7:15 - 8:00 | Deployment + verification |
| Post-deploy | Step 6: Search engine submissions |

**Total estimated time**: 8 hours

---

## What Comes Next (January 2026)

After Connect launch stabilizes:

1. **Week 1**: Add program preview pages (`/programs/[id]`)
2. **Week 2**: Add program URLs to sitemap (now that pages exist)
3. **Week 2**: Add additional Korean landing pages
4. **Week 3**: Implement IndexNow automation in scraper
5. **Week 4**: Evaluate INNOWAVE subdomain decision

See `january-2026-seo-expansion-plan.md` for details.
