/**
 * Verify Cleanup - Check Database and Disk Storage
 */

import { db } from '@/lib/db';
import * as fs from 'fs/promises';
import * as path from 'path';

async function verifyCleanup() {
  console.log('🔍 Cleanup Verification\n');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // 1. Verify database is empty
    console.log('📊 Checking Database...');
    const programs = await db.funding_programs.count();
    const jobs = await db.scraping_jobs.count();
    const matches = await db.funding_matches.count();

    console.log(`   - funding_programs: ${programs}`);
    console.log(`   - scraping_jobs: ${jobs}`);
    console.log(`   - funding_matches: ${matches}`);

    const dbClean = programs === 0 && jobs === 0 && matches === 0;
    console.log(dbClean ? '   ✅ Database is empty\n' : '   ⚠️  Database still has records\n');

    // 2. Verify disk storage
    console.log('📁 Checking Disk Storage...');
    const attachmentBaseDir = process.env.NTIS_ATTACHMENT_DIR || path.join(process.cwd(), 'data/ntis-attachments');

    let diskClean = true;
    try {
      await fs.access(attachmentBaseDir);
      const entries = await fs.readdir(attachmentBaseDir);
      if (entries.length > 0) {
        console.log(`   ⚠️  Found ${entries.length} items in attachment directory`);
        diskClean = false;
      } else {
        console.log('   ✅ Attachment directory is empty');
      }
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.log('   ✅ No attachment directory exists');
      } else {
        console.log(`   ⚠️  Error checking directory: ${error.message}`);
        diskClean = false;
      }
    }
    console.log();

    // 3. Final verdict
    console.log('═══════════════════════════════════════════════════════════');
    if (dbClean && diskClean) {
      console.log('✅ VERIFICATION PASSED: System is ready for parallel testing!');
      console.log('═══════════════════════════════════════════════════════════\n');
      return true;
    } else {
      console.log('⚠️  VERIFICATION FAILED: Cleanup incomplete');
      console.log('═══════════════════════════════════════════════════════════\n');
      return false;
    }
  } catch (error: any) {
    console.error('❌ Error during verification:', error.message);
    return false;
  } finally {
    await db.$disconnect();
  }
}

verifyCleanup();
