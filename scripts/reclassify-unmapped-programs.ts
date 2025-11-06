/**
 * Re-classify Unmapped Programs
 *
 * Updates category and keywords for programs with NULL category using
 * the updated agency-mapper.ts with new ministry and agency mappings.
 *
 * Usage: npx tsx scripts/reclassify-unmapped-programs.ts
 */

import { db } from '@/lib/db';
import { extractCategoryFromMinistryAndAgency, getCombinedKeywords } from '@/lib/scraping/parsers/agency-mapper';

async function reclassifyUnmappedPrograms() {
  console.log('🔄 Re-classifying Unmapped Programs\n');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // 1. Query programs with NULL category
    const unmappedPrograms = await db.funding_programs.findMany({
      where: {
        category: null,
      },
      select: {
        id: true,
        title: true,
        ministry: true,
        announcingAgency: true,
        category: true,
        keywords: true,
      },
    });

    console.log(`📊 Found ${unmappedPrograms.length} unmapped programs\n`);

    if (unmappedPrograms.length === 0) {
      console.log('✅ No unmapped programs found. All programs are categorized!\n');
      return;
    }

    let successCount = 0;
    let failCount = 0;

    // 2. Re-classify each program using updated mappings
    for (const program of unmappedPrograms) {
      const { id, title, ministry, announcingAgency } = program;

      // Extract new category and keywords using hierarchical categorization
      const categoryResult = extractCategoryFromMinistryAndAgency(ministry, announcingAgency);
      const newCategory = categoryResult.category;
      const newKeywords = getCombinedKeywords(ministry, announcingAgency);

      if (newCategory) {
        // Update program with new categorization
        await db.funding_programs.update({
          where: { id },
          data: {
            category: newCategory,
            keywords: newKeywords,
          },
        });

        successCount++;
        console.log(`✅ [${successCount}/${unmappedPrograms.length}] Re-classified: ${title.substring(0, 60)}...`);
        console.log(`   Ministry: ${ministry || 'NULL'}`);
        console.log(`   Agency: ${announcingAgency || 'NULL'}`);
        console.log(`   New Category: ${newCategory}`);
        console.log(`   Keywords: ${newKeywords.length} keywords`);
        console.log('');
      } else {
        failCount++;
        console.log(`❌ [${failCount}] Could not re-classify: ${title.substring(0, 60)}...`);
        console.log(`   Ministry: ${ministry || 'NULL'}`);
        console.log(`   Agency: ${announcingAgency || 'NULL'}`);
        console.log(`   Reason: ${categoryResult.context || 'Unknown'}`);
        console.log('');
      }
    }

    // 3. Summary
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 Re-classification Summary\n');
    console.log(`Total unmapped programs: ${unmappedPrograms.length}`);
    console.log(`✅ Successfully re-classified: ${successCount}`);
    console.log(`❌ Failed to re-classify: ${failCount}`);

    if (failCount > 0) {
      console.log(`\n⚠️  ${failCount} programs still need manual review`);
    }

    // 4. Verify final omission rate
    const totalPrograms = await db.funding_programs.count();
    const remainingUnmapped = await db.funding_programs.count({
      where: { category: null },
    });
    const omissionRate = ((remainingUnmapped / totalPrograms) * 100).toFixed(2);

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ Final Verification\n');
    console.log(`Total programs: ${totalPrograms}`);
    console.log(`Remaining unmapped: ${remainingUnmapped}`);
    console.log(`Final omission rate: ${omissionRate}%`);

    if (remainingUnmapped === 0) {
      console.log('\n🎉 SUCCESS: 0% OMISSION ACHIEVED!');
      console.log('All programs are now categorized!\n');
    } else {
      console.log(`\n⚠️  ${remainingUnmapped} programs still need categorization`);
      console.log('Run verify-categorization-coverage.ts to identify remaining unmapped agencies\n');
    }

    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error: any) {
    console.error('❌ Error during re-classification:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

// Execute
reclassifyUnmappedPrograms();
