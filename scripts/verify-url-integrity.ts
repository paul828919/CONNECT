/**
 * URL Integrity Verification Script
 *
 * Purpose: Verify that stored program URLs still point to valid announcements
 * and that stored metadata (title, budget, deadline) matches current data
 *
 * This script:
 * 1. Fetches all ACTIVE funding programs from database
 * 2. For each program, fetches the announcement URL
 * 3. Compares stored title/budget with fetched title/budget
 * 4. Flags mismatches for manual review
 * 5. Generates CSV report of findings
 *
 * Usage: npx tsx scripts/verify-url-integrity.ts
 */

import { db } from '@/lib/db';
import { writeFileSync } from 'fs';
import { join } from 'path';

interface UrlIntegrityCheck {
  programId: string;
  title: string;
  announcementUrl: string;
  storedBudget: string | null;
  storedDeadline: string | null;
  fetchedTitle: string | null;
  fetchedBudget: string | null;
  titleMatch: boolean;
  budgetMatch: boolean;
  urlAccessible: boolean;
  errorMessage?: string;
  mismatchSeverity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'OK';
}

/**
 * Extract title from NTIS page HTML
 */
function extractTitleFromHtml(html: string): string | null {
  // Try multiple patterns for NTIS title extraction
  const patterns = [
    /<h2[^>]*class="[^"]*tit[^"]*"[^>]*>(.*?)<\/h2>/i,
    /<h1[^>]*class="[^"]*title[^"]*"[^>]*>(.*?)<\/h1>/i,
    /<div[^>]*class="[^"]*subject[^"]*"[^>]*>(.*?)<\/div>/i,
    /<title>(.*?)<\/title>/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      return match[1]
        .replace(/<[^>]+>/g, '') // Remove HTML tags
        .replace(/&nbsp;/g, ' ')
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .trim();
    }
  }

  return null;
}

/**
 * Extract budget from NTIS page HTML
 */
function extractBudgetFromHtml(html: string): string | null {
  // Try multiple patterns for budget extraction
  const patterns = [
    /지원금액[:\s]*([0-9,]+)\s*백만원/i,
    /예산[:\s]*([0-9,]+)\s*백만원/i,
    /총사업비[:\s]*([0-9,]+)\s*백만원/i,
    /지원규모[:\s]*([0-9,]+)\s*백만원/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      return match[1].replace(/,/g, '') + '000000'; // Convert to full KRW
    }
  }

  return null;
}

/**
 * Fetch and parse announcement page
 */
async function fetchAnnouncementData(url: string): Promise<{
  title: string | null;
  budget: string | null;
  accessible: boolean;
  error?: string;
}> {
  try {
    console.log(`  Fetching: ${url}`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      signal: AbortSignal.timeout(15000), // 15 second timeout
    });

    if (!response.ok) {
      return {
        title: null,
        budget: null,
        accessible: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const html = await response.text();

    // Extract data
    const title = extractTitleFromHtml(html);
    const budget = extractBudgetFromHtml(html);

    return {
      title,
      budget,
      accessible: true,
    };
  } catch (error: any) {
    return {
      title: null,
      budget: null,
      accessible: false,
      error: error.message || 'Unknown fetch error',
    };
  }
}

/**
 * Calculate title similarity (simple character overlap)
 */
function calculateTitleSimilarity(stored: string, fetched: string): number {
  // Normalize both titles
  const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, '').replace(/[^a-z가-힣0-9]/g, '');
  const s1 = normalize(stored);
  const s2 = normalize(fetched);

  if (s1 === s2) return 100;

  // Calculate character overlap
  let matches = 0;
  const minLength = Math.min(s1.length, s2.length);
  for (let i = 0; i < minLength; i++) {
    if (s1[i] === s2[i]) matches++;
  }

  return (matches / Math.max(s1.length, s2.length)) * 100;
}

/**
 * Determine mismatch severity
 */
function determineSeverity(check: UrlIntegrityCheck): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'OK' {
  // URL not accessible = CRITICAL
  if (!check.urlAccessible) {
    return 'CRITICAL';
  }

  // Title completely different = CRITICAL
  if (check.fetchedTitle) {
    const similarity = calculateTitleSimilarity(check.title, check.fetchedTitle);
    if (similarity < 30) {
      return 'CRITICAL';
    } else if (similarity < 60) {
      return 'HIGH';
    }
  }

  // Budget mismatch = HIGH
  if (!check.budgetMatch && check.storedBudget && check.fetchedBudget) {
    return 'HIGH';
  }

  // Title similar but not exact = MEDIUM
  if (!check.titleMatch && check.fetchedTitle) {
    return 'MEDIUM';
  }

  // Everything matches or fetched data missing (not an error) = OK
  return 'OK';
}

/**
 * Main verification function
 */
async function verifyUrlIntegrity() {
  console.log('🔍 Starting URL Integrity Verification...\n');

  // Fetch all active programs
  const programs = await db.funding_programs.findMany({
    where: {
      status: 'ACTIVE',
    },
    select: {
      id: true,
      title: true,
      announcementUrl: true,
      budgetAmount: true,
      deadline: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  console.log(`📊 Found ${programs.length} active programs with URLs\n`);

  const results: UrlIntegrityCheck[] = [];
  let processed = 0;

  for (const program of programs) {
    processed++;
    console.log(`\n[${processed}/${programs.length}] ${program.title.substring(0, 60)}...`);

    const fetched = await fetchAnnouncementData(program.announcementUrl);

    const storedBudget = program.budgetAmount ? program.budgetAmount.toString() : null;
    const titleMatch = fetched.title
      ? calculateTitleSimilarity(program.title, fetched.title) > 90
      : false;
    const budgetMatch = fetched.budget
      ? storedBudget === fetched.budget
      : true; // If no budget fetched, assume match (not an error)

    const check: UrlIntegrityCheck = {
      programId: program.id,
      title: program.title,
      announcementUrl: program.announcementUrl,
      storedBudget,
      storedDeadline: program.deadline ? program.deadline.toISOString() : null,
      fetchedTitle: fetched.title,
      fetchedBudget: fetched.budget,
      titleMatch,
      budgetMatch,
      urlAccessible: fetched.accessible,
      errorMessage: fetched.error,
      mismatchSeverity: 'OK', // Will be calculated below
    };

    check.mismatchSeverity = determineSeverity(check);

    results.push(check);

    // Log result
    if (check.mismatchSeverity === 'CRITICAL' || check.mismatchSeverity === 'HIGH') {
      console.log(`  ❌ ${check.mismatchSeverity}: ${check.errorMessage || 'Data mismatch detected'}`);
    } else {
      console.log(`  ✅ ${check.mismatchSeverity}`);
    }

    // Rate limiting: Wait 500ms between requests
    if (processed < programs.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Generate summary statistics
  const stats = {
    total: results.length,
    critical: results.filter(r => r.mismatchSeverity === 'CRITICAL').length,
    high: results.filter(r => r.mismatchSeverity === 'HIGH').length,
    medium: results.filter(r => r.mismatchSeverity === 'MEDIUM').length,
    low: results.filter(r => r.mismatchSeverity === 'LOW').length,
    ok: results.filter(r => r.mismatchSeverity === 'OK').length,
  };

  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 URL INTEGRITY VERIFICATION SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Total Programs Checked: ${stats.total}`);
  console.log(`🔴 CRITICAL Issues: ${stats.critical} (${((stats.critical/stats.total)*100).toFixed(1)}%)`);
  console.log(`🟠 HIGH Issues: ${stats.high} (${((stats.high/stats.total)*100).toFixed(1)}%)`);
  console.log(`🟡 MEDIUM Issues: ${stats.medium} (${((stats.medium/stats.total)*100).toFixed(1)}%)`);
  console.log(`🟢 LOW Issues: ${stats.low} (${((stats.low/stats.total)*100).toFixed(1)}%)`);
  console.log(`✅ OK: ${stats.ok} (${((stats.ok/stats.total)*100).toFixed(1)}%)`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Generate CSV report
  const csv = [
    ['Program ID', 'Severity', 'Stored Title', 'Fetched Title', 'Title Match', 'Stored Budget', 'Fetched Budget', 'Budget Match', 'URL Accessible', 'Error Message', 'Announcement URL'],
    ...results.map(r => [
      r.programId,
      r.mismatchSeverity,
      r.title,
      r.fetchedTitle || 'N/A',
      r.titleMatch ? 'YES' : 'NO',
      r.storedBudget || 'N/A',
      r.fetchedBudget || 'N/A',
      r.budgetMatch ? 'YES' : 'NO',
      r.urlAccessible ? 'YES' : 'NO',
      r.errorMessage || '',
      r.announcementUrl,
    ]),
  ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

  const reportPath = join(process.cwd(), 'scripts', 'url-integrity-report.csv');
  writeFileSync(reportPath, csv, 'utf-8');

  console.log(`📄 Full report saved to: ${reportPath}\n`);

  // Show top 10 critical/high issues
  const criticalIssues = results
    .filter(r => r.mismatchSeverity === 'CRITICAL' || r.mismatchSeverity === 'HIGH')
    .slice(0, 10);

  if (criticalIssues.length > 0) {
    console.log('🚨 TOP CRITICAL/HIGH ISSUES:\n');
    criticalIssues.forEach((issue, idx) => {
      console.log(`${idx + 1}. [${issue.mismatchSeverity}] ${issue.title.substring(0, 70)}...`);
      console.log(`   URL: ${issue.announcementUrl}`);
      if (!issue.urlAccessible) {
        console.log(`   ❌ URL NOT ACCESSIBLE: ${issue.errorMessage}`);
      }
      if (issue.fetchedTitle && !issue.titleMatch) {
        console.log(`   ❌ TITLE MISMATCH:`);
        console.log(`      Stored:  ${issue.title}`);
        console.log(`      Fetched: ${issue.fetchedTitle}`);
      }
      if (issue.storedBudget && issue.fetchedBudget && !issue.budgetMatch) {
        console.log(`   ❌ BUDGET MISMATCH:`);
        console.log(`      Stored:  ₩${issue.storedBudget}`);
        console.log(`      Fetched: ₩${issue.fetchedBudget}`);
      }
      console.log('');
    });
  }

  console.log('✅ URL integrity verification complete!\n');

  await db.$disconnect();
}

// Run verification
verifyUrlIntegrity().catch((error) => {
  console.error('❌ Verification error:', error);
  process.exit(1);
});
