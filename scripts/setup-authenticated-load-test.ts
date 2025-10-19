/**
 * Setup Script for Authenticated Load Testing
 * 
 * This script:
 * 1. Creates test users in the database
 * 2. Generates valid JWT tokens for authentication
 * 3. Verifies test data exists (matches, programs)
 * 4. Exports tokens for k6 load test
 * 
 * Usage:
 *   npx tsx scripts/setup-authenticated-load-test.ts
 */

import { PrismaClient } from '@prisma/client';
import { generateTestToken } from '../lib/auth/test-token-generator';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface TestUser {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
  organizationId: string | null;
  sessionToken: string; // NextAuth session token (for cookies)
}

/**
 * Create test users for load testing
 */
async function createTestUsers(count: number = 10): Promise<TestUser[]> {
  console.log(`\n📝 Creating ${count} test users...`);
  
  const users: TestUser[] = [];
  
  // Get or create a test organization
  let testOrg = await prisma.organizations.findFirst({
    where: { name: { contains: 'Load Test' } }
  });
  
  if (!testOrg) {
    console.log('   Creating test organization...');
    const testBusinessNum = 'TEST-' + Date.now();
    testOrg = await prisma.organizations.create({
      data: {
        name: 'Load Test Organization',
        type: 'COMPANY',
        description: 'Test organization for load testing',
        industrySector: 'AI/ML',
        employeeCount: 'FROM_10_TO_50',
        businessNumberEncrypted: testBusinessNum, // Use plain for test
        businessNumberHash: testBusinessNum, // Use plain for test
        primaryContactEmail: 'loadtest@connectplt.kr',
        profileCompleted: true,
        profileScore: 80,
      }
    });
    console.log(`   ✅ Created organization: ${testOrg.name} (${testOrg.id})`);
  }
  
  // Create test users
  for (let i = 0; i < count; i++) {
    const email = `loadtest+${i}@connectplt.kr`;
    const userId = `test-user-${i}-${Date.now()}`;
    
    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user) {
      // Create new user
      user = await prisma.user.create({
        data: {
          id: userId,
          email,
          name: `Load Test User ${i}`,
          role: i === 0 ? 'ADMIN' : 'USER', // First user is admin
          organizationId: testOrg.id,
          emailVerified: new Date(),
        }
      });
      console.log(`   ✅ Created user ${i + 1}/${count}: ${email}`);
    } else {
      console.log(`   ⚡ User ${i + 1}/${count} already exists: ${email}`);
    }
    
    // Create NextAuth session for this user
    const sessionToken = `test-session-${i}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const sessionExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    // Check if session already exists for this user
    const existingSession = await prisma.session.findFirst({
      where: { userId: user.id }
    });
    
    if (existingSession) {
      // Update existing session
      await prisma.session.update({
        where: { id: existingSession.id },
        data: {
          sessionToken: sessionToken,
          expires: sessionExpiry,
        }
      });
    } else {
      // Create new session
      await prisma.session.create({
        data: {
          sessionToken: sessionToken,
          userId: user.id,
          expires: sessionExpiry,
        }
      });
    }
    
    users.push({
      id: user.id,
      email: user.email || email,
      name: user.name || email,
      role: user.role as 'USER' | 'ADMIN',
      organizationId: user.organizationId,
      sessionToken: sessionToken,
    });
  }
  
  console.log(`✅ ${users.length} test users ready`);
  return users;
}

/**
 * Verify test data exists (matches, programs)
 */
async function verifyTestData(): Promise<{
  programs: number;
  matches: number;
  organizations: number;
}> {
  console.log('\n🔍 Verifying test data...');
  
  const programCount = await prisma.funding_programs.count();
  const matchCount = await prisma.funding_matches.count();
  const orgCount = await prisma.organizations.count();
  
  console.log(`   Programs: ${programCount}`);
  console.log(`   Matches: ${matchCount}`);
  console.log(`   Organizations: ${orgCount}`);
  
  if (programCount === 0 || matchCount === 0 || orgCount === 0) {
    console.warn('   ⚠️  Warning: Missing test data. Consider running: npm run db:seed');
  } else {
    console.log('   ✅ Test data verified');
  }
  
  return {
    programs: programCount,
    matches: matchCount,
    organizations: orgCount,
  };
}

/**
 * Get sample match IDs for testing
 */
async function getSampleMatchIds(limit: number = 10): Promise<string[]> {
  console.log(`\n📋 Fetching ${limit} sample match IDs...`);
  
  const matches = await prisma.funding_matches.findMany({
    take: limit,
    select: { id: true },
  });
  
  const matchIds = matches.map(m => m.id);
  console.log(`   ✅ Found ${matchIds.length} matches`);
  
  return matchIds;
}

/**
 * Save test configuration to file
 */
function saveTestConfig(users: TestUser[], matchIds: string[]) {
  console.log('\n💾 Saving test configuration...');
  
  const config = {
    generated_at: new Date().toISOString(),
    base_url: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
    users: users.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      organization_id: u.organizationId,
    })),
    session_tokens: users.map(u => u.sessionToken),
    sample_match_ids: matchIds,
    test_info: {
      total_users: users.length,
      admin_users: users.filter(u => u.role === 'ADMIN').length,
      regular_users: users.filter(u => u.role === 'USER').length,
    }
  };
  
  // Save to file
  const configPath = path.join(__dirname, '../__tests__/performance/auth-test-config.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log(`   ✅ Config saved to: ${configPath}`);
  
  // Also save session tokens as environment variable format
  const envPath = path.join(__dirname, '../__tests__/performance/auth-test-tokens.env');
  const envContent = `# Generated at ${config.generated_at}\n` +
    `# NextAuth session tokens for cookie-based authentication\n` +
    `TEST_SESSION_TOKENS='${JSON.stringify(config.session_tokens)}'\n` +
    `TEST_MATCH_IDS='${JSON.stringify(config.sample_match_ids)}'\n` +
    `BASE_URL=${config.base_url}\n`;
  
  fs.writeFileSync(envPath, envContent);
  console.log(`   ✅ Tokens saved to: ${envPath}`);
  
  return { configPath, envPath };
}

/**
 * Print usage instructions
 */
function printUsageInstructions(configPath: string, envPath: string, userCount: number) {
  console.log('\n' + '='.repeat(80));
  console.log('✅ AUTHENTICATED LOAD TEST SETUP COMPLETE');
  console.log('='.repeat(80));
  console.log('');
  console.log('📊 Summary:');
  console.log(`   • ${userCount} test users created`);
  console.log(`   • JWT tokens generated`);
  console.log(`   • Test data verified`);
  console.log('');
  console.log('🚀 How to Run Authenticated Load Test:');
  console.log('');
  console.log('   Option 1: Using environment file (recommended)');
  console.log('   ─────────────────────────────────────────────');
  console.log(`   source ${envPath}`);
  console.log('   k6 run __tests__/performance/authenticated-ai-load-test.js');
  console.log('');
  console.log('   Option 2: Direct session token injection');
  console.log('   ─────────────────────────────────────────────');
  console.log('   k6 run \\');
  console.log(`     --env TEST_SESSION_TOKENS="$(cat ${configPath} | jq -c '.session_tokens')" \\`);
  console.log('     __tests__/performance/authenticated-ai-load-test.js');
  console.log('');
  console.log('   Option 3: Quick smoke test (30 seconds)');
  console.log('   ─────────────────────────────────────────────');
  console.log(`   source ${envPath}`);
  console.log('   k6 run --duration 30s --vus 5 __tests__/performance/authenticated-ai-load-test.js');
  console.log('');
  console.log('📁 Files Created:');
  console.log(`   • ${configPath}`);
  console.log(`   • ${envPath}`);
  console.log('');
  console.log('🔐 Test Users:');
  console.log('   • Email pattern: loadtest+[0-9]@connectplt.kr');
  console.log('   • User 0 is ADMIN, others are regular USER role');
  console.log('   • All users belong to "Load Test Organization"');
  console.log('');
  console.log('⚠️  Security Note:');
  console.log('   Session tokens are valid for 7 days. Re-run this script if sessions expire.');
  console.log('');
  console.log('🍪 Cookie-Based Authentication:');
  console.log('   Sessions are stored in database and sent as cookies (next-auth.session-token)');
  console.log('');
  console.log('='.repeat(80));
}

/**
 * Cleanup old test users (optional)
 */
async function cleanupOldTestUsers(): Promise<number> {
  console.log('\n🧹 Cleaning up old test users...');
  
  // Find test users older than 24 hours
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const oldUsers = await prisma.user.findMany({
    where: {
      email: { contains: 'loadtest' },
      createdAt: { lt: oneDayAgo }
    }
  });
  
  if (oldUsers.length > 0) {
    console.log(`   Found ${oldUsers.length} old test users to clean up`);
    
    for (const user of oldUsers) {
      await prisma.user.delete({
        where: { id: user.id }
      });
    }
    
    console.log(`   ✅ Cleaned up ${oldUsers.length} old test users`);
  } else {
    console.log('   ✅ No old test users to clean up');
  }
  
  return oldUsers.length;
}

/**
 * Main execution
 */
async function main() {
  console.log('🔐 AUTHENTICATED LOAD TEST SETUP');
  console.log('='.repeat(80));
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Database: ${process.env.DATABASE_URL ? '✅ Connected' : '❌ Not configured'}`);
  console.log('');
  
  try {
    // 1. Optional: Cleanup old test users
    await cleanupOldTestUsers();
    
    // 2. Verify test data exists
    const testData = await verifyTestData();
    
    if (testData.programs === 0 || testData.matches === 0) {
      console.log('\n⚠️  Insufficient test data. Run database seed first:');
      console.log('   docker-compose -f docker-compose.dev.yml exec app npm run db:seed');
      console.log('\nContinuing with user setup...\n');
    }
    
    // 3. Create test users
    const userCount = parseInt(process.env.TEST_USER_COUNT || '10');
    const users = await createTestUsers(userCount);
    
    // 4. Get sample match IDs
    const matchIds = await getSampleMatchIds(20);
    
    // 5. Save configuration
    const { configPath, envPath } = saveTestConfig(users, matchIds);
    
    // 6. Print usage instructions
    printUsageInstructions(configPath, envPath, users.length);
    
    console.log('✅ Setup complete!');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the setup
main().catch(console.error);

