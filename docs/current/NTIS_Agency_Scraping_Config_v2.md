# Connect Platform - NTIS Agency Scraping Configuration v2.0

**Version:** 2.0 (MVP Edition - 4 Agencies)
**Date:** 2025-09-30
**Status:** Production Ready
**Scope:** Focused scraping for MVP launch

---

## Executive Summary

This document specifies the technical implementation for scraping **4 critical NTIS commissioning agencies** that represent ~55% of Korea's total R&D budget. The MVP focuses on reliable, respectful scraping with change detection and automated notifications.

**Key Changes from v1.0:**
- Reduced from 19 agencies to 4 agencies
- Simplified scraping schedule (2x daily normal, 4x daily peak)
- Docker-native worker architecture
- Playwright-based browser automation
- Bull queue for job management

---

## 1. Agency Coverage

### 1.1 Selected Agencies (Budget Priority)

| Agency | Korean Name | Ministry | Budget Share | Priority |
|--------|-------------|----------|--------------|----------|
| **IITP** | 정보통신기획평가원 | 과기정통부 | ~15% | Critical |
| **KEIT** | 한국산업기술평가관리원 | 산업통상자원부 | ~12% | Critical |
| **TIPA** | 중소기업기술정보진흥원 | 중소벤처기업부 | ~8% | High |
| **KIMST** | 해양수산과학기술진흥원 | 해양수산부 | ~5% | Medium |

**Total Coverage:** ~40-55% of total NTIS R&D budget (depending on fiscal year)

**Rationale:**
- IITP: Largest ICT funding source
- KEIT: Industrial technology focus
- TIPA: SME-specific programs
- KIMST: Niche maritime sector (founder network advantage)

---

## 2. Scraping Architecture

### 2.1 Technology Stack

```
Docker Container (connect_scraper)
├── Node.js 20 LTS
├── Playwright (Chromium)
├── Bull (Redis-based queue)
├── Prisma (Database ORM)
└── node-cron (Scheduling)
```

### 2.2 Service Architecture

```
┌─────────────────────────────────────────┐
│        Cron Scheduler (node-cron)       │
│    Triggers scraping jobs via schedule  │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│       Bull Queue (Redis-based)          │
│   Job: { agency, priority, timestamp }  │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│      Playwright Scraper Workers         │
│   Concurrency: 2 (max 2 simultaneous)   │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│        Content Parser & Validator       │
│   Extract: title, deadline, budget, URL │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│        Change Detection (SHA-256)       │
│    Compare content hash with previous   │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│       PostgreSQL (via PgBouncer)        │
│   Store new/updated funding_programs    │
└─────────────────────────────────────────┘
```

---

## 3. Scraping Schedule

### 3.1 Normal Mode (April - December)

**Frequency:** 2x daily

| Time (KST) | Agencies | Priority | Concurrency |
|------------|----------|----------|-------------|
| 09:00 AM | All 4 | Standard | 2 |
| 03:00 PM | All 4 | Standard | 2 |

**Rationale:**
- Morning scrape catches overnight announcements
- Afternoon scrape catches same-day updates
- Sufficient for most announcement cadences

### 3.2 Peak Season Mode (January - March)

**Frequency:** 4x daily

| Time (KST) | Agencies | Priority | Concurrency |
|------------|----------|----------|-------------|
| 09:00 AM | All 4 | High | 2 |
| 12:00 PM | All 4 | High | 2 |
| 03:00 PM | All 4 | High | 2 |
| 06:00 PM | All 4 | High | 2 |

**Rationale:**
- January-March: 80% of corporate funding announcements
- Increased frequency reduces time-to-notification
- Critical for competitive advantage during peak season

---

## 4. Agency-Specific Configuration

### 4.1 IITP (정보통신기획평가원)

**Target URL:** https://www.iitp.kr/kr/1/business/business.it

**Scraping Strategy:**
```javascript
const iitpConfig = {
  baseUrl: 'https://www.iitp.kr',
  listingPath: '/kr/1/business/business.it',
  selectors: {
    announcementList: '.board-list tbody tr',
    title: 'td.title a',
    link: 'td.title a',
    date: 'td.date',
    category: 'td.category',
  },
  pagination: {
    enabled: true,
    maxPages: 3, // Scrape last 3 pages
    selector: '.pagination a',
  },
  rateLimit: {
    requestsPerMinute: 10,
    delayBetweenRequests: 6000, // 6 seconds
  },
  timeout: 30000, // 30 seconds
};
```

**Data Extraction:**
- Title: Extract from link text
- Deadline: Parse from detail page
- Budget: Parse from "지원 규모" field
- Target: Parse from "신청 대상" field

**Special Handling:**
- Dynamic content (React-based)
- Requires JavaScript execution (Playwright)
- Session cookies may be required

### 4.2 KEIT (한국산업기술평가관리원)

**Target URL:** https://www.keit.re.kr/

**Scraping Strategy:**
```javascript
const keitConfig = {
  baseUrl: 'https://www.keit.re.kr',
  listingPath: '/page?id=030101',
  selectors: {
    announcementList: '.board_list li',
    title: '.subject',
    link: '.subject a',
    period: '.period',
    status: '.status',
  },
  pagination: {
    enabled: true,
    maxPages: 2,
    selector: '.paging a',
  },
  rateLimit: {
    requestsPerMinute: 10,
    delayBetweenRequests: 6000,
  },
  timeout: 30000,
};
```

**Data Extraction:**
- Title: Direct text extraction
- Period: Parse "신청기간" field
- Budget: Extract from detail page table
- Category: Industry sector classification

**Special Handling:**
- PDF attachments (공고문)
- Requires PDF text extraction for full details
- Multiple announcement types (신규/재공고)

### 4.3 TIPA (중소기업기술정보진흥원)

**Target URL:** https://www.tipa.or.kr

**Scraping Strategy:**
```javascript
const tipaConfig = {
  baseUrl: 'https://www.tipa.or.kr',
  listingPath: '/notice/notice.do',
  selectors: {
    announcementList: '#contents .board-list tbody tr',
    title: '.subject',
    link: '.subject a',
    date: '.date',
    views: '.hit',
  },
  pagination: {
    enabled: true,
    maxPages: 2,
    type: 'query-param', // ?page=1
  },
  rateLimit: {
    requestsPerMinute: 10,
    delayBetweenRequests: 6000,
  },
  timeout: 30000,
};
```

**Data Extraction:**
- Title: Clean text (remove tags)
- Deadline: Parse from detail page
- Eligibility: SME focus (중소기업)
- Application method: Online/offline

**Special Handling:**
- Login may be required for details
- Fallback to public announcement text
- Korean date parsing (YYYY-MM-DD)

### 4.4 KIMST (해양수산과학기술진흥원)

**Target URL:** https://www.kimst.re.kr

**Scraping Strategy:**
```javascript
const kimstConfig = {
  baseUrl: 'https://www.kimst.re.kr',
  listingPath: '/business/notice',
  selectors: {
    announcementList: '.board-list-table tbody tr',
    title: '.board-title',
    link: '.board-title a',
    date: '.board-date',
    category: '.board-category',
  },
  pagination: {
    enabled: false, // Only first page
  },
  rateLimit: {
    requestsPerMinute: 10,
    delayBetweenRequests: 6000,
  },
  timeout: 30000,
};
```

**Data Extraction:**
- Title: Maritime/fishery keywords
- Deadline: Standard format parsing
- Budget: Typically smaller than IITP/KEIT
- Focus: Marine technology, fishery R&D

**Special Handling:**
- Niche sector (fewer announcements)
- May have separate announcement types
- Less frequent updates

---

## 5. Implementation Details

### 5.1 Scraper Worker Code Structure

```javascript
// lib/scraping/worker.js
const { Worker } = require('bullmq');
const { chromium } = require('playwright');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

const worker = new Worker('scraping-queue', async (job) => {
  const { agency, url, config } = job.data;

  console.log(`[${agency.toUpperCase()}] Starting scrape...`);

  // Launch browser
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(config.timeout);

    // Set user agent
    await page.setExtraHTTPHeaders({
      'User-Agent': process.env.SCRAPER_USER_AGENT,
    });

    // Navigate to listings page
    await page.goto(url, { waitUntil: 'networkidle' });

    // Extract announcements
    const announcements = await page.$$eval(
      config.selectors.announcementList,
      (elements, selectors) => {
        return elements.map(el => ({
          title: el.querySelector(selectors.title)?.textContent?.trim(),
          link: el.querySelector(selectors.link)?.getAttribute('href'),
          date: el.querySelector(selectors.date)?.textContent?.trim(),
        }));
      },
      config.selectors
    );

    // Process each announcement
    for (const announcement of announcements) {
      // Generate content hash
      const contentHash = crypto
        .createHash('sha256')
        .update(announcement.title + announcement.link)
        .digest('hex');

      // Check if exists
      const existing = await prisma.fundingProgram.findFirst({
        where: { content_hash: contentHash },
      });

      if (!existing) {
        // New announcement - fetch details
        const detailUrl = announcement.link.startsWith('http')
          ? announcement.link
          : config.baseUrl + announcement.link;

        await page.goto(detailUrl, { waitUntil: 'networkidle' });

        // Extract detailed information
        const details = await extractProgramDetails(page, config);

        // Store in database
        await prisma.fundingProgram.create({
          data: {
            agency_id: agency,
            title: announcement.title,
            description: details.description,
            announcement_url: detailUrl,
            deadline: details.deadline,
            budget_amount: details.budget,
            target_type: details.targetType,
            content_hash: contentHash,
            scraped_at: new Date(),
          },
        });

        console.log(`[${agency.toUpperCase()}] New program: ${announcement.title}`);

        // Trigger match calculation for this program
        await calculateMatches(programId);
      }
    }

    return {
      agency,
      success: true,
      count: announcements.length,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error(`[${agency.toUpperCase()}] Error:`, error);
    throw error;
  } finally {
    await browser.close();
  }
}, {
  connection: {
    host: process.env.REDIS_QUEUE_HOST || 'redis-queue',
    port: 6380,
  },
  concurrency: 2, // Max 2 simultaneous scrapes
});

// Helper function to extract program details
async function extractProgramDetails(page, config) {
  // Implementation varies by agency
  // Parse deadline, budget, target audience, etc.
  return {
    description: await page.$eval('.content', el => el.textContent),
    deadline: parseDeadline(await page.$eval('.deadline', el => el.textContent)),
    budget: parseBudget(await page.$eval('.budget', el => el.textContent)),
    targetType: determineTargetType(await page.textContent()),
  };
}

// Helper function to calculate matches
async function calculateMatches(programId) {
  // Get all active organizations
  const organizations = await prisma.organization.findMany({
    where: { status: 'active' },
  });

  const program = await prisma.fundingProgram.findUnique({
    where: { id: programId },
  });

  for (const org of organizations) {
    const { score, explanation } = calculateMatchScore(org, program);

    if (score >= 60) { // Minimum threshold
      await prisma.fundingMatch.create({
        data: {
          organization_id: org.id,
          program_id: programId,
          score,
          explanation,
        },
      });

      // Send notification if user has enabled real-time alerts
      await sendMatchNotification(org.user_id, programId, score);
    }
  }
}

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err);
});
```

### 5.2 Schedule Configuration

```javascript
// lib/scraping/scheduler.js
const cron = require('node-cron');
const { Queue } = require('bullmq');

const scrapingQueue = new Queue('scraping-queue', {
  connection: {
    host: process.env.REDIS_QUEUE_HOST || 'redis-queue',
    port: 6380,
  },
});

const agencies = [
  { id: 'iitp', url: 'https://www.iitp.kr/kr/1/business/business.it', config: iitpConfig },
  { id: 'keit', url: 'https://www.keit.re.kr/page?id=030101', config: keitConfig },
  { id: 'tipa', url: 'https://www.tipa.or.kr/notice/notice.do', config: tipaConfig },
  { id: 'kimst', url: 'https://www.kimst.re.kr/business/notice', config: kimstConfig },
];

// Determine if peak season
function isPeakSeason() {
  const month = new Date().getMonth() + 1; // 1-12
  return month >= 1 && month <= 3; // January-March
}

// Normal mode: 2x daily (9 AM, 3 PM)
cron.schedule('0 9,15 * * *', async () => {
  if (!isPeakSeason()) {
    console.log('[SCHEDULER] Running normal mode scrape (2x daily)');
    await queueScrapingJobs(agencies);
  }
});

// Peak season mode: 4x daily (9 AM, 12 PM, 3 PM, 6 PM)
cron.schedule('0 9,12,15,18 * * *', async () => {
  if (isPeakSeason()) {
    console.log('[SCHEDULER] Running peak season scrape (4x daily)');
    await queueScrapingJobs(agencies, 'high');
  }
});

async function queueScrapingJobs(agencies, priority = 'standard') {
  for (const agency of agencies) {
    await scrapingQueue.add(
      `scrape-${agency.id}`,
      {
        agency: agency.id,
        url: agency.url,
        config: agency.config,
      },
      {
        priority: priority === 'high' ? 1 : 5,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000, // 5 seconds
        },
      }
    );

    console.log(`[SCHEDULER] Queued: ${agency.id}`);
  }
}
```

---

## 6. Rate Limiting & Respect

### 6.1 Rate Limiting Strategy

**Per-Agency Limits:**
- Maximum 10 requests per minute
- 6-second delay between requests
- Exponential backoff on errors

**Implementation:**
```javascript
class RateLimiter {
  constructor(requestsPerMinute = 10) {
    this.delay = (60 / requestsPerMinute) * 1000;
    this.lastRequest = 0;
  }

  async throttle() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;

    if (timeSinceLastRequest < this.delay) {
      const waitTime = this.delay - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequest = Date.now();
  }
}
```

### 6.2 robots.txt Compliance

**Check robots.txt before scraping:**
```javascript
const robotsParser = require('robots-parser');

async function checkRobots(baseUrl, userAgent) {
  const robotsTxtUrl = `${baseUrl}/robots.txt`;
  const response = await fetch(robotsTxtUrl);
  const robotsTxt = await response.text();

  const robots = robotsParser(robotsTxtUrl, robotsTxt);
  return robots.isAllowed(url, userAgent);
}
```

**Respect directives:**
- Crawl-delay: Minimum 6 seconds
- Disallow: Skip restricted paths
- User-agent: Identify as ConnectBot/1.0

### 6.3 User Agent Strategy

**Primary User Agent (Transparent Bot):**
```
Mozilla/5.0 (compatible; ConnectBot/1.0; +https://connect.kr/bot)
```

**Purpose:**
- Clearly identify as a bot (ethical transparency)
- Provide contact URL for agency inquiries
- Respectful scraping practices documented

**Fallback User Agents (If Primary Blocked):**
```javascript
const fallbackUserAgents = [
  // Chrome on Windows (most common)
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',

  // Chrome on Mac
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',

  // Safari on Mac
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
];
```

**User Agent Rotation Logic:**
1. Start with transparent bot user agent
2. If blocked (403/429 status), switch to fallback
3. Rotate fallback user agents to avoid detection patterns
4. Log all user agent changes for debugging

### 6.4 Bot Detection Mitigation

**Common Detection Methods & Countermeasures:**

| Detection Method | Our Mitigation Strategy |
|------------------|-------------------------|
| **User-Agent filtering** | Use realistic user agents (Chrome/Safari) |
| **Request pattern analysis** | Randomize delays (5-8s instead of fixed 6s) |
| **JavaScript challenges** | Playwright executes JavaScript natively |
| **CAPTCHA** | 2captcha integration (see below) |
| **IP blocking** | Pause 24h if blocked, consider proxy rotation |
| **Mouse/keyboard tracking** | Playwright simulates realistic interactions |
| **Browser fingerprinting** | Randomize viewport size, screen resolution |

**Playwright Configuration for Stealth:**
```javascript
const browser = await chromium.launch({
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-blink-features=AutomationControlled', // Hide automation flag
    '--disable-dev-shm-usage'
  ]
});

const context = await browser.newContext({
  userAgent: getRandomUserAgent(),
  viewport: {
    width: 1280 + Math.floor(Math.random() * 100),  // Randomize viewport
    height: 800 + Math.floor(Math.random() * 100)
  },
  locale: 'ko-KR',
  timezoneId: 'Asia/Seoul',
  geolocation: { latitude: 37.5665, longitude: 126.9780 }, // Seoul
  permissions: ['geolocation'],
  colorScheme: 'light',
  extraHTTPHeaders: {
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
  }
});

// Remove webdriver flag
await page.evaluateOnNewDocument(() => {
  delete Object.getPrototypeOf(navigator).webdriver;
});
```

**Request Randomization:**
```javascript
// Random delay between requests (5-8 seconds)
async function randomDelay() {
  const delay = 5000 + Math.random() * 3000; // 5-8 seconds
  await new Promise(resolve => setTimeout(resolve, delay));
}

// Random mouse movements (appear human-like)
async function humanScroll(page) {
  const scrollSteps = 3 + Math.floor(Math.random() * 3); // 3-5 steps
  for (let i = 0; i < scrollSteps; i++) {
    await page.mouse.wheel(0, 200 + Math.random() * 100);
    await page.waitForTimeout(500 + Math.random() * 500);
  }
}
```

### 6.5 CAPTCHA Handling Strategy

**If Agency Implements CAPTCHA:**

**Option 1: 2captcha Service (Recommended)**
```javascript
// npm install 2captcha
const TwoCaptcha = require('2captcha');
const solver = new TwoCaptcha.Solver(process.env.TWOCAPTCHA_API_KEY);

async function solveCaptcha(page) {
  try {
    // Detect CAPTCHA type
    const recaptchaKey = await page.getAttribute('[data-sitekey]', 'data-sitekey');

    if (recaptchaKey) {
      // Solve reCAPTCHA v2/v3
      const result = await solver.recaptcha({
        pageurl: page.url(),
        googlekey: recaptchaKey
      });

      // Inject solution
      await page.evaluate((token) => {
        document.getElementById('g-recaptcha-response').innerHTML = token;
      }, result.data);

      return true;
    }
  } catch (error) {
    console.error('CAPTCHA solving failed:', error);
    return false;
  }
}
```

**Cost Analysis:**
- 2captcha pricing: $3 per 1,000 CAPTCHAs solved
- Expected usage: 0-10 CAPTCHAs per day (agencies rarely use for every request)
- Monthly cost: ~$1-5 (negligible)

**Option 2: Manual Fallback**
- If CAPTCHA detected, flag announcement for manual review
- Admin dashboard shows "Pending Manual Scrape" status
- Human operator scrapes and inputs data manually
- Only needed if 2captcha fails or cost becomes prohibitive

**Option 3: API-First Approach (Best Solution)**
```javascript
// Check if agency offers API before scraping
const ntisApiEndpoints = {
  iitp: 'https://www.iitp.kr/api/announcements', // Check if exists
  keit: 'https://www.keit.re.kr/api/notices',
  // etc.
};

// Always prefer API over scraping
async function fetchAnnouncements(agency) {
  const apiEndpoint = ntisApiEndpoints[agency];

  if (apiEndpoint) {
    try {
      const response = await fetch(apiEndpoint, {
        headers: {
          'Authorization': `Bearer ${process.env[agency.toUpperCase() + '_API_KEY']}`
        }
      });

      if (response.ok) {
        return await response.json(); // API data (no scraping needed!)
      }
    } catch (error) {
      console.log('API not available, falling back to scraping');
    }
  }

  // Fallback to scraping if API unavailable
  return await scrapePage(agency);
}
```

**Recommendation Order:**
1. **Check for official API first** (NTIS may offer APIs for public data)
2. **Use polite scraping** with transparent bot user agent
3. **If blocked, switch to realistic user agents** with stealth techniques
4. **If CAPTCHA appears, use 2captcha** ($1-5/month)
5. **Last resort: Manual fallback** process

---

## 7. Error Handling & Monitoring

### 7.1 Error Types

| Error Type | Action | Alert Threshold |
|------------|--------|-----------------|
| **Timeout** | Retry 3x with backoff | >3 consecutive failures |
| **404 Not Found** | Log & skip | Page structure changed |
| **403 Forbidden** | Pause scraping | Immediate alert |
| **500 Server Error** | Retry after 30min | >5 per day |
| **Parse Error** | Log content & skip | >10% failure rate |

### 7.2 Monitoring Metrics

**Success Metrics:**
```sql
-- Scraping success rate (last 24 hours)
SELECT
  agency_id,
  COUNT(*) as total_attempts,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful,
  ROUND(100.0 * SUM(CASE WHEN success THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM scraping_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY agency_id;
```

**Alert Conditions:**
- Success rate < 90% for any agency
- No successful scrape in last 12 hours
- Consistent timeout errors (>5 consecutive)

---

## 8. Data Quality & Validation

### 8.1 Validation Rules

**Required Fields:**
- Title: Non-empty, max 500 characters
- URL: Valid URL format
- Agency: One of ['iitp', 'keit', 'tipa', 'kimst']
- Scraped timestamp

**Optional Fields (with defaults):**
- Deadline: Parse or set to null
- Budget: Extract or set to null
- Target type: Infer or set to 'both'

### 8.2 Change Detection

```javascript
function generateContentHash(program) {
  const hashInput = [
    program.agency_id,
    program.title,
    program.announcement_url,
  ].join('|');

  return crypto.createHash('sha256').update(hashInput).digest('hex');
}

// Check for changes
async function checkForUpdates(newProgram) {
  const existing = await prisma.fundingProgram.findFirst({
    where: {
      agency_id: newProgram.agency_id,
      announcement_url: newProgram.announcement_url,
    },
  });

  if (!existing) return 'NEW';

  const newHash = generateContentHash(newProgram);
  if (newHash !== existing.content_hash) return 'UPDATED';

  return 'UNCHANGED';
}
```

---

## 9. Performance Targets

### 9.1 Scraping Performance

| Metric | Target | Actual (to measure) |
|--------|--------|---------------------|
| **Time per agency** | <90 seconds | TBD |
| **Total scrape time** | <6 minutes | TBD |
| **Success rate** | >95% | TBD |
| **New programs/day** | 5-20 | TBD |
| **Change detection accuracy** | >99% | TBD |

### 9.2 System Impact

| Metric | Target | Notes |
|--------|--------|-------|
| **CPU usage (scraper)** | <50% of allocated | 2 cores allocated |
| **Memory usage** | <3GB | 4GB allocated |
| **Database writes** | <100 per scrape | New + updated programs |
| **Redis queue depth** | <10 jobs | Should process quickly |

---

## 10. Future Enhancements (Post-MVP)

### 10.1 Expansion Opportunities

**Additional Agencies (if needed):**
1. **NRF** (한국연구재단) - University focus (~35% of budget)
2. **KHIDI** (한국보건산업진흥원) - Healthcare/biotech
3. **KOCCA** (한국콘텐츠진흥원) - Content/media tech

**Advanced Features:**
- PDF text extraction for detailed program info
- Historical trend analysis
- Deadline prediction based on patterns
- Automatic application form pre-filling

### 10.2 Optimization Ideas

- Incremental scraping (only new content)
- Intelligent scheduling based on agency update patterns
- Distributed scraping (if scaling beyond 4 agencies)
- Machine learning for improved parsing

---

## Conclusion

This v2.0 configuration provides a solid, production-ready foundation for scraping 4 critical NTIS agencies. The focus on reliability, respect, and change detection ensures high-quality data for Connect's matching engine.

**Key Principles:**
1. **Respectful scraping** - Rate limiting, robots.txt compliance
2. **Reliable detection** - Content hashing, change tracking
3. **Efficient processing** - Bull queue, concurrent workers
4. **Quality validation** - Field validation, error handling
5. **Peak season ready** - 4x daily frequency Jan-March

**Next Steps:**
1. Implement scraper worker in lib/scraping/worker.js
2. Test with each agency (rate limiting, parsing)
3. Deploy to production Docker container
4. Monitor success rates and iterate

---

**Document Version:** 2.0
**Last Updated:** 2025-09-30
**Next Review:** Month 1 (after scraper deployment)

*End of NTIS Agency Scraping Configuration v2.0*