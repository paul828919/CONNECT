/**
 * Simple SMTP Connection Test
 * Tests AWS SES SMTP credentials before sending actual emails
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });

import nodemailer from 'nodemailer';

async function testSMTPConnection() {
  console.log('\n🧪 Testing AWS SES SMTP Connection\n');
  console.log('='.repeat(60));

  // Debug: Print environment variables
  console.log('\n📋 Environment Variables:');
  console.log('  SMTP_HOST:', process.env.SMTP_HOST);
  console.log('  SMTP_PORT:', process.env.SMTP_PORT);
  console.log('  SMTP_SECURE:', process.env.SMTP_SECURE);
  console.log('  SMTP_USER:', process.env.SMTP_USER?.substring(0, 10) + '...');
  console.log('  SMTP_PASSWORD:', process.env.SMTP_PASSWORD ? '***' + process.env.SMTP_PASSWORD.substring(process.env.SMTP_PASSWORD.length - 4) : 'NOT SET');
  console.log('  SMTP_FROM_EMAIL:', process.env.SMTP_FROM_EMAIL);
  console.log('  SMTP_FROM_NAME:', process.env.SMTP_FROM_NAME);

  // Create transporter
  console.log('\n📡 Creating SMTP transporter...');
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'email-smtp.ap-northeast-2.amazonaws.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  try {
    // Verify connection
    console.log('  Verifying SMTP connection...');
    await transporter.verify();
    console.log('  ✅ SMTP connection successful!');

    // Send test email
    console.log('\n📧 Sending test email...');
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'Connect Platform'}" <${process.env.SMTP_FROM_EMAIL || 'kbj20415@gmail.com'}>`,
      to: process.env.SMTP_FROM_EMAIL || 'kbj20415@gmail.com', // Send to yourself in sandbox mode
      subject: '✅ AWS SES Test Email - Connection Successful',
      text: 'This is a test email from Connect Platform.\n\nIf you receive this, your AWS SES SMTP configuration is working correctly!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #10b981;">✅ AWS SES Test Successful!</h2>
          <p>This is a test email from <strong>Connect Platform</strong>.</p>
          <p>If you receive this, your AWS SES SMTP configuration is working correctly!</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px;">
            <strong>Configuration Details:</strong><br>
            SMTP Host: ${process.env.SMTP_HOST}<br>
            SMTP Port: ${process.env.SMTP_PORT}<br>
            From Email: ${process.env.SMTP_FROM_EMAIL}
          </p>
        </div>
      `,
    });

    console.log('  ✅ Test email sent successfully!');
    console.log('  Message ID:', info.messageId);

    console.log('\n' + '='.repeat(60));
    console.log('✅ AWS SES SMTP Connection Test Passed!');
    console.log('='.repeat(60));
    console.log('\n📬 Check your inbox:', process.env.SMTP_FROM_EMAIL);
    console.log('\nIf you don\'t see the email:');
    console.log('  - Check your spam/junk folder');
    console.log('  - Wait a few minutes (AWS SES can take 1-2 minutes)');
    console.log('  - Check AWS SES Console → Sending Statistics\n');

  } catch (error: any) {
    console.log('\n❌ SMTP Connection Failed!\n');
    console.error('Error:', error.message);

    if (error.code === 'EAUTH') {
      console.log('\n🔧 Troubleshooting SMTP Authentication:');
      console.log('  1. Verify SMTP_USER starts with AKIA (not your AWS access key)');
      console.log('  2. Verify SMTP_PASSWORD is the SMTP password (not secret access key)');
      console.log('  3. Check credentials in AWS SES Console → SMTP settings');
      console.log('  4. Try regenerating SMTP credentials if needed');
    } else if (error.code === 'MessageRejected') {
      console.log('\n🔧 Troubleshooting Message Rejection:');
      console.log('  1. Verify sender email is verified in AWS SES Console');
      console.log('  2. In sandbox mode, recipient must also be verified');
      console.log('  3. Check AWS SES Console → Verified identities');
    }

    console.log('\n📖 AWS SES Documentation:');
    console.log('  https://docs.aws.amazon.com/ses/latest/dg/smtp-credentials.html\n');

    process.exit(1);
  }
}

testSMTPConnection();
