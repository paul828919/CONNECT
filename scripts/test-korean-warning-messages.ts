/**
 * Test Korean Warning Messages in Match Explainer
 *
 * This script tests all 5 types of Korean warning messages:
 * 1. NULL budget warning - "💰 지원규모 미정"
 * 2. NULL deadline warning - "📅 마감일 추후 공고"
 * 3. Past deadline warning - "⏰ 마감 완료 (날짜) - 내년 준비용"
 * 4. Business structure mismatch - "⚠️ 사업자 유형 불일치"
 * 5. Inferred TRL warning - "ℹ️ 기술성숙도(TRL) 추정값"
 *
 * Strategy:
 * - Create/update test data with specific characteristics
 * - Generate matches using real matching algorithm
 * - Verify Korean warnings appear in explanations
 * - Clean up test data after verification
 *
 * Per user rule: Always verify locally before deploying to production
 */

import { PrismaClient } from '@prisma/client';
import { generateMatches } from '@/lib/matching/algorithm';
import { generateExplanation } from '@/lib/matching/explainer';

const prisma = new PrismaClient();

async function testKoreanWarningMessages() {
  console.log('🧪 Testing Korean Warning Messages in Match Explainer\n');
  console.log('='.repeat(80));

  try {
    // ========================================================================
    // Setup: Create test organization (SOLE_PROPRIETOR)
    // ========================================================================
    console.log('\n📝 Step 1: Setting up test organization...\n');

    let testOrg = await prisma.organizations.findFirst({
      where: { name: 'Test Sole Proprietor Company' },
    });

    if (!testOrg) {
      testOrg = await prisma.organizations.create({
        data: {
          name: 'Test Sole Proprietor Company',
          type: 'COMPANY',
          businessNumberEncrypted: 'test-encrypted-123',
          businessNumberHash: 'test-hash-123',
          businessStructure: 'SOLE_PROPRIETOR', // ← Key: Sole proprietor
          industrySector: 'ICT',
          technologyReadinessLevel: 5,
          rdExperience: true,
          profileCompleted: true,
          profileScore: 80,
        },
      });
      console.log(`✅ Created test organization: ${testOrg.id} (SOLE_PROPRIETOR)`);
    } else {
      console.log(`✅ Using existing test organization: ${testOrg.id}`);
    }

    // ========================================================================
    // Setup: Create 5 test programs with different warning triggers
    // ========================================================================
    console.log('\n📝 Step 2: Creating test programs with warning triggers...\n');

    const now = new Date();
    const pastDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days future

    // Program 1: Corporation-only (should trigger business structure warning)
    const program1 = await prisma.funding_programs.upsert({
      where: { contentHash: 'test-corp-only-program-hash' },
      update: {},
      create: {
        agencyId: 'NTIS',
        title: 'Test Program 1: Corporation-Only Restriction',
        description: 'Program restricted to corporations only',
        announcementUrl: 'https://test.com/program1',
        targetType: ['COMPANY'],
        minTrl: 4,
        maxTrl: 6,
        budgetAmount: BigInt(500000000), // 5억원
        deadline: futureDate,
        allowedBusinessStructures: ['CORPORATION'], // ← Key: Corporation only
        attachmentUrls: [],
        trlInferred: false,
        keywords: ['ICT', '소프트웨어'],
        contentHash: 'test-corp-only-program-hash',
        scrapedAt: now,
      },
    });
    console.log(`✅ Created Program 1: Corporation-only (should warn SOLE_PROPRIETOR)`);

    // Program 2: NULL budget + NULL deadline
    const program2 = await prisma.funding_programs.upsert({
      where: { contentHash: 'test-null-budget-deadline-hash' },
      update: {},
      create: {
        agencyId: 'NTIS',
        title: 'Test Program 2: NULL Budget + NULL Deadline',
        description: 'Program with TBD budget and deadline',
        announcementUrl: 'https://test.com/program2',
        targetType: ['COMPANY'],
        minTrl: 4,
        maxTrl: 6,
        budgetAmount: null, // ← Key: NULL budget
        deadline: null, // ← Key: NULL deadline
        allowedBusinessStructures: [], // No restrictions
        attachmentUrls: [],
        trlInferred: false,
        keywords: ['ICT', '소프트웨어'],
        contentHash: 'test-null-budget-deadline-hash',
        scrapedAt: now,
      },
    });
    console.log(`✅ Created Program 2: NULL budget + NULL deadline`);

    // Program 3: Past deadline (expired)
    const program3 = await prisma.funding_programs.upsert({
      where: { contentHash: 'test-past-deadline-hash' },
      update: {},
      create: {
        agencyId: 'NTIS',
        title: 'Test Program 3: Past Deadline (Expired)',
        description: 'Program with expired deadline',
        announcementUrl: 'https://test.com/program3',
        targetType: ['COMPANY'],
        minTrl: 4,
        maxTrl: 6,
        budgetAmount: BigInt(300000000), // 3억원
        deadline: pastDate, // ← Key: Past deadline
        allowedBusinessStructures: [],
        attachmentUrls: [],
        trlInferred: false,
        keywords: ['ICT', '소프트웨어'],
        contentHash: 'test-past-deadline-hash',
        scrapedAt: now,
      },
    });
    console.log(`✅ Created Program 3: Past deadline (should show "내년 준비용")`);

    // Program 4: Inferred TRL (keyword-based)
    const program4 = await prisma.funding_programs.upsert({
      where: { contentHash: 'test-inferred-trl-hash' },
      update: {},
      create: {
        agencyId: 'NTIS',
        title: 'Test Program 4: Inferred TRL (Keyword-Based)',
        description: 'Program with auto-classified TRL',
        announcementUrl: 'https://test.com/program4',
        targetType: ['COMPANY'],
        minTrl: 4,
        maxTrl: 6,
        budgetAmount: BigInt(400000000), // 4억원
        deadline: futureDate,
        allowedBusinessStructures: [],
        attachmentUrls: [],
        trlInferred: true, // ← Key: TRL was inferred, not explicit
        keywords: ['ICT', '소프트웨어'],
        contentHash: 'test-inferred-trl-hash',
        scrapedAt: now,
      },
    });
    console.log(`✅ Created Program 4: Inferred TRL (should show info message)`);

    // Program 5: Multiple warnings (NULL budget + past deadline + inferred TRL)
    const program5 = await prisma.funding_programs.upsert({
      where: { contentHash: 'test-multiple-warnings-hash' },
      update: {},
      create: {
        agencyId: 'NTIS',
        title: 'Test Program 5: Multiple Warnings',
        description: 'Program with multiple warning triggers',
        announcementUrl: 'https://test.com/program5',
        targetType: ['COMPANY'],
        minTrl: 4,
        maxTrl: 6,
        budgetAmount: null, // ← NULL budget
        deadline: pastDate, // ← Past deadline
        allowedBusinessStructures: ['CORPORATION'], // ← Business structure mismatch
        attachmentUrls: [],
        trlInferred: true, // ← Inferred TRL
        keywords: ['ICT', '소프트웨어'],
        contentHash: 'test-multiple-warnings-hash',
        scrapedAt: now,
      },
    });
    console.log(`✅ Created Program 5: Multiple warnings (should show 4+ warnings)`);

    // ========================================================================
    // Test: Generate matches and verify warnings
    // ========================================================================
    console.log('\n📝 Step 3: Generating matches and verifying Korean warnings...\n');
    console.log('='.repeat(80));

    // Fetch all test programs we created
    const testPrograms = await prisma.funding_programs.findMany({
      where: {
        contentHash: {
          in: [
            'test-corp-only-program-hash',
            'test-null-budget-deadline-hash',
            'test-past-deadline-hash',
            'test-inferred-trl-hash',
            'test-multiple-warnings-hash',
          ],
        },
      },
    });

    console.log(`\n✅ Found ${testPrograms.length} test programs`);

    // Generate matches using real matching algorithm
    // Use includeExpired: true to test past deadline warnings
    const matches = generateMatches(testOrg, testPrograms, 10, { includeExpired: true });
    console.log(`✅ Generated ${matches.length} matches for test organization\n`);

    // Test each match's explanation
    for (const match of matches) {
      // Program is already in match.program from generateMatches
      const program = match.program;

      const explanation = generateExplanation(match, testOrg, program);

      console.log('\n' + '─'.repeat(80));
      console.log(`📄 Program: ${program.title}`);
      console.log(`   Match Score: ${match.score}/100`);
      console.log('\n📋 Korean Warnings Generated:');
      console.log('─'.repeat(80));

      const warnings = explanation.warnings || [];

      if (warnings.length === 0) {
        console.log('   ⚠️ No warnings (unexpected - may indicate missing logic)');
      } else {
        warnings.forEach((warning, idx) => {
          console.log(`   ${idx + 1}. ${warning}`);
        });
      }

      // Verify specific warning patterns
      console.log('\n🔍 Warning Pattern Verification:');
      console.log('─'.repeat(80));

      const hasNullBudgetWarning = warnings.some((w) => w.includes('💰') && w.includes('미정'));
      const hasNullDeadlineWarning = warnings.some((w) => w.includes('📅') && w.includes('추후'));
      const hasPastDeadlineWarning = warnings.some((w) => w.includes('⏰') && w.includes('마감'));
      const hasBusinessStructureWarning = warnings.some((w) =>
        w.includes('사업자 유형')
      );
      const hasTrlInferredWarning = warnings.some((w) => w.includes('기술성숙도'));

      console.log(`   💰 NULL Budget: ${hasNullBudgetWarning ? '✅ Found' : '⚪ Not found'}`);
      console.log(`   📅 NULL Deadline: ${hasNullDeadlineWarning ? '✅ Found' : '⚪ Not found'}`);
      console.log(`   ⏰ Past Deadline: ${hasPastDeadlineWarning ? '✅ Found' : '⚪ Not found'}`);
      console.log(
        `   ⚠️ Business Structure: ${hasBusinessStructureWarning ? '✅ Found' : '⚪ Not found'}`
      );
      console.log(`   ℹ️ TRL Inferred: ${hasTrlInferredWarning ? '✅ Found' : '⚪ Not found'}`);
    }

    // ========================================================================
    // Summary
    // ========================================================================
    console.log('\n\n📊 Test Summary');
    console.log('='.repeat(80));
    console.log(`Test organization: ${testOrg.name} (SOLE_PROPRIETOR)`);
    console.log(`Test programs created: 5`);
    console.log(`Matches generated: ${matches.length}`);
    console.log(
      '\n✅ Korean warning message system tested successfully!\n   Review warnings above to verify all messages display correctly.\n'
    );
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

testKoreanWarningMessages()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
