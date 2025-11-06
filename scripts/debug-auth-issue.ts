/**
 * Debug Script: Authentication & Organization Profile Issue
 *
 * Investigates why a user who previously had an organization profile
 * is now being redirected to the profile creation page.
 *
 * This script checks:
 * 1. All users in the database
 * 2. Their organization relationships
 * 3. Organization data completeness
 * 4. NextAuth session data structure
 */

import { db } from '@/lib/db';

async function debugAuthIssue() {
  console.log('🔍 Debugging Authentication & Organization Profile Issue\n');
  console.log('=' .repeat(80));

  try {
    // 1. Check all users in the database
    console.log('\n📋 Step 1: Checking all users...\n');
    const users = await db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        organizationId: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log(`Found ${users.length} user(s):\n`);
    users.forEach((user, index) => {
      console.log(`User #${index + 1}:`);
      console.log(`  ID: ${user.id}`);
      console.log(`  Name: ${user.name}`);
      console.log(`  Email: ${user.email || 'N/A'}`);
      console.log(`  Organization ID: ${user.organizationId || '❌ NULL (NO ORGANIZATION)'}`);
      console.log(`  Role: ${user.role}`);
      console.log(`  Created: ${user.createdAt.toISOString()}`);
      console.log('');
    });

    // 2. Check all organizations in the database
    console.log('\n📋 Step 2: Checking all organizations...\n');
    const organizations = await db.organizations.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        businessNumberHash: true,
        industrySector: true,
        employeeCount: true,
        profileScore: true,
        createdAt: true,
        users: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log(`Found ${organizations.length} organization(s):\n`);
    organizations.forEach((org, index) => {
      console.log(`Organization #${index + 1}:`);
      console.log(`  ID: ${org.id}`);
      console.log(`  Name: ${org.name}`);
      console.log(`  Type: ${org.type}`);
      console.log(`  Industry: ${org.industrySector}`);
      console.log(`  Employees: ${org.employeeCount}`);
      console.log(`  Profile Score: ${org.profileScore}`);
      console.log(`  Created: ${org.createdAt.toISOString()}`);
      console.log(`  Users (${org.users.length}):`);
      if (org.users.length > 0) {
        org.users.forEach(user => {
          console.log(`    - ${user.name} (${user.email || 'no email'}) [ID: ${user.id}]`);
        });
      } else {
        console.log(`    ⚠️  No users linked to this organization!`);
      }
      console.log('');
    });

    // 3. Check for orphaned data (users without org, orgs without users)
    console.log('\n📋 Step 3: Checking for data consistency issues...\n');

    const usersWithoutOrg = users.filter(u => !u.organizationId);
    const orgsWithoutUsers = organizations.filter(o => o.users.length === 0);

    if (usersWithoutOrg.length > 0) {
      console.log(`⚠️  Found ${usersWithoutOrg.length} user(s) without organization:`);
      usersWithoutOrg.forEach(user => {
        console.log(`  - ${user.name} (${user.email || 'no email'}) [ID: ${user.id}]`);
      });
      console.log('');
    } else {
      console.log('✅ All users have organizations linked\n');
    }

    if (orgsWithoutUsers.length > 0) {
      console.log(`⚠️  Found ${orgsWithoutUsers.length} organization(s) without users:`);
      orgsWithoutUsers.forEach(org => {
        console.log(`  - ${org.name} [ID: ${org.id}]`);
      });
      console.log('');
    } else {
      console.log('✅ All organizations have users linked\n');
    }

    // 4. Check if there are any accounts (OAuth) associated with users
    console.log('\n📋 Step 4: Checking OAuth accounts...\n');
    const accounts = await db.account.findMany({
      select: {
        id: true,
        userId: true,
        type: true,
        provider: true,
        providerAccountId: true,
        user: {
          select: {
            name: true,
            email: true,
            organizationId: true,
          },
        },
      },
    });

    console.log(`Found ${accounts.length} OAuth account(s):\n`);
    accounts.forEach((account, index) => {
      console.log(`Account #${index + 1}:`);
      console.log(`  Provider: ${account.provider.toUpperCase()}`);
      console.log(`  Provider Account ID: ${account.providerAccountId}`);
      console.log(`  User ID: ${account.userId}`);
      console.log(`  User Name: ${account.user.name}`);
      console.log(`  User Email: ${account.user.email || 'N/A'}`);
      console.log(`  User Org ID: ${account.user.organizationId || '❌ NULL'}`);
      console.log('');
    });

    // 5. Root cause analysis
    console.log('\n' + '='.repeat(80));
    console.log('\n🔍 ROOT CAUSE ANALYSIS:\n');

    if (users.length === 0) {
      console.log('❌ ISSUE: No users found in database!');
      console.log('   Possible causes:');
      console.log('   - Database was reset during schema migration');
      console.log('   - Database connection is pointing to wrong database');
      console.log('   - Data was manually deleted');
    } else if (usersWithoutOrg.length > 0 && organizations.length > 0) {
      console.log('❌ ISSUE: User-Organization relationship is broken!');
      console.log('   Possible causes:');
      console.log('   - User.organizationId field was set to null');
      console.log('   - Database migration reset the organizationId column');
      console.log('   - Manual data modification broke the relationship');
      console.log('\n   💡 SOLUTION:');
      console.log('   If you recognize which organization belongs to which user,');
      console.log('   you can fix this by running:');
      console.log('   ```');
      console.log('   UPDATE user SET organizationId = \'<org-id>\' WHERE id = \'<user-id>\';');
      console.log('   ```');
    } else if (organizations.length === 0 && users.length > 0) {
      console.log('❌ ISSUE: All organization data was deleted!');
      console.log('   Possible causes:');
      console.log('   - Database was partially reset during schema migration');
      console.log('   - Organizations table was truncated');
      console.log('   - Cascade deletion removed organizations');
      console.log('\n   💡 SOLUTION:');
      console.log('   You will need to recreate the organization profile.');
    } else if (users.length > 0 && organizations.length > 0 && usersWithoutOrg.length === 0) {
      console.log('✅ Database looks healthy!');
      console.log('   All users have organizations linked.');
      console.log('\n   ❓ If you\'re still being redirected to profile creation,');
      console.log('   the issue is likely in the SESSION, not the database.');
      console.log('\n   💡 SOLUTION:');
      console.log('   1. Sign out completely');
      console.log('   2. Clear browser cookies (especially next-auth.session-token)');
      console.log('   3. Sign in again');
      console.log('   4. Check if session.user.organizationId is populated');
    } else {
      console.log('⚠️  Unknown state. Review the data above manually.');
    }

    console.log('\n' + '='.repeat(80));

  } catch (error) {
    console.error('❌ Error during debug:', error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

debugAuthIssue()
  .then(() => {
    console.log('\n✅ Debug script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Debug script failed:', error);
    process.exit(1);
  });
