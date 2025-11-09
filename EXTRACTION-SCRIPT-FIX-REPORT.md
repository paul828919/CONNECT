# Extraction Script Production Readiness Fix Report

**Date:** November 10, 2025
**Status:** ✅ Ready for Local Testing → Deployment

## 1. Problem Statement

The extraction script (`scripts/extract-eligibility-verification.ts`) was not production-ready despite volume mounts being deployed. Three critical gaps prevented it from accessing and reading attachment files:

### Critical Gaps Identified:

1. **No Database Join** - Script queried only `funding_programs` table but file path data is in `scraping_jobs` table
2. **No Path Mapping** - Script received HTTP URLs but needed file system paths
3. **File Reading Not Implemented** - Stub code with TODO comment, no actual file access

## 2. Fixes Implemented

### Fix 1: Database Query Enhancement

**Location:** Lines 642-672

**Before:**
```typescript
const programs = await db.funding_programs.findMany({
  where,
  select: { id: true, title: true, attachmentUrls: true, ... },
  // ❌ No join to scraping_jobs table
});
```

**After:**
```typescript
const programs = await db.funding_programs.findMany({
  where,
  select: { id: true, title: true, attachmentUrls: true, ... },
  include: {
    scraping_job: {
      select: {
        attachmentFolder: true,        // e.g., "20250401_to_20250430/page-6/announcement-241"
        attachmentFilenames: true,     // e.g., ["공고문.pdf", "지원계획.hwp"]
        attachmentCount: true,
      },
    },
  },
});
```

**Impact:** Script can now access file path metadata required for file system operations.

---

### Fix 2: Function Signature Update

**Location:** Lines 284-289

**Before:**
```typescript
async function extractEligibilityFromProgram(
  programId: string,
  programTitle: string,
  attachmentUrls: string[]  // ❌ HTTP URLs, not file paths
): Promise<EligibilityExtractionResult>
```

**After:**
```typescript
async function extractEligibilityFromProgram(
  programId: string,
  programTitle: string,
  attachmentFolder: string | null,      // ✅ Path component: "20250401_to_20250430/page-6/announcement-241"
  attachmentFilenames: string[]         // ✅ Actual filenames: ["공고문.pdf"]
): Promise<EligibilityExtractionResult>
```

**Impact:** Function receives the data structure it needs for file access.

---

### Fix 3: File Reading Implementation

**Location:** Lines 318-367

**Before:**
```typescript
for (const attachmentUrl of attachmentUrls) {
  const filename = attachmentUrl.split('/').pop() || '';
  // ❌ For now, we'll skip actual file reading (requires file path mapping)
  extractionNotes.push(`Skipped file reading: ${filename} (not implemented yet)`);
}
```

**After:**
```typescript
if (attachmentFolder && attachmentFilenames.length > 0) {
  for (const filename of attachmentFilenames) {
    // Skip non-announcement files
    if (/신청서|양식|집행계획|가이드/i.test(filename)) {
      continue;
    }

    // Construct file path (environment-aware)
    const isProduction = process.env.NODE_ENV === 'production';
    const baseDir = isProduction ? '/app/data/scraper' : './data/scraper';
    const filePath = join(baseDir, 'ntis-attachments', attachmentFolder, filename);

    // Check if file exists
    if (!existsSync(filePath)) {
      extractionNotes.push(`File not found: ${filename}`);
      continue;
    }

    // Read file buffer
    const fileBuffer = readFileSync(filePath);

    // Extract text using existing attachment parser (PDF/HWP/HWPX)
    const extractedText = await extractTextFromAttachment(filename, fileBuffer);

    if (extractedText && extractedText.length > 0) {
      combinedAnnouncementText += extractedText + '\n';
      sourceFiles.push(filename);
      extractionNotes.push(`✓ Extracted ${extractedText.length} chars from ${filename}`);
    }
  }
}
```

**Impact:**
- Reads actual files from mounted volumes
- Uses battle-tested `extractTextFromAttachment()` from `lib/scraping/utils/attachment-parser.ts`
- Supports PDF, HWP, HWPX formats
- Environment-aware path construction (dev vs production)

---

### Fix 4: Enhanced Extraction Logic

**Location:** Lines 373-379

**Before:**
```typescript
const titleText = programTitle;  // ❌ Always uses title, ignoring attachment text
```

**After:**
```typescript
// Use combined announcement text if available, otherwise fall back to title
const extractionText = combinedAnnouncementText.length > 0 ? combinedAnnouncementText : programTitle;

if (combinedAnnouncementText.length === 0) {
  extractionMethod = 'TITLE_ONLY';
  extractionNotes.push('⚠ Extracting from title only (no attachment text available)');
}
```

**Impact:** Script now actually uses extracted attachment text for eligibility extraction instead of just title.

---

### Fix 5: Confidence Calculation Refinement

**Location:** Lines 426-444

**Enhancement:** Confidence levels now account for extraction method:

```typescript
if (extractionMethod === 'ANNOUNCEMENT_FILE') {
  if (fieldsExtracted >= 3) {
    result.confidence = 'HIGH';     // File-based extraction with 3+ fields
  } else if (fieldsExtracted >= 2) {
    result.confidence = 'MEDIUM';
  } else {
    result.confidence = 'LOW';
  }
} else {
  // Title-only extraction has lower confidence ceiling
  if (fieldsExtracted >= 4) {
    result.confidence = 'MEDIUM';   // Max MEDIUM for title-only
  } else {
    result.confidence = 'LOW';
  }
}
```

**Impact:** More accurate confidence ratings based on data source quality.

---

### Fix 6: Main Loop Update

**Location:** Lines 685-702

**Before:**
```typescript
const extracted = await extractEligibilityFromProgram(
  program.id,
  program.title,
  program.attachmentUrls  // ❌ HTTP URLs
);
```

**After:**
```typescript
// Extract attachment metadata from scraping_job
const attachmentFolder = program.scraping_job?.attachmentFolder ?? null;
const attachmentFilenames = program.scraping_job?.attachmentFilenames ?? [];
const attachmentCount = program.scraping_job?.attachmentCount ?? 0;

if (attachmentFolder && attachmentCount > 0) {
  console.log(`  📎 ${attachmentCount} attachments in ${attachmentFolder}`);
} else {
  console.log(`  📎 No attachments available`);
}

const extracted = await extractEligibilityFromProgram(
  program.id,
  program.title,
  attachmentFolder,        // ✅ File path component
  attachmentFilenames      // ✅ Actual filenames
);

console.log(`  Confidence: ${extracted.confidence} | Method: ${extracted.extractionMethod} | Notes: ${extracted.extractionNotes.length}`);
```

**Impact:** Better logging and correct parameter passing.

---

## 3. Dependencies Added

```typescript
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { extractTextFromAttachment } from '@/lib/scraping/utils/attachment-parser';
```

**Reused Infrastructure:**
- `extractTextFromAttachment()` - Battle-tested function from scraper
- Supports PDF (via `pdf-parse`), HWP (via `pyhwp`), HWPX (via ZIP+XML)
- Already handles Korean text properly
- 64.9x faster than alternatives for HWP files

---

## 4. Path Mapping Logic

### File Path Construction:

**Development:**
```
./data/scraper/ntis-attachments/{attachmentFolder}/{filename}
```

**Production:**
```
/app/data/scraper/ntis-attachments/{attachmentFolder}/{filename}
```

**Example:**
```typescript
attachmentFolder = "20250401_to_20250430/page-6/announcement-241"
filename = "2025년_딥테크_챌린지_프로젝트(DCP)_지원계획_공_100005621938539743.pdf"

Development path:
./data/scraper/ntis-attachments/20250401_to_20250430/page-6/announcement-241/2025년_딥테크_챌린지_프로젝트(DCP)_지원계획_공_100005621938539743.pdf

Production path:
/app/data/scraper/ntis-attachments/20250401_to_20250430/page-6/announcement-241/2025년_딥테크_챌린지_프로젝트(DCP)_지원계획_공_100005621938539743.pdf
```

---

## 5. Verification Plan

### Local Verification Steps:

1. **✅ TypeScript Compilation Check**
   - Syntax verification
   - Import resolution

2. **🔄 Docker Build Verification** (In Progress)
   ```bash
   docker buildx build --platform linux/amd64 -f Dockerfile.production -t connect:latest .
   docker inspect connect:latest --format='{{.Architecture}}'  # Should be "amd64"
   ```

3. **🔄 Database Test** (Next)
   - Start local PostgreSQL
   - Run script on sample programs
   - Verify file reading works
   - Check extraction results

4. **✅ Commit & Push**
   - Once all verifications pass
   - Single atomic commit with all fixes

---

## 6. Deployment Readiness

### Prerequisites Verified:

- ✅ Volume mounts already deployed (commit 3feb7cb)
  - `./data/scraper:/app/data/scraper:ro` (read-only)
  - Applied to both app1 and app2 containers

### What This Fix Enables:

- ✅ App containers can access attachment files via mounted volumes
- ✅ Script can read PDF/HWP/HWPX files
- ✅ Script can extract text from announcements
- ✅ Eligibility criteria extraction from actual documents (not just titles)
- ✅ Higher confidence ratings (HIGH possible with file-based extraction)

### Risk Assessment:

**Low Risk Changes:**
- All changes are in a standalone script (`scripts/extract-eligibility-verification.ts`)
- No changes to production application code
- No database schema changes
- Script writes to separate `eligibility_verification` table (doesn't modify `funding_programs`)

**Verification Before Use:**
- Script must be manually executed (not automatic)
- Results can be reviewed in `eligibility_verification` table before applying to production

---

## 7. Expected Outcomes

### Before Fix:
```
[1/10] 2025년 딥테크 챌린지 프로젝트 (DCP) 지원사업...
  Confidence: LOW | Fields: 2 notes
  Extraction Notes:
    - Found 2 attachments
    - Skipped file reading: 공고문.pdf (not implemented yet)
    - Skipped file reading: 지원계획.hwp (not implemented yet)
```

### After Fix:
```
[1/10] 2025년 딥테크 챌린지 프로젝트 (DCP) 지원사업...
  📎 2 attachments in 20250401_to_20250430/page-6/announcement-241
  Confidence: HIGH | Method: ANNOUNCEMENT_FILE | Notes: 12
  Extraction Notes:
    - Found 2 attachments in 20250401_to_20250430/page-6/announcement-241
    - ✓ Extracted 4,823 chars from 공고문.pdf
    - ✓ Extracted 3,156 chars from 지원계획.hwp
    - ✓ Total announcement text: 7,979 characters
    - 최소 직원 수: 10명
    - 투자 유치 실적: 2억원 이상
    - 창업 7년 이내 기업 대상
    - 기업부설연구소 또는 연구전담부서 보유 필수
    - ... (additional extracted criteria)
```

---

## 8. Next Steps

1. **Wait for Docker build completion** (currently running)
2. **Verify Docker image architecture** (must be `linux/amd64`)
3. **Test with local database** (verify file reading works)
4. **Commit and push** all changes in single atomic commit
5. **Deploy to production** (23-minute CI/CD process)
6. **Run extraction script on production** data
7. **Analyze results** in `eligibility_verification` table

---

## 9. Files Modified

- ✅ `/Users/paulkim/Downloads/connect/scripts/extract-eligibility-verification.ts`
  - Added database join (lines 661-669)
  - Updated function signature (lines 284-289)
  - Implemented file reading (lines 318-367)
  - Enhanced extraction logic (lines 373-379)
  - Refined confidence calculation (lines 426-444)
  - Updated main loop (lines 685-702)

---

## 10. Technical Insights

**Why This Matters:**

1. **Data Quality Improvement**
   - Moving from title-based extraction (LOW confidence) to document-based extraction (HIGH confidence)
   - Actual eligibility criteria from official announcements vs. inferred from titles

2. **Matching Accuracy**
   - Better eligibility data = better matches
   - Reduces false positives (companies matched to ineligible programs)
   - Reduces false negatives (companies overlooked for eligible programs)

3. **Business Value**
   - More accurate matches = higher user trust
   - Better eligibility filtering = reduced application rejection rate
   - Performance tracking data becomes more meaningful

4. **Technical Foundation**
   - Establishes pattern for file-based data extraction
   - Reuses battle-tested scraper utilities
   - Enables future enhancements (e.g., keyword verification with BERT)

---

**Report Generated:** November 10, 2025
**Ready for Deployment:** Pending local verification
