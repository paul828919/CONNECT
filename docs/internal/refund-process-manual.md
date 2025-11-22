# Refund Process Manual (CS Team)

**Last Updated:** 2025-11-22 (KST)
**Audience:** Customer Success Team, Support Team, Admin Staff
**Status:** Production-ready

---

## Internal SLA Targets

**Goal:** Complete refunds faster than legal minimum (3 business days)

| Stage | Legal Requirement | Internal Target | Metric |
|-------|------------------|----------------|--------|
| **Review & Approval** | N/A | 1 business day | Time from request to admin decision |
| **PG Submission** | 3 business days | 1 business day | Time from approval to Toss Payments API call |
| **Total Time** | 3 business days | 2 business days | End-to-end refund completion |

**⚠️ Legal Penalty:** Delays beyond 3 business days = 15% annual interest (전자상거래법 제18조)

---

## Refund Decision Matrix

### Scenario 1: Within 7 Days (Simple Cancellation)

**Trigger:** User requests refund ≤ 7 days from purchase date

**Decision:** ✅ Auto-approve (statutory right)

**Email Template:**
```
Subject: [Connect] 환불 승인 완료 (Refund Approved)

안녕하세요, Connect 고객지원팀입니다.

귀하의 환불 요청이 승인되었습니다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 환불 정보 (Refund Details)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 플랜: {PLAN_NAME} ({BILLING_CYCLE})
• 결제 금액: ₩{TOTAL_PAID}
• 환불 금액: ₩{REFUND_AMOUNT} (전액 환불)
• 환불 사유: 7일 이내 전액 환불 (법정 청약철회권)
• 처리 예정일: {COMPLETION_DATE}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏱️ 환불 처리 일정 (Processing Timeline)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. 승인 완료: {APPROVAL_DATE} ✅
2. PG사 전송: {PG_SUBMISSION_DATE} (예정)
3. 입금 완료: {EXPECTED_COMPLETION} (예정)

실제 입금 시점은 카드사/은행 처리 시간에 따라 다를 수 있습니다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

문의 사항이 있으시면 언제든지 연락 주세요.

감사합니다.

Connect 고객지원팀
📧 support@connectplt.kr
```

**Admin Action:**
1. Mark status as `APPROVED`
2. Call `calculateAnnualRefund()` or `calculateMonthlyRefund()` (auto-returns full refund)
3. Save calculation to `calculationJson`
4. Submit to Toss Payments API
5. Send email

---

### Scenario 2: Annual Plan, 8+ Days, Normal Cancellation

**Trigger:** User requests refund >7 days from purchase, no service issues

**Decision:** ✅ Approve with 10% penalty (contractual)

**Calculator Usage:**
```typescript
import { calculateAnnualRefund } from '@/lib/refund-calculator';

const result = calculateAnnualRefund(
  490000,                              // totalPaid (Pro plan)
  new Date('2025-01-01'),              // purchaseDate
  new Date('2026-01-01'),              // contractEndDate
  new Date('2025-01-30'),              // requestDate (30 days used)
  { statutory: false }                 // No statutory mode
);

// Result:
// {
//   totalPaid: 490000,
//   usedDays: 30,
//   totalDays: 365,
//   usedAmount: 40274,
//   remainingAmount: 449726,
//   penalty: 44973,                   // 10% of remaining
//   refundAmount: 404753,
//   eligible: true,
//   mode: 'CONTRACTUAL',
//   reason: '일할 계산 + 10% 위약금 차감',
//   breakdown: {
//     calculation: '₩490,000 - ₩40,274 (사용) - ₩44,973 (위약금 10%) = ₩404,753',
//     formula: 'Total - (Total × UsedDays / TotalDays) - (Remaining × 10%)'
//   }
// }
```

**Email Template:**
```
Subject: [Connect] 환불 승인 완료 (Refund Approved)

안녕하세요, Connect 고객지원팀입니다.

귀하의 환불 요청이 승인되었습니다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 환불 정보 (Refund Details)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 플랜: {PLAN_NAME} (연간)
• 결제 금액: ₩{TOTAL_PAID}
• 사용 기간: {USED_DAYS}일 / {TOTAL_DAYS}일
• 환불 계산:
  - 사용 금액: ₩{USED_AMOUNT}
  - 잔여 금액: ₩{REMAINING_AMOUNT}
  - 위약금 (10%): ₩{PENALTY}
• 환불 금액: ₩{REFUND_AMOUNT}
• 환불 사유: 일할 계산 + 10% 위약금 차감
• 처리 예정일: {COMPLETION_DATE}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 환불 계산식
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{BREAKDOWN_CALCULATION}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

이용약관에 따라 7일 경과 후 계약 해지 시 10% 위약금이 적용됩니다.
자세한 내용은 환불 정책(https://connectplt.kr/refund-policy)을 참조하세요.

문의 사항이 있으시면 언제든지 연락 주세요.

감사합니다.

Connect 고객지원팀
📧 support@connectplt.kr
```

---

### Scenario 3: Service Issue (Statutory Cancellation)

**Trigger:** Service outage, billing error, contract mismatch, duplicate payment

**Decision:** ✅ Auto-approve (no penalty, statutory right)

**Calculator Usage:**
```typescript
import { calculateAnnualRefund } from '@/lib/refund-calculator';

const result = calculateAnnualRefund(
  490000,                              // totalPaid
  new Date('2025-01-01'),              // purchaseDate
  new Date('2026-01-01'),              // contractEndDate
  new Date('2025-06-15'),              // requestDate (165 days used)
  { statutory: true }                  // ✅ Statutory mode = NO PENALTY
);

// Result:
// {
//   totalPaid: 490000,
//   usedDays: 165,
//   totalDays: 365,
//   usedAmount: 221507,
//   remainingAmount: 268493,
//   penalty: 0,                        // ✅ NO PENALTY
//   refundAmount: 268493,
//   eligible: true,
//   mode: 'STATUTORY',
//   reason: '법정 계약해제 (사업자 귀책)',
//   breakdown: {
//     calculation: '총액(₩490,000) - 사용분(₩221,507) = ₩268,493',
//     formula: 'Statutory cancellation = Total - Used (no penalty)'
//   }
// }
```

**Email Template:**
```
Subject: [Connect] 환불 승인 완료 - 서비스 이슈 (Refund Approved - Service Issue)

안녕하세요, Connect 고객지원팀입니다.

서비스 이용 중 불편을 드려 대단히 죄송합니다.
귀하의 환불 요청이 승인되었으며, 법정 계약해제 사유로 위약금 없이 처리됩니다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 환불 정보 (Refund Details)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 플랜: {PLAN_NAME} ({BILLING_CYCLE})
• 결제 금액: ₩{TOTAL_PAID}
• 사용 기간: {USED_DAYS}일 / {TOTAL_DAYS}일
• 환불 계산:
  - 사용 금액: ₩{USED_AMOUNT}
  - 위약금: ₩0 (법정 계약해제 사유)
• 환불 금액: ₩{REFUND_AMOUNT}
• 환불 사유: {REASON_CATEGORY} - 법정 계약해제 (사업자 귀책)
• 처리 예정일: {COMPLETION_DATE}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 환불 계산식
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{BREAKDOWN_CALCULATION}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

전자상거래법에 따라 서비스 장애·오류 등 사업자 귀책 사유의 경우
위약금 없이 사용 기간만큼 제외 후 환불됩니다.

불편을 드려 다시 한번 사과드립니다.

Connect 고객지원팀
📧 support@connectplt.kr
```

---

### Scenario 4: Duplicate Payment / Billing Error

**Trigger:** User charged twice, system error

**Decision:** ✅ Emergency approval (full refund, no questions)

**Email Template:**
```
Subject: [Connect] 긴급 환불 처리 완료 - 빌링 오류 (Urgent Refund - Billing Error)

안녕하세요, Connect 고객지원팀입니다.

빌링 시스템 오류로 불편을 드려 대단히 죄송합니다.
중복 결제/오류 건에 대해 긴급 환불이 승인되었습니다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 환불 정보 (Refund Details)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 오류 내용: {ERROR_DESCRIPTION}
• 결제 금액: ₩{TOTAL_PAID}
• 환불 금액: ₩{REFUND_AMOUNT} (전액)
• 환불 사유: 빌링 오류 (시스템 오류)
• 우선 처리: ⚡ 당일 처리 예정

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

빌링 오류로 인한 불편을 최소화하기 위해 최우선으로 처리하겠습니다.
다시 한번 깊이 사과드립니다.

Connect 고객지원팀
📧 support@connectplt.kr
```

**Admin Action:**
1. Immediately mark as `APPROVED`
2. Flag as `isStatutory: true`, `reasonCategory: BILLING_ERROR`
3. Escalate to CTO for system audit
4. Process refund within 4 hours
5. Send incident report to user within 24 hours

---

### Scenario 5: Rejection (Abuse Detected)

**Trigger:** Multiple refund requests, fraudulent activity, ToS violation

**Decision:** ❌ Reject with clear explanation

**Email Template:**
```
Subject: [Connect] 환불 요청 거부 안내 (Refund Request Rejected)

안녕하세요, Connect 고객지원팀입니다.

귀하의 환불 요청을 검토한 결과, 아래 사유로 거부되었음을 알려드립니다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 거부 사유 (Rejection Reason)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{REJECTION_REASON}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

이의가 있으시면 아래 분쟁 해결 기관에 문의하실 수 있습니다:

• 한국소비자원: 1372
• 공정거래위원회
• 전자거래분쟁조정위원회

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Connect 고객지원팀
📧 support@connectplt.kr
```

**Admin Action:**
1. Document abuse evidence in `internalNotes`
2. Mark status as `REJECTED`
3. Set `rejectionReason` with clear legal basis
4. Notify legal team if fraud suspected
5. Flag user account for monitoring

---

## Toss Payments API Integration

### Refund API Call

**Endpoint:** `POST https://api.tosspayments.com/v1/payments/{paymentKey}/cancel`

**Authentication:** Basic Auth with Secret Key

**Code Example:**
```typescript
// File: lib/toss-payments.ts

interface TossRefundRequest {
  cancelReason: string;
  cancelAmount?: number;  // Optional: partial refund
  refundReceiveAccount?: {
    bank: string;
    accountNumber: string;
    holderName: string;
  };
}

interface TossRefundResponse {
  paymentKey: string;
  orderId: string;
  status: string;
  totalAmount: number;
  balanceAmount: number;
  cancels: Array<{
    cancelAmount: number;
    cancelReason: string;
    canceledAt: string;
    cancelStatus: string;
  }>;
}

export async function submitRefundToToss(
  paymentKey: string,
  refundAmount: number,
  reason: string
): Promise<TossRefundResponse> {
  const secretKey = process.env.TOSS_PAYMENTS_SECRET_KEY;

  if (!secretKey) {
    throw new Error('TOSS_PAYMENTS_SECRET_KEY not configured');
  }

  const authHeader = Buffer.from(`${secretKey}:`).toString('base64');

  const requestBody: TossRefundRequest = {
    cancelReason: reason,
    cancelAmount: refundAmount,
  };

  const response = await fetch(
    `https://api.tosspayments.com/v1/payments/${paymentKey}/cancel`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `Toss Payments refund failed: ${error.message} (${error.code})`
    );
  }

  return response.json();
}
```

### Usage in Admin Dashboard

```typescript
// File: app/api/admin/refunds/[id]/approve/route.ts

import { submitRefundToToss } from '@/lib/toss-payments';
import { calculateAnnualRefund, calculateMonthlyRefund } from '@/lib/refund-calculator';
import { prisma } from '@/lib/prisma';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const refundRequest = await prisma.refundRequest.findUnique({
    where: { id: params.id },
    include: { user: true, organization: true },
  });

  if (!refundRequest) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  // Calculate refund amount
  let calculation;
  if (refundRequest.billingCycle === 'ANNUAL') {
    calculation = calculateAnnualRefund(
      refundRequest.amountPaid,
      refundRequest.purchaseDate,
      refundRequest.contractEndDate,
      new Date(),
      { statutory: refundRequest.isStatutory }
    );
  } else {
    calculation = calculateMonthlyRefund(
      refundRequest.amountPaid,
      refundRequest.purchaseDate,
      new Date(),
      { isFirstTimeGoodwill: refundRequest.isStatutory }
    );
  }

  // Submit to Toss Payments
  const tossResponse = await submitRefundToToss(
    refundRequest.subscriptionId!,
    calculation.refundAmount,
    calculation.reason
  );

  // Update database
  await prisma.refundRequest.update({
    where: { id: params.id },
    data: {
      status: 'PROCESSING',
      approvedAt: new Date(),
      processedByAdminId: req.user.id, // Assume auth middleware
      calculationJson: calculation as any,
    },
  });

  // Send email (using Resend or similar)
  // await sendRefundApprovalEmail(refundRequest.user.email, calculation);

  return Response.json({
    success: true,
    refundAmount: calculation.refundAmount,
    tossPaymentKey: tossResponse.paymentKey,
  });
}
```

---

## Escalation Paths

### Level 1: CS Team (Response Time: 4 hours)
- **Handles:** Standard refund requests (Scenarios 1, 2)
- **Authority:** Approve refunds ≤ ₩1,000,000
- **Contact:** support@connectplt.kr

### Level 2: CS Manager (Response Time: 1 business day)
- **Handles:** Complex cases, high-value refunds, abuse detection
- **Authority:** Approve refunds > ₩1,000,000, reject requests
- **Escalation Trigger:**
  - Refund amount > ₩1,000,000
  - Multiple refund requests from same user
  - Suspicious activity

### Level 3: Legal Team (Response Time: 2 business days)
- **Handles:** Fraud investigation, legal disputes, regulatory compliance
- **Authority:** Final decision on rejections
- **Escalation Trigger:**
  - User threatens legal action
  - Consumer dispute agency inquiry
  - Systemic billing error affecting >10 users

### Level 4: CTO + Legal (Response Time: Same day)
- **Handles:** System-wide failures, data breaches, regulatory audits
- **Authority:** Emergency decisions
- **Escalation Trigger:**
  - Payment gateway outage
  - Security breach
  - 공정위 investigation

---

## Analytics Dashboard Metrics

### Key Performance Indicators (KPIs)

**1. Refund Rate**
```
Formula: (Total Refunds / Total Subscriptions) × 100
Target: < 5%
Benchmark: Industry average 7-10%
```

**2. Average Processing Time**
```
Formula: AVG(completedAt - requestedAt)
Target: < 2 business days
Legal Max: 3 business days
```

**3. Statutory vs. Contractual Ratio**
```
Formula: (Statutory Refunds / Total Refunds) × 100
Target: < 20% (Lower = fewer service issues)
Alarm: > 30% (Indicates product/service problems)
```

**4. Rejection Rate**
```
Formula: (Rejected Requests / Total Requests) × 100
Target: < 2%
Alarm: > 5% (May indicate unclear policies)
```

**5. 7-Day Window Utilization**
```
Formula: (Refunds within 7 days / Total Refunds) × 100
Insight: High % = users dissatisfied quickly
Target: Monitor trend (↓ is good)
```

### Dashboard SQL Queries

**Monthly Refund Summary:**
```sql
SELECT
  DATE_TRUNC('month', "requestedAt") AS month,
  COUNT(*) AS total_requests,
  COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed,
  COUNT(*) FILTER (WHERE status = 'REJECTED') AS rejected,
  SUM("refundAmount") FILTER (WHERE status = 'COMPLETED') AS total_refunded,
  AVG("refundAmount") FILTER (WHERE status = 'COMPLETED') AS avg_refund,
  AVG(EXTRACT(EPOCH FROM ("completedAt" - "requestedAt")) / 86400)
    FILTER (WHERE status = 'COMPLETED') AS avg_days_to_complete
FROM "RefundRequest"
WHERE "requestedAt" >= DATE_TRUNC('year', NOW())
GROUP BY month
ORDER BY month DESC;
```

**Reason Category Breakdown:**
```sql
SELECT
  "reasonCategory",
  COUNT(*) AS count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS percentage,
  AVG("refundAmount") AS avg_amount
FROM "RefundRequest"
WHERE status = 'COMPLETED'
  AND "requestedAt" >= NOW() - INTERVAL '90 days'
GROUP BY "reasonCategory"
ORDER BY count DESC;
```

**SLA Compliance:**
```sql
SELECT
  COUNT(*) FILTER (
    WHERE EXTRACT(EPOCH FROM ("completedAt" - "requestedAt")) / 86400 <= 2
  ) AS within_target,
  COUNT(*) FILTER (
    WHERE EXTRACT(EPOCH FROM ("completedAt" - "requestedAt")) / 86400 BETWEEN 2 AND 3
  ) AS within_legal,
  COUNT(*) FILTER (
    WHERE EXTRACT(EPOCH FROM ("completedAt" - "requestedAt")) / 86400 > 3
  ) AS overdue,
  ROUND(
    COUNT(*) FILTER (
      WHERE EXTRACT(EPOCH FROM ("completedAt" - "requestedAt")) / 86400 <= 2
    ) * 100.0 / COUNT(*),
    2
  ) AS target_compliance_rate
FROM "RefundRequest"
WHERE status = 'COMPLETED'
  AND "requestedAt" >= NOW() - INTERVAL '30 days';
```

---

## Quick Reference Checklist

### For Every Refund Request:

- [ ] **Check eligibility**
  - Verify purchase date vs. request date
  - Check subscription status (active/cancelled)
  - Review user's refund history

- [ ] **Calculate refund**
  - Use `calculateAnnualRefund()` or `calculateMonthlyRefund()`
  - Determine if statutory mode applies
  - Save calculation to `calculationJson`

- [ ] **Verify payment details**
  - Confirm payment method on file
  - Check for any pending disputes

- [ ] **Process decision**
  - Approve/reject within 1 business day (internal SLA)
  - Update status in database
  - Assign `processedByAdminId`

- [ ] **Submit to PG**
  - Call Toss Payments API
  - Handle API errors gracefully
  - Log transaction ID

- [ ] **Notify user**
  - Send appropriate email template
  - Include refund timeline
  - Provide dispute resolution info if rejected

- [ ] **Monitor completion**
  - Check status daily until `COMPLETED`
  - Flag if >3 days (legal violation)
  - Update analytics dashboard

---

## Legal Safeguards

### Must-Do's:
1. **Never delay beyond 3 business days** without user consent
2. **Always apply statutory mode** for service issues (no penalty)
3. **Document all decisions** in `internalNotes`
4. **Provide dispute resolution info** in rejection emails
5. **Escalate fraud immediately** to legal team

### Must-Not's:
1. **Don't apply penalties** to statutory cancellations
2. **Don't reject without clear legal basis**
3. **Don't discuss user's refund with third parties** (PIPA violation)
4. **Don't modify calculator logic** without legal review
5. **Don't approve >₩1,000,000** without manager approval

---

## Common Edge Cases

### 1. User requests refund during billing cycle transition
**Solution:** Use original purchase date, not renewal date. Each renewal is a new contract.

### 2. User claims service issue but no internal logs
**Solution:**
- Check server logs, Sentry errors, uptime monitoring
- If evidence exists → Statutory mode
- If no evidence but user insists → Escalate to CS Manager
- Default: Benefit of the doubt for first-time users

### 3. Annual plan user wants partial cancellation
**Solution:** Not supported. All-or-nothing refund only. Explain this in email.

### 4. User paid via bank transfer, not credit card
**Solution:**
- Collect bank account details via secure form
- Use Toss Payments `refundReceiveAccount` parameter
- Double-check account holder name matches user

### 5. User's organization was deleted
**Solution:**
- Refund still processes (organizationId can be NULL)
- Use user's email for correspondence
- Flag for legal review if suspicious

---

## Contact Information

**Internal Support:**
- CS Team: support@connectplt.kr
- CS Manager: cs-manager@connectplt.kr (internal)
- Legal Team: legal@connectplt.kr (internal)
- CTO (Emergency): cto@connectplt.kr (internal)

**External Agencies:**
- 한국소비자원: 1372
- 공정거래위원회: https://www.ftc.go.kr
- 전자거래분쟁조정위원회: https://www.ecmc.or.kr

---

**End of Manual**

*This manual is updated quarterly or when regulations change. Last reviewed: 2025-11-22.*
