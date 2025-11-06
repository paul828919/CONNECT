/**
 * Verify Post-Processing Data Quality
 *
 * This script verifies data quality after ProcessWorker completion:
 * 1. scraping_jobs table statistics (status breakdown, success/failure rates)
 * 2. funding_programs table statistics (source breakdown, categorization coverage)
 * 3. Data quality metrics (attachment downloads, text extraction, field completeness)
 * 4. Processing performance (avg time per job, error analysis)
 *
 * Usage: npx tsx scripts/verify-post-processing-data.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function verifyPostProcessingData() {
  console.log("📊 Verify Post-Processing Data Quality\n");
  console.log("═".repeat(80));
  console.log();

  try {
    // ═══════════════════════════════════════════════════════════
    // 1. SCRAPING_JOBS TABLE ANALYSIS
    // ═══════════════════════════════════════════════════════════
    console.log("🔍 SCRAPING_JOBS TABLE ANALYSIS");
    console.log("─".repeat(80));

    const totalJobs = await prisma.scraping_jobs.count();
    console.log(`\n📈 Total scraping_jobs: ${totalJobs.toLocaleString()}\n`);

    if (totalJobs === 0) {
      console.log("⚠️  No scraping jobs found in database\n");
      console.log("═".repeat(80));
      return;
    }

    // 1.1 Processing Status Breakdown
    const processingStatusBreakdown = await prisma.scraping_jobs.groupBy({
      by: ["processingStatus"],
      _count: true,
    });

    console.log("📋 Processing Status Breakdown:");
    processingStatusBreakdown.forEach((item) => {
      const percentage = ((item._count / totalJobs) * 100).toFixed(2);
      const bar = "█".repeat(Math.floor((item._count / totalJobs) * 50));
      console.log(
        `   ${item.processingStatus.padEnd(12)} ${item._count.toString().padStart(6)} (${percentage.padStart(6)}%) ${bar}`
      );
    });
    console.log();

    // 1.2 Scraping Status Breakdown
    const scrapingStatusBreakdown = await prisma.scraping_jobs.groupBy({
      by: ["scrapingStatus"],
      _count: true,
    });

    console.log("📋 Scraping Status Breakdown:");
    scrapingStatusBreakdown.forEach((item) => {
      const percentage = ((item._count / totalJobs) * 100).toFixed(2);
      console.log(
        `   ${item.scrapingStatus.padEnd(12)} ${item._count.toString().padStart(6)} (${percentage.padStart(6)}%)`
      );
    });
    console.log();

    // 1.3 Combined Status Matrix
    const statusMatrix = await prisma.scraping_jobs.groupBy({
      by: ["scrapingStatus", "processingStatus"],
      _count: true,
    });

    console.log("📊 Combined Status Matrix:");
    console.log("─".repeat(80));
    console.log(
      "   Scraping Status".padEnd(20) +
        "Processing Status".padEnd(20) +
        "Count".padStart(10) +
        "Percentage".padStart(15)
    );
    console.log("─".repeat(80));
    statusMatrix.forEach((item) => {
      const percentage = ((item._count / totalJobs) * 100).toFixed(2);
      console.log(
        `   ${item.scrapingStatus.padEnd(19)} ${item.processingStatus.padEnd(19)} ${item._count.toString().padStart(9)} ${(percentage + "%").padStart(14)}`
      );
    });
    console.log();

    // 1.4 Failed Jobs Analysis
    const failedJobs = await prisma.scraping_jobs.findMany({
      where: {
        processingStatus: "FAILED",
      },
      select: {
        id: true,
        announcementTitle: true,
        processingError: true,
        processingAttempts: true,
        processingStartedAt: true,
        processedAt: true,
      },
      orderBy: {
        processedAt: "desc",
      },
    });

    if (failedJobs.length > 0) {
      console.log(`❌ Failed Jobs (${failedJobs.length}):`);
      console.log("─".repeat(80));
      failedJobs.forEach((job, index) => {
        console.log(`   ${index + 1}. Job ID: ${job.id}`);
        console.log(`      Title: ${job.announcementTitle || "N/A"}`);
        console.log(`      Attempts: ${job.processingAttempts}`);
        console.log(
          `      Last Attempt: ${job.processedAt?.toISOString() || job.processingStartedAt?.toISOString() || "N/A"}`
        );
        console.log(`      Error: ${job.processingError || "N/A"}`);
        console.log();
      });
    } else {
      console.log("✅ No failed jobs found!\n");
    }

    // ═══════════════════════════════════════════════════════════
    // 2. FUNDING_PROGRAMS TABLE ANALYSIS
    // ═══════════════════════════════════════════════════════════
    console.log("═".repeat(80));
    console.log("🔍 FUNDING_PROGRAMS TABLE ANALYSIS");
    console.log("─".repeat(80));

    const totalPrograms = await prisma.funding_programs.count();
    console.log(`\n📈 Total funding_programs: ${totalPrograms.toLocaleString()}\n`);

    if (totalPrograms === 0) {
      console.log("⚠️  No funding programs found in database\n");
      console.log("═".repeat(80));
      return;
    }

    // 2.1 Source Breakdown
    const programSourceBreakdown = await prisma.funding_programs.groupBy({
      by: ["scrapingSource"],
      _count: true,
    });

    console.log("📋 Programs by Scraping Source:");
    programSourceBreakdown.forEach((item) => {
      const percentage = ((item._count / totalPrograms) * 100).toFixed(2);
      const bar = "█".repeat(Math.floor((item._count / totalPrograms) * 50));
      console.log(
        `   ${(item.scrapingSource || "NULL").padEnd(15)} ${item._count.toString().padStart(6)} (${percentage.padStart(6)}%) ${bar}`
      );
    });
    console.log();

    // 2.2 Announcement Type Classification
    const announcementTypeBreakdown = await prisma.funding_programs.groupBy({
      by: ["announcementType"],
      _count: true,
    });

    console.log("📋 Programs by Announcement Type:");
    announcementTypeBreakdown.forEach((item) => {
      const percentage = ((item._count / totalPrograms) * 100).toFixed(2);
      const bar = "█".repeat(Math.floor((item._count / totalPrograms) * 50));
      const typeLabel = item.announcementType ? String(item.announcementType) : "NULL";
      console.log(
        `   ${typeLabel.padEnd(20)} ${item._count.toString().padStart(6)} (${percentage.padStart(6)}%) ${bar}`
      );
    });
    console.log();

    // 2.3 TRL Classification Coverage (skip - JSON field, will check in sample)

    // 2.4 Budget Field Completeness
    const programsWithBudget = await prisma.funding_programs.count({
      where: {
        budgetAmount: { not: null },
      },
    });

    const budgetCompleteness = (
      (programsWithBudget / totalPrograms) *
      100
    ).toFixed(2);
    console.log("📋 Budget Field Completeness:");
    console.log(
      `   Programs with budget: ${programsWithBudget} / ${totalPrograms} (${budgetCompleteness}%)\n`
    );

    // 2.5 Field Completeness Summary
    const programSample = await prisma.funding_programs.findMany({
      take: 5,
      select: {
        id: true,
        announcingAgency: true,
        title: true,
        scrapingSource: true,
        announcementType: true,
        trlClassification: true,
        budgetAmount: true,
        deadline: true,
        description: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log("📋 Sample Programs (5 most recent):");
    console.log("─".repeat(80));
    programSample.forEach((program, index) => {
      console.log(`   ${index + 1}. ID: ${program.id}`);
      console.log(`      Agency: ${program.announcingAgency || "N/A"}`);
      console.log(`      Title: ${program.title.substring(0, 60)}...`);
      console.log(`      Source: ${program.scrapingSource || "N/A"}`);
      console.log(
        `      Type: ${program.announcementType || "Not Classified"}`
      );
      console.log(`      TRL: ${program.trlClassification ? JSON.stringify(program.trlClassification) : "Not Classified"}`);
      console.log(`      Budget: ${program.budgetAmount ? `₩${program.budgetAmount.toLocaleString()}` : "Not Set"}`);
      console.log(`      Deadline: ${program.deadline?.toISOString().split("T")[0] || "Not Set"}`);
      console.log(
        `      Has Description: ${program.description ? "✓" : "✗"}`
      );
      console.log();
    });

    // ═══════════════════════════════════════════════════════════
    // 3. DATA QUALITY METRICS
    // ═══════════════════════════════════════════════════════════
    console.log("═".repeat(80));
    console.log("🔍 DATA QUALITY METRICS");
    console.log("─".repeat(80));
    console.log();

    // 3.1 Text Extraction Success Rate (description field)
    const programsWithDescription = await prisma.funding_programs.count({
      where: {
        description: { not: null },
      },
    });

    const descriptionRate = (
      (programsWithDescription / totalPrograms) *
      100
    ).toFixed(2);
    console.log("📊 Description Field Completeness:");
    console.log(
      `   Programs with description: ${programsWithDescription} / ${totalPrograms} (${descriptionRate}%)\n`
    );

    // 3.2 Jobs-to-Programs Conversion Rate
    const completedJobs = await prisma.scraping_jobs.count({
      where: {
        processingStatus: "COMPLETED",
      },
    });

    const conversionRate = (
      (totalPrograms / (completedJobs || 1)) *
      100
    ).toFixed(2);
    console.log("📊 Jobs-to-Programs Conversion:");
    console.log(`   Completed jobs: ${completedJobs}`);
    console.log(`   Created programs: ${totalPrograms}`);
    console.log(
      `   Conversion rate: ${conversionRate}% (programs created per completed job)\n`
    );

    // 3.3 Processing Performance Summary
    const skippedJobs = await prisma.scraping_jobs.count({
      where: {
        processingStatus: "SKIPPED",
      },
    });

    console.log("📊 Processing Performance Summary:");
    console.log("─".repeat(80));
    console.log(`   Total Jobs Discovered:     ${totalJobs.toLocaleString()}`);
    console.log(
      `   Jobs Processed Successfully: ${completedJobs.toLocaleString()} (${((completedJobs / totalJobs) * 100).toFixed(2)}%)`
    );
    console.log(
      `   Jobs Skipped (non-R&D):      ${skippedJobs.toLocaleString()} (${((skippedJobs / totalJobs) * 100).toFixed(2)}%)`
    );
    console.log(
      `   Jobs Failed:                 ${failedJobs.length.toLocaleString()} (${((failedJobs.length / totalJobs) * 100).toFixed(2)}%)`
    );
    console.log(
      `   Programs Created:            ${totalPrograms.toLocaleString()}`
    );
    console.log();

    // ═══════════════════════════════════════════════════════════
    // 4. FINAL SUMMARY
    // ═══════════════════════════════════════════════════════════
    console.log("═".repeat(80));
    console.log("✅ DATA VERIFICATION COMPLETE");
    console.log("═".repeat(80));
    console.log();
    console.log("📊 Key Metrics:");
    console.log(`   • Total jobs discovered: ${totalJobs.toLocaleString()}`);
    console.log(`   • Jobs processed: ${completedJobs.toLocaleString()}`);
    console.log(`   • Programs created: ${totalPrograms.toLocaleString()}`);
    console.log(
      `   • Processing success rate: ${((completedJobs / totalJobs) * 100).toFixed(2)}%`
    );
    console.log(
      `   • Budget extraction rate: ${budgetCompleteness}%`
    );
    console.log(
      `   • Description completeness: ${descriptionRate}%`
    );
    console.log(
      `   • Failure rate: ${((failedJobs.length / totalJobs) * 100).toFixed(2)}%`
    );
    console.log();
    console.log("═".repeat(80));
  } catch (error: any) {
    console.error("❌ Error during verification:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute
verifyPostProcessingData();
