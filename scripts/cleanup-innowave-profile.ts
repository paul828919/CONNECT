/**
 * Cleanup Script: Remove Kim Byungjin (Innowave) profile from local database
 *
 * Deletes:
 * - Organization profile
 * - Subscription plans
 * - Matched programs
 * - Resets user's organizationId
 */

import { db } from '../lib/db';

async function cleanupInnovaveProfile() {
  try {
    console.log('🔍 Finding Kim Byungjin (Innowave) user...\n');

    // 1. Find the user (search by name or email containing "byungjin" or "innowave")
    const user = await db.user.findFirst({
      where: {
        OR: [
          { name: { contains: '김병진', mode: 'insensitive' } },
          { name: { contains: 'byungjin', mode: 'insensitive' } },
          { email: { contains: 'byungjin', mode: 'insensitive' } },
        ],
      },
      include: {
        organization: {
          include: {
            funding_matches: true,
          },
        },
        subscriptions: true,
      },
    });

    if (!user) {
      console.log('❌ User not found. Searching all users with organizations...\n');

      // Show all users with organizations for reference
      const allUsers = await db.user.findMany({
        where: {
          organizationId: { not: null },
        },
        select: {
          id: true,
          name: true,
          email: true,
          organizationId: true,
        },
      });

      console.log('📋 Users with organizations:');
      allUsers.forEach((u) => {
        console.log(`  - ${u.name} (${u.email}) - Org ID: ${u.organizationId}`);
      });

      return;
    }

    console.log(`✅ Found user: ${user.name} (${user.email})`);
    console.log(`   User ID: ${user.id}`);
    console.log(`   Organization ID: ${user.organizationId}\n`);

    if (!user.organization) {
      console.log('ℹ️  User has no organization profile yet.\n');
      return;
    }

    const org = user.organization;
    console.log(`📊 Organization: ${org.name}`);
    console.log(`   Type: ${org.type}`);
    console.log(`   Industry: ${org.industrySector}`);
    console.log(`   Has Research Institute: ${org.hasResearchInstitute}`);
    console.log(`   Certifications: ${org.certifications.join(', ') || 'None'}\n`);

    // 2. Delete funding matches
    if (org.funding_matches && org.funding_matches.length > 0) {
      console.log(`🗑️  Deleting ${org.funding_matches.length} funding matches...`);
      const deletedMatches = await db.funding_matches.deleteMany({
        where: { organizationId: org.id },
      });
      console.log(`   ✅ Deleted ${deletedMatches.count} funding matches\n`);
    } else {
      console.log('ℹ️  No funding matches to delete\n');
    }

    // 3. Delete user subscriptions
    if (user.subscriptions) {
      console.log(`🗑️  Deleting user subscription...`);
      const deletedSub = await db.subscriptions.delete({
        where: { userId: user.id },
      });
      console.log(`   ✅ Deleted subscription (plan: ${deletedSub.plan})\n`);
    } else {
      console.log('ℹ️  No subscription to delete\n');
    }

    // 4. Clear user's organizationId
    console.log('🔄 Clearing user organizationId...');
    await db.user.update({
      where: { id: user.id },
      data: { organizationId: null },
    });
    console.log('   ✅ User organizationId cleared\n');

    // 5. Delete organization
    console.log('🗑️  Deleting organization...');
    await db.organizations.delete({
      where: { id: org.id },
    });
    console.log('   ✅ Organization deleted\n');

    // 6. Verify cleanup
    console.log('✅ CLEANUP COMPLETE!\n');
    console.log('📋 Verification:');

    const verifyUser = await db.user.findUnique({
      where: { id: user.id },
      select: { id: true, name: true, email: true, organizationId: true },
    });

    console.log(`   User: ${verifyUser?.name} (${verifyUser?.email})`);
    console.log(`   organizationId: ${verifyUser?.organizationId || 'null ✅'}\n`);

    const remainingOrgs = await db.organizations.findMany({
      where: { name: { contains: 'innowave', mode: 'insensitive' } },
    });
    console.log(`   Remaining Innowave orgs: ${remainingOrgs.length} ✅\n`);

    console.log('🎉 You can now test the profile creation page!\n');
    console.log('📍 Navigate to: http://localhost:3000/dashboard/profile/create\n');

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

cleanupInnovaveProfile();
