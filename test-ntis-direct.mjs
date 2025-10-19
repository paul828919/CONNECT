/**
 * Direct NTIS test - ESM JavaScript (no TypeScript compilation needed)
 * Can run directly with: node test-ntis-direct.mjs
 */

import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { parseStringPromise } from 'xml2js';

const db = new PrismaClient();
const NTIS_API_KEY = process.env.NTIS_API_KEY || '6f5cioc70502fi63fdn5';

async function testNTIS() {
  console.log('🚀 Testing NTIS API directly...\n');

  try {
    // Test API call with fixed search parameter
    const url = `https://www.ntis.go.kr/rndopen/openApi/public_project`;
    const params = {
      apprvKey: NTIS_API_KEY,
      collection: 'project',
      SRWR: '연구개발', // Fixed search term
      searchRnkn: 'DATE/DESC',
      addQuery: 'PY=2025/SAME',
      startPosition: 1,
      displayCnt: 10,
    };

    console.log('📡 Calling NTIS API...');
    const response = await axios.get(url, { params, timeout: 30000 });

    // Parse XML
    const parsed = await parseStringPromise(response.data);
    const totalHits = parseInt(parsed.RESULT.TOTALHITS[0]);

    console.log(`✅ API Response: ${totalHits} programs found\n`);

    // Check database
    const dbCount = await db.funding_programs.count({
      where: { scrapingSource: 'NTIS_API' }
    });

    console.log(`📊 Database Status:`);
    console.log(`   Current NTIS programs: ${dbCount}`);
    console.log(`   Available from API: ${totalHits}`);

    if (totalHits > 0) {
      console.log(`\n✅ NTIS API integration is working!`);
      console.log(`   Next step: Run full scraping to populate database`);
    }

    await db.$disconnect();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await db.$disconnect();
    process.exit(1);
  }
}

testNTIS();
