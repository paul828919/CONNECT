/**
 * Email Delivery Test Script
 *
 * Tests AWS SES SMTP configuration by sending all 3 email templates:
 * 1. New match notification
 * 2. Deadline reminder
 * 3. Weekly digest
 *
 * Usage:
 *   1. Configure AWS SES credentials in .env.local
 *   2. Verify sender email in AWS SES Console
 *   3. Run: npx tsx scripts/test-email-delivery.ts
 */

// IMPORTANT: Load environment variables BEFORE any imports
// This ensures emailConfig reads the correct values
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });

import { PrismaClient } from '@prisma/client';
import { emailTransporter, emailConfig } from '@/lib/email/config';
import { sendNewMatchNotification, sendDeadlineReminder, sendWeeklyDigest } from '@/lib/email/notifications';

const prisma = new PrismaClient();

async function testEmailDelivery() {
  console.log('\n🧪 Testing Email Delivery via AWS SES\n');
  console.log('='.repeat(60));

  try {
    // Step 1: Verify SMTP connection
    console.log('\n📡 Step 1: Verifying SMTP connection...');
    console.log('   Host:', process.env.SMTP_HOST);
    console.log('   Port:', process.env.SMTP_PORT);
    console.log('   User:', process.env.SMTP_USER?.substring(0, 10) + '...');
    console.log('   From:', emailConfig.from.address);

    await emailTransporter.verify();
    console.log('   ✅ SMTP connection successful!');

    // Step 2: Find or create test data
    console.log('\n📊 Step 2: Preparing test data...');

    // Find a user (or use first user)
    const user = await prisma.user.findFirst({
      include: {
        organization: true,
      },
    });

    if (!user || !user.organization) {
      console.log('   ⚠️  No user found. Creating test user...');
      throw new Error('No test user found. Please run database seed first: npm run db:seed');
    }

    console.log('   User:', user.name);
    console.log('   Email:', user.email);
    console.log('   Organization:', user.organization.name);

    // Find funding programs
    const programs = await prisma.fundingProgram.findMany({
      take: 3,
      orderBy: { deadline: 'asc' },
    });

    console.log('   Programs found:', programs.length);

    if (programs.length === 0) {
      throw new Error('No funding programs found. Please run database seed first: npm run db:seed');
    }

    // Step 3: Test New Match Notification
    console.log('\n📧 Step 3: Sending New Match Notification...');
    try {
      await sendNewMatchNotification(
        user.id,
        programs[0].id,
        85, // High match score
        {
          industryScore: 25,
          trlScore: 20,
          typeScore: 20,
          experienceScore: 12,
          deadlineScore: 8,
        },
        [
          '귀하의 기술 분야와 프로그램 키워드가 정확히 일치합니다.',
          '기술성숙도(TRL)가 프로그램 요구사항에 완벽히 부합합니다.',
          '지원 마감일이 2주 이내입니다. 서둘러 준비하세요.',
        ]
      );
      console.log('   ✅ New match notification sent!');
    } catch (error: any) {
      console.log('   ❌ Failed:', error.message);
      throw error;
    }

    // Step 4: Test Deadline Reminder
    console.log('\n⏰ Step 4: Sending Deadline Reminder...');
    try {
      await sendDeadlineReminder(user.id, programs.slice(0, 2).map(p => p.id));
      console.log('   ✅ Deadline reminder sent!');
    } catch (error: any) {
      console.log('   ❌ Failed:', error.message);
      throw error;
    }

    // Step 5: Test Weekly Digest
    console.log('\n📬 Step 5: Sending Weekly Digest...');
    try {
      // Create mock matches for digest
      const mockMatches = await Promise.all(
        programs.slice(0, 3).map(async (program) => {
          const match = await prisma.fundingMatch.findFirst({
            where: {
              organizationId: user.organizationId!,
              programId: program.id,
            },
            include: {
              program: true,
            },
          });

          // If no match exists, create one
          if (!match) {
            return await prisma.fundingMatch.create({
              data: {
                organizationId: user.organizationId!,
                programId: program.id,
                totalScore: 75,
                industryScore: 20,
                trlScore: 15,
                typeScore: 20,
                experienceScore: 12,
                deadlineScore: 8,
                explanation: '테스트 매칭입니다.',
                matchedAt: new Date(),
              },
              include: {
                program: true,
              },
            });
          }

          return match;
        })
      );

      await sendWeeklyDigest(user.id);
      console.log('   ✅ Weekly digest sent!');
    } catch (error: any) {
      console.log('   ❌ Failed:', error.message);
      throw error;
    }

    // Success summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ All email tests passed!');
    console.log('='.repeat(60));
    console.log('\n📬 Check your inbox:', user.email);
    console.log('\nYou should receive 3 emails:');
    console.log('  1. 🎯 New Match Notification (85점 매칭)');
    console.log('  2. ⏰ Deadline Reminder (2 programs)');
    console.log('  3. 📊 Weekly Digest Summary\n');

    console.log('💡 If emails are not in inbox:');
    console.log('  - Check spam/junk folder');
    console.log('  - Verify sender email is verified in AWS SES');
    console.log('  - Check AWS SES Console → Sending Statistics');
    console.log('  - If in sandbox mode, recipient must also be verified\n');

  } catch (error: any) {
    console.log('\n❌ Email delivery test failed!\n');
    console.error('Error:', error.message);

    if (error.code === 'EAUTH') {
      console.log('\n🔧 Troubleshooting SMTP Authentication:');
      console.log('  1. Check SMTP_USER and SMTP_PASSWORD in .env.local');
      console.log('  2. Verify credentials in AWS SES Console → SMTP settings');
      console.log('  3. Ensure IAM user has SES sending permissions');
    } else if (error.code === 'MessageRejected') {
      console.log('\n🔧 Troubleshooting Message Rejection:');
      console.log('  1. Verify sender email in AWS SES Console');
      console.log('  2. If in sandbox mode, verify recipient email too');
      console.log('  3. Check AWS SES Console → Sending Statistics → Bounces');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\n🔧 Troubleshooting Connection:');
      console.log('  1. Check SMTP_HOST is correct (email-smtp.ap-northeast-2.amazonaws.com)');
      console.log('  2. Check SMTP_PORT is 587');
      console.log('  3. Verify network/firewall allows outbound SMTP');
    }

    console.log('\n📖 AWS SES Setup Guide:');
    console.log('  https://docs.aws.amazon.com/ses/latest/dg/smtp-credentials.html\n');

    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testEmailDelivery();
