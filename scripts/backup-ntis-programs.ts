import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function backupNtisPrograms() {
  console.log('💾 Starting NTIS Programs Backup...\n');

  try {
    // 1. Fetch all NTIS programs
    console.log('📥 Fetching all NTIS programs from database...');
    const ntisPrograms = await prisma.funding_programs.findMany({
      where: { agencyId: 'NTIS' },
      orderBy: { scrapedAt: 'desc' },
    });

    console.log(`✅ Fetched ${ntisPrograms.length} programs\n`);

    // 2. Show breakdown by type
    const typeBreakdown = ntisPrograms.reduce((acc, program) => {
      acc[program.announcementType] = (acc[program.announcementType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('📊 Announcement Type Breakdown:');
    console.log('─────────────────────────────────────────────────────────');
    for (const [type, count] of Object.entries(typeBreakdown)) {
      console.log(`   ${type.padEnd(15)} ${count}`);
    }
    console.log('─────────────────────────────────────────────────────────\n');

    // 3. Create backup metadata
    const backup = {
      metadata: {
        backupDate: new Date().toISOString(),
        totalPrograms: ntisPrograms.length,
        typeBreakdown,
        dateRange: {
          oldestScrapedAt: ntisPrograms[ntisPrograms.length - 1]?.scrapedAt?.toISOString(),
          newestScrapedAt: ntisPrograms[0]?.scrapedAt?.toISOString(),
        },
      },
      programs: ntisPrograms.map(program => ({
        ...program,
        // Convert Decimal to string for JSON serialization
        budgetAmount: program.budgetAmount?.toString() || null,
        // Convert Date objects to ISO strings
        publishedAt: program.publishedAt?.toISOString() || null,
        deadline: program.deadline?.toISOString() || null,
        scrapedAt: program.scrapedAt.toISOString(),
        createdAt: program.createdAt.toISOString(),
        updatedAt: program.updatedAt.toISOString(),
      })),
    };

    // 4. Generate timestamped filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `ntis-programs-backup-${timestamp}-${ntisPrograms.length}-records.json`;
    const backupDir = path.join(process.cwd(), 'backups');
    const filepath = path.join(backupDir, filename);

    // 5. Ensure backup directory exists
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
      console.log(`📁 Created backup directory: ${backupDir}\n`);
    }

    // 6. Write backup file
    console.log(`💾 Writing backup to: ${filename}`);
    fs.writeFileSync(filepath, JSON.stringify(backup, null, 2), 'utf-8');

    // 7. Verify file was created
    const fileStats = fs.statSync(filepath);
    const fileSizeMB = (fileStats.size / 1024 / 1024).toFixed(2);

    console.log(`✅ Backup completed successfully!\n`);
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`📄 File: ${filename}`);
    console.log(`📂 Location: ${filepath}`);
    console.log(`💾 Size: ${fileSizeMB} MB`);
    console.log(`📊 Programs: ${ntisPrograms.length}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('✅ You can now safely delete NTIS programs from the database.');
    console.log(`   To restore: Import from ${filename}\n`);

  } catch (error) {
    console.error('❌ Backup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

backupNtisPrograms();
