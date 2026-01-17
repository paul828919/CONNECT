import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDuplicatePayments() {
  // Find user
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { name: { contains: '김병진' } },
        { email: { contains: 'kbj' } },
        { organization: { name: { contains: '이노웨이브' } } }
      ]
    },
    include: {
      organization: true,
      subscriptions: {
        include: {
          payments: {
            orderBy: { createdAt: 'desc' }
          }
        }
      }
    }
  });

  if (!user) {
    console.log('User not found');
    await prisma.$disconnect();
    return;
  }

  console.log('=== User Info ===');
  console.log('Name:', user.name);
  console.log('Email:', user.email);
  console.log('Organization:', user.organization?.name);
  console.log('');

  if (!user.subscriptions) {
    console.log('No subscriptions found');
    await prisma.$disconnect();
    return;
  }

  const sub = user.subscriptions;
  console.log('=== Subscription ===');
  console.log('ID:', sub.id);
  console.log('Plan:', sub.plan);
  console.log('Status:', sub.status);
  console.log('BillingCycle:', sub.billingCycle);
  console.log('Amount:', sub.amount);
  console.log('');
  console.log('=== Payments (' + sub.payments.length + ' total) ===');

  // Count by status
  const statusCounts: Record<string, number> = {};
  for (const p of sub.payments) {
    statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
  }
  console.log('Status counts:', statusCounts);
  console.log('');

  // Show all payments with timestamps
  console.log('Payment details:');
  for (const p of sub.payments) {
    console.log(`  [${p.status}] ${p.id} - ${p.amount}원 - ${p.createdAt.toISOString()} - Order: ${p.tossOrderId || 'N/A'}`);
  }

  await prisma.$disconnect();
}

checkDuplicatePayments().catch(console.error);
