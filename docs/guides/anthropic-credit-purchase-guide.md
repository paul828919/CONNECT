# Anthropic Credit Purchase Guide

**Quick Reference for Connect Platform Development**

---

## 🎯 Why You Need This

Your API key is valid, but Anthropic requires prepaid credits to use the API. This is a one-time setup step.

**Current Status**:
- ✅ API Key: Valid and authenticated
- ✅ Infrastructure: Working correctly
- ❌ Credits: Balance too low (need $5+ minimum)

---

## 💳 Step-by-Step Purchase Guide

### Option 1: Direct Purchase (Recommended)
1. **Go to Billing Page**
   - URL: https://console.anthropic.com/settings/plans
   - Or: Console → Settings → Plans & Billing

2. **Click "Buy Credits"**
   - Usually a blue button in the billing section
   - May say "Add to Balance" or "Purchase Credits"

3. **Select Amount**
   - **Minimum**: $5 USD
   - **Recommended for Testing**: $10 USD
   - **Recommended for Development**: $20 USD
   - **For Production Launch**: $100 USD

4. **Enter Payment Details**
   - Credit/Debit card
   - PayPal (if available)
   - Wire transfer (for large amounts)

5. **Confirm Purchase**
   - Review amount
   - Click "Confirm" or "Purchase"
   - Wait for confirmation email

### Option 2: Auto-Recharge Setup (Optional)
1. Go to Settings → Billing → Auto-recharge
2. Set threshold: $5 (recharge when balance drops below)
3. Set recharge amount: $20
4. Enable auto-recharge

---

## 🔍 Troubleshooting

### Issue: "Buy Credits" Button Not Responding

**Possible Causes & Solutions**:

1. **Form Validation Issue**
   - Check for red error messages on page
   - Ensure all required fields are filled
   - Try refreshing the page (Cmd+R)

2. **Browser Issue**
   - Try different browser (Chrome, Safari, Firefox)
   - Disable ad blockers temporarily
   - Clear browser cache
   - Try incognito/private mode

3. **Payment Method Issue**
   - Verify card is not expired
   - Check card has sufficient funds
   - Try alternative payment method
   - Contact your bank (may be blocking transaction)

4. **Account Verification Required**
   - Check email for verification request
   - Complete any pending account verification steps
   - Add phone number if requested

5. **Geographic Restrictions**
   - Anthropic may have restrictions in some countries
   - Use VPN if necessary (ensure billing address matches)

### Issue: Payment Declined

**Solutions**:
1. Contact your bank/card issuer
2. Try different payment method
3. Verify billing address is correct
4. Check if international transactions are enabled

### Issue: Credits Not Showing After Purchase

**Solutions**:
1. Wait 5 minutes (processing delay)
2. Refresh the billing page
3. Log out and log back in
4. Check confirmation email for status
5. Contact Anthropic support: support@anthropic.com

---

## 📧 Contact Anthropic Support

If you encounter issues:

**Email**: support@anthropic.com
**Subject**: "Unable to purchase credits - API key [your-key-prefix]"

**Include in Email**:
- Your account email
- API key prefix (first 20 chars)
- Screenshot of error
- Browser and OS version
- Payment method attempted

**Response Time**: Usually 24-48 hours

---

## 💰 Credit Recommendations

### For Connect Platform Development

| Phase | Recommended Credits | Estimated Duration | Notes |
|-------|-------------------|-------------------|-------|
| **Initial Testing (Day 15)** | $5 | 1 day | Just to complete connectivity test |
| **Development (Days 16-22)** | $20 | 1 week | AI feature development |
| **Beta Testing (Weeks 8-10)** | $50 | 3 weeks | 5-30 beta users |
| **Production Launch** | $100+ | Monthly | Auto-recharge recommended |

### Cost Breakdown (Reference)

**Claude Sonnet 4.5 Pricing** (as of Oct 2025):
- Input: $3.00 / 1M tokens (₩3,900 / 1M tokens)
- Output: $15.00 / 1M tokens (₩19,500 / 1M tokens)
- Cache Write: $3.75 / 1M tokens
- Cache Read: $0.30 / 1M tokens (90% savings)

**Average Request Cost**:
- Without caching: $0.00375 (₩4.88)
- With 50% cache hit: $0.00245 (₩3.18)

**$20 USD Budget** (₩26,000):
- ~5,330 uncached requests
- ~8,490 requests with 50% cache hit
- Sufficient for 1 week of intensive development

---

## ✅ Verification Steps (After Purchase)

### 1. Confirm Credit Balance
```bash
# Go to: https://console.anthropic.com/settings/plans
# Look for: "Current Balance: $X.XX"
```

### 2. Run Connectivity Test
```bash
cd /Users/paulkim/Downloads/connect
npx tsx scripts/test-anthropic-connectivity.ts
```

### 3. Expected Output
```
========================================
Anthropic Claude AI - Connectivity Test
========================================

Test 1: Health Check
----------------------------------------
Status: healthy
API Key Configured: ✅
Redis Connected: ✅
Budget Remaining: ₩50000
Rate Limit Remaining: 50
✅ Health check passed

Test 2: Basic Korean Request
----------------------------------------
Response Content:
TRL 7은 "운영 환경에서의 시스템 시제품 실증" 단계입니다...
[Korean response about TRL 7]

Usage:
  Input tokens: 145
  Output tokens: 89
  Cost: ₩2.30
  Stop reason: end_turn
✅ Korean request/response successful

... [remaining tests] ...

========================================
TEST SUMMARY
========================================
✅ All tests passed!
Total spent: ₩12.50
Requests used: 3/50

🎉 AI client is ready for production use!
========================================
```

### 4. Update Status
Once tests pass:
```bash
# Mark Day 15 as 100% complete
# Proceed to Day 16-17: Match Explanation Service
```

---

## 🚀 What's Next (After Credits Added)

**Immediate** (2 minutes):
1. ✅ Run connectivity test
2. ✅ Verify all 6 scenarios pass
3. ✅ Confirm cost tracking works

**Today** (Day 15 completion):
1. Update IMPLEMENTATION-STATUS.md
2. Mark Day 15 todo as complete
3. Create final Day 15 completion report

**Tomorrow** (Day 16):
1. Begin Match Explanation Service implementation
2. Integrate AI client with matching engine
3. Add Redis caching for explanations

**Timeline Impact**:
- Still 6 days ahead of schedule
- No delay to January 1, 2026 launch date

---

## 📞 Need Help?

**Internal Documentation**:
- `/docs/plans/progress/week03-day15-validation-status.md`
- `/docs/research/anthropic-api-notes.md`
- `/docs/plans/EXECUTION-PLAN-MASTER.md`

**External Resources**:
- Anthropic Console: https://console.anthropic.com/
- Anthropic Docs: https://docs.anthropic.com/
- Anthropic Support: support@anthropic.com

---

**Created**: October 9, 2025 21:30 KST
**Purpose**: Help user complete credit purchase and unblock Day 15
**Context**: Week 3-4 AI Integration, Day 15 validation
