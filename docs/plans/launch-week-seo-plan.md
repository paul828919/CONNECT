# Connect Launch-Week SEO Execution Plan

## Overview

**Objective**: Implement minimal SEO foundation on `connectplt.kr` (same host) before Connect launch  
**Timeline**: 1 day (December 19-20, 2025)  
**Connect Launch**: December 24, 2025  
**Core Principle**: Zero modifications to existing Connect routes, middleware, or Nginx configuration

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
| Naver Search Advisor verification | Critical | 30 minutes |
| IndexNow key file (static) | Critical | 15 minutes |
| Dynamic sitemap.xml | Critical | 2-3 hours |
| One Korean pillar page | High | 4-6 hours |
| Google Search Console setup | Medium | 30 minutes |

**Total: ~8 hours of focused work**

---

## Scope: What We Will NOT Implement (Deferred to January)

- ❌ Program preview pages (`/programs/[id]`)
- ❌ Multiple Korean landing pages
- ❌ IndexNow scraper integration
- ❌ Complex structured data (JSON-LD)
- ❌ Any middleware.ts changes
- ❌ Any Nginx configuration changes
- ❌ INNOWAVE subdomain routing
- ❌ Database query modifications

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
│   └── route.ts                  # Dynamic sitemap generator
│
└── robots.txt/
    └── route.ts                  # Robots.txt with sitemap reference

public/
└── <INDEXNOW_KEY>.txt            # Static IndexNow verification file

lib/
└── seo/
    └── sitemap-programs.ts       # Read-only program list for sitemap
```

**Key Design Decisions**:
1. Use `/seo/research-grants` (ASCII) instead of `/연구과제-공고` (Korean) to avoid URL encoding issues during launch week
2. All SEO files are in isolated directories that don't touch existing routes
3. No modifications to `middleware.ts` or `config/nginx/`

---

## Implementation Steps

### Step 1: Naver Search Advisor Registration (30 minutes)

**Action**: Register `connectplt.kr` at https://searchadvisor.naver.com

1. Go to Naver Search Advisor
2. Add site: `https://connectplt.kr`
3. Choose HTML meta tag verification method
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

**Verification**: View page source at `https://connectplt.kr` and confirm the meta tag is visible in raw HTML.

---

### Step 2: IndexNow Key File (15 minutes)

**Action**: Create static verification file

1. Generate a 32-character hexadecimal key:
```bash
openssl rand -hex 16
# Example output: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

2. Create the key file:

**File**: `public/<YOUR_KEY>.txt`

```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

The file contains only the key value itself, no other content.

3. Add to environment:

**File**: `.env.production`
```
INDEXNOW_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

**Verification**: After deployment, confirm `https://connectplt.kr/<YOUR_KEY>.txt` returns the key.

---

### Step 3: Dynamic Sitemap (2-3 hours)

**File**: `app/sitemap.xml/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Revalidate every hour

export async function GET() {
  const baseUrl = 'https://connectplt.kr';
  
  // Static pages
  const staticPages = [
    { url: baseUrl, priority: '1.0', changefreq: 'daily' },
    { url: `${baseUrl}/seo/research-grants`, priority: '0.9', changefreq: 'daily' },
  ];

  // Fetch active programs for sitemap (read-only query)
  let programUrls: Array<{ url: string; lastmod: string; priority: string; changefreq: string }> = [];
  
  try {
    const programs = await prisma.fundingProgram.findMany({
      where: {
        status: 'ACTIVE',
      },
      select: {
        id: true,
        updatedAt: true,
      },
      take: 1000, // Limit for performance
      orderBy: {
        updatedAt: 'desc',
      },
    });

    programUrls = programs.map((program) => ({
      url: `${baseUrl}/programs/${program.id}`,
      lastmod: program.updatedAt.toISOString().split('T')[0],
      priority: '0.7',
      changefreq: 'weekly',
    }));
  } catch (error) {
    console.error('Sitemap: Failed to fetch programs', error);
    // Continue with static pages only
  }

  const allUrls = [...staticPages, ...programUrls];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls
  .map(
    (page) => `  <url>
    <loc>${page.url}</loc>
    <lastmod>${page.lastmod || new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

  return new NextResponse(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
```

**Note**: The sitemap includes program URLs even though preview pages don't exist yet. This is intentional—search engines will queue these URLs for crawling, and when pages are added in January, they'll have indexing priority.

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
      'Content-Type': 'text/plain',
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

async function getProgramStats() {
  try {
    const [totalCount, urgentCount] = await Promise.all([
      prisma.fundingProgram.count({
        where: { status: 'ACTIVE' },
      }),
      prisma.fundingProgram.count({
        where: {
          status: 'ACTIVE',
          deadline: {
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Within 7 days
            gte: new Date(),
          },
        },
      }),
    ]);
    return { totalCount, urgentCount };
  } catch {
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

        {/* Live Stats */}
        {totalCount > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <p className="text-blue-900 text-lg">
              현재 <span className="font-bold text-2xl">{totalCount.toLocaleString()}</span>개 
              연구과제 공고 중
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
              NTIS, KEIT, IITP, TIPA, KIMST 등 각 부처별 공고 사이트를 
              일일이 확인해야 합니다.
            </p>
            <p>
              공고마다 지원 자격, 신청 기간, 지원 규모가 다르고, 
              우리 기업에 맞는 과제를 찾기 어렵습니다.
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
          
          <ul className="space-y-4 text-gray-700">
            <li className="flex items-start">
              <span className="text-blue-600 mr-3">✓</span>
              <span>모든 정부 R&D 공고를 한 곳에서 통합 검색</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-3">✓</span>
              <span>AI가 기업 프로필 기반으로 맞춤 과제 추천</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-3">✓</span>
              <span>마감 임박 알림으로 기회를 놓치지 않음</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-3">✓</span>
              <span>지원 자격 자동 필터링으로 시간 절약</span>
            </li>
          </ul>
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
                기본 검색과 공고 확인은 무료입니다. 
                AI 매칭과 알림 기능은 유료 플랜에서 제공됩니다.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                어떤 기관의 공고가 포함되나요?
              </h3>
              <p className="text-gray-700">
                NTIS, KEIT, IITP, TIPA, KIMST 등 주요 정부 R&D 지원기관의 
                공고를 통합하여 제공합니다.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                공고 정보는 얼마나 자주 업데이트되나요?
              </h3>
              <p className="text-gray-700">
                매일 자동으로 각 기관 사이트를 확인하여 
                새로운 공고를 업데이트합니다.
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
- [ ] Naver verification meta tag added to `app/layout.tsx`
- [ ] IndexNow key file created in `public/`
- [ ] `INDEXNOW_KEY` added to `.env.production`
- [ ] Sitemap route created and tested locally
- [ ] Robots.txt route created
- [ ] Pillar page created and tested
- [ ] Local build passes: `npm run build`
- [ ] Docker build passes: `docker buildx build --platform linux/amd64 -f Dockerfile.production -t connect:latest . --no-cache`

### Deployment
- [ ] Commit all changes (no push yet)
- [ ] Push to trigger CI/CD
- [ ] Monitor Grafana during deployment

### Post-Deployment Verification
- [ ] `https://connectplt.kr/sitemap.xml` returns valid XML
- [ ] `https://connectplt.kr/robots.txt` returns correct content
- [ ] `https://connectplt.kr/<INDEXNOW_KEY>.txt` returns the key
- [ ] `https://connectplt.kr/seo/research-grants` loads correctly
- [ ] View source shows Naver verification meta tag
- [ ] All existing Connect routes still work

### Search Engine Submission
- [ ] Naver Search Advisor: sitemap submitted
- [ ] Naver Search Advisor: pillar page indexed
- [ ] Google Search Console: sitemap submitted
- [ ] Bing Webmaster Tools: sitemap submitted

---

## Files Summary

| File | Action | Risk Level |
|------|--------|------------|
| `app/layout.tsx` | Add meta tag | Very Low |
| `public/<KEY>.txt` | Create new | None |
| `.env.production` | Add variable | Very Low |
| `app/sitemap.xml/route.ts` | Create new | Low |
| `app/robots.txt/route.ts` | Create new | Low |
| `app/seo/research-grants/page.tsx` | Create new | Low |

**Total files modified**: 1 (layout.tsx - meta tag only)  
**Total files created**: 5  
**Middleware changes**: None  
**Nginx changes**: None  
**Risk to Connect**: Minimal

---

## Success Criteria

After implementation, verify:

1. **Sitemap accessible**: `https://connectplt.kr/sitemap.xml` returns XML with program URLs
2. **Verification working**: View source shows Naver meta tag in raw HTML
3. **IndexNow ready**: Key file accessible at root
4. **Pillar page live**: Korean content renders with live program count
5. **Connect unaffected**: All existing routes function normally

---

## Timeline

| Time | Task |
|------|------|
| 0:00 - 0:30 | Naver Search Advisor registration + meta tag |
| 0:30 - 0:45 | IndexNow key file creation |
| 0:45 - 3:00 | Sitemap + robots.txt implementation |
| 3:00 - 7:00 | Korean pillar page development |
| 7:00 - 8:00 | Local testing + Docker build + deployment |
| Post-deploy | Search engine submissions |

**Total estimated time**: 8 hours
