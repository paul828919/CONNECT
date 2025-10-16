import { emailTransporter, emailConfig } from '../lib/email/config';

async function testEmailSystem() {
  console.log('🧪 Testing email configuration...\n');

  // Test 1: SMTP connection
  try {
    await emailTransporter.verify();
    console.log('✅ SMTP connection verified');
    console.log('   From:', emailConfig.from.address);
    console.log('   Name:', emailConfig.from.name);
    console.log('   Reply-To:', emailConfig.replyTo);
  } catch (error) {
    console.error('❌ SMTP connection failed:', error);
    process.exit(1);
  }

  // Test 2: Send test email
  try {
    const result = await emailTransporter.sendMail({
      from: `${emailConfig.from.name} <${emailConfig.from.address}>`,
      to: 'kbj20415@gmail.com', // Send to yourself
      subject: '[TEST] Connect Platform Email System',
      text: 'This is a test email from support@connectplt.kr',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">✅ Email System Test</h2>
          <p>AWS SES configuration with <strong>support@connectplt.kr</strong> is working correctly!</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>From:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${emailConfig.from.address}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Name:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${emailConfig.from.name}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Reply-To:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${emailConfig.replyTo}</td>
            </tr>
          </table>
          <p style="margin-top: 20px; color: #666;">Test sent: ${new Date().toISOString()}</p>
        </div>
      `
    });

    console.log('\n✅ Test email sent successfully');
    console.log('   Message ID:', result.messageId);
    console.log('\n📧 Check your inbox at kbj20415@gmail.com');
    console.log('   Look for email from: support@connectplt.kr\n');
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    process.exit(1);
  }
}

testEmailSystem().catch(console.error);
