# NTIS API Integration - Implementation Roadmap
## Phases 2-5: Complete Guide for Future Execution

**Last Updated**: October 6, 2025
**Phase 1 Status**: ✅ Complete (see NTIS-PHASE1-TEST-RESULTS.md)
**Target Start**: October 14, 2025 (when production API key arrives)

---

## 📋 Table of Contents

1. [Phase 2: Production API Key Integration](#phase-2-production-api-key-integration)
2. [Phase 3: Hybrid Scheduler Integration](#phase-3-hybrid-scheduler-integration)
3. [Phase 4: Monitoring & Optimization](#phase-4-monitoring--optimization)
4. [Phase 5: Production Deployment](#phase-5-production-deployment)
5. [Troubleshooting Guide](#troubleshooting-guide)
6. [Quick Reference](#quick-reference)

---

# Phase 2: Production API Key Integration

**Prerequisite**: Production API key received from NTIS (Expected: Oct 14, 2025)
**Duration**: 15-20 minutes
**Status**: Ready to execute

## 📝 Overview

Once you receive the production API key from NTIS via email, you'll need to update your environment configuration and verify that real data is being retrieved.

---

## 🎯 Step-by-Step Instructions

### Step 1: Receive Production API Key

You'll receive an email from NTIS with subject like:
```
NTIS OpenAPI 활용 신청 승인
```

The email will contain:
- **API Key** (승인키): A long alphanumeric string
- **Service Name**: 국가R&D 과제검색 서비스(대국민용)
- **Approval Date**: 승인일
- **Expiration Date**: 만료일

**Example**:
```
승인키(API Key): abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
서비스명: Connect - R&D Matching Platform
승인일: 2025-10-14
만료일: 2027-10-14
```

---

### Step 2: Update .env File

**Time**: 2 minutes

1. Open `.env` file in your project root:
```bash
cd /Users/paulkim/Downloads/connect
nano .env  # or use your preferred editor
```

2. Find the NTIS_API_KEY line:
```env
# OLD (demo key):
NTIS_API_KEY="yx6c98kg21bu649u2m8u"
```

3. Replace with your production key:
```env
# NEW (production key):
NTIS_API_KEY="abc123def456ghi789jkl012mno345pqr678stu901vwx234yz"
```

4. Save and close the file

---

### Step 3: Update .env.production.example

**Time**: 2 minutes

**Purpose**: Document for future deployments

1. Open `.env.production.example`:
```bash
nano .env.production.example
```

2. Update the NTIS_API_KEY comment:
```env
# NTIS API (National Science & Technology Information Service)
NTIS_API_KEY="your_production_ntis_api_key_here"  # Get from https://www.ntis.go.kr/rndopen/api/mng/apiMain.do
# Production key approved: 2025-10-14
# Expiration: 2027-10-14
# Support: 042-869-1115, ntis@kisti.re.kr
```

3. Save and close

---

### Step 4: Validate Production Setup

**Time**: 2 minutes

Run the validation script to verify everything works with the production key:

```bash
npx tsx scripts/validate-ntis-integration.ts
```

**Expected Output**:
```
✅ Environment Variables: All required environment variables are set
✅ Dependencies: All required dependencies are installed
✅ NTIS API Files: All NTIS API implementation files exist
✅ Database Connection: Database connection successful
✅ NTIS API Connectivity: NTIS API is accessible and responding
✅ Data Deduplication: No duplicate programs found
✅ NTIS Data Quality: Data quality good: 95%+ complete

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Validation Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ✅ Passed: 7
   ⚠️  Warnings: 0
   ❌ Failed: 0

🎉 All validations passed! NTIS API integration is ready.
```

**If validation fails**, see [Troubleshooting Guide](#troubleshooting-guide) below.

---

### Step 5: Test Production Scraping

**Time**: 3 minutes

Run the scraper to fetch real R&D program data:

```bash
npx tsx scripts/trigger-ntis-scraping.ts
```

**Expected Output**:
```
🚀 Triggering NTIS API scraping...

🔄 Starting NTIS API scraping (last 30 days)...
✅ Found 156 programs from NTIS API
✅ NTIS API scraping completed: 42 new, 114 updated

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ NTIS API Scraping Results:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   📊 Total Found: 156
   ✨ New Programs: 42
   🔄 Updated Programs: 114
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ NTIS API scraping completed successfully!
```

**Key Metrics to Check**:
- Total Found: Should be 50-200+ (depending on recent announcements)
- New Programs: Should be > 0
- No errors or 404s

---

### Step 6: Verify Data in Database

**Time**: 5 minutes

1. Open Prisma Studio:
```bash
npm run db:studio
```

2. Navigate to `http://localhost:5555`

3. Click on `FundingProgram` table

4. Filter by `scrapingSource = "NTIS_API"`

5. **Verify Data Quality**:
   - [ ] Program titles are in Korean
   - [ ] Descriptions are complete and meaningful
   - [ ] Agency IDs are correct (IITP, KEIT, TIPA, KIMST)
   - [ ] Budget amounts are populated
   - [ ] Announcement URLs link to NTIS
   - [ ] Scraped timestamps are recent

6. **Spot Check 5-10 Programs**:
   - Click on a program to view full details
   - Verify all fields are populated correctly
   - Check that `contentHash` exists (for deduplication)

---

### Step 7: Document Production Key Details

**Time**: 3 minutes

Create a secure note documenting your API key details:

```markdown
# NTIS Production API Key

**Key**: abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
**Service**: 국가R&D 과제검색 서비스(대국민용)
**Approved**: 2025-10-14
**Expires**: 2027-10-14
**Contact**: NTIS Support (042-869-1115, ntis@kisti.re.kr)

**Usage Limits**:
- Requests per minute: 10
- Requests per day: 1,000
- Results per request: 100

**Renewal Reminder**:
Set calendar alert for 2027-09-14 (30 days before expiration)
```

**⚠️ Security**: Store this in a password manager or secure notes app. DO NOT commit to git.

---

## ✅ Phase 2 Completion Checklist

- [ ] Production API key received via email
- [ ] `.env` file updated with production key
- [ ] `.env.production.example` updated with documentation
- [ ] Validation script passed all checks
- [ ] Production scraping completed successfully
- [ ] Data verified in Prisma Studio
- [ ] API key details documented securely
- [ ] Calendar reminder set for key renewal (2027-09-14)

---

## 🚀 Next Steps

Once Phase 2 is complete, proceed to **Phase 3: Hybrid Scheduler Integration** to automate daily scraping.

---

# Phase 3: Hybrid Scheduler Integration

**Prerequisite**: Phase 2 complete (production API key working)
**Duration**: 2-3 hours
**Status**: Ready to implement

## 📝 Overview

This phase integrates NTIS API scraping with your existing Playwright-based scheduler, creating a **hybrid approach** that leverages the strengths of both methods:

- **NTIS API** (Primary): Comprehensive daily updates, stable, fast
- **Playwright** (Supplementary): Real-time agency announcements, detailed info

---

## 🎯 Implementation Strategy

### Why Hybrid Approach?

**NTIS API Strengths**:
- ✅ 108,798+ programs (comprehensive coverage)
- ✅ Stable API (no HTML changes)
- ✅ Fast (0.2s per request vs 5-10s per page)
- ✅ Official government source

**Playwright Strengths**:
- ✅ Real-time announcements (before NTIS indexing delay)
- ✅ Agency-specific details and formatting
- ✅ Can capture PDFs/attachments
- ✅ Detects changes faster

**Combined Benefits**:
- Maximum coverage (NTIS comprehensive + Playwright timely)
- Redundancy (if one fails, other continues)
- Database deduplication prevents duplicates
- Users get best of both worlds

---

## 📊 Proposed Schedule

```
┌─────────────────────────────────────────────┐
│ NTIS API (Primary Source)                   │
│ ─────────────────────────────────────────   │
│ Schedule: Daily at 8:00 AM KST              │
│ Coverage: Last 30 days (normal mode)        │
│           Last 7 days (peak season)         │
│ Purpose: Comprehensive database update      │
│ Priority: High                              │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Playwright (Supplementary Source)           │
│ ─────────────────────────────────────────   │
│ Normal Mode: 9 AM, 3 PM KST (2x daily)      │
│ Peak Season: 9 AM, 12 PM, 3 PM, 6 PM (4x)   │
│ Purpose: Real-time agency announcements     │
│ Priority: Standard                          │
└─────────────────────────────────────────────┘
```

**Peak Season**: January - March (funding application rush)

---

## 🔧 Step-by-Step Implementation

### Step 1: Create NTIS Scheduler Module

**Time**: 30 minutes

Create a new file `lib/ntis-api/scheduler.ts`:

```typescript
/**
 * NTIS API Scraping Scheduler
 *
 * Schedules daily NTIS API scraping jobs
 * Runs before Playwright scraper to provide comprehensive baseline data
 */

import cron from 'node-cron';
import { NTISApiScraper } from './scraper';
import { isPeakSeason } from '../scraping/utils';

/**
 * Schedule NTIS API scraping
 *
 * Normal mode: Daily at 8 AM KST
 * Peak season: Daily at 8 AM KST (more frequent not needed due to API comprehensiveness)
 */
export function startNTISScheduler() {
  console.log('🚀 Starting NTIS API scheduler...');

  // Daily scraping at 8 AM KST (before Playwright scraper)
  cron.schedule(
    '0 8 * * *',
    async () => {
      console.log('⏰ Running scheduled NTIS API scraping...');

      const scraper = new NTISApiScraper();

      try {
        // In peak season, scrape last 7 days; otherwise last 30 days
        const daysBack = isPeakSeason() ? 7 : 30;

        console.log(`📅 Scraping NTIS API (last ${daysBack} days)...`);

        const result = await scraper.scrapeAllAgencies(daysBack);

        if (result.success) {
          console.log(`✅ NTIS API scraping completed: ${result.programsNew} new, ${result.programsUpdated} updated`);
        } else {
          console.error('❌ NTIS API scraping failed - check logs');
        }
      } catch (error: any) {
        console.error(`❌ NTIS API scraping error: ${error.message}`);

        // TODO: Add alert/notification for failures
        // Could send email, Slack message, or log to monitoring system
      }
    },
    {
      timezone: 'Asia/Seoul',
    }
  );

  console.log('✓ NTIS API scheduler started successfully');
  console.log(`  - Daily at 8:00 AM KST`);
  console.log(`  - Peak season mode: ${isPeakSeason() ? 'ACTIVE (7 days)' : 'INACTIVE (30 days)'}`);
}

/**
 * Manually trigger NTIS scraping (for admin dashboard)
 */
export async function triggerManualNTISScrape(
  daysBack: number = 30
): Promise<{ success: boolean; message: string; stats?: any }> {
  try {
    const scraper = new NTISApiScraper();
    const result = await scraper.scrapeAllAgencies(daysBack);

    if (result.success) {
      return {
        success: true,
        message: `NTIS scraping completed successfully`,
        stats: {
          totalFound: result.totalFound,
          programsNew: result.programsNew,
          programsUpdated: result.programsUpdated,
        },
      };
    } else {
      return {
        success: false,
        message: 'NTIS scraping failed',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: `NTIS scraping error: ${error.message}`,
    };
  }
}
```

---

### Step 2: Update Main Scraping Scheduler

**Time**: 15 minutes

Update `lib/scraping/scheduler.ts` to integrate NTIS scheduler:

```typescript
/**
 * Scraping Scheduler (UPDATED)
 *
 * Hybrid approach:
 * 1. NTIS API scraper (8 AM) - comprehensive baseline
 * 2. Playwright scrapers (9 AM, 3 PM) - real-time updates
 */

import cron from 'node-cron';
import { Queue } from 'bullmq';
import { getAllAgencyConfigs } from './config';
import { isPeakSeason, logScraping } from './utils';
import { startNTISScheduler } from '../ntis-api/scheduler'; // NEW IMPORT

// Bull queue for scraping jobs
export const scrapingQueue = new Queue('scraping-queue', {
  connection: {
    host: process.env.REDIS_QUEUE_HOST || 'localhost',
    port: parseInt(process.env.REDIS_QUEUE_PORT || '6380'),
  },
});

/**
 * Queue Playwright scraping jobs for all agencies
 */
async function queueScrapingJobs(priority: 'high' | 'standard' = 'standard') {
  const agencies = getAllAgencyConfigs();

  for (const agencyConfig of agencies) {
    try {
      await scrapingQueue.add(
        `scrape-${agencyConfig.id}`,
        {
          agency: agencyConfig.id,
          url: agencyConfig.baseUrl + agencyConfig.listingPath,
          config: agencyConfig,
          priority,
        },
        {
          priority: priority === 'high' ? 1 : 5,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: {
            count: 100,
          },
          removeOnFail: {
            count: 50,
          },
        }
      );

      logScraping(agencyConfig.id, `Queued Playwright scraping job (priority: ${priority})`);
    } catch (err: any) {
      logScraping(agencyConfig.id, `Failed to queue job: ${err.message}`, 'error');
    }
  }
}

/**
 * Start hybrid scraping scheduler
 */
export function startScheduler() {
  console.log('🚀 Starting hybrid scraping scheduler...');

  // NEW: Start NTIS API scheduler (8 AM daily)
  startNTISScheduler();

  // EXISTING: Playwright normal mode (9 AM, 3 PM)
  cron.schedule(
    '0 9,15 * * *',
    async () => {
      if (!isPeakSeason()) {
        console.log('⏰ Running Playwright scrape - normal mode (2x daily)...');
        await queueScrapingJobs('standard');
      }
    },
    {
      timezone: 'Asia/Seoul',
    }
  );

  // EXISTING: Playwright peak season mode (9 AM, 12 PM, 3 PM, 6 PM)
  cron.schedule(
    '0 9,12,15,18 * * *',
    async () => {
      if (isPeakSeason()) {
        console.log('⏰ Running Playwright scrape - peak season (4x daily)...');
        await queueScrapingJobs('high');
      }
    },
    {
      timezone: 'Asia/Seoul',
    }
  );

  console.log('✓ Hybrid scraping scheduler started successfully');
  console.log('  NTIS API:');
  console.log('    - Daily at 8:00 AM KST');
  console.log('  Playwright:');
  console.log('    - Normal mode: 9 AM, 3 PM KST (2x daily)');
  console.log('    - Peak season (Jan-Mar): 9 AM, 12 PM, 3 PM, 6 PM KST (4x daily)');
  console.log(`  Current mode: ${isPeakSeason() ? 'PEAK SEASON (NTIS+4x Playwright)' : 'NORMAL (NTIS+2x Playwright)'}`);
}

/**
 * Manually trigger scraping (UPDATED)
 */
export async function triggerManualScrape(
  agencyId?: string,
  source: 'ntis' | 'playwright' | 'both' = 'both' // NEW PARAMETER
): Promise<{ success: boolean; message: string }> {
  try {
    if (source === 'ntis' || source === 'both') {
      // Trigger NTIS API scraping
      const { triggerManualNTISScrape } = await import('../ntis-api/scheduler');
      const ntisResult = await triggerManualNTISScrape(30);

      if (!ntisResult.success && source === 'ntis') {
        return ntisResult;
      }
    }

    if (source === 'playwright' || source === 'both') {
      // Trigger Playwright scraping
      if (agencyId) {
        const agencies = getAllAgencyConfigs();
        const agencyConfig = agencies.find((a) => a.id === agencyId.toLowerCase());

        if (!agencyConfig) {
          return {
            success: false,
            message: `Agency '${agencyId}' not found`,
          };
        }

        await scrapingQueue.add(
          `scrape-${agencyConfig.id}-manual`,
          {
            agency: agencyConfig.id,
            url: agencyConfig.baseUrl + agencyConfig.listingPath,
            config: agencyConfig,
            priority: 'high',
          },
          {
            priority: 1,
            attempts: 3,
          }
        );

        return {
          success: true,
          message: `Manual Playwright scrape queued for ${agencyConfig.name}`,
        };
      } else {
        await queueScrapingJobs('high');
      }
    }

    return {
      success: true,
      message: `Manual scrape queued for ${source === 'both' ? 'NTIS + Playwright' : source}`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to queue manual scrape: ${err.message}`,
    };
  }
}

/**
 * Get queue statistics (UNCHANGED)
 */
export async function getQueueStats() {
  const [waiting, active, completed, failed] = await Promise.all([
    scrapingQueue.getWaitingCount(),
    scrapingQueue.getActiveCount(),
    scrapingQueue.getCompletedCount(),
    scrapingQueue.getFailedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    total: waiting + active + completed + failed,
  };
}
```

---

### Step 3: Update Scraper Entry Point

**Time**: 10 minutes

Update `lib/scraping/index.ts` to start the hybrid scheduler:

```typescript
/**
 * Scraping System Entry Point (UPDATED)
 *
 * Hybrid approach: NTIS API + Playwright
 */

import { startScheduler } from './scheduler';
import { startWorker } from './worker';

export async function startScrapingSystem() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 Starting Hybrid Scraping System');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // Start scheduler (NTIS API + Playwright)
  startScheduler();
  console.log('');

  // Start worker to process Playwright jobs
  startWorker();
  console.log('');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Hybrid Scraping System Started Successfully');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

// Start if run directly
if (require.main === module) {
  startScrapingSystem().catch((error) => {
    console.error('Failed to start scraping system:', error);
    process.exit(1);
  });
}
```

---

### Step 4: Create Manual Trigger Script

**Time**: 10 minutes

Create `scripts/trigger-hybrid-scraping.ts` for testing:

```typescript
/**
 * Trigger Hybrid Scraping (NTIS API + Playwright)
 *
 * Manually triggers both scraping systems for testing
 *
 * Usage:
 *   npx tsx scripts/trigger-hybrid-scraping.ts           # Both systems
 *   npx tsx scripts/trigger-hybrid-scraping.ts --ntis    # NTIS only
 *   npx tsx scripts/trigger-hybrid-scraping.ts --pw      # Playwright only
 */

import { NTISApiScraper } from '../lib/ntis-api';
import { triggerManualScrape } from '../lib/scraping/scheduler';

async function main() {
  const args = process.argv.slice(2);
  const ntisOnly = args.includes('--ntis');
  const playwrightOnly = args.includes('--pw');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 Hybrid Scraping System - Manual Trigger');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // NTIS API Scraping
  if (!playwrightOnly) {
    console.log('📊 Starting NTIS API scraping...');
    const ntisStartTime = Date.now();

    const scraper = new NTISApiScraper();
    const ntisResult = await scraper.scrapeAllAgencies(30);

    const ntisEndTime = Date.now();
    const ntisTime = ((ntisEndTime - ntisStartTime) / 1000).toFixed(2);

    if (ntisResult.success) {
      console.log(`✅ NTIS API scraping completed in ${ntisTime}s`);
      console.log(`   📊 Total: ${ntisResult.totalFound}`);
      console.log(`   ✨ New: ${ntisResult.programsNew}`);
      console.log(`   🔄 Updated: ${ntisResult.programsUpdated}`);
    } else {
      console.log('❌ NTIS API scraping failed');
    }
    console.log('');
  }

  // Playwright Scraping
  if (!ntisOnly) {
    console.log('🎭 Starting Playwright scraping...');
    const pwResult = await triggerManualScrape(undefined, 'playwright');

    if (pwResult.success) {
      console.log(`✅ ${pwResult.message}`);
    } else {
      console.log(`❌ ${pwResult.message}`);
    }
    console.log('');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Hybrid scraping triggered successfully');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Hybrid scraping failed:', error);
  process.exit(1);
});
```

---

### Step 5: Test Hybrid System

**Time**: 15 minutes

**5a. Test NTIS Only**:
```bash
npx tsx scripts/trigger-hybrid-scraping.ts --ntis
```

**Expected**: Programs scraped from NTIS API

**5b. Test Playwright Only**:
```bash
npx tsx scripts/trigger-hybrid-scraping.ts --pw
```

**Expected**: Jobs queued for Playwright scraper

**5c. Test Both Systems**:
```bash
npx tsx scripts/trigger-hybrid-scraping.ts
```

**Expected**: Both systems run successfully, database deduplication prevents duplicates

---

### Step 6: Monitor First Combined Run

**Time**: 30 minutes

1. Open Prisma Studio:
```bash
npm run db:studio
```

2. Before scraping, note:
   - Total programs count
   - Programs by source (NTIS_API vs others)

3. Run hybrid scraping:
```bash
npx tsx scripts/trigger-hybrid-scraping.ts
```

4. After scraping, verify:
   - Total programs increased
   - No duplicate `contentHash` values
   - Both `scrapingSource` values present (NTIS_API + agency names)
   - Recent `scrapedAt` timestamps

5. **Quality Checks**:
   - [ ] Programs from both sources present
   - [ ] No duplicates (same program from both sources)
   - [ ] Data completeness for NTIS programs
   - [ ] Data completeness for Playwright programs
   - [ ] Agency mapping is correct

---

### Step 7: Update Package.json Scripts

**Time**: 5 minutes

Add convenient npm scripts to `package.json`:

```json
{
  "scripts": {
    "scraper": "tsx lib/scraping/index.ts",
    "scraper:ntis": "tsx scripts/trigger-ntis-scraping.ts",
    "scraper:hybrid": "tsx scripts/trigger-hybrid-scraping.ts",
    "scraper:validate": "tsx scripts/validate-ntis-integration.ts"
  }
}
```

Now you can use:
```bash
npm run scraper:ntis      # NTIS only
npm run scraper:hybrid    # Both systems
npm run scraper:validate  # Validation check
```

---

## ✅ Phase 3 Completion Checklist

- [ ] Created `lib/ntis-api/scheduler.ts`
- [ ] Updated `lib/scraping/scheduler.ts` with NTIS integration
- [ ] Updated `lib/scraping/index.ts` entry point
- [ ] Created `scripts/trigger-hybrid-scraping.ts`
- [ ] Tested NTIS scraping alone
- [ ] Tested Playwright scraping alone
- [ ] Tested hybrid scraping (both systems)
- [ ] Verified deduplication works
- [ ] Monitored database for duplicates
- [ ] Updated package.json with convenience scripts
- [ ] Documented hybrid schedule

---

## 🎯 Expected Results

After Phase 3 completion:

**Daily Schedule**:
- 8:00 AM: NTIS API scrapes (comprehensive update)
- 9:00 AM: Playwright scrapes (real-time updates)
- 3:00 PM: Playwright scrapes (real-time updates)

**Peak Season** (Jan-Mar):
- 8:00 AM: NTIS API scrapes
- 9:00 AM, 12:00 PM, 3:00 PM, 6:00 PM: Playwright scrapes

**Data Quality**:
- Comprehensive coverage from NTIS API
- Real-time updates from Playwright
- Automatic deduplication
- No manual intervention needed

---

# Phase 4: Monitoring & Optimization

**Prerequisite**: Phase 3 complete (hybrid scheduler running)
**Duration**: 1.5-2 hours
**Status**: Ready to implement

## 📝 Overview

Implement monitoring, logging, and optimization to ensure the hybrid scraping system runs reliably and efficiently in production.

---

## 🎯 Key Areas

### 1. Enhanced Logging

**Time**: 30 minutes

Create `lib/ntis-api/logger.ts`:

```typescript
/**
 * NTIS API Logging Utility
 *
 * Structured logging for NTIS API operations
 */

export interface NTISLogEntry {
  timestamp: Date;
  level: 'info' | 'warn' | 'error';
  source: 'NTIS_API';
  operation: string;
  details?: any;
  duration?: number;
}

class NTISLogger {
  private logs: NTISLogEntry[] = [];

  log(level: NTISLogEntry['level'], operation: string, details?: any, duration?: number) {
    const entry: NTISLogEntry = {
      timestamp: new Date(),
      level,
      source: 'NTIS_API',
      operation,
      details,
      duration,
    };

    this.logs.push(entry);

    // Console output
    const icon = level === 'info' ? 'ℹ️' : level === 'warn' ? '⚠️' : '❌';
    const durationStr = duration ? ` (${duration}ms)` : '';
    console.log(`${icon} [NTIS_API] ${operation}${durationStr}`);

    if (details) {
      console.log(`   Details:`, JSON.stringify(details, null, 2));
    }

    // TODO: Send to external logging service (Sentry, Grafana, etc.)
  }

  info(operation: string, details?: any, duration?: number) {
    this.log('info', operation, details, duration);
  }

  warn(operation: string, details?: any, duration?: number) {
    this.log('warn', operation, details, duration);
  }

  error(operation: string, details?: any, duration?: number) {
    this.log('error', operation, details, duration);
  }

  getStats() {
    const total = this.logs.length;
    const errors = this.logs.filter(l => l.level === 'error').length;
    const warnings = this.logs.filter(l => l.level === 'warn').length;

    return {
      total,
      errors,
      warnings,
      errorRate: total > 0 ? (errors / total) * 100 : 0,
    };
  }
}

export const ntisLogger = new NTISLogger();
```

Update `lib/ntis-api/scraper.ts` to use logger:

```typescript
// Add at top:
import { ntisLogger } from './logger';

// Update scrapeAllAgencies method:
async scrapeAllAgencies(daysBack: number = 30): Promise<{...}> {
  const startTime = Date.now();

  ntisLogger.info('Starting NTIS API scraping', { daysBack });

  try {
    const response = await this.client.searchRecentAnnouncements(daysBack, 100);
    const duration = Date.now() - startTime;

    if (!response.success || !response.data) {
      ntisLogger.error('NTIS API request failed', { error: response.error }, duration);
      return { success: false, programsNew: 0, programsUpdated: 0, totalFound: 0 };
    }

    const parsed = await this.parser.parseSearchResponse(response.data);
    ntisLogger.info('NTIS API response parsed', {
      totalFound: parsed.programs.length
    }, duration);

    // ... rest of method

    ntisLogger.info('NTIS API scraping completed', {
      programsNew,
      programsUpdated,
      totalFound,
    }, Date.now() - startTime);

    return { success: true, programsNew, programsUpdated, totalFound };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    ntisLogger.error('NTIS API scraping exception', {
      error: error.message
    }, duration);

    return { success: false, programsNew: 0, programsUpdated: 0, totalFound: 0 };
  }
}
```

---

### 2. API Usage Tracking

**Time**: 20 minutes

Create `lib/ntis-api/usage-tracker.ts`:

```typescript
/**
 * NTIS API Usage Tracker
 *
 * Tracks API usage against quotas
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface UsageStats {
  requestsToday: number;
  requestsThisHour: number;
  requestsThisMinute: number;
  quotaDaily: number;
  quotaMinute: number;
  percentUsed: number;
}

class NTISUsageTracker {
  private readonly quotaDaily = 1000;
  private readonly quotaMinute = 10;

  async trackRequest() {
    // TODO: Store in Redis or database
    // For now, just log
    const now = new Date();
    console.log(`[NTIS Usage] Request made at ${now.toISOString()}`);
  }

  async getUsageStats(): Promise<UsageStats> {
    // TODO: Query from Redis or database
    // For now, return mock data
    return {
      requestsToday: 45,
      requestsThisHour: 5,
      requestsThisMinute: 1,
      quotaDaily: this.quotaDaily,
      quotaMinute: this.quotaMinute,
      percentUsed: 4.5,
    };
  }

  async checkQuota(): Promise<{ allowed: boolean; reason?: string }> {
    const stats = await this.getUsageStats();

    if (stats.requestsToday >= this.quotaDaily) {
      return {
        allowed: false,
        reason: `Daily quota exceeded (${stats.requestsToday}/${this.quotaDaily})`,
      };
    }

    if (stats.requestsThisMinute >= this.quotaMinute) {
      return {
        allowed: false,
        reason: `Per-minute quota exceeded (${stats.requestsThisMinute}/${this.quotaMinute})`,
      };
    }

    return { allowed: true };
  }
}

export const usageTracker = new NTISUsageTracker();
```

---

### 3. Error Handling & Retry Logic

**Time**: 20 minutes

Update `lib/ntis-api/client.ts` with exponential backoff:

```typescript
async searchProjects(params: NTISSearchParams): Promise<NTISSearchResponse> {
  const maxRetries = 3;
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const queryParams = this.buildQueryParams(params);

      const response = await this.client.get('/public_project', {
        params: queryParams,
      });

      return {
        success: true,
        data: response.data,
        totalHits: this.extractTotalHits(response.data),
        searchTime: this.extractSearchTime(response.data),
      };
    } catch (error: any) {
      lastError = error;

      // Don't retry on 4xx errors (client errors)
      if (error.response?.status >= 400 && error.response?.status < 500) {
        break;
      }

      // Exponential backoff: 2^attempt seconds
      if (attempt < maxRetries) {
        const delayMs = Math.pow(2, attempt) * 1000;
        console.log(`Retrying NTIS API call in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  return {
    success: false,
    error: lastError?.message || 'Unknown error',
    totalHits: 0,
    searchTime: 0,
  };
}
```

---

### 4. Performance Monitoring Script

**Time**: 30 minutes

Create `scripts/monitor-scraping-performance.ts`:

```typescript
/**
 * Scraping Performance Monitor
 *
 * Monitors and reports on scraping system performance
 */

import { PrismaClient } from '@prisma/client';
import { ntisLogger } from '../lib/ntis-api/logger';
import { usageTracker } from '../lib/ntis-api/usage-tracker';
import { getQueueStats } from '../lib/scraping/scheduler';

const prisma = new PrismaClient();

async function monitorPerformance() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Scraping System Performance Monitor');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // Database stats
  console.log('📦 Database Statistics:');
  const totalPrograms = await prisma.fundingProgram.count();
  const ntisPrograms = await prisma.fundingProgram.count({
    where: { scrapingSource: 'NTIS_API' },
  });
  const playwrightPrograms = totalPrograms - ntisPrograms;

  console.log(`   Total Programs: ${totalPrograms}`);
  console.log(`   NTIS Programs: ${ntisPrograms} (${((ntisPrograms / totalPrograms) * 100).toFixed(1)}%)`);
  console.log(`   Playwright Programs: ${playwrightPrograms} (${((playwrightPrograms / totalPrograms) * 100).toFixed(1)}%)`);
  console.log('');

  // Recent scraping activity
  console.log('🕐 Recent Scraping Activity:');
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentPrograms = await prisma.fundingProgram.count({
    where: {
      scrapedAt: {
        gte: last24h,
      },
    },
  });

  console.log(`   Programs scraped (last 24h): ${recentPrograms}`);
  console.log('');

  // NTIS API usage
  console.log('🌐 NTIS API Usage:');
  const usage = await usageTracker.getUsageStats();
  console.log(`   Requests today: ${usage.requestsToday}/${usage.quotaDaily} (${usage.percentUsed.toFixed(1)}%)`);
  console.log(`   Requests this hour: ${usage.requestsThisHour}`);
  console.log(`   Requests this minute: ${usage.requestsThisMinute}/${usage.quotaMinute}`);
  console.log('');

  // Queue stats
  console.log('📋 Playwright Queue Statistics:');
  const queueStats = await getQueueStats();
  console.log(`   Waiting: ${queueStats.waiting}`);
  console.log(`   Active: ${queueStats.active}`);
  console.log(`   Completed: ${queueStats.completed}`);
  console.log(`   Failed: ${queueStats.failed}`);
  console.log('');

  // NTIS Logger stats
  console.log('📝 NTIS Logger Statistics:');
  const logStats = ntisLogger.getStats();
  console.log(`   Total logs: ${logStats.total}`);
  console.log(`   Errors: ${logStats.errors}`);
  console.log(`   Warnings: ${logStats.warnings}`);
  console.log(`   Error rate: ${logStats.errorRate.toFixed(2)}%`);
  console.log('');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await prisma.$disconnect();
}

monitorPerformance().catch(console.error);
```

Run with:
```bash
npx tsx scripts/monitor-scraping-performance.ts
```

---

## ✅ Phase 4 Completion Checklist

- [ ] Created logging utility (`lib/ntis-api/logger.ts`)
- [ ] Integrated logger into scraper
- [ ] Created usage tracker (`lib/ntis-api/usage-tracker.ts`)
- [ ] Implemented retry logic with exponential backoff
- [ ] Created performance monitoring script
- [ ] Tested error scenarios
- [ ] Documented monitoring procedures

---

# Phase 5: Production Deployment

**Prerequisite**: Phases 2-4 complete
**Duration**: 1-2 hours
**Status**: Ready when previous phases done

## 📝 Overview

Deploy the hybrid scraping system to production with proper monitoring and safeguards.

---

## 🎯 Deployment Steps

### Step 1: Pre-Deployment Checklist

**Time**: 10 minutes

Verify all prerequisites:

```bash
# 1. Environment variables
npx tsx scripts/validate-ntis-integration.ts

# 2. Database migrations
npm run db:migrate

# 3. Production build
npm run build

# 4. Test hybrid scraping
npm run scraper:hybrid
```

All should pass without errors.

---

### Step 2: Update Production Environment

**Time**: 15 minutes

1. SSH into production server (or access your deployment platform)

2. Update `.env` with production values:
```env
# NTIS API
NTIS_API_KEY="your_production_key"

# Database
DATABASE_URL="postgresql://..."

# Redis
REDIS_CACHE_URL="redis://..."
REDIS_QUEUE_URL="redis://..."
```

3. Restart services:
```bash
npm run docker:restart
# or your deployment command
```

---

### Step 3: Deploy Scheduler

**Time**: 20 minutes

1. Ensure scheduler starts on boot:
```bash
# Add to your process manager (PM2, systemd, etc.)
pm2 start npm --name "connect-scraper" -- run scraper
pm2 save
```

2. Verify scheduler is running:
```bash
pm2 status
```

3. Check logs:
```bash
pm2 logs connect-scraper
```

Should show:
```
✓ NTIS API scheduler started successfully
✓ Hybrid scraping scheduler started successfully
```

---

### Step 4: Set Up Monitoring

**Time**: 30 minutes

1. **Cron Job for Daily Health Check**:
```bash
# Add to crontab
crontab -e

# Add this line (runs at 10 PM daily):
0 22 * * * cd /opt/connect && npx tsx scripts/monitor-scraping-performance.ts >> /var/log/connect/scraping-monitor.log 2>&1
```

2. **Alert on Failures** (optional - via email/Slack):
```bash
# Create scripts/alert-on-failure.sh
```typescript
#!/bin/bash
# Check if scraping failed today
ERRORS=$(grep -c "❌" /var/log/connect/scraping.log)

if [ $ERRORS -gt 5 ]; then
  # Send alert (email, Slack, etc.)
  echo "ALERT: ${ERRORS} scraping errors detected" | mail -s "Connect Scraping Alert" your@email.com
fi
```

3. **Dashboard** (optional):
   - Use Grafana to visualize metrics
   - Track programs scraped per day
   - Monitor API usage
   - Alert on quota warnings

---

### Step 5: First Production Run

**Time**: 30 minutes

1. Manually trigger first production scrape:
```bash
npm run scraper:hybrid
```

2. Monitor output for:
   - [ ] NTIS API completes successfully
   - [ ] Playwright jobs queued
   - [ ] Programs saved to database
   - [ ] No errors or warnings

3. Verify in database:
```bash
npm run db:studio
```

4. Check data quality:
   - [ ] 100+ new programs
   - [ ] Both sources present (NTIS_API + agencies)
   - [ ] No duplicates
   - [ ] All fields populated

---

### Step 6: Monitor First 24 Hours

**Time**: Ongoing

**Hour 1**: Check logs every 15 minutes
**Hours 2-8**: Check every hour
**Hours 9-24**: Check every 4 hours

**What to check**:
- Scheduler runs at correct times
- No API errors
- Queue processes jobs
- Database grows steadily
- No memory leaks

**Key Metrics**:
```bash
# Programs added today
select count(*) from funding_program where scraped_at::date = current_date;

# NTIS API programs
select count(*) from funding_program where scraping_source = 'NTIS_API';

# Error rate
grep -c "❌" /var/log/connect/scraping.log
```

---

### Step 7: Document Production Setup

**Time**: 20 minutes

Create `PRODUCTION-SETUP.md`:
```markdown
# Production Scraping System

## Schedule
- 8:00 AM KST: NTIS API scraping
- 9:00 AM, 3:00 PM KST: Playwright scraping (normal)
- Jan-Mar peak season: 4x daily Playwright

## Monitoring
- Daily health check: 10 PM KST
- Error alerts: > 5 errors/day
- Performance report: Weekly

## API Quota
- Daily: 1,000 requests
- Per minute: 10 requests
- Current usage: ~50-100 requests/day

## Troubleshooting
- Logs: /var/log/connect/scraping.log
- Monitor: npx tsx scripts/monitor-scraping-performance.ts
- Restart: pm2 restart connect-scraper

## Support
- NTIS API: 042-869-1115, ntis@kisti.re.kr
- API Key Expiration: 2027-10-14
```

---

## ✅ Phase 5 Completion Checklist

- [ ] Pre-deployment validation passed
- [ ] Production environment configured
- [ ] Scheduler deployed and running
- [ ] Monitoring set up (cron, logs, alerts)
- [ ] First production run successful
- [ ] 24-hour monitoring completed
- [ ] Production documentation created
- [ ] Team trained on troubleshooting procedures

---

# Troubleshooting Guide

## Common Issues & Solutions

### Issue: API Returns 404

**Symptoms**: NTIS API requests fail with 404 error

**Possible Causes**:
1. Endpoint URL changed
2. API key invalid/expired
3. Network connectivity issue

**Solutions**:
```bash
# 1. Verify endpoint
curl -v "https://www.ntis.go.kr/rndopen/openApi/public_project?apprvKey=YOUR_KEY&SRWR=&displayCnt=1"

# 2. Check API key validity
# Log into NTIS portal: https://www.ntis.go.kr/rndopen/api/mng/apiMain.do

# 3. Test network
ping www.ntis.go.kr
```

---

### Issue: Demo Key Returns Zero Results

**Symptoms**: API call succeeds (HTTP 200) but `totalHits: 0`

**Cause**: Demo key has restricted access

**Solution**: Replace with production key (Phase 2)

---

### Issue: Duplicate Programs in Database

**Symptoms**: Same program appears multiple times

**Possible Causes**:
1. `contentHash` not generated correctly
2. Deduplication logic bypassed
3. Different sources treating same program differently

**Solutions**:
```bash
# 1. Find duplicates
npx tsx scripts/find-duplicates.ts

# 2. Check contentHash generation
# Verify lib/scraping/utils.ts generateProgramHash() function

# 3. Manual cleanup (if needed)
# Use Prisma Studio to identify and merge duplicates
```

---

### Issue: Quota Exceeded

**Symptoms**: API returns 429 or 403 error

**Cause**: Exceeded daily or per-minute quota

**Solutions**:
```bash
# 1. Check current usage
npx tsx scripts/monitor-scraping-performance.ts

# 2. Adjust scraping frequency
# Edit lib/ntis-api/scheduler.ts to reduce frequency

# 3. Request quota increase
# Contact NTIS: ntis@kisti.re.kr
```

---

### Issue: Scheduler Not Running

**Symptoms**: No automatic scraping occurs

**Possible Causes**:
1. Process crashed
2. Timezone misconfiguration
3. Cron expression wrong

**Solutions**:
```bash
# 1. Check process status
pm2 status

# 2. Restart scheduler
pm2 restart connect-scraper

# 3. Verify timezone
timedatectl  # Should show Asia/Seoul
```

---

### Issue: Parser Fails on XML

**Symptoms**: XML parsing errors in logs

**Possible Causes**:
1. NTIS API changed response format
2. Unexpected data in response
3. Character encoding issues

**Solutions**:
```bash
# 1. Capture raw response
# Add console.log(response.data) in lib/ntis-api/client.ts

# 2. Update parser
# Modify lib/ntis-api/parser.ts to handle new format

# 3. Contact NTIS for API changes
# Email: ntis@kisti.re.kr
```

---

# Quick Reference

## Commands

```bash
# Installation
npm install

# Validation
npx tsx scripts/validate-ntis-integration.ts

# Scraping
npm run scraper:ntis           # NTIS API only
npm run scraper:hybrid         # Both systems
npx tsx scripts/trigger-hybrid-scraping.ts --ntis  # NTIS only
npx tsx scripts/trigger-hybrid-scraping.ts --pw    # Playwright only

# Monitoring
npx tsx scripts/monitor-scraping-performance.ts
npm run db:studio

# Deployment
npm run docker:build
npm run docker:up
pm2 start npm --name connect-scraper -- run scraper
```

---

## File Structure

```
lib/
├── ntis-api/
│   ├── client.ts         # API client
│   ├── parser.ts         # XML parser
│   ├── scraper.ts        # Database integration
│   ├── scheduler.ts      # NTIS scheduler
│   ├── logger.ts         # Logging utility
│   ├── usage-tracker.ts  # Usage tracking
│   └── config.ts         # Configuration
├── scraping/
│   ├── scheduler.ts      # Hybrid scheduler
│   ├── worker.ts         # Playwright worker
│   └── config.ts         # Agency configs
scripts/
├── validate-ntis-integration.ts        # Validation
├── trigger-ntis-scraping.ts            # NTIS trigger
├── trigger-hybrid-scraping.ts          # Hybrid trigger
├── monitor-scraping-performance.ts     # Monitoring
└── test-ntis-simple.ts                 # API testing
```

---

## Schedules

### Normal Mode (Feb-Dec)
```
08:00 AM KST → NTIS API scraping (comprehensive)
09:00 AM KST → Playwright scraping (real-time)
03:00 PM KST → Playwright scraping (real-time)
```

### Peak Season (Jan-Mar)
```
08:00 AM KST → NTIS API scraping (comprehensive)
09:00 AM KST → Playwright scraping (real-time)
12:00 PM KST → Playwright scraping (real-time)
03:00 PM KST → Playwright scraping (real-time)
06:00 PM KST → Playwright scraping (real-time)
```

---

## Support Contacts

**NTIS API Support**:
- Help Desk: 042-869-1115
- Email: ntis@kisti.re.kr
- Hours: 09:00-18:00 KST (Weekdays)
- Portal: https://www.ntis.go.kr/rndopen/api/mng/apiMain.do

**API Key**:
- Type: Production (public access)
- Approved: 2025-10-14
- Expires: 2027-10-14
- Renewal: Contact NTIS 30 days before expiration

---

## Success Metrics

**Week 1**:
- [ ] 500+ programs in database
- [ ] NTIS API running daily
- [ ] Playwright scraping 2-4x daily
- [ ] No quota warnings
- [ ] < 1% error rate

**Month 1**:
- [ ] 2000+ programs in database
- [ ] 95%+ uptime
- [ ] < 5% duplicate rate
- [ ] Data quality > 90%

**Month 3+**:
- [ ] 5000+ programs in database
- [ ] Comprehensive agency coverage
- [ ] User satisfaction with data freshness
- [ ] Stable, automated operation

---

**End of Roadmap**

**Next Steps**:
1. Wait for production API key (Oct 14)
2. Execute Phase 2 immediately upon receipt
3. Proceed through Phases 3-5 systematically
4. Monitor and optimize continuously

**Questions?** Refer to troubleshooting guide or contact NTIS support.
