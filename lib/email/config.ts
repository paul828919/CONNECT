/**
 * Email Configuration
 *
 * Configures nodemailer transporter for sending emails.
 * Supports multiple providers via SMTP (Gmail, SendGrid, AWS SES, etc.)
 */

import nodemailer from 'nodemailer';

// Create reusable transporter
export const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

// Verify SMTP connection on startup (only if credentials are configured)
if (process.env.NODE_ENV === 'production' && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
  emailTransporter.verify((error, success) => {
    if (error) {
      console.error('❌ SMTP connection failed:', error);
    } else {
      console.log('✓ SMTP server is ready to send emails');
    }
  });
} else if (process.env.NODE_ENV === 'production') {
  console.log('⚠️  SMTP credentials not configured - email notifications disabled');
}

// Email sender configuration
export const emailConfig = {
  from: {
    name: process.env.SMTP_FROM_NAME || 'Connect',
    address: process.env.SMTP_FROM_EMAIL || 'noreply@connectplt.kr',
  },
  replyTo: process.env.SMTP_REPLY_TO || 'support@connectplt.kr',
};

// Email templates base URL
export const emailBaseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
