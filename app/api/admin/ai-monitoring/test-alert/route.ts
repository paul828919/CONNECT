/**
 * AI Cost Monitoring - Test Alert API
 *
 * POST /api/admin/ai-monitoring/test-alert
 *
 * Sends a test budget alert email to verify email configuration
 * Admin-only endpoint for testing alert system
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { testAlertSystem } from '@/lib/ai/monitoring/budget-alerts';

export async function POST(request: NextRequest) {
  try {
    // 1. Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check if user is admin
    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // 3. Call test alert system
    await testAlertSystem();

    const response = {
      success: true,
      message: 'Test alert email sent successfully',
      timestamp: new Date().toISOString(),
      note: 'Check your email inbox for the test alert. If not received, verify SMTP configuration in .env',
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error('❌ Test alert error:', error);

    // Provide helpful error messages for common SMTP issues
    let errorMessage = 'Failed to send test alert';
    let errorDetails = error.message;

    if (error.message?.includes('SMTP')) {
      errorMessage = 'SMTP configuration error';
      errorDetails = 'Please verify SMTP settings in .env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD';
    } else if (error.message?.includes('timeout')) {
      errorMessage = 'Email sending timeout';
      errorDetails = 'Check SMTP server connectivity and firewall settings';
    } else if (error.message?.includes('authentication')) {
      errorMessage = 'SMTP authentication failed';
      errorDetails = 'Verify SMTP_USER and SMTP_PASSWORD credentials';
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: errorDetails,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
