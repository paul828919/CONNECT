/**
 * Billing Key Issue API
 *
 * POST /api/billing/issue - Exchange authKey for billingKey
 *
 * This endpoint is called after successful card authentication from Toss payment window.
 * It exchanges the temporary authKey for a permanent billingKey that can be used for
 * recurring charges.
 *
 * Flow:
 * 1. User completes card auth in Toss payment window
 * 2. Toss redirects to /billing/success with authKey and customerKey
 * 3. Client calls this API with authKey and customerKey
 * 4. Server calls Toss API to exchange authKey for billingKey
 * 5. Server stores billingKey in database for future charges
 *
 * Test Mode (TOSS_TEST_MODE=true):
 * - Returns mock billingKey without calling Toss API
 * - Useful for local development and UI testing
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { db } from '@/lib/db';

// Toss API response types
interface TossBillingKeyResponse {
  mId: string;
  customerKey: string;
  authenticatedAt: string;
  method: string;
  billingKey: string;
  card?: {
    issuerCode: string;
    acquirerCode: string;
    number: string;
    cardType: string;
    ownerType: string;
  };
}

interface TossErrorResponse {
  code: string;
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', message: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // 2. Parse request body
    const body = await request.json();
    const { authKey, customerKey } = body;

    // 3. Validate required fields
    if (!authKey || !customerKey) {
      return NextResponse.json(
        { error: 'Missing required fields: authKey, customerKey' },
        { status: 400 }
      );
    }

    // 4. Check if in test mode
    const isTestMode = process.env.TOSS_TEST_MODE === 'true';

    if (isTestMode) {
      // Test mode: Return mock response
      const mockBillingKey = `test_billing_key_${Date.now()}_${userId.slice(0, 8)}`;

      // Store mock billing key in database
      const existingSubscription = await db.subscriptions.findUnique({
        where: { userId },
      });

      if (existingSubscription) {
        await db.subscriptions.update({
          where: { userId },
          data: {
            tossBillingKey: mockBillingKey,
            tossCustomerId: customerKey,
            updatedAt: new Date(),
          },
        });
      }

      return NextResponse.json({
        success: true,
        mode: 'TEST',
        billingKey: mockBillingKey,
        customerKey,
        method: '카드',
        card: {
          issuerCode: 'TEST',
          number: '****-****-****-1234',
          cardType: '신용',
          ownerType: '개인',
        },
        message: '테스트 모드: 빌링키가 발급되었습니다.',
      });
    }

    // 5. Production mode: Call Toss Payments API
    const tossSecretKey = process.env.TOSS_SECRET_KEY;

    if (!tossSecretKey) {
      console.error('[BILLING] TOSS_SECRET_KEY not configured');
      return NextResponse.json(
        { error: 'Payment configuration error', message: '결제 설정이 완료되지 않았습니다.' },
        { status: 500 }
      );
    }

    // Toss API requires Base64 encoded "secretKey:" for Basic Auth
    const authToken = Buffer.from(`${tossSecretKey}:`).toString('base64');

    const tossResponse = await fetch(
      'https://api.tosspayments.com/v1/billing/authorizations/issue',
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          authKey,
          customerKey,
        }),
      }
    );

    if (!tossResponse.ok) {
      const errorData: TossErrorResponse = await tossResponse.json().catch(() => ({
        code: 'UNKNOWN',
        message: '알 수 없는 오류가 발생했습니다.',
      }));

      console.error('[BILLING] Toss API error:', {
        status: tossResponse.status,
        code: errorData.code,
        message: errorData.message,
      });

      return NextResponse.json(
        {
          error: errorData.code,
          message: errorData.message || '빌링키 발급에 실패했습니다.',
        },
        { status: tossResponse.status }
      );
    }

    const billingData: TossBillingKeyResponse = await tossResponse.json();

    // 6. Store billing key in database
    const existingSubscription = await db.subscriptions.findUnique({
      where: { userId },
    });

    if (existingSubscription) {
      await db.subscriptions.update({
        where: { userId },
        data: {
          tossBillingKey: billingData.billingKey,
          tossCustomerId: billingData.customerKey,
          updatedAt: new Date(),
        },
      });
    }

    // 7. Return success response
    return NextResponse.json({
      success: true,
      billingKey: billingData.billingKey,
      customerKey: billingData.customerKey,
      mId: billingData.mId,
      method: billingData.method,
      authenticatedAt: billingData.authenticatedAt,
      card: billingData.card,
    });
  } catch (error) {
    console.error('[BILLING] Issue error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: '빌링키 발급 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}
