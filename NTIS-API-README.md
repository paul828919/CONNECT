# NTIS API Integration

Official API integration for **National Science & Technology Information Service (NTIS)**. This provides a more stable and efficient alternative to web scraping.

## 🎯 Why Use NTIS API?

### Advantages over Web Scraping:
- ✅ **Official API** - More stable than HTML scraping
- ✅ **Structured Data** - Clean XML/JSON responses
- ✅ **No Selector Breaking** - No HTML changes to worry about
- ✅ **Multiple Agencies** - One API covers all agencies
- ✅ **Better Performance** - No browser automation overhead
- ✅ **Rate Limiting** - Built-in throttling support

## 📦 Installation

### 1. Install Dependencies

```bash
npm install axios xml2js
npm install --save-dev @types/xml2js
```

### 2. Set Up Environment Variable

Add your NTIS API key to `.env`:

```env
NTIS_API_KEY=your_api_key_here
```

**Note**: Currently using demo key `yx6c98kg21bu649u2m8u` for testing

## 🚀 Usage

### Manual Scraping

Trigger NTIS API scraping manually:

```bash
npx tsx scripts/trigger-ntis-scraping.ts
```

This will:
- Fetch R&D programs from the last 30 days
- Parse XML responses
- Save to database with deduplication
- Display statistics

### Programmatic Usage

```typescript
import { NTISApiScraper } from './lib/ntis-api';

const scraper = new NTISApiScraper();

// Scrape all agencies
const result = await scraper.scrapeAllAgencies(30); // last 30 days

// Scrape specific agency
const iitpResult = await scraper.scrapeByAgency('IITP');
```

### Using the API Client Directly

```typescript
import { NTISApiClient } from './lib/ntis-api';

const client = new NTISApiClient({
  apiKey: process.env.NTIS_API_KEY,
  baseUrl: 'https://www.ntis.go.kr/rndopen/openApi',
});

// Search by keywords
const response = await client.searchByKeywords(['인공지능', 'AI']);

// Search by agency
const agencyResponse = await client.searchByAgency('정보통신기획평가원');

// Search recent announcements
const recentResponse = await client.searchRecentAnnouncements(7); // last 7 days
```

## 📚 API Reference

### NTISApiScraper

Main scraper class that integrates with your database.

#### Methods

**`scrapeAllAgencies(daysBack: number)`**
- Scrapes recent programs from all agencies
- `daysBack`: Number of days to look back (default: 30)
- Returns: `{ success, programsNew, programsUpdated, totalFound }`

**`scrapeByAgency(agencyKey: string)`**
- Scrapes programs from a specific agency
- `agencyKey`: 'IITP', 'TIPA', 'KIMST', or 'KEIT'
- Returns: `{ success, programsNew, programsUpdated, totalFound }`

### NTISApiClient

Low-level API client for making requests.

#### Methods

**`searchProjects(params: NTISSearchParams)`**
- Search for R&D projects
- Returns XML response

**`searchByKeywords(keywords: string[], options?)`**
- Search by multiple keywords (OR logic)

**`searchByAgency(agencyName: string, options?)`**
- Search by agency name

**`searchRecentAnnouncements(daysBack: number, displayCount: number)`**
- Get recent announcements

### Search Parameters

```typescript
interface NTISSearchParams {
  SRWR?: string;              // Search query
  searchFd?: string;          // Search field
  addQuery?: string;          // Additional filters
  searchRnkn?: string;        // Sort order
  startPosition?: number;     // Start position
  displayCnt?: number;        // Results count (max 100)
}
```

### Search Fields

- `BI` - All fields (default)
- `TI` - Project title
- `AU` - Researcher name
- `OG` - Order agency
- `PB` - Performing agency
- `KW` - Keywords
- `AB` - Abstract

### Sort Options

- `RANK/DESC` - By relevance (descending)
- `RANK/ASC` - By relevance (ascending)
- `DATE/DESC` - By date (newest first)
- `DATE/ASC` - By date (oldest first)

## 🔧 Configuration

### Agency Mapping

The scraper automatically maps NTIS agencies to your internal agency IDs:

```typescript
'정보통신기획평가원' → 'IITP'
'중소기업기술정보진흥원' → 'TIPA'
'해양수산과학기술진흥원' → 'KIMST'
'한국산업기술평가관리원' → 'KEIT'
```

### Rate Limiting

Default configuration:
- **10 requests per minute**
- **6 seconds between requests**

Adjust in `lib/ntis-api/config.ts`:

```typescript
export const rateLimitConfig = {
  requestsPerMinute: 10,
  delayBetweenRequests: 6000,
};
```

## 📊 Database Integration

Programs are automatically saved to the `FundingProgram` table with:

- ✅ **Deduplication** via content hash
- ✅ **Agency mapping** to internal IDs
- ✅ **Target type detection** (company/research institute)
- ✅ **Rich metadata** from API response
- ✅ **Automatic matching** with organizations

### Saved Fields

- `title` - Korean or English title
- `description` - Goals, abstract, and expected effects
- `announcementUrl` - NTIS project URL
- `deadline` - Project end date
- `budgetAmount` - Total funding
- `targetType` - Company and/or research institute
- `eligibilityCriteria` - Detailed JSON metadata
- `scrapingSource` - Set to 'NTIS_API'

## 🔑 Getting Your Own API Key

### Step 1: Visit NTIS OpenAPI Page

Go to: https://www.ntis.go.kr/rndopen/api/mng/apiMain.do

### Step 2: Select API Service

Choose **"국가R&D 과제검색 서비스(대국민용)"** (Public R&D Project Search)

### Step 3: Click "활용신청" (Application)

You'll need to:
1. Log in to NTIS
2. Fill out the application form
3. Provide:
   - Service name/purpose
   - Expected usage volume
   - Contact information

### Step 4: Wait for Approval

- Usually approved within **1-2 business days**
- You'll receive an email with your API key

### Step 5: Update Environment

Add to `.env`:

```env
NTIS_API_KEY=your_approved_key_here
```

## 📈 Monitoring & Logs

### View Results

```bash
npm run db:studio
```

Then check:
- **FundingProgram** table for scraped programs
- **ScrapingLog** table for scraping history (if extended)

### Console Output

The scraper provides detailed console output:

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
```

## 🔄 Integration with Existing Scraper

### Option 1: Replace Web Scraping

Replace Playwright-based scraping with NTIS API in `lib/scraping/scheduler.ts`:

```typescript
import { NTISApiScraper } from '../ntis-api';

async function queueScrapingJobs() {
  // Use NTIS API instead of Playwright
  const ntis = new NTISApiScraper();
  await ntis.scrapeAllAgencies(30);
}
```

### Option 2: Hybrid Approach

Use both for comprehensive coverage:

```typescript
// 1. NTIS API for broad coverage
const ntis = new NTISApiScraper();
await ntis.scrapeAllAgencies(30);

// 2. Playwright for agency-specific details
await scrapingQueue.add('scrape-iitp-details', ...);
```

## 🚨 Troubleshooting

### "API request failed" Error

**Cause**: Invalid API key or rate limiting

**Solution**:
1. Check your API key in `.env`
2. Ensure you're not exceeding rate limits
3. Try with the demo key first

### "No programs found" Result

**Cause**: Search parameters too restrictive

**Solution**:
1. Broaden your search query
2. Remove date filters
3. Check agency name spelling

### XML Parsing Error

**Cause**: Unexpected XML format from API

**Solution**:
1. Check API response format
2. Update parser in `lib/ntis-api/parser.ts`
3. Report issue to NTIS if format changed

## 📝 Example Workflow

### Complete Scraping Pipeline

```bash
# 1. Install dependencies
npm install axios xml2js

# 2. Set up API key
echo "NTIS_API_KEY=your_key" >> .env

# 3. Test API connection
npx tsx scripts/trigger-ntis-scraping.ts

# 4. View results
npm run db:studio

# 5. Schedule automated scraping (add to cron)
# 0 9,15 * * * cd /path/to/connect && npx tsx scripts/trigger-ntis-scraping.ts
```

## 🎯 Best Practices

1. **Start with recent data**: Use `scrapeAllAgencies(7)` for testing
2. **Monitor rate limits**: Don't exceed 10 requests/minute
3. **Handle errors gracefully**: API may be temporarily unavailable
4. **Keep API key secure**: Never commit to version control
5. **Regular updates**: Run scraping 2-4 times daily during peak season

## 📞 Support

- **NTIS Help Desk**: 042-869-1115
- **Email**: ntis@kisti.re.kr
- **API Documentation**: https://www.ntis.go.kr/rndopen/api/mng/apiMain.do

---

**Status**: ✅ Fully implemented and tested with demo API key
**Last Updated**: 2025-10-06
