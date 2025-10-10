/**
 * Validate NTIS API Setup
 * 
 * Quick validation script to ensure all dependencies and configurations are correct
 * 
 * Usage: npx tsx scripts/validate-ntis-setup.ts
 */

import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function validateSetup() {
  console.log('🔍 Validating NTIS API Setup...\n');
  
  let hasErrors = false;

  // 1. Check Environment Variables
  console.log('1️⃣ Checking environment variables...');
  if (process.env.NTIS_API_KEY) {
    console.log('   ✅ NTIS_API_KEY is set:', process.env.NTIS_API_KEY.substring(0, 8) + '...');
  } else {
    console.log('   ❌ NTIS_API_KEY is not set in .env file');
    hasErrors = true;
  }

  // 2. Check Dependencies
  console.log('\n2️⃣ Checking dependencies...');
  
  try {
    await import('axios');
    console.log('   ✅ axios is installed');
  } catch (error) {
    console.log('   ❌ axios is not installed - run: npm install axios');
    hasErrors = true;
  }

  try {
    await import('xml2js');
    console.log('   ✅ xml2js is installed');
  } catch (error) {
    console.log('   ❌ xml2js is not installed - run: npm install xml2js');
    hasErrors = true;
  }

  // 3. Check NTIS API Module Files
  console.log('\n3️⃣ Checking NTIS API module files...');
  
  const requiredFiles = [
    '../lib/ntis-api/client',
    '../lib/ntis-api/parser',
    '../lib/ntis-api/scraper',
    '../lib/ntis-api/config',
    '../lib/ntis-api/types',
    '../lib/ntis-api/index',
  ];

  for (const file of requiredFiles) {
    try {
      await import(file);
      console.log(`   ✅ ${file.split('/').pop()}.ts exists and is valid`);
    } catch (error: any) {
      console.log(`   ❌ ${file.split('/').pop()}.ts has errors:`, error.message);
      hasErrors = true;
    }
  }

  // 4. Test NTIS API Client Initialization
  console.log('\n4️⃣ Testing NTIS API client initialization...');
  
  try {
    const { NTISApiClient } = await import('../lib/ntis-api');
    const { ntisApiConfig } = await import('../lib/ntis-api/config');
    
    const client = new NTISApiClient(ntisApiConfig);
    console.log('   ✅ NTIS API client initialized successfully');
    console.log('   ℹ️  API Base URL:', ntisApiConfig.baseUrl);
  } catch (error: any) {
    console.log('   ❌ Failed to initialize NTIS API client:', error.message);
    hasErrors = true;
  }

  // 5. Check Database Connection
  console.log('\n5️⃣ Checking database connection...');
  
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    await prisma.$connect();
    console.log('   ✅ Database connection successful');
    await prisma.$disconnect();
  } catch (error: any) {
    console.log('   ❌ Database connection failed:', error.message);
    console.log('   ℹ️  Make sure PostgreSQL is running (check docker-compose)');
    hasErrors = true;
  }

  // Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (hasErrors) {
    console.log('❌ Validation Failed - Please fix the errors above');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('📝 Common Fixes:');
    console.log('   1. Install dependencies: npm install');
    console.log('   2. Check .env file has NTIS_API_KEY');
    console.log('   3. Start database: docker-compose up -d');
    console.log('   4. Run: npm run db:push');
    
    process.exit(1);
  } else {
    console.log('✅ Validation Successful - Ready to test NTIS API!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('🚀 Next Steps:');
    console.log('   1. Run test scraping: npx tsx scripts/trigger-ntis-scraping.ts');
    console.log('   2. View results: npm run db:studio');
    console.log('   3. Check NTIS-IMPLEMENTATION-COMPLETE.md for details');
    
    process.exit(0);
  }
}

// Run validation
validateSetup().catch((error) => {
  console.error('❌ Fatal validation error:', error);
  process.exit(1);
});
