# Text Extraction Failure Diagnostic Report

**Date:** November 11, 2025
**Target Program:** 글로벌 방위산업 강소기업 육성사업
**Program ID:** `b21703cb-c36d-482a-969f-9c4932351071`
**Scraping Job ID:** `8ab383af-fb56-4814-90bd-ca2261a52c69`
**Status:** ✅ **ROOT CAUSE IDENTIFIED**

---

## Executive Summary

The process worker failed to extract text from the announcement file **despite all extraction logic working correctly**. The root cause is a **path mismatch** between the database-stored attachment folder path and the actual file system location.

### Key Findings

| Component | Status | Details |
|-----------|--------|---------|
| **Text Extraction Logic** | ✅ WORKS | Extracted 10,077 chars in 0.56s (standalone test) |
| **File Filter Logic** | ✅ WORKS | Correctly classified as announcement file |
| **File Existence** | ✅ EXISTS | 1.6 MB HWP file present on disk |
| **Path Mapping** | ❌ **BROKEN** | Database path doesn't match filesystem path |
| **Error Handling** | ⚠️ SILENT FAILURE | Caught exception, returned empty text, completed job |

---

## Detailed Analysis

### 1. Text Extraction Test Results

**Command:**
```bash
NODE_ENV=development npx tsx scripts/test-hwp-extraction-debug.ts \
  "/Users/paulkim/Downloads/connect/data/scraper/scraper/ntis-attachments/20250201_to_20250331/page-24/announcement-290/붙임1. 25-1차 글로벌 방위산업 강소기업 육성사업 지원과제 및 주관기업 모집 공고문.hwp"
```

**Result:** ✅ **SUCCESS**
- Extracted: 10,077 characters (returned 5,000 chars due to limit)
- Duration: 0.56 seconds
- Method: pyhwp (hwp5txt)
- Text preview: Valid Korean content about defense industry SME support program

**Conclusion:** The extraction logic itself is **fully functional**.

---

### 2. File Filter Test Results

**Filename:**
```
붙임1. 25-1차 글로벌 방위산업 강소기업 육성사업 지원과제 및 주관기업 모집 공고문.hwp
```

**Classification:** ✅ **Announcement file** (correctly identified)

**Matching patterns:**
- `/공고문/i` - Contains "공고문"
- `/모집/i` - Contains "모집"

**Exclusion patterns:** None matched

**Conclusion:** The file filter correctly identified this as an announcement file that should be processed.

---

### 3. Database Investigation

#### Scraping Job Record

```sql
id: 8ab383af-fb56-4814-90bd-ca2261a52c69
processingStatus: COMPLETED
attachmentFolder: /app/data/scraper/ntis-attachments/20250201_to_20250331/page-24/announcement-290
attachmentCount: 1
attachmentFilenames: ["붙임1. 25-1차 글로벌 방위산업 강소기업 육성사업 지원과제 및 주관기업 모집 공고문.hwp"]
processingStartedAt: 2025-11-10 13:34:20.703
processedAt: 2025-11-10 13:34:20.746
processingError: NULL
```

**Critical Observations:**
1. ⚠️ **Processing duration: 43 milliseconds** - Impossibly fast for text extraction
2. ✅ Filename correctly stored in `attachmentFilenames` array
3. ❌ **Path mismatch** - `attachmentFolder` points to Docker container path

#### Attachment Text Status

```json
{
  "attachments": [
    {
      "url": "https://www.ntis.go.kr/rndgate/eg/cmm/file/download.do",
      "text": null,
      "filename": "붙임1. 25-1차 글로벌 방위산업 강소기업 육성사업 지원과제 및 주관기업 모집 공고문.hwp"
    }
  ]
}
```

**Result:** `text` field is `null` (no extraction occurred)

#### Extraction Logs

```sql
SELECT * FROM extraction_logs
WHERE "scrapingJobId" = '8ab383af-fb56-4814-90bd-ca2261a52c69';

-- Result: 0 rows
```

**Conclusion:** No extraction logs were created, indicating extraction never ran.

---

### 4. Path Mismatch Analysis

#### Database-Stored Path (from `scraping_jobs.attachmentFolder`)

```
/app/data/scraper/ntis-attachments/20250201_to_20250331/page-24/announcement-290
```

**Context:**
- `/app/` - Docker container base path
- Used by: Discovery Scraper running in Docker container
- Status: ❌ **Does not exist on local Mac filesystem**

#### Actual File System Path (where file exists)

```
/Users/paulkim/Downloads/connect/data/scraper/scraper/ntis-attachments/20250201_to_20250331/page-24/announcement-290/붙임1. 25-1차 글로벌 방위산업 강소기업 육성사업 지원과제 및 주관기업 모집 공고문.hwp
```

**Differences:**
1. **Base path:** `/Users/paulkim/Downloads/connect/` (Mac) vs `/app/` (Docker)
2. **Extra directory:** Contains `/scraper/scraper/` vs `/scraper/`

**File verification:**
```bash
$ ls -lh "/Users/paulkim/Downloads/connect/data/scraper/scraper/ntis-attachments/20250201_to_20250331/page-24/announcement-290/"
-rw-r--r--  1 paulkim  staff   1.6M Nov 10 20:38 붙임1. 25-1차 글로벌 방위산업 강소기업 육성사업 지원과제 및 주관기업 모집 공고문.hwp
```

**Status:** ✅ **File exists at Mac path**

---

### 5. Process Worker Behavior Analysis

#### Code Path (from `scripts/scrape-ntis-processor.ts:676-689`)

```typescript
const results = await Promise.all(
  announcementFilenames.map(async (filename: string) => {
    try {
      const filePath = path.join(job.attachmentFolder, filename);
      const fileBuffer = await fs.readFile(filePath);
      const extractedText = await extractTextFromAttachment(filename, fileBuffer, workerBrowser || undefined);
      return { filename, text: extractedText || '' };
    } catch (err: any) {
      console.warn(`   ⚠️  Failed to extract text from ${filename}: ${err.message}`);
      return { filename, text: '' };
    }
  })
);
```

#### What Happened

1. **Line 679:** Constructed file path
   ```
   /app/data/scraper/ntis-attachments/20250201_to_20250331/page-24/announcement-290/붙임1. 25-1차 글로벌 방위산업 강소기업 육성사업 지원과제 및 주관기업 모집 공고문.hwp
   ```

2. **Line 680:** Attempted to read file
   ```typescript
   const fileBuffer = await fs.readFile(filePath);
   ```

   **Result:** `ENOENT: no such file or directory` error thrown

3. **Line 683-686:** Error caught by try-catch
   ```typescript
   } catch (err: any) {
     console.warn(`   ⚠️  Failed to extract text from ${filename}: ${err.message}`);
     return { filename, text: '' };
   }
   ```

   **Result:** Returned empty string, no exception propagated

4. **Line 689:** Filtered out empty results
   ```typescript
   announcementFiles.push(...results.filter((r) => r.text.length > 0));
   ```

   **Result:** `announcementFiles` array remained empty

5. **Job Completion:** Process worker marked job as `COMPLETED` with:
   - `text: null` in attachments
   - `processingError: NULL` (no error logged)
   - Processing time: 43ms (no actual extraction performed)

---

### 6. Why Silent Failure?

The process worker's error handling is **intentionally lenient** to allow partial processing:

```typescript
} catch (err: any) {
  console.warn(`   ⚠️  Failed to extract text from ${filename}: ${err.message}`);
  return { filename, text: '' };
}
```

**Design Intent:**
- Allow jobs to complete even if some attachments fail
- Prevent single file failures from blocking entire job
- Continue processing other files in multi-attachment jobs

**Unintended Consequence:**
- Path mismatches are treated as "file extraction failures"
- No distinction between:
  - File doesn't exist (path issue)
  - File is corrupted (file issue)
  - Extraction method failed (logic issue)
- All failures silently return empty text

---

## Root Cause Summary

**The process worker failed because:**

1. ✅ Discovery Scraper (Docker container) downloaded files to:
   ```
   /app/data/scraper/ntis-attachments/...
   ```

2. ✅ Discovery Scraper saved this Docker path to database:
   ```sql
   attachmentFolder = '/app/data/scraper/ntis-attachments/...'
   ```

3. ❌ **Process Worker (running locally on Mac) tried to read from Docker path:**
   ```
   /app/data/scraper/ntis-attachments/...
   ```

4. ❌ **Path doesn't exist on Mac filesystem** (files are at `/Users/paulkim/Downloads/connect/data/scraper/scraper/ntis-attachments/...`)

5. ⚠️ **Error caught silently**, returned empty text, completed job with NULL text fields

---

## Impact Assessment

### Current State

- **Programs with NULL text:** 6 out of 1,413 (0.4%)
- **Matched programs affected:** 1 out of 1 (100% - the only match has NULL deadline)
- **Business impact:** Critical - users cannot determine application deadlines

### Affected Programs

All programs from the **February 1-31, 2025 scraping run** are likely affected if:
1. Discovery Scraper ran in Docker container
2. Process Worker ran locally on Mac
3. Path translation was not implemented

---

## Recommended Fixes

### Option 1: Path Translation (Immediate Fix)

**Add path translation logic to process worker:**

```typescript
// At top of processJob function
function translateAttachmentPath(dockerPath: string): string {
  if (dockerPath.startsWith('/app/')) {
    return dockerPath.replace(
      '/app/',
      '/Users/paulkim/Downloads/connect/'
    );
  }
  return dockerPath;
}

// Usage in processJob
const translatedFolder = translateAttachmentPath(job.attachmentFolder);
const filePath = path.join(translatedFolder, filename);
```

**Pros:**
- Quick fix (5 minutes)
- Backward compatible with existing database records
- No database migration needed

**Cons:**
- Hardcoded local path (not portable)
- Doesn't fix root cause (mixed environment execution)

### Option 2: Reprocess Failed Jobs (Database Fix)

**Correct paths in database and reprocess:**

```sql
-- Update paths for February 2025 scraping run
UPDATE scraping_jobs
SET
  "attachmentFolder" = REPLACE(
    "attachmentFolder",
    '/app/',
    '/Users/paulkim/Downloads/connect/'
  ),
  "processingStatus" = 'PENDING'
WHERE "dateRange" = '20250201_to_20250331'
  AND "processingStatus" = 'COMPLETED';
```

**Then rerun processor:**
```bash
npx tsx scripts/scrape-ntis-processor.ts --dateRange "2025-02-01 to 2025-02-31" --maxJobs 100
```

**Pros:**
- Fixes all affected programs at once
- Clean database state
- Validates extraction works end-to-end

**Cons:**
- Requires database migration
- May reprocess already-good programs

### Option 3: Docker-Only Execution (Long-Term Fix)

**Run BOTH Discovery Scraper AND Process Worker in Docker:**

1. Update `docker-compose.yml` to add processor service
2. Mount shared volume for attachment storage
3. Use consistent Docker paths across both services

**Pros:**
- Eliminates path translation complexity
- Production-ready architecture
- Consistent environment across all workers

**Cons:**
- Requires infrastructure changes
- More complex local development setup

---

## Recommended Action Plan

### Immediate (Today)

1. ✅ **Diagnose root cause** - COMPLETED
2. 🔄 **Implement Option 1** (path translation) to unblock current work
3. 🔄 **Reprocess 6 affected programs** using corrected paths

### Short-Term (This Week)

4. Implement Option 2 (database fix + bulk reprocessing)
5. Add validation to detect path mismatches early
6. Add extraction logging to surface file read errors

### Long-Term (Next Sprint)

7. Migrate to Docker-only execution (Option 3)
8. Add health checks for attachment folder accessibility
9. Implement retry logic for extraction failures

---

## Lessons Learned

1. **Environment inconsistency creates silent failures** - Running scraper in Docker but processor locally led to path mismatch
2. **Lenient error handling can hide issues** - Try-catch returning empty string masked the root cause
3. **Fast completion is a red flag** - 43ms processing time should have triggered an alert
4. **Path validation needed** - Should verify attachment folder exists before processing
5. **Extraction logging critical** - Zero extraction_logs entries indicated extraction never ran

---

## Appendix: Test Scripts Created

### A. HWP Extraction Diagnostic

**File:** `scripts/test-hwp-extraction-debug.ts`

**Purpose:** Test text extraction on specific HWP files

**Usage:**
```bash
NODE_ENV=development npx tsx scripts/test-hwp-extraction-debug.ts <hwp-file-path>
```

**Result:** Extracts text and displays preview, validates extraction logic works

### B. File Filter Test

**File:** `scripts/test-file-filter.ts`

**Purpose:** Test announcement file classification logic

**Usage:**
```bash
npx tsx scripts/test-file-filter.ts
```

**Result:** Validates filter correctly identifies announcement files

---

**End of Report**
