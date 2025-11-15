/**
 * Diagnose Match Filter Rejections
 *
 * Identifies which filters are eliminating programs from matching
 */

import { PrismaClient, ProgramStatus, AnnouncementType } from '@prisma/client';
import { findIndustrySector, INDUSTRY_RELEVANCE } from '../lib/matching/taxonomy';
import { checkEligibility, EligibilityLevel } from '../lib/matching/eligibility';

const db = new PrismaClient({ log: ['error', 'warn'] });

async function diagnoseMatchFilters() {
  console.log('🔬 Diagnosing Match Filter Rejections\n');
  console.log('='.repeat(70));

  try {
    const orgId = '0563febf-ded4-43fb-88d6-e90642a89745'; // GreenTech Solutions

    // Fetch organization
    const organization = await db.organizations.findUnique({
      where: { id: orgId },
    });

    if (!organization) {
      console.log('❌ Organization not found!');
      return;
    }

    console.log(`\n📋 Organization: ${organization.name}`);
    console.log(`   Type: ${organization.type}`);
    console.log(`   Sector: ${organization.industrySector}`);
    console.log(`   TRL: ${organization.technologyReadinessLevel}`);
    console.log(`   Business Structure: ${organization.businessStructure}`);
    console.log(`   R&D Experience: ${organization.rdExperience}`);

    // Fetch EXPIRED programs
    const programs = await db.funding_programs.findMany({
      where: {
        status: ProgramStatus.EXPIRED,
        announcementType: AnnouncementType.R_D_PROJECT,
        scrapingSource: {
          not: null,
          notIn: ['NTIS_API'],
        },
      },
      take: 100,
      orderBy: [
        { publishedAt: 'desc' },
        { deadline: 'desc' },
      ],
    });

    console.log(`\n📊 Testing ${programs.length} EXPIRED programs...\n`);

    // Track filter statistics
    const stats = {
      total: programs.length,
      passed: 0,
      rejectedBy: {
        consolidatedAnnouncement: 0,
        targetType: 0,
        businessStructure: 0,
        trl: 0,
        hospitalOnly: 0,
        industryCategory: 0,
        eligibility: 0,
      },
    };

    const hospitalOnlyKeywords = [
      '의사과학자',
      '상급종합병원',
      'M.D.-Ph.D.',
      '의료법',
    ];

    for (const program of programs) {
      let rejected = false;
      let rejectionReason = '';

      // Filter 1: Consolidated Announcements
      if (!program.deadline && !program.applicationStart && !program.budgetAmount) {
        stats.rejectedBy.consolidatedAnnouncement++;
        rejected = true;
        rejectionReason = 'Consolidated announcement (no deadline/start/budget)';
      }

      // Filter 2: Target Type
      if (!rejected && program.targetType && !program.targetType.includes(organization.type)) {
        stats.rejectedBy.targetType++;
        rejected = true;
        rejectionReason = `Target type mismatch (program: ${program.targetType.join(', ')}, org: ${organization.type})`;
      }

      // Filter 3: Business Structure
      if (!rejected && program.allowedBusinessStructures && program.allowedBusinessStructures.length > 0) {
        const orgBusinessStructure = organization.businessStructure;
        if (!orgBusinessStructure || !program.allowedBusinessStructures.includes(orgBusinessStructure)) {
          stats.rejectedBy.businessStructure++;
          rejected = true;
          rejectionReason = `Business structure mismatch (program requires: ${program.allowedBusinessStructures.join(', ')}, org has: ${orgBusinessStructure || 'NULL'})`;
        }
      }

      // Filter 4: TRL Hard Requirement
      if (!rejected && program.minTrl !== null && program.maxTrl !== null && organization.technologyReadinessLevel) {
        const orgTRL = organization.technologyReadinessLevel;
        if (orgTRL < program.minTrl || orgTRL > program.maxTrl) {
          stats.rejectedBy.trl++;
          rejected = true;
          rejectionReason = `TRL incompatible (program: ${program.minTrl}-${program.maxTrl}, org: ${orgTRL})`;
        }
      }

      // Filter 5: Hospital/Medical Only
      if (!rejected) {
        const isHospitalOnlyProgram = hospitalOnlyKeywords.some(keyword =>
          program.title.includes(keyword)
        );
        if (isHospitalOnlyProgram && organization.type !== 'RESEARCH_INSTITUTE') {
          stats.rejectedBy.hospitalOnly++;
          rejected = true;
          rejectionReason = 'Hospital/medical-only program (org is not research institute)';
        }
      }

      // Filter 6: Industry Category Compatibility
      if (!rejected && organization.industrySector && program.category) {
        const orgSector = findIndustrySector(organization.industrySector);
        const programSector = findIndustrySector(program.category);

        if (orgSector && programSector) {
          const relevanceScore = INDUSTRY_RELEVANCE[orgSector]?.[programSector] ?? 0;
          if (relevanceScore < 0.3) {
            stats.rejectedBy.industryCategory++;
            rejected = true;
            rejectionReason = `Industry incompatible (org: ${orgSector}, program: ${programSector}, relevance: ${relevanceScore})`;
          }
        }
      }

      // Filter 7: Eligibility
      if (!rejected) {
        const eligibilityResult = checkEligibility(program, organization);
        if (eligibilityResult.level === EligibilityLevel.INELIGIBLE) {
          stats.rejectedBy.eligibility++;
          rejected = true;
          rejectionReason = `Ineligible: ${eligibilityResult.failedRequirements.join(', ')}`;
        }
      }

      if (!rejected) {
        stats.passed++;
      }

      // Log first 3 rejections of each type for debugging
      if (rejected && stats.rejectedBy[Object.keys(stats.rejectedBy).find(key => rejectionReason.startsWith(key.charAt(0).toUpperCase() + key.slice(1))) || 'other'] <= 3) {
        console.log(`❌ REJECTED: ${program.title.substring(0, 60)}...`);
        console.log(`   Reason: ${rejectionReason}\n`);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('📈 FILTER STATISTICS\n');
    console.log(`Total programs tested: ${stats.total}`);
    console.log(`Programs that PASSED all filters: ${stats.passed} (${((stats.passed / stats.total) * 100).toFixed(1)}%)\n`);
    console.log('Programs REJECTED by each filter:');
    console.log(`  1. Consolidated Announcement: ${stats.rejectedBy.consolidatedAnnouncement}`);
    console.log(`  2. Target Type Mismatch: ${stats.rejectedBy.targetType}`);
    console.log(`  3. Business Structure: ${stats.rejectedBy.businessStructure}`);
    console.log(`  4. TRL Incompatible: ${stats.rejectedBy.trl}`);
    console.log(`  5. Hospital/Medical Only: ${stats.rejectedBy.hospitalOnly}`);
    console.log(`  6. Industry Category: ${stats.rejectedBy.industryCategory}`);
    console.log(`  7. Eligibility: ${stats.rejectedBy.eligibility}`);

    console.log('\n' + '='.repeat(70));
    if (stats.passed === 0) {
      console.log('⚠️  CRITICAL: NO PROGRAMS PASSED FILTERS!');
      console.log('\n💡 Possible solutions:');
      console.log('   1. Relax filter thresholds (e.g., industry relevance < 0.3)');
      console.log('   2. Fix organization profile data (TRL, business structure, sector)');
      console.log('   3. Adjust filter logic to be more permissive');
    } else if (stats.passed < 5) {
      console.log('⚠️  Very few programs passed filters - matching may be too strict');
    } else {
      console.log('✅ Filters are working as expected');
    }

  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    console.error('   Stack:', error.stack);
  } finally {
    await db.$disconnect();
  }
}

diagnoseMatchFilters();
