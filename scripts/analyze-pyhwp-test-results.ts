/**
 * Analyze pyhwp Extraction Test Results
 *
 * Purpose: Verify and analyze data quality after pyhwp-enabled processing
 * This script examines the funding_programs and extraction_logs tables
 * to assess the effectiveness of pyhwp extraction.
 */

import { db } from '../lib/db';

async function analyzePyhwpTestResults() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Analyzing pyhwp Extraction Test Results');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  try {
    // 1. Count total funding_programs
    const totalPrograms = await db.funding_programs.count();
    console.log(`📊 Total Funding Programs: ${totalPrograms}`);
    console.log('');

    if (totalPrograms === 0) {
      console.log('⚠️  No funding programs found. Test may have filtered out all jobs.');
      console.log('   Check scraping_jobs processingStatus for SKIPPED jobs.');
      console.log('');
      return;
    }

    // 2. Get all programs (should be 1 from our test)
    const programs = await db.funding_programs.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📄 Funding Programs Created');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    for (const program of programs) {
      console.log(`Program ID: ${program.id}`);
      console.log(`Title: ${program.title}`);
      console.log(`Agency: ${program.agencyId || 'N/A'}`);
      console.log(`Announcement Type: ${program.announcementType}`);
      console.log(`Ministry: ${program.ministry || 'N/A'}`);
      console.log(`Announcing Agency: ${program.announcingAgency || 'N/A'}`);
      console.log('');
      console.log(`Description Length: ${program.description?.length || 0} chars`);
      console.log(
        `Eligibility Criteria: ${program.eligibilityCriteria ? JSON.stringify(program.eligibilityCriteria).length + ' chars (JSON)' : 'N/A'}`
      );
      console.log(`Keywords: ${program.keywords?.join(', ') || 'None'}`);
      console.log(`Category: ${program.category || 'N/A'}`);
      console.log('');
      console.log(`Target Types: ${program.targetType?.join(', ') || 'None'}`);
      console.log(`TRL Range: ${program.minTrl || 'N/A'} - ${program.maxTrl || 'N/A'}`);
      console.log(
        `TRL Classification: ${program.trlClassification ? JSON.stringify(program.trlClassification) : 'N/A'}`
      );
      console.log('');
      console.log(`Deadline: ${program.deadline ? new Date(program.deadline).toISOString().split('T')[0] : 'N/A'}`);
      console.log(`Application Start: ${program.applicationStart ? new Date(program.applicationStart).toISOString().split('T')[0] : 'N/A'}`);
      console.log(`Published At: ${program.publishedAt ? new Date(program.publishedAt).toISOString().split('T')[0] : 'N/A'}`);
      console.log('');
      console.log(`Budget Amount: ${program.budgetAmount || 'N/A'}`);
      console.log(`Funding Period: ${program.fundingPeriod || 'N/A'}`);
      console.log(`Status: ${program.status}`);
      console.log('');
      console.log(`Announcement URL: ${program.announcementUrl}`);
      console.log(`Attachment URLs: ${program.attachmentUrls?.length || 0} files`);
      console.log('');

      // Show first 200 chars of description
      if (program.description) {
        console.log('Description Preview:');
        console.log(`  ${program.description.substring(0, 200)}...`);
        console.log('');
      }

      // Show eligibility criteria as JSON
      if (program.eligibilityCriteria) {
        console.log('Eligibility Criteria (JSON):');
        console.log(`  ${JSON.stringify(program.eligibilityCriteria, null, 2)}`);
        console.log('');
      }

      console.log('─────────────────────────────────────────────────────────────');
      console.log('');
    }

    // 3. Analyze extraction logs to see how HWP text was used
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Extraction Logs Analysis');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    // Get extraction logs for the test jobs
    const extractionLogs = await db.extraction_logs.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    if (extractionLogs.length > 0) {
      // Group by field
      const fieldGroups = new Map<string, typeof extractionLogs>();
      for (const log of extractionLogs) {
        if (!fieldGroups.has(log.field)) {
          fieldGroups.set(log.field, []);
        }
        fieldGroups.get(log.field)!.push(log);
      }

      console.log(`Total Extraction Logs: ${extractionLogs.length}`);
      console.log('');

      // Show extraction summary by field
      for (const [field, logs] of fieldGroups.entries()) {
        console.log(`📌 Field: ${field}`);
        console.log(`   Extractions: ${logs.length}`);

        // Count by data source
        const sourceCount = new Map<string, number>();
        for (const log of logs) {
          sourceCount.set(log.dataSource, (sourceCount.get(log.dataSource) || 0) + 1);
        }

        console.log('   Data Sources:');
        for (const [source, count] of sourceCount.entries()) {
          console.log(`     - ${source}: ${count}`);
        }

        // Count by confidence
        const confidenceCount = new Map<string, number>();
        for (const log of logs) {
          confidenceCount.set(log.confidence, (confidenceCount.get(log.confidence) || 0) + 1);
        }

        console.log('   Confidence Levels:');
        for (const [confidence, count] of confidenceCount.entries()) {
          console.log(`     - ${confidence}: ${count}`);
        }

        console.log('');
      }

      // Show sample extraction log
      const sampleLog = extractionLogs[0];
      console.log('Sample Extraction Log:');
      console.log(`  Field: ${sampleLog.field}`);
      console.log(`  Data Source: ${sampleLog.dataSource}`);
      console.log(`  Confidence: ${sampleLog.confidence}`);
      console.log(`  Value: ${sampleLog.value?.substring(0, 100) || 'N/A'}...`);
      console.log(`  Pattern: ${sampleLog.extractionPattern || 'N/A'}`);
      console.log(`  Attempted Sources: ${sampleLog.attemptedSources?.join(', ') || 'N/A'}`);
      console.log('');
    } else {
      console.log('⚠️  No extraction logs found.');
      console.log('');
    }

    // 4. Check processing status of test jobs
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 Processing Status Summary');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    const statusCounts = await db.scraping_jobs.groupBy({
      by: ['processingStatus'],
      _count: true,
      where: {
        processingWorker: 'test-pyhwp-worker',
      },
    });

    console.log('Processing Status (for test-pyhwp-worker):');
    for (const status of statusCounts) {
      console.log(`  ${status.processingStatus}: ${status._count} jobs`);
    }
    console.log('');

    // 5. Quality metrics
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📈 Data Quality Metrics');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    const qualityMetrics = {
      totalPrograms: programs.length,
      withDescription: programs.filter((p) => p.description && p.description.length > 0).length,
      withEligibility: programs.filter((p) => p.eligibilityCriteria !== null).length,
      withKeywords: programs.filter((p) => p.keywords && p.keywords.length > 0).length,
      withCategory: programs.filter((p) => p.category && p.category.length > 0).length,
      withTRL: programs.filter((p) => p.minTrl !== null && p.maxTrl !== null).length,
      withDeadline: programs.filter((p) => p.deadline !== null).length,
      withBudget: programs.filter((p) => p.budgetAmount !== null).length,
      withTargetType: programs.filter((p) => p.targetType && p.targetType.length > 0).length,
    };

    console.log(`Total Programs: ${qualityMetrics.totalPrograms}`);
    console.log(`With Description: ${qualityMetrics.withDescription} (${((qualityMetrics.withDescription / qualityMetrics.totalPrograms) * 100).toFixed(1)}%)`);
    console.log(`With Eligibility Criteria: ${qualityMetrics.withEligibility} (${((qualityMetrics.withEligibility / qualityMetrics.totalPrograms) * 100).toFixed(1)}%)`);
    console.log(`With Keywords: ${qualityMetrics.withKeywords} (${((qualityMetrics.withKeywords / qualityMetrics.totalPrograms) * 100).toFixed(1)}%)`);
    console.log(`With Category: ${qualityMetrics.withCategory} (${((qualityMetrics.withCategory / qualityMetrics.totalPrograms) * 100).toFixed(1)}%)`);
    console.log(`With TRL Range: ${qualityMetrics.withTRL} (${((qualityMetrics.withTRL / qualityMetrics.totalPrograms) * 100).toFixed(1)}%)`);
    console.log(`With Deadline: ${qualityMetrics.withDeadline} (${((qualityMetrics.withDeadline / qualityMetrics.totalPrograms) * 100).toFixed(1)}%)`);
    console.log(`With Budget: ${qualityMetrics.withBudget} (${((qualityMetrics.withBudget / qualityMetrics.totalPrograms) * 100).toFixed(1)}%)`);
    console.log(`With Target Type: ${qualityMetrics.withTargetType} (${((qualityMetrics.withTargetType / qualityMetrics.totalPrograms) * 100).toFixed(1)}%)`);
    console.log('');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ Analysis Complete');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
  } catch (error: any) {
    console.error('');
    console.error('❌ Error analyzing results:', error.message);
    console.error('');
    throw error;
  }
}

analyzePyhwpTestResults()
  .then(() => {
    console.log('Analysis completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Analysis failed:', error);
    process.exit(1);
  });
