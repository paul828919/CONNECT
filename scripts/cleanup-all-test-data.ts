/**
 * Complete Test Data Cleanup Script
 *
 * Prepares for clean testing by:
 * 1. Deleting all funding_programs
 * 2. Deleting all scraping_jobs
 * 3. Deleting all extraction_logs
 * 4. Cleaning up temp attachment folders
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║           COMPLETE TEST DATA CLEANUP                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Task 1: Delete all extraction_logs (must be first due to foreign key constraints)
  console.log('🗑️  Task 1: Deleting all extraction_logs...');
  const deletedLogs = await prisma.extraction_logs.deleteMany({});
  console.log(`✅ Deleted ${deletedLogs.count} extraction logs`);

  const remainingLogs = await prisma.extraction_logs.count();
  console.log(`📊 Remaining extraction logs: ${remainingLogs}`);

  if (remainingLogs === 0) {
    console.log('✅ All extraction_logs successfully deleted\n');
  } else {
    console.log(`❌ ERROR: ${remainingLogs} extraction logs still remain!\n`);
  }

  // Task 2: Delete all funding_programs
  console.log('🗑️  Task 2: Deleting all funding_programs...');
  const deletedPrograms = await prisma.funding_programs.deleteMany({});
  console.log(`✅ Deleted ${deletedPrograms.count} funding programs`);

  const remainingPrograms = await prisma.funding_programs.count();
  console.log(`📊 Remaining funding programs: ${remainingPrograms}`);

  if (remainingPrograms === 0) {
    console.log('✅ All funding_programs data successfully deleted\n');
  } else {
    console.log(`❌ ERROR: ${remainingPrograms} programs still remain!\n`);
  }

  // Task 3: Delete all scraping_jobs
  console.log('🗑️  Task 3: Deleting all scraping_jobs...');
  const deletedJobs = await prisma.scraping_jobs.deleteMany({});
  console.log(`✅ Deleted ${deletedJobs.count} scraping jobs`);

  const remainingJobs = await prisma.scraping_jobs.count();
  console.log(`📊 Remaining scraping jobs: ${remainingJobs}`);

  if (remainingJobs === 0) {
    console.log('✅ All scraping_jobs successfully deleted\n');
  } else {
    console.log(`❌ ERROR: ${remainingJobs} jobs still remain!\n`);
  }

  // Task 4: Clean up temp attachment folders
  console.log('🗑️  Task 4: Cleaning up temp attachment folders...');
  const attachmentDir = process.env.NTIS_ATTACHMENT_DIR || path.join(process.cwd(), 'data/ntis-attachments');

  if (fs.existsSync(attachmentDir)) {
    const items = fs.readdirSync(attachmentDir);

    // Delete all subdirectories and files (except hidden files like .gitkeep)
    let deletedFolders = 0;
    let deletedFiles = 0;

    for (const item of items) {
      // Skip hidden files except .DS_Store
      if (item.startsWith('.') && item !== '.DS_Store') {
        continue;
      }

      const itemPath = path.join(attachmentDir, item);
      const stat = fs.statSync(itemPath);

      if (stat.isDirectory()) {
        fs.rmSync(itemPath, { recursive: true, force: true });
        deletedFolders++;
        console.log(`   ✓ Deleted folder: ${item}`);
      } else {
        fs.unlinkSync(itemPath);
        deletedFiles++;
        console.log(`   ✓ Deleted file: ${item}`);
      }
    }

    console.log(`✅ Deleted ${deletedFolders} folders and ${deletedFiles} files`);
  } else {
    console.log(`⚠️  Attachment directory does not exist: ${attachmentDir}`);
  }

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║           CLEANUP COMPLETE - READY FOR TESTING             ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log('✅ All data cleared. You can now run fresh tests.\n');
}

main()
  .catch((error) => {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
