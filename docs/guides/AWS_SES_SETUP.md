# AWS SES Setup Guide for Connect Platform

**Purpose**: Configure AWS Simple Email Service (SES) for Phase 3A email notifications

**Estimated Time**: 30-45 minutes (plus 1-2 days for production access approval)

**Cost**: $0.10 per 1,000 emails (first 62,000 emails/month are free with AWS Free Tier)

---

## Prerequisites

- AWS Account (create at https://aws.amazon.com/)
- Domain name (optional for production, not needed for testing)
- Credit card (required for AWS account, but free tier covers testing)

---

## Step 1: AWS SES Account Setup (10 minutes)

### 1.1 Access AWS SES Console

1. Log in to AWS Console: https://console.aws.amazon.com/
2. Navigate to **Simple Email Service** (search "SES" in services)
3. **Important**: Select **Seoul region (ap-northeast-2)** from top-right dropdown
   - This ensures <50ms latency for Korean users
   - URL should show: `https://console.aws.amazon.com/ses/home?region=ap-northeast-2`

### 1.2 Verify Email Address (for testing)

**Sandbox Mode** (default): You can only send emails to verified addresses

1. Click **Verified identities** → **Create identity**
2. Choose **Email address**
3. Enter your email (e.g., `yourname@gmail.com`)
4. Click **Create identity**
5. Check your inbox and click the verification link
6. Wait for status to change to **Verified** ✅

**For testing**, verify:
- Your personal email (to receive test emails)
- The sender email you'll use (e.g., `noreply@connect.kr` if you own the domain)

### 1.3 Verify Domain (for production)

**Only needed when you own the domain** (e.g., `connect.kr`)

1. Click **Verified identities** → **Create identity**
2. Choose **Domain**
3. Enter your domain: `connect.kr`
4. AWS provides DNS records (CNAME, TXT)
5. Add these records to your domain DNS settings
6. Wait 24-72 hours for verification

**Benefits of domain verification**:
- Can send from any email address at that domain (e.g., `noreply@connect.kr`, `support@connect.kr`)
- No need to verify each email individually
- Better deliverability (SPF, DKIM configured)

---

## Step 2: Generate SMTP Credentials (5 minutes)

### 2.1 Create SMTP User

1. Go to **Account dashboard** (left sidebar)
2. Scroll to **SMTP settings** section
3. Click **Create SMTP credentials**
4. Enter IAM user name: `connect-ses-smtp`
5. Click **Create**

### 2.2 Download Credentials

**Important**: Save these credentials securely - password is shown only once!

You'll receive:
```
SMTP Username: AKIA... (20 characters, starts with AKIA)
SMTP Password: long-base64-string (44 characters)
```

**Note the SMTP server details**:
```
SMTP endpoint: email-smtp.ap-northeast-2.amazonaws.com
Port: 587 (TLS)
```

---

## Step 3: Configure Environment Variables (5 minutes)

### 3.1 Update `.env.local`

Open `/Users/paulkim/Downloads/connect/.env.local` and update:

```bash
# AWS SES SMTP Credentials (from Step 2)
SMTP_USER=AKIA... # Replace with your SMTP username
SMTP_PASSWORD=your-long-smtp-password-here # Replace with your SMTP password

# Sender Email (must be verified in Step 1)
SMTP_FROM_EMAIL=yourname@gmail.com # Replace with your verified email
SMTP_FROM_NAME=Connect Platform
SMTP_REPLY_TO=yourname@gmail.com # Same as above for testing

# Host and Port (already configured for Seoul region)
SMTP_HOST=email-smtp.ap-northeast-2.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
```

**Important**:
- `SMTP_FROM_EMAIL` must be a verified email address from Step 1.2
- For testing, use your personal email as both sender and recipient
- Never commit `.env.local` to git (already in `.gitignore`)

### 3.2 Verify Configuration

```bash
# Check if nodemailer package is installed
npm list nodemailer

# If not installed, run:
npm install nodemailer @types/nodemailer
```

---

## Step 4: Test Email Delivery (10 minutes)

### 4.1 Run Test Script

```bash
# Navigate to project directory
cd /Users/paulkim/Downloads/connect

# Run email delivery test
npx tsx scripts/test-email-delivery.ts
```

### 4.2 Expected Output

```
🧪 Testing Email Delivery via AWS SES

============================================================

📡 Step 1: Verifying SMTP connection...
   Host: email-smtp.ap-northeast-2.amazonaws.com
   Port: 587
   User: AKIA...
   From: yourname@gmail.com
   ✅ SMTP connection successful!

📊 Step 2: Preparing test data...
   User: Test User
   Email: yourname@gmail.com
   Organization: Test Company Ltd.
   Programs found: 16

📧 Step 3: Sending New Match Notification...
   ✅ New match notification sent!

⏰ Step 4: Sending Deadline Reminder...
   ✅ Deadline reminder sent!

📬 Step 5: Sending Weekly Digest...
   ✅ Weekly digest sent!

============================================================
✅ All email tests passed!
============================================================

📬 Check your inbox: yourname@gmail.com

You should receive 3 emails:
  1. 🎯 New Match Notification (85점 매칭)
  2. ⏰ Deadline Reminder (2 programs)
  3. 📊 Weekly Digest Summary
```

### 4.3 Check Your Inbox

**Within 1-2 minutes**, you should receive 3 emails:

1. **New Match Notification**
   - Subject: "🎯 새로운 매칭 발견 - [Program Name]"
   - Korean HTML template with match details

2. **Deadline Reminder**
   - Subject: "⏰ 마감 임박 - 2개 프로그램 확인 필요"
   - List of programs with approaching deadlines

3. **Weekly Digest**
   - Subject: "📊 주간 매칭 리포트"
   - Weekly summary of matches

**If emails are not in inbox**:
- Check spam/junk folder (common for first send)
- Mark as "Not Spam" to improve future deliverability
- Verify sender email is verified in AWS SES Console
- Check AWS SES Console → Sending Statistics for delivery status

---

## Step 5: Request Production Access (1-2 business days)

### 5.1 Why Production Access?

**Sandbox Mode Limitations**:
- Can only send to verified email addresses
- Limit: 200 emails per 24 hours
- Not suitable for beta launch with 50 users

**Production Mode**:
- Send to any email address
- Limit: 50,000 emails per 24 hours (can request increase)
- Ready for real users

### 5.2 Request Access

1. Go to **Account dashboard** → **Request production access**
2. Fill out the form:

**Use Case**:
```
Transactional emails for R&D funding platform

Our platform connects Korean companies and research institutes
with government funding opportunities. We send:
- New match notifications when relevant programs are found
- Deadline reminders (D-7, D-3, D-1)
- Weekly digest summaries

Target users: 500-1,500 organizations
Expected volume: 500-1,500 emails/day
Bounce/complaint handling: Automated via SNS notifications
```

**Website URL**: `https://connect.kr` (or your domain)

**Email addresses**:
- From: `noreply@connect.kr`
- Reply-to: `support@connect.kr`

**How you handle bounces**:
```
We will implement automated bounce handling:
1. Hard bounces: Remove email from send list
2. Soft bounces: Retry up to 3 times, then remove
3. Complaints: Immediately unsubscribe and investigate
4. SNS notifications for monitoring
```

3. Click **Submit request**
4. AWS typically approves within **24 hours** (usually within 1-2 hours)
5. Check email for approval notification

---

## Step 6: Production Configuration (after approval)

### 6.1 Update Production Environment

Once approved, update `.env.production`:

```bash
# AWS SES (Production)
SMTP_HOST=email-smtp.ap-northeast-2.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=AKIA... # Same as development
SMTP_PASSWORD=your-smtp-password # Same as development

# Production sender (use verified domain)
SMTP_FROM_EMAIL=noreply@connect.kr
SMTP_FROM_NAME=Connect Platform
SMTP_REPLY_TO=support@connect.kr
```

### 6.2 Monitor Sending Statistics

**AWS SES Console → Sending Statistics**:
- Emails sent
- Bounces (should be <5%)
- Complaints (should be <0.1%)
- Reputation dashboard (keep in "Healthy" status)

---

## Troubleshooting

### Error: `EAUTH - Authentication failed`

**Cause**: Invalid SMTP credentials

**Solution**:
1. Verify SMTP_USER starts with `AKIA` (not your AWS access key)
2. Verify SMTP_PASSWORD is the SMTP password (not secret access key)
3. Recreate SMTP credentials if lost (cannot retrieve old password)

### Error: `MessageRejected - Email address not verified`

**Cause**: Sender or recipient email not verified (sandbox mode)

**Solution**:
1. Verify sender email in AWS SES Console
2. In sandbox mode, verify recipient email too
3. Or request production access to send to unverified recipients

### Error: `ECONNREFUSED`

**Cause**: Cannot connect to SMTP server

**Solution**:
1. Check SMTP_HOST is `email-smtp.ap-northeast-2.amazonaws.com`
2. Check SMTP_PORT is `587`
3. Verify firewall allows outbound port 587
4. Check AWS region matches (ap-northeast-2)

### Emails go to spam folder

**Causes**:
- Domain not verified (no SPF/DKIM)
- New sender with no reputation
- Email content triggers spam filters

**Solutions**:
1. Verify domain in AWS SES (adds SPF, DKIM records)
2. Start with small volume, gradually increase
3. Ask users to mark as "Not Spam"
4. Add unsubscribe link (already in templates)
5. Warm up sender reputation (send to engaged users first)

---

## Cost Analysis

### AWS SES Pricing (Seoul region)

**Free Tier** (first 12 months):
- 62,000 emails/month = $0

**After Free Tier**:
- $0.10 per 1,000 emails
- 500 emails/day × 30 days = 15,000 emails/month = **$1.50/month**
- 1,500 emails/day × 30 days = 45,000 emails/month = **$4.50/month**

**Compared to alternatives**:
- SendGrid: $19.95/month for 50,000 emails (13× more expensive)
- Gmail SMTP: Free but limited to 500/day and unreliable for production

### Expected Cost for Connect Platform

**Beta (50 users)**:
- 50 weekly digests = 50 emails/week × 4 = 200/month
- 10 new matches × 50 users = 500/month
- 20 deadline reminders × 50 users = 1,000/month
- **Total**: ~1,700 emails/month = **$0.17/month** (or free with Free Tier)

**Production (500 users)**:
- 500 weekly digests = 2,000/month
- 100 new matches × 500 users = 50,000/month
- 200 deadline reminders × 500 users = 100,000/month
- **Total**: ~152,000 emails/month = **$15.20/month**

---

## Next Steps

After AWS SES is configured and tested:

1. **Integrate Phase 3C with Phase 3A** (2-3 hours)
   - Add email notifications for contact requests
   - Add email notifications for consortium invitations
   - See `docs/status/phase3-integrated-testing-summary.md` section on integration points

2. **End-to-End Testing** (4-6 hours)
   - Test complete user journey: Signup → Match → Email → Partner search → Consortium
   - Verify email delivery rates and Korean text rendering

3. **Beta Launch Preparation** (1 week)
   - Deploy to production server
   - Invite 50 users from research institute network
   - Monitor metrics (email delivery, match quality, consortium formation)

---

## Security Checklist

- [ ] SMTP credentials stored in `.env.local` and `.env.production` (not in git)
- [ ] `.env.local` and `.env.production` added to `.gitignore`
- [ ] Domain verified in AWS SES (for SPF/DKIM)
- [ ] Production access approved
- [ ] Bounce and complaint handling configured (SNS notifications)
- [ ] Sending statistics monitored (keep bounce rate <5%)
- [ ] Unsubscribe links included in all email templates
- [ ] Rate limiting configured (1-second delay between emails)

---

## References

- AWS SES Documentation: https://docs.aws.amazon.com/ses/
- SMTP Credentials Guide: https://docs.aws.amazon.com/ses/latest/dg/smtp-credentials.html
- Production Access Request: https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html
- Nodemailer Documentation: https://nodemailer.com/
- Phase 3A Implementation: `docs/implementation/phase3a-email-notifications.md`

---

*Generated for Connect Platform v8.0 - Phase 3A Email Notifications*
