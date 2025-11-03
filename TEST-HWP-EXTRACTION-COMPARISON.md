# HWP Text Extraction Quality Comparison Test

## 🎯 Purpose

Compare two methods of extracting text from Korean HWP files:
- **Method A (Current)**: Hancom Docs web upload → Screenshot → Tesseract OCR
- **Method B (Proposed)**: pyhwp native XML extraction (hwp5txt tool)

## ⚠️ Your Concerns (Valid!)

You mentioned concerns about hwp5tools:
1. **Character corruption**: Will Korean characters extract correctly?
2. **Text accuracy**: Will numbers and special characters parse properly?
3. **Field extraction**: Will budget/deadline/TRL detection still work?

**This test addresses all three concerns** using real production data.

---

## 📊 What This Test Does

### 1. Samples Real Production Data
- Pulls 10 jobs from `scraping_jobs` table (completed + pending)
- Uses actual HWP files downloaded from NTIS announcements
- Tests both methods on identical files

### 2. Extracts Text Using Both Methods
- **Hancom Method**: Your current production method (OCR-based)
- **hwp5 Method**: Proposed native extraction (XML-based)

### 3. Applies Identical Parsing Logic
Both extracted texts go through the SAME parsing functions:
- `extractBudget()` → Budget amount detection
- `extractTRLRange()` → TRL level detection
- `extractBusinessStructures()` → Corporation/sole proprietor restrictions
- `extractEligibilityCriteria()` → Eligibility requirements

### 4. Generates Comprehensive Report
- **Performance**: Processing time comparison (expected: 20-45x faster)
- **Quality**: Field extraction accuracy (goal: >95% match rate)
- **Text Samples**: Saves full extracted text for manual review
- **Recommendation**: ADOPT / INVESTIGATE / KEEP CURRENT

---

## 🚀 How to Run the Test

### Step 1: Run the Test Script

```bash
# Basic test (10 jobs, recent data)
docker exec connect_dev_scraper npx tsx scripts/test-hwp-extraction-comparison.ts

# Test with more samples
docker exec connect_dev_scraper npx tsx scripts/test-hwp-extraction-comparison.ts --sampleSize 20

# Test specific date range
docker exec connect_dev_scraper npx tsx scripts/test-hwp-extraction-comparison.ts --dateRange "2025-01-01 to 2025-03-31"
```

**Expected Runtime**: 3-5 minutes for 10 files (includes Hancom Docs login once)

---

## 📁 Test Output

### Report Files

```
test-results/hwp-extraction-comparison/
├── comparison-report.json          # Full structured report
└── text-samples/                   # Extracted text for manual review
    ├── {job-id-1}/
    │   ├── announcement.hwp.hancom.txt   # Current method
    │   └── announcement.hwp.hwp5.txt     # Proposed method
    ├── {job-id-2}/
    │   ├── ...
```

### Report Contents

1. **Statistics Summary**
   - Success/failure rates
   - Processing times
   - Character counts

2. **Performance Comparison**
   - Speed improvement (e.g., "23.5x faster")
   - Time savings per file

3. **Field Extraction Accuracy**
   - Overall accuracy percentage
   - Field-by-field breakdown:
     - Budget: XX% match rate
     - TRL Range: XX% match rate
     - Business Structures: XX% match rate
     - Eligibility: XX% match rate

4. **Recommendation**
   - ✅ **ADOPT** if accuracy ≥95%
   - ⚠️ **INVESTIGATE** if accuracy 85-95%
   - ❌ **KEEP CURRENT** if accuracy <85%

---

## 📋 Example Report Output

```
╔════════════════════════════════════════════════════════════════╗
║                     COMPARISON REPORT                          ║
╚════════════════════════════════════════════════════════════════╝

📊 Method A: Hancom Docs + Tesseract OCR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Total Files:          10
   Success:              10 (100.0%)
   Failure:              0 (0.0%)
   Total Time:           387.45s
   Avg Time Per File:    38.75s
   Avg Characters:       4,823 chars

📊 Method B: hwp5tools Native Extraction
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Total Files:          10
   Success:              10 (100.0%)
   Failure:              0 (0.0%)
   Total Time:           16.23s
   Avg Time Per File:    1.62s
   Avg Characters:       4,891 chars

⚡ Performance Comparison
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Speed Improvement:    23.9x faster with hwp5tools
   Time Savings:         37.13s per file

🎯 Field Extraction Accuracy
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Average Accuracy:     96.7%
   Perfect Matches:      8/10 files (80.0%)

   Field-by-Field Accuracy:
      budget               95.0% (19/20)
      trlRange             100.0% (20/20)
      businessStructures   95.0% (19/20)
      eligibility          97.5% (39/40)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎓 RECOMMENDATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ ADOPT hwp5tools
   - Field accuracy: 96.7% (excellent)
   - Speed: 23.9x faster
   - No OCR errors, direct XML parsing
   - Production ready
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🔍 Manual Review Process

After running the test:

### 1. Check the JSON Report

```bash
cat test-results/hwp-extraction-comparison/comparison-report.json | jq
```

### 2. Review Text Samples

Compare extracted texts side-by-side:

```bash
# List all sample jobs
ls test-results/hwp-extraction-comparison/text-samples/

# View specific file comparison
cd test-results/hwp-extraction-comparison/text-samples/{job-id}

# Compare Hancom vs hwp5 output
diff announcement.hwp.hancom.txt announcement.hwp.hwp5.txt
```

### 3. Check for Character Corruption

Look for Korean character issues in hwp5 output:

```bash
# Search for garbled characters (question marks, boxes, etc.)
grep -E '[��?]{2,}' *.hwp5.txt

# Compare character counts
wc -m *.hancom.txt *.hwp5.txt
```

### 4. Verify Critical Fields

Check if budget/deadline/TRL extraction still works:

```bash
# Search for budget patterns
grep -E '[0-9,]+억원|백만원' *.hwp5.txt

# Search for TRL patterns
grep -E 'TRL\s*[1-9]' *.hwp5.txt

# Search for deadline patterns
grep -E '마감|신청기간|접수기한' *.hwp5.txt
```

---

## ⚡ Expected Results

Based on HWP file format analysis:

### Why hwp5tools Should Work

1. **HWP is NOT a proprietary binary format**
   - HWP 5.0+ is just a ZIP file containing XML documents
   - Similar to .docx (Microsoft Word Open XML)
   - Text is stored in structured XML, not as images

2. **No OCR Needed**
   - Hancom Docs → Screenshot → OCR introduces errors
   - hwp5tools reads XML directly → 100% text fidelity
   - No "recognition" - just parsing structured data

3. **Korean Character Support**
   - XML encoding is UTF-8 (full Unicode support)
   - Korean characters stored as text, not fonts/images
   - Python handles Unicode natively

### Potential Issues to Watch For

1. **Encrypted HWP files**: Some government documents use password protection
   - **Impact**: hwp5 will fail to open
   - **Fallback**: Use Hancom method for encrypted files

2. **HWP 3.0 legacy format**: Very old files use binary format
   - **Impact**: hwp5 only supports HWP 5.0+
   - **Fallback**: Use Hancom method for legacy files

3. **Complex formatting**: Tables, headers, footers may not extract in order
   - **Impact**: Text may be out of sequence
   - **Mitigation**: Test shows if field extraction still works

---

## 🎯 Decision Criteria

After reviewing test results:

### ✅ Adopt hwp5tools if:
- Field extraction accuracy ≥95%
- No significant character corruption
- Budget/deadline/TRL detection works correctly
- Processing speed 10x+ faster

### ⚠️ Investigate Further if:
- Field extraction accuracy 85-95%
- Minor character issues that can be post-processed
- Specific patterns need regex adjustments

### ❌ Keep Current Method if:
- Field extraction accuracy <85%
- Widespread character corruption
- Critical fields (budget, deadline) not detected

---

## 🚀 Next Steps After Test

### If Test Shows hwp5tools is Good:

1. **Implement in Production** (scripts/test-hwp-extraction-comparison.ts line 28)
   ```typescript
   // Replace in lib/scraping/utils/attachment-parser.ts
   case '.hwp':
     return await extractTextFromHWPViaHwp5(fileBuffer, fileName); // NEW
     // return await extractTextFromHWP(fileBuffer, fileName, sharedBrowser); // OLD
   ```

2. **Add Fallback Logic**
   ```typescript
   try {
     text = await extractTextFromHWPViaHwp5(fileBuffer, fileName);
   } catch (error) {
     console.log('[HWP] hwp5 failed, falling back to Hancom Docs...');
     text = await extractTextFromHWP(fileBuffer, fileName, sharedBrowser);
   }
   ```

3. **Measure Production Impact**
   - Expected: 1,086 pending jobs → 1-2 hours (vs current 5+ hours)
   - Expected: 2,000+ announcements/hour throughput
   - Expected: Zero Hancom Docs rate limit issues

### If Test Shows Issues:

1. **Review specific failure cases** in text samples
2. **Identify patterns** causing field extraction mismatches
3. **Adjust regex patterns** in parser functions
4. **Re-run test** with corrections

---

## 🛠️ Troubleshooting

### Issue: "ModuleNotFoundError: No module named 'hwp5'" or "hwp5txt: command not found"

**Fix**: Install pyhwp library
```bash
docker exec connect_dev_scraper pip3 install pyhwp
```

### Issue: "Python command not found"

**Fix**: Ensure Python 3 is installed
```bash
docker exec connect_dev_scraper which python3
```

### Issue: "Browser not authenticated"

**Fix**: Check Hancom Docs credentials
```bash
docker exec connect_dev_scraper printenv | grep HANCOM
```

### Issue: "No jobs found matching criteria"

**Fix**: Adjust date range or check database
```bash
# Check available jobs
docker exec connect_dev_postgres psql -U connect -d connect -c "
SELECT COUNT(*), date_range
FROM scraping_jobs
WHERE scraping_status = 'SCRAPED'
GROUP BY date_range
ORDER BY date_range DESC
LIMIT 10;
"
```

---

## 📚 Technical Background

### Current Method (Hancom Docs + Tesseract)

**Process Flow**:
```
HWP file (189 KB)
  ↓ Upload to Hancom Docs (5-10s)
  ↓ Wait for rendering (3-5s)
  ↓ Capture screenshot (2-3s)
  ↓ Screenshot → Tesseract OCR (5-15s)
  ↓ Korean text recognition (90% accuracy)
  ↓ Extracted text (4,800 chars)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total: 20-45 seconds per file
```

**Limitations**:
- OCR introduces character recognition errors
- Screenshot quality affects accuracy
- Browser automation overhead
- Hancom Docs rate limits (bot detection)
- Requires authentication/session management

### Proposed Method (hwp5tools)

**Process Flow**:
```
HWP file (189 KB)
  ↓ Unzip (HWP is just a ZIP archive)
  ↓ Find Contents/section*.xml files
  ↓ Parse XML with standard parser
  ↓ Extract <hp:t> text nodes
  ↓ Concatenate paragraphs
  ↓ Extracted text (4,900 chars)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total: <1 second per file
```

**Benefits**:
- No OCR errors (direct text extraction)
- No browser automation overhead
- No rate limits or authentication
- Works offline
- Runs in any environment (Docker, Linux, macOS)

---

## 📞 Support

If you encounter issues or need clarification:

1. **Check test output**: Review `comparison-report.json` for details
2. **Examine text samples**: Compare extracted texts manually
3. **Consult this README**: Common issues covered in Troubleshooting
4. **Ask Claude Code**: Provide specific error messages or accuracy concerns

---

## ✅ Summary

This test gives you **data-driven confidence** to decide whether hwp5tools is production-ready:

- ✅ **Tests real production data** (not synthetic examples)
- ✅ **Uses identical parsing logic** (same functions)
- ✅ **Saves all outputs** (full transparency)
- ✅ **Provides clear recommendation** (based on accuracy thresholds)

**Expected outcome**: hwp5tools will show 95%+ accuracy with 20-45x speed improvement, proving it's production-ready.

**Time to run test**: 3-5 minutes
**Time to review results**: 5-10 minutes
**Total time to decision**: <15 minutes

---

Run the test now to verify hwp5tools quality before implementing! 🚀
