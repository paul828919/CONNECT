/**
 * Simple SMTP Connection Test
 * Tests AWS SES SMTP directly without any app imports
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import nodemailer from 'nodemailer';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function testSMTPConnection() {
  console.log('\n🔍 SMTP Configuration Test\n');
  console.log('='.repeat(60));

  // Display configuration
  console.log('\nEnvironment Variables:');
  console.log('  SMTP_HOST:', process.env.SMTP_HOST);
  console.log('  SMTP_PORT:', process.env.SMTP_PORT);
  console.log('  SMTP_SECURE:', process.env.SMTP_SECURE);
  console.log('  SMTP_USER:', process.env.SMTP_USER?.substring(0, 15) + '...');
  console.log('  SMTP_PASSWORD:', process.env.SMTP_PASSWORD ? `SET (${process.env.SMTP_PASSWORD.length} chars)` : 'NOT SET');
  console.log('  SMTP_FROM_EMAIL:', process.env.SMTP_FROM_EMAIL);
  console.log('  SMTP_FROM_NAME:', process.env.SMTP_FROM_NAME);
  console.log('');

  // Check if credentials are set
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.error('❌ ERROR: SMTP_USER or SMTP_PASSWORD not set!');
    console.error('   Please check .env.local file');
    process.exit(1);
  }

  // Create transporter
  const transporter = nodemailer.createTransporter({
    host: process.env.SMTP_HOST || 'email-smtp.ap-northeast-2.amazonaws.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
    logger: true, // Enable logging
    debug: true,  // Enable debug output
  });

  try {
    console.log('📡 Testing SMTP connection...\n');
    await transporter.verify();
    console.log('\n✅ SMTP connection successful!');
    console.log('   AWS SES is ready to send emails\n');

    // Try sending test email
    console.log('📧 Sending test email...\n');
    const info = await transporter.sendMail({
      from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
      to: 'kbj20415@gmail.com',
      subject: '[TEST] SMTP Connection Test',
      text: 'This is a simple SMTP test from Connect platform.',
      html: `
        <div style="font-family: sans-serif; max-width: 600px;">
          <h2 style="color: #2563eb;">✅ SMTP Test Successful</h2>
          <p>AWS SES SMTP connection is working correctly!</p>
          <ul>
            <li><strong>Host:</strong> ${process.env.SMTP_HOST}</li>
            <li><strong>Port:</strong> ${process.env.SMTP_PORT}</li>
            <li><strong>From:</strong> ${process.env.SMTP_FROM_EMAIL}</li>
            <li><strong>Time:</strong> ${new Date().toISOString()}</li>
          </ul>
        </div>
      `,
    });

    console.log('✅ Test email sent successfully!');
    console.log('   Message ID:', info.messageId);
    console.log('   Response:', info.response);
    console.log('\n📬 Check inbox at: kbj20415@gmail.com\n');
    console.log('='.repeat(60));

  } catch (error: any) {
    console.error('\n❌ SMTP test failed!');
    console.error('   Error:', error.message);

    if (error.code) {
      console.error('   Code:', error.code);
    }

    console.log('\n🔧 Troubleshooting:');
    console.log('  1. Verify SMTP credentials in AWS SES Console');
    console.log('  2. Check IAM user has SES sending permissions');
    console.log('  3. Verify sender email is verified in AWS SES');
    console.log('  4. If in sandbox mode, recipient must be verified too');
    console.log('\n📖 AWS SES Guide: https://docs.aws.amazon.com/ses/latest/dg/smtp-credentials.html\n');
    console.log('='.repeat(60));

    process.exit(1);
  }
}

testSMTPConnection();
