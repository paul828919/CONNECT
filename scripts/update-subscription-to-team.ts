/**
 * Update Kim Byungjin (Innowave) subscription to Team Plan without recurring payments
 *
 * Usage:
 *   For production: DATABASE_URL="..." npx tsx scripts/update-subscription-to-team.ts
 *   For local: npx tsx scripts/update-subscription-to-team.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateSubscriptionToTeam() {
  const targetEmail = 'kbj20415@gmail.com';

  console.log('=== Update Subscription to Team Plan (No Recurring) ===\n');

  // Find the user
  const user = await prisma.user.findFirst({
    where: { email: targetEmail },
    include: {
      organization: true,
      subscriptions: true
    }
  });

  if (!user) {
    console.log(`❌ User not found with email: ${targetEmail}`);
    await prisma.$disconnect();
    return;
  }

  console.log('Found user:');
  console.log(`  Name: ${user.name}`);
  console.log(`  Email: ${user.email}`);
  console.log(`  Role: ${user.role}`);
  console.log(`  Organization: ${user.organization?.name || 'None'}`);
  console.log('');

  // Check current subscription
  if (user.subscriptions) {
    console.log('Current subscription:');
    console.log(`  Plan: ${user.subscriptions.plan}`);
    console.log(`  Status: ${user.subscriptions.status}`);
    console.log(`  Billing Cycle: ${user.subscriptions.billingCycle}`);
    console.log(`  Amount: ${user.subscriptions.amount.toLocaleString()}원`);
    console.log(`  Started At: ${user.subscriptions.startedAt.toISOString()}`);
    console.log(`  Expires At: ${user.subscriptions.expiresAt.toISOString()}`);
    console.log(`  Next Billing Date: ${user.subscriptions.nextBillingDate?.toISOString() || 'None'}`);
    console.log(`  Has Billing Key: ${user.subscriptions.tossBillingKey ? 'Yes' : 'No'}`);
    console.log('');
  }

  // Calculate new expiration date (10 years from now for admin testing - prevents expiration concerns)
  const startDate = new Date();
  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 10);

  // Safe admin testing configuration - ₩0 prevents any accidental charges
  const TEAM_ANNUAL_AMOUNT = 0;

  if (user.subscriptions) {
    // Update existing subscription
    const updated = await prisma.subscriptions.update({
      where: { id: user.subscriptions.id },
      data: {
        plan: 'TEAM',
        status: 'ACTIVE',
        billingCycle: 'ANNUAL',
        amount: TEAM_ANNUAL_AMOUNT,
        startedAt: startDate,
        expiresAt: expiresAt,
        // Remove recurring payment setup
        nextBillingDate: null,
        tossBillingKey: null,
        tossCustomerId: null,
        canceledAt: null,
        cancellationReason: null,
        // Mark as admin/beta subscription for safety
        isBetaUser: true,
        betaDiscount: 100,
      }
    });

    console.log('✅ Subscription updated successfully!');
    console.log('');
    console.log('New subscription details:');
    console.log(`  Plan: ${updated.plan}`);
    console.log(`  Status: ${updated.status}`);
    console.log(`  Billing Cycle: ${updated.billingCycle}`);
    console.log(`  Amount: ${updated.amount.toLocaleString()}원`);
    console.log(`  Started At: ${updated.startedAt.toISOString()}`);
    console.log(`  Expires At: ${updated.expiresAt.toISOString()}`);
    console.log(`  Next Billing Date: ${updated.nextBillingDate?.toISOString() || 'None (no recurring)'}`);
    console.log(`  Has Billing Key: ${updated.tossBillingKey ? 'Yes' : 'No'}`);
    console.log(`  Is Beta User: ${updated.isBetaUser ? 'Yes' : 'No'}`);
    console.log(`  Beta Discount: ${updated.betaDiscount ?? 'None'}%`);
  } else {
    // Create new subscription
    const created = await prisma.subscriptions.create({
      data: {
        userId: user.id,
        plan: 'TEAM',
        status: 'ACTIVE',
        billingCycle: 'ANNUAL',
        amount: TEAM_ANNUAL_AMOUNT,
        startedAt: startDate,
        expiresAt: expiresAt,
        // No recurring payment setup
        nextBillingDate: null,
        tossBillingKey: null,
        tossCustomerId: null,
        // Mark as admin/beta subscription for safety
        isBetaUser: true,
        betaDiscount: 100,
      }
    });

    console.log('✅ Subscription created successfully!');
    console.log('');
    console.log('New subscription details:');
    console.log(`  Plan: ${created.plan}`);
    console.log(`  Status: ${created.status}`);
    console.log(`  Billing Cycle: ${created.billingCycle}`);
    console.log(`  Amount: ${created.amount.toLocaleString()}원`);
    console.log(`  Started At: ${created.startedAt.toISOString()}`);
    console.log(`  Expires At: ${created.expiresAt.toISOString()}`);
    console.log(`  Next Billing Date: None (no recurring)`);
    console.log(`  Has Billing Key: No`);
    console.log(`  Is Beta User: ${created.isBetaUser ? 'Yes' : 'No'}`);
    console.log(`  Beta Discount: ${created.betaDiscount ?? 'None'}%`);
  }

  await prisma.$disconnect();
}

updateSubscriptionToTeam().catch(async (error) => {
  console.error('Error:', error);
  await prisma.$disconnect();
  process.exit(1);
});
