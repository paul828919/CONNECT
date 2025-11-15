import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Checking attachment folder paths for successful vs failed programs...\n');
  
  // Sample successful programs (with text extracted)
  const successful: any[] = await prisma.$queryRaw`
    SELECT 
      sj."attachmentFolder",
      EXTRACT(EPOCH FROM (sj."processedAt" - sj."processingStartedAt")) as processing_seconds,
      LENGTH(sj."detailPageData"::text) as data_length
    FROM scraping_jobs sj
    WHERE sj."processingStatus" = 'COMPLETED'
      AND sj."detailPageData"::text LIKE '%"text":%'
      AND sj."detailPageData"::text NOT LIKE '%"text":null%'
    LIMIT 5
  `;
  
  console.log('✅ SUCCESSFUL PROGRAMS (text extracted):');
  successful.forEach(row => {
    console.log(`   Path: ${row.attachmentFolder}`);
    console.log(`   Time: ${row.processing_seconds}s`);
    console.log(`   Data: ${row.data_length} bytes`);
    console.log('');
  });
  
  // Sample failed programs (no text)
  const failed: any[] = await prisma.$queryRaw`
    SELECT 
      sj."attachmentFolder",
      EXTRACT(EPOCH FROM (sj."processedAt" - sj."processingStartedAt")) as processing_seconds,
      LENGTH(sj."detailPageData"::text) as data_length
    FROM scraping_jobs sj
    WHERE sj."processingStatus" = 'COMPLETED'
      AND (sj."detailPageData"::text LIKE '%"text":null%' 
           OR sj."detailPageData"::text NOT LIKE '%"text":%')
    LIMIT 5
  `;
  
  console.log('❌ FAILED PROGRAMS (no text):');
  failed.forEach(row => {
    console.log(`   Path: ${row.attachmentFolder}`);
    console.log(`   Time: ${row.processing_seconds}s`);
    console.log(`   Data: ${row.data_length} bytes`);
    console.log('');
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
