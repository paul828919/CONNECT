/**
 * Simple SMTP Credential Test
 * Tests AWS SES SMTP credentials by sending a basic test email
 */

// Load env BEFORE any imports
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import nodemailer from 'nodemailer';

async function testSMTPCredentials() {
  console.log('\n🧪 Testing AWS SES SMTP Credentials\n');
  console.log('='.repeat(60));

  // Log configuration (masked)
  console.log('\n📋 Configuration:');
  console.log('  Host:', process.env.SMTP_HOST);
  console.log('  Port:', process.env.SMTP_PORT);
  console.log('  Secure:', process.env.SMTP_SECURE);
  console.log('  User:', process.env.SMTP_USER?.substring(0, 12) + '...');
  console.log('  Password:', process.env.SMTP_PASSWORD ? '***' + process.env.SMTP_PASSWORD.substring(process.env.SMTP_PASSWORD.length - 4) : 'NOT SET');
  console.log('  From:', process.env.SMTP_FROM_EMAIL);

  // Check if credentials are set
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.log('\n❌ ERROR: SMTP credentials not found in .env.local!');
    console.log('   Please check:');
    console.log('   - SMTP_USER is set');
    console.log('   - SMTP_PASSWORD is set');
    process.exit(1);
  }

  // Create transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'email-smtp.ap-northeast-2.amazonaws.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
    debug: true, // Enable debug output
    logger: true, // Log to console
  });

  try {
    // Step 1: Verify connection
    console.log('\n📡 Step 1: Verifying SMTP connection...');
    await transporter.verify();
    console.log('   ✅ SMTP connection verified!');

    // Step 2: Send test email
    console.log('\n📧 Step 2: Sending test email...');
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'Connect Platform'}" <${process.env.SMTP_FROM_EMAIL}>`,
      to: process.env.SMTP_FROM_EMAIL, // Send to yourself
      subject: '✅ AWS SES SMTP Test - Success!',
      text: `This is a test email to verify AWS SES SMTP credentials.

Credentials tested:
- SMTP User: ${process.env.SMTP_USER}
- Region: ap-northeast-2 (Seoul)
- Timestamp: ${new Date().toISOString()}

If you received this email, your AWS SES SMTP configuration is working correctly!`,
      html: `<div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #10b981;">✅ AWS SES SMTP Test - Success!</h2>
        <p>This is a test email to verify AWS SES SMTP credentials.</p>

        <div style="background: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <strong>Credentials tested:</strong><br>
          • SMTP User: <code>${process.env.SMTP_USER}</code><br>
          • Region: ap-northeast-2 (Seoul)<br>
          • Timestamp: ${new Date().toISOString()}
        </div>

        <p>If you received this email, your AWS SES SMTP configuration is working correctly!</p>
      </div>`,
    });

    console.log('   ✅ Test email sent successfully!');
    console.log('   Message ID:', info.messageId);
    console.log('   Response:', info.response);

    // Success summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests passed! Your SMTP credentials work perfectly.');
    console.log('='.repeat(60));
    console.log('\n📬 Check your inbox:', process.env.SMTP_FROM_EMAIL);
    console.log('\n💡 If email is not in inbox:');
    console.log('  - Check spam/junk folder');
    console.log('  - Check AWS SES Console → Email sending → Sending statistics');
    console.log('  - If in sandbox mode, both sender and recipient must be verified\n');

  } catch (error: any) {
    console.log('\n❌ SMTP test failed!\n');
    console.error('Error:', error.message);
    console.error('Code:', error.code);

    if (error.code === 'EAUTH') {
      console.log('\n🔧 Authentication Failed - Troubleshooting:');
      console.log('  1. ✓ Check SMTP_USER matches AWS SES credentials');
      console.log('  2. ✓ Check SMTP_PASSWORD matches AWS SES credentials');
      console.log('  3. ✓ Ensure credentials are from SES Console (not IAM access keys)');
      console.log('  4. ✓ Verify IAM user has AmazonSesSendingAccess policy');
    } else if (error.code === 'MessageRejected') {
      console.log('\n🔧 Message Rejected - Troubleshooting:');
      console.log('  1. Verify sender email in AWS SES Console');
      console.log('  2. If in sandbox mode, verify recipient email too');
      console.log('  3. Check AWS SES sending statistics for bounces');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\n🔧 Connection Refused - Troubleshooting:');
      console.log('  1. Check SMTP_HOST is correct');
      console.log('  2. Check SMTP_PORT is 587');
      console.log('  3. Verify network/firewall allows outbound SMTP');
    }

    console.log('\n📖 AWS SES Documentation:');
    console.log('  https://docs.aws.amazon.com/ses/latest/dg/smtp-credentials.html\n');

    process.exit(1);
  }
}

// Run the test
testSMTPCredentials();
