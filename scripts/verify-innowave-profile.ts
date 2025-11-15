/**
 * Verification Script: Check Innowave profile data in database
 *
 * Verifies:
 * - Organization profile exists
 * - hasResearchInstitute is set correctly
 * - Certifications array contains expected values
 */

import { db } from '../lib/db';

async function verifyInnovaveProfile() {
  try {
    console.log('🔍 Searching for Kim Byungjin (Innowave) profile...\n');

    // Find the user and organization
    const user = await db.user.findFirst({
      where: {
        OR: [
          { name: { contains: '김병진', mode: 'insensitive' } },
          { name: { contains: 'byungjin', mode: 'insensitive' } },
          { email: { contains: 'byungjin', mode: 'insensitive' } },
        ],
      },
      include: {
        organization: true,
      },
    });

    if (!user) {
      console.log('❌ User not found!\n');
      return;
    }

    console.log('✅ User found:');
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   User ID: ${user.id}`);
    console.log(`   Organization ID: ${user.organizationId || 'null'}\n`);

    if (!user.organization) {
      console.log('❌ No organization profile found!\n');
      console.log('⚠️  This means the profile creation may have failed.');
      console.log('   Please check the application logs for errors.\n');
      return;
    }

    const org = user.organization;

    console.log('✅ Organization profile found:\n');
    console.log('📊 Basic Information:');
    console.log(`   Organization ID: ${org.id}`);
    console.log(`   Name: ${org.name}`);
    console.log(`   Type: ${org.type}`);
    console.log(`   Industry Sector: ${org.industrySector}`);
    console.log(`   Employee Count: ${org.employeeCount}`);
    console.log(`   Profile Score: ${org.profileScore}`);
    console.log(`   Status: ${org.status}\n`);

    console.log('🔬 Research & Development:');
    console.log(`   R&D Experience: ${org.rdExperience}`);
    console.log(`   Technology Readiness Level: ${org.technologyReadinessLevel || 'Not set'}`);
    console.log(`   Patent Count: ${org.patentCount || 0}\n`);

    console.log('🏢 Company Details:');
    console.log(`   Revenue Range: ${org.revenueRange || 'Not set'}`);
    console.log(`   Business Structure: ${org.businessStructure || 'Not set'}`);
    console.log(`   Established Date: ${org.businessEstablishedDate ? org.businessEstablishedDate.toISOString().split('T')[0] : 'Not set'}\n`);

    console.log('✨ VERIFICATION RESULTS:\n');
    console.log('═══════════════════════════════════════════════════════');

    // Check 1: hasResearchInstitute field
    console.log('\n1️⃣  Corporate Research Institute Status:');
    console.log(`   hasResearchInstitute: ${org.hasResearchInstitute}`);
    if (org.hasResearchInstitute) {
      console.log('   ✅ PASS - Field is set to TRUE\n');
    } else {
      console.log('   ❌ FAIL - Field is FALSE (should be TRUE)\n');
    }

    // Check 2: Certifications array
    console.log('2️⃣  Certifications Array:');
    console.log(`   Total certifications: ${org.certifications.length}`);
    console.log(`   Certifications: ${JSON.stringify(org.certifications, null, 2)}`);

    const has연구개발전담부서 = org.certifications.includes('연구개발전담부서');
    const has기업부설연구소 = org.certifications.includes('기업부설연구소');

    console.log(`\n   Contains '연구개발전담부서': ${has연구개발전담부서 ? '✅ YES' : '❌ NO'}`);
    console.log(`   Contains '기업부설연구소': ${has기업부설연구소 ? '✅ YES' : '❌ NO'}\n`);

    // Check 3: Auto-derivation logic validation
    console.log('3️⃣  Auto-Derivation Logic Validation:');
    const expectedHasResearchInstitute = org.certifications.includes('기업부설연구소');
    const logicMatches = org.hasResearchInstitute === expectedHasResearchInstitute;

    console.log(`   Expected hasResearchInstitute: ${expectedHasResearchInstitute}`);
    console.log(`   Actual hasResearchInstitute: ${org.hasResearchInstitute}`);
    console.log(`   Logic matches: ${logicMatches ? '✅ PASS' : '❌ FAIL'}\n`);

    console.log('═══════════════════════════════════════════════════════\n');

    // Final summary
    const allChecksPassed =
      org.hasResearchInstitute &&
      has연구개발전담부서 &&
      has기업부설연구소 &&
      logicMatches;

    if (allChecksPassed) {
      console.log('🎉 ALL CHECKS PASSED! ✅\n');
      console.log('✅ Database correctly stores:');
      console.log('   - hasResearchInstitute = true');
      console.log('   - certifications includes 연구개발전담부서');
      console.log('   - certifications includes 기업부설연구소');
      console.log('   - Auto-derivation logic working correctly\n');
      console.log('🚀 Ready to commit and deploy to production!\n');
    } else {
      console.log('⚠️  SOME CHECKS FAILED!\n');
      console.log('Please review the results above and fix any issues before deploying.\n');
    }

  } catch (error) {
    console.error('❌ Verification failed:', error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

verifyInnovaveProfile();
